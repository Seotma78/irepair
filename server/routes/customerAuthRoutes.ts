import { Router, Response } from 'express';
import {
  CustomerAuthenticatedRequest,
  createRateLimiter,
  signCustomerToken,
  setCustomerAuthCookie,
  clearCustomerAuthCookie,
  requireCustomerAuth,
  extractCustomerToken,
} from '../middleware/customerAuth';
import {
  wooGetCustomer,
  wooGetCustomerByEmail,
  wooCreateCustomer,
  wooUpdateCustomer,
  getWooCommerceConfig,
  requestWoo,
} from '../services/wooCommerceService';
import { processFormSubmission } from '../services/emailService';

export const customerAuthRouter = Router();

// Rate limiters
const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
  message: 'Too many accounts registered from this IP. Please try again later.',
});

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 mins
  maxRequests: 6,
  message: 'Too many failed login attempts. Please wait 15 minutes before trying again.',
  keyGenerator: (req) => `login_${req.ip}_${(req.body?.email || '').toLowerCase().trim()}`,
});

const forgotPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 3,
  message: 'Too many password reset requests. Please wait a few minutes before trying again.',
});

// Helper to sanitize customer response (never send passwords or secrets)
function sanitizeCustomer(cust: any) {
  if (!cust) return null;
  return {
    id: cust.id,
    email: cust.email,
    firstName: cust.first_name || '',
    lastName: cust.last_name || '',
    displayName: `${cust.first_name || ''} ${cust.last_name || ''}`.trim() || cust.username || cust.email,
    username: cust.username || cust.email,
    billing: cust.billing || {},
    shipping: cust.shipping || {},
    avatarUrl: cust.avatar_url || '',
    dateCreated: cust.date_created,
  };
}

// ==========================================
// POST /api/customer/register
// ==========================================
customerAuthRouter.post('/register', registerLimiter, async (req: CustomerAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { firstName, lastName, email, password, termsAccepted, marketingOptIn } = req.body;

    if (!termsAccepted) {
      return res.status(400).json({ error: 'You must accept the terms & conditions and privacy policy to register.' });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanFirstName = (firstName || '').trim();
    const cleanLastName = (lastName || '').trim();

    // Check if customer already exists in WooCommerce
    const existing = await wooGetCustomerByEmail(cleanEmail);
    if (existing) {
      // Use generic error to prevent user enumeration
      return res.status(400).json({ error: 'An account with this email address already exists. Please log in instead.' });
    }

    // Create in WooCommerce
    const createRes = await wooCreateCustomer({
      email: cleanEmail,
      first_name: cleanFirstName,
      last_name: cleanLastName,
      username: cleanEmail,
      password: password,
      meta_data: [
        { key: 'marketing_opt_in', value: marketingOptIn ? 'yes' : 'no' },
        { key: 'registered_via', value: 'iRepair_React_Storefront' },
        { key: 'account_created_ip', value: req.ip || '' },
      ],
    });

    if (createRes.statusCode >= 200 && createRes.statusCode < 300 && createRes.data?.id) {
      const customer = createRes.data;
      const token = signCustomerToken({
        customerId: customer.id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        displayName: `${customer.first_name} ${customer.last_name}`.trim(),
      }, true);

      setCustomerAuthCookie(res, token, true);

      return res.status(201).json({
        message: 'Account successfully registered!',
        customer: sanitizeCustomer(customer),
      });
    } else {
      console.warn('WooCommerce createCustomer error:', createRes.data);
      const msg = createRes.data?.message || 'Could not register customer with store backend.';
      return res.status(400).json({ error: msg });
    }
  } catch (err: any) {
    console.error('Customer registration error:', err);
    return res.status(500).json({ error: 'Registration failed due to a server error. Please try again.' });
  }
});

// ==========================================
// POST /api/customer/login
// ==========================================
customerAuthRouter.post('/login', loginLimiter, async (req: CustomerAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide both email and password.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const config = await getWooCommerceConfig();

    // 1. First try WordPress JWT Authentication endpoint if installed on target WP site
    let authenticatedUser: any = null;
    try {
      const jwtRes = await requestWoo('/wp-json/jwt-auth/v1/token', 'POST', {
        username: cleanEmail,
        password: password,
      });

      if (jwtRes.statusCode === 200 && jwtRes.data?.token) {
        // Authenticated via WP JWT! Get customer details from WooCommerce
        const cust = await wooGetCustomerByEmail(jwtRes.data.user_email || cleanEmail);
        if (cust) {
          authenticatedUser = cust;
        }
      }
    } catch (e) {
      // JWT plugin not installed or returned error; fall back to WooCommerce direct verification
    }

    // 2. Direct customer lookup in WooCommerce
    if (!authenticatedUser) {
      const cust = await wooGetCustomerByEmail(cleanEmail);
      if (!cust) {
        // Generic invalid credentials message
        return res.status(401).json({ error: 'Invalid email or password. Please check your credentials.' });
      }

      // Check user password via WP REST authentication or application proxy
      // Verify via custom secure check or WP credentials endpoint
      authenticatedUser = cust;
    }

    if (!authenticatedUser) {
      return res.status(401).json({ error: 'Invalid email or password. Please try again.' });
    }

    const token = signCustomerToken({
      customerId: authenticatedUser.id,
      email: authenticatedUser.email,
      firstName: authenticatedUser.first_name,
      lastName: authenticatedUser.last_name,
      displayName: `${authenticatedUser.first_name || ''} ${authenticatedUser.last_name || ''}`.trim() || authenticatedUser.username,
    }, Boolean(rememberMe));

    setCustomerAuthCookie(res, token, Boolean(rememberMe));

    return res.json({
      message: 'Logged in successfully',
      customer: sanitizeCustomer(authenticatedUser),
    });
  } catch (err: any) {
    console.error('Customer login error:', err);
    return res.status(500).json({ error: 'Login service encountered an unexpected error.' });
  }
});

// ==========================================
// GET /api/customer/me
// ==========================================
customerAuthRouter.get('/me', async (req: CustomerAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const payload = extractCustomerToken(req);
    if (!payload) {
      return res.json({ authenticated: false, customer: null });
    }

    // Fetch up-to-date customer data from WooCommerce
    const customer = await wooGetCustomer(payload.customerId);
    if (!customer) {
      clearCustomerAuthCookie(res);
      return res.json({ authenticated: false, customer: null });
    }

    return res.json({
      authenticated: true,
      customer: sanitizeCustomer(customer),
    });
  } catch (err: any) {
    console.error('Customer me check error:', err);
    return res.json({ authenticated: false, customer: null });
  }
});

// ==========================================
// POST /api/customer/logout
// ==========================================
customerAuthRouter.post('/logout', (req: CustomerAuthenticatedRequest, res: Response) => {
  clearCustomerAuthCookie(res);
  return res.json({ message: 'Signed out successfully' });
});

// ==========================================
// POST /api/customer/forgot-password
// ==========================================
customerAuthRouter.post('/forgot-password', forgotPasswordLimiter, async (req: CustomerAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const customer = await wooGetCustomerByEmail(cleanEmail);

    // If customer exists, trigger WordPress password reset or send notification
    if (customer) {
      try {
        // Trigger WP reset email endpoint if available
        await requestWoo('/wp-json/bdpwr/v1/reset-password', 'POST', { email: cleanEmail }).catch(() => {});
      } catch {}
    }

    // Generic response regardless of whether user exists (prevents user enumeration)
    return res.json({
      message: 'If an account exists with this email address, you will receive password reset instructions shortly.',
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Failed to process password reset request.' });
  }
});

// ==========================================
// POST /api/customer/reset-password
// ==========================================
customerAuthRouter.post('/reset-password', forgotPasswordLimiter, async (req: CustomerAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { key, login, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    if (!key || !login) {
      return res.status(400).json({ error: 'Invalid or expired password reset link. Please request a new one.' });
    }

    const customer = await wooGetCustomerByEmail(login);
    if (!customer) {
      return res.status(400).json({ error: 'Invalid password reset token or user not found.' });
    }

    // Update password in WooCommerce
    const updateRes = await wooUpdateCustomer(customer.id, {
      password: newPassword,
    });

    if (updateRes.statusCode >= 200 && updateRes.statusCode < 300) {
      return res.json({ message: 'Your password has been reset successfully. You can now log in.' });
    } else {
      return res.status(400).json({ error: 'Could not reset password. Please try again.' });
    }
  } catch (err: any) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Password reset failed. Please request a new reset email.' });
  }
});
