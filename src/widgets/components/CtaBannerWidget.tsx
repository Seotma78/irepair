import React from 'react';
import { WidgetRenderProps } from '../types';
import { useApp } from '../../context/AppContext';
import { ArrowRight, Wrench, ShieldCheck, MapPin } from 'lucide-react';

export const CtaBannerWidget: React.FC<WidgetRenderProps> = ({ settings }) => {
  const { setCurrentPage, startRepairBooking } = useApp();

  const handleLink = (link?: string) => {
    if (!link) return;
    if (link.startsWith('http')) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      const pageSlug = link.replace(/^\//, '') as any;
      if (pageSlug === 'book-repair') {
        startRepairBooking();
      } else {
        setCurrentPage(pageSlug || 'home');
      }
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="relative rounded-3xl bg-slate-950 p-8 sm:p-12 lg:p-16 text-white overflow-hidden shadow-2xl">
        {/* Rich Photographic Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/repairs/screen_replacement.jpg" 
            alt="Electronics Repair Specialist at iRepair Mobiles" 
            className="w-full h-full object-cover object-right opacity-35"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/30" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="flex items-center gap-2 text-xs font-bold text-pink-300 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-[#DF0C88]" />
            <span>UK Premier Express Electronics Lab</span>
            <span aria-hidden="true">·</span>
            <span>8 High Street Branches</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            {settings.headline || 'Ready to Bring Your Broken Device Back to Life?'}
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {settings.subheadline || 'Book online in 60 seconds or drop into any of our 8 UK high street branches today. 100% No Fix, No Fee Guarantee.'}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => handleLink(settings.primaryButtonLink || '/book-repair')}
              className="px-6 py-3.5 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold text-sm sm:text-base shadow-xl shadow-[#DF0C88]/30 flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <span>{settings.primaryButtonText || 'Book an Express Repair'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {settings.secondaryButtonText && (
              <button
                onClick={() => handleLink(settings.secondaryButtonLink || '/locations')}
                className="px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-semibold text-sm sm:text-base hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                {settings.secondaryButtonText}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
