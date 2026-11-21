import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import https from 'https';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { getDb } from './server/db';
import { authRouter } from './server/routes/auth';
import { cmsRouter, adminCmsRouter } from './server/routes/cms';
import { mediaRouter } from './server/routes/media';
import { usersRouter } from './server/routes/users';
import { wooRouter, adminWooRouter } from './server/routes/woo';
import { mapsRouter } from './server/routes/maps';
import { categoriesRouter, adminCategoriesRouter } from './server/routes/categories';
import { CategoryRecord, resolveCategoryPath } from './server/services/categoryService';
import { customerAuthRouter } from './server/routes/customerAuthRoutes';
import { customerAccountRouter } from './server/routes/customerAccountRoutes';
import { cartCheckoutRouter } from './server/routes/cartCheckoutRoutes';
import { catalogueRouter } from './server/routes/catalogue';
import { resolveProductRequestUrl } from './server/services/productService';
import { jobsRouter, adminJobsRouter } from './server/routes/jobs';
import { blogRouter, adminBlogRouter } from './server/routes/blogRoutes';
import { resolveRootSlug } from './server/services/slugResolverService';
import {
  generateSitemapXml,
  generateSitemapIndexXml,
  generatePageSitemapXml,
  generateProductSitemapXml,
  generatePostSitemapXml,
  generateCategorySitemapXml,
  generateRssFeedXml
} from './server/services/feedSitemapService';
import { adminProductRouter } from './server/routes/adminProductRoutes';
import { webhookRouter } from './server/routes/webhookRoutes';
import { initProductSyncScheduler } from './server/services/productSyncService';
import { expressCheckoutRouter, adminExpressCheckoutRouter } from './server/routes/expressCheckoutRoutes';
import { cleanupAbandonedOrders } from './server/services/expressCheckoutService';
import { paymentRouter, adminPaymentsRouter } from './server/routes/paymentRoutes';
import { cleanupAbandonedPendingOrders } from './server/services/paymentGatewayService';
import { seoRouter } from './server/routes/seoRoutes';
import { getSeoSettings, SeoPageCaptureRecord } from './server/services/seoCaptureService';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';
  const DIST_DIR = path.resolve(process.cwd(), 'dist');
  const UPLOADS_DIR = path.resolve(process.cwd(), 'public', 'uploads');

  // Initialize database and seeds
  await getDb();

  // Start background product sync scheduler
  initProductSyncScheduler().catch((e) => console.warn('Scheduler init warning:', e.message));

  // Basic middleware (capture rawBody for HMAC-SHA256 verification on server-to-server bridge calls)
  app.use(
    express.json({
      limit: '15mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));
  app.use(cookieParser());

  // Apple Pay Merchant ID Domain Association File (Strictly plain text, no cache, no redirect, no auth)
  app.get('/.well-known/apple-developer-merchantid-domain-association', (req, res) => {
    const filePath = path.resolve(process.cwd(), 'public', '.well-known', 'apple-developer-merchantid-domain-association');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.send('7b2276657273696f6e223a312c227073704964223a22535452495045227d\n');
    }
  });

  // Static uploads & public assets
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  app.use('/uploads', express.static(UPLOADS_DIR));
  app.use(express.static(path.resolve(process.cwd(), 'public')));

  // Security headers & CSP allowing Stripe.js, Google Pay, Apple Pay
  app.use((req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' https: data: blob:; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.stripe.com https://pay.google.com https://unpkg.com https://fonts.googleapis.com; " +
      "connect-src 'self' https://api.stripe.com https://*.stripe.com https://*.stripe.network https://pay.google.com https://maps.googleapis.com https://irepair-mobiles.co.uk https://*.google.com; " +
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.stripe.com https://pay.google.com; " +
      "img-src 'self' data: blob: https: http:; " +
      "font-src 'self' https://fonts.gstatic.com data:; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com;"
    );
    next();
  });

  // Dynamic robots.txt respecting environment mode and Rank Math sitemap
  app.get('/robots.txt', async (req, res) => {
    try {
      const db = await getDb();
      const settings = await getSeoSettings(db);
      const siteUrl = (settings.site_url || 'https://irepair-mobiles.co.uk').replace(/\/+$/, '');

      if (settings.environment_mode === 'staging') {
        return res.type('text/plain').send(
          'User-agent: *\n' +
          'Disallow: /\n\n' +
          `Sitemap: ${siteUrl}/sitemap_index.xml\n`
        );
      }

      res.type('text/plain').send(
        'User-agent: *\n' +
        'Disallow: /admin\n' +
        'Disallow: /admin/*\n' +
        'Disallow: /admin-login\n' +
        'Disallow: /account\n' +
        'Disallow: /account/*\n' +
        'Disallow: /cart\n' +
        'Disallow: /checkout\n' +
        'Disallow: /order-confirmation\n' +
        'Disallow: /order-confirmation/*\n' +
        'Disallow: /track-order\n' +
        'Disallow: /reset-password\n' +
        'Disallow: /api/*\n\n' +
        `Sitemap: ${siteUrl}/sitemap_index.xml\n`
      );
    } catch (_) {
      res.type('text/plain').send('User-agent: *\nDisallow: /admin\n');
    }
  });

  // Rank Math Sitemaps
  app.get(['/sitemap_index.xml', '/sitemap.xml'], async (req, res) => {
    try {
      const xml = await generateSitemapIndexXml();
      res.type('application/xml').send(xml);
    } catch (err: any) {
      console.error('Error generating sitemap index:', err);
      res.status(500).send('Error generating sitemap');
    }
  });

  app.get('/page-sitemap.xml', async (req, res) => {
    try {
      const xml = await generatePageSitemapXml();
      res.type('application/xml').send(xml);
    } catch (err: any) {
      res.status(500).send('Error generating page sitemap');
    }
  });

  app.get('/product-sitemap.xml', async (req, res) => {
    try {
      const xml = await generateProductSitemapXml();
      res.type('application/xml').send(xml);
    } catch (err: any) {
      res.status(500).send('Error generating product sitemap');
    }
  });

  app.get('/post-sitemap.xml', async (req, res) => {
    try {
      const xml = await generatePostSitemapXml();
      res.type('application/xml').send(xml);
    } catch (err: any) {
      res.status(500).send('Error generating post sitemap');
    }
  });

  app.get(['/category-sitemap.xml', '/product_cat-sitemap.xml'], async (req, res) => {
    try {
      const xml = await generateCategorySitemapXml();
      res.type('application/xml').send(xml);
    } catch (err: any) {
      res.status(500).send('Error generating category sitemap');
    }
  });

  // RSS Feeds
  app.get(['/feed', '/feed/', '/blogs/feed', '/blogs/feed/'], async (req, res) => {
    try {
      const xml = await generateRssFeedXml();
      res.type('application/rss+xml').send(xml);
    } catch (err: any) {
      console.error('Error generating RSS feed:', err);
      res.status(500).send('Error generating RSS feed');
    }
  });

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/cms', cmsRouter);
  app.use('/api/admin/cms', adminCmsRouter);
  app.use('/api/admin/media', mediaRouter);
  app.use('/api/admin/users', usersRouter);
  app.use('/api/admin/integrations/woocommerce', adminWooRouter);
  app.use('/api/woo', wooRouter);
  app.use('/api/customer', customerAuthRouter);
  app.use('/api/account', customerAccountRouter);
  app.use('/api', cartCheckoutRouter);
  app.use('/api/maps', mapsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/admin/categories', adminCategoriesRouter);
  app.use('/api/catalogue', catalogueRouter);
  app.use('/api/products', catalogueRouter);
  app.use('/api/jobs', jobsRouter);
  app.use('/api/admin/jobs', adminJobsRouter);
  app.use('/api/blog', blogRouter);
  app.use('/api/admin/blog', adminBlogRouter);
  app.use('/api/admin/products', adminProductRouter);
  app.use('/api/webhooks', webhookRouter);
  app.use('/api/express-checkout', expressCheckoutRouter);
  app.use('/api/admin/express-checkout', adminExpressCheckoutRouter);
  app.use('/api/payments', paymentRouter);
  app.use('/api/admin/payments', adminPaymentsRouter);
  app.use('/api/seo', seoRouter);
  app.use('/api/admin/seo', seoRouter);

  // Periodic cleanup job for abandoned pending WooCommerce/express orders (runs every 30 minutes)
  setInterval(() => {
    cleanupAbandonedOrders().catch((err) => console.warn('Order cleanup warning:', err.message));
    cleanupAbandonedPendingOrders().catch((err) => console.warn('Pending order cleanup warning:', err.message));
  }, 30 * 60 * 1000);
  app.get('/api/resolve-slug/:slug(*)?', async (req, res) => {
    try {
      const raw = req.params.slug || (req.query.path as string) || (req.query.slug as string) || '';
      const resolved = await resolveRootSlug(raw);
      return res.status(resolved.statusCode).json(resolved);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to resolve slug' });
    }
  });

  // Legacy URL Redirects, SEO Redirects & Canonical Trailing Slash Middleware
  app.use(async (req, res, next) => {
    const reqPath = req.path;

    // Skip API, assets, uploads, and extensions
    if (
      reqPath.startsWith('/api') ||
      reqPath.startsWith('/uploads') ||
      reqPath.startsWith('/@') ||
      reqPath.startsWith('/src') ||
      reqPath.startsWith('/node_modules') ||
      reqPath.includes('.')
    ) {
      return next();
    }

    // 0. Handle WordPress query search redirect: /?s=term -> /shop?search=term
    if (req.query.s && typeof req.query.s === 'string') {
      const searchTerm = encodeURIComponent((req.query.s as string).trim());
      return res.redirect(301, `/shop?search=${searchTerm}`);
    }

    // 0.1 Check seo_redirects database table (for legacy pages like /mobile-phone-shop-in-uk/, /mobile-phones-repair/, etc.)
    try {
      const db = await getDb();
      const normalizedPath = reqPath.replace(/\/+$/, '') + '/';
      const redirectRow = db.get<{ to_path: string; status_code: number }>(
        'SELECT to_path, status_code FROM seo_redirects WHERE from_path = ? OR from_path = ?',
        [reqPath, normalizedPath]
      );
      if (redirectRow && redirectRow.to_path) {
        db.run(
          'UPDATE seo_redirects SET hit_count = hit_count + 1 WHERE from_path = ? OR from_path = ?',
          [reqPath, normalizedPath]
        );
        return res.redirect(redirectRow.status_code || 301, redirectRow.to_path);
      }
    } catch (_) {}

    // 1. Check ?p=ID query parameter (legacy WordPress direct post link)
    if (req.query.p) {
      try {
        const db = await getDb();
        const pId = parseInt(req.query.p as string, 10);
        const post = db.get<any>('SELECT slug FROM blog_posts WHERE wp_id = ? OR id = ?', [pId, `post_${pId}`]);
        if (post && post.slug) {
          return res.redirect(301, `/${post.slug}/`);
        }
      } catch (_) {}
    }

    // 2. Handle /blog/:slug/ legacy prefix -> /:slug/
    if (reqPath.startsWith('/blog/')) {
      const target = reqPath.replace(/^\/blog\//, '/');
      const cleanTarget = target.replace(/\/+$/, '') + '/';
      return res.redirect(301, cleanTarget);
    }

    // 3. Handle /:slug/amp/ -> /:slug/
    if (reqPath.endsWith('/amp') || reqPath.endsWith('/amp/')) {
      const target = reqPath.replace(/\/amp\/?$/, '') + '/';
      return res.redirect(301, target);
    }

    // 4. Enforce canonical trailing slash on HTML paths
    if (reqPath !== '/' && !reqPath.endsWith('/')) {
      const queryStr = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
      return res.redirect(301, `${reqPath}/${queryStr}`);
    }

    next();
  });

  // 301 Permanent Redirect middleware for legacy or alias category URLs
  app.get('/product-category/*', async (req, res, next) => {
    try {
      const rawUrl = req.path.replace(/\/+$/, '') + '/';
      const db = await getDb();
      const redirectRow = db.get<{ to_url: string; status_code: number }>(
        'SELECT to_url, status_code FROM category_redirects WHERE from_url = ?',
        [rawUrl]
      );
      if (redirectRow) {
        return res.redirect(redirectRow.status_code || 301, redirectRow.to_url);
      }

      // Check if path needs canonicalization or old flat URL resolution
      const clean = req.path.replace(/^\/product-category\/?/, '').replace(/\/+$/, '');
      const segments = clean.split('/').filter(Boolean);
      const rows = db.all<CategoryRecord>('SELECT * FROM categories');
      const resolved = resolveCategoryPath(segments, rows);

      if (resolved.category && resolved.isRedirect && resolved.canonicalUrl !== rawUrl) {
        return res.redirect(301, resolved.canonicalUrl);
      }
    } catch (e) {
      console.warn('Category redirect middleware error:', e);
    }
    next();
  });

  // 301 Permanent Redirect middleware for legacy flat product URLs or non-canonical product URLs
  // Redirects e.g. /product/iphone-12-mini-used-unlocked/ -> /product/mobiles/iphones/iphone-12-series/iphone-12-mini-used-unlocked/
  app.get('/product/*', async (req, res, next) => {
    try {
      const rawUrl = req.path.replace(/\/+$/, '') + '/';
      const db = await getDb();
      const redirectRow = db.get<{ to_url: string; status_code: number }>(
        'SELECT to_url, status_code FROM category_redirects WHERE from_url = ?',
        [rawUrl]
      );
      if (redirectRow) {
        return res.redirect(redirectRow.status_code || 301, redirectRow.to_url);
      }

      // Check if product path needs canonicalization to include parent-child category hierarchy
      const resolved = await resolveProductRequestUrl(req.path);
      if (resolved.product && resolved.isRedirect && resolved.canonicalUrl !== rawUrl) {
        return res.redirect(301, resolved.canonicalUrl);
      }
    } catch (e) {
      console.warn('Product redirect middleware error:', e);
    }
    next();
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Legacy / fallback proxy for WP REST API calls if needed
  app.use('/api/wp', (req, res) => {
    const targetUrl = 'https://irepair-mobiles.co.uk' + req.url;
    const headers = { ...req.headers };
    delete headers.host;
    headers.host = 'irepair-mobiles.co.uk';

    const clientReq = https.request(
      targetUrl,
      {
        method: req.method,
        headers,
      },
      (clientRes) => {
        res.writeHead(clientRes.statusCode || 200, clientRes.headers);
        clientRes.pipe(res);
      }
    );

    clientReq.on('error', (err) => {
      console.error('WP Proxy error:', err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Failed to connect to WordPress proxy' });
      }
    });

    req.pipe(clientReq);
  });

  // Media URL mode proxy: Serves /wp-content/uploads/* by proxying to WordPress source
  app.use('/wp-content/uploads', async (req, res) => {
    try {
      const db = await getDb();
      const settings = await getSeoSettings(db);
      const sourceBase = (settings.wordpress_source_url || 'https://irepair-mobiles.co.uk').replace(/\/+$/, '');
      const targetUrl = `${sourceBase}/wp-content/uploads${req.url}`;
      const parsed = new URL(targetUrl);
      const client = parsed.protocol === 'https:' ? https : http;
      const clientReq = client.get(
        targetUrl,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 iRepairMobiles-MediaProxy/1.0',
            Accept: '*/*',
          },
          timeout: 12000,
        },
        (clientRes) => {
          if (clientRes.statusCode === 200) {
            res.writeHead(200, {
              'Content-Type': clientRes.headers['content-type'] || 'image/jpeg',
              'Cache-Control': 'public, max-age=604800, immutable',
            });
            clientRes.pipe(res);
          } else {
            res.status(clientRes.statusCode || 404).end();
          }
        }
      );
      clientReq.on('error', () => {
        res.status(404).end();
      });
    } catch (_) {
      res.status(404).end();
    }
  });

  function applyProductSchemaOverlay(rawJsonLdString: string, product: any): string {
    try {
      const data = JSON.parse(rawJsonLdString);
      let changed = false;

      const updateProductNode = (node: any) => {
        const type = node['@type'];
        const isProduct = type === 'Product' || (Array.isArray(type) && type.includes('Product'));
        if (!isProduct) return;

        // Update allowed fields ONLY from local product:
        if (product.slug) {
          node.sku = product.slug;
        }
        if (node.offers) {
          const offers = Array.isArray(node.offers) ? node.offers : [node.offers];
          for (const offer of offers) {
            if (offer['@type'] === 'Offer' || offer['@type'] === 'AggregateOffer') {
              offer.priceCurrency = 'GBP';
              if (product.price) {
                offer.price = Number(product.price).toFixed(2);
              }
              offer.availability = product.inStock
                ? 'http://schema.org/InStock'
                : 'http://schema.org/OutOfStock';
              if (product.salePriceEndDate) {
                offer.priceValidUntil = product.salePriceEndDate;
              } else if (!offer.priceValidUntil) {
                offer.priceValidUntil = '2027-12-31';
              }
              changed = true;
            }
          }
        }
      };

      if (data['@graph'] && Array.isArray(data['@graph'])) {
        for (const node of data['@graph']) {
          updateProductNode(node);
        }
      } else if (data['@type']) {
        updateProductNode(data);
      }

      if (changed) {
        return JSON.stringify(data, null, 2);
      }
    } catch (_) {}
    return rawJsonLdString;
  }

  const injectSeo = async (template: string, url: string, res?: express.Response): Promise<string> => {
    try {
      const db = await getDb();
      const cleanPath = url.split('?')[0].replace(/\/+$/, '') + '/';

      // 0. Rank Math SEO Page Captures Injection (Home, About, Contact, Services, Legal, Locations, etc.)
      const captured = db.get<SeoPageCaptureRecord>(
        'SELECT * FROM seo_page_captures WHERE path = ? OR path = ?',
        [cleanPath, cleanPath.replace(/\/+$/, '') || '/']
      );

      if (captured && captured.status !== 'error') {
        const settings = await getSeoSettings(db);
        const title = captured.title || 'iRepair Mobiles - Expert Mobile Repair Shop in the UK';
        const desc = captured.meta_description || '';
        const canonical = captured.canonical_url || `${settings.site_url}${cleanPath}`;

        let robots = captured.meta_robots || 'follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large';
        if (settings.environment_mode === 'staging') {
          robots = 'noindex, nofollow';
        } else if (captured.is_indexable === 0) {
          robots = captured.meta_robots && captured.meta_robots.includes('noindex') ? captured.meta_robots : 'noindex, follow';
        }

        if (res && !res.headersSent) {
          res.setHeader('X-Robots-Tag', robots);
        }

        let output = template;

        // Title
        output = output.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);

        // Meta Description
        if (output.includes('name="description"')) {
          output = output.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/i, `<meta name="description" content="${desc}" />`);
        } else {
          output = output.replace('</head>', `  <meta name="description" content="${desc}" />\n</head>`);
        }

        // Canonical
        if (output.includes('rel="canonical"')) {
          output = output.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i, `<link rel="canonical" href="${canonical}" />`);
        } else {
          output = output.replace('</head>', `  <link rel="canonical" href="${canonical}" />\n</head>`);
        }

        // Robots
        if (output.includes('name="robots"')) {
          output = output.replace(/<meta\s+name="robots"\s+content=".*?"\s*\/?>/i, `<meta name="robots" content="${robots}" />`);
        } else {
          output = output.replace('</head>', `  <meta name="robots" content="${robots}" />\n</head>`);
        }

        // Open Graph Tags
        let ogTags: Record<string, string> = {};
        try { ogTags = JSON.parse(captured.og_tags_json || '{}'); } catch (_) {}
        for (const [prop, val] of Object.entries(ogTags)) {
          if (!val) continue;
          const escapedVal = String(val).replace(/"/g, '&quot;');
          const ogRegex = new RegExp(`<meta\\s+property="${prop}"\\s+content=".*?"\\s*\\/?>`, 'i');
          if (ogRegex.test(output)) {
            output = output.replace(ogRegex, `<meta property="${prop}" content="${escapedVal}" />`);
          } else {
            output = output.replace('</head>', `  <meta property="${prop}" content="${escapedVal}" />\n</head>`);
          }
        }

        // Twitter Tags
        let twTags: Record<string, string> = {};
        try { twTags = JSON.parse(captured.twitter_tags_json || '{}'); } catch (_) {}
        for (const [name, val] of Object.entries(twTags)) {
          if (!val) continue;
          const escapedVal = String(val).replace(/"/g, '&quot;');
          const twRegex = new RegExp(`<meta\\s+name="${name}"\\s+content=".*?"\\s*\\/?>`, 'i');
          if (twRegex.test(output)) {
            output = output.replace(twRegex, `<meta name="${name}" content="${escapedVal}" />`);
          } else {
            output = output.replace('</head>', `  <meta name="${name}" content="${escapedVal}" />\n</head>`);
          }
        }

        // JSON-LD Schema (Rank Math graph rewritten with site_url + Product schema live overlay)
        if (captured.jsonld_rewritten) {
          let schemaOutput = captured.jsonld_rewritten;
          if (cleanPath.startsWith('/product/') && (settings as any).product_schema_live_overlay !== 0) {
            try {
              const prodSlug = cleanPath.replace(/^\/product\//, '').replace(/\/+$/, '');
              const localProd = db.get<any>('SELECT * FROM products WHERE slug = ? OR id = ?', [prodSlug, prodSlug]);
              if (localProd) {
                schemaOutput = applyProductSchemaOverlay(schemaOutput, localProd);
              }
            } catch (_) {}
          }
          const schemaScript = `  <script type="application/ld+json" class="rank-math-schema-react">\n${schemaOutput}\n  </script>`;
          output = output.replace('</head>', `${schemaScript}\n</head>`);
        }

        return output;
      }

      // 1. Product SEO Injection Fallback (if not in seo_page_captures)
      if (cleanPath.startsWith('/product/')) {
        const resolved = await resolveProductRequestUrl(cleanPath);
        if (resolved.product) {
          const p = resolved.product;
          let seo: any = {};
          try { seo = JSON.parse(p.seo_json || '{}'); } catch (_) {}

          const title = seo.title || `${p.title} | iRepair Mobiles UK`;
          const desc = seo.description || p.shortDescription || p.description || `Buy ${p.title} at iRepair Mobiles UK with 12-month UK warranty and express delivery.`;
          const canonical = `https://irepair-mobiles.co.uk${resolved.canonicalUrl}`;
          const ogImg = seo.ogImage || p.image;

          // Breadcrumbs Schema
          const breadcrumbListSchema = {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://irepair-mobiles.co.uk' },
              { '@type': 'ListItem', position: 2, name: 'Shop', item: 'https://irepair-mobiles.co.uk/shop' },
              ...resolved.breadcrumbs.map((c, idx) => ({
                '@type': 'ListItem',
                position: idx + 3,
                name: c.name,
                item: `https://irepair-mobiles.co.uk${c.url}`,
              })),
              {
                '@type': 'ListItem',
                position: resolved.breadcrumbs.length + 3,
                name: p.title,
                item: canonical,
              },
            ],
          };

          // Product Schema
          const productSchema = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: p.title,
            image: p.image,
            description: desc,
            sku: p.slug,
            brand: { '@type': 'Brand', name: p.brand || 'iRepair Mobiles' },
            offers: {
              '@type': 'Offer',
              url: canonical,
              priceCurrency: 'GBP',
              price: p.price,
              availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              itemCondition: p.condition.includes('New') ? 'https://schema.org/NewCondition' : 'https://schema.org/RefurbishedCondition',
              seller: { '@type': 'Organization', name: 'iRepair Mobiles UK' },
            },
          };

          const schemaScript = `  <script type="application/ld+json">\n${JSON.stringify([breadcrumbListSchema, productSchema], null, 2)}\n  </script>`;

          let output = template;
          output = output.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
          output = output.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${desc}" />`);
          output = output.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${title}" />`);
          output = output.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${desc}" />`);
          if (ogImg) {
            output = output.replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${ogImg}" />`);
          }

          if (output.includes('rel="canonical"')) {
            output = output.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${canonical}" />`);
          } else {
            output = output.replace('</head>', `  <link rel="canonical" href="${canonical}" />\n  <meta property="og:url" content="${canonical}" />\n${schemaScript}\n</head>`);
          }

          return output;
        }
      }

      // 2. Category SEO Injection
      if (cleanPath.startsWith('/product-category/')) {
        const clean = cleanPath.replace(/^\/product-category\/?/, '').replace(/\/+$/, '');
        const segments = clean.split('/').filter(Boolean);
        const db = await getDb();
        const rows = db.all<CategoryRecord>('SELECT * FROM categories');
        const resolved = resolveCategoryPath(segments, rows);

        if (resolved.category) {
          const cat = resolved.category;
          let seo: any = {};
          try { seo = JSON.parse(cat.seo_json || '{}'); } catch (_) {}

          const title = seo.metaTitle || `${cat.name} | iRepair Mobiles UK`;
          const desc = seo.metaDescription || `Browse verified ${cat.name} at iRepair Mobiles UK. 12-month UK warranty and fast dispatch.`;
          const canonical = seo.canonicalUrl || `https://irepair-mobiles.co.uk${cat.hierarchical_url}`;

          let output = template;
          output = output.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
          output = output.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${desc}" />`);
          output = output.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${title}" />`);
          output = output.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${desc}" />`);

          if (output.includes('rel="canonical"')) {
            output = output.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${canonical}" />`);
          } else {
            output = output.replace('</head>', `  <link rel="canonical" href="${canonical}" />\n  <meta property="og:url" content="${canonical}" />\n</head>`);
          }

          return output;
        }
      }

      // 3. Blog Post SEO Injection
      const slugCandidate = cleanPath.replace(/^\/+|\/+$/g, '');
      const post = db.get<any>(
        `SELECT p.*, a.name as author_name, a.avatar_url as author_avatar
         FROM blog_posts p
         LEFT JOIN blog_authors a ON p.author_id = a.id
         WHERE p.slug = ? AND p.status = 'published'`,
        [slugCandidate]
      );

      if (post) {
        const title = post.seo_title || `${post.title} | iRepair Mobiles UK`;
        const desc = post.seo_description || post.excerpt || `Read ${post.title} on iRepair Mobiles UK.`;
        const canonical = `https://irepair-mobiles.co.uk/${post.slug}/`;
        const ogImg = post.og_image || post.featured_image_url;

        const breadcrumbsSchema = {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://irepair-mobiles.co.uk/' },
            { '@type': 'ListItem', position: 2, name: 'Blogs', item: 'https://irepair-mobiles.co.uk/blogs/' },
            { '@type': 'ListItem', position: 3, name: post.title, item: canonical },
          ],
        };

        const articleSchema = {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: desc,
          image: ogImg ? [ogImg.startsWith('http') ? ogImg : `https://irepair-mobiles.co.uk${ogImg}`] : [],
          datePublished: post.published_at,
          dateModified: post.modified_at || post.published_at,
          author: {
            '@type': 'Person',
            name: post.author_name || 'iRepair Mobiles Editorial',
          },
          publisher: {
            '@type': 'Organization',
            name: 'iRepair Mobiles UK',
            logo: {
              '@type': 'ImageObject',
              url: 'https://irepair-mobiles.co.uk/images/irepair-logo.svg',
            },
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': canonical,
          },
        };

        const schemaScript = `  <script type="application/ld+json">\n${JSON.stringify([breadcrumbsSchema, articleSchema], null, 2)}\n  </script>`;

        let output = template;
        output = output.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
        output = output.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${desc}" />`);
        output = output.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${title}" />`);
        output = output.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${desc}" />`);
        output = output.replace(/<meta property="og:type" content=".*?" \/>/i, `<meta property="og:type" content="article" />`);
        if (ogImg) {
          const absoluteOg = ogImg.startsWith('http') ? ogImg : `https://irepair-mobiles.co.uk${ogImg}`;
          output = output.replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${absoluteOg}" />`);
        }
        if (output.includes('rel="canonical"')) {
          output = output.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${canonical}" />`);
        } else {
          output = output.replace('</head>', `  <link rel="canonical" href="${canonical}" />\n  <meta property="og:url" content="${canonical}" />\n${schemaScript}\n</head>`);
        }
        return output;
      }

      // 4. /blogs/ Index SEO Injection
      if (cleanPath === '/blogs/' || cleanPath.startsWith('/blogs/page/')) {
        const title = 'iRepair Mobiles UK Blog | Repair Guides, Tips & Tech News';
        const desc = 'Expert phone and laptop repair tips, hardware troubleshooting guides, refurbished buying advice, and smartphone news from iRepair Mobiles UK.';
        const canonical = 'https://irepair-mobiles.co.uk/blogs/';

        const breadcrumbList = {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://irepair-mobiles.co.uk/' },
            { '@type': 'ListItem', position: 2, name: 'Blogs', item: canonical },
          ],
        };

        const schemaScript = `  <script type="application/ld+json">\n${JSON.stringify(breadcrumbList, null, 2)}\n  </script>`;

        let output = template;
        output = output.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
        output = output.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${desc}" />`);
        output = output.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${title}" />`);
        output = output.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${desc}" />`);
        if (output.includes('rel="canonical"')) {
          output = output.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${canonical}" />`);
        } else {
          output = output.replace('</head>', `  <link rel="canonical" href="${canonical}" />\n  <meta property="og:url" content="${canonical}" />\n${schemaScript}\n</head>`);
        }
        return output;
      }
    } catch (err) {
      console.warn('SEO injection warning:', err);
    }
    return template;
  };

  const server = http.createServer(app);

  // Vite middleware in dev or static files in production
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
      },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const resolution = await resolveRootSlug(req.path);
        if (resolution.type === 'redirect' && resolution.redirectUrl) {
          return res.redirect(resolution.statusCode, resolution.redirectUrl);
        }

        const indexHtmlPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexHtmlPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        template = await injectSeo(template, url, res);
        res.status(resolution.statusCode || 200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    if (fs.existsSync(DIST_DIR)) {
      app.use(express.static(DIST_DIR, { maxAge: '1d', etag: true }));
      app.get('*', async (req, res) => {
        try {
          const resolution = await resolveRootSlug(req.path);
          if (resolution.type === 'redirect' && resolution.redirectUrl) {
            return res.redirect(resolution.statusCode, resolution.redirectUrl);
          }
          const indexHtmlPath = path.join(DIST_DIR, 'index.html');
          let template = fs.readFileSync(indexHtmlPath, 'utf-8');
          template = await injectSeo(template, req.originalUrl, res);
          res.status(resolution.statusCode || 200).send(template);
        } catch (_) {
          res.sendFile(path.join(DIST_DIR, 'index.html'));
        }
      });
    } else {
      app.get('*', (req, res) => {
        res.status(503).send('Build not found. Run npm run build first.');
      });
    }
  }

  const serverInstance = server.listen(PORT, '0.0.0.0', () => {
    console.log(`iRepair Mobiles CMS Server running on http://0.0.0.0:${PORT}`);
  });

  const handleShutdown = () => {
    serverInstance.close(() => {
      process.exit(0);
    });
  };
  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
