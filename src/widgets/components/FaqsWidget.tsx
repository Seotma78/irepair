import React, { useState, useEffect } from 'react';
import { WidgetRenderProps } from '../types';
import { ChevronDown, Plus, Minus, HelpCircle } from 'lucide-react';

export const FaqsWidget: React.FC<WidgetRenderProps> = ({ settings }) => {
  const [faqs, setFaqs] = useState<any[]>(settings.faqs || []);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState<string>(settings.categoryFilter || 'all');

  useEffect(() => {
    if (settings.faqs && settings.faqs.length > 0) {
      setFaqs(settings.faqs);
      return;
    }

    fetch('/api/cms/collections/faqs')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFaqs(data);
        }
      })
      .catch(() => {});
  }, [settings.faqs]);

  const filteredFaqs = faqs.filter((f: any) => {
    if (activeCategory === 'all') return true;
    return f.category === activeCategory;
  });

  // Output FAQPage JSON-LD Schema
  useEffect(() => {
    if (!settings.outputSchema && settings.outputSchema !== undefined) return;
    if (filteredFaqs.length === 0) return;

    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: filteredFaqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer,
        },
      })),
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'json-ld-faqs';
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById('json-ld-faqs');
      if (existing) existing.remove();
    };
  }, [filteredFaqs, settings.outputSchema]);

  const categories = ['all', ...Array.from(new Set(faqs.map((f) => f.category).filter(Boolean)))];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#DF0C88] uppercase tracking-wider mb-2">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Got Questions?</span>
            <span aria-hidden="true">·</span>
            <span>Expert Assistance</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            {settings.title || 'Frequently Asked Questions'}
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            {settings.subtitle || 'Everything you need to know about our repair times, warranties, trade-ins, and parts quality'}
          </p>
        </div>

        {/* Category Segmented Filters if multiple categories exist */}
        {categories.length > 2 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3.5">
          {filteredFaqs.map((faq: any, idx: number) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={faq.id || idx}
                className={`rounded-2xl border transition-all ${
                  isOpen ? 'border-[#DF0C88]/40 bg-pink-50/20 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full py-4.5 px-6 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                >
                  <span className="font-bold text-sm sm:text-base text-slate-900">
                    {faq.question}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isOpen ? 'bg-[#DF0C88] text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-pink-100/60 mt-1">
                    <div dangerouslySetInnerHTML={{ __html: faq.answer }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
