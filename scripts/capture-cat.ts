import https from 'https';
import * as cheerio from 'cheerio';

https.get('https://irepair-mobiles.co.uk/product-category/mobile-phones/iphones/', {
  headers: { 'User-Agent': 'Mozilla/5.0 iRepairMobiles-SEO-Sync/1.0' }
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const $ = cheerio.load(data);
    const title = $('title').text().trim();
    const desc = $('meta[name="description"]').attr('content') || '';
    const canonical = $('link[rel="canonical"]').attr('href') || '';
    const robots = $('meta[name="robots"]').attr('content') || '';
    const h1 = $('h1').map((_, el) => $(el).text().trim()).get();
    let jsonLdGraphTypes: any[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).html() || '');
        if (parsed['@graph']) {
          jsonLdGraphTypes.push(...parsed['@graph'].map((n: any) => n['@type']));
        }
      } catch(_) {}
    });
    console.log(JSON.stringify({
      path: '/product-category/mobile-phones/iphones/',
      status: res.statusCode,
      title,
      desc,
      canonical,
      robots,
      h1,
      jsonLdGraphTypes
    }, null, 2));
  });
});
