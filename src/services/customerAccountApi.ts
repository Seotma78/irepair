export interface WooCommerceOrder {
  id: number;
  number: string | number;
  status: string;
  currency: string;
  date_created: string;
  total: string;
  subtotal?: string;
  shipping_total?: string;
  total_tax?: string;
  discount_total?: string;
  payment_method: string;
  payment_method_title: string;
  billing: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2?: string;
    city: string;
    state?: string;
    postcode: string;
    country: string;
    email: string;
    phone?: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2?: string;
    city: string;
    state?: string;
    postcode: string;
    country: string;
  };
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    variation_id?: number;
    quantity: number;
    subtotal: string;
    total: string;
    price: number;
    meta_data?: Array<{ key: string; value: string }>;
    image?: { src: string };
  }>;
  shipping_lines: Array<{
    id: number;
    method_title: string;
    method_id: string;
    total: string;
  }>;
  customer_note?: string;
  meta_data?: Array<{ key: string; value: any }>;
  order_key?: string;
}

export const customerAccountApi = {
  async getDashboard() {
    const res = await fetch('/api/account/dashboard');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load dashboard');
    return data;
  },

  async getOrders(page: number = 1, status: string = 'all') {
    const params = new URLSearchParams({ page: String(page), status });
    const res = await fetch(`/api/account/orders?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load orders');
    return data;
  },

  async getOrder(id: number | string) {
    const res = await fetch(`/api/account/orders/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load order');
    return data;
  },

  async cancelOrder(id: number | string) {
    const res = await fetch(`/api/account/orders/${id}/cancel`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to cancel order');
    return data;
  },

  async requestRefund(id: number | string, payload: { reason: string; items?: any; details?: string }) {
    const res = await fetch(`/api/account/orders/${id}/refund-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit refund request');
    return data;
  },

  async getAddresses() {
    const res = await fetch('/api/account/addresses');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load addresses');
    return data;
  },

  async updateAddresses(payload: { billing?: any; shipping?: any }) {
    const res = await fetch('/api/account/addresses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update addresses');
    return data;
  },

  async updateProfile(payload: { firstName: string; lastName: string; email: string; currentPassword?: string; newPassword?: string }) {
    const res = await fetch('/api/account/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update profile');
    return data;
  },

  async getDownloads() {
    const res = await fetch('/api/account/downloads');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load downloads');
    return data;
  },

  async getPaymentMethods() {
    const res = await fetch('/api/account/payment-methods');
    const data = await res.json();
    if (!res.ok) return [];
    return data;
  },

  async deletePaymentMethod(tokenId: number | string) {
    const res = await fetch(`/api/account/payment-methods/${tokenId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete payment method');
    return data;
  },

  async getWishlist(): Promise<number[]> {
    try {
      const res = await fetch('/api/account/wishlist');
      const data = await res.json();
      return Array.isArray(data.productIds) ? data.productIds : [];
    } catch {
      return [];
    }
  },

  async updateWishlist(productIds: number[]) {
    const res = await fetch('/api/account/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds }),
    });
    return await res.json();
  },

  async trackGuestOrder(orderNumber: string | number, email: string) {
    const res = await fetch('/api/account/track-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNumber, email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Order lookup failed');
    return data;
  },

  async submitGdprRequest(requestType: 'export' | 'erasure', reason?: string) {
    const res = await fetch('/api/account/gdpr-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType, reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit GDPR request');
    return data;
  },
};
