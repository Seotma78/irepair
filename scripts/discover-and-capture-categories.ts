import { getDb } from '../server/db';
import { captureSinglePage, fetchLiveHtml } from '../server/services/seoCaptureService';
import * as cheerio from 'cheerio';

async function run() {
  const db = await getDb();
  console.log('--- 1. Capturing /shop/ ---');
  const shopRec = await captureSinglePage(db, '/shop/', 'shop');
  console.log('Captured /shop/:', {
    title: shopRec.title,
    status: shopRec.status,
    hasSchema: Boolean(shopRec.jsonld_raw),
    canonical: shopRec.canonical_url
  });

  console.log('--- 2. Discovering product categories from product_cat-sitemap.xml ---');
  try {
    const sitemapRes = await fetchLiveHtml('https://irepair-mobiles.co.uk/product_cat-sitemap.xml');
    const $ = cheerio.load(sitemapRes.html, { xmlMode: true });
    const catUrls: string[] = [];
    $('loc').each((_, el) => {
      const raw = $(el).text().trim();
      if (raw && raw.includes('/product-category/')) {
        const p = new URL(raw).pathname;
        if (!catUrls.includes(p)) {
          catUrls.push(p);
        }
      }
    });
    console.log(`Discovered ${catUrls.length} category URLs in product_cat-sitemap.xml`);

    for (let i = 0; i < catUrls.length; i++) {
      const cPath = catUrls[i];
      try {
        const res = await captureSinglePage(db, cPath, 'product_category');
        console.log(`[${i + 1}/${catUrls.length}] Category: ${cPath} -> ${res.status}`);
      } catch (err: any) {
        console.warn(`Category capture error for ${cPath}:`, err.message);
      }
    }
  } catch (err: any) {
    console.warn('Error reading product_cat-sitemap.xml:', err.message);
  }

  console.log('--- 3. Discovering blog categories from category-sitemap.xml ---');
  try {
    const blogCatRes = await fetchLiveHtml('https://irepair-mobiles.co.uk/category-sitemap.xml');
    const $ = cheerio.load(blogCatRes.html, { xmlMode: true });
    const blogCatUrls: string[] = [];
    $('loc').each((_, el) => {
      const raw = $(el).text().trim();
      if (raw && (raw.includes('/category/') || raw.includes('/blog/'))) {
        const p = new URL(raw).pathname;
        if (!blogCatUrls.includes(p)) {
          blogCatUrls.push(p);
        }
      }
    });
    console.log(`Discovered ${blogCatUrls.length} blog category URLs in category-sitemap.xml`);

    for (let i = 0; i < blogCatUrls.length; i++) {
      const bPath = blogCatUrls[i];
      try {
        const res = await captureSinglePage(db, bPath, 'blog_category');
        console.log(`[${i + 1}/${blogCatUrls.length}] Blog Category: ${bPath} -> ${res.status}`);
      } catch (err: any) {
        console.warn(`Blog Category capture error for ${bPath}:`, err.message);
      }
    }
  } catch (err: any) {
    console.warn('Error reading category-sitemap.xml:', err.message);
  }

  const finalTotal = db.get<{ count: number }>('SELECT count(*) as count FROM seo_page_captures');
  console.log(`\n=== DISCOVERY COMPLETE: Total tracked pages now in DB: ${finalTotal?.count} ===`);
}

run().catch(console.error);
