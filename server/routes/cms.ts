import { Router, Response } from 'express';
import { getDb } from '../db';
import {
  AuthenticatedRequest,
  authenticateToken,
  requireRole,
  logActivity,
} from '../middleware/auth';
import { processFormSubmission, testSmtp, getSmtpSettings } from '../services/emailService';

export const cmsRouter = Router();

// ==========================================
// PUBLIC CMS ENDPOINTS
// ==========================================

// POST /api/cms/forms/submit
cmsRouter.post('/forms/submit', async (req, res): Promise<any> => {
  try {
    const { formId, formTitle, toEmail, subject, fields } = req.body;
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ error: 'Form must contain at least one field' });
    }

    const result = await processFormSubmission({
      formId,
      formTitle: formTitle || 'Contact Form Inquiry',
      toEmail,
      subject,
      fields,
      ip: req.ip,
    });

    return res.json(result);
  } catch (err: any) {
    console.error('Form submission handler error:', err);
    return res.status(500).json({ error: err.message || 'Failed to submit form' });
  }
});

// GET /api/cms/pages/:slug
cmsRouter.get('/pages/:slug', async (req, res): Promise<any> => {
  try {
    const slug = req.params.slug.trim().toLowerCase();
    const db = await getDb();
    const page = db.get<{
      id: string;
      slug: string;
      title: string;
      status: string;
      seo_json: string;
      sections_json: string;
      updated_at: string;
    }>('SELECT * FROM pages WHERE slug = ?', [slug]);

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const sections = JSON.parse(page.sections_json || '[]');
    const seo = JSON.parse(page.seo_json || '{}');

    // Resolve any global widget references
    const globalWidgets = db.all<{ id: string; settings_json: string }>('SELECT id, settings_json FROM global_widgets');
    const globalMap = new Map(globalWidgets.map((gw) => [gw.id, JSON.parse(gw.settings_json || '{}')]));

    const resolvedSections = sections.map((sec: any) => {
      if (sec.isGlobal && sec.globalWidgetId && globalMap.has(sec.globalWidgetId)) {
        return {
          ...sec,
          settings: globalMap.get(sec.globalWidgetId),
        };
      }
      return sec;
    });

    return res.json({
      id: page.id,
      slug: page.slug,
      title: page.title,
      status: page.status,
      seo,
      sections: resolvedSections,
      updatedAt: page.updated_at,
    });
  } catch (err: any) {
    console.error('Fetch page error:', err);
    return res.status(500).json({ error: 'Failed to retrieve page content' });
  }
});

// GET /api/cms/settings
cmsRouter.get('/settings', async (req, res): Promise<any> => {
  try {
    const db = await getDb();
    const row = db.get<{ value_json: string }>('SELECT value_json FROM site_settings WHERE key = ?', ['general']);
    const settings = row ? JSON.parse(row.value_json) : {};
    return res.json(settings);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve settings' });
  }
});

// GET /api/cms/menus/:location
cmsRouter.get('/menus/:location', async (req, res): Promise<any> => {
  try {
    const db = await getDb();
    const row = db.get<{ items_json: string }>('SELECT items_json FROM menus WHERE location = ?', [req.params.location]);
    const items = row ? JSON.parse(row.items_json) : [];
    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve menu' });
  }
});

// GET /api/cms/collections/:type
cmsRouter.get('/collections/:type', async (req, res): Promise<any> => {
  try {
    const { type } = req.params;
    const db = await getDb();

    switch (type) {
      case 'faqs': {
        const rows = db.all('SELECT * FROM collections_faqs WHERE is_active = 1 ORDER BY sort_order ASC');
        return res.json(rows);
      }
      case 'reviews': {
        const rows = db.all('SELECT * FROM collections_reviews WHERE approved = 1 ORDER BY sort_order ASC');
        return res.json(rows);
      }
      case 'stores': {
        const rows = db.all('SELECT * FROM collections_stores ORDER BY sort_order ASC');
        const parsed = rows.map((r: any) => {
          const hoursObj = JSON.parse(r.opening_hours_json || '{}');
          const workingHours = hoursObj.workingHours || (hoursObj.Monday ? hoursObj : {
            Monday: hoursObj.weekdays || '8:30 AM–6:30 PM',
            Tuesday: hoursObj.weekdays || '8:30 AM–6:30 PM',
            Wednesday: hoursObj.weekdays || '8:30 AM–6:30 PM',
            Thursday: hoursObj.weekdays || '8:30 AM–6:30 PM',
            Friday: hoursObj.weekdays || '8:30 AM–6:30 PM',
            Saturday: hoursObj.saturday || '8:30 AM–6:30 PM',
            Sunday: hoursObj.sunday || '9:30 AM–5:30 PM',
          });
          return {
            id: r.id,
            storeName: r.name,
            name: r.name,
            streetAddress: r.address,
            address: r.address,
            city: r.city,
            postcode: r.postcode,
            phone: r.phone,
            email: r.email,
            mapUrl: r.map_link || `https://maps.google.com/?q=${encodeURIComponent((r.address || '') + ' ' + (r.postcode || ''))}`,
            mapLink: r.map_link || `https://maps.google.com/?q=${encodeURIComponent((r.address || '') + ' ' + (r.postcode || ''))}`,
            latitude: Number(r.latitude) || 0,
            longitude: Number(r.longitude) || 0,
            workingHours,
            openingHours: {
              weekdays: hoursObj.weekdays || workingHours?.Monday || '8:30 AM–6:30 PM',
              saturday: hoursObj.saturday || workingHours?.Saturday || '8:30 AM–6:30 PM',
              sunday: hoursObj.sunday || workingHours?.Sunday || '9:30 AM–5:30 PM',
            },
            features: JSON.parse(r.features_json || '[]'),
            isExpressHub: r.is_express_hub === 1,
            sort_order: r.sort_order,
          };
        });
        return res.json(parsed);
      }
      case 'repair_items': {
        const rows = db.all('SELECT * FROM collections_repair_items ORDER BY sort_order ASC');
        const parsed = rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          basePrice: r.base_price,
          durationMinutes: r.duration_minutes,
          iconName: r.icon_name,
          popular: r.popular === 1,
        }));
        return res.json(parsed);
      }
      case 'steps': {
        const rows = db.all('SELECT * FROM collections_steps ORDER BY sort_order ASC');
        return res.json(rows);
      }
      default:
        return res.status(400).json({ error: `Unknown collection type: ${type}` });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve collection' });
  }
});

// ==========================================
// ADMIN PROTECTED ENDPOINTS
// ==========================================

export const adminCmsRouter = Router();
adminCmsRouter.use(authenticateToken);

// GET /api/admin/stats
adminCmsRouter.get('/stats', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const pagesCount = db.get<{ c: number }>('SELECT count(*) as c FROM pages')?.c || 0;
    const mediaCount = db.get<{ c: number }>('SELECT count(*) as c FROM media')?.c || 0;
    const usersCount = db.get<{ c: number }>('SELECT count(*) as c FROM users')?.c || 0;
    const faqsCount = db.get<{ c: number }>('SELECT count(*) as c FROM collections_faqs')?.c || 0;
    const reviewsCount = db.get<{ c: number }>('SELECT count(*) as c FROM collections_reviews')?.c || 0;
    const storesCount = db.get<{ c: number }>('SELECT count(*) as c FROM collections_stores')?.c || 0;

    const recentLogs = db.all(
      'SELECT id, user_email, action, details_json, created_at FROM activity_logs ORDER BY created_at DESC LIMIT 15'
    );

    return res.json({
      stats: {
        pages: pagesCount,
        media: mediaCount,
        users: usersCount,
        faqs: faqsCount,
        reviews: reviewsCount,
        stores: storesCount,
      },
      recentLogs: recentLogs.map((l: any) => ({
        ...l,
        details: JSON.parse(l.details_json || '{}'),
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve dashboard stats' });
  }
});

// GET /api/admin/pages
adminCmsRouter.get('/pages', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const pages = db.all('SELECT id, slug, title, status, updated_at, seo_json, sections_json FROM pages ORDER BY title ASC');
    const result = pages.map((p: any) => {
      const sections = JSON.parse(p.sections_json || '[]');
      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        status: p.status,
        updatedAt: p.updated_at,
        sectionsCount: sections.length,
        seo: JSON.parse(p.seo_json || '{}'),
      };
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve pages' });
  }
});

// GET /api/admin/pages/:id
adminCmsRouter.get('/pages/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const page = db.get('SELECT * FROM pages WHERE id = ?', [req.params.id]);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }
    return res.json({
      id: page.id,
      slug: page.slug,
      title: page.title,
      status: page.status,
      seo: JSON.parse(page.seo_json || '{}'),
      sections: JSON.parse(page.sections_json || '[]'),
      updatedAt: page.updated_at,
      createdAt: page.created_at,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve page' });
  }
});

// POST /api/admin/pages
adminCmsRouter.post('/pages', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { title, slug, sections, seo, status } = req.body;
    if (!title || !slug) {
      return res.status(400).json({ error: 'Page title and slug are required' });
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
    const db = await getDb();

    const existing = db.get('SELECT id FROM pages WHERE slug = ?', [cleanSlug]);
    if (existing) {
      return res.status(400).json({ error: 'A page with this URL slug already exists.' });
    }

    const id = `page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO pages (id, slug, title, status, seo_json, sections_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        cleanSlug,
        title,
        status || 'published',
        JSON.stringify(seo || {}),
        JSON.stringify(sections || []),
        now,
        now,
      ]
    );

    await logActivity(req.user!.email, 'PAGE_CREATED', { pageId: id, slug: cleanSlug, title }, req.ip);

    return res.json({ success: true, id, slug: cleanSlug });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create page' });
  }
});

// PUT /api/admin/pages/:id
adminCmsRouter.put('/pages/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { title, slug, sections, seo, status, revisionNote } = req.body;

    const db = await getDb();
    const existing = db.get<any>('SELECT * FROM pages WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const now = new Date().toISOString();

    // 1. Create a revision snapshot before saving
    const revId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    db.run(
      `INSERT INTO revisions (id, page_id, title, sections_json, seo_json, created_by, created_at, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        revId,
        id,
        existing.title,
        existing.sections_json,
        existing.seo_json,
        req.user!.email,
        now,
        revisionNote || 'Auto snapshot prior to update',
      ]
    );

    // 2. Update the page
    const cleanSlug = slug ? slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-') : existing.slug;
    db.run(
      `UPDATE pages SET title = ?, slug = ?, status = ?, seo_json = ?, sections_json = ?, updated_at = ?
       WHERE id = ?`,
      [
        title || existing.title,
        cleanSlug,
        status || existing.status,
        JSON.stringify(seo !== undefined ? seo : JSON.parse(existing.seo_json || '{}')),
        JSON.stringify(sections !== undefined ? sections : JSON.parse(existing.sections_json || '[]')),
        now,
        id,
      ]
    );

    await logActivity(req.user!.email, 'PAGE_UPDATED', { pageId: id, slug: cleanSlug, title }, req.ip);

    return res.json({ success: true, message: 'Page successfully updated.' });
  } catch (err: any) {
    console.error('Update page error:', err);
    return res.status(500).json({ error: 'Failed to update page.' });
  }
});

// DELETE /api/admin/pages/:id
adminCmsRouter.delete('/pages/:id', requireRole('super_admin', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const existing = db.get<any>('SELECT slug FROM pages WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Page not found' });
    }

    if (existing.slug === 'home') {
      return res.status(400).json({ error: 'Cannot delete the Home page.' });
    }

    db.run('DELETE FROM pages WHERE id = ?', [id]);
    db.run('DELETE FROM revisions WHERE page_id = ?', [id]);

    await logActivity(req.user!.email, 'PAGE_DELETED', { pageId: id, slug: existing.slug }, req.ip);

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete page' });
  }
});

// GET /api/admin/pages/:id/revisions
adminCmsRouter.get('/pages/:id/revisions', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const revisions = db.all(
      'SELECT id, page_id, title, created_by, created_at, note FROM revisions WHERE page_id = ? ORDER BY created_at DESC LIMIT 25',
      [req.params.id]
    );
    return res.json(revisions);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve revisions' });
  }
});

// POST /api/admin/pages/:id/revisions/:revId/restore
adminCmsRouter.post('/pages/:id/revisions/:revId/restore', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id, revId } = req.params;
    const db = await getDb();
    const revision = db.get<any>('SELECT * FROM revisions WHERE id = ? AND page_id = ?', [revId, id]);
    if (!revision) {
      return res.status(404).json({ error: 'Revision not found' });
    }

    const now = new Date().toISOString();
    db.run(
      'UPDATE pages SET title = ?, sections_json = ?, seo_json = ?, updated_at = ? WHERE id = ?',
      [revision.title, revision.sections_json, revision.seo_json, now, id]
    );

    await logActivity(req.user!.email, 'REVISION_RESTORED', { pageId: id, revId }, req.ip);

    return res.json({ success: true, message: 'Revision successfully restored.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to restore revision' });
  }
});

// Collections Admin CRUD
adminCmsRouter.get('/collections/:type', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { type } = req.params;
    const db = await getDb();
    const table = `collections_${type}`;
    const rows = db.all(`SELECT * FROM ${table} ORDER BY sort_order ASC`);
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to read collection' });
  }
});

adminCmsRouter.post('/collections/:type', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { type } = req.params;
    const db = await getDb();
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    if (type === 'faqs') {
      const { question, answer, category, sort_order, is_active } = req.body;
      db.run(
        `INSERT INTO collections_faqs (id, question, answer, category, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, question, answer, category || 'general', sort_order || 0, is_active !== false ? 1 : 0]
      );
    } else if (type === 'reviews') {
      const { author, rating, review_text, location, date, device_repaired, verified, source, approved, sort_order } = req.body;
      db.run(
        `INSERT INTO collections_reviews (id, author, rating, review_text, location, date, device_repaired, verified, source, approved, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, author, rating || 5, review_text, location || '', date || 'Recently', device_repaired || '', verified ? 1 : 0, source || 'Google', approved !== false ? 1 : 0, sort_order || 0]
      );
    } else if (type === 'stores') {
      const { city, name, address, postcode, phone, email, openingHours, features, is_express_hub, map_link, latitude, longitude, sort_order } = req.body;
      db.run(
        `INSERT INTO collections_stores (id, city, name, address, postcode, phone, email, opening_hours_json, features_json, is_express_hub, map_link, latitude, longitude, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          city,
          name,
          address,
          postcode,
          phone,
          email,
          JSON.stringify(openingHours || {}),
          JSON.stringify(features || []),
          is_express_hub ? 1 : 0,
          map_link || '',
          parseFloat(latitude) || 0,
          parseFloat(longitude) || 0,
          sort_order || 0,
        ]
      );
    } else if (type === 'repair_items') {
      const { name, description, base_price, duration_minutes, icon_name, popular, sort_order } = req.body;
      db.run(
        `INSERT INTO collections_repair_items (id, name, description, base_price, duration_minutes, icon_name, popular, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, name, description, base_price, duration_minutes, icon_name || 'Wrench', popular ? 1 : 0, sort_order || 0]
      );
    } else if (type === 'steps') {
      const { step_number, title, description, icon_name, sort_order } = req.body;
      db.run(
        `INSERT INTO collections_steps (id, step_number, title, description, icon_name, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, step_number, title, description, icon_name || 'CheckCircle2', sort_order || 0]
      );
    }

    await logActivity(req.user!.email, 'COLLECTION_ITEM_CREATED', { type, itemId: id }, req.ip);

    return res.json({ success: true, id });
  } catch (err: any) {
    console.error('Create collection item error:', err);
    return res.status(500).json({ error: 'Failed to create item' });
  }
});

adminCmsRouter.put('/collections/:type/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { type, id } = req.params;
    const db = await getDb();

    if (type === 'faqs') {
      const { question, answer, category, sort_order, is_active } = req.body;
      db.run(
        'UPDATE collections_faqs SET question = ?, answer = ?, category = ?, sort_order = ?, is_active = ? WHERE id = ?',
        [question, answer, category, sort_order, is_active ? 1 : 0, id]
      );
    } else if (type === 'reviews') {
      const { author, rating, review_text, location, date, device_repaired, verified, source, approved, sort_order } = req.body;
      db.run(
        'UPDATE collections_reviews SET author = ?, rating = ?, review_text = ?, location = ?, date = ?, device_repaired = ?, verified = ?, source = ?, approved = ?, sort_order = ? WHERE id = ?',
        [author, rating, review_text, location, date, device_repaired, verified ? 1 : 0, source, approved ? 1 : 0, sort_order, id]
      );
    } else if (type === 'stores') {
      const { city, name, address, postcode, phone, email, openingHours, features, is_express_hub, map_link, latitude, longitude, sort_order } = req.body;
      db.run(
        'UPDATE collections_stores SET city = ?, name = ?, address = ?, postcode = ?, phone = ?, email = ?, opening_hours_json = ?, features_json = ?, is_express_hub = ?, map_link = ?, latitude = ?, longitude = ?, sort_order = ? WHERE id = ?',
        [
          city,
          name,
          address,
          postcode,
          phone,
          email,
          JSON.stringify(openingHours || {}),
          JSON.stringify(features || []),
          is_express_hub ? 1 : 0,
          map_link,
          parseFloat(latitude) || 0,
          parseFloat(longitude) || 0,
          sort_order,
          id,
        ]
      );
    } else if (type === 'repair_items') {
      const { name, description, base_price, duration_minutes, icon_name, popular, sort_order } = req.body;
      db.run(
        'UPDATE collections_repair_items SET name = ?, description = ?, base_price = ?, duration_minutes = ?, icon_name = ?, popular = ?, sort_order = ? WHERE id = ?',
        [name, description, base_price, duration_minutes, icon_name, popular ? 1 : 0, sort_order, id]
      );
    } else if (type === 'steps') {
      const { step_number, title, description, icon_name, sort_order } = req.body;
      db.run(
        'UPDATE collections_steps SET step_number = ?, title = ?, description = ?, icon_name = ?, sort_order = ? WHERE id = ?',
        [step_number, title, description, icon_name, sort_order, id]
      );
    }

    await logActivity(req.user!.email, 'COLLECTION_ITEM_UPDATED', { type, itemId: id }, req.ip);

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update item' });
  }
});

adminCmsRouter.delete('/collections/:type/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { type, id } = req.params;
    const db = await getDb();
    const table = `collections_${type}`;
    db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);

    await logActivity(req.user!.email, 'COLLECTION_ITEM_DELETED', { type, itemId: id }, req.ip);

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Clear all stores
adminCmsRouter.post('/collections/stores/clear-all', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    db.run('DELETE FROM collections_stores');
    await logActivity(req.user!.email, 'ALL_STORES_CLEARED', {}, req.ip);
    return res.json({ success: true, message: 'All stores removed successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to clear stores.' });
  }
});

// Reset default stores with accurate coordinates
adminCmsRouter.post('/collections/stores/reset-defaults', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    db.run('DELETE FROM collections_stores');
    const defaultStores = [
      {
        id: 'basingstoke',
        storeName: 'iRepair Basingstoke',
        streetAddress: '14 Old Basing Mall',
        city: 'Basingstoke',
        postcode: 'RG21 7AW',
        phone: '+447733304047',
        email: 'info@irepair-mobiles.co.uk',
        mapUrl: 'https://maps.app.goo.gl/kwgBgcgxCGsiy6zD9',
        latitude: 51.2667919,
        longitude: -1.0877917,
        workingHours: {
          Monday: '8:30 AM–7:30 PM',
          Tuesday: '8:30 AM–7:30 PM',
          Wednesday: '8:30 AM–7:30 PM',
          Thursday: '8:30 AM–7:30 PM',
          Friday: '8:30 AM–7:30 PM',
          Saturday: '8:30 AM–7:30 PM',
          Sunday: '9:30 AM–6:30 PM',
        },
        openingHours: {
          weekdays: '8:30 AM–7:30 PM',
          saturday: '8:30 AM–7:30 PM',
          sunday: '9:30 AM–6:30 PM',
        },
        features: ['30-Min Express Repair', 'Walk-in Welcome', 'Screen & Battery Stocked', 'Free Diagnostics'],
        isExpress: 1,
      },
      {
        id: 'norwich',
        storeName: 'iRepair Norwich',
        streetAddress: "25 Gentleman's Walk",
        city: 'Norwich',
        postcode: 'NR2 1NA',
        phone: '+447833203220',
        email: 'info@irepair-mobiles.co.uk',
        mapUrl: 'https://maps.app.goo.gl/M6Q7BXn78EbYKwgb9',
        latitude: 52.6281697,
        longitude: 1.2909314,
        workingHours: {
          Monday: '8:30 AM–6:30 PM',
          Tuesday: '8:30 AM–6:30 PM',
          Wednesday: '8:30 AM–6:30 PM',
          Thursday: '8:30 AM–6:30 PM',
          Friday: '8:30 AM–6:30 PM',
          Saturday: '8:30 AM–6:30 PM',
          Sunday: '9:30 AM–5:30 PM',
        },
        openingHours: {
          weekdays: '8:30 AM–6:30 PM',
          saturday: '8:30 AM–6:30 PM',
          sunday: '9:30 AM–5:30 PM',
        },
        features: ['City Centre Location', 'MacBook Liquid Damage', 'Walk-in & Mail-in Hub'],
        isExpress: 1,
      },
      {
        id: 'eastbourne',
        storeName: 'iRepair Eastbourne',
        streetAddress: '71-73 Terminus Road',
        city: 'Eastbourne',
        postcode: 'BN21 3NJ',
        phone: '+447776590246',
        email: 'info@irepair-mobiles.co.uk',
        mapUrl: 'https://maps.app.goo.gl/VWeQrmh9mk1CA49e7',
        latitude: 50.7686497,
        longitude: 0.2818796,
        workingHours: {
          Monday: '8:30 AM–7:30 PM',
          Tuesday: '8:30 AM–7:30 PM',
          Wednesday: '8:30 AM–7:30 PM',
          Thursday: '8:30 AM–7:30 PM',
          Friday: '8:30 AM–7:30 PM',
          Saturday: '8:30 AM–7:30 PM',
          Sunday: '9:30 AM–5:30 PM',
        },
        openingHours: {
          weekdays: '8:30 AM–7:30 PM',
          saturday: '8:30 AM–7:30 PM',
          sunday: '9:30 AM–5:30 PM',
        },
        features: ['Elderly Tech Support', 'Express Battery Swaps', 'Genuine Grade Parts'],
        isExpress: 0,
      },
      {
        id: 'reading',
        storeName: 'iRepair Reading Outlet',
        streetAddress: '49 Broad Street',
        city: 'Reading',
        postcode: 'RG1 2AA',
        phone: '+447922446999',
        email: 'info@irepair-mobiles.co.uk',
        mapUrl: 'https://maps.app.goo.gl/hG6UXWUJVhHmXA5JA',
        latitude: 51.4557574,
        longitude: -0.9759248,
        workingHours: {
          Monday: '8:00 AM–7:45 PM',
          Tuesday: '8:00 AM–7:45 PM',
          Wednesday: '8:00 AM–7:45 PM',
          Thursday: '8:00 AM–7:45 PM',
          Friday: '8:00 AM–7:45 PM',
          Saturday: '8:00 AM–7:45 PM',
          Sunday: '9:30 AM–6:30 PM',
        },
        openingHours: {
          weekdays: '8:00 AM–7:45 PM',
          saturday: '8:00 AM–7:45 PM',
          sunday: '9:30 AM–6:30 PM',
        },
        features: ['30-Min Express Repair', 'Walk-in Welcome', 'Screen & Battery Stocked', 'Free Diagnostics'],
        isExpress: 1,
      },
      {
        id: 'ipswich',
        storeName: 'iRepair Ipswich',
        streetAddress: '26 Tavern Street',
        city: 'Ipswich',
        postcode: 'IP1 3AS',
        phone: '+447777347524',
        email: 'info@irepair-mobiles.co.uk',
        mapUrl: 'https://maps.app.goo.gl/g8ny12aMXReqEUiK7',
        latitude: 52.057673,
        longitude: 1.1520108,
        workingHours: {
          Monday: '9:00 AM–7:00 PM',
          Tuesday: '9:00 AM–7:00 PM',
          Wednesday: '9:00 AM–7:00 PM',
          Thursday: '9:00 AM–7:00 PM',
          Friday: '9:00 AM–7:00 PM',
          Saturday: '9:00 AM–7:00 PM',
          Sunday: '10:00 AM–5:00 PM',
        },
        openingHours: {
          weekdays: '9:00 AM–7:00 PM',
          saturday: '9:00 AM–7:00 PM',
          sunday: '10:00 AM–5:00 PM',
        },
        features: ['Fast Screen Repairs', 'Refurbished Device Showcase', 'Free Phone Health Check'],
        isExpress: 0,
      },
      {
        id: 'solihull',
        storeName: 'iRepair Solihull',
        streetAddress: '61 High Street',
        city: 'Solihull',
        postcode: 'B91 3SW',
        phone: '+441217042695',
        email: 'info@irepair-mobiles.co.uk',
        mapUrl: 'https://maps.app.goo.gl/jabBhukACEBKP4qV9',
        latitude: 52.4132419,
        longitude: -1.7805997,
        workingHours: {
          Monday: '9:00 AM–6:30 PM',
          Tuesday: '9:00 AM–6:30 PM',
          Wednesday: '9:00 AM–6:30 PM',
          Thursday: '9:00 AM–6:30 PM',
          Friday: '9:00 AM–6:30 PM',
          Saturday: '9:00 AM–6:30 PM',
          Sunday: '9:30 AM–5:30 PM',
        },
        openingHours: {
          weekdays: '9:00 AM–6:30 PM',
          saturday: '9:00 AM–6:30 PM',
          sunday: '9:30 AM–5:30 PM',
        },
        features: ['High Street Hub', 'While-You-Shop Repairs', 'Official Warranty'],
        isExpress: 1,
      },
      {
        id: 'newcastle',
        storeName: 'iRepair Newcastle',
        streetAddress: '1A Northumberland Street',
        city: 'Newcastle',
        postcode: 'NE1 7DA',
        phone: '+447497675123',
        email: 'info@irepair-mobiles.co.uk',
        mapUrl: 'https://maps.app.goo.gl/YfqorZgUBPEjLpLi6',
        latitude: 54.9743629,
        longitude: -1.6216719,
        workingHours: {
          Monday: '8:30 AM–6:00 PM',
          Tuesday: '8:30 AM–6:00 PM',
          Wednesday: '8:30 AM–6:00 PM',
          Thursday: '8:30 AM–6:00 PM',
          Friday: '8:30 AM–6:00 PM',
          Saturday: '8:30 AM–6:00 PM',
          Sunday: '10:00 AM–4:00 PM',
        },
        openingHours: {
          weekdays: '8:30 AM–6:00 PM',
          saturday: '8:30 AM–6:00 PM',
          sunday: '10:00 AM–4:00 PM',
        },
        features: ['Northumberland Street Flagship', 'Walk-in Bench Repairs', 'OEM Parts Guaranteed'],
        isExpress: 1,
      },
      {
        id: 'southend',
        storeName: 'iRepair Southend',
        streetAddress: '150 High Street',
        city: 'Southend On Sea',
        postcode: 'SS1 1JX',
        phone: '+447471485846',
        email: 'info@irepair-mobiles.co.uk',
        mapUrl: 'https://maps.app.goo.gl/F67nZpBmL82umWWc9',
        latitude: 51.5393684,
        longitude: 0.7101131,
        workingHours: {
          Monday: '8:30 AM–7:00 PM',
          Tuesday: '8:30 AM–7:00 PM',
          Wednesday: '8:30 AM–7:00 PM',
          Thursday: '8:30 AM–7:00 PM',
          Friday: '8:30 AM–7:00 PM',
          Saturday: '8:30 AM–7:00 PM',
          Sunday: '9:30 AM–5:30 PM',
        },
        openingHours: {
          weekdays: '8:30 AM–7:00 PM',
          saturday: '8:30 AM–7:00 PM',
          sunday: '9:30 AM–5:30 PM',
        },
        features: ['Water Damage Clean Lab', 'iPad Screen Specialists', 'Trade-in Counter'],
        isExpress: 1,
      },
    ];

    defaultStores.forEach((s, idx) => {
      db.run(
        `INSERT INTO collections_stores (id, city, name, address, postcode, phone, email, opening_hours_json, features_json, is_express_hub, map_link, latitude, longitude, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          s.id,
          s.city,
          s.storeName,
          s.streetAddress,
          s.postcode,
          s.phone,
          s.email,
          JSON.stringify({ ...s.openingHours, workingHours: s.workingHours }),
          JSON.stringify(s.features),
          s.isExpress,
          s.mapUrl,
          s.latitude,
          s.longitude,
          idx,
        ]
      );
    });

    await logActivity(req.user!.email, 'DEFAULT_STORES_RESET', { count: defaultStores.length }, req.ip);
    return res.json({ success: true, message: 'Default stores successfully re-populated with coordinates.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to reset default stores.' });
  }
});

// PUT /api/admin/settings/:key
adminCmsRouter.put('/settings/:key', requireRole('super_admin', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { key } = req.params;
    const value = req.body;
    const db = await getDb();
    const now = new Date().toISOString();

    const existing = db.get('SELECT id FROM site_settings WHERE key = ?', [key]);
    if (existing) {
      db.run('UPDATE site_settings SET value_json = ?, updated_at = ? WHERE key = ?', [JSON.stringify(value), now, key]);
    } else {
      const id = `set_${Date.now()}`;
      db.run('INSERT INTO site_settings (id, key, value_json, updated_at) VALUES (?, ?, ?, ?)', [id, key, JSON.stringify(value), now]);
    }

    await logActivity(req.user!.email, 'SETTINGS_UPDATED', { key }, req.ip);

    return res.json({ success: true, message: 'Settings saved.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Menus Admin
adminCmsRouter.get('/menus', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const rows = db.all('SELECT * FROM menus');
    const parsed = rows.map((r: any) => ({
      ...r,
      items: JSON.parse(r.items_json || '[]'),
    }));
    return res.json(parsed);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to read menus' });
  }
});

adminCmsRouter.put('/menus/:location', requireRole('super_admin', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { location } = req.params;
    const { items, title } = req.body;
    const db = await getDb();
    const now = new Date().toISOString();

    const existing = db.get('SELECT id FROM menus WHERE location = ?', [location]);
    if (existing) {
      db.run('UPDATE menus SET items_json = ?, title = ?, updated_at = ? WHERE location = ?', [
        JSON.stringify(items || []),
        title || location,
        now,
        location,
      ]);
    } else {
      const id = `mnu_${Date.now()}`;
      db.run('INSERT INTO menus (id, location, title, items_json, updated_at) VALUES (?, ?, ?, ?, ?)', [
        id,
        location,
        title || location,
        JSON.stringify(items || []),
        now,
      ]);
    }

    await logActivity(req.user!.email, 'MENU_UPDATED', { location }, req.ip);

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update menu' });
  }
});

// ==========================================
// SMTP SETTINGS & TEST ADMIN ENDPOINTS
// ==========================================

// GET /api/admin/cms/smtp
adminCmsRouter.get('/smtp', requireRole('super_admin', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const row = db.get<{ value_json: string }>('SELECT value_json FROM site_settings WHERE key = ?', ['smtp']);
    const smtp = row ? JSON.parse(row.value_json) : {};
    return res.json({
      host: smtp.host || '',
      port: smtp.port || 587,
      secure: Boolean(smtp.secure),
      user: smtp.user || '',
      pass: smtp.pass ? '••••••••' : '',
      hasPassword: Boolean(smtp.pass),
      fromEmail: smtp.fromEmail || 'info@irepair-mobiles.co.uk',
      fromName: smtp.fromName || 'iRepair Mobiles UK',
      enabled: Boolean(smtp.enabled),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve SMTP settings' });
  }
});

// PUT /api/admin/cms/smtp
adminCmsRouter.put('/smtp', requireRole('super_admin', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { host, port, secure, user, pass, fromEmail, fromName, enabled } = req.body;
    const db = await getDb();
    const now = new Date().toISOString();

    const existingRow = db.get<{ value_json: string }>('SELECT value_json FROM site_settings WHERE key = ?', ['smtp']);
    const existing = existingRow ? JSON.parse(existingRow.value_json) : {};

    // Keep existing password if not updated or if masked
    const newPass = pass && pass !== '••••••••' ? pass : (existing.pass || '');

    const newConfig = {
      host: (host || '').trim(),
      port: Number(port) || 587,
      secure: Boolean(secure),
      user: (user || '').trim(),
      pass: newPass,
      fromEmail: (fromEmail || '').trim() || 'info@irepair-mobiles.co.uk',
      fromName: (fromName || '').trim() || 'iRepair Mobiles UK',
      enabled: Boolean(enabled),
    };

    if (existingRow) {
      db.run('UPDATE site_settings SET value_json = ?, updated_at = ? WHERE key = ?', [JSON.stringify(newConfig), now, 'smtp']);
    } else {
      const id = `set_smtp_${Date.now()}`;
      db.run('INSERT INTO site_settings (id, key, value_json, updated_at) VALUES (?, ?, ?, ?)', [id, 'smtp', JSON.stringify(newConfig), now]);
    }

    await logActivity(req.user!.email, 'SMTP_SETTINGS_UPDATED', { host: newConfig.host, user: newConfig.user }, req.ip);

    return res.json({ success: true, message: 'SMTP settings saved successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to save SMTP settings' });
  }
});

// POST /api/admin/cms/smtp/test
adminCmsRouter.post('/smtp/test', requireRole('super_admin', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { targetEmail, customConfig } = req.body;
    if (!targetEmail) {
      return res.status(400).json({ error: 'Target email address is required' });
    }

    let configToTest = undefined;
    if (customConfig) {
      const db = await getDb();
      const existingRow = db.get<{ value_json: string }>('SELECT value_json FROM site_settings WHERE key = ?', ['smtp']);
      const existing = existingRow ? JSON.parse(existingRow.value_json) : {};
      configToTest = {
        ...customConfig,
        pass: customConfig.pass && customConfig.pass !== '••••••••' ? customConfig.pass : existing.pass,
      };
    }

    const testResult = await testSmtp(targetEmail, configToTest);
    await logActivity(req.user!.email, 'SMTP_TEST_SENT', { targetEmail }, req.ip);
    return res.json(testResult);
  } catch (err: any) {
    console.error('SMTP test error:', err.message);
    return res.status(400).json({ error: err.message || 'SMTP verification failed' });
  }
});

// GET /api/admin/cms/form-submissions
adminCmsRouter.get('/form-submissions', requireRole('super_admin', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const rows = db.all('SELECT * FROM form_submissions ORDER BY created_at DESC LIMIT 100');
    const parsed = rows.map((r: any) => ({
      id: r.id,
      formId: r.form_id,
      formTitle: r.form_title,
      recipients: JSON.parse(r.recipients_json || '[]'),
      fields: JSON.parse(r.fields_json || '[]'),
      emailStatus: r.email_status,
      emailError: r.email_error,
      ip: r.ip,
      createdAt: r.created_at,
    }));
    return res.json(parsed);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve form submissions' });
  }
});

// DELETE /api/admin/cms/form-submissions/:id
adminCmsRouter.delete('/form-submissions/:id', requireRole('super_admin', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    db.run('DELETE FROM form_submissions WHERE id = ?', [req.params.id]);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete submission' });
  }
});
