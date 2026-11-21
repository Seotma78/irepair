import React, { useState, useMemo, useEffect } from 'react';
import { WidgetRenderProps } from '../types';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { ProductCard } from '../../components/ProductCard';
import { isPhoneProduct } from './TrendingProductsShowcaseWidget';
import {
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  Layers
} from 'lucide-react';

export interface ConditionTabConfig {
  id: string;
  label: string;
  conditionValue: string; // matches product.condition or keyword
  enabled: boolean;
  badgeText?: string;
  badgeBg?: string;
  badgeColor?: string;
}

export interface BrandFilterConfig {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  enabled: boolean;
}

export interface DynamicProductGridConfig {
  // 1. General
  widgetName?: string;
  eyebrowText?: string;
  showEyebrow?: boolean;
  showSectionHeading?: boolean;
  sectionHeading?: string;
  showSubtitle?: boolean;
  subtitle?: string;
  headingAlignment?: 'left' | 'center' | 'right';
  layoutWidth?: 'boxed' | 'full' | 'narrow';
  maxContentWidth?: number;
  backgroundColor?: string;
  backgroundGradient?: string;
  backgroundImage?: string;
  sectionPaddingTop?: number;
  sectionPaddingBottom?: number;
  sectionMarginTop?: number;
  sectionMarginBottom?: number;
  contentSpacing?: number;
  displayMode?: 'grid' | 'carousel';
  productSource?: 'all' | 'smartphones' | 'featured' | 'sale' | 'custom';
  loadingMessage?: string;
  emptyStateMessage?: string;
  enableWidget?: boolean;

  // 2. Product Source
  maxProducts?: number;
  defaultSort?: 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest';
  includeOutOfStock?: boolean;

  // 3. Condition Tabs
  showConditionTabs?: boolean;
  conditionTabs?: ConditionTabConfig[];
  defaultConditionTab?: string; // id or 'all'
  showAllConditionTab?: boolean;
  allConditionLabel?: string;
  tabAlignment?: 'left' | 'center' | 'right';
  tabStyle?: 'pills' | 'underline' | 'contained' | 'minimal';
  tabActiveBg?: string;
  tabActiveText?: string;
  tabInactiveBg?: string;
  tabInactiveText?: string;
  tabBorderRadius?: string;
  showProductCountInTabs?: boolean;

  // 4. Brand Filters
  showBrandFilters?: boolean;
  brandFilters?: BrandFilterConfig[];
  defaultBrandFilter?: string; // slug or 'all'
  showAllBrandsPill?: boolean;
  allBrandsLabel?: string;
  brandPillStyle?: 'logo_card' | 'pill' | 'text_only';
  brandActiveBorder?: string;
  brandInactiveBorder?: string;
  brandActiveBg?: string;
  brandInactiveBg?: string;

  // 5. Product Grid & Columns
  columnsDesktop?: number;
  columnsTablet?: number;
  columnsMobile?: number;
  cardGap?: number;
  maxRowsInGrid?: number;

  // 6. Product Cards
  cardBg?: string;
  cardBorderColor?: string;
  cardBorderWidth?: number;
  cardBorderRadius?: number;
  cardShadow?: 'none' | 'sm' | 'md' | 'lg' | 'hover-lift';
  cardPadding?: number;
  showHoverEffect?: boolean;

  // 7. Product Images
  imageHeight?: number;
  imageBg?: string;
  imageFit?: 'contain' | 'cover';
  imagePadding?: number;
  enableImageZoomOnHover?: boolean;

  // 8. Product Information
  showBrandBadge?: boolean;
  showConditionBadge?: boolean;
  showRatings?: boolean;
  titleLines?: number; // line-clamp
  showSpecsList?: boolean;
  maxSpecsCount?: number;
  showDeliveryBadge?: boolean;
  deliveryBadgeText?: string;

  // 9. Pricing
  pricingMode?: 'both' | 'outright_only' | 'monthly_only';
  showRegularPriceStrikethrough?: boolean;
  showSavingsBadge?: boolean;
  savingsBadgeText?: string;
  currencySymbol?: string;
  monthlyTermMonths?: number;
  upfrontCostText?: string;

  // 10. Promotional Content
  showPromoBanner?: boolean;
  promoBannerPosition?: 'top' | 'card_slot' | 'bottom';
  promoCardSlotIndex?: number;
  promoTitle?: string;
  promoSubtitle?: string;
  promoBadge?: string;
  promoButtonText?: string;
  promoButtonLink?: string;
  promoBg?: string;
  promoTextColor?: string;
  promoImage?: string;

  // 11. Buttons & CTA
  buttonText?: string;
  buttonAction?: 'modal' | 'cart' | 'shop';
  fullWidthButton?: boolean;
  buttonBg?: string;
  buttonTextColor?: string;
  buttonHoverBg?: string;
  buttonRadius?: number;
  buttonBorderWidth?: number;
  buttonBorderColor?: string;

  // 12. Typography
  headingFontSize?: number;
  headingFontWeight?: string;
  headingColor?: string;
  subtitleFontSize?: number;
  subtitleColor?: string;
  cardTitleFontSize?: number;
  cardTitleColor?: string;
  priceFontSize?: number;
  priceColor?: string;

  // 13. Colors and Backgrounds
  accentColor?: string;
  textPrimaryColor?: string;
  textSecondaryColor?: string;

  // 14. Borders and Shadows
  badgeBorderRadius?: number;

  // 15. Spacing and Dimensions
  sectionMaxWidthPx?: number;

  // 16. Responsive Settings
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;

  // 17. Carousel Settings
  showCarouselArrows?: boolean;
  showCarouselDots?: boolean;
  arrowShape?: 'circle' | 'rounded' | 'square';
  arrowBg?: string;
  arrowColor?: string;
  carouselAutoplay?: boolean;
  autoplayIntervalMs?: number;
  pauseOnHover?: boolean;

  // 18. Advanced Settings
  customCssClass?: string;
  customId?: string;
}

export const DEFAULT_DYNAMIC_PRODUCT_GRID_CONFIG: DynamicProductGridConfig = {
  widgetName: 'Dynamic Product Grid',
  enableWidget: true,
  showSectionHeading: true,
  sectionHeading: 'Popular certified refurbished phones & tech',
  showSubtitle: true,
  subtitle: 'All devices thoroughly tested with 70-point diagnostics and 12-month free warranty',
  headingAlignment: 'left',
  layoutWidth: 'boxed',
  maxContentWidth: 1280,
  backgroundColor: '#f8fafc',
  sectionPaddingTop: 48,
  sectionPaddingBottom: 56,
  sectionMarginTop: 0,
  sectionMarginBottom: 0,
  contentSpacing: 24,
  displayMode: 'grid',
  productSource: 'all',
  maxProducts: 12,
  defaultSort: 'featured',
  includeOutOfStock: true,
  loadingMessage: 'Loading products...',
  emptyStateMessage: 'No products found matching the selected condition and brand filters.',

  // Condition Tabs
  showConditionTabs: true,
  conditionTabs: [
    { id: 'new', label: 'Brand New', conditionValue: 'New', enabled: true, badgeText: 'Sealed', badgeBg: '#dcfce7', badgeColor: '#15803d' },
    { id: 'good_as_new', label: 'Good as new', conditionValue: 'Grade A', enabled: true, badgeText: 'Pristine', badgeBg: '#e0e7ff', badgeColor: '#3730a3' },
    { id: 'refurbished', label: 'Refurbished', conditionValue: 'Refurbished', enabled: true, badgeText: 'Certified', badgeBg: '#fef3c7', badgeColor: '#92400e' },
  ],
  defaultConditionTab: 'all',
  showAllConditionTab: true,
  allConditionLabel: 'All Conditions',
  tabAlignment: 'left',
  tabStyle: 'pills',
  tabActiveBg: '#0f172a',
  tabActiveText: '#ffffff',
  tabInactiveBg: '#ffffff',
  tabInactiveText: '#475569',
  tabBorderRadius: '9999px',
  showProductCountInTabs: true,

  // Brand Filters
  showBrandFilters: true,
  brandFilters: [
    { id: 'apple', name: 'Apple', slug: 'Apple', logoUrl: 'https://ee.co.uk/content/dam/ee/logos/brand-logos/AppleLogo_72x72_1x1.png', enabled: true },
    { id: 'samsung', name: 'Samsung', slug: 'Samsung', logoUrl: 'https://ee.co.uk/content/dam/ee/logos/brand-logos/SamsungLogo_72x72_1x1.png', enabled: true },
    { id: 'google', name: 'Google', slug: 'Google', logoUrl: 'https://ee.co.uk/content/dam/ee/logos/brand-logos/GoogleLogo_72x72_1x1.png', enabled: true },
  ],
  defaultBrandFilter: 'all',
  showAllBrandsPill: true,
  allBrandsLabel: 'All Brands',
  brandPillStyle: 'logo_card',
  brandActiveBorder: '#DF0C88',
  brandInactiveBorder: '#e2e8f0',
  brandActiveBg: '#fdf2f8',
  brandInactiveBg: '#ffffff',

  // Columns
  columnsDesktop: 4,
  columnsTablet: 2,
  columnsMobile: 1,
  cardGap: 20,
  maxRowsInGrid: 3,

  // Cards
  cardBg: '#ffffff',
  cardBorderColor: '#e2e8f0',
  cardBorderWidth: 1,
  cardBorderRadius: 20,
  cardShadow: 'hover-lift',
  cardPadding: 16,
  showHoverEffect: true,

  // Images
  imageHeight: 210,
  imageBg: '#ffffff',
  imageFit: 'contain',
  imagePadding: 16,
  enableImageZoomOnHover: true,

  // Information
  showBrandBadge: true,
  showConditionBadge: true,
  showRatings: true,
  titleLines: 2,
  showSpecsList: true,
  maxSpecsCount: 2,
  showDeliveryBadge: true,
  deliveryBadgeText: 'Next-day delivery available',

  // Pricing - Real Outright Product Pricing
  pricingMode: 'outright_only',
  showRegularPriceStrikethrough: true,
  showSavingsBadge: true,
  savingsBadgeText: 'Save',
  currencySymbol: '£',
  monthlyTermMonths: 0,
  upfrontCostText: '',

  // Promo Banner
  showPromoBanner: true,
  promoBannerPosition: 'top',
  promoCardSlotIndex: 3,
  promoTitle: 'Trade in your old device and get up to £300 off',
  promoSubtitle: 'Get an instant valuation online with certified 70-point testing and 12-month warranty.',
  promoBadge: 'Limited Time Offer',
  promoButtonText: 'Value My Device',
  promoButtonLink: '/repair',
  promoBg: '#0f172a',
  promoTextColor: '#ffffff',
  promoImage: 'https://ee.co.uk/content/dam/ee/logos/brand-logos/AppleLogo_72x72_1x1.png',

  // Buttons
  buttonText: 'Select options',
  buttonAction: 'modal',
  fullWidthButton: true,
  buttonBg: '#0f172a',
  buttonTextColor: '#ffffff',
  buttonHoverBg: '#DF0C88',
  buttonRadius: 14,
  buttonBorderWidth: 0,
  buttonBorderColor: 'transparent',

  // Typography
  headingFontSize: 30,
  headingFontWeight: '800',
  headingColor: '#0f172a',
  subtitleFontSize: 14,
  subtitleColor: '#64748b',
  cardTitleFontSize: 15,
  cardTitleColor: '#0f172a',
  priceFontSize: 22,
  priceColor: '#0f172a',

  // Colors
  accentColor: '#DF0C88',
  textPrimaryColor: '#0f172a',
  textSecondaryColor: '#64748b',

  // Borders
  badgeBorderRadius: 9999,

  // Carousel
  showCarouselArrows: true,
  showCarouselDots: true,
  arrowShape: 'circle',
  arrowBg: '#ffffff',
  arrowColor: '#0f172a',
  carouselAutoplay: false,
  autoplayIntervalMs: 5000,
  pauseOnHover: true,
};

export const DynamicProductGridWidget: React.FC<WidgetRenderProps> = ({
  settings = {},
  commonSettings = {},
  isPreview = false,
}) => {
  const merged: DynamicProductGridConfig = {
    ...DEFAULT_DYNAMIC_PRODUCT_GRID_CONFIG,
    ...settings,
  };

  const { products, categories, viewProductDetail, addToCart, showNotification } = useApp();

  // Internal interactive state for user browsing
  const [selectedCondition, setSelectedCondition] = useState<string>(
    merged.defaultConditionTab || 'all'
  );
  const [selectedBrand, setSelectedBrand] = useState<string>(
    merged.defaultBrandFilter || 'all'
  );
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Sync default filter if settings change in editor
  useEffect(() => {
    if (merged.defaultConditionTab) {
      setSelectedCondition(merged.defaultConditionTab);
    }
  }, [merged.defaultConditionTab]);

  useEffect(() => {
    if (merged.defaultBrandFilter) {
      setSelectedBrand(merged.defaultBrandFilter);
    }
  }, [merged.defaultBrandFilter]);

  // Base products filtered by productSource
  const sourceProducts = useMemo(() => {
    let list = [...(products || [])];
    if (merged.productSource === 'smartphones') {
      list = list.filter(isPhoneProduct);
    } else if (merged.productSource === 'featured') {
      list = list.filter((p) => p.featured);
    } else if (merged.productSource === 'sale') {
      list = list.filter((p) => p.regularPrice && p.regularPrice > p.price);
    }
    if (!merged.includeOutOfStock) {
      list = list.filter((p) => p.inStock);
    }
    return list;
  }, [products, merged.productSource, merged.includeOutOfStock]);

  // Helper function to check if a product matches a condition tab
  const matchesCondition = (p: Product, tab: { id: string; label: string; conditionValue: string }) => {
    const c = (p.condition || '').toLowerCase();
    const val = tab.conditionValue.toLowerCase();
    const lbl = tab.label.toLowerCase();

    if (tab.id === 'new' || val === 'new' || lbl.includes('brand new')) {
      return c.includes('brand new') || (c.includes('new') && !c.includes('good as new'));
    }
    if (tab.id === 'good_as_new' || val.includes('grade a') || lbl.includes('good as new') || lbl.includes('pristine')) {
      return c.includes('grade a') || c.includes('pristine') || c.includes('good as new');
    }
    if (tab.id === 'refurbished' || val.includes('refurb') || lbl.includes('refurb')) {
      return c.includes('refurb') || c.includes('grade b') || c.includes('grade c') || c.includes('used') || c.includes('pristine');
    }
    return c.includes(val) || lbl.includes(c);
  };

  // Condition count helper
  const conditionCounts = useMemo(() => {
    const counts: Record<string, number> = { all: sourceProducts.length };
    (merged.conditionTabs || []).forEach((tab) => {
      if (!tab.enabled) return;
      const count = sourceProducts.filter((p) => matchesCondition(p, tab)).length;
      counts[tab.id] = count;
    });
    return counts;
  }, [sourceProducts, merged.conditionTabs]);

  // Filter products by selectedCondition and selectedBrand
  const filteredProducts = useMemo(() => {
    let list = [...sourceProducts];

    // Filter by Condition Tab
    if (selectedCondition !== 'all') {
      const activeTab = (merged.conditionTabs || []).find((t) => t.id === selectedCondition);
      if (activeTab) {
        list = list.filter((p) => matchesCondition(p, activeTab));
      }
    }

    // Filter by Brand Filter
    if (selectedBrand !== 'all') {
      list = list.filter((p) => {
        const brandMatch = (p.brand || '').toLowerCase() === selectedBrand.toLowerCase();
        const titleMatch = (p.title || '').toLowerCase().includes(selectedBrand.toLowerCase());
        return brandMatch || titleMatch;
      });
    }

    // Sort
    if (merged.defaultSort === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (merged.defaultSort === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (merged.defaultSort === 'rating') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (merged.defaultSort === 'featured') {
      list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    if (merged.maxProducts && merged.maxProducts > 0) {
      list = list.slice(0, merged.maxProducts);
    }

    return list;
  }, [sourceProducts, selectedCondition, selectedBrand, merged.conditionTabs, merged.defaultSort, merged.maxProducts]);

  // Carousel calculation
  const itemsPerView = useMemo(() => {
    if (windowWidth < 640) return 2;
    if (windowWidth < 1024) return 4;
    return merged.columnsDesktop || 4;
  }, [windowWidth, merged.columnsDesktop]);

  const maxCarouselPages = Math.max(0, filteredProducts.length - itemsPerView);

  const prevCarousel = () => {
    setCarouselIndex((prev) => Math.max(0, prev - 1));
  };

  const nextCarousel = () => {
    setCarouselIndex((prev) => Math.min(maxCarouselPages, prev + 1));
  };

  const handleAddToBasket = (prod: Product) => {
    addToCart(prod, 1);
    showNotification(`Added ${prod.title} to basket!`, 'success');
  };

  if (merged.enableWidget === false && !isPreview) {
    return null;
  }

  // Layout container classes
  const effectiveWidth = commonSettings?.containerWidth || merged.layoutWidth || 'boxed';
  const containerWidthClass =
    effectiveWidth === 'full'
      ? 'w-full px-4 sm:px-6 lg:px-8'
      : effectiveWidth === 'narrow'
      ? 'max-w-4xl mx-auto px-4 sm:px-6'
      : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';

  return (
    <section
      id={merged.customId || undefined}
      className={`relative w-full ${merged.customCssClass || ''} ${merged.hideOnMobile ? 'hidden md:block' : ''} ${merged.hideOnDesktop ? 'md:hidden' : ''}`}
      style={{
        backgroundColor: merged.backgroundColor || undefined,
        backgroundImage: merged.backgroundGradient
          ? merged.backgroundGradient
          : merged.backgroundImage
          ? `url(${merged.backgroundImage})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        paddingTop: `${merged.sectionPaddingTop ?? 48}px`,
        paddingBottom: `${merged.sectionPaddingBottom ?? 56}px`,
        marginTop: `${merged.sectionMarginTop ?? 0}px`,
        marginBottom: `${merged.sectionMarginBottom ?? 0}px`,
      }}
    >
      <div className={containerWidthClass} style={{ maxWidth: merged.sectionMaxWidthPx ? `${merged.sectionMaxWidthPx}px` : undefined }}>
        
        {/* ================= HEADER SECTION ================= */}
        {(merged.showSectionHeading || merged.showSubtitle) && (
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="min-w-0">
              {merged.showEyebrow !== false && (
                <p className="text-xs font-bold tracking-wider uppercase text-[#E6007E] mb-1.5">
                  {merged.eyebrowText || 'CERTIFIED REFURBISHED & TESTED'}
                </p>
              )}
              {merged.showSectionHeading && (
                <h2
                  style={{
                    color: merged.headingColor || '#0B0D12',
                  }}
                  className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0B0D12] tracking-tight font-heading leading-tight"
                >
                  {merged.sectionHeading}
                </h2>
              )}
              {merged.showSubtitle && merged.subtitle && (
                <p
                  style={{
                    color: merged.subtitleColor || '#64748b',
                  }}
                  className="text-sm text-slate-500 mt-1.5 max-w-2xl leading-relaxed"
                >
                  {merged.subtitle}
                </p>
              )}
            </div>

            {merged.displayMode === 'carousel' && merged.showCarouselArrows !== false && filteredProducts.length > itemsPerView && (
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={prevCarousel}
                  disabled={carouselIndex === 0}
                  className="w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-700 hover:border-[#E6007E] hover:text-[#E6007E] disabled:opacity-35 disabled:hover:border-slate-200 disabled:hover:text-slate-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6007E]"
                  aria-label="Previous items"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={nextCarousel}
                  disabled={carouselIndex >= maxCarouselPages}
                  className="w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-700 hover:border-[#E6007E] hover:text-[#E6007E] disabled:opacity-35 disabled:hover:border-slate-200 disabled:hover:text-slate-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6007E]"
                  aria-label="Next items"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= PROMO BANNER (TOP POSITION) ================= */}
        {merged.showPromoBanner && merged.promoBannerPosition === 'top' && (
          <div
            className="mb-8 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-sm"
            style={{
              backgroundColor: merged.promoBg || '#0f172a',
              color: merged.promoTextColor || '#ffffff',
            }}
          >
            <div className="space-y-2 max-w-xl z-10">
              {merged.promoBadge && (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider"
                  style={{ backgroundColor: merged.accentColor || '#DF0C88', color: '#ffffff' }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {merged.promoBadge}
                </span>
              )}
              <h3 className="text-xl md:text-2xl font-black tracking-tight leading-tight">
                {merged.promoTitle}
              </h3>
              {merged.promoSubtitle && (
                <p className="text-sm text-slate-300 leading-relaxed">
                  {merged.promoSubtitle}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 z-10 shrink-0">
              {merged.promoButtonText && (
                <a
                  href={merged.promoButtonLink || '/repair'}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  style={{
                    backgroundColor: merged.accentColor || '#DF0C88',
                    color: '#ffffff',
                  }}
                >
                  {merged.promoButtonText}
                  <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Subtle backdrop circle decoration */}
            <div
              className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full opacity-15 pointer-events-none"
              style={{ backgroundColor: merged.accentColor || '#DF0C88' }}
            />
          </div>
        )}

        {/* ================= CONDITION TABS (ROW 1) ================= */}
        {merged.showConditionTabs && (
          <div className="mb-4">
            <div
              className={`flex flex-wrap items-center gap-2.5 ${
                merged.tabAlignment === 'center'
                  ? 'justify-center'
                  : merged.tabAlignment === 'right'
                  ? 'justify-end'
                  : 'justify-start'
              }`}
            >
              {merged.showAllConditionTab && (
                <button
                  type="button"
                  onClick={() => setSelectedCondition('all')}
                  className="px-4 py-2 text-xs md:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer border"
                  style={{
                    backgroundColor:
                      selectedCondition === 'all'
                        ? merged.tabActiveBg || '#0f172a'
                        : merged.tabInactiveBg || '#ffffff',
                    color:
                      selectedCondition === 'all'
                        ? merged.tabActiveText || '#ffffff'
                        : merged.tabInactiveText || '#475569',
                    borderColor:
                      selectedCondition === 'all'
                        ? merged.tabActiveBg || '#0f172a'
                        : '#e2e8f0',
                    borderRadius: merged.tabBorderRadius || '9999px',
                  }}
                >
                  <span>{merged.allConditionLabel || 'All Conditions'}</span>
                  {merged.showProductCountInTabs && (
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
                      style={{
                        backgroundColor:
                          selectedCondition === 'all' ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                        color: selectedCondition === 'all' ? '#ffffff' : '#475569',
                      }}
                    >
                      {conditionCounts.all || 0}
                    </span>
                  )}
                </button>
              )}

              {(merged.conditionTabs || [])
                .filter((tab) => tab.enabled)
                .map((tab) => {
                  const isSelected = selectedCondition === tab.id;
                  const count = conditionCounts[tab.id] || 0;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedCondition(tab.id)}
                      className="px-4 py-2 text-xs md:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer border shadow-2xs hover:border-slate-400"
                      style={{
                        backgroundColor: isSelected
                          ? merged.tabActiveBg || '#0f172a'
                          : merged.tabInactiveBg || '#ffffff',
                        color: isSelected
                          ? merged.tabActiveText || '#ffffff'
                          : merged.tabInactiveText || '#475569',
                        borderColor: isSelected ? merged.tabActiveBg || '#0f172a' : '#e2e8f0',
                        borderRadius: merged.tabBorderRadius || '9999px',
                      }}
                    >
                      <span>{tab.label}</span>
                      {tab.badgeText && (
                        <span
                          className="px-1.5 py-0.5 rounded-md text-[9px] uppercase tracking-wider font-extrabold"
                          style={{
                            backgroundColor: tab.badgeBg || '#e0e7ff',
                            color: tab.badgeColor || '#3730a3',
                          }}
                        >
                          {tab.badgeText}
                        </span>
                      )}
                      {merged.showProductCountInTabs && (
                        <span
                          className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
                          style={{
                            backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                            color: isSelected ? '#ffffff' : '#64748b',
                          }}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* ================= BRAND FILTERS WITH LOGOS (ROW 2) ================= */}
        {merged.showBrandFilters && (
          <div className="mb-8 pt-2">
            <div className="flex flex-wrap items-center gap-3">
              {merged.showAllBrandsPill && (
                <button
                  type="button"
                  onClick={() => setSelectedBrand('all')}
                  className={`h-11 px-5 rounded-2xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                    selectedBrand === 'all'
                      ? 'shadow-sm'
                      : 'hover:border-slate-400 bg-white'
                  }`}
                  style={{
                    backgroundColor:
                      selectedBrand === 'all'
                        ? merged.brandActiveBg || '#fdf2f8'
                        : merged.brandInactiveBg || '#ffffff',
                    borderColor:
                      selectedBrand === 'all'
                        ? merged.brandActiveBorder || '#DF0C88'
                        : merged.brandInactiveBorder || '#e2e8f0',
                    color:
                      selectedBrand === 'all'
                        ? merged.accentColor || '#DF0C88'
                        : '#334155',
                  }}
                >
                  <Layers className="w-4 h-4" />
                  <span>{merged.allBrandsLabel || 'All Brands'}</span>
                </button>
              )}

              {(merged.brandFilters || [])
                .filter((brand) => brand.enabled)
                .map((brand) => {
                  const isSelected = selectedBrand.toLowerCase() === brand.slug.toLowerCase();
                  return (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => setSelectedBrand(brand.slug)}
                      className={`h-11 px-4 rounded-2xl transition-all flex items-center gap-2.5 cursor-pointer border ${
                        isSelected
                          ? 'ring-2 ring-pink-500/20 shadow-sm'
                          : 'hover:border-slate-400 bg-white'
                      }`}
                      style={{
                        backgroundColor: isSelected
                          ? merged.brandActiveBg || '#fdf2f8'
                          : merged.brandInactiveBg || '#ffffff',
                        borderColor: isSelected
                          ? merged.brandActiveBorder || '#DF0C88'
                          : merged.brandInactiveBorder || '#e2e8f0',
                      }}
                    >
                      {brand.logoUrl ? (
                        <img
                          src={brand.logoUrl}
                          alt={brand.name}
                          className="w-5 h-5 object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : null}
                      <span
                        className={`text-xs md:text-sm font-bold ${
                          isSelected ? 'font-extrabold' : ''
                        }`}
                        style={{
                          color: isSelected
                            ? merged.accentColor || '#DF0C88'
                            : '#1e293b',
                        }}
                      >
                        {brand.name}
                      </span>
                    </button>
                  );
                })}

              {/* Active filters pill badge if filtered */}
              {(selectedCondition !== 'all' || selectedBrand !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCondition('all');
                    setSelectedBrand('all');
                  }}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 underline ml-auto cursor-pointer"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================= EMPTY STATE ================= */}
        {filteredProducts.length === 0 && (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              No matching products found
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
              {merged.emptyStateMessage}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCondition('all');
                setSelectedBrand('all');
              }}
              className="px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-sm cursor-pointer"
              style={{ backgroundColor: merged.accentColor || '#DF0C88' }}
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* ================= PRODUCTS GRID / CAROUSEL RENDERER ================= */}
        {filteredProducts.length > 0 && (
          merged.displayMode === 'carousel' ? (
            <div className="overflow-hidden py-2 -my-2 -mx-[5px] sm:-mx-2">
              <div
                className="flex items-stretch transition-transform duration-500 ease-out"
                style={{
                  transform: `translateX(-${carouselIndex * (100 / itemsPerView)}%)`,
                }}
              >
                {filteredProducts.map((prod, idx) => (
                  <div
                    key={prod.id}
                    className="shrink-0 px-[5px] sm:px-2 flex flex-col"
                    style={{
                      width: `calc(100% / ${itemsPerView})`,
                      maxWidth: '100%',
                    }}
                  >
                    <ProductCard
                      product={prod}
                      categories={categories}
                      priority={idx < itemsPerView}
                      onSelectProduct={viewProductDetail}
                      onAddToCart={handleAddToBasket}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5"
              style={
                merged.columnsDesktop && merged.columnsDesktop !== 4 && windowWidth >= 1024
                  ? { gridTemplateColumns: `repeat(${merged.columnsDesktop}, minmax(0, 1fr))` }
                  : undefined
              }
            >
              {filteredProducts.map((prod, idx) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  categories={categories}
                  priority={idx < 6}
                  onSelectProduct={viewProductDetail}
                  onAddToCart={handleAddToBasket}
                />
              ))}
            </div>
          )
        )}

        {/* ================= PROMO BANNER (BOTTOM POSITION) ================= */}
        {merged.showPromoBanner && merged.promoBannerPosition === 'bottom' && (
          <div
            className="mt-10 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-sm"
            style={{
              backgroundColor: merged.promoBg || '#0f172a',
              color: merged.promoTextColor || '#ffffff',
            }}
          >
            <div className="space-y-2 max-w-xl z-10">
              {merged.promoBadge && (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider"
                  style={{ backgroundColor: merged.accentColor || '#DF0C88', color: '#ffffff' }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {merged.promoBadge}
                </span>
              )}
              <h3 className="text-xl md:text-2xl font-black tracking-tight leading-tight">
                {merged.promoTitle}
              </h3>
              {merged.promoSubtitle && (
                <p className="text-sm text-slate-300 leading-relaxed">
                  {merged.promoSubtitle}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 z-10 shrink-0">
              {merged.promoButtonText && (
                <a
                  href={merged.promoButtonLink || '/repair'}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  style={{
                    backgroundColor: merged.accentColor || '#DF0C88',
                    color: '#ffffff',
                  }}
                >
                  {merged.promoButtonText}
                  <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
