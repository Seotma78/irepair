import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { WidgetRenderProps } from '../../types';
import { PROCESS_STEPS_MODERN_DEFAULTS, Home2ProcessStep } from './home2Defaults';
import { renderHome2Icon } from './home2Icons';
import { SpotlightCard } from './SpotlightCard';

export const ProcessStepsModernWidget: React.FC<WidgetRenderProps> = ({ settings = {} }) => {
  const eyebrow = settings.eyebrow ?? PROCESS_STEPS_MODERN_DEFAULTS.eyebrow;
  const heading = settings.heading ?? PROCESS_STEPS_MODERN_DEFAULTS.heading;
  const subtitle = settings.subtitle ?? PROCESS_STEPS_MODERN_DEFAULTS.subtitle;

  const steps: Home2ProcessStep[] =
    Array.isArray(settings.steps) && settings.steps.length > 0
      ? settings.steps
      : PROCESS_STEPS_MODERN_DEFAULTS.steps;

  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  return (
    <section className="bg-[#F8FAFC] py-14 sm:py-16 border-t border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.4 }}
          className="max-w-2xl mb-10"
        >
          {eyebrow && (
            <span className="block text-[11px] font-bold uppercase tracking-wider text-[#E6007E] mb-2">
              {eyebrow}
            </span>
          )}
          <h2
            className="text-2xl sm:text-3xl font-black text-[#0B0D12] tracking-tight font-heading"
            style={{ textWrap: 'balance' }}
          >
            {heading}
          </h2>
          {subtitle && (
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              {subtitle}
            </p>
          )}
        </motion.div>

        <div className="relative">
          {/* Desktop Animated Progress Connecting Line (subtly highlights on hovered step) */}
          {steps.length >= 2 && (
            <div
              aria-hidden="true"
              className="hidden md:block absolute top-11 left-[14%] right-[14%] h-[2px] bg-slate-200/80 overflow-hidden z-0 rounded-full"
            >
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.85, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: 'left center' }}
                className={`w-full h-full transition-all duration-300 ${
                  hoveredStep !== null
                    ? 'bg-gradient-to-r from-[#E6007E] via-[#E6007E] to-[#10B981] opacity-100'
                    : 'bg-gradient-to-r from-[#E6007E]/60 via-[#E6007E]/80 to-[#10B981]/70 opacity-75'
                }`}
              />
            </div>
          )}

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, idx) => {
              const isHovered = hoveredStep === idx;
              return (
                <motion.div
                  key={`${step.stepNumber}-${idx}`}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{
                    duration: 0.44,
                    delay: idx * 0.12,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={{
                    y: -4,
                    transition: { type: 'spring', stiffness: 340, damping: 24 },
                  }}
                  onMouseEnter={() => setHoveredStep(idx)}
                  onMouseLeave={() => setHoveredStep(null)}
                >
                  <SpotlightCard className="h-full bg-white rounded-2xl border border-slate-200/90 hover:border-[#E6007E]/50 p-6 sm:p-7 shadow-2xs hover:shadow-md transition-all">
                    <div className="flex flex-col justify-between h-full">
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <span
                            className={`relative text-xs font-mono font-extrabold tracking-wider px-2.5 py-1 rounded-lg border transition-all duration-250 ${
                              isHovered
                                ? 'bg-[#E6007E] text-white border-[#E6007E] ring-4 ring-[#E6007E]/20 scale-105'
                                : 'bg-[#FDF2F8] text-[#E6007E] border-[#E6007E]/15'
                            }`}
                          >
                            {step.stepNumber || `0${idx + 1}`}
                          </span>
                          <motion.div
                            animate={
                              isHovered ? { scale: 1.1, rotate: -4 } : { scale: 1, rotate: 0 }
                            }
                            transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                            className="w-9 h-9 rounded-xl bg-[#FDF2F8] border border-[#E6007E]/15 text-[#E6007E] flex items-center justify-center shrink-0"
                          >
                            {renderHome2Icon(step.icon, 'w-4 h-4')}
                          </motion.div>
                        </div>

                        <h3 className="text-base font-bold text-[#0B0D12] mt-4">
                          {step.title}
                        </h3>

                        <p className="text-sm text-slate-600 leading-relaxed mt-2">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </SpotlightCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProcessStepsModernWidget;
