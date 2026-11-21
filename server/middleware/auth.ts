import { Request, Response, NextFunction } from 'express';
import jwt from 'express';
import jsonwebtoken from 'jsonwebtoken';
import { getDb } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'irepair-cms-jwt-token-secret-2026-secure-key!';

export interface AuthUser {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'editor';
  must_change_password: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// Memory tracking for rate limiting & failed login lockout
const failedAttempts: Record<string, { count: number; lockedUntil?: number }> = {};

export function checkLoginRateLimit(key: string): { allowed: boolean; waitMinutes?: number } {
  const record = failedAttempts[key];
  if (!record) return { allowed: true };

  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    const waitMinutes = Math.ceil((record.lockedUntil - Date.now()) / 60000);
    return { allowed: false, waitMinutes };
  }

  if (record.lockedUntil && Date.now() >= record.lockedUntil) {
    delete failedAttempts[key];
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedLogin(key: string) {
  if (!failedAttempts[key]) {
    failedAttempts[key] = { count: 1 };
  } else {
    failedAttempts[key].count += 1;
  }

  if (failedAttempts[key].count >= 5) {
    // Lock out for 15 minutes
    failedAttempts[key].lockedUntil = Date.now() + 15 * 60 * 1000;
  }
}

export function resetFailedLogins(key: string) {
  delete failedAttempts[key];
}

export function generateToken(user: AuthUser): string {
  return jsonwebtoken.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      must_change_password: user.must_change_password,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jsonwebtoken.verify(token, JWT_SECRET) as AuthUser;
  } catch (err) {
    return null;
  }
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token && req.cookies && req.cookies.admin_token) {
    token = req.cookies.admin_token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }

  // Ensure user still exists and is active in the database
  const db = await getDb();
  const dbUser = db.get<{ is_active: number; must_change_password: number; role: string }>(
    'SELECT is_active, must_change_password, role FROM users WHERE id = ?',
    [payload.id]
  );

  if (!dbUser || dbUser.is_active !== 1) {
    return res.status(403).json({ error: 'User account has been deactivated.' });
  }

  req.user = {
    ...payload,
    role: dbUser.role as any,
    must_change_password: dbUser.must_change_password === 1,
  };

  next();
}

export function requireRole(...allowedRoles: ('super_admin' | 'admin' | 'editor')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Insufficient permissions. Role '${req.user.role}' cannot perform this action.`,
      });
    }

    next();
  };
}

export async function logActivity(
  userEmail: string,
  action: string,
  details: Record<string, any> = {},
  ip: string = '127.0.0.1'
) {
  try {
    const db = await getDb();
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    db.run(
      `INSERT INTO activity_logs (id, user_email, action, details_json, ip, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userEmail, action, JSON.stringify(details), ip, new Date().toISOString()]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}
