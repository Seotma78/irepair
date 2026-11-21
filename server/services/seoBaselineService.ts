import { DatabaseWrapper } from '../db';
import { SeoPageCaptureRecord } from './seoCaptureService';

export interface BaselineSnapshotRecord {
  id: string;
  snapshot_name: string;
  pages_count: number;
  data_json: string;
  notes?: string;
  created_at: string;
}

export interface BaselineParityCheckItem {
  path: string;
  baseline_title: string;
  current_title: string;
  title_matches: boolean;
  baseline_robots: string;
  current_robots: string;
  robots_matches: boolean;
  baseline_indexable: boolean;
  current_indexable: boolean;
  is_staging_noindex_risk: boolean;
  current_status: string;
}

export async function createBaselineSnapshot(
  db: DatabaseWrapper,
  snapshotName: string = 'Pre-Launch Baseline',
  notes: string = 'Live Rank Math snapshot from irepair-mobiles.co.uk crawl'
): Promise<BaselineSnapshotRecord> {
  const pages = db.all<SeoPageCaptureRecord>('SELECT * FROM seo_page_captures ORDER BY path ASC');
  const now = new Date().toISOString();

  const snapshotData: Record<string, any> = {};
  for (const page of pages) {
    snapshotData[page.path] = {
      title: page.title,
      meta_description: page.meta_description,
      canonical_url: page.canonical_url,
      meta_robots: page.meta_robots,
      is_indexable: page.is_indexable,
      schema_types: JSON.parse(page.schema_types_json || '[]'),
      content_hash: page.content_hash,
      http_status: page.http_status,
    };

    // Update baseline fields in page capture record itself
    db.run(
      `UPDATE seo_page_captures SET baseline_robots = ?, baseline_indexable = ? WHERE id = ?`,
      [page.meta_robots, page.is_indexable, page.id]
    );
  }

  const snapshot: BaselineSnapshotRecord = {
    id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    snapshot_name: snapshotName,
    pages_count: pages.length,
    data_json: JSON.stringify(snapshotData),
    notes,
    created_at: now,
  };

  db.run(
    `INSERT INTO seo_baseline_snapshots (id, snapshot_name, pages_count, data_json, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [snapshot.id, snapshot.snapshot_name, snapshot.pages_count, snapshot.data_json, snapshot.notes, snapshot.created_at]
  );

  return snapshot;
}

export function getLatestBaselineSnapshot(db: DatabaseWrapper): BaselineSnapshotRecord | null {
  return db.get<BaselineSnapshotRecord>(
    'SELECT * FROM seo_baseline_snapshots ORDER BY created_at DESC LIMIT 1'
  );
}

export function runParityCheck(db: DatabaseWrapper): {
  total_checked: number;
  healthy_count: number;
  warning_count: number;
  critical_count: number;
  items: BaselineParityCheckItem[];
} {
  const pages = db.all<SeoPageCaptureRecord>('SELECT * FROM seo_page_captures ORDER BY path ASC');
  const latestSnapshot = getLatestBaselineSnapshot(db);
  let baselineMap: Record<string, any> = {};

  if (latestSnapshot) {
    try {
      baselineMap = JSON.parse(latestSnapshot.data_json);
    } catch (_) {}
  }

  const items: BaselineParityCheckItem[] = [];
  let healthy = 0;
  let warnings = 0;
  let critical = 0;

  for (const p of pages) {
    const b = baselineMap[p.path] || {
      title: p.title,
      meta_robots: p.baseline_robots || 'follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large',
      is_indexable: p.baseline_indexable === 1,
    };

    const titleMatches = (p.title || '').trim() === (b.title || '').trim();
    const robotsMatches = (p.meta_robots || '').trim() === (b.meta_robots || '').trim();
    const bIndexable = typeof b.is_indexable === 'boolean' ? b.is_indexable : b.is_indexable === 1;
    const cIndexable = p.is_indexable === 1;

    // Critical: baseline was indexable, but current is marked noindex!
    const stagingNoindexRisk = bIndexable && !cIndexable;

    if (stagingNoindexRisk) {
      critical++;
    } else if (!titleMatches || !robotsMatches) {
      warnings++;
    } else {
      healthy++;
    }

    items.push({
      path: p.path,
      baseline_title: b.title || '',
      current_title: p.title || '',
      title_matches: titleMatches,
      baseline_robots: b.meta_robots || '',
      current_robots: p.meta_robots || '',
      robots_matches: robotsMatches,
      baseline_indexable: bIndexable,
      current_indexable: cIndexable,
      is_staging_noindex_risk: stagingNoindexRisk,
      current_status: p.status,
    });
  }

  return {
    total_checked: pages.length,
    healthy_count: healthy,
    warning_count: warnings,
    critical_count: critical,
    items,
  };
}
