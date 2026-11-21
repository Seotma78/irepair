import { getDb, DatabaseWrapper } from '../db';
import { decodeHtmlEntities } from '../../src/utils/decodeHtml';
import { LIVE_WP_CATEGORIES } from '../../src/data/liveWordPressCatalog';
import { getProductCategoryPath } from '../../src/utils/categoryUtils';

export interface ProductVariationRecord {
  id: string;
  externalId?: number;
  productId: string;
  sku?: string;
  name?: string;
  attributes: Record<string, string>;
  regularPrice?: number;
  salePrice?: number;
  price: number;
  onSale: boolean;
  stockStatus: string;
  inStock: boolean;
  manageStock?: boolean;
  stockQuantity: number;
  backorders?: string;
  image?: string;
  weight?: string;
  dimensions?: { length?: string; width?: string; height?: string };
  status: string;
  description?: string;
  menuOrder?: number;
  customFields?: Record<string, string>;
}

export interface FormattedProduct {
  id: string;
  wpId?: number;
  title: string;
  name: string;
  slug: string;
  sku?: string;
  category: string;
  categoryPath: string;
  hierarchicalUrl: string;
  canonicalUrl: string;
  brand: string;
  brandId?: string;
  price: number;
  regularPrice?: number;
  salePrice?: number;
  onSale: boolean;
  minPrice?: number;
  maxPrice?: number;
  minRegularPrice?: number;
  maxRegularPrice?: number;
  hasPriceRange?: boolean;
  anyOnSale?: boolean;
  priceRange?: string;
  defaultAttributes?: Record<string, string>;
  type: string;
  condition: string;
  inStock: boolean;
  stockStatus: string;
  stockCount: number;
  rating: number;
  reviewsCount: number;
  image: string;
  gallery: string[];
  description: string;
  longDescription?: string;
  shortDescription?: string;
  short_description?: string;
  weight?: string | number;
  dimensions?: { length?: string | number; width?: string | number; height?: string | number };
  customMeta?: Record<string, any>;
  customFields?: Record<string, string>;
  technicalDetailsHtml?: string;
  specifications: Record<string, string>;
  attributes: any[];
  variations?: ProductVariationRecord[];
  seo_json?: any;
  permalink?: string;
  source: 'local' | 'woocommerce';
  externalId?: number;
  lastSyncedAt?: string;
  localHidden: boolean;
  status: string;
  in_stock?: boolean;
  on_sale?: boolean;
  stock_status?: string;
  regular_price?: number;
  sale_price?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Builds the canonical product URL: /product/{product-slug}/
 */
export function buildProductCanonicalUrl(categoryPath: string, slug: string): string {
  const cleanSlug = (slug || '').replace(/^\/+|\/+$/g, '');
  return `/product/${cleanSlug}/`;
}

/**
 * Normalizes incoming path into slug and potential category path
 */
export function parseProductUrlSegments(pathname: string): { productSlug: string; categoryPath: string; isHierarchical: boolean } {
  const clean = pathname.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+|\/+$/g, '');
  if (!clean.startsWith('product')) {
    return { productSlug: '', categoryPath: '', isHierarchical: false };
  }

  const withoutPrefix = clean.replace(/^product\/?/, '');
  const segments = withoutPrefix.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { productSlug: '', categoryPath: '', isHierarchical: false };
  }

  const productSlug = segments[segments.length - 1];
  const categoryPath = segments.slice(0, -1).join('/');
  const isHierarchical = segments.length > 1;

  return { productSlug, categoryPath, isHierarchical };
}

/**
 * Resolves breadcrumbs for a product based on its category path
 */
export function buildProductBreadcrumbs(categoryPath: string, productTitle: string, canonicalUrl: string) {
  const segments = categoryPath.split('/').filter(Boolean);
  const crumbs: { id: string; name: string; slug: string; url: string }[] = [
    { id: 'crumb-home', name: 'Home', slug: 'home', url: '/' },
    { id: 'crumb-shop', name: 'Shop', slug: 'shop', url: '/shop' },
  ];
  let accumulated = '';

  for (const seg of segments) {
    accumulated = accumulated ? `${accumulated}/${seg}` : seg;
    const catUrl = `/product-category/${accumulated}/`;
    let name = seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    if (seg === 'mobiles' || seg === 'mobile-phones') name = 'Mobile Phones';
    if (seg === 'iphones') name = 'iPhones';
    if (seg === 'laptop-and-pc') name = 'Laptop & PC';
    if (seg === 'tablets-and-ipads') name = 'Tablets & iPads';

    crumbs.push({
      id: `crumb-${seg}`,
      name: decodeHtmlEntities(name),
      slug: seg,
      url: catUrl,
    });
  }

  crumbs.push({
    id: 'crumb-current',
    name: productTitle,
    slug: 'current',
    url: canonicalUrl,
  });

  return crumbs;
}

/**
 * Format a DB product row and its relations into a standard FormattedProduct object
 */
export function formatProductRecord(row: any, db: DatabaseWrapper): FormattedProduct {
  const cleanSlug = row.slug.toLowerCase().trim();
  const title = decodeHtmlEntities(row.title || row.name || '');
  const catPath = row.category_path || row.category || 'mobile-phones';
  const canonicalUrl = `/product/${cleanSlug}/`;

  // Fetch images
  const imageRows = db.all<any>(
    'SELECT * FROM product_images WHERE product_id = ? ORDER BY is_featured DESC, sort_order ASC',
    [row.id]
  );
  let mainImage = row.image || '';
  const gallery: string[] = [];

  if (imageRows.length > 0) {
    mainImage = imageRows[0].local_url || imageRows[0].original_url || mainImage;
    imageRows.forEach((img) => {
      const url = img.local_url || img.original_url;
      if (url && !gallery.includes(url)) {
        gallery.push(url);
      }
    });
  }
  if (!mainImage && gallery.length > 0) mainImage = gallery[0];
  if (!mainImage) mainImage = 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&q=80&w=800';

  // Fetch variations (hide private / draft variations from public view)
  const varRows = db.all<any>(
    'SELECT * FROM product_variations WHERE product_id = ? AND is_deleted_remote = 0 AND (status = "publish" OR status IS NULL OR status = "") ORDER BY menu_order ASC, price ASC',
    [row.id]
  );
  const variations: ProductVariationRecord[] = varRows.map((v) => {
    let attrMap: Record<string, string> = {};
    try { attrMap = JSON.parse(v.attribute_values_json || '{}'); } catch (_) {}
    return {
      id: v.id,
      externalId: v.external_id ? Number(v.external_id) : undefined,
      productId: v.product_id,
      sku: v.sku,
      name: v.name || undefined,
      attributes: attrMap,
      regularPrice: v.regular_price || undefined,
      salePrice: v.sale_price || undefined,
      price: v.price,
      onSale: Boolean(v.on_sale || (v.regular_price && v.regular_price > v.price)),
      stockStatus: v.stock_status || 'instock',
      inStock: v.stock_status === 'instock' || (typeof v.stock_quantity === 'number' && v.stock_quantity > 0),
      manageStock: Boolean(v.manage_stock),
      stockQuantity: typeof v.stock_quantity === 'number' ? v.stock_quantity : 10,
      backorders: v.backorders || 'no',
      image: v.image || mainImage,
      weight: v.weight || undefined,
      dimensions: (v.length || v.width || v.height) ? { length: v.length, width: v.width, height: v.height } : undefined,
      status: v.status || 'publish',
      description: v.description || undefined,
      menuOrder: v.menu_order || 0,
    };
  });

  // Fetch attributes
  let attributes: any[] = [];
  try {
    attributes = JSON.parse(row.attributes_json || '[]');
  } catch (_) {
    attributes = [];
  }

  // If attributes array was empty, load from relational product_attribute_map
  if (!Array.isArray(attributes) || attributes.length === 0) {
    const attrRows = db.all<any>(
      'SELECT name, options_json, visible, variation FROM product_attribute_map WHERE product_id = ? ORDER BY position ASC',
      [row.id]
    );
    if (attrRows.length > 0) {
      attributes = attrRows.map((ar) => {
        let opts: string[] = [];
        try { opts = JSON.parse(ar.options_json || '[]'); } catch (_) {}
        return {
          name: decodeHtmlEntities(ar.name),
          options: opts.map((o) => decodeHtmlEntities(o)),
          visible: ar.visible !== 0,
          variation: ar.variation !== 0,
        };
      });
    }
  }

  // Fetch specs
  let specifications: Record<string, string> = {
    Warranty: '12 Months Hardware Guarantee',
    Condition: decodeHtmlEntities(row.condition || 'Grade A - Pristine'),
    Delivery: 'Free Next-Day UK Tracked',
    Network: 'Unlocked to all UK Networks',
  };
  try {
    if (row.specifications_json) {
      specifications = { ...specifications, ...JSON.parse(row.specifications_json) };
    }
  } catch (_) {}

  // Parse custom meta & extract optional configurable Technical Details HTML
  const customMetaParsed = (() => {
    try { return row.custom_meta ? JSON.parse(row.custom_meta) : undefined; } catch (_) { return undefined; }
  })();

  // Custom Fields (ACF: delivery_text, warranty_text, returns_, technical_details)
  const customFields: Record<string, string> = (() => {
    const fields: Record<string, string> = {};
    if (row.custom_fields) {
      try {
        const parsed = JSON.parse(row.custom_fields);
        if (parsed && typeof parsed === 'object') {
          Object.assign(fields, parsed);
        }
      } catch (_) {}
    }
    // Fallback: extract directly from custom_meta if any field is missing
    if (customMetaParsed) {
      const keysToMatch = ['delivery_text', 'warranty_text', 'returns_', 'returns', 'technical_details'];
      if (Array.isArray(customMetaParsed)) {
        for (const m of customMetaParsed) {
          if (!m || typeof m.key !== 'string' || m.key.startsWith('_')) continue;
          const k = m.key;
          if (keysToMatch.includes(k) && !fields[k]) {
            const val = m.value;
            if (val !== undefined && val !== null && String(val).trim().length > 0) {
              fields[k] = String(val).trim();
            }
          }
        }
      } else if (typeof customMetaParsed === 'object') {
        for (const [k, val] of Object.entries(customMetaParsed)) {
          if (k.startsWith('_')) continue;
          if (keysToMatch.includes(k) && !fields[k]) {
            if (val !== undefined && val !== null && String(val).trim().length > 0) {
              fields[k] = String(val).trim();
            }
          }
        }
      }
    }
    // Normalize returns_ if returns was populated
    if (fields['returns'] && !fields['returns_']) {
      fields['returns_'] = fields['returns'];
    }
    return fields;
  })();

  let technicalDetailsHtml: string | undefined = undefined;
  if (customFields.technical_details && customFields.technical_details.trim().length > 0) {
    technicalDetailsHtml = customFields.technical_details.trim();
  } else if (customMetaParsed) {
    if (Array.isArray(customMetaParsed)) {
      const match = customMetaParsed.find((m: any) => 
        m && typeof m.key === 'string' && (
          m.key === '_technical_details' || 
          m.key === 'technical_details' || 
          m.key.toLowerCase().includes('technical_detail')
        )
      );
      if (match && typeof match.value === 'string' && match.value.trim().length > 0) {
        technicalDetailsHtml = match.value.trim();
      }
    } else if (typeof customMetaParsed === 'object') {
      const matchKey = Object.keys(customMetaParsed).find((k) => 
        k === '_technical_details' || k === 'technical_details' || k.toLowerCase().includes('technical_detail')
      );
      if (matchKey && typeof customMetaParsed[matchKey] === 'string' && customMetaParsed[matchKey].trim().length > 0) {
        technicalDetailsHtml = customMetaParsed[matchKey].trim();
      }
    }
  }

  // Ensure variations inherit product-level custom fields
  if (variations && variations.length > 0) {
    variations.forEach((v: any) => {
      v.customFields = customFields;
    });
  }

  // Parse default attributes
  let defaultAttributes: Record<string, string> | undefined = undefined;
  if (row.default_attributes_json) {
    try {
      const parsed = JSON.parse(row.default_attributes_json);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        defaultAttributes = parsed;
      }
    } catch (_) {}
  }

  // Determine effective price range
  let minPrice = row.min_price != null ? Number(row.min_price) : undefined;
  let maxPrice = row.max_price != null ? Number(row.max_price) : undefined;
  let minRegularPrice = row.min_regular_price != null ? Number(row.min_regular_price) : undefined;
  let maxRegularPrice = row.max_regular_price != null ? Number(row.max_regular_price) : undefined;
  let hasPriceRange = Boolean(row.has_price_range);
  let anyOnSale = Boolean(row.any_on_sale);

  // Fallback calculation from variations if parent product columns not populated yet
  if (variations.length > 0 && (minPrice === undefined || maxPrice === undefined)) {
    const validPrices = variations.map((v) => v.price).filter((p) => typeof p === 'number' && p > 0);
    if (validPrices.length > 0) {
      minPrice = Math.min(...validPrices);
      maxPrice = Math.max(...validPrices);
      hasPriceRange = minPrice !== maxPrice;
    }
  }

  let priceRange: string | undefined = undefined;
  if (minPrice !== undefined && maxPrice !== undefined && minPrice !== maxPrice) {
    priceRange = `£${minPrice.toFixed(2)} – £${maxPrice.toFixed(2)}`;
  } else if (minPrice !== undefined) {
    priceRange = `£${minPrice.toFixed(2)}`;
  }

  // Ensure full description is distinct and sanitized
  const rawDescription = decodeHtmlEntities(row.description || '');
  const rawShortDescription = row.short_description !== undefined && row.short_description !== null && String(row.short_description).trim() !== ''
    ? String(row.short_description)
    : undefined;

  return {
    id: row.id,
    wpId: row.wp_id || (row.external_id ? Number(row.external_id) : undefined),
    title,
    name: title,
    slug: cleanSlug,
    sku: row.sku || `IR-${row.id}`,
    category: row.category || 'mobile-phones',
    categoryPath: catPath,
    hierarchicalUrl: canonicalUrl,
    canonicalUrl,
    brand: decodeHtmlEntities(row.brand_name || row.brand || 'iRepair'),
    brandId: row.brand_id || undefined,
    price: (minPrice !== undefined && (row.type === 'variable' || variations.length > 0)) ? minPrice : (row.price || 0),
    regularPrice: row.regular_price || undefined,
    salePrice: row.sale_price || undefined,
    onSale: Boolean(row.on_sale || anyOnSale || (row.regular_price && row.regular_price > row.price)),
    minPrice,
    maxPrice,
    minRegularPrice,
    maxRegularPrice,
    hasPriceRange,
    anyOnSale,
    priceRange,
    defaultAttributes,
    type: row.type || 'simple',
    condition: decodeHtmlEntities(row.condition || 'Grade A - Pristine'),
    inStock: row.stock_status === 'instock' && row.stock_quantity !== 0,
    stockStatus: row.stock_status || 'instock',
    stockCount: typeof row.stock_quantity === 'number' ? row.stock_quantity : 10,
    rating: row.average_rating || 5.0,
    reviewsCount: row.rating_count || 12,
    image: mainImage,
    gallery,
    description: rawDescription,
    longDescription: rawDescription,
    shortDescription: rawShortDescription,
    short_description: rawShortDescription,
    weight: row.weight || undefined,
    dimensions: (row.length || row.width || row.height) ? { length: row.length, width: row.width, height: row.height } : undefined,
    customMeta: customMetaParsed,
    customFields,
    technicalDetailsHtml,
    specifications,
    attributes,
    variations: variations.length > 0 ? variations : undefined,
    seo_json: row.seo_json ? JSON.parse(row.seo_json || '{}') : undefined,
    permalink: row.wp_permalink || `https://irepair-mobiles.co.uk/product/${cleanSlug}/`,
    source: row.source || 'woocommerce',
    externalId: row.external_id ? Number(row.external_id) : undefined,
    lastSyncedAt: row.last_synced_at || undefined,
    localHidden: Boolean(row.local_hidden),
    status: row.status || 'publish',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

/**
 * Resolves a product by slug, ID, or external WP ID from the local SQLite database
 */
export async function getProductBySlugOrId(slugOrId: string): Promise<FormattedProduct | null> {
  const cleanSlug = slugOrId.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  const db = await getDb();

  const row = db.get<any>(
    `SELECT * FROM products 
     WHERE (slug = ? OR id = ? OR wp_id = ? OR external_id = ?) 
       AND is_deleted_remote = 0`,
    [cleanSlug, cleanSlug, parseInt(cleanSlug, 10) || -1, parseInt(cleanSlug, 10) || -1]
  );

  if (!row) {
    return null;
  }

  return formatProductRecord(row, db);
}

/**
 * Resolves related products, upsells, or cross-sells
 */
export async function getProductRelatedProducts(productId: string, limit = 4): Promise<FormattedProduct[]> {
  const db = await getDb();
  
  // Try relations table first
  const relatedRows = db.all<any>(
    `SELECT p.* FROM product_relations pr
     JOIN products p ON pr.target_product_id = p.id
     WHERE pr.product_id = ? AND p.status = 'publish' AND p.local_hidden = 0 AND p.is_deleted_remote = 0
     LIMIT ?`,
    [productId, limit]
  );

  if (relatedRows.length > 0) {
    return relatedRows.map((r) => formatProductRecord(r, db));
  }

  // Fallback: pick products from same category or brand
  const currentProd = db.get<any>('SELECT brand_id, category FROM products WHERE id = ?', [productId]);
  if (!currentProd) return [];

  const fallbackRows = db.all<any>(
    `SELECT * FROM products 
     WHERE id != ? AND (brand_id = ? OR category = ?) 
       AND status = 'publish' AND local_hidden = 0 AND is_deleted_remote = 0
     ORDER BY average_rating DESC, price DESC
     LIMIT ?`,
    [productId, currentProd.brand_id || '', currentProd.category || '', limit]
  );

  return fallbackRows.map((r) => formatProductRecord(r, db));
}

/**
 * Resolves full product URL request (e.g. /product/iphone-12-mini-used-unlocked/)
 */
export async function resolveProductRequestUrl(requestPath: string): Promise<{
  product: FormattedProduct | null;
  canonicalUrl: string;
  isRedirect: boolean;
  breadcrumbs: any[];
}> {
  const { productSlug, isHierarchical } = parseProductUrlSegments(requestPath);
  if (!productSlug) {
    return { product: null, canonicalUrl: '', isRedirect: false, breadcrumbs: [] };
  }

  const product = await getProductBySlugOrId(productSlug);
  if (!product) {
    return { product: null, canonicalUrl: '', isRedirect: false, breadcrumbs: [] };
  }

  const canonicalUrl = product.canonicalUrl;
  const isRedirect = isHierarchical;
  const breadcrumbs = buildProductBreadcrumbs(product.categoryPath, product.title, canonicalUrl);

  return {
    product,
    canonicalUrl,
    isRedirect,
    breadcrumbs,
  };
}

/**
 * Query products from SQLite with full filtering, pagination, and sorting
 */
export async function queryLocalCatalogue(options: {
  page?: number;
  limit?: number;
  category?: string;
  brand?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  onSaleOnly?: boolean;
  search?: string;
  sortBy?: 'price-asc' | 'price-desc' | 'popular' | 'rating' | 'newest';
  includeHidden?: boolean;
  includeTrashed?: boolean;
  source?: 'all' | 'local' | 'woocommerce';
}): Promise<{
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  products: FormattedProduct[];
}> {
  const db = await getDb();
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(250, Math.max(1, options.limit || 24));
  const offset = (page - 1) * limit;

  const whereClauses: string[] = [];
  const params: any[] = [];

  // Exclude deleted and hidden by default for public catalogue
  if (!options.includeTrashed) {
    whereClauses.push("p.is_deleted_remote = 0 AND p.status = 'publish'");
  }
  if (!options.includeHidden) {
    whereClauses.push('p.local_hidden = 0');
  }

  if (options.source && options.source !== 'all') {
    whereClauses.push('p.source = ?');
    params.push(options.source);
  }

  // Category filter: support matching category and all its descendants!
  if (options.category && options.category !== 'all') {
    const cleanCat = options.category.toLowerCase().trim();
    
    // Find category ID
    const catRow = db.get<{ id: number }>('SELECT id FROM categories WHERE slug = ? OR id = ?', [cleanCat, parseInt(cleanCat, 10) || -1]);
    if (catRow) {
      // Find all child and subchild category IDs
      const allDescendants: number[] = [catRow.id];
      const allDbCats = db.all<{ id: number; parent_id: number }>('SELECT id, parent_id FROM categories');
      
      const childrenMap = new Map<number, number[]>();
      for (const c of allDbCats) {
        if (!childrenMap.has(c.parent_id)) childrenMap.set(c.parent_id, []);
        childrenMap.get(c.parent_id)!.push(c.id);
      }

      function addChildren(pId: number) {
        const ch = childrenMap.get(pId) || [];
        for (const cId of ch) {
          if (!allDescendants.includes(cId)) {
            allDescendants.push(cId);
            addChildren(cId);
          }
        }
      }
      addChildren(catRow.id);

      const placeholders = allDescendants.map(() => '?').join(',');
      whereClauses.push(`p.id IN (
        SELECT product_id FROM product_category_map WHERE category_id IN (${placeholders})
      )`);
      params.push(...allDescendants);
    } else {
      whereClauses.push('(p.category LIKE ? OR p.category_path LIKE ?)');
      params.push(`%${cleanCat}%`, `%${cleanCat}%`);
    }
  }

  // Brand filter
  if (options.brand && options.brand !== 'all') {
    const bClean = options.brand.toLowerCase().trim();
    whereClauses.push('(LOWER(p.brand_name) = ? OR LOWER(p.brand) = ? OR p.brand_id = ?)');
    params.push(bClean, bClean, `brand_${bClean}`);
  }

  // Condition filter
  if (options.condition && options.condition !== 'all') {
    const condClean = options.condition.toLowerCase().trim();
    if (condClean === 'new') {
      whereClauses.push("LOWER(p.condition) LIKE '%brand new%'");
    } else if (condClean === 'refurbished') {
      whereClauses.push("LOWER(p.condition) LIKE '%refurbished%'");
    } else {
      whereClauses.push('LOWER(p.condition) LIKE ?');
      params.push(`%${condClean}%`);
    }
  }

  // Price range
  if (options.minPrice !== undefined && options.minPrice >= 0) {
    whereClauses.push('p.price >= ?');
    params.push(options.minPrice);
  }
  if (options.maxPrice !== undefined && options.maxPrice > 0) {
    whereClauses.push('p.price <= ?');
    params.push(options.maxPrice);
  }

  // In Stock Only
  if (options.inStockOnly) {
    whereClauses.push("(p.stock_status = 'instock' AND p.stock_quantity > 0)");
  }

  // On Sale Only
  if (options.onSaleOnly) {
    whereClauses.push('p.on_sale = 1');
  }

  // Search filter
  if (options.search && options.search.trim()) {
    const sTerm = `%${options.search.trim().toLowerCase()}%`;
    whereClauses.push('(LOWER(p.title) LIKE ? OR LOWER(p.name) LIKE ? OR LOWER(p.sku) LIKE ? OR LOWER(p.brand_name) LIKE ? OR LOWER(p.description) LIKE ?)');
    params.push(sTerm, sTerm, sTerm, sTerm, sTerm);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Sorting
  let orderBy = 'p.menu_order ASC, p.id DESC';
  if (options.sortBy === 'price-asc') {
    orderBy = 'p.price ASC';
  } else if (options.sortBy === 'price-desc') {
    orderBy = 'p.price DESC';
  } else if (options.sortBy === 'rating') {
    orderBy = 'p.average_rating DESC, p.rating_count DESC';
  } else if (options.sortBy === 'newest') {
    orderBy = 'p.date_created DESC, p.created_at DESC';
  } else if (options.sortBy === 'popular') {
    orderBy = 'p.rating_count DESC, p.average_rating DESC';
  }

  // Count total matching
  const countRow = db.get<{ total: number }>(`SELECT count(*) as total FROM products p ${whereSql}`, params);
  const total = countRow?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Fetch paginated rows
  const rows = db.all<any>(
    `SELECT p.* FROM products p ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const products = rows.map((r) => formatProductRecord(r, db));

  return {
    page,
    limit,
    total,
    totalPages,
    products,
  };
}

/**
 * Toggle hide/unhide of a product from the React site
 */
export async function setProductHidden(id: string, hidden: boolean): Promise<boolean> {
  const db = await getDb();
  const now = new Date().toISOString();
  db.run('UPDATE products SET local_hidden = ?, updated_at = ? WHERE id = ?', [hidden ? 1 : 0, now, id]);
  return true;
}

/**
 * CRUD operations for Local Products (source = 'local')
 */
export async function createLocalProduct(data: {
  title: string;
  slug?: string;
  sku?: string;
  price: number;
  regularPrice?: number;
  salePrice?: number;
  type?: string;
  condition?: string;
  brandName?: string;
  categorySlug?: string;
  stockStatus?: string;
  stockQuantity?: number;
  shortDescription?: string;
  description?: string;
  image?: string;
  gallery?: string[];
  variations?: any[];
}): Promise<FormattedProduct> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = `local_prod_${Date.now()}`;
  const baseSlug = (data.slug || data.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  
  // Check uniqueness of slug
  let finalSlug = baseSlug;
  let counter = 1;
  while (db.get('SELECT id FROM products WHERE slug = ?', [finalSlug])) {
    finalSlug = `${baseSlug}-${counter++}`;
  }

  const title = decodeHtmlEntities(data.title);
  const sku = data.sku || `IR-LOC-${Date.now().toString().slice(-6)}`;
  const brandName = data.brandName || 'iRepair';
  const price = Number(data.price) || 0;
  const regularPrice = data.regularPrice ? Number(data.regularPrice) : null;
  const salePrice = data.salePrice ? Number(data.salePrice) : null;
  const onSale = regularPrice && regularPrice > price ? 1 : 0;
  const image = data.image || 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&q=80&w=800';
  const category = data.categorySlug || 'accessories';

  db.run(
    `INSERT INTO products (
      id, wp_id, name, title, slug, sku, type, status, short_description, description,
      regular_price, sale_price, price, on_sale,
      stock_status, manage_stock, stock_quantity,
      brand_name, condition, average_rating, rating_count,
      image, category, category_path, hierarchical_url,
      source, connection_id, is_deleted_remote, local_hidden,
      created_at, updated_at
    ) VALUES (
      ?, NULL, ?, ?, ?, ?, ?, 'publish', ?, ?,
      ?, ?, ?, ?,
      ?, 1, ?,
      ?, ?, 5.0, 1,
      ?, ?, ?, ?,
      'local', 'local_main', 0, 0,
      ?, ?
    )`,
    [
      id,
      title,
      title,
      finalSlug,
      sku,
      data.type || 'simple',
      data.shortDescription || '',
      data.description || '',
      regularPrice,
      salePrice,
      price,
      onSale,
      data.stockStatus || 'instock',
      data.stockQuantity || 10,
      brandName,
      data.condition || 'Brand New',
      image,
      category,
      category,
      `/product/${finalSlug}/`,
      now,
      now,
    ]
  );

  // Add primary image to product_images
  db.run(
    `INSERT INTO product_images (id, product_id, original_url, local_url, alt_text, title, sort_order, is_featured, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?)`,
    [`img_${id}_0`, id, image, image, title, title, now]
  );

  // Add gallery if any
  if (Array.isArray(data.gallery)) {
    data.gallery.forEach((gUrl, idx) => {
      if (gUrl && gUrl !== image) {
        db.run(
          `INSERT INTO product_images (id, product_id, original_url, local_url, alt_text, title, sort_order, is_featured, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
          [`img_${id}_${idx + 1}`, id, gUrl, gUrl, title, title, idx + 1, now]
        );
      }
    });
  }

  // Link to category if exists
  const catRow = db.get<{ id: number }>('SELECT id FROM categories WHERE slug = ?', [category]);
  if (catRow) {
    db.run(
      'INSERT INTO product_category_map (product_id, category_id, is_primary) VALUES (?, ?, 1)',
      [id, catRow.id]
    );
  }

  const created = await getProductBySlugOrId(id);
  return created!;
}

export async function updateLocalProduct(id: string, data: any): Promise<FormattedProduct> {
  const db = await getDb();
  const existing = db.get<any>('SELECT * FROM products WHERE id = ?', [id]);
  if (!existing) {
    throw new Error('Product not found');
  }
  if (existing.source !== 'local') {
    throw new Error('Synced products from WooCommerce cannot be edited here. Click "Edit in WordPress" instead.');
  }

  const now = new Date().toISOString();
  const title = data.title !== undefined ? decodeHtmlEntities(data.title) : existing.title;
  const price = data.price !== undefined ? Number(data.price) : existing.price;
  const regularPrice = data.regularPrice !== undefined ? Number(data.regularPrice) : existing.regular_price;
  const salePrice = data.salePrice !== undefined ? Number(data.salePrice) : existing.sale_price;
  const onSale = regularPrice && regularPrice > price ? 1 : 0;

  db.run(
    `UPDATE products SET
      title = ?, name = ?, sku = ?, price = ?, regular_price = ?, sale_price = ?, on_sale = ?,
      stock_status = ?, stock_quantity = ?, brand_name = ?, condition = ?,
      short_description = ?, description = ?, image = ?, updated_at = ?
     WHERE id = ?`,
    [
      title,
      title,
      data.sku || existing.sku,
      price,
      regularPrice,
      salePrice,
      onSale,
      data.stockStatus || existing.stock_status,
      data.stockQuantity !== undefined ? Number(data.stockQuantity) : existing.stock_quantity,
      data.brandName || existing.brand_name,
      data.condition || existing.condition,
      data.shortDescription !== undefined ? data.shortDescription : existing.short_description,
      data.description !== undefined ? data.description : existing.description,
      data.image || existing.image,
      now,
      id,
    ]
  );

  const updated = await getProductBySlugOrId(id);
  return updated!;
}

export async function deleteLocalProduct(id: string): Promise<boolean> {
  const db = await getDb();
  const existing = db.get<any>('SELECT * FROM products WHERE id = ?', [id]);
  if (!existing) return false;
  if (existing.source !== 'local') {
    throw new Error('Synced products from WooCommerce cannot be deleted here.');
  }

  db.run('DELETE FROM products WHERE id = ?', [id]);
  db.run('DELETE FROM product_images WHERE product_id = ?', [id]);
  db.run('DELETE FROM product_variations WHERE product_id = ?', [id]);
  db.run('DELETE FROM product_category_map WHERE product_id = ?', [id]);
  db.run('DELETE FROM product_relations WHERE product_id = ?', [id]);
  return true;
}
