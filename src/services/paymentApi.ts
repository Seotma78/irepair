export type AllowedPaymentMethod = 'card' | 'apple_pay' | 'google_pay';
export type CheckoutHandoffStyle = 'hosted_checkout' | 'order_pay';

export interface PublicPaymentConfig {
  useWooHosted: boolean;
  isProductionForced: boolean;
  isSimulatedMode: boolean;
  handoffStyle: CheckoutHandoffStyle;
  isOnsiteMode?: boolean;
  publishableKey?: string;
  stripeMode?: 'test' | 'live';
  supportsDirectMultiItemHandoff?: boolean;
  wooHostedBaseUrl: string;
  allowedMethods: AllowedPaymentMethod[];
  wallets: {
    applePay: boolean;
    googlePay: boolean;
    card: boolean;
  };
  enableProductPage: boolean;
  enableCartPage: boolean;
  enableMiniCart: boolean;
  enableCheckoutPage: boolean;
  buttonStyle: {
    theme: 'black' | 'white' | 'white-outline';
    type: 'buy' | 'plain' | 'book' | 'donate' | 'checkout';
    height: number;
    borderRadius: number;
    columns: number;
    gap: number;
  };
  showDivider: boolean;
  dividerText: string;
  unselectedVariationAction: 'disable' | 'hide';
  helperText: string;
  gatewayAvailable: boolean;
  unavailableMessage?: string;
  adminWarning?: string;
  showAdminTestModeBadge: boolean;
  dispatchNote: string;
  supportEmail: string;
  currency: string;
  country: string;
}

export interface PaymentCartItemPayload {
  productId: string | number;
  variationId?: string | number | null;
  quantity: number;
  selectedAttributes?: Record<string, string>;
}

export interface LiveShippingOption {
  id: string;
  methodId: string;
  instanceId?: number;
  title: string;
  cost: number;
  requiresMinAmount?: number;
}

export interface VerifiedOrderDetails {
  isSimulated: boolean;
  id: number | string;
  number: string;
  orderKey?: string;
  status: string;
  isPaid: boolean;
  dateCreated: string;
  currency: string;
  total: string;
  totalTax: string;
  shippingTotal: string;
  discountTotal: string;
  paymentMethod?: string;
  paymentMethodTitle: string;
  billing: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address1: string;
    address2?: string;
    city: string;
    postcode: string;
    country: string;
  };
  shipping: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    postcode: string;
    country: string;
  };
  lineItems: Array<{
    id?: number;
    name: string;
    quantity: number;
    total: string;
    meta?: Array<{ key: string; value: string }>;
  }>;
  shippingLines?: Array<{
    methodTitle: string;
    total: string;
  }>;
  payUrl?: string | null;
  dispatchNote?: string;
  supportEmail?: string;
}

let cachedConfig: PublicPaymentConfig | null = null;
let inFlightConfigPromise: Promise<PublicPaymentConfig | null> | null = null;

export function clearCachedPaymentConfig() {
  cachedConfig = null;
}

export async function fetchPaymentConfig(forceRefresh = false): Promise<PublicPaymentConfig | null> {
  if (cachedConfig && !forceRefresh) {
    return cachedConfig;
  }
  if (inFlightConfigPromise && !forceRefresh) {
    return inFlightConfigPromise;
  }

  inFlightConfigPromise = (async () => {
    try {
      const headers: Record<string, string> = {};
      if (typeof window !== 'undefined') {
        const adminToken = localStorage.getItem('admin_token');
        if (adminToken) {
          headers.Authorization = `Bearer ${adminToken}`;
        }
      }
      const res = await fetch('/api/payments/config', { headers });
      if (!res.ok) {
        throw new Error(`Config HTTP ${res.status}`);
      }
      const data: PublicPaymentConfig = await res.json();
      cachedConfig = data;
      return data;
    } catch (err) {
      console.warn('Failed to fetch payment config:', err);
      return null;
    } finally {
      inFlightConfigPromise = null;
    }
  })();

  return inFlightConfigPromise;
}

export async function createHostedHandoff(payload: {
  items: PaymentCartItemPayload[];
  couponCode?: string | null;
  source: 'product' | 'cart' | 'mini-cart' | 'checkout';
  idempotencyKey?: string;
}): Promise<{
  success: boolean;
  handoffId: string;
  mode?: 'bridge_token' | 'direct_woo_checkout' | 'order_pay_required';
  redirectUrl: string;
  expiresAt: string;
  itemsCount?: number;
  subtotal?: number;
  message?: string;
}> {
  const res = await fetch('/api/payments/handoff', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(payload.idempotencyKey ? { 'Idempotency-Key': payload.idempotencyKey } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Unable to start WooCommerce hosted checkout.');
  }
  return data;
}

export async function createHostedOrderPay(payload: {
  items: PaymentCartItemPayload[];
  billing: any;
  shipping?: any;
  shippingOptionId?: string;
  couponCode?: string | null;
  customerNote?: string;
  idempotencyKey?: string;
}): Promise<{
  success: boolean;
  orderId: number;
  orderNumber: string;
  orderKey: string;
  total: string;
  payUrl: string;
}> {
  const res = await fetch('/api/payments/order-pay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(payload.idempotencyKey ? { 'Idempotency-Key': payload.idempotencyKey } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Unable to create WooCommerce order for payment.');
  }
  return data;
}

export async function fetchLiveShippingOptions(subtotal: number): Promise<{
  rates: LiveShippingOption[];
  taxEnabled: boolean;
  pricesIncludeTax: boolean;
}> {
  const res = await fetch(`/api/payments/shipping-options?subtotal=${encodeURIComponent(String(subtotal))}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Unable to load shipping options.');
  }
  return data;
}

export async function validateCouponLive(code: string, subtotal: number): Promise<{
  valid: boolean;
  coupon?: {
    code: string;
    discountType: string;
    amount: number;
    discount: number;
    freeShipping: boolean;
    description: string;
  };
  error?: string;
}> {
  const res = await fetch('/api/payments/validate-coupon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, subtotal }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Invalid coupon code.');
  }
  return data;
}

export async function fetchOrderPayUrl(orderId: number | string): Promise<{
  success: boolean;
  orderId: number;
  orderNumber: string;
  payUrl: string;
}> {
  const res = await fetch(`/api/payments/order/${encodeURIComponent(String(orderId))}/pay-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Unable to generate WooCommerce payment link.');
  }
  return data;
}

export async function createSimulatedTestOrder(payload: {
  items: PaymentCartItemPayload[];
  billing: any;
  paymentMethodTitle: string;
}): Promise<{
  success: boolean;
  isSimulated: true;
  orderId: string;
  orderNumber: string;
  orderKey: string;
  total: number;
  status: 'simulated';
}> {
  const res = await fetch('/api/payments/simulated-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Simulated order failed.');
  }
  return data;
}

export async function fetchVerifiedOrder(
  orderId: string | number,
  orderKey?: string | null
): Promise<{ order: VerifiedOrderDetails }> {
  const qs = orderKey ? `?key=${encodeURIComponent(orderKey)}` : '';
  const res = await fetch(`/api/payments/order/${encodeURIComponent(String(orderId))}${qs}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Could not verify order with WooCommerce.');
  }
  return data;
}

export interface OnsiteIntentResponse {
  success: boolean;
  orderId: number;
  orderNumber: string;
  orderKey: string;
  total: string;
  currency: string;
  clientSecret: string;
  paymentIntentId: string;
  publishableKey: string;
  stripeMode: 'test' | 'live';
}

export async function calculateOnsiteExpressShipping(payload: {
  items: PaymentCartItemPayload[];
  couponCode?: string | null;
  shippingRateId?: string;
}): Promise<{
  success: boolean;
  items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number; image: string }>;
  subtotal: number;
  discount: number;
  couponCode: string | null;
  freeShipping: boolean;
  shippingCost: number;
  selectedRateId: string;
  shippingOptions: LiveShippingOption[];
  vatAmount: number;
  total: number;
  totalPence: number;
}> {
  const res = await fetch('/api/payments/onsite/express-shipping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Unable to calculate live shipping & order totals.');
  }
  return data;
}

export async function createOnsitePaymentIntent(payload: {
  items: PaymentCartItemPayload[];
  billing: any;
  shipping?: any;
  shippingOptionId?: string;
  couponCode?: string | null;
  customerNote?: string;
  idempotencyKey?: string;
}): Promise<OnsiteIntentResponse> {
  const res = await fetch('/api/payments/onsite/create-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(payload.idempotencyKey ? { 'Idempotency-Key': payload.idempotencyKey } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Unable to initialize on-site Stripe checkout.');
  }
  return data;
}

export async function createOnsiteExistingOrderIntent(
  orderId: number | string,
  orderKey?: string | null
): Promise<OnsiteIntentResponse> {
  const res = await fetch(`/api/payments/onsite/order-intent/${encodeURIComponent(String(orderId))}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderKey: orderKey || undefined }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Unable to resume payment for this order.');
  }
  return data;
}

export async function confirmOnsitePayment(payload: {
  orderId: number | string;
  orderKey?: string | null;
  paymentIntentId: string;
}): Promise<{ success: boolean; order: VerifiedOrderDetails }> {
  const res = await fetch('/api/payments/onsite/confirm-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to verify Stripe payment with WooCommerce.');
  }
  return data;
}

