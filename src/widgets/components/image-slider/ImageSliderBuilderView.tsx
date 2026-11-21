import React, { useState, useEffect } from 'react';
import { ImageSliderEditor } from './ImageSliderEditor';
import {
  ImageSliderConfig,
  DEFAULT_IMAGE_SLIDER_CONFIG,
} from './imageSliderTypes';
import {
  Sliders,
  Save,
  Check,
  Copy,
  Layers,
  Sparkles,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';

export const ImageSliderBuilderView: React.FC = () => {
  const [sliderConfig, setSliderConfig] = useState<ImageSliderConfig>(() => {
    try {
      const stored = localStorage.getItem('irepair_image_slider_builder_state');
      if (stored) {
        return { ...DEFAULT_IMAGE_SLIDER_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_IMAGE_SLIDER_CONFIG;
  });

  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('irepair_image_slider_builder_state', JSON.stringify(sliderConfig));
    } catch {
      // ignore
    }
  }, [sliderConfig]);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(sliderConfig, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetToDefault = () => {
    setSliderConfig(DEFAULT_IMAGE_SLIDER_CONFIG);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#DF0C88] to-pink-500 text-white flex items-center justify-center font-bold shadow-md">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Image Slider Builder &amp; Studio
            </h1>
            <p className="text-xs text-slate-500">
              Configure multi-device images (<code className="text-[#DF0C88]">&lt;picture&gt;</code>), responsive breakpoints, and visual styling.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleCopyJson}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied JSON!' : 'Copy Config'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saved ? 'Saved Draft!' : 'Save Preset'}</span>
          </button>
        </div>
      </div>

      {/* Editor Component with Live Preview */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs">
        <ImageSliderEditor
          values={sliderConfig}
          onChange={(updated) => setSliderConfig(updated)}
        />
      </div>
    </div>
  );
};
