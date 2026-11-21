import { getDb, DatabaseWrapper } from '../db';
import { requestWoo } from './wooCommerceService';
import { decodeHtmlEntities } from '../../src/utils/decodeHtml';
import { CategoryRecord, CategorySeoSettings } from './categoryService';
const STORE_BASE_URL = 'https://irepair-mobiles.co.uk';

export interface CategorySyncSummary {
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
  errors: string[];
  durationMs: number;
  totalRemoteCategories: number;
}

export interface CategoryTreeNode {
  id: number;
  woo_id?: number | null;
  name: string;
  slug: string;
  parent_id: number;
  parent: number;
  parent_woo_id?: number;
  description: string;
  count: number;
  product_count: number;
  image: string;
  image_url: string;
  hierarchicalUrl: string;
  url: string;
  display: string;
  source: 'woocommerce' | 'local';
  is_deleted_remote: boolean;
  edited_locally: boolean;
  seo_title?: string;
  seo_description?: string;
  children: CategoryTreeNode[];
}

// In-memory lock for concurrent runs
let isCategorySyncRunning = false;

// In-memory cache for category tree
let categoryTreeCache: { data: CategoryTreeNode[]; expiresAt: number } | null = null;
const TREE_CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function invalidateCategoryTreeCache(): void {
  categoryTreeCache = null;
}

export function isCategorySyncInProgress(): boolean {
  return isCategorySyncRunning;
}

/**
 * Builds the canonical hierarchical URL for a category based on its parent chain.
 * Trailing slash is canonical.
 */
function buildCategoryHierarchicalPath(
  catId: number,
  catMap: Map<number, { id: number; slug: string; parent_id: number }>
): string {
  const segments: string[] = [];
  const visited = new Set<number>();
  let curr = catMap.get(catId);

  while (curr && !visited.has(curr.id)) {
    visited.add(curr.id);
    let seg = curr.slug;
    // Mobile phones category compatibility
    if (curr.id === 1375 && curr.id !== catId) {
      seg = 'mobiles';
    }
    segments.unshift(seg);
    if (curr.parent_id && curr.parent_id !== 0) {
      curr = catMap.get(curr.parent_id);
    } else {
      break;
    }
  }

  const clean = segments.map((s) => s.replace(/^\/+|\/+$/g, '')).join('/');
  return `/product-category/${clean}/`;
}

/**
 * Synchronizes categories from WooCommerce to the local database.
 * Supports pagination, 2-pass hierarchy resolution, conflict & cycle detection,
 * soft-deletions of removed remote categories, and preservation of local edits.
 */
export async function syncWooCommerceCategories(options: {
  overwriteLocalEdits?: boolean;
} = {}): Promise<CategorySyncSummary> {
  if (isCategorySyncRunning) {
    throw new Error('Category sync is already in progress');
  }

  isCategorySyncRunning = true;
  const startTime = Date.now();
  const syncLogId = `sync_cat_${startTime}`;
  const now = new Date().toISOString();

  const summary: CategorySyncSummary = {
    created: 0,
    updated: 0,
    deleted: 0,
    unchanged: 0,
    errors: [],
    durationMs: 0,
    totalRemoteCategories: 0,
  };

  const db = await getDb();

  // Log start to sync_logs
  try {
    db.run(
      `INSERT INTO sync_logs (id, type, started_at, status, summary, error)
       VALUES (?, 'categories', ?, 'running', ?, NULL)`,
      [syncLogId, now, JSON.stringify(summary)]
    );
  } catch (err: any) {
    console.warn('Failed to insert initial sync log:', err.message);
  }

  try {
    // 1. Fetch all categories from WooCommerce with pagination (per_page=100)
    const remoteCategories: any[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const res = await requestWoo(`/products/categories?per_page=100&page=${page}`);
      if (res.statusCode !== 200 || !Array.isArray(res.data)) {
        throw new Error(`WooCommerce API error on page ${page}: status ${res.statusCode}`);
      }

      remoteCategories.push(...res.data);

      const headerTotalPages = parseInt(res.headers?.['x-wp-totalpages'] || '1', 10);
      totalPages = isNaN(headerTotalPages) ? page : headerTotalPages;

      if (res.data.length === 0 || page >= totalPages) {
        break;
      }
      page++;
    }

    summary.totalRemoteCategories = remoteCategories.length;
    const remoteWooIds = new Set<number>(remoteCategories.map((c) => c.id));

    // 2. Pass 1: Upsert every category by woo_id
    const existingDbCats = db.all<any>('SELECT * FROM categories');
    const existingByWooId = new Map<number, any>();
    const existingBySlug = new Map<string, any>();
    let maxLocalId = 0;

    for (const c of existingDbCats) {
      if (c.id > maxLocalId) maxLocalId = c.id;
      if (c.woo_id !== null && c.woo_id !== undefined) {
        existingByWooId.set(Number(c.woo_id), c);
      }
      existingBySlug.set(c.slug.toLowerCase(), c);
    }

    for (const wc of remoteCategories) {
      const wooId = Number(wc.id);
      const name = decodeHtmlEntities(wc.name || '');
      const slug = (wc.slug || '').trim().toLowerCase();
      const parentWooId = Number(wc.parent || 0);
      const description = decodeHtmlEntities(wc.description || '');
      const imageUrl = wc.image?.src || '';
      const menuOrder = Number(wc.menu_order || 0);
      const productCount = Number(wc.count || 0);
      const display = wc.display || 'default';

      let existing = existingByWooId.get(wooId);
      if (!existing && existingBySlug.has(slug)) {
        // Match existing category by slug if woo_id was missing
        const matched = existingBySlug.get(slug);
        if (matched.source === 'woocommerce' || !matched.source) {
          existing = matched;
        }
      }

      if (existing) {
        const isEditedLocally = existing.edited_locally === 1;
        const shouldOverwrite = options.overwriteLocalEdits || !isEditedLocally;

        if (!shouldOverwrite) {
          // Preserve local edits: only update remote sync tracking and live product count
          db.run(
            `UPDATE categories
             SET woo_id = ?, parent_woo_id = ?, product_count = ?, count = ?, is_deleted_remote = 0, synced_at = ?, updated_at = ?
             WHERE id = ?`,
            [wooId, parentWooId, productCount, productCount, now, now, existing.id]
          );
          summary.unchanged++;
        } else {
          // Overwrite with latest WooCommerce data
          const seoTitle = existing.seo_title || `${name} | iRepair Mobiles UK`;
          const seoDesc = existing.seo_description || description || `Buy certified ${name} online at iRepair Mobiles UK.`;

          let seo: CategorySeoSettings = {};
          try { seo = JSON.parse(existing.seo_json || '{}'); } catch (_) {}
          seo.metaTitle = seoTitle;
          seo.metaDescription = seoDesc;

          db.run(
            `UPDATE categories
             SET woo_id = ?, parent_woo_id = ?, name = ?, slug = ?, description = ?, image = ?, image_url = ?,
                 menu_order = ?, sort_order = ?, product_count = ?, count = ?, display = ?,
                 seo_title = ?, seo_description = ?, seo_json = ?, source = 'woocommerce',
                 is_deleted_remote = 0, edited_locally = 0, synced_at = ?, updated_at = ?
             WHERE id = ?`,
            [
              wooId,
              parentWooId,
              name,
              slug,
              description,
              imageUrl,
              imageUrl,
              menuOrder,
              menuOrder,
              productCount,
              productCount,
              display,
              seoTitle,
              seoDesc,
              JSON.stringify(seo),
              now,
              now,
              existing.id,
            ]
          );
          summary.updated++;
        }
      } else {
        // Create new category
        maxLocalId = Math.max(maxLocalId + 1, 9000);
        const newId = maxLocalId;
        const seoTitle = `${name} | iRepair Mobiles UK`;
        const seoDesc = description || `Buy certified ${name} online at iRepair Mobiles UK. 12-month UK warranty and express delivery.`;
        const initialUrl = `/product-category/${slug}/`;

        const seoJson = JSON.stringify({
          metaTitle: seoTitle,
          metaDescription: seoDesc,
          canonicalUrl: `${STORE_BASE_URL}${initialUrl}`,
          permalink: initialUrl,
          categoryUrl: initialUrl,
        });

        db.run(
          `INSERT INTO categories (
            id, woo_id, parent_woo_id, parent_id, parent, name, slug, description,
            image, image_url, menu_order, sort_order, product_count, count, display,
            seo_title, seo_description, seo_json, hierarchical_url, source,
            is_deleted_remote, edited_locally, synced_at, created_at, updated_at
          ) VALUES (?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'woocommerce', 0, 0, ?, ?, ?)`,
          [
            newId,
            wooId,
            parentWooId,
            name,
            slug,
            description,
            imageUrl,
            imageUrl,
            menuOrder,
            menuOrder,
            productCount,
            productCount,
            display,
            seoTitle,
            seoDesc,
            seoJson,
            initialUrl,
            now,
            now,
            now,
          ]
        );
        summary.created++;
      }
    }

    // 3. Pass 2: Resolve parent_woo_id to local parent_id and detect cycles
    const allDbCats = db.all<any>('SELECT * FROM categories');
    const wooToLocalMap = new Map<number, number>();
    for (const c of allDbCats) {
      if (c.woo_id !== null && c.woo_id !== undefined) {
        wooToLocalMap.set(Number(c.woo_id), Number(c.id));
      }
    }

    // Assign parent_id
    for (const c of allDbCats) {
      if (c.source === 'woocommerce') {
        const parentWoo = Number(c.parent_woo_id || 0);
        let resolvedParentId = 0;
        if (parentWoo > 0) {
          resolvedParentId = wooToLocalMap.get(parentWoo) || 0;
        }

        // Detect and break immediate self-references or cycles
        if (resolvedParentId === c.id) {
          resolvedParentId = 0;
        }

        db.run(
          'UPDATE categories SET parent_id = ?, parent = ? WHERE id = ?',
          [resolvedParentId, resolvedParentId, c.id]
        );
      }
    }

    // Detect deep cycles and break them
    const freshCats = db.all<any>('SELECT id, slug, parent_id FROM categories');
    const freshMap = new Map<number, { id: number; slug: string; parent_id: number }>(
      freshCats.map((c) => [Number(c.id), { id: Number(c.id), slug: c.slug, parent_id: Number(c.parent_id || 0) }])
    );

    for (const c of freshCats) {
      let currParent = Number(c.parent_id || 0);
      const chain = new Set<number>([Number(c.id)]);
      let hasCycle = false;

      while (currParent !== 0) {
        if (chain.has(currParent)) {
          hasCycle = true;
          break;
        }
        chain.add(currParent);
        const pObj = freshMap.get(currParent);
        if (!pObj) break;
        currParent = pObj.parent_id;
      }

      if (hasCycle) {
        console.warn(`Cycle detected for category ${c.id} (${c.slug}). Breaking parent relationship.`);
        db.run('UPDATE categories SET parent_id = 0, parent = 0 WHERE id = ?', [c.id]);
        const entry = freshMap.get(Number(c.id));
        if (entry) entry.parent_id = 0;
      }
    }

    // Recalculate hierarchical URLs & SEO canonicals for all categories
    for (const c of freshCats) {
      const hUrl = buildCategoryHierarchicalPath(Number(c.id), freshMap);
      const row = db.get<any>('SELECT hierarchical_url, seo_json, name, seo_title, seo_description FROM categories WHERE id = ?', [c.id]);
      const oldUrl = row?.hierarchical_url;

      let seo: CategorySeoSettings = {};
      try { seo = JSON.parse(row?.seo_json || '{}'); } catch (_) {}
      seo.permalink = hUrl;
      seo.categoryUrl = hUrl;
      seo.canonicalUrl = `${STORE_BASE_URL}${hUrl}`;
      if (!seo.metaTitle) seo.metaTitle = row?.seo_title || `${row?.name} | iRepair Mobiles UK`;
      if (!seo.metaDescription) seo.metaDescription = row?.seo_description;

      db.run(
        'UPDATE categories SET hierarchical_url = ?, seo_json = ? WHERE id = ?',
        [hUrl, JSON.stringify(seo), c.id]
      );

      // Track 301 redirect if hierarchical URL changed
      if (oldUrl && oldUrl !== hUrl) {
        const redId = `red_cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        try {
          db.run(
            `INSERT OR REPLACE INTO category_redirects (id, from_url, to_url, status_code, created_at)
             VALUES (?, ?, ?, 301, ?)`,
            [redId, oldUrl, hUrl, now]
          );
        } catch (_) {}
      }
    }

    // 4. Soft-delete categories removed from WooCommerce
    for (const c of allDbCats) {
      if (c.source === 'woocommerce' && c.woo_id !== null && c.woo_id !== undefined) {
        if (!remoteWooIds.has(Number(c.woo_id)) && c.is_deleted_remote === 0) {
          db.run(
            'UPDATE categories SET is_deleted_remote = 1, updated_at = ? WHERE id = ?',
            [now, c.id]
          );
          summary.deleted++;

          // Reassign products still attached to this category to 'Uncategorized' if needed
          try {
            db.run(
              `UPDATE products 
               SET category = 'Uncategorized', category_path = 'uncategorized' 
               WHERE (category = ? OR category_path LIKE ?)`,
              [c.name, `%${c.slug}%`]
            );
          } catch (_) {}
        }
      }
    }

    summary.durationMs = Date.now() - startTime;

    // Log success in sync_logs
    try {
      db.run(
        `UPDATE sync_logs
         SET status = 'success', finished_at = ?, summary = ?
         WHERE id = ?`,
        [new Date().toISOString(), JSON.stringify(summary), syncLogId]
      );
    } catch (err: any) {
      console.warn('Failed to update sync log on success:', err.message);
    }

    // Invalidate in-memory cache
    invalidateCategoryTreeCache();

    return summary;
  } catch (err: any) {
    summary.durationMs = Date.now() - startTime;
    summary.errors.push(err.message || 'Unknown sync error');

    try {
      db.run(
        `UPDATE sync_logs
         SET status = 'failed', finished_at = ?, summary = ?, error = ?
         WHERE id = ?`,
        [new Date().toISOString(), JSON.stringify(summary), err.message, syncLogId]
      );
    } catch (_) {}

    throw err;
  } finally {
    isCategorySyncRunning = false;
  }
}

/**
 * Returns public nested category tree (children arrays), excluding soft-deleted categories.
 * Cached with short TTL.
 */
export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  const now = Date.now();
  if (categoryTreeCache && categoryTreeCache.expiresAt > now) {
    return categoryTreeCache.data;
  }

  const db = await getDb();
  const rows = db.all<any>(
    `SELECT * FROM categories 
     WHERE (is_deleted_remote = 0 OR is_deleted_remote IS NULL)
     ORDER BY parent_id ASC, menu_order ASC, name ASC`
  );

  const nodeMap = new Map<number, CategoryTreeNode>();
  const rootNodes: CategoryTreeNode[] = [];

  for (const r of rows) {
    const node: CategoryTreeNode = {
      id: r.id,
      woo_id: r.woo_id,
      name: decodeHtmlEntities(r.name),
      slug: r.slug,
      parent_id: r.parent_id !== undefined ? r.parent_id : r.parent,
      parent: r.parent,
      parent_woo_id: r.parent_woo_id,
      description: r.description ? decodeHtmlEntities(r.description) : '',
      count: r.product_count || r.count || 0,
      product_count: r.product_count || r.count || 0,
      image: r.image_url || r.image || '',
      image_url: r.image_url || r.image || '',
      hierarchicalUrl: r.hierarchical_url,
      url: r.hierarchical_url,
      display: r.display || 'default',
      source: r.source || 'woocommerce',
      is_deleted_remote: Boolean(r.is_deleted_remote),
      edited_locally: Boolean(r.edited_locally),
      seo_title: r.seo_title,
      seo_description: r.seo_description,
      children: [],
    };
    nodeMap.set(r.id, node);
  }

  // Build tree
  for (const node of nodeMap.values()) {
    if (node.parent_id === 0 || !nodeMap.has(node.parent_id)) {
      rootNodes.push(node);
    } else {
      const parentNode = nodeMap.get(node.parent_id);
      if (parentNode) {
        parentNode.children.push(node);
      } else {
        rootNodes.push(node);
      }
    }
  }

  categoryTreeCache = {
    data: rootNodes,
    expiresAt: now + TREE_CACHE_TTL_MS,
  };

  return rootNodes;
}
