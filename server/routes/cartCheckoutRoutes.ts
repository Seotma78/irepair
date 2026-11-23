import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getDb } from '../db';
import {
  CustomerAuthenticatedRequest,
  extractCustomerToken,
  createRateLimiter,
} from '../middleware/customerAuth';
import {
  wooCreateOrder,
  wooGetOrderById,
  wooGetPaymentGateways,
  wooGetShippingMethods,
  wooValidateCoupon,
  getWooCommerceConfig,
  requestWoo,
} from '../services/wooCommerceService';
import { syncSingleProduct } from '../services/productSyncService';
import { getPaymentSettings, isProductionRuntime } from '../services/paymentGatewayService';

export const cartCheckoutRouter = Router();

// Order creation rate limiter (max 10 orders per 15 mins per IP to prevent spam orders)
const orderCreationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many checkout submissions. Please wait a few moments before trying again.',
});

interface CartItem {
  key: string;
  productId: number | string;
  name: string;
  price: number;
  regularPrice?: number;
  quantity: number;
  image: string;
  variationId?: number;
  selectedStorage?: string;
  selectedColor?: string;
  isOutOfStock?: boolean;
}

interface CartRecord {
  cart_token: string;
  customer_id: number | null;
  items_json: string;
  coupon_code: string | null;
  shipping_method_id: string | null;
  updated_at: string;
}

// Get or create persistent cart token from request header/cookie
function getCartToken(req: Request, res?: Response): string {
  let token = req.headers['cart-token'] as string || req.cookies?.wc_cart_token;
  if (!token || typeof token !== 'string' || token.length < 8) {
    token = `cart_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    if (res) {
      const forwardedProto = req.headers['x-forwarded-proto'];
      const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
      const isHttps = Boolean(req.secure || (proto && proto.split(',')[0].trim().toLowerCase() === 'https'));
      res.cookie('wc_cart_token', token, {
        httpOnly: false, // Accessible to front-end for Store API Cart-Token header
        secure: isHttps,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
      });
    }
  }
  return token;
}

async function loadCart(token: string, customerId?: number | null): Promise<{
  token: string;
  items: CartItem[];
  couponCode: string | null;
  shippingMethodId: string | null;
}> {
  const db = await getDb();
  let row: CartRecord | null = null;

  if (customerId) {
    row = db.get<CartRecord>('SELECT * FROM store_carts WHERE customer_id = ?', [customerId]);
  }
  if (!row) {
    row = db.get<CartRecord>('SELECT * FROM store_carts WHERE cart_token = ?', [token]);
  }

  if (!row) {
    return {
      token,
      items: [],
      couponCode: null,
      shippingMethodId: 'standard',
    };
  }

  let items: CartItem[] = [];
  try {
    items = JSON.parse(row.items_json || '[]');
  } catch {
    items = [];
  }

  return {
    token: row.cart_token || token,
    items,
    couponCode: row.coupon_code || null,
    shippingMethodId: row.shipping_method_id || 'standard',
  };
}

async function saveCart(
  token: string,
  items: CartItem[],
  couponCode: string | null = null,
  shippingMethodId: string | null = 'standard',
  customerId?: number | null
) {
  const db = await getDb();
  const now = new Date().toISOString();
  db.run(
    `INSERT OR REPLACE INTO store_carts (cart_token, customer_id, items_json, coupon_code, shipping_method_id, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [token, customerId || null, JSON.stringify(items), couponCode, shippingMethodId, now]
  );
}

// Calculate full cart financials
async function calculateCartSummary(items: CartItem[], couponCode: string | null, shippingMethodId: string | null) {
  const subtotal = items.reduce((acc, item) => acc + (Number(item.price) || 0) * (item.quantity || 1), 0);
  
  // Shipping calculation (Free standard shipping over £50)
  const isFreeEligible = subtotal >= 50;
  let shippingCost = 0;
  let shippingTitle = 'Royal Mail Tracked 48';

  if (shippingMethodId === 'express') {
    shippingCost = 6.95;
    shippingTitle = 'Royal Mail Special Delivery (Next Day)';
  } else if (shippingMethodId === 'collection') {
    shippingCost = 0;
    shippingTitle = 'Store Collection (Free across 8 UK Branches)';
  } else {
    shippingCost = isFreeEligible ? 0 : 4.95;
    shippingTitle = isFreeEligible ? 'Free UK Tracked Delivery (Over £50)' : 'Royal Mail Tracked 48';
  }

  // Coupon discount calculation
  let discountAmount = 0;
  let couponDetails: any = null;

  if (couponCode) {
    try {
      couponDetails = await wooValidateCoupon(couponCode);
      if (couponDetails) {
        const discountType = couponDetails.discount_type; // 'percent', 'fixed_cart', 'fixed_product'
        const amount = parseFloat(couponDetails.amount || '0');
        if (discountType === 'percent') {
          discountAmount = (subtotal * amount) / 100;
        } else {
          discountAmount = Math.min(subtotal, amount);
        }
      }
    } catch (e) {
      console.warn('Coupon validation error:', e);
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  
  // UK VAT calculation (20% standard rate included in UK retail prices)
  const vatRate = 0.20;
  const taxableTotal = discountedSubtotal + shippingCost;
  const vatAmount = (taxableTotal / (1 + vatRate)) * vatRate;

  const total = discountedSubtotal + shippingCost;

  return {
    items,
    itemCount: items.reduce((acc, i) => acc + i.quantity, 0),
    subtotal: Number(subtotal.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    couponCode: discountAmount > 0 ? couponCode : null,
    couponDetails: discountAmount > 0 ? {
      code: couponDetails.code,
      type: couponDetails.discount_type,
      amount: couponDetails.amount,
      description: couponDetails.description,
    } : null,
    shippingCost: Number(shippingCost.toFixed(2)),
    shippingMethodId: shippingMethodId || 'standard',
    shippingTitle,
    vatAmount: Number(vatAmount.toFixed(2)),
    vatRateFormatted: '20% UK VAT (Included)',
    total: Number(total.toFixed(2)),
    currency: 'GBP',
    freeShippingThreshold: 50.00,
    remainingForFreeShipping: Math.max(0, 50.00 - subtotal),
  };
}

// ==========================================
// GET /api/cart
// ==========================================
cartCheckoutRouter.get('/cart', async (req: Request, res: Response): Promise<any> => {
  try {
    const customer = extractCustomerToken(req);
    const token = getCartToken(req, res);
    const cart = await loadCart(token, customer?.customerId);
    const summary = await calculateCartSummary(cart.items, cart.couponCode, cart.shippingMethodId);

    res.setHeader('Cart-Token', token);
    return res.json({
      cartToken: token,
      ...summary,
    });
  } catch (err: any) {
    console.error('Get cart error:', err);
    return res.status(500).json({ error: 'Failed to retrieve cart' });
  }
});

// ==========================================
// POST /api/cart/items
// ==========================================
cartCheckoutRouter.post('/cart/items', async (req: Request, res: Response): Promise<any> => {
  try {
    const customer = extractCustomerToken(req);
    const token = getCartToken(req, res);
    const { productId, name, price, regularPrice, quantity = 1, image, selectedStorage, selectedColor } = req.body;

    if (!productId || !name || price === undefined) {
      return res.status(400).json({ error: 'Invalid product payload for cart' });
    }

    const qty = Math.max(1, parseInt(String(quantity), 10));
    const cart = await loadCart(token, customer?.customerId);

    // Create unique key based on productId and selected options
    const itemKey = `${productId}_${selectedStorage || 'std'}_${selectedColor || 'std'}`;
    const existingIndex = cart.items.findIndex((i) => i.key === itemKey);

    if (existingIndex !== -1) {
      cart.items[existingIndex].quantity += qty;
    } else {
      cart.items.push({
        key: itemKey,
        productId,
        name,
        price: Number(price),
        regularPrice: regularPrice ? Number(regularPrice) : undefined,
        quantity: qty,
        image: image || '/src/assets/images/irepair-logo.svg',
        selectedStorage,
        selectedColor,
      });
    }

    await saveCart(token, cart.items, cart.couponCode, cart.shippingMethodId, customer?.customerId);
    const summary = await calculateCartSummary(cart.items, cart.couponCode, cart.shippingMethodId);

    res.setHeader('Cart-Token', token);
    return res.json({
      message: `${name} added to cart`,
      cartToken: token,
      ...summary,
    });
  } catch (err: any) {
    console.error('Add cart item error:', err);
    return res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

// ==========================================
// PUT /api/cart/items/:itemKey
// ==========================================
cartCheckoutRouter.put('/cart/items/:itemKey', async (req: Request, res: Response): Promise<any> => {
  try {
    const customer = extractCustomerToken(req);
    const token = getCartToken(req, res);
    const { itemKey } = req.params;
    const { quantity } = req.body;

    const cart = await loadCart(token, customer?.customerId);
    const newQty = parseInt(String(quantity), 10);

    if (isNaN(newQty) || newQty <= 0) {
      // Remove item
      cart.items = cart.items.filter((i) => i.key !== itemKey);
    } else {
      const item = cart.items.find((i) => i.key === itemKey);
      if (item) {
        item.quantity = newQty;
      }
    }

    await saveCart(token, cart.items, cart.couponCode, cart.shippingMethodId, customer?.customerId);
    const summary = await calculateCartSummary(cart.items, cart.couponCode, cart.shippingMethodId);

    return res.json(summary);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update item quantity' });
  }
});

// ==========================================
// DELETE /api/cart/items/:itemKey
// ==========================================
cartCheckoutRouter.delete('/cart/items/:itemKey', async (req: Request, res: Response): Promise<any> => {
  try {
    const customer = extractCustomerToken(req);
    const token = getCartToken(req, res);
    const { itemKey } = req.params;

    const cart = await loadCart(token, customer?.customerId);
    cart.items = cart.items.filter((i) => i.key !== itemKey);

    await saveCart(token, cart.items, cart.couponCode, cart.shippingMethodId, customer?.customerId);
    const summary = await calculateCartSummary(cart.items, cart.couponCode, cart.shippingMethodId);

    return res.json(summary);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete item from cart' });
  }
});

// ==========================================
// POST /api/cart/shipping
// ==========================================
cartCheckoutRouter.post('/cart/shipping', async (req: Request, res: Response): Promise<any> => {
  try {
    const customer = extractCustomerToken(req);
    const token = getCartToken(req, res);
    const { shippingMethodId } = req.body;

    const cart = await loadCart(token, customer?.customerId);
    cart.shippingMethodId = shippingMethodId || 'standard';

    await saveCart(token, cart.items, cart.couponCode, cart.shippingMethodId, customer?.customerId);
    const summary = await calculateCartSummary(cart.items, cart.couponCode, cart.shippingMethodId);

    return res.json(summary);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update shipping method' });
  }
});

// ==========================================
// POST /api/cart/coupon
// ==========================================
cartCheckoutRouter.post('/cart/coupon', async (req: Request, res: Response): Promise<any> => {
  try {
    const customer = extractCustomerToken(req);
    const token = getCartToken(req, res);
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Please enter a coupon code.' });
    }

    const cleanCode = code.trim().toLowerCase();
    const coupon = await wooValidateCoupon(cleanCode);

    if (!coupon) {
      return res.status(400).json({ error: `Coupon "${code}" does not exist or has expired.` });
    }

    const cart = await loadCart(token, customer?.customerId);
    cart.couponCode = cleanCode;

    await saveCart(token, cart.items, cart.couponCode, cart.shippingMethodId, customer?.customerId);
    const summary = await calculateCartSummary(cart.items, cart.couponCode, cart.shippingMethodId);

    return res.json({
      message: `Coupon code "${cleanCode.toUpperCase()}" applied successfully!`,
      ...summary,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to apply coupon.' });
  }
});

// ==========================================
// DELETE /api/cart/coupon
// ==========================================
cartCheckoutRouter.delete('/cart/coupon', async (req: Request, res: Response): Promise<any> => {
  try {
    const customer = extractCustomerToken(req);
    const token = getCartToken(req, res);

    const cart = await loadCart(token, customer?.customerId);
    cart.couponCode = null;

    await saveCart(token, cart.items, null, cart.shippingMethodId, customer?.customerId);
    const summary = await calculateCartSummary(cart.items, null, cart.shippingMethodId);

    return res.json({
      message: 'Coupon removed.',
      ...summary,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to remove coupon.' });
  }
});

// ==========================================
// POST /api/cart/merge (Called on login)
// ==========================================
cartCheckoutRouter.post('/cart/merge', async (req: Request, res: Response): Promise<any> => {
  try {
    const customer = extractCustomerToken(req);
    if (!customer) {
      return res.json({ message: 'No customer session to merge' });
    }

    const guestToken = getCartToken(req);
    const guestCart = await loadCart(guestToken, null);
    const customerCart = await loadCart(guestToken, customer.customerId);

    // Merge guest items into customer cart
    for (const gItem of guestCart.items) {
      const existing = customerCart.items.find((cItem) => cItem.key === gItem.key);
      if (existing) {
        existing.quantity += gItem.quantity;
      } else {
        customerCart.items.push(gItem);
      }
    }

    await saveCart(customerCart.token, customerCart.items, guestCart.couponCode || customerCart.couponCode, customerCart.shippingMethodId, customer.customerId);
    const summary = await calculateCartSummary(customerCart.items, customerCart.couponCode, customerCart.shippingMethodId);

    return res.json(summary);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to merge cart' });
  }
});

// ==========================================
// GET /api/checkout/config
// ==========================================
cartCheckoutRouter.get('/checkout/config', async (_req: Request, res: Response): Promise<any> => {
  try {
    const [paySettings, shippingMethods, config] = await Promise.all([
      getPaymentSettings(false),
      wooGetShippingMethods(),
      getWooCommerceConfig(),
    ]);

    const allowedGateways: Array<{ id: string; title: string; description: string; icon: string }> = [];
    if (paySettings.allowedMethods.includes('card')) {
      allowedGateways.push({
        id: 'stripe',
        title: 'Debit / Credit Card (Stripe)',
        description: 'Pay securely via Stripe on WooCommerce hosted checkout.',
        icon: '',
      });
    }
    if (paySettings.allowedMethods.includes('apple_pay')) {
      allowedGateways.push({
        id: 'stripe_apple_pay',
        title: 'Apple Pay (Stripe)',
        description: 'Pay quickly with Apple Pay via Stripe.',
        icon: '',
      });
    }
    if (paySettings.allowedMethods.includes('google_pay')) {
      allowedGateways.push({
        id: 'stripe_google_pay',
        title: 'Google Pay (Stripe)',
        description: 'Pay quickly with Google Pay via Stripe.',
        icon: '',
      });
    }

    return res.json({
      storeUrl: paySettings.wooHostedBaseUrl || config.storeUrl,
      useWooHosted: paySettings.useWooHosted,
      gateways: allowedGateways,
      shippingMethods,
      currency: 'GBP',
      currencySymbol: '£',
      freeShippingThreshold: 50.00,
    });
  } catch (err: any) {
    console.error('Checkout config error:', err);
    return res.status(500).json({ error: 'Failed to load checkout settings' });
  }
});

// ==========================================
// POST /api/checkout/validate-item
// Live validation of price and stock before adding to cart / ordering
// ==========================================
cartCheckoutRouter.post('/checkout/validate-item', async (req: Request, res: Response): Promise<any> => {
  try {
    const { productId, variationId, quantity = 1 } = req.body;
    if (!productId) {
      return res.status(400).json({ error: 'Missing productId parameter' });
    }

    const db = await getDb();
    let effectivePrice = 0;
    let inStock = true;
    let stockQuantity: number | null = null;
    let sku = '';
    let name = '';

    if (variationId) {
      // Look up in product_variations
      const vRow = db.get<any>(
        'SELECT * FROM product_variations WHERE id = ? OR external_id = ?',
        [variationId, parseInt(String(variationId).replace(/\D+/g, ''), 10) || -1]
      );
      if (vRow) {
        effectivePrice = vRow.price || vRow.regular_price || 0;
        inStock = vRow.stock_status === 'instock' || (typeof vRow.stock_quantity === 'number' && vRow.stock_quantity > 0);
        stockQuantity = vRow.stock_quantity;
        sku = vRow.sku || '';
        name = vRow.name || '';
      }
    } else {
      // Look up parent product
      const pRow = db.get<any>(
        'SELECT * FROM products WHERE id = ? OR slug = ? OR external_id = ?',
        [productId, productId, parseInt(String(productId).replace(/\D+/g, ''), 10) || -1]
      );
      if (pRow) {
        effectivePrice = pRow.price || 0;
        inStock = pRow.stock_status === 'instock' && pRow.stock_quantity !== 0;
        stockQuantity = pRow.stock_quantity;
        sku = pRow.sku || '';
        name = pRow.title || pRow.name || '';
      }
    }

    return res.json({
      valid: true,
      inStock,
      price: effectivePrice,
      stockQuantity,
      sku,
      name,
      message: inStock ? 'In stock' : 'Out of stock'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Validation failed' });
  }
});

// ==========================================
// POST /api/checkout/order
// CREATES THE ORDER DIRECTLY IN WOOCOMMERCE!
// ==========================================
cartCheckoutRouter.post('/checkout/order', orderCreationLimiter, async (_req: Request, res: Response): Promise<any> => {
  return res.status(403).json({
    error: 'Legacy /api/checkout/order is disabled. Use /api/payments/handoff, /api/payments/order-pay, or /api/payments/simulated-order (dev/staging only).',
  });
});

// ==========================================
// GET /api/checkout/order-status/:id
// Poll order status to confirm payment
// ==========================================
cartCheckoutRouter.get('/checkout/order-status/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const orderKey = req.query.key as string;
    const customer = extractCustomerToken(req);

    if (isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const order = await wooGetOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Ownership or Key check
    const isOwner = customer && Number(order.customer_id) === Number(customer.customerId);
    const hasMatchingKey = orderKey && order.order_key === orderKey;

    if (!isOwner && !hasMatchingKey) {
      return res.status(403).json({ error: 'Forbidden: Invalid order access key' });
    }

    const isPaid = ['processing', 'completed'].includes(order.status);

    return res.json({
      id: order.id,
      number: order.number || order.id,
      status: order.status,
      isPaid,
      total: order.total,
      currency: order.currency,
      dateCreated: order.date_created,
      dateModified: order.date_modified,
      billing: {
        firstName: order.billing?.first_name,
        email: order.billing?.email,
      },
      paymentMethod: order.payment_method_title,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to check order status' });
  }
});
