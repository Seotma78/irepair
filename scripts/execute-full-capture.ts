import fs from 'fs';
import path from 'path';
import { getDb } from '../server/db';
import {
  getSeoSettings,
  fetchLiveHtml,
  parseAndExtractSeo,
  rewriteOrigins,
  SeoPageCaptureRecord
} from '../server/services/seoCaptureService';

interface CsvRow {
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

function parseCsv(content: string): CsvRow[] {
  // Strip BOM if present
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

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Split on commas not enclosed in quotes
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

    // Clean quotes
    const cleanCols = cols.map(c => {
      let val = c.trim();
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

// Concurrency helper
async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      try {
        results[idx] = await fn(items[idx], idx);
      } catch (err) {
        results[idx] = undefined as any;
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  console.log('=== STARTING FULL SEO CAPTURE & BASELINE SEEDING ===');
  const db = await getDb();
  const settings = await getSeoSettings(db);

  const baselineCsvPath = path.resolve('public/assets/aistudio/seo_baseline_all_283_urls_24bc984d.csv');
  console.log(`Reading baseline CSV from: ${baselineCsvPath}`);
  const csvContent = fs.readFileSync(baselineCsvPath, 'utf8');
  const rows = parseCsv(csvContent);
  console.log(`Parsed ${rows.length} rows from baseline CSV.`);

  // 1. Seed / verify 301 redirects in seo_redirects
  let redirectCount = 0;
  for (const row of rows) {
    if (row.redirect_to_path || row.status_code === 301) {
      const fromPath = row.path.replace(/\/+$/, '') + '/';
      const toPath = row.redirect_to_path || '/';
      const existing = db.get('SELECT id FROM seo_redirects WHERE from_path = ? OR from_path = ?', [row.path, fromPath]);
      const now = new Date().toISOString();
      if (!existing) {
        db.run(
          `INSERT INTO seo_redirects (id, from_path, to_path, status_code, origin, hit_count, created_at, updated_at)
           VALUES (?, ?, ?, 301, 'baseline_csv', 0, ?, ?)`,
          [`redir_base_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, fromPath, toPath, now, now]
        );
        redirectCount++;
      }
    }
  }
  console.log(`Verified 301 redirects (inserted ${redirectCount} new).`);

  // 2. Pre-seed baseline data in seo_page_captures and seo_baseline_snapshots
  console.log('Seeding baseline snapshots into seo_baseline_snapshots and seo_page_captures...');
  const snapshotData: Record<string, any> = {};
  const now = new Date().toISOString();

  for (const row of rows) {
    const isIndexable = row.indexability === 'Indexable' ? 1 : 0;
    const cleanPath = row.path.startsWith('/') ? row.path : '/' + row.path;
    const isRedirect = Boolean(row.redirect_to_path || row.status_code === 301);

    snapshotData[cleanPath] = {
      title: row.meta_title,
      meta_description: row.meta_description,
      canonical_path: row.canonical_path,
      meta_robots: row.meta_robots,
      indexability: row.indexability,
      is_indexable: isIndexable,
      status_code: row.status_code,
      h1_1: row.h1_1,
      h1_2: row.h1_2,
      h2_1: row.h2_1,
      h2_2: row.h2_2,
      redirect_to_path: row.redirect_to_path,
    };

    const existing = db.get<SeoPageCaptureRecord>('SELECT * FROM seo_page_captures WHERE path = ?', [cleanPath]);
    const h1Arr = [row.h1_1, row.h1_2].filter(Boolean);
    const h2Arr = [row.h2_1, row.h2_2].filter(Boolean);

    if (!existing) {
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
    } else {
      // Update baseline tracking values
      db.run(
        `UPDATE seo_page_captures SET baseline_robots = ?, baseline_indexable = ? WHERE path = ?`,
        [row.meta_robots, isIndexable, cleanPath]
      );
    }
  }

  // Create baseline snapshot record
  const snapshotId = `snap_baseline_283_${Date.now()}`;
  db.run(
    `INSERT INTO seo_baseline_snapshots (id, snapshot_name, pages_count, data_json, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      snapshotId,
      'Baseline 283 URLs Snapshot (seo_baseline_all_283_urls.csv)',
      rows.length,
      JSON.stringify(snapshotData),
      'Exact baseline from pre-launch crawl covering 25 pages, 168 products, 90 posts (276 indexable, 7 redirects)',
      now
    ]
  );
  console.log(`Saved baseline snapshot "${snapshotId}" with ${rows.length} pages.`);

  // 3. Now run the full live capture from WordPress for all URLs!
  const sourceUrl = settings.wordpress_source_url.replace(/\/+$/, '');
  let originsToRewrite = [sourceUrl, 'https://old.irepair-mobiles.co.uk', 'http://irepair-mobiles.co.uk'];
  try {
    originsToRewrite = JSON.parse(settings.origins_to_rewrite_json);
  } catch (_) {}

  console.log(`\n--- INITIATING LIVE CRAWL of ${rows.length} URLs from ${sourceUrl} ---`);
  console.log('Using polite concurrency of 3 workers with retry backoff...\n');

  let successCount = 0;
  let redirectHopCount = 0;
  let blockedCount = 0;
  let errorCount = 0;
  let schemaCount = 0;

  const startTime = Date.now();

  await mapConcurrent(rows, 3, async (row, idx) => {
    const cleanPath = row.path.startsWith('/') ? row.path : '/' + row.path;
    const fullTargetUrl = `${sourceUrl}${cleanPath}`;
    const prefix = `[${idx + 1}/${rows.length}]`;

    try {
      // Sleep a tiny 100ms jitter between requests to be gentle to the source
      await new Promise(r => setTimeout(r, 100));

      const res = await fetchLiveHtml(fullTargetUrl, settings.auth_header);
      const isBlocked =
        res.statusCode === 403 ||
        res.statusCode === 503 ||
        res.html.includes('Just a moment...') ||
        res.html.includes('cf-browser-verification');

      if (isBlocked) {
        console.warn(`${prefix} ⚠️ BLOCKED by Cloudflare: ${cleanPath}`);
        blockedCount++;
        return;
      }

      const parsed = parseAndExtractSeo(
        res.html,
        fullTargetUrl,
        res.statusCode,
        res.redirectChain,
        originsToRewrite,
        settings.site_url
      );

      const capturedNow = new Date().toISOString();
      let finalRobots = parsed.meta_robots;
      let finalIndexable = parsed.is_indexable ? 1 : 0;
      let status: SeoPageCaptureRecord['status'] = 'ok';

      if (parsed.is_redirect) {
        status = 'redirecting';
        redirectHopCount++;
      }

      // Baseline protection
      if (settings.robots_source_mode === 'baseline_protected') {
        const baselineRow = snapshotData[cleanPath];
        if (baselineRow && baselineRow.is_indexable === 1 && !parsed.is_indexable) {
          finalIndexable = 1;
          finalRobots = baselineRow.meta_robots || 'follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large';
        }
      }

      if (parsed.has_rank_math_schema) {
        schemaCount++;
      }

      // Save capture to db
      db.run(
        `UPDATE seo_page_captures SET
           title = ?, meta_description = ?, canonical_url = ?, meta_robots = ?,
           og_tags_json = ?, twitter_tags_json = ?, jsonld_raw = ?, jsonld_rewritten = ?,
           schema_types_json = ?, h1_tags_json = ?, h2_tags_json = ?, http_status = ?,
           content_hash = ?, status = ?, redirect_url = ?, is_indexable = ?,
           captured_at = ?, updated_at = ?
         WHERE path = ?`,
        [
          parsed.title || row.meta_title,
          parsed.meta_description || row.meta_description,
          parsed.canonical_url,
          finalRobots,
          JSON.stringify(parsed.og_tags),
          JSON.stringify(parsed.twitter_tags),
          parsed.jsonld_raw,
          parsed.jsonld_rewritten,
          JSON.stringify(parsed.schema_types),
          JSON.stringify(parsed.h1_tags.length ? parsed.h1_tags : [row.h1_1, row.h1_2].filter(Boolean)),
          JSON.stringify(parsed.h2_tags.length ? parsed.h2_tags : [row.h2_1, row.h2_2].filter(Boolean)),
          parsed.http_status,
          parsed.content_hash,
          status,
          parsed.redirect_target || row.redirect_to_path || null,
          finalIndexable,
          capturedNow,
          capturedNow,
          cleanPath
        ]
      );

      successCount++;
      if ((idx + 1) % 25 === 0 || idx + 1 === rows.length) {
        console.log(
          `${prefix} Progress: ${idx + 1}/${rows.length} captured (${successCount} ok, ${schemaCount} schema, ${redirectHopCount} redirects, ${errorCount} err)`
        );
      }
    } catch (err: any) {
      console.error(`${prefix} ❌ Error fetching ${cleanPath}: ${err.message}`);
      errorCount++;
    }
  });

  const totalTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== FULL CAPTURE COMPLETED in ${totalTimeSeconds}s ===`);
  console.log(`Total URLs: ${rows.length}`);
  console.log(`Successfully captured: ${successCount}`);
  console.log(`Pages with Rank Math schema: ${schemaCount}`);
  console.log(`Redirects verified: ${redirectHopCount}`);
  console.log(`Blocked: ${blockedCount}`);
  console.log(`Errors: ${errorCount}`);

  // Update seo_settings with sync completion
  db.run(
    `UPDATE seo_settings SET last_sync_at = ?, last_sync_status = ? WHERE id = 'default'`,
    [new Date().toISOString(), errorCount === 0 ? 'success' : `completed_with_${errorCount}_errors`]
  );

  console.log('SEO settings last_sync_at updated.');
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
