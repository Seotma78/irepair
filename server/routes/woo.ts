import { Router, Response } from 'express';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { getDb } from '../db';
import { encrypt, decrypt, maskSecret } from '../crypto';
import { AuthenticatedRequest, authenticateToken, requireRole, logActivity } from '../middleware/auth';

export const wooRouter = Router();

// In-memory cache for WooCommerce responses
interface CacheEntry {
  data: any;
  timestamp: number;
}
const apiCache: Map<string, CacheEntry> = new Map();

export function clearWooCache() {
  apiCache.clear();
}

async function getWooConfig(): Promise<{
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  apiVersion: string;
  cacheDurationSeconds: number;
  brandTaxonomy: string;
  conditionTaxonomy: string;
}> {
  const db = await getDb();
  const row = db.get<{ config_json: string }>('SELECT config_json FROM integrations WHERE name = ?', ['woocommerce']);
  if (!row) {
    throw new Error('WooCommerce integration not configured');
  }

  const parsed = JSON.parse(row.config_json);
  const consumerKey = decrypt(parsed.consumerKeyEncrypted);
  const consumerSecret = decrypt(parsed.consumerSecretEncrypted);

  return {
    storeUrl: parsed.storeUrl.replace(/\/+$/, ''),
    consumerKey,
    consumerSecret,
    apiVersion: parsed.apiVersion || 'wc/v3',
    cacheDurationSeconds: parsed.cacheDurationSeconds || 300,
    brandTaxonomy: parsed.brandTaxonomy || 'pa_brand',
    conditionTaxonomy: parsed.conditionTaxonomy || 'pa_condition',
  };
}

// Low-level helper to execute HTTP requests with Basic Auth
function makeWooRequest(urlStr: string, authHeader: string): Promise<{ statusCode: number; headers: any; body: string }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlStr);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const req = client.request(
      parsedUrl,
      {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
          'User-Agent': 'iRepair-Mobiles-CMS-Proxy/1.0',
        },
        timeout: 12000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 200,
            headers: res.headers,
            body,
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Connection timed out to WooCommerce store'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

// ==========================================
// PUBLIC PROXY ENDPOINTS (CACHED)
// ==========================================

// GET /api/woo/products
wooRouter.get('/products', async (req, res): Promise<any> => {
  try {
    const config = await getWooConfig();
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const cacheKey = `products_${queryString}`;

    const cached = apiCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < config.cacheDurationSeconds * 1000) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached.data);
    }

    const auth = 'Basic ' + Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
    const endpoint = `${config.storeUrl}/wp-json/${config.apiVersion}/products?${queryString}`;

    const response = await makeWooRequest(endpoint, auth);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      const data = JSON.parse(response.body);
      apiCache.set(cacheKey, { data, timestamp: now });
      res.setHeader('X-Cache', 'MISS');
      if (response.headers['x-wp-total']) {
        res.setHeader('X-WP-Total', response.headers['x-wp-total']);
      }
      if (response.headers['x-wp-totalpages']) {
        res.setHeader('X-WP-TotalPages', response.headers['x-wp-totalpages']);
      }
      return res.json(data);
    } else {
      console.warn(`WooCommerce API returned status ${response.statusCode}:`, response.body);
      // Return cached if available even if stale
      if (cached) {
        return res.json(cached.data);
      }
      return res.status(response.statusCode).json({ error: 'Failed to retrieve products from WooCommerce' });
    }
  } catch (err: any) {
    console.error('Woo products proxy error:', err.message);
    return res.status(502).json({ error: 'WooCommerce connection error: ' + err.message });
  }
});

// GET /api/woo/categories
wooRouter.get('/categories', async (req, res): Promise<any> => {
  try {
    const config = await getWooConfig();
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const cacheKey = `categories_${queryString}`;

    const cached = apiCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < config.cacheDurationSeconds * 1000) {
      return res.json(cached.data);
    }

    const auth = 'Basic ' + Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
    const endpoint = `${config.storeUrl}/wp-json/${config.apiVersion}/products/categories?${queryString}`;

    const response = await makeWooRequest(endpoint, auth);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      const data = JSON.parse(response.body);
      apiCache.set(cacheKey, { data, timestamp: now });
      return res.json(data);
    } else {
      if (cached) return res.json(cached.data);
      return res.status(response.statusCode).json({ error: 'Failed to retrieve categories' });
    }
  } catch (err: any) {
    return res.status(502).json({ error: 'WooCommerce connection error' });
  }
});

// GET /api/woo/attributes
wooRouter.get('/attributes', async (req, res): Promise<any> => {
  try {
    const config = await getWooConfig();
    const cacheKey = 'attributes_list';

    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < config.cacheDurationSeconds * 1000) {
      return res.json(cached.data);
    }

    const auth = 'Basic ' + Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
    const endpoint = `${config.storeUrl}/wp-json/${config.apiVersion}/products/attributes`;

    const response = await makeWooRequest(endpoint, auth);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      const data = JSON.parse(response.body);
      apiCache.set(cacheKey, { data, timestamp: Date.now() });
      return res.json(data);
    }
    return res.status(response.statusCode).json({ error: 'Failed to retrieve attributes' });
  } catch (err: any) {
    return res.status(502).json({ error: 'WooCommerce attributes error' });
  }
});

// GET /api/woo/brands
wooRouter.get('/brands', async (req, res): Promise<any> => {
  try {
    const config = await getWooConfig();
    const cacheKey = 'brands_list';

    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < config.cacheDurationSeconds * 1000) {
      return res.json(cached.data);
    }

    const auth = 'Basic ' + Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
    
    // First try attributes terms for brandTaxonomy
    let endpoint = `${config.storeUrl}/wp-json/${config.apiVersion}/products/attributes/terms`;
    // If brandTaxonomy is configured, fetch terms for that attribute or tags
    const termsEndpoint = `${config.storeUrl}/wp-json/${config.apiVersion}/products/tags?per_page=100`;

    const response = await makeWooRequest(termsEndpoint, auth);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      const data = JSON.parse(response.body);
      apiCache.set(cacheKey, { data, timestamp: Date.now() });
      return res.json(data);
    }
    return res.json([]);
  } catch (err: any) {
    return res.json([]);
  }
});

// ==========================================
// ADMIN CONFIGURATION & TEST ENDPOINTS
// ==========================================

export const adminWooRouter = Router();
adminWooRouter.use(authenticateToken);

// GET /api/admin/integrations/woocommerce
adminWooRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const row = db.get<{ config_json: string; updated_at: string }>('SELECT config_json, updated_at FROM integrations WHERE name = ?', ['woocommerce']);
    if (!row) {
      return res.json({
        configured: false,
      });
    }

    const parsed = JSON.parse(row.config_json);
    const rawKey = decrypt(parsed.consumerKeyEncrypted);
    const rawSecret = decrypt(parsed.consumerSecretEncrypted);

    return res.json({
      configured: true,
      storeUrl: parsed.storeUrl,
      maskedConsumerKey: maskSecret(rawKey),
      maskedConsumerSecret: maskSecret(rawSecret),
      hasKeys: Boolean(rawKey && rawSecret),
      apiVersion: parsed.apiVersion || 'wc/v3',
      cacheDurationSeconds: parsed.cacheDurationSeconds || 300,
      brandTaxonomy: parsed.brandTaxonomy || 'pa_brand',
      conditionTaxonomy: parsed.conditionTaxonomy || 'pa_condition',
      lastTestedAt: parsed.lastTestedAt,
      lastTestStatus: parsed.lastTestStatus,
      updatedAt: row.updated_at,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve WooCommerce configuration' });
  }
});

// POST /api/admin/integrations/woocommerce
adminWooRouter.post('/', requireRole('super_admin', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const {
      storeUrl,
      consumerKey,
      consumerSecret,
      apiVersion,
      cacheDurationSeconds,
      brandTaxonomy,
      conditionTaxonomy,
    } = req.body;

    if (!storeUrl) {
      return res.status(400).json({ error: 'Store URL is required' });
    }

    const db = await getDb();
    const existingRow = db.get<{ config_json: string }>('SELECT config_json FROM integrations WHERE name = ?', ['woocommerce']);
    let existingConfig: any = {};
    if (existingRow) {
      existingConfig = JSON.parse(existingRow.config_json);
    }

    // Only update keys if new ones provided (not masked)
    let newKeyEncrypted = existingConfig.consumerKeyEncrypted;
    if (consumerKey && !consumerKey.includes('••••')) {
      newKeyEncrypted = encrypt(consumerKey.trim());
    }

    let newSecretEncrypted = existingConfig.consumerSecretEncrypted;
    if (consumerSecret && !consumerSecret.includes('••••')) {
      newSecretEncrypted = encrypt(consumerSecret.trim());
    }

    const newConfig = {
      storeUrl: storeUrl.trim().replace(/\/+$/, ''),
      consumerKeyEncrypted: newKeyEncrypted,
      consumerSecretEncrypted: newSecretEncrypted,
      apiVersion: apiVersion || 'wc/v3',
      cacheDurationSeconds: Number(cacheDurationSeconds) || 300,
      brandTaxonomy: brandTaxonomy || 'pa_brand',
      conditionTaxonomy: conditionTaxonomy || 'pa_condition',
      lastTestedAt: existingConfig.lastTestedAt,
      lastTestStatus: existingConfig.lastTestStatus,
    };

    const now = new Date().toISOString();
    if (existingRow) {
      db.run('UPDATE integrations SET config_json = ?, updated_at = ? WHERE name = ?', [JSON.stringify(newConfig), now, 'woocommerce']);
    } else {
      const id = `int_${Date.now()}`;
      db.run('INSERT INTO integrations (id, name, config_json, updated_at) VALUES (?, ?, ?, ?)', [id, 'woocommerce', JSON.stringify(newConfig), now]);
    }

    // Changing the keys or URL clears the product cache immediately!
    clearWooCache();

    await logActivity(req.user!.email, 'WOOCOMMERCE_CONFIG_SAVED', { storeUrl: newConfig.storeUrl }, req.ip);

    return res.json({
      success: true,
      message: 'WooCommerce settings encrypted and saved securely. Product cache cleared.',
    });
  } catch (err: any) {
    console.error('Save WooCommerce config error:', err);
    return res.status(500).json({ error: 'Failed to save WooCommerce configuration' });
  }
});

// POST /api/admin/integrations/woocommerce/test
adminWooRouter.post('/test', requireRole('super_admin', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { storeUrl, consumerKey, consumerSecret, apiVersion } = req.body;

    let targetUrl = storeUrl;
    let targetKey = consumerKey;
    let targetSecret = consumerSecret;
    let targetVersion = apiVersion || 'wc/v3';

    // If keys not sent in body or are masked, read from saved config
    if (!targetKey || targetKey.includes('••••') || !targetSecret || targetSecret.includes('••••')) {
      const dbConfig = await getWooConfig();
      targetUrl = targetUrl || dbConfig.storeUrl;
      targetKey = dbConfig.consumerKey;
      targetSecret = dbConfig.consumerSecret;
      targetVersion = targetVersion || dbConfig.apiVersion;
    }

    if (!targetUrl || !targetKey || !targetSecret) {
      return res.status(400).json({
        success: false,
        error: 'Please provide valid Store URL, Consumer Key, and Consumer Secret to test connection.',
      });
    }

    const cleanStoreUrl = targetUrl.trim().replace(/\/+$/, '');
    const endpoint = `${cleanStoreUrl}/wp-json/${targetVersion}/products?per_page=3`;
    const auth = 'Basic ' + Buffer.from(`${targetKey.trim()}:${targetSecret.trim()}`).toString('base64');

    const startTime = Date.now();
    const result = await makeWooRequest(endpoint, auth);
    const responseTime = Date.now() - startTime;

    if (result.statusCode >= 200 && result.statusCode < 300) {
      const products = JSON.parse(result.body);
      const totalCount = result.headers['x-wp-total'] || 'Available';

      // Update test status in DB
      const db = await getDb();
      const existing = db.get<{ config_json: string }>('SELECT config_json FROM integrations WHERE name = ?', ['woocommerce']);
      if (existing) {
        const c = JSON.parse(existing.config_json);
        c.lastTestedAt = new Date().toISOString();
        c.lastTestStatus = 'success';
        db.run('UPDATE integrations SET config_json = ? WHERE name = ?', [JSON.stringify(c), 'woocommerce']);
      }

      await logActivity(req.user!.email, 'WOOCOMMERCE_TEST_SUCCESS', { storeUrl: cleanStoreUrl, responseTime }, req.ip);

      return res.json({
        success: true,
        statusCode: result.statusCode,
        responseTimeMs: responseTime,
        productCount: Array.isArray(products) ? products.length : 0,
        totalProductsInStore: totalCount,
        sampleProductTitle: products[0]?.name || 'Connected successfully',
      });
    } else {
      let errorMessage = `HTTP ${result.statusCode}`;
      try {
        const parsedErr = JSON.parse(result.body);
        errorMessage = parsedErr.message || errorMessage;
      } catch (e) {
        errorMessage = result.body.slice(0, 200) || errorMessage;
      }

      return res.status(400).json({
        success: false,
        statusCode: result.statusCode,
        error: errorMessage,
      });
    }
  } catch (err: any) {
    console.error('Woo test error:', err);
    return res.status(500).json({
      success: false,
      error: 'Connection failed: ' + (err.message || 'Network error'),
    });
  }
});

// POST /api/admin/integrations/woocommerce/clear-cache
adminWooRouter.post('/clear-cache', requireRole('super_admin', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  clearWooCache();
  await logActivity(req.user!.email, 'WOOCOMMERCE_CACHE_CLEARED', {}, req.ip);
  return res.json({ success: true, message: 'WooCommerce proxy cache cleared.' });
});
