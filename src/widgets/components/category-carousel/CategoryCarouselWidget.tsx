import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../../context/AppContext';
import {
  CategoryCarouselConfig,
  CategoryCarouselItem,
  DEFAULT_CATEGORY_CAROUSEL_CONFIG,
  SEED_CATEGORIES,
  DeviceMode,
  resolveResponsive,
} from './categoryCarouselTypes';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

// Swiper React & Modules
import { Swiper, SwiperSlide } from 'swiper/react';
import {
  Navigation,
  Pagination,
  Autoplay,
  FreeMode,
  Keyboard,
  Mousewheel,
  A11y,
} from 'swiper/modules';

// Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/free-mode';

interface CategoryCarouselWidgetProps {
  settings?: Partial<CategoryCarouselConfig>;
  config?: Partial<CategoryCarouselConfig>;
  commonSettings?: any;
  isPreview?: boolean;
  isEditorPreview?: boolean;
}

export const CategoryCarouselWidget: React.FC<CategoryCarouselWidgetProps> = ({
  settings,
  config: configProp,
  commonSettings = {},
  isPreview = false,
}) => {
  const { categories = [], navigateToCategory, setCurrentPage } = useApp();

  const activeSettings = configProp || settings || {};

  // Merge incoming settings with defaults
  const config: CategoryCarouselConfig = useMemo(() => {
    return {
      ...DEFAULT_CATEGORY_CAROUSEL_CONFIG,
      ...activeSettings,
      slidesPerView: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.slidesPerView,
        ...(activeSettings.slidesPerView || {}),
      },
      slidesToScroll: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.slidesToScroll,
        ...(activeSettings.slidesToScroll || {}),
      },
      spaceBetween: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.spaceBetween,
        ...(activeSettings.spaceBetween || {}),
      },
      layoutType: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.layoutType,
        ...(activeSettings.layoutType || {}),
      },
      gridColumns: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.gridColumns,
        ...(activeSettings.gridColumns || {}),
      },
      sectionPaddingTop: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.sectionPaddingTop,
        ...(activeSettings.sectionPaddingTop || {}),
      },
      sectionPaddingBottom: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.sectionPaddingBottom,
        ...(activeSettings.sectionPaddingBottom || {}),
      },
      showArrowsResponsive: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.showArrowsResponsive,
        ...(activeSettings.showArrowsResponsive || {}),
      },
      showDotsResponsive: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.showDotsResponsive,
        ...(activeSettings.showDotsResponsive || {}),
      },
      visibilityResponsive: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.visibilityResponsive,
        ...(activeSettings.visibilityResponsive || {}),
      },
      imageWidth: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.imageWidth,
        ...(activeSettings.imageWidth || {}),
      },
      imageHeight: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.imageHeight,
        ...(activeSettings.imageHeight || {}),
      },
      titleSize: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.titleSize,
        ...(activeSettings.titleSize || {}),
      },
      actionButtonSize: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.actionButtonSize,
        ...(activeSettings.actionButtonSize || {}),
      },
      headingSize: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.headingSize,
        ...(activeSettings.headingSize || {}),
      },
    };
  }, [activeSettings]);

  // Window Resize & Active Device detection (Desktop 8-col >= 1280px, Medium 4x2 >= 640px, Mobile < 640px)
  const [device, setDevice] = useState<DeviceMode>('desktop');
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setDevice('mobile');
      } else if (width < 1280) {
        setDevice('tablet');
      } else {
        setDevice('desktop');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mq.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, []);

  // Swiper ref & autoplay state
  const [isPlaying] = useState<boolean>(config.autoplay && !prefersReducedMotion);
  const swiperRef = useRef<any>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(true);

  useEffect(() => {
    if (!config.pauseOffscreen || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [config.pauseOffscreen]);

  // Build and resolve items from chosen content source
  const resolvedItems = useMemo<CategoryCarouselItem[]>(() => {
    let items: CategoryCarouselItem[] = [];

    const catMap = new Map<number, any>();
    if (Array.isArray(categories)) {
      categories.forEach((c) => catMap.set(Number(c.id), c));
    }

    if (config.sourceType === 'catalogue_multi') {
      const selectedIds = config.selectedCategoryIds || [];
      if (selectedIds.length > 0) {
        selectedIds.forEach((id) => {
          const cat = catMap.get(id);
          const seedMatch = SEED_CATEGORIES.find((s) => s.categoryId === id || s.slug === cat?.slug);
          const customMatch = config.customItems?.find(
            (c) => c.categoryId === id || c.id === `cat_${id}` || (seedMatch && c.title?.toLowerCase() === seedMatch.title?.toLowerCase())
          );
          if (cat || seedMatch || customMatch) {
            items.push({
              id: customMatch?.id || `cat_${id}`,
              categoryId: id,
              slug: customMatch?.slug || cat?.slug || seedMatch?.slug || '',
              title: customMatch?.title || seedMatch?.title || cat?.name || 'Category',
              image: customMatch?.image || seedMatch?.image || cat?.image || '/images/categories/cat_mobile-phone.png',
              link: customMatch?.link || seedMatch?.link || (cat ? `/product-category/${cat.slug}/` : '/shop'),
              buttonText: customMatch?.buttonText || config.actionButtonText || 'Explore',
              productCount: cat?.count || seedMatch?.productCount || 0,
              altText: customMatch?.title || seedMatch?.altText || cat?.name || 'Category',
            });
          }
        });
      } else {
        items = [...SEED_CATEGORIES];
      }
    } else if (config.sourceType === 'all_top_level') {
      const excluded = new Set(config.excludeCategoryIds || []);
      const topLevel = categories.filter((c: any) => (!c.parent || c.parent === 0) && !excluded.has(c.id));
      if (topLevel.length > 0) {
        items = topLevel.map((cat: any) => {
          const seedMatch = SEED_CATEGORIES.find((s) => s.categoryId === cat.id || s.slug === cat.slug);
          return {
            id: `cat_${cat.id}`,
            categoryId: cat.id,
            slug: cat.slug,
            title: seedMatch?.title || cat.name,
            image: seedMatch?.image || cat.image || '/images/categories/cat_mobile-phone.png',
            link: seedMatch?.link || `/product-category/${cat.slug}/`,
            buttonText: config.actionButtonText || 'Explore',
            productCount: cat.count || 0,
            altText: seedMatch?.title || cat.name,
          };
        });
      } else {
        items = [...SEED_CATEGORIES];
      }
    } else if (config.sourceType === 'children_of_parent') {
      const parentId = config.parentCategoryId || 1375;
      const children = categories.filter((c: any) => Number(c.parent) === parentId);
      if (children.length > 0) {
        items = children.map((cat: any) => ({
          id: `cat_${cat.id}`,
          categoryId: cat.id,
          slug: cat.slug,
          title: cat.name,
          image: cat.image || '/images/categories/cat_mobile-phone.png',
          link: `/product-category/${cat.slug}/`,
          buttonText: config.actionButtonText || 'Explore',
          productCount: cat.count || 0,
          altText: cat.name,
        }));
      } else {
        items = [...SEED_CATEGORIES];
      }
    } else if (config.sourceType === 'custom_items') {
      items = config.customItems && config.customItems.length > 0 ? config.customItems : [...SEED_CATEGORIES];
    }

    // Apply per-item overrides
    items = items.map((item) => {
      const override = config.itemOverrides?.[item.id] || config.itemOverrides?.[item.slug || ''];
      if (!override) return item;
      return {
        ...item,
        ...override,
        title: override.title || item.title,
        image: override.image || item.image,
        link: override.link || item.link,
        buttonText: override.buttonText || item.buttonText,
      };
    });

    items = items.filter((item) => !item.hidden);

    if (config.hideEmptyCategories) {
      items = items.filter((item) => item.productCount === undefined || item.productCount > 0);
    }

    if (config.sortBy === 'alpha_asc') {
      items.sort((a, b) => a.title.localeCompare(b.title));
    } else if (config.sortBy === 'alpha_desc') {
      items.sort((a, b) => b.title.localeCompare(a.title));
    } else if (config.sortBy === 'count_desc') {
      items.sort((a, b) => (b.productCount || 0) - (a.productCount || 0));
    }

    if (config.maxItems && config.maxItems > 0) {
      items = items.slice(0, config.maxItems);
    }

    return items;
  }, [
    config.sourceType,
    config.selectedCategoryIds,
    config.excludeCategoryIds,
    config.parentCategoryId,
    config.customItems,
    config.itemOverrides,
    config.hideEmptyCategories,
    config.sortBy,
    config.maxItems,
    config.actionButtonText,
    categories,
  ]);

  const isVisibleOnDevice = resolveResponsive(config.visibilityResponsive, device, true);
  if (!isVisibleOnDevice && !isPreview) {
    return null;
  }

  const currentSlidesPerView = resolveResponsive(config.slidesPerView, device, 8);
  const currentSlidesToScroll = resolveResponsive(config.slidesToScroll, device, 1);
  const currentSpaceBetween = resolveResponsive(config.spaceBetween, device, 14);
  const currentLayoutType = resolveResponsive(config.layoutType, device, 'carousel');
  const currentGridCols = resolveResponsive(config.gridColumns, device, 8);
  const showArrows = resolveResponsive(config.showArrowsResponsive, device, true);
  const showDots = resolveResponsive(config.showDotsResponsive, device, false);

  const paddingTop = resolveResponsive(config.sectionPaddingTop, device, 24);
  const paddingBottom = resolveResponsive(config.sectionPaddingBottom, device, 28);

  const imgW = resolveResponsive(config.imageWidth, device, 74);
  const imgH = resolveResponsive(config.imageHeight, device, 72);
  const titleFSize = resolveResponsive(config.titleSize, device, 14);
  const btnFSize = resolveResponsive(config.actionButtonSize, device, 12);
  const headingFSize = resolveResponsive(config.headingSize, device, 26);

  // Use clean 4x2 balanced grid on tablet (640-1279px) & crisp 8-col row on desktop (>=1280px) when showing the 8-item showcase
  const useBalancedGridOnLarge =
    resolvedItems.length <= 8 && device !== 'mobile';

  const handleItemClick = (item: CategoryCarouselItem, e: React.MouseEvent) => {
    if (config.openInNewTab || item.link.startsWith('http')) {
      return;
    }
    if (item.link.startsWith('/product-category/')) {
      e.preventDefault();
      const cleanPath = item.link.replace(/^\/product-category\//, '').replace(/\/$/, '');
      if (typeof navigateToCategory === 'function') {
        navigateToCategory(cleanPath);
      } else {
        setCurrentPage('shop');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (item.link.startsWith('/')) {
      e.preventDefault();
      const slug = item.link.replace(/^\//, '').replace(/\/$/, '');
      setCurrentPage((slug || 'home') as any);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const widgetId = commonSettings?.anchorId || 'cat_carousel_main';
  const prevBtnClass = `cat-swiper-prev-${widgetId}`;
  const nextBtnClass = `cat-swiper-next-${widgetId}`;
  const paginationClass = `cat-swiper-pagination-${widgetId}`;

  const widthClass =
    config.containerWidth === 'boxed'
      ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
      : config.containerWidth === 'narrow'
        ? 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'
        : 'w-full px-4 sm:px-6';

  return (
    <section
      ref={sectionRef}
      id={commonSettings?.anchorId || undefined}
      aria-roledescription="carousel"
      aria-label={config.headingText || 'Shop by Category'}
      role="region"
      className={`relative w-full overflow-hidden select-none transition-all ${config.customCssClass || ''}`}
      style={{
        paddingTop: `${paddingTop}px`,
        paddingBottom: `${paddingBottom}px`,
        backgroundColor: config.sectionBgType === 'color' ? config.sectionBgColor : undefined,
        backgroundImage:
          config.sectionBgType === 'gradient'
            ? config.sectionBgGradient
            : config.sectionBgType === 'image' && config.sectionBgImage
              ? `url(${config.sectionBgImage})`
              : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {config.scopedCss && (
        <style dangerouslySetInnerHTML={{ __html: config.scopedCss }} />
      )}

      <div className={widthClass}>
        {config.showHeading && (
          <div
            className={`mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3 ${
              config.headingAlignment === 'center'
                ? 'text-center items-center justify-center'
                : config.headingAlignment === 'right'
                  ? 'text-right items-end'
                  : 'text-left items-start'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className="font-heading tracking-tight"
                  style={{
                    fontSize: `${headingFSize}px`,
                    fontWeight: config.headingWeight === 'bold' ? 700 : config.headingWeight === 'extrabold' ? 800 : 600,
                    color: config.headingColor,
                  }}
                >
                  {config.headingText}
                </h2>
                {config.showHeadingAccent && (
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: config.headingAccentColor }}
                    aria-hidden="true"
                  />
                )}
              </div>
              {config.subtitleText && (
                <p
                  className="text-xs sm:text-sm mt-1"
                  style={{ color: config.subtitleColor }}
                >
                  {config.subtitleText}
                </p>
              )}
            </div>

            {config.showViewAll && (
              <a
                href={config.viewAllLink}
                className="text-xs font-bold text-[#E6007E] hover:text-[#C4006B] flex items-center gap-1 group transition-colors"
                onClick={(e) => {
                  if (config.viewAllLink.startsWith('/')) {
                    e.preventDefault();
                    setCurrentPage(config.viewAllLink.replace(/^\//, '') as any);
                  }
                }}
              >
                <span>{config.viewAllText}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </a>
            )}
          </div>
        )}

        {/* Responsive Grid on Desktop/Medium (no squishing) or Smooth Carousel on Mobile/Multi-page */}
        {currentLayoutType === 'grid' || useBalancedGridOnLarge ? (
          <div
            className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3.5"
            style={
              currentLayoutType === 'grid' && currentGridCols !== 8
                ? {
                    gridTemplateColumns: `repeat(${currentGridCols}, minmax(0, 1fr))`,
                  }
                : undefined
            }
          >
            {resolvedItems.map((item, idx) => (
              <CategoryCard
                key={item.id}
                item={item}
                config={config}
                imgW={imgW}
                imgH={imgH}
                titleFSize={titleFSize}
                btnFSize={btnFSize}
                onClick={(e) => handleItemClick(item, e)}
                index={idx}
              />
            ))}
          </div>
        ) : (
          <div className="relative group/carousel">
            <Swiper
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
              }}
              modules={[Navigation, Pagination, Autoplay, FreeMode, Keyboard, Mousewheel, A11y]}
              slidesPerView={currentSlidesPerView}
              slidesPerGroup={currentSlidesToScroll}
              spaceBetween={currentSpaceBetween}
              loop={config.loop}
              rewind={config.rewind}
              freeMode={config.freeScroll}
              centeredSlides={config.centeredSlides}
              initialSlide={config.initialSlide}
              grabCursor={config.grabCursor}
              keyboard={config.keyboardNav ? { enabled: true } : false}
              mousewheel={config.mousewheelScroll ? { forceToAxis: true } : false}
              autoplay={
                config.autoplay && !prefersReducedMotion && isIntersecting && isPlaying
                  ? {
                      delay: config.autoplayDelay || 4500,
                      pauseOnMouseEnter: config.pauseOnHover,
                      stopOnLastSlide: !config.loop,
                      disableOnInteraction: config.stopOnInteraction,
                    }
                  : false
              }
              speed={config.autoplaySpeed || 600}
              navigation={
                showArrows
                  ? {
                      prevEl: `.${prevBtnClass}`,
                      nextEl: `.${nextBtnClass}`,
                    }
                  : false
              }
              pagination={
                showDots && config.paginationType !== 'none'
                  ? {
                      el: `.${paginationClass}`,
                      clickable: true,
                      dynamicBullets: config.paginationType === 'dynamic_dots',
                      type: config.paginationType === 'fraction' ? 'fraction' : 'bullets',
                    }
                  : false
              }
              className="w-full !overflow-visible"
            >
              {resolvedItems.map((item, idx) => (
                <SwiperSlide key={item.id} className="!h-auto flex">
                  <CategoryCard
                    item={item}
                    config={config}
                    imgW={imgW}
                    imgH={imgH}
                    titleFSize={titleFSize}
                    btnFSize={btnFSize}
                    onClick={(e) => handleItemClick(item, e)}
                    index={idx}
                  />
                </SwiperSlide>
              ))}
            </Swiper>

            {showArrows && resolvedItems.length > currentSlidesPerView && (
              <>
                <button
                  type="button"
                  aria-label="Previous categories"
                  className={`${prevBtnClass} absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 sm:-translate-x-4 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white text-slate-800 hover:text-white hover:bg-[#E6007E] shadow-md border border-slate-200/80 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-0 disabled:pointer-events-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[#E6007E]`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next categories"
                  className={`${nextBtnClass} absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 sm:translate-x-4 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white text-slate-800 hover:text-white hover:bg-[#E6007E] shadow-md border border-slate-200/80 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-0 disabled:pointer-events-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[#E6007E]`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {showDots && config.paginationType !== 'none' && (
              <div className={`${paginationClass} flex items-center justify-center gap-1.5 mt-5`} />
            )}
          </div>
        )}
      </div>
    </section>
  );
};

// ----------------------------------------------------------------------
// Individual Category Card Component (Modern Clean Light Card + Motion)
// ----------------------------------------------------------------------
interface CategoryCardProps {
  item: CategoryCarouselItem;
  config: CategoryCarouselConfig;
  imgW: number;
  imgH: number;
  titleFSize: number;
  btnFSize: number;
  onClick: (e: React.MouseEvent) => void;
  index: number;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  item,
  config,
  imgW,
  imgH,
  titleFSize,
  btnFSize,
  onClick,
  index,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const borderRadius = `${Math.max(config.cardBorderRadius || 16, 12)}px`;
  const actionLabel = item.buttonText || config.actionButtonText || 'Explore';

  return (
    <motion.a
      href={item.link}
      target={config.openInNewTab ? '_blank' : undefined}
      rel={config.openInNewTab ? 'noopener noreferrer' : undefined}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      whileHover={{
        y: -4,
        transition: { type: 'spring', stiffness: 360, damping: 24 },
      }}
      transition={{ duration: 0.36, delay: Math.min(index * 0.045, 0.35), ease: [0.22, 1, 0.36, 1] }}
      aria-label={`${item.title}, ${item.productCount ? item.productCount + ' items' : ''}`}
      className="group relative flex flex-col justify-between items-center w-full rounded-2xl border transition-shadow duration-300 outline-none focus-visible:ring-2 focus-visible:ring-[#E6007E]"
      style={{
        backgroundColor: isHovered
          ? config.cardBgHoverColor || '#FFFFFF'
          : config.cardBgColor || '#FFFFFF',
        borderRadius,
        borderWidth: `${Math.max(config.cardBorderWidth ?? 1, 1)}px`,
        borderStyle: 'solid',
        borderColor: isHovered
          ? 'rgba(230, 0, 126, 0.4)'
          : config.cardBorderColor && config.cardBorderColor !== 'transparent'
            ? config.cardBorderColor
            : 'rgba(226, 232, 240, 0.85)',
        boxShadow: isHovered
          ? '0 14px 30px -12px rgba(11, 13, 18, 0.12)'
          : '0 2px 6px -2px rgba(11, 13, 18, 0.04)',
        padding: `${Math.max(config.cardPadding || 20, 18)}px 12px`,
        minHeight: `${Math.max(config.cardMinHeight || 180, 174)}px`,
      }}
    >
      {/* Optional Badge */}
      {item.badgeText && (
        <span
          className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10 shadow-xs"
          style={{
            backgroundColor: item.badgeBg || config.defaultBadgeBg,
            color: item.badgeColor || config.defaultBadgeColor,
          }}
        >
          {item.badgeText}
        </span>
      )}

      {/* Centered Device/Accessory Visual with Float Hover */}
      <motion.div
        animate={isHovered ? { y: -4, scale: 1.06 } : { y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 340, damping: 22 }}
        className="flex items-center justify-center w-full will-change-transform"
        style={{ height: `${imgH}px` }}
      >
        {config.imageHolderEnabled ? (
          <div
            className={`flex items-center justify-center p-2 transition-colors ${
              config.imageHolderShape === 'circle'
                ? 'rounded-full'
                : config.imageHolderShape === 'rounded'
                  ? 'rounded-xl'
                  : 'rounded-none'
            }`}
            style={{
              width: `${imgW + 16}px`,
              height: `${imgH + 16}px`,
              backgroundColor: config.imageHolderBg,
              border: `1px solid ${config.imageHolderBorderColor}`,
            }}
          >
            <img
              src={item.image}
              alt={item.altText || item.title}
              loading={config.lazyLoading ? 'lazy' : 'eager'}
              className="max-w-full max-h-full object-contain"
              style={{ borderRadius: `${config.imageRadius}px` }}
              onError={(e) => {
                e.currentTarget.src = '/images/categories/cat_mobile-phone.png';
              }}
            />
          </div>
        ) : (
          <img
            src={item.image}
            alt={item.altText || item.title}
            loading={config.lazyLoading ? 'lazy' : 'eager'}
            className="max-w-full max-h-full object-contain"
            style={{
              width: `${imgW}px`,
              height: `${imgH}px`,
              objectFit: config.imageFit,
              borderRadius: `${config.imageRadius}px`,
            }}
            onError={(e) => {
              e.currentTarget.src = '/images/categories/cat_mobile-phone.png';
            }}
          />
        )}
      </motion.div>

      {/* Concise Title + Explore → Action Sub-Label */}
      <div className="flex flex-col items-center text-center mt-3.5 w-full">
        <h3
          className="font-heading truncate w-full tracking-tight font-semibold text-slate-900 transition-colors"
          style={{
            fontSize: `${titleFSize}px`,
            color: isHovered ? config.titleHoverColor || '#0B0D12' : config.titleColor || '#0B0D12',
            textTransform: config.titleTransform,
          }}
          title={item.title}
        >
          {item.title}
        </h3>

        {config.showProductCount && item.productCount !== undefined && (
          <span
            className="text-[11px] font-medium mt-0.5"
            style={{ color: config.countColor }}
          >
            {config.productCountFormat.replace('{count}', String(item.productCount))}
          </span>
        )}

        {config.showActionButton && (
          <span
            className="mt-1.5 inline-flex items-center gap-1 font-semibold transition-colors duration-200"
            style={{
              fontSize: `${btnFSize}px`,
              color: isHovered ? '#E6007E' : config.actionButtonColor || '#64748b',
            }}
          >
            <span>{actionLabel}</span>
            <motion.span
              animate={{ x: isHovered ? 3 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
              className="inline-flex"
            >
              <ArrowRight className="w-3 h-3" />
            </motion.span>
          </span>
        )}
      </div>
    </motion.a>
  );
};

export default CategoryCarouselWidget;
