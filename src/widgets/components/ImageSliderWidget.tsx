import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { WidgetRenderProps } from '../types';
import { useApp } from '../../context/AppContext';
import {
  ImageSliderConfig,
  SlideItem,
  DeviceMode,
  DEFAULT_IMAGE_SLIDER_CONFIG,
  resolveResponsive,
} from './image-slider/imageSliderTypes';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  ArrowRight,
  ExternalLink,
  Wrench,
  MapPin,
  ShoppingBag,
  Laptop,
  Sparkles,
  ShieldCheck,
  Clock,
  CheckCircle2,
} from 'lucide-react';

const normalizeImg = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith('/src/assets/images/')) {
    return url.replace('/src/assets/images/', '/images/');
  }
  return url;
};

export const ImageSliderWidget: React.FC<WidgetRenderProps> = ({
  settings,
  commonSettings,
  isPreview = false,
}) => {
  const { setCurrentPage } = useApp ? useApp() : { setCurrentPage: () => {} };

  // Merge settings with defaults
  const config: ImageSliderConfig = useMemo(() => {
    return {
      ...DEFAULT_IMAGE_SLIDER_CONFIG,
      ...settings,
      arrows: { ...DEFAULT_IMAGE_SLIDER_CONFIG.arrows, ...(settings?.arrows || {}) },
      pagination: { ...DEFAULT_IMAGE_SLIDER_CONFIG.pagination, ...(settings?.pagination || {}) },
      thumbnails: { ...DEFAULT_IMAGE_SLIDER_CONFIG.thumbnails, ...(settings?.thumbnails || {}) },
      scrollbar: { ...DEFAULT_IMAGE_SLIDER_CONFIG.scrollbar, ...(settings?.scrollbar || {}) },
      playPauseButton: { ...DEFAULT_IMAGE_SLIDER_CONFIG.playPauseButton, ...(settings?.playPauseButton || {}) },
      counter: { ...DEFAULT_IMAGE_SLIDER_CONFIG.counter, ...(settings?.counter || {}) },
      autoplay: { ...DEFAULT_IMAGE_SLIDER_CONFIG.autoplay, ...(settings?.autoplay || {}) },
      kenBurns: { ...DEFAULT_IMAGE_SLIDER_CONFIG.kenBurns, ...(settings?.kenBurns || {}) },
      container: { ...DEFAULT_IMAGE_SLIDER_CONFIG.container, ...(settings?.container || {}) },
      slideStyle: { ...DEFAULT_IMAGE_SLIDER_CONFIG.slideStyle, ...(settings?.slideStyle || {}) },
      typography: {
        ...DEFAULT_IMAGE_SLIDER_CONFIG.typography,
        ...(settings?.typography || {}),
        headingSize: settings?.typography?.headingSize || DEFAULT_IMAGE_SLIDER_CONFIG.typography.headingSize,
        subheadingSize: settings?.typography?.subheadingSize || DEFAULT_IMAGE_SLIDER_CONFIG.typography.subheadingSize,
        descriptionSize: settings?.typography?.descriptionSize || DEFAULT_IMAGE_SLIDER_CONFIG.typography.descriptionSize,
      },
      buttonsStyle: { ...DEFAULT_IMAGE_SLIDER_CONFIG.buttonsStyle, ...(settings?.buttonsStyle || {}) },
      entranceAnimation: { ...DEFAULT_IMAGE_SLIDER_CONFIG.entranceAnimation, ...(settings?.entranceAnimation || {}) },
      slides: Array.isArray(settings?.slides) && settings.slides.length > 0
        ? settings.slides
        : DEFAULT_IMAGE_SLIDER_CONFIG.slides,
    };
  }, [settings]);

  // Responsive device state based on container width or window width
  const containerRef = useRef<HTMLDivElement>(null);
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [containerWidth, setContainerWidth] = useState<number>(1200);

  useEffect(() => {
    const updateDevice = () => {
      const width = containerRef.current?.getBoundingClientRect().width || window.innerWidth;
      setContainerWidth(width);
      if (width < (config.tabletBreakpoint || 768)) {
        setDevice('mobile');
      } else if (width < (config.desktopBreakpoint || 1024)) {
        setDevice('tablet');
      } else {
        setDevice('desktop');
      }
    };

    updateDevice();
    window.addEventListener('resize', updateDevice);
    return () => window.removeEventListener('resize', updateDevice);
  }, [config.desktopBreakpoint, config.tabletBreakpoint]);

  // Respect prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  // Filter slides according to visibility, scheduling, and isHidden
  const activeSlides = useMemo(() => {
    const now = new Date();
    return config.slides.filter((slide) => {
      if (slide.isHidden) return false;

      // Scheduling check
      if (slide.scheduling?.enabled) {
        if (slide.scheduling.showFrom && new Date(slide.scheduling.showFrom) > now) {
          return false;
        }
        if (slide.scheduling.showUntil && new Date(slide.scheduling.showUntil) < now) {
          return false;
        }
      }

      // Per-device visibility check
      if (slide.visibility) {
        if (device === 'desktop' && slide.visibility.desktop === false) return false;
        if (device === 'tablet' && slide.visibility.tablet === false) return false;
        if (device === 'mobile' && slide.visibility.mobile === false) return false;
      }

      return true;
    });
  }, [config.slides, device]);

  const totalSlides = activeSlides.length > 0 ? activeSlides.length : 1;
  const [currentIndex, setCurrentIndex] = useState(config.initialSlide || 0);
  const [isPaused, setIsPaused] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isOffscreen, setIsOffscreen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Responsive values resolved for current device
  const slidesPerView = Math.max(1, resolveResponsive(config.slidesPerView, device, 1));
  const slidesPerGroup = Math.max(1, resolveResponsive(config.slidesPerGroup, device, 1));
  const spaceBetween = resolveResponsive(config.spaceBetween, device, 0);
  const layoutMode = resolveResponsive(config.layoutMode, device, 'full');
  const heightMode = resolveResponsive(config.heightMode, device, 'fixed');
  const fixedHeight = resolveResponsive(config.fixedHeight, device, 560);
  const aspectRatio = resolveResponsive(config.aspectRatio, device, '16:9');
  const customAspectRatio = resolveResponsive(config.customAspectRatio, device, '16:9');
  const cornerRadius = resolveResponsive(config.cornerRadius, device, 0);
  const centeredSlides = resolveResponsive(config.centeredSlides, device, false);
  const peekPadding = resolveResponsive(config.peekPadding, device, 0);
  const imageFit = resolveResponsive(config.imageFit, device, 'cover');

  // Navigation show per device
  const showArrows =
    device === 'desktop' ? config.arrows.showDesktop :
    device === 'tablet' ? config.arrows.showTablet :
    config.arrows.showMobile;

  // IntersectionObserver for pausing off-screen
  useEffect(() => {
    if (!config.pauseOffscreen || !containerRef.current || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsOffscreen(!entry.isIntersecting);
      },
      { threshold: 0.15 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [config.pauseOffscreen]);

  // Autoplay timer
  const canAutoplay =
    config.autoplay.enabled &&
    !prefersReducedMotion &&
    !isOffscreen &&
    !isPaused &&
    !(config.autoplay.stopOnInteraction && hasInteracted) &&
    !(config.autoplay.pauseOnHover && isHovering) &&
    totalSlides > 1;

  useEffect(() => {
    if (!canAutoplay) {
      setProgress(0);
      return;
    }

    const intervalTime = config.autoplay.delay || 6000;
    const stepTime = 50;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += stepTime;
      const pct = Math.min(100, (elapsed / intervalTime) * 100);
      setProgress(pct);

      if (elapsed >= intervalTime) {
        elapsed = 0;
        setProgress(0);
        setCurrentIndex((prev) => {
          if (prev >= totalSlides - slidesPerView) {
            return config.loop ? 0 : prev;
          }
          return prev + slidesPerGroup;
        });
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [canAutoplay, config.autoplay.delay, config.loop, slidesPerView, slidesPerGroup, totalSlides]);

  // Go to slide
  const goToSlide = useCallback((index: number) => {
    setHasInteracted(true);
    setProgress(0);
    const maxIdx = Math.max(0, totalSlides - 1);
    if (config.loop) {
      const wrapped = (index + totalSlides) % totalSlides;
      setCurrentIndex(wrapped);
    } else {
      setCurrentIndex(Math.max(0, Math.min(maxIdx, index)));
    }
  }, [config.loop, totalSlides]);

  const handleNext = () => goToSlide(currentIndex + slidesPerGroup);
  const handlePrev = () => goToSlide(currentIndex - slidesPerGroup);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!config.keyboardNav) return;
    if (e.key === 'ArrowRight' || (config.slideDirection === 'vertical' && e.key === 'ArrowDown')) {
      e.preventDefault();
      handleNext();
    } else if (e.key === 'ArrowLeft' || (config.slideDirection === 'vertical' && e.key === 'ArrowUp')) {
      e.preventDefault();
      handlePrev();
    }
  };

  // Touch and mouse dragging
  const dragStartRef = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const onDragStart = (clientX: number) => {
    if (!config.touchDrag) return;
    dragStartRef.current = clientX;
  };

  const onDragMove = (clientX: number) => {
    if (dragStartRef.current === null) return;
    setDragOffset(clientX - dragStartRef.current);
  };

  const onDragEnd = () => {
    if (dragStartRef.current === null) return;
    const diff = dragOffset;
    dragStartRef.current = null;
    setDragOffset(0);

    const threshold = config.swipeThreshold || 40;
    if (diff < -threshold) {
      handleNext();
    } else if (diff > threshold) {
      handlePrev();
    }
  };

  // Handle CTA button clicks
  const handleCtaClick = (e: React.MouseEvent, link?: string, openInNewTab?: boolean) => {
    e.stopPropagation();
    if (!link) return;
    if (openInNewTab || link.startsWith('http')) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      const pageSlug = link.replace(/^\//, '') as any;
      setCurrentPage(pageSlug || 'home');
    }
  };

  // Compute Height style
  const heightStyle: React.CSSProperties = useMemo(() => {
    if (heightMode === 'fixed') {
      return { height: `${fixedHeight}px` };
    }
    if (heightMode === 'aspect_ratio') {
      let ratio = '16/9';
      if (aspectRatio === '21:9') ratio = '21/9';
      if (aspectRatio === '4:3') ratio = '4/3';
      if (aspectRatio === '1:1') ratio = '1/1';
      if (aspectRatio === 'custom' && customAspectRatio) ratio = customAspectRatio.replace(':', '/');
      return { aspectRatio: ratio };
    }
    return { minHeight: '380px' };
  }, [heightMode, fixedHeight, aspectRatio, customAspectRatio]);

  // Section width resolution: commonSettings takes precedence, falling back to layoutMode
  const isFullWidthEdgeToEdge =
    commonSettings?.containerWidth === 'full' ||
    layoutMode === 'full_bleed' ||
    (layoutMode === 'full' && commonSettings?.containerWidth !== 'boxed');

  const isBoxed =
    !isFullWidthEdgeToEdge &&
    (commonSettings?.containerWidth === 'boxed' || layoutMode === 'boxed');

  const isNarrow = commonSettings?.containerWidth === 'narrow';

  const containerWidthClass = isFullWidthEdgeToEdge
    ? 'w-full max-w-none p-0 m-0'
    : isNarrow
    ? 'max-w-4xl mx-auto px-4 sm:px-6'
    : isBoxed
    ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
    : 'w-full max-w-none p-0 m-0';

  const effectiveCornerRadius = isFullWidthEdgeToEdge && !peekPadding ? 0 : cornerRadius;

  // Map icon strings to icon components
  const renderIcon = (name?: string, className = 'w-4 h-4') => {
    switch (name) {
      case 'Wrench': return <Wrench className={className} />;
      case 'MapPin': return <MapPin className={className} />;
      case 'ShoppingBag': return <ShoppingBag className={className} />;
      case 'Laptop': return <Laptop className={className} />;
      case 'Sparkles': return <Sparkles className={className} />;
      case 'ShieldCheck': return <ShieldCheck className={className} />;
      case 'Clock': return <Clock className={className} />;
      case 'CheckCircle2': return <CheckCircle2 className={className} />;
      default: return <ArrowRight className={className} />;
    }
  };

  return (
    <section
      ref={containerRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={config.widgetTitle || 'Image Slider'}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onTouchStart={() => config.autoplay.pauseOnTouch && setIsPaused(true)}
      onTouchEnd={() => config.autoplay.pauseOnTouch && setIsPaused(false)}
      className={`relative select-none overflow-hidden outline-none isolate z-0 ${config.customCssClass || ''}`}
      style={{
        backgroundColor: config.container.bgType === 'color' ? config.container.bgColor : undefined,
        backgroundImage:
          config.container.bgType === 'gradient' ? config.container.gradient :
          config.container.bgType === 'image' && config.container.bgImage ? `url(${config.container.bgImage})` : undefined,
        paddingTop: `${config.container.paddingTop}px`,
        paddingBottom: `${config.container.paddingBottom}px`,
        paddingLeft: isFullWidthEdgeToEdge ? '0px' : `${config.container.paddingLeft}px`,
        paddingRight: isFullWidthEdgeToEdge ? '0px' : `${config.container.paddingRight}px`,
        marginTop: `${config.container.marginTop}px`,
        marginBottom: `${config.container.marginBottom}px`,
        borderRadius: isFullWidthEdgeToEdge ? '0px' : `${config.container.borderRadius}px`,
      }}
    >
      {/* Scoped Custom CSS if provided */}
      {config.advancedCss && (
        <style dangerouslySetInnerHTML={{ __html: config.advancedCss }} />
      )}

      <div className={containerWidthClass}>
        {/* Slider viewport */}
        <div
          className="relative overflow-hidden group/slider isolate"
          style={{
            ...heightStyle,
            borderRadius: `${effectiveCornerRadius}px`,
            paddingLeft: peekPadding ? `${peekPadding}px` : undefined,
            paddingRight: peekPadding ? `${peekPadding}px` : undefined,
          }}
          onMouseDown={(e) => onDragStart(e.clientX)}
          onMouseMove={(e) => onDragMove(e.clientX)}
          onMouseUp={onDragEnd}
          onTouchStart={(e) => onDragStart(e.touches[0].clientX)}
          onTouchMove={(e) => onDragMove(e.touches[0].clientX)}
          onTouchEnd={onDragEnd}
        >
          {/* Autoplay Top Progress Bar (Scoped below sticky header with z-20 and pointer-events-none) */}
          {config.autoplay.showProgress === 'bar' && totalSlides > 1 && (
            <div className="absolute top-0 inset-x-0 z-20 h-1 bg-white/20 overflow-hidden pointer-events-none">
              <div
                className="h-full bg-[#DF0C88] transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Top Counter or Slide Badge */}
          {config.counter.enabled && totalSlides > 1 && (
            <div
              className={`absolute z-20 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white font-mono font-bold text-xs shadow-md border border-white/10 ${
                config.counter.position === 'top-left' ? 'top-4 left-4' :
                config.counter.position === 'bottom-left' ? 'bottom-4 left-4' :
                config.counter.position === 'bottom-right' ? 'bottom-4 right-4' :
                'top-4 right-4'
              }`}
            >
              {config.counter.format === 'padded'
                ? `${String(currentIndex + 1).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}`
                : `${currentIndex + 1} / ${totalSlides}`}
            </div>
          )}

          {/* Play/Pause Control Button */}
          {config.playPauseButton.enabled && config.autoplay.enabled && (
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              aria-label={isPaused ? 'Resume slider autoplay' : 'Pause slider autoplay'}
              className={`absolute z-20 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-[#DF0C88] text-white flex items-center justify-center transition-colors shadow-md backdrop-blur-sm cursor-pointer border border-white/15 ${
                config.playPauseButton.position === 'top-left' ? 'top-4 left-4' :
                config.playPauseButton.position === 'bottom-left' ? 'bottom-4 left-4' :
                config.playPauseButton.position === 'top-right' ? 'top-4 right-16' :
                'bottom-4 right-4'
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 ml-0.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Slides Track */}
          <div
            className={`w-full h-full flex transition-transform ${
              config.transitionEffect === 'slide' ? 'duration-500 ease-out' : 'duration-700'
            }`}
            style={{
              transform:
                config.transitionEffect === 'slide'
                  ? `translateX(calc(-${(currentIndex * (100 / slidesPerView))}% + ${dragOffset}px))`
                  : undefined,
              gap: `${spaceBetween}px`,
            }}
          >
            {activeSlides.map((slide, idx) => {
              const isActive = idx === currentIndex;
              const isFirstSlide = idx === 0;

              // Resolved images per device
              const desktopImg = normalizeImg(slide.images.desktop);
              const tabletImg = normalizeImg(slide.images.tablet) || desktopImg;
              const mobileImg = normalizeImg(slide.images.mobile) || tabletImg || desktopImg;

              // Focal point per device
              const focal =
                device === 'mobile' ? slide.focalPoints?.mobile || slide.focalPoints?.tablet || slide.focalPoints?.desktop :
                device === 'tablet' ? slide.focalPoints?.tablet || slide.focalPoints?.desktop :
                slide.focalPoints?.desktop;

              const focalStyle = focal ? `${focal.x}% ${focal.y}%` : '50% 50%';

              // Content Position 9-Grid classes
              const pos = resolveResponsive(slide.contentPosition, device, 'center-left');
              const gridClass =
                pos === 'top-left' ? 'items-start justify-start text-left' :
                pos === 'top-center' ? 'items-start justify-center text-center' :
                pos === 'top-right' ? 'items-start justify-end text-right' :
                pos === 'center-left' ? 'items-center justify-start text-left' :
                pos === 'center-center' ? 'items-center justify-center text-center' :
                pos === 'center-right' ? 'items-center justify-end text-right' :
                pos === 'bottom-left' ? 'items-end justify-start text-left' :
                pos === 'bottom-center' ? 'items-end justify-center text-center' :
                'items-end justify-end text-right';

              const textAlign = resolveResponsive(slide.textAlignment, device, 'left');
              const showText = resolveResponsive(slide.showTextOverlay, device, true);
              const maxWidth = resolveResponsive(slide.maxContentWidth, device, 640);

              // Slide overlay
              const overlayColor = slide.overlayColor || '#020617';
              const overlayOpacity = slide.overlayOpacity !== undefined ? slide.overlayOpacity : 0.35;
              const overlayGradient = slide.overlayGradient || 'left_fade';

              // Ken Burns active class
              const isKenBurns = config.kenBurns.enabled && isActive;

              // Inactive slide styling for carousels
              const slideScale = isActive ? 1 : config.slideStyle.inactiveScale;
              const slideOpacity = isActive ? 1 : config.slideStyle.inactiveOpacity;

              // Heading typography
              const headingSize = resolveResponsive(config.typography.headingSize, device, 42);
              const subheadingSize = resolveResponsive(config.typography.subheadingSize, device, 16);
              const descSize = resolveResponsive(config.typography.descriptionSize, device, 14);

              // Whole slide clickable link
              const slideLink = slide.slideLink?.enabled && slide.slideLink.url ? slide.slideLink : null;

              return (
                <div
                  key={slide.id || idx}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`Slide ${idx + 1} of ${totalSlides}: ${slide.title || 'Slide'}`}
                  aria-hidden={!isActive}
                  className={`relative shrink-0 h-full overflow-hidden transition-all duration-500 ${
                    config.transitionEffect !== 'slide' ? (isActive ? 'opacity-100 z-10' : 'opacity-0 absolute inset-0 pointer-events-none') : ''
                  } ${
                    config.slideStyle.hoverEffect === 'lift' ? 'hover:-translate-y-1' :
                    config.slideStyle.hoverEffect === 'scale' ? 'hover:scale-[1.01]' : ''
                  }`}
                  style={{
                    width: `calc(${100 / slidesPerView}% - ${(spaceBetween * (slidesPerView - 1)) / slidesPerView}px)`,
                    borderRadius: `${config.slideStyle.borderRadius}px`,
                    transform: config.transitionEffect === 'slide' ? `scale(${slideScale})` : undefined,
                    opacity: config.transitionEffect === 'slide' ? slideOpacity : undefined,
                    cursor: slideLink ? 'pointer' : 'default',
                  }}
                  onClick={() => {
                    if (slideLink) {
                      if (slideLink.openInNewTab || slideLink.url.startsWith('http')) {
                        window.open(slideLink.url, '_blank', 'noopener,noreferrer');
                      } else {
                        setCurrentPage(slideLink.url.replace(/^\//, '') as any || 'home');
                      }
                    }
                  }}
                >
                  {/* Background Media: Picture (Desktop, Tablet, Mobile) or Video */}
                  {slide.mediaType === 'video' && slide.videoUrl && !(device === 'mobile' && slide.showPosterOnMobile && slide.videoPoster) ? (
                    <video
                      src={slide.videoUrl}
                      poster={slide.videoPoster}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ objectPosition: focalStyle }}
                    />
                  ) : (
                    <picture className="absolute inset-0 w-full h-full block">
                      {/* Mobile Source */}
                      {slide.images.mobile && (
                        <source media="(max-width: 767px)" srcSet={mobileImg} />
                      )}
                      {/* Tablet Source */}
                      {slide.images.tablet && (
                        <source media="(max-width: 1023px)" srcSet={tabletImg} />
                      )}
                      {/* Desktop Image with Width/Height to Prevent Layout Shift */}
                      <img
                        src={desktopImg}
                        alt={slide.altText || slide.title || 'Slider image'}
                        width={1920}
                        height={1080}
                        loading={isFirstSlide ? 'eager' : 'lazy'}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (slide.images.desktop && target.src.includes('/images/') && !target.src.includes('/src/assets/images/')) {
                            target.src = slide.images.desktop;
                          }
                        }}
                        className={`w-full h-full object-${imageFit} transition-transform duration-1000 ${
                          isKenBurns ? 'scale-110' : 'scale-100'
                        }`}
                        style={{
                          objectPosition: focalStyle,
                          transitionDuration: isKenBurns ? `${config.kenBurns.duration}ms` : '700ms',
                        }}
                      />
                    </picture>
                  )}

                  {/* Slide Color & Gradient Overlay */}
                  {overlayOpacity > 0 && (
                    <div
                      className="absolute inset-0 transition-opacity duration-500 pointer-events-none"
                      style={{
                        backgroundColor: overlayColor,
                        opacity: overlayOpacity,
                      }}
                    />
                  )}

                  {overlayOpacity > 0 && overlayGradient !== 'none' && overlayGradient !== 'solid' && (
                    <div
                      className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                      style={{
                        background:
                          overlayGradient === 'vignette'
                            ? `radial-gradient(circle at center, transparent 35%, ${overlayColor}dd 100%)`
                            : overlayGradient === 'radial'
                            ? `radial-gradient(circle at 30% 50%, ${overlayColor}ee 0%, transparent 70%)`
                            : overlayGradient === 'right_fade'
                            ? `linear-gradient(to left, ${overlayColor} 0%, ${overlayColor}cc 40%, transparent 100%)`
                            : overlayGradient === 'bottom_fade'
                            ? `linear-gradient(to top, ${overlayColor} 0%, ${overlayColor}cc 50%, transparent 100%)`
                            : overlayGradient === 'top_fade'
                            ? `linear-gradient(to bottom, ${overlayColor} 0%, ${overlayColor}cc 50%, transparent 100%)`
                            : `linear-gradient(to right, ${overlayColor} 0%, ${overlayColor}ee 40%, ${overlayColor}88 70%, transparent 100%)`,
                      }}
                    />
                  )}

                  {/* Slide Content Overlay */}
                  {slide.showContent !== false && showText && Boolean(slide.title || slide.subtitle || slide.description || slide.badge || (slide.buttons && slide.buttons.length > 0)) && (
                    <div
                      className={`relative z-20 w-full h-full p-6 sm:p-10 lg:p-14 flex ${gridClass}`}
                      style={{
                        textAlign,
                      }}
                    >
                      <div
                        className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500"
                        style={{ maxWidth: `${maxWidth}px` }}
                      >
                        {/* Contextual Badge */}
                        {slide.badge && (
                          <div
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow-xs border border-white/20"
                            style={{
                              backgroundColor: slide.badgeBg || 'rgba(255, 255, 255, 0.15)',
                              color: slide.badgeColor || '#ffffff',
                            }}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{slide.badge}</span>
                          </div>
                        )}

                        {/* Title (Single H1 on First Slide If Enabled) */}
                        {slide.title && (
                          isFirstSlide && slide.useH1 ? (
                            <h1
                              className="font-black tracking-tight leading-[1.12] drop-shadow-sm transition-colors"
                              style={{
                                fontSize: `${headingSize}px`,
                                color: slide.titleColor || config.typography.headingColor,
                                fontWeight: config.typography.headingWeight,
                                textTransform: config.typography.headingTransform,
                                textShadow: config.typography.headingShadow ? '0 2px 10px rgba(0,0,0,0.5)' : undefined,
                              }}
                            >
                              {slide.title}
                            </h1>
                          ) : (
                            <h2
                              className="font-black tracking-tight leading-[1.12] drop-shadow-sm transition-colors"
                              style={{
                                fontSize: `${headingSize}px`,
                                color: slide.titleColor || config.typography.headingColor,
                                fontWeight: config.typography.headingWeight,
                                textTransform: config.typography.headingTransform,
                                textShadow: config.typography.headingShadow ? '0 2px 10px rgba(0,0,0,0.5)' : undefined,
                              }}
                            >
                              {slide.title}
                            </h2>
                          )
                        )}

                        {/* Subtitle */}
                        {slide.subtitle && (
                          <p
                            className="font-semibold transition-colors drop-shadow-xs"
                            style={{
                              fontSize: `${subheadingSize}px`,
                              color: slide.subtitleColor || config.typography.subheadingColor,
                            }}
                          >
                            {slide.subtitle}
                          </p>
                        )}

                        {/* Rich Description */}
                        {slide.description && (
                          <p
                            className="leading-relaxed drop-shadow-xs"
                            style={{
                              fontSize: `${descSize}px`,
                              color: slide.descriptionColor || config.typography.descriptionColor,
                            }}
                          >
                            {slide.description}
                          </p>
                        )}

                        {/* Action Buttons (Up to 2) with Interactive Hover Animations */}
                        {slide.buttons && slide.buttons.length > 0 && (
                          <div
                            className={`flex flex-wrap items-center gap-3 pt-2 ${
                              textAlign === 'center' ? 'justify-center' : textAlign === 'right' ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            {slide.buttons.map((btn, bIdx) => {
                              const isPrimary = btn.style === 'primary' || bIdx === 0;
                              return (
                                <button
                                  key={btn.id || bIdx}
                                  type="button"
                                  onClick={(e) => handleCtaClick(e, btn.link, btn.openInNewTab)}
                                  className="group relative inline-flex items-center gap-2 font-bold transition-all duration-300 hover:scale-105 active:scale-95 shadow-md hover:shadow-xl cursor-pointer"
                                  style={{
                                    backgroundColor:
                                      btn.customBg ||
                                      (isPrimary ? config.buttonsStyle.primaryBg : config.buttonsStyle.secondaryBg),
                                    color:
                                      btn.customColor ||
                                      (isPrimary ? config.buttonsStyle.primaryColor : config.buttonsStyle.secondaryColor),
                                    borderRadius: `${isPrimary ? config.buttonsStyle.primaryRadius : config.buttonsStyle.secondaryRadius}px`,
                                    padding: `${config.buttonsStyle.paddingY}px ${config.buttonsStyle.paddingX}px`,
                                    border: isPrimary ? config.buttonsStyle.primaryBorder : config.buttonsStyle.secondaryBorder,
                                    fontSize: '13px',
                                  }}
                                >
                                  {btn.iconPosition === 'before' && renderIcon(btn.icon, 'w-4 h-4 transition-transform group-hover:scale-110')}
                                  <span>{btn.text}</span>
                                  {(!btn.iconPosition || btn.iconPosition === 'after') && renderIcon(btn.icon, 'w-4 h-4 transition-transform group-hover:translate-x-1')}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Navigation Arrows */}
          {showArrows && totalSlides > slidesPerView && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous Slide"
                className={`group absolute left-3 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-90 cursor-pointer shadow-xl ${
                  config.arrows.showOnHoverOnly ? 'opacity-0 group-hover/slider:opacity-100' : 'opacity-100'
                }`}
                style={{
                  width: `${config.arrows.size}px`,
                  height: `${config.arrows.size}px`,
                  backgroundColor: config.arrows.bgColor,
                  color: config.arrows.color,
                  borderRadius: `${config.arrows.borderRadius}px`,
                  border: `1px solid ${config.arrows.borderColor}`,
                  left: `${config.arrows.offsetX}px`,
                }}
              >
                <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next Slide"
                className={`group absolute right-3 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-90 cursor-pointer shadow-xl ${
                  config.arrows.showOnHoverOnly ? 'opacity-0 group-hover/slider:opacity-100' : 'opacity-100'
                }`}
                style={{
                  width: `${config.arrows.size}px`,
                  height: `${config.arrows.size}px`,
                  backgroundColor: config.arrows.bgColor,
                  color: config.arrows.color,
                  borderRadius: `${config.arrows.borderRadius}px`,
                  border: `1px solid ${config.arrows.borderColor}`,
                  right: `${config.arrows.offsetX}px`,
                }}
              >
                <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </>
          )}

          {/* Pagination Controls */}
          {config.pagination.type !== 'none' && totalSlides > 1 && (
            <div
              className={`absolute z-30 flex items-center gap-2 ${
                config.pagination.position === 'top' ? 'top-4 inset-x-0 justify-center' :
                config.pagination.position === 'left' ? 'left-4 inset-y-0 flex-col justify-center' :
                config.pagination.position === 'right' ? 'right-4 inset-y-0 flex-col justify-center' :
                'bottom-4 inset-x-0 justify-center'
              }`}
            >
              {config.pagination.type === 'bullets' || config.pagination.type === 'dynamic_bullets' ? (
                activeSlides.map((_, dotIdx) => {
                  const isActive = dotIdx === currentIndex;
                  return (
                    <button
                      key={dotIdx}
                      type="button"
                      aria-label={`Go to slide ${dotIdx + 1}`}
                      onClick={() => goToSlide(dotIdx)}
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        width: isActive && config.pagination.shape === 'pill' ? '28px' : `${config.pagination.size}px`,
                        height: `${config.pagination.size}px`,
                        backgroundColor: isActive ? config.pagination.activeColor : config.pagination.color,
                        borderRadius:
                          config.pagination.shape === 'square' ? '2px' :
                          config.pagination.shape === 'line' ? '2px' : '9999px',
                      }}
                    />
                  );
                })
              ) : config.pagination.type === 'numbers' ? (
                <div className="flex items-center gap-1 bg-slate-900/70 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-mono">
                  {activeSlides.map((_, nIdx) => (
                    <button
                      key={nIdx}
                      type="button"
                      onClick={() => goToSlide(nIdx)}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${
                        nIdx === currentIndex ? 'bg-[#DF0C88] text-white font-bold' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {nIdx + 1}
                    </button>
                  ))}
                </div>
              ) : config.pagination.type === 'fraction' ? (
                <div className="bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white font-mono text-xs font-bold shadow-md">
                  {currentIndex + 1} / {totalSlides}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Thumbnail Strip (Desktop only or when enabled) */}
        {config.thumbnails.enabled && totalSlides > 1 && (
          <div className="mt-3 flex items-center justify-center gap-2 overflow-x-auto py-2">
            {activeSlides.map((thumbSlide, tIdx) => {
              const isThumbActive = tIdx === currentIndex;
              return (
                <button
                  key={thumbSlide.id || tIdx}
                  type="button"
                  onClick={() => goToSlide(tIdx)}
                  aria-label={`Select slide ${tIdx + 1}`}
                  className={`relative rounded-xl overflow-hidden shrink-0 border-2 transition-all duration-200 cursor-pointer ${
                    isThumbActive ? 'scale-105 shadow-md' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    width: `${config.thumbnails.size}px`,
                    height: `${config.thumbnails.size * 0.65}px`,
                    borderColor: isThumbActive ? config.thumbnails.activeBorderColor : 'transparent',
                  }}
                >
                  <img
                    src={thumbSlide.images.desktop}
                    alt={thumbSlide.altText || ''}
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
