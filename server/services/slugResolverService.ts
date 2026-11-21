import { getDb } from '../db';
import { cleanSlug, isReservedSlug } from '../../src/constants/reservedSlugs';

export type ResolvedRouteType =
  | 'reserved'
  | 'cms_page'
  | 'blog_post'
  | 'redirect'
  | 'category_archive'
  | 'tag_archive'
  | 'author_archive'
  | 'blogs_index'
  | 'not_found';

export interface ResolvedRouteResult {
  type: ResolvedRouteType;
  slug: string;
  statusCode: number;
  redirectUrl?: string;
  data?: any;
}

// In-memory cache for fast root-level slug lookups
const slugCache = new Map<string, { result: ResolvedRouteResult; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

export function invalidateSlugCache(slug?: string): void {
  if (slug) {
    slugCache.delete(cleanSlug(slug));
  } else {
    slugCache.clear();
  }
}

/**
 * Root-level slug resolver according to Priority Order:
 * 1. Reserved / App routes (e.g. /, /shop/, /cart/, /blogs/, /admin/, etc.)
 * 2. CMS pages (pages table)
 * 3. Published blog posts (blog_posts table)
 * 4. Redirects (page_redirects table and category_redirects)
 * 5. 404 fallback
 */
export async function resolveRootSlug(rawPathOrSlug: string): Promise<ResolvedRouteResult> {
  const slug = cleanSlug(rawPathOrSlug);
  const now = Date.now();

  const cached = slugCache.get(slug);
  if (cached && cached.expiresAt > now) {
    return cached.result;
  }

  const db = await getDb();

  // Helper to store in cache and return
  const respond = (result: ResolvedRouteResult): ResolvedRouteResult => {
    slugCache.set(slug, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  };

  // 1. Reserved / App routes
  if (slug === '' || slug === 'home') {
    return respond({ type: 'reserved', slug: '', statusCode: 200 });
  }

  if (slug === 'blogs' || slug.startsWith('blogs/page/')) {
    return respond({ type: 'blogs_index', slug, statusCode: 200 });
  }

  if (slug.startsWith('blog-category/')) {
    const catSlug = slug.replace(/^blog-category\//, '').replace(/\/+$/, '');
    return respond({ type: 'category_archive', slug: catSlug, statusCode: 200 });
  }

  // Legacy category/ redirect to blog-category/
  if (slug.startsWith('category/')) {
    const catSlug = slug.replace(/^category\//, '').replace(/\/+$/, '');
    return respond({
      type: 'redirect',
      slug,
      statusCode: 301,
      redirectUrl: `/blog-category/${catSlug}/`,
    });
  }

  if (slug.startsWith('tag/')) {
    const tagSlug = slug.replace(/^tag\//, '').replace(/\/+$/, '');
    return respond({ type: 'tag_archive', slug: tagSlug, statusCode: 200 });
  }

  if (slug.startsWith('author/')) {
    const authorSlug = slug.replace(/^author\//, '').replace(/\/+$/, '');
    return respond({ type: 'author_archive', slug: authorSlug, statusCode: 200 });
  }

  // 1.5 Redirects check BEFORE reserved check so legacy /product/* or reserved-like 301s always redirect
  const normalizedPath = '/' + slug.replace(/^\/+|\/+$/g, '') + '/';
  const barePath = '/' + slug.replace(/^\/+|\/+$/g, '');
  if (slug !== '') {
    try {
      const seoRed = db.get<{ to_path: string; status_code: number }>(
        'SELECT to_path, status_code FROM seo_redirects WHERE from_path = ? OR from_path = ?',
        [normalizedPath, barePath]
      );
      if (seoRed && seoRed.to_path) {
        const cleanTo = seoRed.to_path.replace(/^\/+|\/+$/g, '');
        if (cleanTo !== slug) {
          return respond({
            type: 'redirect',
            slug,
            statusCode: seoRed.status_code || 301,
            redirectUrl: seoRed.to_path,
          });
        }
      }

      const redirect = db.get<{ new_slug: string; status: number }>(
        'SELECT new_slug, status FROM page_redirects WHERE old_slug = ?',
        [slug]
      );
      if (redirect) {
        let target = redirect.new_slug.trim();
        if (!target.startsWith('/')) target = `/${target}/`;
        if (target.replace(/^\/+|\/+$/g, '') !== slug) {
          return respond({
            type: 'redirect',
            slug,
            statusCode: redirect.status || 301,
            redirectUrl: target,
          });
        }
      }

      const catRed = db.get<{ to_url: string; status_code: number }>(
        'SELECT to_url, status_code FROM category_redirects WHERE from_url = ? OR from_url = ?',
        [normalizedPath, barePath]
      );
      if (catRed && catRed.to_url.replace(/^\/+|\/+$/g, '') !== slug) {
        return respond({
          type: 'redirect',
          slug,
          statusCode: catRed.status_code || 301,
          redirectUrl: catRed.to_url,
        });
      }
    } catch (_) {}
  }

  if (isReservedSlug(slug)) {
    return respond({ type: 'reserved', slug, statusCode: 200 });
  }

  // 3. CMS pages (pages table)
  const strippedSlug = slug.replace(/^(blogs|blog)\//, '');
  try {
    let page = db.get<any>('SELECT * FROM pages WHERE slug = ? OR slug = ?', [slug, strippedSlug]);
    if (page) {
      if (page.is_published === 1 || page.is_published === true || page.is_published === undefined) {
        return respond({ type: 'cms_page', slug: page.slug, statusCode: 200, data: page });
      }
    }
  } catch (_) {}

  // 4. Published Blog Posts (blog_posts table)
  try {
    const post = db.get<any>('SELECT * FROM blog_posts WHERE slug = ? OR slug = ?', [slug, strippedSlug]);
    if (post) {
      if (post.status === 'published') {
        // Check if scheduled in future
        if (post.scheduled_at && new Date(post.scheduled_at) > new Date()) {
          return respond({ type: 'not_found', slug: post.slug, statusCode: 404 });
        }
        return respond({ type: 'blog_post', slug: post.slug, statusCode: 200, data: post });
      } else if (post.status === 'trashed') {
        return respond({ type: 'not_found', slug: post.slug, statusCode: 410 });
      } else {
        // Draft or pending review
        return respond({ type: 'not_found', slug: post.slug, statusCode: 404 });
      }
    }
  } catch (_) {}

  // 5. Fallback 404
  return respond({ type: 'not_found', slug, statusCode: 404 });
}

/**
 * Validates slug uniqueness across reserved routes, CMS pages, published/draft blog posts,
 * and redirects to prevent URL collision.
 */
export async function validateSlugConflict(
  targetSlug: string,
  options: { currentId?: string; entityType: 'page' | 'post' }
): Promise<{ available: boolean; conflictReason?: string; conflictType?: string }> {
  const slug = cleanSlug(targetSlug);
  if (!slug) {
    return { available: false, conflictReason: 'Slug cannot be empty' };
  }

  // 1. Check reserved list
  if (isReservedSlug(slug)) {
    return {
      available: false,
      conflictType: 'reserved',
      conflictReason: `The slug "${slug}" is reserved for an existing core application route.`,
    };
  }

  const db = await getDb();

  // 2. Check CMS pages table
  const existingPage = db.get<any>('SELECT id, title, slug FROM pages WHERE slug = ?', [slug]);
  if (existingPage && !(options.entityType === 'page' && String(existingPage.id) === String(options.currentId))) {
    return {
      available: false,
      conflictType: 'page',
      conflictReason: `The slug "${slug}" conflicts with existing CMS page "${existingPage.title}".`,
    };
  }

  // 3. Check blog_posts table
  const existingPost = db.get<any>('SELECT id, title, slug FROM blog_posts WHERE slug = ?', [slug]);
  if (existingPost && !(options.entityType === 'post' && String(existingPost.id) === String(options.currentId))) {
    return {
      available: false,
      conflictType: 'post',
      conflictReason: `The slug "${slug}" conflicts with existing blog post "${existingPost.title}".`,
    };
  }

  // 4. Check page_redirects
  const existingRedirect = db.get<any>('SELECT old_slug, new_slug FROM page_redirects WHERE old_slug = ?', [slug]);
  if (existingRedirect) {
    return {
      available: false,
      conflictType: 'redirect',
      conflictReason: `The slug "${slug}" is currently configured as a 301 redirect to "${existingRedirect.new_slug}".`,
    };
  }

  return { available: true };
}
