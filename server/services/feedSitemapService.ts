import { getDb } from '../db';
import { STORE_BASE_URL } from './categoryService';
import { SeoPageCaptureRecord } from './seoCaptureService';

export async function getSiteUrl(): Promise<string> {
  try {
    const db = await getDb();
    const settings = db.get<{ site_url: string }>('SELECT site_url FROM seo_settings WHERE id = ?', ['default']);
    if (settings && settings.site_url) {
      return settings.site_url.replace(/\/+$/, '');
    }
  } catch (_) {}
  return STORE_BASE_URL.replace(/\/+$/, '');
}

export async function generateSitemapIndexXml(): Promise<string> {
  const siteUrl = await getSiteUrl();
  const now = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap-index.xsl"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${siteUrl}/page-sitemap.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${siteUrl}/product-sitemap.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${siteUrl}/post-sitemap.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${siteUrl}/category-sitemap.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${siteUrl}/product_cat-sitemap.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;
}

export async function generatePageSitemapXml(): Promise<string> {
  const db = await getDb();
  const siteUrl = await getSiteUrl();
  const now = new Date().toISOString().split('T')[0];

  const pageUrls: { loc: string; lastmod: string; priority: string; changefreq: string }[] = [];

  // 1. Captured pages from seo_page_captures where is_indexable = 1 and status != 'redirecting'
  try {
    const captured = db.all<SeoPageCaptureRecord>(
      `SELECT path, updated_at, captured_at FROM seo_page_captures 
       WHERE is_indexable = 1 
         AND status != 'redirecting' 
         AND entity_type NOT IN ('product', 'post')
         AND path NOT LIKE '/product/%'
       ORDER BY path ASC`
    );
    for (const c of captured) {
      const loc = `${siteUrl}${c.path.startsWith('/') ? c.path : '/' + c.path}`;
      const lastmod = (c.updated_at || c.captured_at || now).split('T')[0];
      const isHome = c.path === '/' || c.path === '';
      pageUrls.push({
        loc,
        lastmod,
        priority: isHome ? '1.0' : '0.8',
        changefreq: isHome ? 'daily' : 'weekly',
      });
    }
  } catch (_) {}

  // If no captured pages yet, fallback to default core pages
  if (pageUrls.length === 0) {
    const fallbacks = [
      '/',
      '/about-us/',
      '/contact-us/',
      '/services/',
      '/shop/',
      '/locations/',
      '/sell-my-phone/',
      '/career/',
      '/apply-now/',
      '/mobile-phone-repair-shops-in-uk/',
      '/terms-of-use/',
      '/privacy-policy/',
      '/warranty-policy/',
      '/shipping-delivery-policy/',
      '/return-cancellation-policy/',
    ];
    for (const fb of fallbacks) {
      pageUrls.push({
        loc: `${siteUrl}${fb}`,
        lastmod: now,
        priority: fb === '/' ? '1.0' : '0.8',
        changefreq: fb === '/' ? 'daily' : 'weekly',
      });
    }
  }

  const urlXml = pageUrls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlXml}
</urlset>`;
}

export async function generateProductSitemapXml(): Promise<string> {
  const db = await getDb();
  const siteUrl = await getSiteUrl();
  const now = new Date().toISOString().split('T')[0];

  const urls: { loc: string; lastmod: string }[] = [];

  try {
    // Prefer captured indexable products
    const prods = db.all<any>(
      `SELECT path, updated_at, captured_at FROM seo_page_captures 
       WHERE (entity_type = 'product' OR path LIKE '/product/%') 
         AND is_indexable = 1 
         AND status != 'redirecting' 
       ORDER BY path ASC`
    );
    for (const p of prods) {
      const path = p.path;
      urls.push({
        loc: `${siteUrl}${path.startsWith('/') ? path : '/' + path}`,
        lastmod: (p.updated_at || p.captured_at || now).split('T')[0],
      });
    }
  } catch (_) {}

  // Fallback to local products table if none in seo_page_captures
  if (urls.length === 0) {
    try {
      const localProds = db.all<any>(
        "SELECT slug, hierarchical_url, updated_at FROM products WHERE (is_deleted_remote = 0 OR is_deleted_remote IS NULL) AND (local_hidden = 0 OR local_hidden IS NULL)"
      );
      for (const p of localProds) {
        const path = p.hierarchical_url || `/product/${p.slug}/`;
        urls.push({
          loc: `${siteUrl}${path.startsWith('/') ? path : '/' + path}`,
          lastmod: p.updated_at ? p.updated_at.split('T')[0] : now,
        });
      }
    } catch (_) {}
  }

  const urlXml = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlXml}
</urlset>`;
}

export async function generatePostSitemapXml(): Promise<string> {
  const db = await getDb();
  const siteUrl = await getSiteUrl();
  const now = new Date().toISOString().split('T')[0];

  const urls: { loc: string; lastmod: string }[] = [
    { loc: `${siteUrl}/blogs/`, lastmod: now }
  ];

  try {
    const capturedPosts = db.all<any>(
      `SELECT path, updated_at, captured_at FROM seo_page_captures 
       WHERE entity_type = 'post' 
         AND is_indexable = 1 
         AND status != 'redirecting'
       ORDER BY path ASC`
    );
    for (const cp of capturedPosts) {
      urls.push({
        loc: `${siteUrl}${cp.path.startsWith('/') ? cp.path : '/' + cp.path}`,
        lastmod: (cp.updated_at || cp.captured_at || now).split('T')[0],
      });
    }

    // Fallback to local blog_posts if seo_page_captures has none
    if (capturedPosts.length === 0) {
      const posts = db.all<any>(
        "SELECT slug, published_at, modified_at FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC"
      );
      for (const p of posts) {
        urls.push({
          loc: `${siteUrl}/${p.slug}/`,
          lastmod: (p.modified_at || p.published_at || now).split('T')[0],
        });
      }
    }
  } catch (_) {}

  const urlXml = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlXml}
</urlset>`;
}

export async function generateCategorySitemapXml(): Promise<string> {
  const db = await getDb();
  const siteUrl = await getSiteUrl();
  const now = new Date().toISOString().split('T')[0];

  const urls: { loc: string; lastmod: string }[] = [];

  try {
    const seen = new Set<string>();

    const capturedCats = db.all<any>(
      `SELECT path, updated_at, captured_at FROM seo_page_captures 
       WHERE entity_type IN ('category', 'product_cat', 'product_category') 
         AND is_indexable = 1 
         AND status != 'redirecting'
       ORDER BY path ASC`
    );
    for (const cc of capturedCats) {
      const loc = `${siteUrl}${cc.path.startsWith('/') ? cc.path : '/' + cc.path}`;
      seen.add(loc);
      urls.push({
        loc,
        lastmod: (cc.updated_at || cc.captured_at || now).split('T')[0],
      });
    }

    const cats = db.all<any>(
      'SELECT hierarchical_url, updated_at FROM categories WHERE (is_deleted_remote = 0 OR is_deleted_remote IS NULL)'
    );
    for (const c of cats) {
      if (c.hierarchical_url) {
        const loc = `${siteUrl}${c.hierarchical_url}`;
        if (!seen.has(loc)) {
          seen.add(loc);
          urls.push({
            loc,
            lastmod: c.updated_at ? c.updated_at.split('T')[0] : now,
          });
        }
      }
    }
  } catch (_) {}

  const urlXml = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlXml}
</urlset>`;
}

export async function generateSitemapXml(): Promise<string> {
  return generateSitemapIndexXml();
}

export async function generateRssFeedXml(): Promise<string> {
  const db = await getDb();
  const siteUrl = await getSiteUrl();
  const posts = db.all<any>(
    `SELECT p.title, p.slug, p.excerpt, p.content, p.published_at, a.name as author_name
     FROM blog_posts p
     LEFT JOIN blog_authors a ON p.author_id = a.id
     WHERE p.status = 'published'
     ORDER BY p.published_at DESC
     LIMIT 25`
  );

  const items = posts
    .map(
      (p) => `    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${siteUrl}/${p.slug}/</link>
      <guid>${siteUrl}/${p.slug}/</guid>
      <pubDate>${new Date(p.published_at).toUTCString()}</pubDate>
      <dc:creator><![CDATA[${p.author_name || 'iRepair Mobiles'}]]></dc:creator>
      <description><![CDATA[${p.excerpt || ''}]]></description>
    </item>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>iRepair Mobiles UK - Expert Phone Repair &amp; Refurbished Devices</title>
    <link>${siteUrl}/blogs/</link>
    <description>Latest guides, repair tutorials, and smartphone tech news from iRepair Mobiles UK.</description>
    <language>en-gb</language>
    <atom:link href="${siteUrl}/feed/" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
}
