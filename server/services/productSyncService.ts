import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDb, DatabaseWrapper } from '../db';
import { requestWoo, getWooCommerceConfig, WooConfig } from './wooCommerceService';
import { syncWooCommerceCategories, invalidateCategoryTreeCache } from './categorySyncService';
import { decodeHtmlEntities } from '../../src/utils/decodeHtml';
import { computeProductSyncHash } from './productMigrationService';

export interface ProductSyncConflict {
  productId: string;
  externalId: number;
  slug: string;
  conflictType: string;
  details: string;
}

export interface ProductSyncItemError {
  productId?: string;
  externalId?: number;
  title?: string;
  error: string;
}

export interface ProductSyncSummary {
  phase: string;
  productsCreated: number;
  productsUpdated: number;
  productsSkipped: number;
  productsFailed: number;
  variationsSynced: number;
  brandsSynced: number;
  attributesSynced: number;
  tagsSynced: number;
  imagesProcessed: number;
  categoriesSummary?: any;
  conflicts: ProductSyncConflict[];
  errors: ProductSyncItemError[];
  startedAt: string;
  finishedAt?: string;
  durationMs: number;
  dryRun?: boolean;
}

export interface ProductSyncProgress {
  isRunning: boolean;
  phase: 'idle' | 'categories' | 'taxonomies' | 'products' | 'relations' | 'seo_placeholder' | 'cleanup' | 'completed' | 'failed';
  currentStep: number;
  totalSteps: number;
  message: string;
  summary: ProductSyncSummary | null;
}

// Global Single-Run Mutex Lock & State
let isSyncRunning = false;
let currentProgress: ProductSyncProgress = {
  isRunning: false,
  phase: 'idle',
  currentStep: 0,
  totalSteps: 0,
  message: 'Idle',
  summary: null,
};

// In-memory catalog cache invalidation timestamp
let lastCatalogUpdateTime = Date.now();
export function getCatalogCacheVersion(): number {
  return lastCatalogUpdateTime;
}
export function invalidateCatalogCache(): void {
  lastCatalogUpdateTime = Date.now();
  invalidateCategoryTreeCache();
}

export function isProductSyncInProgress(): boolean {
  return isSyncRunning;
}

export function getProductSyncProgress(): ProductSyncProgress {
  return currentProgress;
}

/**
 * Sanitizes HTML from WordPress to remove malicious scripts and unsafe tags/attributes
 */
export function sanitizeHtml(rawHtml?: string): string {
  if (!rawHtml) return '';
  return rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b([^<]*)(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, (match) => {
      // Allow YouTube and Vimeo embed iframes inside a responsive wrapper
      if (/src=["'](https?:)?\/\/(www\.)?(youtube\.com\/embed\/|player\.vimeo\.com\/video\/|youtu\.be\/)[^"']*["']/i.test(match)) {
        return `<div class="responsive-video-wrapper my-4 aspect-video w-full rounded-2xl overflow-hidden shadow-sm">${match}</div>`;
      }
      return '';
    })
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '') // Remove on* event handlers
    .replace(/href\s*=\s*["']?javascript:[^"'>]+/gi, 'href="#"')
    .trim();
}

/**
 * Helper to ensure local uploads directory exists
 */
const PRODUCT_UPLOADS_DIR = path.resolve(process.cwd(), 'public', 'uploads', 'products');
if (!fs.existsSync(PRODUCT_UPLOADS_DIR)) {
  fs.mkdirSync(PRODUCT_UPLOADS_DIR, { recursive: true });
}

/**
 * Extracts condition string from product attributes, tags, or name
 */
function extractCondition(wpProduct: any, conditionSource: string, conditionTaxonomy: string): string {
  if (conditionSource === 'attribute') {
    if (Array.isArray(wpProduct.attributes)) {
      const condAttr = wpProduct.attributes.find(
        (a: any) =>
          a.slug === conditionTaxonomy ||
          a.slug === 'pa_condition' ||
          a.name?.toLowerCase() === 'condition'
      );
      if (condAttr && Array.isArray(condAttr.options) && condAttr.options.length > 0) {
        return decodeHtmlEntities(condAttr.options[0]);
      }
    }
  }

  if (conditionSource === 'tag') {
    if (Array.isArray(wpProduct.tags)) {
      const tagMatch = wpProduct.tags.find((t: any) =>
        t.name?.toLowerCase().includes('grade') ||
        t.name?.toLowerCase().includes('new') ||
        t.name?.toLowerCase().includes('refurbished')
      );
      if (tagMatch) {
        return decodeHtmlEntities(tagMatch.name);
      }
    }
  }

  // Derive from product title and description
  const lowerName = (wpProduct.name || '').toLowerCase();
  const lowerDesc = ((wpProduct.short_description || '') + ' ' + (wpProduct.description || '')).toLowerCase();
  if (lowerName.includes('new') && !lowerName.includes('used') && !lowerName.includes('like new')) {
    return 'Brand New';
  }
  if (lowerName.includes('used') || lowerName.includes('grade b') || lowerDesc.includes('grade b')) {
    return 'Refurbished - Excellent (Grade B)';
  }
  return 'Refurbished - Pristine (Grade A)';
}

/**
 * Extracts brand string from product attributes, taxonomies, or name
 */
function extractBrand(wpProduct: any, brandSource: string, brandTaxonomy: string): string {
  if (brandSource === 'attribute') {
    if (Array.isArray(wpProduct.attributes)) {
      const brandAttr = wpProduct.attributes.find(
        (a: any) =>
          a.slug === brandTaxonomy ||
          a.slug === 'pa_brand' ||
          a.name?.toLowerCase() === 'brand'
      );
      if (brandAttr && Array.isArray(brandAttr.options) && brandAttr.options.length > 0) {
        return decodeHtmlEntities(brandAttr.options[0]);
      }
    }
  }

  // Fallback to title deduction
  const lower = (wpProduct.name || '').toLowerCase();
  if (lower.includes('iphone') || lower.includes('apple') || lower.includes('macbook') || lower.includes('ipad')) return 'Apple';
  if (lower.includes('samsung') || lower.includes('galaxy')) return 'Samsung';
  if (lower.includes('pixel') || lower.includes('google')) return 'Google';
  if (lower.includes('budi')) return 'BUDI';
  if (lower.includes('veger')) return 'Veger';
  if (lower.includes('alcatel')) return 'Alcatel';
  if (lower.includes('dell')) return 'Dell';
  if (lower.includes('hp')) return 'HP';
  if (lower.includes('lenovo')) return 'Lenovo';
  if (lower.includes('oneplus')) return 'OnePlus';
  return 'iRepair';
}

export interface CustomFieldMappingItem {
  role: 'delivery' | 'warranty' | 'returns' | 'technical_details';
  label: string;
  metaKey: string;
  type: 'text' | 'html';
  enabled: boolean;
}

export const DEFAULT_CUSTOM_FIELD_MAPPINGS: CustomFieldMappingItem[] = [
  { role: 'delivery', label: 'Delivery text', metaKey: 'delivery_text', type: 'text', enabled: true },
  { role: 'warranty', label: 'Warranty Text', metaKey: 'warranty_text', type: 'text', enabled: true },
  { role: 'returns', label: 'Returns', metaKey: 'returns_', type: 'text', enabled: true },
  { role: 'technical_details', label: 'Technical Details', metaKey: 'technical_details', type: 'html', enabled: true },
];

export function getCustomFieldMappings(db: DatabaseWrapper): CustomFieldMappingItem[] {
  try {
    const row = db.get<{ value_json: string }>(
      'SELECT value_json FROM site_settings WHERE key = ?',
      ['acf_custom_fields_mapping']
    );
    if (row && row.value_json) {
      const parsed = JSON.parse(row.value_json);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (_) {}
  return DEFAULT_CUSTOM_FIELD_MAPPINGS;
}

/**
 * Extracts and sanitizes ACF fields for a product based on active mappings
 */
export async function extractAcfCustomFields(
  wpProduct: any,
  mappings: CustomFieldMappingItem[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const metaArray = Array.isArray(wpProduct.meta_data) ? wpProduct.meta_data : [];

  let wpRestAcf: Record<string, any> | null = null;
  let triedWpRest = false;

  for (const mapping of mappings) {
    if (!mapping.enabled) continue;
    const key = mapping.metaKey;
    let rawVal: any = undefined;

    // 1. Try WooCommerce meta_data array (ignoring underscore-prefixed reference keys like _delivery_text)
    const metaMatch = metaArray.find((m: any) => m && m.key === key && !m.key.startsWith('_'));
    if (metaMatch && metaMatch.value !== undefined && metaMatch.value !== null) {
      rawVal = metaMatch.value;
    }

    // 2. If not found in meta_data, try WordPress REST API /wp-json/wp/v2/product/{id} in "acf" object
    if ((rawVal === undefined || rawVal === null || (typeof rawVal === 'string' && !rawVal.trim())) && wpProduct.id) {
      if (!triedWpRest) {
        triedWpRest = true;
        try {
          const wpRes = await requestWoo(`/wp-json/wp/v2/product/${wpProduct.id}`);
          if (wpRes.statusCode === 200 && wpRes.data && typeof wpRes.data.acf === 'object') {
            wpRestAcf = wpRes.data.acf;
          }
        } catch (_) {}
      }

      if (wpRestAcf && wpRestAcf[key] !== undefined && wpRestAcf[key] !== null) {
        rawVal = wpRestAcf[key];
      }
    }

    // Process and sanitize value
    if (rawVal !== undefined && rawVal !== null) {
      const strVal = String(rawVal).trim();
      if (strVal.length > 0) {
        if (mapping.type === 'html') {
          result[key] = sanitizeHtml(decodeHtmlEntities(strVal));
        } else {
          // Plain text: escape/strip HTML tags, decode entities, normalize whitespace
          result[key] = decodeHtmlEntities(strVal).replace(/<[^>]*>/g, '').trim();
        }
      }
    }
  }

  return result;
}

/**
 * Tests connection to sample product and reports which API each ACF field is found in
 */
export async function testAcfConnection(): Promise<{
  success: boolean;
  sampleProductId?: number;
  sampleProductTitle?: string;
  fields: {
    role: string;
    label: string;
    metaKey: string;
    type: string;
    enabled: boolean;
    found: boolean;
    source: 'woocommerce_meta_data' | 'wordpress_rest_acf' | 'not_found';
    sampleValue: string;
    warning?: string;
  }[];
  summaryWarning?: string;
}> {
  const db = await getDb();
  const mappings = getCustomFieldMappings(db);

  // 1. Fetch 1 sample product via WooCommerce REST API
  const res = await requestWoo('/products?per_page=1');
  if (res.statusCode !== 200 || !res.data || !Array.isArray(res.data) || res.data.length === 0) {
    return {
      success: false,
      fields: [],
      summaryWarning: `Failed to fetch a sample product from WooCommerce (Status ${res.statusCode}). Please verify WooCommerce credentials.`,
    };
  }

  const p = res.data[0];
  const metaArray = Array.isArray(p.meta_data) ? p.meta_data : [];

  // 2. Fetch WordPress REST API /wp-json/wp/v2/product/{id} to check acf object
  let wpRestAcf: Record<string, any> | null = null;
  try {
    const wpRes = await requestWoo(`/wp-json/wp/v2/product/${p.id}`);
    if (wpRes.statusCode === 200 && wpRes.data && typeof wpRes.data.acf === 'object') {
      wpRestAcf = wpRes.data.acf;
    }
  } catch (_) {}

  const fieldReports: any[] = [];
  let foundCount = 0;

  for (const m of mappings) {
    let found = false;
    let source: 'woocommerce_meta_data' | 'wordpress_rest_acf' | 'not_found' = 'not_found';
    let sampleValue = '';
    let warning: string | undefined = undefined;

    // Check meta_data (ignore underscore-prefixed reference keys)
    const metaMatch = metaArray.find((meta: any) => meta && meta.key === m.metaKey && !meta.key.startsWith('_'));
    if (metaMatch && metaMatch.value !== undefined && metaMatch.value !== null && String(metaMatch.value).trim().length > 0) {
      found = true;
      source = 'woocommerce_meta_data';
      sampleValue = String(metaMatch.value).trim();
    } else if (wpRestAcf && wpRestAcf[m.metaKey] !== undefined && wpRestAcf[m.metaKey] !== null && String(wpRestAcf[m.metaKey]).trim().length > 0) {
      found = true;
      source = 'wordpress_rest_acf';
      sampleValue = String(wpRestAcf[m.metaKey]).trim();
    }

    if (found) {
      foundCount++;
      if (m.type === 'html') {
        sampleValue = sampleValue.slice(0, 150) + (sampleValue.length > 150 ? '...' : '');
      }
    } else {
      warning = `Key "${m.metaKey}" not found in sample product #${p.id}. If using ACF, ensure the field name matches exactly or enable "Show in REST API" on the ACF field group.`;
    }

    fieldReports.push({
      role: m.role,
      label: m.label,
      metaKey: m.metaKey,
      type: m.type,
      enabled: m.enabled,
      found,
      source,
      sampleValue,
      warning,
    });
  }

  let summaryWarning: string | undefined = undefined;
  if (foundCount === 0) {
    summaryWarning = `None of the configured ACF fields were found on sample product #${p.id}. Enable "Show in REST API" on the ACF field group, or verify that the WordPress meta key names match your ACF field names.`;
  }

  return {
    success: foundCount > 0,
    sampleProductId: p.id,
    sampleProductTitle: p.name,
    fields: fieldReports,
    summaryWarning,
  };
}

/**
 * One-off action to re-sync custom fields for all products in the database
 */
export async function resyncCustomFieldsAll(): Promise<{
  success: boolean;
  totalProducts: number;
  updatedCount: number;
  durationMs: number;
}> {
  const db = await getDb();
  const startTime = Date.now();
  const mappings = getCustomFieldMappings(db);
  const nowIso = new Date().toISOString();
  let updatedCount = 0;

  // 1. Fetch live products from WooCommerce to get true meta_data array with ACF fields
  try {
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const res = await requestWoo(`/products?per_page=100&page=${page}&status=publish`);
      if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length > 0) {
        for (const wp of res.data) {
          const externalId = wp.id;
          const targetId = `wp-${externalId}`;
          const fields = await extractAcfCustomFields(wp, mappings);
          const fieldsJson = JSON.stringify(fields);
          const metaJson = JSON.stringify(wp.meta_data || []);

          db.run(
            `UPDATE products 
             SET custom_fields = ?, custom_meta = ?, updated_at = ? 
             WHERE id = ? OR external_id = ? OR wp_id = ?`,
            [fieldsJson, metaJson, nowIso, targetId, externalId, externalId]
          );

          // Update product_custom_fields table
          try {
            db.run('DELETE FROM product_custom_fields WHERE product_id = ?', [targetId]);
            for (const [fKey, fVal] of Object.entries(fields)) {
              if (fVal !== undefined && fVal !== null && String(fVal).trim() !== '') {
                const mapping = mappings.find(m => m.metaKey.toLowerCase() === fKey.toLowerCase());
                const fType = mapping ? mapping.type : (fKey === 'technical_details' ? 'html' : 'text');
                db.run(
                  `INSERT OR REPLACE INTO product_custom_fields (id, product_id, field_key, value, field_type, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [`pcf_${targetId}_${fKey}`, targetId, fKey, String(fVal), fType, nowIso, nowIso]
                );
              }
            }
          } catch (_) {}

          updatedCount++;
        }

        if (res.data.length < 100) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }
  } catch (wooErr: any) {
    console.warn('WooCommerce remote resync warning, continuing with local rows:', wooErr.message);
  }

  // 2. Also ensure any products in database that were not touched get populated from local custom_meta
  const products = db.all<any>('SELECT id, external_id, wp_id, custom_meta, custom_fields FROM products WHERE is_deleted_remote = 0');
  for (const p of products) {
    // If custom_fields is already populated, skip
    if (p.custom_fields && p.custom_fields !== '{}' && p.custom_fields.length > 5) {
      continue;
    }

    let metaArray: any[] = [];
    if (p.custom_meta) {
      try {
        const parsed = JSON.parse(p.custom_meta);
        if (Array.isArray(parsed)) metaArray = parsed;
        else if (typeof parsed === 'object') {
          metaArray = Object.entries(parsed).map(([k, v]) => ({ key: k, value: v }));
        }
      } catch (_) {}
    }

    const customFields: Record<string, string> = {};
    for (const mapping of mappings) {
      if (!mapping.enabled) continue;
      const key = mapping.metaKey;
      const match = metaArray.find((m: any) => m && (m.key === key || m.key?.toLowerCase() === key.toLowerCase()) && !m.key?.startsWith('_'));
      if (match && match.value !== undefined && match.value !== null) {
        const strVal = String(match.value).trim();
        if (strVal.length > 0) {
          if (mapping.type === 'html') {
            customFields[key] = sanitizeHtml(decodeHtmlEntities(strVal));
          } else {
            customFields[key] = decodeHtmlEntities(strVal).replace(/<[^>]*>/g, '').trim();
          }
        }
      }
    }

    if (Object.keys(customFields).length > 0) {
      const customFieldsJson = JSON.stringify(customFields);
      db.run(
        'UPDATE products SET custom_fields = ?, updated_at = ? WHERE id = ?',
        [customFieldsJson, nowIso, p.id]
      );

      for (const [fKey, fVal] of Object.entries(customFields)) {
        const mapping = mappings.find(m => m.metaKey.toLowerCase() === fKey.toLowerCase());
        const fType = mapping ? mapping.type : 'text';
        db.run(
          `INSERT OR REPLACE INTO product_custom_fields (id, product_id, field_key, value, field_type, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [`pcf_${p.id}_${fKey}`, p.id, fKey, fVal, fType, nowIso, nowIso]
        );
      }
      updatedCount++;
    }
  }

  invalidateCatalogCache();

  return {
    success: true,
    totalProducts: products.length,
    updatedCount,
    durationMs: Date.now() - startTime,
  };
}

/**
 * One-off action to re-sync raw short descriptions for all products directly from WooCommerce.
 * Preserves raw HTML exactly as written in WordPress without tag stripping, entity decoding,
 * or character limit truncation, and re-computes sync_hash for change tracking.
 */
export async function resyncShortDescriptionsAll(): Promise<{
  success: boolean;
  totalProducts: number;
  updatedCount: number;
  durationMs: number;
  details?: string;
}> {
  const db = await getDb();
  const startTime = Date.now();
  const nowIso = new Date().toISOString();
  let updatedCount = 0;

  // 1. Fetch live products from WooCommerce to get true raw short_description
  try {
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const res = await requestWoo(`/products?per_page=100&page=${page}`);
      if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length > 0) {
        for (const wp of res.data) {
          const externalId = Number(wp.id);
          const rawShortDesc = wp.short_description !== undefined && wp.short_description !== null 
            ? String(wp.short_description) 
            : '';

          // Look up existing local product
          const existing = db.get<any>(
            'SELECT id, name, title, slug, sku, type, status, price, regular_price, sale_price, stock_status, stock_quantity, description, attributes_json, custom_fields FROM products WHERE external_id = ? OR wp_id = ? OR id = ?',
            [externalId, externalId, `wp-${externalId}`]
          );

          if (existing) {
            let attrs: any = undefined;
            try { attrs = JSON.parse(existing.attributes_json || '[]'); } catch (_) {}
            let cFields: any = undefined;
            try { cFields = JSON.parse(existing.custom_fields || '{}'); } catch (_) {}

            const syncHash = computeProductSyncHash({
              name: existing.title || existing.name,
              slug: existing.slug,
              sku: existing.sku,
              type: existing.type,
              status: existing.status,
              price: existing.price,
              regular_price: existing.regular_price,
              sale_price: existing.sale_price,
              stock_status: existing.stock_status,
              stock_quantity: existing.stock_quantity,
              description: existing.description,
              short_description: rawShortDesc,
              attributes: attrs,
              custom_fields: cFields,
            });

            db.run(
              `UPDATE products 
               SET short_description = ?, sync_hash = ?, updated_at = ? 
               WHERE id = ?`,
              [rawShortDesc, syncHash, nowIso, existing.id]
            );
            updatedCount++;
          }
        }

        if (res.data.length < 100) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }
  } catch (wooErr: any) {
    console.warn('WooCommerce remote short description re-sync warning:', wooErr.message);
  }

  // 2. Also ensure local products have formatted short descriptions if they had plain text newlines
  const localProducts = db.all<any>(
    "SELECT id, short_description, sync_hash FROM products WHERE source = 'local' OR external_id IS NULL"
  );
  for (const lp of localProducts) {
    if (lp.short_description && typeof lp.short_description === 'string') {
      const hasHtml = /<[a-z][\s\S]*>/i.test(lp.short_description);
      if (!hasHtml && lp.short_description.includes('\n')) {
        const lines = lp.short_description.split('\n').map((l: string) => l.trim()).filter(Boolean);
        let formatted = '';
        if (lines.length > 1) {
          formatted = `<ul>\n${lines.map((l: string) => `<li>${l.replace(/^[•\-\*]\s*/, '')}</li>`).join('\n')}\n</ul>`;
        } else {
          formatted = `<p>${lp.short_description}</p>`;
        }
        db.run('UPDATE products SET short_description = ?, updated_at = ? WHERE id = ?', [formatted, nowIso, lp.id]);
        updatedCount++;
      }
    }
  }

  invalidateCatalogCache();

  const total = db.get<{ count: number }>('SELECT count(*) as count FROM products WHERE is_deleted_remote = 0');

  return {
    success: true,
    totalProducts: total?.count || 0,
    updatedCount,
    durationMs: Date.now() - startTime,
    details: `Successfully re-synced raw HTML short descriptions for ${updatedCount} products from WooCommerce.`,
  };
}

/**
 * Normalizes attribute keys across WooCommerce variants (pa_storage, Storage, storage, pa_color, Colour)
 */
export function normalizeAttributeKey(nameOrSlug: string): string {
  if (!nameOrSlug) return '';
  let key = nameOrSlug.toLowerCase().trim();
  key = key.replace(/^attribute_/, '').replace(/^pa_/, '');
  if (key === 'colour') key = 'color';
  return key;
}

/**
 * Normalizes attribute options, treating empty or missing options as 'any'
 */
export function normalizeOptionValue(val: string): string {
  if (!val || val === 'any' || val === 'Any') return 'any';
  return val.trim();
}

/**
 * Synchronizes all variations for a single variable product from WooCommerce with pagination,
 * atomic transaction, 'Any' option preservation, and price range calculation.
 */
export async function syncProductVariationsSingle(
  productId: string,
  externalId: number,
  primaryImage: string,
  parentSku: string,
  wpDefaultAttributes: any[] = [],
  db: DatabaseWrapper
): Promise<{
  syncedCount: number;
  minPrice: number;
  maxPrice: number;
  minRegularPrice: number;
  maxRegularPrice: number;
  hasPriceRange: boolean;
  anyOnSale: boolean;
  variations: any[];
}> {
  const nowIso = new Date().toISOString();
  let page = 1;
  let totalPages = 1;
  const allWpVariations: any[] = [];

  // 1. Paginated fetch of ALL variations (per_page=100, read x-wp-totalpages)
  while (page <= totalPages) {
    const varRes = await requestWoo(`/products/${externalId}/variations?per_page=100&page=${page}`);
    if (varRes.statusCode === 200 && Array.isArray(varRes.data)) {
      const headerTotalPages = parseInt(varRes.headers?.['x-wp-totalpages'] || '1', 10);
      if (!isNaN(headerTotalPages) && headerTotalPages > totalPages) {
        totalPages = headerTotalPages;
      }
      allWpVariations.push(...varRes.data);
      if (varRes.data.length < 100) {
        break;
      }
    } else {
      break;
    }
    page++;
  }

  const currentVarIds = new Set<string>();
  const variationRecords: any[] = [];

  for (const v of allWpVariations) {
    const varId = `var_${v.id}`;
    currentVarIds.add(varId);
    const vPrice = parseFloat(v.price || v.regular_price || '0');
    const vRegPrice = v.regular_price ? parseFloat(v.regular_price) : (vPrice > 0 ? vPrice : null);
    const vSalePrice = v.sale_price ? parseFloat(v.sale_price) : null;
    const vOnSale = Boolean(v.on_sale || (vRegPrice && vPrice && vRegPrice > vPrice));
    const vStock = v.stock_status || (v.in_stock ? 'instock' : 'outofstock');
    const vStockQty = typeof v.stock_quantity === 'number' ? v.stock_quantity : (vStock === 'instock' ? 10 : 0);
    const vImage = v.image?.src || primaryImage || '';
    const vStatus = v.status || 'publish';
    const vBackorders = v.backorders || 'no';
    const vWeight = v.weight || '';
    const vLength = v.dimensions?.length || '';
    const vWidth = v.dimensions?.width || '';
    const vHeight = v.dimensions?.height || '';
    const vDescription = v.description || '';
    const vName = v.name || '';
    const vMenuOrder = v.menu_order || 0;
    const vSku = v.sku || (parentSku ? `${parentSku}-V${v.id}` : `VAR-${v.id}`);
    const saleFrom = v.date_on_sale_from || v.date_on_sale_from_gmt || null;
    const saleTo = v.date_on_sale_to || v.date_on_sale_to_gmt || null;

    // Attribute mapping with robust matching:
    // Important: an empty option means "Any" (the variation applies to every value of that attribute)
    // We preserve 'any' explicitly, never drop it.
    const vAttributes: Record<string, string> = {};
    if (Array.isArray(v.attributes)) {
      v.attributes.forEach((va: any) => {
        const rawKey = va.slug || va.name || '';
        const normKey = normalizeAttributeKey(rawKey);
        const optVal = (va.option !== undefined && va.option !== null && String(va.option).trim() !== '')
          ? decodeHtmlEntities(String(va.option).trim())
          : 'any';
        vAttributes[normKey] = optVal;
        if (rawKey.toLowerCase() !== normKey) {
          vAttributes[rawKey.toLowerCase()] = optVal;
        }
      });
    }

    variationRecords.push({
      id: varId,
      productId,
      sku: vSku,
      attribute_values_json: JSON.stringify(vAttributes),
      regular_price: vRegPrice,
      sale_price: vSalePrice,
      price: vPrice,
      sale_from: saleFrom,
      sale_to: saleTo,
      on_sale: vOnSale ? 1 : 0,
      stock_status: vStock,
      manage_stock: v.manage_stock ? 1 : 0,
      stock_quantity: vStockQty,
      backorders: vBackorders,
      image: vImage,
      status: vStatus,
      weight: vWeight,
      length: vLength,
      width: vWidth,
      height: vHeight,
      description: vDescription,
      name: vName,
      menu_order: vMenuOrder,
      external_id: v.id,
      external_parent_id: externalId,
      external_modified_at: v.date_modified || nowIso,
    });
  }

  // Parse default attributes from parent WooCommerce product
  const defaultAttrMap: Record<string, string> = {};
  if (Array.isArray(wpDefaultAttributes)) {
    wpDefaultAttributes.forEach((da: any) => {
      const key = normalizeAttributeKey(da.slug || da.name || '');
      if (key && da.option) {
        defaultAttrMap[key] = decodeHtmlEntities(String(da.option).trim());
      }
    });
  }

  // Compute price ranges from PUBLISHED, purchasable variations
  const publishedVars = variationRecords.filter(vr => (vr.status === 'publish' || !vr.status) && vr.price > 0);
  let minPrice = 0;
  let maxPrice = 0;
  let minRegularPrice = 0;
  let maxRegularPrice = 0;
  let hasPriceRange = 0;
  let anyOnSale = 0;

  if (publishedVars.length > 0) {
    const prices = publishedVars.map(v => v.price);
    const regPrices = publishedVars.map(v => (v.regular_price != null && v.regular_price > 0 ? v.regular_price : v.price));
    minPrice = Math.min(...prices);
    maxPrice = Math.max(...prices);
    minRegularPrice = Math.min(...regPrices);
    maxRegularPrice = Math.max(...regPrices);
    hasPriceRange = minPrice !== maxPrice ? 1 : 0;
    anyOnSale = publishedVars.some(v => v.on_sale === 1) ? 1 : 0;
  }

  // Wrap in atomic DB transaction
  db.transaction(() => {
    for (const vr of variationRecords) {
      db.run(
        `INSERT OR REPLACE INTO product_variations (
          id, product_id, sku, attribute_values_json, regular_price, sale_price, price,
          sale_from, sale_to, on_sale, stock_status, manage_stock, stock_quantity,
          backorders, image, status, weight, length, width, height, description, name, menu_order,
          source, connection_id, external_id, external_parent_id,
          external_modified_at, last_synced_at, sync_hash, is_deleted_remote,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          'woocommerce', 'wc_main', ?, ?,
          ?, ?, '', 0,
          ?, ?
        )`,
        [
          vr.id, vr.productId, vr.sku, vr.attribute_values_json, vr.regular_price, vr.sale_price, vr.price,
          vr.sale_from, vr.sale_to, vr.on_sale, vr.stock_status, vr.manage_stock, vr.stock_quantity,
          vr.backorders, vr.image, vr.status, vr.weight, vr.length, vr.width, vr.height, vr.description, vr.name, vr.menu_order,
          vr.external_id, vr.external_parent_id,
          vr.external_modified_at, nowIso,
          nowIso, nowIso
        ]
      );
    }

    // Remove local variations that were deleted in WooCommerce
    const oldVariations = db.all<{ id: string }>(
      "SELECT id FROM product_variations WHERE product_id = ? AND source = 'woocommerce'",
      [productId]
    );
    for (const ov of oldVariations) {
      if (!currentVarIds.has(ov.id)) {
        db.run('DELETE FROM product_variations WHERE id = ?', [ov.id]);
      }
    }

    // Update parent product with computed price ranges and default attributes
    const defaultJson = Object.keys(defaultAttrMap).length > 0 ? JSON.stringify(defaultAttrMap) : '{}';
    db.run(
      `UPDATE products 
       SET min_price = ?, max_price = ?, min_regular_price = ?, max_regular_price = ?, 
           has_price_range = ?, any_on_sale = ?, default_attributes_json = ?,
           price = CASE WHEN ? > 0 THEN ? ELSE price END,
           regular_price = CASE WHEN ? > 0 THEN ? ELSE regular_price END,
           updated_at = ?
       WHERE id = ?`,
      [
        minPrice, maxPrice, minRegularPrice, maxRegularPrice,
        hasPriceRange, anyOnSale, defaultJson,
        minPrice, minPrice,
        minRegularPrice, minRegularPrice,
        nowIso, productId
      ]
    );
  });

  return {
    syncedCount: variationRecords.length,
    minPrice,
    maxPrice,
    minRegularPrice,
    maxRegularPrice,
    hasPriceRange: hasPriceRange === 1,
    anyOnSale: anyOnSale === 1,
    variations: variationRecords,
  };
}

/**
 * Re-sync variations for a single variable product by ID or external ID
 */
export async function resyncProductVariationsById(idOrExternalId: string | number): Promise<{
  success: boolean;
  productId: string;
  externalId: number;
  syncedCount: number;
  minPrice: number;
  maxPrice: number;
  hasPriceRange: boolean;
}> {
  const db = await getDb();
  let product: any = null;

  if (typeof idOrExternalId === 'number' || !isNaN(Number(idOrExternalId))) {
    const extId = Number(idOrExternalId);
    product = db.get<any>('SELECT * FROM products WHERE external_id = ? OR wp_id = ?', [extId, extId]);
  } else {
    product = db.get<any>('SELECT * FROM products WHERE id = ? OR slug = ?', [idOrExternalId, idOrExternalId]);
  }

  if (!product) {
    throw new Error(`Product ${idOrExternalId} not found`);
  }

  const externalId = Number(product.external_id || product.wp_id);
  if (!externalId) {
    throw new Error(`Product ${product.id} has no WooCommerce external ID`);
  }

  // Fetch parent product to get fresh default_attributes, sku, and image
  let wpDefaultAttrs: any[] = [];
  let primaryImage = product.image || '';
  let sku = product.sku || '';

  try {
    const pRes = await requestWoo(`/products/${externalId}`);
    if (pRes.statusCode === 200 && pRes.data) {
      wpDefaultAttrs = pRes.data.default_attributes || [];
      if (pRes.data.images?.[0]?.src) {
        primaryImage = pRes.data.images[0].src;
      }
      if (pRes.data.sku) {
        sku = pRes.data.sku;
      }
    }
  } catch (_) {}

  const result = await syncProductVariationsSingle(
    product.id,
    externalId,
    primaryImage,
    sku,
    wpDefaultAttrs,
    db
  );

  invalidateCatalogCache();

  return {
    success: true,
    productId: product.id,
    externalId,
    syncedCount: result.syncedCount,
    minPrice: result.minPrice,
    maxPrice: result.maxPrice,
    hasPriceRange: result.hasPriceRange,
  };
}

/**
 * Re-sync variations for all variable products directly from WooCommerce with progress tracking
 */
export async function resyncVariationsAll(): Promise<{
  success: boolean;
  totalVariableProducts: number;
  totalVariationsSynced: number;
  durationMs: number;
  errors: any[];
}> {
  const db = await getDb();
  const startTime = Date.now();
  let totalVariationsSynced = 0;
  const errors: any[] = [];

  // Find all variable products in SQLite database
  const variableProducts = db.all<any>(
    "SELECT id, external_id, wp_id, sku, image, title, default_attributes_json FROM products WHERE type = 'variable' AND is_deleted_remote = 0 AND (external_id IS NOT NULL OR wp_id IS NOT NULL)"
  );

  for (const p of variableProducts) {
    const extId = Number(p.external_id || p.wp_id);
    if (!extId) continue;

    try {
      let wpDefaultAttrs: any[] = [];
      let primaryImg = p.image || '';
      let sku = p.sku || '';

      try {
        const pRes = await requestWoo(`/products/${extId}`);
        if (pRes.statusCode === 200 && pRes.data) {
          wpDefaultAttrs = pRes.data.default_attributes || [];
          if (pRes.data.images?.[0]?.src) primaryImg = pRes.data.images[0].src;
          if (pRes.data.sku) sku = pRes.data.sku;
        }
      } catch (_) {}

      const syncRes = await syncProductVariationsSingle(
        p.id,
        extId,
        primaryImg,
        sku,
        wpDefaultAttrs,
        db
      );

      totalVariationsSynced += syncRes.syncedCount;
    } catch (err: any) {
      errors.push({ id: p.id, externalId: extId, title: p.title, error: err.message });
    }
  }

  invalidateCatalogCache();

  return {
    success: true,
    totalVariableProducts: variableProducts.length,
    totalVariationsSynced,
    durationMs: Date.now() - startTime,
    errors,
  };
}

/**
 * Executes a full or incremental sync run in strict sequential phases
 */
export async function executeProductSync(options: {
  type: 'full' | 'incremental' | 'reconcile' | 'categories_only' | 'products_only' | 'dry_run';
  singleExternalId?: number;
}): Promise<ProductSyncSummary> {
  if (isSyncRunning) {
    throw new Error('A synchronization job is already in progress');
  }

  isSyncRunning = true;
  const startTime = Date.now();
  const nowIso = new Date().toISOString();
  const syncLogId = `sync_${options.type}_${startTime}`;
  const db = await getDb();
  const config = await getWooCommerceConfig();
  const isDryRun = options.type === 'dry_run';

  const summary: ProductSyncSummary = {
    phase: 'starting',
    productsCreated: 0,
    productsUpdated: 0,
    productsSkipped: 0,
    productsFailed: 0,
    variationsSynced: 0,
    brandsSynced: 0,
    attributesSynced: 0,
    tagsSynced: 0,
    imagesProcessed: 0,
    conflicts: [],
    errors: [],
    startedAt: nowIso,
    durationMs: 0,
    dryRun: isDryRun,
  };

  currentProgress = {
    isRunning: true,
    phase: 'categories',
    currentStep: 0,
    totalSteps: 100,
    message: 'Starting sync...',
    summary,
  };

  // Write start record to sync_logs
  try {
    db.run(
      `INSERT INTO sync_logs (id, type, started_at, status, summary, error)
       VALUES (?, ?, ?, 'running', ?, NULL)`,
      [syncLogId, `products_${options.type}`, nowIso, JSON.stringify(summary)]
    );
  } catch (err: any) {
    console.warn('Could not write initial sync log:', err.message);
  }

  try {
    // ========================================================
    // PHASE 1: CATEGORIES
    // ========================================================
    if (options.type !== 'products_only') {
      currentProgress.phase = 'categories';
      currentProgress.message = 'Phase 1/6: Synchronizing categories hierarchy...';
      try {
        const catSummary = await syncWooCommerceCategories({ overwriteLocalEdits: false });
        summary.categoriesSummary = catSummary;
      } catch (catErr: any) {
        console.warn('Category sync warning:', catErr.message);
        summary.errors.push({ error: `Category sync warning: ${catErr.message}` });
      }
    }

    if (options.type === 'categories_only') {
      summary.phase = 'completed';
      summary.finishedAt = new Date().toISOString();
      summary.durationMs = Date.now() - startTime;
      currentProgress.phase = 'completed';
      currentProgress.isRunning = false;
      isSyncRunning = false;
      invalidateCatalogCache();
      return summary;
    }

    // Map existing categories for quick lookups
    const existingDbCats = db.all<any>('SELECT id, slug, woo_id, parent_id, hierarchical_url FROM categories');
    const catByWooId = new Map<number, any>();
    const catBySlug = new Map<string, any>();
    for (const c of existingDbCats) {
      if (c.woo_id) catByWooId.set(Number(c.woo_id), c);
      catBySlug.set(c.slug.toLowerCase(), c);
    }

    // ========================================================
    // PHASE 2: BRANDS, ATTRIBUTES AND TERMS, TAGS
    // ========================================================
    currentProgress.phase = 'taxonomies';
    currentProgress.message = 'Phase 2/6: Synchronizing attributes, terms, tags and brands...';

    // 2.1 Attributes & Terms
    try {
      const attrRes = await requestWoo('/products/attributes');
      if (attrRes.statusCode === 200 && Array.isArray(attrRes.data)) {
        for (const attr of attrRes.data) {
          const attrId = `attr_${attr.id}`;
          const attrSlug = attr.slug || `pa_${attr.name.toLowerCase()}`;
          if (!isDryRun) {
            db.run(
              `INSERT OR REPLACE INTO attributes (id, external_id, name, slug, type, order_by, has_archives, source, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'woocommerce', ?)`,
              [attrId, attr.id, decodeHtmlEntities(attr.name), attrSlug, attr.type || 'select', attr.order_by || 'menu_order', attr.has_archives ? 1 : 0, nowIso]
            );
          }
          summary.attributesSynced++;

          // Fetch terms for this attribute
          try {
            const termsRes = await requestWoo(`/products/attributes/${attr.id}/terms?per_page=100`);
            if (termsRes.statusCode === 200 && Array.isArray(termsRes.data)) {
              for (const term of termsRes.data) {
                const termId = `term_${term.id}`;
                if (!isDryRun) {
                  db.run(
                    `INSERT OR REPLACE INTO attribute_terms (id, attribute_id, external_id, name, slug, description, menu_order, count, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [termId, attrId, term.id, decodeHtmlEntities(term.name), term.slug, decodeHtmlEntities(term.description || ''), term.menu_order || 0, term.count || 0, nowIso]
                  );
                }
              }
            }
          } catch (_) {}
        }
      }
    } catch (attrErr: any) {
      summary.errors.push({ error: `Attributes sync warning: ${attrErr.message}` });
    }

    // 2.2 Tags
    try {
      const tagsRes = await requestWoo('/products/tags?per_page=100');
      if (tagsRes.statusCode === 200 && Array.isArray(tagsRes.data)) {
        for (const tag of tagsRes.data) {
          const tagId = `tag_${tag.id}`;
          if (!isDryRun) {
            db.run(
              `INSERT OR REPLACE INTO tags (id, external_id, name, slug, description, count, source)
               VALUES (?, ?, ?, ?, ?, ?, 'woocommerce')`,
              [tagId, tag.id, decodeHtmlEntities(tag.name), tag.slug, decodeHtmlEntities(tag.description || ''), tag.count || 0]
            );
          }
          summary.tagsSynced++;
        }
      }
    } catch (tagErr: any) {
      summary.errors.push({ error: `Tags sync warning: ${tagErr.message}` });
    }

    // 2.3 Brands (check custom taxonomy or attributes)
    const brandMap = new Map<string, string>(); // name.toLowerCase() -> brandId
    const existingBrands = db.all<any>('SELECT * FROM brands');
    for (const b of existingBrands) {
      brandMap.set(b.name.toLowerCase(), b.id);
    }

    // ========================================================
    // PHASE 3: PRODUCTS & VARIATIONS & IMAGES
    // ========================================================
    currentProgress.phase = 'products';
    currentProgress.message = 'Phase 3/6: Fetching and mapping products and variations...';

    let page = 1;
    let totalPages = 1;
    const importedStatuses = config.importedStatuses || ['publish'];
    const statusQuery = importedStatuses.includes('all') || importedStatuses.includes('any') ? 'any' : importedStatuses.join(',');

    // Determine last sync time for incremental sync
    let modifiedAfterParam = '';
    if (options.type === 'incremental') {
      const lastSuccessfulLog = db.get<{ started_at: string }>(
        "SELECT started_at FROM sync_logs WHERE type LIKE 'products_%' AND status = 'success' ORDER BY started_at DESC LIMIT 1"
      );
      if (lastSuccessfulLog?.started_at) {
        modifiedAfterParam = `&modified_after=${encodeURIComponent(lastSuccessfulLog.started_at)}`;
      }
    }

    const remoteExternalIds = new Set<number>();
    const customFieldMappings = getCustomFieldMappings(db);

    while (page <= totalPages) {
      let endpoint = `/products?per_page=50&page=${page}&status=${statusQuery}${modifiedAfterParam}`;
      if (options.singleExternalId) {
        endpoint = `/products/${options.singleExternalId}`;
      }

      currentProgress.message = `Phase 3/6: Processing products page ${page} of ${totalPages}...`;

      const res = await requestWoo(endpoint);
      if (res.statusCode !== 200 || !res.data) {
        throw new Error(`WooCommerce API error fetching products on page ${page}: status ${res.statusCode}`);
      }

      const productsBatch: any[] = options.singleExternalId
        ? [res.data]
        : Array.isArray(res.data) ? res.data : [];

      if (!options.singleExternalId) {
        const headerTotalPages = parseInt(res.headers?.['x-wp-totalpages'] || '1', 10);
        totalPages = isNaN(headerTotalPages) ? page : headerTotalPages;
      }

      // Process batch
      for (const wp of productsBatch) {
        const externalId = Number(wp.id);
        remoteExternalIds.add(externalId);

        try {
          const title = decodeHtmlEntities(wp.name || '');
          const slug = (wp.slug || '').trim().toLowerCase();
          const sku = wp.sku || `IR-${externalId}`;
          const type = wp.type || 'simple';
          const status = wp.status || 'publish';
          const shortDesc = wp.short_description !== undefined && wp.short_description !== null ? String(wp.short_description) : '';
          const desc = sanitizeHtml(decodeHtmlEntities(wp.description || ''));
          const regularPrice = wp.regular_price ? parseFloat(wp.regular_price) : null;
          const salePrice = wp.sale_price ? parseFloat(wp.sale_price) : null;
          const price = parseFloat(wp.price || wp.regular_price || '0') || 0;
          const onSale = Boolean(wp.on_sale || (regularPrice && regularPrice > price));
          const stockStatus = wp.stock_status || (wp.in_stock ? 'instock' : 'outofstock');
          const manageStock = wp.manage_stock ? 1 : 0;
          const stockQuantity = typeof wp.stock_quantity === 'number' ? wp.stock_quantity : 10;
          const permalink = wp.permalink || `https://irepair-mobiles.co.uk/product/${slug}/`;
          const featured = wp.featured ? 1 : 0;
          const dateCreated = wp.date_created || nowIso;
          const dateModified = wp.date_modified || nowIso;

          // Determine brand and condition
          const brandName = extractBrand(wp, config.brandSource || 'attribute', config.brandTaxonomy || 'pa_brand');
          const condition = extractCondition(wp, config.conditionSource || 'attribute', config.conditionTaxonomy || 'pa_condition');

          // Ensure Brand exists in brands table
          let brandId = brandMap.get(brandName.toLowerCase());
          if (!brandId) {
            brandId = `brand_${brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
            if (!isDryRun) {
              db.run(
                `INSERT OR IGNORE INTO brands (id, external_id, name, slug, description, logo_url, website, product_count, source, created_at, updated_at)
                 VALUES (?, NULL, ?, ?, ?, '', '', 0, 'woocommerce', ?, ?)`,
                [brandId, brandName, brandId.replace('brand_', ''), `Official ${brandName} refurbished smartphones and tech`, nowIso, nowIso]
              );
            }
            brandMap.set(brandName.toLowerCase(), brandId);
            summary.brandsSynced++;
          }

          // Check if local product with same slug collides
          const existingLocal = db.get<any>('SELECT id, source, slug, external_id, sync_hash, local_hidden FROM products WHERE slug = ?', [slug]);
          let targetId = `wp-${externalId}`;
          let targetSlug = slug;

          if (existingLocal && existingLocal.source === 'local' && existingLocal.external_id !== externalId) {
            // Suffix WordPress slug to avoid overwriting user-created local product
            targetSlug = `${slug}-wc-${externalId}`;
            summary.conflicts.push({
              productId: targetId,
              externalId,
              slug,
              conflictType: 'slug_collision_with_local',
              details: `Renamed synced slug to ${targetSlug} to preserve local product`,
            });
          } else if (existingLocal) {
            targetId = existingLocal.id;
          }

          // Extract ACF custom fields
          const customFields = await extractAcfCustomFields(wp, customFieldMappings);
          const customFieldsJson = JSON.stringify(customFields);

          // Compute sync hash to check if product changed (including ACF custom fields)
          const syncHash = computeProductSyncHash({
            name: title,
            slug: targetSlug,
            sku,
            type,
            status,
            price,
            regular_price: regularPrice,
            sale_price: salePrice,
            stock_status: stockStatus,
            stock_quantity: stockQuantity,
            description: desc,
            short_description: shortDesc,
            attributes: wp.attributes,
            default_attributes: wp.default_attributes,
            variations: wp.variations,
            custom_fields: customFields,
          });

          if (existingLocal && existingLocal.sync_hash === syncHash && options.type !== 'full') {
            // Unchanged: skip writes
            summary.productsSkipped++;
            continue;
          }

          if (isDryRun) {
            if (existingLocal) summary.productsUpdated++;
            else summary.productsCreated++;
            continue;
          }

          // Parse primary image & gallery
          const images = (wp.images || []).map((img: any) => ({
            id: img.id,
            url: img.src,
            alt: img.alt || title,
            name: img.name || title,
          }));
          const primaryImage = images[0]?.url || 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&q=80&w=800';

          // Resolve primary category and path
          let primaryCategorySlug = 'mobile-phones';
          let primaryCatId: number | null = null;
          let categoryPath = 'mobile-phones';
          let hierUrl = `/product/${targetSlug}/`;

          if (Array.isArray(wp.categories) && wp.categories.length > 0) {
            const firstWcCat = wp.categories[0];
            let matchedCat = catByWooId.get(firstWcCat.id) || catBySlug.get(firstWcCat.slug.toLowerCase());
            
            // On demand fetch if category missing locally
            if (!matchedCat) {
              try {
                const fetchCatRes = await requestWoo(`/products/categories/${firstWcCat.id}`);
                if (fetchCatRes.statusCode === 200 && fetchCatRes.data) {
                  const newCat = fetchCatRes.data;
                  const newCatSlug = newCat.slug.toLowerCase();
                  db.run(
                    `INSERT OR IGNORE INTO categories (id, woo_id, parent_woo_id, parent_id, parent, name, slug, description, image, image_url, hierarchical_url, seo_title, seo_description, seo_json, sort_order, count, product_count, display, source, is_deleted_remote, edited_locally, synced_at, updated_at, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, '', '', '', ?, ?, ?, '{}', 0, 0, 0, 'default', 'woocommerce', 0, 0, ?, ?, ?)`,
                    [newCat.id, newCat.id, newCat.parent || 0, newCat.parent || 0, newCat.parent || 0, decodeHtmlEntities(newCat.name), newCatSlug, `/product-category/${newCatSlug}/`, `${newCat.name} | iRepair Mobiles`, `${newCat.name}`, nowIso, nowIso, nowIso]
                  );
                  matchedCat = { id: newCat.id, slug: newCatSlug, hierarchical_url: `/product-category/${newCatSlug}/` };
                  catByWooId.set(newCat.id, matchedCat);
                  catBySlug.set(newCatSlug, matchedCat);
                }
              } catch (_) {}
            }

            if (matchedCat) {
              primaryCategorySlug = matchedCat.slug;
              primaryCatId = matchedCat.id;
              categoryPath = matchedCat.slug;
            }
          }

          // Upsert Product record
          db.run(
            `INSERT OR REPLACE INTO products (
              id, wp_id, name, title, slug, sku, type, status, short_description, description,
              regular_price, sale_price, sale_from, sale_to, price, on_sale,
              tax_status, tax_class, stock_status, manage_stock, stock_quantity, backorders, sold_individually,
              weight, length, width, height, featured, brand_id, brand_name, condition,
              average_rating, rating_count, purchase_note, menu_order, external_url, button_text,
              wp_permalink, date_created, date_modified, custom_meta, custom_fields,
              image, category, category_path, hierarchical_url, specifications_json, attributes_json, variations_json,
              seo_json, seo_synced_at, source, connection_id, external_id, external_parent_id,
              external_modified_at, last_synced_at, sync_hash, is_deleted_remote, local_hidden,
              created_at, updated_at
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, 0,
              ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?,
              ?, NULL, 'woocommerce', 'wc_main', ?, NULL,
              ?, ?, ?, 0, ?,
              ?, ?
            )`,
            [
              targetId,
              externalId,
              title,
              title,
              targetSlug,
              sku,
              type,
              status,
              shortDesc,
              desc,
              regularPrice,
              salePrice,
              wp.date_on_sale_from || null,
              wp.date_on_sale_to || null,
              price,
              onSale ? 1 : 0,
              wp.tax_status || 'taxable',
              wp.tax_class || '',
              stockStatus,
              manageStock,
              stockQuantity,
              wp.backorders || 'no',
              wp.weight || '',
              wp.dimensions?.length || '',
              wp.dimensions?.width || '',
              wp.dimensions?.height || '',
              featured,
              brandId,
              brandName,
              condition,
              parseFloat(wp.average_rating || '5.0') || 5.0,
              parseInt(wp.rating_count || '0', 10) || 0,
              wp.purchase_note || '',
              wp.menu_order || 0,
              wp.external_url || '',
              wp.button_text || '',
              permalink,
              dateCreated,
              dateModified,
              JSON.stringify(wp.meta_data || []),
              customFieldsJson,
              primaryImage,
              primaryCategorySlug,
              categoryPath,
              hierUrl,
              JSON.stringify({
                Warranty: '12 Months Hardware Guarantee',
                Condition: condition,
                Delivery: 'Free Next-Day UK Tracked',
                Network: 'Unlocked to all UK Networks',
              }),
              JSON.stringify(wp.attributes || []),
              JSON.stringify(wp.variations || []),
              JSON.stringify(wp.yoast_head_json || {}),
              externalId,
              dateModified,
              nowIso,
              syncHash,
              existingLocal?.local_hidden || 0,
              existingLocal?.created_at || nowIso,
              nowIso,
            ]
          );

          // Upsert individual custom fields in product_custom_fields table
          try {
            db.run('DELETE FROM product_custom_fields WHERE product_id = ?', [targetId]);
            for (const [key, val] of Object.entries(customFields)) {
              if (val !== undefined && val !== null && String(val).trim() !== '') {
                const mapping = customFieldMappings.find((m: any) => m.metaKey.toLowerCase() === key.toLowerCase());
                const fieldType = mapping?.type || (key === 'technical_details' ? 'html' : 'text');
                db.run(
                  `INSERT INTO product_custom_fields (id, product_id, field_key, value, field_type, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?)`,
                  [`pcf_${targetId}_${key}`, targetId, key, String(val), fieldType, nowIso]
                );
              }
            }
          } catch (_) {}

          if (existingLocal) summary.productsUpdated++;
          else summary.productsCreated++;

          // Upsert Images
          db.run('DELETE FROM product_images WHERE product_id = ?', [targetId]);
          images.forEach((img: any, idx: number) => {
            const imgId = `img_${targetId}_${img.id || idx}`;
            db.run(
              `INSERT OR REPLACE INTO product_images (id, product_id, external_id, original_url, local_url, alt_text, title, sort_order, is_featured, width, height, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
              [imgId, targetId, img.id || null, img.url, img.url, img.alt, img.name, idx, idx === 0 ? 1 : 0, nowIso]
            );
            summary.imagesProcessed++;
          });

          // Map Categories
          db.run('DELETE FROM product_category_map WHERE product_id = ?', [targetId]);
          if (Array.isArray(wp.categories)) {
            for (let cIdx = 0; cIdx < wp.categories.length; cIdx++) {
              const c = wp.categories[cIdx];
              const localCat = catByWooId.get(c.id) || catBySlug.get(c.slug.toLowerCase());
              if (localCat) {
                db.run(
                  `INSERT OR IGNORE INTO product_category_map (product_id, category_id, is_primary)
                   VALUES (?, ?, ?)`,
                  [targetId, localCat.id, cIdx === 0 ? 1 : 0]
                );
              }
            }
          }

          // Map Tags
          db.run('DELETE FROM product_tag_map WHERE product_id = ?', [targetId]);
          if (Array.isArray(wp.tags)) {
            for (const t of wp.tags) {
              const tagId = `tag_${t.id}`;
              db.run(
                `INSERT OR IGNORE INTO product_tag_map (product_id, tag_id)
                 VALUES (?, ?)`,
                [targetId, tagId]
              );
            }
          }

          // Map Attributes
          db.run('DELETE FROM product_attribute_map WHERE product_id = ?', [targetId]);
          if (Array.isArray(wp.attributes)) {
            wp.attributes.forEach((attr: any, aIdx: number) => {
              const mapId = `pam_${targetId}_${attr.id || aIdx}`;
              db.run(
                `INSERT OR REPLACE INTO product_attribute_map (id, product_id, attribute_id, name, options_json, position, visible, variation)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  mapId,
                  targetId,
                  attr.id ? `attr_${attr.id}` : null,
                  attr.name,
                  JSON.stringify(attr.options || []),
                  attr.position || aIdx,
                  attr.visible !== false ? 1 : 0,
                  attr.variation ? 1 : 0,
                ]
              );
            });
          }

          // If Variable Product, fetch & upsert variations with pagination and transactions
          if (type === 'variable') {
            try {
              const varSyncRes = await syncProductVariationsSingle(
                targetId,
                externalId,
                primaryImage,
                sku,
                wp.default_attributes || [],
                db
              );
              summary.variationsSynced += varSyncRes.syncedCount;
            } catch (vErr: any) {
              summary.errors.push({ externalId, title, error: `Variations sync error: ${vErr.message}` });
            }
          }
        } catch (itemErr: any) {
          console.error(`Failed to sync product ${externalId}:`, itemErr);
          summary.productsFailed++;
          summary.errors.push({ externalId, error: itemErr.message });
        }
      }

      if (options.singleExternalId || page >= totalPages) {
        break;
      }
      page++;
    }

    // ========================================================
    // PHASE 4: RELATIONS (Upsells, Cross-sells, Related, Grouped)
    // ========================================================
    currentProgress.phase = 'relations';
    currentProgress.message = 'Phase 4/6: Resolving product relations and upsells...';

    if (!isDryRun && !options.singleExternalId) {
      try {
        const extToLocalIdMap = new Map<number, string>();
        const allSynced = db.all<{ id: string; external_id: number }>(
          'SELECT id, external_id FROM products WHERE external_id IS NOT NULL'
        );
        allSynced.forEach((r) => extToLocalIdMap.set(Number(r.external_id), r.id));

        // Re-resolve relations from custom_meta JSON if present
        const productsWithMeta = db.all<{ id: string; custom_meta: string }>('SELECT id, custom_meta FROM products');
        for (const pwm of productsWithMeta) {
          try {
            const meta = JSON.parse(pwm.custom_meta || '[]');
            const upsellIds = meta.find((m: any) => m.key === '_upsell_ids')?.value || [];
            const crossSellIds = meta.find((m: any) => m.key === '_crosssell_ids')?.value || [];

            if (Array.isArray(upsellIds)) {
              for (const uExtId of upsellIds) {
                const targetProdId = extToLocalIdMap.get(Number(uExtId));
                if (targetProdId) {
                  db.run(
                    `INSERT OR IGNORE INTO product_relations (product_id, relation_type, target_product_id)
                     VALUES (?, 'upsell', ?)`,
                    [pwm.id, targetProdId]
                  );
                }
              }
            }

            if (Array.isArray(crossSellIds)) {
              for (const csExtId of crossSellIds) {
                const targetProdId = extToLocalIdMap.get(Number(csExtId));
                if (targetProdId) {
                  db.run(
                    `INSERT OR IGNORE INTO product_relations (product_id, relation_type, target_product_id)
                     VALUES (?, 'cross_sell', ?)`,
                    [pwm.id, targetProdId]
                  );
                }
              }
            }
          } catch (_) {}
        }
      } catch (relErr: any) {
        summary.errors.push({ error: `Relations resolution warning: ${relErr.message}` });
      }
    }

    // ========================================================
    // PHASE 5: SEO PHASE (Placeholder Hook reserved for next step)
    // ========================================================
    currentProgress.phase = 'seo_placeholder';
    currentProgress.message = 'Phase 5/6: SEO hook (ready for next step)...';
    // Reserved empty phase hook as specified in prompt

    // ========================================================
    // PHASE 6: CLEANUP & RECONCILE
    // ========================================================
    currentProgress.phase = 'cleanup';
    currentProgress.message = 'Phase 6/6: Reconciling deleted items and recomputing counts...';

    if (!isDryRun && (options.type === 'full' || options.type === 'reconcile')) {
      const deletedPolicy = config.deletedPolicy || 'archive';

      // Detect products in DB not present in remote WooCommerce store
      const localSyncedProducts = db.all<{ id: string; external_id: number; is_deleted_remote: number }>(
        "SELECT id, external_id, is_deleted_remote FROM products WHERE source = 'woocommerce' AND external_id IS NOT NULL"
      );

      for (const lsp of localSyncedProducts) {
        if (!remoteExternalIds.has(Number(lsp.external_id))) {
          if (deletedPolicy === 'delete') {
            db.run('DELETE FROM products WHERE id = ?', [lsp.id]);
            db.run('DELETE FROM product_variations WHERE product_id = ?', [lsp.id]);
            db.run('DELETE FROM product_images WHERE product_id = ?', [lsp.id]);
          } else if (deletedPolicy === 'archive') {
            db.run("UPDATE products SET status = 'trash', is_deleted_remote = 1, updated_at = ? WHERE id = ?", [nowIso, lsp.id]);
          }
        }
      }
    }

    // Recompute product counts for categories (including all child categories!)
    try {
      const allCategories = db.all<{ id: number; parent_id: number }>('SELECT id, parent_id FROM categories');
      
      // Build child map
      const childrenMap = new Map<number, number[]>();
      for (const c of allCategories) {
        const pId = c.parent_id || 0;
        if (!childrenMap.has(pId)) childrenMap.set(pId, []);
        childrenMap.get(pId)!.push(c.id);
      }

      function getAllDescendants(catId: number): number[] {
        const res: number[] = [catId];
        const children = childrenMap.get(catId) || [];
        for (const ch of children) {
          res.push(...getAllDescendants(ch));
        }
        return res;
      }

      for (const c of allCategories) {
        const descendants = getAllDescendants(c.id);
        const placeholders = descendants.map(() => '?').join(',');
        const countRow = db.get<{ count: number }>(
          `SELECT count(DISTINCT p.id) as count 
           FROM products p 
           JOIN product_category_map pcm ON p.id = pcm.product_id 
           WHERE pcm.category_id IN (${placeholders}) 
             AND p.is_deleted_remote = 0 
             AND p.local_hidden = 0 
             AND p.status = 'publish'`,
          descendants
        );
        const finalCount = countRow?.count || 0;
        db.run('UPDATE categories SET count = ?, product_count = ? WHERE id = ?', [finalCount, finalCount, c.id]);
      }
    } catch (countErr: any) {
      console.warn('Category counts recompute warning:', countErr.message);
    }

    // Recompute brand product counts
    try {
      db.exec(`
        UPDATE brands 
        SET product_count = (
          SELECT count(*) FROM products 
          WHERE products.brand_id = brands.id 
            AND products.is_deleted_remote = 0 
            AND products.local_hidden = 0 
            AND products.status = 'publish'
        );
      `);
    } catch (_) {}

    // Invalidate local in-memory caches
    invalidateCatalogCache();

    summary.phase = 'completed';
    summary.finishedAt = new Date().toISOString();
    summary.durationMs = Date.now() - startTime;

    currentProgress = {
      isRunning: false,
      phase: 'completed',
      currentStep: 100,
      totalSteps: 100,
      message: `Completed! Synced ${summary.productsCreated} new, ${summary.productsUpdated} updated.`,
      summary,
    };

    // Update sync_logs status to success
    try {
      db.run(
        `UPDATE sync_logs SET finished_at = ?, status = 'success', summary = ? WHERE id = ?`,
        [summary.finishedAt, JSON.stringify(summary), syncLogId]
      );
    } catch (_) {}

    return summary;
  } catch (err: any) {
    console.error('Product sync fatal error:', err);
    summary.phase = 'failed';
    summary.finishedAt = new Date().toISOString();
    summary.durationMs = Date.now() - startTime;
    summary.errors.push({ error: err.message || 'Fatal sync error' });

    currentProgress = {
      isRunning: false,
      phase: 'failed',
      currentStep: 0,
      totalSteps: 100,
      message: `Failed: ${err.message}`,
      summary,
    };

    try {
      db.run(
        `UPDATE sync_logs SET finished_at = ?, status = 'failed', error = ?, summary = ? WHERE id = ?`,
        [summary.finishedAt, err.message, JSON.stringify(summary), syncLogId]
      );
    } catch (_) {}

    throw err;
  } finally {
    isSyncRunning = false;
  }
}

/**
 * Syncs a single product by external ID or local ID immediately
 */
export async function syncSingleProduct(idOrExternalId: string | number): Promise<boolean> {
  const db = await getDb();
  let externalId: number | null = null;

  if (typeof idOrExternalId === 'number') {
    externalId = idOrExternalId;
  } else if (!isNaN(Number(idOrExternalId))) {
    externalId = Number(idOrExternalId);
  } else {
    const row = db.get<{ external_id: number }>('SELECT external_id FROM products WHERE id = ?', [idOrExternalId]);
    if (row?.external_id) {
      externalId = Number(row.external_id);
    }
  }

  if (!externalId) {
    throw new Error(`Cannot find WooCommerce external ID for product ${idOrExternalId}`);
  }

  await executeProductSync({
    type: 'incremental',
    singleExternalId: externalId,
  });

  return true;
}

// ==========================================
// BACKGROUND AUTO-SYNC SCHEDULER
// ==========================================
let schedulerTimer: NodeJS.Timeout | null = null;
let lastScheduledRunAt: string | null = null;
let nextScheduledRunAt: string | null = null;

export function getSchedulerStatus(): {
  enabled: boolean;
  intervalMinutes: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
} {
  return {
    enabled: schedulerTimer !== null,
    intervalMinutes: 30,
    lastRunAt: lastScheduledRunAt,
    nextRunAt: nextScheduledRunAt,
  };
}

export async function initProductSyncScheduler(): Promise<void> {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }

  const config = await getWooCommerceConfig();
  const intervalMinutes = config.syncIntervalMinutes || 30;

  if (intervalMinutes <= 0) {
    console.log('WooCommerce Auto-Sync scheduler disabled.');
    return;
  }

  const intervalMs = intervalMinutes * 60 * 1000;
  nextScheduledRunAt = new Date(Date.now() + intervalMs).toISOString();

  console.log(`WooCommerce Auto-Sync scheduler started (every ${intervalMinutes} minutes). Next run: ${nextScheduledRunAt}`);

  schedulerTimer = setInterval(async () => {
    try {
      if (isProductSyncInProgress()) {
        console.log('Skipping scheduled product sync: sync already running.');
        return;
      }
      console.log('Running scheduled incremental WooCommerce product sync...');
      lastScheduledRunAt = new Date().toISOString();
      await executeProductSync({ type: 'incremental' });
      nextScheduledRunAt = new Date(Date.now() + intervalMs).toISOString();
    } catch (err: any) {
      console.warn('Scheduled product sync error:', err.message);
    }
  }, intervalMs);
}
