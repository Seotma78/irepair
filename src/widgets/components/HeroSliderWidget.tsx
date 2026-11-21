import React, { useState, useEffect } from 'react';
import { WidgetRenderProps } from '../types';
import { useApp } from '../../context/AppContext';
import { ChevronLeft, ChevronRight, ArrowRight, Wrench, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { DeviceCategory } from '../../types';

export const HeroSliderWidget: React.FC<WidgetRenderProps> = ({ settings }) => {
  const { startRepairBooking, setCurrentPage } = useApp();
  const slides = settings.slides && settings.slides.length > 0 ? settings.slides : [
    {
      title: 'EXPRESS PHONE & LAPTOP REPAIR',
      subtitle: 'Cracked screen or dead battery? Fixed in 30 minutes with our official 6-Month Warranty.',
      buttonText: 'Book an Express Repair',
      buttonLink: '/book-repair',
      image: '/src/assets/images/hero_repair_specialist_1790843562093.jpg',
      overlayOpacity: 0.25,
    }
  ];

  const autoplaySpeed = settings.autoplaySpeed || 6500;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isPrimaryHovered, setIsPrimaryHovered] = useState(false);
  const [isSecondaryHovered, setIsSecondaryHovered] = useState(false);
  const [isQuoteHovered, setIsQuoteHovered] = useState(false);

  // Quick Hero Selector state for slide 0/1
  const [heroCategory, setHeroCategory] = useState<DeviceCategory>('smartphone');
  const [heroBrand, setHeroBrand] = useState('apple');
  const [heroIssue, setHeroIssue] = useState('screen');

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, autoplaySpeed);
    return () => clearInterval(interval);
  }, [isPaused, autoplaySpeed, slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const activeSlide = slides[currentSlide] || slides[0];

  const slideTitle = activeSlide.heading || activeSlide.title || '';
  const slideSubtitle = activeSlide.description || activeSlide.subtitle || '';

  // By default set the first slide heading as h1 and rest of the slides headings as h2
  const defaultHeadingTag = currentSlide === 0 ? 'h1' : 'h2';
  const rawTag = (activeSlide.headingTag || defaultHeadingTag).toLowerCase();
  const HeadingTag = (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'p', 'span'].includes(rawTag)
    ? rawTag
    : defaultHeadingTag) as React.ElementType;

  // Dynamic Overlay calculation
  const overlayColor = activeSlide.overlayColor || settings.globalOverlayColor || '#020617';
  const overlayOpacity = activeSlide.overlayOpacity !== undefined 
    ? activeSlide.overlayOpacity 
    : (settings.globalOverlayOpacity !== undefined ? settings.globalOverlayOpacity : 0.45);
  const overlayGradient = activeSlide.overlayGradient || 'left_fade';

  // Dynamic Content styling
  const titleColor = activeSlide.titleColor || '#ffffff';
  const subtitleColor = activeSlide.subtitleColor || '#f1f5f9';
  const badgeText = activeSlide.badge || (
    slideTitle.toLowerCase().includes('beach')
      ? 'Summer Repair Promo · 20% Off All Repairs'
      : slideTitle.toLowerCase().includes('biggest sale') || slideTitle.toLowerCase().includes('black friday')
      ? 'Biggest Sale Of The Year · In-Store Exclusives'
      : slideTitle.toLowerCase().includes('fix it')
      ? "UK's #1 Rated Tech Destination · 6-Month Warranty"
      : slideTitle.toLowerCase().includes('expert')
      ? 'Genuine OEM Parts · Same-Day Express Repairs'
      : slideTitle.toLowerCase().includes('spring')
      ? 'Spring Special · 20% Off + Free Screen Protector'
      : slideTitle.toLowerCase().includes('case')
      ? 'In-Store Arrivals · Premium Shockproof Cases'
      : slideTitle.toLowerCase().includes('accessor')
      ? 'Everyday Mobile Essentials · Fast UK Dispatch'
      : '30-Min Express Repairs Across 8 UK Stores'
  );
  const badgeColor = activeSlide.badgeColor || '#f472b6';
  const badgeBg = activeSlide.badgeBg || 'rgba(255, 255, 255, 0.14)';
  const badgeBorderColor = activeSlide.badgeBorderColor || (activeSlide.badgeColor ? `${activeSlide.badgeColor}40` : 'rgba(255, 255, 255, 0.25)');

  // Dynamic Button styling
  const buttonText = activeSlide.ctaText || activeSlide.buttonText || 'Get a Free Quote!';
  const buttonLink = activeSlide.ctaLink || activeSlide.buttonLink || '/quote';
  const buttonBg = activeSlide.buttonBg || '#DF0C88';
  const buttonTextColor = activeSlide.buttonTextColor || '#ffffff';
  const buttonHoverBg = activeSlide.buttonHoverBg || '#C50875';

  const secondaryButtonText = activeSlide.secondaryButtonText;
  const secondaryButtonLink = activeSlide.secondaryButtonLink || '/locations';
  const secondaryButtonBg = activeSlide.secondaryButtonBg || 'rgba(255, 255, 255, 0.12)';
  const secondaryButtonTextColor = activeSlide.secondaryButtonTextColor || '#ffffff';
  const secondaryButtonBorderColor = activeSlide.secondaryButtonBorderColor || 'rgba(255, 255, 255, 0.25)';
  const secondaryButtonHoverBg = activeSlide.secondaryButtonHoverBg || 'rgba(255, 255, 255, 0.22)';

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
    if (link.startsWith('http')) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
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
    }
  };

  return (
    <section
      className="relative overflow-hidden border-b border-slate-200/80 select-none bg-slate-900 isolate z-0"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            aria-label="Previous Slide"
            className="group absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 hover:bg-white text-slate-800 hover:text-[#DF0C88] shadow-xl border border-slate-200/80 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-90 cursor-pointer backdrop-blur-sm hover:shadow-[0_0_20px_rgba(223,12,136,0.35)]"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:-translate-x-0.5" />
          </button>
          <button
            onClick={nextSlide}
            aria-label="Next Slide"
            className="group absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 hover:bg-white text-slate-800 hover:text-[#DF0C88] shadow-xl border border-slate-200/80 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-90 cursor-pointer backdrop-blur-sm hover:shadow-[0_0_20px_rgba(223,12,136,0.35)]"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:translate-x-0.5" />
          </button>
        </>
      )}

      {/* Slide Container */}
      <div className="relative min-h-[460px] sm:min-h-[520px] lg:min-h-[560px] flex items-center">
        {/* Background Image */}
        <img
          key={currentSlide}
          src={activeSlide.image || '/images/hero/hero_slide_1.webp'}
          alt={slideTitle}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 animate-in fade-in-50"
          onError={(e) => {
            const fallbackIndex = (currentSlide % 7) + 1;
            const ext = fallbackIndex <= 3 ? 'webp' : 'jpg';
            const localFallback = `/images/hero/hero_slide_${fallbackIndex}.${ext}`;
            if (e.currentTarget.src !== localFallback) {
              e.currentTarget.src = localFallback;
            }
          }}
        />

        {/* Dynamic Overlay Color & Transparency */}
        <div
          className="absolute inset-0 transition-all duration-700 pointer-events-none"
          style={{
            backgroundColor: overlayColor,
            opacity: overlayOpacity,
          }}
        />

        {/* Dynamic Directional Gradient Blend */}
        {overlayGradient !== 'none' && overlayGradient !== 'solid_overlay' && (
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-700"
            style={{
              background: overlayGradient === 'subtle_vignette'
                ? `radial-gradient(circle at center, transparent 30%, ${overlayColor}ee 100%)`
                : `linear-gradient(to right, ${overlayColor} 0%, ${overlayColor}ee 35%, ${overlayColor}88 65%, transparent 100%)`,
            }}
          />
        )}

        {/* Slide Content */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-6 max-w-2xl">
              {/* Clean Editorial Kicker */}
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-pink-300 uppercase tracking-wider">
                <Clock className="w-4 h-4 text-[#DF0C88] shrink-0" />
                <span>{badgeText}</span>
              </div>

              {/* Slide Title with Custom Color & Selected Heading Tag */}
              <HeadingTag
                className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] drop-shadow-sm transition-colors duration-500 font-heading"
                style={{ color: titleColor }}
              >
                {slideTitle}
              </HeadingTag>

              {/* Subtitle / Details with Rich Text Editor formatting support */}
              <div
                className="text-base sm:text-lg leading-relaxed font-normal transition-colors duration-500 [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic [&_u]:underline [&_mark]:bg-pink-500/30 [&_mark]:text-white [&_mark]:px-1.5 [&_mark]:py-0.5 [&_mark]:rounded [&_a]:text-pink-300 [&_a]:underline hover:[&_a]:text-white [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_p]:mb-2.5 [&_p:last-child]:mb-0"
                style={{ color: subtitleColor }}
                dangerouslySetInnerHTML={{ __html: slideSubtitle }}
              />

              {/* CTA Action Buttons with Eye-Interactive Hover Animation */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                {/* Primary Button with Sheen, Glow, Lift, and Icon Motion */}
                <button
                  onClick={() => handleCtaClick(buttonLink)}
                  onMouseEnter={() => setIsPrimaryHovered(true)}
                  onMouseLeave={() => setIsPrimaryHovered(false)}
                  className="relative overflow-hidden group px-6 py-3.5 rounded-xl font-bold text-sm sm:text-base flex items-center gap-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
                  style={{
                    backgroundColor: isPrimaryHovered ? buttonHoverBg : buttonBg,
                    color: buttonTextColor,
                    boxShadow: isPrimaryHovered
                      ? `0 14px 35px -4px ${buttonBg}99, 0 0 25px 2px ${buttonBg}60`
                      : `0 4px 16px -2px ${buttonBg}50`,
                  }}
                >
                  {/* Diagonal Light Shimmer Sweep */}
                  <span className="absolute inset-0 -translate-x-[150%] group-hover:translate-x-[150%] bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-25deg] transition-transform duration-1000 ease-out pointer-events-none" />

                  {/* Inner subtle glow ring */}
                  <span className="absolute -inset-px rounded-xl border border-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  <span className="relative z-10">{buttonText}</span>
                  <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-300 ease-out group-hover:translate-x-1.5 group-hover:scale-115" />
                </button>

                {/* Secondary Button with Glassmorphism, Sheen and Border Glow (if defined) */}
                {secondaryButtonText && (
                  <button
                    onClick={() => handleCtaClick(secondaryButtonLink)}
                    onMouseEnter={() => setIsSecondaryHovered(true)}
                    onMouseLeave={() => setIsSecondaryHovered(false)}
                    className="relative overflow-hidden group px-5 py-3.5 rounded-xl backdrop-blur-md border text-sm sm:text-base font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.03] active:scale-[0.97] flex items-center gap-2 cursor-pointer"
                    style={{
                      backgroundColor: isSecondaryHovered ? secondaryButtonHoverBg : secondaryButtonBg,
                      color: secondaryButtonTextColor,
                      borderColor: isSecondaryHovered ? 'rgba(255, 255, 255, 0.7)' : secondaryButtonBorderColor,
                      boxShadow: isSecondaryHovered
                        ? '0 12px 30px -5px rgba(255, 255, 255, 0.25), 0 0 15px rgba(255, 255, 255, 0.15)'
                        : 'none',
                    }}
                  >
                    {/* Subtle Light Shimmer Sweep */}
                    <span className="absolute inset-0 -translate-x-[150%] group-hover:translate-x-[150%] bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-[-25deg] transition-transform duration-800 ease-out pointer-events-none" />

                    <span className="relative z-10">{secondaryButtonText}</span>
                    <ChevronRight className="relative z-10 w-4 h-4 transition-transform duration-300 ease-out group-hover:translate-x-1" />
                  </button>
                )}
              </div>

              {/* Dynamic Guarantees row */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10 text-xs font-medium text-slate-300">
                {activeSlide.title?.toLowerCase().includes('refurbished') || activeSlide.title?.toLowerCase().includes('pre-loved') ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-pink-400 shrink-0" />
                      <span>12-Mo Guarantee</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
                      <span>70-Point Check</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-pink-400 shrink-0" />
                      <span>Next-Day UK Post</span>
                    </div>
                  </>
                ) : activeSlide.title?.toLowerCase().includes('sell') || activeSlide.title?.toLowerCase().includes('cash') ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-pink-400 shrink-0" />
                      <span>Best Price Match</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
                      <span>Same-Day Payout</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-pink-400 shrink-0" />
                      <span>60-Sec Valuation</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-pink-400 shrink-0" />
                      <span>6-Month Warranty</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
                      <span>No Fix, No Fee</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-pink-400 shrink-0" />
                      <span>30-Min Fast Fix</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick Repair Booking Widget on the right */}
            <div className="lg:col-span-5">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 sm:p-7 shadow-2xl border border-white/20 text-slate-900">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#DF0C88]/10 text-[#DF0C88] flex items-center justify-center">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Instant Repair Price Check</h3>
                    <p className="text-xs text-slate-500">Select device fault for guaranteed quote</p>
                  </div>
                </div>

                <form onSubmit={handleHeroSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Device Type</label>
                    <select
                      value={heroCategory}
                      onChange={(e) => setHeroCategory(e.target.value as DeviceCategory)}
                      className="w-full text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                    >
                      <option value="smartphone">Mobile Phone</option>
                      <option value="tablet">iPad & Tablet</option>
                      <option value="laptop">MacBook & Laptop</option>
                      <option value="smartwatch">Apple Watch</option>
                      <option value="console">Game Console</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Brand</label>
                      <select
                        value={heroBrand}
                        onChange={(e) => setHeroBrand(e.target.value)}
                        className="w-full text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                      >
                        <option value="apple">Apple</option>
                        <option value="samsung">Samsung</option>
                        <option value="google">Google Pixel</option>
                        <option value="huawei">Huawei</option>
                        <option value="xiaomi">Xiaomi</option>
                        <option value="dell">Dell</option>
                        <option value="hp">HP</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Common Fault</label>
                      <select
                        value={heroIssue}
                        onChange={(e) => setHeroIssue(e.target.value)}
                        className="w-full text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                      >
                        <option value="screen">Cracked Screen / OLED</option>
                        <option value="battery">Battery Draining / Dead</option>
                        <option value="charging-port">Not Charging / Port Fix</option>
                        <option value="water-damage">Liquid / Water Damage</option>
                        <option value="back-glass">Rear Back Glass</option>
                        <option value="camera">Camera / Lens Broken</option>
                      </select>
                    </div>
                  </div>

                  {/* Submit Button with Eye-Interactive Hover Animation */}
                  <button
                    type="submit"
                    onMouseEnter={() => setIsQuoteHovered(true)}
                    onMouseLeave={() => setIsQuoteHovered(false)}
                    className="relative overflow-hidden group w-full py-3.5 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold text-sm shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                    style={{
                      boxShadow: isQuoteHovered
                        ? '0 12px 30px -4px rgba(223, 12, 136, 0.65), 0 0 20px 2px rgba(223, 12, 136, 0.4)'
                        : '0 4px 14px 0 rgba(223, 12, 136, 0.35)',
                    }}
                  >
                    {/* Diagonal Light Shimmer Sweep */}
                    <span className="absolute inset-0 -translate-x-[150%] group-hover:translate-x-[150%] bg-gradient-to-r from-transparent via-white/35 to-transparent skew-x-[-25deg] transition-transform duration-800 ease-out pointer-events-none" />

                    <Wrench className="relative z-10 w-4 h-4 transition-transform duration-300 ease-out group-hover:rotate-12 group-hover:scale-110" />
                    <span className="relative z-10">Get Instant Quote & Book</span>
                    <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-300 ease-out group-hover:translate-x-1" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Slide indicator dots */}
        {slides.length > 1 && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
            {slides.map((_: any, idx: number) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2.5 rounded-full transition-all cursor-pointer ${
                  currentSlide === idx ? 'w-8 bg-[#DF0C88]' : 'w-2.5 bg-white/50 hover:bg-white'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
