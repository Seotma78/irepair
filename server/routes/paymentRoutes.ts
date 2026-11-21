import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticateToken, requireRole, verifyToken, logActivity, AuthenticatedRequest } from '../middleware/auth';
import { extractCustomerToken, requireCustomerAuth, createRateLimiter } from '../middleware/customerAuth';
import {
  getPaymentSettings,
  savePaymentSettings,
  getPublicPaymentConfig,
  createHostedHandoff,
  verifyHostedHandoffFromWp,
  createHostedOrderPay,
  createOnsiteWooStripeIntent,
  createOnsiteIntentForExistingOrder,
  confirmOnsiteOrderPayment,
  calculateOnsiteExpressShipping,
  getCustomerOrderPayUrl,
  createSimulatedTestOrder,
  getVerifiedOrderForConfirmation,
  getLiveWooShippingOptions,
  validateWooCouponLive,
  cleanupAbandonedPendingOrders,
  runPaymentDiagnostics,
  isProductionRuntime,
} from '../services/paymentGatewayService';

export const paymentRouter = Router();
export const adminPaymentsRouter = Router();

const paymentRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 25,
  message: 'Too many checkout attempts. Please wait a few moments before trying again.',
});

function getRequestOrigin(req: Request): string {
  const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim() || req.protocol || 'https';
  const host = (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim() || req.get('host') || 'irepair-mobiles.co.uk';
  return `${proto}://${host}`;
}

function checkIsAdminRequest(req: Request): boolean {
  try {
    const authHeader = req.headers.authorization;
    const token =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : req.cookies?.admin_token;
    if (!token) return false;
    const user = verifyToken(token);
    return Boolean(user && (user.role === 'super_admin' || user.role === 'admin'));
  } catch (_) {
    return false;
  }
}

// ==========================================
// PUBLIC PAYMENT ENDPOINTS (/api/payments)
// ==========================================

/**
 * GET /api/payments/config
 * Returns safe public configuration (NEVER returns consumer secrets, Stripe secrets, or handoff secret)
 */
paymentRouter.get('/config', async (req: Request, res: Response): Promise<any> => {
  try {
    const isAdmin = checkIsAdminRequest(req);
    const config = await getPublicPaymentConfig(isAdmin, getRequestOrigin(req));
    return res.json(config);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to load payment configuration' });
  }
});

/**
 * POST /api/payments/validate-coupon
 * Real WooCommerce REST coupon validation
 */
paymentRouter.post('/validate-coupon', async (req: Request, res: Response): Promise<any> => {
  try {
    const { code, subtotal = 0 } = req.body;
    const settings = await getPaymentSettings(false);
    if (!settings.useWooHosted && !isProductionRuntime()) {
      return res.status(400).json({ error: 'Live coupon lookup is disabled while simulated mode is active.' });
    }
    const result = await validateWooCouponLive(String(code || ''), Number(subtotal) || 0);
    return res.json({ valid: true, coupon: result });
  } catch (err: any) {
    return res.status(400).json({ valid: false, error: err.message || 'Invalid coupon code' });
  }
});

/**
 * GET /api/payments/shipping-options
 * Fetches live WooCommerce shipping zones/methods
 */
paymentRouter.get('/shipping-options', async (req: Request, res: Response): Promise<any> => {
  try {
    const subtotal = Math.max(0, parseFloat(String(req.query.subtotal || '0')) || 0);
    const data = await getLiveWooShippingOptions(subtotal);
    return res.json(data);
  } catch (err: any) {
    return res.status(503).json({ error: err.message || 'Unable to load live shipping rates from WooCommerce' });
  }
});

/**
 * POST /api/payments/handoff
 * Style (1): Creates a single-use server-side handoff token & returns WordPress WooCommerce checkout URL
 */
paymentRouter.post('/handoff', paymentRateLimiter, async (req: Request, res: Response): Promise<any> => {
  try {
    const customer = extractCustomerToken(req);
    const { items, couponCode, source = 'product', idempotencyKey } = req.body;

    const handoff = await createHostedHandoff({
      items,
      couponCode,
      source,
      customerId: customer?.customerId || null,
      idempotencyKey: idempotencyKey || (req.headers['idempotency-key'] as string),
      requestOrigin: getRequestOrigin(req),
    });

    return res.status(201).json({
      success: true,
      ...handoff,
    });
  } catch (err: any) {
    const status = /unavailable/i.test(err.message) ? 503 : 400;
    return res.status(status).json({ error: err.message || 'Failed to initiate hosted checkout' });
  }
});

/**
 * POST /api/payments/handoff/verify
 * Server-to-server endpoint called ONLY by WordPress iRepair Bridge plugin (HMAC-SHA256 signed)
 */
paymentRouter.post('/handoff/verify', async (req: Request, res: Response): Promise<any> => {
  try {
    const tsHeader = String(req.headers['x-irepair-timestamp'] || '');
    const sigHeader = String(req.headers['x-irepair-signature'] || '');
    const rawBody = (req as any).rawBody || JSON.stringify(req.body || {});
    const token = req.body?.token || '';

    const verified = await verifyHostedHandoffFromWp({
      token,
      timestampHeader: tsHeader,
      signatureHeader: sigHeader,
      rawBody,
    });

    return res.json(verified);
  } catch (err: any) {
    const isAuthErr = /signature|secret/i.test(err.message);
    return res.status(isAuthErr ? 403 : 400).json({
      valid: false,
      error: err.message || 'Handoff verification failed',
    });
  }
});

/**
 * POST /api/payments/order-pay
 * Style (2): Collects contact/address in React, creates real pending WC order, returns WP /checkout/order-pay URL
 */
paymentRouter.post('/order-pay', paymentRateLimiter, async (req: Request, res: Response): Promise<any> => {
  try {
    const customer = extractCustomerToken(req);
    const { items, billing, shipping, shippingOptionId, couponCode, customerNote, idempotencyKey } = req.body;

    const result = await createHostedOrderPay({
      items,
      billing,
      shipping,
      shippingOptionId,
      couponCode,
      customerNote,
      customerId: customer?.customerId || null,
      idempotencyKey: idempotencyKey || (req.headers['idempotency-key'] as string),
      requestOrigin: getRequestOrigin(req),
    });

    return res.status(201).json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    const status = /unavailable/i.test(err.message) ? 503 : 400;
    return res.status(status).json({ error: err.message || 'Failed to create pending WooCommerce order' });
  }
});

/**
 * POST /api/payments/order/:id/pay-url
 * Used by Customer Account "Pay now" button on pending/failed WooCommerce orders
 */
paymentRouter.post('/order/:id/pay-url', requireCustomerAuth, async (req: any, res: Response): Promise<any> => {
  try {
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    const result = await getCustomerOrderPayUrl(orderId, req.customer.customerId);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    const status = /Forbidden/i.test(err.message) ? 403 : 400;
    return res.status(status).json({ error: err.message || 'Unable to generate payment link' });
  }
});

/**
 * POST /api/payments/onsite/express-shipping
 * Live authoritative WooCommerce item, coupon, VAT & UK shipping totals for on-site modal
 */
paymentRouter.post('/onsite/express-shipping', async (req: Request, res: Response): Promise<any> => {
  try {
    const { items, couponCode, shippingRateId } = req.body || {};
    const result = await calculateOnsiteExpressShipping({
      items,
      couponCode,
      shippingRateId,
    });
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Unable to calculate shipping and totals' });
  }
});

/**
 * POST /api/payments/onsite/create-intent
 * Style (2) 100% On-Site React Checkout: Creates WooCommerce pending order + Stripe PaymentIntent
 */
paymentRouter.post('/onsite/create-intent', paymentRateLimiter, async (req: Request, res: Response): Promise<any> => {
  try {
    const customer = extractCustomerToken(req);
    const { items, billing, shipping, shippingOptionId, couponCode, customerNote, idempotencyKey } = req.body || {};

    const result = await createOnsiteWooStripeIntent({
      items,
      billing,
      shipping,
      shippingOptionId,
      couponCode,
      customerNote,
      customerId: customer?.customerId || null,
      idempotencyKey: idempotencyKey || (req.headers['idempotency-key'] as string),
      requestOrigin: getRequestOrigin(req),
    });

    return res.status(201).json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    const status = /unavailable/i.test(err.message) ? 503 : 400;
    return res.status(status).json({ error: err.message || 'Unable to initialize Stripe payment session' });
  }
});

/**
 * POST /api/payments/onsite/order-intent/:id
 * Style (2) On-Site Retry / Account "Pay now": Initializes or resumes Stripe PaymentIntent for existing WC order
 */
paymentRouter.post('/onsite/order-intent/:id', paymentRateLimiter, async (req: Request, res: Response): Promise<any> => {
  try {
    const customer = extractCustomerToken(req);
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    const orderKey = typeof req.body?.orderKey === 'string' ? req.body.orderKey : undefined;
    const result = await createOnsiteIntentForExistingOrder({
      orderId,
      orderKey,
      customerId: customer?.customerId || null,
    });
    return res.json({ success: true, ...result });
  } catch (err: any) {
    const status = /Forbidden/i.test(err.message) ? 403 : 400;
    return res.status(status).json({ error: err.message || 'Unable to initialize payment for order' });
  }
});

/**
 * POST /api/payments/onsite/confirm-order
 * Style (2) Authoritative Confirmation: Verifies PaymentIntent with Stripe & marks WooCommerce order paid
 */
paymentRouter.post('/onsite/confirm-order', async (req: Request, res: Response): Promise<any> => {
  try {
    const customer = extractCustomerToken(req);
    const orderId = parseInt(String(req.body?.orderId || ''), 10);
    const orderKey = typeof req.body?.orderKey === 'string' ? req.body.orderKey : undefined;
    const paymentIntentId = String(req.body?.paymentIntentId || '').trim();

    if (isNaN(orderId) || orderId <= 0 || !paymentIntentId) {
      return res.status(400).json({ error: 'Missing orderId or paymentIntentId' });
    }

    const result = await confirmOnsiteOrderPayment({
      orderId,
      orderKey,
      paymentIntentId,
      customerId: customer?.customerId || null,
    });

    return res.json(result);
  } catch (err: any) {
    const status = /Forbidden/i.test(err.message) ? 403 : 400;
    return res.status(status).json({ error: err.message || 'Failed to verify Stripe payment with WooCommerce' });
  }
});

/**
 * POST /api/payments/simulated-order
 * Development/Staging ONLY when Use WooCommerce payment gateway is explicitly UNCHECKED.
 * Completely blocked (403) when hosted gateway is ON or in Production.
 */
paymentRouter.post('/simulated-order', async (req: Request, res: Response): Promise<any> => {
  try {
    const settings = await getPaymentSettings(false);
    if (isProductionRuntime() || settings.useWooHosted) {
      return res.status(403).json({
        error: 'Hosted WooCommerce Stripe gateway is active. Simulated payments are disabled.',
      });
    }

    const { items, billing, paymentMethodTitle } = req.body;
    const sim = await createSimulatedTestOrder({ items, billing, paymentMethodTitle });
    return res.status(201).json({ success: true, ...sim });
  } catch (err: any) {
    const status = /Forbidden/i.test(err.message) ? 403 : 400;
    return res.status(status).json({ error: err.message || 'Simulated order failed' });
  }
});

/**
 * GET /api/payments/order/:id
 * Authoritative order lookup from WooCommerce (requires order_key or logged-in order owner)
 */
paymentRouter.get('/order/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const customer = extractCustomerToken(req);
    const orderKey = typeof req.query.key === 'string' ? req.query.key : undefined;
    const result = await getVerifiedOrderForConfirmation(req.params.id, orderKey, customer?.customerId);

    if (result.error) {
      return res.status(result.statusCode || 400).json({ error: result.error });
    }
    return res.json({ order: result.order });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve verified order details' });
  }
});

// ==========================================
// ADMIN PAYMENT SETTINGS (/api/admin/payments)
// ==========================================

adminPaymentsRouter.use(authenticateToken, requireRole('admin', 'super_admin'));

adminPaymentsRouter.get('/settings', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const settings = await getPaymentSettings(false);
    return res.json({
      settings,
      backendOrigin: getRequestOrigin(req),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load payment settings' });
  }
});

adminPaymentsRouter.put('/settings', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const updated = await savePaymentSettings(req.body || {});
    if (req.user) {
      await logActivity(
        req.user.email,
        'update_payment_settings',
        {
          useWooHosted: updated.useWooHosted,
          handoffStyle: updated.handoffStyle,
          wooHostedBaseUrl: updated.wooHostedBaseUrl,
          allowedMethods: updated.allowedMethods,
        },
        req.ip
      );
    }
    return res.json({
      success: true,
      message: 'Payment gateway settings saved.',
      settings: updated,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to save payment settings' });
  }
});

adminPaymentsRouter.post('/test-config', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { handoffStyle, wooHostedBaseUrl, useWooHosted } = req.body || {};
    const report = await runPaymentDiagnostics(getRequestOrigin(req), {
      handoffStyle: handoffStyle === 'order_pay' || handoffStyle === 'hosted_checkout' ? handoffStyle : undefined,
      wooHostedBaseUrl: typeof wooHostedBaseUrl === 'string' ? wooHostedBaseUrl : undefined,
      useWooHosted: typeof useWooHosted === 'boolean' ? useWooHosted : undefined,
    });
    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Diagnostic check failed' });
  }
});

adminPaymentsRouter.post('/cleanup-abandoned', async (_req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const result = await cleanupAbandonedPendingOrders();
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Cleanup failed' });
  }
});

adminPaymentsRouter.get('/plugin-source', async (_req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const pluginPath = path.resolve(process.cwd(), 'wordpress-plugin', 'irepair-headless-checkout-bridge.php');
    if (!fs.existsSync(pluginPath)) {
      return res.status(404).json({ error: 'WordPress mini-plugin file not found.' });
    }
    const content = fs.readFileSync(pluginPath, 'utf8');
    return res.json({ filename: 'irepair-headless-checkout-bridge.php', content });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to read plugin source' });
  }
});
