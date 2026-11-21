import React, { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { WidgetRenderProps } from '../../types';
import { REVIEWS_CAROUSEL_MODERN_DEFAULTS, Home2ModernReview } from './home2Defaults';

const REVIEW_SLIDE_VARIANTS = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? 44 : -44,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? -44 : 44,
  }),
};

export const ReviewsCarouselModernWidget: React.FC<WidgetRenderProps> = ({ settings = {} }) => {
  const ratingBadgeText = settings.ratingBadgeText ?? REVIEWS_CAROUSEL_MODERN_DEFAULTS.ratingBadgeText;
  const heading = settings.heading ?? REVIEWS_CAROUSEL_MODERN_DEFAULTS.heading;
  const subheadline = settings.subheadline ?? REVIEWS_CAROUSEL_MODERN_DEFAULTS.subheadline;
  const autoplay = settings.autoplay !== false;
  const autoplaySpeedMs = Math.max(2500, Number(settings.autoplaySpeedMs) || 5500);

  const reviews: Home2ModernReview[] =
    Array.isArray(settings.reviews) && settings.reviews.length > 0
      ? settings.reviews
      : REVIEWS_CAROUSEL_MODERN_DEFAULTS.reviews;

  const [perPage, setPerPage] = useState<number>(3);
  const [pageIdx, setPageIdx] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1);
  const [paused, setPaused] = useState<boolean>(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  useEffect(() => {
    const updatePerPage = () => {
      if (window.innerWidth < 640) setPerPage(1);
      else if (window.innerWidth < 1024) setPerPage(2);
      else setPerPage(3);
    };
    updatePerPage();
    window.addEventListener('resize', updatePerPage);
    return () => window.removeEventListener('resize', updatePerPage);
  }, []);

  const totalPages = Math.max(1, Math.ceil(reviews.length / perPage));
  const clampedPage = pageIdx % totalPages;

  useEffect(() => {
    if (!autoplay || paused || totalPages <= 1) return;
    const timer = setInterval(() => {
      setDirection(1);
      setPageIdx((prev) => (prev + 1) % totalPages);
    }, autoplaySpeedMs);
    return () => clearInterval(timer);
  }, [autoplay, paused, totalPages, autoplaySpeedMs]);

  const visibleReviews = reviews.slice(
    clampedPage * perPage,
    clampedPage * perPage + perPage
  );

  // Inject clean Structured Data for Customer Reviews
  useEffect(() => {
    if (reviews.length === 0) return;
    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'iRepair Mobiles UK',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '18420',
        bestRating: '5',
        worstRating: '1',
      },
      review: reviews.map((r) => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: r.author },
        reviewRating: {
          '@type': 'Rating',
          ratingValue: String(r.rating || 5),
          bestRating: '5',
        },
        reviewBody: r.quote,
      })),
    };

    const existing = document.getElementById('json-ld-home2-reviews');
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'json-ld-home2-reviews';
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);
    return () => {
      const node = document.getElementById('json-ld-home2-reviews');
      if (node) node.remove();
    };
  }, [reviews]);

  const goPrev = () => {
    setDirection(-1);
    setPageIdx((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const goNext = () => {
    setDirection(1);
    setPageIdx((prev) => (prev + 1) % totalPages);
  };

  const goToPage = (idx: number) => {
    setDirection(idx >= clampedPage ? 1 : -1);
    setPageIdx(idx);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (totalPages <= 1) return;
    if (info.offset.x < -55 || info.velocity.x < -300) {
      goNext();
    } else if (info.offset.x > 55 || info.velocity.x > 300) {
      goPrev();
    }
  };

  const getInitials = (name: string) => {
    const parts = (name || 'U').trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <section
      className="bg-white py-14 sm:py-16 border-b border-slate-200/70"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Centered Header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-2xl mx-auto mb-10"
        >
          {ratingBadgeText && (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#10B981] mb-2">
              <Star className="w-3.5 h-3.5 fill-[#10B981] text-[#10B981]" />
              <span>{ratingBadgeText}</span>
            </div>
          )}

          <h2
            className="text-2xl sm:text-3xl font-black text-[#0B0D12] tracking-tight font-heading"
            style={{ textWrap: 'balance' }}
          >
            {heading}
          </h2>

          {subheadline && (
            <p className="text-sm text-slate-500 mt-2">
              {subheadline}
            </p>
          )}
        </motion.div>

        {/* 3-Card Responsive Spring Carousel with Drag/Swipe & Star Shimmer Hover */}
        <div className="overflow-hidden -mx-2 px-2 py-2">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`${clampedPage}-${perPage}`}
              custom={direction}
              variants={REVIEW_SLIDE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              drag={totalPages > 1 ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={handleDragEnd}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 cursor-grab active:cursor-grabbing"
            >
              {visibleReviews.map((rev, idx) => {
                const isCardHovered = hoveredCard === idx;
                return (
                  <motion.div
                    key={`${rev.author}-${idx}`}
                    whileHover={{
                      y: -4,
                      transition: { type: 'spring', stiffness: 340, damping: 24 },
                    }}
                    onMouseEnter={() => setHoveredCard(idx)}
                    onMouseLeave={() => setHoveredCard(null)}
                    className="bg-white rounded-2xl border border-slate-200/90 hover:border-[#E6007E]/45 p-6 shadow-2xs hover:shadow-[0_18px_36px_-14px_rgba(11,13,18,0.14)] transition-all duration-300 flex flex-col justify-between min-h-[210px] select-none"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-0.5 text-[#10B981]">
                          {Array.from({
                            length: Math.max(1, Math.min(5, Number(rev.rating) || 5)),
                          }).map((_, sIdx) => (
                            <motion.span
                              key={sIdx}
                              animate={
                                isCardHovered
                                  ? {
                                      scale: [1, 1.24, 1.08],
                                      filter: 'drop-shadow(0 0 4px rgba(16,185,129,0.55))',
                                    }
                                  : { scale: 1, filter: 'none' }
                              }
                              transition={{
                                duration: 0.35,
                                delay: isCardHovered ? sIdx * 0.045 : 0,
                              }}
                              className="inline-flex"
                            >
                              <Star className="w-3.5 h-3.5 fill-[#10B981] text-[#10B981]" />
                            </motion.span>
                          ))}
                        </div>

                        {rev.verified !== false && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold transition-all duration-250 ${
                              isCardHovered
                                ? 'bg-[#ECFDF5] text-[#059669] border border-[#10B981]/35 shadow-2xs'
                                : 'text-[#10B981] border border-transparent'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verified</span>
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-slate-700 leading-relaxed">
                        "{rev.quote}"
                      </p>
                    </div>

                    <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#FDF2F8] border border-[#E6007E]/20 text-[#E6007E] font-bold text-[11px] flex items-center justify-center shrink-0">
                          {getInitials(rev.author)}
                        </div>
                        <span className="text-xs font-bold text-[#0B0D12] truncate">
                          {rev.author}
                        </span>
                      </div>

                      {rev.serviceTag && (
                        <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap shrink-0">
                          {rev.serviceTag}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Prev / Animated Dots / Next Controls */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              aria-label="Previous reviews"
              onClick={goPrev}
              className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:border-[#E6007E] text-slate-600 hover:text-[#E6007E] flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }).map((_, idx) => {
                const isActive = idx === clampedPage;
                return (
                  <motion.button
                    key={idx}
                    type="button"
                    aria-label={`Show reviews page ${idx + 1}`}
                    onClick={() => goToPage(idx)}
                    animate={{
                      width: isActive ? 22 : 8,
                      backgroundColor: isActive ? '#E6007E' : '#CBD5E1',
                    }}
                    whileHover={{ scale: 1.15 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                    className="h-2 rounded-full cursor-pointer"
                  />
                );
              })}
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              aria-label="Next reviews"
              onClick={goNext}
              className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:border-[#E6007E] text-slate-600 hover:text-[#E6007E] flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ReviewsCarouselModernWidget;
