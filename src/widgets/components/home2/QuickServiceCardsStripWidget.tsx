import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { WidgetRenderProps } from '../../types';
import { useApp } from '../../../context/AppContext';
import {
  QUICK_SERVICE_CARDS_STRIP_DEFAULTS,
  Home2ServiceCard,
  Home2BrandPill,
} from './home2Defaults';
import { renderHome2Icon } from './home2Icons';
import { SpotlightCard } from './SpotlightCard';

export const QuickServiceCardsStripWidget: React.FC<WidgetRenderProps> = ({ settings = {} }) => {
  const { setCurrentPage, setShopBrandFilter, startRepairBooking } = useApp();

  const cards: Home2ServiceCard[] =
    Array.isArray(settings.cards) && settings.cards.length > 0
      ? settings.cards
      : QUICK_SERVICE_CARDS_STRIP_DEFAULTS.cards;

  const showBrandStrip = settings.showBrandStrip !== false;
  const brandStripLabel =
    settings.brandStripLabel ?? QUICK_SERVICE_CARDS_STRIP_DEFAULTS.brandStripLabel;
  const syncBrandsFromDb = settings.syncBrandsFromDb !== false;

  const configuredBrands: Home2BrandPill[] =
    Array.isArray(settings.brands) && settings.brands.length > 0
      ? settings.brands
      : QUICK_SERVICE_CARDS_STRIP_DEFAULTS.brands;

  const [dbBrands, setDbBrands] = useState<Home2BrandPill[] | null>(null);
  const [hoveredCardIdx, setHoveredCardIdx] = useState<number | null>(null);
  const [hoveredBrandSlug, setHoveredBrandSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!syncBrandsFromDb || !showBrandStrip) return;
    let active = true;
    fetch('/api/catalogue/brands')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.brands || !Array.isArray(data.brands) || data.brands.length === 0) {
          return;
        }
        const normalized: Home2BrandPill[] = data.brands
          .filter((b: any) => b.name && b.slug)
          .slice(0, 7)
          .map((b: any) => ({
            label: b.name,
            slug: String(b.slug).toLowerCase(),
            link: `/shop`,
          }));
        if (normalized.length >= 3) {
          setDbBrands(normalized);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [syncBrandsFromDb, showBrandStrip]);

  const brandPills = syncBrandsFromDb && dbBrands ? dbBrands : configuredBrands;
  const activeBrandSlug = hoveredBrandSlug || brandPills[0]?.slug || '';

  const handleNavigate = (link: string) => {
    const clean = (link || '/shop').replace(/^\/+|\/+$/g, '');
    if (clean === 'book-repair' || clean === 'quote') {
      startRepairBooking();
      return;
    }
    if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank', 'noopener,noreferrer');
      return;
    }
    setCurrentPage((clean || 'home') as any);
  };

  const handleBrandClick = (brand: Home2BrandPill) => {
    setHoveredBrandSlug(brand.slug);
    setShopBrandFilter(brand.slug || brand.label.toLowerCase());
    if (brand.link && brand.link !== '/shop') {
      handleNavigate(brand.link);
    } else {
      setCurrentPage('shop');
    }
  };

  const getAccentClasses = (accent: string) => {
    if (accent === 'emerald') {
      return 'bg-[#ECFDF5] text-[#10B981] border-[#10B981]/20';
    }
    if (accent === 'slate') {
      return 'bg-slate-100 text-[#0B0D12] border-slate-200';
    }
    return 'bg-[#FDF2F8] text-[#E6007E] border-[#E6007E]/15';
  };

  return (
    <section className="bg-[#F8FAFC] py-8 sm:py-10 border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* 3-Column Horizontal Service Pathways with Spotlight + Spring Hover */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((card, idx) => {
            const isHovered = hoveredCardIdx === idx;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                whileHover={{
                  y: -5,
                  transition: { type: 'spring', stiffness: 350, damping: 25 },
                }}
                whileTap={{ scale: 0.99 }}
                transition={{ duration: 0.38, delay: idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
                onMouseEnter={() => setHoveredCardIdx(idx)}
                onMouseLeave={() => setHoveredCardIdx(null)}
              >
                <SpotlightCard
                  accentColor={card.accent === 'emerald' ? 'emerald' : 'pink'}
                  className="rounded-2xl border border-slate-200/90 hover:border-[#E6007E]/55 bg-white hover:bg-[#FDF2F8]/85 shadow-2xs hover:shadow-[0_18px_36px_-14px_rgba(230,0,126,0.22)] transition-colors duration-250"
                >
                  <button
                    type="button"
                    onClick={() => handleNavigate(card.link)}
                    className="group text-left w-full p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <motion.div
                        animate={isHovered ? { scale: 1.12, rotate: -4 } : { scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                        className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${getAccentClasses(
                          card.accent
                        )}`}
                      >
                        {renderHome2Icon(card.icon, 'w-5 h-5')}
                      </motion.div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[#0B0D12] group-hover:text-[#E6007E] transition-colors truncate">
                          {card.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {card.description}
                        </p>
                      </div>
                    </div>

                    <motion.span
                      animate={isHovered ? { x: 4, y: -2 } : { x: 0, y: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                      className="shrink-0"
                    >
                      <ArrowRight
                        className={`w-4 h-4 transition-colors ${
                          isHovered ? 'text-[#E6007E]' : 'text-slate-400'
                        }`}
                      />
                    </motion.span>
                  </button>
                </SpotlightCard>
              </motion.div>
            );
          })}
        </div>

        {/* Magnetic Brand Pills Strip with Shared-Layout Active Indicator */}
        {showBrandStrip && brandPills.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {brandStripLabel && (
              <span className="text-xs font-medium text-slate-500 mr-1">
                {brandStripLabel}
              </span>
            )}
            {brandPills.map((brand, idx) => {
              const isActivePill = activeBrandSlug === brand.slug;
              return (
                <motion.button
                  key={`${brand.slug}-${idx}`}
                  type="button"
                  initial={{ opacity: 0, scale: 0.92, y: 6 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.28, delay: Math.min(idx * 0.04, 0.35) }}
                  whileHover={{
                    scale: 1.06,
                    y: -2,
                    transition: { type: 'spring', stiffness: 420, damping: 22 },
                  }}
                  whileTap={{ scale: 0.96 }}
                  onMouseEnter={() => setHoveredBrandSlug(brand.slug)}
                  onClick={() => handleBrandClick(brand)}
                  className={`relative px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-2xs ${
                    isActivePill
                      ? 'border-[#E6007E] text-[#E6007E] bg-white'
                      : 'border-slate-200 text-[#0B0D12] bg-white hover:border-[#E6007E] hover:text-[#E6007E]'
                  }`}
                >
                  {isActivePill && (
                    <motion.span
                      layoutId="activeBrandPill"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 rounded-lg bg-[#FDF2F8]/80 border border-[#E6007E]/40 z-0"
                    />
                  )}
                  <span className="relative z-10">{brand.label}</span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default QuickServiceCardsStripWidget;
