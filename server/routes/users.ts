import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db';
import {
  AuthenticatedRequest,
  authenticateToken,
  requireRole,
  logActivity,
} from '../middleware/auth';

export const usersRouter = Router();
usersRouter.use(authenticateToken);

// GET /api/admin/users
usersRouter.get('/', requireRole('super_admin', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const rows = db.all<{
      id: string;
      email: string;
      role: string;
      must_change_password: number;
      is_active: number;
      created_at: string;
      updated_at: string;
    }>('SELECT id, email, role, must_change_password, is_active, created_at, updated_at FROM users ORDER BY created_at ASC');

    const users = rows.map((u) => ({
      ...u,
      must_change_password: u.must_change_password === 1,
      is_active: u.is_active === 1,
    }));

    return res.json(users);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// POST /api/admin/users
usersRouter.post('/', requireRole('super_admin'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { email, password, role, must_change_password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and temporary password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = await getDb();

    const existing = db.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ error: 'A user with this email address already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO users (id, email, password_hash, role, must_change_password, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, cleanEmail, passwordHash, role || 'editor', must_change_password !== false ? 1 : 0, now, now]
    );

    await logActivity(req.user!.email, 'USER_CREATED', { targetEmail: cleanEmail, role }, req.ip);

    return res.json({ success: true, id });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create user.' });
  }
});

// PUT /api/admin/users/:id
usersRouter.put('/:id', requireRole('super_admin'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { role, is_active, must_change_password } = req.body;

    const db = await getDb();
    const existing = db.get<{ role: string; email: string }>('SELECT role, email FROM users WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Check last super admin guard
    if (existing.role === 'super_admin' && (role !== 'super_admin' || is_active === false)) {
      const superAdmins = db.all('SELECT id FROM users WHERE role = ? AND is_active = 1', ['super_admin']);
      if (superAdmins.length <= 1) {
        return res.status(400).json({ error: 'Cannot demote or deactivate the last remaining Super Admin.' });
      }
    }

    const now = new Date().toISOString();
    db.run(
      `UPDATE users SET role = ?, is_active = ?, must_change_password = ?, updated_at = ? WHERE id = ?`,
      [
        role || existing.role,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        must_change_password !== undefined ? (must_change_password ? 1 : 0) : 0,
        now,
        id,
      ]
    );

    await logActivity(req.user!.email, 'USER_UPDATED', { targetId: id, email: existing.email, role, is_active }, req.ip);

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update user.' });
  }
});

// DELETE /api/admin/users/:id
usersRouter.delete('/:id', requireRole('super_admin'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    if (id === req.user!.id) {
      return res.status(400).json({ error: 'You cannot delete your own logged-in account.' });
    }

    const db = await getDb();
    const existing = db.get<{ role: string; email: string }>('SELECT role, email FROM users WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (existing.role === 'super_admin') {
      const superAdmins = db.all('SELECT id FROM users WHERE role = ?', ['super_admin']);
      if (superAdmins.length <= 1) {
        return res.status(400).json({ error: 'Cannot delete the only Super Admin account.' });
      }
    }

    db.run('DELETE FROM users WHERE id = ?', [id]);
    await logActivity(req.user!.email, 'USER_DELETED', { targetEmail: existing.email }, req.ip);

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// POST /api/admin/users/:id/reset-password
usersRouter.post('/:id/reset-password', requireRole('super_admin'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const db = await getDb();
    const existing = db.get<{ email: string }>('SELECT email FROM users WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();

    db.run(
      'UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = ? WHERE id = ?',
      [passwordHash, now, id]
    );

    await logActivity(req.user!.email, 'USER_PASSWORD_RESET', { targetEmail: existing.email }, req.ip);

    return res.json({ success: true, message: 'Password reset. User will be prompted to change password on next login.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// GET /api/admin/activity-logs
usersRouter.get('/activity-logs', requireRole('super_admin', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const rows = db.all('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100');
    const logs = rows.map((l: any) => ({
      ...l,
      details: JSON.parse(l.details_json || '{}'),
    }));
    return res.json(logs);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve activity logs.' });
  }
});
