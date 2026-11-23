import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'irepair-mobiles-jwt-super-secret-2026-customer-auth';

export interface CustomerAuthPayload {
  customerId: number;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
}

export interface CustomerAuthenticatedRequest extends Request {
  customer?: CustomerAuthPayload;
}

// In-memory rate limiter with sliding window
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimits: Map<string, RateLimitRecord> = new Map();

// Periodic cleanup of expired rate limit records (every 5 mins)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimits.entries()) {
    if (record.resetAt <= now) {
      rateLimits.delete(key);
    }
  }
}, 300000);

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const key = options.keyGenerator ? options.keyGenerator(req) : `${req.baseUrl || ''}${req.path}_${ip}`;
    const now = Date.now();

    const record = rateLimits.get(key);
    if (!record || record.resetAt <= now) {
      rateLimits.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (record.count >= options.maxRequests) {
      const waitSec = Math.ceil((record.resetAt - now) / 1000);
      res.status(429).json({
        error: options.message || `Too many attempts. Please try again in ${waitSec} seconds.`,
        retryAfter: waitSec,
      });
      return;
    }

    record.count += 1;
    next();
  };
}

export function signCustomerToken(payload: CustomerAuthPayload, rememberMe: boolean = false): string {
  const expiresIn = rememberMe ? '30d' : '24h';
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function isHttpsRequest(req?: Request): boolean {
  if (!req) return process.env.NODE_ENV === 'production';
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  return Boolean(req.secure || (proto && proto.split(',')[0].trim().toLowerCase() === 'https'));
}

export function setCustomerAuthCookie(res: Response, token: string, rememberMe: boolean = false, req?: Request) {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  res.cookie('wc_customer_token', token, {
    httpOnly: true,
    secure: isHttpsRequest(req),
    sameSite: 'lax',
    maxAge,
    path: '/',
  });
}

export function clearCustomerAuthCookie(res: Response, req?: Request) {
  res.clearCookie('wc_customer_token', {
    httpOnly: true,
    secure: isHttpsRequest(req),
    sameSite: 'lax',
    path: '/',
  });
}

export function extractCustomerToken(req: Request): CustomerAuthPayload | null {
  const token = req.cookies?.wc_customer_token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as CustomerAuthPayload;
    if (decoded && decoded.customerId && decoded.email) {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}

export function authenticateCustomer(req: CustomerAuthenticatedRequest, res: Response, next: NextFunction) {
  const customer = extractCustomerToken(req);
  if (customer) {
    req.customer = customer;
  }
  next();
}

export function requireCustomerAuth(req: CustomerAuthenticatedRequest, res: Response, next: NextFunction) {
  const customer = extractCustomerToken(req);
  if (!customer) {
    return res.status(401).json({
      error: 'Authentication required. Please sign in to access your customer account.',
      code: 'unauthorized',
    });
  }
  req.customer = customer;
  next();
}
