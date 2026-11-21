/**
 * Shared Reserved Slugs and Route Collision Resolver Constants
 * Used by server routing, SEO injector, API validators, and client routers.
 */

export const RESERVED_SLUGS: readonly string[] = Object.freeze([
  '',
  'home',
  'shop',
  'cart',
  'checkout',
  'account',
  'my-account',
  'order-confirmation',
  'track-order',
  'track-repair',
  'book-repair',
  'quote',
  'repairs',
  'services',
  'locations',
  'blogs',
  'blog',
  'product',
  'product-category',
  'admin',
  'admin-login',
  'api',
  'category',
  'blog-category',
  'tag',
  'author',
  'feed',
  'sitemap.xml',
  'robots.txt',
  'wp-json',
  'wp-admin',
  'wp-content',
  'wp-includes',
  'about',
  'about-us',
  'contact',
  'contact-us',
  'career',
  'careers',
  'jobs',
  'apply-now',
  'apply',
  'job-application',
  'warranty',
  'warranty-policy',
  'terms',
  'terms-of-use',
  'privacy',
  'privacy-policy',
  'shipping',
  'shipping-delivery',
  'shipping-delivery-policy',
  'shipping-and-delivery-policy',
  'returns',
  'return-cancellation',
  'return-cancellation-policy',
  'return-and-cancellation-policy',
  'cancellation-policy',
  'sell-my-phone',
  'sell-your-devices',
  'sell-old-phone',
  'sell-device',
  'sell-devices',
  'mobile-phone-repair-shops-in-uk',
  'mobile-phone-repair-shops',
  'repair-shops-in-uk',
  'mobile-phone-repair-shop-in-norwich',
  'repair-shop-in-norwich',
  'norwich-repair-shop',
  'mobile-phone-repair-basingstoke',
  'repair-basingstoke',
  'basingstoke-repair-shop',
  'phone-repairing-services-southend',
  'repair-southend',
  'southend-repair-shop',
  'mobile-phone-repair-southend',
  'mobile-phone-repair-shop-eastbourne',
  'repair-shop-eastbourne',
  'eastbourne-repair-shop',
  'mobile-phone-repair-eastbourne',
  'mobile-phone-repair-shop-in-reading',
  'mobile-phone-repair-reading',
  'repair-shop-in-reading',
  'reading-repair-shop',
  'repair-reading',
  'mobile-phone-repair-service-solihull',
  'mobile-phone-repair-solihull',
  'repair-service-solihull',
  'solihull-repair-shop',
  'repair-solihull',
  'mobile-phone-repair-shop-solihull',
  'mobile-repair-shop-in-ipswich',
  'mobile-phone-repair-shop-in-ipswich',
  'repair-shop-in-ipswich',
  'ipswich-repair-shop',
  'repair-ipswich',
  'offers',
  'accessories',
  'cases',
  'reset-password',
]);

const RESERVED_SET = new Set(RESERVED_SLUGS.map((s) => s.toLowerCase()));

/**
 * Normalizes a URL slug or path:
 * Removes protocol, host, query string, hash, and leading/trailing slashes.
 */
export function cleanSlug(input: string): string {
  if (!input) return '';
  let str = input.trim().toLowerCase();
  str = str.replace(/^https?:\/\/[^/]+/i, '');
  str = str.split('?')[0].split('#')[0];
  str = str.replace(/^\/+|\/+$/g, '');
  return str;
}

/**
 * Checks whether a given slug is reserved by core app routes.
 */
export function isReservedSlug(slug: string): boolean {
  const normalized = cleanSlug(slug);
  if (!normalized) return true;
  if (RESERVED_SET.has(normalized)) return true;
  // Patterns like product/*, category/*, etc.
  const prefix = normalized.split('/')[0];
  if (['product', 'product-category', 'category', 'blog-category', 'tag', 'author', 'admin', 'api', 'uploads'].includes(prefix)) {
    return true;
  }
  return false;
}
