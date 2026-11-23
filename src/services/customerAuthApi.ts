export interface CustomerProfile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  username: string;
  billing: any;
  shipping: any;
  avatarUrl?: string;
  dateCreated?: string;
}

async function parseJsonSafely(res: Response) {
  const raw = await res.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {
      error: res.ok
        ? 'Unexpected server response format.'
        : `Request failed (HTTP ${res.status}). Please try again.`,
    };
  }
}

export const customerAuthApi = {
  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    termsAccepted: boolean;
    marketingOptIn?: boolean;
  }) {
    const res = await fetch('/api/customer/register', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await parseJsonSafely(res);
    if (!res.ok) throw new Error(result.error || 'Failed to create customer account');
    return result;
  },

  async login(data: { email: string; password: string; rememberMe?: boolean }) {
    const res = await fetch('/api/customer/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await parseJsonSafely(res);
    if (!res.ok) throw new Error(result.error || 'Invalid email or password');
    return result;
  },

  async getMe(): Promise<{ authenticated: boolean; customer: CustomerProfile | null }> {
    try {
      const res = await fetch('/api/customer/me', { credentials: 'same-origin' });
      if (!res.ok) return { authenticated: false, customer: null };
      const result = await parseJsonSafely(res);
      return {
        authenticated: Boolean(result.authenticated),
        customer: result.customer || null,
      };
    } catch {
      return { authenticated: false, customer: null };
    }
  },

  async logout(): Promise<void> {
    await fetch('/api/customer/logout', { method: 'POST', credentials: 'same-origin' });
  },

  async forgotPassword(email: string) {
    const res = await fetch('/api/customer/forgot-password', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const result = await parseJsonSafely(res);
    if (!res.ok) throw new Error(result.error || 'Failed to submit password reset');
    return result;
  },

  async resetPassword(data: { key: string; login: string; newPassword: string }) {
    const res = await fetch('/api/customer/reset-password', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await parseJsonSafely(res);
    if (!res.ok) throw new Error(result.error || 'Failed to reset password');
    return result;
  },
};
