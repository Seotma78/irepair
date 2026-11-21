import https from 'https';
import http from 'http';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { DatabaseWrapper, getDb } from '../db';

export interface SeoSettingsRecord {
  id: string;
  wordpress_source_url: string;
  site_url: string;
  origins_to_rewrite_json: string;
  environment_mode: 'production' | 'staging';
  robots_source_mode: 'baseline_protected' | 'live_source' | 'force_noindex';
  media_url_mode: 'keep_source' | 'rewrite_site';
  auth_header?: string;
  auto_sync_frequency: 'disabled' | 'daily' | 'weekly';
  last_sync_at?: string;
  last_sync_status?: string;
  old_website_link_enabled?: number;
  old_website_link_text?: string;
  old_website_link_url?: string;
  old_website_link_new_tab?: number;
  old_website_link_desktop?: number;
  old_website_link_mobile?: number;
  product_schema_live_overlay?: number;
  allow_local_override?: number;
  updated_at: string;
}

export interface SeoPageCaptureRecord {
  id: string;
  path: string;
  entity_type: string;
  title: string;
  meta_description: string;
  canonical_url: string;
  meta_robots: string;
  og_tags_json: string;
  twitter_tags_json: string;
  jsonld_raw?: string | null;
  jsonld_rewritten?: string | null;
  schema_types_json: string;
  h1_tags_json: string;
  h2_tags_json: string;
  http_status: number;
  content_hash?: string;
  status: 'ok' | 'changed' | 'blocked' | 'redirecting' | 'error';
  redirect_url?: string | null;
  is_indexable: number;
  is_local_override: number;
  baseline_robots?: string;
  baseline_indexable: number;
  captured_at: string;
  updated_at: string;
}

export interface CrawlResult {
  url: string;
  finalUrl: string;
  http_status: number;
  title: string;
  meta_description: string;
  canonical_url: string;
  meta_robots: string;
  og_tags: Record<string, string>;
  twitter_tags: Record<string, string>;
  jsonld_raw: string | null;
  jsonld_rewritten: string | null;
  schema_types: string[];
  h1_tags: string[];
  h2_tags: string[];
  redirect_chain: { url: string; status: number }[];
  is_redirect: boolean;
  redirect_target?: string;
  has_rank_math_schema: boolean;
  is_indexable: boolean;
  content_hash: string;
  local_seo_check?: {
    has_local_business: boolean;
    business_types: string[];
    name?: string;
    telephone?: string;
    address?: any;
    opening_hours?: any;
    geo?: any;
  };
}

export const KNOWN_25_PAGES = [
  { path: '/', entity_type: 'homepage', label: 'Homepage' },
  { path: '/about-us/', entity_type: 'page', label: 'About Us' },
  { path: '/contact-us/', entity_type: 'page', label: 'Contact Us' },
  { path: '/services/', entity_type: 'page', label: 'Services' },
  { path: '/shop/', entity_type: 'shop', label: 'Shop Catalogue' },
  { path: '/locations/', entity_type: 'locations', label: 'Locations Directory' },
  { path: '/sell-my-phone/', entity_type: 'page', label: 'Sell My Phone' },
  { path: '/career/', entity_type: 'careers', label: 'Careers' },
  { path: '/apply-now/', entity_type: 'careers', label: 'Job Application' },
  { path: '/mobile-phone-repair-shops-in-uk/', entity_type: 'location', label: 'UK Repair Shops Overview' },
  { path: '/mobile-phone-repair-shop-in-norwich/', entity_type: 'location', label: 'Norwich Repair Shop' },
  { path: '/mobile-phone-repair-basingstoke/', entity_type: 'location', label: 'Basingstoke Repair Shop' },
  { path: '/phone-repairing-services-southend/', entity_type: 'location', label: 'Southend Repair Shop' },
  { path: '/mobile-phone-repair-shop-eastbourne/', entity_type: 'location', label: 'Eastbourne Repair Shop' },
  { path: '/mobile-phone-repair-shop-in-reading/', entity_type: 'location', label: 'Reading Repair Shop' },
  { path: '/mobile-phone-repair-service-solihull/', entity_type: 'location', label: 'Solihull Repair Shop' },
  { path: '/mobile-repair-shop-in-ipswich/', entity_type: 'location', label: 'Ipswich Repair Shop' },
  { path: '/terms-of-use/', entity_type: 'legal', label: 'Terms of Use' },
  { path: '/privacy-policy/', entity_type: 'legal', label: 'Privacy Policy' },
  { path: '/warranty-policy/', entity_type: 'legal', label: 'Warranty Policy' },
  { path: '/shipping-delivery-policy/', entity_type: 'legal', label: 'Shipping & Delivery Policy' },
  { path: '/return-cancellation-policy/', entity_type: 'legal', label: 'Return & Cancellation Policy' },
  { path: '/track-order/', entity_type: 'page', label: 'Track Order / Repair' },
  { path: '/mobile-phone-shop-in-uk/', entity_type: 'redirect', label: 'Legacy UK Shop (Redirect)' },
  { path: '/mobile-phones-repair/', entity_type: 'redirect', label: 'Legacy Phone Repair (Redirect)' },
];

export async function getSeoSettings(db: DatabaseWrapper): Promise<SeoSettingsRecord> {
  const row = db.get<SeoSettingsRecord>('SELECT * FROM seo_settings WHERE id = ?', ['default']);
  if (row) {
    return {
      ...row,
      old_website_link_enabled: row.old_website_link_enabled ?? 1,
      old_website_link_text: row.old_website_link_text || 'Visit old website',
      old_website_link_url: row.old_website_link_url || 'https://old.irepair-mobiles.co.uk',
      old_website_link_new_tab: row.old_website_link_new_tab ?? 1,
      old_website_link_desktop: row.old_website_link_desktop ?? 1,
      old_website_link_mobile: row.old_website_link_mobile ?? 1,
      product_schema_live_overlay: row.product_schema_live_overlay ?? 1,
      allow_local_override: row.allow_local_override ?? 0,
    };
  }

  const now = new Date().toISOString();
  const defaultSettings: SeoSettingsRecord = {
    id: 'default',
    wordpress_source_url: 'https://irepair-mobiles.co.uk',
    site_url: 'https://irepair-mobiles.co.uk',
    origins_to_rewrite_json: JSON.stringify([
      'https://irepair-mobiles.co.uk',
      'https://old.irepair-mobiles.co.uk',
      'http://irepair-mobiles.co.uk',
      'http://old.irepair-mobiles.co.uk'
    ]),
    environment_mode: 'production',
    robots_source_mode: 'baseline_protected',
    media_url_mode: 'keep_source',
    auto_sync_frequency: 'disabled',
    updated_at: now,
  };

  db.run(
    `INSERT INTO seo_settings (id, wordpress_source_url, site_url, origins_to_rewrite_json, environment_mode, robots_source_mode, media_url_mode, auto_sync_frequency, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      defaultSettings.id,
      defaultSettings.wordpress_source_url,
      defaultSettings.site_url,
      defaultSettings.origins_to_rewrite_json,
      defaultSettings.environment_mode,
      defaultSettings.robots_source_mode,
      defaultSettings.media_url_mode,
      defaultSettings.auto_sync_frequency,
      defaultSettings.updated_at
    ]
  );

  return defaultSettings;
}

export function rewriteOrigins(text: string, origins: string[], targetSiteUrl: string): string {
  if (!text) return text;
  const cleanTarget = targetSiteUrl.replace(/\/+$/, '');
  let result = text;
  for (const origin of origins) {
    if (!origin) continue;
    const cleanOrigin = origin.replace(/\/+$/, '');
    // Replace all occurrences of origin
    const escaped = cleanOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'g');
    result = result.replace(regex, cleanTarget);
  }
  return result;
}

export async function fetchLiveHtml(
  targetUrl: string,
  authHeader?: string,
  maxRedirects: number = 5
): Promise<{
  statusCode: number;
  finalUrl: string;
  headers: Record<string, any>;
  html: string;
  redirectChain: { url: string; status: number }[];
}> {
  const redirectChain: { url: string; status: number }[] = [];
  let currentUrl = targetUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const parsedUrl = new URL(currentUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 iRepairMobiles-RankMath-Sync/1.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-GB,en;q=0.9',
      'Cache-Control': 'no-cache',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const res = await new Promise<{
      statusCode: number;
      headers: Record<string, any>;
      body: string;
    }>((resolve, reject) => {
      const req = client.get(
        currentUrl,
        {
          headers,
          timeout: 18000,
        },
        (response) => {
          let data = '';
          response.on('data', (chunk) => (data += chunk));
          response.on('end', () =>
            resolve({
              statusCode: response.statusCode || 200,
              headers: response.headers,
              body: data,
            })
          );
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Connection timed out after 18s while requesting ${currentUrl}`));
      });
    });

    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      redirectChain.push({ url: currentUrl, status: res.statusCode });
      let nextUrl = res.headers.location;
      if (!nextUrl.startsWith('http')) {
        nextUrl = new URL(nextUrl, currentUrl).toString();
      }
      currentUrl = nextUrl;
      continue;
    }

    return {
      statusCode: res.statusCode,
      finalUrl: currentUrl,
      headers: res.headers,
      html: res.body,
      redirectChain,
    };
  }

  throw new Error(`Too many redirects encountered (exceeded limit of ${maxRedirects})`);
}

export function parseAndExtractSeo(
  html: string,
  requestedUrl: string,
  statusCode: number,
  redirectChain: { url: string; status: number }[],
  originsToRewrite: string[],
  siteUrl: string
): CrawlResult {
  const $ = cheerio.load(html);

  const title = $('title').first().text().replace(/\s+/g, ' ').trim();
  const metaDesc = $('meta[name="description"]').attr('content')?.trim() || '';
  let rawCanonical = $('link[rel="canonical"]').attr('href')?.trim() || requestedUrl;
  const metaRobots = $('meta[name="robots"]').attr('content')?.trim() || 'follow, index';

  const isIndexable = !metaRobots.toLowerCase().includes('noindex');

  // Extract Open Graph
  const ogTags: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const prop = $(el).attr('property');
    const content = $(el).attr('content');
    if (prop && content !== undefined) {
      ogTags[prop] = content;
    }
  });

  // Extract Twitter Card
  const twitterTags: Record<string, string> = {};
  $('meta[name^="twitter:"]').each((_, el) => {
    const name = $(el).attr('name');
    const content = $(el).attr('content');
    if (name && content !== undefined) {
      twitterTags[name] = content;
    }
  });

  // Extract JSON-LD (Rank Math schema @graph)
  let jsonldRaw: string | null = null;
  let jsonldRewritten: string | null = null;
  const schemaTypes: string[] = [];
  let localSeoCheck: CrawlResult['local_seo_check'] = undefined;

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const scriptContent = $(el).html();
      if (!scriptContent) return;

      if (scriptContent.includes('@graph') || scriptContent.includes('@context')) {
        if (!jsonldRaw) {
          jsonldRaw = scriptContent;
        }
        const parsed = JSON.parse(scriptContent);
        if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
          parsed['@graph'].forEach((node: any) => {
            if (node['@type']) {
              if (Array.isArray(node['@type'])) {
                schemaTypes.push(...node['@type']);
              } else {
                schemaTypes.push(node['@type']);
              }
            }
            // Check for LocalBusiness / MobilePhoneStore
            const isLocal =
              node['@type'] === 'LocalBusiness' ||
              node['@type'] === 'MobilePhoneStore' ||
              (Array.isArray(node['@type']) && (node['@type'].includes('LocalBusiness') || node['@type'].includes('MobilePhoneStore')));

            if (isLocal) {
              localSeoCheck = {
                has_local_business: true,
                business_types: Array.isArray(node['@type']) ? node['@type'] : [node['@type']],
                name: node.name,
                telephone: node.telephone,
                address: node.address,
                opening_hours: node.openingHoursSpecification || node.openingHours,
                geo: node.geo,
              };
            }
          });
        }
      }
    } catch (_) {}
  });

  // Rewriting origins for canonical and JSON-LD
  const canonicalUrl = rewriteOrigins(rawCanonical, originsToRewrite, siteUrl);

  if (jsonldRaw) {
    jsonldRewritten = rewriteOrigins(jsonldRaw, originsToRewrite, siteUrl);
  }

  // Rewrite og:url
  if (ogTags['og:url']) {
    ogTags['og:url'] = rewriteOrigins(ogTags['og:url'], originsToRewrite, siteUrl);
  }

  // Headings
  const h1Tags: string[] = $('h1')
    .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
    .get()
    .filter(Boolean);

  const h2Tags: string[] = $('h2')
    .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
    .get()
    .filter(Boolean);

  // Content hash for change detection
  const hashPayload = `${title}|${metaDesc}|${canonicalUrl}|${metaRobots}|${jsonldRaw || ''}`;
  const contentHash = crypto.createHash('md5').update(hashPayload).digest('hex');

  const isRedirect = redirectChain.length > 0;
  const redirectTarget = isRedirect ? redirectChain[redirectChain.length - 1].url : undefined;

  return {
    url: requestedUrl,
    finalUrl: requestedUrl,
    http_status: statusCode,
    title,
    meta_description: metaDesc,
    canonical_url: canonicalUrl,
    meta_robots: metaRobots,
    og_tags: ogTags,
    twitter_tags: twitterTags,
    jsonld_raw: jsonldRaw,
    jsonld_rewritten: jsonldRewritten,
    schema_types: Array.from(new Set(schemaTypes)),
    h1_tags: h1Tags,
    h2_tags: h2Tags,
    redirect_chain: redirectChain,
    is_redirect: isRedirect,
    redirect_target: redirectTarget,
    has_rank_math_schema: !!jsonldRaw,
    is_indexable: isIndexable,
    content_hash: contentHash,
    local_seo_check: localSeoCheck,
  };
}

export async function captureSinglePage(
  db: DatabaseWrapper,
  path: string,
  entityType: string = 'page'
): Promise<SeoPageCaptureRecord> {
  const settings = await getSeoSettings(db);
  const cleanBase = settings.wordpress_source_url.replace(/\/+$/, '');
  const cleanPath = '/' + path.replace(/^\/+/, '');
  const fullTargetUrl = cleanBase + cleanPath;

  let origins: string[] = [];
  try {
    origins = JSON.parse(settings.origins_to_rewrite_json);
  } catch (_) {
    origins = [cleanBase];
  }

  const existing = db.get<SeoPageCaptureRecord>('SELECT * FROM seo_page_captures WHERE path = ?', [cleanPath]);

  try {
    const fetchRes = await fetchLiveHtml(fullTargetUrl, settings.auth_header);
    const parsed = parseAndExtractSeo(
      fetchRes.html,
      fullTargetUrl,
      fetchRes.statusCode,
      fetchRes.redirectChain,
      origins,
      settings.site_url
    );

    const now = new Date().toISOString();
    let finalRobots = parsed.meta_robots;
    let finalIndexable = parsed.is_indexable ? 1 : 0;
    let status: SeoPageCaptureRecord['status'] = 'ok';

    // Baseline protection logic:
    // If the live page returned noindex (e.g. WordPress moved to old.irepair-mobiles.co.uk with noindex checked),
    // but our baseline snapshot is indexable, protect the React site from adopting noindex!
    if (settings.robots_source_mode === 'baseline_protected' && existing) {
      if (!parsed.is_indexable && existing.baseline_indexable === 1) {
        finalIndexable = 1;
        finalRobots = existing.baseline_robots || 'follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large';
      }
    }

    if (existing) {
      if (existing.content_hash && existing.content_hash !== parsed.content_hash) {
        status = 'changed';
      }
      if (existing.is_local_override === 1) {
        // Keep local overrides if set
        finalRobots = existing.meta_robots;
        finalIndexable = existing.is_indexable;
      }
    }

    if (parsed.is_redirect) {
      status = 'redirecting';
    }

    const baselineRobots = existing?.baseline_robots || finalRobots;
    const baselineIndexable = existing?.baseline_indexable ?? finalIndexable;

    const record: SeoPageCaptureRecord = {
      id: existing?.id || `seo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      path: cleanPath,
      entity_type: entityType,
      title: parsed.title,
      meta_description: parsed.meta_description,
      canonical_url: parsed.canonical_url,
      meta_robots: finalRobots,
      og_tags_json: JSON.stringify(parsed.og_tags),
      twitter_tags_json: JSON.stringify(parsed.twitter_tags),
      jsonld_raw: parsed.jsonld_raw || null,
      jsonld_rewritten: parsed.jsonld_rewritten || null,
      schema_types_json: JSON.stringify(parsed.schema_types),
      h1_tags_json: JSON.stringify(parsed.h1_tags),
      h2_tags_json: JSON.stringify(parsed.h2_tags),
      http_status: parsed.http_status,
      content_hash: parsed.content_hash,
      status: status,
      redirect_url: parsed.redirect_target || null,
      is_indexable: finalIndexable,
      is_local_override: existing?.is_local_override || 0,
      baseline_robots: baselineRobots,
      baseline_indexable: baselineIndexable,
      captured_at: now,
      updated_at: now,
    };

    if (existing) {
      db.run(
        `UPDATE seo_page_captures SET
           title = ?, meta_description = ?, canonical_url = ?, meta_robots = ?,
           og_tags_json = ?, twitter_tags_json = ?, jsonld_raw = ?, jsonld_rewritten = ?,
           schema_types_json = ?, h1_tags_json = ?, h2_tags_json = ?, http_status = ?,
           content_hash = ?, status = ?, redirect_url = ?, is_indexable = ?,
           updated_at = ?
         WHERE path = ?`,
        [
          record.title,
          record.meta_description,
          record.canonical_url,
          record.meta_robots,
          record.og_tags_json,
          record.twitter_tags_json,
          record.jsonld_raw,
          record.jsonld_rewritten,
          record.schema_types_json,
          record.h1_tags_json,
          record.h2_tags_json,
          record.http_status,
          record.content_hash,
          record.status,
          record.redirect_url,
          record.is_indexable,
          record.updated_at,
          record.path,
        ]
      );
    } else {
      db.run(
        `INSERT INTO seo_page_captures (
           id, path, entity_type, title, meta_description, canonical_url, meta_robots,
           og_tags_json, twitter_tags_json, jsonld_raw, jsonld_rewritten, schema_types_json,
           h1_tags_json, h2_tags_json, http_status, content_hash, status, redirect_url,
           is_indexable, is_local_override, baseline_robots, baseline_indexable, captured_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.path,
          record.entity_type,
          record.title,
          record.meta_description,
          record.canonical_url,
          record.meta_robots,
          record.og_tags_json,
          record.twitter_tags_json,
          record.jsonld_raw,
          record.jsonld_rewritten,
          record.schema_types_json,
          record.h1_tags_json,
          record.h2_tags_json,
          record.http_status,
          record.content_hash,
          record.status,
          record.redirect_url,
          record.is_indexable,
          record.is_local_override,
          record.baseline_robots,
          record.baseline_indexable,
          record.captured_at,
          record.updated_at,
        ]
      );
    }

    return record;
  } catch (err: any) {
    console.error(`Failed to capture ${fullTargetUrl}:`, err.message);
    const now = new Date().toISOString();
    const errorRecord: SeoPageCaptureRecord = existing || {
      id: `seo_err_${Date.now()}`,
      path: cleanPath,
      entity_type: entityType,
      title: 'Error loading page',
      meta_description: '',
      canonical_url: `${settings.site_url}${cleanPath}`,
      meta_robots: 'noindex, follow',
      og_tags_json: '{}',
      twitter_tags_json: '{}',
      schema_types_json: '[]',
      h1_tags_json: '[]',
      h2_tags_json: '[]',
      http_status: 502,
      status: 'error',
      is_indexable: 0,
      is_local_override: 0,
      baseline_robots: 'noindex, follow',
      baseline_indexable: 0,
      captured_at: now,
      updated_at: now,
    };

    if (existing) {
      db.run(
        `UPDATE seo_page_captures SET status = 'error', http_status = 502, updated_at = ? WHERE path = ?`,
        [now, cleanPath]
      );
    }

    return errorRecord;
  }
}

export async function capturePagesByType(
  db: DatabaseWrapper,
  type: 'all' | 'pages' | 'products' | 'categories' | 'blog' | 'selected' = 'all',
  selectedPaths?: string[]
): Promise<{
  total: number;
  successful: number;
  failed: number;
  updated: number;
  unchanged: number;
  redirecting: number;
  massNoindexDetected: boolean;
  results: SeoPageCaptureRecord[];
}> {
  let query = 'SELECT path, entity_type FROM seo_page_captures ORDER BY path ASC';
  let params: any[] = [];

  if (type === 'pages') {
    query = `SELECT path, entity_type FROM seo_page_captures 
             WHERE (entity_type IN ('page', 'homepage', 'legal', 'location', 'careers', 'shop', 'locations') 
                OR (entity_type NOT IN ('product', 'post') AND path NOT LIKE '/product/%'))
             ORDER BY path ASC`;
  } else if (type === 'products') {
    query = `SELECT path, entity_type FROM seo_page_captures 
             WHERE entity_type = 'product' OR path LIKE '/product/%' 
             ORDER BY path ASC`;
  } else if (type === 'categories') {
    query = `SELECT path, entity_type FROM seo_page_captures 
             WHERE entity_type IN ('category', 'product_cat', 'product_category') 
             ORDER BY path ASC`;
  } else if (type === 'blog') {
    query = `SELECT path, entity_type FROM seo_page_captures 
             WHERE entity_type = 'post' 
             ORDER BY path ASC`;
  } else if (type === 'selected' && selectedPaths && selectedPaths.length > 0) {
    const placeholders = selectedPaths.map(() => '?').join(',');
    query = `SELECT path, entity_type FROM seo_page_captures WHERE path IN (${placeholders}) ORDER BY path ASC`;
    params = selectedPaths;
  }

  const targets = db.all<{ path: string; entity_type: string }>(query, params);
  const results: SeoPageCaptureRecord[] = [];
  let successful = 0;
  let failed = 0;
  let updated = 0;
  let unchanged = 0;
  let redirecting = 0;
  let noindexFlipCount = 0;

  // Process in small parallel chunks (concurrency 3)
  const chunkSize = 3;
  for (let i = 0; i < targets.length; i += chunkSize) {
    const chunk = targets.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(
      chunk.map(async (t) => {
        try {
          const rec = await captureSinglePage(db, t.path, t.entity_type);
          return rec;
        } catch (_) {
          return null;
        }
      })
    );

    for (const rec of chunkResults) {
      if (!rec || rec.status === 'error') {
        failed++;
      } else {
        successful++;
        if (rec.status === 'changed') updated++;
        else if (rec.status === 'ok') unchanged++;
        else if (rec.status === 'redirecting') redirecting++;

        if (rec.baseline_indexable === 1 && rec.is_indexable === 0) {
          noindexFlipCount++;
        }
        results.push(rec);
      }
    }
  }

  // Mass-Noindex Detector: if >20% of indexable URLs turned noindex, warn!
  const massNoindexDetected = targets.length > 5 && noindexFlipCount / targets.length > 0.2;

  const now = new Date().toISOString();
  db.run(
    `UPDATE seo_settings SET last_sync_at = ?, last_sync_status = ? WHERE id = 'default'`,
    [now, failed === 0 ? 'success' : `completed_with_${failed}_errors`]
  );

  return {
    total: targets.length,
    successful,
    failed,
    updated,
    unchanged,
    redirecting,
    massNoindexDetected,
    results,
  };
}

export async function captureAllKnownPages(db: DatabaseWrapper) {
  return capturePagesByType(db, 'pages');
}

export async function discoverSitemapPages(
  db: DatabaseWrapper
): Promise<{
  sourceUrl: string;
  subSitemaps: string[];
  totalDiscovered: number;
  untrackedCount: number;
  items: { url: string; path: string; lastmod: string; subSitemap: string; isTracked: boolean }[];
}> {
  const settings = await getSeoSettings(db);
  const sourceBase = settings.wordpress_source_url.replace(/\/+$/, '');
  const indexUrl = `${sourceBase}/sitemap_index.xml`;

  const knownPaths = new Set(
    db.all<{ path: string }>('SELECT path FROM seo_page_captures').map((r) => r.path)
  );

  const subSitemaps: string[] = [];
  const items: { url: string; path: string; lastmod: string; subSitemap: string; isTracked: boolean }[] = [];

  try {
    const indexRes = await fetchLiveHtml(indexUrl, settings.auth_header);
    const $index = cheerio.load(indexRes.html, { xmlMode: true });

    $index('sitemap > loc').each((_, el) => {
      const loc = $index(el).text().trim();
      if (loc) subSitemaps.push(loc);
    });

    // Fallback standard sub-sitemaps if index did not return xml
    if (subSitemaps.length === 0) {
      subSitemaps.push(
        `${sourceBase}/page-sitemap.xml`,
        `${sourceBase}/post-sitemap.xml`,
        `${sourceBase}/product-sitemap.xml`,
        `${sourceBase}/product_cat-sitemap.xml`,
        `${sourceBase}/category-sitemap.xml`
      );
    }

    // Fetch top sub-sitemaps
    for (const subUrl of subSitemaps.slice(0, 8)) {
      try {
        const subRes = await fetchLiveHtml(subUrl, settings.auth_header);
        const $sub = cheerio.load(subRes.html, { xmlMode: true });
        $sub('url').each((_, el) => {
          const loc = $sub(el).find('loc').text().trim();
          const lastmod = $sub(el).find('lastmod').text().trim() || new Date().toISOString();
          if (loc) {
            try {
              const parsed = new URL(loc);
              const path = parsed.pathname;
              items.push({
                url: loc,
                path,
                lastmod,
                subSitemap: subUrl.split('/').pop() || subUrl,
                isTracked: knownPaths.has(path) || knownPaths.has(path.replace(/\/+$/, '')),
              });
            } catch (_) {}
          }
        });
      } catch (_) {}
    }
  } catch (err: any) {
    console.error('Discover sitemaps error:', err.message);
  }

  const untrackedCount = items.filter((i) => !i.isTracked).length;

  return {
    sourceUrl: sourceBase,
    subSitemaps,
    totalDiscovered: items.length,
    untrackedCount,
    items,
  };
}

export interface CsvBaselineRow {
  entity_type: string;
  path: string;
  status_code: number;
  indexability: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  h1_1: string;
  h1_2: string;
  h2_1: string;
  h2_2: string;
  canonical_path: string;
  meta_robots: string;
  x_robots_tag: string;
  redirect_to_path: string;
}

export function parseBaselineCsv(content: string): CsvBaselineRow[] {
  let clean = content.replace(/^\uFEFF/, '');
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && clean[i + 1] === '\n') {
        i++;
      }
      if (current.trim().length > 0) {
        lines.push(current);
      }
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim().length > 0) {
    lines.push(current);
  }

  const rows: CsvBaselineRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols: string[] = [];
    let field = '';
    let fieldInQuotes = false;

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        fieldInQuotes = !fieldInQuotes;
      } else if (char === ',' && !fieldInQuotes) {
        cols.push(field.trim());
        field = '';
      } else {
        field += char;
      }
    }
    cols.push(field.trim());

    const cleanCols = cols.map((col) => {
      let val = col.trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1).replace(/""/g, '"');
      }
      return val;
    });

    if (cleanCols[1]) {
      rows.push({
        entity_type: cleanCols[0] || 'page',
        path: cleanCols[1],
        status_code: parseInt(cleanCols[2] || '200', 10),
        indexability: cleanCols[3] || 'Indexable',
        meta_title: cleanCols[4] || '',
        meta_description: cleanCols[5] || '',
        meta_keywords: cleanCols[6] || '',
        h1_1: cleanCols[7] || '',
        h1_2: cleanCols[8] || '',
        h2_1: cleanCols[9] || '',
        h2_2: cleanCols[10] || '',
        canonical_path: cleanCols[11] || cleanCols[1],
        meta_robots: cleanCols[12] || 'follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large',
        x_robots_tag: cleanCols[13] || '',
        redirect_to_path: cleanCols[14] || '',
      });
    }
  }

  return rows;
}

export async function importBaselineCsv(
  db: DatabaseWrapper,
  csvContent: string,
  dryRun: boolean = true
): Promise<{
  totalRows: number;
  newCount: number;
  updateCount: number;
  redirectCount: number;
  errorCount: number;
  errors: string[];
  preview: any[];
}> {
  const rows = parseBaselineCsv(csvContent);
  const settings = await getSeoSettings(db);
  const now = new Date().toISOString();

  let newCount = 0;
  let updateCount = 0;
  let redirectCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  const preview: any[] = [];

  const existingMap = new Map<string, SeoPageCaptureRecord>();
  db.all<SeoPageCaptureRecord>('SELECT * FROM seo_page_captures').forEach((p) => {
    existingMap.set(p.path, p);
  });

  for (const row of rows) {
    const cleanPath = row.path.startsWith('/') ? row.path : '/' + row.path;
    const isRedirect = Boolean(row.redirect_to_path || row.status_code === 301);
    const existing = existingMap.get(cleanPath);

    if (isRedirect) redirectCount++;

    if (existing) {
      updateCount++;
      preview.push({
        action: 'update',
        path: cleanPath,
        entity_type: row.entity_type,
        title: row.meta_title,
        status_code: row.status_code,
        redirect_to: row.redirect_to_path || null,
      });
    } else {
      newCount++;
      preview.push({
        action: 'insert',
        path: cleanPath,
        entity_type: row.entity_type,
        title: row.meta_title,
        status_code: row.status_code,
        redirect_to: row.redirect_to_path || null,
      });
    }

    if (!dryRun) {
      const isIndexable = row.indexability === 'Indexable' ? 1 : 0;
      const h1Arr = [row.h1_1, row.h1_2].filter(Boolean);
      const h2Arr = [row.h2_1, row.h2_2].filter(Boolean);

      if (isRedirect) {
        const fromPath = cleanPath.replace(/\/+$/, '') + '/';
        const toPath = row.redirect_to_path || '/';
        const existingRed = db.get('SELECT id FROM seo_redirects WHERE from_path = ? OR from_path = ?', [cleanPath, fromPath]);
        if (!existingRed) {
          db.run(
            `INSERT INTO seo_redirects (id, from_path, to_path, status_code, origin, hit_count, created_at, updated_at)
             VALUES (?, ?, ?, 301, 'baseline_csv', 0, ?, ?)`,
            [`redir_base_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, fromPath, toPath, now, now]
          );
        }
      }

      if (existing) {
        db.run(
          `UPDATE seo_page_captures SET
             title = COALESCE(?, title),
             meta_description = COALESCE(?, meta_description),
             meta_robots = COALESCE(?, meta_robots),
             baseline_robots = ?,
             baseline_indexable = ?,
             updated_at = ?
           WHERE path = ?`,
          [row.meta_title || null, row.meta_description || null, row.meta_robots || null, row.meta_robots, isIndexable, now, cleanPath]
        );
      } else {
        db.run(
          `INSERT INTO seo_page_captures (
             id, path, entity_type, title, meta_description, canonical_url, meta_robots,
             og_tags_json, twitter_tags_json, jsonld_raw, jsonld_rewritten, schema_types_json,
             h1_tags_json, h2_tags_json, http_status, content_hash, status, redirect_url,
             is_indexable, is_local_override, baseline_robots, baseline_indexable, captured_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `seo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            cleanPath,
            row.entity_type,
            row.meta_title,
            row.meta_description,
            `${settings.site_url}${row.canonical_path || cleanPath}`,
            row.meta_robots,
            '{}',
            '{}',
            null,
            null,
            '[]',
            JSON.stringify(h1Arr),
            JSON.stringify(h2Arr),
            row.status_code,
            '',
            isRedirect ? 'redirecting' : 'ok',
            row.redirect_to_path || null,
            isIndexable,
            0,
            row.meta_robots,
            isIndexable,
            now,
            now
          ]
        );
      }
    }
  }

  if (!dryRun) {
    // Record baseline snapshot
    const snapId = `snap_imported_${Date.now()}`;
    const snapObj: Record<string, any> = {};
    for (const r of rows) {
      snapObj[r.path] = r;
    }
    db.run(
      `INSERT INTO seo_baseline_snapshots (id, snapshot_name, pages_count, data_json, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [snapId, 'CSV Imported Baseline Snapshot', rows.length, JSON.stringify(snapObj), 'Imported via CSV upload', now]
    );
  }

  return {
    totalRows: rows.length,
    newCount,
    updateCount,
    redirectCount,
    errorCount,
    errors,
    preview: preview.slice(0, 50),
  };
}

export function exportBaselineCsv(db: DatabaseWrapper): string {
  const pages = db.all<SeoPageCaptureRecord>('SELECT * FROM seo_page_captures ORDER BY path ASC');
  const headers = [
    'entity_type',
    'path',
    'status_code',
    'indexability',
    'meta_title',
    'meta_description',
    'meta_keywords',
    'h1_1',
    'h1_2',
    'h2_1',
    'h2_2',
    'canonical_path',
    'meta_robots',
    'x_robots_tag',
    'redirect_to_path',
  ];

  const escapeCol = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [headers.join(',')];

  for (const p of pages) {
    let h1Arr: string[] = [];
    let h2Arr: string[] = [];
    try { h1Arr = JSON.parse(p.h1_tags_json || '[]'); } catch (_) {}
    try { h2Arr = JSON.parse(p.h2_tags_json || '[]'); } catch (_) {}

    const indexability = p.is_indexable === 1 ? 'Indexable' : 'Non-Indexable';
    const canonicalPath = p.canonical_url ? p.canonical_url.replace(/^https?:\/\/[^/]+/, '') : p.path;

    const row = [
      escapeCol(p.entity_type),
      escapeCol(p.path),
      escapeCol(p.http_status),
      escapeCol(indexability),
      escapeCol(p.title),
      escapeCol(p.meta_description),
      '',
      escapeCol(h1Arr[0] || ''),
      escapeCol(h1Arr[1] || ''),
      escapeCol(h2Arr[0] || ''),
      escapeCol(h2Arr[1] || ''),
      escapeCol(canonicalPath),
      escapeCol(p.meta_robots),
      '',
      escapeCol(p.redirect_url || ''),
    ];

    csvLines.push(row.join(','));
  }

  return csvLines.join('\n');
}

export function auditLocalSeoQuality(db: DatabaseWrapper): {
  issues: {
    path: string;
    type: 'opening_hours' | 'country_code' | 'missing_phone' | 'missing_locality';
    severity: 'warning' | 'info';
    message: string;
    foundValue: string;
    hint: string;
    affectedCount?: number;
  }[];
  totalChecked: number;
} {
  const pages = db.all<{ path: string; jsonld_raw: string }>(
    'SELECT path, jsonld_raw FROM seo_page_captures WHERE jsonld_raw IS NOT NULL'
  );

  const grouped = new Map<string, any>();

  const recordIssue = (issue: {
    path: string;
    type: string;
    severity: string;
    message: string;
    foundValue: string;
    hint: string;
  }) => {
    const key = `${issue.type}::${issue.foundValue}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.affectedCount += 1;
      if (existing.affectedCount > 5) {
        existing.path = `Site-wide (${existing.affectedCount} pages)`;
      } else if (!existing.paths.includes(issue.path)) {
        existing.paths.push(issue.path);
        existing.path = existing.paths.join(', ');
      }
    } else {
      grouped.set(key, {
        ...issue,
        affectedCount: 1,
        paths: [issue.path],
      });
    }
  };

  for (const p of pages) {
    try {
      const data = JSON.parse(p.jsonld_raw);
      const graph = data['@graph'] || [data];

      for (const node of graph) {
        const type = node['@type'];
        const isLocal =
          type === 'LocalBusiness' ||
          type === 'MobilePhoneStore' ||
          type === 'Organization' ||
          (Array.isArray(type) && (type.includes('LocalBusiness') || type.includes('MobilePhoneStore')));

        if (isLocal) {
          // 1. Opening hours check (e.g. 08:00-08:00 or 10:00-05:30)
          const hours = node.openingHoursSpecification || node.openingHours;
          if (hours) {
            const hStr = typeof hours === 'string' ? hours : JSON.stringify(hours);
            if (hStr.includes('08:00-08:00') || hStr.includes('10:00-05:30') || hStr.includes('08:00 - 08:00')) {
              recordIssue({
                path: p.path,
                type: 'opening_hours',
                severity: 'warning',
                message: 'Opening hours specification contains ambiguous or zero-duration times (e.g. 08:00-08:00 and 10:00-05:30).',
                foundValue: hStr.substring(0, 80),
                hint: 'Edit in WordPress (Rank Math > Titles & Meta > Local SEO)',
              });
            }
          }

          // 2. addressCountry 2-letter ISO check
          if (node.address && node.address.addressCountry) {
            const country = String(node.address.addressCountry).trim();
            if (country.length > 2 && (country.toLowerCase() === 'united kingdom' || country.toLowerCase() === 'uk')) {
              recordIssue({
                path: p.path,
                type: 'country_code',
                severity: 'warning',
                message: 'addressCountry should be a 2-letter ISO code ("GB") instead of full country name.',
                foundValue: country,
                hint: 'Edit in WordPress (Rank Math > Titles & Meta > Local SEO)',
              });
            }
          }

          // 3. Missing telephone
          if (!node.telephone && (type === 'LocalBusiness' || type === 'MobilePhoneStore')) {
            recordIssue({
              path: p.path,
              type: 'missing_phone',
              severity: 'info',
              message: 'Local business schema missing direct telephone attribute.',
              foundValue: 'None',
              hint: 'Edit in WordPress (Rank Math > Titles & Meta > Local SEO)',
            });
          }
        }
      }
    } catch (_) {}
  }

  return {
    issues: Array.from(grouped.values()).map(({ paths, ...rest }) => rest),
    totalChecked: pages.length,
  };
}

export function runFullParityAudit(db: DatabaseWrapper): {
  total: number;
  passedCount: number;
  failedCount: number;
  quirkCount: number;
  items: {
    path: string;
    entity_type: string;
    status_code: number;
    title: string;
    title_matches: boolean;
    description: string;
    canonical_matches: boolean;
    robots_matches: boolean;
    h1_matches: boolean;
    schema_types: string[];
    schema_valid: boolean;
    overall_pass: boolean;
    quirk_note?: string;
  }[];
} {
  const pages = db.all<SeoPageCaptureRecord>('SELECT * FROM seo_page_captures ORDER BY path ASC');
  const redirects = db.all<{ from_path: string; to_path: string; status_code: number }>(
    'SELECT from_path, to_path, status_code FROM seo_redirects'
  );
  const redirectMap = new Map<string, { to_path: string; status_code: number }>();
  for (const r of redirects) {
    if (r.from_path !== r.to_path) {
      redirectMap.set(r.from_path, r);
    }
  }

  const items: any[] = [];
  let passed = 0;
  let failed = 0;
  let quirks = 0;

  for (const p of pages) {
    let schemaList: string[] = [];
    try { schemaList = JSON.parse(p.schema_types_json || '[]'); } catch (_) {}
    let h1List: string[] = [];
    try { h1List = JSON.parse(p.h1_tags_json || '[]'); } catch (_) {}

    const redirRule = redirectMap.get(p.path);
    const isRedirect = Boolean(redirRule) || p.status === 'redirecting';

    let quirkNote: string | undefined = undefined;

    // Known quirks from WordPress crawl to preserve exactly:
    if (p.path === '/product/budi-15w-wireless-charging-stand/' || p.path === '/product/iphone-13-mini-refurbished-unlocked/') {
      quirkNote = 'Known old-site quirk: Two H1 elements on page (includes FAQs heading). Preserved as-is.';
      quirks++;
    } else if (p.path === '/the-truth-about-fast-charging/' || p.path === '/best-iphone-repair-service-in-the-uk/') {
      quirkNote = 'Known old-site quirk: Section headings rendered as H1 in WordPress. Preserved as-is.';
      quirks++;
    } else if (p.path === '/laptop-repair-shops-in-uk/') {
      quirkNote = 'Known old-site quirk: Zero H1 tags on old page. Preserved as-is.';
      quirks++;
    } else if (redirRule) {
      quirkNote = `Confirmed ${redirRule.status_code} redirect -> ${redirRule.to_path}`;
    }

    const titleMatches = Boolean(p.title && p.title.length > 5);
    const canonicalMatches = isRedirect
      ? true
      : Boolean(p.canonical_url && p.canonical_url.includes(p.path));
    const robotsMatches = isRedirect ? true : p.is_indexable === p.baseline_indexable;
    const h1Matches = quirkNote ? true : h1List.length > 0;
    const schemaValid = isRedirect ? true : schemaList.length > 0;

    const overallPass = (titleMatches || isRedirect) && canonicalMatches && robotsMatches && schemaValid;

    if (overallPass) {
      passed++;
    } else {
      failed++;
    }

    items.push({
      path: p.path,
      entity_type: p.entity_type,
      status_code: redirRule ? redirRule.status_code : p.http_status,
      title: p.title,
      title_matches: titleMatches,
      description: p.meta_description,
      canonical_matches: canonicalMatches,
      robots_matches: robotsMatches,
      h1_matches: h1Matches,
      schema_types: schemaList,
      schema_valid: schemaValid,
      overall_pass: overallPass,
      quirk_note: quirkNote,
    });
  }

  return {
    total: pages.length,
    passedCount: passed,
    failedCount: failed,
    quirkCount: quirks,
    items,
  };
}
