import React, { useState, useMemo, useEffect } from 'react';
import { WidgetRenderProps } from '../types';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { ProductCard } from '../../components/ProductCard';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Tag
} from 'lucide-react';

export interface TrendingProductsShowcaseSettings {
  // General
  widgetName?: string;
  eyebrowText?: string;
  showEyebrow?: boolean;
  showSectionHeading?: boolean;
  sectionHeading?: string;
  showSubtitle?: boolean;
  subtitle?: string;
  sectionSubheading?: string;
  headingAlignment?: 'left' | 'center' | 'right';
  headingAlign?: 'left' | 'center' | 'right';
  layoutWidth?: 'boxed' | 'full' | 'narrow';
  backgroundColor?: string;
  sectionPaddingTop?: number;
  sectionPaddingBottom?: number;
  sectionMarginTop?: number;
  sectionMarginBottom?: number;
  enableWidget?: boolean;

  // Phone Filtering & Constraints
  phonesOnly?: boolean;
  onlyNewPhones?: boolean;
  refurbishedOnly?: boolean;
  brandFilter?: string; // e.g. 'apple', 'samsung', 'google', or 'all'

  // Category Filters
  showCategories?: boolean;
  categoryFilterStyle?: 'pills' | 'tabs' | 'buttons' | 'underlined';
  allProductsLabel?: string;
  showAllCategory?: boolean;
  customCategories?: Array<{ id?: string; label: string; slug: string }>;
  defaultCategory?: string;
  categoryBtnRadius?: 'full' | 'lg' | 'md' | 'none';
  categorySpacing?: number;

  // Display Mode & Carousel Controls
  displayMode?: 'carousel' | 'grid';
  showArrows?: boolean;
  showDots?: boolean;
  arrowPosition?: 'sides' | 'top_right' | 'bottom_center';
  arrowShape?: 'rounded' | 'circle' | 'square';
  arrowBgColor?: string;
  arrowIconColor?: string;
  autoplay?: boolean;
  autoplayInterval?: number;
  pauseOnHover?: boolean;
  loop?: boolean;
  itemsPerScroll?: number;

  // Responsive Visible Product Counts
  visibleDesktop?: number; // e.g. 4 or 5
  visibleTablet?: number;  // e.g. 3
  visibleMobile?: number;  // e.g. 1 or 2
  gridRows?: number;
  cardGap?: number; // in px

  // Product Data Filtering & Sorting
  selectionStrategy?: 'all' | 'category' | 'brand' | 'featured' | 'trending' | 'sale' | 'manual';
  selectedCategories?: string[];
  selectedBrands?: string[];
  selectedProductIds?: string[];
  sortBy?: 'popularity' | 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'discount';
  inStockOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
  maxProductsLimit?: number;

  // Card Styling & Presets (kept for Admin schema backwards compatibility)
  cardPreset?: 'minimal' | 'modern' | 'elevated' | 'bordered';
  cardBgColor?: string;
  cardBorderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  cardBorderColor?: string;
  cardBorderWidth?: number;
  cardPadding?: number;
  cardShadow?: 'none' | 'sm' | 'md' | 'lg';
  cardHoverLift?: boolean;
  imageAreaHeight?: number;
  imageFit?: 'contain' | 'cover';
  imageHoverZoom?: boolean;

  // Typography
  headingFontSize?: number;
  headingColor?: string;
  headingFontWeight?: 'normal' | 'semibold' | 'bold' | 'extrabold';
  subtitleFontSize?: number;
  subtitleColor?: string;
  productTitleFontSize?: number;
  productTitleColor?: string;
  productTitleLines?: number;

  // Price & Badges
  showPrices?: boolean;
  showRegularPrice?: boolean;
  priceColor?: string;
  salePriceColor?: string;
  currencySymbol?: string;
  currencyPosition?: 'left' | 'right';
  showDiscountBadge?: boolean;
  discountBadgeText?: string;
  discountBadgeBg?: string;
  discountBadgeColor?: string;

  // CTA Button
  showCtaButton?: boolean;
  ctaButtonText?: string;
  ctaAction?: 'view_product' | 'add_to_cart' | 'open_shop';
  ctaButtonBg?: string;
  ctaButtonTextCol?: string;
  ctaButtonHoverBg?: string;
  ctaButtonRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  ctaButtonWidth?: 'full' | 'auto';
  ctaButtonIcon?: boolean;

  // Empty State
  emptyStateMessage?: string;
}

// Helper to strictly detect phone devices vs accessories/laptops/audio/tablets
export function isPhoneProduct(p: Product): boolean {
  const nonPhoneTerms = [
    'macbook', 'laptop', 'tablet', 'ipad', 'tab ', 'tab a', 'tab s',
    'charger', 'cable', 'power bank', 'powerbank', 'earbud', 'headphone',
    'watch', 'case', 'holder', 'adapter', 'glass', 'protector', 'audio',
    'cover', 'sleeve', 'holster', 'shield', 'guard', 'stand', 'mount',
    'strap', 'band'
  ];
  const title = (p.title || '').toLowerCase();
  const cat = (p.category || '').toLowerCase();
  const catPath = (p.categoryPath || '').toLowerCase();
  if (nonPhoneTerms.some((t) => cat.includes(t) || catPath.includes(t))) return false;
  if (nonPhoneTerms.some((t) => title.includes(t))) return false;

  const phoneTerms = ['phone', 'mobile', 'iphone', 'galaxy s', 'galaxy a', 'galaxy z', 'pixel', 'doro', 'nokia', 'smartphones'];
  if (phoneTerms.some((t) => cat.includes(t) || title.includes(t) || catPath.includes(t))) return true;

  const brand = (p.brand || '').toLowerCase();
  if (['apple', 'samsung', 'google'].includes(brand)) return true;
  return false;
}

export const TrendingProductsShowcaseWidget: React.FC<WidgetRenderProps> = ({
  settings = {},
  commonSettings = {},
  isPreview = false
}) => {
  const {
    products: appProducts = [],
    categories: appCategories = [],
    addToCart,
    viewProductDetail,
    showNotification
  } = useApp();

  const cfg = settings as TrendingProductsShowcaseSettings;

  if (cfg.enableWidget === false) {
    return isPreview ? (
      <div className="p-6 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-300 rounded-2xl bg-slate-50 my-4">
        Widget is currently disabled in settings. (Visible in preview only)
      </div>
    ) : null;
  }

  // --- Dynamic Categories Extraction ---
  const dynamicCategories = useMemo(() => {
    if (Array.isArray(cfg.customCategories) && cfg.customCategories.length > 0) {
      return cfg.customCategories;
    }
    const map = new Map<string, string>();
    appCategories.forEach((c) => {
      if (c && c.slug) map.set(c.slug.toLowerCase(), c.name || c.slug);
    });
    appProducts.forEach((p) => {
      if (p.category) {
        const slug = p.category.toLowerCase().trim();
        if (!map.has(slug)) {
          map.set(slug, p.category.charAt(0).toUpperCase() + p.category.slice(1));
        }
      }
    });

    if (map.size === 0) {
      return [
        { id: 'apple', slug: 'apple', label: 'Apple' },
        { id: 'samsung', slug: 'samsung', label: 'Samsung' },
        { id: 'google', slug: 'google', label: 'Google' },
      ];
    }

    return Array.from(map.entries()).map(([slug, name]) => ({
      id: slug,
      slug,
      label: name,
    }));
  }, [appCategories, appProducts, cfg.customCategories]);

  // Check if Trending Phones widget: enforce showAllCategory = false and defaultCategory = 'apple'
  const isTrendingPhones = Boolean(
    (cfg.sectionHeading && cfg.sectionHeading.toLowerCase().includes('trending phones')) ||
    (cfg.widgetName && cfg.widgetName.toLowerCase().includes('trending phones'))
  );
  const effectiveShowAllCategory = isTrendingPhones ? false : (cfg.showAllCategory !== false);
  const effectiveDefaultCategory = cfg.defaultCategory || (isTrendingPhones ? 'apple' : (effectiveShowAllCategory ? 'all' : (dynamicCategories.find(c => c.slug.toLowerCase() === 'apple')?.slug || dynamicCategories[0]?.slug || 'apple')));

  const [activeCategory, setActiveCategory] = useState<string>(effectiveDefaultCategory);

  useEffect(() => {
    if (effectiveDefaultCategory) {
      setActiveCategory(effectiveDefaultCategory);
    }
  }, [effectiveDefaultCategory]);

  // --- Filter and Sort Products ---
  const filteredProducts = useMemo(() => {
    let list = [...appProducts];

    const isPhonesOnly = cfg.phonesOnly ||
      (cfg.sectionHeading && cfg.sectionHeading.toLowerCase().includes('phone')) ||
      (cfg.sectionHeading && cfg.sectionHeading.toLowerCase().includes('iphone'));

    if (isPhonesOnly) {
      list = list.filter(isPhoneProduct);
    }

    if (cfg.brandFilter && cfg.brandFilter !== 'all') {
      const bf = cfg.brandFilter.toLowerCase();
      list = list.filter((p) => {
        const b = (p.brand || '').toLowerCase();
        const t = (p.title || '').toLowerCase();
        const c = (p.category || '').toLowerCase();
        if (bf === 'apple') return b.includes('apple') || t.includes('apple') || t.includes('iphone') || c.includes('iphone');
        if (bf === 'samsung') return b.includes('samsung') || t.includes('samsung') || t.includes('galaxy') || c.includes('samsung');
        if (bf === 'google') return b.includes('google') || t.includes('google') || t.includes('pixel') || c.includes('pixel');
        return b.includes(bf) || t.includes(bf) || c.includes(bf);
      });
    }

    if (cfg.refurbishedOnly) {
      list = list.filter((p) => {
        const cond = (p.condition || '').toLowerCase();
        const title = (p.title || '').toLowerCase();
        return cond.includes('refurb') || cond.includes('grade') || cond.includes('used') || title.includes('used') || cond.includes('pristine') || cond.includes('excellent');
      });
    }

    if (cfg.onlyNewPhones) {
      const newPhonesOnly = list.filter((p) => {
        const isNewCond = p.condition === 'Brand New' || (p.title || '').toLowerCase().includes('new') || (p.category || '').toLowerCase().includes('new');
        const isLatestModel = /iphone (14|15|16|17)|galaxy s2[3-5]|galaxy a(24|26|33|35|52|55)|pixel (7|8)/i.test(p.title);
        return isNewCond || isLatestModel;
      });
      if (newPhonesOnly.length > 0) {
        list = newPhonesOnly;
      }
    }

    if (cfg.selectionStrategy === 'sale') {
      list = list.filter((p) => Boolean(p.regularPrice && p.regularPrice > p.price));
    } else if (cfg.selectionStrategy === 'featured' || cfg.selectionStrategy === 'trending') {
      list = list.filter((p) => p.featured || (p.reviewsCount && p.reviewsCount > 10) || p.rating >= 4.7);
    } else if (cfg.selectionStrategy === 'brand' && Array.isArray(cfg.selectedBrands) && cfg.selectedBrands.length > 0) {
      const bSet = new Set(cfg.selectedBrands.map((b) => b.toLowerCase()));
      list = list.filter((p) => p.brand && bSet.has(p.brand.toLowerCase()));
    } else if (cfg.selectionStrategy === 'manual' && Array.isArray(cfg.selectedProductIds) && cfg.selectedProductIds.length > 0) {
      const idSet = new Set(cfg.selectedProductIds);
      list = list.filter((p) => idSet.has(p.id) || (p.wpId && idSet.has(String(p.wpId))));
    } else if (cfg.selectionStrategy === 'category' && Array.isArray(cfg.selectedCategories) && cfg.selectedCategories.length > 0) {
      const cSet = new Set(cfg.selectedCategories.map((c) => c.toLowerCase()));
      list = list.filter((p) => p.category && cSet.has(p.category.toLowerCase()));
    }

    if (activeCategory !== 'all') {
      const target = activeCategory.toLowerCase();
      list = list.filter((p) => {
        const cat = (p.category || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        const title = (p.title || '').toLowerCase();
        if (target === 'apple') {
          return brand.includes('apple') || title.includes('apple') || title.includes('iphone') || cat.includes('iphone');
        }
        if (target === 'samsung') {
          return brand.includes('samsung') || title.includes('samsung') || title.includes('galaxy') || cat.includes('samsung');
        }
        if (target === 'google') {
          return brand.includes('google') || title.includes('google') || title.includes('pixel') || cat.includes('pixel');
        }
        return cat.includes(target) || brand.includes(target) || target.includes(cat) || title.includes(target);
      });
    }

    if (cfg.inStockOnly) {
      list = list.filter((p) => p.inStock);
    }

    if (typeof cfg.minPrice === 'number' && cfg.minPrice > 0) {
      list = list.filter((p) => p.price >= cfg.minPrice!);
    }
    if (typeof cfg.maxPrice === 'number' && cfg.maxPrice > 0) {
      list = list.filter((p) => p.price <= cfg.maxPrice!);
    }

    const sortBy = cfg.sortBy || 'popularity';
    list.sort((a, b) => {
      if (cfg.onlyNewPhones) {
        const isNewA = a.condition === 'Brand New' || (a.title || '').toLowerCase().includes('new') ? 1 : 0;
        const isNewB = b.condition === 'Brand New' || (b.title || '').toLowerCase().includes('new') ? 1 : 0;
        if (isNewB !== isNewA) return isNewB - isNewA;
      }

      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'newest') return (b.wpId || 0) - (a.wpId || 0);
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'discount') {
        const discA = a.regularPrice ? (a.regularPrice - a.price) / a.regularPrice : 0;
        const discB = b.regularPrice ? (b.regularPrice - b.price) / b.regularPrice : 0;
        return discB - discA;
      }
      return (b.reviewsCount || 0) - (a.reviewsCount || 0);
    });

    const limit = cfg.maxProductsLimit || 24;
    return list.slice(0, limit);
  }, [appProducts, activeCategory, cfg]);

  const displayProducts = useMemo(() => {
    if (filteredProducts.length > 0) return filteredProducts;
    if (appProducts.length > 0) {
      const isPhonesOnly = cfg.phonesOnly ||
        (cfg.sectionHeading && cfg.sectionHeading.toLowerCase().includes('phone')) ||
        (cfg.sectionHeading && cfg.sectionHeading.toLowerCase().includes('iphone'));
      const phoneList = isPhonesOnly ? appProducts.filter(isPhoneProduct) : appProducts;
      return phoneList.slice(0, 8);
    }
    return [];
  }, [filteredProducts, appProducts, cfg.phonesOnly, cfg.sectionHeading]);

  // --- Carousel Window and Responsive Calculation ---
  const [carouselIndex, setCarouselIndex] = useState(0);

  const visibleDesktop = cfg.visibleDesktop === 4 ? 5 : (cfg.visibleDesktop || 5);

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectiveVisible = useMemo(() => {
    if (windowWidth < 640) return 2; // 2 products visible on mobile
    if (windowWidth < 1024) return 4; // 4 products visible on tablet
    return visibleDesktop; // 5 products on desktop
  }, [windowWidth, visibleDesktop]);

  useEffect(() => {
    setCarouselIndex(0);
  }, [activeCategory]);

  // Autoplay handler
  useEffect(() => {
    if (!cfg.autoplay || cfg.displayMode === 'grid' || displayProducts.length <= effectiveVisible) return;

    const intervalTime = Math.max(2000, cfg.autoplayInterval || 4500);
    const interval = setInterval(() => {
      setCarouselIndex((prev) => {
        const next = prev + (cfg.itemsPerScroll || 1);
        const maxIdx = Math.max(0, displayProducts.length - effectiveVisible);
        if (next > maxIdx) {
          return cfg.loop !== false ? 0 : prev;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [cfg.autoplay, cfg.autoplayInterval, cfg.displayMode, cfg.itemsPerScroll, cfg.loop, displayProducts.length, effectiveVisible]);

  const maxIndex = Math.max(0, displayProducts.length - effectiveVisible);

  const handlePrev = () => {
    setCarouselIndex((prev) => {
      const step = cfg.itemsPerScroll || 1;
      if (prev - step < 0) {
        return cfg.loop !== false ? maxIndex : 0;
      }
      return prev - step;
    });
  };

  const handleNext = () => {
    setCarouselIndex((prev) => {
      const step = cfg.itemsPerScroll || 1;
      if (prev + step > maxIndex) {
        return cfg.loop !== false ? 0 : maxIndex;
      }
      return prev + step;
    });
  };

  // --- Editorial Heading & Layout Configuration (Matches CategoryEditorialRailWidget & CommonRepairsWidget) ---
  const sectionHeading = cfg.sectionHeading !== undefined ? cfg.sectionHeading : 'Trending Phones';
  const showHeading = cfg.showSectionHeading !== false && Boolean(sectionHeading);
  const subtitleValue = cfg.subtitle || cfg.sectionSubheading || '';
  const showSubtitle = cfg.showSubtitle !== false && Boolean(subtitleValue);
  const resolvedEyebrow =
    cfg.eyebrowText !== undefined
      ? cfg.eyebrowText
      : cfg.refurbishedOnly
      ? 'CERTIFIED REFURBISHED & TESTED'
      : isTrendingPhones
      ? 'NEW & FLAGSHIP RELEASES'
      : 'CERTIFIED REFURBISHED & TESTED';
  const showEyebrow = cfg.showEyebrow !== false && Boolean(resolvedEyebrow);

  const arrowPos = cfg.arrowPosition || 'top_right';
  const canShowCarouselArrows =
    cfg.showArrows !== false && cfg.displayMode !== 'grid' && displayProducts.length > effectiveVisible;

  const widthMode = commonSettings?.containerWidth || cfg.layoutWidth || 'boxed';
  const containerClass =
    widthMode === 'full'
      ? 'w-full px-[10px] sm:px-6 lg:px-8'
      : widthMode === 'narrow'
      ? 'max-w-5xl mx-auto px-[10px] sm:px-6'
      : 'max-w-7xl mx-auto px-[10px] sm:px-6 lg:px-8';

  const btnRadiusMap = {
    none: 'rounded-none',
    sm: 'rounded-md',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    full: 'rounded-xl',
  };
  const catBtnRadius = btnRadiusMap[cfg.categoryBtnRadius || 'full'];

  const handleAddToBasket = (product: Product) => {
    addToCart(product, 1);
    showNotification(`Added ${product.title} to basket!`, 'success');
  };

  return (
    <section
      style={{
        backgroundColor: cfg.backgroundColor || commonSettings.backgroundColor || '#f8fafc',
        paddingTop: typeof cfg.sectionPaddingTop === 'number' ? `${cfg.sectionPaddingTop}px` : undefined,
        paddingBottom: typeof cfg.sectionPaddingBottom === 'number' ? `${cfg.sectionPaddingBottom}px` : undefined,
        marginTop: typeof cfg.sectionMarginTop === 'number' ? `${cfg.sectionMarginTop}px` : undefined,
        marginBottom: typeof cfg.sectionMarginBottom === 'number' ? `${cfg.sectionMarginBottom}px` : undefined,
      }}
      className="py-12 relative overflow-hidden transition-colors"
    >
      <div className={containerClass}>
        {/* --- Editorial Header Row (Left Eyebrow + Heading + Subtitle, Right Filter Tabs & Circular Arrows) --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="min-w-0">
            {showEyebrow && (
              <p className="text-xs font-bold tracking-wider uppercase text-[#E6007E] mb-1.5">
                {resolvedEyebrow}
              </p>
            )}
            {showHeading && (
              <h2
                className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0B0D12] tracking-tight font-heading leading-tight"
                style={{
                  color: cfg.headingColor || '#0B0D12',
                }}
              >
                {sectionHeading}
              </h2>
            )}
            {showSubtitle && (
              <p
                style={{
                  color: cfg.subtitleColor || '#64748b',
                }}
                className="text-sm text-slate-500 mt-1.5 max-w-2xl leading-relaxed"
              >
                {subtitleValue}
              </p>
            )}
          </div>

          {/* Right Controls: Category Filter Tabs + Matching Circular Carousel Arrows */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {cfg.showCategories !== false && dynamicCategories.length > 0 && (
              <div
                className="flex items-center flex-wrap gap-2 overflow-x-auto pb-0.5 max-w-full"
                style={{ gap: cfg.categorySpacing ? `${cfg.categorySpacing}px` : undefined }}
              >
                {effectiveShowAllCategory && (
                  <button
                    type="button"
                    onClick={() => setActiveCategory('all')}
                    className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${catBtnRadius} ${
                      activeCategory === 'all'
                        ? 'bg-[#0B0D12] text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:text-[#0B0D12] hover:bg-slate-100 border border-slate-200/90'
                    }`}
                  >
                    {cfg.allProductsLabel || 'All Products'}
                  </button>
                )}

                {dynamicCategories.map((cat) => {
                  const isActive = activeCategory.toLowerCase() === cat.slug.toLowerCase();
                  return (
                    <button
                      key={cat.id || cat.slug}
                      type="button"
                      onClick={() => setActiveCategory(cat.slug)}
                      className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${catBtnRadius} ${
                        isActive
                          ? 'bg-[#0B0D12] text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:text-[#0B0D12] hover:bg-slate-100 border border-slate-200/90'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            )}

            {canShowCarouselArrows && arrowPos === 'top_right' && (
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={carouselIndex === 0 && cfg.loop === false}
                  aria-label="Previous products"
                  className="w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-700 hover:border-[#E6007E] hover:text-[#E6007E] disabled:opacity-35 disabled:hover:border-slate-200 disabled:hover:text-slate-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6007E]"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={carouselIndex >= maxIndex && cfg.loop === false}
                  aria-label="Next products"
                  className="w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-700 hover:border-[#E6007E] hover:text-[#E6007E] disabled:opacity-35 disabled:hover:border-slate-200 disabled:hover:text-slate-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6007E]"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* --- Empty State Notice --- */}
        {displayProducts.length === 0 ? (
          <div className="py-16 px-6 text-center bg-white rounded-3xl border border-dashed border-slate-300">
            <Tag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">
              {cfg.emptyStateMessage || 'No products found in this category'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Try selecting a different category tab or update the selection strategy in the visual settings panel.
            </p>
            {effectiveShowAllCategory && activeCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className="mt-4 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
              >
                Show All Categories
              </button>
            )}
          </div>
        ) : (
          /* --- Product Showcase Container --- */
          <div className="relative group/carousel">
            {/* Optional Side Arrows if explicitly configured */}
            {canShowCarouselArrows && arrowPos === 'sides' && (
              <>
                <button
                  type="button"
                  aria-label="Previous Products"
                  onClick={handlePrev}
                  disabled={carouselIndex === 0 && cfg.loop === false}
                  className="absolute -left-1 sm:-left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center transition-all cursor-pointer shadow-md border rounded-full bg-white text-slate-700 border-slate-200 hover:border-[#E6007E] hover:text-[#E6007E] disabled:opacity-20 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                </button>

                <button
                  type="button"
                  aria-label="Next Products"
                  onClick={handleNext}
                  disabled={carouselIndex >= maxIndex && cfg.loop === false}
                  className="absolute -right-1 sm:-right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center transition-all cursor-pointer shadow-md border rounded-full bg-white text-slate-700 border-slate-200 hover:border-[#E6007E] hover:text-[#E6007E] disabled:opacity-20 disabled:pointer-events-none"
                >
                  <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              </>
            )}

            {/* Canonical ProductCard Grid / Carousel Track */}
            {cfg.displayMode === 'grid' ? (
              <div
                className={`grid grid-cols-2 md:grid-cols-4 ${
                  visibleDesktop === 5 ? 'lg:grid-cols-5' : visibleDesktop === 6 ? 'lg:grid-cols-6' : 'lg:grid-cols-4'
                } gap-3 sm:gap-5`}
              >
                {displayProducts.map((product, idx) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    categories={appCategories}
                    priority={idx < effectiveVisible}
                    onSelectProduct={viewProductDetail}
                    onAddToCart={handleAddToBasket}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden py-2 -my-2 -mx-[5px] sm:-mx-2">
                <div
                  className="flex items-stretch transition-transform duration-500 ease-out"
                  style={{
                    transform: `translateX(-${carouselIndex * (100 / effectiveVisible)}%)`,
                  }}
                >
                  {displayProducts.map((product, idx) => (
                    <div
                      key={product.id}
                      className="shrink-0 px-[5px] sm:px-2 flex flex-col"
                      style={{
                        width: `calc(100% / ${effectiveVisible})`,
                        maxWidth: '100%',
                      }}
                    >
                      <ProductCard
                        product={product}
                        categories={appCategories}
                        priority={idx < effectiveVisible}
                        onSelectProduct={viewProductDetail}
                        onAddToCart={handleAddToBasket}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Pagination Dots underneath */}
            {cfg.showDots && cfg.displayMode !== 'grid' && maxIndex > 0 && (
              <div className="flex items-center justify-center gap-1.5 mt-6">
                {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCarouselIndex(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      carouselIndex === idx ? 'w-6 bg-[#E6007E]' : 'w-2 bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
