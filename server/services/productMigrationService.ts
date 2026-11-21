import { DatabaseWrapper } from '../db';
import { LIVE_WP_PRODUCTS, LIVE_WP_CATEGORIES } from '../../src/data/liveWordPressCatalog';
import bundledVariationsRaw from '../../src/data/bundledVariations.json';
import { getProductCategoryPath, buildProductHierarchicalUrl } from '../../src/utils/categoryUtils';
import { decodeHtmlEntities } from '../../src/utils/decodeHtml';
import crypto from 'crypto';

const bundledVariations = bundledVariationsRaw as Record<string, any[]>;

export function computeProductSyncHash(data: any): string {
  const normalized = {
    name: data.name || data.title,
    slug: data.slug,
    sku: data.sku,
    type: data.type,
    status: data.status,
    price: data.price,
    regular_price: data.regular_price,
    sale_price: data.sale_price,
    stock_status: data.stock_status,
    stock_quantity: data.stock_quantity,
    description: data.description,
    short_description: data.short_description,
    attributes: data.attributes,
    variations: data.variations,
    custom_fields: data.custom_fields || data.customFields,
  };
  return crypto.createHash('md5').update(JSON.stringify(normalized)).digest('hex');
}

/**
 * Migrates bundled WooCommerce live catalog into SQLite relational tables.
 * Ensures day-one data exists locally with complete relational hierarchy.
 */
export async function seedProductsFromLiveCatalog(db: DatabaseWrapper): Promise<number> {
  const existingCount = db.get<{ count: number }>('SELECT count(*) as count FROM products');
  if (existingCount && existingCount.count > 0) {
    // Already populated
    return existingCount.count;
  }

  console.log('Seeding initial WooCommerce products catalog into relational database...');
  const now = new Date().toISOString();

  // 1. Seed Brands
  const uniqueBrands = new Set<string>();
  for (const p of LIVE_WP_PRODUCTS) {
    if (p.brand && p.brand.trim()) {
      uniqueBrands.add(decodeHtmlEntities(p.brand.trim()));
    }
  }

  const brandMap = new Map<string, string>(); // brandName.toLowerCase() -> brandId
  let brandIdx = 1;
  for (const bName of Array.from(uniqueBrands)) {
    const slug = bName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const brandId = `brand_${brandIdx++}`;
    brandMap.set(bName.toLowerCase(), brandId);

    db.run(
      `INSERT OR REPLACE INTO brands (id, external_id, name, slug, description, logo_url, website, product_count, source, created_at, updated_at)
       VALUES (?, NULL, ?, ?, ?, '', '', 0, 'woocommerce', ?, ?)`,
      [brandId, bName, slug, `Official ${bName} refurbished smartphones and tech`, now, now]
    );
  }

  // 2. Ensure Categories Exist in categories table
  const existingCats = db.all<any>('SELECT id, slug, woo_id FROM categories');
  const catSlugToId = new Map<string, number>();
  const catWooIdToId = new Map<number, number>();
  for (const c of existingCats) {
    catSlugToId.set(c.slug.toLowerCase(), c.id);
    if (c.woo_id) catWooIdToId.set(Number(c.woo_id), c.id);
  }

  // Insert any missing categories from LIVE_WP_CATEGORIES
  for (const wc of LIVE_WP_CATEGORIES) {
    if (!catWooIdToId.has(wc.id) && !catSlugToId.has(wc.slug.toLowerCase())) {
      const parentId = wc.parent || 0;
      const initialUrl = `/product-category/${wc.slug}/`;
      const seoTitle = `${wc.name} | iRepair Mobiles UK`;
      const seoDesc = `Certified ${wc.name} with 12-month UK warranty and express delivery.`;
      const seoJson = JSON.stringify({ metaTitle: seoTitle, metaDescription: seoDesc, canonicalUrl: initialUrl });

      db.run(
        `INSERT OR IGNORE INTO categories (id, woo_id, parent_woo_id, parent_id, parent, name, slug, description, image, image_url, hierarchical_url, seo_title, seo_description, seo_json, sort_order, count, product_count, display, source, is_deleted_remote, edited_locally, synced_at, updated_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, '', '', '', ?, ?, ?, ?, 0, ?, ?, 'default', 'woocommerce', 0, 0, ?, ?, ?)`,
        [wc.id, wc.id, parentId, parentId, parentId, decodeHtmlEntities(wc.name), wc.slug.toLowerCase(), initialUrl, seoTitle, seoDesc, seoJson, wc.count || 0, wc.count || 0, now, now, now]
      );
      catSlugToId.set(wc.slug.toLowerCase(), wc.id);
      catWooIdToId.set(wc.id, wc.id);
    }
  }

  // 3. Seed Global Attributes (Storage, Colour, Condition, Warranty)
  const defaultAttributes = [
    { id: 'attr_storage', name: 'Storage', slug: 'pa_storage' },
    { id: 'attr_color', name: 'Colour', slug: 'pa_color' },
    { id: 'attr_condition', name: 'Condition', slug: 'pa_condition' },
    { id: 'attr_warranty', name: 'Warranty', slug: 'pa_warranty' },
  ];

  for (const attr of defaultAttributes) {
    db.run(
      `INSERT OR IGNORE INTO attributes (id, external_id, name, slug, type, order_by, has_archives, source, created_at)
       VALUES (?, NULL, ?, ?, 'select', 'menu_order', 1, 'woocommerce', ?)`,
      [attr.id, attr.name, attr.slug, now]
    );
  }

  // 4. Seed Products
  let count = 0;
  for (const p of LIVE_WP_PRODUCTS) {
    const productId = p.id || `prod_${p.wpId || count + 1}`;
    const wpId = p.wpId || (p.id.startsWith('wp-') ? parseInt(p.id.replace('wp-', ''), 10) : null);
    const title = decodeHtmlEntities(p.title);
    const slug = p.slug.toLowerCase().trim();
    const brandName = p.brand ? decodeHtmlEntities(p.brand.trim()) : 'iRepair';
    const brandId = brandMap.get(brandName.toLowerCase()) || null;
    const catPath = getProductCategoryPath(p, LIVE_WP_CATEGORIES);
    const hierUrl = buildProductHierarchicalUrl(p, LIVE_WP_CATEGORIES);
    const condition = decodeHtmlEntities(p.condition || 'Grade A - Pristine');
    const price = typeof p.price === 'number' ? p.price : parseFloat(p.price as any) || 0;
    const regularPrice = p.regularPrice ? (typeof p.regularPrice === 'number' ? p.regularPrice : parseFloat(p.regularPrice as any)) : null;
    const onSale = regularPrice && regularPrice > price ? 1 : 0;
    const inStock = p.inStock ? 1 : 0;
    const stockQuantity = p.stockCount || 10;
    const stockStatus = inStock ? 'instock' : 'outofstock';
    const type = p.type || (p.variations && p.variations.length > 0 ? 'variable' : 'simple');
    const rating = p.rating || 5.0;
    const reviewsCount = p.reviewsCount || 12;
    const desc = p.longDescription || p.description || '';
    const shortDesc = p.shortDescription || '';
    const permalink = p.permalink || `https://irepair-mobiles.co.uk/product/${slug}/`;
    const sku = wpId ? `IR-${wpId}` : `IR-${slug.toUpperCase().slice(0, 8)}`;
    const hash = computeProductSyncHash({ ...p, name: title, price, regular_price: regularPrice });

    // Insert Product
    db.run(
      `INSERT OR REPLACE INTO products (
        id, wp_id, name, title, slug, sku, type, status, short_description, description,
        regular_price, sale_price, sale_from, sale_to, price, on_sale,
        tax_status, tax_class, stock_status, manage_stock, stock_quantity, backorders, sold_individually,
        weight, length, width, height, featured, brand_id, brand_name, condition,
        average_rating, rating_count, purchase_note, menu_order, external_url, button_text,
        wp_permalink, date_created, date_modified, custom_meta,
        image, category, category_path, hierarchical_url, specifications_json, attributes_json, variations_json,
        seo_json, seo_synced_at, source, connection_id, external_id, external_parent_id,
        external_modified_at, last_synced_at, sync_hash, is_deleted_remote, local_hidden,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, 'publish', ?, ?,
        ?, ?, NULL, NULL, ?, ?,
        'taxable', '', ?, 1, ?, 'no', 0,
        '', '', '', '', ?, ?, ?, ?,
        ?, ?, '', 0, '', '',
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, NULL, 'woocommerce', 'wc_main', ?, NULL,
        ?, ?, ?, 0, 0,
        ?, ?
      )`,
      [
        productId,
        wpId,
        title,
        title,
        slug,
        sku,
        type,
        shortDesc,
        desc,
        regularPrice,
        onSale ? price : null,
        price,
        onSale,
        stockStatus,
        stockQuantity,
        p.featured ? 1 : 0,
        brandId,
        brandName,
        condition,
        rating,
        reviewsCount,
        permalink,
        now,
        now,
        JSON.stringify(p.specifications || {}),
        p.image,
        p.category || 'mobile-phones',
        catPath,
        hierUrl,
        JSON.stringify(p.specifications || {}),
        JSON.stringify(p.attributes || []),
        JSON.stringify(p.variations || []),
        JSON.stringify(p.yoastSeo || {}),
        wpId,
        now,
        now,
        hash,
        now,
        now,
      ]
    );

    // 5. Insert Images (Main + Gallery)
    const imagesToInsert: { url: string; isFeatured: number; sortOrder: number }[] = [];
    if (p.image) {
      imagesToInsert.push({ url: p.image, isFeatured: 1, sortOrder: 0 });
    }
    if (Array.isArray(p.gallery)) {
      p.gallery.forEach((gUrl, idx) => {
        if (gUrl && gUrl !== p.image) {
          imagesToInsert.push({ url: gUrl, isFeatured: 0, sortOrder: idx + 1 });
        }
      });
    }

    imagesToInsert.forEach((img, idx) => {
      const imgId = `img_${productId}_${idx}`;
      db.run(
        `INSERT OR REPLACE INTO product_images (id, product_id, external_id, original_url, local_url, alt_text, title, sort_order, is_featured, width, height, created_at)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
        [imgId, productId, img.url, img.url, title, title, img.sortOrder, img.isFeatured, now]
      );
    });

    // 6. Map Category
    let catId: number | undefined;
    if (p.category && catSlugToId.has(p.category.toLowerCase())) {
      catId = catSlugToId.get(p.category.toLowerCase());
    } else if (catSlugToId.has('mobile-phones')) {
      catId = catSlugToId.get('mobile-phones');
    }

    if (catId) {
      db.run(
        `INSERT OR REPLACE INTO product_category_map (product_id, category_id, is_primary)
         VALUES (?, ?, 1)`,
        [productId, catId]
      );
    }

    // 7. Seed Variations (from bundledVariations or p.variations)
    const variationsList: any[] = (wpId && bundledVariations[String(wpId)]) ||
      bundledVariations[productId] ||
      (Array.isArray(p.variations) ? p.variations : []);

    if (variationsList && variationsList.length > 0) {
      variationsList.forEach((v, vIdx) => {
        const varId = v.id ? `var_${v.id}` : `var_${productId}_${vIdx + 1}`;
        const varWpId = typeof v.id === 'number' ? v.id : parseInt(String(v.id || '0'), 10) || null;
        const vPrice = typeof v.price === 'number' ? v.price : parseFloat(v.price || '0') || price;
        const vRegPrice = v.regularPrice ? (typeof v.regularPrice === 'number' ? v.regularPrice : parseFloat(v.regularPrice || '0')) : regularPrice;
        const vOnSale = vRegPrice && vRegPrice > vPrice ? 1 : 0;
        const vImage = v.image || p.image;
        const vAttributes = v.attributes || {
          ...(v.storage ? { storage: v.storage } : {}),
          ...(v.color ? { color: v.color } : {}),
        };

        db.run(
          `INSERT OR REPLACE INTO product_variations (
            id, product_id, sku, attribute_values_json, regular_price, sale_price, price,
            sale_from, sale_to, on_sale, stock_status, manage_stock, stock_quantity,
            image, status, weight, length, width, height, menu_order,
            source, connection_id, external_id, external_parent_id,
            external_modified_at, last_synced_at, sync_hash, is_deleted_remote,
            created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            NULL, NULL, ?, 'instock', 1, 10,
            ?, 'publish', '', '', '', '', ?,
            'woocommerce', 'wc_main', ?, ?,
            ?, ?, ?, 0,
            ?, ?
          )`,
          [
            varId,
            productId,
            v.sku || `${sku}-V${vIdx + 1}`,
            JSON.stringify(vAttributes),
            vRegPrice,
            vOnSale ? vPrice : null,
            vPrice,
            vOnSale,
            vImage,
            vIdx,
            varWpId,
            wpId,
            now,
            now,
            computeProductSyncHash({ varId, vPrice, vAttributes }),
            now,
            now,
          ]
        );
      });
    }

    count++;
  }

  // Update brand product counts
  try {
    db.exec(`
      UPDATE brands 
      SET product_count = (
        SELECT count(*) FROM products 
        WHERE products.brand_id = brands.id AND products.is_deleted_remote = 0 AND products.local_hidden = 0
      );
    `);
  } catch (_) {}

  console.log(`Seeded ${count} products into SQLite database.`);
  return count;
}
