import { WordPressCategory, Product } from '../types';
import { decodeHtmlEntities } from './decodeHtml';

export const STORE_BASE_URL = 'https://irepair-mobiles.co.uk';

/**
 * Normalizes a slug or path segment
 */
export function normalizeSlug(slug: string): string {
  return (slug || '').trim().toLowerCase().replace(/^\/+|\/+$/g, '');
}

/**
 * Builds the hierarchical URL dynamically from parent-child database relationships.
 * Supports arbitrary nesting depth.
 */
export function buildCategoryHierarchicalUrl(
  cat: WordPressCategory,
  allCategories: WordPressCategory[]
): string {
  if (cat.hierarchicalUrl) return cat.hierarchicalUrl;

  const catMap = new Map<number, WordPressCategory>(allCategories.map((c) => [c.id, c]));
  const pathSegments: string[] = [];
  let curr: WordPressCategory | undefined = cat;
  const visited = new Set<number>();

  while (curr && !visited.has(curr.id)) {
    visited.add(curr.id);
    let segment = curr.slug;
    // For Mobile Phones (id 1375): when acting as an ancestor/parent in subcategory URLs,
    // use 'mobiles' (e.g. /product-category/mobiles/iphones/), but when root itself: 'mobile-phones'
    if (curr.id === 1375 && curr.id !== cat.id) {
      segment = 'mobiles';
    }
    pathSegments.unshift(segment);

    if (curr.parent && curr.parent !== 0) {
      curr = catMap.get(curr.parent);
    } else {
      break;
    }
  }

  return `/product-category/${pathSegments.join('/')}/`;
}

/**
 * Helper to match category slugs with aliases (e.g. 'mobiles' <=> 'mobile-phones')
 */
export function matchesCategorySlug(cat: WordPressCategory, slug: string): boolean {
  const normSlug = normalizeSlug(slug);
  const catSlug = normalizeSlug(cat.slug);
  if (catSlug === normSlug) return true;
  if (cat.id === 1375 && (normSlug === 'mobiles' || normSlug === 'mobile-phones')) return true;
  return false;
}

/**
 * Resolves a hierarchical path (e.g. "mobiles/iphones" or "mobile-phones")
 * against all categories.
 */
export function resolveCategoryFromPath(
  categoryPath: string,
  allCategories: WordPressCategory[]
): {
  category: WordPressCategory | null;
  breadcrumbs: { id: number; name: string; slug: string; url: string }[];
  isRedirect: boolean;
  canonicalUrl: string;
} {
  const clean = categoryPath.replace(/^\/+|\/+$/g, '').replace(/^product-category\//, '');
  const segments = clean.split('/').map(normalizeSlug).filter(Boolean);

  if (segments.length === 0) {
    return { category: null, breadcrumbs: [], isRedirect: false, canonicalUrl: '' };
  }

  const catMap = new Map<number, WordPressCategory>(allCategories.map((c) => [c.id, c]));

  // 1. Hierarchical traversal
  let currentParentId = 0;
  let matched: WordPressCategory | null = null;
  const crumbs: { id: number; name: string; slug: string; url: string }[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const candidate = allCategories.find((c) => {
      const slugMatch = matchesCategorySlug(c, seg);
      if (!slugMatch) return false;
      return i === 0 ? c.parent === 0 || c.id === 1375 : c.parent === currentParentId;
    });

    if (!candidate) {
      // Special case: root alias for mobiles
      if (i === 0 && (seg === 'mobiles' || seg === 'mobile-phones')) {
        const rootMobile = allCategories.find((c) => c.id === 1375);
        if (rootMobile) {
          currentParentId = rootMobile.id;
          crumbs.push({
            id: rootMobile.id,
            name: decodeHtmlEntities(rootMobile.name),
            slug: rootMobile.slug,
            url: buildCategoryHierarchicalUrl(rootMobile, allCategories),
          });
          matched = rootMobile;
          continue;
        }
      }
      matched = null;
      break;
    }

    currentParentId = candidate.id;
    crumbs.push({
      id: candidate.id,
      name: decodeHtmlEntities(candidate.name),
      slug: candidate.slug,
      url: buildCategoryHierarchicalUrl(candidate, allCategories),
    });
    matched = candidate;
  }

  if (matched) {
    const canonicalUrl = buildCategoryHierarchicalUrl(matched, allCategories);
    const requestedUrl = `/product-category/${segments.join('/')}/`;
    const isRedirect = requestedUrl !== canonicalUrl;

    return {
      category: matched,
      breadcrumbs: crumbs,
      isRedirect,
      canonicalUrl,
    };
  }

  // 2. Old flat URL lookup (single segment that belongs to a nested category)
  if (segments.length === 1) {
    const single = segments[0];
    const flatMatch = allCategories.find((c) => matchesCategorySlug(c, single));
    if (flatMatch) {
      const fullCrumbs = getCategoryBreadcrumbs(flatMatch, allCategories);
      const canonicalUrl = buildCategoryHierarchicalUrl(flatMatch, allCategories);
      return {
        category: flatMatch,
        breadcrumbs: fullCrumbs,
        isRedirect: true, // Redirect old flat URL to canonical hierarchical URL
        canonicalUrl,
      };
    }
  }

  // 3. Last segment leaf match fallback
  const leafSeg = segments[segments.length - 1];
  const leafMatch = allCategories.find((c) => matchesCategorySlug(c, leafSeg));
  if (leafMatch) {
    const fullCrumbs = getCategoryBreadcrumbs(leafMatch, allCategories);
    const canonicalUrl = buildCategoryHierarchicalUrl(leafMatch, allCategories);
    return {
      category: leafMatch,
      breadcrumbs: fullCrumbs,
      isRedirect: true,
      canonicalUrl,
    };
  }

  return { category: null, breadcrumbs: [], isRedirect: false, canonicalUrl: '' };
}

/**
 * Returns complete breadcrumbs from root to category
 */
export function getCategoryBreadcrumbs(
  cat: WordPressCategory,
  allCategories: WordPressCategory[]
): { id: number; name: string; slug: string; url: string }[] {
  const crumbs: { id: number; name: string; slug: string; url: string }[] = [];
  const catMap = new Map<number, WordPressCategory>(allCategories.map((c) => [c.id, c]));
  let curr: WordPressCategory | undefined = cat;
  const visited = new Set<number>();

  while (curr && !visited.has(curr.id)) {
    visited.add(curr.id);
    crumbs.unshift({
      id: curr.id,
      name: decodeHtmlEntities(curr.name),
      slug: curr.slug,
      url: buildCategoryHierarchicalUrl(curr, allCategories),
    });
    if (curr.parent && curr.parent !== 0) {
      curr = catMap.get(curr.parent);
    } else {
      break;
    }
  }

  return crumbs;
}

/**
 * Returns all descendant category IDs and slugs for a category
 */
export function getCategoryDescendantSlugs(
  catId: number,
  allCategories: WordPressCategory[]
): Set<string> {
  const target = allCategories.find((c) => c.id === catId);
  const slugs = new Set<string>();
  if (!target) return slugs;

  slugs.add(target.slug.toLowerCase());
  if (target.id === 1375) {
    slugs.add('mobiles');
    slugs.add('mobile-phones');
  }

  const descendantIds = new Set<number>([catId]);
  let added = true;
  while (added) {
    added = false;
    for (const c of allCategories) {
      if (!descendantIds.has(c.id) && descendantIds.has(c.parent)) {
        descendantIds.add(c.id);
        slugs.add(c.slug.toLowerCase());
        added = true;
      }
    }
  }

  return slugs;
}

/**
 * Filters products that belong to a category or any of its descendant categories
 */
export function filterProductsByCategory(
  products: Product[],
  cat: WordPressCategory,
  allCategories: WordPressCategory[]
): Product[] {
  const allowedSlugs = getCategoryDescendantSlugs(cat.id, allCategories);

  return products.filter((p) => {
    const prodCat = (p.category || '').toLowerCase();
    if (allowedSlugs.has(prodCat)) return true;

    // Check partial slug matches
    for (const s of allowedSlugs) {
      if (prodCat === s || prodCat.startsWith(`${s}-`) || prodCat.endsWith(`-${s}`)) {
        return true;
      }
    }

    // Special category logic
    if (cat.id === 1375) {
      // Mobile Phones includes all phones
      if (prodCat.includes('phone') || prodCat.includes('iphone') || prodCat.includes('samsung') || prodCat.includes('pixel') || prodCat.includes('xiaomi') || prodCat.includes('nokia') || prodCat.includes('motorola')) {
        return true;
      }
    } else if (cat.id === 38) {
      // iPhones
      if (prodCat.includes('iphone') || p.title.toLowerCase().includes('iphone')) {
        return true;
      }
    } else if (cat.id === 278) {
      // Refurbished iPhones
      if ((prodCat.includes('refurbished-iphone') || prodCat.includes('used-iphone') || prodCat.includes('iphones')) && p.condition.includes('Refurbished')) {
        return true;
      }
    } else if (cat.id === 55 || cat.id === 1337) {
      // Laptop & Pc / Business Laptops
      if (prodCat.includes('laptop') || prodCat.includes('macbook') || p.title.toLowerCase().includes('macbook') || p.title.toLowerCase().includes('laptop')) {
        return true;
      }
    } else if (cat.id === 59 || cat.id === 68) {
      // Earbuds & Headphones
      if (prodCat.includes('earbud') || prodCat.includes('headphone') || p.title.toLowerCase().includes('earbud') || p.title.toLowerCase().includes('headphone')) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Resolves the hierarchical category path (e.g. "mobiles/iphones/iphone-14-series") for a product.
 * Respects WooCommerce parent-child category tree.
 */
export function getProductCategoryPath(
  product: Product,
  allCategories?: WordPressCategory[]
): string {
  if (product.categoryPath && product.categoryPath.trim()) {
    return product.categoryPath.replace(/^\/+|\/+$/g, '');
  }

  const title = (product.title || '').toLowerCase();
  const slug = (product.slug || '').toLowerCase();
  const cat = (product.category || '').toLowerCase();

  // 1. Tablets & iPads
  if (cat.includes('tablet') || cat.includes('ipad') || title.includes('ipad') || title.includes('tab') || title.includes('tablet')) {
    if (title.includes('ipad') || title.includes('apple')) return 'tablets-and-ipads/apple-ipad';
    if (title.includes('alcatel')) return 'tablets-and-ipads/alcatel-tabs';
    if (title.includes('amazon') || title.includes('fire')) return 'tablets-and-ipads/amazon-tablets';
    return 'tablets-and-ipads';
  }

  // 2. Laptops & MacBooks
  if (cat.includes('laptop') || title.includes('macbook') || title.includes('laptop') || title.includes('thinkpad') || title.includes('xps') || title.includes('elitebook') || title.includes('latitude')) {
    if (title.includes('macbook') || title.includes('apple')) return 'laptop-and-pc/apple-macbooks';
    if (title.includes('gaming') || title.includes('asus') || title.includes('rog') || title.includes('alienware')) return 'laptop-and-pc/gaming-laptops';
    return 'laptop-and-pc/business-laptops';
  }

  // 3. Accessories
  if (cat.includes('access') || title.includes('charger') || title.includes('cable') || title.includes('power bank') || title.includes('budi') || title.includes('veger') || title.includes('mount') || title.includes('case') || title.includes('earbud') || title.includes('headphone') || title.includes('adapter')) {
    if (title.includes('earbud') || title.includes('headphone') || title.includes('audio') || title.includes('airpod')) return 'accessories/earbuds-and-headphones';
    if (title.includes('case') || title.includes('cover')) return 'accessories/mobile-phone-cases';
    if (title.includes('holder') || title.includes('mount')) return 'accessories/mobile-holders';
    if (title.includes('apple')) return 'accessories/apple-accessories';
    return 'accessories/chargers-and-cables';
  }

  // 4. iPhones (under mobiles/iphones/[series])
  if (title.includes('iphone') || slug.includes('iphone')) {
    if (title.includes('16') || slug.includes('16')) return 'mobiles/iphones/iphone-16-series';
    if (title.includes('15') || slug.includes('15')) return 'mobiles/iphones/iphone-15-series';
    if (title.includes('14') || slug.includes('14')) return 'mobiles/iphones/iphone-14-series';
    if (title.includes('13') || slug.includes('13')) return 'mobiles/iphones/iphone-13-series';
    if (title.includes('12') || slug.includes('12')) return 'mobiles/iphones/iphone-12-series';
    if (title.includes('11') || slug.includes('11')) return 'mobiles/iphones/iphone-11-series';
    if (title.includes('xr') || title.includes('xs') || title.includes('iphone x') || slug.includes('iphone-x') || slug.includes('xr') || slug.includes('xs')) return 'mobiles/iphones/iphone-x-series';
    if (title.includes('se') || slug.includes('se')) return 'mobiles/iphones/iphone-se-series';
    if (title.includes('iphone 8') || slug.includes('iphone-8')) return 'mobiles/iphones/iphone-8-series';
    if (title.includes('iphone 7') || slug.includes('iphone-7')) return 'mobiles/iphones/iphone-7-series';
    return 'mobiles/iphones';
  }

  // 5. Samsung phones
  if (title.includes('samsung') || slug.includes('samsung') || title.includes('galaxy') || slug.includes('galaxy')) {
    return 'mobile-phones/samsung';
  }

  // 6. Google Pixel
  if (title.includes('pixel') || title.includes('google') || slug.includes('pixel')) {
    return 'mobile-phones/google-pixel';
  }

  // 7. Doro
  if (title.includes('doro') || slug.includes('doro')) {
    return 'mobile-phones/doro';
  }

  // 8. Alcatel
  if (title.includes('alcatel') || slug.includes('alcatel')) {
    return 'mobile-phones/alcatel';
  }

  // 9. Motorola
  if (title.includes('motorola') || title.includes('moto') || slug.includes('moto')) {
    return 'mobile-phones/motorola';
  }

  // 10. Huawei
  if (title.includes('huawei') || slug.includes('huawei')) {
    return 'mobile-phones/huawei';
  }

  // 11. OnePlus
  if (title.includes('oneplus') || slug.includes('oneplus')) {
    return 'mobile-phones/oneplus';
  }

  // 12. Nokia
  if (title.includes('nokia') || slug.includes('nokia')) {
    return 'mobile-phones/nokia';
  }

  // If allCategories is supplied and didn't hit a specific device pattern above, match against category table
  if (allCategories && allCategories.length > 0) {
    const matchedCat = allCategories.find((c) => matchesCategorySlug(c, cat));
    if (matchedCat) {
      const fullUrl = buildCategoryHierarchicalUrl(matchedCat, allCategories);
      const cleanPath = fullUrl.replace(/^\/product-category\/?/, '').replace(/\/+$/, '');
      if (cleanPath) return cleanPath;
    }
  }

  // 8. Alcatel
  if (title.includes('alcatel') || slug.includes('alcatel')) {
    return 'mobile-phones/alcatel';
  }

  // 9. Motorola
  if (title.includes('motorola') || title.includes('moto') || slug.includes('moto')) {
    return 'mobile-phones/motorola';
  }

  // 10. Huawei
  if (title.includes('huawei') || slug.includes('huawei')) {
    return 'mobile-phones/huawei';
  }

  // 11. OnePlus
  if (title.includes('oneplus') || slug.includes('oneplus')) {
    return 'mobile-phones/oneplus';
  }

  // 12. Nokia
  if (title.includes('nokia') || slug.includes('nokia')) {
    return 'mobile-phones/nokia';
  }

  return 'mobile-phones';
}

/**
 * Builds the canonical product URL: /product/{product-slug}/
 * User Requirement: "product url should be /product/product-slug but the breadcrumbs will have categories herarical strcutruee only"
 */
export function buildProductHierarchicalUrl(
  product: Product,
  _allCategories?: WordPressCategory[]
): string {
  const pSlug = (product.slug || product.id).replace(/^\/+|\/+$/g, '');
  return `/product/${pSlug}/`;
}

export function buildProductUrl(product: Product): string {
  return buildProductHierarchicalUrl(product);
}

/**
 * Parses any incoming product URL path (nested or flat) into its components:
 * Supports both /product/:slug and legacy /product/{category-path}/:slug
 */
export function parseProductRoute(pathname: string): {
  productSlug: string;
  categoryPath: string;
  isHierarchical: boolean;
} {
  const clean = pathname.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+|\/+$/g, '');
  if (!clean.startsWith('product')) {
    return { productSlug: '', categoryPath: '', isHierarchical: false };
  }

  const withoutPrefix = clean.replace(/^product\/?/, '');
  const segments = withoutPrefix.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { productSlug: '', categoryPath: '', isHierarchical: false };
  }

  // Last segment is the product slug
  const productSlug = segments[segments.length - 1];
  const categoryPath = segments.slice(0, -1).join('/');
  const isHierarchical = segments.length > 1;

  return { productSlug, categoryPath, isHierarchical };
}

/**
 * Returns complete hierarchical breadcrumbs for a product
 * Preserves the full parent-child category structure while the URL remains /product/{product-slug}/
 */
export function getProductCategoryBreadcrumbs(
  product: Product,
  allCategories: WordPressCategory[]
): { id: number | string; name: string; slug: string; url: string }[] {
  const catPath = getProductCategoryPath(product, allCategories);
  const resolved = resolveCategoryFromPath(catPath, allCategories);

  if (resolved.breadcrumbs && resolved.breadcrumbs.length > 0) {
    return resolved.breadcrumbs.map((c) => ({
      ...c,
      name: decodeHtmlEntities(c.name),
    }));
  }

  // Fallback: build crumbs from path segments
  const segments = catPath.split('/').filter(Boolean);
  const crumbs: { id: number | string; name: string; slug: string; url: string }[] = [];
  let accumulatedPath = '';

  segments.forEach((seg, idx) => {
    accumulatedPath = accumulatedPath ? `${accumulatedPath}/${seg}` : seg;
    const catMatch = allCategories.find((c) => matchesCategorySlug(c, seg));
    const rawName = catMatch ? catMatch.name : seg.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    crumbs.push({
      id: catMatch ? catMatch.id : `crumb-${idx}`,
      name: decodeHtmlEntities(rawName),
      slug: seg,
      url: `/product-category/${accumulatedPath}/`,
    });
  });

  return crumbs;
}
