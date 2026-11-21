import https from 'https';
import http from 'http';
import * as cheerio from 'cheerio';

async function fetchUrl(url: string, maxRedirects = 5): Promise<{
  statusCode: number;
  finalUrl: string;
  redirectChain: { url: string; status: number }[];
  body: string;
}> {
  const redirectChain: { url: string; status: number }[] = [];
  let currentUrl = url;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const parsed = new URL(currentUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const res = await new Promise<{ statusCode: number; headers: any; body: string }>((resolve, reject) => {
      const req = client.get(
        currentUrl,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 iRepairMobiles-SEO-Sync/1.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-GB,en;q=0.9',
          },
          timeout: 20000,
        },
        (resp) => {
          let data = '';
          resp.on('data', (chunk) => (data += chunk));
          resp.on('end', () => resolve({ statusCode: resp.statusCode || 200, headers: resp.headers, body: data }));
        }
      );
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout fetching ${currentUrl}`));
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
      redirectChain,
      body: res.body,
    };
  }

  throw new Error(`Exceeded redirect limit for ${url}`);
}

async function run() {
  const SOURCE = 'https://irepair-mobiles.co.uk';

  console.log('--- 1. FETCHING SITEMAP INDEX FROM SOURCE ---');
  let subSitemaps: string[] = [];
  let categoryUrl = '/product-category/accessories/'; // fallback

  try {
    const sitemapRes = await fetchUrl(`${SOURCE}/sitemap_index.xml`);
    const $ = cheerio.load(sitemapRes.body, { xmlMode: true });
    $('sitemap > loc').each((_, el) => {
      subSitemaps.push($(el).text().trim());
    });
    console.log('Discovered Sub-Sitemaps:', subSitemaps);

    // Look for product_cat-sitemap.xml or category-sitemap.xml
    const catSitemap = subSitemaps.find((s) => s.includes('product_cat') || s.includes('category'));
    if (catSitemap) {
      const catSitemapRes = await fetchUrl(catSitemap);
      const $cat = cheerio.load(catSitemapRes.body, { xmlMode: true });
      const firstCatLoc = $cat('url > loc').first().text().trim();
      if (firstCatLoc) {
        categoryUrl = new URL(firstCatLoc).pathname;
        console.log('Discovered Sample Category from sitemap:', categoryUrl);
      }
    }
  } catch (err: any) {
    console.warn('Sitemap index fetch warning:', err.message);
  }

  // 10 URLs required by user
  const targetPaths = [
    { label: '1. Homepage', path: '/' },
    { label: '2. About Us', path: '/about-us/' },
    { label: '3. Shop Page', path: '/shop/' },
    { label: '4. Simple Product', path: '/product/iphone-17-unlocked/' },
    { label: '5. Variable Product', path: '/product/iphone-14-used-unlocked/' },
    { label: '6. Quirk Product (FAQs double H1)', path: '/product/budi-15w-wireless-charging-stand/' },
    { label: '7. Blog Post', path: '/the-truth-about-fast-charging/' },
    { label: '8. Quirk Post (No H1)', path: '/laptop-repair-shops-in-uk/' },
    { label: '9. Redirecting Product', path: '/product/used-iphone-14-pro/' },
    { label: '10. Product Category', path: categoryUrl },
  ];

  console.log('\n--- 2. EXECUTING LIVE CAPTURE FOR 10 TARGET URLS ---');
  const results = [];

  for (const item of targetPaths) {
    const fullUrl = `${SOURCE}${item.path}`;
    try {
      const res = await fetchUrl(fullUrl);
      const $ = cheerio.load(res.body);

      const title = $('title').first().text().replace(/\s+/g, ' ').trim();
      const description = $('meta[name="description"]').attr('content')?.trim() || '';
      const canonical = $('link[rel="canonical"]').attr('href')?.trim() || '';
      const robots = $('meta[name="robots"]').attr('content')?.trim() || '';

      const og: Record<string, string> = {};
      $('meta[property^="og:"]').each((_, el) => {
        const p = $(el).attr('property');
        const c = $(el).attr('content');
        if (p && c) og[p] = c;
      });

      const twitter: Record<string, string> = {};
      $('meta[name^="twitter:"]').each((_, el) => {
        const n = $(el).attr('name');
        const c = $(el).attr('content');
        if (n && c) twitter[n] = c;
      });

      let jsonLdGraphTypes: any[] = [];
      let productOffers: any = null;

      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const raw = $(el).html();
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
              for (const node of parsed['@graph']) {
                jsonLdGraphTypes.push(node['@type']);
                if (node['@type'] === 'Product' || (Array.isArray(node['@type']) && node['@type'].includes('Product'))) {
                  if (node.offers) {
                    productOffers = node.offers;
                  }
                }
              }
            } else if (parsed['@type']) {
              jsonLdGraphTypes.push(parsed['@type']);
              if (parsed['@type'] === 'Product' && parsed.offers) {
                productOffers = parsed.offers;
              }
            }
          }
        } catch (_) {}
      });

      const h1s = $('h1')
        .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
        .get()
        .filter(Boolean);

      results.push({
        label: item.label,
        requested_path: item.path,
        http_status: res.statusCode,
        final_url: res.finalUrl,
        redirect_chain: res.redirectChain,
        title,
        description,
        canonical,
        robots,
        og_sample: {
          'og:title': og['og:title'] || '',
          'og:url': og['og:url'] || '',
          'og:type': og['og:type'] || '',
          'og:image': og['og:image'] || '',
        },
        twitter_card: twitter['twitter:card'] || '',
        jsonld_graph_types: jsonLdGraphTypes,
        product_offers: productOffers,
        h1: h1s,
      });
    } catch (err: any) {
      results.push({
        label: item.label,
        requested_path: item.path,
        error: err.message,
      });
    }
  }

  const outputData = {
    sub_sitemaps: subSitemaps,
    samples: results,
  };
  import('fs').then(fs => {
    fs.writeFileSync('./first-action-result.json', JSON.stringify(outputData, null, 2));
    console.log('Saved to first-action-result.json successfully!');
  });
}

run().catch(console.error);
