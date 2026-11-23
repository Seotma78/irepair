import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db';
import {
  AuthenticatedRequest,
  authenticateToken,
  checkLoginRateLimit,
  recordFailedLogin,
  resetFailedLogins,
  generateToken,
  logActivity,
} from '../middleware/auth';

export const authRouter = Router();

function isHttpsRequest(req: Request): boolean {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  return Boolean(req.secure || (proto && proto.split(',')[0].trim().toLowerCase() === 'https'));
}

// POST /api/auth/login
authRouter.post('/login', async (req, res): Promise<any> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanInput = (email || '').toLowerCase().trim();
    const lookupEmail = cleanInput === 'admin' ? 'admin@irepair-mobiles.co.uk' : cleanInput;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const rateLimitKey = `${clientIp}_${lookupEmail}`;

    const rateCheck = checkLoginRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Too many failed login attempts. Account temporarily locked for ${rateCheck.waitMinutes} minutes.`,
      });
    }

    const db = await getDb();
    const user = db.get<{
      id: string;
      email: string;
      password_hash: string;
      role: 'super_admin' | 'admin' | 'editor';
      must_change_password: number;
      is_active: number;
    }>('SELECT * FROM users WHERE email = ?', [lookupEmail]);

    if (!user) {
      recordFailedLogin(rateLimitKey);
      await logActivity('anonymous', 'LOGIN_FAILED', { email, reason: 'User not found' }, clientIp);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.is_active !== 1) {
      return res.status(403).json({ error: 'This user account has been deactivated.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      recordFailedLogin(rateLimitKey);
      await logActivity(user.email, 'LOGIN_FAILED', { reason: 'Incorrect password' }, clientIp);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    resetFailedLogins(rateLimitKey);

    const authUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      must_change_password: user.must_change_password === 1,
    };

    const token = generateToken(authUser);

    // Set secure httpOnly cookie
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: isHttpsRequest(req),
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    await logActivity(user.email, 'LOGIN_SUCCESS', { role: user.role }, clientIp);

    return res.json({
      token,
      user: authUser,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// POST /api/auth/change-password
authRouter.post('/change-password', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const db = await getDb();
    const user = db.get<{ password_hash: string; must_change_password: number }>(
      'SELECT password_hash, must_change_password FROM users WHERE id = ?',
      [req.user!.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // If not in forced change mode, verify current password
    if (user.must_change_password !== 1 && currentPassword) {
      const match = await bcrypt.compare(currentPassword, user.password_hash);
      if (!match) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();

    db.run(
      'UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?',
      [newHash, now, req.user!.id]
    );

    const updatedUser = {
      ...req.user!,
      must_change_password: false,
    };
    const newToken = generateToken(updatedUser);

    res.cookie('admin_token', newToken, {
      httpOnly: true,
      secure: isHttpsRequest(req),
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await logActivity(req.user!.email, 'PASSWORD_CHANGED', {}, req.ip);

    return res.json({
      success: true,
      token: newToken,
      user: updatedUser,
      message: 'Password successfully updated.',
    });
  } catch (err: any) {
    console.error('Password change error:', err);
    return res.status(500).json({ error: 'Failed to update password.' });
  }
});

// PUT /api/auth/profile
authRouter.put('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = await getDb();

    // Check if email already used by someone else
    const existing = db.get('SELECT id FROM users WHERE email = ? AND id != ?', [cleanEmail, req.user!.id]);
    if (existing) {
      return res.status(400).json({ error: 'Email address is already in use by another account.' });
    }

    const now = new Date().toISOString();
    db.run('UPDATE users SET email = ?, updated_at = ? WHERE id = ?', [cleanEmail, now, req.user!.id]);

    const updatedUser = {
      ...req.user!,
      email: cleanEmail,
    };
    const newToken = generateToken(updatedUser);

    res.cookie('admin_token', newToken, {
      httpOnly: true,
      secure: isHttpsRequest(req),
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await logActivity(req.user!.email, 'PROFILE_UPDATED', { newEmail: cleanEmail }, req.ip);

    return res.json({
      success: true,
      token: newToken,
      user: updatedUser,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (req, res) => {
  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: isHttpsRequest(req),
    sameSite: 'lax',
    path: '/',
  });
  res.json({ success: true, message: 'Logged out successfully.' });
});
