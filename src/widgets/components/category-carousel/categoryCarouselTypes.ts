export type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export interface ResponsiveValue<T> {
  desktop: T;
  tablet?: T;
  mobile?: T;
}

export type ContentSourceType = 'catalogue_multi' | 'all_top_level' | 'children_of_parent' | 'custom_items';

export interface CategoryCarouselItem {
  id: string; // category id or custom id
  categoryId?: number;
  slug?: string;
  title: string;
  image: string;
  link: string;
  buttonText?: string;
  badgeText?: string;
  badgeBg?: string;
  badgeColor?: string;
  productCount?: number;
  hidden?: boolean;
  altText?: string;
  isCustom?: boolean;
}

export interface CategoryCarouselConfig {
  schemaVersion: number;
  widgetTitle?: string;

  // 1. Content Source Settings
  sourceType: ContentSourceType;
  selectedCategoryIds: number[]; // For catalogue_multi
  excludeCategoryIds: number[];  // For all_top_level
  parentCategoryId?: number;     // For children_of_parent
  customItems: CategoryCarouselItem[]; // For custom_items
  itemOverrides: Record<string, Partial<CategoryCarouselItem>>; // per-item overrides keyed by id/slug
  sortBy: 'manual' | 'alpha_asc' | 'alpha_desc' | 'count_desc' | 'newest';
  hideEmptyCategories: boolean;
  showProductCount: boolean;
  productCountFormat: string; // e.g. "{count} items" or "({count})"
  maxItems: number;
  openInNewTab: boolean;

  // 2. Responsive Layout Settings
  slidesPerView: ResponsiveValue<number>;
  slidesToScroll: ResponsiveValue<number>;
  spaceBetween: ResponsiveValue<number>;
  layoutType: ResponsiveValue<'carousel' | 'grid'>;
  gridColumns: ResponsiveValue<number>;
  gridRows: ResponsiveValue<number>;
  sectionPaddingTop: ResponsiveValue<number>;
  sectionPaddingBottom: ResponsiveValue<number>;
  sectionPaddingLeft: ResponsiveValue<number>;
  sectionPaddingRight: ResponsiveValue<number>;
  sectionMarginTop: ResponsiveValue<number>;
  sectionMarginBottom: ResponsiveValue<number>;
  showArrowsResponsive: ResponsiveValue<boolean>;
  showDotsResponsive: ResponsiveValue<boolean>;
  visibilityResponsive: ResponsiveValue<boolean>;

  // 3. Behaviour Settings
  loop: boolean;
  rewind: boolean;
  autoplay: boolean;
  autoplayDelay: number;
  autoplaySpeed: number;
  pauseOnHover: boolean;
  pauseOnTouch: boolean;
  stopOnInteraction: boolean;
  respectReducedMotion: boolean;
  pauseOffscreen: boolean;
  transitionEffect: 'slide' | 'fade';
  transitionEasing: string;
  dragEnabled: boolean;
  freeScroll: boolean;
  snapToCard: boolean;
  mousewheelScroll: boolean;
  keyboardNav: boolean;
  centeredSlides: boolean;
  initialSlide: number;
  grabCursor: boolean;
  entranceAnimation: 'none' | 'fade-up' | 'zoom';
  entranceStagger: number; // ms

  // 4. Section / Container Styling
  containerWidth: 'boxed' | 'full' | 'narrow';
  sectionBgType: 'color' | 'gradient' | 'image';
  sectionBgColor: string;
  sectionBgGradient: string;
  sectionBgImage: string;
  sectionBgOverlayOpacity: number;
  sectionBorderWidth: number;
  sectionBorderColor: string;
  sectionBorderRadius: number;

  // Section Heading
  showHeading: boolean;
  headingText: string;
  subtitleText: string;
  headingAlignment: 'left' | 'center' | 'right';
  showViewAll: boolean;
  viewAllText: string;
  viewAllLink: string;
  headingColor: string;
  subtitleColor: string;
  headingSize: ResponsiveValue<number>;
  headingWeight: 'normal' | 'semibold' | 'bold' | 'extrabold';
  showHeadingAccent: boolean;
  headingAccentColor: string;

  // 5. Card Styling
  cardBgColor: string;
  cardBgHoverColor: string;
  cardBgGradient?: string;
  cardBorderRadius: number; // px
  cardBorderWidth: number;
  cardBorderStyle: 'solid' | 'dashed' | 'dotted' | 'none';
  cardBorderColor: string;
  cardBorderHoverColor: string;
  cardPadding: number; // px
  cardMinHeight: number; // px
  equalHeight: boolean;
  cardLayout: 'vertical' | 'horizontal';
  contentAlignment: 'left' | 'center' | 'right';
  contentGap: number; // px between image and text
  cardShadow: 'none' | 'sm' | 'md' | 'lg' | 'hover-lift';
  cardHoverEffect: 'lift' | 'scale' | 'glow' | 'border' | 'none';
  cardClickableArea: 'whole_card' | 'button_only';
  imageHolderEnabled: boolean;
  imageHolderShape: 'circle' | 'square' | 'rounded';
  imageHolderBg: string;
  imageHolderBorderColor: string;

  // 6. Image Styling
  imageWidth: ResponsiveValue<number>;
  imageHeight: ResponsiveValue<number>;
  imageFit: 'contain' | 'cover' | 'fill' | 'scale-down';
  imageRadius: number;
  imageHoverAnimation: 'zoom' | 'float' | 'tilt' | 'none';
  lazyLoading: boolean;

  // 7. Title Styling
  titleFont: string;
  titleSize: ResponsiveValue<number>;
  titleWeight: 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
  titleColor: string;
  titleHoverColor: string;
  titleMaxLines: number;
  titleTransform: 'none' | 'uppercase' | 'capitalize' | 'lowercase';

  // 8. "Buy Now" / Action Link Styling
  showActionButton: boolean;
  actionButtonText: string;
  actionButtonStyle: 'plain' | 'underlined' | 'with_arrow' | 'outline' | 'filled';
  actionButtonSize: ResponsiveValue<number>;
  actionButtonWeight: 'normal' | 'medium' | 'semibold' | 'bold';
  actionButtonColor: string;
  actionButtonHoverColor: string;
  actionButtonBg?: string;
  actionButtonHoverBg?: string;
  actionButtonBorderRadius: number;
  actionButtonPaddingX: number;
  actionButtonPaddingY: number;

  // 9. Product Count & Badge Styling
  countColor: string;
  countSize: number;
  badgePosition: 'top-left' | 'top-right' | 'bottom-right';
  badgeShape: 'pill' | 'square' | 'circle';
  defaultBadgeBg: string;
  defaultBadgeColor: string;

  // 10. Navigation Arrows Styling
  arrowStyle: 'circle' | 'square' | 'minimal' | 'custom';
  arrowSize: number;
  arrowIconColor: string;
  arrowHoverIconColor: string;
  arrowBgColor: string;
  arrowHoverBgColor: string;
  arrowBorderColor: string;
  arrowPosition: 'sides' | 'top_right' | 'bottom_center' | 'overlapping';
  arrowShowOnHoverOnly: boolean;

  // 11. Pagination Styling
  paginationType: 'dots' | 'dynamic_dots' | 'progress' | 'fraction' | 'none';
  paginationColor: string;
  paginationActiveColor: string;
  paginationPosition: 'below' | 'inside';
  showScrollbar: boolean;

  // 12. Active Preset & Advanced
  activePreset: string;
  customCssClass?: string;
  scopedCss?: string;
  customCss?: string;
  anchorId?: string;
  showArrows?: boolean;
  showDots?: boolean;
  arrowShape?: string;
}

// ----------------------------------------------------------------------
// Responsive Resolution Helper (Inherits Desktop -> Tablet -> Mobile)
// ----------------------------------------------------------------------
export function resolveResponsive<T>(val: ResponsiveValue<T> | undefined, device: DeviceMode, fallback?: T): T {
  const def = fallback !== undefined ? fallback : (val ? val.desktop : (undefined as unknown as T));
  if (!val) return def;
  if (device === 'mobile') {
    if (val.mobile !== undefined && val.mobile !== null) return val.mobile;
    if (val.tablet !== undefined && val.tablet !== null) return val.tablet;
    return val.desktop !== undefined && val.desktop !== null ? val.desktop : def;
  }
  if (device === 'tablet') {
    if (val.tablet !== undefined && val.tablet !== null) return val.tablet;
    return val.desktop !== undefined && val.desktop !== null ? val.desktop : def;
  }
  return val.desktop !== undefined && val.desktop !== null ? val.desktop : def;
}

export function hasDeviceOverride<T>(val: ResponsiveValue<T> | undefined, device: DeviceMode): boolean {
  if (!val) return false;
  if (device === 'mobile') return val.mobile !== undefined && val.mobile !== null;
  if (device === 'tablet') return val.tablet !== undefined && val.tablet !== null;
  return true;
}

// ----------------------------------------------------------------------
// 8 Default Categories
// ----------------------------------------------------------------------
export const SEED_CATEGORIES: CategoryCarouselItem[] = [
  {
    id: 'seed_mobile',
    categoryId: 1375,
    slug: 'mobile-phones',
    title: 'Smartphones',
    image: '/images/categories/cat_mobile-phone.png',
    link: '/product-category/mobile-phones/',
    buttonText: 'Explore',
    productCount: 130,
    altText: 'Certified Refurbished & New Smartphones',
  },
  {
    id: 'seed_ipad',
    categoryId: 53,
    slug: 'tablets-and-ipads',
    title: 'Tablets & iPads',
    image: '/images/categories/cat_ipad-tablets.png',
    link: '/product-category/tablets-and-ipads/',
    buttonText: 'Explore',
    productCount: 9,
    altText: 'Refurbished Apple iPads and Android Tablets',
  },
  {
    id: 'seed_laptops',
    categoryId: 55,
    slug: 'laptop-and-pc',
    title: 'Laptops',
    image: '/images/categories/cat_laptops.png',
    link: '/product-category/laptop-and-pc/',
    buttonText: 'Explore',
    productCount: 2,
    altText: 'Laptops, MacBooks and Computers',
  },
  {
    id: 'seed_headphones',
    categoryId: 1378,
    slug: 'gaming-headsets',
    title: 'Headphones',
    image: '/images/categories/cat_headphones.png',
    link: '/shop?category=headphones',
    buttonText: 'Explore',
    productCount: 8,
    altText: 'Noise Cancelling Headphones & Audio Earbuds',
  },
  {
    id: 'seed_gaming',
    categoryId: 1347,
    slug: 'gaming-accessories',
    title: 'Gaming',
    image: '/images/categories/cat_game-devices.png',
    link: '/shop?category=gaming',
    buttonText: 'Explore',
    productCount: 14,
    altText: 'Consoles, Controllers and Gaming Gear',
  },
  {
    id: 'seed_watches',
    categoryId: 136,
    slug: 'apple-watches',
    title: 'Smartwatches',
    image: '/images/categories/cat_watches.png',
    link: '/shop?category=watches',
    buttonText: 'Explore',
    productCount: 6,
    altText: 'Apple Watches and Smartwatches',
  },
  {
    id: 'seed_cases',
    categoryId: 149,
    slug: 'iphone-cases',
    title: 'Cases & Covers',
    image: '/images/categories/cat_cases.png',
    link: '/shop?category=cases',
    buttonText: 'Explore',
    productCount: 42,
    altText: 'Shockproof Cases and Protective Covers',
  },
  {
    id: 'seed_chargers',
    categoryId: 1374,
    slug: 'mobile-charger',
    title: 'Chargers & Cables',
    image: '/images/categories/cat_chargers.png',
    link: '/shop?category=chargers',
    buttonText: 'Explore',
    productCount: 28,
    altText: 'Fast Wall Chargers, Cables and Adapters',
  },
];

// ----------------------------------------------------------------------
// Default Configuration
// ----------------------------------------------------------------------
export const DEFAULT_CATEGORY_CAROUSEL_CONFIG: CategoryCarouselConfig = {
  schemaVersion: 1,
  widgetTitle: 'Shop By Category',

  // 1. Content Source Settings
  sourceType: 'catalogue_multi',
  selectedCategoryIds: [1375, 53, 55, 1378, 1347, 136, 149, 1374],
  excludeCategoryIds: [],
  parentCategoryId: 0,
  customItems: SEED_CATEGORIES,
  itemOverrides: {},
  sortBy: 'manual',
  hideEmptyCategories: false,
  showProductCount: false,
  productCountFormat: '{count} items',
  maxItems: 16,
  openInNewTab: false,

  // 2. Responsive Layout Settings (Desktop: 8, Tablet: 4, Mobile: 2.35)
  slidesPerView: { desktop: 8, tablet: 4, mobile: 2.35 },
  slidesToScroll: { desktop: 1, tablet: 1, mobile: 1 },
  spaceBetween: { desktop: 14, tablet: 12, mobile: 10 },
  layoutType: { desktop: 'carousel', tablet: 'carousel', mobile: 'carousel' },
  gridColumns: { desktop: 8, tablet: 4, mobile: 2 },
  gridRows: { desktop: 1, tablet: 1, mobile: 1 },
  sectionPaddingTop: { desktop: 24, tablet: 20, mobile: 16 },
  sectionPaddingBottom: { desktop: 28, tablet: 24, mobile: 16 },
  sectionPaddingLeft: { desktop: 0, tablet: 0, mobile: 0 },
  sectionPaddingRight: { desktop: 0, tablet: 0, mobile: 0 },
  sectionMarginTop: { desktop: 0, tablet: 0, mobile: 0 },
  sectionMarginBottom: { desktop: 0, tablet: 0, mobile: 0 },
  showArrowsResponsive: { desktop: true, tablet: true, mobile: false },
  showDotsResponsive: { desktop: false, tablet: true, mobile: true },
  visibilityResponsive: { desktop: true, tablet: true, mobile: true },

  // 3. Behaviour Settings
  loop: false,
  rewind: true,
  autoplay: false,
  autoplayDelay: 4500,
  autoplaySpeed: 600,
  pauseOnHover: true,
  pauseOnTouch: true,
  stopOnInteraction: false,
  respectReducedMotion: true,
  pauseOffscreen: true,
  transitionEffect: 'slide',
  transitionEasing: 'cubic-bezier(0.25, 1, 0.5, 1)',
  dragEnabled: true,
  freeScroll: false,
  snapToCard: true,
  mousewheelScroll: false,
  keyboardNav: true,
  centeredSlides: false,
  initialSlide: 0,
  grabCursor: true,
  entranceAnimation: 'fade-up',
  entranceStagger: 45,

  // 4. Section / Container Styling
  containerWidth: 'boxed',
  sectionBgType: 'color',
  sectionBgColor: '#ffffff',
  sectionBgGradient: 'linear-gradient(to bottom, #ffffff, #f8fafc)',
  sectionBgImage: '',
  sectionBgOverlayOpacity: 0.15,
  sectionBorderWidth: 0,
  sectionBorderColor: '#e2e8f0',
  sectionBorderRadius: 0,

  // Section Heading
  showHeading: false,
  headingText: 'Shop by Category',
  subtitleText: 'Explore genuine refurbished phones, tablets, parts & accessories',
  headingAlignment: 'left',
  showViewAll: false,
  viewAllText: 'View All Categories',
  viewAllLink: '/shop',
  headingColor: '#0B0D12',
  subtitleColor: '#64748b',
  headingSize: { desktop: 26, tablet: 22, mobile: 20 },
  headingWeight: 'bold',
  showHeadingAccent: false,
  headingAccentColor: '#E6007E',

  // 5. Card Styling (Crisp white cards with subtle slate border & rounded-2xl)
  cardBgColor: '#FFFFFF',
  cardBgHoverColor: '#FFFFFF',
  cardBorderRadius: 16,
  cardBorderWidth: 1,
  cardBorderStyle: 'solid',
  cardBorderColor: 'rgba(226, 232, 240, 0.85)',
  cardBorderHoverColor: 'rgba(230, 0, 126, 0.4)',
  cardPadding: 20,
  cardMinHeight: 184,
  equalHeight: true,
  cardLayout: 'vertical',
  contentAlignment: 'center',
  contentGap: 12,
  cardShadow: 'none',
  cardHoverEffect: 'lift',
  cardClickableArea: 'whole_card',
  imageHolderEnabled: false,
  imageHolderShape: 'circle',
  imageHolderBg: '#F8FAFC',
  imageHolderBorderColor: '#e2e8f0',

  // 6. Image Styling (~72px tall, object-fit contain)
  imageWidth: { desktop: 74, tablet: 70, mobile: 64 },
  imageHeight: { desktop: 72, tablet: 68, mobile: 62 },
  imageFit: 'contain',
  imageRadius: 0,
  imageHoverAnimation: 'float',
  lazyLoading: true,

  // 7. Title Styling (concise, semibold slate-900)
  titleFont: 'Plus Jakarta Sans',
  titleSize: { desktop: 14, tablet: 13, mobile: 13 },
  titleWeight: 'semibold',
  titleColor: '#0B0D12',
  titleHoverColor: '#0B0D12',
  titleMaxLines: 1,
  titleTransform: 'none',

  // 8. "Explore →" Action Link Styling
  showActionButton: true,
  actionButtonText: 'Explore',
  actionButtonStyle: 'with_arrow',
  actionButtonSize: { desktop: 12, tablet: 12, mobile: 11 },
  actionButtonWeight: 'semibold',
  actionButtonColor: '#64748b',
  actionButtonHoverColor: '#E6007E',
  actionButtonBorderRadius: 6,
  actionButtonPaddingX: 0,
  actionButtonPaddingY: 0,

  // 9. Product Count & Badge Styling
  countColor: '#94a3b8',
  countSize: 11,
  badgePosition: 'top-right',
  badgeShape: 'pill',
  defaultBadgeBg: '#E6007E',
  defaultBadgeColor: '#ffffff',

  // 10. Navigation Arrows
  arrowStyle: 'circle',
  arrowSize: 36,
  arrowIconColor: '#0B0D12',
  arrowHoverIconColor: '#ffffff',
  arrowBgColor: '#ffffff',
  arrowHoverBgColor: '#E6007E',
  arrowBorderColor: '#e2e8f0',
  arrowPosition: 'sides',
  arrowShowOnHoverOnly: false,

  // 11. Pagination
  paginationType: 'dots',
  paginationColor: '#cbd5e1',
  paginationActiveColor: '#E6007E',
  paginationPosition: 'below',
  showScrollbar: false,

  // 12. Active Preset & Advanced
  activePreset: 'white_cards_shadow',
  customCssClass: '',
  scopedCss: '',
};

// ----------------------------------------------------------------------
// Color Contrast Helper
// ----------------------------------------------------------------------
function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length < 6) return 0.5;
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function calculateContrastRatio(hex1: string, hex2: string): number {
  try {
    const l1 = getLuminance(hex1) + 0.05;
    const l2 = getLuminance(hex2) + 0.05;
    return l1 > l2 ? l1 / l2 : l2 / l1;
  } catch {
    return 4.5;
  }
}

export function checkContrast(textColor: string, bgColor: string): { ratio: number; passesAA: boolean; passesAAA: boolean } {
  const ratio = parseFloat(calculateContrastRatio(textColor, bgColor).toFixed(2));
  return {
    ratio,
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7.0,
  };
}
