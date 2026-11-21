import React from 'react';
import { WIDGET_REGISTRY } from '../../widgets/registry';
import { Layers, Code, CheckCircle2, Box, Smartphone, SlidersHorizontal } from 'lucide-react';

interface WidgetsExplorerViewProps {
  onNavigate?: (module: string) => void;
}

export const WidgetsExplorerView: React.FC<WidgetsExplorerViewProps> = ({ onNavigate }) => {
  const widgets = Object.values(WIDGET_REGISTRY);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Widget Library & Registry</h1>
          <p className="text-xs text-slate-500 mt-1">
            Explore all modular section components available to pages across the website.
          </p>
        </div>
        {onNavigate && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('slider_builder')}
              className="px-4 py-2 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Image Slider Studio</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('marquee_builder')}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-[#DF0C88]" />
              <span>Brand Marquee</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('grid_builder')}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Box className="w-4 h-4" />
              <span>Grid Builder</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {widgets.map((w) => {
          const isHome2Modular = [
            'hero_split_quick_quote',
            'quick_service_cards_strip',
            'tabbed_devices_carousel',
            'process_steps_modern',
            'why_choose_us_metrics_dark',
            'reviews_carousel_modern',
            'store_locations_with_tracker',
            'faq_two_column_accordion',
          ].includes(w.type);
          const isFeatured =
            isHome2Modular ||
            w.type === 'category_editorial_rail' ||
            w.type === 'image_slider' ||
            w.type === 'mobile_phone_brands_marquee' ||
            w.type === 'dynamic_product_grid';
          return (
          <div
            key={w.type}
            className={`bg-white rounded-3xl p-6 border shadow-xs flex flex-col justify-between space-y-4 ${
              isFeatured ? 'border-[#DF0C88]/40 ring-2 ring-pink-500/10' : 'border-slate-200/90'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#DF0C88] bg-pink-50 px-2 py-0.5 rounded-full font-bold">
                  {w.category}
                </span>
                <span className="text-[11px] font-mono text-slate-400">{w.type}</span>
              </div>

              <h3 className="font-bold text-base text-slate-900 mb-1 flex items-center gap-2 flex-wrap">
                {w.title}
                {isFeatured && (
                  <span className="text-[9px] bg-pink-100 text-[#DF0C88] font-bold px-1.5 py-0.5 rounded uppercase">
                    {isHome2Modular ? 'Home-2 Modular' : 'New'}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">{w.description}</p>

              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-600 block mb-2">Schema Fields ({w.schema.length}):</span>
                <div className="flex flex-wrap gap-1">
                  {w.schema.map((f) => (
                    <span key={f.name} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">
                      {f.name}: {f.type}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active in Registry</span>
              </span>

              {w.type === 'image_slider' && onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('slider_builder')}
                  className="text-xs font-bold text-[#DF0C88] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Studio &rarr;</span>
                </button>
              )}

              {w.type === 'mobile_phone_brands_marquee' && onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('marquee_builder')}
                  className="text-xs font-bold text-[#DF0C88] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Build & Customise &rarr;</span>
                </button>
              )}

              {w.type === 'dynamic_product_grid' && onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('grid_builder')}
                  className="text-xs font-bold text-[#DF0C88] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Configure &rarr;</span>
                </button>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};
