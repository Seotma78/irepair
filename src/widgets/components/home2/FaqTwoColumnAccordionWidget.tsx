import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, HelpCircle, ArrowRight } from 'lucide-react';
import { WidgetRenderProps } from '../../types';
import { useApp } from '../../../context/AppContext';
import { FAQ_TWO_COLUMN_ACCORDION_DEFAULTS, Home2FaqItem } from './home2Defaults';

export const FaqTwoColumnAccordionWidget: React.FC<WidgetRenderProps> = ({ settings = {} }) => {
  const { setCurrentPage } = useApp();

  const eyebrow = settings.eyebrow ?? FAQ_TWO_COLUMN_ACCORDION_DEFAULTS.eyebrow;
  const heading = settings.heading ?? FAQ_TWO_COLUMN_ACCORDION_DEFAULTS.heading;
  const subtitle = settings.subtitle ?? FAQ_TWO_COLUMN_ACCORDION_DEFAULTS.subtitle;
  const ctaText = settings.ctaText ?? FAQ_TWO_COLUMN_ACCORDION_DEFAULTS.ctaText;
  const ctaUrl = settings.ctaUrl ?? FAQ_TWO_COLUMN_ACCORDION_DEFAULTS.ctaUrl;

  const faqs: Home2FaqItem[] =
    Array.isArray(settings.faqs) && settings.faqs.length > 0
      ? settings.faqs
      : FAQ_TWO_COLUMN_ACCORDION_DEFAULTS.faqs;

  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [hoveredFaq, setHoveredFaq] = useState<number | null>(null);

  // Inject FAQPage JSON-LD structured data
  useEffect(() => {
    if (faqs.length === 0) return;
    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer,
        },
      })),
    };

    const existing = document.getElementById('json-ld-home2-faqs');
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'json-ld-home2-faqs';
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);
    return () => {
      const node = document.getElementById('json-ld-home2-faqs');
      if (node) node.remove();
    };
  }, [faqs]);

  const handleCtaClick = () => {
    const clean = (ctaUrl || '/contact-us').replace(/^\/+|\/+$/g, '');
    if (ctaUrl.startsWith('http://') || ctaUrl.startsWith('https://')) {
      window.open(ctaUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    setCurrentPage((clean || 'contact-us') as any);
  };

  return (
    <section className="bg-white py-14 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Expandable FAQ Accordion Items with Hover Slide & Soft Pink Icon Badge */}
          <div className="lg:col-span-7 space-y-3 order-2 lg:order-1">
            {faqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              const isHovered = hoveredFaq === idx;
              return (
                <motion.div
                  key={`${faq.question}-${idx}`}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.34, delay: idx * 0.05 }}
                  onMouseEnter={() => setHoveredFaq(idx)}
                  onMouseLeave={() => setHoveredFaq(null)}
                  className={`rounded-2xl border overflow-hidden transition-colors ${
                    isOpen
                      ? 'bg-[#FDF2F8]/35 border-[#E6007E]/45 shadow-2xs'
                      : 'bg-white border-slate-200/90 hover:border-[#E6007E]/35'
                  }`}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full px-5 sm:px-6 py-4 sm:py-5 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                  >
                    <motion.span
                      animate={{ x: isHovered ? 4 : 0 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                      className={`text-sm sm:text-base font-bold leading-snug transition-colors ${
                        isHovered || isOpen ? 'text-[#E6007E]' : 'text-[#0B0D12]'
                      }`}
                    >
                      {faq.question}
                    </motion.span>
                    <motion.span
                      animate={{
                        rotate: isOpen ? 45 : isHovered ? 12 : 0,
                      }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isOpen || isHovered
                          ? 'bg-[#FDF2F8] text-[#E6007E]'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 sm:px-6 pb-5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed">
                          <div className="pt-2.5 border-t border-slate-200/70">
                            {faq.answer}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Right Column: Sticky Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.42, delay: 0.08 }}
            className="lg:col-span-5 lg:sticky lg:top-24 order-1 lg:order-2"
          >
            <div className="bg-[#F8FAFC] rounded-3xl border border-slate-200/90 p-6 sm:p-8 space-y-4">
              <div className="w-11 h-11 rounded-2xl bg-[#FDF2F8] border border-[#E6007E]/15 text-[#E6007E] flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>

              {eyebrow && (
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[#E6007E]">
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
                <p className="text-sm text-slate-600 leading-relaxed">
                  {subtitle}
                </p>
              )}

              {ctaText && (
                <div className="pt-2">
                  <motion.button
                    type="button"
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCtaClick}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0B0D12] hover:bg-[#E6007E] text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>{ctaText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FaqTwoColumnAccordionWidget;
