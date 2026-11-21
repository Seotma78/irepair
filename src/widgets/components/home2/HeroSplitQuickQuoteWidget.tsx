import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Rotate3d, Wrench } from 'lucide-react';
import { WidgetRenderProps } from '../../types';
import { useApp } from '../../../context/AppContext';
import { DEVICE_BRANDS, DEVICE_MODELS } from '../../../data/mockData';
import { HERO_SPLIT_QUICK_QUOTE_DEFAULTS, Home2HeroTrustBadge } from './home2Defaults';
import { renderHome2Icon } from './home2Icons';
import { DeviceCategory } from '../../../types';
import type { QuoteServiceMode } from './Hero3DStage';

const Hero3DStage = lazy(() => import('./Hero3DStage'));

const QUICK_REPAIR_PRICES: Record<string, { screenPrice: number; batteryPrice: number; duration: string }> = {
  'iphone-15-pro-max': { screenPrice: 159, batteryPrice: 69, duration: '45 mins' },
  'iphone-15-pro': { screenPrice: 149, batteryPrice: 69, duration: '45 mins' },
  'iphone-15': { screenPrice: 129, batteryPrice: 65, duration: '40 mins' },
  'iphone-14-pro-max': { screenPrice: 139, batteryPrice: 59, duration: '45 mins' },
  'iphone-14-pro': { screenPrice: 129, batteryPrice: 59, duration: '45 mins' },
  'iphone-14': { screenPrice: 109, batteryPrice: 55, duration: '35 mins' },
  'iphone-13': { screenPrice: 89, batteryPrice: 49, duration: '30 mins' },
  'samsung-s24-ultra': { screenPrice: 169, batteryPrice: 69, duration: '45 mins' },
  'samsung-s24': { screenPrice: 139, batteryPrice: 59, duration: '45 mins' },
  'samsung-s23-ultra': { screenPrice: 159, batteryPrice: 59, duration: '45 mins' },
  'pixel-8-pro': { screenPrice: 135, batteryPrice: 59, duration: '45 mins' },
  'macbook-pro-14-m3': { screenPrice: 189, batteryPrice: 129, duration: 'Same day' },
  'apple-watch-s9': { screenPrice: 99, batteryPrice: 55, duration: '60 mins' },
};

const QUICK_BUYBACK_PRICES: Record<string, number> = {
  'iphone-15-pro-max': 690,
  'iphone-15-pro': 620,
  'iphone-15': 470,
  'iphone-14-pro-max': 510,
  'iphone-14-pro': 440,
  'iphone-14': 350,
  'iphone-13': 290,
  'samsung-s24-ultra': 650,
  'samsung-s24': 410,
  'samsung-s23-ultra': 450,
  'pixel-8-pro': 380,
  'macbook-pro-14-m3': 980,
  'apple-watch-s9': 230,
};

const HERO_EASE = [0.22, 1, 0.36, 1] as const;

export const HeroSplitQuickQuoteWidget: React.FC<WidgetRenderProps> = ({ settings = {} }) => {
  const { startRepairBooking, setCurrentPage } = useApp();

  const eyebrowText = settings.eyebrowText ?? HERO_SPLIT_QUICK_QUOTE_DEFAULTS.eyebrowText;
  const headline = settings.headline ?? HERO_SPLIT_QUICK_QUOTE_DEFAULTS.headline;
  const subheadline = settings.subheadline ?? HERO_SPLIT_QUICK_QUOTE_DEFAULTS.subheadline;
  const primaryBtnLabel = settings.primaryBtnLabel ?? HERO_SPLIT_QUICK_QUOTE_DEFAULTS.primaryBtnLabel;
  const primaryBtnUrl = settings.primaryBtnUrl ?? HERO_SPLIT_QUICK_QUOTE_DEFAULTS.primaryBtnUrl;
  const secondaryBtnLabel = settings.secondaryBtnLabel ?? HERO_SPLIT_QUICK_QUOTE_DEFAULTS.secondaryBtnLabel;
  const secondaryBtnUrl = settings.secondaryBtnUrl ?? HERO_SPLIT_QUICK_QUOTE_DEFAULTS.secondaryBtnUrl;
  const heroImage = settings.heroImage || HERO_SPLIT_QUICK_QUOTE_DEFAULTS.heroImage;
  const enable3DHero = settings.enable3DHero !== false;
  const livePricingBadge = settings.livePricingBadge ?? HERO_SPLIT_QUICK_QUOTE_DEFAULTS.livePricingBadge;
  const quoteMode: 'both' | 'repair' | 'buyback' =
    settings.quoteMode || HERO_SPLIT_QUICK_QUOTE_DEFAULTS.quoteMode;

  const trustBadges: Home2HeroTrustBadge[] =
    Array.isArray(settings.trustBadges) && settings.trustBadges.length > 0
      ? settings.trustBadges
      : HERO_SPLIT_QUICK_QUOTE_DEFAULTS.trustBadges;

  const [serviceType, setServiceType] = useState<QuoteServiceMode>(
    quoteMode === 'buyback' ? 'buyback' : 'screen'
  );

  useEffect(() => {
    if (quoteMode === 'repair' && serviceType === 'buyback') setServiceType('screen');
    if (quoteMode === 'buyback') setServiceType('buyback');
  }, [quoteMode, serviceType]);

  const selectableBrands = useMemo(
    () =>
      DEVICE_BRANDS.filter((b) =>
        ['apple', 'samsung', 'google', 'apple-tablet', 'apple-laptop', 'apple-watch'].includes(b.id)
      ),
    []
  );

  const [selectedBrandId, setSelectedBrandId] = useState<string>('apple');

  const filteredModels = useMemo(() => {
    const models = DEVICE_MODELS.filter((m) => m.brandId === selectedBrandId);
    return models.length > 0 ? models : DEVICE_MODELS.slice(0, 6);
  }, [selectedBrandId]);

  const [selectedModelId, setSelectedModelId] = useState<string>('iphone-15-pro');

  useEffect(() => {
    if (!filteredModels.some((m) => m.id === selectedModelId) && filteredModels[0]) {
      setSelectedModelId(filteredModels[0].id);
    }
  }, [filteredModels, selectedModelId]);

  const activeBrand = useMemo(
    () => selectableBrands.find((b) => b.id === selectedBrandId) || selectableBrands[0],
    [selectableBrands, selectedBrandId]
  );

  const activeModel = useMemo(
    () => filteredModels.find((m) => m.id === selectedModelId) || filteredModels[0],
    [filteredModels, selectedModelId]
  );

  const quoteEstimate = useMemo(() => {
    if (serviceType === 'buyback') {
      const cash =
        QUICK_BUYBACK_PRICES[activeModel?.id || ''] ||
        (activeBrand?.category === 'laptop' ? 680 : 320);
      return {
        label: 'Guaranteed payout',
        value: `Up to £${cash}`,
        meta: 'Instant bank transfer',
        statusPill: 'Instant Buyback · Same-Day Payout',
        dotColor: '#10B981',
      };
    }

    const mapped = QUICK_REPAIR_PRICES[activeModel?.id || ''];
    if (serviceType === 'battery') {
      const price = mapped?.batteryPrice || (activeBrand?.category === 'laptop' ? 119 : 59);
      return {
        label: 'Battery replacement',
        value: `From £${price}`,
        meta: '30 mins express',
        statusPill: 'Battery Ready · 30-Min Express',
        dotColor: '#E6007E',
      };
    }

    const price = mapped?.screenPrice || (activeBrand?.category === 'laptop' ? 169 : 99);
    const duration = mapped?.duration || '45 mins';
    return {
      label: 'Estimated screen fix',
      value: `From £${price}`,
      meta: duration,
      statusPill: 'Live Quote Ready · 45-Min Express',
      dotColor: '#10B981',
    };
  }, [serviceType, activeModel, activeBrand]);

  const statusBadgeDisplay =
    livePricingBadge && livePricingBadge !== HERO_SPLIT_QUICK_QUOTE_DEFAULTS.livePricingBadge
      ? `${livePricingBadge} · ${activeModel?.name || ''}`
      : quoteEstimate.statusPill;

  const navigateInternal = (url: string) => {
    const clean = (url || '/book-repair').replace(/^\/+|\/+$/g, '');
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    setCurrentPage((clean || 'home') as any);
  };

  const handleContinueQuote = () => {
    if (serviceType === 'buyback') {
      setCurrentPage('sell-my-phone');
      return;
    }

    const cat: DeviceCategory = (activeModel?.category || activeBrand?.category || 'smartphone') as DeviceCategory;
    startRepairBooking({
      category: cat,
      brand: activeBrand?.id || 'apple',
      model: activeModel?.id || 'iphone-15-pro',
    });
  };

  return (
    <section className="relative overflow-hidden bg-[#F8FAFC] border-b border-slate-200/70">
      {/* Subtle directional studio highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-0 w-[560px] h-[560px] rounded-full opacity-40 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(230,0,126,0.09) 0%, rgba(248,250,252,0) 70%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Staggered Framer Motion Choreography */}
          <div className="lg:col-span-6 space-y-6">
            {eyebrowText && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.42, ease: HERO_EASE }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-2xs text-xs font-semibold text-slate-700"
              >
                <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
                <span>{eyebrowText}</span>
              </motion.div>
            )}

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.48, delay: 0.08, ease: HERO_EASE }}
              className="text-4xl sm:text-5xl lg:text-[3.4rem] font-black text-[#0B0D12] tracking-tight leading-[1.06] font-heading"
              style={{ textWrap: 'balance' }}
            >
              {headline}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.46, delay: 0.16, ease: HERO_EASE }}
              className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl"
            >
              {subheadline}
            </motion.p>

            {/* Primary & Secondary CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.44, delay: 0.24, ease: HERO_EASE }}
              className="flex flex-wrap items-center gap-3 pt-1"
            >
              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (primaryBtnUrl === '/book-repair' || primaryBtnUrl === '/quote') {
                    startRepairBooking();
                  } else {
                    navigateInternal(primaryBtnUrl);
                  }
                }}
                className="px-6 py-3.5 rounded-xl bg-[#E6007E] hover:bg-[#C4006B] text-white text-sm font-bold shadow-sm hover:shadow-md transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Wrench className="w-4 h-4" />
                <span>{primaryBtnLabel}</span>
              </motion.button>

              {secondaryBtnLabel && (
                <motion.button
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigateInternal(secondaryBtnUrl)}
                  className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-[#0B0D12] border border-slate-200 hover:border-slate-300 text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {secondaryBtnLabel}
                </motion.button>
              )}
            </motion.div>

            {/* Trust Micro-Badges Row */}
            {trustBadges.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.44, delay: 0.32, ease: HERO_EASE }}
                className="pt-3 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-xs text-slate-600"
              >
                {trustBadges.map((badge, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="text-[#10B981] shrink-0">
                      {renderHome2Icon(badge.icon, 'w-4 h-4')}
                    </span>
                    <span className="font-bold text-[#0B0D12]">{badge.label}</span>
                    {badge.highlight && (
                      <span className="text-slate-500">{badge.highlight}</span>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Right Column: Spring-Loaded 3D Showcase + 3-Step Instant Quote Builder */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.12 }}
            className="lg:col-span-6"
          >
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_24px_60px_-20px_rgba(11,13,18,0.12)] p-4 sm:p-5">
              {/* Interactive Three.js 3D Studio Stage (with crisp static fallback) */}
              <div
                className="relative rounded-2xl overflow-hidden border border-slate-100 aspect-[16/10] flex items-center justify-center"
                style={{
                  background:
                    serviceType === 'buyback'
                      ? 'radial-gradient(circle at 55% 42%, #ECFDF5 0%, #F4F6FA 72%)'
                      : 'radial-gradient(circle at 55% 42%, #FDF2F8 0%, #F4F6FA 72%)',
                }}
              >
                {enable3DHero ? (
                  <Suspense
                    fallback={
                      <img
                        src={heroImage}
                        alt="Flagship smartphone and smartwatch studio preview"
                        className="w-full h-full object-cover object-center"
                      />
                    }
                  >
                    <Hero3DStage
                      serviceType={serviceType}
                      brandId={selectedBrandId}
                      modelId={selectedModelId}
                      modelName={activeModel?.name}
                      quoteValue={quoteEstimate.value}
                      quoteMeta={quoteEstimate.meta}
                      fallbackImage={heroImage}
                      enable3D={enable3DHero}
                    />
                  </Suspense>
                ) : (
                  <img
                    src={heroImage}
                    alt="Flagship smartphone and smartwatch studio preview"
                    className="w-full h-full object-cover object-center"
                  />
                )}

                {/* Top-Right Reactive Status Pill (solid bg, no backdrop-blur over WebGL) */}
                {livePricingBadge && (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${serviceType}-${activeModel?.id}`}
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.96 }}
                      transition={{ duration: 0.22 }}
                      className="pointer-events-none absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/90 shadow-2xs text-[11px] font-bold text-[#0B0D12]"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: quoteEstimate.dotColor }}
                      />
                      <span>{statusBadgeDisplay}</span>
                    </motion.div>
                  </AnimatePresence>
                )}

                {/* Bottom-Left Subtle 3D Hint */}
                {enable3DHero && (
                  <div className="pointer-events-none absolute bottom-2.5 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 border border-slate-200/80 text-[10px] font-semibold text-slate-600 shadow-2xs">
                    <Rotate3d className="w-3 h-3 text-[#E6007E]" />
                    <span>Drag 3D view</span>
                  </div>
                )}
              </div>

              {/* 3-Step Interactive Quote Selector */}
              <div className="pt-4 sm:pt-5">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h2 className="text-sm font-extrabold text-[#0B0D12] tracking-tight">
                    Instant Quote Builder
                  </h2>
                  <span className="text-[11px] font-bold text-[#E6007E]">
                    3-Step Estimate
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Step 1: Service Type */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      1. Service Type
                    </label>
                    <select
                      value={serviceType}
                      disabled={quoteMode === 'buyback'}
                      onChange={(e) => setServiceType(e.target.value as QuoteServiceMode)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs font-semibold text-[#0B0D12] focus:outline-none focus:ring-2 focus:ring-[#E6007E]/25 focus:border-[#E6007E] disabled:opacity-80 cursor-pointer"
                    >
                      {(quoteMode === 'both' || quoteMode === 'repair') && (
                        <>
                          <option value="screen">Screen Repair</option>
                          <option value="battery">Battery Replacement</option>
                        </>
                      )}
                      {(quoteMode === 'both' || quoteMode === 'buyback') && (
                        <option value="buyback">Sell Device (Buyback)</option>
                      )}
                    </select>
                  </div>

                  {/* Step 2: Brand */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      2. Brand
                    </label>
                    <select
                      value={selectedBrandId}
                      onChange={(e) => setSelectedBrandId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs font-semibold text-[#0B0D12] focus:outline-none focus:ring-2 focus:ring-[#E6007E]/25 focus:border-[#E6007E] cursor-pointer"
                    >
                      {selectableBrands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Step 3: Model */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      3. Model
                    </label>
                    <select
                      value={selectedModelId}
                      onChange={(e) => setSelectedModelId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs font-semibold text-[#0B0D12] focus:outline-none focus:ring-2 focus:ring-[#E6007E]/25 focus:border-[#E6007E] cursor-pointer"
                    >
                      {filteredModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Price Output + Continue CTA */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${serviceType}-${activeModel?.id}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18 }}
                    >
                      <span className="block text-[11px] font-medium text-slate-500">
                        {quoteEstimate.label}
                      </span>
                      <div className="flex items-baseline gap-2 tabular-nums">
                        <span className="text-lg sm:text-xl font-black text-[#0B0D12]">
                          {quoteEstimate.value}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          · {quoteEstimate.meta}
                        </span>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleContinueQuote}
                    className="px-5 py-2.5 rounded-xl bg-[#E6007E] hover:bg-[#C4006B] text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSplitQuickQuoteWidget;
