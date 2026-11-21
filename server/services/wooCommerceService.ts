import https from 'https';
import http from 'http';
import { URL } from 'url';
import { getDb } from '../db';
import { decrypt } from '../crypto';

export interface WooConfig {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  apiVersion: string;
  brandTaxonomy?: string;
  conditionTaxonomy?: string;
  brandSource?: 'attribute' | 'taxonomy' | 'plugin';
  conditionSource?: 'attribute' | 'tag' | 'title';
  importedStatuses?: string[];
  deletedPolicy?: 'archive' | 'delete' | 'keep';
  imageMode?: 'download' | 'hotlink';
  syncIntervalMinutes?: number;
  webhookSecret?: string;
  technicalDetailsMetaKey?: string;
}

export async function getWooCommerceConfig(): Promise<WooConfig> {
  // 1. Environment variables take precedence if defined
  if (process.env.WOOCOMMERCE_URL && process.env.WOOCOMMERCE_KEY && process.env.WOOCOMMERCE_SECRET) {
    return {
      storeUrl: process.env.WOOCOMMERCE_URL.replace(/\/+$/, ''),
      consumerKey: process.env.WOOCOMMERCE_KEY,
      consumerSecret: process.env.WOOCOMMERCE_SECRET,
      apiVersion: process.env.WOOCOMMERCE_API_VERSION || 'wc/v3',
      brandTaxonomy: process.env.WOOCOMMERCE_BRAND_TAXONOMY || 'pa_brand',
      conditionTaxonomy: process.env.WOOCOMMERCE_CONDITION_TAXONOMY || 'pa_condition',
      brandSource: (process.env.WOOCOMMERCE_BRAND_SOURCE as any) || 'attribute',
      conditionSource: (process.env.WOOCOMMERCE_CONDITION_SOURCE as any) || 'attribute',
      importedStatuses: ['publish'],
      deletedPolicy: 'archive',
      imageMode: 'hotlink',
      syncIntervalMinutes: 30,
      technicalDetailsMetaKey: process.env.WOOCOMMERCE_TECH_DETAILS_META || '_technical_details',
    };
  }

  // 2. Fall back to encrypted settings in database
  const db = await getDb();
  const row = db.get<{ config_json: string }>('SELECT config_json FROM integrations WHERE name = ?', ['woocommerce']);
  if (row) {
    const parsed = JSON.parse(row.config_json);
    const storeUrl = (process.env.WOOCOMMERCE_URL || parsed.storeUrl || 'https://irepair-mobiles.co.uk').replace(/\/+$/, '');
    const consumerKey = process.env.WOOCOMMERCE_KEY || (parsed.consumerKeyEncrypted ? decrypt(parsed.consumerKeyEncrypted) : '');
    const consumerSecret = process.env.WOOCOMMERCE_SECRET || (parsed.consumerSecretEncrypted ? decrypt(parsed.consumerSecretEncrypted) : '');

    return {
      storeUrl,
      consumerKey,
      consumerSecret,
      apiVersion: parsed.apiVersion || 'wc/v3',
      brandTaxonomy: parsed.brandTaxonomy || 'pa_brand',
      conditionTaxonomy: parsed.conditionTaxonomy || 'pa_condition',
      brandSource: parsed.brandSource || 'attribute',
      conditionSource: parsed.conditionSource || 'attribute',
      importedStatuses: parsed.importedStatuses || ['publish'],
      deletedPolicy: parsed.deletedPolicy || 'archive',
      imageMode: parsed.imageMode || 'hotlink',
      syncIntervalMinutes: typeof parsed.syncIntervalMinutes === 'number' ? parsed.syncIntervalMinutes : 30,
      webhookSecret: parsed.webhookSecret || '',
      technicalDetailsMetaKey: parsed.technicalDetailsMetaKey || '_technical_details',
    };
  }

  // 3. Sensible defaults
  return {
    storeUrl: 'https://irepair-mobiles.co.uk',
    consumerKey: '',
    consumerSecret: '',
    apiVersion: 'wc/v3',
    brandTaxonomy: 'pa_brand',
    conditionTaxonomy: 'pa_condition',
    brandSource: 'attribute',
    conditionSource: 'attribute',
    importedStatuses: ['publish'],
    deletedPolicy: 'archive',
    imageMode: 'hotlink',
    syncIntervalMinutes: 30,
    technicalDetailsMetaKey: '_technical_details',
  };
}

/**
 * Execute a low-level HTTP request to WooCommerce with retry and exponential backoff
 */
function makeSingleWooRequest<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  customHeaders: Record<string, string> = {}
): Promise<{ statusCode: number; data: T; headers: any }> {
  return new Promise(async (resolve, reject) => {
    try {
      const config = await getWooCommerceConfig();
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

      // Determine if endpoint is full path or relative to wp-json
      const fullUrl = cleanEndpoint.startsWith('/wp-json/')
        ? `${config.storeUrl}${cleanEndpoint}`
        : `${config.storeUrl}/wp-json/${config.apiVersion}${cleanEndpoint}`;

      const parsedUrl = new URL(fullUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const authHeader = 'Basic ' + Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
      const payloadString = data ? JSON.stringify(data) : undefined;

      const headers: Record<string, string> = {
        Authorization: authHeader,
        Accept: 'application/json',
        'User-Agent': 'iRepair-Mobiles-Sync/2.0',
        ...customHeaders,
      };

      if (payloadString) {
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(payloadString).toString();
      }

      const req = client.request(
        parsedUrl,
        {
          method,
          headers,
          timeout: 18000,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            let parsedData: any = null;
            try {
              parsedData = body ? JSON.parse(body) : null;
            } catch {
              parsedData = body;
            }
            resolve({
              statusCode: res.statusCode || 200,
              data: parsedData,
              headers: res.headers,
            });
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`WooCommerce API request to ${cleanEndpoint} timed out`));
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (payloadString) {
        req.write(payloadString);
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Robust request with exponential backoff for rate limits (429) and transient errors (500, 502, 503, 504)
 */
export async function requestWoo<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  customHeaders: Record<string, string> = {},
  retries = 3
): Promise<{ statusCode: number; data: T; headers: any }> {
  let attempt = 0;
  let delay = 1000;

  while (attempt <= retries) {
    try {
      const res = await makeSingleWooRequest<T>(endpoint, method, data, customHeaders);
      
      // If rate limited (429) or transient server error, wait and retry
      if (res.statusCode === 429 || (res.statusCode >= 500 && res.statusCode <= 504)) {
        if (attempt < retries) {
          const retryAfter = parseInt(res.headers?.['retry-after'] || '0', 10);
          const waitTime = retryAfter > 0 ? retryAfter * 1000 : delay;
          console.warn(`WooCommerce status ${res.statusCode} on ${endpoint}. Retrying in ${waitTime}ms (attempt ${attempt + 1}/${retries})...`);
          await new Promise((r) => setTimeout(r, waitTime));
          attempt++;
          delay *= 2;
          continue;
        }
      }

      return res;
    } catch (err: any) {
      if (attempt < retries) {
        console.warn(`WooCommerce request error (${err.message}) on ${endpoint}. Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        attempt++;
        delay *= 2;
      } else {
        throw err;
      }
    }
  }

  throw new Error(`WooCommerce request failed after ${retries} retries`);
}

/**
 * Extended "Test Connection" reporting:
 * - Product count
 * - Whether variations load
 * - Whether brand taxonomy/attribute exists
 * - Currency and tax settings
 * - Missing permissions
 */
export async function testWooCommerceConnectionDetailed(customConfig?: Partial<WooConfig>): Promise<{
  success: boolean;
  storeUrl: string;
  productCount: number;
  variationsSupported: boolean;
  brandTaxonomyFound: boolean;
  brandTaxonomyType: string;
  currency: string;
  taxEnabled: boolean;
  permissionsOk: boolean;
  pricesIncludeTax?: boolean;
  taxDisplayShop?: string;
  taxDisplayCart?: string;
  variableProductCount?: number;
  totalVariationCount?: number;
  variableHealth?: any;
  error?: string;
  details?: Record<string, any>;
}> {
  try {
    const config = await getWooCommerceConfig();
    const effectiveConfig = { ...config, ...customConfig };

    // 1. Test Products Endpoint & count
    const prodRes = await requestWoo('/products?per_page=1&status=any');
    if (prodRes.statusCode !== 200 || !Array.isArray(prodRes.data)) {
      return {
        success: false,
        storeUrl: effectiveConfig.storeUrl,
        productCount: 0,
        variationsSupported: false,
        brandTaxonomyFound: false,
        brandTaxonomyType: 'none',
        currency: 'GBP',
        taxEnabled: false,
        permissionsOk: false,
        error: `Products API returned status ${prodRes.statusCode}: ${prodRes.data?.message || 'Unauthorized or unreachable'}`,
      };
    }

    const headerTotal = parseInt(prodRes.headers?.['x-wp-total'] || '0', 10);
    const productCount = isNaN(headerTotal) ? prodRes.data.length : headerTotal;

    // 2. Test Variations: find a variable product or test variations endpoint
    let variationsSupported = true;
    try {
      const varTestRes = await requestWoo('/products?type=variable&per_page=1');
      if (varTestRes.statusCode === 200 && Array.isArray(varTestRes.data) && varTestRes.data.length > 0) {
        const testVarProdId = varTestRes.data[0].id;
        const vRes = await requestWoo(`/products/${testVarProdId}/variations?per_page=1`);
        variationsSupported = vRes.statusCode === 200;
      }
    } catch (_) {
      variationsSupported = false;
    }

    // 3. Test Brand Taxonomy / Attribute
    let brandTaxonomyFound = false;
    let brandTaxonomyType = 'none';

    try {
      const attrRes = await requestWoo('/products/attributes');
      if (Array.isArray(attrRes.data)) {
        const brandAttr = attrRes.data.find(
          (a: any) =>
            a.slug === 'pa_brand' ||
            a.name?.toLowerCase() === 'brand' ||
            a.slug === effectiveConfig.brandTaxonomy
        );
        if (brandAttr) {
          brandTaxonomyFound = true;
          brandTaxonomyType = `Attribute (${brandAttr.name} / ${brandAttr.slug})`;
        }
      }
    } catch (_) {}

    // Check custom taxonomy if attribute not found
    if (!brandTaxonomyFound) {
      try {
        const brandTaxRes = await requestWoo('/wp-json/wp/v2/product_brand?per_page=1');
        if (brandTaxRes.statusCode === 200) {
          brandTaxonomyFound = true;
          brandTaxonomyType = 'WordPress Taxonomy (product_brand)';
        }
      } catch (_) {}
    }

    // 4. Test Currency and Tax Settings
    let currency = 'GBP';
    let taxEnabled = true;
    let pricesIncludeTax = false;
    let taxDisplayShop = 'excl';
    let taxDisplayCart = 'excl';

    try {
      const [curRes, calcTaxRes, inclTaxRes, dispShopRes, dispCartRes] = await Promise.all([
        requestWoo('/settings/general/woocommerce_currency'),
        requestWoo('/settings/general/woocommerce_calc_taxes'),
        requestWoo('/settings/tax/woocommerce_prices_include_tax'),
        requestWoo('/settings/tax/woocommerce_tax_display_shop'),
        requestWoo('/settings/tax/woocommerce_tax_display_cart'),
      ]);

      if (curRes.statusCode === 200 && curRes.data?.value) currency = curRes.data.value;
      if (calcTaxRes.statusCode === 200 && calcTaxRes.data?.value) taxEnabled = calcTaxRes.data.value === 'yes';
      if (inclTaxRes.statusCode === 200 && inclTaxRes.data?.value) pricesIncludeTax = inclTaxRes.data.value === 'yes';
      if (dispShopRes.statusCode === 200 && dispShopRes.data?.value) taxDisplayShop = dispShopRes.data.value;
      if (dispCartRes.statusCode === 200 && dispCartRes.data?.value) taxDisplayCart = dispCartRes.data.value;
    } catch (_) {
      // Non-admin API keys might not have read access to /settings, fallback safely
    }

    // Check local database for variable product health
    let variableProductCount = 0;
    let totalVariationCount = 0;
    let variableWithNoVars = 0;
    let variableMissingPrices = 0;
    try {
      const db = await getDb();
      const varProds = db.all<any>("SELECT id, min_price, price FROM products WHERE type = 'variable' AND is_deleted_remote = 0");
      variableProductCount = varProds.length;
      const allVars = db.all<any>("SELECT id, product_id, price FROM product_variations WHERE is_deleted_remote = 0");
      totalVariationCount = allVars.length;
      
      const varsByProd = new Map<string, any[]>();
      for (const v of allVars) {
        if (!varsByProd.has(v.product_id)) varsByProd.set(v.product_id, []);
        varsByProd.get(v.product_id)!.push(v);
      }

      for (const vp of varProds) {
        const prodVars = varsByProd.get(vp.id) || [];
        if (prodVars.length === 0) {
          variableWithNoVars++;
        } else if (prodVars.some((v: any) => !v.price || v.price <= 0)) {
          variableMissingPrices++;
        }
      }
    } catch (_) {}

    return {
      success: true,
      storeUrl: effectiveConfig.storeUrl,
      productCount,
      variationsSupported,
      brandTaxonomyFound,
      brandTaxonomyType: brandTaxonomyFound ? brandTaxonomyType : 'Derived from product title / attribute',
      currency,
      taxEnabled,
      pricesIncludeTax,
      taxDisplayShop,
      taxDisplayCart,
      variableProductCount,
      totalVariationCount,
      variableHealth: {
        variableProductCount,
        totalVariationCount,
        variableWithNoVars,
        variableMissingPrices,
        isHealthy: variableWithNoVars === 0 && variableMissingPrices === 0,
      },
      permissionsOk: true,
      details: {
        apiVersion: effectiveConfig.apiVersion,
        testTimestamp: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    return {
      success: false,
      storeUrl: customConfig?.storeUrl || 'https://irepair-mobiles.co.uk',
      productCount: 0,
      variationsSupported: false,
      brandTaxonomyFound: false,
      brandTaxonomyType: 'none',
      currency: 'GBP',
      taxEnabled: false,
      permissionsOk: false,
      error: err.message || 'Connection test failed',
    };
  }
}

// ==========================================
// CUSTOMER SERVICES
// ==========================================

export async function wooGetCustomer(id: number) {
  const res = await requestWoo(`/customers/${id}`);
  if (res.statusCode >= 200 && res.statusCode < 300) {
    return res.data;
  }
  return null;
}

export async function wooGetCustomerByEmail(email: string) {
  const query = new URLSearchParams({ email: email.trim().toLowerCase() }).toString();
  const res = await requestWoo(`/customers?${query}`);
  if (res.statusCode >= 200 && res.statusCode < 300 && Array.isArray(res.data) && res.data.length > 0) {
    return res.data[0];
  }
  return null;
}

export async function wooCreateCustomer(customerData: any) {
  const res = await requestWoo('/customers', 'POST', customerData);
  return res;
}

export async function wooUpdateCustomer(id: number, customerData: any) {
  const res = await requestWoo(`/customers/${id}`, 'PUT', customerData);
  return res;
}

// ==========================================
// ORDER SERVICES
// ==========================================

export async function wooGetCustomerOrders(customerId: number, page: number = 1, perPage: number = 10, status?: string) {
  const params: Record<string, string> = {
    customer: customerId.toString(),
    page: page.toString(),
    per_page: perPage.toString(),
    orderby: 'date',
    order: 'desc',
  };

  if (status && status !== 'all') {
    params.status = status;
  }

  const query = new URLSearchParams(params).toString();
  const res = await requestWoo(`/orders?${query}`);
  const totalOrders = parseInt(res.headers?.['x-wp-total'] || '0', 10);
  const totalPages = parseInt(res.headers?.['x-wp-totalpages'] || '1', 10);

  return {
    orders: Array.isArray(res.data) ? res.data : [],
    totalOrders,
    total: totalOrders,
    totalPages,
    currentPage: page,
  };
}

export async function wooGetOrderById(orderId: number) {
  const res = await requestWoo(`/orders/${orderId}`);
  if (res.statusCode >= 200 && res.statusCode < 300) {
    return res.data;
  }
  return null;
}

export async function wooCreateOrder(orderData: any) {
  const res = await requestWoo('/orders', 'POST', orderData);
  return res;
}

export async function wooUpdateOrder(orderId: number, updateData: any) {
  const res = await requestWoo(`/orders/${orderId}`, 'PUT', updateData);
  return res;
}

export async function wooAddOrderNote(orderId: number, note: string, customerNote: boolean = false) {
  const res = await requestWoo(`/orders/${orderId}/notes`, 'POST', {
    note,
    customer_note: customerNote,
  });
  return res;
}

export async function wooGetOrderNotes(orderId: number) {
  const res = await requestWoo(`/orders/${orderId}/notes`);
  return Array.isArray(res.data) ? res.data : [];
}

// ==========================================
// STORE API & CHECKOUT SERVICES
// ==========================================

export async function wooGetPaymentGateways() {
  const res = await requestWoo('/payment_gateways');
  if (Array.isArray(res.data)) {
    return res.data.filter((gw: any) => gw.enabled);
  }
  return [];
}

export async function wooGetShippingMethods() {
  const res = await requestWoo('/shipping/zones/1/methods');
  if (Array.isArray(res.data) && res.data.length > 0) {
    return res.data.filter((m: any) => m.enabled);
  }
  
  return [
    {
      id: 1,
      instance_id: 1,
      title: 'Royal Mail Tracked 48',
      method_id: 'flat_rate',
      enabled: true,
      settings: { cost: { value: '4.95' } },
    },
    {
      id: 2,
      instance_id: 2,
      title: 'Royal Mail Special Delivery 24',
      method_id: 'flat_rate',
      enabled: true,
      settings: { cost: { value: '7.95' } },
    },
    {
      id: 3,
      instance_id: 3,
      title: 'Free UK Tracked Delivery (Orders over £50)',
      method_id: 'free_shipping',
      enabled: true,
      settings: { min_amount: { value: '50' } },
    },
  ];
}

export async function wooValidateCoupon(code: string) {
  const cleanCode = code.trim().toLowerCase();
  const res = await requestWoo(`/coupons?code=${encodeURIComponent(cleanCode)}`);
  if (Array.isArray(res.data) && res.data.length > 0) {
    const coupon = res.data[0];
    if (coupon.code.toLowerCase() === cleanCode) {
      return coupon;
    }
  }
  return null;
}

export async function wooGetCustomerDownloads(customerId: number) {
  const res = await requestWoo(`/customers/${customerId}/downloads`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function wooGetCustomerPaymentTokens(customerId: number) {
  try {
    const res = await requestWoo(`/customers/${customerId}/payment_tokens`);
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
}

export async function wooDeleteCustomerPaymentToken(customerId: number, tokenId: number) {
  const res = await requestWoo(`/customers/${customerId}/payment_tokens/${tokenId}?force=true`, 'DELETE');
  return res;
}
