import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export interface PromoCardItem {
  id: string;
  heading: string;
  subheading: string;
  buttonText: string;
  buttonLink: string;
  bgImage: string;
  altText?: string;
  isExternal?: boolean;
}

export interface HeroPromoCardsSettings {
  columnsDesktop?: number; // 1, 2, 3, or 4 (default: 3)
  columnsTablet?: number;  // 1 or 2 (default: 2)
  columnsMobile?: number;  // 1 (default: 1)
  gap?: number;            // in pixels (default: 24)
  borderRadius?: number;   // in pixels (default: 16)
  cardMinHeight?: number;  // in pixels (default: 340)
  overlayOpacity?: number; // 0 to 1 (default: 0.15)
  accentColor?: string;    // button background color (default: #E6007E)
  cards?: PromoCardItem[];
}

export const DEFAULT_PROMO_CARDS: PromoCardItem[] = [
  {
    id: 'promo_repair',
    heading: 'Express Mobile Repairs',
    subheading: 'Fast, certified fixes with warranty',
    buttonText: 'Get a Free Quote',
    buttonLink: '/quote',
    bgImage: 'https://irepair-mobiles.co.uk/wp-content/uploads/2025/10/Mobile-Repair-Services.webp',
    altText: 'Technician repairing a phone on a workbench at iRepair',
    isExternal: false,
  },
  {
    id: 'promo_sell',
    heading: 'Sell & Get Instant Cash',
    subheading: 'Fair quotes & fast bank payouts',
    buttonText: 'Sell Now',
    buttonLink: '/sell-my-phone/',
    bgImage: 'https://irepair-mobiles.co.uk/wp-content/uploads/2025/10/Sell-Your-Phone.webp',
    altText: 'iRepair store interior with staff and customers trading in devices',
    isExternal: false,
  },
  {
    id: 'promo_upgrade',
    heading: 'Shop Phones & Tech',
    subheading: 'New, refurbished & accessories',
    buttonText: 'Shop Now',
    buttonLink: '/shop',
    bgImage: 'https://irepair-mobiles.co.uk/wp-content/uploads/2025/10/Upgrade.webp',
    altText: 'iRepair retail display wall with phone accessories and cases',
    isExternal: false,
  },
];

interface HeroPromoCardsWidgetProps {
  settings?: HeroPromoCardsSettings;
  commonSettings?: any;
  isPreview?: boolean;
}

export const HeroPromoCardsWidget: React.FC<HeroPromoCardsWidgetProps> = ({
  settings = {},
  commonSettings = {},
  isPreview = false,
}) => {
  const { setCurrentPage, startRepairBooking } = useApp();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const cards = settings.cards && settings.cards.length > 0 ? settings.cards : DEFAULT_PROMO_CARDS;

  // Customizable column count per breakpoint
  const colsDesktop = Math.min(Math.max(Number(settings.columnsDesktop || 3), 1), 4);
  const colsTablet = Math.min(Math.max(Number(settings.columnsTablet || 2), 1), 2);
  const colsMobile = Math.min(Math.max(Number(settings.columnsMobile || 1), 1), 2);

  const gap = Number(settings.gap ?? 24);
  const borderRadius = Number(settings.borderRadius ?? 16);
  const cardMinHeight = Number(settings.cardMinHeight ?? 340);
  const overlayOpacity = Number(settings.overlayOpacity ?? 0.15);
  const rawAccent = settings.accentColor || '#E6007E';
  const accentColor =
    rawAccent.toUpperCase() === '#D81B80' ? '#E6007E' : rawAccent;

  // Tailwind class mappings for static compiler resolution
  const desktopColsClass =
    colsDesktop === 1
      ? 'lg:grid-cols-1'
      : colsDesktop === 2
        ? 'lg:grid-cols-2'
        : colsDesktop === 4
          ? 'lg:grid-cols-4'
          : 'lg:grid-cols-3';

  const tabletColsClass =
    colsTablet === 1 ? 'md:grid-cols-1' : 'md:grid-cols-2';

  const mobileColsClass =
    colsMobile === 2 ? 'grid-cols-2' : 'grid-cols-1';

  const handleCardClick = (card: PromoCardItem, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a')) {
      return;
    }

    if (card.isExternal || card.buttonLink.startsWith('http')) {
      window.open(card.buttonLink, '_blank', 'noopener,noreferrer');
      return;
    }

    if (card.buttonLink === '/quote' || card.buttonLink === '/book-repair') {
      if (typeof startRepairBooking === 'function') {
        startRepairBooking();
      } else {
        setCurrentPage('book-repair');
      }
      return;
    }

    if (card.buttonLink.startsWith('/')) {
      const slug = card.buttonLink.replace(/^\//, '');
      setCurrentPage(slug || 'home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <section
      aria-label="iRepair Promotional Highlights"
      className="w-full py-6 md:py-8 lg:py-10"
      style={
        {
          '--cols-desktop': colsDesktop,
          '--cols-tablet': colsTablet,
          '--cols-mobile': colsMobile,
          '--grid-gap': `${gap}px`,
        } as React.CSSProperties
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`grid ${mobileColsClass} ${tabletColsClass} ${desktopColsClass}`}
          style={{ gap: `${gap}px` }}
        >
          {cards.map((card, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <motion.article
                key={card.id || `promo-card-${idx}`}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                whileHover={{
                  y: -4,
                  transition: { type: 'spring', stiffness: 320, damping: 24 },
                }}
                transition={{ duration: 0.4, delay: idx * 0.07, ease: [0.22, 1, 0.36, 1] }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={(e) => handleCardClick(card, e)}
                className="group relative overflow-hidden rounded-2xl flex flex-col justify-between cursor-pointer select-none border border-slate-900/15 hover:border-[#E6007E]/65 shadow-[0_14px_32px_-16px_rgba(11,13,18,0.38)] hover:shadow-[0_24px_48px_-16px_rgba(11,13,18,0.48)] transition-colors duration-300"
                style={{
                  borderRadius: `${borderRadius}px`,
                  minHeight: `${cardMinHeight}px`,
                }}
              >
                {/* Background Image with Smooth 500ms Zoom on Hover */}
                <div className="absolute inset-0 z-0 overflow-hidden bg-[#0B0D12]">
                  <img
                    src={card.bgImage}
                    alt={card.altText || card.heading}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center transform scale-100 group-hover:scale-105 transition-transform duration-500 ease-out will-change-transform"
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    onError={(e) => {
                      const fallbackMap: Record<number, string> = {
                        0: '/images/Mobile-Repair-Services.webp',
                        1: '/images/Sell-Your-Phone.webp',
                        2: '/images/Upgrade.webp',
                      };
                      const fallback = fallbackMap[idx];
                      if (fallback && e.currentTarget.src !== fallback) {
                        e.currentTarget.src = fallback;
                      }
                    }}
                  />

                  {/* Adjustable Base Dimming Layer */}
                  <div
                    className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
                    style={{
                      backgroundColor: `rgba(11, 13, 18, ${overlayOpacity})`,
                    }}
                  />

                  {/* Directional Dark Gradient Scrim for Maximum Headline Contrast */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/45 to-black/15 pointer-events-none" />
                </div>

                {/* Card Content Overlay */}
                <div className="relative z-10 flex flex-col justify-between h-full p-6 sm:p-7 lg:p-8 flex-1">
                  {/* Refined Heading & Subheading */}
                  <div className="space-y-2 max-w-[92%]">
                    <h3
                      className="text-white font-extrabold text-xl sm:text-2xl lg:text-[26px] leading-[1.2] tracking-tight drop-shadow-sm font-heading"
                      style={{ textWrap: 'balance' }}
                    >
                      {card.heading}
                    </h3>
                    <p className="text-white/90 text-xs sm:text-sm md:text-[15px] font-medium leading-relaxed drop-shadow-xs">
                      {card.subheading}
                    </p>
                  </div>

                  {/* Modern CTA Button with #C4006B Glow Hover & Sliding Arrow */}
                  <div className="pt-8">
                    {card.isExternal ? (
                      <a
                        href={card.buttonLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold transition-all duration-300 transform active:scale-95 cursor-pointer"
                        style={{
                          backgroundColor: isHovered ? '#C4006B' : accentColor,
                          boxShadow: isHovered
                            ? '0 10px 26px -6px rgba(230, 0, 126, 0.65)'
                            : '0 6px 16px -4px rgba(11, 13, 18, 0.35)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="whitespace-nowrap">{card.buttonText}</span>
                        <motion.span
                          animate={{ x: isHovered ? 4 : 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                          className="inline-flex"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </motion.span>
                      </a>
                    ) : (
                      <a
                        href={card.buttonLink}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold transition-all duration-300 transform active:scale-95 cursor-pointer"
                        style={{
                          backgroundColor: isHovered ? '#C4006B' : accentColor,
                          boxShadow: isHovered
                            ? '0 10px 26px -6px rgba(230, 0, 126, 0.65)'
                            : '0 6px 16px -4px rgba(11, 13, 18, 0.35)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (card.buttonLink === '/quote' || card.buttonLink === '/book-repair') {
                            e.preventDefault();
                            if (typeof startRepairBooking === 'function') {
                              startRepairBooking();
                            } else {
                              setCurrentPage('book-repair');
                            }
                            return;
                          }
                          if (card.buttonLink.startsWith('/')) {
                            e.preventDefault();
                            const slug = card.buttonLink.replace(/^\//, '');
                            setCurrentPage(slug || 'home');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                      >
                        <span className="whitespace-nowrap">{card.buttonText}</span>
                        <motion.span
                          animate={{ x: isHovered ? 4 : 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                          className="inline-flex"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </motion.span>
                      </a>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HeroPromoCardsWidget;
