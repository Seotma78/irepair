import React, { useEffect, useRef, useState } from 'react';
import { animate, motion, useInView } from 'framer-motion';
import { WidgetRenderProps } from '../../types';
import {
  WHY_CHOOSE_US_METRICS_DARK_DEFAULTS,
  Home2DarkBenefit,
  Home2DarkStat,
} from './home2Defaults';
import { renderHome2Icon } from './home2Icons';
import { SpotlightCard } from './SpotlightCard';

function AnimatedStatValue({ rawValue }: { rawValue: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });
  const [display, setDisplay] = useState(rawValue);

  useEffect(() => {
    const match = String(rawValue || '').match(/^([^\d.-]*)(\d+(?:\.\d+)?)(.*)$/);
    if (!match) {
      setDisplay(rawValue);
      return;
    }
    const [, prefix, numStr, suffix] = match;
    const targetNum = parseFloat(numStr);
    const decimals = numStr.includes('.') ? numStr.split('.')[1]?.length || 1 : 0;

    if (!isInView) {
      setDisplay(`${prefix}${(0).toFixed(decimals)}${suffix}`);
      return;
    }

    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(rawValue);
      return;
    }

    const controls = animate(0, targetNum, {
      duration: 1.35,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        const formatted = decimals > 0 ? latest.toFixed(decimals) : Math.round(latest).toString();
        setDisplay(`${prefix}${formatted}${suffix}`);
      },
      onComplete: () => {
        setDisplay(rawValue);
      },
    });

    return () => controls.stop();
  }, [rawValue, isInView]);

  return <span ref={ref}>{display}</span>;
}

export const WhyChooseUsMetricsDarkWidget: React.FC<WidgetRenderProps> = ({ settings = {} }) => {
  const heading = settings.heading ?? WHY_CHOOSE_US_METRICS_DARK_DEFAULTS.heading;
  const subheadline = settings.subheadline ?? WHY_CHOOSE_US_METRICS_DARK_DEFAULTS.subheadline;

  const benefits: Home2DarkBenefit[] =
    Array.isArray(settings.benefits) && settings.benefits.length > 0
      ? settings.benefits
      : WHY_CHOOSE_US_METRICS_DARK_DEFAULTS.benefits;

  const stats: Home2DarkStat[] =
    Array.isArray(settings.stats) && settings.stats.length > 0
      ? settings.stats
      : WHY_CHOOSE_US_METRICS_DARK_DEFAULTS.stats;

  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [hoveredStat, setHoveredStat] = useState<number | null>(null);

  const getStatColorClass = (highlight: string) => {
    if (highlight === 'emerald') return 'text-[#10B981]';
    if (highlight === 'pink') return 'text-[#E6007E]';
    return 'text-white';
  };

  return (
    <section className="bg-[#0B0D12] text-white py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading Block */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.42 }}
          className="max-w-2xl mb-10"
        >
          <h2
            className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading"
            style={{ textWrap: 'balance' }}
          >
            {heading}
          </h2>
          {subheadline && (
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              {subheadline}
            </p>
          )}
        </motion.div>

        {/* 4 Benefit Glass Cards with SpotlightCard + Elevated Icon Lift */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {benefits.map((item, idx) => {
            const isEmerald = item.accentColor === 'emerald';
            const isHovered = hoveredCard === idx;
            return (
              <motion.div
                key={`${item.title}-${idx}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.38, delay: idx * 0.07, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{
                  y: -4,
                  transition: { type: 'spring', stiffness: 340, damping: 24 },
                }}
                onMouseEnter={() => setHoveredCard(idx)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <SpotlightCard
                  variant="dark"
                  accentColor={isEmerald ? 'emerald' : 'pink'}
                  className="h-full rounded-2xl border border-white/10 hover:border-[#E6007E]/60 bg-[#111520] hover:bg-[#171C2A] shadow-xs hover:shadow-[0_14px_34px_-12px_rgba(230,0,126,0.28)] transition-all duration-300"
                >
                  <div className="p-6 flex flex-col justify-between h-full">
                    <div>
                      <motion.div
                        animate={
                          isHovered ? { y: -3, scale: 1.08 } : { y: 0, scale: 1 }
                        }
                        transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${
                          isEmerald
                            ? 'bg-[#10B981]/10 border-[#10B981]/25 text-[#10B981]'
                            : 'bg-[#E6007E]/12 border-[#E6007E]/25 text-[#E6007E]'
                        }`}
                      >
                        {renderHome2Icon(item.icon, 'w-5 h-5')}
                      </motion.div>

                      <h3 className="text-sm sm:text-base font-bold text-white">
                        {item.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mt-2">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </SpotlightCard>
              </motion.div>
            );
          })}
        </div>

        {/* Live Animated Count-Up KPI Strip with Hover Scale Pop & Pink Underline */}
        {stats.length > 0 && (
          <div className="mt-12 pt-10 border-t border-white/10 grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, idx) => {
              const isStatHovered = hoveredStat === idx;
              return (
                <motion.div
                  key={`${stat.label}-${idx}`}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.36, delay: idx * 0.08 }}
                  whileHover={{
                    scale: 1.05,
                    transition: { type: 'spring', stiffness: 380, damping: 22 },
                  }}
                  onMouseEnter={() => setHoveredStat(idx)}
                  onMouseLeave={() => setHoveredStat(null)}
                  className="origin-left cursor-default"
                >
                  <div
                    className={`text-3xl sm:text-4xl font-black tracking-tight tabular-nums font-heading ${getStatColorClass(
                      stat.highlight
                    )}`}
                  >
                    <AnimatedStatValue rawValue={stat.value} />
                  </div>
                  <div className="text-xs font-medium text-slate-400 mt-1.5">
                    {stat.label}
                  </div>
                  <motion.div
                    aria-hidden="true"
                    animate={{ scaleX: isStatHovered ? 1 : 0 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-2 h-[2px] w-14 bg-[#E6007E] origin-left rounded-full"
                  />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default WhyChooseUsMetricsDarkWidget;
