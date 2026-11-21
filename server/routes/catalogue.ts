import { Router, Request, Response } from 'express';
import {
  getProductBySlugOrId,
  resolveProductRequestUrl,
  queryLocalCatalogue,
  getProductRelatedProducts,
} from '../services/productService';
import { getDb } from '../db';
import { getCatalogCacheVersion, resyncProductVariationsById } from '../services/productSyncService';

export const catalogueRouter = Router();

// GET /api/catalogue/version - Invalidation indicator for clients
catalogueRouter.get('/version', (req: Request, res: Response) => {
  return res.json({ version: getCatalogCacheVersion() });
});

// GET /api/catalogue/brands - All brands with live product counts
catalogueRouter.get('/brands', async (req: Request, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const brands = db.all<any>(
      `SELECT * FROM brands 
       WHERE product_count > 0 OR source = 'local' 
       ORDER BY product_count DESC, name ASC`
    );
    return res.json({ brands });
  } catch (err: any) {
    console.error('Error fetching catalogue brands:', err);
    return res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// GET /api/catalogue/products - Local database products with parent-child hierarchical queries
catalogueRouter.get('/products', async (req: Request, res: Response): Promise<any> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(250, Math.max(1, parseInt(req.query.limit as string, 10) || 24));
    const category = (req.query.category as string || '').toLowerCase().trim();
    const brand = (req.query.brand as string || '').toLowerCase().trim();
    const condition = (req.query.condition as string || '').toLowerCase().trim();
    const search = (req.query.search as string || '').toLowerCase().trim();
    const sortBy = (req.query.sortBy as any) || (req.query.sort as any) || 'popular';
    const minPrice = req.query.minPrice !== undefined ? parseFloat(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice !== undefined ? parseFloat(req.query.maxPrice as string) : undefined;
    const inStockOnly = req.query.inStock === 'true' || req.query.inStock === '1';
    const onSaleOnly = req.query.onSale === 'true' || req.query.onSale === '1';

    const result = await queryLocalCatalogue({
      page,
      limit,
      category,
      brand,
      condition,
      search,
      sortBy,
      minPrice,
      maxPrice,
      inStockOnly,
      onSaleOnly,
      includeHidden: false,
      includeTrashed: false,
    });

    res.setHeader('X-Total-Count', result.total.toString());
    res.setHeader('X-Total-Pages', result.totalPages.toString());
    res.setHeader('X-Catalog-Version', getCatalogCacheVersion().toString());

    return res.json(result);
  } catch (err: any) {
    console.error('Error in /api/catalogue/products:', err);
    return res.status(500).json({ error: 'Failed to fetch catalogue products' });
  }
});

// GET /api/catalogue/products/:slug - Single product by slug or id with related items
catalogueRouter.get('/products/:slug', async (req: Request, res: Response): Promise<any> => {
  try {
    const slug = req.params.slug;
    let product = await getProductBySlugOrId(slug);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Don't show hidden or trashed products publicly
    if (product.localHidden || product.status !== 'publish') {
      return res.status(404).json({ error: 'Product is currently unavailable' });
    }

    // Self-heal variable products whose variations have not been synced locally yet
    if (
      product.source === 'woocommerce' &&
      product.externalId &&
      product.type === 'variable' &&
      (!product.variations || product.variations.length === 0)
    ) {
      try {
        await resyncProductVariationsById(product.id);
        const refreshed = await getProductBySlugOrId(slug);
        if (refreshed) product = refreshed;
      } catch (_) {}
    }

    const [related, breadcrumbs] = await Promise.all([
      getProductRelatedProducts(product.id, 4),
      Promise.resolve(
        product.categoryPath.split('/').filter(Boolean).map((seg, idx, arr) => {
          const subPath = arr.slice(0, idx + 1).join('/');
          let name = seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          if (seg === 'mobiles' || seg === 'mobile-phones') name = 'Mobile Phones';
          if (seg === 'iphones') name = 'iPhones';
          return {
            id: `crumb-${seg}`,
            name,
            slug: seg,
            url: `/product-category/${subPath}/`,
          };
        })
      ),
    ]);

    const fullBreadcrumbs = [
      { id: 'crumb-home', name: 'Home', slug: 'home', url: '/' },
      { id: 'crumb-shop', name: 'Shop', slug: 'shop', url: '/shop' },
      ...breadcrumbs,
      { id: 'crumb-current', name: product.title, slug: 'current', url: product.canonicalUrl },
    ];

    return res.json({
      product,
      canonicalUrl: product.canonicalUrl,
      breadcrumbs: fullBreadcrumbs,
      relatedProducts: related,
    });
  } catch (err: any) {
    console.error('Error fetching product by slug:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/catalogue/resolve-url - Resolves any product path (flat or hierarchical)
catalogueRouter.get('/resolve-url', async (req: Request, res: Response): Promise<any> => {
  try {
    const path = (req.query.path as string || '').trim();
    if (!path) {
      return res.status(400).json({ error: 'path query parameter is required' });
    }

    const resolved = await resolveProductRequestUrl(path);
    if (!resolved.product || resolved.product.localHidden || resolved.product.status !== 'publish') {
      return res.status(404).json({ error: 'Product not found for path' });
    }

    return res.json({
      canonicalUrl: resolved.canonicalUrl,
      isRedirect: resolved.isRedirect,
      product: resolved.product,
      breadcrumbs: resolved.breadcrumbs,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to resolve product URL' });
  }
});

// GET /api/catalogue/trust-badges/settings - Public settings for product page trust badges
catalogueRouter.get('/trust-badges/settings', async (req: Request, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const row = db.get<{ value_json: string }>('SELECT value_json FROM site_settings WHERE key = ?', [
      'product_trust_badges_settings',
    ]);
    if (row && row.value_json) {
      return res.json({ settings: JSON.parse(row.value_json) });
    }

    return res.json({
      settings: {
        enabled: true,
        items: {
          delivery: { id: 'delivery', label: 'Delivery', icon: 'truck', fallbackText: 'Free Tracked UK Delivery', enabled: true },
          warranty: { id: 'warranty', label: 'Warranty', icon: 'shield', fallbackText: '12 Months Hardware Warranty', enabled: true },
          returns: { id: 'returns', label: 'Returns', icon: 'rotate-ccw', fallbackText: '14-Day Money Back Guarantee', enabled: true },
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to load trust badges settings' });
  }
});

