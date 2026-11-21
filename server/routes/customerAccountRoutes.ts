import { Router, Response } from 'express';
import {
  CustomerAuthenticatedRequest,
  requireCustomerAuth,
  createRateLimiter,
} from '../middleware/customerAuth';
import {
  wooGetCustomer,
  wooUpdateCustomer,
  wooGetCustomerOrders,
  wooGetOrderById,
  wooUpdateOrder,
  wooAddOrderNote,
  wooGetOrderNotes,
  wooGetCustomerDownloads,
  wooGetCustomerPaymentTokens,
  wooDeleteCustomerPaymentToken,
} from '../services/wooCommerceService';
import { processFormSubmission } from '../services/emailService';
import { getPaymentSettings } from '../services/paymentGatewayService';

export const customerAccountRouter = Router();

// Guest order tracking rate limiter (strictly limited to prevent brute force order enumeration)
const guestTrackingLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 mins
  maxRequests: 8,
  message: 'Too many order tracking lookups. Please wait 15 minutes before checking again.',
  keyGenerator: (req) => `guest_track_${req.ip}`,
});

// ==========================================
// PUBLIC GUEST ORDER TRACKING
// POST /api/account/track-order
// ==========================================
customerAccountRouter.post('/track-order', guestTrackingLimiter, async (req, res): Promise<any> => {
  try {
    const { orderNumber, email } = req.body;
    if (!orderNumber || !email) {
      return res.status(400).json({ error: 'Please enter both your order number and billing email.' });
    }

    const cleanOrderNumber = parseInt(String(orderNumber).replace(/[^0-9]/g, ''), 10);
    const cleanEmail = String(email).trim().toLowerCase();

    if (isNaN(cleanOrderNumber) || cleanOrderNumber <= 0) {
      return res.status(400).json({ error: 'Please enter a valid numeric order number.' });
    }

    const order = await wooGetOrderById(cleanOrderNumber);
    if (!order) {
      return res.status(404).json({ error: 'No order found matching the provided order number and billing email.' });
    }

    // Verify email matches order billing email
    const orderBillingEmail = (order.billing?.email || '').toLowerCase().trim();
    if (orderBillingEmail !== cleanEmail) {
      return res.status(404).json({ error: 'No order found matching the provided order number and billing email.' });
    }

    // Return sanitized tracking details for guest
    return res.json({
      id: order.id,
      number: order.number || order.id,
      status: order.status,
      dateCreated: order.date_created,
      total: order.total,
      currency: order.currency || 'GBP',
      lineItems: (order.line_items || []).map((li: any) => ({
        id: li.id,
        name: li.name,
        quantity: li.quantity,
        total: li.total,
        metaData: li.meta_data,
      })),
      shippingLines: order.shipping_lines,
      billing: {
        firstName: order.billing?.first_name,
        city: order.billing?.city,
        postcode: order.billing?.postcode,
      },
      shipping: {
        firstName: order.shipping?.first_name,
        city: order.shipping?.city,
        postcode: order.shipping?.postcode,
      },
      trackingInfo: order.meta_data?.find((m: any) => m.key === '_tracking_number' || m.key === 'tracking_number' || m.key === '_shipping_tracking_number')?.value || null,
    });
  } catch (err: any) {
    console.error('Guest track order error:', err);
    return res.status(500).json({ error: 'Failed to look up order. Please try again.' });
  }
});

// Apply customer authentication to all following endpoints
customerAccountRouter.use(requireCustomerAuth);

// ==========================================
// GET /api/account/dashboard
// ==========================================
customerAccountRouter.get('/dashboard', async (req: CustomerAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const customerId = req.customer!.customerId;
    const [customer, ordersResult] = await Promise.all([
      wooGetCustomer(customerId),
      wooGetCustomerOrders(customerId, 1, 5),
    ]);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    return res.json({
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        displayName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.username,
        billing: customer.billing,
        shipping: customer.shipping,
        dateCreated: customer.date_created,
      },
      recentOrders: ordersResult.orders,
      totalOrdersCount: ordersResult.total,
    });
  } catch (err: any) {
    console.error('Account dashboard error:', err);
    return res.status(500).json({ error: 'Failed to load account dashboard.' });
  }
});

// ==========================================
// GET /api/account/orders
// ==========================================
customerAccountRouter.get('/orders', async (req: CustomerAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const customerId = req.customer!.customerId;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const perPage = Math.min(50, Math.max(1, parseInt(String(req.query.per_page || '10'), 10)));
    const status = req.query.status as string;

    const result = await wooGetCustomerOrders(customerId, page, perPage, status);
    return res.json(result);
  } catch (err: any) {
    console.error('Account orders list error:', err);
    return res.status(500).json({ error: 'Failed to retrieve customer orders.' });
  }
});

// ==========================================
// GET /api/account/orders/:id
// STRICT SERVER-SIDE OWNERSHIP CHECK
// ==========================================
customerAccountRouter.get('/orders/:id', async (req: CustomerAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const customerId = req.customer!.customerId;
    const orderId = parseInt(req.params.id, 10);

    if (isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const order = await wooGetOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // MANDATORY SECURITY: Strictly verify that logged-in customer owns this order!
    if (Number(order.customer_id) !== Number(customerId)) {
      console.warn(`SECURITY ALERT: Customer ${customerId} attempted to access Order ${orderId} owned by customer ${order.customer_id}`);
      return res.status(403).json({ error: 'Forbidden: You do not have permission to view this order.' });
    }

    // Fetch order status notes / history
    let notes: any[] = [];
    try {
      notes = await wooGetOrderNotes(orderId);
    } catch {}

    // Extract tracking details if present in meta
    const trackingMeta = (order.meta_data || []).find(
      (m: any) => m.key === '_tracking_number' || m.key === 'tracking_number' || m.key === 'carrier' || m.key === '_shipping_provider'
    );

    const paySettings = await getPaymentSettings(false);
    const hostedPayUrl =
      order.status === 'pending' || order.status === 'failed'
        ? `${paySettings.wooHostedBaseUrl}/checkout/order-pay/${order.id}/?pay_for_order=true&key=${encodeURIComponent(order.order_key)}`
        : null;

    return res.json({
      order,
      notes: notes.filter((n: any) => n.customer_note || n.note),
      tracking: trackingMeta ? trackingMeta.value : null,
      payUrl: hostedPayUrl,
    });
  } catch (err: any) {
    console.error('Account order detail error:', err);
    return res.status(500).json({ error: 'Failed to retrieve order details.' });
  }
});

// ==========================================
// POST /api/account/orders/:id/cancel
// ==========================================
customerAccountRouter.post('/orders/:id/cancel', async (req: CustomerAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const customerId = req.customer!.customerId;
    const orderId = parseInt(req.params.id, 10);

    const order = await wooGetOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Ownership check
    if (Number(order.customer_id) !== Number(customerId)) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to cancel this order.' });
    }

    // Check if status is cancellable (WooCommerce allows cancel for pending and on-hold)
    if (!['pending', 'on-hold'].includes(order.status)) {
      return res.status(400).json({
        error: `Order cannot be cancelled because its current status is "${order.status}". Please contact customer support.`,
      });
    }

    const updateRes = await wooUpdateOrder(orderId, { status: 'cancelled' });
    await wooAddOrderNote(orderId, `Order cancelled by customer via storefront.`, true);

    return res.json({
      message: 'Order has been successfully cancelled.',
      order: updateRes.data,
    });
  } catch (err: any) {
    console.error('Order cancel error:', err);
    return res.status(500).json({ error: 'Failed to cancel order.' });
  }
});

// ==========================================
// POST /api/account/orders/:id/refund-request
// ==========================================
customerAccountRouter.post('/orders/:id/refund-request', async (req: CustomerAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const customerId = req.customer!.customerId;
    const orderId = parseInt(req.params.id, 10);
    const { reason, items, details } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Please select a reason for your return/refund request.' });
    }

    const order = await wooGetOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Ownership check
    if (Number(order.customer_id) !== Number(customerId)) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission for this order.' });
    }

    // Record return request note inside WooCommerce order
    const returnNote = `[CUSTOMER RETURN/REFUND REQUEST]\nReason: ${reason}\nItems: ${JSON.stringify(items || 'All items')}\nDetails: ${details || 'None provided'}\nRequested By: Customer #${customerId} (${req.customer!.email})`;
    await wooAddOrderNote(orderId, returnNote, false);

    return res.json({
      message: 'Your return/refund request has been submitted to the iRepair Mobiles operations team. We will review it and email you within 24 business hours.',
    });
  } catch (err: any) {
    console.error('Refund request error:', err);
    return res.status(500).json({ error: 'Failed to submit refund request.' });
  }
});

// ==========================================
// GET & PUT /api/account/addresses
// ==========================================
customerAccountRouter.get('/addresses', async (req: CustomerAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const customerId = req.customer!.customerId;
    const customer = await wooGetCustomer(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    return res.json({
      billing: customer.billing || {},
      shipping: customer.shipping || {},
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to load addresses.' });
  }
});

customerAccountRouter.put('/addresses', async (req: CustomerAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const customerId = req.customer!.customerId;
    const { billing, shipping } = req.body;

    // Validate UK postcode format if country is GB
    const ukPostcodeRegex = /^([A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}|GIR ?0AA)$/i;

    if (billing?.postcode && (billing.country === 'GB' || !billing.country)) {
      if (!ukPostcodeRegex.test(billing.postcode.trim())) {
        return res.status(400).json({ error: 'Please enter a valid UK billing postcode (e.g. RG1 2AA or SW1A 1AA).' });
      }
    }

    if (shipping?.postcode && (shipping.country === 'GB' || !shipping.country)) {
      if (!ukPostcodeRegex.test(shipping.postcode.trim())) {
        return res.status(400).json({ error: 'Please enter a valid UK shipping postcode (e.g. RG1 2AA or SW1A 1AA).' });
      }
    }

    const updatePayload: any = {};
    if (billing) updatePayload.billing = billing;
    if (shipping) updatePayload.shipping = shipping;

    const result = await wooUpdateCustomer(customerId, updatePayload);
    if (result.statusCode >= 200 && result.statusCode < 300) {
      return res.json({
        message: 'Addresses updated successfully in WooCommerce.',
        billing: result.data.billing,
        shipping: result.data.shipping,
      });
    } else {
      return res.status(400).json({ error: result.data?.message || 'Failed to update addresses.' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to save address changes.' });
  }
});

// ==========================================
// PUT /api/account/profile
// ==========================================
customerAccountRouter.put('/profile', async (req: CustomerAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const customerId = req.customer!.customerId;
    const { firstName, lastName, email, currentPassword, newPassword } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const updatePayload: any = {
      first_name: (firstName || '').trim(),
      last_name: (lastName || '').trim(),
      email: email.trim().toLowerCase(),
    };

    // If changing password, validate password rules
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password.' });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
      }
      updatePayload.password = newPassword;
    }

    const result = await wooUpdateCustomer(customerId, updatePayload);
    if (result.statusCode >= 200 && result.statusCode < 300) {
      return res.json({
        message: 'Account details updated successfully.',
        customer: {
          id: result.data.id,
          email: result.data.email,
          firstName: result.data.first_name,
          lastName: result.data.last_name,
          displayName: `${result.data.first_name} ${result.data.last_name}`.trim(),
        },
      });
    } else {
      return res.status(400).json({ error: result.data?.message || 'Failed to update profile.' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update profile details.' });
  }
});

// ==========================================
// GET /api/account/downloads
// ==========================================
customerAccountRouter.get('/downloads', async (req: CustomerAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const customerId = req.customer!.customerId;
    const downloads = await wooGetCustomerDownloads(customerId);
    return res.json(downloads);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to load downloads.' });
  }
});

// ==========================================
// GET & DELETE /api/account/payment-methods
// ==========================================
customerAccountRouter.get('/payment-methods', async (req: CustomerAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const customerId = req.customer!.customerId;
    const tokens = await wooGetCustomerPaymentTokens(customerId);
    // Sanitize tokens (never return secret tokens; only last4, brand, expiry)
    const sanitized = (tokens || []).map((t: any) => ({
      id: t.id,
      brand: t.card_type || t.method || 'Card',
      last4: t.last4 || '****',
      expiryMonth: t.expiry_month,
      expiryYear: t.expiry_year,
      isDefault: t.is_default,
    }));
    return res.json(sanitized);
  } catch (err: any) {
    return res.json([]);
  }
});

customerAccountRouter.delete('/payment-methods/:tokenId', async (req: CustomerAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const customerId = req.customer!.customerId;
    const tokenId = parseInt(req.params.tokenId, 10);
    const result = await wooDeleteCustomerPaymentToken(customerId, tokenId);
    return res.json({ message: 'Saved card removed successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to remove payment method.' });
  }
});

// ==========================================
// GET & POST /api/account/wishlist
// ==========================================
customerAccountRouter.get('/wishlist', async (req: CustomerAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const customerId = req.customer!.customerId;
    const customer = await wooGetCustomer(customerId);
    const metaItem = (customer?.meta_data || []).find((m: any) => m.key === '_irepair_wishlist');
    let wishlistProductIds: number[] = [];
    if (metaItem && metaItem.value) {
      try {
        wishlistProductIds = Array.isArray(metaItem.value) ? metaItem.value : JSON.parse(metaItem.value);
      } catch {}
    }
    return res.json({ productIds: wishlistProductIds });
  } catch (err: any) {
    return res.json({ productIds: [] });
  }
});

customerAccountRouter.post('/wishlist', async (req: CustomerAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const customerId = req.customer!.customerId;
    const { productIds } = req.body;
    if (!Array.isArray(productIds)) {
      return res.status(400).json({ error: 'productIds must be an array of numbers' });
    }

    await wooUpdateCustomer(customerId, {
      meta_data: [{ key: '_irepair_wishlist', value: productIds }],
    });

    return res.json({ message: 'Wishlist updated', productIds });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update wishlist.' });
  }
});

// ==========================================
// POST /api/account/gdpr-request
// ==========================================
customerAccountRouter.post('/gdpr-request', async (req: CustomerAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const customerId = req.customer!.customerId;
    const { requestType, reason } = req.body; // 'export' | 'erasure'

    const customer = await wooGetCustomer(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Submit request via system form submission
    await processFormSubmission({
      formTitle: `GDPR Customer ${requestType === 'erasure' ? 'Account Erasure' : 'Data Export'} Request`,
      subject: `[GDPR REQUEST] ${requestType?.toUpperCase()} for Customer #${customerId}`,
      toEmail: 'privacy@irepair-mobiles.co.uk',
      fields: [
        { label: 'Customer ID', value: String(customerId) },
        { label: 'Customer Name', value: `${customer.first_name} ${customer.last_name}` },
        { label: 'Customer Email', value: customer.email },
        { label: 'Request Type', value: requestType },
        { label: 'Reason / Notes', value: reason || 'Not specified' },
        { label: 'Submitted Date', value: new Date().toISOString() },
      ],
      ip: req.ip,
    });

    return res.json({
      message: `Your GDPR ${requestType === 'erasure' ? 'account deletion' : 'data export'} request has been logged and submitted to the data protection officer. You will be contacted at ${customer.email} within 30 days.`,
    });
  } catch (err: any) {
    console.error('GDPR request error:', err);
    return res.status(500).json({ error: 'Failed to submit privacy request.' });
  }
});
