import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { encrypt } from './crypto';
import { CATEGORY_EDITORIAL_RAIL_DEFAULTS } from '../src/widgets/components/categoryEditorialRailDefaults';
import { HERO_BRIGHT_SLIDER_DEFAULTS } from '../src/widgets/components/heroBrightSliderDefaults';
import {
  HOME2_SEED_SECTIONS,
  PROCESS_STEPS_MODERN_DEFAULTS,
  WHY_CHOOSE_US_METRICS_DARK_DEFAULTS,
  STORE_LOCATIONS_WITH_TRACKER_DEFAULTS,
  FAQ_TWO_COLUMN_ACCORDION_DEFAULTS,
} from '../src/widgets/components/home2/home2Defaults';
import { seedProductsFromLiveCatalog } from './services/productMigrationService';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'cms.sqlite');

let dbInstance: SqlJsDatabase | null = null;

// Query helpers for sql.js
export class DatabaseWrapper {
  private db: SqlJsDatabase;

  constructor(db: SqlJsDatabase) {
    this.db = db;
  }

  save() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      const data = this.db.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    } catch (err) {
      console.error('Failed to save SQLite database to disk:', err);
    }
  }

  all<T = any>(sqlQuery: string, params: any[] = []): T[] {
    const sanitized = params.map((p) => (p === undefined ? null : p));
    const stmt = this.db.prepare(sqlQuery);
    stmt.bind(sanitized);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    stmt.free();
    return results;
  }

  get<T = any>(sqlQuery: string, params: any[] = []): T | null {
    const results = this.all<T>(sqlQuery, params);
    return results.length > 0 ? results[0] : null;
  }

  private inTransaction = false;

  run(sqlQuery: string, params: any[] = []): { changes: number } {
    const sanitized = params.map((p) => (p === undefined ? null : p));
    this.db.run(sqlQuery, sanitized);
    if (!this.inTransaction) {
      this.save();
    }
    return { changes: 1 };
  }

  exec(sqlStatements: string) {
    this.db.exec(sqlStatements);
    if (!this.inTransaction) {
      this.save();
    }
  }

  transaction<T>(fn: () => T): T {
    this.inTransaction = true;
    this.db.exec('BEGIN TRANSACTION');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      this.inTransaction = false;
      this.save();
      return result;
    } catch (err) {
      try {
        this.db.exec('ROLLBACK');
      } catch (_) {}
      this.inTransaction = false;
      throw err;
    }
  }
}

export async function getDb(): Promise<DatabaseWrapper> {
  if (dbInstance) {
    return new DatabaseWrapper(dbInstance);
  }

  const SQL = await initSqlJs();
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  let db: SqlJsDatabase;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  dbInstance = db;
  const wrapper = new DatabaseWrapper(db);
  await initializeSchemaAndSeeds(wrapper);
  return wrapper;
}

async function initializeSchemaAndSeeds(db: DatabaseWrapper) {
  // 1. Create Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'editor',
      must_change_password INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published',
      seo_json TEXT NOT NULL,
      sections_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS global_widgets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      settings_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collections_faqs (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS collections_reviews (
      id TEXT PRIMARY KEY,
      author TEXT NOT NULL,
      rating REAL NOT NULL DEFAULT 5,
      review_text TEXT NOT NULL,
      location TEXT,
      date TEXT,
      device_repaired TEXT,
      verified INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL DEFAULT 'Google',
      avatar TEXT,
      approved INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS collections_stores (
      id TEXT PRIMARY KEY,
      city TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      postcode TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      opening_hours_json TEXT NOT NULL,
      features_json TEXT NOT NULL,
      is_express_hub INTEGER NOT NULL DEFAULT 0,
      map_link TEXT,
      image TEXT,
      latitude REAL DEFAULT 0,
      longitude REAL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS collections_repair_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      base_price REAL NOT NULL,
      duration_minutes INTEGER NOT NULL,
      icon_name TEXT NOT NULL,
      popular INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS collections_steps (
      id TEXT PRIMARY KEY,
      step_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      icon_name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      width INTEGER DEFAULT 0,
      height INTEGER DEFAULT 0,
      alt_text TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS menus (
      id TEXT PRIMARY KEY,
      location TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      items_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      config_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS revisions (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      title TEXT NOT NULL,
      sections_json TEXT NOT NULL,
      seo_json TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS store_carts (
      cart_token TEXT PRIMARY KEY,
      customer_id INTEGER,
      items_json TEXT NOT NULL,
      coupon_code TEXT,
      shipping_method_id TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      user_email TEXT NOT NULL,
      action TEXT NOT NULL,
      details_json TEXT NOT NULL,
      ip TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS form_submissions (
      id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL,
      form_title TEXT NOT NULL,
      recipients_json TEXT NOT NULL,
      fields_json TEXT NOT NULL,
      email_status TEXT NOT NULL,
      email_error TEXT,
      ip TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS express_checkout_settings (
      id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1,
      mode TEXT NOT NULL DEFAULT 'test',
      test_publishable_key TEXT,
      test_secret_key_encrypted TEXT,
      live_publishable_key TEXT,
      live_secret_key_encrypted TEXT,
      webhook_secret_encrypted TEXT,
      enable_product_page INTEGER NOT NULL DEFAULT 1,
      enable_cart_page INTEGER NOT NULL DEFAULT 1,
      enable_mini_cart INTEGER NOT NULL DEFAULT 0,
      enable_checkout_page INTEGER NOT NULL DEFAULT 0,
      enable_apple_pay INTEGER NOT NULL DEFAULT 1,
      enable_google_pay INTEGER NOT NULL DEFAULT 1,
      enable_link INTEGER NOT NULL DEFAULT 1,
      button_theme TEXT NOT NULL DEFAULT 'black',
      button_type TEXT NOT NULL DEFAULT 'buy',
      button_height INTEGER NOT NULL DEFAULT 48,
      button_border_radius INTEGER NOT NULL DEFAULT 12,
      button_columns INTEGER NOT NULL DEFAULT 2,
      button_gap INTEGER NOT NULL DEFAULT 8,
      show_divider INTEGER NOT NULL DEFAULT 0,
      divider_text TEXT NOT NULL DEFAULT 'Express checkout',
      unselected_variation_action TEXT NOT NULL DEFAULT 'disable',
      helper_text TEXT NOT NULL DEFAULT 'Select options to use express checkout',
      allow_guest_checkout INTEGER NOT NULL DEFAULT 1,
      collect_phone_number INTEGER NOT NULL DEFAULT 1,
      apple_merchant_id TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS express_checkout_orders (
      id TEXT PRIMARY KEY,
      wc_order_id INTEGER,
      order_key TEXT,
      payment_intent_id TEXT,
      client_secret TEXT,
      idempotency_key TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'GBP',
      customer_email TEXT,
      customer_phone TEXT,
      shipping_address_json TEXT,
      billing_address_json TEXT,
      line_items_json TEXT,
      shipping_lines_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_settings (
      id TEXT PRIMARY KEY,
      use_woo_hosted INTEGER NOT NULL DEFAULT 1,
      handoff_style TEXT NOT NULL DEFAULT 'hosted_checkout',
      woo_hosted_base_url TEXT,
      return_url_base TEXT,
      cancel_url_base TEXT,
      handoff_secret_encrypted TEXT,
      allowed_methods_json TEXT NOT NULL DEFAULT '["card","apple_pay","google_pay"]',
      enable_product_page INTEGER NOT NULL DEFAULT 1,
      enable_cart_page INTEGER NOT NULL DEFAULT 1,
      enable_mini_cart INTEGER NOT NULL DEFAULT 1,
      enable_checkout_page INTEGER NOT NULL DEFAULT 1,
      button_theme TEXT NOT NULL DEFAULT 'black',
      button_type TEXT NOT NULL DEFAULT 'plain',
      button_height INTEGER NOT NULL DEFAULT 46,
      button_border_radius INTEGER NOT NULL DEFAULT 5,
      button_columns INTEGER NOT NULL DEFAULT 2,
      button_gap INTEGER NOT NULL DEFAULT 10,
      show_divider INTEGER NOT NULL DEFAULT 0,
      divider_text TEXT NOT NULL DEFAULT 'Express checkout',
      unselected_variation_action TEXT NOT NULL DEFAULT 'disable',
      helper_text TEXT NOT NULL DEFAULT 'Select options to use express checkout',
      abandoned_order_minutes INTEGER NOT NULL DEFAULT 60,
      dispatch_note TEXT NOT NULL DEFAULT 'Your order is being prepared for dispatch from our UK hub.',
      support_email TEXT NOT NULL DEFAULT 'info@irepair-mobiles.co.uk',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS checkout_handoffs (
      id TEXT PRIMARY KEY,
      token_hash TEXT UNIQUE NOT NULL,
      idempotency_key TEXT,
      style TEXT NOT NULL DEFAULT 'hosted_checkout',
      source TEXT NOT NULL DEFAULT 'product',
      items_json TEXT NOT NULL,
      coupon_code TEXT,
      customer_id INTEGER,
      wc_order_id INTEGER,
      wc_order_key TEXT,
      return_url TEXT NOT NULL,
      cancel_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'created',
      expires_at TEXT NOT NULL,
      consumed_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_checkout_handoffs_idem ON checkout_handoffs(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_checkout_handoffs_exp ON checkout_handoffs(expires_at);

    CREATE TABLE IF NOT EXISTS simulated_test_orders (
      id TEXT PRIMARY KEY,
      order_key TEXT NOT NULL,
      payment_method_title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'simulated',
      items_json TEXT NOT NULL,
      totals_json TEXT NOT NULL,
      customer_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seo_settings (
      id TEXT PRIMARY KEY,
      wordpress_source_url TEXT NOT NULL DEFAULT 'https://irepair-mobiles.co.uk',
      site_url TEXT NOT NULL DEFAULT 'https://irepair-mobiles.co.uk',
      origins_to_rewrite_json TEXT NOT NULL DEFAULT '["https://irepair-mobiles.co.uk","https://old.irepair-mobiles.co.uk","http://irepair-mobiles.co.uk","http://old.irepair-mobiles.co.uk"]',
      environment_mode TEXT NOT NULL DEFAULT 'production',
      robots_source_mode TEXT NOT NULL DEFAULT 'baseline_protected',
      media_url_mode TEXT NOT NULL DEFAULT 'keep_source',
      auth_header TEXT,
      auto_sync_frequency TEXT NOT NULL DEFAULT 'disabled',
      last_sync_at TEXT,
      last_sync_status TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seo_page_captures (
      id TEXT PRIMARY KEY,
      path TEXT UNIQUE NOT NULL,
      entity_type TEXT NOT NULL DEFAULT 'page',
      title TEXT NOT NULL DEFAULT '',
      meta_description TEXT NOT NULL DEFAULT '',
      canonical_url TEXT NOT NULL DEFAULT '',
      meta_robots TEXT NOT NULL DEFAULT '',
      og_tags_json TEXT NOT NULL DEFAULT '{}',
      twitter_tags_json TEXT NOT NULL DEFAULT '{}',
      jsonld_raw TEXT,
      jsonld_rewritten TEXT,
      schema_types_json TEXT NOT NULL DEFAULT '[]',
      h1_tags_json TEXT NOT NULL DEFAULT '[]',
      h2_tags_json TEXT NOT NULL DEFAULT '[]',
      http_status INTEGER NOT NULL DEFAULT 200,
      content_hash TEXT,
      status TEXT NOT NULL DEFAULT 'ok',
      redirect_url TEXT,
      is_indexable INTEGER NOT NULL DEFAULT 1,
      is_local_override INTEGER NOT NULL DEFAULT 0,
      baseline_robots TEXT,
      baseline_indexable INTEGER NOT NULL DEFAULT 1,
      captured_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_seo_page_captures_path ON seo_page_captures(path);

    CREATE TABLE IF NOT EXISTS seo_baseline_snapshots (
      id TEXT PRIMARY KEY,
      snapshot_name TEXT NOT NULL,
      pages_count INTEGER NOT NULL DEFAULT 0,
      data_json TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seo_redirects (
      id TEXT PRIMARY KEY,
      from_path TEXT UNIQUE NOT NULL,
      to_path TEXT NOT NULL,
      status_code INTEGER NOT NULL DEFAULT 301,
      origin TEXT NOT NULL DEFAULT 'rank_math_sync',
      hit_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_seo_redirects_from ON seo_redirects(from_path);

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      parent INTEGER NOT NULL DEFAULT 0,
      description TEXT DEFAULT '',
      count INTEGER NOT NULL DEFAULT 0,
      image TEXT DEFAULT '',
      hierarchical_url TEXT NOT NULL,
      seo_json TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS category_redirects (
      id TEXT PRIMARY KEY,
      from_url TEXT UNIQUE NOT NULL,
      to_url TEXT NOT NULL,
      status_code INTEGER NOT NULL DEFAULT 301,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      wp_id INTEGER,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      category_path TEXT NOT NULL,
      hierarchical_url TEXT NOT NULL,
      brand TEXT,
      price REAL NOT NULL,
      regular_price REAL,
      type TEXT NOT NULL DEFAULT 'simple',
      condition TEXT NOT NULL DEFAULT 'Grade A - Pristine',
      in_stock INTEGER NOT NULL DEFAULT 1,
      stock_count INTEGER NOT NULL DEFAULT 12,
      rating REAL NOT NULL DEFAULT 5.0,
      reviews_count INTEGER NOT NULL DEFAULT 12,
      image TEXT NOT NULL,
      gallery_json TEXT,
      description TEXT,
      short_description TEXT,
      specifications_json TEXT,
      attributes_json TEXT,
      variations_json TEXT,
      seo_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      location TEXT NOT NULL,
      vacancies INTEGER NOT NULL DEFAULT 1,
      closing_date TEXT,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      department TEXT DEFAULT 'Retail & Customer Experience',
      salary_range TEXT DEFAULT 'Competitive',
      employment_type TEXT DEFAULT 'Full-Time',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_applications (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      education_level TEXT NOT NULL,
      salary_expectations REAL NOT NULL,
      resume_url TEXT NOT NULL,
      resume_filename TEXT,
      cover_letter_url TEXT,
      cover_letter_filename TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_logs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      status TEXT NOT NULL,
      summary TEXT,
      error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON sync_logs(type, started_at DESC);

    CREATE TABLE IF NOT EXISTS page_redirects (
      id TEXT PRIMARY KEY,
      old_slug TEXT UNIQUE NOT NULL,
      new_slug TEXT NOT NULL,
      status INTEGER NOT NULL DEFAULT 301,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_page_redirects_old_slug ON page_redirects(old_slug);

    CREATE TABLE IF NOT EXISTS blog_posts (
      id TEXT PRIMARY KEY,
      wp_id INTEGER UNIQUE,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      excerpt TEXT,
      content TEXT,
      featured_image_url TEXT,
      featured_image_alt TEXT,
      author_id TEXT,
      status TEXT NOT NULL DEFAULT 'published',
      published_at TEXT,
      scheduled_at TEXT,
      modified_at TEXT,
      seo_title TEXT,
      seo_description TEXT,
      canonical_url TEXT,
      og_image TEXT,
      reading_time INTEGER DEFAULT 1,
      source TEXT NOT NULL DEFAULT 'wordpress',
      edited_locally INTEGER DEFAULT 0,
      wp_link TEXT,
      synced_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_wp_id ON blog_posts(wp_id);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at DESC);

    CREATE TABLE IF NOT EXISTS blog_categories (
      id TEXT PRIMARY KEY,
      wp_id INTEGER UNIQUE,
      parent_id TEXT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT DEFAULT '',
      count INTEGER DEFAULT 0,
      source TEXT DEFAULT 'wordpress',
      seo_title TEXT DEFAULT '',
      seo_description TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(slug);
    CREATE INDEX IF NOT EXISTS idx_blog_categories_wp_id ON blog_categories(wp_id);

    CREATE TABLE IF NOT EXISTS blog_tags (
      id TEXT PRIMARY KEY,
      wp_id INTEGER UNIQUE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      source TEXT DEFAULT 'wordpress'
    );
    CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON blog_tags(slug);
    CREATE INDEX IF NOT EXISTS idx_blog_tags_wp_id ON blog_tags(wp_id);

    CREATE TABLE IF NOT EXISTS blog_post_categories (
      post_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      PRIMARY KEY (post_id, category_id)
    );

    CREATE TABLE IF NOT EXISTS blog_post_tags (
      post_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (post_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS blog_authors (
      id TEXT PRIMARY KEY,
      wp_id INTEGER UNIQUE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      avatar_url TEXT,
      bio TEXT
    );

    CREATE TABLE IF NOT EXISTS blog_media (
      id TEXT PRIMARY KEY,
      wp_id INTEGER,
      url TEXT NOT NULL,
      local_path TEXT NOT NULL,
      alt TEXT,
      mime TEXT,
      width INTEGER,
      height INTEGER
    );
    CREATE TABLE IF NOT EXISTS product_variations (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      sku TEXT,
      attribute_values_json TEXT NOT NULL DEFAULT '{}',
      regular_price REAL,
      sale_price REAL,
      price REAL NOT NULL,
      sale_from TEXT,
      sale_to TEXT,
      on_sale INTEGER DEFAULT 0,
      stock_status TEXT DEFAULT 'instock',
      manage_stock INTEGER DEFAULT 0,
      stock_quantity INTEGER DEFAULT 0,
      image TEXT,
      status TEXT DEFAULT 'publish',
      weight TEXT,
      length TEXT,
      width TEXT,
      height TEXT,
      menu_order INTEGER DEFAULT 0,
      source TEXT DEFAULT 'woocommerce',
      connection_id TEXT DEFAULT 'wc_main',
      external_id INTEGER,
      external_parent_id INTEGER,
      external_modified_at TEXT,
      last_synced_at TEXT,
      sync_hash TEXT,
      is_deleted_remote INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_variations_product_id ON product_variations(product_id);
    CREATE INDEX IF NOT EXISTS idx_variations_sku ON product_variations(sku);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_variations_conn_ext ON product_variations(connection_id, external_id);

    CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      external_id INTEGER,
      original_url TEXT NOT NULL,
      local_url TEXT,
      alt_text TEXT DEFAULT '',
      title TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      is_featured INTEGER DEFAULT 0,
      width INTEGER DEFAULT 0,
      height INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);

    CREATE TABLE IF NOT EXISTS attributes (
      id TEXT PRIMARY KEY,
      external_id INTEGER,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      type TEXT DEFAULT 'select',
      order_by TEXT DEFAULT 'menu_order',
      has_archives INTEGER DEFAULT 0,
      source TEXT DEFAULT 'woocommerce',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_attributes_slug ON attributes(slug);

    CREATE TABLE IF NOT EXISTS attribute_terms (
      id TEXT PRIMARY KEY,
      attribute_id TEXT NOT NULL,
      external_id INTEGER,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT DEFAULT '',
      menu_order INTEGER DEFAULT 0,
      count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_attribute_terms_attr ON attribute_terms(attribute_id);
    CREATE INDEX IF NOT EXISTS idx_attribute_terms_slug ON attribute_terms(slug);

    CREATE TABLE IF NOT EXISTS product_attribute_map (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      attribute_id TEXT,
      name TEXT NOT NULL,
      options_json TEXT NOT NULL DEFAULT '[]',
      position INTEGER DEFAULT 0,
      visible INTEGER DEFAULT 1,
      variation INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_prod_attr_map_prod ON product_attribute_map(product_id);

    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      external_id INTEGER,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      logo_url TEXT DEFAULT '',
      website TEXT DEFAULT '',
      product_count INTEGER DEFAULT 0,
      source TEXT DEFAULT 'woocommerce',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      external_id INTEGER,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      count INTEGER DEFAULT 0,
      source TEXT DEFAULT 'woocommerce'
    );
    CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

    CREATE TABLE IF NOT EXISTS product_category_map (
      product_id TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      is_primary INTEGER DEFAULT 0,
      PRIMARY KEY (product_id, category_id)
    );
    CREATE INDEX IF NOT EXISTS idx_prod_cat_map_cat ON product_category_map(category_id);

    CREATE TABLE IF NOT EXISTS product_tag_map (
      product_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (product_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS product_relations (
      product_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      target_product_id TEXT NOT NULL,
      PRIMARY KEY (product_id, relation_type, target_product_id)
    );
  `);

  // Migration for seo_settings columns
  try { db.exec("ALTER TABLE seo_settings ADD COLUMN old_website_link_enabled INTEGER DEFAULT 1;"); } catch (_) {}
  try { db.exec("ALTER TABLE seo_settings ADD COLUMN old_website_link_text TEXT DEFAULT 'Visit old website';"); } catch (_) {}
  try { db.exec("ALTER TABLE seo_settings ADD COLUMN old_website_link_url TEXT DEFAULT 'https://old.irepair-mobiles.co.uk';"); } catch (_) {}
  try { db.exec("ALTER TABLE seo_settings ADD COLUMN old_website_link_new_tab INTEGER DEFAULT 1;"); } catch (_) {}
  try { db.exec("ALTER TABLE seo_settings ADD COLUMN old_website_link_desktop INTEGER DEFAULT 1;"); } catch (_) {}
  try { db.exec("ALTER TABLE seo_settings ADD COLUMN old_website_link_mobile INTEGER DEFAULT 1;"); } catch (_) {}
  try { db.exec("ALTER TABLE seo_settings ADD COLUMN product_schema_live_overlay INTEGER DEFAULT 1;"); } catch (_) {}
  try { db.exec("ALTER TABLE seo_settings ADD COLUMN allow_local_override INTEGER DEFAULT 0;"); } catch (_) {}

  // Migration for products table columns
  try { db.exec("ALTER TABLE products ADD COLUMN name TEXT;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN sku TEXT;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'publish';"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN sale_price REAL;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN sale_from TEXT;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN sale_to TEXT;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN on_sale INTEGER DEFAULT 0;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN tax_status TEXT DEFAULT 'taxable';"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN tax_class TEXT DEFAULT '';"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN stock_status TEXT DEFAULT 'instock';"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN manage_stock INTEGER DEFAULT 0;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 0;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN backorders TEXT DEFAULT 'no';"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN sold_individually INTEGER DEFAULT 0;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN weight TEXT;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN length TEXT;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN width TEXT;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN height TEXT;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN featured INTEGER DEFAULT 0;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN brand_id TEXT;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN brand_name TEXT;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN average_rating REAL DEFAULT 5.0;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN rating_count INTEGER DEFAULT 0;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN purchase_note TEXT;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN menu_order INTEGER DEFAULT 0;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN external_url TEXT;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN button_text TEXT;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN wp_permalink TEXT;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN date_created TEXT;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN date_modified TEXT;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN custom_meta TEXT;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN source TEXT DEFAULT 'woocommerce';"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN connection_id TEXT DEFAULT 'wc_main';"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN external_id INTEGER;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN external_parent_id INTEGER;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN external_modified_at TEXT;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN last_synced_at TEXT;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN sync_hash TEXT;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN is_deleted_remote INTEGER DEFAULT 0;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN local_hidden INTEGER DEFAULT 0;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN seo_synced_at TEXT;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN custom_fields TEXT;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN min_price REAL;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN max_price REAL;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN min_regular_price REAL;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN max_regular_price REAL;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN has_price_range INTEGER DEFAULT 0;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN any_on_sale INTEGER DEFAULT 0;"); } catch (_) {}
  try { db.exec("ALTER TABLE products ADD COLUMN default_attributes_json TEXT DEFAULT '{}';"); } catch (_) {}

  try { db.exec("ALTER TABLE product_variations ADD COLUMN backorders TEXT DEFAULT 'no';"); } catch (_) {}
  try { db.exec("ALTER TABLE product_variations ADD COLUMN description TEXT DEFAULT '';"); } catch (_) {}
  try { db.exec("ALTER TABLE product_variations ADD COLUMN name TEXT;"); } catch (_) {}

  // Dedicated Product Custom Fields (ACF & dynamic extensible fields)
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS product_custom_fields (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        field_key TEXT NOT NULL,
        value TEXT,
        field_type TEXT NOT NULL DEFAULT 'text',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_prod_custom_fields_prod_key ON product_custom_fields(product_id, field_key);
      CREATE INDEX IF NOT EXISTS idx_prod_custom_fields_key ON product_custom_fields(field_key);
    `);
  } catch (_) {}

  try { db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_products_conn_ext ON products(connection_id, external_id);"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_products_condition ON products(condition);"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);"); } catch (_) {}

  // Migration for existing tables: ensure latitude and longitude columns exist
  try { db.exec('ALTER TABLE collections_stores ADD COLUMN latitude REAL DEFAULT 0;'); } catch (_) {}
  try { db.exec('ALTER TABLE collections_stores ADD COLUMN longitude REAL DEFAULT 0;'); } catch (_) {}

  // Migrations for categories table to support full WooCommerce hierarchy & sync requirements
  try { db.exec('ALTER TABLE categories ADD COLUMN woo_id INTEGER;'); } catch (_) {}
  try { db.exec('ALTER TABLE categories ADD COLUMN parent_woo_id INTEGER DEFAULT 0;'); } catch (_) {}
  try { db.exec('ALTER TABLE categories ADD COLUMN parent_id INTEGER DEFAULT 0;'); } catch (_) {}
  try { db.exec("ALTER TABLE categories ADD COLUMN image_url TEXT DEFAULT '';"); } catch (_) {}
  try { db.exec('ALTER TABLE categories ADD COLUMN menu_order INTEGER DEFAULT 0;'); } catch (_) {}
  try { db.exec('ALTER TABLE categories ADD COLUMN product_count INTEGER DEFAULT 0;'); } catch (_) {}
  try { db.exec("ALTER TABLE categories ADD COLUMN display TEXT DEFAULT 'default';"); } catch (_) {}
  try { db.exec("ALTER TABLE categories ADD COLUMN seo_title TEXT DEFAULT '';"); } catch (_) {}
  try { db.exec("ALTER TABLE categories ADD COLUMN seo_description TEXT DEFAULT '';"); } catch (_) {}
  try { db.exec("ALTER TABLE categories ADD COLUMN source TEXT DEFAULT 'woocommerce';"); } catch (_) {}
  try { db.exec('ALTER TABLE categories ADD COLUMN is_deleted_remote INTEGER DEFAULT 0;'); } catch (_) {}
  try { db.exec('ALTER TABLE categories ADD COLUMN edited_locally INTEGER DEFAULT 0;'); } catch (_) {}
  try { db.exec('ALTER TABLE categories ADD COLUMN synced_at TEXT;'); } catch (_) {}
  try { db.exec('ALTER TABLE categories ADD COLUMN created_at TEXT;'); } catch (_) {}

  try { db.exec('CREATE INDEX IF NOT EXISTS idx_categories_woo_id ON categories(woo_id);'); } catch (_) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);'); } catch (_) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);'); } catch (_) {}

  // Backfill existing categories: initialize woo_id from id if missing and source is unset
  try {
    db.exec(`
      UPDATE categories 
      SET woo_id = id 
      WHERE woo_id IS NULL AND source = 'woocommerce';
      
      UPDATE categories 
      SET parent_id = parent 
      WHERE parent_id = 0 AND parent > 0;

      UPDATE categories
      SET product_count = count
      WHERE product_count = 0 AND count > 0;

      UPDATE categories
      SET image_url = image
      WHERE (image_url IS NULL OR image_url = '') AND image IS NOT NULL AND image != '';
    `);
  } catch (_) {}

  const now = new Date().toISOString();

  // 2. Seed Super Admin User if none exists or update password to 12345678
  const superAdmin = db.get<{ password_hash: string }>('SELECT * FROM users WHERE email = ?', ['admin@irepair-mobiles.co.uk']);
  const passwordHash = await bcrypt.hash('12345678', 10);
  if (!superAdmin) {
    db.run(
      `INSERT INTO users (id, email, password_hash, role, must_change_password, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['usr_superadmin_01', 'admin@irepair-mobiles.co.uk', passwordHash, 'super_admin', 0, 1, now, now]
    );

    db.run(
      `INSERT INTO activity_logs (id, user_email, action, details_json, ip, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['log_init_01', 'system', 'INITIALIZE_SUPER_ADMIN', JSON.stringify({ note: 'Super admin seeded' }), '127.0.0.1', now]
    );
  } else {
    // Keep password updated to 12345678
    db.run(
      `UPDATE users SET password_hash = ?, must_change_password = 0, is_active = 1, updated_at = ? WHERE email = ?`,
      [passwordHash, now, 'admin@irepair-mobiles.co.uk']
    );
  }

  // 3. Seed WooCommerce Integration with Encrypted Secrets
  const existingWoo = db.get('SELECT * FROM integrations WHERE name = ?', ['woocommerce']);
  if (!existingWoo) {
    const encryptedKey = encrypt('ck_ecb1d1380225b6f4775c5e0e8222f77178abe71d');
    const encryptedSecret = encrypt('cs_7dd127f2db5a2a215dd024fe3f9b618b9e5e3e2b');
    const wooConfig = {
      storeUrl: 'https://irepair-mobiles.co.uk',
      consumerKeyEncrypted: encryptedKey,
      consumerSecretEncrypted: encryptedSecret,
      apiVersion: 'wc/v3',
      cacheDurationSeconds: 300,
      brandTaxonomy: 'pa_brand',
      conditionTaxonomy: 'pa_condition',
      autoSync: true,
      lastTestedAt: now,
      lastTestStatus: 'success',
    };
    db.run(
      `INSERT INTO integrations (id, name, config_json, updated_at) VALUES (?, ?, ?, ?)`,
      ['int_woo_01', 'woocommerce', JSON.stringify(wooConfig), now]
    );
  }

  // 4. Seed Collections: FAQs
  const faqCount = db.get<{ count: number }>('SELECT count(*) as count FROM collections_faqs');
  if (!faqCount || faqCount.count === 0) {
    const initialFaqs = [
      {
        q: 'How does the iRepair Phone Buyback & Trade-In service work?',
        a: 'Visit our dedicated sell page at /sell-my-phone/ or partner buyback portal at webuyyourtech.co.uk to select your phone brand, model, storage, and condition for an instant guaranteed valuation with a 14-day price lock. You can also walk into any of our 8 UK high street branches for an instant in-person evaluation and walk out with cash in 15 minutes, or post your phone with a free prepaid Royal Mail tracked pack.',
        cat: 'trade-in',
      },
      {
        q: 'Do you buy damaged, cracked, or broken phones?',
        a: 'Yes! We buy mobile phones in all conditions, including cracked screens, shattered back glass, degraded batteries, and non-working devices. On our sell portal or in store, our technicians provide competitive offers even for broken devices.',
        cat: 'trade-in',
      },
      {
        q: 'How quickly do I get paid for selling my phone?',
        a: 'If you visit any of our 8 UK stores (Basingstoke, Norwich, Eastbourne, Reading, Ipswich, Solihull, Newcastle, Southend), you will receive cash or an instant bank transfer in under 15 minutes after our technician performs a quick 5-minute diagnostic. For mail-in trade-ins, payments are issued on the very same day your parcel arrives at our lab.',
        cat: 'trade-in',
      },
      {
        q: 'What happens to my personal data on my sold phone?',
        a: 'Your privacy is our priority. Every device received undergoes certified military-grade data erasure complying with UK GDPR and DoD 5220.22-M data sanitization standards. All accounts, photos, and personal information are permanently destroyed before recycling or refurbishment.',
        cat: 'security',
      },
      {
        q: 'How long do repairs usually take at iRepair Mobiles?',
        a: 'Most standard repairs such as screen replacements, battery swaps, and charging port fixes are completed within 20 to 30 minutes. You are welcome to wait in our comfortable reception or browse the nearby shopping high street while our technicians complete the repair.',
        cat: 'repairs',
      },
      {
        q: 'Do your repairs come with a warranty guarantee?',
        a: 'Yes! All device repairs come with our comprehensive 6-Month Warranty covering both parts and labour. All refurbished phones and laptops purchased from our shop come with a full 12-Month Hardware Guarantee.',
        cat: 'warranty',
      },
      {
        q: 'What is your "No Fix, No Fee" policy?',
        a: 'If our technicians inspect your device and determine that it cannot be restored or repaired, you will not be charged for the attempted repair. We believe in 100% honesty and transparency.',
        cat: 'repairs',
      },
      {
        q: 'Will I lose my photos, contacts, and personal data during the repair?',
        a: 'For standard hardware repairs like screen, battery, and camera replacements, your personal data remains completely safe and untouched. However, we always recommend having an iCloud or Google backup where possible for peace of mind.',
        cat: 'repairs',
      },
      {
        q: 'How does the Free Mail-in postal repair work?',
        a: 'When you book a Mail-in repair online, we instantly email you a prepaid, tracked Royal Mail Special Delivery label. Simply pack your device securely, drop it off at any Post Office, and our central lab repairs and posts it back to you via tracked next-day courier with zero return shipping fee.',
        cat: 'repairs',
      },
      {
        q: 'Do you use original high-grade parts?',
        a: 'We exclusively source OEM-specification parts, genuine extracted original parts, and premium certified components that meet or exceed Apple, Samsung, and Google technical standards for color accuracy, touch latency, and battery longevity.',
        cat: 'parts',
      },
    ];

    initialFaqs.forEach((f, idx) => {
      db.run(
        `INSERT INTO collections_faqs (id, question, answer, category, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [`faq_${idx + 1}`, f.q, f.a, f.cat, idx]
      );
    });
  }

  // 5. Seed Collections: Reviews
  const revCount = db.get<{ count: number }>('SELECT count(*) as count FROM collections_reviews');
  if (!revCount || revCount.count === 0) {
    const initialReviews = [
      {
        author: 'James W.',
        rating: 5,
        review_text: 'Had my iPhone 14 Pro screen replaced in Reading while I went to grab a coffee. Took literally 25 minutes! Screen quality is indistinguishable from original Apple OLED and came with a 6 month warranty. First class service.',
        location: 'Reading Broad St Store',
        date: '2 days ago',
        device_repaired: 'iPhone 14 Pro Screen Replacement',
        verified: 1,
      },
      {
        author: 'Emma Henderson',
        rating: 5,
        review_text: 'My Samsung Galaxy S23 battery wouldn’t hold charge for more than 3 hours. The technician at Newcastle replaced it immediately and cleaned the charging port for free. Saved me having to buy a new phone!',
        location: 'Newcastle Store',
        date: '1 week ago',
        device_repaired: 'Samsung S23 Battery Replacement',
        verified: 1,
      },
      {
        author: 'Dr. Michael Taylor',
        rating: 5,
        review_text: 'Dropped my MacBook with important clinical research files into a pool of water. Apple Genius Bar quoted £900+ to replace everything. iRepair Mobiles cleaned the board in their ultrasonic tank and recovered 100% of my data for under £100. Miraculous.',
        location: 'Southend High St Store',
        date: '2 weeks ago',
        device_repaired: 'MacBook Ultrasonic Clean & Data Recovery',
        verified: 1,
      },
      {
        author: 'Chloe P.',
        rating: 5,
        review_text: 'Bought a pristine refurbished iPhone 13 from their website. It arrived next morning in sealed eco-packaging with a 1-year warranty and looks 100% brand new. Will never buy new again!',
        location: 'Norwich Store',
        date: '3 weeks ago',
        device_repaired: 'Refurbished iPhone 13 Purchase',
        verified: 1,
      },
      {
        author: 'Liam Davies',
        rating: 5,
        review_text: 'Shattered the rear glass and housing on my Google Pixel 8 Pro. iRepair Mobiles had the genuine obsidian rear panel in stock. Picked it up 45 minutes later looking mint. Friendly team and fair pricing.',
        location: 'Cardiff Queen St Store',
        date: '4 days ago',
        device_repaired: 'Google Pixel 8 Pro Glass Replacement',
        verified: 1,
      },
      {
        author: 'Sophie Alston',
        rating: 5,
        review_text: 'My toddler dropped my iPad Pro onto hard ceramic tiles. Display had multi-color lines all over. iRepair fixed it the same afternoon and the Apple Pencil works like brand new with zero latency.',
        location: 'Bristol Cabot Circus Store',
        date: '5 days ago',
        device_repaired: 'iPad Pro 11 Screen & Digitizer',
        verified: 1,
      },
      {
        author: 'Marcus Thorne',
        rating: 5,
        review_text: 'Fast charging stopped working on my OnePlus 11 due to pocket lint and bent connector pins. Tech cleaned and replaced the flex cable in 20 minutes. Top notch diagnostics and transparent quotes.',
        location: 'Oxford Cornmarket Store',
        date: '1 week ago',
        device_repaired: 'OnePlus 11 Fast Charging Port Repair',
        verified: 1,
      },
      {
        author: 'Priya Patel',
        rating: 5,
        review_text: 'Fixed the cracked camera lens and ceramic shield front glass on my iPhone 15 Pro Max. Stunning repair job, original OLED colors, TrueTone retained and factory-grade seal replaced.',
        location: 'London Westfield Store',
        date: '2 weeks ago',
        device_repaired: 'iPhone 15 Pro Max Screen & Camera Lens',
        verified: 1,
      },
      {
        author: 'Oliver Jenkins',
        rating: 5,
        review_text: 'Samsung Galaxy Z Flip 5 hinge was jammed after a drop. Official hinge alignment and ultra-thin glass protector replaced. Flawless smooth opening mechanism now. Superb warranty support.',
        location: 'Brighton Western Rd Store',
        date: '3 weeks ago',
        device_repaired: 'Samsung Galaxy Z Flip 5 Hinge Repair',
        verified: 1,
      },
      {
        author: 'Hannah Wright',
        rating: 5,
        review_text: 'Spilled tea over my MacBook Air M2 keyboard right before my university dissertation deadline. They decontaminated the logic board within 24 hours with zero data loss. Absolute lifesavers!',
        location: 'Edinburgh Princes St Store',
        date: '1 month ago',
        device_repaired: 'MacBook Air M2 Liquid Damage Repair',
        verified: 1,
      },
    ];

    initialReviews.forEach((r, idx) => {
      db.run(
        `INSERT INTO collections_reviews (id, author, rating, review_text, location, date, device_repaired, verified, source, approved, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Google Reviews', 1, ?)`,
        [`rev_${idx + 1}`, r.author, r.rating, r.review_text, r.location, r.date, r.device_repaired, r.verified, idx]
      );
    });
  }

  // 6. Seed Collections: Stores
  const stores = [
    {
      id: 'basingstoke',
      storeName: 'iRepair Basingstoke',
      streetAddress: '14 Old Basing Mall',
      city: 'Basingstoke',
      postcode: 'RG21 7AW',
      phone: '+447733304047',
      email: 'info@irepair-mobiles.co.uk',
      mapUrl: 'https://maps.app.goo.gl/kwgBgcgxCGsiy6zD9',
      latitude: 51.2667919,
      longitude: -1.0877917,
      workingHours: {
        Monday: '8:30 AM–7:30 PM',
        Tuesday: '8:30 AM–7:30 PM',
        Wednesday: '8:30 AM–7:30 PM',
        Thursday: '8:30 AM–7:30 PM',
        Friday: '8:30 AM–7:30 PM',
        Saturday: '8:30 AM–7:30 PM',
        Sunday: '9:30 AM–6:30 PM',
      },
      openingHours: {
        weekdays: '8:30 AM–7:30 PM',
        saturday: '8:30 AM–7:30 PM',
        sunday: '9:30 AM–6:30 PM',
      },
      features: ['30-Min Express Repair', 'Walk-in Welcome', 'Screen & Battery Stocked', 'Free Diagnostics'],
      isExpress: 1,
    },
    {
      id: 'norwich',
      storeName: 'iRepair Norwich',
      streetAddress: "25 Gentleman's Walk",
      city: 'Norwich',
      postcode: 'NR2 1NA',
      phone: '+447833203220',
      email: 'info@irepair-mobiles.co.uk',
      mapUrl: 'https://maps.app.goo.gl/M6Q7BXn78EbYKwgb9',
      latitude: 52.6281697,
      longitude: 1.2909314,
      workingHours: {
        Monday: '8:30 AM–6:30 PM',
        Tuesday: '8:30 AM–6:30 PM',
        Wednesday: '8:30 AM–6:30 PM',
        Thursday: '8:30 AM–6:30 PM',
        Friday: '8:30 AM–6:30 PM',
        Saturday: '8:30 AM–6:30 PM',
        Sunday: '9:30 AM–5:30 PM',
      },
      openingHours: {
        weekdays: '8:30 AM–6:30 PM',
        saturday: '8:30 AM–6:30 PM',
        sunday: '9:30 AM–5:30 PM',
      },
      features: ['City Centre Location', 'MacBook Liquid Damage', 'Walk-in & Mail-in Hub'],
      isExpress: 1,
    },
    {
      id: 'eastbourne',
      storeName: 'iRepair Eastbourne',
      streetAddress: '71-73 Terminus Road',
      city: 'Eastbourne',
      postcode: 'BN21 3NJ',
      phone: '+447776590246',
      email: 'info@irepair-mobiles.co.uk',
      mapUrl: 'https://maps.app.goo.gl/VWeQrmh9mk1CA49e7',
      latitude: 50.7686497,
      longitude: 0.2818796,
      workingHours: {
        Monday: '8:30 AM–7:30 PM',
        Tuesday: '8:30 AM–7:30 PM',
        Wednesday: '8:30 AM–7:30 PM',
        Thursday: '8:30 AM–7:30 PM',
        Friday: '8:30 AM–7:30 PM',
        Saturday: '8:30 AM–7:30 PM',
        Sunday: '9:30 AM–5:30 PM',
      },
      openingHours: {
        weekdays: '8:30 AM–7:30 PM',
        saturday: '8:30 AM–7:30 PM',
        sunday: '9:30 AM–5:30 PM',
      },
      features: ['Elderly Tech Support', 'Express Battery Swaps', 'Genuine Grade Parts'],
      isExpress: 0,
    },
    {
      id: 'reading',
      storeName: 'iRepair Reading Outlet',
      streetAddress: '49 Broad Street',
      city: 'Reading',
      postcode: 'RG1 2AA',
      phone: '+447922446999',
      email: 'info@irepair-mobiles.co.uk',
      mapUrl: 'https://maps.app.goo.gl/hG6UXWUJVhHmXA5JA',
      latitude: 51.4557574,
      longitude: -0.9759248,
      workingHours: {
        Monday: '8:00 AM–7:45 PM',
        Tuesday: '8:00 AM–7:45 PM',
        Wednesday: '8:00 AM–7:45 PM',
        Thursday: '8:00 AM–7:45 PM',
        Friday: '8:00 AM–7:45 PM',
        Saturday: '8:00 AM–7:45 PM',
        Sunday: '9:30 AM–6:30 PM',
      },
      openingHours: {
        weekdays: '8:00 AM–7:45 PM',
        saturday: '8:00 AM–7:45 PM',
        sunday: '9:30 AM–6:30 PM',
      },
      features: ['30-Min Express Repair', 'Walk-in Welcome', 'Screen & Battery Stocked', 'Free Diagnostics'],
      isExpress: 1,
    },
    {
      id: 'ipswich',
      storeName: 'iRepair Ipswich',
      streetAddress: '26 Tavern Street',
      city: 'Ipswich',
      postcode: 'IP1 3AS',
      phone: '+447777347524',
      email: 'info@irepair-mobiles.co.uk',
      mapUrl: 'https://maps.app.goo.gl/g8ny12aMXReqEUiK7',
      latitude: 52.057673,
      longitude: 1.1520108,
      workingHours: {
        Monday: '9:00 AM–7:00 PM',
        Tuesday: '9:00 AM–7:00 PM',
        Wednesday: '9:00 AM–7:00 PM',
        Thursday: '9:00 AM–7:00 PM',
        Friday: '9:00 AM–7:00 PM',
        Saturday: '9:00 AM–7:00 PM',
        Sunday: '10:00 AM–5:00 PM',
      },
      openingHours: {
        weekdays: '9:00 AM–7:00 PM',
        saturday: '9:00 AM–7:00 PM',
        sunday: '10:00 AM–5:00 PM',
      },
      features: ['Fast Screen Repairs', 'Refurbished Device Showcase', 'Free Phone Health Check'],
      isExpress: 0,
    },
    {
      id: 'solihull',
      storeName: 'iRepair Solihull',
      streetAddress: '61 High Street',
      city: 'Solihull',
      postcode: 'B91 3SW',
      phone: '+441217042695',
      email: 'info@irepair-mobiles.co.uk',
      mapUrl: 'https://maps.app.goo.gl/jabBhukACEBKP4qV9',
      latitude: 52.4132419,
      longitude: -1.7805997,
      workingHours: {
        Monday: '9:00 AM–6:30 PM',
        Tuesday: '9:00 AM–6:30 PM',
        Wednesday: '9:00 AM–6:30 PM',
        Thursday: '9:00 AM–6:30 PM',
        Friday: '9:00 AM–6:30 PM',
        Saturday: '9:00 AM–6:30 PM',
        Sunday: '9:30 AM–5:30 PM',
      },
      openingHours: {
        weekdays: '9:00 AM–6:30 PM',
        saturday: '9:00 AM–6:30 PM',
        sunday: '9:30 AM–5:30 PM',
      },
      features: ['High Street Hub', 'While-You-Shop Repairs', 'Official Warranty'],
      isExpress: 1,
    },
    {
      id: 'newcastle',
      storeName: 'iRepair Newcastle',
      streetAddress: '1A Northumberland Street',
      city: 'Newcastle',
      postcode: 'NE1 7DA',
      phone: '+447497675123',
      email: 'info@irepair-mobiles.co.uk',
      mapUrl: 'https://maps.app.goo.gl/YfqorZgUBPEjLpLi6',
      latitude: 54.9743629,
      longitude: -1.6216719,
      workingHours: {
        Monday: '8:30 AM–6:00 PM',
        Tuesday: '8:30 AM–6:00 PM',
        Wednesday: '8:30 AM–6:00 PM',
        Thursday: '8:30 AM–6:00 PM',
        Friday: '8:30 AM–6:00 PM',
        Saturday: '8:30 AM–6:00 PM',
        Sunday: '10:00 AM–4:00 PM',
      },
      openingHours: {
        weekdays: '8:30 AM–6:00 PM',
        saturday: '8:30 AM–6:00 PM',
        sunday: '10:00 AM–4:00 PM',
      },
      features: ['Northumberland Street Flagship', 'Walk-in Bench Repairs', 'OEM Parts Guaranteed'],
      isExpress: 1,
    },
    {
      id: 'southend',
      storeName: 'iRepair Southend',
      streetAddress: '150 High Street',
      city: 'Southend On Sea',
      postcode: 'SS1 1JX',
      phone: '+447471485846',
      email: 'info@irepair-mobiles.co.uk',
      mapUrl: 'https://maps.app.goo.gl/F67nZpBmL82umWWc9',
      latitude: 51.5393684,
      longitude: 0.7101131,
      workingHours: {
        Monday: '8:30 AM–7:00 PM',
        Tuesday: '8:30 AM–7:00 PM',
        Wednesday: '8:30 AM–7:00 PM',
        Thursday: '8:30 AM–7:00 PM',
        Friday: '8:30 AM–7:00 PM',
        Saturday: '8:30 AM–7:00 PM',
        Sunday: '9:30 AM–5:30 PM',
      },
      openingHours: {
        weekdays: '8:30 AM–7:00 PM',
        saturday: '8:30 AM–7:00 PM',
        sunday: '9:30 AM–5:30 PM',
      },
      features: ['Water Damage Clean Lab', 'iPad Screen Specialists', 'Trade-in Counter'],
      isExpress: 1,
    },
  ];

  // Remove all existing store location entries and populate with the updated 8 stores
  db.run('DELETE FROM collections_stores');
  stores.forEach((s, idx) => {
    db.run(
      `INSERT INTO collections_stores (id, city, name, address, postcode, phone, email, opening_hours_json, features_json, is_express_hub, map_link, latitude, longitude, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.id,
        s.city,
        s.storeName,
        s.streetAddress,
        s.postcode,
        s.phone,
        s.email,
        JSON.stringify({ ...s.openingHours, workingHours: s.workingHours }),
        JSON.stringify(s.features),
        s.isExpress,
        s.mapUrl,
        s.latitude,
        s.longitude,
        idx,
      ]
    );
  });

  // 7. Seed Collections: Repair Items
  const repCount = db.get<{ count: number }>('SELECT count(*) as count FROM collections_repair_items');
  if (!repCount || repCount.count === 0) {
    const repairs = [
      {
        id: 'screen',
        name: 'Cracked Screen / OLED Replacement',
        description: 'Fix cracked glass, flickering display, lines on screen or unresponsive touch with premium OEM-grade display.',
        price: 59,
        duration: 30,
        icon: 'Smartphone',
        popular: 1,
      },
      {
        id: 'battery',
        name: 'Battery Replacement & Health Restore',
        description: 'Resolve rapid battery draining, random shutdowns, sluggish performance, or swelling battery with 100% health cell.',
        price: 39,
        duration: 25,
        icon: 'BatteryCharging',
        popular: 1,
      },
      {
        id: 'charging-port',
        name: 'Charging Port / USB-C / Lightning Repair',
        description: 'Fix loose cables, slow charging, dust blockage, or intermittent connections.',
        price: 45,
        duration: 30,
        icon: 'Zap',
        popular: 1,
      },
      {
        id: 'water-damage',
        name: 'Liquid & Water Damage Chemical Ultrasound Clean',
        description: 'Deep ultrasonic PCB bath, corrosion removal, short-circuit diagnosis, and component resuscitation.',
        price: 49,
        duration: 120,
        icon: 'Droplets',
        popular: 1,
      },
      {
        id: 'back-glass',
        name: 'Rear Back Glass Laser Housing Repair',
        description: 'Precision laser removal of cracked back glass for iPhone and Samsung without opening internal seals.',
        price: 49,
        duration: 45,
        icon: 'ShieldAlert',
        popular: 0,
      },
      {
        id: 'camera',
        name: 'Camera Lens & Sensor Replacement',
        description: 'Fix blurry images, cracked camera glass, camera black screen, or shaking autofocus stabilization.',
        price: 45,
        duration: 30,
        icon: 'Camera',
        popular: 0,
      },
      {
        id: 'speaker-mic',
        name: 'Earpiece Speaker & Microphone Repair',
        description: 'Fix muffled callers, silent speakers, crackling sound, or voice not heard during phone calls.',
        price: 39,
        duration: 30,
        icon: 'Volume2',
        popular: 0,
      },
      {
        id: 'motherboard',
        name: 'Logic Board Micro-Soldering & Diagnostics',
        description: 'No power, boot loop, audio IC, Baseband IC, or chip-level motherboard failure diagnosed by specialist engineers.',
        price: 79,
        duration: 180,
        icon: 'Cpu',
        popular: 0,
      },
      {
        id: 'data-recovery',
        name: 'Emergency Data Recovery & Software Restore',
        description: 'Recover photos, WhatsApp chats, contacts from dead, water-damaged, or password-locked devices.',
        price: 59,
        duration: 90,
        icon: 'Database',
        popular: 0,
      },
    ];

    repairs.forEach((r, idx) => {
      db.run(
        `INSERT INTO collections_repair_items (id, name, description, base_price, duration_minutes, icon_name, popular, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.name, r.description, r.price, r.duration, r.icon, r.popular, idx]
      );
    });
  }

  // 8. Seed Collections: Process Steps
  const stepCount = db.get<{ count: number }>('SELECT count(*) as count FROM collections_steps');
  if (!stepCount || stepCount.count === 0) {
    const steps = [
      {
        step: 1,
        title: 'Select Device & Fault',
        description: 'Choose your phone, laptop, or tablet and select the issue to view transparent upfront pricing with zero hidden fees.',
        icon: 'Smartphone',
      },
      {
        step: 2,
        title: 'Walk-In or Free Mail-In',
        description: 'Visit any of our 8 UK high street branches for while-you-wait repairs or use our prepaid tracked Royal Mail postal service.',
        icon: 'MapPin',
      },
      {
        step: 3,
        title: '30-Minute Precision Fix',
        description: 'Our certified master technicians diagnose and restore your device using OEM-grade components in sterile clean labs.',
        icon: 'Clock',
      },
      {
        step: 4,
        title: '6-Month Warranty & Return',
        description: 'Collect in-store or receive tracked courier delivery back to your door, backed by our comprehensive 6-Month Guarantee.',
        icon: 'ShieldCheck',
      },
    ];

    steps.forEach((s, idx) => {
      db.run(
        `INSERT INTO collections_steps (id, step_number, title, description, icon_name, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [`step_${s.step}`, s.step, s.title, s.description, s.icon, idx]
      );
    });
  }

  // 9. Seed Site Settings
  const existingSettings = db.get('SELECT * FROM site_settings WHERE key = ?', ['general']);
  if (!existingSettings) {
    const generalSettings = {
      siteName: 'iRepair Mobiles UK',
      tagline: 'Express Repairs & Refurbished Store',
      logoUrl: '/src/assets/images/irepair-logo.svg',
      logoWhiteUrl: '/src/assets/images/irepair-logo-white.svg',
      phone: '+44 7922 446999',
      email: 'info@irepair-mobiles.co.uk',
      whatsapp: '+44 7922 446999',
      address: '49 Broad Street, Reading, RG1 2AA, United Kingdom',
      announcementBarText: '🎉 Spring Sale: 10% Off All Screen Replacements with code SPRING10 | Free UK Next-Day Delivery on Refurbished Tech over £150',
      socialLinks: {
        facebook: 'https://facebook.com/irepairmobilesuk',
        instagram: 'https://instagram.com/irepairmobilesuk',
        twitter: 'https://twitter.com/irepairmobiles',
        tiktok: 'https://tiktok.com/@irepairmobiles',
        googleReview: 'https://maps.google.com/?cid=irepair-mobiles-uk',
      },
      googleAnalyticsId: '',
      headerScripts: '',
      footerScripts: '',
    };
    db.run(
      `INSERT INTO site_settings (id, key, value_json, updated_at) VALUES (?, ?, ?, ?)`,
      ['set_gen_01', 'general', JSON.stringify(generalSettings), now]
    );
  }

  // Seed SMTP Settings if not exists
  const existingSmtp = db.get('SELECT * FROM site_settings WHERE key = ?', ['smtp']);
  if (!existingSmtp) {
    const smtpSettings = {
      host: '',
      port: 587,
      secure: false,
      user: '',
      pass: '',
      fromEmail: 'info@irepair-mobiles.co.uk',
      fromName: 'iRepair Mobiles UK',
      enabled: false,
    };
    db.run(
      `INSERT INTO site_settings (id, key, value_json, updated_at) VALUES (?, ?, ?, ?)`,
      ['set_smtp_01', 'smtp', JSON.stringify(smtpSettings), now]
    );
  }

  // ACF Custom Fields Mapping Default Seed
  const existingAcfMapping = db.get('SELECT * FROM site_settings WHERE key = ?', ['acf_custom_fields_mapping']);
  if (!existingAcfMapping) {
    const defaultAcfMapping = [
      { role: 'delivery', label: 'Delivery text', metaKey: 'delivery_text', type: 'text', enabled: true },
      { role: 'warranty', label: 'Warranty Text', metaKey: 'warranty_text', type: 'text', enabled: true },
      { role: 'returns', label: 'Returns', metaKey: 'returns_', type: 'text', enabled: true },
      { role: 'technical_details', label: 'Technical Details', metaKey: 'technical_details', type: 'html', enabled: true },
    ];
    db.run(
      `INSERT INTO site_settings (id, key, value_json, updated_at) VALUES (?, ?, ?, ?)`,
      ['set_acf_mapping_01', 'acf_custom_fields_mapping', JSON.stringify(defaultAcfMapping), now]
    );
  }

  // Product Page Trust Badges Settings Default Seed
  const existingTrustBadges = db.get('SELECT * FROM site_settings WHERE key = ?', ['product_trust_badges_settings']);
  if (!existingTrustBadges) {
    const defaultTrustBadges = {
      enabled: true,
      items: {
        delivery: { id: 'delivery', label: 'Delivery', icon: 'truck', fallbackText: '', enabled: true },
        warranty: { id: 'warranty', label: 'Warranty', icon: 'shield', fallbackText: '', enabled: true },
        returns: { id: 'returns', label: 'Returns', icon: 'rotate-ccw', fallbackText: '', enabled: true },
      },
    };
    db.run(
      `INSERT INTO site_settings (id, key, value_json, updated_at) VALUES (?, ?, ?, ?)`,
      ['set_trust_badges_01', 'product_trust_badges_settings', JSON.stringify(defaultTrustBadges), now]
    );
  }

  // 10. Seed Menus
  const existingMenu = db.get('SELECT * FROM menus WHERE location = ?', ['primary']);
  if (!existingMenu) {
    const primaryMenu = [
      { id: 'm1', label: 'Home', url: '/', type: 'internal', target: '_self' },
      { id: 'm2', label: 'Book Repair', url: '/book-repair', type: 'internal', target: '_self' },
      { id: 'm3', label: 'Refurbished Shop', url: '/shop', type: 'internal', target: '_self' },
      { id: 'm4', label: 'Services', url: '/services', type: 'internal', target: '_self' },
      { id: 'm5', label: 'Store Locations', url: '/locations', type: 'internal', target: '_self' },
      { id: 'm6', label: 'Track Repair', url: '/track-repair', type: 'internal', target: '_self' },
      { id: 'm7', label: 'Sell Your Devices', url: '/sell-my-phone/', type: 'internal', target: '_self', badge: 'Trade-in' },
      { id: 'm8', label: 'About', url: '/about', type: 'internal', target: '_self' },
      { id: 'm9', label: 'Contact', url: '/contact', type: 'internal', target: '_self' },
    ];
    db.run(
      `INSERT INTO menus (id, location, title, items_json, updated_at) VALUES (?, ?, ?, ?, ?)`,
      ['mnu_pri_01', 'primary', 'Main Navigation', JSON.stringify(primaryMenu), now]
    );

    const footerMenu = [
      { id: 'f1', label: 'Express iPhone Repair', url: '/services', type: 'internal' },
      { id: 'f2', label: 'Samsung Screen Fix', url: '/services', type: 'internal' },
      { id: 'f3', label: 'MacBook & Laptop Servicing', url: '/services', type: 'internal' },
      { id: 'f4', label: 'iPad Glass Replacement', url: '/services', type: 'internal' },
      { id: 'f5', label: 'Refurbished iPhones', url: '/shop', type: 'internal' },
      { id: 'f6', label: 'Warranty & Guarantee', url: '/warranty', type: 'internal' },
      { id: 'f7', label: 'Terms & Conditions', url: '/terms', type: 'internal' },
      { id: 'f8', label: 'Privacy Policy', url: '/privacy', type: 'internal' },
    ];
    db.run(
      `INSERT INTO menus (id, location, title, items_json, updated_at) VALUES (?, ?, ?, ?, ?)`,
      ['mnu_foo_01', 'footer', 'Footer Links', JSON.stringify(footerMenu), now]
    );
  }

  // 10B. Seed Jobs / Careers Openings
  const jobCount = db.get<{ count: number }>('SELECT count(*) as count FROM jobs');
  if (!jobCount || jobCount.count === 0) {
    const initialJobs = [
      {
        id: 'job_eastbourne_01',
        title: 'Female Sales Associate',
        location: 'Eastbourne, UK',
        vacancies: 2,
        closing_date: '2026-12-31',
        description: `<h3>Role Overview</h3>
<p>iRepair Mobiles is seeking an enthusiastic, customer-focused Female Sales Associate to join our vibrant retail team at our premier Eastbourne high-street store (71-73 Terminus Road, Eastbourne, BN21 3NJ). You will be the welcoming face of our branch, helping customers discover certified refurbished smartphones, premium tech accessories, and guiding them through our express device repair booking process.</p>

<h3>Key Responsibilities</h3>
<ul>
  <li>Welcome walk-in customers warmly, understand their mobile tech needs, and recommend appropriate devices and accessories.</li>
  <li>Assist customers with trade-in valuations, device check-ins for repairs, and collection handovers.</li>
  <li>Maintain pristine visual merchandising standards across device display pods, case racks, and retail counters.</li>
  <li>Process POS transactions, handle cash/card payments, and maintain accurate daily till records.</li>
  <li>Address customer inquiries professionally in-store and via phone/WhatsApp chat.</li>
</ul>

<h3>Requirements & Skills</h3>
<ul>
  <li>Previous retail sales, hospitality, or customer service experience preferred (tech background is a plus, but full training provided!).</li>
  <li>Excellent verbal communication skills with a friendly, patient, and approachable demeanor.</li>
  <li>Strong organizational skills, reliability, and punctuality.</li>
  <li>Passion for modern smartphones (Apple, Samsung, Google) and consumer technology.</li>
  <li>Eligible to work in the United Kingdom.</li>
</ul>

<h3>What We Offer</h3>
<ul>
  <li>Competitive base salary: £24,000 - £28,000 per annum + attractive monthly performance bonuses.</li>
  <li>28 days paid annual leave (including bank holidays).</li>
  <li>Generous employee staff discount on refurbished devices, repairs, and accessories.</li>
  <li>Comprehensive onboarding and certified technical retail training.</li>
  <li>Clear internal promotion pathways to Assistant Store Manager and Store Supervisor.</li>
</ul>`,
        status: 'Active',
        department: 'Retail Sales & Customer Service',
        salary_range: '£24,000 - £28,000 / yr + Bonus',
        employment_type: 'Full-Time',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'job_ilford_02',
        title: 'Senior Mobile Phone & Laptop Repair Technician',
        location: 'Ilford, London, UK',
        vacancies: 2,
        closing_date: '2026-11-30',
        description: `<h3>Role Overview</h3>
<p>We are expanding our central London hardware lab and seeking an experienced Senior Mobile Phone & Laptop Repair Technician to handle express component-level and board-level repairs across smartphones, tablets, and laptops.</p>

<h3>Key Responsibilities</h3>
<ul>
  <li>Perform rapid 20-30 minute screen replacements, battery renewals, and charging port soldering on iPhones, Samsung, and Google Pixel devices.</li>
  <li>Diagnose complex hardware faults, logic board shorts, and liquid damage ultrasonic restorations.</li>
  <li>Service Apple MacBooks and Windows laptops (screen assemblies, SSD upgrades, keyboard replacements, fan servicing).</li>
  <li>Execute 70-point post-repair quality assurance testing and ensure all parts meet OEM specifications.</li>
</ul>

<h3>Requirements & Skills</h3>
<ul>
  <li>Minimum 2+ years practical bench repair experience on mobile devices. Micro-soldering experience is highly advantageous.</li>
  <li>Familiarity with Apple diagnostic tools, thermal imaging, and ultrasonic cleaning equipment.</li>
  <li>Strong attention to detail with high pride in tidy, meticulous workmanship.</li>
</ul>

<h3>What We Offer</h3>
<ul>
  <li>Salary: £28,000 - £36,000 per annum based on bench experience.</li>
  <li>Overtime availability with 1.5x pay rates.</li>
  <li>Modern, fully equipped ESD-safe work benches and state-of-the-art diagnostic equipment.</li>
</ul>`,
        status: 'Active',
        department: 'Hardware Repair & Technical Lab',
        salary_range: '£28,000 - £36,000 / yr',
        employment_type: 'Full-Time',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'job_romford_03',
        title: 'Store Supervisor & Team Lead',
        location: 'Romford, Essex, UK',
        vacancies: 1,
        closing_date: '2026-12-15',
        description: `<h3>Role Overview</h3>
<p>Lead the front-of-house operations and technical service team at our high-footfall Romford store. Ensure exceptional customer satisfaction, smooth repair workflows, and achieve retail targets.</p>

<h3>Key Responsibilities</h3>
<ul>
  <li>Supervise day-to-day store operations, staff rotas, inventory counts, and daily cash reconciliation.</li>
  <li>Motivate retail and technical team members to exceed monthly customer service standards.</li>
  <li>Manage repair ticket queues to guarantee 30-minute turnarounds for express walk-ins.</li>
  <li>Handle customer escalations with diplomacy and care.</li>
</ul>

<h3>Requirements & Skills</h3>
<ul>
  <li>1+ years supervisory experience in retail or mobile telecom sectors (e.g. EE, Vodafone, Currys, O2, CeX, or independent repair shops).</li>
  <li>Strong leadership and interpersonal skills.</li>
</ul>

<h3>What We Offer</h3>
<ul>
  <li>Salary: £27,000 - £32,000 per annum + store profit share bonus.</li>
  <li>Pension contributions, staff discounts, and career growth.</li>
</ul>`,
        status: 'Active',
        department: 'Store Management & Leadership',
        salary_range: '£27,000 - £32,000 / yr',
        employment_type: 'Full-Time',
        created_at: now,
        updated_at: now,
      },
    ];

    for (const job of initialJobs) {
      db.run(
        `INSERT INTO jobs (id, title, location, vacancies, closing_date, description, status, department, salary_range, employment_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [job.id, job.title, job.location, job.vacancies, job.closing_date, job.description, job.status, job.department, job.salary_range, job.employment_type, job.created_at, job.updated_at]
      );
    }
  }

  // 11. Seed Pages with dynamic Section Configurations
  const pageCount = db.get<{ count: number }>('SELECT count(*) as count FROM pages');
  if (!pageCount || pageCount.count === 0) {
    // 11A. Home Page Sections
    const homeSections = [
      {
        id: 'sec_hero_bright_slider_home',
        type: 'hero_bright_slider',
        order: 1,
        visible: true,
        isGlobal: false,
        commonSettings: {
          containerWidth: 'full',
          paddingY: 'none',
        },
        settings: JSON.parse(JSON.stringify(HERO_BRIGHT_SLIDER_DEFAULTS)),
      },
      {
        id: 'sec_hero_slider_home',
        type: 'hero_slider',
        order: 2,
        visible: false,
        isGlobal: false,
        commonSettings: {
          containerWidth: 'full',
          paddingY: 'none',
        },
        settings: {
          autoplaySpeed: 6000,
          globalOverlayColor: '#020617',
          globalOverlayOpacity: 0.45,
          slides: [
            {
              id: 'slide_1',
              heading: 'Beach Day Gone Wrong?',
              title: 'Beach Day Gone Wrong?',
              description: '20% off on all mobile repairs',
              subtitle: '20% off on all mobile repairs',
              ctaText: 'Get a Free Quote!',
              buttonText: 'Get a Free Quote!',
              ctaLink: '/quote',
              buttonLink: '/quote',
              image: 'https://irepair-mobiles.co.uk/wp-content/uploads/2026/09/irepair-covers.webp',
              badge: 'Summer Repair Special · 20% Off All Repairs',
              badgeColor: '#f472b6',
              badgeBg: 'rgba(255, 255, 255, 0.14)',
              badgeBorderColor: 'rgba(244, 114, 182, 0.35)',
              buttonBg: '#DF0C88',
              buttonTextColor: '#ffffff',
              buttonHoverBg: '#C50875',
              overlayColor: '#020617',
              overlayOpacity: 0.45,
              overlayGradient: 'left_fade',
            },
            {
              id: 'slide_2',
              heading: 'Biggest Sale of the Year',
              title: 'Biggest Sale of the Year',
              description: 'Exclusive Black Friday Discounted Offers Now Live In Store',
              subtitle: 'Exclusive Black Friday Discounted Offers Now Live In Store',
              ctaText: 'Get a Free Quote!',
              buttonText: 'Get a Free Quote!',
              ctaLink: '/offers',
              buttonLink: '/offers',
              image: 'https://irepair-mobiles.co.uk/wp-content/uploads/2025/12/dESKTOP-Banner.webp',
              badge: 'Biggest Sale Of The Year · In-Store Exclusives',
              badgeColor: '#fbbf24',
              badgeBg: 'rgba(255, 255, 255, 0.14)',
              badgeBorderColor: 'rgba(251, 191, 36, 0.35)',
              buttonBg: '#DF0C88',
              buttonTextColor: '#ffffff',
              buttonHoverBg: '#C50875',
              overlayColor: '#020617',
              overlayOpacity: 0.45,
              overlayGradient: 'left_fade',
            },
            {
              id: 'slide_3',
              heading: 'Fix it. Shop it. Love it.',
              title: 'Fix it. Shop it. Love it.',
              description: "UK's trusted destination for phone repairs, laptop services, and the latest tech deals.",
              subtitle: "UK's trusted destination for phone repairs, laptop services, and the latest tech deals.",
              ctaText: 'Get a Free Quote!',
              buttonText: 'Get a Free Quote!',
              ctaLink: '/quote',
              buttonLink: '/quote',
              image: 'https://irepair-mobiles.co.uk/wp-content/uploads/2025/10/irepaircover-1.webp',
              badge: "UK's #1 Rated Tech Destination · 6-Month Warranty",
              badgeColor: '#38bdf8',
              badgeBg: 'rgba(255, 255, 255, 0.14)',
              badgeBorderColor: 'rgba(56, 189, 248, 0.35)',
              buttonBg: '#DF0C88',
              buttonTextColor: '#ffffff',
              buttonHoverBg: '#C50875',
              overlayColor: '#020617',
              overlayOpacity: 0.45,
              overlayGradient: 'left_fade',
            },
            {
              id: 'slide_4',
              heading: 'Expert Phone Repairs At Exclusive Discounts',
              title: 'Expert Phone Repairs At Exclusive Discounts',
              description: 'We use high quality & genuine parts, offer same-day repairs, 6-month guarantees & a no-fix-no-fee policy, quality service you can trust.',
              subtitle: 'We use high quality & genuine parts, offer same-day repairs, 6-month guarantees & a no-fix-no-fee policy, quality service you can trust.',
              ctaText: 'Get a Free Quote!',
              buttonText: 'Get a Free Quote!',
              ctaLink: '/repairs',
              buttonLink: '/repairs',
              image: 'https://irepair-mobiles.co.uk/wp-content/uploads/2025/08/irepairbanner.jpg',
              badge: 'Certified Engineers · No Fix, No Fee Guarantee',
              badgeColor: '#4ade80',
              badgeBg: 'rgba(255, 255, 255, 0.14)',
              badgeBorderColor: 'rgba(74, 222, 128, 0.35)',
              buttonBg: '#DF0C88',
              buttonTextColor: '#ffffff',
              buttonHoverBg: '#C50875',
              overlayColor: '#020617',
              overlayOpacity: 0.45,
              overlayGradient: 'left_fade',
            },
            {
              id: 'slide_5',
              heading: 'Accessories That Fit Your Mobile Life',
              title: 'Accessories That Fit Your Mobile Life',
              description: 'Reliable chargers, sturdy cases, and smart add-ons — the perfect extras for your everyday phone use.',
              subtitle: 'Reliable chargers, sturdy cases, and smart add-ons — the perfect extras for your everyday phone use.',
              ctaText: 'Buy Now!',
              buttonText: 'Buy Now!',
              ctaLink: '/accessories',
              buttonLink: '/accessories',
              image: 'https://irepair-mobiles.co.uk/wp-content/uploads/2025/08/irepair-cover.jpg',
              badge: 'Everyday Mobile Essentials · Fast UK Dispatch',
              badgeColor: '#c084fc',
              badgeBg: 'rgba(255, 255, 255, 0.14)',
              badgeBorderColor: 'rgba(192, 132, 252, 0.35)',
              buttonBg: '#DF0C88',
              buttonTextColor: '#ffffff',
              buttonHoverBg: '#C50875',
              overlayColor: '#020617',
              overlayOpacity: 0.45,
              overlayGradient: 'left_fade',
            },
            {
              id: 'slide_6',
              heading: 'Spring into Savings',
              title: 'Spring into Savings',
              description: '20% OFF all Screen Repairs + FREE screen protector this March!',
              subtitle: '20% OFF all Screen Repairs + FREE screen protector this March!',
              ctaText: 'Get a Free Quote!',
              buttonText: 'Get a Free Quote!',
              ctaLink: '/quote',
              buttonLink: '/quote',
              image: 'https://irepair-mobiles.co.uk/wp-content/uploads/2025/03/desktpo-banner.jpg',
              badge: 'Spring Promo · Free Screen Protector Included',
              badgeColor: '#a3e635',
              badgeBg: 'rgba(255, 255, 255, 0.14)',
              badgeBorderColor: 'rgba(163, 230, 53, 0.35)',
              buttonBg: '#DF0C88',
              buttonTextColor: '#ffffff',
              buttonHoverBg: '#C50875',
              overlayColor: '#020617',
              overlayOpacity: 0.45,
              overlayGradient: 'left_fade',
            },
            {
              id: 'slide_7',
              heading: 'Find Your Perfect Case',
              title: 'Find Your Perfect Case',
              description: 'New Arrivals In-Store! Premium Protection & Stylish Designs - Buy Now & Get Discount!',
              subtitle: 'New Arrivals In-Store! Premium Protection & Stylish Designs - Buy Now & Get Discount!',
              ctaText: 'Buy Now!',
              buttonText: 'Buy Now!',
              ctaLink: '/cases',
              buttonLink: '/cases',
              image: 'https://irepair-mobiles.co.uk/wp-content/uploads/2025/02/Feel-the-Love-%E2%80%93-February-Deals-7-scaled.jpg',
              badge: 'New In-Store Arrivals · Impact Drop Protection',
              badgeColor: '#f472b6',
              badgeBg: 'rgba(255, 255, 255, 0.14)',
              badgeBorderColor: 'rgba(244, 114, 182, 0.35)',
              buttonBg: '#DF0C88',
              buttonTextColor: '#ffffff',
              buttonHoverBg: '#C50875',
              overlayColor: '#020617',
              overlayOpacity: 0.45,
              overlayGradient: 'left_fade',
            },
          ],
        },
      },
      {
        id: 'sec_hero_promo_cards_home',
        type: 'hero_promo_cards',
        order: 2,
        visible: true,
        isGlobal: false,
        commonSettings: {
          containerWidth: 'boxed',
          paddingY: 'none',
        },
        settings: {
          columnsDesktop: 3,
          columnsTablet: 2,
          columnsMobile: 1,
          gap: 24,
          borderRadius: 16,
          cardMinHeight: 340,
          overlayOpacity: 0.15,
          accentColor: '#E6007E',
          cards: [
            {
              id: 'card_repair_01',
              heading: 'Express Mobile Repairs',
              subheading: 'Fast, certified fixes with warranty',
              buttonText: 'Get a Free Quote',
              buttonLink: '/quote',
              bgImage: 'https://irepair-mobiles.co.uk/wp-content/uploads/2025/10/Mobile-Repair-Services.webp',
              altText: 'Technician repairing phone on workbench',
              isExternal: false,
            },
            {
              id: 'card_sell_01',
              heading: 'Sell & Get Instant Cash',
              subheading: 'Fair quotes & fast bank payouts',
              buttonText: 'Sell Now',
              buttonLink: '/sell-my-phone/',
              bgImage: 'https://irepair-mobiles.co.uk/wp-content/uploads/2025/10/Sell-Your-Phone.webp',
              altText: 'Store interior with staff and customers',
              isExternal: false,
            },
            {
              id: 'card_upgrade_01',
              heading: 'Shop Phones & Tech',
              subheading: 'New, refurbished & accessories',
              buttonText: 'Shop Now',
              buttonLink: '/shop',
              bgImage: 'https://irepair-mobiles.co.uk/wp-content/uploads/2025/10/Upgrade.webp',
              altText: 'Retail display wall with phone accessories',
              isExternal: false,
            },
          ],
        },
      },
      {
        id: 'sec_category_editorial_rail_01',
        type: 'category_editorial_rail',
        order: 3,
        visible: true,
        isGlobal: false,
        commonSettings: {
          containerWidth: 'full',
          paddingY: 'none',
        },
        settings: CATEGORY_EDITORIAL_RAIL_DEFAULTS,
      },
      {
        id: 'sec_trending_phones_01',
        type: 'trending_products_showcase',
        order: 6,
        visible: true,
        isGlobal: false,
        commonSettings: {
          containerWidth: 'boxed',
          paddingY: 'small',
        },
        settings: {
          enableWidget: true,
          widgetName: 'Trending Phones Carousel',
          eyebrowText: 'NEW & FLAGSHIP RELEASES',
          showEyebrow: true,
          showSectionHeading: true,
          sectionHeading: 'Trending Phones',
          showSubtitle: false,
          subtitle: '',
          headingAlignment: 'left',
          layoutWidth: 'boxed',
          backgroundColor: '#f8fafc',
          sectionPaddingTop: 48,
          sectionPaddingBottom: 48,
          phonesOnly: true,
          onlyNewPhones: true,
          showCategories: true,
          showAllCategory: false,
          allProductsLabel: 'All Phones',
          defaultCategory: 'apple',
          categoryBtnRadius: 'full',
          customCategories: [
            { id: 'apple', label: 'Apple', slug: 'apple' },
            { id: 'samsung', label: 'Samsung', slug: 'samsung' },
            { id: 'google', label: 'Google', slug: 'google' },
          ],
          displayMode: 'carousel',
          visibleDesktop: 5,
          visibleTablet: 4,
          visibleMobile: 2,
          cardGap: 24,
          showArrows: true,
          showDots: false,
          arrowShape: 'circle',
          arrowBgColor: '#ffffff',
          arrowIconColor: '#0f172a',
          inStockOnly: true,
          maxProductsLimit: 24,
          cardBgColor: '#ffffff',
          cardBorderRadius: '2xl',
          cardBorderColor: '#e2e8f0',
          cardBorderWidth: 1,
          cardPadding: 20,
          cardShadow: 'sm',
          cardHoverLift: true,
          imageAreaHeight: 190,
          imageFit: 'contain',
          imageHoverZoom: true,
          headingColor: '#0B0D12',
          headingFontWeight: 'extrabold',
          arrowPosition: 'top_right',
          productTitleFontSize: 14,
          productTitleColor: '#0f172a',
          productTitleLines: 2,
          showPrices: true,
          showRegularPrice: true,
          priceColor: '#0f172a',
          currencySymbol: '£',
          showDiscountBadge: true,
          discountBadgeText: 'New',
          discountBadgeBg: '#10b981',
          discountBadgeColor: '#ffffff',
          showCtaButton: true,
          ctaButtonText: 'Select options',
          ctaAction: 'view_product',
          ctaButtonBg: '#0f172a',
          ctaButtonTextCol: '#ffffff',
          ctaButtonRadius: 'full',
        },
      },
      {
        id: 'sec_repairs_01',
        type: 'common_repairs',
        order: 7,
        visible: true,
        isGlobal: false,
        settings: {
          title: 'Common Repairs We Fix Daily',
          subtitle: 'Professional component-level repairs using state-of-the-art diagnostic machinery',
          limit: 6,
          showPricing: true,
        },
      },
      {
        id: 'sec_refurbished_iphones_slider_02',
        type: 'trending_products_showcase',
        order: 8,
        visible: true,
        isGlobal: false,
        commonSettings: {
          containerWidth: 'boxed',
          paddingY: 'small',
        },
        settings: {
          enableWidget: true,
          widgetName: 'Affordable Refurbished iPhone Slider',
          eyebrowText: 'CERTIFIED REFURBISHED & TESTED',
          showEyebrow: true,
          showSectionHeading: true,
          sectionHeading: 'Affordable Refurbished iPhone',
          showSubtitle: true,
          subtitle: 'Elevate your style and functionality with essentials that complement your lifestyle seamlessly',
          headingAlignment: 'left',
          layoutWidth: 'boxed',
          backgroundColor: '#ffffff',
          sectionPaddingTop: 48,
          sectionPaddingBottom: 56,
          phonesOnly: true,
          refurbishedOnly: true,
          brandFilter: 'apple',
          showCategories: false,
          showAllCategory: false,
          displayMode: 'carousel',
          visibleDesktop: 5,
          visibleTablet: 4,
          visibleMobile: 2,
          cardGap: 24,
          showArrows: true,
          showDots: false,
          arrowShape: 'circle',
          arrowBgColor: '#ffffff',
          arrowIconColor: '#0f172a',
          sortBy: 'price_asc',
          inStockOnly: true,
          maxProductsLimit: 24,
          cardBgColor: '#ffffff',
          cardBorderRadius: '2xl',
          cardBorderColor: '#e2e8f0',
          cardBorderWidth: 1,
          cardPadding: 20,
          cardShadow: 'sm',
          cardHoverLift: true,
          imageAreaHeight: 190,
          imageFit: 'contain',
          imageHoverZoom: true,
          headingColor: '#0B0D12',
          headingFontWeight: 'extrabold',
          arrowPosition: 'top_right',
          subtitleFontSize: 14,
          subtitleColor: '#64748b',
          productTitleFontSize: 14,
          productTitleColor: '#0f172a',
          productTitleLines: 2,
          showPrices: true,
          showRegularPrice: true,
          priceColor: '#0f172a',
          currencySymbol: '£',
          showDiscountBadge: true,
          discountBadgeText: 'Save',
          discountBadgeBg: '#ef4444',
          discountBadgeColor: '#ffffff',
          showCtaButton: true,
          ctaButtonText: 'Select options',
          ctaAction: 'view_product',
          ctaButtonBg: '#0f172a',
          ctaButtonTextCol: '#ffffff',
          ctaButtonRadius: 'full',
        },
      },
      {
        id: 'sec_home_process_steps_01',
        type: 'process_steps_modern',
        order: 7,
        visible: true,
        isGlobal: false,
        commonSettings: {
          containerWidth: 'full',
          paddingY: 'none',
        },
        settings: JSON.parse(JSON.stringify(PROCESS_STEPS_MODERN_DEFAULTS)),
      },
      {
        id: 'sec_home_why_choose_us_dark_01',
        type: 'why_choose_us_metrics_dark',
        order: 8,
        visible: true,
        isGlobal: false,
        commonSettings: {
          containerWidth: 'full',
          paddingY: 'none',
        },
        settings: JSON.parse(JSON.stringify(WHY_CHOOSE_US_METRICS_DARK_DEFAULTS)),
      },
      {
        id: 'sec_reviews_01',
        type: 'testimonials',
        order: 9,
        visible: true,
        isGlobal: false,
        settings: {
          title: 'Rated 4.9/5 by 12,000+ UK Customers',
          subtitle: 'Verified Google & Trustpilot feedback from real people across Britain',
          minRating: 5,
          limit: 12,
          autoplay: true,
          speed: 40,
          pauseOnHover: true,
          showArrows: true,
          showDots: true,
        },
      },
      {
        id: 'sec_home_stores_tracker_01',
        type: 'store_locations_with_tracker',
        order: 10,
        visible: true,
        isGlobal: false,
        commonSettings: {
          containerWidth: 'full',
          paddingY: 'none',
        },
        settings: JSON.parse(JSON.stringify(STORE_LOCATIONS_WITH_TRACKER_DEFAULTS)),
      },
      {
        id: 'sec_mobile_brands_marquee_01',
        type: 'mobile_phone_brands_marquee',
        order: 11,
        visible: true,
        isGlobal: false,
        commonSettings: {
          containerWidth: 'boxed',
          paddingY: 'small',
        },
        settings: {
          sectionHeading: 'Popular Brands',
          showSectionHeading: true,
          headingAlignment: 'center',
          backgroundColor: '#ffffff',
          animationSpeed: 38,
          pauseOnHover: true,
          showNavigationArrows: true,
        },
      },
      {
        id: 'sec_home_faq_accordion_01',
        type: 'faq_two_column_accordion',
        order: 12,
        visible: true,
        isGlobal: false,
        commonSettings: {
          containerWidth: 'full',
          paddingY: 'none',
        },
        settings: JSON.parse(JSON.stringify(FAQ_TWO_COLUMN_ACCORDION_DEFAULTS)),
      },
    ];

    db.run(
      `INSERT INTO pages (id, slug, title, status, seo_json, sections_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'page_home_01',
        'home',
        'Home',
        'published',
        JSON.stringify({
          metaTitle: 'iRepair Mobiles UK - Express Repairs & Refurbished Store',
          metaDescription: 'UK specialist express mobile phone, laptop, and tablet repairs. Same-day 30-min fixes, 6-month warranty, and pristine certified refurbished tech.',
          canonicalUrl: 'https://irepair-mobiles.co.uk',
          ogImage: '/src/assets/images/hero_repair_specialist_1790843562093.jpg',
          noindex: false,
        }),
        JSON.stringify(homeSections),
        now,
        now,
      ]
    );

    // 11B. About Page
    const aboutSections = [
      {
        id: 'sec_about_hero',
        type: 'image_text',
        order: 1,
        visible: true,
        isGlobal: false,
        settings: {
          badge: 'About iRepair Mobiles',
          title: 'Britain’s Most Trusted Independent Express Tech Repair Hub',
          description: 'Founded with a mission to eliminate e-waste and deliver honest, lightning-fast repairs at transparent pricing, iRepair Mobiles operates 8 high-street flagships across the UK.',
          image: '/src/assets/images/hero_repair_specialist_1790843562093.jpg',
          imagePosition: 'right',
          buttonText: 'Explore Our Services',
          buttonLink: '/services',
        },
      },
      {
        id: 'sec_about_stats',
        type: 'features_grid',
        order: 2,
        visible: true,
        isGlobal: false,
        settings: {
          items: [
            { icon: 'Award', title: '500,000+ Devices Fixed', text: 'Over a decade of micro-soldering and precision electronic diagnostics.' },
            { icon: 'MapPin', title: '8 UK High Street Stores', text: 'Convenient branches located in major shopping centres and high streets.' },
            { icon: 'ShieldCheck', title: '6-Month Comprehensive Warranty', text: 'Full coverage on every screen, battery, and logic board repair.' },
            { icon: 'RotateCcw', title: 'Zero E-Waste Commitment', text: '100% responsible recycling for stripped copper, lithium, and rare metals.' },
          ],
        },
      },
      {
        id: 'sec_about_reviews',
        type: 'testimonials',
        order: 3,
        visible: true,
        isGlobal: false,
        settings: {
          title: 'What Customers Say About Our Techs',
          subtitle: 'Read genuine reviews from customers who trust iRepair Mobiles everyday',
          limit: 3,
        },
      },
    ];

    db.run(
      `INSERT INTO pages (id, slug, title, status, seo_json, sections_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'page_about_01',
        'about',
        'About Us',
        'published',
        JSON.stringify({
          metaTitle: 'About iRepair Mobiles - Express Device Repairs Across the UK',
          metaDescription: 'Learn about iRepair Mobiles: our history, certified repair laboratories, 8 branch network, and commitment to fast sustainable electronic repairs.',
          canonicalUrl: 'https://irepair-mobiles.co.uk/about',
          noindex: false,
        }),
        JSON.stringify(aboutSections),
        now,
        now,
      ]
    );

    // 11C. Services Page
    const servicesSections = [
      {
        id: 'sec_services_repairs',
        type: 'common_repairs',
        order: 1,
        visible: true,
        isGlobal: false,
        settings: {
          title: 'Our Specialist Electronic Repair Services',
          subtitle: 'Select any hardware issue to view guaranteed pricing and express turnaround duration',
          limit: 12,
          showPricing: true,
        },
      },
      {
        id: 'sec_services_steps',
        type: 'how_it_works',
        order: 2,
        visible: true,
        isGlobal: false,
        settings: {
          title: 'Booking Your Service',
          subtitle: 'Transparent, hassle-free process from diagnostics to completion',
        },
      },
      {
        id: 'sec_services_faqs',
        type: 'faqs',
        order: 3,
        visible: true,
        isGlobal: false,
        settings: {
          title: 'Repair FAQs',
          subtitle: 'Answers to common questions regarding our turnaround times and parts quality',
          categoryFilter: 'repairs',
          outputSchema: true,
        },
      },
    ];

    db.run(
      `INSERT INTO pages (id, slug, title, status, seo_json, sections_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'page_services_01',
        'services',
        'Repair Services',
        'published',
        JSON.stringify({
          metaTitle: 'Device Repair Services - iPhone, Samsung, iPad & MacBook | iRepair Mobiles',
          metaDescription: 'Explore our full list of express repair services: cracked screens, battery replacements, water damage recovery, and micro-soldering.',
          canonicalUrl: 'https://irepair-mobiles.co.uk/services',
          noindex: false,
        }),
        JSON.stringify(servicesSections),
        now,
        now,
      ]
    );

    // 11D. Locations Page
    const locationsSections = [
      {
        id: 'sec_loc_stores',
        type: 'stores_locations',
        order: 1,
        visible: true,
        isGlobal: false,
        settings: {
          title: 'Find Your Nearest iRepair Mobiles Branch',
          subtitle: 'Walk in today for while-you-wait repairs, battery tests, screen protectors, or trade-in cash evaluations',
          limit: 12,
        },
      },
      {
        id: 'sec_loc_cta',
        type: 'cta_banner',
        order: 2,
        visible: true,
        isGlobal: false,
        settings: {
          headline: 'Cannot Visit a High Street Store?',
          subheadline: 'Book our Free Tracked Royal Mail Postal Repair service. We email you a prepaid label and courier your device back in 24-48 hours.',
          primaryButtonText: 'Book Free Mail-In Repair',
          primaryButtonLink: '/book-repair',
          secondaryButtonText: 'Track Active Parcel',
          secondaryButtonLink: '/track-repair',
        },
      },
    ];

    db.run(
      `INSERT INTO pages (id, slug, title, status, seo_json, sections_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'page_loc_01',
        'locations',
        'Store Locations',
        'published',
        JSON.stringify({
          metaTitle: 'iRepair Mobiles Branches - Reading, Newcastle, Norwich, Solihull & More',
          metaDescription: 'Find opening hours, phone numbers, and directions for all 8 iRepair Mobiles high street branches across England.',
          canonicalUrl: 'https://irepair-mobiles.co.uk/locations',
          noindex: false,
        }),
        JSON.stringify(locationsSections),
        now,
        now,
      ]
    );

    // 11E. Track Repair Page
    const trackSections = [
      {
        id: 'sec_track_info',
        type: 'rich_text',
        order: 1,
        visible: true,
        isGlobal: false,
        settings: {
          content: '<h2>Real-Time Live Device Repair Tracking</h2><p>Enter your 6-digit Job Reference Number (found on your intake receipt or confirmation email, e.g. <strong>IRM-78241</strong>) to check the live diagnostic stage, technician notes, and collection status of your device.</p>',
        },
      },
    ];

    db.run(
      `INSERT INTO pages (id, slug, title, status, seo_json, sections_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'page_track_01',
        'track-repair',
        'Track Repair',
        'published',
        JSON.stringify({
          metaTitle: 'Track Repair Status - iRepair Mobiles UK',
          metaDescription: 'Track the live progress of your smartphone, laptop, or tablet repair using your Job ID or Royal Mail tracking number.',
          canonicalUrl: 'https://irepair-mobiles.co.uk/track-repair',
          noindex: false,
        }),
        JSON.stringify(trackSections),
        now,
        now,
      ]
    );

    // 11F. Contact Page
    const contactSections = [
      {
        id: 'sec_contact_form',
        type: 'contact_form',
        order: 1,
        visible: true,
        isGlobal: false,
        settings: {
          title: 'Get In Touch With Our Team',
          subtitle: 'Have a question about a quote, a repair in progress, or buying refurbished tech? Our UK customer support team is here to help 7 days a week.',
          toEmail: 'info@irepair-mobiles.co.uk, repairs@irepair-mobiles.co.uk',
          subject: 'New Website Inquiry - iRepair Mobiles UK',
          submitButtonText: 'Send Message',
          successMessage: 'Thank you! Your message has been received. Our team will contact you shortly.',
          fields: [
            { id: 'f_name', label: 'Your Full Name', name: 'name', type: 'text', placeholder: 'e.g. John Doe', required: true, width: 'half' },
            { id: 'f_email', label: 'Email Address', name: 'email', type: 'email', placeholder: 'e.g. john@example.com', required: true, width: 'half' },
            { id: 'f_phone', label: 'Phone Number', name: 'phone', type: 'tel', placeholder: 'e.g. +44 7900 123456', required: false, width: 'half' },
            { id: 'f_subject', label: 'Inquiry Subject', name: 'subject', type: 'select', placeholder: 'Select inquiry type', required: true, width: 'half', options: ['Repair Inquiry', 'Order / Refurbished Store', 'Sell / Trade-in Inquiry', 'Warranty Claim', 'Corporate / Fleet Repair', 'Other Question'] },
            { id: 'f_message', label: 'Message Details', name: 'message', type: 'textarea', placeholder: 'Describe your device model, fault, or query in detail...', required: true, width: 'full' },
          ],
        },
      },
      {
        id: 'sec_contact_stores',
        type: 'stores_locations',
        order: 2,
        visible: true,
        isGlobal: false,
        settings: {
          title: 'Or Drop Into Your Local Branch',
          subtitle: 'Our technicians can inspect your device on the spot free of charge',
          limit: 8,
        },
      },
    ];

    db.run(
      `INSERT INTO pages (id, slug, title, status, seo_json, sections_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'page_contact_01',
        'contact',
        'Contact Us',
        'published',
        JSON.stringify({
          metaTitle: 'Contact iRepair Mobiles - Phone, Email & High Street Branches',
          metaDescription: 'Contact iRepair Mobiles via phone, email, WhatsApp, or visit any of our UK stores for expert repairs and advice.',
          canonicalUrl: 'https://irepair-mobiles.co.uk/contact',
          noindex: false,
        }),
        JSON.stringify(contactSections),
        now,
        now,
      ]
    );

    // 11G. Shop Page
    const shopSections = [
      {
        id: 'sec_shop_hero',
        type: 'cta_banner',
        order: 1,
        visible: true,
        isGlobal: false,
        settings: {
          headline: 'Certified Refurbished Tech with 12-Month Guarantee',
          subheadline: 'Pristine iPhones, Samsung Galaxy, and Apple MacBooks thoroughly inspected and sanitized. Free UK Next-Day Delivery.',
          primaryButtonText: 'Browse All Deals',
          primaryButtonLink: '#products',
          secondaryButtonText: 'Sell Your Old Phone',
          secondaryButtonLink: '/sell-my-phone/',
        },
      },
      {
        id: 'sec_shop_carousel',
        type: 'product_carousel',
        order: 2,
        visible: true,
        isGlobal: false,
        settings: {
          eyebrowText: 'Certified Refurbished & Tested',
          title: 'Featured Refurbished Smartphones',
          subtitle: 'Top-selling Pristine Grade-A devices backed by our full replacement guarantee',
          pickerMode: 'category',
          categorySlugs: ['smartphones'],
          limit: 8,
          inStockOnly: true,
        },
      },
    ];

    db.run(
      `INSERT INTO pages (id, slug, title, status, seo_json, sections_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'page_shop_01',
        'shop',
        'Refurbished Shop',
        'published',
        JSON.stringify({
          metaTitle: 'Buy Certified Refurbished Phones & Tech UK | iRepair Mobiles',
          metaDescription: 'Shop certified refurbished Apple iPhones, Samsung Galaxy phones, and MacBooks with 12-month guarantee and free delivery.',
          canonicalUrl: 'https://irepair-mobiles.co.uk/shop',
          noindex: false,
        }),
        JSON.stringify(shopSections),
        now,
        now,
      ]
    );

    // 11H. Policy Pages (Warranty, Terms, Privacy)
    const policyPages = [
      {
        slug: 'warranty',
        title: 'Warranty & Guarantee Policy',
        content: `<h2>Comprehensive 6-Month Repair Warranty & 12-Month Refurbished Guarantee</h2><p>At iRepair Mobiles, customer satisfaction and hardware integrity are paramount. Every device repaired at any of our branches or via our postal laboratory is protected by our rigorous 6-Month Warranty covering both replacement components and technician workmanship.</p><h3>What is Covered:</h3><ul><li>Defective LCD or OLED display screens (touch sensitivity failure, touch digitization loss, backlight failure)</li><li>Battery degradation exceeding normal wear or failing to hold charge</li><li>Charging ports, microphones, earpieces, and camera modules fitted by our engineers</li></ul><h3>What is Not Covered:</h3><p>Accidental physical drops, cracked glass after return, liquid ingress after repair, or third-party unauthorized disassembly void the warranty.</p>`,
      },
      {
        slug: 'terms',
        title: 'Terms of Service',
        content: `<h2>Terms & Conditions of Service</h2><p>By engaging iRepair Mobiles for electronic repair, hardware inspection, device purchase, or phone trade-in, you agree to these terms.</p><h3>Diagnostics and No Fix, No Fee</h3><p>Initial diagnostics are free of charge. If our engineers conclude that your device cannot be restored to safe working order, no repair fee will be levied under our "No Fix, No Fee" policy.</p>`,
      },
      {
        slug: 'privacy',
        title: 'Privacy Policy & Data Security',
        content: `<h2>Customer Data Protection & Privacy</h2><p>iRepair Mobiles strictly adheres to the UK Data Protection Act 2018 and UK GDPR regulations. We never copy, transfer, or examine personal files, photos, or data on customer devices unless explicitly authorized for data backup recovery.</p>`,
      },
    ];

    policyPages.forEach((p, idx) => {
      const pSections = [
        {
          id: `sec_${p.slug}_text`,
          type: 'rich_text',
          order: 1,
          visible: true,
          isGlobal: false,
          settings: {
            content: p.content,
          },
        },
      ];

      db.run(
        `INSERT INTO pages (id, slug, title, status, seo_json, sections_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `page_pol_${idx + 1}`,
          p.slug,
          p.title,
          'published',
          JSON.stringify({
            metaTitle: `${p.title} - iRepair Mobiles UK`,
            metaDescription: `Read our official ${p.title.toLowerCase()} covering repairs, refurbished hardware purchases, and customer rights.`,
            canonicalUrl: `https://irepair-mobiles.co.uk/${p.slug}`,
            noindex: false,
          }),
          JSON.stringify(pSections),
          now,
          now,
        ]
      );
    });
  }

  // 11I. Ensure Homepage v2 (/home-2) modular widget page exists idempotently
  const existingHome2Page = db.get<{ id: string }>('SELECT id FROM pages WHERE slug = ?', ['home-2']);
  if (!existingHome2Page) {
    const home2Now = new Date().toISOString();
    db.run(
      `INSERT INTO pages (id, slug, title, status, seo_json, sections_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'page_home_2',
        'home-2',
        'Home 2 (Modular Showcase)',
        'published',
        JSON.stringify({
          metaTitle: 'iRepair Mobiles UK — Express Repairs, Instant Buybacks & Certified Tech',
          metaDescription:
            'Book a 45-minute screen or battery repair, get a guaranteed instant phone buyback quote, or shop Grade-A refurbished devices across 24 UK stores.',
          canonicalUrl: 'https://irepair-mobiles.co.uk/home-2',
          noindex: false,
        }),
        JSON.stringify(HOME2_SEED_SECTIONS),
        home2Now,
        home2Now,
      ]
    );
  }

  // 12. Seed Product Categories with Parent-Child Hierarchy & SEO Permalinks
  const catCount = db.get<{ count: number }>('SELECT count(*) as count FROM categories');
  if (!catCount || catCount.count === 0) {
    try {
      const categoriesJsonPath = path.resolve(process.cwd(), 'src', 'data', 'liveCategories.json');
      let rawCategories: any[] = [];
      if (fs.existsSync(categoriesJsonPath)) {
        rawCategories = JSON.parse(fs.readFileSync(categoriesJsonPath, 'utf8'));
      }

      // Ensure key categories exist with correct parents
      const catMap = new Map<number, any>();
      rawCategories.forEach((c) => catMap.set(c.id, c));

      // Make sure essential categories are present and mapped
      if (!catMap.has(1375)) {
        catMap.set(1375, { id: 1375, name: 'Mobile Phones', slug: 'mobile-phones', parent: 0, count: 130 });
      }
      if (!catMap.has(38)) {
        catMap.set(38, { id: 38, name: 'iPhones', slug: 'iphones', parent: 1375, count: 59 });
      }
      if (!catMap.has(278)) {
        catMap.set(278, { id: 278, name: 'Refurbished iPhones', slug: 'refurbished-iphones', parent: 1375, count: 1 });
      }
      if (!catMap.has(55)) {
        catMap.set(55, { id: 55, name: 'Laptop & Pc', slug: 'laptop-and-pc', parent: 0, count: 2 });
      }
      if (!catMap.has(1337)) {
        catMap.set(1337, { id: 1337, name: 'Business Laptops', slug: 'business-laptops', parent: 55, count: 1 });
      }
      if (!catMap.has(62)) {
        catMap.set(62, { id: 62, name: 'Accessories', slug: 'accessories', parent: 0, count: 34 });
      }
      if (!catMap.has(59)) {
        catMap.set(59, { id: 59, name: 'Earbuds & Headphones', slug: 'earbuds-and-headphones', parent: 62, count: 6 });
      }

      // Helper function to build hierarchical URL
      const getCatUrl = (id: number): string => {
        const pathSegments: string[] = [];
        let curr = catMap.get(id);
        const visited = new Set<number>();
        while (curr && !visited.has(curr.id)) {
          visited.add(curr.id);
          let seg = curr.slug;
          if (curr.id === 1375 && curr.id !== id) {
            seg = 'mobiles';
          }
          pathSegments.unshift(seg);
          if (curr.parent && curr.parent !== 0) {
            curr = catMap.get(curr.parent);
          } else {
            break;
          }
        }
        return `/product-category/${pathSegments.join('/')}/`;
      };

      let order = 0;
      for (const [id, c] of catMap.entries()) {
        const hierarchicalUrl = getCatUrl(id);
        const canonicalUrl = `https://irepair-mobiles.co.uk${hierarchicalUrl}`;
        const seo = {
          metaTitle: `${c.name} | iRepair Mobiles UK`,
          metaDescription: c.description || `Browse quality tested ${c.name} with 12-month UK warranty and fast dispatch at iRepair Mobiles.`,
          canonicalUrl,
          permalink: hierarchicalUrl,
          categoryUrl: hierarchicalUrl,
          focusKeyword: c.name.toLowerCase(),
          noindex: false,
        };

        db.run(
          `INSERT INTO categories (id, name, slug, parent, description, count, image, hierarchical_url, seo_json, sort_order, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            c.name,
            c.slug,
            c.parent || 0,
            c.description || '',
            c.count || 0,
            c.image?.src || c.image || '',
            hierarchicalUrl,
            JSON.stringify(seo),
            order++,
            now,
          ]
        );
      }

      // Seed 301 redirects for legacy URLs
      const initialRedirects = [
        { from: '/product-category/iphones/', to: '/product-category/mobiles/iphones/' },
        { from: '/product-category/refurbished-iphones/', to: '/product-category/mobiles/refurbished-iphones/' },
        { from: '/product-category/business-laptops/', to: '/product-category/laptop-and-pc/business-laptops/' },
        { from: '/product-category/earbuds-and-headphones/', to: '/product-category/accessories/earbuds-and-headphones/' },
        { from: '/product-category/mobile-phones/iphones/', to: '/product-category/mobiles/iphones/' },
        { from: '/product-category/mobile-phones/refurbished-iphones/', to: '/product-category/mobiles/refurbished-iphones/' },
      ];

      initialRedirects.forEach((r, idx) => {
        db.run(
          `INSERT OR REPLACE INTO category_redirects (id, from_url, to_url, status_code, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [`init_red_${idx + 1}`, r.from, r.to, 301, now]
        );
      });
    } catch (catSeedErr) {
      console.error('Failed to seed categories:', catSeedErr);
    }
  }

  // Cleanup any legacy HTML entities like &amp; in categories table
  try {
    db.run("UPDATE categories SET name = REPLACE(name, '&amp;', '&') WHERE name LIKE '%&amp;%'");
    db.run("UPDATE categories SET description = REPLACE(description, '&amp;', '&') WHERE description LIKE '%&amp;%'");
    db.run("UPDATE categories SET seo_json = REPLACE(seo_json, '&amp;', '&') WHERE seo_json LIKE '%&amp;%'");
  } catch (_) {}

  // 13. Ensure homepage sections layout matches requirements:
  // - Category Carousel placed at #3
  // - Remove value proposition grid (features_grid)
  // - Replace how_it_works with why_choose_us
  // - Move mobile_phone_brands_marquee to #11
  try {
    const homePageRow = db.get<{ id: string; sections_json: string }>(
      "SELECT id, sections_json FROM pages WHERE slug = 'home'"
    );
    if (homePageRow && homePageRow.sections_json) {
      let homeSections = JSON.parse(homePageRow.sections_json);
      if (Array.isArray(homeSections)) {
        // 1. Ensure category_editorial_rail exists on homepage
        const hasCategorySection = homeSections.some(
          (s: any) =>
            s.type === 'category_editorial_rail' ||
            s.id === 'sec_category_editorial_rail_01' ||
            s.type === 'category_carousel' ||
            s.id === 'sec_category_carousel_01'
        );
        if (!hasCategorySection) {
          const newSection = {
            id: 'sec_category_editorial_rail_01',
            type: 'category_editorial_rail',
            order: 3,
            visible: true,
            isGlobal: false,
            commonSettings: {
              containerWidth: 'full',
              paddingY: 'none',
            },
            settings: CATEGORY_EDITORIAL_RAIL_DEFAULTS,
          };
          let insertIndex = homeSections.findIndex((s: any) => s.id === 'sec_hero_promo_cards_home');
          if (insertIndex === -1 && homeSections.length >= 2) {
            insertIndex = 1;
          }
          if (insertIndex !== -1) {
            homeSections.splice(insertIndex + 1, 0, newSection);
          } else {
            homeSections.push(newSection);
          }
        }

        // 2. Remove value proposition grid (features_grid)
        homeSections = homeSections.filter(
          (s: any) => s.id !== 'sec_features_01' && s.type !== 'features_grid'
        );

        // 3. Replace how_it_works with why_choose_us
        let marqueeSection = homeSections.find((s: any) => s.type === 'mobile_phone_brands_marquee' || s.id === 'sec_mobile_brands_marquee_01');
        if (!marqueeSection) {
          marqueeSection = {
            id: 'sec_mobile_brands_marquee_01',
            type: 'mobile_phone_brands_marquee',
            order: 11,
            visible: true,
            isGlobal: false,
            commonSettings: {
              containerWidth: 'boxed',
              paddingY: 'small',
            },
            settings: {
              sectionHeading: 'Popular Brands',
              showSectionHeading: true,
              headingAlignment: 'center',
              backgroundColor: '#ffffff',
              animationSpeed: 38,
              pauseOnHover: true,
              showNavigationArrows: true,
            },
          };
        }

        // Remove marquee from current position to re-insert at #11
        homeSections = homeSections.filter(
          (s: any) => s.type !== 'mobile_phone_brands_marquee' && s.id !== 'sec_mobile_brands_marquee_01'
        );

        // Replace how_it_works with why_choose_us ONLY if it was literally an old how_it_works section without process_steps_modern
        homeSections = homeSections.map((s: any) => {
          if (s.type === 'how_it_works' || s.id === 'sec_steps_01') {
            return {
              id: 'sec_home_why_choose_us_dark_01',
              type: 'why_choose_us_metrics_dark',
              order: s.order || 8,
              visible: true,
              isGlobal: false,
              commonSettings: {
                containerWidth: 'full',
                paddingY: 'none',
              },
              settings: JSON.parse(JSON.stringify(WHY_CHOOSE_US_METRICS_DARK_DEFAULTS)),
            };
          }
          return s;
        });

        // Deduplicate all why_choose_us / why_choose_us_metrics_dark sections and keep strictly ONE right after How It Works (process_steps_modern)
        const existingWhyChooseUs = homeSections.find(
          (s: any) =>
            s.type === 'why_choose_us_metrics_dark' ||
            s.id === 'sec_home_why_choose_us_dark_01' ||
            s.type === 'why_choose_us' ||
            s.id === 'sec_why_choose_us_01'
        );

        homeSections = homeSections.filter(
          (s: any) =>
            s.type !== 'why_choose_us_metrics_dark' &&
            s.id !== 'sec_home_why_choose_us_dark_01' &&
            s.type !== 'why_choose_us' &&
            s.id !== 'sec_why_choose_us_01'
        );

        const singleWhyChooseUsSection = existingWhyChooseUs || {
          id: 'sec_home_why_choose_us_dark_01',
          type: 'why_choose_us_metrics_dark',
          order: 9,
          visible: true,
          isGlobal: false,
          commonSettings: {
            containerWidth: 'full',
            paddingY: 'none',
          },
          settings: JSON.parse(JSON.stringify(WHY_CHOOSE_US_METRICS_DARK_DEFAULTS)),
        };

        const howItWorksIdx = homeSections.findIndex(
          (s: any) =>
            s.type === 'process_steps_modern' ||
            s.id === 'sec_home_process_steps_01' ||
            s.type === 'cta_banner' ||
            s.id === 'sec_cta_01'
        );
        if (howItWorksIdx !== -1) {
          homeSections.splice(howItWorksIdx + 1, 0, singleWhyChooseUsSection);
        } else {
          homeSections.push(singleWhyChooseUsSection);
        }

        // 4. Deduplicate any duplicate FAQs
        const seenFaq = new Set<string>();
        homeSections = homeSections.filter((s: any) => {
          if (
            s.type === 'faqs' ||
            s.id === 'sec_faqs_01' ||
            s.type === 'faq_two_column_accordion' ||
            s.id === 'sec_home_faq_accordion_01'
          ) {
            if (seenFaq.has('faqs')) return false;
            seenFaq.add('faqs');
          }
          return true;
        });

        // 5. Insert mobile_phone_brands_marquee right before FAQs or after stores_locations (position 11)
        const faqIdx = homeSections.findIndex(
          (s: any) =>
            s.type === 'faqs' ||
            s.id === 'sec_faqs_01' ||
            s.type === 'faq_two_column_accordion' ||
            s.id === 'sec_home_faq_accordion_01'
        );
        if (faqIdx !== -1) {
          homeSections.splice(faqIdx, 0, marqueeSection);
        } else {
          homeSections.push(marqueeSection);
        }

        // Re-index orders cleanly
        homeSections = homeSections.map((s: any, idx: number) => ({
          ...s,
          order: idx + 1,
        }));

        db.run(
          "UPDATE pages SET sections_json = ?, updated_at = ? WHERE slug = 'home'",
          [JSON.stringify(homeSections), now]
        );
      }
    }
  } catch (migErr) {
    console.error('Failed to migrate homepage sections layout:', migErr);
  }

  try {
    // Migrate contact page to ensure all 8 stores are enabled in sec_contact_stores
    const contactRow = db.get<{ sections_json: string }>('SELECT sections_json FROM pages WHERE slug = ?', ['contact']);
    if (contactRow && contactRow.sections_json) {
      let contactSections = JSON.parse(contactRow.sections_json);
      let updated = false;
      contactSections = contactSections.map((sec: any) => {
        if (sec.type === 'stores_locations' || sec.id === 'sec_contact_stores') {
          sec.settings = { ...sec.settings, limit: 8 };
          updated = true;
        }
        return sec;
      });
      if (updated) {
        db.run("UPDATE pages SET sections_json = ?, updated_at = ? WHERE slug = 'contact'", [
          JSON.stringify(contactSections),
          now,
        ]);
      }
    }
  } catch (contactMigErr) {
    console.error('Failed to migrate contact page stores limit:', contactMigErr);
  }

  try {
    const privacyHtml = `<p><strong>Effective Date: 27-02-2025</strong></p>
<p>At iRepair, we are committed to protecting your privacy and ensuring transparency in how we handle your personal data. As a part of Phone Fresh UK Limited (Company Number 03133908), a trusted name in the tech repair industry since July 16, 2014, we uphold the highest standards in data protection and customer trust.</p>
<p>By accessing or using our website <a href="https://irepair-mobiles.co.uk/">https://irepair-mobiles.co.uk/</a> (the “Website”), you agree to the practices outlined in this Privacy Policy.</p>
<h3>1. Information We Collect</h3>
<h4>1.1 Personal Information</h4>
<p>We may collect and process the following personal details:</p>
<ul>
<li><strong>Identity Information:</strong> Name, email address, phone number, and postal address.</li>
<li><strong>Payment Information:</strong> Billing details (processed securely via third-party payment providers).</li>
<li><strong>Order & Transaction Details:</strong> Purchase history, repair service records, and warranty claims.</li>
<li><strong>Communication Data:</strong> Customer support inquiries, feedback, and emails.</li>
</ul>
<h4>1.2 Technical Data & Cookies</h4>
<p>When you visit our Website, we may automatically collect:</p>
<ul>
<li><strong>Device Information:</strong> IP address, browser type, operating system, and access times.</li>
<li><strong>Usage Data:</strong> Pages visited, time spent on the Website, and referral sources.</li>
<li><strong>Cookies & Tracking Technologies:</strong> These enhance your browsing experience and help analyze site traffic. You can modify cookie preferences in your browser settings.</li>
</ul>
<h3>2. How We Use Your Information</h3>
<p>We use the collected data to:</p>
<ul>
<li>Process orders and service requests efficiently.</li>
<li>Provide customer support and respond to inquiries.</li>
<li>Enhance and personalize your Website experience.</li>
<li>Send important updates related to your orders or account.</li>
<li>Comply with legal obligations and prevent fraud.</li>
</ul>
<h3>3. Sharing of Information</h3>
<h4>3.1 Trusted Third-Party Service Providers</h4>
<p>We share necessary data with:</p>
<ul>
<li>Payment processors (e.g., Stripe, PayPal) to facilitate transactions.</li>
<li>Delivery and logistics partners for shipping services.</li>
<li>Analytics and security services to improve our Website and protect user data.</li>
</ul>
<p>These providers are contractually bound to protect your data.</p>
<h4>3.2 Legal Compliance & Security</h4>
<p>We may disclose your information:</p>
<ul>
<li>If required by law, court order, or government authority.</li>
<li>To protect our business, customers, and website security.</li>
</ul>
<h4>3.3 Business Transfers</h4>
<p>If iRepair or Phone Fresh UK Limited undergoes a business sale or merger, customer data may be transferred as part of the transaction.</p>
<h3>4. Third-Party Links & External Sites</h3>
<p>Our Website may include links to external websites. We are not responsible for their privacy policies, so we encourage you to review their terms before sharing any information.</p>
<h3>5. Data Security</h3>
<p>We implement strict security measures to protect your personal data. However, no online system is completely secure, and we cannot guarantee absolute protection against cyber threats.</p>
<h3>6. Your Rights & Choices</h3>
<p>You have the right to:</p>
<ul>
<li>Access, update, or delete your personal information.</li>
<li>Request data portability where applicable.</li>
<li>Opt out of marketing communications at any time.</li>
</ul>
<p>To exercise these rights, contact us at:<br>📧 Email: <a href="mailto:support@irepair-mobiles.co.uk">support@irepair-mobiles.co.uk</a></p>
<h3>7. Children’s Privacy</h3>
<p>Our Website is not intended for users under 13 years old. We do not knowingly collect data from children. If we discover such data, we will delete it immediately.</p>
<h3>8. Updates to This Privacy Policy</h3>
<p>We may revise this Privacy Policy periodically. Changes will take effect upon posting on our Website. We encourage you to review this page regularly.</p>
<p>For further inquiries, contact us at:<br>📧 Email: <a href="mailto:support@irepair-mobiles.co.uk">support@irepair-mobiles.co.uk</a></p>`;

    const privacySections = [
      {
        id: 'sec_privacy_content',
        type: 'rich_text',
        order: 1,
        visible: true,
        isGlobal: false,
        settings: {
          content: privacyHtml,
        },
      },
    ];

    const privacySeo = JSON.stringify({
      metaTitle: 'Privacy Policy - iRepair Mobiles UK',
      metaDescription: 'Read the official Privacy Policy for iRepair Mobiles (Phone Fresh UK Limited). Effective 27-02-2025. UK GDPR compliant data protection.',
      canonicalUrl: 'https://irepair-mobiles.co.uk/privacy-policy/',
      noindex: false,
    });

    // Update or insert privacy-policy
    const existingPolicy = db.get('SELECT id FROM pages WHERE slug = ?', ['privacy-policy']);
    if (existingPolicy) {
      db.run('UPDATE pages SET title = ?, seo_json = ?, sections_json = ?, updated_at = ? WHERE slug = ?', [
        'Privacy Policy',
        privacySeo,
        JSON.stringify(privacySections),
        now,
        'privacy-policy',
      ]);
    } else {
      db.run(
        'INSERT INTO pages (id, slug, title, status, seo_json, sections_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          'page_privacy_policy_01',
          'privacy-policy',
          'Privacy Policy',
          'published',
          privacySeo,
          JSON.stringify(privacySections),
          now,
          now,
        ]
      );
    }

    // Also sync the legacy slug 'privacy'
    const existingLegacyPrivacy = db.get('SELECT id FROM pages WHERE slug = ?', ['privacy']);
    if (existingLegacyPrivacy) {
      db.run('UPDATE pages SET title = ?, seo_json = ?, sections_json = ?, updated_at = ? WHERE slug = ?', [
        'Privacy Policy',
        privacySeo,
        JSON.stringify(privacySections),
        now,
        'privacy',
      ]);
    }
  } catch (privMigErr) {
    console.error('Failed to update privacy policy in pages table:', privMigErr);
  }

  try {
    // 1. Terms of Use
    const termsHtml = `<p><strong>Terms of Use</strong><br>Last Updated: [27-02-2025]</p>
<p>Welcome to iRepair Mobiles. These Terms &amp; Conditions govern your use of our website <a href="https://irepair-mobiles.co.uk">https://irepair-mobiles.co.uk</a> and the purchase of our products and services. By accessing or using our site, you agree to comply with these terms.</p>
<h3>1. General Terms</h3>
<ul>
<li>You must be at least 18 years old to place an order.</li>
<li>We reserve the right to modify or discontinue any service without prior notice.</li>
<li>Prices and product availability are subject to change without notice.</li>
</ul>
<h3>2. Ordering &amp; Payment</h3>
<ul>
<li>All orders are subject to acceptance and availability.</li>
<li>We accept payments via worldPay.</li>
<li>Orders will be processed once payment is confirmed.</li>
</ul>
<h3>3. Warranties &amp; Liabilities</h3>
<ul>
<li>iRepair Mobiles is not responsible for any indirect damages arising from the use of our products or services.</li>
<li>We do not guarantee uninterrupted access to our website.</li>
</ul>
<h3>4. Intellectual Property</h3>
<ul>
<li>All content on this website, including text, images, and logos, is owned by iRepair Mobiles and cannot be used without permission.</li>
</ul>
<h3>5. Governing Law</h3>
<ul>
<li>These terms are governed by UK law. Any disputes will be resolved in UK courts.</li>
</ul>`;

    const termsSections = [
      {
        id: 'sec_terms_content',
        type: 'rich_text',
        order: 1,
        visible: true,
        isGlobal: false,
        settings: { content: termsHtml },
      },
    ];

    const termsSeo = JSON.stringify({
      metaTitle: 'Terms of Use - iRepair Mobiles UK',
      metaDescription: 'Read the official Terms of Use for iRepair Mobiles. Last updated: 27-02-2025.',
      canonicalUrl: 'https://irepair-mobiles.co.uk/terms-of-use/',
      noindex: false,
    });

    ['terms-of-use', 'terms'].forEach((slug) => {
      const existing = db.get('SELECT id FROM pages WHERE slug = ?', [slug]);
      if (existing) {
        db.run('UPDATE pages SET title = ?, seo_json = ?, sections_json = ?, updated_at = ? WHERE slug = ?', [
          'Terms of Use',
          termsSeo,
          JSON.stringify(termsSections),
          now,
          slug,
        ]);
      } else {
        db.run(
          'INSERT INTO pages (id, slug, title, status, seo_json, sections_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [`page_${slug}_01`, slug, 'Terms of Use', 'published', termsSeo, JSON.stringify(termsSections), now, now]
        );
      }
    });

    // 2. Warranty Policy
    const warrantyHtml = `<p><strong>Effective Date: 27-02-2025</strong></p>
<h3>Warranty Coverage</h3>
<ul>
<li>Repairs include a 12-month warranty on parts and labor, starting from the date of repair completion.</li>
<li>Covers defects arising directly from the repair service (e.g., faulty components, workmanship errors).</li>
</ul>
<h3>Exclusions</h3>
<p>Warranty is void if:</p>
<ul>
<li>The device sustains accidental damage (e.g., drops, cracks).</li>
<li>Liquid exposure or unauthorized modifications occur.</li>
<li>Non-original or third-party parts are used post-repair.</li>
</ul>
<h3>Warranty Claims Process</h3>
<p><strong>Step 1:</strong> Contact us via email (<a href="mailto:info@irepair-mobiles.co.uk">info@irepair-mobiles.co.uk</a>) with:</p>
<ul>
<li>Proof of repair (invoice/receipt).</li>
<li>Description of the issue.</li>
</ul>
<p><strong>Step 2:</strong> Return the item (if required) using a tracked service. Return costs are covered by us if the claim is valid.</p>
<p><strong>Step 3:</strong> We assess the issue within 5 working days and resolve it via repair, replacement, or refund.</p>
<h3>Statutory Rights</h3>
<p>This warranty does not affect your statutory rights under the Consumer Rights Act 2015.</p>
<div style="margin-top: 24px; padding: 16px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
<h4>Compliance Note:</h4>
<p>Fone &amp; Cases Limited trading as iRepair<br>Registered in England &amp; Wales (Company No. 14427155)<br>Registered Office: 20 West Street, Horsham, West Sussex, RH12 1PB</p>
<p>To request a cancellation, email <a href="mailto:info@irepair-mobiles.co.uk">info@irepair-mobiles.co.uk</a> immediately.</p>
</div>`;

    const warrantySections = [
      {
        id: 'sec_warranty_content',
        type: 'rich_text',
        order: 1,
        visible: true,
        isGlobal: false,
        settings: { content: warrantyHtml },
      },
    ];

    const warrantySeo = JSON.stringify({
      metaTitle: 'Warranty Policy - iRepair Mobiles UK',
      metaDescription: 'Read the official Warranty Policy for iRepair Mobiles. 12-Month Guarantee on parts and labour. Effective 27-02-2025.',
      canonicalUrl: 'https://irepair-mobiles.co.uk/warranty-policy/',
      noindex: false,
    });

    ['warranty-policy', 'warranty'].forEach((slug) => {
      const existing = db.get('SELECT id FROM pages WHERE slug = ?', [slug]);
      if (existing) {
        db.run('UPDATE pages SET title = ?, seo_json = ?, sections_json = ?, updated_at = ? WHERE slug = ?', [
          'Warranty Policy',
          warrantySeo,
          JSON.stringify(warrantySections),
          now,
          slug,
        ]);
      } else {
        db.run(
          'INSERT INTO pages (id, slug, title, status, seo_json, sections_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [`page_${slug}_01`, slug, 'Warranty Policy', 'published', warrantySeo, JSON.stringify(warrantySections), now, now]
        );
      }
    });

    // 3. Shipping & Delivery Policy
    const shippingHtml = `<p><strong>Effective Date: 27-02-2025</strong></p>
<h3>Delivery Timeframes</h3>
<ul>
<li>All goods will be delivered within 30 days of order confirmation unless a longer period is mutually agreed upon in writing (e.g., for custom orders).</li>
<li>Delays due to unforeseen circumstances (e.g., supply chain issues) will be communicated promptly, and customers may cancel for a full refund if the new timeframe is unacceptable.</li>
</ul>
<h3>Delivery Costs</h3>
<ul>
<li>Postage fees (if applicable) are displayed clearly during checkout.</li>
<li>Free delivery may apply for specific promotions or repair services—details will be provided before payment.</li>
</ul>
<h3>Tracking &amp; Confirmation</h3>
<ul>
<li>Customers receive an order confirmation email immediately after purchase, containing a summary of the contract (e.g., item description, price, delivery address).</li>
<li>A dispatch notification with tracking information is sent once goods are shipped.</li>
</ul>
<h3>Payment Methods</h3>
<p>Accepted payment options include:</p>
<ul>
<li>Credit/Debit Cards (Visa, Mastercard)</li>
<li>PayPal</li>
<li>Apple Pay/Google Pay</li>
</ul>
<h3>International Shipping</h3>
<p>Currently, we only ship within the UK.</p>
<div style="margin-top: 24px; padding: 16px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
<h4>Compliance Note:</h4>
<p>Fone &amp; Cases Limited trading as iRepair<br>Registered in England &amp; Wales (Company No. 14427155)<br>Registered Office: 20 West Street, Horsham, West Sussex, RH12 1PB</p>
<p>For shipping-related inquiries, email us at <a href="mailto:info@irepair-mobiles.co.uk">info@irepair-mobiles.co.uk</a></p>
</div>`;

    const shippingSections = [
      {
        id: 'sec_shipping_content',
        type: 'rich_text',
        order: 1,
        visible: true,
        isGlobal: false,
        settings: { content: shippingHtml },
      },
    ];

    const shippingSeo = JSON.stringify({
      metaTitle: 'Shipping & Delivery Policy - iRepair Mobiles UK',
      metaDescription: 'Read the official Shipping & Delivery Policy for iRepair Mobiles UK. Tracked delivery across mainland UK. Effective 27-02-2025.',
      canonicalUrl: 'https://irepair-mobiles.co.uk/shipping-delivery-policy/',
      noindex: false,
    });

    ['shipping-delivery-policy', 'shipping-and-delivery-policy', 'shipping'].forEach((slug) => {
      const existing = db.get('SELECT id FROM pages WHERE slug = ?', [slug]);
      if (existing) {
        db.run('UPDATE pages SET title = ?, seo_json = ?, sections_json = ?, updated_at = ? WHERE slug = ?', [
          'Shipping & Delivery Policy',
          shippingSeo,
          JSON.stringify(shippingSections),
          now,
          slug,
        ]);
      } else {
        db.run(
          'INSERT INTO pages (id, slug, title, status, seo_json, sections_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [`page_${slug}_01`, slug, 'Shipping & Delivery Policy', 'published', shippingSeo, JSON.stringify(shippingSections), now, now]
        );
      }
    });

    // 4. Return & Cancellation Policy
    const returnHtml = `<p><strong>Effective Date: 27-02-2025</strong></p>
<h3>Right to Cancel</h3>
<ul>
<li>Customers may cancel orders within 14 days of delivery for any reason, with no penalty.</li>
<li>If cancellation rights are not disclosed, the cancellation period extends to 12 months, followed by a 14-day window after notification.</li>
</ul>
<h3>Return Process</h3>
<p><strong>Step 1:</strong> Notify us via email (<a href="mailto:info@irepair-mobiles.co.uk">info@irepair-mobiles.co.uk</a>) to request cancellation.</p>
<p><strong>Step 2:</strong> Return goods in their original condition and packaging within 14 days of cancellation.</p>
<p>Include the original invoice or order number.</p>
<h3>Return Costs</h3>
<ul>
<li>Customers are responsible for return postage costs unless the item is faulty, misdescribed, or damaged in transit.</li>
<li>We recommend using a tracked and insured delivery service.</li>
</ul>
<h3>Refunds</h3>
<ul>
<li>Refunds are processed within 14 days of receiving returned goods.</li>
<li>Issued via the original payment method.</li>
</ul>
<h3>Faulty or Damaged Goods</h3>
<p>For items damaged during delivery or with defects not caused by the customer:</p>
<ul>
<li>We cover return costs and provide a full refund, repair, or replacement.</li>
</ul>
<div style="margin-top: 24px; padding: 16px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
<h4>Compliance Note:</h4>
<p>Fone &amp; Cases Limited trading as iRepair<br>Registered in England &amp; Wales (Company No. 14427155)<br>Registered Office: 20 West Street, Horsham, West Sussex, RH12 1PB<br>Pre-Contractual Information: Available on our website and emailed post-purchase.</p>
<p>To request a return or refund, contact <a href="mailto:info@irepair-mobiles.co.uk">info@irepair-mobiles.co.uk</a> with proof of purchase.</p>
</div>`;

    const returnSections = [
      {
        id: 'sec_return_content',
        type: 'rich_text',
        order: 1,
        visible: true,
        isGlobal: false,
        settings: { content: returnHtml },
      },
    ];

    const returnSeo = JSON.stringify({
      metaTitle: 'Return & Cancellation Policy - iRepair Mobiles UK',
      metaDescription: 'Read the official Return & Cancellation Policy for iRepair Mobiles UK. 14-day cancellation rights and hassle-free returns.',
      canonicalUrl: 'https://irepair-mobiles.co.uk/return-cancellation-policy/',
      noindex: false,
    });

    ['return-cancellation-policy', 'return-and-cancellation-policy', 'cancellation-policy', 'returns'].forEach((slug) => {
      const existing = db.get('SELECT id FROM pages WHERE slug = ?', [slug]);
      if (existing) {
        db.run('UPDATE pages SET title = ?, seo_json = ?, sections_json = ?, updated_at = ? WHERE slug = ?', [
          'Return & Cancellation Policy',
          returnSeo,
          JSON.stringify(returnSections),
          now,
          slug,
        ]);
      } else {
        db.run(
          'INSERT INTO pages (id, slug, title, status, seo_json, sections_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [`page_${slug}_01`, slug, 'Return & Cancellation Policy', 'published', returnSeo, JSON.stringify(returnSections), now, now]
        );
      }
    });

    // 5. Ensure about-us and contact-us pages exist in database
    const aboutPage = db.get<{ seo_json: string; sections_json: string }>('SELECT seo_json, sections_json FROM pages WHERE slug = ?', ['about']);
    if (aboutPage) {
      const existingAboutUs = db.get('SELECT id FROM pages WHERE slug = ?', ['about-us']);
      if (!existingAboutUs) {
        db.run(
          'INSERT INTO pages (id, slug, title, status, seo_json, sections_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          ['page_about_us_01', 'about-us', 'About Us', 'published', aboutPage.seo_json, aboutPage.sections_json, now, now]
        );
      }
    }

    const contactPage = db.get<{ seo_json: string; sections_json: string }>('SELECT seo_json, sections_json FROM pages WHERE slug = ?', ['contact']);
    if (contactPage) {
      const existingContactUs = db.get('SELECT id FROM pages WHERE slug = ?', ['contact-us']);
      if (!existingContactUs) {
        db.run(
          'INSERT INTO pages (id, slug, title, status, seo_json, sections_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          ['page_contact_us_01', 'contact-us', 'Contact Us', 'published', contactPage.seo_json, contactPage.sections_json, now, now]
        );
      }
    }

    // Ensure home page trending phones carousel has showAllCategory: false, defaultCategory: 'apple', visibleTablet: 4, visibleMobile: 2
    const homePageRow = db.get<{ id: string; sections_json: string }>('SELECT id, sections_json FROM pages WHERE slug = ?', ['home']);
    if (homePageRow && homePageRow.sections_json) {
      try {
        const sections = JSON.parse(homePageRow.sections_json);
        let modified = false;
        sections.forEach((sec: any) => {
          if (sec.id === 'sec_trending_phones_01' || (sec.type === 'trending_products_showcase' && (sec.settings?.sectionHeading || '').toLowerCase().includes('trending phones'))) {
            if (!sec.settings) sec.settings = {};
            sec.settings.showAllCategory = false;
            sec.settings.defaultCategory = 'apple';
            sec.settings.visibleTablet = 4;
            sec.settings.visibleMobile = 2;
            sec.settings.visibleDesktop = 5;
            sec.settings.headingAlignment = 'left';
            sec.settings.headingColor = '#0B0D12';
            sec.settings.headingFontWeight = 'extrabold';
            sec.settings.arrowPosition = 'top_right';
            sec.settings.showEyebrow = true;
            if (!sec.settings.eyebrowText) {
              sec.settings.eyebrowText = 'NEW & FLAGSHIP RELEASES';
            }
            modified = true;
          }
          if (sec.id === 'sec_refurbished_iphones_slider_02' || (sec.type === 'trending_products_showcase' && (sec.settings?.sectionHeading || '').toLowerCase().includes('refurbished iphone'))) {
            if (!sec.settings) sec.settings = {};
            sec.settings.visibleTablet = 4;
            sec.settings.visibleMobile = 2;
            sec.settings.visibleDesktop = 5;
            sec.settings.headingAlignment = 'left';
            sec.settings.headingColor = '#0B0D12';
            sec.settings.headingFontWeight = 'extrabold';
            sec.settings.arrowPosition = 'top_right';
            sec.settings.showEyebrow = true;
            if (!sec.settings.eyebrowText) {
              sec.settings.eyebrowText = 'CERTIFIED REFURBISHED & TESTED';
            }
            modified = true;
          }
          if (sec.id === 'sec_hero_promo_cards_home' || sec.type === 'hero_promo_cards') {
            if (!sec.settings) sec.settings = {};
            if (sec.settings.accentColor === '#D81B80') {
              sec.settings.accentColor = '#E6007E';
              modified = true;
            }
            if (sec.settings.overlayOpacity === 0.25) {
              sec.settings.overlayOpacity = 0.15;
              modified = true;
            }
            if (Array.isArray(sec.settings.cards)) {
              sec.settings.cards = sec.settings.cards.map((card: any) => {
                if (card.heading === 'Fast And Trusted Mobile Repair Services') {
                  modified = true;
                  return {
                    ...card,
                    heading: 'Express Mobile Repairs',
                    subheading:
                      card.subheading === 'Get your phone fixed by iRepair'
                        ? 'Fast, certified fixes with warranty'
                        : card.subheading,
                  };
                }
                if (card.heading === 'Sell Your Phone And Get Instant Cash') {
                  modified = true;
                  return {
                    ...card,
                    heading: 'Sell & Get Instant Cash',
                    subheading:
                      card.subheading === 'Instant cash for your old device.'
                        ? 'Fair quotes & fast bank payouts'
                        : card.subheading,
                  };
                }
                if (card.heading === 'Upgrade And Save Big') {
                  modified = true;
                  return {
                    ...card,
                    heading: 'Shop Phones & Tech',
                    subheading:
                      card.subheading === 'Latest phone and accessories'
                        ? 'New, refurbished & accessories'
                        : card.subheading,
                    buttonText:
                      card.buttonText === 'Buy Now' ? 'Shop Now' : card.buttonText,
                  };
                }
                return card;
              });
            }
          }
          if (sec.id === 'sec_category_carousel_01' || sec.type === 'category_carousel') {
            sec.id = 'sec_category_editorial_rail_01';
            sec.type = 'category_editorial_rail';
            sec.commonSettings = {
              containerWidth: 'full',
              paddingY: 'none',
            };
            sec.settings = JSON.parse(JSON.stringify(CATEGORY_EDITORIAL_RAIL_DEFAULTS));
            modified = true;
          } else if (sec.id === 'sec_category_editorial_rail_01' || sec.type === 'category_editorial_rail') {
            const legacyImageMap: Record<string, string> = {
              '/images/categories/cat_mobile-phone.png': '/images/categories/editorial_smartphones.jpg',
              '/images/categories/cat_ipad-tablets.png': '/images/categories/editorial_tablets.jpg',
              '/images/categories/cat_laptops.png': '/images/categories/editorial_laptops.jpg',
              '/images/categories/cat_headphones.png': '/images/categories/editorial_headphones.jpg',
              '/images/categories/cat_game-devices.png': '/images/categories/editorial_gaming.jpg',
              '/images/categories/cat_watches.png': '/images/categories/editorial_smartwatches.jpg',
              '/images/categories/cat_cases.png': '/images/categories/editorial_cases.jpg',
              '/images/categories/cat_chargers.png': '/images/categories/editorial_chargers.jpg',
            };
            if (Array.isArray(sec.settings?.items)) {
              sec.settings.items = sec.settings.items.map((item: any) => {
                if (item.image && legacyImageMap[item.image]) {
                  modified = true;
                  return { ...item, image: legacyImageMap[item.image] };
                }
                return item;
              });
            }
          }
          if (sec.id === 'sec_cta_01' || sec.type === 'cta_banner') {
            sec.id = 'sec_home_process_steps_01';
            sec.type = 'process_steps_modern';
            sec.commonSettings = { containerWidth: 'full', paddingY: 'none' };
            sec.settings = JSON.parse(JSON.stringify(PROCESS_STEPS_MODERN_DEFAULTS));
            modified = true;
          }
          if (sec.id === 'sec_why_choose_us_01' || sec.type === 'why_choose_us') {
            sec.id = 'sec_home_why_choose_us_dark_01';
            sec.type = 'why_choose_us_metrics_dark';
            sec.commonSettings = { containerWidth: 'full', paddingY: 'none' };
            sec.settings = JSON.parse(JSON.stringify(WHY_CHOOSE_US_METRICS_DARK_DEFAULTS));
            modified = true;
          }
          if (sec.id === 'sec_stores_01' || sec.type === 'stores_locations') {
            sec.id = 'sec_home_stores_tracker_01';
            sec.type = 'store_locations_with_tracker';
            sec.commonSettings = { containerWidth: 'full', paddingY: 'none' };
            sec.settings = JSON.parse(JSON.stringify(STORE_LOCATIONS_WITH_TRACKER_DEFAULTS));
            modified = true;
          }
          if (sec.id === 'sec_faqs_01' || sec.type === 'faqs') {
            sec.id = 'sec_home_faq_accordion_01';
            sec.type = 'faq_two_column_accordion';
            sec.commonSettings = { containerWidth: 'full', paddingY: 'none' };
            sec.settings = JSON.parse(JSON.stringify(FAQ_TWO_COLUMN_ACCORDION_DEFAULTS));
            modified = true;
          }
        });

        // Ensure strictly one Why Choose Us section placed immediately after How It Works (process_steps_modern)
        const whyChooseUsCount = sections.filter(
          (s: any) =>
            s.type === 'why_choose_us_metrics_dark' ||
            s.id === 'sec_home_why_choose_us_dark_01' ||
            s.type === 'why_choose_us' ||
            s.id === 'sec_why_choose_us_01'
        ).length;
        if (whyChooseUsCount > 1) {
          const retainedWhy = sections.find(
            (s: any) =>
              s.type === 'why_choose_us_metrics_dark' ||
              s.id === 'sec_home_why_choose_us_dark_01' ||
              s.type === 'why_choose_us' ||
              s.id === 'sec_why_choose_us_01'
          );
          const cleaned = sections.filter(
            (s: any) =>
              s.type !== 'why_choose_us_metrics_dark' &&
              s.id !== 'sec_home_why_choose_us_dark_01' &&
              s.type !== 'why_choose_us' &&
              s.id !== 'sec_why_choose_us_01'
          );
          const processIdx = cleaned.findIndex(
            (s: any) => s.type === 'process_steps_modern' || s.id === 'sec_home_process_steps_01'
          );
          if (retainedWhy) {
            if (processIdx !== -1) {
              cleaned.splice(processIdx + 1, 0, retainedWhy);
            } else {
              cleaned.push(retainedWhy);
            }
          }
          sections.splice(0, sections.length, ...cleaned.map((s: any, idx: number) => ({ ...s, order: idx + 1 })));
          modified = true;
        }
        // Ensure Bright Hero Slider is placed at top of homepage and existing hero_slider is hidden (preserved as backup)
        const hasBrightHero = sections.some(
          (s: any) => s.type === 'hero_bright_slider' || s.id === 'sec_hero_bright_slider_home'
        );
        if (!hasBrightHero) {
          const legacyHero = sections.find(
            (s: any) => s.type === 'hero_slider' || s.id === 'sec_hero_slider_home'
          );
          const copiedSlides =
            legacyHero && Array.isArray(legacyHero.settings?.slides) && legacyHero.settings.slides.length > 0
              ? legacyHero.settings.slides.map((sl: any, idx: number) => {
                  const fallbackIndex = (idx % 7) + 1;
                  const fallbackExt = fallbackIndex <= 3 ? 'webp' : 'jpg';
                  return {
                    ...sl,
                    headingTag: sl.headingTag || (idx === 0 ? 'h1' : 'h2'),
                    titleColor: '#4A0456',
                    subtitleColor: '#475569',
                    badgeColor: '#EC008C',
                    buttonBg: '#EC008C',
                    buttonTextColor: '#ffffff',
                    buttonHoverBg: '#CE007A',
                    fallbackImage: sl.fallbackImage || `/images/hero/hero_slide_${fallbackIndex}.${fallbackExt}`,
                  };
                })
              : JSON.parse(JSON.stringify(HERO_BRIGHT_SLIDER_DEFAULTS.slides));

          // Hide legacy hero section without deleting it
          sections.forEach((sec: any) => {
            if (sec.type === 'hero_slider' || sec.id === 'sec_hero_slider_home') {
              sec.visible = false;
            }
          });

          const brightHeroSection = {
            id: 'sec_hero_bright_slider_home',
            type: 'hero_bright_slider',
            order: 1,
            visible: true,
            isGlobal: false,
            commonSettings: {
              containerWidth: 'full',
              paddingY: 'none',
            },
            settings: {
              ...JSON.parse(JSON.stringify(HERO_BRIGHT_SLIDER_DEFAULTS)),
              autoplaySpeed: legacyHero?.settings?.autoplaySpeed || HERO_BRIGHT_SLIDER_DEFAULTS.autoplaySpeed,
              slides: copiedSlides,
            },
          };

          sections.unshift(brightHeroSection);
          sections.forEach((sec: any, idx: number) => {
            sec.order = idx + 1;
          });
          modified = true;
        }

        if (modified) {
          db.run('UPDATE pages SET sections_json = ?, updated_at = ? WHERE slug = ?', [JSON.stringify(sections), now, 'home']);
        }
      } catch (err) {
        console.error('Failed to migrate home sections for trending phones:', err);
      }
    }
    // Self-healing check for blog post featured images
    try {
      const brokenPosts = db.all<any>(
        "SELECT id, title, slug, featured_image_url FROM blog_posts WHERE featured_image_url IS NULL OR featured_image_url = '' OR featured_image_url LIKE '%placeholder%' OR featured_image_url LIKE '%undefined%'"
      );
      if (brokenPosts && brokenPosts.length > 0) {
        const fallbackImages = [
          '/uploads/blog/658de447_Thumbnail.jpg',
          '/uploads/blog/658de43d_Thumbnail.jpg',
          '/uploads/blog/658de41b_Thumbnail.jpg',
          '/uploads/blog/658de3ff_Thumbnail.jpg',
          '/uploads/blog/658de3d0_Thumbnail.jpg',
          '/uploads/blog/658de431_Thumbnail.jpg',
          '/uploads/blog/658de427_Thumbnail.jpg',
          '/uploads/blog/658de407_Thumbnail.jpg',
        ];
        brokenPosts.forEach((bp, i) => {
          const img = fallbackImages[i % fallbackImages.length];
          db.run("UPDATE blog_posts SET featured_image_url = ?, og_image = ? WHERE id = ?", [img, img, bp.id]);
        });
      }
    } catch (_) {}

    // Seed / migrate products into relational tables if needed
    try {
      await seedProductsFromLiveCatalog(db);
    } catch (prodSeedErr) {
      console.error('Failed to seed initial products:', prodSeedErr);
    }

    // Seed default SEO settings if not existing
    try {
      const existingSeoSettings = db.get('SELECT id FROM seo_settings WHERE id = ?', ['default']);
      if (!existingSeoSettings) {
        db.run(
          `INSERT INTO seo_settings (
             id, wordpress_source_url, site_url, origins_to_rewrite_json,
             environment_mode, robots_source_mode, media_url_mode, auto_sync_frequency, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'default',
            'https://irepair-mobiles.co.uk',
            'https://irepair-mobiles.co.uk',
            JSON.stringify([
              'https://irepair-mobiles.co.uk',
              'https://old.irepair-mobiles.co.uk',
              'http://irepair-mobiles.co.uk',
              'http://old.irepair-mobiles.co.uk'
            ]),
            'production',
            'baseline_protected',
            'keep_source',
            'disabled',
            now
          ]
        );
      }

      // Seed initial legacy redirects
      const redirects = [
        { from: '/mobile-phone-shop-in-uk/', to: '/shop/' },
        { from: '/mobile-phones-repair/', to: '/mobile-phone-repair-shops-in-uk/' }
      ];
      for (const r of redirects) {
        const existingRedirect = db.get('SELECT id FROM seo_redirects WHERE from_path = ?', [r.from]);
        if (!existingRedirect) {
          db.run(
            `INSERT INTO seo_redirects (id, from_path, to_path, status_code, origin, hit_count, created_at, updated_at)
             VALUES (?, ?, ?, 301, 'legacy_sync', 0, ?, ?)`,
            [`redir_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, r.from, r.to, now, now]
          );
        }
      }

      // Ensure laptop-repair-shops-in-uk CMS page exists (preserves WP zero-H1 quirk)
      const existingLaptopPage = db.get('SELECT id FROM pages WHERE slug = ?', ['laptop-repair-shops-in-uk']);
      if (!existingLaptopPage) {
        const laptopSections = [
          {
            id: 'sec_laptop_uk_intro',
            type: 'rich_text',
            settings: {
              title: '',
              content:
                '<div class="max-w-4xl mx-auto py-8 space-y-6">' +
                '<div class="inline-block px-3 py-1 rounded-full bg-pink-50 text-[#DF0C88] text-xs font-bold uppercase tracking-wider">iRepair Mobiles UK · Laptop & MacBook Specialists</div>' +
                '<h2 class="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Fast, Reliable &amp; Affordable Laptop Repair Shop in the UK</h2>' +
                '<p class="text-slate-600 text-base leading-relaxed">At iRepair Mobiles, we specialize in providing fast, certified laptop and MacBook repair services across our UK branches. From cracked LCD/Retina screens, faulty batteries, and liquid damage to motherboard micro-soldering and SSD upgrades, our experienced technicians restore your device with a 6-month warranty.</p>' +
                '</div>',
            },
          },
          {
            id: 'sec_laptop_uk_locations',
            type: 'stores_locations',
            settings: {
              heading: 'Visit Your Nearest iRepair Laptop Repair Branch',
              subheading: 'Walk-in diagnostics and same-day turnaround across our 7 UK high-street locations.',
            },
          },
          {
            id: 'sec_laptop_uk_cta',
            type: 'cta_banner',
            settings: {
              title: 'Need a Laptop or MacBook Repair Quote?',
              subtitle: 'Book online in 60 seconds or call +44 771 7103 365 for express walk-in service.',
              buttonText: 'Book a Repair',
              buttonLink: '/book-repair/',
            },
          },
        ];
        db.run(
          'INSERT INTO pages (id, slug, title, status, seo_json, sections_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            'page_laptop_repair_uk_01',
            'laptop-repair-shops-in-uk',
            'Laptop Repair Shop In UK',
            'published',
            JSON.stringify({
              metaTitle: 'No.1 & Affordable Laptop Repair Shop in UK - iRepair',
              metaDescription: 'Need reliable laptop repair in the UK? iRepair offers fast, affordable fixes for all major brands. Visit our UK branches or book your laptop repair online today.',
            }),
            JSON.stringify(laptopSections),
            now,
            now,
          ]
        );
      }
    } catch (seoSeedErr) {
      console.warn('SEO default seed warning:', seoSeedErr);
    }
  } catch (policyErr) {
    console.error('Failed to update terms, warranty, and policy pages in pages table:', policyErr);
  }

  db.save();
}
