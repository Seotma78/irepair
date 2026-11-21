import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { AuthenticatedRequest, authenticateToken, requireRole } from '../middleware/auth';
import {
  queryLocalCatalogue,
  getProductBySlugOrId,
  setProductHidden,
  createLocalProduct,
  updateLocalProduct,
  deleteLocalProduct,
} from '../services/productService';
import {
  executeProductSync,
  getProductSyncProgress,
  isProductSyncInProgress,
  syncSingleProduct,
  getSchedulerStatus,
  initProductSyncScheduler,
  getCustomFieldMappings,
  testAcfConnection,
  resyncCustomFieldsAll,
  resyncShortDescriptionsAll,
  resyncVariationsAll,
  resyncProductVariationsById,
  DEFAULT_CUSTOM_FIELD_MAPPINGS,
  CustomFieldMappingItem,
} from '../services/productSyncService';
import { testWooCommerceConnectionDetailed, getWooCommerceConfig } from '../services/wooCommerceService';

export const adminProductRouter = Router();

// Protect all admin product routes
adminProductRouter.use(authenticateToken);

// ==========================================
// 1. PRODUCTS LIST & FILTERING
// ==========================================
adminProductRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(250, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const search = (req.query.search as string || '').trim();
    const category = (req.query.category as string || '').trim();
    const brand = (req.query.brand as string || '').trim();
    const condition = (req.query.condition as string || '').trim();
    const status = (req.query.status as string || '').trim();
    const stockStatus = (req.query.stockStatus as string || '').trim();
    const source = (req.query.source as any) || 'all';
    const sortBy = (req.query.sortBy as any) || 'newest';
    const hiddenOnly = req.query.hidden === 'true';

    const result = await queryLocalCatalogue({
      page,
      limit,
      search,
      category,
      brand,
      condition,
      inStockOnly: stockStatus === 'instock',
      includeHidden: true,
      includeTrashed: status === 'trash' || status === 'all',
      source,
      sortBy,
    });

    const productType = (req.query.type as string || '').trim();
    let filtered = result.products;
    if (status && status !== 'all') {
      filtered = filtered.filter((p) => p.status === status);
    }
    if (productType && productType !== 'all') {
      filtered = filtered.filter((p) => p.type === productType);
    }
    if (hiddenOnly) {
      filtered = filtered.filter((p) => p.localHidden);
    }

    return res.json({
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
      products: filtered,
    });
  } catch (err: any) {
    console.error('Admin products fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch admin products' });
  }
});

// ==========================================
// 2. PRODUCT DETAIL
// ==========================================
adminProductRouter.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const product = await getProductBySlugOrId(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.json({ product });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve product details' });
  }
});

// ==========================================
// 3. CREATE LOCAL PRODUCT
// ==========================================
adminProductRouter.post('/', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { title, price, categorySlug, brandName, condition, description, shortDescription, sku, image, gallery } = req.body;
    if (!title || price === undefined) {
      return res.status(400).json({ error: 'Title and price are required' });
    }

    const created = await createLocalProduct({
      title,
      price: Number(price),
      categorySlug,
      brandName,
      condition,
      description,
      shortDescription,
      sku,
      image,
      gallery,
    });

    return res.json({ success: true, product: created });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create local product' });
  }
});

// ==========================================
// 4. UPDATE LOCAL PRODUCT
// ==========================================
adminProductRouter.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const updated = await updateLocalProduct(req.params.id, req.body);
    return res.json({ success: true, product: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update product' });
  }
});

// ==========================================
// 5. DELETE LOCAL PRODUCT
// ==========================================
adminProductRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const deleted = await deleteLocalProduct(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Product not found or not a local product' });
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Cannot delete synced product' });
  }
});

// ==========================================
// 6. TOGGLE HIDE / UNHIDE
// ==========================================
adminProductRouter.post('/:id/toggle-hide', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { hidden } = req.body;
    await setProductHidden(req.params.id, Boolean(hidden));
    return res.json({ success: true, hidden: Boolean(hidden) });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update hidden status' });
  }
});

// ==========================================
// 7. BULK ACTIONS (re-sync, hide, unhide)
// ==========================================
adminProductRouter.post('/bulk-action', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { action, ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (action === 'hide' || action === 'unhide') {
      const isHidden = action === 'hide';
      for (const id of ids) {
        await setProductHidden(id, isHidden);
      }
      return res.json({ success: true, count: ids.length });
    }

    if (action === 'resync') {
      let count = 0;
      for (const id of ids) {
        try {
          await syncSingleProduct(id);
          count++;
        } catch (_) {}
      }
      return res.json({ success: true, syncedCount: count });
    }

    return res.status(400).json({ error: 'Invalid bulk action' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Bulk action failed' });
  }
});

// ==========================================
// 8. BRANDS MANAGEMENT
// ==========================================
adminProductRouter.get('/meta/brands', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const brands = db.all<any>('SELECT * FROM brands ORDER BY product_count DESC, name ASC');
    return res.json({ brands });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// ==========================================
// 9. SYNC DASHBOARD & STATUS
// ==========================================
adminProductRouter.get('/sync/status', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const progress = getProductSyncProgress();
    const scheduler = getSchedulerStatus();
    const db = await getDb();
    const lastLog = db.get<any>(
      "SELECT * FROM sync_logs WHERE type LIKE 'products_%' ORDER BY started_at DESC LIMIT 1"
    );

    return res.json({
      progress,
      scheduler,
      lastSyncLog: lastLog ? { ...lastLog, summary: JSON.parse(lastLog.summary || '{}') } : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to get sync status' });
  }
});

adminProductRouter.post('/sync/start', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (isProductSyncInProgress()) {
      return res.status(409).json({ error: 'A sync job is already in progress' });
    }

    const { type = 'incremental' } = req.body;
    // Start sync in background
    executeProductSync({ type: type as any }).catch((err) => {
      console.error('Background sync failed:', err);
    });

    return res.json({ success: true, message: `Sync started with mode: ${type}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to start sync' });
  }
});

adminProductRouter.post('/sync/product/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const success = await syncSingleProduct(req.params.id);
    return res.json({ success });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to sync product' });
  }
});

adminProductRouter.post('/sync/resync-short-descriptions', requireRole('super_admin', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const result = await resyncShortDescriptionsAll();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to re-sync short descriptions' });
  }
});

adminProductRouter.post('/sync/resync-variations', requireRole('super_admin', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const result = await resyncVariationsAll();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to re-sync variations' });
  }
});

adminProductRouter.post('/:id/resync-variations', requireRole('super_admin', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const result = await resyncProductVariationsById(req.params.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to re-sync product variations' });
  }
});

adminProductRouter.get('/sync/logs', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const rows = db.all<any>(
      "SELECT * FROM sync_logs WHERE type LIKE 'products_%' ORDER BY started_at DESC LIMIT 25"
    );
    const parsed = rows.map((r) => ({
      ...r,
      summary: r.summary ? JSON.parse(r.summary) : null,
    }));
    return res.json({ logs: parsed });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch sync logs' });
  }
});

// ==========================================
// 10. DETAILED CONNECTION TEST & SETTINGS
// ==========================================
adminProductRouter.post('/sync/test-connection', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const result = await testWooCommerceConnectionDetailed();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminProductRouter.get('/sync/settings', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const config = await getWooCommerceConfig();
    const appUrl = process.env.APP_URL || 'https://irepair-mobiles.co.uk';
    const webhookUrl = `${appUrl.replace(/\/+$/, '')}/api/webhooks/woocommerce`;

    return res.json({
      brandSource: config.brandSource || 'attribute',
      conditionSource: config.conditionSource || 'attribute',
      brandTaxonomy: config.brandTaxonomy || 'pa_brand',
      conditionTaxonomy: config.conditionTaxonomy || 'pa_condition',
      importedStatuses: config.importedStatuses || ['publish'],
      deletedPolicy: config.deletedPolicy || 'archive',
      imageMode: config.imageMode || 'hotlink',
      syncIntervalMinutes: config.syncIntervalMinutes || 30,
      technicalDetailsMetaKey: config.technicalDetailsMetaKey || '_technical_details',
      webhookUrl,
      webhookSecret: config.webhookSecret || 'wc_webhook_secret_irepair_2026',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to load sync settings' });
  }
});

adminProductRouter.post('/sync/settings', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const row = db.get<{ config_json: string }>('SELECT config_json FROM integrations WHERE name = ?', ['woocommerce']);
    if (!row) {
      return res.status(404).json({ error: 'WooCommerce integration not configured' });
    }

    const existingConfig = JSON.parse(row.config_json);
    const updatedConfig = {
      ...existingConfig,
      brandSource: req.body.brandSource || existingConfig.brandSource || 'attribute',
      conditionSource: req.body.conditionSource || existingConfig.conditionSource || 'attribute',
      brandTaxonomy: req.body.brandTaxonomy || existingConfig.brandTaxonomy || 'pa_brand',
      conditionTaxonomy: req.body.conditionTaxonomy || existingConfig.conditionTaxonomy || 'pa_condition',
      importedStatuses: req.body.importedStatuses || existingConfig.importedStatuses || ['publish'],
      deletedPolicy: req.body.deletedPolicy || existingConfig.deletedPolicy || 'archive',
      imageMode: req.body.imageMode || existingConfig.imageMode || 'hotlink',
      syncIntervalMinutes: req.body.syncIntervalMinutes !== undefined ? Number(req.body.syncIntervalMinutes) : 30,
      technicalDetailsMetaKey: req.body.technicalDetailsMetaKey || existingConfig.technicalDetailsMetaKey || '_technical_details',
      webhookSecret: req.body.webhookSecret || existingConfig.webhookSecret || 'wc_webhook_secret_irepair_2026',
    };

    const now = new Date().toISOString();
    db.run('UPDATE integrations SET config_json = ?, updated_at = ? WHERE name = ?', [
      JSON.stringify(updatedConfig),
      now,
      'woocommerce',
    ]);

    // Restart scheduler with new interval
    await initProductSyncScheduler();

    return res.json({ success: true, settings: updatedConfig });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to save sync settings' });
  }
});

// ==========================================
// 6. ACF CUSTOM FIELDS MAPPING & RESYNC
// ==========================================

// GET /api/admin/products/custom-fields/settings
adminProductRouter.get('/custom-fields/settings', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const mappings = getCustomFieldMappings(db);
    return res.json({ mappings });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to load custom fields mappings' });
  }
});

// POST /api/admin/products/custom-fields/settings
adminProductRouter.post('/custom-fields/settings', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { mappings } = req.body;
    if (!Array.isArray(mappings)) {
      return res.status(400).json({ error: 'mappings array is required' });
    }

    const db = await getDb();
    const now = new Date().toISOString();
    const existing = db.get<{ id: string }>('SELECT id FROM site_settings WHERE key = ?', ['acf_custom_fields_mapping']);
    if (existing) {
      db.run('UPDATE site_settings SET value_json = ?, updated_at = ? WHERE key = ?', [
        JSON.stringify(mappings),
        now,
        'acf_custom_fields_mapping',
      ]);
    } else {
      db.run('INSERT INTO site_settings (id, key, value_json, updated_at) VALUES (?, ?, ?, ?)', [
        `set_acf_${Date.now()}`,
        'acf_custom_fields_mapping',
        JSON.stringify(mappings),
        now,
      ]);
    }

    return res.json({ success: true, mappings });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to save custom fields mappings' });
  }
});

// GET /api/admin/products/custom-fields/test-connection
adminProductRouter.get('/custom-fields/test-connection', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const report = await testAcfConnection();
    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Error executing test connection',
      testedSampleProducts: 0,
      fieldResults: [],
      warning: err.message,
    });
  }
});

// POST /api/admin/products/custom-fields/resync-all
adminProductRouter.post('/custom-fields/resync-all', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const result = await resyncCustomFieldsAll();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to resync custom fields: ' + err.message });
  }
});

// ==========================================
// 7. PRODUCT TRUST BADGES SETTINGS
// ==========================================

// GET /api/admin/products/trust-badges/settings
adminProductRouter.get('/trust-badges/settings', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const row = db.get<{ value_json: string }>('SELECT value_json FROM site_settings WHERE key = ?', [
      'product_trust_badges_settings',
    ]);
    if (row && row.value_json) {
      return res.json({ settings: JSON.parse(row.value_json) });
    }

    // Default settings if not configured
    const defaultSettings = {
      enabled: true,
      items: {
        delivery: { id: 'delivery', label: 'Delivery', icon: 'truck', fallbackText: 'Free Tracked UK Delivery', enabled: true },
        warranty: { id: 'warranty', label: 'Warranty', icon: 'shield', fallbackText: '12 Months Hardware Warranty', enabled: true },
        returns: { id: 'returns', label: 'Returns', icon: 'rotate-ccw', fallbackText: '14-Day Money Back Guarantee', enabled: true },
      },
    };
    return res.json({ settings: defaultSettings });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to load trust badges settings' });
  }
});

// POST /api/admin/products/trust-badges/settings
adminProductRouter.post('/trust-badges/settings', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Invalid settings object' });
    }

    const db = await getDb();
    const now = new Date().toISOString();
    const existing = db.get<{ id: string }>('SELECT id FROM site_settings WHERE key = ?', ['product_trust_badges_settings']);
    if (existing) {
      db.run('UPDATE site_settings SET value_json = ?, updated_at = ? WHERE key = ?', [
        JSON.stringify(settings),
        now,
        'product_trust_badges_settings',
      ]);
    } else {
      db.run('INSERT INTO site_settings (id, key, value_json, updated_at) VALUES (?, ?, ?, ?)', [
        `set_tb_${Date.now()}`,
        'product_trust_badges_settings',
        JSON.stringify(settings),
        now,
      ]);
    }

    return res.json({ success: true, settings });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to save trust badges settings' });
  }
});

