import React from 'react';
import { WidgetRenderProps } from '../types';
import {
  // Direct matches from sample image
  Truck,
  RotateCcw,
  ShieldCheck,
  CreditCard,
  Clock,
  Award,
  Wrench,
  CheckCircle2,
  Sparkles,
  Zap,
  ThumbsUp,
  Headphones,
  PhoneCall,
  MapPin,
  Lock,
  HeartHandshake,
  Percent,
  Tag,
  Star,
  Smartphone,
  Laptop,
  Tablet,
  BatteryCharging,
  Cpu,
  PackageCheck,
  ShieldAlert,
  HelpCircle,
  Coins,
  RefreshCw,
  Gift,
  BadgeCheck,
  Check,
  Calendar,
  Smile,
  LucideIcon
} from 'lucide-react';

export const ICON_BOX_ICONS: Record<string, { label: string; icon: LucideIcon; category: string }> = {
  // Primary Sample Icons
  Truck: { label: 'Fast Delivery / Free Shipping (Truck)', icon: Truck, category: 'Shipping & Delivery' },
  RotateCcw: { label: 'Free Returns / 30-Day Money Back (RotateCcw)', icon: RotateCcw, category: 'Returns & Guarantee' },
  ShieldCheck: { label: '6 or 12-Month Warranty (ShieldCheck)', icon: ShieldCheck, category: 'Warranty & Protection' },
  CreditCard: { label: '100% Secure Payment / Cards (CreditCard)', icon: CreditCard, category: 'Payments & Checkout' },

  // Speed & Repairs
  Clock: { label: '30-Minute Turnaround (Clock)', icon: Clock, category: 'Service & Speed' },
  Wrench: { label: 'Expert Technicians / Repairs (Wrench)', icon: Wrench, category: 'Service & Speed' },
  Award: { label: 'No Fix No Fee / Certified (Award)', icon: Award, category: 'Quality & Awards' },
  BadgeCheck: { label: 'Verified Quality / Genuine Parts (BadgeCheck)', icon: BadgeCheck, category: 'Quality & Awards' },
  CheckCircle2: { label: 'Quality Tested / Passed (CheckCircle2)', icon: CheckCircle2, category: 'Quality & Awards' },
  Check: { label: 'Simple Checkmark (Check)', icon: Check, category: 'Quality & Awards' },

  // Trust & Security
  Lock: { label: 'Data Protected / Bank Security (Lock)', icon: Lock, category: 'Trust & Security' },
  HeartHandshake: { label: 'Fair Trade / Trusted Partners (HeartHandshake)', icon: HeartHandshake, category: 'Trust & Security' },
  Star: { label: '5-Star Rated Service (Star)', icon: Star, category: 'Trust & Security' },
  ThumbsUp: { label: 'Customer Satisfaction (ThumbsUp)', icon: ThumbsUp, category: 'Trust & Security' },

  // Customer Care & Support
  Headphones: { label: '24/7 UK Customer Support (Headphones)', icon: Headphones, category: 'Support & Contact' },
  PhoneCall: { label: 'Free Phone Consultation (PhoneCall)', icon: PhoneCall, category: 'Support & Contact' },
  MapPin: { label: '8 High Street Stores / Walk-in (MapPin)', icon: MapPin, category: 'Support & Contact' },
  Smile: { label: 'Friendly Local Team (Smile)', icon: Smile, category: 'Support & Contact' },

  // Deals & Value
  Percent: { label: 'Best Price Match Guarantee (Percent)', icon: Percent, category: 'Discounts & Pricing' },
  Tag: { label: 'Lowest Price Guaranteed (Tag)', icon: Tag, category: 'Discounts & Pricing' },
  Coins: { label: 'Instant Cash Buyback (Coins)', icon: Coins, category: 'Discounts & Pricing' },
  Gift: { label: 'Free Screen Protector / Bonus (Gift)', icon: Gift, category: 'Discounts & Pricing' },

  // Hardware & Devices
  Smartphone: { label: 'Smartphones & iPhones (Smartphone)', icon: Smartphone, category: 'Devices & Tech' },
  Laptop: { label: 'MacBook & Laptops (Laptop)', icon: Laptop, category: 'Devices & Tech' },
  Tablet: { label: 'iPads & Tablets (Tablet)', icon: Tablet, category: 'Devices & Tech' },
  BatteryCharging: { label: 'Battery Replacement (BatteryCharging)', icon: BatteryCharging, category: 'Devices & Tech' },
  Cpu: { label: 'Logic Board & Micro-Soldering (Cpu)', icon: Cpu, category: 'Devices & Tech' },
  Zap: { label: 'Ultra Express Charging (Zap)', icon: Zap, category: 'Devices & Tech' },
  Sparkles: { label: 'Grade A Pristine Condition (Sparkles)', icon: Sparkles, category: 'Devices & Tech' },
  PackageCheck: { label: 'Insured Tracked Return (PackageCheck)', icon: PackageCheck, category: 'Shipping & Delivery' },
  RefreshCw: { label: 'Eco-Friendly Circular Tech (RefreshCw)', icon: RefreshCw, category: 'Returns & Guarantee' },
};

export interface IconBoxItem {
  id?: string;
  icon?: string;
  title?: string;
  subtitle?: string;
  linkUrl?: string;
  badge?: string;
  customIconColor?: string;
  customIconBg?: string;
}

export const IconBoxesWidget: React.FC<WidgetRenderProps> = ({ settings, commonSettings }) => {
  // Fallback defaults matching the user's uploaded sample image
  const defaultItems: IconBoxItem[] = [
    {
      icon: 'Truck',
      title: 'Free Shipping',
      subtitle: 'Free UK shipping on order over £50',
      customIconColor: '#DF0C88',
      customIconBg: '#FDF2F8',
    },
    {
      icon: 'RotateCcw',
      title: 'Free Returns',
      subtitle: 'Hassle free 30 days return policy',
      customIconColor: '#059669',
      customIconBg: '#ECFDF5',
    },
    {
      icon: 'ShieldCheck',
      title: '100% Secured',
      subtitle: 'Guaranteed 100% secure payment checkout',
      customIconColor: '#D97706',
      customIconBg: '#FFFBEB',
    },
    {
      icon: 'CreditCard',
      title: 'Flexible Payment',
      subtitle: 'Pay with multiple cards or Klarna',
      customIconColor: '#E11D48',
      customIconBg: '#FFF1F2',
    },
  ];

  const rawItems: IconBoxItem[] = Array.isArray(settings?.items) && settings.items.length > 0
    ? settings.items
    : defaultItems;

  // Max rows limiter if specified
  const maxRows = Number(settings?.maxRows) || 0;
  const colsDesktop = Number(settings?.columnsDesktop) || 4;
  let items = rawItems;
  if (maxRows > 0) {
    const maxItems = maxRows * colsDesktop;
    items = rawItems.slice(0, maxItems);
  }

  // Width container mode: 'boxed' (container max-w-7xl) vs 'full' (100% width)
  const containerWidthMode = commonSettings?.containerWidth || settings?.containerWidth || 'boxed';

  // Responsive columns
  const colsMobile = Number(settings?.columnsMobile) || 1;
  const colsTablet = Number(settings?.columnsTablet) || 2;

  // Map to Tailwind grid classes
  const getColsMobileClass = (c: number) => {
    switch (c) {
      case 2: return 'grid-cols-2';
      default: return 'grid-cols-1';
    }
  };

  const getColsTabletClass = (c: number) => {
    switch (c) {
      case 1: return 'sm:grid-cols-1';
      case 3: return 'sm:grid-cols-3';
      case 4: return 'sm:grid-cols-4';
      default: return 'sm:grid-cols-2';
    }
  };

  const getColsDesktopClass = (c: number) => {
    switch (c) {
      case 1: return 'lg:grid-cols-1';
      case 2: return 'lg:grid-cols-2';
      case 3: return 'lg:grid-cols-3';
      case 5: return 'lg:grid-cols-5';
      case 6: return 'lg:grid-cols-6';
      default: return 'lg:grid-cols-4';
    }
  };

  const gridClass = `grid ${getColsMobileClass(colsMobile)} ${getColsTabletClass(colsTablet)} ${getColsDesktopClass(colsDesktop)}`;

  // Styling customizations
  const iconPosition = settings?.iconPosition || 'row'; // 'row' (side by side as in sample image) or 'top' (stacked centered/left)
  const iconAlignment = settings?.iconAlignment || 'center'; // 'center' or 'start'
  const textAlign = settings?.textAlign || (iconPosition === 'top' ? 'center' : 'left');

  // Colors & Typography
  const headingColor = settings?.headingColor || '#0f172a';
  const headingSize = settings?.headingSize || 'base'; // 'sm' | 'base' | 'lg' | 'xl'
  const headingWeight = settings?.headingWeight || 'bold';
  const subtitleColor = settings?.subtitleColor || '#64748b';
  const subtitleSize = settings?.subtitleSize || 'xs'; // 'xs' | 'sm' | 'base'

  // Card Styling
  const cardBorderRadius = settings?.cardBorderRadius || '2xl'; // 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
  const cardBgColor = settings?.cardBgColor || '#ffffff';
  const cardBorderColor = settings?.cardBorderColor || '#e2e8f0';
  const cardPadding = settings?.cardPadding || '6'; // '3' | '4' | '5' | '6' | '8'
  const cardShadow = settings?.cardShadow || 'none'; // 'none' | 'sm' | 'md' | 'lg'
  const showBorder = settings?.showBorder !== false;
  const hoverEffect = settings?.hoverEffect !== false;

  // Section level padding & margin
  const sectionBgColor = settings?.sectionBgColor || '';
  const sectionMarginTop = settings?.sectionMarginTop || '0';
  const sectionMarginBottom = settings?.sectionMarginBottom || '0';
  const sectionGap = settings?.gap || '6'; // '3' | '4' | '6' | '8'

  // Radius map
  const radiusMap: Record<string, string> = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
    full: 'rounded-full',
  };

  // Heading size map
  const headingSizeClass: Record<string, string> = {
    xs: 'text-xs',
    sm: 'text-xs sm:text-sm',
    base: 'text-sm sm:text-base',
    lg: 'text-base sm:text-lg',
    xl: 'text-lg sm:text-xl',
  };

  // Subtitle size map
  const subtitleSizeClass: Record<string, string> = {
    xs: 'text-xs',
    sm: 'text-xs sm:text-sm',
    base: 'text-sm',
  };

  // Shadow map
  const shadowClass: Record<string, string> = {
    none: 'shadow-none',
    sm: 'shadow-xs',
    md: 'shadow-md',
    lg: 'shadow-lg hover:shadow-xl',
  };

  // Padding map
  const paddingClass: Record<string, string> = {
    '3': 'p-3',
    '4': 'p-4',
    '5': 'p-5',
    '6': 'p-5 sm:p-6',
    '8': 'p-6 sm:p-8',
  };

  // Gap map
  const gapClass: Record<string, string> = {
    '2': 'gap-2',
    '3': 'gap-3',
    '4': 'gap-4',
    '6': 'gap-4 sm:gap-6',
    '8': 'gap-6 sm:gap-8',
  };

  // Container styling
  const outerWidthClass = containerWidthMode === 'full' 
    ? 'w-full px-4 sm:px-6 lg:px-12' 
    : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';

  return (
    <section
      className={`w-full transition-all ${settings?.customClass || ''}`}
      style={{
        backgroundColor: sectionBgColor || undefined,
        marginTop: sectionMarginTop !== '0' ? `${sectionMarginTop}px` : undefined,
        marginBottom: sectionMarginBottom !== '0' ? `${sectionMarginBottom}px` : undefined,
      }}
    >
      <div className={outerWidthClass}>
        {/* Optional Section Title & Subtitle */}
        {(settings?.sectionTitle || settings?.sectionSubtitle) && (
          <div className="text-center mb-8 max-w-2xl mx-auto">
            {settings?.sectionTitle && (
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
                {settings.sectionTitle}
              </h2>
            )}
            {settings?.sectionSubtitle && (
              <p className="text-xs sm:text-sm text-slate-500">
                {settings.sectionSubtitle}
              </p>
            )}
          </div>
        )}

        {/* Icon Boxes Grid */}
        <div className={`${gridClass} ${gapClass[sectionGap] || 'gap-6'}`}>
          {items.map((item, idx) => {
            const iconKey = item.icon || 'Truck';
            const IconComponent = (ICON_BOX_ICONS[iconKey]?.icon) || Truck;

            // Default fallback palettes matching the visual style in the reference image
            const defaultPalettes = [
              { color: '#DF0C88', bg: '#FDF2F8' }, // Pink / Brand
              { color: '#059669', bg: '#ECFDF5' }, // Emerald Green
              { color: '#D97706', bg: '#FFFBEB' }, // Amber / Gold
              { color: '#E11D48', bg: '#FFF1F2' }, // Rose / Coral
            ];
            const palette = defaultPalettes[idx % defaultPalettes.length];
            const iconColor = item.customIconColor || settings?.defaultIconColor || palette.color;
            const iconBg = item.customIconBg || settings?.defaultIconBg || palette.bg;

            const isRowLayout = iconPosition === 'row';

            const cardContent = (
              <div
                key={idx}
                className={`relative transition-all duration-200 ${paddingClass[cardPadding] || 'p-6'} ${radiusMap[cardBorderRadius] || 'rounded-2xl'} ${shadowClass[cardShadow] || ''} ${
                  showBorder ? 'border' : 'border-0'
                } ${
                  hoverEffect ? 'hover:-translate-y-0.5 hover:shadow-md' : ''
                } ${
                  isRowLayout ? 'flex items-center gap-4' : 'flex flex-col items-center text-center gap-3'
                }`}
                style={{
                  backgroundColor: cardBgColor,
                  borderColor: showBorder ? cardBorderColor : 'transparent',
                }}
              >
                {/* Icon wrapper badge */}
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform ${
                    hoverEffect ? 'group-hover:scale-105' : ''
                  }`}
                  style={{
                    backgroundColor: iconBg,
                    color: iconColor,
                  }}
                >
                  <IconComponent className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>

                {/* Content: Title & Subtitle */}
                <div className={`min-w-0 flex-1 ${textAlign === 'center' ? 'text-center' : textAlign === 'right' ? 'text-right' : 'text-left'}`}>
                  {item.badge && (
                    <span className="inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-pink-100 text-[#DF0C88] mb-1">
                      {item.badge}
                    </span>
                  )}
                  <h3
                    className={`leading-snug tracking-tight mb-1 ${headingSizeClass[headingSize] || 'text-base'} ${
                      headingWeight === 'black' ? 'font-black' : headingWeight === 'bold' ? 'font-bold' : 'font-semibold'
                    }`}
                    style={{ color: headingColor }}
                  >
                    {item.title || `Feature ${idx + 1}`}
                  </h3>
                  {item.subtitle && (
                    <p
                      className={`leading-relaxed line-clamp-2 ${subtitleSizeClass[subtitleSize] || 'text-xs'}`}
                      style={{ color: subtitleColor }}
                    >
                      {item.subtitle}
                    </p>
                  )}
                </div>
              </div>
            );

            if (item.linkUrl) {
              return (
                <a
                  key={idx}
                  href={item.linkUrl}
                  className="block group no-underline"
                >
                  {cardContent}
                </a>
              );
            }

            return cardContent;
          })}
        </div>
      </div>
    </section>
  );
};
