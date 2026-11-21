import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  getExpressCheckoutSettings,
  saveExpressCheckoutSettings,
  validateSingleItem,
  calculateShippingAndTaxForWallet,
  createExpressOrderAndPaymentIntent,
  cancelExpressOrder,
  runDiagnosticTest,
} from '../services/expressCheckoutService';
import { extractCustomerToken, createRateLimiter } from '../middleware/customerAuth';
import { authenticateToken, requireRole, verifyToken } from '../middleware/auth';
import {
  getPaymentSettings,
  getVerifiedOrderForConfirmation,
  isProductionRuntime,
} from '../services/paymentGatewayService';
import { getDb } from '../db';

export const expressCheckoutRouter = Router();
export const adminExpressCheckoutRouter = Router();

// Rate limiter for express checkout endpoints (max 15 requests per 10 minutes per IP)
const expressLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 15,
  message: 'Too many express checkout attempts. Please try again in a few moments.',
});

// ==========================================
// PUBLIC EXPRESS CHECKOUT ENDPOINTS
// ==========================================

/**
 * GET /api/express-checkout/config
 * Returns public configuration (Publishable Key, button appearance, enabled locations)
 */
expressCheckoutRouter.get('/config', async (req: Request, res: Response): Promise<any> => {
  try {
    const [settings, paySettings] = await Promise.all([
      getExpressCheckoutSettings(false),
      getPaymentSettings(false),
    ]);

    let isAdmin = false;
    try {
      const authHeader = req.headers.authorization;
      const token =
        authHeader && authHeader.startsWith('Bearer ')
          ? authHeader.split(' ')[1]
          : req.cookies?.admin_token;
      if (token) {
        const verified = verifyToken(token);
        isAdmin = Boolean(verified && (verified.role === 'admin' || verified.role === 'super_admin'));
      }
    } catch (_) {}

    return res.json({
      enabled: settings.enabled,
      useWooHosted: paySettings.useWooHosted,
      isProductionForced: paySettings.isProductionForced,
      mode: paySettings.useWooHosted ? 'hosted' : settings.mode,
      isTestMode: !paySettings.useWooHosted && settings.mode === 'test',
      showAdminTestBadge: isAdmin && !paySettings.useWooHosted,
      publishableKey: '',
      enableProductPage: paySettings.enableProductPage,
      enableCartPage: paySettings.enableCartPage,
      enableMiniCart: paySettings.enableMiniCart,
      enableCheckoutPage: paySettings.enableCheckoutPage,
      wallets: {
        applePay: paySettings.allowedMethods.includes('apple_pay'),
        googlePay: paySettings.allowedMethods.includes('google_pay'),
        link: false,
      },
      buttonStyle: {
        theme: paySettings.buttonTheme,
        type: paySettings.buttonType,
        height: paySettings.buttonHeight,
        borderRadius: paySettings.buttonBorderRadius,
        columns: paySettings.buttonColumns,
        gap: paySettings.buttonGap,
      },
      showDivider: paySettings.showDivider,
      dividerText: paySettings.dividerText,
      unselectedVariationAction: paySettings.unselectedVariationAction,
      helperText: paySettings.helperText,
      allowGuestCheckout: settings.allowGuestCheckout,
      collectPhoneNumber: settings.collectPhoneNumber,
      appleMerchantId: settings.appleMerchantId,
      currency: 'GBP',
      country: 'GB',
    });
  } catch (err: any) {
    console.error('Express checkout config error:', err);
    return res.status(500).json({ error: 'Failed to retrieve express checkout configuration' });
  }
});

/**
 * POST /api/express-checkout/create-session
 * Validates product & variations against WooCommerce without modifying existing cart
 */
expressCheckoutRouter.post('/create-session', async (_req: Request, res: Response): Promise<any> => {
  return res.status(403).json({
    error: 'Legacy built-in express checkout is permanently disabled. Use /api/payments/handoff (hosted) or /api/payments/simulated-order (dev only).',
  });
});

/**
 * POST /api/express-checkout/shipping-rates
 * Disabled: shipping calculations run inside WooCommerce hosted checkout or /api/payments/shipping-options
 */
expressCheckoutRouter.post('/shipping-rates', async (_req: Request, res: Response): Promise<any> => {
  return res.status(403).json({
    error: 'Legacy built-in express shipping calculation is permanently disabled. Use /api/payments/shipping-options.',
  });
});

/**
 * POST /api/express-checkout/create-order
 * Disabled: legacy Stripe PaymentIntent / timestamp order creation is permanently disabled
 */
expressCheckoutRouter.post('/create-order', expressLimiter, async (_req: Request, res: Response): Promise<any> => {
  return res.status(403).json({
    error: 'Legacy built-in express order creation is permanently disabled. Use /api/payments/handoff or /api/payments/simulated-order (dev only).',
  });
});

/**
 * GET /api/express-checkout/order-status/:id
 * Polls order status until verified as paid ('processing' | 'completed')
 */
expressCheckoutRouter.get('/order-status/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const customer = extractCustomerToken(req);
    const orderKey = typeof req.query.key === 'string' ? req.query.key : undefined;
    const result = await getVerifiedOrderForConfirmation(req.params.id, orderKey, customer?.customerId);
    if (result.error || !result.order) {
      return res.status(result.statusCode || 404).json({ error: result.error || 'Order not found' });
    }
    return res.json(result.order);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to verify order status' });
  }
});

/**
 * POST /api/express-checkout/cancel-order
 * Cancels or marks pending order only in simulated dev/staging mode
 */
expressCheckoutRouter.post('/cancel-order', async (_req: Request, res: Response): Promise<any> => {
  return res.status(403).json({
    error: 'Legacy built-in express order cancellation is disabled.',
  });
});

// ==========================================
// ADMIN EXPRESS CHECKOUT MANAGEMENT
// ==========================================

/**
 * GET /api/admin/express-checkout/settings
 */
adminExpressCheckoutRouter.get('/settings', authenticateToken, requireRole('admin', 'super_admin'), async (req: Request, res: Response): Promise<any> => {
  try {
    const settings = await getExpressCheckoutSettings(false);
    return res.json(settings);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve express checkout settings' });
  }
});

/**
 * PUT /api/admin/express-checkout/settings
 */
adminExpressCheckoutRouter.put('/settings', authenticateToken, requireRole('admin', 'super_admin'), async (req: Request, res: Response): Promise<any> => {
  try {
    const updated = await saveExpressCheckoutSettings(req.body);
    return res.json({
      success: true,
      message: 'Express checkout settings updated successfully',
      settings: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update settings' });
  }
});

/**
 * POST /api/admin/express-checkout/test-config
 * Runs full diagnostics (Stripe keys, Apple Pay domain, webhooks, shipping zones)
 */
adminExpressCheckoutRouter.post('/test-config', authenticateToken, requireRole('admin', 'super_admin'), async (req: Request, res: Response): Promise<any> => {
  try {
    const result = await runDiagnosticTest();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Diagnostics failed' });
  }
});
