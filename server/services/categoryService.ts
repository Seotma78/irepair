import { DatabaseWrapper } from '../db';

export interface CategoryRecord {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  count: number;
  image: string;
  hierarchical_url: string;
  seo_json: string;
  sort_order: number;
  updated_at: string;
}

export interface CategorySeoSettings {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  permalink?: string;
  categoryUrl?: string;
  focusKeyword?: string;
  ogImage?: string;
  noindex?: boolean;
}

export interface ResolvedCategory {
  category: CategoryRecord & { seo: CategorySeoSettings };
  breadcrumbs: { id: number; name: string; slug: string; url: string }[];
  hierarchicalUrl: string;
  canonicalUrl: string;
  children: { id: number; name: string; slug: string; url: string; count: number }[];
  redirect?: string;
}

export const STORE_BASE_URL = 'https://irepair-mobiles.co.uk';

/**
 * Normalizes category slugs: handles aliases such as 'mobiles' <=> 'mobile-phones'
 */
export function normalizeSlug(slug: string): string {
  const clean = (slug || '').trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  return clean;
}

/**
 * Builds the hierarchical URL for a category dynamically by traversing up through parent-child relationships.
 * Supports arbitrary nesting depth.
 */
export function buildHierarchicalUrl(
  categoryId: number,
  categoryMap: Map<number, CategoryRecord>,
  visited: Set<number> = new Set()
): string {
  const cat = categoryMap.get(categoryId);
  if (!cat) return '/product-category/';

  if (visited.has(categoryId)) {
    // Cyclic loop prevention
    return `/product-category/${cat.slug}/`;
  }
  visited.add(categoryId);

  const pathSegments: string[] = [];
  let current: CategoryRecord | undefined = cat;

  while (current) {
    let segment = current.slug;
    // For category 1375 (Mobile Phones): when acting as a parent for iPhones / subcategories,
    // we use 'mobiles' to produce '/product-category/mobiles/iphones/', but when root alone,
    // category 1375's slug is 'mobile-phones'.
    // If the category itself is 1375 and has no parent: its slug is 'mobile-phones'.
    // If it's an ancestor of another category, we use 'mobiles' if cat.id === 1375 to honor the requested hierarchy.
    if (current.id === 1375 && current.id !== categoryId) {
      segment = 'mobiles';
    }
    pathSegments.unshift(segment);

    if (current.parent && current.parent !== 0) {
      if (visited.has(current.parent)) break;
      visited.add(current.parent);
      current = categoryMap.get(current.parent);
    } else {
      break;
    }
  }

  const cleanPath = pathSegments.map((s) => s.replace(/^\/+|\/+$/g, '')).join('/');
  return `/product-category/${cleanPath}/`;
}

/**
 * Generates default or updated SEO settings for a category based on its hierarchical URL and slug.
 */
export function generateCategorySeo(
  cat: { name: string; slug: string; description?: string },
  hierarchicalUrl: string,
  existingSeo?: CategorySeoSettings
): CategorySeoSettings {
  const canonicalUrl = `${STORE_BASE_URL}${hierarchicalUrl}`;
  return {
    metaTitle: existingSeo?.metaTitle || `${cat.name} | iRepair Mobiles UK`,
    metaDescription:
      existingSeo?.metaDescription ||
      cat.description ||
      `Buy certified ${cat.name} online at iRepair Mobiles UK. 12-month warranty, express delivery, and 70-point quality check on all devices.`,
    canonicalUrl,
    permalink: hierarchicalUrl,
    categoryUrl: hierarchicalUrl,
    focusKeyword: existingSeo?.focusKeyword || cat.name.toLowerCase(),
    ogImage: existingSeo?.ogImage || '',
    noindex: Boolean(existingSeo?.noindex),
  };
}

/**
 * Recalculates hierarchical URLs and SEO settings for all categories and their descendants.
 */
export function recalculateAllCategoryUrls(db: DatabaseWrapper): void {
  const rows = db.all<CategoryRecord>('SELECT * FROM categories');
  const catMap = new Map<number, CategoryRecord>(rows.map((r) => [r.id, r]));

  for (const cat of rows) {
    const hierarchicalUrl = buildHierarchicalUrl(cat.id, catMap);
    let seo: CategorySeoSettings = {};
    try {
      seo = JSON.parse(cat.seo_json || '{}');
    } catch (_) {}

    seo.categoryUrl = hierarchicalUrl;
    seo.permalink = hierarchicalUrl;
    seo.canonicalUrl = `${STORE_BASE_URL}${hierarchicalUrl}`;

    db.run(
      'UPDATE categories SET hierarchical_url = ?, seo_json = ?, updated_at = ? WHERE id = ?',
      [hierarchicalUrl, JSON.stringify(seo), new Date().toISOString(), cat.id]
    );
  }
}

/**
 * Resolves an incoming path (e.g. ['mobiles', 'iphones']) to a category record.
 * Handles parent-child slug matching, slug aliases, and redirects from old URLs.
 */
export function resolveCategoryPath(
  pathSegments: string[],
  categoryList: CategoryRecord[]
): {
  category: CategoryRecord | null;
  breadcrumbs: { id: number; name: string; slug: string; url: string }[];
  isRedirect: boolean;
  canonicalUrl: string;
} {
  const normalized = pathSegments.map(normalizeSlug).filter(Boolean);
  if (normalized.length === 0) {
    return { category: null, breadcrumbs: [], isRedirect: false, canonicalUrl: '' };
  }

  const catMap = new Map<number, CategoryRecord>(categoryList.map((c) => [c.id, c]));

  // Helper to match slug with aliases:
  const matchesSlug = (cat: CategoryRecord, slug: string): boolean => {
    if (cat.slug.toLowerCase() === slug.toLowerCase()) return true;
    if (cat.id === 1375 && (slug === 'mobiles' || slug === 'mobile-phones')) return true;
    return false;
  };

  // 1. Try hierarchical match through parent-child sequence
  let currentParentId = 0;
  let matchedCat: CategoryRecord | null = null;
  const breadcrumbs: { id: number; name: string; slug: string; url: string }[] = [];

  for (let i = 0; i < normalized.length; i++) {
    const segment = normalized[i];
    const candidate = categoryList.find(
      (c) => matchesSlug(c, segment) && (i === 0 ? c.parent === 0 : c.parent === currentParentId)
    );

    if (!candidate) {
      // If root match didn't find parent === 0, check if segment is a root alias or parent
      if (i === 0 && (segment === 'mobiles' || segment === 'mobile-phones')) {
        const rootMobile = categoryList.find((c) => c.id === 1375);
        if (rootMobile) {
          currentParentId = rootMobile.id;
          breadcrumbs.push({
            id: rootMobile.id,
            name: rootMobile.name,
            slug: rootMobile.slug,
            url: rootMobile.hierarchical_url,
          });
          matchedCat = rootMobile;
          continue;
        }
      }
      matchedCat = null;
      break;
    }

    currentParentId = candidate.id;
    breadcrumbs.push({
      id: candidate.id,
      name: candidate.name,
      slug: candidate.slug,
      url: candidate.hierarchical_url,
    });
    matchedCat = candidate;
  }

  // 2. If matched hierarchically, check if the URL used matches the category's canonical hierarchical URL
  if (matchedCat) {
    const requestPath = `/product-category/${normalized.join('/')}/`;
    const canonicalPath = matchedCat.hierarchical_url;
    const isRedirect = requestPath !== canonicalPath;

    return {
      category: matchedCat,
      breadcrumbs,
      isRedirect,
      canonicalUrl: canonicalPath,
    };
  }

  // 3. Fallback: Old flat URL lookup (e.g. /product-category/iphones/ or /product-category/business-laptops/)
  // Requirement 7: Redirect old URLs to their corresponding new hierarchical URLs
  if (normalized.length === 1) {
    const singleSlug = normalized[0];
    const oldMatch = categoryList.find((c) => matchesSlug(c, singleSlug));
    if (oldMatch) {
      // Build full breadcrumbs for this category
      const fullBreadcrumbs = buildBreadcrumbsForCategory(oldMatch.id, catMap);
      return {
        category: oldMatch,
        breadcrumbs: fullBreadcrumbs,
        isRedirect: true, // Should 301 redirect to oldMatch.hierarchical_url
        canonicalUrl: oldMatch.hierarchical_url,
      };
    }
  }

  // 4. Fallback: leaf slug match if parent in path was slightly different
  const lastSegment = normalized[normalized.length - 1];
  const leafMatch = categoryList.find((c) => matchesSlug(c, lastSegment));
  if (leafMatch) {
    const fullBreadcrumbs = buildBreadcrumbsForCategory(leafMatch.id, catMap);
    return {
      category: leafMatch,
      breadcrumbs: fullBreadcrumbs,
      isRedirect: true,
      canonicalUrl: leafMatch.hierarchical_url,
    };
  }

  return { category: null, breadcrumbs: [], isRedirect: false, canonicalUrl: '' };
}

/**
 * Builds breadcrumbs for a given category by traversing up to root.
 */
export function buildBreadcrumbsForCategory(
  categoryId: number,
  catMap: Map<number, CategoryRecord>
): { id: number; name: string; slug: string; url: string }[] {
  const crumbs: { id: number; name: string; slug: string; url: string }[] = [];
  let current: CategoryRecord | undefined = catMap.get(categoryId);
  const visited = new Set<number>();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    crumbs.unshift({
      id: current.id,
      name: current.name,
      slug: current.slug,
      url: current.hierarchical_url,
    });
    if (current.parent && current.parent !== 0) {
      current = catMap.get(current.parent);
    } else {
      break;
    }
  }

  return crumbs;
}
