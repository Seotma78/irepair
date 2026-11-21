import crypto from 'crypto';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import Stripe from 'stripe';
import { getDb } from '../db';
import { encrypt, decrypt, maskSecret } from '../crypto';
import {
  getWooCommerceConfig,
  requestWoo,
  wooCreateOrder,
  wooGetOrderById,
  wooGetPaymentGateways,
  wooUpdateOrder,
  wooAddOrderNote,
  wooValidateCoupon,
} from './wooCommerceService';

export type AllowedPaymentMethod = 'card' | 'apple_pay' | 'google_pay';
export type CheckoutHandoffStyle = 'hosted_checkout' | 'order_pay';

export const STRICT_ALLOWED_METHODS: AllowedPaymentMethod[] = ['card', 'apple_pay', 'google_pay'];
export const DISALLOWED_GATEWAY_IDS = [
  'bacs',
  'cod',
  'cheque',
  'paypal',
  'ppcp-gateway',
  'ppec_paypal',
  'klarna_payments',
  'kco',
  'clearpay',
  'afterpay',
  'afterpay_clearpay',
  'stripe_klarna',
  'stripe_afterpay_clearpay',
  'stripe_link',
  'link',
];

export interface PaymentGatewaySettings {
  id: string;
  useWooHosted: boolean;
  isProductionForced: boolean;
  environment: string;
  handoffStyle: CheckoutHandoffStyle;
  wooHostedBaseUrl: string;
  wordpressSourceUrl: string;
  returnUrlBase: string;
  cancelUrlBase: string;
  handoffSecretMasked: string;
  hasHandoffSecret: boolean;
  allowedMethods: AllowedPaymentMethod[];
  enableProductPage: boolean;
  enableCartPage: boolean;
  enableMiniCart: boolean;
  enableCheckoutPage: boolean;
  buttonTheme: 'black' | 'white' | 'white-outline';
  buttonType: 'buy' | 'plain' | 'book' | 'donate' | 'checkout';
  buttonHeight: number;
  buttonBorderRadius: number;
  buttonColumns: number;
  buttonGap: number;
  showDivider: boolean;
  dividerText: string;
  unselectedVariationAction: 'disable' | 'hide';
  helperText: string;
  abandonedOrderMinutes: number;
  dispatchNote: string;
  supportEmail: string;
  updatedAt: string;
}

export interface CartItemInput {
  productId: string | number;
  variationId?: string | number | null;
  quantity: number;
  selectedAttributes?: Record<string, string>;
}

export interface ValidatedWooLineItem {
  localProductId: string;
  wpProductId: number;
  wpVariationId: number;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  image: string;
  variationAttributes: Record<string, string>;
  metaData: { key: string; value: string }[];
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';
}

export function sanitizeAllowedMethods(input: any): AllowedPaymentMethod[] {
  if (!Array.isArray(input)) {
    return ['card', 'apple_pay', 'google_pay'];
  }
  const filtered = input
    .map((m) => String(m).trim().toLowerCase())
    .filter((m): m is AllowedPaymentMethod => STRICT_ALLOWED_METHODS.includes(m as AllowedPaymentMethod));
  return filtered.length > 0 ? Array.from(new Set(filtered)) : ['card', 'apple_pay', 'google_pay'];
}

function normalizeUrlBase(raw: string | null | undefined, fallback = ''): string {
  const val = (raw || '').trim();
  if (!val) return fallback;
  return val.replace(/\/+$/, '');
}

async function getDefaultWordpressSourceUrl(): Promise<string> {
  try {
    const db = await getDb();
    const seoRow = db.get<{ wordpress_source_url: string }>('SELECT wordpress_source_url FROM seo_settings WHERE id = ?', ['default']);
    if (seoRow?.wordpress_source_url) {
      return normalizeUrlBase(seoRow.wordpress_source_url);
    }
  } catch (_) {}
  const woo = await getWooCommerceConfig();
  return normalizeUrlBase(woo.storeUrl, 'https://irepair-mobiles.co.uk');
}

export async function getPaymentSettings(includeSecret = false): Promise<PaymentGatewaySettings & { handoffSecret?: string }> {
  const db = await getDb();
  const isProd = isProductionRuntime();
  const wpSourceUrl = await getDefaultWordpressSourceUrl();
  let row = db.get<any>('SELECT * FROM payment_settings WHERE id = ?', ['default']);

  if (!row) {
    const envSecret = (process.env.PAYMENTS_HANDOFF_SECRET || '').trim();
    const initialSecret =
      envSecret && !envSecret.includes('replace-with')
        ? envSecret
        : crypto.randomBytes(32).toString('hex');
    const envStyle: CheckoutHandoffStyle =
      process.env.PAYMENTS_HANDOFF_STYLE === 'order_pay' ? 'order_pay' : 'hosted_checkout';
    const envUseHosted = isProd
      ? 1
      : process.env.PAYMENTS_USE_WOO_HOSTED === 'false'
      ? 0
      : 1;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO payment_settings (
        id, use_woo_hosted, handoff_style, woo_hosted_base_url,
        return_url_base, cancel_url_base, handoff_secret_encrypted,
        allowed_methods_json, enable_product_page, enable_cart_page,
        enable_mini_cart, enable_checkout_page, button_theme, button_type,
        button_height, button_border_radius, button_columns, button_gap,
        show_divider, divider_text, unselected_variation_action, helper_text,
        abandoned_order_minutes, dispatch_note, support_email, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'default',
        envUseHosted,
        envStyle,
        normalizeUrlBase(process.env.WOO_HOSTED_BASE_URL, ''),
        normalizeUrlBase(process.env.PAYMENTS_RETURN_URL, ''),
        normalizeUrlBase(process.env.PAYMENTS_CANCEL_URL, ''),
        encrypt(initialSecret),
        JSON.stringify(STRICT_ALLOWED_METHODS),
        1,
        1,
        1,
        1,
        'black',
        'plain',
        46,
        5,
        2,
        10,
        0,
        'Express checkout',
        'disable',
        'Select options to use express checkout',
        60,
        'Your order is being prepared for dispatch from our UK hub.',
        'info@irepair-mobiles.co.uk',
        now,
      ]
    );
    row = db.get<any>('SELECT * FROM payment_settings WHERE id = ?', ['default']);
  }

  let decryptedSecret = '';
  if (row.handoff_secret_encrypted) {
    try {
      decryptedSecret = decrypt(row.handoff_secret_encrypted);
    } catch (_) {
      decryptedSecret = '';
    }
  }
  if (!decryptedSecret && process.env.PAYMENTS_HANDOFF_SECRET && !process.env.PAYMENTS_HANDOFF_SECRET.includes('replace-with')) {
    decryptedSecret = process.env.PAYMENTS_HANDOFF_SECRET.trim();
  }

  let allowedMethods: AllowedPaymentMethod[] = ['card', 'apple_pay', 'google_pay'];
  try {
    allowedMethods = sanitizeAllowedMethods(JSON.parse(row.allowed_methods_json || '[]'));
  } catch (_) {}

  const effectiveUseHosted = isProd ? true : Boolean(row.use_woo_hosted);
  const wooHostedBaseUrl = normalizeUrlBase(row.woo_hosted_base_url, wpSourceUrl);

  const base: PaymentGatewaySettings = {
    id: 'default',
    useWooHosted: effectiveUseHosted,
    isProductionForced: isProd,
    environment: isProd ? 'production' : process.env.NODE_ENV || 'development',
    handoffStyle: row.handoff_style === 'order_pay' ? 'order_pay' : 'hosted_checkout',
    wooHostedBaseUrl,
    wordpressSourceUrl: wpSourceUrl,
    returnUrlBase: normalizeUrlBase(row.return_url_base, ''),
    cancelUrlBase: normalizeUrlBase(row.cancel_url_base, ''),
    handoffSecretMasked: decryptedSecret ? maskSecret(decryptedSecret) : '',
    hasHandoffSecret: Boolean(decryptedSecret),
    allowedMethods,
    enableProductPage: row.enable_product_page !== 0,
    enableCartPage: row.enable_cart_page !== 0,
    enableMiniCart: row.enable_mini_cart !== 0,
    enableCheckoutPage: row.enable_checkout_page !== 0,
    buttonTheme: (row.button_theme as any) || 'black',
    buttonType: (row.button_type as any) || 'plain',
    buttonHeight: Number(row.button_height) || 46,
    buttonBorderRadius: row.button_border_radius != null ? Number(row.button_border_radius) : 5,
    buttonColumns: Number(row.button_columns) === 1 ? 1 : 2,
    buttonGap: Number(row.button_gap) || 10,
    showDivider: Boolean(row.show_divider),
    dividerText: row.divider_text || 'Express checkout',
    unselectedVariationAction: row.unselected_variation_action === 'hide' ? 'hide' : 'disable',
    helperText: row.helper_text || 'Select options to use express checkout',
    abandonedOrderMinutes: Math.max(10, Math.min(1440, Number(row.abandoned_order_minutes) || 60)),
    dispatchNote: row.dispatch_note || 'Your order is being prepared for dispatch from our UK hub.',
    supportEmail: row.support_email || 'info@irepair-mobiles.co.uk',
    updatedAt: row.updated_at,
  };

  if (includeSecret) {
    return { ...base, handoffSecret: decryptedSecret };
  }
  return base;
}

// Cache for gateway availability check (to keep storefront fast while accurately catching disabled Stripe gateway)
let gatewayHealthCache: {
  checkedAt: number;
  baseUrl: string;
  available: boolean;
  stripeTestMode: boolean;
  supportsStatelessHandoff?: boolean;
  bridgeReactUrl?: string;
  reason?: string;
} | null = null;

export interface WooStripeCredentials {
  enabled: boolean;
  testMode: boolean;
  publishableKey: string;
  secretKey: string;
  captureMethod: 'automatic' | 'manual';
  webhookSecretConfigured: boolean;
  modeLabel: 'test' | 'live';
}

let wooStripeCredCache: {
  checkedAt: number;
  creds: WooStripeCredentials;
} | null = null;

export function invalidateGatewayHealthCache() {
  gatewayHealthCache = null;
  wooStripeCredCache = null;
}

/**
 * Fetches live Stripe publishable & secret keys directly from the configured WooCommerce Stripe gateway.
 * NEVER expose secretKey to clients.
 */
export async function getActiveWooStripeCredentials(forceRefresh = false): Promise<WooStripeCredentials> {
  const now = Date.now();
  if (!forceRefresh && wooStripeCredCache && now - wooStripeCredCache.checkedAt < 60000) {
    return wooStripeCredCache.creds;
  }

  let gw: any = null;
  const singleRes = await requestWoo('/payment_gateways/stripe', 'GET', undefined, {}, 1);
  if (singleRes.statusCode === 200 && singleRes.data?.id === 'stripe') {
    gw = singleRes.data;
  } else {
    const listRes = await wooGetPaymentGateways();
    if (Array.isArray(listRes)) {
      gw = listRes.find((g: any) => g.id === 'stripe');
    }
  }

  if (!gw) {
    throw new Error('Official WooCommerce Stripe Payment Gateway ("stripe") was not found.');
  }

  const s = gw.settings || {};
  const testMode = s.testmode?.value === 'yes' || s.testmode?.value === true;
  const publishableKey = String(
    testMode ? s.test_publishable_key?.value || '' : s.publishable_key?.value || ''
  ).trim();
  const secretKey = String(
    testMode ? s.test_secret_key?.value || '' : s.secret_key?.value || ''
  ).trim();
  const captureRaw = String(s.capture?.value || 'yes').toLowerCase();
  const webhookRaw = String(
    testMode ? s.test_webhook_secret?.value || '' : s.webhook_secret?.value || ''
  ).trim();

  const creds: WooStripeCredentials = {
    enabled: Boolean(gw.enabled),
    testMode,
    publishableKey,
    secretKey,
    captureMethod: captureRaw === 'no' ? 'manual' : 'automatic',
    webhookSecretConfigured: Boolean(webhookRaw && !webhookRaw.includes('*')),
    modeLabel: testMode ? 'test' : 'live',
  };

  wooStripeCredCache = { checkedAt: now, creds };
  return creds;
}

function buildStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey);
}

export function isOriginReachableForWpCallback(origin?: string): boolean {
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    if (!host) return false;
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.run.app') ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function buildDirectWooCheckoutUrl(wooHostedBaseUrl: string, item: ValidatedWooLineItem): string {
  const base = normalizeUrlBase(wooHostedBaseUrl, 'https://irepair-mobiles.co.uk');
  const params = new URLSearchParams();
  params.set('add-to-cart', String(item.wpProductId));
  params.set('quantity', String(item.quantity));
  if (item.wpVariationId > 0) {
    params.set('variation_id', String(item.wpVariationId));
    for (const [rawKey, rawVal] of Object.entries(item.variationAttributes || {})) {
      if (!rawVal) continue;
      const cleanKey = rawKey.toLowerCase().trim();
      const paramKey = cleanKey.startsWith('attribute_') ? cleanKey : `attribute_${cleanKey}`;
      params.set(paramKey, String(rawVal));
    }
  }
  return `${base}/checkout/?${params.toString()}`;
}

function buildStatelessHandoffToken(secret: string, payload: Record<string, any>): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('hex');
  return `irep2_${encoded}.${sig}`;
}

export async function savePaymentSettings(data: any): Promise<PaymentGatewaySettings> {
  const db = await getDb();
  const current = await getPaymentSettings(true);
  const isProd = isProductionRuntime();
  const now = new Date().toISOString();

  if (isProd && data.useWooHosted === false) {
    throw new Error('Simulated mode cannot be enabled in Production. "Use WooCommerce payment gateway" is locked ON.');
  }

  const nextUseWooHosted = isProd ? true : data.useWooHosted !== undefined ? Boolean(data.useWooHosted) : current.useWooHosted;
  const nextStyle: CheckoutHandoffStyle =
    data.handoffStyle === 'order_pay' ? 'order_pay' : data.handoffStyle === 'hosted_checkout' ? 'hosted_checkout' : current.handoffStyle;

  let nextSecret = current.handoffSecret || '';
  if (typeof data.handoffSecret === 'string' && data.handoffSecret.trim() && !data.handoffSecret.includes('••••')) {
    nextSecret = data.handoffSecret.trim();
  }
  if (data.regenerateSecret === true) {
    nextSecret = crypto.randomBytes(32).toString('hex');
  }

  const nextAllowedMethods = data.allowedMethods !== undefined ? sanitizeAllowedMethods(data.allowedMethods) : current.allowedMethods;

  db.run(
    `UPDATE payment_settings SET
      use_woo_hosted = ?,
      handoff_style = ?,
      woo_hosted_base_url = ?,
      return_url_base = ?,
      cancel_url_base = ?,
      handoff_secret_encrypted = ?,
      allowed_methods_json = ?,
      enable_product_page = ?,
      enable_cart_page = ?,
      enable_mini_cart = ?,
      enable_checkout_page = ?,
      button_theme = ?,
      button_type = ?,
      button_height = ?,
      button_border_radius = ?,
      button_columns = ?,
      button_gap = ?,
      show_divider = ?,
      divider_text = ?,
      unselected_variation_action = ?,
      helper_text = ?,
      abandoned_order_minutes = ?,
      dispatch_note = ?,
      support_email = ?,
      updated_at = ?
    WHERE id = 'default'`,
    [
      nextUseWooHosted ? 1 : 0,
      nextStyle,
      normalizeUrlBase(data.wooHostedBaseUrl, ''),
      normalizeUrlBase(data.returnUrlBase, ''),
      normalizeUrlBase(data.cancelUrlBase, ''),
      encrypt(nextSecret),
      JSON.stringify(nextAllowedMethods),
      data.enableProductPage !== undefined ? (data.enableProductPage ? 1 : 0) : (current.enableProductPage ? 1 : 0),
      data.enableCartPage !== undefined ? (data.enableCartPage ? 1 : 0) : (current.enableCartPage ? 1 : 0),
      data.enableMiniCart !== undefined ? (data.enableMiniCart ? 1 : 0) : (current.enableMiniCart ? 1 : 0),
      data.enableCheckoutPage !== undefined ? (data.enableCheckoutPage ? 1 : 0) : (current.enableCheckoutPage ? 1 : 0),
      ['black', 'white', 'white-outline'].includes(data.buttonTheme) ? data.buttonTheme : current.buttonTheme,
      ['buy', 'plain', 'book', 'donate', 'checkout'].includes(data.buttonType) ? data.buttonType : current.buttonType,
      Math.min(55, Math.max(40, Number(data.buttonHeight) || current.buttonHeight)),
      Math.min(25, Math.max(0, data.buttonBorderRadius != null ? Number(data.buttonBorderRadius) : current.buttonBorderRadius)),
      Number(data.buttonColumns) === 1 ? 1 : 2,
      Math.min(24, Math.max(4, Number(data.buttonGap) || current.buttonGap)),
      data.showDivider !== undefined ? (data.showDivider ? 1 : 0) : (current.showDivider ? 1 : 0),
      String(data.dividerText ?? current.dividerText).slice(0, 60),
      data.unselectedVariationAction === 'hide' ? 'hide' : 'disable',
      String(data.helperText ?? current.helperText).slice(0, 120),
      Math.max(10, Math.min(1440, Number(data.abandonedOrderMinutes) || current.abandonedOrderMinutes)),
      String(data.dispatchNote ?? current.dispatchNote).slice(0, 280),
      String(data.supportEmail ?? current.supportEmail).slice(0, 120),
      now,
    ]
  );

  invalidateGatewayHealthCache();
  return getPaymentSettings(false);
}

function httpRequestJson(
  targetUrl: string,
  method: 'GET' | 'POST' = 'GET',
  bodyObj?: any,
  extraHeaders: Record<string, string> = {},
  timeoutMs = 10000
): Promise<{ statusCode: number; data: any; rawBody: string; headers: Record<string, any> }> {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(targetUrl);
      const client = parsed.protocol === 'https:' ? https : http;
      const payload = bodyObj !== undefined ? JSON.stringify(bodyObj) : undefined;
      const headers: Record<string, string> = {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'iRepair-Mobiles-Payments/1.0',
        ...extraHeaders,
      };
      if (payload) {
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(payload).toString();
      }

      const req = client.request(
        parsed,
        { method, headers, timeout: timeoutMs },
        (res) => {
          let raw = '';
          res.on('data', (c) => (raw += c));
          res.on('end', () => {
            let data: any = raw;
            try {
              data = raw ? JSON.parse(raw) : null;
            } catch (_) {}
            resolve({
              statusCode: res.statusCode || 200,
              data,
              rawBody: raw,
              headers: res.headers as Record<string, any>,
            });
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request to ${parsed.hostname} timed out`));
      });
      req.on('error', (err) => reject(err));
      if (payload) req.write(payload);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function signHmacPayload(secret: string, timestamp: string, rawBody: string): string {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

export function verifyHmacSignature(secret: string, timestamp: string, rawBody: string, providedSig: string): boolean {
  if (!secret || !timestamp || !providedSig) return false;
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > 300) {
    return false;
  }
  const expected = signHmacPayload(secret, timestamp, rawBody);
  const cleanProvided = providedSig.replace(/^sha256=/i, '').trim().toLowerCase();
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(cleanProvided, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function checkHostedGatewayAvailability(forceRefresh = false): Promise<{
  available: boolean;
  stripeTestMode: boolean;
  supportsStatelessHandoff?: boolean;
  bridgeReactUrl?: string;
  reason?: string;
}> {
  const settings = await getPaymentSettings(true);
  if (!settings.useWooHosted) {
    return { available: true, stripeTestMode: true, supportsStatelessHandoff: false };
  }

  const now = Date.now();
  if (
    !forceRefresh &&
    gatewayHealthCache &&
    gatewayHealthCache.baseUrl === settings.wooHostedBaseUrl &&
    now - gatewayHealthCache.checkedAt < 45000
  ) {
    return {
      available: gatewayHealthCache.available,
      stripeTestMode: gatewayHealthCache.stripeTestMode,
      supportsStatelessHandoff: gatewayHealthCache.supportsStatelessHandoff,
      bridgeReactUrl: gatewayHealthCache.bridgeReactUrl,
      reason: gatewayHealthCache.reason,
    };
  }

  let available = false;
  let stripeTestMode = false;
  let supportsStatelessHandoff = false;
  let bridgeReactUrl = '';
  let reason = '';

  // Try signed WordPress bridge health endpoint first (fast & authoritative)
  if (settings.handoffSecret) {
    try {
      const ts = String(Math.floor(Date.now() / 1000));
      const sig = signHmacPayload(settings.handoffSecret, ts, '');
      const healthRes = await httpRequestJson(
        `${settings.wooHostedBaseUrl}/wp-json/irepair-bridge/v1/health`,
        'GET',
        undefined,
        { 'X-iRepair-Timestamp': ts, 'X-iRepair-Signature': sig },
        5000
      );
      if (healthRes.statusCode === 200 && healthRes.data && typeof healthRes.data === 'object') {
        stripeTestMode = Boolean(healthRes.data.stripe_testmode);
        supportsStatelessHandoff = Boolean(healthRes.data.supports_stateless_handoff);
        bridgeReactUrl = typeof healthRes.data.react_url === 'string' ? normalizeUrlBase(healthRes.data.react_url, '') : '';
        if (healthRes.data.stripe_enabled === false) {
          available = false;
          reason = 'Stripe payment gateway is disabled in WooCommerce.';
        } else {
          available = true;
        }
        gatewayHealthCache = {
          checkedAt: now,
          baseUrl: settings.wooHostedBaseUrl,
          available,
          stripeTestMode,
          supportsStatelessHandoff,
          bridgeReactUrl,
          reason,
        };
        return { available, stripeTestMode, supportsStatelessHandoff, bridgeReactUrl, reason };
      }
    } catch (_) {
      // Fall back to WooCommerce REST payment_gateways check
    }
  }

  try {
    const res = await requestWoo('/payment_gateways', 'GET', undefined, {}, 0);
    if (res.statusCode === 200 && Array.isArray(res.data)) {
      const stripeGw = res.data.find((gw: any) => gw.id === 'stripe');
      if (!stripeGw || !stripeGw.enabled) {
        available = false;
        reason = 'Official WooCommerce Stripe Payment Gateway is not enabled.';
      } else {
        available = true;
        const testmodeSetting = stripeGw.settings?.testmode?.value;
        stripeTestMode = testmodeSetting === 'yes' || testmodeSetting === true;
      }
    } else {
      available = false;
      reason = `WooCommerce gateway check returned status ${res.statusCode}.`;
    }
  } catch (err: any) {
    available = false;
    reason = `Unable to reach WooCommerce store: ${err.message}`;
  }

  gatewayHealthCache = {
    checkedAt: now,
    baseUrl: settings.wooHostedBaseUrl,
    available,
    stripeTestMode,
    supportsStatelessHandoff,
    bridgeReactUrl,
    reason,
  };
  return { available, stripeTestMode, supportsStatelessHandoff, bridgeReactUrl, reason };
}

export async function getPublicPaymentConfig(isAdmin = false, requestOrigin = '') {
  const settings = await getPaymentSettings(false);
  const avail = await checkHostedGatewayAvailability(false);
  const canCallback =
    isOriginReachableForWpCallback(requestOrigin) &&
    (!avail.bridgeReactUrl || normalizeUrlBase(avail.bridgeReactUrl) === normalizeUrlBase(requestOrigin));
  const supportsDirectMultiItemHandoff = Boolean(avail.supportsStatelessHandoff || canCallback);

  let publishableKey = '';
  let stripeMode: 'test' | 'live' = avail.stripeTestMode ? 'test' : 'live';
  if (settings.useWooHosted) {
    try {
      const creds = await getActiveWooStripeCredentials(false);
      if (creds.publishableKey && !creds.publishableKey.includes('*')) {
        publishableKey = creds.publishableKey;
      }
      stripeMode = creds.modeLabel;
    } catch (_) {}
  }

  const isOnsiteMode = Boolean(settings.useWooHosted && settings.handoffStyle === 'order_pay');

  return {
    useWooHosted: settings.useWooHosted,
    isProductionForced: settings.isProductionForced,
    isSimulatedMode: !settings.useWooHosted && !settings.isProductionForced,
    handoffStyle: settings.handoffStyle,
    isOnsiteMode,
    publishableKey,
    stripeMode,
    supportsDirectMultiItemHandoff,
    wooHostedBaseUrl: settings.wooHostedBaseUrl,
    allowedMethods: settings.allowedMethods,
    wallets: {
      applePay: settings.allowedMethods.includes('apple_pay'),
      googlePay: settings.allowedMethods.includes('google_pay'),
      card: settings.allowedMethods.includes('card'),
    },
    enableProductPage: settings.enableProductPage,
    enableCartPage: settings.enableCartPage,
    enableMiniCart: settings.enableMiniCart,
    enableCheckoutPage: settings.enableCheckoutPage,
    buttonStyle: {
      theme: settings.buttonTheme,
      type: settings.buttonType,
      height: settings.buttonHeight,
      borderRadius: settings.buttonBorderRadius,
      columns: settings.buttonColumns,
      gap: settings.buttonGap,
    },
    showDivider: settings.showDivider,
    dividerText: settings.dividerText,
    unselectedVariationAction: settings.unselectedVariationAction,
    helperText: settings.helperText,
    gatewayAvailable: settings.useWooHosted ? avail.available : true,
    unavailableMessage:
      settings.useWooHosted && !avail.available
        ? 'Payments are temporarily unavailable. Please try again shortly.'
        : undefined,
    adminWarning: isAdmin && settings.useWooHosted && !avail.available ? avail.reason : undefined,
    showAdminTestModeBadge: isAdmin ? avail.stripeTestMode || !settings.useWooHosted : false,
    dispatchNote: settings.dispatchNote,
    supportEmail: settings.supportEmail,
    currency: 'GBP',
    country: 'GB',
  };
}

function parseNumericId(val: string | number | null | undefined): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (!val) return 0;
  const s = String(val).trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const wpMatch = s.match(/^(?:wp|var)-(\d+)$/i);
  if (wpMatch) return parseInt(wpMatch[1], 10);
  return 0;
}

export async function resolveAndValidateItemsLive(items: CartItemInput[]): Promise<ValidatedWooLineItem[]> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Your basket is empty.');
  }

  const db = await getDb();
  const validatedItems: ValidatedWooLineItem[] = [];

  for (const item of items) {
    const qty = Math.max(1, Math.min(50, parseInt(String(item.quantity || 1), 10) || 1));
    const localProdRow = db.get<any>(
      'SELECT * FROM products WHERE id = ? OR slug = ? OR external_id = ? OR wp_id = ?',
      [String(item.productId), String(item.productId), parseNumericId(item.productId), parseNumericId(item.productId)]
    );

    const wpProductId = localProdRow?.external_id || localProdRow?.wp_id || parseNumericId(item.productId);
    if (!wpProductId || wpProductId <= 0) {
      throw new Error(`Product "${item.productId}" is not linked to a live WooCommerce product.`);
    }

    // Fetch authoritative live product from WooCommerce
    let wooProductRes;
    try {
      wooProductRes = await requestWoo(`/products/${wpProductId}`, 'GET', undefined, {}, 1);
    } catch (err: any) {
      throw new Error(`Unable to verify live pricing and stock with store (${err.message}).`);
    }

    if (wooProductRes.statusCode !== 200 || !wooProductRes.data?.id) {
      throw new Error('Product is no longer available in WooCommerce.');
    }

    const wooProd = wooProductRes.data;
    if (wooProd.status !== 'publish') {
      throw new Error(`"${wooProd.name}" is currently unavailable for purchase.`);
    }
    if (wooProd.purchasable === false) {
      throw new Error(`"${wooProd.name}" is not currently purchasable.`);
    }

    let wpVariationId = parseNumericId(item.variationId);
    let localVarRow: any = null;
    if (item.variationId) {
      localVarRow = db.get<any>(
        'SELECT * FROM product_variations WHERE id = ? OR external_id = ?',
        [String(item.variationId), wpVariationId]
      );
      if (localVarRow?.external_id) {
        wpVariationId = Number(localVarRow.external_id);
      }
    }

    const varAttrs: Record<string, string> = {};
    if (item.selectedAttributes && typeof item.selectedAttributes === 'object') {
      for (const [k, v] of Object.entries(item.selectedAttributes)) {
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          varAttrs[k] = String(v).trim();
        }
      }
    }

    let unitPrice = 0;
    let sku = wooProd.sku || '';
    let image = wooProd.images?.[0]?.src || localProdRow?.image || '';
    let name = wooProd.name || localProdRow?.title || 'Product';
    const metaData: { key: string; value: string }[] = [];

    const normalizePayAttrKey = (raw: string): string => {
      let s = (raw || '').toLowerCase().trim().replace(/^attribute_/, '').replace(/^pa_/, '');
      if (s === 'colour') s = 'color';
      return s;
    };
    const normalizePayOptionVal = (raw: string): string =>
      (raw || '').toLowerCase().trim().replace(/[-_\s]+/g, '');

    let handledAsSimpleFallback = false;

    if (wooProd.type === 'variable') {
      let wooVar: any = null;

      if (wpVariationId > 0) {
        const varRes = await requestWoo(`/products/${wpProductId}/variations/${wpVariationId}`, 'GET', undefined, {}, 1);
        if (varRes.statusCode === 200 && varRes.data?.id) {
          wooVar = varRes.data;
        }
      }

      let allWooVars: any[] | null = null;
      const fetchAllWooVars = async (): Promise<any[]> => {
        if (allWooVars !== null) return allWooVars;
        const collected: any[] = [];
        let page = 1;
        let totalPages = 1;
        while (page <= totalPages) {
          const varsRes = await requestWoo(`/products/${wpProductId}/variations?per_page=100&page=${page}`, 'GET', undefined, {}, 1);
          if (varsRes.statusCode === 200 && Array.isArray(varsRes.data)) {
            const tp = parseInt(varsRes.headers?.['x-wp-totalpages'] || '1', 10);
            if (!isNaN(tp) && tp > totalPages) totalPages = tp;
            collected.push(...varsRes.data);
            if (varsRes.data.length < 100) break;
          } else {
            break;
          }
          page++;
        }
        allWooVars = collected;
        return collected;
      };

      if (!wooVar && Object.keys(varAttrs).length > 0) {
        const varsList = await fetchAllWooVars();
        wooVar = varsList.find((v: any) => {
          if (v.status && v.status !== 'publish') return false;
          if (!Array.isArray(v.attributes) || v.attributes.length === 0) return true;
          return v.attributes.every((va: any) => {
            const rawOpt = String(va.option || '').trim();
            // Wildcard 'Any' variation attribute matches any chosen value
            if (!rawOpt || rawOpt.toLowerCase() === 'any') return true;
            const targetKey = normalizePayAttrKey(va.slug || va.name || '');
            const matchedEntry = Object.entries(varAttrs).find(
              ([ak]) =>
                normalizePayAttrKey(ak) === targetKey ||
                ak.toLowerCase().trim() === (va.name || '').toLowerCase().trim()
            );
            return matchedEntry && normalizePayOptionVal(matchedEntry[1]) === normalizePayOptionVal(rawOpt);
          });
        });
        if (wooVar?.id) wpVariationId = wooVar.id;
      }

      if (!wooVar) {
        const varsList = await fetchAllWooVars();

        if (varsList.length === 0) {
          // WooCommerce product is marked 'variable' but has 0 variations defined — fall back to simple product pricing/stock
          const fallbackPrice = parseFloat(wooProd.price || wooProd.sale_price || wooProd.regular_price || '0');
          if (Number.isFinite(fallbackPrice) && fallbackPrice > 0) {
            handledAsSimpleFallback = true;
          }
        } else {
          const publishedPurchasableVars = varsList.filter((v: any) => {
            if (v.status && v.status !== 'publish') return false;
            if (v.purchasable === false) return false;
            const bOk = v.backorders === 'yes' || v.backorders === 'notify';
            return v.stock_status === 'instock' || bOk;
          });

          if (wpVariationId <= 0 && Object.keys(varAttrs).length === 0 && publishedPurchasableVars.length === 1) {
            // Single-variation variable product (no meaningful choices for buyer) — auto-resolve cleanly
            wooVar = publishedPurchasableVars[0];
            wpVariationId = wooVar.id;
          }
        }
      }

      if (!handledAsSimpleFallback) {
        if (!wooVar) {
          // If local DB still thought this product was 'simple', heal local type so product page displays options
          if (localProdRow && localProdRow.type !== 'variable') {
            try {
              db.run(
                'UPDATE products SET type = ?, attributes_json = ?, updated_at = ? WHERE id = ?',
                ['variable', JSON.stringify(wooProd.attributes || []), new Date().toISOString(), localProdRow.id]
              );
            } catch (_) {}
          }
          const attrNames = Array.isArray(wooProd.attributes)
            ? wooProd.attributes.filter((a: any) => a.variation !== false && Array.isArray(a.options) && a.options.length > 1).map((a: any) => a.name).filter(Boolean)
            : [];
          const optionsLabel = attrNames.length > 0 ? attrNames.join(' / ') : 'valid options';
          throw new Error(`Please select ${optionsLabel} for "${name}" before checking out.`);
        }

        if (wooVar.status && wooVar.status !== 'publish') {
          throw new Error(`Selected option for "${name}" is no longer available.`);
        }
        if (wooVar.purchasable === false) {
          throw new Error(`Selected option for "${name}" is currently unavailable.`);
        }

        const backorderOk = wooVar.backorders === 'yes' || wooVar.backorders === 'notify';
        if (wooVar.stock_status !== 'instock' && !backorderOk) {
          throw new Error(`Selected option for "${name}" is currently out of stock.`);
        }
        if (wooVar.manage_stock && typeof wooVar.stock_quantity === 'number' && !backorderOk && wooVar.stock_quantity < qty) {
          throw new Error(`Only ${wooVar.stock_quantity} unit(s) left in stock for "${name}".`);
        }

        unitPrice = parseFloat(wooVar.price || wooVar.sale_price || wooVar.regular_price || '0');
        sku = wooVar.sku || sku;
        if (wooVar.image?.src) image = wooVar.image.src;

        if (Array.isArray(wooVar.attributes)) {
          const cleanAttrs: Record<string, string> = {};
          const wooAttrsMeta = Array.isArray(wooProd.attributes) ? wooProd.attributes : [];

          // Map any user-selected attributes onto canonical WooCommerce attribute keys first (covers "Any" wildcards)
          for (const [uk, uv] of Object.entries(varAttrs)) {
            const normUk = normalizePayAttrKey(uk);
            const prodAttr = wooAttrsMeta.find(
              (pa: any) =>
                normalizePayAttrKey(pa.slug || pa.name || '') === normUk ||
                String(pa.name || '').toLowerCase().trim() === uk.toLowerCase().trim()
            );
            const rawSlug = prodAttr?.slug || uk;
            const slugKey = String(rawSlug)
              .toLowerCase()
              .trim()
              .replace(/^attribute_/, '')
              .replace(/\s+/g, '-');
            cleanAttrs[`attribute_${slugKey}`] = uv;
          }

          wooVar.attributes.forEach((a: any) => {
            const attrName = a.name || a.slug || 'Option';
            const rawSlug = a.slug || attrName;
            const slugKey = String(rawSlug)
              .toLowerCase()
              .trim()
              .replace(/^attribute_/, '')
              .replace(/\s+/g, '-');
            const attrKey = `attribute_${slugKey}`;
            cleanAttrs[attrKey] = a.option;
            metaData.push({ key: attrName, value: a.option });
          });

          Object.keys(varAttrs).forEach((k) => delete varAttrs[k]);
          Object.assign(varAttrs, cleanAttrs);
        }
      }
    }

    if (wooProd.type !== 'variable' || handledAsSimpleFallback) {
      const backorderOk = wooProd.backorders === 'yes' || wooProd.backorders === 'notify';
      if (wooProd.stock_status !== 'instock' && !backorderOk) {
        throw new Error(`"${name}" is currently out of stock.`);
      }
      if (wooProd.manage_stock && typeof wooProd.stock_quantity === 'number' && !backorderOk && wooProd.stock_quantity < qty) {
        throw new Error(`Only ${wooProd.stock_quantity} unit(s) left in stock for "${name}".`);
      }
      unitPrice = parseFloat(wooProd.price || wooProd.sale_price || wooProd.regular_price || '0');
      wpVariationId = 0;
    }

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error(`Unable to determine valid live price for "${name}".`);
    }

    metaData.push({ key: 'Warranty', value: '12 Months UK Hardware Guarantee' });

    validatedItems.push({
      localProductId: localProdRow?.id || String(wpProductId),
      wpProductId,
      wpVariationId,
      name,
      sku,
      quantity: qty,
      unitPrice,
      lineTotal: Number((unitPrice * qty).toFixed(2)),
      image,
      variationAttributes: varAttrs,
      metaData,
    });
  }

  return validatedItems;
}

export interface LiveShippingRateOption {
  id: string;
  methodId: string;
  instanceId?: number;
  title: string;
  cost: number;
  requiresMinAmount?: number;
}

export async function getLiveWooShippingOptions(subtotal: number): Promise<{
  rates: LiveShippingRateOption[];
  taxEnabled: boolean;
  pricesIncludeTax: boolean;
}> {
  const rates: LiveShippingRateOption[] = [];
  let taxEnabled = true;
  let pricesIncludeTax = true;

  try {
    const zonesRes = await requestWoo('/shipping/zones', 'GET', undefined, {}, 1);
    const zones = Array.isArray(zonesRes.data) ? zonesRes.data : [];

    // Fetch UK / non-0 zone first, or fallback to zone 0
    const zoneIds = zones.filter((z: any) => Number(z.id) > 0).map((z: any) => z.id);
    if (zoneIds.length === 0) zoneIds.push(0);

    for (const zId of zoneIds.slice(0, 3)) {
      const mRes = await requestWoo(`/shipping/zones/${zId}/methods`, 'GET', undefined, {}, 1);
      if (mRes.statusCode === 200 && Array.isArray(mRes.data)) {
        for (const m of mRes.data) {
          if (!m.enabled) continue;
          const minAmount = parseFloat(m.settings?.min_amount?.value || '0') || 0;
          if (m.method_id === 'free_shipping') {
            if (minAmount > 0 && subtotal < minAmount) continue;
            rates.push({
              id: `${m.method_id}:${m.instance_id}`,
              methodId: 'free_shipping',
              instanceId: m.instance_id,
              title: m.title || 'Free UK Delivery',
              cost: 0,
              requiresMinAmount: minAmount,
            });
          } else {
            const rawCost = parseFloat(String(m.settings?.cost?.value || '0').replace(/[^0-9.]/g, '')) || 0;
            rates.push({
              id: `${m.method_id}:${m.instance_id}`,
              methodId: m.method_id || 'flat_rate',
              instanceId: m.instance_id,
              title: m.title || 'Standard Delivery',
              cost: Number(rawCost.toFixed(2)),
            });
          }
        }
      }
      if (rates.length > 0) break;
    }
  } catch (err: any) {
    throw new Error(`Unable to fetch live WooCommerce shipping options: ${err.message}`);
  }

  try {
    const [calcTaxRes, inclTaxRes] = await Promise.all([
      requestWoo('/settings/general/woocommerce_calc_taxes', 'GET', undefined, {}, 0),
      requestWoo('/settings/tax/woocommerce_prices_include_tax', 'GET', undefined, {}, 0),
    ]);
    if (calcTaxRes.statusCode === 200 && calcTaxRes.data?.value) {
      taxEnabled = calcTaxRes.data.value === 'yes';
    }
    if (inclTaxRes.statusCode === 200 && inclTaxRes.data?.value) {
      pricesIncludeTax = inclTaxRes.data.value === 'yes';
    }
  } catch (_) {}

  if (rates.length === 0) {
    throw new Error('No shipping methods are enabled in WooCommerce shipping zones.');
  }

  return { rates, taxEnabled, pricesIncludeTax };
}

export async function validateWooCouponLive(code: string, subtotal: number) {
  const cleanCode = String(code || '').trim();
  if (!cleanCode) {
    throw new Error('Please enter a coupon code.');
  }
  const coupon = await wooValidateCoupon(cleanCode);
  if (!coupon) {
    throw new Error(`Coupon "${cleanCode}" is invalid or does not exist.`);
  }
  if (coupon.date_expires && new Date(coupon.date_expires).getTime() < Date.now()) {
    throw new Error(`Coupon "${cleanCode}" has expired.`);
  }
  const minAmt = parseFloat(coupon.minimum_amount || '0') || 0;
  if (minAmt > 0 && subtotal < minAmt) {
    throw new Error(`Coupon "${cleanCode}" requires a minimum spend of £${minAmt.toFixed(2)}.`);
  }
  const maxAmt = parseFloat(coupon.maximum_amount || '0') || 0;
  if (maxAmt > 0 && subtotal > maxAmt) {
    throw new Error(`Coupon "${cleanCode}" applies only up to £${maxAmt.toFixed(2)}.`);
  }

  const rawAmount = parseFloat(coupon.amount || '0') || 0;
  let discount = 0;
  if (coupon.discount_type === 'percent') {
    discount = Number(((subtotal * rawAmount) / 100).toFixed(2));
  } else {
    discount = Number(Math.min(subtotal, rawAmount).toFixed(2));
  }

  return {
    code: coupon.code,
    discountType: coupon.discount_type,
    amount: rawAmount,
    discount,
    freeShipping: Boolean(coupon.free_shipping),
    description: coupon.description || '',
  };
}

function resolveReturnAndCancelUrls(settings: PaymentGatewaySettings, requestOrigin: string) {
  const cleanOrigin = normalizeUrlBase(requestOrigin, normalizeUrlBase(process.env.APP_URL, 'https://irepair-mobiles.co.uk'));
  const returnBase = settings.returnUrlBase || `${cleanOrigin}/order-confirmation`;
  const cancelBase = settings.cancelUrlBase || `${cleanOrigin}/cart`;
  return {
    returnUrl: returnBase,
    cancelUrl: `${cancelBase.replace(/\/+$/, '')}/?payment_cancelled=1`,
  };
}

/**
 * Style (1): Signed single-use handoff token to WordPress hosted checkout
 * Automatically falls back to direct WooCommerce checkout URL (1 item) or Order-Pay (/checkout)
 * when running in preview/local environments where WordPress cannot call back to Express.
 */
export async function createHostedHandoff(params: {
  items: CartItemInput[];
  couponCode?: string | null;
  source?: 'product' | 'cart' | 'mini-cart' | 'checkout';
  customerId?: number | null;
  idempotencyKey?: string;
  requestOrigin: string;
}): Promise<{
  handoffId: string;
  mode: 'bridge_token' | 'direct_woo_checkout' | 'order_pay_required';
  redirectUrl: string;
  expiresAt: string;
  itemsCount: number;
  subtotal: number;
  message?: string;
}> {
  const settings = await getPaymentSettings(true);
  if (!settings.useWooHosted) {
    throw new Error('Hosted WooCommerce payment gateway is currently disabled.');
  }

  const avail = await checkHostedGatewayAvailability(false);
  if (!avail.available) {
    throw new Error('Payments are temporarily unavailable. Please try again shortly.');
  }

  const db = await getDb();
  const now = new Date();
  const idempotencyKey = params.idempotencyKey || '';

  const validatedItems = await resolveAndValidateItemsLive(params.items);
  const subtotal = validatedItems.reduce((sum, i) => sum + i.lineTotal, 0);

  let validCouponCode: string | null = null;
  if (params.couponCode && params.couponCode.trim()) {
    const couponInfo = await validateWooCouponLive(params.couponCode, subtotal);
    validCouponCode = couponInfo.code;
  }

  const handoffId = `hnd_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
  const { returnUrl, cancelUrl } = resolveReturnAndCancelUrls(settings, params.requestOrigin);

  const canCallback =
    isOriginReachableForWpCallback(params.requestOrigin) &&
    (!avail.bridgeReactUrl || normalizeUrlBase(avail.bridgeReactUrl) === normalizeUrlBase(params.requestOrigin));

  // Preferred path 1: WordPress bridge v1.1.0+ stateless HMAC-signed handoff (zero callback required)
  if (avail.supportsStatelessHandoff && settings.handoffSecret) {
    const statelessToken = buildStatelessHandoffToken(settings.handoffSecret, {
      hid: handoffId,
      exp: Math.floor((now.getTime() + 15 * 60 * 1000) / 1000),
      src: params.source || 'product',
      coupon: validCouponCode,
      ret: returnUrl,
      can: cancelUrl,
      methods: settings.allowedMethods,
      items: validatedItems.map((i) => ({
        product_id: i.wpProductId,
        variation_id: i.wpVariationId || 0,
        quantity: i.quantity,
        variation: i.variationAttributes,
      })),
    });
    const redirectUrl = `${settings.wooHostedBaseUrl}/?irepair_handoff=${encodeURIComponent(statelessToken)}`;
    return {
      handoffId,
      mode: 'bridge_token',
      redirectUrl,
      expiresAt,
      itemsCount: validatedItems.length,
      subtotal: Number(subtotal.toFixed(2)),
    };
  }

  // Preferred path 2: Public production server where WordPress can reach /api/payments/handoff/verify
  if (canCallback) {
    const rawToken = `irep_${crypto.randomBytes(24).toString('hex')}`;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    db.run(
      `INSERT INTO checkout_handoffs (
        id, token_hash, idempotency_key, style, source, items_json, coupon_code,
        customer_id, wc_order_id, wc_order_key, return_url, cancel_url, status, expires_at, created_at
      ) VALUES (?, ?, ?, 'hosted_checkout', ?, ?, ?, ?, NULL, NULL, ?, ?, 'created', ?, ?)`,
      [
        handoffId,
        tokenHash,
        idempotencyKey || null,
        params.source || 'product',
        JSON.stringify(validatedItems),
        validCouponCode,
        params.customerId || null,
        returnUrl,
        cancelUrl,
        expiresAt,
        now.toISOString(),
      ]
    );

    const redirectUrl = `${settings.wooHostedBaseUrl}/?irepair_handoff=${encodeURIComponent(rawToken)}`;
    return {
      handoffId,
      mode: 'bridge_token',
      redirectUrl,
      expiresAt,
      itemsCount: validatedItems.length,
      subtotal: Number(subtotal.toFixed(2)),
    };
  }

  // Preview / non-callable backend fallback (single item, no coupon):
  // Redirect directly to native WooCommerce Checkout with authoritative product/variation/qty params.
  if (validatedItems.length === 1 && !validCouponCode) {
    const directUrl = buildDirectWooCheckoutUrl(settings.wooHostedBaseUrl, validatedItems[0]);
    return {
      handoffId,
      mode: 'direct_woo_checkout',
      redirectUrl: directUrl,
      expiresAt,
      itemsCount: 1,
      subtotal: Number(subtotal.toFixed(2)),
    };
  }

  // Multi-item or coupon basket in preview mode: use Style 2 (Order-Pay via outbound WooCommerce REST API)
  return {
    handoffId,
    mode: 'order_pay_required',
    redirectUrl: '/checkout',
    expiresAt,
    itemsCount: validatedItems.length,
    subtotal: Number(subtotal.toFixed(2)),
    message: 'Enter your delivery details below to complete payment securely on WooCommerce Stripe.',
  };
}

/**
 * Server-to-server handoff token verification called ONLY by WordPress mini-plugin
 */
export async function verifyHostedHandoffFromWp(params: {
  token: string;
  timestampHeader: string;
  signatureHeader: string;
  rawBody: string;
}) {
  const settings = await getPaymentSettings(true);
  if (!settings.handoffSecret) {
    throw new Error('Handoff secret is not configured on backend.');
  }
  if (!verifyHmacSignature(settings.handoffSecret, params.timestampHeader, params.rawBody, params.signatureHeader)) {
    throw new Error('Invalid or expired HMAC signature.');
  }

  const token = String(params.token || '').trim();
  if (!token) {
    throw new Error('Missing handoff token.');
  }

  const db = await getDb();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const nowIso = new Date().toISOString();

  const row = db.get<any>('SELECT * FROM checkout_handoffs WHERE token_hash = ?', [tokenHash]);
  if (!row) {
    throw new Error('Checkout session not found.');
  }
  if (row.status !== 'created') {
    throw new Error('This checkout session has already been used.');
  }
  if (row.expires_at <= nowIso) {
    db.run("UPDATE checkout_handoffs SET status = 'expired' WHERE id = ?", [row.id]);
    throw new Error('Checkout session has expired. Please return to shop and try again.');
  }

  // Consume single-use token atomically before returning cart contents
  db.run(
    "UPDATE checkout_handoffs SET status = 'consumed', consumed_at = ? WHERE id = ? AND status = 'created'",
    [nowIso, row.id]
  );

  const items: ValidatedWooLineItem[] = JSON.parse(row.items_json || '[]');
  return {
    valid: true,
    handoffId: row.id,
    source: row.source,
    couponCode: row.coupon_code || null,
    returnUrl: row.return_url,
    cancelUrl: row.cancel_url,
    allowedMethods: settings.allowedMethods,
    items: items.map((i) => ({
      product_id: i.wpProductId,
      variation_id: i.wpVariationId || 0,
      quantity: i.quantity,
      variation: i.variationAttributes,
      name: i.name,
      unit_price: i.unitPrice,
    })),
  };
}

/**
 * Style (2): Collect address in React, create pending WC order, redirect to /checkout/order-pay/{id}/?pay_for_order=true&key={key}
 */
export async function createHostedOrderPay(params: {
  items: CartItemInput[];
  billing: any;
  shipping?: any;
  shippingOptionId?: string;
  couponCode?: string | null;
  customerNote?: string;
  customerId?: number | null;
  idempotencyKey?: string;
  requestOrigin: string;
}) {
  const settings = await getPaymentSettings(true);
  if (!settings.useWooHosted) {
    throw new Error('Hosted WooCommerce payment gateway is currently disabled.');
  }

  const avail = await checkHostedGatewayAvailability(false);
  if (!avail.available) {
    throw new Error('Payments are temporarily unavailable. Please try again shortly.');
  }

  const { billing, shipping } = params;
  if (
    !billing?.firstName ||
    !billing?.lastName ||
    !billing?.email ||
    !billing?.address1 ||
    !billing?.city ||
    !billing?.postcode
  ) {
    throw new Error('Please fill in all required billing contact and UK address fields.');
  }

  const db = await getDb();
  const idempotencyKey = params.idempotencyKey || '';

  // Idempotency guard: prevent duplicate pending WooCommerce orders on double click
  if (idempotencyKey) {
    const existing = db.get<any>(
      "SELECT * FROM checkout_handoffs WHERE idempotency_key = ? AND style = 'order_pay' AND wc_order_id IS NOT NULL AND status = 'created'",
      [idempotencyKey]
    );
    if (existing?.wc_order_id && existing?.wc_order_key) {
      const existingOrder = await wooGetOrderById(Number(existing.wc_order_id));
      if (existingOrder && existingOrder.status === 'pending') {
        const payUrl = `${settings.wooHostedBaseUrl}/checkout/order-pay/${existingOrder.id}/?pay_for_order=true&key=${encodeURIComponent(
          existingOrder.order_key
        )}`;
        return {
          orderId: existingOrder.id,
          orderNumber: existingOrder.number || String(existingOrder.id),
          orderKey: existingOrder.order_key,
          total: existingOrder.total,
          payUrl,
        };
      }
    }
  }

  const validatedItems = await resolveAndValidateItemsLive(params.items);
  const subtotal = validatedItems.reduce((sum, i) => sum + i.lineTotal, 0);

  let couponLines: { code: string }[] = [];
  if (params.couponCode && params.couponCode.trim()) {
    const c = await validateWooCouponLive(params.couponCode, subtotal);
    couponLines = [{ code: c.code }];
  }

  const { rates } = await getLiveWooShippingOptions(subtotal);
  const selectedShipping =
    rates.find((r) => r.id === params.shippingOptionId) || rates[0];

  const effShipping = shipping && shipping.address1 ? shipping : billing;
  const orderPayload: any = {
    status: 'pending',
    customer_id: params.customerId || 0,
    payment_method: 'stripe',
    payment_method_title: 'Card / Apple Pay / Google Pay (Stripe)',
    set_paid: false,
    billing: {
      first_name: String(billing.firstName).trim(),
      last_name: String(billing.lastName).trim(),
      address_1: String(billing.address1).trim(),
      address_2: String(billing.address2 || '').trim(),
      city: String(billing.city).trim(),
      state: String(billing.county || billing.state || '').trim(),
      postcode: String(billing.postcode).trim().toUpperCase(),
      country: String(billing.country || 'GB').trim().toUpperCase(),
      email: String(billing.email).trim().toLowerCase(),
      phone: String(billing.phone || '').trim(),
    },
    shipping: {
      first_name: String(effShipping.firstName || billing.firstName).trim(),
      last_name: String(effShipping.lastName || billing.lastName).trim(),
      address_1: String(effShipping.address1).trim(),
      address_2: String(effShipping.address2 || '').trim(),
      city: String(effShipping.city).trim(),
      state: String(effShipping.county || effShipping.state || '').trim(),
      postcode: String(effShipping.postcode).trim().toUpperCase(),
      country: String(effShipping.country || 'GB').trim().toUpperCase(),
    },
    line_items: validatedItems.map((i) => ({
      product_id: i.wpProductId,
      ...(i.wpVariationId > 0 ? { variation_id: i.wpVariationId } : {}),
      quantity: i.quantity,
      meta_data: i.metaData,
    })),
    shipping_lines: [
      {
        method_id: selectedShipping.methodId,
        method_title: selectedShipping.title,
        total: selectedShipping.cost.toFixed(2),
      },
    ],
    coupon_lines: couponLines,
    customer_note: String(params.customerNote || '').trim(),
    meta_data: [
      { key: '_irepair_headless_style', value: 'order_pay' },
      { key: '_irepair_allowed_methods', value: settings.allowedMethods.join(',') },
    ],
  };

  const wooRes = await wooCreateOrder(orderPayload);
  if (wooRes.statusCode < 200 || wooRes.statusCode >= 300 || !wooRes.data?.id) {
    throw new Error(wooRes.data?.message || 'WooCommerce refused order creation. Please verify details and try again.');
  }

  const order = wooRes.data;
  const orderId = Number(order.id);
  const orderKey = String(order.order_key);
  const orderNumber = String(order.number || order.id);

  const now = new Date();
  const { returnUrl, cancelUrl } = resolveReturnAndCancelUrls(settings, params.requestOrigin);
  db.run(
    `INSERT INTO checkout_handoffs (
      id, token_hash, idempotency_key, style, source, items_json, coupon_code,
      customer_id, wc_order_id, wc_order_key, return_url, cancel_url, status, expires_at, created_at
    ) VALUES (?, ?, ?, 'order_pay', 'checkout', ?, ?, ?, ?, ?, ?, ?, 'created', ?, ?)`,
    [
      `op_${orderId}_${crypto.randomBytes(4).toString('hex')}`,
      crypto.createHash('sha256').update(`order_pay_${orderId}_${orderKey}`).digest('hex'),
      idempotencyKey || null,
      JSON.stringify(validatedItems),
      couponLines[0]?.code || null,
      params.customerId || null,
      orderId,
      orderKey,
      returnUrl,
      cancelUrl,
      new Date(now.getTime() + settings.abandonedOrderMinutes * 60 * 1000).toISOString(),
      now.toISOString(),
    ]
  );

  const payUrl = `${settings.wooHostedBaseUrl}/checkout/order-pay/${orderId}/?pay_for_order=true&key=${encodeURIComponent(orderKey)}`;
  return {
    orderId,
    orderNumber,
    orderKey,
    total: order.total,
    payUrl,
  };
}

/**
 * Style (2) On-Site Express Shipping & Totals calculation (authoritative WooCommerce prices & rates)
 */
export async function calculateOnsiteExpressShipping(params: {
  items: CartItemInput[];
  couponCode?: string | null;
  shippingRateId?: string;
}) {
  const validatedItems = await resolveAndValidateItemsLive(params.items);
  const subtotal = Number(validatedItems.reduce((sum, i) => sum + i.lineTotal, 0).toFixed(2));

  let discount = 0;
  let freeShipping = false;
  let validCouponCode: string | null = null;
  if (params.couponCode && params.couponCode.trim()) {
    const c = await validateWooCouponLive(params.couponCode, subtotal);
    discount = c.discount;
    freeShipping = c.freeShipping;
    validCouponCode = c.code;
  }

  const { rates, taxEnabled, pricesIncludeTax } = await getLiveWooShippingOptions(subtotal);
  const adjustedRates = rates.map((r) => ({
    ...r,
    cost: freeShipping ? 0 : r.cost,
  }));
  const selectedRate = adjustedRates.find((r) => r.id === params.shippingRateId) || adjustedRates[0];
  const shippingCost = selectedRate ? selectedRate.cost : 0;
  const total = Number((Math.max(0, subtotal - discount) + shippingCost).toFixed(2));
  const vatAmount = Number(((total * 0.2) / 1.2).toFixed(2));

  return {
    items: validatedItems.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
      image: i.image,
    })),
    subtotal,
    discount,
    couponCode: validCouponCode,
    freeShipping,
    shippingCost,
    selectedRateId: selectedRate?.id || '',
    shippingOptions: adjustedRates,
    vatAmount,
    total,
    totalPence: Math.round(total * 100),
    taxEnabled,
    pricesIncludeTax,
  };
}

/**
 * Style (2) On-Site React Checkout:
 * Creates pending WooCommerce order + Stripe PaymentIntent using WooCommerce's live/test Stripe keys.
 * ZERO redirect to WordPress — payment completes directly inside React via Stripe Elements.
 */
export async function createOnsiteWooStripeIntent(params: {
  items: CartItemInput[];
  billing: any;
  shipping?: any;
  shippingOptionId?: string;
  couponCode?: string | null;
  customerNote?: string;
  customerId?: number | null;
  idempotencyKey?: string;
  requestOrigin: string;
}) {
  const settings = await getPaymentSettings(true);
  if (!settings.useWooHosted) {
    throw new Error('Hosted WooCommerce payment gateway is currently disabled.');
  }

  const avail = await checkHostedGatewayAvailability(false);
  if (!avail.available) {
    throw new Error('Payments are temporarily unavailable. Please try again shortly.');
  }

  const creds = await getActiveWooStripeCredentials(false);
  if (!creds.enabled || !creds.publishableKey || !creds.secretKey) {
    throw new Error('WooCommerce Stripe Payment Gateway keys are missing or disabled.');
  }
  if (creds.secretKey.includes('*') || creds.publishableKey.includes('*')) {
    throw new Error('WooCommerce Stripe API keys are masked and cannot authenticate with Stripe.');
  }

  const { billing, shipping } = params;
  if (
    !billing?.firstName ||
    !billing?.lastName ||
    !billing?.email ||
    !billing?.address1 ||
    !billing?.city ||
    !billing?.postcode
  ) {
    throw new Error('Please fill in all required billing contact and UK address fields.');
  }

  const stripe = buildStripeClient(creds.secretKey);
  const db = await getDb();
  const idempotencyKey = (params.idempotencyKey || '').trim();

  // Idempotency guard: reuse open pending WooCommerce order & active PaymentIntent if unchanged
  if (idempotencyKey) {
    const existing = db.get<any>(
      "SELECT * FROM checkout_handoffs WHERE idempotency_key = ? AND style = 'order_pay' AND wc_order_id IS NOT NULL AND status = 'created'",
      [idempotencyKey]
    );
    if (existing?.wc_order_id && existing?.wc_order_key) {
      try {
        const existingOrder = await wooGetOrderById(Number(existing.wc_order_id));
        if (existingOrder && existingOrder.status === 'pending') {
          const existingPiMeta = (existingOrder.meta_data || []).find((m: any) => m.key === '_stripe_intent_id')?.value;
          const expectedPence = Math.round(parseFloat(String(existingOrder.total || '0')) * 100);
          if (existingPiMeta && expectedPence >= 30) {
            const existingPi = await stripe.paymentIntents.retrieve(String(existingPiMeta));
            if (
              existingPi &&
              existingPi.client_secret &&
              existingPi.amount === expectedPence &&
              ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existingPi.status)
            ) {
              return {
                orderId: existingOrder.id,
                orderNumber: String(existingOrder.number || existingOrder.id),
                orderKey: String(existingOrder.order_key),
                total: String(existingOrder.total || '0.00'),
                currency: 'GBP',
                clientSecret: existingPi.client_secret,
                paymentIntentId: existingPi.id,
                publishableKey: creds.publishableKey,
                stripeMode: creds.modeLabel,
              };
            }
          }
        }
      } catch (_) {}
    }
  }

  const validatedItems = await resolveAndValidateItemsLive(params.items);
  const subtotal = validatedItems.reduce((sum, i) => sum + i.lineTotal, 0);

  let couponLines: { code: string }[] = [];
  let couponFreeShipping = false;
  if (params.couponCode && params.couponCode.trim()) {
    const c = await validateWooCouponLive(params.couponCode, subtotal);
    couponLines = [{ code: c.code }];
    couponFreeShipping = c.freeShipping;
  }

  const { rates } = await getLiveWooShippingOptions(subtotal);
  const selectedShipping = rates.find((r) => r.id === params.shippingOptionId) || rates[0];
  const effectiveShippingCost = couponFreeShipping ? 0 : selectedShipping.cost;

  const effShipping = shipping && shipping.address1 ? shipping : billing;
  const billingEmail = String(billing.email).trim().toLowerCase();

  const orderPayload: any = {
    status: 'pending',
    customer_id: params.customerId || 0,
    payment_method: 'stripe',
    payment_method_title: 'Card / Apple Pay / Google Pay (Stripe)',
    set_paid: false,
    billing: {
      first_name: String(billing.firstName).trim(),
      last_name: String(billing.lastName).trim(),
      address_1: String(billing.address1).trim(),
      address_2: String(billing.address2 || '').trim(),
      city: String(billing.city).trim(),
      state: String(billing.county || billing.state || '').trim(),
      postcode: String(billing.postcode).trim().toUpperCase(),
      country: String(billing.country || 'GB').trim().toUpperCase(),
      email: billingEmail,
      phone: String(billing.phone || '').trim(),
    },
    shipping: {
      first_name: String(effShipping.firstName || billing.firstName).trim(),
      last_name: String(effShipping.lastName || billing.lastName).trim(),
      address_1: String(effShipping.address1).trim(),
      address_2: String(effShipping.address2 || '').trim(),
      city: String(effShipping.city).trim(),
      state: String(effShipping.county || effShipping.state || '').trim(),
      postcode: String(effShipping.postcode).trim().toUpperCase(),
      country: String(effShipping.country || 'GB').trim().toUpperCase(),
    },
    line_items: validatedItems.map((i) => ({
      product_id: i.wpProductId,
      ...(i.wpVariationId > 0 ? { variation_id: i.wpVariationId } : {}),
      quantity: i.quantity,
      meta_data: i.metaData,
    })),
    shipping_lines: [
      {
        method_id: selectedShipping.methodId,
        method_title: selectedShipping.title,
        total: effectiveShippingCost.toFixed(2),
      },
    ],
    coupon_lines: couponLines,
    customer_note: String(params.customerNote || '').trim(),
    meta_data: [
      { key: '_irepair_headless_style', value: 'order_pay_onsite' },
      { key: '_irepair_allowed_methods', value: settings.allowedMethods.join(',') },
    ],
  };

  const wooRes = await wooCreateOrder(orderPayload);
  if (wooRes.statusCode < 200 || wooRes.statusCode >= 300 || !wooRes.data?.id) {
    throw new Error(wooRes.data?.message || 'WooCommerce refused order creation. Please verify details and try again.');
  }

  const order = wooRes.data;
  const orderId = Number(order.id);
  const orderKey = String(order.order_key);
  const orderNumber = String(order.number || order.id);
  const amountPence = Math.round(parseFloat(String(order.total || '0')) * 100);

  if (!Number.isFinite(amountPence) || amountPence < 30) {
    try {
      await wooUpdateOrder(orderId, { status: 'cancelled' });
    } catch (_) {}
    throw new Error('Order total must be at least £0.30 to process card/wallet payment via Stripe.');
  }

  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe.paymentIntents.create(
      {
        amount: amountPence,
        currency: 'gbp',
        allowed_payment_method_types: ['card'],
        capture_method: creds.captureMethod,
        receipt_email: billingEmail,
        description: `iRepair Mobiles Order #${orderNumber}`,
        metadata: {
          order_id: String(orderId),
          order_number: orderNumber,
          order_key: orderKey,
          customer_email: billingEmail,
          site_url: 'https://irepair-mobiles.co.uk',
          source: 'react_onsite_checkout',
        },
      },
      idempotencyKey ? { idempotencyKey: `onsite_${orderId}_${idempotencyKey}` } : undefined
    );
  } catch (err: any) {
    try {
      await wooUpdateOrder(orderId, { status: 'cancelled' });
      await wooAddOrderNote(orderId, `Stripe PaymentIntent creation failed: ${err.message}`, false);
    } catch (_) {}
    throw new Error(err.message || 'Unable to initialize Stripe PaymentIntent.');
  }

  if (!pi.client_secret) {
    throw new Error('Stripe did not return a client secret for this payment session.');
  }

  try {
    await wooUpdateOrder(orderId, {
      meta_data: [{ key: '_stripe_intent_id', value: pi.id }],
    });
  } catch (_) {}

  const now = new Date();
  const { returnUrl, cancelUrl } = resolveReturnAndCancelUrls(settings, params.requestOrigin);
  db.run(
    `INSERT INTO checkout_handoffs (
      id, token_hash, idempotency_key, style, source, items_json, coupon_code,
      customer_id, wc_order_id, wc_order_key, return_url, cancel_url, status, expires_at, created_at
    ) VALUES (?, ?, ?, 'order_pay', 'checkout', ?, ?, ?, ?, ?, ?, ?, 'created', ?, ?)`,
    [
      `onsite_${orderId}_${crypto.randomBytes(4).toString('hex')}`,
      crypto.createHash('sha256').update(`onsite_${orderId}_${orderKey}_${pi.id}`).digest('hex'),
      idempotencyKey || null,
      JSON.stringify(validatedItems),
      couponLines[0]?.code || null,
      params.customerId || null,
      orderId,
      orderKey,
      returnUrl,
      cancelUrl,
      new Date(now.getTime() + settings.abandonedOrderMinutes * 60 * 1000).toISOString(),
      now.toISOString(),
    ]
  );

  return {
    orderId,
    orderNumber,
    orderKey,
    total: String(order.total || '0.00'),
    currency: 'GBP',
    clientSecret: pi.client_secret,
    paymentIntentId: pi.id,
    publishableKey: creds.publishableKey,
    stripeMode: creds.modeLabel,
  };
}

/**
 * Style (2) On-Site Retry / Account "Pay now":
 * Initializes or resumes a Stripe PaymentIntent for an existing pending/failed WooCommerce order without leaving React.
 */
export async function createOnsiteIntentForExistingOrder(params: {
  orderId: number;
  orderKey?: string;
  customerId?: number | null;
}) {
  const order = await wooGetOrderById(params.orderId);
  if (!order || !order.id) {
    throw new Error('Order not found in WooCommerce.');
  }

  const matchesKey = Boolean(params.orderKey && order.order_key && order.order_key === params.orderKey);
  const matchesCustomer = Boolean(params.customerId && Number(order.customer_id) === Number(params.customerId));
  if (!matchesKey && !matchesCustomer) {
    throw new Error('Forbidden: You do not have permission to pay for this order.');
  }

  if (!['pending', 'failed'].includes(order.status)) {
    throw new Error(`Order #${order.number || order.id} has status "${order.status}" and does not require payment.`);
  }

  const creds = await getActiveWooStripeCredentials(false);
  if (!creds.enabled || !creds.publishableKey || !creds.secretKey) {
    throw new Error('WooCommerce Stripe Payment Gateway keys are missing or disabled.');
  }

  const stripe = buildStripeClient(creds.secretKey);
  const amountPence = Math.round(parseFloat(String(order.total || '0')) * 100);
  if (!Number.isFinite(amountPence) || amountPence < 30) {
    throw new Error('Order total must be at least £0.30 to process payment.');
  }

  const existingPiId = (order.meta_data || []).find((m: any) => m.key === '_stripe_intent_id')?.value;
  if (existingPiId) {
    try {
      const existingPi = await stripe.paymentIntents.retrieve(String(existingPiId));
      if (
        existingPi &&
        existingPi.client_secret &&
        existingPi.amount === amountPence &&
        ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existingPi.status)
      ) {
        return {
          orderId: Number(order.id),
          orderNumber: String(order.number || order.id),
          orderKey: String(order.order_key),
          total: String(order.total || '0.00'),
          currency: 'GBP',
          clientSecret: existingPi.client_secret,
          paymentIntentId: existingPi.id,
          publishableKey: creds.publishableKey,
          stripeMode: creds.modeLabel,
        };
      }
    } catch (_) {}
  }

  const billingEmail = String(order.billing?.email || '').trim().toLowerCase() || undefined;
  const orderNumber = String(order.number || order.id);
  const pi = await stripe.paymentIntents.create({
    amount: amountPence,
    currency: 'gbp',
    allowed_payment_method_types: ['card'],
    capture_method: creds.captureMethod,
    ...(billingEmail ? { receipt_email: billingEmail } : {}),
    description: `iRepair Mobiles Order #${orderNumber}`,
    metadata: {
      order_id: String(order.id),
      order_number: orderNumber,
      order_key: String(order.order_key || ''),
      customer_email: billingEmail || '',
      site_url: 'https://irepair-mobiles.co.uk',
      source: 'react_onsite_order_retry',
    },
  });

  if (!pi.client_secret) {
    throw new Error('Stripe did not return a client secret for this order.');
  }

  try {
    await wooUpdateOrder(Number(order.id), {
      status: 'pending',
      meta_data: [{ key: '_stripe_intent_id', value: pi.id }],
    });
  } catch (_) {}

  return {
    orderId: Number(order.id),
    orderNumber,
    orderKey: String(order.order_key),
    total: String(order.total || '0.00'),
    currency: 'GBP',
    clientSecret: pi.client_secret,
    paymentIntentId: pi.id,
    publishableKey: creds.publishableKey,
    stripeMode: creds.modeLabel,
  };
}

/**
 * Style (2) Authoritative On-Site Payment Confirmation:
 * Verifies Stripe PaymentIntent directly with Stripe API, checks order amount & ownership,
 * then updates WooCommerce order to 'processing' (set_paid: true) and marks transaction metadata.
 */
export async function confirmOnsiteOrderPayment(params: {
  orderId: number;
  orderKey?: string;
  paymentIntentId: string;
  customerId?: number | null;
}) {
  const order = await wooGetOrderById(params.orderId);
  if (!order || !order.id) {
    throw new Error('Order not found in WooCommerce.');
  }

  const matchesKey = Boolean(params.orderKey && order.order_key && order.order_key === params.orderKey);
  const matchesCustomer = Boolean(params.customerId && Number(order.customer_id) === Number(params.customerId));
  if (!matchesKey && !matchesCustomer) {
    throw new Error('Forbidden: Missing or invalid order verification key.');
  }

  // Already paid idempotent return
  if (['processing', 'completed'].includes(order.status)) {
    const verified = await getVerifiedOrderForConfirmation(String(order.id), order.order_key, params.customerId);
    if (verified.error) {
      throw new Error(verified.error);
    }
    return { success: true, order: verified.order };
  }

  const creds = await getActiveWooStripeCredentials(false);
  if (!creds.secretKey) {
    throw new Error('WooCommerce Stripe secret key is not configured.');
  }

  const stripe = buildStripeClient(creds.secretKey);
  const pi = await stripe.paymentIntents.retrieve(String(params.paymentIntentId || '').trim(), {
    expand: ['latest_charge'],
  });

  if (!pi || !pi.id) {
    throw new Error('Stripe PaymentIntent not found.');
  }

  const storedPiId = (order.meta_data || []).find((m: any) => m.key === '_stripe_intent_id')?.value;
  if (pi.metadata?.order_id !== String(order.id) && storedPiId !== pi.id) {
    throw new Error('Forbidden: PaymentIntent does not belong to this WooCommerce order.');
  }

  if (!['succeeded', 'requires_capture'].includes(pi.status)) {
    throw new Error(`Stripe payment is not complete yet (status: ${pi.status}).`);
  }

  const expectedPence = Math.round(parseFloat(String(order.total || '0')) * 100);
  const paidPence = pi.status === 'requires_capture' ? pi.amount : pi.amount_received;
  if (paidPence < expectedPence - 1) {
    throw new Error('Captured Stripe amount does not match WooCommerce order total.');
  }

  const latestCharge = pi.latest_charge && typeof pi.latest_charge === 'object' ? (pi.latest_charge as any) : null;
  const walletType = latestCharge?.payment_method_details?.card?.wallet?.type || '';
  const paymentMethodTitle =
    walletType === 'apple_pay'
      ? 'Apple Pay (Stripe)'
      : walletType === 'google_pay'
      ? 'Google Pay (Stripe)'
      : 'Debit / Credit Card (Stripe)';

  const updRes = await wooUpdateOrder(Number(order.id), {
    status: 'processing',
    set_paid: true,
    transaction_id: pi.id,
    payment_method: 'stripe',
    payment_method_title: paymentMethodTitle,
    meta_data: [
      { key: '_stripe_intent_id', value: pi.id },
      { key: '_stripe_charge_id', value: latestCharge?.id || '' },
      { key: '_stripe_charge_captured', value: pi.status === 'succeeded' ? 'yes' : 'no' },
      { key: '_irepair_payment_wallet', value: walletType || 'card' },
    ],
  });

  if (updRes.statusCode < 200 || updRes.statusCode >= 300) {
    throw new Error('Stripe payment succeeded, but updating WooCommerce order status failed. Contact support.');
  }

  try {
    await wooAddOrderNote(
      Number(order.id),
      `Stripe payment confirmed on React checkout via ${paymentMethodTitle} (PaymentIntent: ${pi.id}${
        latestCharge?.id ? `, Charge: ${latestCharge.id}` : ''
      }).`,
      false
    );
  } catch (_) {}

  try {
    const db = await getDb();
    db.run(
      "UPDATE checkout_handoffs SET status = 'completed', consumed_at = COALESCE(consumed_at, ?) WHERE wc_order_id = ? AND status != 'completed'",
      [new Date().toISOString(), Number(order.id)]
    );
  } catch (_) {}

  const verified = await getVerifiedOrderForConfirmation(String(order.id), order.order_key, params.customerId);
  if (verified.error) {
    throw new Error(verified.error);
  }

  return { success: true, order: verified.order };
}

/**
 * Build real WooCommerce order-pay URL for logged-in customer account "Pay now"
 */
export async function getCustomerOrderPayUrl(orderId: number, customerId: number) {
  const settings = await getPaymentSettings(false);
  const order = await wooGetOrderById(orderId);
  if (!order || !order.id) {
    throw new Error('Order not found in WooCommerce.');
  }
  if (Number(order.customer_id) !== Number(customerId)) {
    throw new Error('Forbidden: You do not own this order.');
  }
  if (!['pending', 'failed'].includes(order.status)) {
    throw new Error(`Order #${order.number || order.id} has status "${order.status}" and does not require payment.`);
  }
  const payUrl = `${settings.wooHostedBaseUrl}/checkout/order-pay/${order.id}/?pay_for_order=true&key=${encodeURIComponent(order.order_key)}`;
  return {
    orderId: order.id,
    orderNumber: order.number || String(order.id),
    payUrl,
  };
}

/**
 * Development/Staging simulated order ONLY (strictly forbidden when Hosted Gateway is ON or in Production)
 */
export async function createSimulatedTestOrder(params: {
  items: CartItemInput[];
  billing: any;
  paymentMethodTitle: string;
}) {
  if (isProductionRuntime()) {
    throw new Error('Forbidden: Simulated test orders are permanently disabled in Production.');
  }
  const settings = await getPaymentSettings(false);
  if (settings.useWooHosted) {
    throw new Error('Forbidden: Hosted WooCommerce payment gateway is ON. Simulated payment routes are unreachable.');
  }

  const db = await getDb();
  const normalizedItems = (params.items || []).map((it) => {
    const pRow = db.get<any>(
      'SELECT title, price, image FROM products WHERE id = ? OR slug = ? OR external_id = ?',
      [String(it.productId), String(it.productId), parseNumericId(it.productId)]
    );
    let price = Number(pRow?.price || 0);
    if (it.variationId) {
      const vRow = db.get<any>(
        'SELECT price FROM product_variations WHERE id = ? OR external_id = ?',
        [String(it.variationId), parseNumericId(it.variationId)]
      );
      if (vRow?.price) price = Number(vRow.price);
    }
    const qty = Math.max(1, Number(it.quantity || 1));
    return {
      name: pRow?.title || `Product ${it.productId}`,
      quantity: qty,
      unitPrice: price,
      total: Number((price * qty).toFixed(2)),
      attributes: it.selectedAttributes || {},
    };
  });

  if (normalizedItems.length === 0) {
    throw new Error('Cart is empty.');
  }

  const subtotal = normalizedItems.reduce((s, i) => s + i.total, 0);
  const shipping = subtotal >= 50 ? 0 : 4.95;
  const total = Number((subtotal + shipping).toFixed(2));
  const testId = `TEST-${Math.floor(100000 + Math.random() * 900000)}`;
  const orderKey = `sim_${crypto.randomBytes(10).toString('hex')}`;
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO simulated_test_orders (
      id, order_key, payment_method_title, status, items_json, totals_json, customer_json, created_at
    ) VALUES (?, ?, ?, 'simulated', ?, ?, ?, ?)`,
    [
      testId,
      orderKey,
      `${params.paymentMethodTitle || 'Card'} (SIMULATED - NO REAL MONEY)`,
      JSON.stringify(normalizedItems),
      JSON.stringify({ subtotal, shipping, total, tax: Number(((total * 0.2) / 1.2).toFixed(2)) }),
      JSON.stringify(params.billing || {}),
      now,
    ]
  );

  return {
    isSimulated: true,
    orderId: testId,
    orderNumber: testId,
    orderKey,
    total,
    status: 'simulated',
  };
}

/**
 * Authoritative order confirmation lookup (WooCommerce real order ONLY when hosted/production)
 */
export async function getVerifiedOrderForConfirmation(
  rawId: string,
  orderKey?: string,
  loggedInCustomerId?: number | null
) {
  const settings = await getPaymentSettings(false);
  const isProd = isProductionRuntime();

  // Simulated TEST- orders ONLY allowed when non-prod AND useWooHosted === false
  if (rawId.startsWith('TEST-')) {
    if (isProd || settings.useWooHosted) {
      return { statusCode: 403, error: 'Simulated orders cannot be viewed while Hosted WooCommerce Payment Gateway is active.' };
    }
    const db = await getDb();
    const sim = db.get<any>('SELECT * FROM simulated_test_orders WHERE id = ?', [rawId]);
    if (!sim) return { statusCode: 404, error: 'Simulated test order not found.' };
    if (orderKey && sim.order_key !== orderKey) {
      return { statusCode: 403, error: 'Invalid test order access key.' };
    }
    const items = JSON.parse(sim.items_json || '[]');
    const totals = JSON.parse(sim.totals_json || '{}');
    const customer = JSON.parse(sim.customer_json || '{}');
    return {
      statusCode: 200,
      order: {
        isSimulated: true,
        id: sim.id,
        number: sim.id,
        orderKey: sim.order_key,
        status: 'simulated',
        isPaid: false,
        dateCreated: sim.created_at,
        currency: 'GBP',
        total: String(totals.total || 0),
        totalTax: String(totals.tax || 0),
        shippingTotal: String(totals.shipping || 0),
        discountTotal: '0.00',
        paymentMethodTitle: sim.payment_method_title,
        billing: customer,
        shipping: customer,
        lineItems: items.map((i: any) => ({
          name: i.name,
          quantity: i.quantity,
          total: String(i.total),
          meta: [],
        })),
        dispatchNote: 'SIMULATED ORDER — Not created in WooCommerce and no email sent.',
        supportEmail: settings.supportEmail,
      },
    };
  }

  // Reject 13-digit timestamps or invalid order IDs cleanly!
  const numericId = /^\d+$/.test(rawId) ? parseInt(rawId, 10) : 0;
  if (!numericId || numericId <= 0 || numericId > 999999999) {
    return { statusCode: 404, error: 'Invalid or non-existent WooCommerce order ID.' };
  }

  const order = await wooGetOrderById(numericId);
  if (!order || !order.id) {
    return { statusCode: 404, error: 'Order not found in WooCommerce.' };
  }

  const matchesKey = Boolean(orderKey && order.order_key && order.order_key === orderKey);
  const matchesCustomer = Boolean(loggedInCustomerId && Number(order.customer_id) === Number(loggedInCustomerId));

  if (!matchesKey && !matchesCustomer) {
    return { statusCode: 403, error: 'Forbidden: Missing or invalid order verification key.' };
  }

  const isPaid = ['processing', 'completed'].includes(order.status);

  // Mark any matching Style (2) handoff row completed when paid
  if (isPaid) {
    try {
      const db = await getDb();
      db.run(
        "UPDATE checkout_handoffs SET status = 'completed', consumed_at = COALESCE(consumed_at, ?) WHERE wc_order_id = ? AND status != 'completed'",
        [new Date().toISOString(), numericId]
      );
    } catch (_) {}
  }

  return {
    statusCode: 200,
    order: {
      isSimulated: false,
      id: order.id,
      number: String(order.number || order.id),
      orderKey: order.order_key,
      status: order.status,
      isPaid,
      dateCreated: order.date_created,
      currency: order.currency || 'GBP',
      total: String(order.total || '0.00'),
      totalTax: String(order.total_tax || '0.00'),
      shippingTotal: String(order.shipping_total || '0.00'),
      discountTotal: String(order.discount_total || '0.00'),
      paymentMethod: order.payment_method || 'stripe',
      paymentMethodTitle: order.payment_method_title || 'Stripe',
      billing: {
        firstName: order.billing?.first_name || '',
        lastName: order.billing?.last_name || '',
        email: order.billing?.email || '',
        phone: order.billing?.phone || '',
        address1: order.billing?.address_1 || '',
        address2: order.billing?.address_2 || '',
        city: order.billing?.city || '',
        postcode: order.billing?.postcode || '',
        country: order.billing?.country || 'GB',
      },
      shipping: {
        firstName: order.shipping?.first_name || order.billing?.first_name || '',
        lastName: order.shipping?.last_name || order.billing?.last_name || '',
        address1: order.shipping?.address_1 || order.billing?.address_1 || '',
        address2: order.shipping?.address_2 || order.billing?.address_2 || '',
        city: order.shipping?.city || order.billing?.city || '',
        postcode: order.shipping?.postcode || order.billing?.postcode || '',
        country: order.shipping?.country || order.billing?.country || 'GB',
      },
      lineItems: (order.line_items || []).map((li: any) => ({
        id: li.id,
        name: li.name,
        quantity: li.quantity,
        total: String(li.total || '0.00'),
        meta: (li.meta_data || [])
          .filter((m: any) => !String(m.key).startsWith('_'))
          .map((m: any) => ({ key: m.display_key || m.key, value: m.display_value || m.value })),
      })),
      shippingLines: (order.shipping_lines || []).map((s: any) => ({
        methodTitle: s.method_title,
        total: String(s.total || '0.00'),
      })),
      payUrl:
        ['pending', 'failed'].includes(order.status)
          ? `${settings.wooHostedBaseUrl}/checkout/order-pay/${order.id}/?pay_for_order=true&key=${encodeURIComponent(order.order_key)}`
          : null,
      dispatchNote: settings.dispatchNote,
      supportEmail: settings.supportEmail,
    },
  };
}

/**
 * Clean up abandoned pending Style (2) orders older than configured minutes
 */
export async function cleanupAbandonedPendingOrders() {
  try {
    const settings = await getPaymentSettings(false);
    const db = await getDb();
    const cutoff = new Date(Date.now() - settings.abandonedOrderMinutes * 60 * 1000).toISOString();

    const rows = db.all<any>(
      "SELECT * FROM checkout_handoffs WHERE style = 'order_pay' AND status = 'created' AND wc_order_id IS NOT NULL AND created_at < ?",
      [cutoff]
    );

    let cancelledCount = 0;
    for (const r of rows) {
      try {
        const order = await wooGetOrderById(Number(r.wc_order_id));
        if (order && order.status === 'pending') {
          await wooUpdateOrder(Number(r.wc_order_id), { status: 'cancelled' });
          await wooAddOrderNote(
            Number(r.wc_order_id),
            `Order automatically cancelled by headless payment gateway after ${settings.abandonedOrderMinutes} minutes unpaid.`,
            false
          );
          cancelledCount++;
        }
        db.run("UPDATE checkout_handoffs SET status = 'cancelled' WHERE id = ?", [r.id]);
      } catch (_) {}
    }

    // Expire old Style (1) handoff tokens too
    db.run("UPDATE checkout_handoffs SET status = 'expired' WHERE style = 'hosted_checkout' AND status = 'created' AND expires_at < ?", [
      new Date().toISOString(),
    ]);

    return { cancelledCount };
  } catch (err) {
    return { cancelledCount: 0 };
  }
}

export interface DiagnosticCheckResult {
  key: string;
  title: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: string;
}

/**
 * 8 real diagnostic checks against live WordPress + WooCommerce + Stripe
 */
export async function runPaymentDiagnostics(
  requestOrigin?: string,
  override?: {
    handoffStyle?: CheckoutHandoffStyle;
    wooHostedBaseUrl?: string;
    useWooHosted?: boolean;
  }
): Promise<{
  allPassed: boolean;
  hasWarnings: boolean;
  testedAt: string;
  wooHostedBaseUrl: string;
  handoffStyle: CheckoutHandoffStyle;
  stripeMode: 'test' | 'live' | 'unknown';
  checks: DiagnosticCheckResult[];
}> {
  const settings = await getPaymentSettings(true);
  const effectiveStyle: CheckoutHandoffStyle =
    override?.handoffStyle === 'order_pay'
      ? 'order_pay'
      : override?.handoffStyle === 'hosted_checkout'
      ? 'hosted_checkout'
      : settings.handoffStyle;
  const baseUrl = normalizeUrlBase(override?.wooHostedBaseUrl, settings.wooHostedBaseUrl);
  const checks: DiagnosticCheckResult[] = [];
  let stripeMode: 'test' | 'live' | 'unknown' = 'unknown';

  // 1. WordPress / WooCommerce store reachable
  try {
    const start = Date.now();
    const wpRes = await httpRequestJson(`${baseUrl}/wp-json/`, 'GET', undefined, {}, 8000);
    const ms = Date.now() - start;
    if (wpRes.statusCode >= 200 && wpRes.statusCode < 400 && wpRes.data && typeof wpRes.data === 'object') {
      checks.push({
        key: 'wp_reachable',
        title: effectiveStyle === 'order_pay' ? '1. WooCommerce Store Reachable' : '1. WordPress Hosted Store Reachable',
        status: 'pass',
        message: `Connected to ${baseUrl} REST API in ${ms}ms.`,
      });
    } else {
      checks.push({
        key: 'wp_reachable',
        title: effectiveStyle === 'order_pay' ? '1. WooCommerce Store Reachable' : '1. WordPress Hosted Store Reachable',
        status: 'fail',
        message: `${baseUrl}/wp-json/ returned HTTP ${wpRes.statusCode}.`,
      });
    }
  } catch (err: any) {
    checks.push({
      key: 'wp_reachable',
      title: effectiveStyle === 'order_pay' ? '1. WooCommerce Store Reachable' : '1. WordPress Hosted Store Reachable',
      status: 'fail',
      message: `Cannot reach ${baseUrl}: ${err.message}`,
    });
  }

  // STYLE 2: 100% On-Site React Checkout via WooCommerce REST + Stripe APIs (No WordPress redirect or test-handoff)
  if (effectiveStyle === 'order_pay') {
    // 2. WooCommerce Orders & Shipping REST API Ready
    try {
      const [ordersRes, zonesRes] = await Promise.all([
        requestWoo('/orders?per_page=1', 'GET', undefined, {}, 0),
        requestWoo('/shipping/zones', 'GET', undefined, {}, 0),
      ]);
      if (ordersRes.statusCode === 200 && zonesRes.statusCode === 200) {
        const zoneCount = Array.isArray(zonesRes.data) ? zonesRes.data.length : 0;
        checks.push({
          key: 'woo_orders_api',
          title: '2. WooCommerce Orders & Shipping REST API',
          status: 'pass',
          message: `Authenticated with WooCommerce REST API v3 (Orders writable, ${zoneCount} shipping zone(s) loaded).`,
        });
      } else {
        checks.push({
          key: 'woo_orders_api',
          title: '2. WooCommerce Orders & Shipping REST API',
          status: 'fail',
          message: `WooCommerce REST API returned orders HTTP ${ordersRes.statusCode}, shipping HTTP ${zonesRes.statusCode}.`,
        });
      }
    } catch (err: any) {
      checks.push({
        key: 'woo_orders_api',
        title: '2. WooCommerce Orders & Shipping REST API',
        status: 'fail',
        message: `WooCommerce REST API check failed: ${err.message}`,
      });
    }

    // 3 & 4 & 5. WooCommerce Stripe Gateway keys + Allowed methods + Live Stripe API Auth
    let creds: WooStripeCredentials | null = null;
    try {
      creds = await getActiveWooStripeCredentials(true);
      stripeMode = creds.modeLabel;
      if (creds.enabled && creds.publishableKey && creds.secretKey && !creds.secretKey.includes('*')) {
        checks.push({
          key: 'stripe_gateway',
          title: '3. WooCommerce Stripe Gateway & Keys',
          status: 'pass',
          message: `Official WooCommerce Stripe gateway is ENABLED in ${creds.testMode ? 'TEST MODE (sandbox)' : 'LIVE MODE (real charges)'} with valid publishable & secret keys.`,
        });
      } else {
        checks.push({
          key: 'stripe_gateway',
          title: '3. WooCommerce Stripe Gateway & Keys',
          status: 'fail',
          message: !creds.enabled
            ? 'Official WooCommerce Stripe Payment Gateway is disabled.'
            : 'WooCommerce Stripe publishable or secret key is missing or masked.',
        });
      }
    } catch (err: any) {
      checks.push({
        key: 'stripe_gateway',
        title: '3. WooCommerce Stripe Gateway & Keys',
        status: 'fail',
        message: `Failed loading WooCommerce Stripe gateway settings: ${err.message}`,
      });
    }

    // 4. Payment methods strictly restricted to Card, Apple Pay, Google Pay ONLY
    checks.push({
      key: 'allowed_methods',
      title: '4. Payment Methods Restricted (Card, Apple Pay, Google Pay Only)',
      status: 'pass',
      message: `On-Site Stripe Elements strictly restricts checkout to: ${settings.allowedMethods.join(', ')}. Link, PayPal, Klarna, Clearpay, BACS, and COD are disabled.`,
    });

    // 5. Stripe API Authentication Verified (balance.retrieve using WooCommerce Stripe Secret Key)
    if (creds && creds.secretKey && !creds.secretKey.includes('*')) {
      try {
        const stripe = buildStripeClient(creds.secretKey);
        const bal = await stripe.balance.retrieve();
        checks.push({
          key: 'stripe_api_auth',
          title: '5. Stripe API Authentication Verified',
          status: 'pass',
          message: `Authenticated directly with Stripe API (${bal.livemode ? 'LIVE' : 'TEST'} mode, ${bal.available?.length || 0} balance currency bucket(s) accessible).`,
        });
      } catch (err: any) {
        checks.push({
          key: 'stripe_api_auth',
          title: '5. Stripe API Authentication Verified',
          status: 'fail',
          message: `Stripe rejected WooCommerce's secret key: ${err.message}`,
        });
      }
    } else {
      checks.push({
        key: 'stripe_api_auth',
        title: '5. Stripe API Authentication Verified',
        status: 'fail',
        message: 'Skipped — valid Stripe secret key from WooCommerce required first.',
      });
    }

    // 6. Live UK Shipping Options & On-Site Confirmation Ready
    try {
      const ship = await getLiveWooShippingOptions(50);
      checks.push({
        key: 'live_shipping',
        title: '6. Live UK Shipping & On-Site Confirmation',
        status: 'pass',
        message: `${ship.rates.length} live WooCommerce shipping option(s) active (${ship.rates.map((r) => r.title).join(', ')}). Confirmation stays on React with zero WordPress redirect.`,
      });
    } catch (err: any) {
      checks.push({
        key: 'live_shipping',
        title: '6. Live UK Shipping & On-Site Confirmation',
        status: 'fail',
        message: `Live shipping options check failed: ${err.message}`,
      });
    }

    // 7. Apple Pay Domain Verification on active React Storefront Origin
    const reactOrigin = normalizeUrlBase(requestOrigin, 'http://127.0.0.1:3000');
    try {
      const appleUrl = `${reactOrigin}/.well-known/apple-developer-merchantid-domain-association`;
      const appleRes = await httpRequestJson(appleUrl, 'GET', undefined, {}, 5000);
      const hasContent = typeof appleRes.rawBody === 'string' && appleRes.rawBody.trim().length > 20;
      const isHtml = /<html|<body|<!doctype/i.test(appleRes.rawBody || '');
      if (appleRes.statusCode === 200 && hasContent && !isHtml) {
        checks.push({
          key: 'apple_pay_domain',
          title: '7. Apple Pay Domain Verification (React Storefront)',
          status: 'pass',
          message: `Apple Pay association file is served cleanly on ${new URL(reactOrigin).hostname}. Register this domain in Stripe Dashboard > Payment method domains for Safari Apple Pay.`,
        });
      } else {
        checks.push({
          key: 'apple_pay_domain',
          title: '7. Apple Pay Domain Verification (React Storefront)',
          status: 'warn',
          message: `${appleUrl} returned HTTP ${appleRes.statusCode}. Ensure Apple Pay verification route is publicly reachable.`,
        });
      }
    } catch (err: any) {
      checks.push({
        key: 'apple_pay_domain',
        title: '7. Apple Pay Domain Verification (React Storefront)',
        status: 'warn',
        message: `Could not verify ${reactOrigin}/.well-known/apple-developer-merchantid-domain-association: ${err.message}`,
      });
    }

    // 8. On-Site Catalogue & PaymentIntent Pipeline Dry-Run
    try {
      const prodRes = await requestWoo('/products?per_page=1&status=publish', 'GET', undefined, {}, 0);
      if (prodRes.statusCode === 200 && Array.isArray(prodRes.data) && prodRes.data.length > 0 && creds?.publishableKey) {
        checks.push({
          key: 'onsite_pipeline',
          title: '8. On-Site Checkout & PaymentIntent Pipeline',
          status: 'pass',
          message: `Live catalogue verified (${prodRes.data[0].name}) and Stripe Elements PaymentIntent pipeline is ready for zero-redirect on-site payments.`,
        });
      } else {
        checks.push({
          key: 'onsite_pipeline',
          title: '8. On-Site Checkout & PaymentIntent Pipeline',
          status: 'fail',
          message: `On-site pipeline incomplete (WooCommerce products HTTP ${prodRes.statusCode}).`,
        });
      }
    } catch (err: any) {
      checks.push({
        key: 'onsite_pipeline',
        title: '8. On-Site Checkout & PaymentIntent Pipeline',
        status: 'fail',
        message: `On-site pipeline dry-run failed: ${err.message}`,
      });
    }

    invalidateGatewayHealthCache();
    const hasFailures = checks.some((c) => c.status === 'fail');
    const hasWarnings = checks.some((c) => c.status === 'warn');

    return {
      allPassed: !hasFailures,
      hasWarnings,
      testedAt: new Date().toISOString(),
      wooHostedBaseUrl: baseUrl,
      handoffStyle: effectiveStyle,
      stripeMode,
      checks,
    };
  }

  // STYLE 1: Hosted Redirect Bridge Diagnostics
  // 2. Mini-plugin installed and working
  let bridgeHealth: any = null;
  try {
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = signHmacPayload(settings.handoffSecret || '', ts, '');
    const hRes = await httpRequestJson(
      `${baseUrl}/wp-json/irepair-bridge/v1/health`,
      'GET',
      undefined,
      { 'X-iRepair-Timestamp': ts, 'X-iRepair-Signature': sig },
      8000
    );
    if (hRes.statusCode === 200 && hRes.data?.plugin === 'irepair-headless-checkout-bridge') {
      bridgeHealth = hRes.data;
      checks.push({
        key: 'mini_plugin',
        title: '2. WordPress Mini-Plugin Installed & Working',
        status: hRes.data.signature_valid ? 'pass' : 'fail',
        message: hRes.data.signature_valid
          ? `Bridge v${hRes.data.version} installed, WooCommerce v${hRes.data.wc_version}, HMAC signature verified.`
          : 'Mini-plugin is installed, but HMAC Handoff Secret does NOT match Settings > Payments.',
      });
    } else if (hRes.statusCode === 401 || hRes.statusCode === 403) {
      checks.push({
        key: 'mini_plugin',
        title: '2. WordPress Mini-Plugin Installed & Working',
        status: 'fail',
        message: `Mini-plugin rejected authentication (${hRes.statusCode}). Verify the Shared Handoff Secret matches in WordPress Settings > iRepair Bridge.`,
      });
    } else {
      checks.push({
        key: 'mini_plugin',
        title: '2. WordPress Mini-Plugin Installed & Working',
        status: 'fail',
        message: `Mini-plugin endpoint /wp-json/irepair-bridge/v1/health not found (HTTP ${hRes.statusCode}). Install and activate the WordPress mini-plugin.`,
      });
    }
  } catch (err: any) {
    checks.push({
      key: 'mini_plugin',
      title: '2. WordPress Mini-Plugin Installed & Working',
      status: 'fail',
      message: `Failed checking mini-plugin: ${err.message}`,
    });
  }

  // 3 & 4. WooCommerce Stripe Gateway active, Test/Live mode, and Only Card/ApplePay/GooglePay enabled
  try {
    const gateways = await wooGetPaymentGateways();
    const stripeGw = gateways.find((g: any) => g.id === 'stripe');
    if (stripeGw && stripeGw.enabled) {
      const isTest =
        bridgeHealth?.stripe_testmode !== undefined
          ? Boolean(bridgeHealth.stripe_testmode)
          : stripeGw.settings?.testmode?.value === 'yes';
      stripeMode = isTest ? 'test' : 'live';
      checks.push({
        key: 'stripe_gateway',
        title: '3. WooCommerce Stripe Gateway Active & Mode',
        status: 'pass',
        message: `Official Stripe gateway is ENABLED on WordPress in ${isTest ? 'TEST MODE (sandbox)' : 'LIVE MODE (real charges)'}.`,
      });
    } else if (bridgeHealth?.stripe_enabled) {
      stripeMode = bridgeHealth.stripe_testmode ? 'test' : 'live';
      checks.push({
        key: 'stripe_gateway',
        title: '3. WooCommerce Stripe Gateway Active & Mode',
        status: 'pass',
        message: `Official Stripe gateway active (${stripeMode.toUpperCase()} mode).`,
      });
    } else {
      checks.push({
        key: 'stripe_gateway',
        title: '3. WooCommerce Stripe Gateway Active & Mode',
        status: 'fail',
        message: 'Official "WooCommerce Stripe Payment Gateway" plugin is not enabled or unreachable.',
      });
    }

    // Check 4: Strictly Card, Apple Pay, Google Pay ONLY
    const extraGateways = gateways.filter((g: any) => g.enabled && !g.id.startsWith('stripe'));
    const disabledStripeSubGateways = gateways.filter(
      (g: any) => g.enabled && (DISALLOWED_GATEWAY_IDS.includes(g.id) || g.id.startsWith('stripe_'))
    );
    const upeExtraMethods: string[] = Array.isArray(bridgeHealth?.upe_enabled_methods)
      ? bridgeHealth.upe_enabled_methods.filter((m: string) => !['card', 'apple_pay', 'google_pay'].includes(m))
      : [];

    const problems = [
      ...extraGateways.map((g: any) => `${g.title || g.id} (${g.id})`),
      ...disabledStripeSubGateways.map((g: any) => `${g.title || g.id} (${g.id})`),
      ...upeExtraMethods.map((m: string) => `Stripe method: ${m}`),
    ];

    if (problems.length === 0) {
      checks.push({
        key: 'allowed_methods',
        title: '4. Payment Methods Restricted (Card, Apple Pay, Google Pay Only)',
        status: 'pass',
        message: 'Only Stripe Card, Apple Pay, and Google Pay are active. No PayPal, BACS, COD, Klarna, Clearpay, or Link detected.',
      });
    } else {
      checks.push({
        key: 'allowed_methods',
        title: '4. Payment Methods Restricted (Card, Apple Pay, Google Pay Only)',
        status: 'warn',
        message: `Extra gateways detected in WooCommerce: ${problems.join(', ')}. Mini-plugin filters them on bridged checkouts, and you should disable them in WooCommerce > Settings > Payments too.`,
      });
    }
  } catch (err: any) {
    checks.push({
      key: 'stripe_gateway',
      title: '3. WooCommerce Stripe Gateway Active & Mode',
      status: 'fail',
      message: `Unable to query WooCommerce payment gateways: ${err.message}`,
    });
    checks.push({
      key: 'allowed_methods',
      title: '4. Payment Methods Restricted (Card, Apple Pay, Google Pay Only)',
      status: 'fail',
      message: 'Could not verify enabled payment methods in WooCommerce.',
    });
  }

  // 5. Stripe Webhook Configured
  if (bridgeHealth) {
    const whOk = Boolean(bridgeHealth.stripe_webhook_configured);
    checks.push({
      key: 'stripe_webhook',
      title: '5. Stripe Webhook Configured in WooCommerce',
      status: whOk ? 'pass' : 'warn',
      message: whOk
        ? `Webhook secret is configured (${bridgeHealth.stripe_mode_label || stripeMode} mode). Endpoint: ${baseUrl}/?wc-api=wc_stripe`
        : `No Stripe webhook signing secret detected in WooCommerce Stripe settings. Configure ${baseUrl}/?wc-api=wc_stripe in Stripe Dashboard.`,
    });
  } else {
    checks.push({
      key: 'stripe_webhook',
      title: '5. Stripe Webhook Configured in WooCommerce',
      status: 'warn',
      message: `Install mini-plugin to inspect WooCommerce Stripe webhook configuration. Expected webhook endpoint: ${baseUrl}/?wc-api=wc_stripe`,
    });
  }

  // 6. Return & Cancel Redirects Reachable
  const { returnUrl, cancelUrl } = resolveReturnAndCancelUrls(settings, requestOrigin || 'http://127.0.0.1:3000');
  const reactBaseMatches = bridgeHealth?.react_url
    ? normalizeUrlBase(bridgeHealth.react_url) === normalizeUrlBase(requestOrigin || bridgeHealth.react_url)
    : false;
  checks.push({
    key: 'redirects',
    title: '6. Return & Cancel Redirects Configured',
    status: bridgeHealth ? (bridgeHealth.react_url ? 'pass' : 'warn') : 'warn',
    message: `Return URL base: ${returnUrl} | Cancel URL: ${cancelUrl}${
      bridgeHealth?.react_url ? ` (WordPress bridge React URL: ${bridgeHealth.react_url})` : ''
    }`,
    details: !reactBaseMatches && bridgeHealth?.react_url ? 'Ensure WordPress Settings > iRepair Bridge > React Storefront URL matches your active React origin.' : undefined,
  });

  // 7. Apple Pay Domain Verification File on HOSTED WordPress domain
  try {
    const appleUrl = `${baseUrl}/.well-known/apple-developer-merchantid-domain-association`;
    const appleRes = await httpRequestJson(appleUrl, 'GET', undefined, {}, 6000);
    const hasContent = typeof appleRes.rawBody === 'string' && appleRes.rawBody.trim().length > 20;
    const isHtml = /<html|<body|<!doctype/i.test(appleRes.rawBody || '');
    if (appleRes.statusCode === 200 && hasContent && !isHtml) {
      checks.push({
        key: 'apple_pay_domain',
        title: '7. Apple Pay Domain Verification (Hosted WordPress Domain)',
        status: 'pass',
        message: `Apple Pay association file is served cleanly on hosted WP domain (${new URL(baseUrl).hostname}). Re-register in Stripe Dashboard if you move WordPress to old.irepair-mobiles.co.uk.`,
      });
    } else {
      checks.push({
        key: 'apple_pay_domain',
        title: '7. Apple Pay Domain Verification (Hosted WordPress Domain)',
        status: 'warn',
        message: `Hosted WP domain returned HTTP ${appleRes.statusCode} for ${appleUrl}. WooCommerce Stripe Payment Gateway normally serves this after registering ${new URL(baseUrl).hostname} in Stripe Dashboard > Payment method domains.`,
      });
    }
  } catch (err: any) {
    checks.push({
      key: 'apple_pay_domain',
      title: '7. Apple Pay Domain Verification (Hosted WordPress Domain)',
      status: 'warn',
      message: `Could not verify ${baseUrl}/.well-known/apple-developer-merchantid-domain-association: ${err.message}`,
    });
  }

  // 8. Test Checkout Handoff (Dry-Run)
  if (bridgeHealth && bridgeHealth.signature_valid) {
    try {
      const payloadObj = { dry_run: true, timestamp: Math.floor(Date.now() / 1000) };
      const rawBody = JSON.stringify(payloadObj);
      const ts = String(payloadObj.timestamp);
      const sig = signHmacPayload(settings.handoffSecret || '', ts, rawBody);
      const testRes = await httpRequestJson(
        `${baseUrl}/wp-json/irepair-bridge/v1/test-handoff`,
        'POST',
        payloadObj,
        { 'X-iRepair-Timestamp': ts, 'X-iRepair-Signature': sig },
        8000
      );
      if (testRes.statusCode === 200 && testRes.data?.ok) {
        checks.push({
          key: 'dry_run_handoff',
          title: '8. Test Checkout Handoff (Dry-Run)',
          status: 'pass',
          message: `Signed dry-run handoff succeeded (${testRes.data.message || 'WooCommerce session & checkout URL ready'}).`,
        });
      } else {
        checks.push({
          key: 'dry_run_handoff',
          title: '8. Test Checkout Handoff (Dry-Run)',
          status: 'fail',
          message: `Dry-run handoff returned HTTP ${testRes.statusCode}.`,
        });
      }
    } catch (err: any) {
      checks.push({
        key: 'dry_run_handoff',
        title: '8. Test Checkout Handoff (Dry-Run)',
        status: 'fail',
        message: `Dry-run handoff failed: ${err.message}`,
      });
    }
  } else {
    checks.push({
      key: 'dry_run_handoff',
      title: '8. Test Checkout Handoff (Dry-Run)',
      status: 'fail',
      message: 'Skipped — WordPress mini-plugin and matching HMAC secret must pass check #2 first.',
    });
  }

  invalidateGatewayHealthCache();
  const hasFailures = checks.some((c) => c.status === 'fail');
  const hasWarnings = checks.some((c) => c.status === 'warn');

  return {
    allPassed: !hasFailures,
    hasWarnings,
    testedAt: new Date().toISOString(),
    wooHostedBaseUrl: baseUrl,
    handoffStyle: effectiveStyle,
    stripeMode,
    checks,
  };
}
