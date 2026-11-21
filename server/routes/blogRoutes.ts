import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { AuthenticatedRequest, authenticateToken, requireRole, logActivity } from '../middleware/auth';
import { resolveRootSlug, validateSlugConflict, invalidateSlugCache } from '../services/slugResolverService';
import {
  syncWordPressBlog,
  isBlogSyncInProgress,
  getBlogSyncProgress,
} from '../services/blogSyncService';
import { cleanSlug } from '../../src/constants/reservedSlugs';
import { decodeHtmlEntities } from '../../src/utils/decodeHtml';

export const blogRouter = Router();
export const adminBlogRouter = Router();

// ==========================================
// PUBLIC BLOG ENDPOINTS
// ==========================================

// GET /api/resolve-slug/:slug or GET /api/resolve-slug?path=...
blogRouter.get('/resolve-slug/:slug?', async (req: Request, res: Response): Promise<any> => {
  try {
    const raw = req.params.slug || (req.query.path as string) || (req.query.slug as string) || '';
    const resolved = await resolveRootSlug(raw);
    return res.status(resolved.statusCode).json(resolved);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to resolve slug' });
  }
});

// GET /api/blog/categories
blogRouter.get('/categories', async (req: Request, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const rows = db.all('SELECT * FROM blog_categories ORDER BY name ASC');
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch blog categories' });
  }
});

// GET /api/blog/tags
blogRouter.get('/tags', async (req: Request, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const rows = db.all('SELECT * FROM blog_tags ORDER BY name ASC');
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch blog tags' });
  }
});

// GET /api/blog/posts - List published posts with pagination, search, and category/tag/author filters
blogRouter.get('/posts', async (req: Request, res: Response): Promise<any> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.perPage as string, 10) || 12));
    const offset = (page - 1) * perPage;

    const categorySlug = req.query.category as string;
    const tagSlug = req.query.tag as string;
    const authorSlug = req.query.author as string;
    const search = (req.query.search as string || '').trim().toLowerCase();

    const db = await getDb();

    let whereClauses: string[] = ["p.status = 'published'"];
    let params: any[] = [];

    if (search) {
      whereClauses.push('(LOWER(p.title) LIKE ? OR LOWER(p.excerpt) LIKE ? OR LOWER(p.content) LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (categorySlug) {
      whereClauses.push(
        `p.id IN (
          SELECT bpc.post_id FROM blog_post_categories bpc
          JOIN blog_categories bc ON bpc.category_id = bc.id
          WHERE bc.slug = ?
        )`
      );
      params.push(categorySlug);
    }

    if (tagSlug) {
      whereClauses.push(
        `p.id IN (
          SELECT bpt.post_id FROM blog_post_tags bpt
          JOIN blog_tags bt ON bpt.tag_id = bt.id
          WHERE bt.slug = ?
        )`
      );
      params.push(tagSlug);
    }

    if (authorSlug) {
      whereClauses.push(
        `p.author_id IN (
          SELECT id FROM blog_authors WHERE slug = ?
        )`
      );
      params.push(authorSlug);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRow = db.get<{ total: number }>(
      `SELECT COUNT(*) as total FROM blog_posts p ${whereSql}`,
      params
    );
    const total = countRow?.total || 0;
    const totalPages = Math.ceil(total / perPage);

    const posts = db.all<any>(
      `SELECT p.id, p.wp_id, p.title, p.slug, p.excerpt, p.featured_image_url, p.featured_image_alt,
              p.published_at, p.reading_time, p.source,
              a.name as author_name, a.slug as author_slug, a.avatar_url as author_avatar
       FROM blog_posts p
       LEFT JOIN blog_authors a ON p.author_id = a.id
       ${whereSql}
       ORDER BY p.published_at DESC
       LIMIT ? OFFSET ?`,
      [...params, perPage, offset]
    );

    // Fetch categories and tags for each post
    const postIds = posts.map((p) => p.id);
    const catMap = new Map<string, any[]>();
    const tagMap = new Map<string, any[]>();

    if (postIds.length > 0) {
      const placeholders = postIds.map(() => '?').join(',');
      const catRows = db.all<any>(
        `SELECT bpc.post_id, bc.id, bc.name, bc.slug
         FROM blog_post_categories bpc
         JOIN blog_categories bc ON bpc.category_id = bc.id
         WHERE bpc.post_id IN (${placeholders})`,
        postIds
      );
      for (const row of catRows) {
        if (!catMap.has(row.post_id)) catMap.set(row.post_id, []);
        catMap.get(row.post_id)!.push({ id: row.id, name: row.name, slug: row.slug });
      }

      const tagRows = db.all<any>(
        `SELECT bpt.post_id, bt.id, bt.name, bt.slug
         FROM blog_post_tags bpt
         JOIN blog_tags bt ON bpt.tag_id = bt.id
         WHERE bpt.post_id IN (${placeholders})`,
        postIds
      );
      for (const row of tagRows) {
        if (!tagMap.has(row.post_id)) tagMap.set(row.post_id, []);
        tagMap.get(row.post_id)!.push({ id: row.id, name: row.name, slug: row.slug });
      }
    }

    const formatted = posts.map((p) => ({
      ...p,
      url: `/${p.slug}/`,
      author: p.author_name
        ? { name: p.author_name, slug: p.author_slug, avatarUrl: p.author_avatar }
        : null,
      categories: catMap.get(p.id) || [],
      tags: tagMap.get(p.id) || [],
    }));

    return res.json({
      posts: formatted,
      total,
      page,
      perPage,
      totalPages,
    });
  } catch (err: any) {
    console.error('Error fetching blog posts:', err);
    return res.status(500).json({ error: 'Failed to retrieve blog posts' });
  }
});

// GET /api/blog/posts/:slug - Single published post with author, categories, tags, related posts, prev/next
blogRouter.get('/posts/:slug', async (req: Request, res: Response): Promise<any> => {
  try {
    const slug = cleanSlug(req.params.slug);
    const db = await getDb();

    const post = db.get<any>(
      `SELECT p.*, a.name as author_name, a.slug as author_slug, a.avatar_url as author_avatar, a.bio as author_bio
       FROM blog_posts p
       LEFT JOIN blog_authors a ON p.author_id = a.id
       WHERE p.slug = ?`,
      [slug]
    );

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.status === 'trashed') {
      return res.status(410).json({ error: 'Post has been removed' });
    }

    // Categories
    const categories = db.all<any>(
      `SELECT bc.id, bc.name, bc.slug, bc.description
       FROM blog_post_categories bpc
       JOIN blog_categories bc ON bpc.category_id = bc.id
       WHERE bpc.post_id = ?`,
      [post.id]
    );

    // Tags
    const tags = db.all<any>(
      `SELECT bt.id, bt.name, bt.slug
       FROM blog_post_tags bpt
       JOIN blog_tags bt ON bpt.tag_id = bt.id
       WHERE bpt.post_id = ?`,
      [post.id]
    );

    // Prev / Next posts
    const prevPost = db.get<any>(
      `SELECT title, slug, featured_image_url
       FROM blog_posts
       WHERE status = 'published' AND published_at < ?
       ORDER BY published_at DESC LIMIT 1`,
      [post.published_at]
    );

    const nextPost = db.get<any>(
      `SELECT title, slug, featured_image_url
       FROM blog_posts
       WHERE status = 'published' AND published_at > ?
       ORDER BY published_at ASC LIMIT 1`,
      [post.published_at]
    );

    // Related posts (from same category or recent fallback)
    let relatedPosts: any[] = [];
    if (categories.length > 0) {
      const primaryCatId = categories[0].id;
      relatedPosts = db.all<any>(
        `SELECT DISTINCT p.id, p.title, p.slug, p.excerpt, p.featured_image_url, p.published_at, p.reading_time
         FROM blog_posts p
         JOIN blog_post_categories bpc ON p.id = bpc.post_id
         WHERE bpc.category_id = ? AND p.id != ? AND p.status = 'published'
         ORDER BY p.published_at DESC LIMIT 8`,
        [primaryCatId, post.id]
      );
    }

    if (relatedPosts.length < 4) {
      // Top up with recent posts if category has few
      const existingIds = [post.id, ...relatedPosts.map((r) => r.id)];
      const placeholders = existingIds.map(() => '?').join(',');
      const extraPosts = db.all<any>(
        `SELECT id, title, slug, excerpt, featured_image_url, published_at, reading_time
         FROM blog_posts
         WHERE id NOT IN (${placeholders}) AND status = 'published'
         ORDER BY published_at DESC LIMIT ${8 - relatedPosts.length}`,
        existingIds
      );
      relatedPosts = [...relatedPosts, ...extraPosts];
    }

    return res.json({
      post: {
        ...post,
        url: `/${post.slug}/`,
        author: post.author_name
          ? {
              name: post.author_name,
              slug: post.author_slug,
              avatarUrl: post.author_avatar,
              bio: post.author_bio,
            }
          : null,
        categories,
        tags,
      },
      prevPost: prevPost ? { ...prevPost, url: `/${prevPost.slug}/` } : null,
      nextPost: nextPost ? { ...nextPost, url: `/${nextPost.slug}/` } : null,
      relatedPosts: relatedPosts.map((r) => ({ ...r, url: `/${r.slug}/` })),
    });
  } catch (err: any) {
    console.error('Error fetching post:', err);
    return res.status(500).json({ error: 'Failed to retrieve post' });
  }
});

// ==========================================
// ADMIN BLOG ENDPOINTS (AUTH REQUIRED)
// ==========================================
adminBlogRouter.use(authenticateToken);

// GET /api/admin/blog/posts - List posts with filters
adminBlogRouter.get('/posts', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.perPage as string, 10) || 20));
    const offset = (page - 1) * perPage;

    const status = req.query.status as string;
    const categoryId = req.query.category as string;
    const authorId = req.query.author as string;
    const search = (req.query.search as string || '').trim().toLowerCase();

    const db = await getDb();

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (status && status !== 'all') {
      whereClauses.push('p.status = ?');
      params.push(status);
    } else {
      whereClauses.push("p.status != 'trashed'");
    }

    if (search) {
      whereClauses.push('(LOWER(p.title) LIKE ? OR LOWER(p.slug) LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (categoryId) {
      whereClauses.push(
        'p.id IN (SELECT post_id FROM blog_post_categories WHERE category_id = ?)'
      );
      params.push(categoryId);
    }

    if (authorId) {
      whereClauses.push('p.author_id = ?');
      params.push(authorId);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRow = db.get<{ total: number }>(
      `SELECT COUNT(*) as total FROM blog_posts p ${whereSql}`,
      params
    );
    const total = countRow?.total || 0;

    const posts = db.all<any>(
      `SELECT p.id, p.wp_id, p.title, p.slug, p.status, p.published_at, p.source,
              p.edited_locally, p.featured_image_url, p.reading_time, p.updated_at,
              a.name as author_name
       FROM blog_posts p
       LEFT JOIN blog_authors a ON p.author_id = a.id
       ${whereSql}
       ORDER BY p.published_at DESC
       LIMIT ? OFFSET ?`,
      [...params, perPage, offset]
    );

    // Fetch categories for each post
    const postIds = posts.map((p) => p.id);
    const catMap = new Map<string, any[]>();
    if (postIds.length > 0) {
      const placeholders = postIds.map(() => '?').join(',');
      const catRows = db.all<any>(
        `SELECT bpc.post_id, bc.id, bc.name, bc.slug
         FROM blog_post_categories bpc
         JOIN blog_categories bc ON bpc.category_id = bc.id
         WHERE bpc.post_id IN (${placeholders})`,
        postIds
      );
      for (const row of catRows) {
        if (!catMap.has(row.post_id)) catMap.set(row.post_id, []);
        catMap.get(row.post_id)!.push({ id: row.id, name: row.name, slug: row.slug });
      }
    }

    const formatted = posts.map((p) => ({
      ...p,
      url: `/${p.slug}/`,
      categories: catMap.get(p.id) || [],
    }));

    return res.json({
      posts: formatted,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch admin blog posts' });
  }
});

// GET /api/admin/blog/posts/:id
adminBlogRouter.get('/posts/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const post = db.get<any>('SELECT * FROM blog_posts WHERE id = ?', [req.params.id]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const categories = db.all<any>(
      `SELECT bc.id, bc.name, bc.slug FROM blog_post_categories bpc
       JOIN blog_categories bc ON bpc.category_id = bc.id
       WHERE bpc.post_id = ?`,
      [post.id]
    );

    const tags = db.all<any>(
      `SELECT bt.id, bt.name, bt.slug FROM blog_post_tags bpt
       JOIN blog_tags bt ON bpt.tag_id = bt.id
       WHERE bpt.post_id = ?`,
      [post.id]
    );

    return res.json({
      ...post,
      url: `/${post.slug}/`,
      categories: categories.map((c) => c.id),
      tags: tags.map((t) => t.name),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch post details' });
  }
});

// POST /api/admin/blog/posts - Create new post (validates uniqueness across namespace)
adminBlogRouter.post('/posts', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const {
      title,
      slug,
      excerpt,
      content,
      featured_image_url,
      featured_image_alt,
      author_id,
      status = 'published',
      published_at,
      scheduled_at,
      seo_title,
      seo_description,
      canonical_url,
      og_image,
      categories = [],
      tags = [],
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Post title is required' });
    }

    const targetSlug = cleanSlug(slug || title);
    if (!targetSlug) {
      return res.status(400).json({ error: 'Invalid post slug' });
    }

    // Collision check across reserved routes, CMS pages, blog posts, and redirects
    const check = await validateSlugConflict(targetSlug, { entityType: 'post' });
    if (!check.available) {
      return res.status(409).json({ error: check.conflictReason, conflictType: check.conflictType });
    }

    const now = new Date().toISOString();
    const newId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const finalCanonical = canonical_url || `https://irepair-mobiles.co.uk/${targetSlug}/`;
    const finalSeoTitle = seo_title || `${title} | iRepair Mobiles UK`;
    const finalSeoDesc = seo_description || excerpt || '';

    // Calculate reading time
    const text = (content || '').replace(/<[^>]+>/g, ' ');
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    const db = await getDb();
    db.run(
      `INSERT INTO blog_posts (
        id, wp_id, title, slug, excerpt, content, featured_image_url, featured_image_alt,
        author_id, status, published_at, scheduled_at, modified_at, seo_title,
        seo_description, canonical_url, og_image, reading_time, source, edited_locally,
        wp_link, synced_at, created_at, updated_at
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local', 1, ?, NULL, ?, ?)`,
      [
        newId,
        title,
        targetSlug,
        excerpt || '',
        content || '',
        featured_image_url || '',
        featured_image_alt || '',
        author_id || null,
        status,
        published_at || now,
        scheduled_at || null,
        now,
        finalSeoTitle,
        finalSeoDesc,
        finalCanonical,
        og_image || featured_image_url || '',
        readingTime,
        `https://irepair-mobiles.co.uk/${targetSlug}/`,
        now,
        now,
      ]
    );

    // Save categories
    if (Array.isArray(categories)) {
      for (const catId of categories) {
        db.run('INSERT OR REPLACE INTO blog_post_categories (post_id, category_id) VALUES (?, ?)', [newId, catId]);
      }
    }

    // Save tags (inline create if needed)
    if (Array.isArray(tags)) {
      for (const tagName of tags) {
        const cleanTagName = String(tagName).trim();
        if (!cleanTagName) continue;
        const tagSlug = cleanTagName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        let tag = db.get<any>('SELECT id FROM blog_tags WHERE slug = ?', [tagSlug]);
        if (!tag) {
          const newTagId = `btag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          db.run('INSERT INTO blog_tags (id, name, slug, source) VALUES (?, ?, ?, "local")', [newTagId, cleanTagName, tagSlug]);
          tag = { id: newTagId };
        }
        db.run('INSERT OR REPLACE INTO blog_post_tags (post_id, tag_id) VALUES (?, ?)', [newId, tag.id]);
      }
    }

    invalidateSlugCache(targetSlug);
    await logActivity(req.user!.email, 'BLOG_POST_CREATED', { id: newId, title, slug: targetSlug }, req.ip);

    return res.json({ success: true, id: newId, slug: targetSlug, url: `/${targetSlug}/` });
  } catch (err: any) {
    console.error('Create blog post error:', err);
    return res.status(500).json({ error: 'Failed to create blog post: ' + err.message });
  }
});

// PUT /api/admin/blog/posts/:id - Update post (validates uniqueness, auto-creates 301 redirect if slug changes)
adminBlogRouter.put('/posts/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const id = req.params.id;
    const db = await getDb();
    const current = db.get<any>('SELECT * FROM blog_posts WHERE id = ?', [id]);
    if (!current) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const {
      title,
      slug,
      excerpt,
      content,
      featured_image_url,
      featured_image_alt,
      author_id,
      status,
      published_at,
      scheduled_at,
      seo_title,
      seo_description,
      canonical_url,
      og_image,
      categories = [],
      tags = [],
    } = req.body;

    const newSlug = slug ? cleanSlug(slug) : current.slug;
    if (newSlug !== current.slug) {
      const check = await validateSlugConflict(newSlug, { currentId: id, entityType: 'post' });
      if (!check.available) {
        return res.status(409).json({ error: check.conflictReason, conflictType: check.conflictType });
      }
    }

    const now = new Date().toISOString();
    const oldSlug = current.slug;

    // Reading time
    const text = (content !== undefined ? content : current.content || '').replace(/<[^>]+>/g, ' ');
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    const finalCanonical = canonical_url || `https://irepair-mobiles.co.uk/${newSlug}/`;

    db.run(
      `UPDATE blog_posts
       SET title = ?, slug = ?, excerpt = ?, content = ?, featured_image_url = ?, featured_image_alt = ?,
           author_id = ?, status = ?, published_at = ?, scheduled_at = ?, modified_at = ?,
           seo_title = ?, seo_description = ?, canonical_url = ?, og_image = ?, reading_time = ?,
           edited_locally = 1, updated_at = ?
       WHERE id = ?`,
      [
        title !== undefined ? title : current.title,
        newSlug,
        excerpt !== undefined ? excerpt : current.excerpt,
        content !== undefined ? content : current.content,
        featured_image_url !== undefined ? featured_image_url : current.featured_image_url,
        featured_image_alt !== undefined ? featured_image_alt : current.featured_image_alt,
        author_id !== undefined ? author_id : current.author_id,
        status !== undefined ? status : current.status,
        published_at !== undefined ? published_at : current.published_at,
        scheduled_at !== undefined ? scheduled_at : current.scheduled_at,
        now,
        seo_title !== undefined ? seo_title : current.seo_title,
        seo_description !== undefined ? seo_description : current.seo_description,
        finalCanonical,
        og_image !== undefined ? og_image : current.og_image,
        readingTime,
        now,
        id,
      ]
    );

    // Auto 301 Redirect if slug changed
    if (oldSlug && oldSlug !== newSlug) {
      const redId = `red_page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      db.run(
        `INSERT OR REPLACE INTO page_redirects (id, old_slug, new_slug, status, created_at)
         VALUES (?, ?, ?, 301, ?)`,
        [redId, oldSlug, newSlug, now]
      );
    }

    // Update categories
    if (Array.isArray(categories)) {
      db.run('DELETE FROM blog_post_categories WHERE post_id = ?', [id]);
      for (const catId of categories) {
        db.run('INSERT OR REPLACE INTO blog_post_categories (post_id, category_id) VALUES (?, ?)', [id, catId]);
      }
    }

    // Update tags
    if (Array.isArray(tags)) {
      db.run('DELETE FROM blog_post_tags WHERE post_id = ?', [id]);
      for (const tagName of tags) {
        const cleanTagName = String(tagName).trim();
        if (!cleanTagName) continue;
        const tagSlug = cleanTagName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        let tag = db.get<any>('SELECT id FROM blog_tags WHERE slug = ?', [tagSlug]);
        if (!tag) {
          const newTagId = `btag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          db.run('INSERT INTO blog_tags (id, name, slug, source) VALUES (?, ?, ?, "local")', [newTagId, cleanTagName, tagSlug]);
          tag = { id: newTagId };
        }
        db.run('INSERT OR REPLACE INTO blog_post_tags (post_id, tag_id) VALUES (?, ?)', [id, tag.id]);
      }
    }

    invalidateSlugCache(oldSlug);
    invalidateSlugCache(newSlug);
    await logActivity(req.user!.email, 'BLOG_POST_UPDATED', { id, slug: newSlug }, req.ip);

    return res.json({ success: true, slug: newSlug, url: `/${newSlug}/` });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update post: ' + err.message });
  }
});

// DELETE /api/admin/blog/posts/:id - Trash or delete post
adminBlogRouter.delete('/posts/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const id = req.params.id;
    const db = await getDb();
    const current = db.get<any>('SELECT * FROM blog_posts WHERE id = ?', [id]);
    if (!current) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const permanent = req.query.permanent === 'true';
    if (permanent || current.status === 'trashed') {
      db.run('DELETE FROM blog_post_categories WHERE post_id = ?', [id]);
      db.run('DELETE FROM blog_post_tags WHERE post_id = ?', [id]);
      db.run('DELETE FROM blog_posts WHERE id = ?', [id]);
    } else {
      db.run("UPDATE blog_posts SET status = 'trashed', updated_at = ? WHERE id = ?", [new Date().toISOString(), id]);
    }

    invalidateSlugCache(current.slug);
    await logActivity(req.user!.email, 'BLOG_POST_DELETED', { id, permanent }, req.ip);

    return res.json({ success: true, permanent });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete post' });
  }
});

// POST /api/admin/blog/posts/bulk - Bulk actions
adminBlogRouter.post('/posts/bulk', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { action, postIds, targetCategoryId } = req.body;
    if (!Array.isArray(postIds) || postIds.length === 0) {
      return res.status(400).json({ error: 'postIds array is required' });
    }

    const db = await getDb();
    const now = new Date().toISOString();
    const placeholders = postIds.map(() => '?').join(',');

    if (action === 'publish') {
      db.run(`UPDATE blog_posts SET status = 'published', updated_at = ? WHERE id IN (${placeholders})`, [now, ...postIds]);
    } else if (action === 'unpublish') {
      db.run(`UPDATE blog_posts SET status = 'draft', updated_at = ? WHERE id IN (${placeholders})`, [now, ...postIds]);
    } else if (action === 'trash') {
      db.run(`UPDATE blog_posts SET status = 'trashed', updated_at = ? WHERE id IN (${placeholders})`, [now, ...postIds]);
    } else if (action === 'delete') {
      db.run(`DELETE FROM blog_post_categories WHERE post_id IN (${placeholders})`, postIds);
      db.run(`DELETE FROM blog_post_tags WHERE post_id IN (${placeholders})`, postIds);
      db.run(`DELETE FROM blog_posts WHERE id IN (${placeholders})`, postIds);
    } else if (action === 'change_category' && targetCategoryId) {
      db.run(`DELETE FROM blog_post_categories WHERE post_id IN (${placeholders})`, postIds);
      for (const pId of postIds) {
        db.run('INSERT OR REPLACE INTO blog_post_categories (post_id, category_id) VALUES (?, ?)', [pId, targetCategoryId]);
      }
    }

    invalidateSlugCache();
    await logActivity(req.user!.email, 'BLOG_BULK_ACTION', { action, count: postIds.length }, req.ip);

    return res.json({ success: true, count: postIds.length });
  } catch (err: any) {
    return res.status(500).json({ error: 'Bulk action failed' });
  }
});

// POST /api/admin/blog/sync - Trigger WordPress Blog sync
adminBlogRouter.post('/sync', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (isBlogSyncInProgress()) {
      return res.status(409).json({ error: 'Blog synchronization is already in progress' });
    }

    const mode = req.body?.mode === 'full' ? 'full' : 'new_updated';
    // Run sync in background or await
    const summaryPromise = syncWordPressBlog({ mode });

    // If requested async, respond immediately with progress handle, otherwise await:
    const summary = await summaryPromise;
    await logActivity(req.user!.email, 'BLOG_SYNCED', summary, req.ip);

    return res.json({ success: true, summary });
  } catch (err: any) {
    if (err.message?.includes('already in progress')) {
      return res.status(409).json({ error: err.message });
    }
    console.error('Blog sync error:', err);
    return res.status(500).json({ error: 'Blog sync failed: ' + err.message });
  }
});

// GET /api/admin/blog/sync/status
adminBlogRouter.get('/sync/status', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const isRunning = isBlogSyncInProgress();
    const progress = getBlogSyncProgress();
    const db = await getDb();
    const history = db.all<any>(
      "SELECT * FROM sync_logs WHERE type = 'blog' ORDER BY started_at DESC LIMIT 10"
    );
    const lastSync = history.length > 0 ? history[0] : null;

    return res.json({ isRunning, progress, lastSync, history });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch blog sync status' });
  }
});
