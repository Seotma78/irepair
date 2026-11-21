export interface CartItemData {
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
}

export interface CartSummaryData {
  cartToken: string;
  items: CartItemData[];
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  couponCode: string | null;
  couponDetails: any;
  shippingCost: number;
  shippingMethodId: string;
  shippingTitle: string;
  vatAmount: number;
  vatRateFormatted: string;
  total: number;
  currency: string;
  freeShippingThreshold: number;
  remainingForFreeShipping: number;
}

export interface CheckoutConfigData {
  storeUrl: string;
  gateways: Array<{
    id: string;
    title: string;
    description: string;
    icon?: string;
  }>;
  shippingMethods: any[];
  currency: string;
  currencySymbol: string;
  freeShippingThreshold: number;
}

export const cartCheckoutApi = {
  async getCart(): Promise<CartSummaryData> {
    const res = await fetch('/api/cart');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load cart');
    return data;
  },

  async addToCart(item: {
    productId: number | string;
    name: string;
    price: number;
    regularPrice?: number;
    quantity?: number;
    image?: string;
    selectedStorage?: string;
    selectedColor?: string;
  }): Promise<CartSummaryData> {
    const res = await fetch('/api/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add item to cart');
    return data;
  },

  async updateQuantity(itemKey: string, quantity: number): Promise<CartSummaryData> {
    const res = await fetch(`/api/cart/items/${encodeURIComponent(itemKey)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update quantity');
    return data;
  },

  async removeItem(itemKey: string): Promise<CartSummaryData> {
    const res = await fetch(`/api/cart/items/${encodeURIComponent(itemKey)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to remove item');
    return data;
  },

  async setShippingMethod(shippingMethodId: string): Promise<CartSummaryData> {
    const res = await fetch('/api/cart/shipping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shippingMethodId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update shipping method');
    return data;
  },

  async applyCoupon(code: string): Promise<CartSummaryData & { message?: string }> {
    const res = await fetch('/api/cart/coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to apply coupon');
    return data;
  },

  async removeCoupon(): Promise<CartSummaryData> {
    const res = await fetch('/api/cart/coupon', {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to remove coupon');
    return data;
  },

  async mergeCart(): Promise<CartSummaryData> {
    const res = await fetch('/api/cart/merge', { method: 'POST' });
    const data = await res.json();
    return data;
  },

  async getCheckoutConfig(): Promise<CheckoutConfigData> {
    const res = await fetch('/api/checkout/config');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load checkout settings');
    return data;
  },

  async createOrder(orderPayload: any) {
    const res = await fetch('/api/checkout/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to place order in WooCommerce');
    return data;
  },

  async getOrderStatus(orderId: number | string, orderKey?: string) {
    const q = orderKey ? `?key=${encodeURIComponent(orderKey)}` : '';
    const res = await fetch(`/api/checkout/order-status/${orderId}${q}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to check order status');
    return data;
  },
};
