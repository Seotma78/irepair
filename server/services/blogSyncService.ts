import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import crypto from 'crypto';
import { URL } from 'url';
import { getDb } from '../db';
import { cleanSlug, isReservedSlug } from '../../src/constants/reservedSlugs';
import { decodeHtmlEntities } from '../../src/utils/decodeHtml';
import { invalidateSlugCache } from './slugResolverService';

export interface BlogSyncConflict {
  postTitle: string;
  slug: string;
  conflictingItem: string;
}

export interface BlogSyncSummary {
  postsCreated: number;
  postsUpdated: number;
  postsTrashed: number;
  categories: number;
  tags: number;
  authors: number;
  imagesDownloaded: number;
  conflicts: BlogSyncConflict[];
  brokenLinks: string[];
  errors: string[];
  durationMs: number;
  totalRemotePosts: number;
}

export interface BlogSyncProgress {
  isRunning: boolean;
  stage: string; // 'fetching_terms' | 'fetching_posts' | 'downloading_media' | 'completed' | 'failed';
  currentStep: number;
  totalSteps: number;
  summary: BlogSyncSummary | null;
}

let isBlogSyncRunning = false;
let currentProgress: BlogSyncProgress = {
  isRunning: false,
  stage: 'idle',
  currentStep: 0,
  totalSteps: 0,
  summary: null,
};

export function isBlogSyncInProgress(): boolean {
  return isBlogSyncRunning;
}

export function getBlogSyncProgress(): BlogSyncProgress {
  return currentProgress;
}

const BLOG_UPLOADS_DIR = path.resolve(process.cwd(), 'public', 'uploads', 'blog');
if (!fs.existsSync(BLOG_UPLOADS_DIR)) {
  fs.mkdirSync(BLOG_UPLOADS_DIR, { recursive: true });
}

function fetchJson<T = any>(urlStr: string): Promise<{ statusCode: number; headers: any; data: T }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlStr);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const req = client.request(
      parsedUrl,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'iRepair-WordPress-Blog-Sync/1.0',
        },
        timeout: 20000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : null;
            resolve({ statusCode: res.statusCode || 200, headers: res.headers, data: parsed });
          } catch (e: any) {
            reject(new Error(`Failed to parse JSON from ${urlStr}: ${e.message}`));
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${urlStr}`));
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

function downloadFile(remoteUrl: string, destPath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(remoteUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const fileStream = fs.createWriteStream(destPath);
      const req = client.request(
        parsedUrl,
        {
          method: 'GET',
          headers: { 'User-Agent': 'iRepair-Media-Downloader/1.0' },
          timeout: 6000,
        },
        (res) => {
          if (res.statusCode && (res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
            fileStream.close();
            fs.unlink(destPath, () => {});
            return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
          }

          if (res.statusCode !== 200) {
            fileStream.close();
            fs.unlink(destPath, () => {});
            return resolve(false);
          }

          res.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            resolve(true);
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        fs.unlink(destPath, () => {});
        resolve(false);
      });

      req.on('error', () => {
        fs.unlink(destPath, () => {});
        resolve(false);
      });

      fileStream.on('error', () => {
        fs.unlink(destPath, () => {});
        resolve(false);
      });

      req.end();
    } catch (_) {
      resolve(false);
    }
  });
}

/**
 * Downloads a remote WordPress media file to local disk and returns local URL (/uploads/blog/...)
 */
async function localiseMediaUrl(remoteUrl: string, db: any, wpId?: number, altText?: string): Promise<string> {
  if (!remoteUrl || !remoteUrl.startsWith('http')) return remoteUrl || '';

  // Check if already in blog_media table
  const existing = db.get('SELECT local_path FROM blog_media WHERE url = ?', [remoteUrl]);
  if (existing && existing.local_path) {
    return existing.local_path;
  }

  try {
    const parsed = new URL(remoteUrl);
    const basename = path.basename(parsed.pathname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const hash = crypto.createHash('md5').update(remoteUrl).digest('hex').substring(0, 8);
    const filename = `${hash}_${basename}`;
    const localFilePath = path.join(BLOG_UPLOADS_DIR, filename);
    const publicUrl = `/uploads/blog/${filename}`;

    if (!fs.existsSync(localFilePath) || fs.statSync(localFilePath).size === 0) {
      const ok = await downloadFile(remoteUrl, localFilePath);
      if (!ok) {
        return remoteUrl; // fallback to remote URL if download failed
      }
    }

    const mediaId = `media_${Date.now()}_${hash}`;
    db.run(
      `INSERT OR REPLACE INTO blog_media (id, wp_id, url, local_path, alt, mime, width, height)
       VALUES (?, ?, ?, ?, ?, '', 0, 0)`,
      [mediaId, wpId || null, remoteUrl, publicUrl, altText || '']
    );

    return publicUrl;
  } catch (err) {
    return remoteUrl;
  }
}

/**
 * Rewrites WordPress content HTML:
 * 1. Rewrites image src and srcset to downloaded local paths
 * 2. Rewrites internal links from https://irepair-mobiles.co.uk to local paths
 * 3. Preserves dimensions and alt text
 */
async function processContentHtml(
  contentHtml: string,
  db: any,
  brokenLinks: string[]
): Promise<string> {
  if (!contentHtml) return '';

  let output = contentHtml;

  // 1. Rewrite internal domain links (irepair-mobiles.co.uk)
  output = output.replace(/https?:\/\/(?:www\.)?irepair-mobiles\.co\.uk(\/[^"'\s>]*)/gi, (match, pathname) => {
    if (!pathname || pathname === '/') return '/';
    return pathname.startsWith('/') ? pathname : `/${pathname}`;
  });

  // 2. Find all images in content and localize them
  const imgRegex = /<img[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>/gi;
  let match;
  const imageUrlsToDownload: { original: string; alt?: string }[] = [];

  while ((match = imgRegex.exec(contentHtml)) !== null) {
    const originalSrc = match[1];
    if (originalSrc.includes('irepair-mobiles.co.uk') || originalSrc.includes('wp-content')) {
      const altMatch = match[0].match(/alt=["']([^"']*)["']/i);
      imageUrlsToDownload.push({ original: originalSrc, alt: altMatch ? altMatch[1] : '' });
    }
  }

  // Download images concurrently for this post
  await Promise.all(
    imageUrlsToDownload.map(async (item) => {
      try {
        const localPath = await localiseMediaUrl(item.original, db, undefined, item.alt);
        if (localPath && localPath !== item.original) {
          output = output.split(item.original).join(localPath);
        }
      } catch (_) {}
    })
  );

  // 3. Remove remote srcset references or rewrite them
  output = output.replace(/srcset=["']([^"']+)["']/gi, '');

  return output;
}

function calculateReadingTime(html: string): number {
  const text = (html || '').replace(/<[^>]+>/g, ' ');
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

/**
 * Main WordPress Blog Sync Runner
 */
export async function syncWordPressBlog(options: {
  mode?: 'new_updated' | 'full';
} = {}): Promise<BlogSyncSummary> {
  if (isBlogSyncRunning) {
    throw new Error('Blog synchronization is already in progress');
  }

  isBlogSyncRunning = true;
  const startTime = Date.now();
  const syncLogId = `sync_blog_${startTime}`;
  const now = new Date().toISOString();

  const summary: BlogSyncSummary = {
    postsCreated: 0,
    postsUpdated: 0,
    postsTrashed: 0,
    categories: 0,
    tags: 0,
    authors: 0,
    imagesDownloaded: 0,
    conflicts: [],
    brokenLinks: [],
    errors: [],
    durationMs: 0,
    totalRemotePosts: 0,
  };

  currentProgress = {
    isRunning: true,
    stage: 'fetching_terms',
    currentStep: 0,
    totalSteps: 100,
    summary,
  };

  const db = await getDb();

  // Log start
  try {
    db.run(
      `INSERT INTO sync_logs (id, type, started_at, status, summary, error)
       VALUES (?, 'blog', ?, 'running', ?, NULL)`,
      [syncLogId, now, JSON.stringify(summary)]
    );
  } catch (_) {}

  try {
    // 0. Ensure Blogs index page exists in CMS pages
    const existingBlogsPage = db.get('SELECT id FROM pages WHERE slug = ?', ['blogs']);
    if (!existingBlogsPage) {
      db.run(
        `INSERT INTO pages (
          id, slug, title, status, seo_json, sections_json, created_at, updated_at
        ) VALUES (
          'page_blogs_cms',
          'blogs',
          'Blogs',
          'published',
          ?,
          '[]',
          ?,
          ?
        )`,
        [
          JSON.stringify({
            metaTitle: 'iRepair Mobiles UK Blog | Repair Guides, Tips & Tech News',
            metaDescription: 'Browse our expert repair advice, smartphone troubleshooting tips, refurbished buyer guides, and latest UK mobile news.',
          }),
          now,
          now
        ]
      );
    }

    // 1. Sync Authors (/wp-json/wp/v2/users)
    try {
      const usersRes = await fetchJson<any[]>('https://irepair-mobiles.co.uk/wp-json/wp/v2/users?per_page=100');
      if (Array.isArray(usersRes.data)) {
        for (const u of usersRes.data) {
          const authorId = `author_${u.id}`;
          const avatarUrl = u.avatar_urls?.['96'] || u.avatar_urls?.['48'] || '';
          db.run(
            `INSERT OR REPLACE INTO blog_authors (id, wp_id, name, slug, avatar_url, bio)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [authorId, u.id, u.name, u.slug, avatarUrl, u.description || '']
          );
          summary.authors++;
        }
      }
    } catch (e: any) {
      summary.errors.push(`Failed to fetch authors: ${e.message}`);
    }

    // 2. Sync Categories (/wp-json/wp/v2/categories)
    const categoryWpToLocalId = new Map<number, string>();
    try {
      const catsRes = await fetchJson<any[]>('https://irepair-mobiles.co.uk/wp-json/wp/v2/categories?per_page=100');
      if (Array.isArray(catsRes.data)) {
        for (const c of catsRes.data) {
          const catId = `bcat_${c.id}`;
          categoryWpToLocalId.set(c.id, catId);
          db.run(
            `INSERT OR REPLACE INTO blog_categories (id, wp_id, parent_id, name, slug, description, count, source, seo_title, seo_description)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'wordpress', ?, ?)`,
            [
              catId,
              c.id,
              c.parent ? `bcat_${c.parent}` : null,
              decodeHtmlEntities(c.name),
              c.slug,
              decodeHtmlEntities(c.description || ''),
              c.count || 0,
              c.yoast_head_json?.title || `${decodeHtmlEntities(c.name)} | iRepair Mobiles Blog`,
              c.yoast_head_json?.description || decodeHtmlEntities(c.description || ''),
            ]
          );
          summary.categories++;
        }
      }
    } catch (e: any) {
      summary.errors.push(`Failed to fetch blog categories: ${e.message}`);
    }

    // 3. Sync Tags (/wp-json/wp/v2/tags)
    const tagWpToLocalId = new Map<number, string>();
    try {
      let tagPage = 1;
      let tagTotalPages = 1;
      while (tagPage <= tagTotalPages) {
        const tagsRes = await fetchJson<any[]>(`https://irepair-mobiles.co.uk/wp-json/wp/v2/tags?per_page=100&page=${tagPage}`);
        if (Array.isArray(tagsRes.data)) {
          for (const t of tagsRes.data) {
            const tagId = `btag_${t.id}`;
            tagWpToLocalId.set(t.id, tagId);
            db.run(
              `INSERT OR REPLACE INTO blog_tags (id, wp_id, name, slug, source)
               VALUES (?, ?, ?, ?, 'wordpress')`,
              [tagId, t.id, decodeHtmlEntities(t.name), t.slug]
            );
            summary.tags++;
          }
        }
        const total = parseInt(tagsRes.headers?.['x-wp-totalpages'] || '1', 10);
        tagTotalPages = isNaN(total) ? tagPage : total;
        if (tagsRes.data.length === 0 || tagPage >= tagTotalPages) break;
        tagPage++;
      }
    } catch (e: any) {
      summary.errors.push(`Failed to fetch blog tags: ${e.message}`);
    }

    // 4. Sync Posts (/wp-json/wp/v2/posts?_embed=1)
    currentProgress.stage = 'fetching_posts';
    const remotePosts: any[] = [];
    let postPage = 1;
    let postTotalPages = 1;

    while (postPage <= postTotalPages) {
      const postsRes = await fetchJson<any[]>(
        `https://irepair-mobiles.co.uk/wp-json/wp/v2/posts?per_page=100&page=${postPage}&_embed=1`
      );
      if (Array.isArray(postsRes.data)) {
        remotePosts.push(...postsRes.data);
      }
      const total = parseInt(postsRes.headers?.['x-wp-totalpages'] || '1', 10);
      postTotalPages = isNaN(total) ? postPage : total;
      if (postsRes.data.length === 0 || postPage >= postTotalPages) break;
      postPage++;
    }

    summary.totalRemotePosts = remotePosts.length;
    currentProgress.totalSteps = remotePosts.length;
    const remoteWpIds = new Set<number>(remotePosts.map((p) => p.id));

    // Get all existing CMS page slugs to detect collisions
    const existingCmsPages = db.all<{ slug: string; title: string }>('SELECT slug, title FROM pages');
    const pageSlugMap = new Map<string, string>(existingCmsPages.map((p) => [cleanSlug(p.slug), p.title]));

    let postIndex = 0;
    for (const p of remotePosts) {
      postIndex++;
      currentProgress.currentStep = postIndex;

      const wpId = p.id;
      const rawTitle = p.title?.rendered || 'Untitled Post';
      const title = decodeHtmlEntities(rawTitle);
      const slug = cleanSlug(p.slug);
      const wpLink = p.link || `https://irepair-mobiles.co.uk/${slug}/`;

      // Collision Check (Requirement B0)
      if (isReservedSlug(slug)) {
        summary.conflicts.push({
          postTitle: title,
          slug,
          conflictingItem: `Reserved core application route /${slug}/`,
        });
        continue;
      }

      if (pageSlugMap.has(slug)) {
        summary.conflicts.push({
          postTitle: title,
          slug,
          conflictingItem: `CMS Page "${pageSlugMap.get(slug)}" (/${slug}/)`,
        });
        continue;
      }

      // Check if post already exists locally
      const existingLocal = db.get<any>('SELECT * FROM blog_posts WHERE wp_id = ? OR slug = ?', [wpId, slug]);

      if (existingLocal && existingLocal.source === 'local') {
        // Never touch source='local' posts created in dashboard!
        continue;
      }

      if (existingLocal && existingLocal.edited_locally === 1 && options.mode !== 'full') {
        // Preserved local edits
        continue;
      }

      // Extract author
      const authorId = p.author ? `author_${p.author}` : null;

      // Extract featured media
      let featuredImageUrl = '';
      let featuredImageAlt = '';
      if (p._embedded?.['wp:featuredmedia']?.[0]) {
        const mediaObj = p._embedded['wp:featuredmedia'][0];
        const remoteMediaUrl = mediaObj.source_url || mediaObj.media_details?.sizes?.full?.source_url;
        featuredImageAlt = mediaObj.alt_text || title;
        if (remoteMediaUrl) {
          featuredImageUrl = await localiseMediaUrl(remoteMediaUrl, db, mediaObj.id, featuredImageAlt);
          if (featuredImageUrl.startsWith('/uploads/')) {
            summary.imagesDownloaded++;
          }
        }
      }

      // Process content HTML and rewrite internal links / images
      const rawContent = p.content?.rendered || '';
      const processedContent = await processContentHtml(rawContent, db, summary.brokenLinks);
      const excerpt = decodeHtmlEntities(p.excerpt?.rendered?.replace(/<[^>]+>/g, '').trim() || '');
      const readingTime = calculateReadingTime(processedContent);

      // Extract Yoast SEO metadata
      const yoast = p.yoast_head_json || {};
      const seoTitle = yoast.title ? decodeHtmlEntities(yoast.title) : `${title} | iRepair Mobiles UK`;
      const seoDesc = yoast.description ? decodeHtmlEntities(yoast.description) : excerpt || title;
      const canonicalUrl = `https://irepair-mobiles.co.uk/${slug}/`;
      const ogImage = yoast.og_image?.[0]?.url || featuredImageUrl;

      const publishedAt = p.date ? new Date(p.date).toISOString() : now;
      const modifiedAt = p.modified ? new Date(p.modified).toISOString() : now;

      const postId = existingLocal ? existingLocal.id : `post_${wpId}`;

      if (existingLocal) {
        db.run(
          `UPDATE blog_posts
           SET title = ?, slug = ?, excerpt = ?, content = ?, featured_image_url = ?, featured_image_alt = ?,
               author_id = ?, status = 'published', published_at = ?, modified_at = ?, seo_title = ?,
               seo_description = ?, canonical_url = ?, og_image = ?, reading_time = ?, wp_link = ?,
               source = 'wordpress', edited_locally = 0, synced_at = ?, updated_at = ?
           WHERE id = ?`,
          [
            title,
            slug,
            excerpt,
            processedContent,
            featuredImageUrl,
            featuredImageAlt,
            authorId,
            publishedAt,
            modifiedAt,
            seoTitle,
            seoDesc,
            canonicalUrl,
            ogImage,
            readingTime,
            wpLink,
            now,
            now,
            postId,
          ]
        );
        summary.postsUpdated++;
      } else {
        db.run(
          `INSERT INTO blog_posts (
            id, wp_id, title, slug, excerpt, content, featured_image_url, featured_image_alt,
            author_id, status, published_at, scheduled_at, modified_at, seo_title,
            seo_description, canonical_url, og_image, reading_time, source, edited_locally,
            wp_link, synced_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, NULL, ?, ?, ?, ?, ?, ?, 'wordpress', 0, ?, ?, ?, ?)`,
          [
            postId,
            wpId,
            title,
            slug,
            excerpt,
            processedContent,
            featuredImageUrl,
            featuredImageAlt,
            authorId,
            publishedAt,
            modifiedAt,
            seoTitle,
            seoDesc,
            canonicalUrl,
            ogImage,
            readingTime,
            wpLink,
            now,
            now,
            now,
          ]
        );
        summary.postsCreated++;
      }

      // Update join tables for categories and tags
      try {
        db.run('DELETE FROM blog_post_categories WHERE post_id = ?', [postId]);
        if (Array.isArray(p.categories)) {
          for (const catWpId of p.categories) {
            const catLocalId = categoryWpToLocalId.get(catWpId) || `bcat_${catWpId}`;
            db.run(
              'INSERT OR REPLACE INTO blog_post_categories (post_id, category_id) VALUES (?, ?)',
              [postId, catLocalId]
            );
          }
        }

        db.run('DELETE FROM blog_post_tags WHERE post_id = ?', [postId]);
        if (Array.isArray(p.tags)) {
          for (const tagWpId of p.tags) {
            const tagLocalId = tagWpToLocalId.get(tagWpId) || `btag_${tagWpId}`;
            db.run(
              'INSERT OR REPLACE INTO blog_post_tags (post_id, tag_id) VALUES (?, ?)',
              [postId, tagLocalId]
            );
          }
        }
      } catch (_) {}
    }

    // 5. Handle Trashed / Deleted Remote Posts
    const allLocalWpPosts = db.all<{ id: string; wp_id: number; status: string }>(
      "SELECT id, wp_id, status FROM blog_posts WHERE source = 'wordpress' AND wp_id IS NOT NULL"
    );

    for (const post of allLocalWpPosts) {
      if (!remoteWpIds.has(Number(post.wp_id)) && post.status !== 'trashed') {
        db.run("UPDATE blog_posts SET status = 'trashed', updated_at = ? WHERE id = ?", [now, post.id]);
        summary.postsTrashed++;
      }
    }

    summary.durationMs = Date.now() - startTime;

    // Log success
    try {
      db.run(
        `UPDATE sync_logs
         SET status = 'success', finished_at = ?, summary = ?
         WHERE id = ?`,
        [new Date().toISOString(), JSON.stringify(summary), syncLogId]
      );
    } catch (_) {}

    invalidateSlugCache();

    currentProgress = {
      isRunning: false,
      stage: 'completed',
      currentStep: remotePosts.length,
      totalSteps: remotePosts.length,
      summary,
    };

    return summary;
  } catch (err: any) {
    summary.durationMs = Date.now() - startTime;
    summary.errors.push(err.message || 'Unknown error');

    try {
      db.run(
        `UPDATE sync_logs
         SET status = 'failed', finished_at = ?, summary = ?, error = ?
         WHERE id = ?`,
        [new Date().toISOString(), JSON.stringify(summary), err.message, syncLogId]
      );
    } catch (_) {}

    currentProgress = {
      isRunning: false,
      stage: 'failed',
      currentStep: 0,
      totalSteps: 0,
      summary,
    };

    throw err;
  } finally {
    isBlogSyncRunning = false;
  }
}
