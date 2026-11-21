import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { WidgetRenderProps } from '../../types';
import { useApp } from '../../../context/AppContext';
import { TABBED_DEVICES_CAROUSEL_DEFAULTS, Home2TabbedDeviceItem } from './home2Defaults';
import { Product } from '../../../types';

type TabKey = 'repairs' | 'buybacks' | 'refurbished';

const SLIDE_VARIANTS = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? 28 : -28,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? -24 : 24,
  }),
};

interface TiltDeviceCardProps {
  item: Home2TabbedDeviceItem & { _product?: Product };
  onCtaClick: (item: Home2TabbedDeviceItem & { _product?: Product }) => void;
}

const TiltDeviceCard: React.FC<TiltDeviceCardProps> = ({ item, onCtaClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [4, -4]), {
    stiffness: 260,
    damping: 24,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-4, 4]), {
    stiffness: 260,
    damping: 24,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(xPct);
    mouseY.set(yPct);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div style={{ perspective: 900 }} className="h-full">
      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 hover:border-[#E6007E]/45 p-5 shadow-2xs hover:shadow-[0_20px_42px_-16px_rgba(11,13,18,0.16)] transition-shadow duration-300 flex flex-col justify-between h-full"
      >
        <div>
          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#E6007E]">
            {item.kicker}
          </span>
          <h3 className="text-base font-extrabold text-[#0B0D12] mt-1 line-clamp-1">
            {item.title}
          </h3>

          {/* Clean Pure-White Studio Cutout Area with Floating Image Lift */}
          <div className="my-5 h-44 rounded-xl bg-white flex items-center justify-center overflow-visible p-2">
            <motion.img
              src={item.image}
              alt={item.title}
              loading="lazy"
              animate={
                isHovered
                  ? {
                      y: -8,
                      scale: 1.07,
                      filter: 'drop-shadow(0 16px 20px rgba(11,13,18,0.15))',
                    }
                  : {
                      y: 0,
                      scale: 1,
                      filter: 'drop-shadow(0 4px 8px rgba(11,13,18,0.04))',
                    }
              }
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              className="max-h-full max-w-full object-contain will-change-transform"
            />
          </div>
        </div>

        {/* Price & Left-to-Right Fill CTA Footer */}
        <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <span className="block text-[11px] text-slate-500">
              {item.priceLabel}
            </span>
            <span className="text-lg font-black text-[#0B0D12] tabular-nums">
              {item.priceValue}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onCtaClick(item)}
            className="relative overflow-hidden px-3.5 py-2 rounded-xl border border-slate-200 group-hover:border-[#0B0D12] bg-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-250"
          >
            <span
              className="absolute inset-0 bg-[#0B0D12] origin-left transition-transform duration-300 ease-out"
              style={{ transform: isHovered ? 'scaleX(1)' : 'scaleX(0)' }}
            />
            <span
              className={`relative z-10 transition-colors duration-200 ${
                isHovered ? 'text-white' : 'text-[#0B0D12]'
              }`}
            >
              {item.ctaLabel || 'View'}
            </span>
          </button>
        </div>

        {/* Center-Expanding Magenta Bottom Accent Bar */}
        <motion.div
          aria-hidden="true"
          animate={{ scaleX: isHovered ? 1 : 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] bg-[#E6007E] origin-center"
        />
      </motion.div>
    </div>
  );
};

export const TabbedDevicesCarouselWidget: React.FC<WidgetRenderProps> = ({ settings = {} }) => {
  const { products, viewProductDetail, setCurrentPage, startRepairBooking } = useApp();

  const title = settings.title ?? TABBED_DEVICES_CAROUSEL_DEFAULTS.title;
  const subtitle = settings.subtitle ?? TABBED_DEVICES_CAROUSEL_DEFAULTS.subtitle;

  const enableRepairsTab = settings.enableRepairsTab !== false;
  const enableBuybacksTab = settings.enableBuybacksTab !== false;
  const enableRefurbishedTab = settings.enableRefurbishedTab !== false;

  const repairsTabLabel = settings.repairsTabLabel || TABBED_DEVICES_CAROUSEL_DEFAULTS.repairsTabLabel;
  const buybacksTabLabel = settings.buybacksTabLabel || TABBED_DEVICES_CAROUSEL_DEFAULTS.buybacksTabLabel;
  const refurbishedTabLabel =
    settings.refurbishedTabLabel || TABBED_DEVICES_CAROUSEL_DEFAULTS.refurbishedTabLabel;

  const autoPullFromDb = settings.autoPullFromDb !== false;
  const itemsLimit = Math.max(4, Number(settings.itemsLimit) || 8);

  const availableTabs = useMemo(() => {
    const list: Array<{ key: TabKey; label: string }> = [];
    if (enableRepairsTab) list.push({ key: 'repairs', label: repairsTabLabel });
    if (enableBuybacksTab) list.push({ key: 'buybacks', label: buybacksTabLabel });
    if (enableRefurbishedTab) list.push({ key: 'refurbished', label: refurbishedTabLabel });
    return list.length > 0 ? list : [{ key: 'repairs' as TabKey, label: repairsTabLabel }];
  }, [
    enableRepairsTab,
    enableBuybacksTab,
    enableRefurbishedTab,
    repairsTabLabel,
    buybacksTabLabel,
    refurbishedTabLabel,
  ]);

  const [activeTab, setActiveTab] = useState<TabKey>(availableTabs[0].key);
  const [pageIdx, setPageIdx] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (!availableTabs.some((t) => t.key === activeTab)) {
      setActiveTab(availableTabs[0].key);
    }
  }, [availableTabs, activeTab]);

  const customItems: Home2TabbedDeviceItem[] =
    Array.isArray(settings.customItems) && settings.customItems.length > 0
      ? settings.customItems
      : TABBED_DEVICES_CAROUSEL_DEFAULTS.customItems;

  const dbRefurbishedItems = useMemo(() => {
    if (!autoPullFromDb || !products || products.length === 0) return [];
    const fallbackImages = [
      '/images/home2/iphone_studio.jpg',
      '/images/home2/galaxy_studio.jpg',
      '/images/home2/macbook_studio.jpg',
      '/images/home2/pixel_studio.jpg',
    ];
    return products
      .filter((p) => p.inStock && p.price > 80)
      .slice(0, itemsLimit)
      .map((p, idx) => ({
        tab: 'refurbished' as const,
        kicker: (p.condition || 'GRADE-A PRISTINE').toUpperCase(),
        title: p.title,
        image: p.image || fallbackImages[idx % fallbackImages.length],
        priceLabel: 'Price from',
        priceValue: `£${Math.round(p.price)}`,
        ctaLabel: 'Shop Device',
        link: `/shop`,
        brand: p.brand,
        _product: p,
      }));
  }, [autoPullFromDb, products, itemsLimit]);

  const activeItems = useMemo(() => {
    if (activeTab === 'refurbished' && autoPullFromDb && dbRefurbishedItems.length >= 4) {
      return dbRefurbishedItems.slice(0, itemsLimit);
    }
    const matching = customItems.filter((item) => item.tab === activeTab);
    return (matching.length > 0 ? matching : customItems).slice(0, itemsLimit);
  }, [activeTab, autoPullFromDb, dbRefurbishedItems, customItems, itemsLimit]);

  const perPage = 4;
  const totalPages = Math.max(1, Math.ceil(activeItems.length / perPage));
  const clampedPage = Math.min(pageIdx, totalPages - 1);

  const visibleItems = useMemo(() => {
    const start = clampedPage * perPage;
    return activeItems.slice(start, start + perPage);
  }, [activeItems, clampedPage]);

  const handleTabSwitch = (nextTab: TabKey) => {
    const currentIndex = availableTabs.findIndex((t) => t.key === activeTab);
    const nextIndex = availableTabs.findIndex((t) => t.key === nextTab);
    setDirection(nextIndex >= currentIndex ? 1 : -1);
    setActiveTab(nextTab);
    setPageIdx(0);
  };

  const handlePrevPage = () => {
    setDirection(-1);
    setPageIdx((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const handleNextPage = () => {
    setDirection(1);
    setPageIdx((prev) => (prev + 1) % totalPages);
  };

  const handleCardCta = (item: Home2TabbedDeviceItem & { _product?: Product }) => {
    if (item._product) {
      viewProductDetail(item._product);
      return;
    }
    if (item.tab === 'repairs') {
      startRepairBooking({
        brand: item.brand || 'apple',
        model: item.modelSlug || 'iphone-15-pro',
      });
      return;
    }
    const clean = (item.link || '/shop').replace(/^\/+|\/+$/g, '');
    setCurrentPage((clean || 'shop') as any);
  };

  return (
    <section className="bg-white py-14 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Bar with Animated Segmented Tabs + Arrows */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8"
        >
          <div>
            <h2
              className="text-2xl sm:text-3xl font-black text-[#0B0D12] tracking-tight font-heading"
              style={{ textWrap: 'balance' }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Shared Layout Animated Tab Switcher */}
            <div className="relative inline-flex items-center bg-slate-100/90 border border-slate-200/80 rounded-xl p-1 gap-1">
              {availableTabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleTabSwitch(tab.key)}
                    className={`relative px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive ? 'text-[#0B0D12]' : 'text-slate-600 hover:text-[#0B0D12]'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="trendingActiveTab"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        className="absolute inset-0 bg-white rounded-lg shadow-2xs border border-slate-200/60"
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Carousel Controls */}
            <div className="flex items-center gap-1.5">
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                aria-label="Previous devices"
                onClick={handlePrevPage}
                className="w-9 h-9 rounded-full bg-white border border-slate-200 hover:border-[#E6007E] text-slate-700 hover:text-[#E6007E] flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                aria-label="Next devices"
                onClick={handleNextPage}
                className="w-9 h-9 rounded-full bg-white border border-slate-200 hover:border-[#E6007E] text-slate-700 hover:text-[#E6007E] flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* 4-Column Responsive Animated Track */}
        <div className="overflow-hidden -mx-2 px-2 py-2">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`${activeTab}-${clampedPage}`}
              custom={direction}
              variants={SLIDE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            >
              {visibleItems.map((item: Home2TabbedDeviceItem & { _product?: Product }, idx: number) => (
                <TiltDeviceCard
                  key={`${item.title}-${idx}`}
                  item={item}
                  onCtaClick={handleCardCta}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default TabbedDevicesCarouselWidget;
