import React from 'react';
import { WidgetRenderProps } from '../types';
import { useApp } from '../../context/AppContext';
import { Sparkles, ArrowRight } from 'lucide-react';

export const BrandLogosStripWidget: React.FC<WidgetRenderProps> = ({ settings }) => {
  const { setShopBrandFilter, setCurrentPage, startRepairBooking } = useApp();

  const brands = [
    { id: 'apple', name: 'Apple iPhone', badge: 'Same-Day' },
    { id: 'samsung', name: 'Samsung Galaxy', badge: 'OEM Displays' },
    { id: 'google', name: 'Google Pixel', badge: 'Express Fix' },
    { id: 'huawei', name: 'Huawei', badge: 'Certified' },
    { id: 'xiaomi', name: 'Xiaomi / Redmi', badge: 'Parts Stocked' },
    { id: 'apple-laptop', name: 'Apple MacBook', badge: 'Logic Board' },
  ];

  return (
    <section className="bg-white border-y border-slate-200/80 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            {settings.heading || 'We Service & Stock All Major Brands'}
          </h2>
          {settings.subheading && (
            <p className="text-xs text-slate-400 mt-1">{settings.subheading}</p>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {brands.map((brand) => (
            <div
              key={brand.id}
              onClick={() => {
                startRepairBooking({ brand: brand.id });
              }}
              className="group p-3.5 rounded-xl border border-slate-200/90 hover:border-[#DF0C88]/40 bg-slate-50/70 hover:bg-pink-50/30 transition-all cursor-pointer flex flex-col items-center justify-center text-center shadow-xs hover:shadow-md"
            >
              <span className="text-xs font-bold text-slate-900 group-hover:text-[#DF0C88] transition-colors">
                {brand.name}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 mt-1 px-2 py-0.5 rounded-full bg-white border border-slate-200 group-hover:border-pink-200">
                {brand.badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
