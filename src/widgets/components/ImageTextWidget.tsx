import React from 'react';
import { WidgetRenderProps } from '../types';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ImageTextWidget: React.FC<WidgetRenderProps> = ({ settings }) => {
  const { setCurrentPage } = useApp();
  const isImageRight = settings.imagePosition === 'right';

  const handleLink = (link?: string) => {
    if (!link) return;
    if (link.startsWith('http')) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      const pageSlug = link.replace(/^\//, '') as any;
      setCurrentPage(pageSlug || 'home');
    }
  };

  return (
    <section className="py-16 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-12 items-center ${isImageRight ? '' : 'lg:flex-row-reverse'}`}>
          <div className={`lg:col-span-6 space-y-6 ${isImageRight ? 'order-1' : 'order-2'}`}>
            {settings.badge && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-pink-50 border border-pink-200 text-xs font-bold text-[#DF0C88]">
                {settings.badge}
              </span>
            )}

            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {settings.title || 'Excellence in Hardware Diagnostics & Micro-Soldering'}
            </h2>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {settings.description || 'Our dedicated technicians have spent over 10 years perfecting chip-level diagnostics, OLED calibration, and safe battery restorations.'}
            </p>

            {settings.buttonText && (
              <div className="pt-2">
                <button
                  onClick={() => handleLink(settings.buttonLink)}
                  className="px-6 py-3 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold text-sm shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer transition-all"
                >
                  <span>{settings.buttonText}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className={`lg:col-span-6 ${isImageRight ? 'order-2' : 'order-1'}`}>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 aspect-4/3 sm:aspect-16/10">
              <img
                src={settings.image || '/src/assets/images/hero_repair_specialist_1790843562093.jpg'}
                alt={settings.title || 'iRepair Mobiles'}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
