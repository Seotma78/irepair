import React from 'react';
import { WidgetRenderProps } from '../types';
import { Clock, ShieldCheck, Award, Truck, Wrench, Sparkles, CheckCircle2 } from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Clock,
  ShieldCheck,
  Award,
  Truck,
  Wrench,
  Sparkles,
  CheckCircle2,
};

export const FeaturesGridWidget: React.FC<WidgetRenderProps> = ({ settings }) => {
  const items = settings.items && settings.items.length > 0 ? settings.items : [
    { icon: 'Clock', title: '30-Minute Repairs', text: 'Fastest turnaround on high street. Walk in or book online.' },
    { icon: 'ShieldCheck', title: '6-Month Warranty', text: 'Peace of mind warranty on all parts and labour fitted.' },
    { icon: 'Award', title: 'No Fix, No Fee', text: 'Zero charge if we cannot diagnose or restore your device.' },
    { icon: 'Truck', title: 'Free Royal Mail Postal', text: 'Prepaid tracked postal repair with insured return shipping.' },
  ];

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item: any, idx: number) => {
            const Icon = iconMap[item.icon] || CheckCircle2;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-pink-200 hover:bg-pink-50/20 transition-all flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-pink-100/70 text-[#DF0C88] flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
