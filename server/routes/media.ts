import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb } from '../db';
import { AuthenticatedRequest, authenticateToken, logActivity } from '../middleware/auth';

export const mediaRouter = Router();
mediaRouter.use(authenticateToken);

const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const unique = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    cb(null, `${base}_${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP, SVG, GIF) are allowed.'));
    }
  },
});

// GET /api/admin/media
mediaRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const search = req.query.search ? String(req.query.search).toLowerCase() : '';
    const db = await getDb();

    let query = 'SELECT * FROM media';
    const params: any[] = [];

    if (search) {
      query += ' WHERE lower(original_name) LIKE ? OR lower(alt_text) LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const items = db.all(query, params);
    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve media files' });
  }
});

// POST /api/admin/media/upload
mediaRouter.post('/upload', upload.single('file'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    const { altText } = req.body;
    const db = await getDb();
    const id = `med_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const url = `/uploads/${req.file.filename}`;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO media (id, filename, original_name, mime_type, size, alt_text, url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        altText || req.file.originalname,
        url,
        now,
      ]
    );

    await logActivity(req.user!.email, 'MEDIA_UPLOADED', { filename: req.file.filename, size: req.file.size }, req.ip);

    return res.json({
      success: true,
      media: {
        id,
        filename: req.file.filename,
        original_name: req.file.originalname,
        mime_type: req.file.mimetype,
        size: req.file.size,
        alt_text: altText || req.file.originalname,
        url,
        created_at: now,
      },
    });
  } catch (err: any) {
    console.error('Media upload error:', err);
    return res.status(500).json({ error: err.message || 'File upload failed' });
  }
});

// PUT /api/admin/media/:id
mediaRouter.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { alt_text } = req.body;
    const db = await getDb();
    db.run('UPDATE media SET alt_text = ? WHERE id = ?', [alt_text || '', id]);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update media details' });
  }
});

// DELETE /api/admin/media/:id
mediaRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const item = db.get<any>('SELECT * FROM media WHERE id = ?', [id]);
    if (!item) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Attempt delete from filesystem
    const filePath = path.join(UPLOAD_DIR, item.filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.warn('Could not delete file from disk:', e);
      }
    }

    db.run('DELETE FROM media WHERE id = ?', [id]);
    await logActivity(req.user!.email, 'MEDIA_DELETED', { filename: item.filename }, req.ip);

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete media item' });
  }
});
