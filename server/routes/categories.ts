import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { AuthenticatedRequest, authenticateToken, requireRole, logActivity } from '../middleware/auth';
import {
  CategoryRecord,
  CategorySeoSettings,
  buildHierarchicalUrl,
  generateCategorySeo,
  resolveCategoryPath,
  buildBreadcrumbsForCategory,
} from '../services/categoryService';
import {
  getCategoryTree,
  syncWooCommerceCategories,
  isCategorySyncInProgress,
  invalidateCategoryTreeCache,
} from '../services/categorySyncService';
import { decodeHtmlEntities } from '../../src/utils/decodeHtml';

export const categoriesRouter = Router();
export const adminCategoriesRouter = Router();

const STORE_BASE_URL = 'https://irepair-mobiles.co.uk';

// ==========================================
// PUBLIC CATEGORY ENDPOINTS
// ==========================================

// GET /api/categories/tree - Public nested category tree (excluding soft-deleted)
categoriesRouter.get('/tree', async (req: Request, res: Response): Promise<any> => {
  try {
    const tree = await getCategoryTree();
    return res.json(tree);
  } catch (err: any) {
    console.error('Error fetching category tree:', err);
    return res.status(500).json({ error: 'Failed to retrieve category tree' });
  }
});

// GET /api/categories - Full list of categories with hierarchical URLs & SEO
categoriesRouter.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const rows = db.all<CategoryRecord>('SELECT * FROM categories ORDER BY parent ASC, sort_order ASC, name ASC');

    const catMap = new Map<number, CategoryRecord>(rows.map((r) => [r.id, r]));

    const formatted = rows.map((cat) => {
      let seo: CategorySeoSettings = {};
      try {
        seo = JSON.parse(cat.seo_json || '{}');
      } catch (_) {}

      // Ensure latest hierarchical URL is present
      const hierarchicalUrl = cat.hierarchical_url || buildHierarchicalUrl(cat.id, catMap);
      const cleanName = decodeHtmlEntities(cat.name);
      const cleanDesc = cat.description ? decodeHtmlEntities(cat.description) : cat.description;
      return {
        id: cat.id,
        name: cleanName,
        slug: cat.slug,
        parent: cat.parent,
        description: cleanDesc,
        count: cat.count,
        image: cat.image,
        hierarchicalUrl,
        url: hierarchicalUrl,
        seo: {
          ...seo,
          metaTitle: seo.metaTitle ? decodeHtmlEntities(seo.metaTitle) : `${cleanName} | iRepair Mobiles UK`,
          metaDescription: seo.metaDescription ? decodeHtmlEntities(seo.metaDescription) : cleanDesc,
          canonicalUrl: seo.canonicalUrl || `${STORE_BASE_URL}${hierarchicalUrl}`,
          permalink: hierarchicalUrl,
          categoryUrl: hierarchicalUrl,
        },
      };
    });

    return res.json(formatted);
  } catch (err: any) {
    console.error('Error fetching categories:', err);
    return res.status(500).json({ error: 'Failed to retrieve categories' });
  }
});

// GET /api/categories/resolve?path=... or GET /api/categories/resolve?url=...
categoriesRouter.get('/resolve', async (req: Request, res: Response): Promise<any> => {
  try {
    const rawPath = String(req.query.path || req.query.url || '').trim();
    if (!rawPath) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }

    // Clean up input: remove leading / trailing slashes and product-category prefix if present
    let clean = rawPath.replace(/^https?:\/\/[^/]+/i, '');
    clean = clean.replace(/^\/+|\/+$/g, '');
    if (clean.startsWith('product-category/')) {
      clean = clean.replace(/^product-category\//, '');
    }
    const segments = clean.split('/').filter(Boolean);

    const db = await getDb();

    // Check direct category redirects first
    const fullRequestUrl = `/product-category/${segments.join('/')}/`;
    const redirectRow = db.get<{ to_url: string; status_code: number }>(
      'SELECT to_url, status_code FROM category_redirects WHERE from_url = ?',
      [fullRequestUrl]
    );
    if (redirectRow) {
      return res.json({
        redirect: redirectRow.to_url,
        statusCode: redirectRow.status_code || 301,
      });
    }

    const rows = db.all<CategoryRecord>('SELECT * FROM categories');
    const result = resolveCategoryPath(segments, rows);

    if (!result.category) {
      return res.status(404).json({ error: 'Category not found', path: fullRequestUrl });
    }

    const matched = result.category;
    let seo: CategorySeoSettings = {};
    try {
      seo = JSON.parse(matched.seo_json || '{}');
    } catch (_) {}

    // Find direct child categories
    const children = rows
      .filter((c) => c.parent === matched.id)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        url: c.hierarchical_url,
        count: c.count,
      }));

    // Find all descendant IDs for product matching
    const descendantIds = new Set<number>([matched.id]);
    const descendantSlugs = new Set<string>([matched.slug.toLowerCase()]);
    if (matched.id === 1375) {
      descendantSlugs.add('mobiles');
      descendantSlugs.add('mobile-phones');
    }

    let addedMore = true;
    while (addedMore) {
      addedMore = false;
      for (const c of rows) {
        if (!descendantIds.has(c.id) && descendantIds.has(c.parent)) {
          descendantIds.add(c.id);
          descendantSlugs.add(c.slug.toLowerCase());
          addedMore = true;
        }
      }
    }

    return res.json({
      category: {
        id: matched.id,
        name: matched.name,
        slug: matched.slug,
        parent: matched.parent,
        description: matched.description,
        count: matched.count,
        image: matched.image,
        hierarchicalUrl: matched.hierarchical_url,
        seo: {
          ...seo,
          canonicalUrl: seo.canonicalUrl || `${STORE_BASE_URL}${matched.hierarchical_url}`,
          permalink: matched.hierarchical_url,
          categoryUrl: matched.hierarchical_url,
        },
      },
      breadcrumbs: result.breadcrumbs,
      canonicalUrl: matched.hierarchical_url,
      fullCanonicalUrl: `${STORE_BASE_URL}${matched.hierarchical_url}`,
      children,
      descendantSlugs: Array.from(descendantSlugs),
      redirect: result.isRedirect ? matched.hierarchical_url : undefined,
    });
  } catch (err: any) {
    console.error('Error resolving category path:', err);
    return res.status(500).json({ error: 'Failed to resolve category' });
  }
});

// ==========================================
// ADMIN CATEGORY ENDPOINTS (PROTECTED)
// ==========================================
adminCategoriesRouter.use(authenticateToken);

// POST /api/admin/categories/sync - Trigger synchronization from WooCommerce
adminCategoriesRouter.post('/sync', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (isCategorySyncInProgress()) {
      return res.status(409).json({ error: 'Category sync is already in progress' });
    }
    const overwrite = req.body?.overwriteLocalEdits === true;
    const summary = await syncWooCommerceCategories({ overwriteLocalEdits: overwrite });
    await logActivity(req.user!.email, 'CATEGORIES_SYNCED', summary, req.ip);
    return res.json({ success: true, summary });
  } catch (err: any) {
    if (err.message?.includes('already in progress')) {
      return res.status(409).json({ error: err.message });
    }
    console.error('Category sync error:', err);
    return res.status(500).json({ error: 'Category sync failed: ' + err.message });
  }
});

// GET /api/admin/categories/sync/status - Check sync status, running state, and history
adminCategoriesRouter.get('/sync/status', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const isRunning = isCategorySyncInProgress();
    const db = await getDb();
    const history = db.all<any>(
      "SELECT * FROM sync_logs WHERE type = 'categories' ORDER BY started_at DESC LIMIT 10"
    );
    const lastSync = history.length > 0 ? history[0] : null;
    return res.json({ isRunning, lastSync, history });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch sync status' });
  }
});

// GET /api/admin/categories - List all categories with statistics
adminCategoriesRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const rows = db.all<any>('SELECT * FROM categories ORDER BY parent_id ASC, menu_order ASC, name ASC');

    const catMap = new Map<number, any>(rows.map((r) => [r.id, r]));

    const formatted = rows.map((cat) => {
      let seo: CategorySeoSettings = {};
      try {
        seo = JSON.parse(cat.seo_json || '{}');
      } catch (_) {}

      const parentId = cat.parent_id !== undefined ? cat.parent_id : cat.parent;
      const hierarchicalUrl = cat.hierarchical_url || buildHierarchicalUrl(cat.id, catMap);
      const parentName = parentId ? catMap.get(parentId)?.name || 'Unknown' : 'None (Root Category)';

      return {
        id: cat.id,
        woo_id: cat.woo_id,
        parent_woo_id: cat.parent_woo_id,
        parent_id: parentId,
        parent: parentId,
        parentName,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        count: cat.product_count || cat.count || 0,
        product_count: cat.product_count || cat.count || 0,
        image: cat.image_url || cat.image || '',
        image_url: cat.image_url || cat.image || '',
        menu_order: cat.menu_order || cat.sort_order || 0,
        display: cat.display || 'default',
        source: cat.source || 'woocommerce',
        is_deleted_remote: Boolean(cat.is_deleted_remote),
        edited_locally: Boolean(cat.edited_locally),
        synced_at: cat.synced_at,
        hierarchicalUrl,
        updatedAt: cat.updated_at,
        seo: {
          ...seo,
          metaTitle: seo.metaTitle || cat.seo_title || `${cat.name} | iRepair Mobiles UK`,
          metaDescription: seo.metaDescription || cat.seo_description || cat.description,
          canonicalUrl: seo.canonicalUrl || `${STORE_BASE_URL}${hierarchicalUrl}`,
          permalink: hierarchicalUrl,
          categoryUrl: hierarchicalUrl,
        },
      };
    });

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/admin/categories/:id - Single category with full SEO details
adminCategoriesRouter.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const id = parseInt(req.params.id, 10);
    const db = await getDb();
    const cat = db.get<CategoryRecord>('SELECT * FROM categories WHERE id = ?', [id]);
    if (!cat) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const rows = db.all<CategoryRecord>('SELECT * FROM categories');
    const catMap = new Map<number, CategoryRecord>(rows.map((r) => [r.id, r]));
    const breadcrumbs = buildBreadcrumbsForCategory(cat.id, catMap);

    let seo: CategorySeoSettings = {};
    try {
      seo = JSON.parse(cat.seo_json || '{}');
    } catch (_) {}

    return res.json({
      ...cat,
      hierarchicalUrl: cat.hierarchical_url,
      breadcrumbs,
      seo: {
        ...seo,
        canonicalUrl: seo.canonicalUrl || `${STORE_BASE_URL}${cat.hierarchical_url}`,
        permalink: cat.hierarchical_url,
        categoryUrl: cat.hierarchical_url,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// POST /api/admin/categories - Create new category
adminCategoriesRouter.post('/', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { name, slug, parent, description, image, seo } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ error: 'Category name and slug are required' });
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
    const parentId = parseInt(parent, 10) || 0;

    const db = await getDb();
    const existing = db.get('SELECT id FROM categories WHERE slug = ? AND parent = ?', [cleanSlug, parentId]);
    if (existing) {
      return res.status(400).json({ error: 'A category with this slug and parent already exists' });
    }

    // Generate unique ID
    const maxRow = db.get<{ maxId: number }>('SELECT MAX(id) as maxId FROM categories');
    const newId = Math.max(9000, (maxRow?.maxId || 0) + 1);

    // Fetch existing categories to compute hierarchical URL
    const rows = db.all<CategoryRecord>('SELECT * FROM categories');
    const catMap = new Map<number, CategoryRecord>(rows.map((r) => [r.id, r]));

    const tempRecord: CategoryRecord = {
      id: newId,
      name,
      slug: cleanSlug,
      parent: parentId,
      description: description || '',
      count: 0,
      image: image || '',
      hierarchical_url: '',
      seo_json: '',
      sort_order: rows.length,
      updated_at: new Date().toISOString(),
    };
    catMap.set(newId, tempRecord);

    const hierarchicalUrl = buildHierarchicalUrl(newId, catMap);
    const updatedSeo = generateCategorySeo({ name, slug: cleanSlug, description }, hierarchicalUrl, seo);

    const now = new Date().toISOString();
    db.run(
      `INSERT INTO categories (
        id, woo_id, parent_woo_id, parent_id, parent, name, slug, description,
        image, image_url, menu_order, sort_order, product_count, count, display,
        seo_title, seo_description, seo_json, hierarchical_url, source,
        is_deleted_remote, edited_locally, synced_at, created_at, updated_at
      ) VALUES (?, NULL, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'default', ?, ?, ?, ?, 'local', 0, 1, NULL, ?, ?)`,
      [
        newId,
        parentId,
        parentId,
        name,
        cleanSlug,
        description || '',
        image || '',
        image || '',
        rows.length,
        rows.length,
        updatedSeo.metaTitle || `${name} | iRepair Mobiles UK`,
        updatedSeo.metaDescription || description || '',
        JSON.stringify(updatedSeo),
        hierarchicalUrl,
        now,
        now,
      ]
    );

    invalidateCategoryTreeCache();
    await logActivity(req.user!.email, 'CATEGORY_CREATED', { id: newId, name, slug: cleanSlug, hierarchicalUrl, source: 'local' }, req.ip);

    return res.json({
      success: true,
      id: newId,
      hierarchicalUrl,
      seo: updatedSeo,
    });
  } catch (err: any) {
    console.error('Create category error:', err);
    return res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /api/admin/categories/:id - Update category & recalculate hierarchy for category & all descendants
adminCategoriesRouter.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, slug, parent, description, image, seo } = req.body;

    const db = await getDb();
    const current = db.get<CategoryRecord>('SELECT * FROM categories WHERE id = ?', [id]);
    if (!current) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const cleanSlug = slug ? slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-') : current.slug;
    const parentId = parent !== undefined ? parseInt(parent, 10) || 0 : current.parent;

    // Prevent cyclic parent assignments
    if (parentId === id) {
      return res.status(400).json({ error: 'A category cannot be its own parent.' });
    }

    const rows = db.all<CategoryRecord>('SELECT * FROM categories');
    const catMap = new Map<number, CategoryRecord>(rows.map((r) => [r.id, r]));

    // Check ancestor cycle
    let checkAncestor = parentId;
    while (checkAncestor !== 0) {
      if (checkAncestor === id) {
        return res.status(400).json({ error: 'Cannot set a child category as the parent (cyclic dependency detected).' });
      }
      const ancestor = catMap.get(checkAncestor);
      if (!ancestor) break;
      checkAncestor = ancestor.parent;
    }

    const oldHierarchicalUrl = current.hierarchical_url;

    // Temporarily update this category in catMap
    const updatedThis: CategoryRecord = {
      ...current,
      name: name || current.name,
      slug: cleanSlug,
      parent: parentId,
      description: description !== undefined ? description : current.description,
      image: image !== undefined ? image : current.image,
    };
    catMap.set(id, updatedThis);

    // Compute new hierarchical URL
    const newHierarchicalUrl = buildHierarchicalUrl(id, catMap);

    // Parse existing SEO and update permalinks
    let currentSeo: CategorySeoSettings = {};
    try {
      currentSeo = JSON.parse(current.seo_json || '{}');
    } catch (_) {}

    const incomingSeo = seo || {};
    const updatedSeo: CategorySeoSettings = {
      ...currentSeo,
      ...incomingSeo,
      metaTitle: incomingSeo.metaTitle || `${updatedThis.name} | iRepair Mobiles UK`,
      metaDescription: incomingSeo.metaDescription || updatedThis.description || currentSeo.metaDescription,
      permalink: newHierarchicalUrl,
      categoryUrl: newHierarchicalUrl,
      // If user provided custom canonicalUrl and it didn't equal the old auto-canonical, keep it; otherwise recalculate:
      canonicalUrl:
        incomingSeo.canonicalUrl && incomingSeo.canonicalUrl !== `${STORE_BASE_URL}${oldHierarchicalUrl}`
          ? incomingSeo.canonicalUrl
          : `${STORE_BASE_URL}${newHierarchicalUrl}`,
    };

    const now = new Date().toISOString();

    // 1. Update this category
    const isLocal = (current as any).source === 'local';
    const displayVal = req.body.display || (current as any).display || 'default';
    const finalImageUrl = image !== undefined ? image : ((current as any).image_url || current.image);

    db.run(
      `UPDATE categories
       SET name = ?, slug = ?, parent = ?, parent_id = ?, description = ?, image = ?, image_url = ?,
           display = ?, seo_title = ?, seo_description = ?, hierarchical_url = ?, seo_json = ?,
           edited_locally = 1, updated_at = ?
       WHERE id = ?`,
      [
        isLocal ? updatedThis.name : current.name,
        isLocal ? cleanSlug : current.slug,
        isLocal ? parentId : current.parent,
        isLocal ? parentId : current.parent,
        updatedThis.description,
        finalImageUrl,
        finalImageUrl,
        displayVal,
        updatedSeo.metaTitle || '',
        updatedSeo.metaDescription || '',
        newHierarchicalUrl,
        JSON.stringify(updatedSeo),
        now,
        id,
      ]
    );

    // 2. Track 301 redirect if URL changed
    if (oldHierarchicalUrl && oldHierarchicalUrl !== newHierarchicalUrl) {
      const redId = `red_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      db.run(
        `INSERT OR REPLACE INTO category_redirects (id, from_url, to_url, status_code, created_at)
         VALUES (?, ?, ?, 301, ?)`,
        [redId, oldHierarchicalUrl, newHierarchicalUrl, 301, now]
      );
    }

    // 3. Recalculate all descendant categories recursively!
    const findDescendants = (rootId: number): number[] => {
      const result: number[] = [];
      const queue = [rootId];
      while (queue.length > 0) {
        const curr = queue.shift()!;
        for (const [cId, cat] of catMap.entries()) {
          if (cat.parent === curr && cId !== rootId) {
            result.push(cId);
            queue.push(cId);
          }
        }
      }
      return result;
    };

    const descendantIds = findDescendants(id);
    for (const childId of descendantIds) {
      const child = catMap.get(childId);
      if (!child) continue;

      const oldChildUrl = child.hierarchical_url;
      const newChildUrl = buildHierarchicalUrl(childId, catMap);

      let childSeo: CategorySeoSettings = {};
      try {
        childSeo = JSON.parse(child.seo_json || '{}');
      } catch (_) {}

      childSeo.categoryUrl = newChildUrl;
      childSeo.permalink = newChildUrl;
      childSeo.canonicalUrl = `${STORE_BASE_URL}${newChildUrl}`;

      db.run(
        'UPDATE categories SET hierarchical_url = ?, seo_json = ?, updated_at = ? WHERE id = ?',
        [newChildUrl, JSON.stringify(childSeo), now, childId]
      );

      if (oldChildUrl && oldChildUrl !== newChildUrl) {
        const rId = `red_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        db.run(
          `INSERT OR REPLACE INTO category_redirects (id, from_url, to_url, status_code, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [rId, oldChildUrl, newChildUrl, 301, now]
        );
      }

      // Update catMap with new values
      catMap.set(childId, { ...child, hierarchical_url: newChildUrl, seo_json: JSON.stringify(childSeo) });
    }

    invalidateCategoryTreeCache();

    await logActivity(
      req.user!.email,
      'CATEGORY_UPDATED',
      { id, slug: cleanSlug, parent: parentId, hierarchicalUrl: newHierarchicalUrl, descendantsUpdated: descendantIds.length },
      req.ip
    );

    return res.json({
      success: true,
      hierarchicalUrl: newHierarchicalUrl,
      seo: updatedSeo,
      descendantsUpdated: descendantIds.length,
    });
  } catch (err: any) {
    console.error('Update category error:', err);
    return res.status(500).json({ error: 'Failed to update category: ' + err.message });
  }
});

// DELETE /api/admin/categories/:id - Delete category
adminCategoriesRouter.delete('/:id', requireRole('super_admin', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const id = parseInt(req.params.id, 10);
    const db = await getDb();
    const existing = db.get<any>('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const now = new Date().toISOString();

    if (existing.source === 'woocommerce') {
      // For WooCommerce categories: soft-delete so remote sync doesn't resurrect it
      db.run('UPDATE categories SET is_deleted_remote = 1, updated_at = ? WHERE id = ?', [now, id]);
      invalidateCategoryTreeCache();
      await logActivity(req.user!.email, 'CATEGORY_SOFT_DELETED', { id, name: existing.name, slug: existing.slug }, req.ip);
      return res.json({ success: true, softDeleted: true });
    }

    // For local categories: reassign children to this category's parent (or 0) and remove
    db.run('UPDATE categories SET parent = ?, parent_id = ? WHERE parent = ? OR parent_id = ?', [existing.parent, existing.parent, id, id]);
    db.run('DELETE FROM categories WHERE id = ?', [id]);

    invalidateCategoryTreeCache();
    await logActivity(req.user!.email, 'CATEGORY_DELETED', { id, name: existing.name, slug: existing.slug }, req.ip);

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete category' });
  }
});
