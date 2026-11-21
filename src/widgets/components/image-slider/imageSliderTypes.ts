export type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export interface ResponsiveValue<T> {
  desktop: T;
  tablet?: T;
  mobile?: T;
}

export type HeightMode = 'fixed' | 'aspect_ratio' | 'auto';
export type LayoutMode = 'boxed' | 'full' | 'full_bleed';
export type TransitionEffect = 'slide' | 'fade' | 'cross_fade' | 'zoom' | 'cube' | 'flip' | 'cards' | 'coverflow';
export type ImageFitMode = 'cover' | 'contain' | 'fill';
export type ContentPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center-center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface SlideFocalPoint {
  x: number; // 0 - 100 percentage
  y: number; // 0 - 100 percentage
}

export interface SlideButtonConfig {
  id: string;
  text: string;
  link: string;
  openInNewTab?: boolean;
  style: 'primary' | 'secondary' | 'outline' | 'link';
  icon?: string;
  iconPosition?: 'before' | 'after';
  customBg?: string;
  customColor?: string;
  customHoverBg?: string;
}

export interface SlideItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  useH1?: boolean; // Single H1 for first slide option
  
  // Images per device (Core requirement)
  images: {
    desktop: string; // Required
    tablet?: string; // Optional, falls back to desktop
    mobile?: string; // Optional, falls back to tablet, then desktop
  };
  altText: string;
  focalPoints?: {
    desktop?: SlideFocalPoint;
    tablet?: SlideFocalPoint;
    mobile?: SlideFocalPoint;
  };
  
  // Video option
  mediaType?: 'image' | 'video';
  videoUrl?: string; // MP4/WebM or YouTube/Vimeo
  videoPoster?: string;
  showPosterOnMobile?: boolean; // Save data on mobile

  // Content toggles & positioning
  showContent?: boolean;
  contentPosition?: ResponsiveValue<ContentPosition>;
  showTextOverlay?: ResponsiveValue<boolean>; // e.g. hide text on mobile
  textAlignment?: ResponsiveValue<'left' | 'center' | 'right'>;
  maxContentWidth?: ResponsiveValue<number>; // in px
  titleColor?: string;
  subtitleColor?: string;
  descriptionColor?: string;

  // Slide Overlay
  overlayColor?: string;
  overlayOpacity?: number; // 0 - 1
  overlayGradient?: 'none' | 'left_fade' | 'right_fade' | 'bottom_fade' | 'top_fade' | 'vignette' | 'radial' | 'solid';

  // Up to 2 buttons
  buttons?: SlideButtonConfig[];

  // Whole slide clickable link
  slideLink?: {
    enabled?: boolean;
    url: string;
    openInNewTab?: boolean;
    relNofollow?: boolean;
    relSponsored?: boolean;
  };

  // Scheduling & visibility
  scheduling?: {
    enabled?: boolean;
    showFrom?: string; // ISO date string
    showUntil?: string; // ISO date string
  };
  visibility?: {
    desktop?: boolean;
    tablet?: boolean;
    mobile?: boolean;
  };
  isHidden?: boolean;
}

export interface ImageSliderConfig {
  widgetTitle?: string;
  
  // Breakpoints configuration (px)
  desktopBreakpoint: number; // default 1024
  tabletBreakpoint: number;  // default 768

  // Slides
  slides: SlideItem[];

  // Layout settings (Responsive)
  layoutMode: ResponsiveValue<LayoutMode>;
  heightMode: ResponsiveValue<HeightMode>;
  fixedHeight: ResponsiveValue<number>; // px
  aspectRatio: ResponsiveValue<string>; // '16:9', '21:9', '4:3', '1:1', 'custom'
  customAspectRatio: ResponsiveValue<string>; // e.g. '3:2'
  slidesPerView: ResponsiveValue<number>; // e.g. 1, 1.2, 2, 3, 4
  slidesPerGroup: ResponsiveValue<number>;
  spaceBetween: ResponsiveValue<number>; // px
  centeredSlides: ResponsiveValue<boolean>;
  peekPadding: ResponsiveValue<number>; // px
  imageFit: ResponsiveValue<ImageFitMode>;
  cornerRadius: ResponsiveValue<number>; // px
  shadow: ResponsiveValue<'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'>;
  slideDirection: 'horizontal' | 'vertical'; // desktop only
  initialSlide: number;

  // Behaviour settings
  transitionEffect: TransitionEffect;
  transitionSpeed: number; // ms
  easing: string; // 'ease-out', 'ease-in-out', 'linear', etc.
  autoplay: {
    enabled: boolean;
    delay: number; // ms
    pauseOnHover: boolean;
    pauseOnTouch: boolean;
    stopOnInteraction: boolean;
    showProgress: 'none' | 'bar' | 'ring';
  };
  loop: boolean;
  rewind: boolean;
  freeScroll: boolean;
  snapToSlide: boolean;
  touchDrag: boolean;
  swipeThreshold: number; // px
  mouseWheel: boolean;
  keyboardNav: boolean;
  lazyLoading: boolean;
  placeholderType: 'blur' | 'color';
  syncUrlHash: boolean;
  kenBurns: {
    enabled: boolean;
    direction: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right';
    zoomAmount: number; // e.g. 1.12
    duration: number; // ms
  };
  parallax: boolean;
  pauseOffscreen: boolean;

  // Navigation controls
  arrows: {
    showDesktop: boolean;
    showTablet: boolean;
    showMobile: boolean;
    style: 'circle' | 'square' | 'minimal' | 'rounded';
    size: number; // px
    color: string;
    hoverColor: string;
    bgColor: string;
    hoverBgColor: string;
    borderColor: string;
    borderRadius: number;
    position: 'inside' | 'outside' | 'over_image' | 'top_aligned' | 'bottom_aligned';
    offsetX: number;
    offsetY: number;
    showOnHoverOnly: boolean;
  };

  pagination: {
    type: 'bullets' | 'dynamic_bullets' | 'numbers' | 'fraction' | 'progress_bar' | 'thumbnails' | 'none';
    position: 'bottom' | 'top' | 'left' | 'right' | 'outside';
    alignment: 'center' | 'left' | 'right';
    size: number;
    gap: number;
    color: string;
    activeColor: string;
    shape: 'dot' | 'line' | 'square' | 'pill';
    clickable: boolean;
  };

  thumbnails: {
    enabled: boolean;
    position: 'below' | 'beside';
    size: number; // px
    gap: number;
    activeBorderColor: string;
    visibleCount: number;
  };

  scrollbar: {
    enabled: boolean;
    color: string;
    trackColor: string;
    height: number;
  };

  playPauseButton: {
    enabled: boolean;
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  };

  counter: {
    enabled: boolean;
    format: 'standard' | 'padded';
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  };

  // Styling
  container: {
    bgType: 'color' | 'gradient' | 'image' | 'transparent';
    bgColor: string;
    gradient: string;
    bgImage: string;
    paddingTop: number;
    paddingBottom: number;
    paddingLeft: number;
    paddingRight: number;
    marginTop: number;
    marginBottom: number;
    borderWidth: number;
    borderStyle: 'solid' | 'dashed' | 'dotted' | 'none';
    borderColor: string;
    borderRadius: number;
    shadow: string;
    overflow: 'hidden' | 'visible';
  };

  slideStyle: {
    borderRadius: number;
    borderWidth: number;
    borderColor: string;
    shadow: string;
    transparentBgColor: string;
    innerPadding: number;
    hoverEffect: 'none' | 'scale' | 'brightness' | 'lift';
    inactiveScale: number; // e.g. 0.92 for carousels
    inactiveOpacity: number; // e.g. 0.65
  };

  typography: {
    headingFont: string;
    headingSize: ResponsiveValue<number>;
    headingWeight: number;
    headingLineHeight: number;
    headingLetterSpacing: number;
    headingTransform: 'none' | 'uppercase' | 'capitalize';
    headingColor: string;
    headingShadow: boolean;

    subheadingFont: string;
    subheadingSize: ResponsiveValue<number>;
    subheadingWeight: number;
    subheadingColor: string;

    descriptionFont: string;
    descriptionSize: ResponsiveValue<number>;
    descriptionColor: string;
    descriptionLineHeight: number;
  };

  buttonsStyle: {
    primaryBg: string;
    primaryHoverBg: string;
    primaryColor: string;
    primaryHoverColor: string;
    primaryRadius: number;
    primaryBorder: string;
    secondaryBg: string;
    secondaryHoverBg: string;
    secondaryColor: string;
    secondaryHoverColor: string;
    secondaryRadius: number;
    secondaryBorder: string;
    paddingX: number;
    paddingY: number;
  };

  entranceAnimation: {
    type: 'fade' | 'slide_up' | 'slide_left' | 'zoom' | 'none';
    duration: number; // ms
    delay: number; // ms
    stagger: number; // ms
  };

  customCssClass?: string;
  advancedCss?: string;
  activePreset?: string;
}

/**
 * Resolves a responsive setting for a specific device, falling back to larger screens:
 * mobile -> tablet -> desktop
 */
export function resolveResponsive<T>(
  val: ResponsiveValue<T> | T | undefined,
  device: DeviceMode,
  fallback: T
): T {
  if (val === undefined || val === null) return fallback;
  if (typeof val !== 'object' || !('desktop' in (val as any))) {
    return val as T;
  }
  const r = val as ResponsiveValue<T>;
  if (device === 'mobile') {
    if (r.mobile !== undefined && r.mobile !== null) return r.mobile;
    if (r.tablet !== undefined && r.tablet !== null) return r.tablet;
    return r.desktop ?? fallback;
  }
  if (device === 'tablet') {
    if (r.tablet !== undefined && r.tablet !== null) return r.tablet;
    return r.desktop ?? fallback;
  }
  return r.desktop ?? fallback;
}

/**
 * Returns true if a device has an explicit override set on the responsive value
 */
export function hasResponsiveOverride<T>(
  val: ResponsiveValue<T> | undefined,
  device: DeviceMode
): boolean {
  if (!val || typeof val !== 'object') return false;
  if (device === 'desktop') return val.desktop !== undefined;
  if (device === 'tablet') return val.tablet !== undefined;
  if (device === 'mobile') return val.mobile !== undefined;
  return false;
}

/**
 * Calculate WCAG contrast ratio between two hex colors or a hex color against overlay
 */
export function calculateContrastRatio(foregroundHex: string, backgroundHex: string, opacity = 1): number {
  try {
    const parseRgb = (hex: string) => {
      let clean = hex.replace('#', '');
      if (clean.length === 3) {
        clean = clean.split('').map(c => c + c).join('');
      }
      const num = parseInt(clean, 16);
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
      };
    };

    const getLuminance = (rgb: { r: number; g: number; b: number }) => {
      const a = [rgb.r, rgb.g, rgb.b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    };

    const fg = parseRgb(foregroundHex || '#ffffff');
    const bgRaw = parseRgb(backgroundHex || '#000000');
    // blend with black background
    const bg = {
      r: Math.round(bgRaw.r * opacity),
      g: Math.round(bgRaw.g * opacity),
      b: Math.round(bgRaw.b * opacity),
    };

    const l1 = getLuminance(fg);
    const l2 = getLuminance(bg);
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    return (brightest + 0.05) / (darkest + 0.05);
  } catch {
    return 7;
  }
}

export const DEFAULT_IMAGE_SLIDER_CONFIG: ImageSliderConfig = {
  widgetTitle: 'Main Showcase Slider',
  desktopBreakpoint: 1024,
  tabletBreakpoint: 768,
  slides: [
    {
      id: 'slide-1',
      title: 'EXPRESS PHONE & TECH REPAIRS',
      subtitle: 'Official 6-Month UK Hardware Guarantee',
      description: 'Cracked screen or dead battery? Restored in 30 minutes by certified diagnostic technicians across 8 UK stores.',
      badge: '30-Min Fast Turnaround',
      badgeColor: '#DF0C88',
      badgeBg: 'rgba(255, 255, 255, 0.9)',
      useH1: true,
      images: {
        desktop: '/src/assets/images/hero_repair_specialist_1790843562093.jpg',
        tablet: '/src/assets/images/hero_repair_specialist_1790843562093.jpg',
        mobile: '/src/assets/images/repair_screen_replacement_1790843586924.jpg',
      },
      altText: 'Expert engineer repairing smartphone in certified lab',
      focalPoints: {
        desktop: { x: 50, y: 50 },
        tablet: { x: 50, y: 50 },
        mobile: { x: 50, y: 50 },
      },
      showContent: true,
      contentPosition: {
        desktop: 'center-left',
        tablet: 'center-left',
        mobile: 'bottom-center',
      },
      showTextOverlay: {
        desktop: true,
        tablet: true,
        mobile: true,
      },
      textAlignment: {
        desktop: 'left',
        tablet: 'left',
        mobile: 'center',
      },
      maxContentWidth: {
        desktop: 640,
        tablet: 560,
        mobile: 420,
      },
      titleColor: '#ffffff',
      subtitleColor: '#fce7f3',
      descriptionColor: '#e2e8f0',
      overlayColor: '#020617',
      overlayOpacity: 0.38,
      overlayGradient: 'left_fade',
      buttons: [
        {
          id: 'btn-1',
          text: 'Book an Express Repair',
          link: '/book-repair',
          style: 'primary',
          icon: 'Wrench',
          iconPosition: 'before',
        },
        {
          id: 'btn-2',
          text: 'Find Nearest Branch',
          link: '/locations',
          style: 'secondary',
          icon: 'MapPin',
          iconPosition: 'before',
        },
      ],
      slideLink: {
        enabled: false,
        url: '',
      },
      visibility: {
        desktop: true,
        tablet: true,
        mobile: true,
      },
    },
    {
      id: 'slide-2',
      title: 'CERTIFIED REFURBISHED SMARTPHONES',
      subtitle: 'Pristine Grade Devices With 12-Month Guarantee',
      description: 'Save up to 40% on certified pre-owned iPhones, Samsung Galaxy & Google Pixel models with 70-point diagnostics.',
      badge: 'Save Up to 40% vs New',
      badgeColor: '#10b981',
      badgeBg: 'rgba(255, 255, 255, 0.9)',
      images: {
        desktop: '/src/assets/images/shop_refurbished_phones_1790843576058.jpg',
        tablet: '/src/assets/images/shop_refurbished_phones_1790843576058.jpg',
        mobile: '/src/assets/images/shop_refurbished_phones_1790843576058.jpg',
      },
      altText: 'Showcase of pristine refurbished smartphones with warranty',
      focalPoints: {
        desktop: { x: 50, y: 50 },
        tablet: { x: 50, y: 50 },
        mobile: { x: 50, y: 50 },
      },
      showContent: true,
      contentPosition: {
        desktop: 'center-left',
        tablet: 'center-left',
        mobile: 'bottom-center',
      },
      showTextOverlay: {
        desktop: true,
        tablet: true,
        mobile: true,
      },
      textAlignment: {
        desktop: 'left',
        tablet: 'left',
        mobile: 'center',
      },
      maxContentWidth: {
        desktop: 640,
        tablet: 560,
        mobile: 420,
      },
      titleColor: '#ffffff',
      subtitleColor: '#d1fae5',
      descriptionColor: '#e2e8f0',
      overlayColor: '#020617',
      overlayOpacity: 0.35,
      overlayGradient: 'left_fade',
      buttons: [
        {
          id: 'btn-1',
          text: 'Shop Refurbished Phones',
          link: '/shop',
          style: 'primary',
          icon: 'ShoppingBag',
          iconPosition: 'before',
        },
      ],
      slideLink: {
        enabled: false,
        url: '',
      },
      visibility: {
        desktop: true,
        tablet: true,
        mobile: true,
      },
    },
    {
      id: 'slide-3',
      title: 'MACBOOK & LAPTOP COMPONENT REPAIRS',
      subtitle: 'Board-Level Microsoldering & Screen Replacements',
      description: 'Liquid damage, battery failure, or broken hinges repaired quickly with genuine-spec parts and full testing.',
      badge: 'Free Diagnostic Check',
      badgeColor: '#3b82f6',
      badgeBg: 'rgba(255, 255, 255, 0.9)',
      images: {
        desktop: '/src/assets/images/laptop_repair_service_1790843599871.jpg',
        tablet: '/src/assets/images/laptop_repair_service_1790843599871.jpg',
        mobile: '/src/assets/images/laptop_repair_service_1790843599871.jpg',
      },
      altText: 'Laptop motherboard diagnostics and repair workbench',
      focalPoints: {
        desktop: { x: 50, y: 50 },
        tablet: { x: 50, y: 50 },
        mobile: { x: 50, y: 50 },
      },
      showContent: true,
      contentPosition: {
        desktop: 'center-left',
        tablet: 'center-left',
        mobile: 'bottom-center',
      },
      showTextOverlay: {
        desktop: true,
        tablet: true,
        mobile: true,
      },
      textAlignment: {
        desktop: 'left',
        tablet: 'left',
        mobile: 'center',
      },
      maxContentWidth: {
        desktop: 640,
        tablet: 560,
        mobile: 420,
      },
      titleColor: '#ffffff',
      subtitleColor: '#dbeafe',
      descriptionColor: '#e2e8f0',
      overlayColor: '#020617',
      overlayOpacity: 0.35,
      overlayGradient: 'left_fade',
      buttons: [
        {
          id: 'btn-1',
          text: 'Laptop Repair Pricing',
          link: '/book-repair',
          style: 'primary',
          icon: 'Laptop',
          iconPosition: 'before',
        },
      ],
      slideLink: {
        enabled: false,
        url: '',
      },
      visibility: {
        desktop: true,
        tablet: true,
        mobile: true,
      },
    },
  ],

  // Layout Settings (Responsive)
  layoutMode: {
    desktop: 'full',
    tablet: 'full',
    mobile: 'full',
  },
  heightMode: {
    desktop: 'fixed',
    tablet: 'fixed',
    mobile: 'fixed',
  },
  fixedHeight: {
    desktop: 560,
    tablet: 480,
    mobile: 440,
  },
  aspectRatio: {
    desktop: '16:9',
    tablet: '16:9',
    mobile: '4:3',
  },
  customAspectRatio: {
    desktop: '16:9',
  },
  slidesPerView: {
    desktop: 1,
    tablet: 1,
    mobile: 1,
  },
  slidesPerGroup: {
    desktop: 1,
    tablet: 1,
    mobile: 1,
  },
  spaceBetween: {
    desktop: 0,
    tablet: 0,
    mobile: 0,
  },
  centeredSlides: {
    desktop: false,
    tablet: false,
    mobile: false,
  },
  peekPadding: {
    desktop: 0,
    tablet: 0,
    mobile: 0,
  },
  imageFit: {
    desktop: 'cover',
    tablet: 'cover',
    mobile: 'cover',
  },
  cornerRadius: {
    desktop: 0,
    tablet: 0,
    mobile: 0,
  },
  shadow: {
    desktop: 'none',
    tablet: 'none',
    mobile: 'none',
  },
  slideDirection: 'horizontal',
  initialSlide: 0,

  // Behaviour
  transitionEffect: 'slide',
  transitionSpeed: 600,
  easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
  autoplay: {
    enabled: true,
    delay: 6000,
    pauseOnHover: true,
    pauseOnTouch: true,
    stopOnInteraction: false,
    showProgress: 'bar',
  },
  loop: true,
  rewind: false,
  freeScroll: false,
  snapToSlide: true,
  touchDrag: true,
  swipeThreshold: 40,
  mouseWheel: false,
  keyboardNav: true,
  lazyLoading: true,
  placeholderType: 'color',
  syncUrlHash: false,
  kenBurns: {
    enabled: false,
    direction: 'zoom-in',
    zoomAmount: 1.08,
    duration: 7000,
  },
  parallax: false,
  pauseOffscreen: true,

  // Navigation
  arrows: {
    showDesktop: true,
    showTablet: true,
    showMobile: false,
    style: 'circle',
    size: 48,
    color: '#0f172a',
    hoverColor: '#DF0C88',
    bgColor: 'rgba(255, 255, 255, 0.92)',
    hoverBgColor: '#ffffff',
    borderColor: 'rgba(226, 232, 240, 0.8)',
    borderRadius: 9999,
    position: 'inside',
    offsetX: 24,
    offsetY: 0,
    showOnHoverOnly: false,
  },

  pagination: {
    type: 'bullets',
    position: 'bottom',
    alignment: 'center',
    size: 10,
    gap: 8,
    color: 'rgba(255, 255, 255, 0.45)',
    activeColor: '#DF0C88',
    shape: 'pill',
    clickable: true,
  },

  thumbnails: {
    enabled: false,
    position: 'below',
    size: 72,
    gap: 12,
    activeBorderColor: '#DF0C88',
    visibleCount: 5,
  },

  scrollbar: {
    enabled: false,
    color: '#DF0C88',
    trackColor: 'rgba(255, 255, 255, 0.2)',
    height: 4,
  },

  playPauseButton: {
    enabled: true,
    position: 'bottom-right',
  },

  counter: {
    enabled: true,
    format: 'standard',
    position: 'top-right',
  },

  // Styling
  container: {
    bgType: 'color',
    bgColor: '#020617',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    bgImage: '',
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    marginTop: 0,
    marginBottom: 0,
    borderWidth: 0,
    borderStyle: 'none',
    borderColor: '#e2e8f0',
    borderRadius: 0,
    shadow: 'none',
    overflow: 'hidden',
  },

  slideStyle: {
    borderRadius: 0,
    borderWidth: 0,
    borderColor: '#e2e8f0',
    shadow: 'none',
    transparentBgColor: '#090d16',
    innerPadding: 0,
    hoverEffect: 'none',
    inactiveScale: 0.92,
    inactiveOpacity: 0.65,
  },

  typography: {
    headingFont: 'Plus Jakarta Sans',
    headingSize: {
      desktop: 48,
      tablet: 36,
      mobile: 28,
    },
    headingWeight: 800,
    headingLineHeight: 1.15,
    headingLetterSpacing: -0.5,
    headingTransform: 'none',
    headingColor: '#ffffff',
    headingShadow: true,

    subheadingFont: 'Plus Jakarta Sans',
    subheadingSize: {
      desktop: 18,
      tablet: 16,
      mobile: 14,
    },
    subheadingWeight: 600,
    subheadingColor: '#fce7f3',

    descriptionFont: 'Plus Jakarta Sans',
    descriptionSize: {
      desktop: 16,
      tablet: 15,
      mobile: 13,
    },
    descriptionColor: '#e2e8f0',
    descriptionLineHeight: 1.6,
  },

  buttonsStyle: {
    primaryBg: '#DF0C88',
    primaryHoverBg: '#C50875',
    primaryColor: '#ffffff',
    primaryHoverColor: '#ffffff',
    primaryRadius: 14,
    primaryBorder: 'none',
    secondaryBg: 'rgba(255, 255, 255, 0.16)',
    secondaryHoverBg: 'rgba(255, 255, 255, 0.28)',
    secondaryColor: '#ffffff',
    secondaryHoverColor: '#ffffff',
    secondaryRadius: 14,
    secondaryBorder: '1px solid rgba(255, 255, 255, 0.3)',
    paddingX: 22,
    paddingY: 12,
  },

  entranceAnimation: {
    type: 'slide_up',
    duration: 650,
    delay: 100,
    stagger: 120,
  },

  activePreset: 'Classic hero banner',
  customCssClass: '',
  advancedCss: '',
};

/**
 * 6 Built-in Design Presets
 */
export const SLIDER_PRESETS: Record<string, Partial<ImageSliderConfig>> = {
  'Classic hero banner': {
    activePreset: 'Classic hero banner',
    layoutMode: { desktop: 'full', tablet: 'full', mobile: 'full' },
    heightMode: { desktop: 'fixed', tablet: 'fixed', mobile: 'fixed' },
    fixedHeight: { desktop: 560, tablet: 480, mobile: 440 },
    slidesPerView: { desktop: 1, tablet: 1, mobile: 1 },
    spaceBetween: { desktop: 0, tablet: 0, mobile: 0 },
    transitionEffect: 'slide',
    transitionSpeed: 600,
    arrows: {
      ...DEFAULT_IMAGE_SLIDER_CONFIG.arrows,
      showDesktop: true,
      showTablet: true,
      showMobile: false,
      style: 'circle',
      size: 48,
    },
    pagination: {
      ...DEFAULT_IMAGE_SLIDER_CONFIG.pagination,
      type: 'bullets',
      shape: 'pill',
    },
    thumbnails: { ...DEFAULT_IMAGE_SLIDER_CONFIG.thumbnails, enabled: false },
    slideStyle: {
      ...DEFAULT_IMAGE_SLIDER_CONFIG.slideStyle,
      borderRadius: 0,
      hoverEffect: 'none',
    },
  },

  'Product promo carousel': {
    activePreset: 'Product promo carousel',
    layoutMode: { desktop: 'boxed', tablet: 'boxed', mobile: 'full' },
    heightMode: { desktop: 'fixed', tablet: 'fixed', mobile: 'fixed' },
    fixedHeight: { desktop: 420, tablet: 380, mobile: 340 },
    slidesPerView: { desktop: 3, tablet: 2, mobile: 1.15 },
    spaceBetween: { desktop: 20, tablet: 16, mobile: 12 },
    centeredSlides: { desktop: false, tablet: false, mobile: false },
    peekPadding: { desktop: 0, tablet: 0, mobile: 20 },
    transitionEffect: 'slide',
    transitionSpeed: 500,
    arrows: {
      ...DEFAULT_IMAGE_SLIDER_CONFIG.arrows,
      showDesktop: true,
      showTablet: true,
      showMobile: true,
      style: 'rounded',
      size: 42,
    },
    pagination: {
      ...DEFAULT_IMAGE_SLIDER_CONFIG.pagination,
      type: 'dynamic_bullets',
      shape: 'dot',
    },
    thumbnails: { ...DEFAULT_IMAGE_SLIDER_CONFIG.thumbnails, enabled: false },
    slideStyle: {
      ...DEFAULT_IMAGE_SLIDER_CONFIG.slideStyle,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      shadow: 'md',
      hoverEffect: 'lift',
      inactiveScale: 0.96,
      inactiveOpacity: 0.85,
    },
  },

  'Peek carousel (1.2 per view)': {
    activePreset: 'Peek carousel (1.2 per view)',
    layoutMode: { desktop: 'full', tablet: 'full', mobile: 'full' },
    heightMode: { desktop: 'fixed', tablet: 'fixed', mobile: 'fixed' },
    fixedHeight: { desktop: 480, tablet: 420, mobile: 380 },
    slidesPerView: { desktop: 3.2, tablet: 2.2, mobile: 1.2 },
    spaceBetween: { desktop: 24, tablet: 18, mobile: 12 },
    centeredSlides: { desktop: true, tablet: true, mobile: true },
    peekPadding: { desktop: 40, tablet: 30, mobile: 20 },
    transitionEffect: 'coverflow',
    transitionSpeed: 600,
    arrows: {
      ...DEFAULT_IMAGE_SLIDER_CONFIG.arrows,
      showDesktop: true,
      showTablet: true,
      showMobile: false,
      style: 'circle',
      size: 50,
    },
    pagination: {
      ...DEFAULT_IMAGE_SLIDER_CONFIG.pagination,
      type: 'bullets',
      shape: 'pill',
    },
    thumbnails: { ...DEFAULT_IMAGE_SLIDER_CONFIG.thumbnails, enabled: false },
    slideStyle: {
      ...DEFAULT_IMAGE_SLIDER_CONFIG.slideStyle,
      borderRadius: 24,
      shadow: 'lg',
      hoverEffect: 'scale',
      inactiveScale: 0.9,
      inactiveOpacity: 0.6,
    },
  },

  'Fade banner with arrows': {
    activePreset: 'Fade banner with arrows',
    layoutMode: { desktop: 'full_bleed', tablet: 'full_bleed', mobile: 'full_bleed' },
    heightMode: { desktop: 'fixed', tablet: 'fixed', mobile: 'fixed' },
    fixedHeight: { desktop: 620, tablet: 520, mobile: 460 },
    slidesPerView: { desktop: 1, tablet: 1, mobile: 1 },
    spaceBetween: { desktop: 0, tablet: 0, mobile: 0 },
    transitionEffect: 'cross_fade',
    transitionSpeed: 800,
    kenBurns: {
      enabled: true,
      direction: 'zoom-in',
      zoomAmount: 1.1,
      duration: 8000,
    },
    arrows: {
      ...DEFAULT_IMAGE_SLIDER_CONFIG.arrows,
      showDesktop: true,
      showTablet: true,
      showMobile: false,
      style: 'minimal',
      size: 54,
      showOnHoverOnly: true,
    },
    pagination: {
      ...DEFAULT_IMAGE_SLIDER_CONFIG.pagination,
      type: 'fraction',
      position: 'bottom',
      alignment: 'center',
    },
    thumbnails: { ...DEFAULT_IMAGE_SLIDER_CONFIG.thumbnails, enabled: false },
    slideStyle: {
      ...DEFAULT_IMAGE_SLIDER_CONFIG.slideStyle,
      borderRadius: 0,
      hoverEffect: 'none',
    },
  },

  'Thumbnail gallery': {
    activePreset: 'Thumbnail gallery',
    layoutMode: { desktop: 'boxed', tablet: 'boxed', mobile: 'boxed' },
    heightMode: { desktop: 'fixed', tablet: 'fixed', mobile: 'fixed' },
    fixedHeight: { desktop: 460, tablet: 400, mobile: 320 },
    slidesPerView: { desktop: 1, tablet: 1, mobile: 1 },
    spaceBetween: { desktop: 0, tablet: 0, mobile: 0 },
    transitionEffect: 'slide',
    transitionSpeed: 500,
    arrows: {
      ...DEFAULT_IMAGE_SLIDER_CONFIG.arrows,
      showDesktop: true,
      showTablet: true,
      showMobile: true,
      style: 'circle',
      size: 40,
    },
    pagination: {
      ...DEFAULT_IMAGE_SLIDER_CONFIG.pagination,
      type: 'none',
    },
    thumbnails: {
      enabled: true,
      position: 'below',
      size: 80,
      gap: 12,
      activeBorderColor: '#DF0C88',
      visibleCount: 5,
    },
    slideStyle: {
      ...DEFAULT_IMAGE_SLIDER_CONFIG.slideStyle,
      borderRadius: 20,
      shadow: 'md',
    },
  },

  'Full-screen mobile story': {
    activePreset: 'Full-screen mobile story',
    layoutMode: { desktop: 'boxed', tablet: 'boxed', mobile: 'full_bleed' },
    heightMode: { desktop: 'aspect_ratio', tablet: 'aspect_ratio', mobile: 'fixed' },
    aspectRatio: { desktop: '16:9', tablet: '4:3', mobile: 'custom' },
    fixedHeight: { desktop: 600, tablet: 500, mobile: 680 },
    slidesPerView: { desktop: 1, tablet: 1, mobile: 1 },
    spaceBetween: { desktop: 0, tablet: 0, mobile: 0 },
    transitionEffect: 'cards',
    transitionSpeed: 550,
    autoplay: {
      ...DEFAULT_IMAGE_SLIDER_CONFIG.autoplay,
      enabled: true,
      delay: 5000,
      showProgress: 'bar',
    },
    arrows: {
      ...DEFAULT_IMAGE_SLIDER_CONFIG.arrows,
      showDesktop: true,
      showTablet: false,
      showMobile: false,
      style: 'circle',
      size: 44,
    },
    pagination: {
      ...DEFAULT_IMAGE_SLIDER_CONFIG.pagination,
      type: 'progress_bar',
      position: 'top',
    },
    thumbnails: { ...DEFAULT_IMAGE_SLIDER_CONFIG.thumbnails, enabled: false },
    slideStyle: {
      ...DEFAULT_IMAGE_SLIDER_CONFIG.slideStyle,
      borderRadius: 24,
      shadow: '2xl',
    },
  },
};
