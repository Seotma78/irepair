import React, { useState, useEffect, useRef } from 'react';
import { WidgetRenderProps } from '../types';
import { useApp } from '../../context/AppContext';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Zap,
  BadgePoundSterling,
} from 'lucide-react';
import { DeviceCategory } from '../../types';
import {
  HERO_BRIGHT_SLIDER_DEFAULTS,
  BrightHeroSlide,
} from './heroBrightSliderDefaults';

export const HeroBrightSliderWidget: React.FC<WidgetRenderProps> = ({ settings = {} }) => {
  const { startRepairBooking, setCurrentPage } = useApp();

  const slides: BrightHeroSlide[] =
    Array.isArray(settings.slides) && settings.slides.length > 0
      ? settings.slides
      : HERO_BRIGHT_SLIDER_DEFAULTS.slides;

  const autoplaySpeed = Number(settings.autoplaySpeed) || HERO_BRIGHT_SLIDER_DEFAULTS.autoplaySpeed;
  const pauseOnHover = settings.pauseOnHover !== false;
  const showArrows = settings.showArrows !== false;
  const showDots = Boolean(settings.showDots);
  const showQuoteBar = settings.showQuoteBar !== false;
  const showSlideCta = Boolean(settings.showSlideCta);
  const scrimEnabled = settings.scrimEnabled !== false;
  const scrimColor = settings.scrimColor || HERO_BRIGHT_SLIDER_DEFAULTS.scrimColor;

  const globalEyebrowColor = settings.eyebrowColor || HERO_BRIGHT_SLIDER_DEFAULTS.eyebrowColor;
  const globalHeadlineColor = settings.headlineColor || HERO_BRIGHT_SLIDER_DEFAULTS.headlineColor;
  const globalSubheadlineColor =
    settings.subheadlineColor || HERO_BRIGHT_SLIDER_DEFAULTS.subheadlineColor;
  const globalCtaBg = settings.ctaBgColor || HERO_BRIGHT_SLIDER_DEFAULTS.ctaBgColor;
  const globalCtaText = settings.ctaTextColor || HERO_BRIGHT_SLIDER_DEFAULTS.ctaTextColor;
  const quoteButtonText =
    settings.quoteButtonText || HERO_BRIGHT_SLIDER_DEFAULTS.quoteButtonText;

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imgFailedMap, setImgFailedMap] = useState<Record<number, boolean>>({});
  const touchStartX = useRef<number | null>(null);

  // Quick Hero Selector state (preserved from original HeroSliderWidget)
  const [heroCategory, setHeroCategory] = useState<DeviceCategory>('smartphone');
  const [heroBrand, setHeroBrand] = useState('apple');
  const [heroIssue, setHeroIssue] = useState('screen');

  useEffect(() => {
    if (currentSlide >= slides.length) {
      setCurrentSlide(0);
    }
  }, [slides.length, currentSlide]);

  useEffect(() => {
    if ((pauseOnHover && isPaused) || slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, autoplaySpeed);
    return () => clearInterval(interval);
  }, [isPaused, pauseOnHover, autoplaySpeed, slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || slides.length <= 1) return;
    const delta = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(delta) > 45) {
      if (delta < 0) nextSlide();
      else prevSlide();
    }
    touchStartX.current = null;
  };

  const activeSlide = slides[currentSlide] || slides[0];
  const slideTitle = activeSlide.heading || activeSlide.title || '';
  const slideSubtitle = activeSlide.description || activeSlide.subtitle || '';

  const defaultHeadingTag = currentSlide === 0 ? 'h1' : 'h2';
  const rawTag = (activeSlide.headingTag || defaultHeadingTag).toLowerCase();
  const HeadingTag = (
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'p', 'span'].includes(rawTag)
      ? rawTag
      : defaultHeadingTag
  ) as React.ElementType;

  const badgeText =
    activeSlide.badge ||
    (slideTitle.toLowerCase().includes('beach')
      ? 'Summer Repair Special · 20% Off All Repairs'
      : slideTitle.toLowerCase().includes('biggest sale') ||
          slideTitle.toLowerCase().includes('black friday')
        ? 'Biggest Sale Of The Year · In-Store Exclusives'
        : slideTitle.toLowerCase().includes('fix it')
          ? "UK's #1 Rated Tech Destination · 6-Month Warranty"
          : slideTitle.toLowerCase().includes('expert')
            ? 'Certified Engineers · No Fix, No Fee Guarantee'
            : slideTitle.toLowerCase().includes('spring')
              ? 'Spring Promo · Free Screen Protector Included'
              : slideTitle.toLowerCase().includes('case')
                ? 'New In-Store Arrivals · Impact Drop Protection'
                : slideTitle.toLowerCase().includes('accessor')
                  ? 'Everyday Mobile Essentials · Fast UK Dispatch'
                  : '30-Min Express Repairs Across 8 UK Stores');

  // Ensure bright high-key palette (#4A0456 headline, #475569 subheadline, #EC008C eyebrow/CTA)
  // Ignore legacy dark-mode white/slate-100 defaults if carried over from dark slider
  const resolveLightColor = (candidate: string | undefined, fallback: string) => {
    if (!candidate) return fallback;
    const lower = candidate.toLowerCase().trim();
    if (
      lower === '#ffffff' ||
      lower === '#fff' ||
      lower === '#f1f5f9' ||
      lower === '#e2e8f0' ||
      lower === '#cbd5e1'
    ) {
      return fallback;
    }
    return candidate;
  };

  const titleColor = resolveLightColor(activeSlide.titleColor, globalHeadlineColor);
  const subtitleColor = resolveLightColor(activeSlide.subtitleColor, globalSubheadlineColor);
  const eyebrowColor = globalEyebrowColor;

  const buttonText = activeSlide.ctaText || activeSlide.buttonText || 'Get a Free Quote!';
  const buttonLink = activeSlide.ctaLink || activeSlide.buttonLink || '/quote';
  const buttonBg = activeSlide.buttonBg && activeSlide.buttonBg !== '#DF0C88'
    ? activeSlide.buttonBg
    : globalCtaBg;
  const buttonTextColor = activeSlide.buttonTextColor || globalCtaText;

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startRepairBooking({
      category: heroCategory,
      brand: heroBrand,
      issue: heroIssue,
    });
  };

  const handleCtaClick = (link?: string) => {
    if (!link) return;
    if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank', 'noopener,noreferrer');
      return;
    }
    const cleanSlug = link.replace(/^\/+|\/+$/g, '');
    if (cleanSlug === 'quote' || cleanSlug === 'repairs') {
      startRepairBooking();
      return;
    }
    if (cleanSlug === 'offers' || cleanSlug === 'cases' || cleanSlug === 'accessories') {
      setCurrentPage('shop');
      return;
    }
    setCurrentPage((cleanSlug || 'home') as any);
  };

  const fallbackIndex = (currentSlide % 7) + 1;
  const fallbackExt = fallbackIndex <= 3 ? 'webp' : 'jpg';
  const fallbackImgUrl =
    activeSlide.fallbackImage || `/images/hero/hero_slide_${fallbackIndex}.${fallbackExt}`;

  const renderTrustBadges = () => {
    const lowerTitle = slideTitle.toLowerCase();
    if (lowerTitle.includes('refurbished') || lowerTitle.includes('pre-loved')) {
      return (
        <>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: eyebrowColor }} />
            <span className="text-xs sm:text-[13px] font-bold text-slate-900">12-Mo Guarantee</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: eyebrowColor }} />
            <span className="text-xs sm:text-[13px] font-bold text-slate-900">70-Point Check</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0" style={{ color: eyebrowColor }} />
            <span className="text-xs sm:text-[13px] font-bold text-slate-900">Next-Day UK Post</span>
          </div>
        </>
      );
    }

    if (lowerTitle.includes('sell') || lowerTitle.includes('cash')) {
      return (
        <>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: eyebrowColor }} />
            <span className="text-xs sm:text-[13px] font-bold text-slate-900">Best Price Match</span>
          </div>
          <div className="flex items-center gap-2">
            <BadgePoundSterling className="w-4 h-4 shrink-0" style={{ color: eyebrowColor }} />
            <span className="text-xs sm:text-[13px] font-bold text-slate-900">Same-Day Payout</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 shrink-0" style={{ color: eyebrowColor }} />
            <span className="text-xs sm:text-[13px] font-bold text-slate-900">60-Sec Valuation</span>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: eyebrowColor }} />
          <span className="text-xs sm:text-[13px] font-bold text-slate-900">6-Month Warranty</span>
        </div>
        <div className="flex items-center gap-2">
          <BadgePoundSterling className="w-4 h-4 shrink-0" style={{ color: eyebrowColor }} />
          <span className="text-xs sm:text-[13px] font-bold text-slate-900">No Fix, No Fee</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 shrink-0" style={{ color: eyebrowColor }} />
          <span className="text-xs sm:text-[13px] font-bold text-slate-900">30-Min Fast Fix</span>
        </div>
      </>
    );
  };

  return (
    <section
      aria-label="Hero showcase"
      className="relative overflow-hidden bg-white border-b border-slate-200/80 select-none isolate z-0"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Minimal Circular Navigation Arrows Pinned to Outer Edges */}
      {showArrows && slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous slide"
            className="group absolute left-2.5 sm:left-4 lg:left-5 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-[#EC008C] shadow-[0_6px_18px_rgba(15,23,42,0.12)] border border-slate-200/80 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EC008C]"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next slide"
            className="group absolute right-2.5 sm:right-4 lg:right-5 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-[#EC008C] shadow-[0_6px_18px_rgba(15,23,42,0.12)] border border-slate-200/80 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EC008C]"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </>
      )}

      {/* Bright High-Key Hero Stage */}
      <div className="relative min-h-[540px] sm:min-h-[580px] lg:min-h-[600px] flex flex-col justify-between">
        {/* Full-Bleed Background Image (No Dark Overlay) */}
        {!imgFailedMap[currentSlide] ? (
          <img
            key={`${currentSlide}-${activeSlide.image || fallbackImgUrl}`}
            src={activeSlide.image || fallbackImgUrl}
            alt={slideTitle}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-right md:object-center transition-opacity duration-500"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.getAttribute('data-fallback-tried') !== 'true' && target.src !== fallbackImgUrl) {
                target.setAttribute('data-fallback-tried', 'true');
                target.src = fallbackImgUrl;
              } else {
                setImgFailedMap((prev) => ({ ...prev, [currentSlide]: true }));
              }
            }}
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 w-full h-full bg-gradient-to-br from-white via-slate-50 to-pink-50/40"
          />
        )}

        {/* Subtle White-to-Transparent Left Gradient Scrim for Crisp Left Text Contrast */}
        {scrimEnabled && (
          <>
            <div
              aria-hidden="true"
              className="hidden md:block absolute inset-0 pointer-events-none transition-opacity duration-500"
              style={{
                background: `linear-gradient(90deg, ${scrimColor} 0%, ${scrimColor}f5 34%, ${scrimColor}bf 50%, ${scrimColor}00 72%)`,
              }}
            />
            <div
              aria-hidden="true"
              className="md:hidden absolute inset-0 pointer-events-none transition-opacity duration-500"
              style={{
                background: `linear-gradient(180deg, ${scrimColor}f7 0%, ${scrimColor}eb 64%, ${scrimColor}c4 100%)`,
              }}
            />
          </>
        )}

        {/* Main Hero Stage Text Area: Vertically Centered Above the Bottom Floating Bar */}
        <div className="relative z-20 flex-1 flex items-center w-full">
          <div className="max-w-7xl mx-auto px-12 sm:px-16 lg:px-20 pt-10 pb-6 w-full">
            <div className="max-w-[540px] space-y-4 sm:space-y-5">
              {/* Eyebrow Tag in Vibrant Magenta (#EC008C) */}
              <p
                className="text-[11px] sm:text-xs font-extrabold uppercase tracking-[0.09em] leading-snug"
                style={{ color: eyebrowColor }}
              >
                {badgeText}
              </p>

              {/* Main Headline in Deep Plum Purple (#4A0456) */}
              <HeadingTag
                className="text-[2rem] sm:text-[2.75rem] lg:text-[3.35rem] font-extrabold tracking-[-0.025em] leading-[1.08] font-heading"
                style={{ color: titleColor, textWrap: 'balance' }}
              >
                {slideTitle}
              </HeadingTag>

              {/* Subheadline in Slate Gray (#475569) */}
              <div
                className="text-sm sm:text-base lg:text-[1.05rem] leading-[1.6] font-normal max-w-[490px] [&_strong]:font-bold [&_strong]:text-slate-900 [&_em]:italic [&_a]:text-[#EC008C] [&_a]:underline [&_p]:mb-2 [&_p:last-child]:mb-0"
                style={{ color: subtitleColor }}
                dangerouslySetInnerHTML={{ __html: slideSubtitle }}
              />

              {/* Optional Per-Slide CTA Button */}
              {showSlideCta && buttonText && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleCtaClick(buttonLink)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap shrink-0 shadow-[0_8px_20px_-4px_rgba(236,0,140,0.4)] hover:opacity-95 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
                    style={{
                      backgroundColor: buttonBg,
                      color: buttonTextColor,
                    }}
                  >
                    <span>{buttonText}</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              )}

              {/* Trust Badges Row */}
              <div className="flex flex-wrap items-center gap-x-5 sm:gap-x-6 gap-y-2.5 pt-1.5">
                {renderTrustBadges()}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Floating Quote Bar Anchored Near Bottom Center */}
        {showQuoteBar && (
          <div className="relative z-20 max-w-[1060px] mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 w-full">
            <form
              onSubmit={handleHeroSubmit}
              className="bg-white rounded-[16px] shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12),0_4px_16px_-4px_rgba(15,23,42,0.06)] border border-slate-200/75 p-4 sm:px-6 sm:py-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_0.9fr_1.35fr_auto] gap-3 sm:gap-3.5 items-end">
                {/* Device Type */}
                <div>
                  <label
                    htmlFor="bright-hero-category"
                    className="block text-[11px] font-semibold text-[#475569] mb-1.5 pl-1"
                  >
                    Device Type
                  </label>
                  <div className="relative">
                    <select
                      id="bright-hero-category"
                      value={heroCategory}
                      onChange={(e) => setHeroCategory(e.target.value as DeviceCategory)}
                      className="w-full appearance-none h-[44px] text-xs sm:text-sm font-medium text-slate-800 bg-white border border-slate-200 hover:border-slate-300 rounded-full pl-4 pr-9 focus:outline-none focus:ring-2 focus:ring-[#EC008C]/25 focus:border-[#EC008C] transition-colors cursor-pointer"
                    >
                      <option value="smartphone">Mobile Phone</option>
                      <option value="tablet">iPad &amp; Tablet</option>
                      <option value="laptop">MacBook &amp; Laptop</option>
                      <option value="smartwatch">Apple Watch</option>
                      <option value="console">Game Console</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Brand */}
                <div>
                  <label
                    htmlFor="bright-hero-brand"
                    className="block text-[11px] font-semibold text-[#475569] mb-1.5 pl-1"
                  >
                    Brand
                  </label>
                  <div className="relative">
                    <select
                      id="bright-hero-brand"
                      value={heroBrand}
                      onChange={(e) => setHeroBrand(e.target.value)}
                      className="w-full appearance-none h-[44px] text-xs sm:text-sm font-medium text-slate-800 bg-white border border-slate-200 hover:border-slate-300 rounded-full pl-4 pr-9 focus:outline-none focus:ring-2 focus:ring-[#EC008C]/25 focus:border-[#EC008C] transition-colors cursor-pointer"
                    >
                      <option value="apple">Apple</option>
                      <option value="samsung">Samsung</option>
                      <option value="google">Google Pixel</option>
                      <option value="huawei">Huawei</option>
                      <option value="xiaomi">Xiaomi</option>
                      <option value="dell">Dell</option>
                      <option value="hp">HP</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Common Fault */}
                <div>
                  <label
                    htmlFor="bright-hero-issue"
                    className="block text-[11px] font-semibold text-[#475569] mb-1.5 pl-1"
                  >
                    Common Fault
                  </label>
                  <div className="relative">
                    <select
                      id="bright-hero-issue"
                      value={heroIssue}
                      onChange={(e) => setHeroIssue(e.target.value)}
                      className="w-full appearance-none h-[44px] text-xs sm:text-sm font-medium text-slate-800 bg-white border border-slate-200 hover:border-slate-300 rounded-full pl-4 pr-9 focus:outline-none focus:ring-2 focus:ring-[#EC008C]/25 focus:border-[#EC008C] transition-colors cursor-pointer"
                    >
                      <option value="screen">Cracked Screen / OLED</option>
                      <option value="battery">Battery Draining / Dead</option>
                      <option value="charging-port">Not Charging / Port Fix</option>
                      <option value="water-damage">Liquid / Water Damage</option>
                      <option value="back-glass">Rear Back Glass</option>
                      <option value="camera">Camera / Lens Broken</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Primary CTA Button */}
                <button
                  type="submit"
                  className="sm:col-span-2 lg:col-span-1 h-[44px] px-6 sm:px-7 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-[0_8px_22px_-4px_rgba(236,0,140,0.45)] hover:shadow-[0_12px_28px_-4px_rgba(236,0,140,0.58)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EC008C]"
                  style={{
                    backgroundColor: globalCtaBg,
                    color: globalCtaText,
                  }}
                >
                  <span>{quoteButtonText}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </form>

            {/* Optional Subtle Pagination Dots */}
            {showDots && slides.length > 1 && (
              <div className="mt-3 flex items-center justify-center gap-1.5">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    className={`h-2 rounded-full transition-all duration-200 cursor-pointer ${
                      currentSlide === idx
                        ? 'w-6 bg-[#EC008C]'
                        : 'w-2 bg-slate-300 hover:bg-slate-400'
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

export default HeroBrightSliderWidget;
