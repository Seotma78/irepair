import { getDb } from '../server/db';
import { captureAllKnownPages } from '../server/services/seoCaptureService';
import { createBaselineSnapshot } from '../server/services/seoBaselineService';

async function main() {
  console.log('--- STARTING INITIAL SEO CAPTURE FOR ALL 25 PAGES ---');
  const db = await getDb();
  
  const result = await captureAllKnownPages(db);
  console.log(`Crawl completed: ${result.successful}/${result.total} succeeded (${result.failed} failed).`);

  // Create baseline snapshot
  const snapshot = await createBaselineSnapshot(
    db,
    'Pre-Launch Baseline Snapshot',
    'Initial capture of all 25 pages from https://irepair-mobiles.co.uk'
  );
  console.log(`Baseline snapshot "${snapshot.snapshot_name}" created with ${snapshot.pages_count} pages.`);

  for (const page of result.results) {
    console.log(`[${page.http_status}] ${page.path} -> Title: "${page.title.substring(0, 40)}..." (Indexable: ${page.is_indexable === 1 ? 'YES' : 'NO'}, Status: ${page.status})`);
  }
}

main().catch((err) => {
  console.error('Initial capture error:', err);
  process.exit(1);
});
