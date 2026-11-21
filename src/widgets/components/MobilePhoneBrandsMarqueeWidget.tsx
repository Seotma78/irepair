import React, { useState, useRef, useEffect, useMemo } from 'react';
import { WidgetRenderProps } from '../types';
import { useApp } from '../../context/AppContext';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pause,
  Play,
  Smartphone,
  Tag,
  Check
} from 'lucide-react';

export type BrandDestinationType = 'brand_archive' | 'product_category' | 'custom_url' | 'internal_page' | 'none';

export interface MobilePhoneBrandItem {
  id: string;
  name: string;
  logoUrl?: string;
  logoSvgPreset?: string;
  altText: string;
  order: number;
  visible: boolean;
  tooltip?: string;
  badge?: string;
  destinationType: BrandDestinationType;
  destinationValue: string;
  customCardBg?: string;
  customBorderColor?: string;
  customTextColor?: string;
}

export interface MobilePhoneBrandsMarqueeConfig {
  // 1. General & Layout
  widgetName?: string;
  sectionHeading?: string;
  showSectionHeading?: boolean;
  subtitle?: string;
  showSubtitle?: boolean;
  headingAlignment?: 'left' | 'center' | 'right';
  headingTag?: 'h2' | 'h3' | 'h4';
  headingFontSize?: number;
  headingFontWeight?: 'normal' | 'semibold' | 'bold' | 'extrabold' | 'black';
  headingColor?: string;
  subtitleColor?: string;
  layoutWidth?: 'boxed' | 'full' | 'narrow';
  maxContentWidth?: number;
  backgroundColor?: string;
  backgroundGradient?: string;
  sectionPaddingTop?: number;
  sectionPaddingBottom?: number;
  sectionMarginTop?: number;
  sectionMarginBottom?: number;
  enabled?: boolean;

  // 2. Marquee Motion & Behavior
  autoplay?: boolean;
  scrollDirection?: 'left' | 'right';
  animationSpeed?: number; // duration in seconds
  mobileAnimationSpeed?: number;
  pauseOnHover?: boolean;
  pauseOnFocus?: boolean;
  edgeFade?: boolean;
  edgeFadeWidth?: number;
  edgeFadeColor?: string;
  showNavigationArrows?: boolean;
  arrowPosition?: 'sides' | 'top_right' | 'bottom';
  showPaginationDots?: boolean;
  enableDragScroll?: boolean;

  // 3. Card Appearance
  cardWidth?: number;
  cardHeight?: number;
  cardBg?: string;
  cardBorderRadius?: number;
  cardBorderWidth?: number;
  cardBorderColor?: string;
  cardShadow?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  cardGap?: number;
  cardHoverEffect?: 'lift' | 'border_glow' | 'scale' | 'none';
  cardHoverBorderColor?: string;
  cardHoverBg?: string;

  // 4. Logo Appearance & Styling
  logoMaxWidth?: number;
  logoMaxHeight?: number;
  logoFit?: 'contain' | 'cover';
  grayscale?: boolean;
  grayscaleHoverColor?: boolean;
  showBrandName?: boolean;
  showBadge?: boolean;
  badgeBg?: string;
  badgeColor?: string;

  // 5. Brands List
  brands?: MobilePhoneBrandItem[];
}

export const STARTER_MOBILE_BRANDS: MobilePhoneBrandItem[] = [
  {
    id: 'apple',
    name: 'Apple',
    logoSvgPreset: 'apple',
    altText: 'Apple iPhone mobile phones and certified repairs',
    order: 1,
    visible: true,
    badge: 'iOS 18',
    destinationType: 'brand_archive',
    destinationValue: 'apple',
  },
  {
    id: 'samsung',
    name: 'Samsung',
    logoSvgPreset: 'samsung',
    altText: 'Samsung Galaxy smartphones, Ultra & Fold series',
    order: 2,
    visible: true,
    badge: 'Galaxy AI',
    destinationType: 'brand_archive',
    destinationValue: 'samsung',
  },
  {
    id: 'google_pixel',
    name: 'Google Pixel',
    logoSvgPreset: 'google_pixel',
    altText: 'Google Pixel phones powered by Tensor processor',
    order: 3,
    visible: true,
    badge: 'Tensor G4',
    destinationType: 'brand_archive',
    destinationValue: 'google',
  },
  {
    id: 'xiaomi',
    name: 'Xiaomi',
    logoSvgPreset: 'xiaomi',
    altText: 'Xiaomi flagship and Leica camera mobile phones',
    order: 4,
    visible: true,
    badge: 'HyperOS',
    destinationType: 'brand_archive',
    destinationValue: 'xiaomi',
  },
  {
    id: 'redmi',
    name: 'Redmi',
    logoSvgPreset: 'redmi',
    altText: 'Redmi Note and budget mobile phones',
    order: 5,
    visible: true,
    badge: 'Note Series',
    destinationType: 'product_category',
    destinationValue: 'mobile-phones',
  },
  {
    id: 'poco',
    name: 'POCO',
    logoSvgPreset: 'poco',
    altText: 'POCO gaming speed flagship mobile devices',
    order: 6,
    visible: true,
    badge: 'Snapdragon',
    destinationType: 'product_category',
    destinationValue: 'mobile-phones',
  },
  {
    id: 'oneplus',
    name: 'OnePlus',
    logoSvgPreset: 'oneplus',
    altText: 'OnePlus Hasselblad fast charging smartphones',
    order: 7,
    visible: true,
    badge: 'OxygenOS',
    destinationType: 'brand_archive',
    destinationValue: 'oneplus',
  },
  {
    id: 'oppo',
    name: 'OPPO',
    logoSvgPreset: 'oppo',
    altText: 'OPPO Find & Reno camera mobile phones',
    order: 8,
    visible: true,
    badge: 'SuperVOOC',
    destinationType: 'brand_archive',
    destinationValue: 'oppo',
  },
  {
    id: 'vivo',
    name: 'Vivo',
    logoSvgPreset: 'vivo',
    altText: 'Vivo ZEISS portrait imaging mobile phones',
    order: 9,
    visible: true,
    badge: 'ZEISS Optics',
    destinationType: 'brand_archive',
    destinationValue: 'vivo',
  },
  {
    id: 'realme',
    name: 'Realme',
    logoSvgPreset: 'realme',
    altText: 'Realme Dare to Leap trendsetting smartphones',
    order: 10,
    visible: true,
    badge: 'GT Series',
    destinationType: 'product_category',
    destinationValue: 'mobile-phones',
  },
  {
    id: 'honor',
    name: 'Honor',
    logoSvgPreset: 'honor',
    altText: 'Honor Magic foldable and flagship mobile phones',
    order: 11,
    visible: true,
    badge: 'MagicOS',
    destinationType: 'brand_archive',
    destinationValue: 'honor',
  },
  {
    id: 'huawei',
    name: 'Huawei',
    logoSvgPreset: 'huawei',
    altText: 'Huawei XMAGE mobile photography devices',
    order: 12,
    visible: true,
    badge: 'Pura & Mate',
    destinationType: 'brand_archive',
    destinationValue: 'huawei',
  },
  {
    id: 'motorola',
    name: 'Motorola',
    logoSvgPreset: 'motorola',
    altText: 'Motorola Edge and Razr flip mobile phones',
    order: 13,
    visible: true,
    badge: 'Razr Flip',
    destinationType: 'brand_archive',
    destinationValue: 'motorola',
  },
  {
    id: 'nokia',
    name: 'Nokia',
    logoSvgPreset: 'nokia',
    altText: 'Nokia durable smartphones and rugged mobile hardware',
    order: 14,
    visible: true,
    badge: 'Pure Android',
    destinationType: 'product_category',
    destinationValue: 'nokia',
  },
  {
    id: 'sony_xperia',
    name: 'Sony Xperia',
    logoSvgPreset: 'sony_xperia',
    altText: 'Sony Xperia 4K OLED HDR mobile phones',
    order: 15,
    visible: true,
    badge: 'Alpha Pro',
    destinationType: 'brand_archive',
    destinationValue: 'sony',
  },
  {
    id: 'nothing',
    name: 'Nothing',
    logoSvgPreset: 'nothing',
    altText: 'Nothing Phone Glyph interface smartphones',
    order: 16,
    visible: true,
    badge: 'Glyph OS',
    destinationType: 'brand_archive',
    destinationValue: 'nothing',
  },
  {
    id: 'tecno',
    name: 'Tecno',
    logoSvgPreset: 'tecno',
    altText: 'Tecno Phantom and Camon mobile devices',
    order: 17,
    visible: true,
    badge: 'HiOS',
    destinationType: 'product_category',
    destinationValue: 'mobile-phones',
  },
  {
    id: 'infinix',
    name: 'Infinix',
    logoSvgPreset: 'infinix',
    altText: 'Infinix Zero fast performance smartphones',
    order: 18,
    visible: true,
    badge: 'XOS 14',
    destinationType: 'product_category',
    destinationValue: 'mobile-phones',
  },
  {
    id: 'itel',
    name: 'itel',
    logoSvgPreset: 'itel',
    altText: 'itel reliable everyday mobile phones',
    order: 19,
    visible: true,
    badge: 'Budget Pick',
    destinationType: 'product_category',
    destinationValue: 'mobile-phones',
  },
  {
    id: 'asus_zenfone',
    name: 'ASUS Zenfone',
    logoSvgPreset: 'asus_zenfone',
    altText: 'ASUS Zenfone compact and ROG gaming phones',
    order: 20,
    visible: true,
    badge: 'Gimbal Cam',
    destinationType: 'brand_archive',
    destinationValue: 'asus',
  },
  {
    id: 'zte',
    name: 'ZTE',
    logoSvgPreset: 'zte',
    altText: 'ZTE Axon and Nubia RedMagic mobile phones',
    order: 21,
    visible: true,
    badge: 'Nubia Red',
    destinationType: 'product_category',
    destinationValue: 'mobile-phones',
  },
  {
    id: 'lenovo',
    name: 'Lenovo',
    logoSvgPreset: 'lenovo',
    altText: 'Lenovo Legion mobile smartphones',
    order: 22,
    visible: true,
    badge: 'Legion OS',
    destinationType: 'product_category',
    destinationValue: 'mobile-phones',
  },
  {
    id: 'tcl',
    name: 'TCL',
    logoSvgPreset: 'tcl',
    altText: 'TCL NXTPAPER eye comfort smartphones',
    order: 23,
    visible: true,
    badge: 'NXTPAPER',
    destinationType: 'product_category',
    destinationValue: 'mobile-phones',
  },
  {
    id: 'meizu',
    name: 'Meizu',
    logoSvgPreset: 'meizu',
    altText: 'Meizu Flyme ecosystem mobile devices',
    order: 24,
    visible: true,
    badge: 'Flyme AI',
    destinationType: 'product_category',
    destinationValue: 'mobile-phones',
  },
  {
    id: 'sharp',
    name: 'Sharp',
    logoSvgPreset: 'sharp',
    altText: 'Sharp Aquos 1-inch sensor mobile phones',
    order: 25,
    visible: true,
    badge: 'Aquos Pro',
    destinationType: 'product_category',
    destinationValue: 'mobile-phones',
  },
];

export const DEFAULT_MOBILE_BRANDS_MARQUEE_CONFIG: MobilePhoneBrandsMarqueeConfig = {
  widgetName: 'Mobile Phone Brands Marquee',
  sectionHeading: 'Popular Brands',
  showSectionHeading: true,
  subtitle: 'We repair, stock, and service authentic hardware across the world’s leading mobile brands',
  showSubtitle: false,
  headingAlignment: 'center',
  headingTag: 'h2',
  headingFontSize: 28,
  headingFontWeight: 'extrabold',
  headingColor: '#0f172a',
  subtitleColor: '#64748b',
  layoutWidth: 'boxed',
  maxContentWidth: 1280,
  backgroundColor: '#f8fafc',
  sectionPaddingTop: 40,
  sectionPaddingBottom: 40,
  sectionMarginTop: 0,
  sectionMarginBottom: 0,
  enabled: true,

  autoplay: true,
  scrollDirection: 'left',
  animationSpeed: 38,
  mobileAnimationSpeed: 26,
  pauseOnHover: true,
  pauseOnFocus: true,
  edgeFade: true,
  edgeFadeWidth: 80,
  edgeFadeColor: '#f8fafc',
  showNavigationArrows: true,
  arrowPosition: 'sides',
  showPaginationDots: false,
  enableDragScroll: true,

  cardWidth: 170,
  cardHeight: 88,
  cardBg: '#ffffff',
  cardBorderRadius: 18,
  cardBorderWidth: 1,
  cardBorderColor: '#e2e8f0',
  cardShadow: 'sm',
  cardGap: 18,
  cardHoverEffect: 'lift',
  cardHoverBorderColor: '#DF0C88',
  cardHoverBg: '#ffffff',

  logoMaxWidth: 120,
  logoMaxHeight: 40,
  logoFit: 'contain',
  grayscale: false,
  grayscaleHoverColor: true,
  showBrandName: false,
  showBadge: false,
  badgeBg: '#f1f5f9',
  badgeColor: '#475569',

  brands: STARTER_MOBILE_BRANDS,
};

// High-fidelity SVG logo representations for the 25 mobile phone brands
export const BrandLogoSvg: React.FC<{ preset?: string; name: string; className?: string }> = ({
  preset,
  name,
  className = 'h-8 max-w-[110px] object-contain',
}) => {
  switch (preset) {
    case 'apple':
      return (
        <svg viewBox="0 0 170 170" fill="currentColor" className={className} aria-label="Apple">
          <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-5.36-.12-10.27-2.3-14.73-6.53-3.26-3.04-7.17-7.85-11.75-14.43-5.74-8.23-10.36-17.93-13.86-29.09-3.5-11.16-5.26-21.73-5.26-31.71 0-14.54 3.66-26.68 10.98-36.42 7.32-9.74 16.63-14.77 27.93-15.09 5.09.11 10.74 1.48 16.95 4.12 6.2 2.64 10.15 4.02 11.83 4.12 1.94 0 6.09-1.48 12.44-4.44 6.36-2.96 11.96-4.28 16.82-3.97 12.91 1.05 23.01 6.13 30.29 15.23-11.53 6.98-17.18 16.5-16.95 28.56.23 9.4 3.91 17.27 11.04 23.6 7.13 6.34 15.65 9.94 25.56 10.8-2.12 6.53-4.7 13.04-7.75 19.52zM119.22 33.16c-.02-.55-.02-1.08-.02-1.61 0-8.47 3.17-16.2 9.5-23.19 6.34-7 13.91-11.33 22.72-13 1.05 8.25-1.74 16.27-8.38 24.06-6.64 7.79-14.58 12.38-23.82 13.74z" />
        </svg>
      );
    case 'samsung':
      return (
        <svg viewBox="0 0 240 60" fill="currentColor" className={className} aria-label="Samsung">
          <text
            x="50%"
            y="52%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
            fontWeight="900"
            fontSize="38"
            letterSpacing="6"
          >
            SAMSUNG
          </text>
        </svg>
      );
    case 'google_pixel':
      return (
        <svg viewBox="0 0 200 50" fill="currentColor" className={className} aria-label="Google Pixel">
          <g transform="translate(10, 8)">
            <path
              fill="#4285F4"
              d="M24 12.27c0-.85-.08-1.68-.22-2.47H12v4.68h6.73c-.29 1.57-1.17 2.9-2.5 3.79v3.15h4.05c2.37-2.18 3.72-5.39 3.72-9.15z"
            />
            <path
              fill="#34A853"
              d="M12 24.5c3.38 0 6.2-1.12 8.27-3.08l-4.05-3.15c-1.12.75-2.55 1.19-4.22 1.19-3.26 0-6.02-2.2-7.01-5.16H.8v3.25C2.86 21.62 7.12 24.5 12 24.5z"
            />
            <path
              fill="#FBBC05"
              d="M4.99 14.3c-.25-.75-.39-1.55-.39-2.3s.14-1.55.39-2.3V6.45H.8C-.02 8.08-.5 9.99-.5 12s.48 3.92 1.3 5.55l4.19-3.25z"
            />
            <path
              fill="#EA4335"
              d="M12 4.45c1.84 0 3.49.63 4.79 1.88l3.6-3.6C18.2 1 15.38 0 12 0 7.12 0 2.86 2.88.8 6.95l4.19 3.25c.99-2.96 3.75-5.16 7.01-5.16z"
            />
          </g>
          <text
            x="58"
            y="32"
            fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
            fontWeight="800"
            fontSize="24"
            letterSpacing="1"
            fill="currentColor"
          >
            Pixel
          </text>
        </svg>
      );
    case 'xiaomi':
      return (
        <svg viewBox="0 0 160 55" fill="none" className={className} aria-label="Xiaomi">
          <rect width="45" height="45" rx="14" fill="#FF6900" y="5" />
          <path
            d="M15 17h15v18h-4V22h-3v13h-4V22h-4v-5zm18 6h3v12h-3V23z"
            fill="#FFF"
            stroke="#FFF"
            strokeWidth="0.5"
          />
          <text
            x="58"
            y="37"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="800"
            fontSize="26"
            fill="currentColor"
            letterSpacing="1.5"
          >
            Xiaomi
          </text>
        </svg>
      );
    case 'redmi':
      return (
        <svg viewBox="0 0 160 50" fill="currentColor" className={className} aria-label="Redmi">
          <text
            x="50%"
            y="54%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="32"
            letterSpacing="3"
            fill="#E50914"
          >
            Redmi
          </text>
        </svg>
      );
    case 'poco':
      return (
        <svg viewBox="0 0 150 50" fill="none" className={className} aria-label="POCO">
          <rect x="5" y="8" width="140" height="34" rx="8" fill="#FACC15" />
          <text
            x="50%"
            y="54%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="26"
            letterSpacing="4"
            fill="#0F172A"
          >
            POCO
          </text>
        </svg>
      );
    case 'oneplus':
      return (
        <svg viewBox="0 0 170 50" fill="none" className={className} aria-label="OnePlus">
          <rect x="5" y="10" width="30" height="30" rx="4" fill="#EB0028" />
          <text x="13" y="32" fill="#FFF" fontWeight="900" fontSize="20" fontFamily="sans-serif">
            1
          </text>
          <text x="23" y="24" fill="#FFF" fontWeight="900" fontSize="14" fontFamily="sans-serif">
            +
          </text>
          <text
            x="44"
            y="33"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="24"
            letterSpacing="1"
            fill="currentColor"
          >
            ONEPLUS
          </text>
        </svg>
      );
    case 'oppo':
      return (
        <svg viewBox="0 0 160 50" fill="currentColor" className={className} aria-label="OPPO">
          <text
            x="50%"
            y="54%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="'Century Gothic', system-ui, sans-serif"
            fontWeight="800"
            fontSize="34"
            letterSpacing="6"
            fill="#008060"
          >
            oppo
          </text>
        </svg>
      );
    case 'vivo':
      return (
        <svg viewBox="0 0 150 50" fill="currentColor" className={className} aria-label="vivo">
          <text
            x="50%"
            y="54%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="'Century Gothic', system-ui, sans-serif"
            fontWeight="900"
            fontSize="34"
            letterSpacing="5"
            fill="#415FFF"
          >
            vivo
          </text>
        </svg>
      );
    case 'realme':
      return (
        <svg viewBox="0 0 160 50" fill="currentColor" className={className} aria-label="realme">
          <text
            x="50%"
            y="54%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="800"
            fontSize="30"
            letterSpacing="2"
            fill="#FFC915"
          >
            realme
          </text>
        </svg>
      );
    case 'honor':
      return (
        <svg viewBox="0 0 160 50" fill="currentColor" className={className} aria-label="HONOR">
          <text
            x="50%"
            y="54%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="30"
            letterSpacing="5"
          >
            HONOR
          </text>
        </svg>
      );
    case 'huawei':
      return (
        <svg viewBox="0 0 170 50" fill="currentColor" className={className} aria-label="HUAWEI">
          <g transform="translate(10, 8)">
            {/* Stylized flower petal array */}
            <path d="M12 2C9 7 9 12 12 16C15 12 15 7 12 2Z" fill="#CF0A2C" />
            <path d="M5 8C4 13 6 17 10 19C9 15 8 10 5 8Z" fill="#CF0A2C" />
            <path d="M19 8C16 10 15 15 14 19C18 17 20 13 19 8Z" fill="#CF0A2C" />
            <path d="M1 17C2 22 6 24 10 23C7 20 5 17 1 17Z" fill="#CF0A2C" />
            <path d="M23 17C19 17 17 20 14 23C18 24 22 22 23 17Z" fill="#CF0A2C" />
          </g>
          <text
            x="48"
            y="32"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="23"
            letterSpacing="3"
          >
            HUAWEI
          </text>
        </svg>
      );
    case 'motorola':
      return (
        <svg viewBox="0 0 180 50" fill="currentColor" className={className} aria-label="Motorola">
          <circle cx="25" cy="25" r="16" fill="#001438" />
          <path
            d="M17 31V23L22 28L25 22L28 28L33 23V31"
            stroke="#FFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <text
            x="50"
            y="33"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="800"
            fontSize="23"
            letterSpacing="2"
          >
            motorola
          </text>
        </svg>
      );
    case 'nokia':
      return (
        <svg viewBox="0 0 160 50" fill="currentColor" className={className} aria-label="NOKIA">
          <text
            x="50%"
            y="54%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="Impact, system-ui, sans-serif"
            fontWeight="900"
            fontSize="32"
            letterSpacing="6"
            fill="#124191"
          >
            NOKIA
          </text>
        </svg>
      );
    case 'sony_xperia':
      return (
        <svg viewBox="0 0 170 50" fill="currentColor" className={className} aria-label="SONY Xperia">
          <text
            x="50%"
            y="35%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="18"
            letterSpacing="4"
          >
            SONY
          </text>
          <text
            x="50%"
            y="72%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="'Segoe UI', Roboto, sans-serif"
            fontWeight="700"
            fontSize="15"
            letterSpacing="3"
            fill="#64748b"
          >
            XPERIA
          </text>
        </svg>
      );
    case 'nothing':
      return (
        <svg viewBox="0 0 160 50" fill="currentColor" className={className} aria-label="NOTHING">
          <text
            x="50%"
            y="54%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="'Courier New', Courier, monospace"
            fontWeight="900"
            fontSize="25"
            letterSpacing="5"
          >
            NOTHING
          </text>
        </svg>
      );
    case 'tecno':
      return (
        <svg viewBox="0 0 150 50" fill="currentColor" className={className} aria-label="TECNO">
          <text
            x="50%"
            y="54%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="28"
            letterSpacing="4"
            fill="#0052D4"
          >
            TECNO
          </text>
        </svg>
      );
    case 'infinix':
      return (
        <svg viewBox="0 0 160 50" fill="currentColor" className={className} aria-label="Infinix">
          <text
            x="50%"
            y="54%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="800"
            fontSize="27"
            letterSpacing="2"
            fill="#10B981"
          >
            Infinix
          </text>
        </svg>
      );
    case 'itel':
      return (
        <svg viewBox="0 0 140 50" fill="none" className={className} aria-label="itel">
          <rect x="10" y="10" width="120" height="30" rx="15" fill="#E11D48" />
          <text
            x="50%"
            y="55%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontStyle="italic"
            fontSize="22"
            letterSpacing="2"
            fill="#FFF"
          >
            itel
          </text>
        </svg>
      );
    case 'asus_zenfone':
      return (
        <svg viewBox="0 0 170 50" fill="currentColor" className={className} aria-label="ASUS Zenfone">
          <text
            x="50%"
            y="35%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="18"
            letterSpacing="4"
            fill="#00539B"
          >
            ASUS
          </text>
          <text
            x="50%"
            y="72%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
            fontWeight="700"
            fontSize="14"
            letterSpacing="2"
            fill="#475569"
          >
            Zenfone
          </text>
        </svg>
      );
    case 'zte':
      return (
        <svg viewBox="0 0 140 50" fill="currentColor" className={className} aria-label="ZTE">
          <text
            x="50%"
            y="54%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="32"
            letterSpacing="5"
            fill="#007ACC"
          >
            ZTE
          </text>
        </svg>
      );
    case 'lenovo':
      return (
        <svg viewBox="0 0 150 50" fill="none" className={className} aria-label="Lenovo">
          <rect x="8" y="10" width="134" height="30" fill="#E2231A" />
          <text
            x="50%"
            y="54%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="21"
            letterSpacing="2"
            fill="#FFF"
          >
            Lenovo
          </text>
        </svg>
      );
    case 'tcl':
      return (
        <svg viewBox="0 0 140 50" fill="currentColor" className={className} aria-label="TCL">
          <text
            x="50%"
            y="54%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="Impact, system-ui, sans-serif"
            fontWeight="900"
            fontSize="36"
            letterSpacing="4"
            fill="#E50914"
          >
            TCL
          </text>
        </svg>
      );
    case 'meizu':
      return (
        <svg viewBox="0 0 150 50" fill="currentColor" className={className} aria-label="MEIZU">
          <text
            x="50%"
            y="54%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="28"
            letterSpacing="5"
            fill="#008CFF"
          >
            MEIZU
          </text>
        </svg>
      );
    case 'sharp':
      return (
        <svg viewBox="0 0 150 50" fill="currentColor" className={className} aria-label="SHARP">
          <text
            x="50%"
            y="54%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="30"
            letterSpacing="4"
            fill="#E60012"
          >
            SHARP
          </text>
        </svg>
      );
    default:
      return (
        <span className="text-base font-extrabold tracking-wider text-slate-800">
          {name}
        </span>
      );
  }
};

export const MobilePhoneBrandsMarqueeWidget: React.FC<WidgetRenderProps> = ({
  settings,
  commonSettings,
  isPreview = false,
}) => {
  const { setCurrentPage, setShopBrandFilter, navigateToCategory, startRepairBooking } = useApp();

  const config: MobilePhoneBrandsMarqueeConfig = useMemo(() => {
    return {
      ...DEFAULT_MOBILE_BRANDS_MARQUEE_CONFIG,
      ...settings,
    };
  }, [settings]);

  const [isPaused, setIsPaused] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Filter visible brands and sort by order
  const activeBrands = useMemo(() => {
    const list = Array.isArray(config.brands) && config.brands.length > 0
      ? config.brands
      : STARTER_MOBILE_BRANDS;

    return [...list]
      .filter((b) => b.visible !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [config.brands]);

  // Repeat brands to build seamless infinite loop
  const repeatedBrands = useMemo(() => {
    if (activeBrands.length === 0) return [];
    // If fewer than 15 brands, repeat more times to fill wide desktop screens
    const repeatCount = activeBrands.length < 10 ? 4 : 2;
    const combined: Array<{ item: MobilePhoneBrandItem; uniqueKey: string }> = [];
    for (let r = 0; r < repeatCount; r++) {
      activeBrands.forEach((item, idx) => {
        combined.push({
          item,
          uniqueKey: `${item.id}-rep-${r}-${idx}`,
        });
      });
    }
    return combined;
  }, [activeBrands]);

  // Handle Brand Click Destination
  const handleBrandClick = (brand: MobilePhoneBrandItem) => {
    if (isPreview) return; // Prevent navigation during visual editing

    switch (brand.destinationType) {
      case 'brand_archive':
        // Filter shop by brand and navigate to shop or booking
        if (brand.destinationValue) {
          setShopBrandFilter(brand.destinationValue);
          setCurrentPage('shop');
        } else {
          startRepairBooking({ brand: brand.id });
        }
        break;

      case 'product_category':
        if (brand.destinationValue) {
          navigateToCategory(brand.destinationValue);
        } else {
          navigateToCategory('mobile-phones');
        }
        break;

      case 'custom_url':
        if (brand.destinationValue) {
          if (brand.destinationValue.startsWith('http://') || brand.destinationValue.startsWith('https://')) {
            window.location.href = brand.destinationValue;
          } else {
            setCurrentPage(brand.destinationValue);
          }
        }
        break;

      case 'internal_page':
        if (brand.destinationValue) {
          setCurrentPage(brand.destinationValue);
        }
        break;

      case 'none':
      default:
        // No navigation
        break;
    }
  };

  // Scroll manually via arrows
  const handleStepScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const step = (config.cardWidth || 170) * 2;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    });
  };

  if (config.enabled === false) {
    return null;
  }

  const animationDuration = isPreview
    ? Math.max(12, (config.animationSpeed || 35) * 0.8)
    : config.animationSpeed || 35;

  const HeadingTag = config.headingTag || 'h2';
  const widthMode = commonSettings?.containerWidth || config.layoutWidth || 'boxed';

  return (
    <section
      className={`relative overflow-hidden transition-colors ${
        widthMode === 'full' ? 'w-full' : ''
      }`}
      style={{
        backgroundColor: config.backgroundColor || '#ffffff',
        backgroundImage: config.backgroundGradient || undefined,
        paddingTop: `${config.sectionPaddingTop ?? 40}px`,
        paddingBottom: `${config.sectionPaddingBottom ?? 40}px`,
        marginTop: `${config.sectionMarginTop ?? 0}px`,
        marginBottom: `${config.sectionMarginBottom ?? 0}px`,
      }}
    >
      <div
        className={`mx-auto ${
          widthMode === 'narrow'
            ? 'max-w-4xl px-4'
            : widthMode === 'full'
            ? 'w-full px-2 sm:px-4'
            : 'max-w-7xl px-4 sm:px-6 lg:px-8'
        }`}
        style={config.maxContentWidth && widthMode !== 'full' ? { maxWidth: `${config.maxContentWidth}px` } : undefined}
      >
        {/* Widget Heading & Subtitle */}
        {(config.showSectionHeading || config.showSubtitle) && (
          <div
            className={`mb-6 sm:mb-8 flex flex-col ${
              config.headingAlignment === 'left'
                ? 'items-start text-left'
                : config.headingAlignment === 'right'
                ? 'items-end text-right'
                : 'items-center text-center'
            }`}
          >
            {config.showSectionHeading && (
              <HeadingTag
                className="tracking-tight font-heading transition-colors"
                style={{
                  fontSize: `${config.headingFontSize || 28}px`,
                  color: config.headingColor || '#0f172a',
                  fontWeight:
                    config.headingFontWeight === 'black'
                      ? 900
                      : config.headingFontWeight === 'extrabold'
                      ? 800
                      : config.headingFontWeight === 'bold'
                      ? 700
                      : config.headingFontWeight === 'semibold'
                      ? 600
                      : 400,
                }}
              >
                {config.sectionHeading || 'Popular Brands'}
              </HeadingTag>
            )}

            {config.showSubtitle && config.subtitle && (
              <p
                className="mt-1.5 text-xs sm:text-sm max-w-2xl leading-relaxed"
                style={{ color: config.subtitleColor || '#64748b' }}
              >
                {config.subtitle}
              </p>
            )}
          </div>
        )}

        {/* Marquee Track Container with Edge Fades */}
        <div className="relative group/marquee w-full">
          {/* Edge Fade Gradients (Left and Right) */}
          {config.edgeFade && (
            <>
              <div
                className="pointer-events-none absolute top-0 bottom-0 left-0 z-20"
                style={{
                  width: `${config.edgeFadeWidth || 80}px`,
                  background: `linear-gradient(to right, ${config.edgeFadeColor || config.backgroundColor || '#ffffff'} 15%, transparent 100%)`,
                }}
              />
              <div
                className="pointer-events-none absolute top-0 bottom-0 right-0 z-20"
                style={{
                  width: `${config.edgeFadeWidth || 80}px`,
                  background: `linear-gradient(to left, ${config.edgeFadeColor || config.backgroundColor || '#ffffff'} 15%, transparent 100%)`,
                }}
              />
            </>
          )}

          {/* Navigation Arrows (Optional) */}
          {config.showNavigationArrows && (
            <>
              <button
                type="button"
                onClick={() => handleStepScroll('left')}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md border border-slate-200/90 flex items-center justify-center opacity-0 group-hover/marquee:opacity-100 transition-all hover:scale-105 cursor-pointer focus:opacity-100"
                aria-label="Previous mobile brands"
              >
                <ChevronLeft className="w-5 h-5 text-slate-700" />
              </button>
              <button
                type="button"
                onClick={() => handleStepScroll('right')}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md border border-slate-200/90 flex items-center justify-center opacity-0 group-hover/marquee:opacity-100 transition-all hover:scale-105 cursor-pointer focus:opacity-100"
                aria-label="Next mobile brands"
              >
                <ChevronRight className="w-5 h-5 text-slate-700" />
              </button>
            </>
          )}

          {/* Scrolling Marquee Reel */}
          <div
            ref={scrollContainerRef}
            className={`flex items-center overflow-x-hidden select-none py-2 ${
              config.enableDragScroll ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
            onMouseEnter={() => {
              if (config.pauseOnHover) setIsPaused(true);
            }}
            onMouseLeave={() => {
              if (config.pauseOnHover) setIsPaused(false);
            }}
            onFocus={() => {
              if (config.pauseOnFocus) setIsPaused(true);
            }}
            onBlur={() => {
              if (config.pauseOnFocus) setIsPaused(false);
            }}
          >
            <div
              className="flex items-center shrink-0"
              style={{
                gap: `${config.cardGap ?? 18}px`,
                animation: config.autoplay
                  ? `mobileBrandMarquee ${animationDuration}s linear infinite ${
                      config.scrollDirection === 'right' ? 'reverse' : 'normal'
                    }`
                  : 'none',
                animationPlayState: isPaused ? 'paused' : 'running',
              }}
            >
              {repeatedBrands.map(({ item: brand, uniqueKey }) => {
                const isClickable = brand.destinationType !== 'none';

                return (
                  <div
                    key={uniqueKey}
                    onClick={() => handleBrandClick(brand)}
                    tabIndex={0}
                    role={isClickable ? 'button' : undefined}
                    title={brand.tooltip || brand.altText || brand.name}
                    className={`relative shrink-0 flex flex-col items-center justify-center transition-all duration-200 ${
                      isClickable ? 'cursor-pointer' : 'cursor-default'
                    } ${
                      config.cardHoverEffect === 'lift'
                        ? 'hover:-translate-y-1'
                        : config.cardHoverEffect === 'scale'
                        ? 'hover:scale-105'
                        : ''
                    }`}
                    style={{
                      width: `${config.cardWidth || 170}px`,
                      height: `${config.cardHeight || 88}px`,
                      backgroundColor: brand.customCardBg || config.cardBg || '#ffffff',
                      borderRadius: `${config.cardBorderRadius ?? 18}px`,
                      borderWidth: `${config.cardBorderWidth ?? 1}px`,
                      borderColor: brand.customBorderColor || config.cardBorderColor || '#e2e8f0',
                      boxShadow:
                        config.cardShadow === 'lg'
                          ? '0 10px 15px -3px rgba(0, 0, 0, 0.08)'
                          : config.cardShadow === 'md'
                          ? '0 4px 6px -1px rgba(0, 0, 0, 0.07)'
                          : config.cardShadow === 'xs'
                          ? '0 1px 2px 0 rgba(0, 0, 0, 0.03)'
                          : config.cardShadow === 'none'
                          ? 'none'
                          : '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    {/* Optional Brand Badge (e.g. Galaxy AI, iOS 18) */}
                    {config.showBadge && brand.badge && (
                      <span
                        className="absolute top-2 right-2 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: config.badgeBg || '#f1f5f9',
                          color: config.badgeColor || '#475569',
                        }}
                      >
                        {brand.badge}
                      </span>
                    )}

                    {/* Logo Display */}
                    <div
                      className={`flex items-center justify-center p-2 transition-all ${
                        config.grayscale
                          ? config.grayscaleHoverColor
                            ? 'grayscale hover:grayscale-0'
                            : 'grayscale'
                          : ''
                      }`}
                      style={{
                        maxWidth: `${config.logoMaxWidth || 120}px`,
                        maxHeight: `${config.logoMaxHeight || 40}px`,
                      }}
                    >
                      {brand.logoUrl ? (
                        <img
                          src={brand.logoUrl}
                          alt={brand.altText || brand.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            // Fallback to vector preset on error
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <BrandLogoSvg
                          preset={brand.logoSvgPreset}
                          name={brand.name}
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>

                    {/* Optional Brand Name Label */}
                    {config.showBrandName && (
                      <span
                        className="text-[11px] font-bold mt-1 tracking-tight truncate max-w-[85%]"
                        style={{ color: brand.customTextColor || config.headingColor || '#0f172a' }}
                      >
                        {brand.name}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom indicator / count info in preview or subtle helper */}
        {config.showPaginationDots && (
          <div className="flex items-center justify-center gap-1.5 mt-5">
            {activeBrands.slice(0, 8).map((b, i) => (
              <span
                key={b.id}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === 0 ? 'bg-[#DF0C88] w-4' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Scoped CSS Keyframe for Marquee */}
      <style>{`
        @keyframes mobileBrandMarquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .group\\/marquee [style*="animation"] {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
};
