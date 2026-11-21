import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Smartphone } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  EditorialCategoryItem,
  CategoryEditorialRailSettings,
  DEFAULT_EDITORIAL_CATEGORY_ITEMS,
  CATEGORY_EDITORIAL_RAIL_DEFAULTS,
} from './categoryEditorialRailDefaults';

export type { EditorialCategoryItem, CategoryEditorialRailSettings };
export { DEFAULT_EDITORIAL_CATEGORY_ITEMS, CATEGORY_EDITORIAL_RAIL_DEFAULTS };

const SLUG_IMAGE_FALLBACKS: Record<string, string> = {
  'mobile-phones': '/images/categories/editorial_smartphones.jpg',
  'tablets-and-ipads': '/images/categories/editorial_tablets.jpg',
  'laptop-and-pc': '/images/categories/editorial_laptops.jpg',
  'earbuds-and-headphones': '/images/categories/editorial_headphones.jpg',
  'gaming-headsets': '/images/categories/editorial_headphones.jpg',
  'gaming-accessories': '/images/categories/editorial_gaming.jpg',
  'apple-watches': '/images/categories/editorial_smartwatches.jpg',
  'mobile-phone-cases': '/images/categories/editorial_cases.jpg',
  'iphone-cases': '/images/categories/editorial_cases.jpg',
  'chargers-and-cables': '/images/categories/editorial_chargers.jpg',
  'mobile-charger': '/images/categories/editorial_chargers.jpg',
  accessories: '/images/categories/editorial_chargers.jpg',
};

interface CategoryEditorialRailWidgetProps {
  settings?: CategoryEditorialRailSettings;
  commonSettings?: Record<string, any>;
  isPreview?: boolean;
}

export const CategoryEditorialRailWidget: React.FC<CategoryEditorialRailWidgetProps> = ({
  settings = {},
  isPreview = false,
}) => {
  const { categories = [], navigateToCategory, setCurrentPage } = useApp();
  const trackRef = useRef<HTMLDivElement>(null);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const merged = {
    ...CATEGORY_EDITORIAL_RAIL_DEFAULTS,
    ...settings,
  };

  if (merged.enableWidget === false && !isPreview) {
    return null;
  }

  const eyebrowText = merged.eyebrowText || 'REPAIR & BUYBACK DIRECTORY';
  const headingText = merged.headingText || 'Browse by Category';
  const showModelCount = merged.showModelCount !== false;
  const syncMode = merged.syncMode || 'custom_order';
  const useLiveDbCounts = Boolean(merged.useLiveDbCounts);
  const ctaText = merged.ctaText || 'Explore';
  const accentColor = merged.accentColor || '#E6007E';
  const backgroundColor = merged.backgroundColor || '#FFFFFF';
  const highlightFirstByDefault = merged.highlightFirstByDefault !== false;

  // Build parent->children map once to compute live DB subtree counts accurately
  const subtreeCountById = useMemo(() => {
    const countMap = new Map<number, number>();
    if (!Array.isArray(categories) || categories.length === 0) return countMap;

    const childrenByParent = new Map<number, any[]>();
    const byId = new Map<number, any>();

    categories.forEach((c: any) => {
      const id = Number(c.id);
      const parentId = Number(c.parent || 0);
      byId.set(id, c);
      if (!childrenByParent.has(parentId)) {
        childrenByParent.set(parentId, []);
      }
      childrenByParent.get(parentId)!.push(c);
    });

    const computeSubtree = (id: number, visited = new Set<number>()): number => {
      if (countMap.has(id)) return countMap.get(id)!;
      if (visited.has(id)) return 0;
      visited.add(id);

      const node = byId.get(id);
      let total = Number(node?.count || 0);
      const kids = childrenByParent.get(id) || [];
      for (const kid of kids) {
        total += computeSubtree(Number(kid.id), visited);
      }
      countMap.set(id, total);
      return total;
    };

    categories.forEach((c: any) => computeSubtree(Number(c.id)));
    return countMap;
  }, [categories]);

  const resolvedItems = useMemo<EditorialCategoryItem[]>(() => {
    const catById = new Map<number, any>();
    const catBySlug = new Map<string, any>();

    if (Array.isArray(categories)) {
      categories.forEach((cat: any) => {
        if (cat?.id !== undefined) catById.set(Number(cat.id), cat);
        if (cat?.slug) catBySlug.set(String(cat.slug).toLowerCase(), cat);
      });
    }

    if (syncMode === 'auto_sync_db' && Array.isArray(categories) && categories.length > 0) {
      const excludedSlugs = new Set(['uncategorized']);
      const preferredOrder = [
        'mobile-phones',
        'tablets-and-ipads',
        'laptop-and-pc',
        'earbuds-and-headphones',
        'gaming-accessories',
        'apple-watches',
        'mobile-phone-cases',
        'chargers-and-cables',
        'accessories',
        'phone-parts',
      ];

      const topOrTargetCats = categories.filter((c: any) => {
        const slug = String(c?.slug || '').toLowerCase();
        if (!slug || excludedSlugs.has(slug)) return false;
        return Number(c.parent || 0) === 0 || preferredOrder.includes(slug);
      });

      const sortedCats = [...topOrTargetCats].sort((a: any, b: any) => {
        const idxA = preferredOrder.indexOf(String(a.slug || '').toLowerCase());
        const idxB = preferredOrder.indexOf(String(b.slug || '').toLowerCase());
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return (Number(b.count || 0)) - (Number(a.count || 0));
      });

      return sortedCats.slice(0, 12).map((cat: any) => {
        const slug = String(cat.slug || '').toLowerCase();
        const defaultMatch = DEFAULT_EDITORIAL_CATEGORY_ITEMS.find(
          (d) => Number(d.categoryId) === Number(cat.id) || d.categorySlug === slug
        );
        const dbTotal = subtreeCountById.get(Number(cat.id)) ?? Number(cat.count || 0);
        const fallbackImage =
          cat.image ||
          defaultMatch?.image ||
          SLUG_IMAGE_FALLBACKS[slug] ||
          '/images/categories/editorial_smartphones.jpg';

        const countLabel =
          dbTotal > 0
            ? `${dbTotal}+ models`
            : defaultMatch?.modelCountLabel || 'View range';

        return {
          id: `db_cat_${cat.id}`,
          categoryId: Number(cat.id),
          categorySlug: cat.slug,
          title: defaultMatch?.title || cat.name,
          modelCountLabel: countLabel,
          image: fallbackImage,
          link: cat.hierarchicalUrl || `/product-category/${cat.slug}/`,
          altText: cat.name,
        };
      });
    }

    const baseItems =
      Array.isArray(merged.items) && merged.items.length > 0
        ? merged.items
        : DEFAULT_EDITORIAL_CATEGORY_ITEMS;

    return baseItems
      .filter((item) => !item.hidden)
      .map((item, idx) => {
        const matchedCat =
          (item.categoryId !== undefined ? catById.get(Number(item.categoryId)) : undefined) ||
          (item.categorySlug ? catBySlug.get(item.categorySlug.toLowerCase()) : undefined);

        const resolvedLink =
          matchedCat?.hierarchicalUrl ||
          (matchedCat?.slug ? `/product-category/${matchedCat.slug}/` : '') ||
          item.link ||
          '/shop';

        let resolvedCountLabel = item.modelCountLabel || '';
        if (useLiveDbCounts && matchedCat) {
          const dbTotal =
            subtreeCountById.get(Number(matchedCat.id)) ?? Number(matchedCat.count || 0);
          if (dbTotal > 0) {
            resolvedCountLabel = `${dbTotal}+ models`;
          }
        } else if (!resolvedCountLabel && matchedCat) {
          const dbTotal =
            subtreeCountById.get(Number(matchedCat.id)) ?? Number(matchedCat.count || 0);
          resolvedCountLabel = dbTotal > 0 ? `${dbTotal}+ models` : 'View range';
        }

        const slugKey = (item.categorySlug || matchedCat?.slug || '').toLowerCase();
        const resolvedImage =
          item.image ||
          matchedCat?.image ||
          SLUG_IMAGE_FALLBACKS[slugKey] ||
          '/images/categories/editorial_smartphones.jpg';

        return {
          ...item,
          id: item.id || `cat_ed_${idx}`,
          title: item.title || matchedCat?.name || 'Category',
          link: resolvedLink,
          image: resolvedImage,
          modelCountLabel: resolvedCountLabel,
          altText: item.altText || item.title || matchedCat?.name || 'Category image',
        };
      });
  }, [categories, merged.items, subtreeCountById, syncMode, useLiveDbCounts]);

  const updateScrollButtons = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScroll > 4 && el.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const el = trackRef.current;
    if (!el) return;

    const onScroll = () => updateScrollButtons();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateScrollButtons);

    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [resolvedItems.length, updateScrollButtons]);

  const handleScrollBy = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const firstCard = el.firstElementChild as HTMLElement | null;
    const stepWidth = firstCard ? firstCard.offsetWidth * 2 : Math.round(el.clientWidth * 0.45);
    el.scrollBy({
      left: direction * stepWidth,
      behavior: 'smooth',
    });
  };

  const handleItemClick = (item: EditorialCategoryItem, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isPreview) {
      e.preventDefault();
      return;
    }

    const link = item.link || '/shop';
    if (link.startsWith('http://') || link.startsWith('https://')) {
      return;
    }

    e.preventDefault();
    if (link.startsWith('/product-category/')) {
      const cleanPath = link.replace(/^\/product-category\//, '').replace(/\/+$/, '');
      if (typeof navigateToCategory === 'function') {
        navigateToCategory(cleanPath);
        return;
      }
    }

    const cleanRoute = link.replace(/^\/+|\/+$/g, '');
    if (typeof setCurrentPage === 'function') {
      setCurrentPage((cleanRoute || 'home') as any);
    }
  };

  const activeIdx =
    hoveredIdx !== null ? hoveredIdx : highlightFirstByDefault ? 0 : -1;

  return (
    <section
      className="w-full py-8 md:py-11"
      style={{ backgroundColor }}
      aria-label={headingText}
    >
      {/* Header Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-5 md:mb-6 flex items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrowText && (
            <p
              className="text-xs font-bold tracking-wider uppercase"
              style={{ color: accentColor }}
            >
              {eyebrowText}
            </p>
          )}
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#0B0D12] tracking-tight mt-1.5 leading-tight">
            {headingText}
          </h2>
        </div>

        {/* Circular Carousel Navigation Arrows */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleScrollBy(-1)}
            disabled={!canScrollLeft}
            aria-label="Scroll categories left"
            className="w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-700 hover:border-[#E6007E] hover:text-[#E6007E] disabled:opacity-35 disabled:hover:border-slate-200 disabled:hover:text-slate-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6007E]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScrollBy(1)}
            disabled={!canScrollRight}
            aria-label="Scroll categories right"
            className="w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-700 hover:border-[#E6007E] hover:text-[#E6007E] disabled:opacity-35 disabled:hover:border-slate-200 disabled:hover:text-slate-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6007E]"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editorial Hairline Rail (Full-width top & bottom 1px #E2E8F0 borders) */}
      <div className="w-full border-t border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={trackRef}
            onMouseLeave={() => setHoveredIdx(null)}
            className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory divide-x divide-[#E2E8F0] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {resolvedItems.map((item, idx) => {
              const isHighlighted = idx === activeIdx;
              const imgFailed = Boolean(failedImages[item.id]);

              return (
                <a
                  key={item.id}
                  href={item.link}
                  onClick={(e) => handleItemClick(item, e)}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onFocus={() => setHoveredIdx(idx)}
                  onBlur={() => setHoveredIdx(null)}
                  className="group relative flex-none w-[47%] sm:w-[32%] md:w-[31%] lg:w-[18.1818%] snap-start px-4 py-4 md:px-5 md:py-5 flex flex-col items-center text-center transition-colors duration-200 hover:bg-slate-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E6007E]"
                >
                  {/* Hardware Product Image (mix-blend-multiply fuses pure-white background invisibly) */}
                  <div className="w-full h-16 md:h-20 flex items-center justify-center mb-3">
                    {!imgFailed && item.image ? (
                      <img
                        src={item.image}
                        alt={item.altText || item.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [item.id]: true }))
                        }
                        className="max-h-full max-w-[96px] w-auto object-contain mix-blend-multiply transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-105">
                        <Smartphone className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* Bold Dark Category Title */}
                  <h3 className="text-[14px] md:text-[15px] font-bold text-[#0B0D12] tracking-tight leading-snug">
                    {item.title}
                  </h3>

                  {/* Muted Slate Model Count Subtitle */}
                  {showModelCount && item.modelCountLabel && (
                    <p className="text-xs text-slate-500 font-medium mt-0.5 tabular-nums">
                      {item.modelCountLabel}
                    </p>
                  )}

                  {/* Interactive "Explore →" CTA (reserved height prevents vertical shift) */}
                  <div className="mt-2 h-4 flex items-center justify-center">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold transition-all duration-200 ${
                        isHighlighted
                          ? 'opacity-100 translate-y-0'
                          : 'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'
                      }`}
                      style={{ color: accentColor }}
                    >
                      <span>{ctaText}</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                  </div>

                  {/* 2px Bottom Highlight Bar */}
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] transition-all duration-200 origin-center ${
                      isHighlighted
                        ? 'opacity-100 scale-x-100'
                        : 'opacity-0 scale-x-0 group-hover:opacity-100 group-hover:scale-x-100'
                    }`}
                    style={{ backgroundColor: accentColor }}
                  />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CategoryEditorialRailWidget;
