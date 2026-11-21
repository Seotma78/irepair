import React, { useState, useEffect } from 'react';
import { WidgetRenderProps } from '../types';
import { Smartphone, MapPin, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Smartphone,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
};

export const HowItWorksWidget: React.FC<WidgetRenderProps> = ({ settings }) => {
  const [steps, setSteps] = useState<any[]>(settings.steps || []);

  useEffect(() => {
    if (settings.steps && settings.steps.length > 0) {
      setSteps(settings.steps);
      return;
    }

    // Otherwise fetch from collection
    fetch('/api/cms/collections/steps')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSteps(data);
        }
      })
      .catch(() => {});
  }, [settings.steps]);

  const fallbackSteps = [
    { step_number: 1, title: 'Select Device & Fault', description: 'Choose your phone, laptop, or tablet to get guaranteed transparent pricing.', icon_name: 'Smartphone' },
    { step_number: 2, title: 'Walk-In or Free Mail-In', description: 'Visit any of our 8 UK branches or use our prepaid tracked Royal Mail pack.', icon_name: 'MapPin' },
    { step_number: 3, title: '30-Minute Precision Fix', description: 'Certified engineers restore your device with genuine OEM-specification components.', icon_name: 'Clock' },
    { step_number: 4, title: '6-Month Warranty & Return', description: 'Collect in store or get tracked courier return backed by 6-Month Guarantee.', icon_name: 'ShieldCheck' },
  ];

  const displaySteps = steps.length > 0 ? steps : fallbackSteps;

  return (
    <section className="py-16 bg-slate-50 border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-[#DF0C88] px-3 py-1 rounded-full bg-pink-100/70 inline-block mb-2">
            Seamless Experience
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {settings.title || 'How iRepair Mobiles Works'}
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            {settings.subtitle || 'From cracked glass to good-as-new in four simple transparent steps'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {displaySteps.map((step: any, idx: number) => {
            const Icon = iconMap[step.icon_name || step.icon] || CheckCircle2;
            return (
              <div
                key={idx}
                className="relative bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-lg transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-pink-50 border border-pink-100 text-[#DF0C88] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#DF0C88] group-hover:text-white transition-all">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-2xl font-black text-slate-200 group-hover:text-pink-300 transition-colors">
                    0{step.step_number || idx + 1}
                  </span>
                </div>

                <h3 className="font-bold text-base text-slate-900 mb-2">{step.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
