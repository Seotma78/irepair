import { Router } from 'express';
import { getDb } from '../db';
import {
  getSeoSettings,
  fetchLiveHtml,
  parseAndExtractSeo,
  captureSinglePage,
  capturePagesByType,
  discoverSitemapPages,
  importBaselineCsv,
  exportBaselineCsv,
  auditLocalSeoQuality,
  runFullParityAudit,
  KNOWN_25_PAGES,
  SeoPageCaptureRecord,
  SeoSettingsRecord
} from '../services/seoCaptureService';
import {
  createBaselineSnapshot,
  getLatestBaselineSnapshot,
  runParityCheck
} from '../services/seoBaselineService';

export const seoRouter = Router();

// 1. GET SEO settings
seoRouter.get('/settings', async (req, res) => {
  try {
    const db = await getDb();
    const settings = await getSeoSettings(db);
    return res.json({ success: true, settings });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. PUT SEO settings
seoRouter.put('/settings', async (req, res) => {
  try {
    const db = await getDb();
    const {
      wordpress_source_url,
      site_url,
      origins_to_rewrite,
      environment_mode,
      robots_source_mode,
      media_url_mode,
      auth_header,
      auto_sync_frequency,
      old_website_link_enabled,
      old_website_link_text,
      old_website_link_url,
      old_website_link_new_tab,
      old_website_link_desktop,
      old_website_link_mobile,
      product_schema_live_overlay,
      allow_local_override
    } = req.body;

    const current = await getSeoSettings(db);

    const updatedSource = (wordpress_source_url || current.wordpress_source_url).trim().replace(/\/+$/, '');
    const updatedSite = (site_url || current.site_url).trim().replace(/\/+$/, '');
    const originsJson = Array.isArray(origins_to_rewrite)
      ? JSON.stringify(origins_to_rewrite)
      : typeof origins_to_rewrite === 'string'
      ? origins_to_rewrite
      : current.origins_to_rewrite_json;

    const envMode = environment_mode || current.environment_mode || 'production';
    const robotsMode = robots_source_mode || current.robots_source_mode || 'baseline_protected';
    const mediaMode = media_url_mode || current.media_url_mode || 'keep_source';
    const syncFreq = auto_sync_frequency || current.auto_sync_frequency || 'disabled';
    const authHead = auth_header !== undefined ? auth_header : current.auth_header;
    const now = new Date().toISOString();

    const oldLinkEnabled = old_website_link_enabled !== undefined ? (old_website_link_enabled ? 1 : 0) : current.old_website_link_enabled;
    const oldLinkText = old_website_link_text !== undefined ? old_website_link_text : current.old_website_link_text;
    const oldLinkUrl = old_website_link_url !== undefined ? old_website_link_url : current.old_website_link_url;
    const oldLinkNewTab = old_website_link_new_tab !== undefined ? (old_website_link_new_tab ? 1 : 0) : current.old_website_link_new_tab;
    const oldLinkDesktop = old_website_link_desktop !== undefined ? (old_website_link_desktop ? 1 : 0) : current.old_website_link_desktop;
    const oldLinkMobile = old_website_link_mobile !== undefined ? (old_website_link_mobile ? 1 : 0) : current.old_website_link_mobile;
    const prodSchemaOverlay = product_schema_live_overlay !== undefined ? (product_schema_live_overlay ? 1 : 0) : current.product_schema_live_overlay;
    const allowOverride = allow_local_override !== undefined ? (allow_local_override ? 1 : 0) : current.allow_local_override;

    db.run(
      `UPDATE seo_settings SET
         wordpress_source_url = ?, site_url = ?, origins_to_rewrite_json = ?,
         environment_mode = ?, robots_source_mode = ?, media_url_mode = ?,
         auth_header = ?, auto_sync_frequency = ?,
         old_website_link_enabled = ?, old_website_link_text = ?, old_website_link_url = ?,
         old_website_link_new_tab = ?, old_website_link_desktop = ?, old_website_link_mobile = ?,
         product_schema_live_overlay = ?, allow_local_override = ?,
         updated_at = ?
       WHERE id = 'default'`,
      [
        updatedSource,
        updatedSite,
        originsJson,
        envMode,
        robotsMode,
        mediaMode,
        authHead || null,
        syncFreq,
        oldLinkEnabled,
        oldLinkText,
        oldLinkUrl,
        oldLinkNewTab,
        oldLinkDesktop,
        oldLinkMobile,
        prodSchemaOverlay,
        allowOverride,
        now
      ]
    );

    const updated = await getSeoSettings(db);
    return res.json({ success: true, settings: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. POST Test Source URL
seoRouter.post('/test-source-url', async (req, res) => {
  const startTime = Date.now();
  try {
    const db = await getDb();
    const current = await getSeoSettings(db);
    const targetUrl = (req.body.source_url || current.wordpress_source_url).trim().replace(/\/+$/, '');
    const authHeader = req.body.auth_header || current.auth_header;

    let origins = [targetUrl];
    try {
      origins = JSON.parse(current.origins_to_rewrite_json);
    } catch (_) {}

    const fetchRes = await fetchLiveHtml(targetUrl, authHeader);
    const latency = Date.now() - startTime;

    const parsed = parseAndExtractSeo(
      fetchRes.html,
      targetUrl,
      fetchRes.statusCode,
      fetchRes.redirectChain,
      origins,
      current.site_url
    );

    const isCloudflareBlocked =
      fetchRes.statusCode === 403 ||
      fetchRes.statusCode === 503 ||
      fetchRes.html.includes('Just a moment...') ||
      fetchRes.html.includes('cf-browser-verification') ||
      fetchRes.html.includes('Attention Required! | Cloudflare');

    return res.json({
      success: true,
      data: {
        tested_url: targetUrl,
        final_url: fetchRes.finalUrl,
        status_code: fetchRes.statusCode,
        latency_ms: latency,
        redirect_chain: fetchRes.redirectChain,
        is_redirected: fetchRes.redirectChain.length > 0,
        cloudflare_blocked: isCloudflareBlocked,
        has_title: Boolean(parsed.title),
        title: parsed.title,
        has_canonical: Boolean(parsed.canonical_url),
        canonical: parsed.canonical_url,
        has_rank_math_schema: parsed.has_rank_math_schema,
        schema_types: parsed.schema_types,
        robots: parsed.meta_robots,
        is_indexable: parsed.is_indexable,
        h1: parsed.h1_tags[0] || 'None detected'
      }
    });
  } catch (err: any) {
    return res.json({
      success: false,
      data: {
        latency_ms: Date.now() - startTime,
        error: err.message
      }
    });
  }
});

// 4. GET all captured pages
seoRouter.get('/pages', async (req, res) => {
  try {
    const db = await getDb();
    const pages = db.all<SeoPageCaptureRecord>('SELECT * FROM seo_page_captures ORDER BY path ASC');
    const settings = await getSeoSettings(db);
    const latestSnapshot = getLatestBaselineSnapshot(db);

    return res.json({
      success: true,
      pages,
      settings,
      known_pages: KNOWN_25_PAGES,
      has_baseline_snapshot: Boolean(latestSnapshot),
      latest_snapshot_date: latestSnapshot?.created_at,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. POST sync pages with filter_type support and mass-noindex protection
seoRouter.post('/sync-all', async (req, res) => {
  try {
    const db = await getDb();
    const filterType = (req.body.filter_type || 'all') as 'all' | 'pages' | 'products' | 'categories' | 'blog' | 'selected';
    const selectedPaths = Array.isArray(req.body.paths) ? req.body.paths : undefined;

    const result = await capturePagesByType(db, filterType, selectedPaths);
    return res.json({
      success: true,
      summary: {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        updated: result.updated,
        unchanged: result.unchanged,
        redirecting: result.redirecting,
        massNoindexDetected: result.massNoindexDetected,
      },
      massNoindexDetected: result.massNoindexDetected,
      pages: result.results,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. POST sync single page
seoRouter.post('/sync-page', async (req, res) => {
  try {
    const { path, entity_type } = req.body;
    if (!path) {
      return res.status(400).json({ success: false, error: 'Path is required' });
    }
    const db = await getDb();
    const record = await captureSinglePage(db, path, entity_type || 'page');
    return res.json({ success: true, page: record });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. PUT local page override
seoRouter.put('/page-override', async (req, res) => {
  try {
    const { path, title, meta_description, canonical_url, meta_robots, is_indexable, is_local_override } = req.body;
    if (!path) {
      return res.status(400).json({ success: false, error: 'Path is required' });
    }
    const db = await getDb();
    const cleanPath = '/' + path.replace(/^\/+/, '');
    const now = new Date().toISOString();

    db.run(
      `UPDATE seo_page_captures SET
         title = COALESCE(?, title),
         meta_description = COALESCE(?, meta_description),
         canonical_url = COALESCE(?, canonical_url),
         meta_robots = COALESCE(?, meta_robots),
         is_indexable = COALESCE(?, is_indexable),
         is_local_override = ?,
         updated_at = ?
       WHERE path = ?`,
      [
        title !== undefined ? title : null,
        meta_description !== undefined ? meta_description : null,
        canonical_url !== undefined ? canonical_url : null,
        meta_robots !== undefined ? meta_robots : null,
        is_indexable !== undefined ? (is_indexable ? 1 : 0) : null,
        is_local_override ? 1 : 0,
        now,
        cleanPath
      ]
    );

    const updated = db.get<SeoPageCaptureRecord>('SELECT * FROM seo_page_captures WHERE path = ?', [cleanPath]);
    return res.json({ success: true, page: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 8. GET Baseline Snapshot info
seoRouter.get('/baseline-snapshot', async (req, res) => {
  try {
    const db = await getDb();
    const snapshot = getLatestBaselineSnapshot(db);
    return res.json({ success: true, snapshot });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 9. POST Create Baseline Snapshot
seoRouter.post('/baseline-snapshot', async (req, res) => {
  try {
    const db = await getDb();
    const name = req.body.snapshot_name || 'Pre-Launch Baseline Snapshot';
    const notes = req.body.notes || 'Captured pre-launch state from irepair-mobiles.co.uk';
    const snapshot = await createBaselineSnapshot(db, name, notes);
    return res.json({ success: true, snapshot });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 10. GET Parity Check
seoRouter.get('/parity-check', async (req, res) => {
  try {
    const db = await getDb();
    const parity = runParityCheck(db);
    return res.json({ success: true, parity });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Redirects CRUD
seoRouter.get('/redirects', async (req, res) => {
  try {
    const db = await getDb();
    const redirects = db.all('SELECT * FROM seo_redirects ORDER BY created_at DESC');
    return res.json({ success: true, redirects });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

seoRouter.post('/redirects', async (req, res) => {
  try {
    const { from_path, to_path, status_code, origin } = req.body;
    if (!from_path || !to_path) {
      return res.status(400).json({ success: false, error: 'From and To paths are required' });
    }
    const db = await getDb();
    const id = `redir_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const cleanFrom = '/' + from_path.replace(/^\/+/, '');
    const cleanTo = to_path.startsWith('http') ? to_path : '/' + to_path.replace(/^\/+/, '');

    db.run(
      `INSERT INTO seo_redirects (id, from_path, to_path, status_code, origin, hit_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, cleanFrom, cleanTo, status_code || 301, origin || 'admin_manual', now, now]
    );

    return res.json({ success: true, id });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

seoRouter.delete('/redirects/:id', async (req, res) => {
  try {
    const db = await getDb();
    db.run('DELETE FROM seo_redirects WHERE id = ?', [req.params.id]);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 12. POST Import Baseline CSV (dry-run or real apply)
seoRouter.post('/import-baseline-csv', async (req, res) => {
  try {
    const { csv_content, dry_run } = req.body;
    if (!csv_content || typeof csv_content !== 'string') {
      return res.status(400).json({ success: false, error: 'csv_content string is required' });
    }
    const db = await getDb();
    const result = importBaselineCsv(db, csv_content, Boolean(dry_run));
    return res.json({ success: true, result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 13. GET Export Baseline CSV
seoRouter.get('/export-baseline-csv', async (req, res) => {
  try {
    const db = await getDb();
    const csv = exportBaselineCsv(db);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="irepair_mobiles_baseline_seo.csv"');
    return res.send(csv);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 14. GET Discover Pages from WordPress Sitemaps
seoRouter.get('/discover-pages', async (req, res) => {
  try {
    const db = await getDb();
    const result = await discoverSitemapPages(db);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 15. GET Full 283-URL Parity Audit
seoRouter.get('/parity-audit', async (req, res) => {
  try {
    const db = await getDb();
    const audit = runFullParityAudit(db);
    return res.json({ success: true, audit });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 16. GET Local SEO Schema Quality Check
seoRouter.get('/local-seo-quality', async (req, res) => {
  try {
    const db = await getDb();
    const audit = auditLocalSeoQuality(db);
    return res.json({ success: true, ...audit });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 17. GET Slug Conflicts between pages, posts, and redirects
seoRouter.get('/slug-conflicts', async (req, res) => {
  try {
    const db = await getDb();
    const pages = db.all<{ id: string; slug: string; title: string }>('SELECT id, slug, title FROM pages');
    const posts = db.all<{ id: string; slug: string; title: string }>('SELECT id, slug, title FROM blog_posts WHERE status = "published"');
    const redirects = db.all<{ id: string; from_path: string; to_path: string }>('SELECT id, from_path, to_path FROM seo_redirects');

    const conflicts: { type: string; slug: string; description: string; paths: string[] }[] = [];
    const pageSlugs = new Map(pages.map((p) => [p.slug.toLowerCase().replace(/^\/+|\/+$/g, ''), p]));
    const postSlugs = new Map(posts.map((p) => [p.slug.toLowerCase().replace(/^\/+|\/+$/g, ''), p]));

    // Check pages vs posts
    for (const [slug, page] of pageSlugs.entries()) {
      if (postSlugs.has(slug)) {
        const post = postSlugs.get(slug)!;
        conflicts.push({
          type: 'page_post_collision',
          slug,
          description: `Page "${page.title}" and Blog Post "${post.title}" share identical root slug "/${slug}/"`,
          paths: [`/${page.slug}/`, `/${post.slug}/`],
        });
      }
    }

    // Check redirect collisions with active pages or posts
    for (const red of redirects) {
      const redSlug = red.from_path.toLowerCase().replace(/^\/+|\/+$/g, '');
      if (pageSlugs.has(redSlug)) {
        conflicts.push({
          type: 'redirect_page_collision',
          slug: redSlug,
          description: `Redirect from "${red.from_path}" shadows existing CMS page "${pageSlugs.get(redSlug)?.title}"`,
          paths: [red.from_path, red.to_path],
        });
      }
      if (postSlugs.has(redSlug)) {
        conflicts.push({
          type: 'redirect_post_collision',
          slug: redSlug,
          description: `Redirect from "${red.from_path}" shadows existing Blog Post "${postSlugs.get(redSlug)?.title}"`,
          paths: [red.from_path, red.to_path],
        });
      }
    }

    return res.json({ success: true, count: conflicts.length, conflicts });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
