import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WidgetRenderProps } from '../types';
import { 
  Star, 
  CheckCircle2, 
  Quote, 
  ChevronLeft, 
  ChevronRight, 
  Pause, 
  Play, 
  MapPin, 
  Sparkles 
} from 'lucide-react';
import { TESTIMONIALS } from '../../data/mockData';

export const TestimonialsWidget: React.FC<WidgetRenderProps> = ({ settings }) => {
  const [reviews, setReviews] = useState<any[]>(() => {
    if (settings.reviews && settings.reviews.length > 0) return settings.reviews;
    return TESTIMONIALS;
  });

  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(settings.autoplay !== false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const resumeTimerRef = useRef<any>(null);

  // Fetch from CMS if available, falling back to mockData
  useEffect(() => {
    if (settings.reviews && settings.reviews.length > 0) {
      setReviews(settings.reviews);
      return;
    }

    fetch('/api/cms/collections/reviews')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setReviews(data);
        } else {
          setReviews(TESTIMONIALS);
        }
      })
      .catch(() => {
        setReviews(TESTIMONIALS);
      });
  }, [settings.reviews]);

  // Accessibility: respect reduced motion
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        setIsPlaying(false);
      }
    }
  }, []);

  const limit = Number(settings.limit) || 12;
  const minRating = Number(settings.minRating) || 4;
  const speedSec = Number(settings.speed) || 40; // seconds for full cycle
  const pauseOnHover = settings.pauseOnHover !== false;
  const showArrows = settings.showArrows !== false;

  const filtered = (reviews.length > 0 ? reviews : TESTIMONIALS)
    .filter((r: any) => (r.rating || 5) >= minRating)
    .slice(0, limit);

  // Duplicate items for infinite seamless looping
  const carouselItems = filtered.length > 0 ? [...filtered, ...filtered] : [];

  // Smooth continuous auto-scroll using requestAnimationFrame
  useEffect(() => {
    if (!isPlaying || isPaused || carouselItems.length === 0) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    // Calculate smooth pixels per millisecond based on speed setting
    // A standard cycle of ~10 cards is ~4000px, 40s -> ~100px/s -> ~0.04 to 0.08 px/ms
    const basePps = 45; // ~45px per second = relaxed, readable smooth pace
    const speedRatio = 40 / Math.max(10, speedSec);
    const pxPerMs = (basePps * speedRatio) / 1000;

    const tick = (currentTime: number) => {
      const delta = Math.min(currentTime - lastTime, 64); // cap delta to prevent big jumps on tab switch
      lastTime = currentTime;

      const container = containerRef.current;
      if (container && !isDraggingRef.current) {
        container.scrollLeft += delta * pxPerMs;

        // When scrolled past half the content, seamlessly wrap back
        const halfWidth = container.scrollWidth / 2;
        if (halfWidth > 0 && container.scrollLeft >= halfWidth) {
          container.scrollLeft -= halfWidth;
        }
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, isPaused, carouselItems.length, speedSec]);

  // Arrow button navigation
  const handleScrollPrev = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cardWidth = 380;
    const halfWidth = container.scrollWidth / 2;
    if (container.scrollLeft - cardWidth < 0 && halfWidth > 0) {
      container.scrollLeft += halfWidth;
    }
    container.scrollBy({ left: -cardWidth, behavior: 'smooth' });
  }, []);

  const handleScrollNext = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cardWidth = 380;
    const halfWidth = container.scrollWidth / 2;
    container.scrollBy({ left: cardWidth, behavior: 'smooth' });
    if (halfWidth > 0 && container.scrollLeft + cardWidth >= halfWidth * 2 - container.clientWidth) {
      setTimeout(() => {
        if (container) container.scrollLeft -= halfWidth;
      }, 350);
    }
  }, []);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - container.offsetLeft;
    scrollLeftStartRef.current = container.scrollLeft;
    setIsPaused(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    container.scrollLeft = scrollLeftStartRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      if (!pauseOnHover) {
        setIsPaused(false);
      }
    }
  };

  // Touch handlers
  const handleTouchStart = () => {
    setIsPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  };

  const handleTouchEnd = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 2500);
  };

  // Schema.org AggregateRating / Review JSON-LD
  useEffect(() => {
    if (filtered.length === 0) return;
    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'iRepair Mobiles UK',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '12450',
        bestRating: '5',
        worstRating: '1',
      },
      review: filtered.map((r: any) => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: r.author },
        reviewRating: {
          '@type': 'Rating',
          ratingValue: String(r.rating || 5),
          bestRating: '5',
        },
        reviewBody: r.review_text || r.review,
      })),
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'json-ld-reviews';
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById('json-ld-reviews');
      if (existing) existing.remove();
    };
  }, [filtered]);

  // Color palette helper for reviewer avatars
  const getAvatarGradient = (idx: number) => {
    const gradients = [
      'from-pink-500 to-[#DF0C88]',
      'from-rose-500 to-pink-600',
      'from-amber-500 to-orange-600',
      'from-emerald-500 to-teal-600',
      'from-cyan-500 to-blue-600',
      'from-indigo-500 to-purple-600',
      'from-violet-500 to-fuchsia-600',
    ];
    return gradients[idx % gradients.length];
  };

  return (
    <section className="py-16 bg-slate-50 border-y border-slate-200/80 overflow-hidden relative select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            {/* Trustpilot & Google Reviews Rating Header */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
              <div className="flex items-center gap-0.5 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="font-bold text-slate-900">4.9 / 5.0 Rating</span>
              <span aria-hidden="true" className="text-slate-400">·</span>
              <span className="text-slate-500">Trustpilot & Google</span>
              <span aria-hidden="true" className="text-slate-400">·</span>
              <span className="text-emerald-700 font-bold">12,450+ Verified Reviews</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight font-heading">
              {settings.title || 'Rated 4.9/5 by 12,000+ UK Customers'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-2xl leading-relaxed">
              {settings.subtitle || 'Real feedback from customers who visited our branches or mailed their broken devices in.'}
            </p>
          </div>

          {/* Carousel Controls */}
          {showArrows && (
            <div className="flex items-center gap-2 self-start md:self-end">

              {/* Play / Pause Toggle */}
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                title={isPlaying ? 'Pause auto-scroll' : 'Play auto-scroll'}
                aria-label={isPlaying ? 'Pause auto-scroll' : 'Play auto-scroll'}
                className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-600 hover:text-[#DF0C88] hover:border-[#DF0C88]/30 transition-all cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-0.5" />}
              </button>

              {/* Prev Button */}
              <button
                type="button"
                onClick={handleScrollPrev}
                title="Previous testimonial"
                aria-label="Previous testimonial"
                className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-600 hover:text-[#DF0C88] hover:border-[#DF0C88]/30 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Next Button */}
              <button
                type="button"
                onClick={handleScrollNext}
                title="Next testimonial"
                aria-label="Next testimonial"
                className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-600 hover:text-[#DF0C88] hover:border-[#DF0C88]/30 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Auto-moving Carousel Track Container */}
      <div className="relative w-full">
        {/* Subtle Edge Fade Gradients */}
        <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-20 bg-gradient-to-r from-slate-50 via-slate-50/70 to-transparent pointer-events-none z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-20 bg-gradient-to-l from-slate-50 via-slate-50/70 to-transparent pointer-events-none z-10" />

        {/* Scrollable Track */}
        <div
          ref={containerRef}
          onMouseEnter={() => pauseOnHover && setIsPaused(true)}
          onMouseLeave={() => {
            handleMouseUpOrLeave();
            if (pauseOnHover) setIsPaused(false);
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex gap-5 overflow-x-auto scrollbar-none py-4 px-4 sm:px-8 cursor-grab active:cursor-grabbing scroll-smooth"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {carouselItems.map((rev: any, idx: number) => {
            const authorInitial = rev.author ? rev.author.charAt(0).toUpperCase() : 'U';
            const reviewText = rev.review_text || rev.review || '';
            const source = rev.source || (idx % 2 === 0 ? 'Google Reviews' : 'Trustpilot');
            const isVerified = rev.verified === 1 || rev.verified === true;

            return (
              <div
                key={`${rev.id || idx}-${idx}`}
                className="w-[310px] sm:w-[380px] shrink-0 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-[#DF0C88]/30 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Rating, Source Badge & Date */}
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(Math.floor(rev.rating || 5))].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">
                        {source}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        {rev.date}
                      </span>
                    </div>
                  </div>

                  {/* Quote icon & Review body */}
                  <div className="relative mb-4">
                    <Quote className="w-7 h-7 text-pink-200/70 mb-1 group-hover:text-[#DF0C88]/40 transition-colors" />
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                      "{reviewText}"
                    </p>
                  </div>
                </div>

                {/* Footer: Author, Device, Location */}
                <div className="pt-4 border-t border-slate-100 mt-2">
                  <div className="flex items-center gap-3">
                    {/* Author Avatar with initials */}
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient(idx)} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs`}>
                      {authorInitial}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-xs text-slate-900 truncate">
                          {rev.author}
                        </h4>
                        {isVerified && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200 shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Verified</span>
                          </span>
                        )}
                      </div>

                      {rev.device_repaired || rev.deviceRepaired ? (
                        <div className="text-[11px] text-[#DF0C88] font-semibold truncate mt-0.5">
                          {rev.device_repaired || rev.deviceRepaired}
                        </div>
                      ) : null}

                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5 truncate">
                        <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                        <span>{rev.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Touch drag indicator for mobile */}
      <div className="max-w-7xl mx-auto px-4 mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <Sparkles className="w-3.5 h-3.5 text-[#DF0C88]" />
        <span>Smooth auto-paced carousel · Hover to pause · Drag or swipe anytime</span>
      </div>
    </section>
  );
};
