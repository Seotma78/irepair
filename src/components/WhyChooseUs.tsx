import React from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  Zap, 
  Lock, 
  ArrowRight, 
  Clock, 
  CheckCircle2,
  Star
} from 'lucide-react';

export interface WhyChooseUsProps {
  onExploreServices?: () => void;
  className?: string;
}

export const WhyChooseUs: React.FC<WhyChooseUsProps> = ({ 
  onExploreServices,
  className = '' 
}) => {
  const handleCtaClick = () => {
    if (onExploreServices) {
      onExploreServices();
    } else {
      const servicesSection = document.getElementById('services-section');
      if (servicesSection) {
        servicesSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.location.hash = '#services';
      }
    }
  };

  const pillars = [
    {
      icon: Clock,
      kicker: 'Speed & Convenience',
      title: '30-Minute Express Turnaround',
      description: 'Over 85% of standard smartphone screen and battery replacements are completed on-site within 30 minutes. Drop in during your lunch break or shopping trip.',
      highlights: ['Same-day walk-in service', 'No booking strictly required', 'Live status updates'],
    },
    {
      icon: ShieldCheck,
      kicker: 'Warranty Backed',
      title: 'Official 6-Month UK Guarantee',
      description: 'Every replacement component is rigorous testing-certified and covered by our comprehensive 6-month written warranty on parts and labor.',
      highlights: ['Direct in-store exchange', 'Genuine & OEM-grade parts', 'Zero hidden fees'],
    },
    {
      icon: Cpu,
      kicker: 'Zero Risk Promise',
      title: '100% No Fix, No Fee Policy',
      description: 'If our master micro-soldering engineers and diagnostic specialists cannot resolve your hardware fault, you pay absolutely nothing. Free initial inspection.',
      highlights: ['Free initial diagnosis', 'Complete transparency', 'Honest repair advice'],
    },
    {
      icon: Lock,
      kicker: 'Security Guaranteed',
      title: 'Zero-Wipe Data Privacy Protocol',
      description: 'Unlike official manufacturer centers that routinely erase your device, our technicians prioritize preserving your photos, messages, apps, and accounts.',
      highlights: ['Personal data remains intact', 'Strict confidentiality', 'No cloud wipe required'],
    },
  ];

  const metrics = [
    { value: '150k+', label: 'Devices Restored', sub: 'Across England since 2011' },
    { value: '8', label: 'High Street Stores', sub: 'Norwich, Basingstoke, Southend & more' },
    { value: '4.9/5', label: 'Customer Rating', sub: 'Over 12,000+ verified UK reviews' },
    { value: '30m', label: 'Avg. Screen Fix Time', sub: 'Walk in anytime, walk out fixed' },
  ];

  return (
    <section 
      id="why-choose-us"
      className={`w-full py-16 lg:py-24 bg-slate-900 text-slate-100 border-y border-slate-800 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header with Clean Unboxed Kicker */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-12 border-b border-slate-800">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#DF0C88] uppercase tracking-wider">
              <span>Engineering Excellence</span>
              <span aria-hidden="true">·</span>
              <span>British High Street Standards</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight font-heading">
              Why 150,000+ UK Customers Trust iRepair Mobiles
            </h2>
            <p className="text-base text-slate-400 leading-relaxed">
              We combine hospital-clean component diagnostics with high street convenience. Real technicians, genuine parts, and transparent pricing.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={handleCtaClick}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#DF0C88] hover:bg-[#c50875] text-white text-sm font-bold shadow-lg shadow-[#DF0C88]/20 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <span>Explore All Repair Services</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Core Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-12">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div 
                key={idx}
                className="group relative bg-slate-800/60 hover:bg-slate-800/90 rounded-2xl p-7 border border-slate-700/60 hover:border-slate-600 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-[#DF0C88] shadow-sm group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      0{idx + 1}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-[#DF0C88] mb-1">
                    {pillar.kicker}
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2.5 group-hover:text-pink-100 transition-colors">
                    {pillar.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                    {pillar.description}
                  </p>
                </div>

                <ul className="space-y-2 pt-4 border-t border-slate-700/60 text-xs text-slate-300 font-medium">
                  {pillar.highlights.map((h, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#DF0C88] shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Bottom Credibility Metrics Banner */}
        <div className="mt-12 rounded-2xl bg-slate-800/40 border border-slate-800 p-6 sm:p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-800">
            {metrics.map((metric, idx) => (
              <div key={idx} className={`pt-4 md:pt-0 ${idx > 0 ? 'md:px-4' : 'md:pr-4'}`}>
                <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading tabular-nums">
                  {metric.value}
                </div>
                <div className="text-sm font-bold text-slate-200 mt-1">
                  {metric.label}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {metric.sub}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default WhyChooseUs;
