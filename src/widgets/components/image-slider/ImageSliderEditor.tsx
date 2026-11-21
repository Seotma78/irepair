import React, { useState, useMemo } from 'react';
import {
  ImageSliderConfig,
  SlideItem,
  DeviceMode,
  ResponsiveValue,
  DEFAULT_IMAGE_SLIDER_CONFIG,
  SLIDER_PRESETS,
  calculateContrastRatio,
  hasResponsiveOverride,
} from './imageSliderTypes';
import { ImageSliderWidget } from '../ImageSliderWidget';
import { MediaPickerModal } from '../../../admin/components/MediaPickerModal';
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCcw,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Video,
  Sliders,
  Layout,
  Play,
  Navigation,
  Palette,
  Sparkles,
  Code,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Info,
  Maximize2,
  Calendar,
  Layers,
  Settings,
  Move,
} from 'lucide-react';

interface ImageSliderEditorProps {
  values: Partial<ImageSliderConfig>;
  onChange: (updated: ImageSliderConfig) => void;
}

export const ImageSliderEditor: React.FC<ImageSliderEditorProps> = ({
  values,
  onChange,
}) => {
  // Merge with defaults
  const config: ImageSliderConfig = useMemo(() => {
    return {
      ...DEFAULT_IMAGE_SLIDER_CONFIG,
      ...values,
      slides: Array.isArray(values?.slides) && values.slides.length > 0
        ? values.slides
        : DEFAULT_IMAGE_SLIDER_CONFIG.slides,
      arrows: { ...DEFAULT_IMAGE_SLIDER_CONFIG.arrows, ...(values?.arrows || {}) },
      pagination: { ...DEFAULT_IMAGE_SLIDER_CONFIG.pagination, ...(values?.pagination || {}) },
      thumbnails: { ...DEFAULT_IMAGE_SLIDER_CONFIG.thumbnails, ...(values?.thumbnails || {}) },
      scrollbar: { ...DEFAULT_IMAGE_SLIDER_CONFIG.scrollbar, ...(values?.scrollbar || {}) },
      playPauseButton: { ...DEFAULT_IMAGE_SLIDER_CONFIG.playPauseButton, ...(values?.playPauseButton || {}) },
      counter: { ...DEFAULT_IMAGE_SLIDER_CONFIG.counter, ...(values?.counter || {}) },
      autoplay: { ...DEFAULT_IMAGE_SLIDER_CONFIG.autoplay, ...(values?.autoplay || {}) },
      kenBurns: { ...DEFAULT_IMAGE_SLIDER_CONFIG.kenBurns, ...(values?.kenBurns || {}) },
      container: { ...DEFAULT_IMAGE_SLIDER_CONFIG.container, ...(values?.container || {}) },
      slideStyle: { ...DEFAULT_IMAGE_SLIDER_CONFIG.slideStyle, ...(values?.slideStyle || {}) },
      typography: {
        ...DEFAULT_IMAGE_SLIDER_CONFIG.typography,
        ...(values?.typography || {}),
        headingSize: values?.typography?.headingSize || DEFAULT_IMAGE_SLIDER_CONFIG.typography.headingSize,
        subheadingSize: values?.typography?.subheadingSize || DEFAULT_IMAGE_SLIDER_CONFIG.typography.subheadingSize,
        descriptionSize: values?.typography?.descriptionSize || DEFAULT_IMAGE_SLIDER_CONFIG.typography.descriptionSize,
      },
      buttonsStyle: { ...DEFAULT_IMAGE_SLIDER_CONFIG.buttonsStyle, ...(values?.buttonsStyle || {}) },
      entranceAnimation: { ...DEFAULT_IMAGE_SLIDER_CONFIG.entranceAnimation, ...(values?.entranceAnimation || {}) },
    };
  }, [values]);

  // Active Device for Responsive Editing & Preview
  const [activeDevice, setActiveDevice] = useState<DeviceMode>('desktop');
  const [activeTab, setActiveTab] = useState<'slides' | 'layout' | 'behaviour' | 'navigation' | 'style' | 'presets' | 'advanced'>('slides');

  // Media Picker state
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [bulkMediaPickerOpen, setBulkMediaPickerOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<{ slideIdx: number; device: DeviceMode; field?: 'image' | 'poster' } | null>(null);

  // Expanded slide accordion in slides tab
  const [expandedSlideIdx, setExpandedSlideIdx] = useState<number>(0);

  // Preset custom save state
  const [customPresetName, setCustomPresetName] = useState('');
  const [savedCustomPresets, setSavedCustomPresets] = useState<Record<string, Partial<ImageSliderConfig>>>(() => {
    try {
      const stored = localStorage.getItem('irepair_slider_custom_presets');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const updateConfig = (newPartial: Partial<ImageSliderConfig>) => {
    onChange({
      ...config,
      ...newPartial,
    });
  };

  // Helper to update a responsive field for the currently selected activeDevice
  const updateResponsiveField = <T,>(
    path: keyof ImageSliderConfig,
    subPath: string | null,
    val: T
  ) => {
    if (subPath) {
      const parentObj = (config[path] as any) || {};
      const currentResp: ResponsiveValue<T> = parentObj[subPath] || { desktop: val };
      const updatedResp = {
        ...currentResp,
        [activeDevice]: val,
      };
      updateConfig({
        [path]: {
          ...parentObj,
          [subPath]: updatedResp,
        },
      } as any);
    } else {
      const currentResp = (config[path] as any) || { desktop: val };
      const updatedResp = {
        ...currentResp,
        [activeDevice]: val,
      };
      updateConfig({
        [path]: updatedResp,
      } as any);
    }
  };

  // Helper to reset a responsive field override for activeDevice (inherits from higher)
  const resetResponsiveField = (path: keyof ImageSliderConfig, subPath: string | null) => {
    if (activeDevice === 'desktop') return; // Cannot reset base desktop
    if (subPath) {
      const parentObj = (config[path] as any) || {};
      const currentResp = { ...(parentObj[subPath] || {}) };
      delete currentResp[activeDevice];
      updateConfig({
        [path]: {
          ...parentObj,
          [subPath]: currentResp,
        },
      } as any);
    } else {
      const currentResp = { ...((config[path] as any) || {}) };
      delete currentResp[activeDevice];
      updateConfig({
        [path]: currentResp,
      } as any);
    }
  };

  // Slide management
  const updateSlide = (idx: number, updated: Partial<SlideItem>) => {
    const newSlides = [...config.slides];
    newSlides[idx] = { ...newSlides[idx], ...updated };
    updateConfig({ slides: newSlides });
  };

  const handleAddSlide = () => {
    const newSlide: SlideItem = {
      id: `slide_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      title: 'NEW PROMOTIONAL SLIDE',
      subtitle: 'Highlight your latest offer or device repair services',
      description: 'Add a high resolution banner image with custom buttons and responsive positioning.',
      badge: 'Special Announcement',
      badgeColor: '#DF0C88',
      badgeBg: 'rgba(255, 255, 255, 0.9)',
      useH1: false,
      images: {
        desktop: '/src/assets/images/hero_repair_specialist_1790843562093.jpg',
      },
      altText: 'Promotional announcement banner',
      focalPoints: {
        desktop: { x: 50, y: 50 },
      },
      showContent: true,
      contentPosition: {
        desktop: 'center-left',
        tablet: 'center-left',
        mobile: 'bottom-center',
      },
      showTextOverlay: {
        desktop: true,
        tablet: true,
        mobile: true,
      },
      textAlignment: {
        desktop: 'left',
        tablet: 'left',
        mobile: 'center',
      },
      maxContentWidth: {
        desktop: 640,
        tablet: 560,
        mobile: 420,
      },
      titleColor: '#ffffff',
      subtitleColor: '#fce7f3',
      descriptionColor: '#e2e8f0',
      overlayColor: '#020617',
      overlayOpacity: 0.35,
      overlayGradient: 'left_fade',
      buttons: [
        {
          id: 'btn-1',
          text: 'Explore Deals',
          link: '/shop',
          style: 'primary',
          icon: 'ShoppingBag',
        },
      ],
      visibility: {
        desktop: true,
        tablet: true,
        mobile: true,
      },
    };

    updateConfig({ slides: [...config.slides, newSlide] });
    setExpandedSlideIdx(config.slides.length);
  };

  const handleBulkAddSlides = (items: Array<{ url: string; altText?: string }>) => {
    if (!items || items.length === 0) return;
    const newSlides: SlideItem[] = items.map((item, idx) => ({
      id: `slide_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
      title: item.altText ? item.altText.toUpperCase() : `PROMO SLIDE #${config.slides.length + idx + 1}`,
      subtitle: 'Official Hardware Warranty & Fast Turnaround',
      description: 'High quality genuine parts fitted by certified repair engineers across 8 UK stores.',
      badge: 'Certified iRepair Special',
      badgeColor: '#DF0C88',
      badgeBg: 'rgba(255, 255, 255, 0.9)',
      useH1: false,
      images: {
        desktop: item.url,
        tablet: item.url,
        mobile: item.url,
      },
      altText: item.altText || 'Promotional slide image',
      focalPoints: { desktop: { x: 50, y: 50 } },
      showContent: true,
      contentPosition: { desktop: 'center-left', tablet: 'center-left', mobile: 'bottom-center' },
      showTextOverlay: { desktop: true, tablet: true, mobile: true },
      textAlignment: { desktop: 'left', tablet: 'left', mobile: 'center' },
      maxContentWidth: { desktop: 640, tablet: 560, mobile: 420 },
      titleColor: '#ffffff',
      subtitleColor: '#fce7f3',
      descriptionColor: '#e2e8f0',
      overlayColor: '#020617',
      overlayOpacity: 0.35,
      overlayGradient: 'left_fade',
      buttons: [
        { id: `btn_${Date.now()}_${idx}`, text: 'Explore Now', link: '/shop', style: 'primary' },
      ],
      visibility: { desktop: true, tablet: true, mobile: true },
    }));

    updateConfig({ slides: [...config.slides, ...newSlides] });
    setExpandedSlideIdx(config.slides.length);
  };

  const handleDuplicateSlide = (idx: number) => {
    const target = config.slides[idx];
    if (!target) return;
    const duplicated: SlideItem = {
      ...JSON.parse(JSON.stringify(target)),
      id: `slide_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      title: `${target.title} (Copy)`,
    };
    const newSlides = [...config.slides];
    newSlides.splice(idx + 1, 0, duplicated);
    updateConfig({ slides: newSlides });
    setExpandedSlideIdx(idx + 1);
  };

  const handleDeleteSlide = (idx: number) => {
    if (config.slides.length <= 1) {
      alert('Slider must have at least one slide.');
      return;
    }
    const newSlides = config.slides.filter((_, i) => i !== idx);
    updateConfig({ slides: newSlides });
    setExpandedSlideIdx(Math.max(0, idx - 1));
  };

  const handleMoveSlide = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= config.slides.length) return;
    const list = [...config.slides];
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    updateConfig({ slides: list });
    setExpandedSlideIdx(targetIdx);
  };

  // Open Media Picker for specific slide & device
  const handleOpenMedia = (slideIdx: number, dev: DeviceMode, field: 'image' | 'poster' = 'image') => {
    setMediaTarget({ slideIdx, device: dev, field });
    setMediaPickerOpen(true);
  };

  const handleMediaSelect = (url: string, altText?: string) => {
    if (!mediaTarget) return;
    const slide = config.slides[mediaTarget.slideIdx];
    if (!slide) return;

    if (mediaTarget.field === 'poster') {
      updateSlide(mediaTarget.slideIdx, { videoPoster: url });
    } else {
      const updatedImages = {
        ...slide.images,
        [mediaTarget.device]: url,
      };
      updateSlide(mediaTarget.slideIdx, {
        images: updatedImages,
        altText: slide.altText || altText || '',
      });
    }
    setMediaTarget(null);
  };

  // WCAG & SEO Warnings
  const activeSlide = config.slides[expandedSlideIdx] || config.slides[0];
  const contrastRatio = useMemo(() => {
    if (!activeSlide) return 7;
    const fg = activeSlide.titleColor || '#ffffff';
    const bg = activeSlide.overlayColor || '#020617';
    const op = activeSlide.overlayOpacity !== undefined ? activeSlide.overlayOpacity : 0.35;
    return calculateContrastRatio(fg, bg, op);
  }, [activeSlide]);

  const missingAltCount = useMemo(() => {
    return config.slides.filter(s => !s.altText || s.altText.trim() === '').length;
  }, [config.slides]);

  // Presets
  const applyPreset = (presetName: string) => {
    const preset = SLIDER_PRESETS[presetName] || savedCustomPresets[presetName];
    if (!preset) return;
    updateConfig({
      ...preset,
      activePreset: presetName,
    });
  };

  const handleSaveCustomPreset = () => {
    if (!customPresetName.trim()) return;
    const newCustoms = {
      ...savedCustomPresets,
      [customPresetName.trim()]: {
        layoutMode: config.layoutMode,
        heightMode: config.heightMode,
        fixedHeight: config.fixedHeight,
        aspectRatio: config.aspectRatio,
        slidesPerView: config.slidesPerView,
        spaceBetween: config.spaceBetween,
        transitionEffect: config.transitionEffect,
        transitionSpeed: config.transitionSpeed,
        arrows: config.arrows,
        pagination: config.pagination,
        slideStyle: config.slideStyle,
        typography: config.typography,
        buttonsStyle: config.buttonsStyle,
      },
    };
    setSavedCustomPresets(newCustoms);
    try {
      localStorage.setItem('irepair_slider_custom_presets', JSON.stringify(newCustoms));
    } catch (e) {
      console.warn(e);
    }
    setCustomPresetName('');
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP RESPONSIVE DEVICE SWITCHER & LIVE PREVIEW BAR */}
      <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#DF0C88] flex items-center justify-center font-bold text-white shadow-md">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-tight">Image Slider Configurator</h3>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold">
                Responsive v2.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Editing for <strong className="text-pink-400 uppercase">{activeDevice}</strong> mode • {config.slides.length} Slides active
            </p>
          </div>
        </div>

        {/* Device Switcher (Desktop, Tablet, Mobile) */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-800 rounded-2xl border border-slate-700">
          <button
            type="button"
            onClick={() => setActiveDevice('desktop')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeDevice === 'desktop'
                ? 'bg-[#DF0C88] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop (≥1024px)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveDevice('tablet')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeDevice === 'tablet'
                ? 'bg-[#DF0C88] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span>Tablet (768-1023px)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveDevice('mobile')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeDevice === 'mobile'
                ? 'bg-[#DF0C88] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile (&lt;768px)</span>
          </button>
        </div>
      </div>

      {/* 2. REAL-TIME LIVE PREVIEW PANEL (MATCHING DEVICE WIDTH) */}
      <div className="bg-slate-100/90 rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-inner space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Interactive Live Preview ({activeDevice.toUpperCase()})</span>
            <span className="text-slate-400 font-normal">
              — {activeDevice === 'desktop' ? '100% full width' : activeDevice === 'tablet' ? '768px' : '375px'}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Slide {expandedSlideIdx + 1} of {config.slides.length}
          </span>
        </div>

        {/* Device Frame */}
        <div className="flex justify-center w-full overflow-hidden">
          <div
            className="transition-all duration-300 rounded-2xl overflow-hidden shadow-2xl bg-white border border-slate-300/80"
            style={{
              width:
                activeDevice === 'desktop' ? '100%' :
                activeDevice === 'tablet' ? '768px' :
                '375px',
            }}
          >
            <ImageSliderWidget
              settings={config}
              commonSettings={{ containerWidth: 'full' }}
              isPreview={true}
            />
          </div>
        </div>
      </div>

      {/* 3. WCAG CONTRAST & SEO WARNING BANNERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {contrastRatio < 4.5 && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">WCAG Contrast Warning (Ratio: {contrastRatio.toFixed(1)}:1)</strong>
              <span>
                Slide #{expandedSlideIdx + 1} text over background image does not meet WCAG AA standard (4.5:1). Consider increasing slide overlay opacity or choosing a darker overlay color.
              </span>
            </div>
          </div>
        )}

        {missingAltCount > 0 && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-900">
            <Info className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">SEO & Accessibility Warning</strong>
              <span>
                {missingAltCount} slide(s) missing descriptive Alt Text. Search engines require alt text for optimal indexing and screen readers.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4. CONFIGURATION TABS NAVIGATION */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { id: 'slides', label: '1. Slides & Content', icon: Layers },
          { id: 'layout', label: '2. Responsive Layout', icon: Layout },
          { id: 'behaviour', label: '3. Behaviour & Effects', icon: Play },
          { id: 'navigation', label: '4. Arrows & Pagination', icon: Navigation },
          { id: 'style', label: '5. Styling & Typography', icon: Palette },
          { id: 'presets', label: '6. Design Presets', icon: Sparkles },
          { id: 'advanced', label: '7. Breakpoints & CSS', icon: Code },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#DF0C88] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 5. TAB 1: SLIDES & CONTENT */}
      {activeTab === 'slides' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-slate-900">Slides List (Repeatable & Reorderable)</h4>
              <p className="text-xs text-slate-500">
                Configure device-specific images (<code className="text-[#DF0C88]">&lt;picture&gt;</code>), focal points, content, and CTA buttons.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setBulkMediaPickerOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                <span>Bulk Add from Library</span>
              </button>
              <button
                type="button"
                onClick={handleAddSlide}
                className="px-4 py-2 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Slide</span>
              </button>
            </div>
          </div>

          {/* Slides Accordion List */}
          <div className="space-y-3">
            {config.slides.map((slide, sIdx) => {
              const isExpanded = expandedSlideIdx === sIdx;
              return (
                <div
                  key={slide.id || sIdx}
                  className={`bg-white rounded-3xl border transition-all ${
                    isExpanded ? 'border-[#DF0C88]/50 shadow-md ring-2 ring-pink-500/10' : 'border-slate-200 shadow-2xs'
                  }`}
                >
                  {/* Slide Card Header */}
                  <div
                    onClick={() => setExpandedSlideIdx(isExpanded ? -1 : sIdx)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 rounded-3xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Image Thumbnail */}
                      <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                        {slide.images.desktop ? (
                          <img src={slide.images.desktop} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {sIdx + 1}
                          </span>
                          <h5 className="font-bold text-xs text-slate-900 truncate">
                            {slide.title || `Slide #${sIdx + 1}`}
                          </h5>
                          {slide.mediaType === 'video' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold uppercase">
                              Video
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {slide.subtitle || slide.altText || 'No description entered'}
                        </p>
                      </div>
                    </div>

                    {/* Actions & Reorder Arrows */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={sIdx === 0}
                        onClick={() => handleMoveSlide(sIdx, 'up')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        title="Move up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={sIdx === config.slides.length - 1}
                        onClick={() => handleMoveSlide(sIdx, 'down')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        title="Move down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateSlide(sIdx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Duplicate slide"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSlide(sIdx)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                        title="Delete slide"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-px h-4 bg-slate-200 mx-1" />
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </div>
                  </div>

                  {/* Expanded Slide Detail Settings */}
                  {isExpanded && (
                    <div className="p-5 border-t border-slate-100 space-y-6 bg-slate-50/40 rounded-b-3xl">
                      {/* A) IMAGES PER DEVICE (Core Requirement) */}
                      <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-[#DF0C88]" />
                            <h6 className="font-bold text-xs text-slate-900">
                              Device-Specific Images (Downloaded ONLY for matching screen size)
                            </h6>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">HTML &lt;picture&gt;</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Desktop Image */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                <Monitor className="w-3.5 h-3.5 text-slate-500" />
                                <span>Desktop Image (Required)</span>
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={slide.images.desktop || ''}
                                onChange={(e) => updateSlide(sIdx, { images: { ...slide.images, desktop: e.target.value } })}
                                placeholder="/uploads/desktop.jpg"
                                className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#DF0C88]"
                              />
                              <button
                                type="button"
                                onClick={() => handleOpenMedia(sIdx, 'desktop')}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-[#DF0C88] text-white text-xs font-bold shrink-0 cursor-pointer transition-colors"
                              >
                                Pick
                              </button>
                            </div>
                            {/* Focal Point X, Y */}
                            <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] text-slate-500">
                              <div>
                                <label className="block">Focal X (%):</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={slide.focalPoints?.desktop?.x ?? 50}
                                  onChange={(e) => updateSlide(sIdx, {
                                    focalPoints: {
                                      ...slide.focalPoints,
                                      desktop: { x: parseInt(e.target.value) || 50, y: slide.focalPoints?.desktop?.y ?? 50 },
                                    },
                                  })}
                                  className="w-full text-xs bg-white border border-slate-200 rounded px-1.5 py-1"
                                />
                              </div>
                              <div>
                                <label className="block">Focal Y (%):</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={slide.focalPoints?.desktop?.y ?? 50}
                                  onChange={(e) => updateSlide(sIdx, {
                                    focalPoints: {
                                      ...slide.focalPoints,
                                      desktop: { x: slide.focalPoints?.desktop?.x ?? 50, y: parseInt(e.target.value) || 50 },
                                    },
                                  })}
                                  className="w-full text-xs bg-white border border-slate-200 rounded px-1.5 py-1"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Tablet Image */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                <Tablet className="w-3.5 h-3.5 text-slate-500" />
                                <span>Tablet Image (Optional)</span>
                              </span>
                              {!slide.images.tablet && (
                                <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                                  Inherits Desktop
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={slide.images.tablet || ''}
                                onChange={(e) => updateSlide(sIdx, { images: { ...slide.images, tablet: e.target.value } })}
                                placeholder="Falls back to Desktop"
                                className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#DF0C88]"
                              />
                              <button
                                type="button"
                                onClick={() => handleOpenMedia(sIdx, 'tablet')}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-[#DF0C88] text-white text-xs font-bold shrink-0 cursor-pointer transition-colors"
                              >
                                Pick
                              </button>
                            </div>
                            {/* Focal Point Tablet */}
                            <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] text-slate-500">
                              <div>
                                <label className="block">Focal X (%):</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={slide.focalPoints?.tablet?.x ?? 50}
                                  onChange={(e) => updateSlide(sIdx, {
                                    focalPoints: {
                                      ...slide.focalPoints,
                                      tablet: { x: parseInt(e.target.value) || 50, y: slide.focalPoints?.tablet?.y ?? 50 },
                                    },
                                  })}
                                  className="w-full text-xs bg-white border border-slate-200 rounded px-1.5 py-1"
                                />
                              </div>
                              <div>
                                <label className="block">Focal Y (%):</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={slide.focalPoints?.tablet?.y ?? 50}
                                  onChange={(e) => updateSlide(sIdx, {
                                    focalPoints: {
                                      ...slide.focalPoints,
                                      tablet: { x: slide.focalPoints?.tablet?.x ?? 50, y: parseInt(e.target.value) || 50 },
                                    },
                                  })}
                                  className="w-full text-xs bg-white border border-slate-200 rounded px-1.5 py-1"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Mobile Image */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                                <span>Mobile Image (Optional)</span>
                              </span>
                              {!slide.images.mobile && (
                                <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                                  Inherits Tablet / Desktop
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={slide.images.mobile || ''}
                                onChange={(e) => updateSlide(sIdx, { images: { ...slide.images, mobile: e.target.value } })}
                                placeholder="Falls back to Tablet"
                                className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#DF0C88]"
                              />
                              <button
                                type="button"
                                onClick={() => handleOpenMedia(sIdx, 'mobile')}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-[#DF0C88] text-white text-xs font-bold shrink-0 cursor-pointer transition-colors"
                              >
                                Pick
                              </button>
                            </div>
                            {/* Focal Point Mobile */}
                            <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] text-slate-500">
                              <div>
                                <label className="block">Focal X (%):</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={slide.focalPoints?.mobile?.x ?? 50}
                                  onChange={(e) => updateSlide(sIdx, {
                                    focalPoints: {
                                      ...slide.focalPoints,
                                      mobile: { x: parseInt(e.target.value) || 50, y: slide.focalPoints?.mobile?.y ?? 50 },
                                    },
                                  })}
                                  className="w-full text-xs bg-white border border-slate-200 rounded px-1.5 py-1"
                                />
                              </div>
                              <div>
                                <label className="block">Focal Y (%):</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={slide.focalPoints?.mobile?.y ?? 50}
                                  onChange={(e) => updateSlide(sIdx, {
                                    focalPoints: {
                                      ...slide.focalPoints,
                                      mobile: { x: slide.focalPoints?.mobile?.x ?? 50, y: parseInt(e.target.value) || 50 },
                                    },
                                  })}
                                  className="w-full text-xs bg-white border border-slate-200 rounded px-1.5 py-1"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Alt Text (SEO & WCAG) */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Image Alt Text (Required for SEO & Screen Readers)
                          </label>
                          <input
                            type="text"
                            value={slide.altText || ''}
                            onChange={(e) => updateSlide(sIdx, { altText: e.target.value })}
                            placeholder="e.g. Certified technician repairing smartphone screen"
                            className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#DF0C88]"
                          />
                        </div>
                      </div>

                      {/* B) OPTIONAL VIDEO SLIDE */}
                      <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                            <input
                              type="checkbox"
                              checked={slide.mediaType === 'video'}
                              onChange={(e) => updateSlide(sIdx, { mediaType: e.target.checked ? 'video' : 'image' })}
                              className="rounded text-[#DF0C88] focus:ring-[#DF0C88]"
                            />
                            <span>Enable Background Video (MP4 / WebM / Embed)</span>
                          </label>
                          {slide.mediaType === 'video' && (
                            <span className="text-[10px] text-slate-500 font-mono">Autoplay • Muted • Loop</span>
                          )}
                        </div>

                        {slide.mediaType === 'video' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Video URL</label>
                              <input
                                type="text"
                                value={slide.videoUrl || ''}
                                onChange={(e) => updateSlide(sIdx, { videoUrl: e.target.value })}
                                placeholder="https://domain.com/video.mp4"
                                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Poster Image URL</label>
                              <input
                                type="text"
                                value={slide.videoPoster || ''}
                                onChange={(e) => updateSlide(sIdx, { videoPoster: e.target.value })}
                                placeholder="/uploads/video-poster.jpg"
                                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(slide.showPosterOnMobile)}
                                  onChange={(e) => updateSlide(sIdx, { showPosterOnMobile: e.target.checked })}
                                  className="rounded text-[#DF0C88]"
                                />
                                <span>Show poster image instead of video on mobile to save user data</span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* C) CONTENT & OVERLAY SETTINGS */}
                      <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <h6 className="font-bold text-xs text-slate-900">Slide Content &amp; Overlay</h6>
                          <div className="flex items-center gap-3">
                            {/* Toggle text overlay on current activeDevice */}
                            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={slide.showTextOverlay?.[activeDevice] !== false}
                                onChange={(e) => {
                                  const current = slide.showTextOverlay || { desktop: true };
                                  updateSlide(sIdx, {
                                    showTextOverlay: {
                                      ...current,
                                      [activeDevice]: e.target.checked,
                                    },
                                  });
                                }}
                                className="rounded text-[#DF0C88]"
                              />
                              <span>Show Text on {activeDevice.toUpperCase()}</span>
                            </label>
                          </div>
                        </div>

                        {/* Slide Title & Heading Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Slide Heading</label>
                            <input
                              type="text"
                              value={slide.title || ''}
                              onChange={(e) => updateSlide(sIdx, { title: e.target.value })}
                              placeholder="e.g. EXPRESS PHONE REPAIR"
                              className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Heading HTML Tag</label>
                            <label className="flex items-center gap-2 pt-2 text-xs text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(slide.useH1)}
                                onChange={(e) => updateSlide(sIdx, { useH1: e.target.checked })}
                                className="rounded text-[#DF0C88]"
                              />
                              <span>Use &lt;h1&gt; (Slide #1 Only)</span>
                            </label>
                          </div>
                        </div>

                        {/* Subheading & Badge */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Sub-heading</label>
                            <input
                              type="text"
                              value={slide.subtitle || ''}
                              onChange={(e) => updateSlide(sIdx, { subtitle: e.target.value })}
                              placeholder="e.g. Fixed in 30 minutes with 6-month warranty"
                              className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Contextual Pill Badge</label>
                            <input
                              type="text"
                              value={slide.badge || ''}
                              onChange={(e) => updateSlide(sIdx, { badge: e.target.value })}
                              placeholder="e.g. 30-Min Fast Turnaround"
                              className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2"
                            />
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Rich Description</label>
                          <textarea
                            rows={2}
                            value={slide.description || ''}
                            onChange={(e) => updateSlide(sIdx, { description: e.target.value })}
                            placeholder="Detailed text describing the slide..."
                            className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2"
                          />
                        </div>

                        {/* 9-Grid Content Position per device */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                              Content 9-Grid Position ({activeDevice.toUpperCase()})
                            </label>
                            <div className="grid grid-cols-3 gap-1.5 w-48 p-2 bg-slate-100 rounded-xl border border-slate-200">
                              {[
                                'top-left', 'top-center', 'top-right',
                                'center-left', 'center-center', 'center-right',
                                'bottom-left', 'bottom-center', 'bottom-right',
                              ].map((gridPos) => {
                                const currentPos = slide.contentPosition?.[activeDevice] || 'center-left';
                                const isSelected = currentPos === gridPos;
                                return (
                                  <button
                                    key={gridPos}
                                    type="button"
                                    onClick={() => {
                                      const current = slide.contentPosition || { desktop: 'center-left' };
                                      updateSlide(sIdx, {
                                        contentPosition: {
                                          ...current,
                                          [activeDevice]: gridPos as any,
                                        },
                                      });
                                    }}
                                    className={`h-7 rounded border text-[10px] font-bold transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-[#DF0C88] text-white border-[#DF0C88]'
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                                    }`}
                                    title={gridPos}
                                  >
                                    •
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Slide Overlay Settings */}
                          <div className="space-y-3">
                            <label className="block text-[11px] font-bold text-slate-700">
                              Slide Overlay Color &amp; Opacity
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={slide.overlayColor || '#020617'}
                                onChange={(e) => updateSlide(sIdx, { overlayColor: e.target.value })}
                                className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                              />
                              <div className="flex-1">
                                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                                  <span>Opacity</span>
                                  <span>{Math.round((slide.overlayOpacity ?? 0.35) * 100)}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={1}
                                  step={0.05}
                                  value={slide.overlayOpacity ?? 0.35}
                                  onChange={(e) => updateSlide(sIdx, { overlayOpacity: parseFloat(e.target.value) })}
                                  className="w-full accent-[#DF0C88]"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Gradient Preset</label>
                              <select
                                value={slide.overlayGradient || 'left_fade'}
                                onChange={(e) => updateSlide(sIdx, { overlayGradient: e.target.value as any })}
                                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5"
                              >
                                <option value="left_fade">Left-to-Right Fade (Best for Text Readability)</option>
                                <option value="right_fade">Right-to-Left Fade</option>
                                <option value="bottom_fade">Bottom-to-Top Fade</option>
                                <option value="top_fade">Top-to-Bottom Fade</option>
                                <option value="vignette">Subtle Vignette</option>
                                <option value="radial">Radial Spotlight</option>
                                <option value="solid">Solid Color (No Gradient)</option>
                                <option value="none">None (Raw Background)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* D) UP TO 2 BUTTONS CONFIGURATION */}
                      <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <h6 className="font-bold text-xs text-slate-900">Slide CTA Buttons (Up to 2)</h6>
                          <button
                            type="button"
                            onClick={() => {
                              const btns = slide.buttons ? [...slide.buttons] : [];
                              if (btns.length >= 2) return;
                              btns.push({
                                id: `btn_${Date.now()}`,
                                text: 'Contact Us',
                                link: '/contact',
                                style: 'secondary',
                              });
                              updateSlide(sIdx, { buttons: btns });
                            }}
                            disabled={(slide.buttons?.length || 0) >= 2}
                            className="px-2.5 py-1 text-xs font-bold text-[#DF0C88] hover:bg-pink-50 rounded-lg disabled:opacity-40 cursor-pointer"
                          >
                            + Add Button
                          </button>
                        </div>

                        <div className="space-y-3">
                          {slide.buttons?.map((btn, bIdx) => (
                            <div key={btn.id || bIdx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-700">
                                  Button #{bIdx + 1} ({btn.style.toUpperCase()})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = slide.buttons?.filter((_, i) => i !== bIdx);
                                    updateSlide(sIdx, { buttons: updated });
                                  }}
                                  className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Label</label>
                                  <input
                                    type="text"
                                    value={btn.text || ''}
                                    onChange={(e) => {
                                      const updated = [...(slide.buttons || [])];
                                      updated[bIdx] = { ...updated[bIdx], text: e.target.value };
                                      updateSlide(sIdx, { buttons: updated });
                                    }}
                                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Link URL</label>
                                  <input
                                    type="text"
                                    value={btn.link || ''}
                                    onChange={(e) => {
                                      const updated = [...(slide.buttons || [])];
                                      updated[bIdx] = { ...updated[bIdx], link: e.target.value };
                                      updateSlide(sIdx, { buttons: updated });
                                    }}
                                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Style</label>
                                  <select
                                    value={btn.style || 'primary'}
                                    onChange={(e) => {
                                      const updated = [...(slide.buttons || [])];
                                      updated[bIdx] = { ...updated[bIdx], style: e.target.value as any };
                                      updateSlide(sIdx, { buttons: updated });
                                    }}
                                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5"
                                  >
                                    <option value="primary">Primary Solid</option>
                                    <option value="secondary">Secondary Frosted</option>
                                    <option value="outline">Outline Border</option>
                                    <option value="link">Underline Link</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* E) WHOLE SLIDE CLICKABLE LINK */}
                      <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                          <input
                            type="checkbox"
                            checked={Boolean(slide.slideLink?.enabled)}
                            onChange={(e) => updateSlide(sIdx, {
                              slideLink: {
                                ...slide.slideLink,
                                enabled: e.target.checked,
                                url: slide.slideLink?.url || '',
                              },
                            })}
                            className="rounded text-[#DF0C88]"
                          />
                          <span>Make Whole Slide Clickable (URL Link)</span>
                        </label>

                        {slide.slideLink?.enabled && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div>
                              <input
                                type="text"
                                value={slide.slideLink?.url || ''}
                                onChange={(e) => updateSlide(sIdx, {
                                  slideLink: { ...slide.slideLink, url: e.target.value, enabled: true },
                                })}
                                placeholder="/promotions or https://..."
                                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                              />
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-600">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(slide.slideLink?.openInNewTab)}
                                  onChange={(e) => updateSlide(sIdx, {
                                    slideLink: { ...slide.slideLink, openInNewTab: e.target.checked, url: slide.slideLink?.url || '', enabled: true },
                                  })}
                                  className="rounded text-[#DF0C88]"
                                />
                                <span>Open New Tab</span>
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(slide.slideLink?.relNofollow)}
                                  onChange={(e) => updateSlide(sIdx, {
                                    slideLink: { ...slide.slideLink, relNofollow: e.target.checked, url: slide.slideLink?.url || '', enabled: true },
                                  })}
                                  className="rounded text-[#DF0C88]"
                                />
                                <span>rel="nofollow"</span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* F) SCHEDULING & DEVICE VISIBILITY */}
                      <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                        <h6 className="font-bold text-xs text-slate-900">Slide Scheduling &amp; Device Visibility</h6>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={slide.visibility?.desktop !== false}
                              onChange={(e) => updateSlide(sIdx, {
                                visibility: { ...slide.visibility, desktop: e.target.checked },
                              })}
                              className="rounded text-[#DF0C88]"
                            />
                            <span>Visible on Desktop</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={slide.visibility?.tablet !== false}
                              onChange={(e) => updateSlide(sIdx, {
                                visibility: { ...slide.visibility, tablet: e.target.checked },
                              })}
                              className="rounded text-[#DF0C88]"
                            />
                            <span>Visible on Tablet</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={slide.visibility?.mobile !== false}
                              onChange={(e) => updateSlide(sIdx, {
                                visibility: { ...slide.visibility, mobile: e.target.checked },
                              })}
                              className="rounded text-[#DF0C88]"
                            />
                            <span>Visible on Mobile</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. TAB 2: RESPONSIVE LAYOUT */}
      {activeTab === 'layout' && (
        <div className="space-y-6">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Layout Settings for {activeDevice.toUpperCase()}
              </h4>
              <p className="text-[11px] text-slate-500">
                Adjust slider height mode, width, slides per view, and gap for this screen size.
              </p>
            </div>
            {hasResponsiveOverride(config.slidesPerView, activeDevice) && activeDevice !== 'desktop' && (
              <button
                type="button"
                onClick={() => {
                  resetResponsiveField('slidesPerView', null);
                  resetResponsiveField('fixedHeight', null);
                  resetResponsiveField('spaceBetween', null);
                }}
                className="px-2.5 py-1 text-[11px] font-bold text-[#DF0C88] hover:bg-pink-100 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Inherited</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Layout Mode */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700">Container Layout Mode</label>
              <select
                value={config.layoutMode?.[activeDevice] || 'full'}
                onChange={(e) => updateResponsiveField('layoutMode', null, e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              >
                <option value="boxed">Boxed (Max 1280px Container)</option>
                <option value="full">Full Width (Container with Padding)</option>
                <option value="full_bleed">Full Bleed (Edge-to-Edge 100%)</option>
              </select>
            </div>

            {/* Height Mode */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700">Height Mode</label>
              <select
                value={config.heightMode?.[activeDevice] || 'fixed'}
                onChange={(e) => updateResponsiveField('heightMode', null, e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              >
                <option value="fixed">Fixed Height (px)</option>
                <option value="aspect_ratio">Aspect Ratio (16:9, 4:3, etc.)</option>
                <option value="auto">Auto (Natural Image Proportions)</option>
              </select>
            </div>

            {/* Fixed Height (px) */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Slider Height (px): {config.fixedHeight?.[activeDevice] ?? 560}px
              </label>
              <input
                type="range"
                min={260}
                max={900}
                step={20}
                value={config.fixedHeight?.[activeDevice] ?? 560}
                onChange={(e) => updateResponsiveField('fixedHeight', null, parseInt(e.target.value))}
                className="w-full accent-[#DF0C88]"
              />
            </div>

            {/* Slides Per View (Supports Decimals like 1.2) */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700">Slides Per View</label>
                <span className="text-xs font-mono font-bold text-[#DF0C88]">
                  {config.slidesPerView?.[activeDevice] ?? 1}
                </span>
              </div>
              <input
                type="number"
                min={1}
                max={6}
                step={0.1}
                value={config.slidesPerView?.[activeDevice] ?? 1}
                onChange={(e) => updateResponsiveField('slidesPerView', null, parseFloat(e.target.value) || 1)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              />
              <p className="text-[10px] text-slate-400">Enter decimals (e.g. 1.2 or 2.3) to peek next slide</p>
            </div>

            {/* Space Between Slides (px) */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700">Space Between Slides (px)</label>
              <input
                type="number"
                min={0}
                max={64}
                step={4}
                value={config.spaceBetween?.[activeDevice] ?? 0}
                onChange={(e) => updateResponsiveField('spaceBetween', null, parseInt(e.target.value) || 0)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>

            {/* Peek Padding */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700">Edge Peek Padding (px)</label>
              <input
                type="number"
                min={0}
                max={120}
                step={10}
                value={config.peekPadding?.[activeDevice] ?? 0}
                onChange={(e) => updateResponsiveField('peekPadding', null, parseInt(e.target.value) || 0)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>

            {/* Image Fit */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700">Image Fit (object-fit)</label>
              <select
                value={config.imageFit?.[activeDevice] || 'cover'}
                onChange={(e) => updateResponsiveField('imageFit', null, e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              >
                <option value="cover">Cover (Fills Entire Slide)</option>
                <option value="contain">Contain (No Cropping)</option>
                <option value="fill">Fill (Stretched)</option>
              </select>
            </div>

            {/* Corner Radius */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700">Slide Corner Radius (px)</label>
              <input
                type="number"
                min={0}
                max={48}
                step={4}
                value={config.cornerRadius?.[activeDevice] ?? 0}
                onChange={(e) => updateResponsiveField('cornerRadius', null, parseInt(e.target.value) || 0)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>

            {/* Centered Slides */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-700">Center Slides</label>
                <p className="text-[10px] text-slate-400">Align active slide in center</p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(config.centeredSlides?.[activeDevice])}
                onChange={(e) => updateResponsiveField('centeredSlides', null, e.target.checked)}
                className="rounded text-[#DF0C88] w-4 h-4"
              />
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 3: BEHAVIOUR & EFFECTS */}
      {activeTab === 'behaviour' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Transition Effect */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700">Transition Effect</label>
              <select
                value={config.transitionEffect || 'slide'}
                onChange={(e) => updateConfig({ transitionEffect: e.target.value as any })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              >
                <option value="slide">Smooth Horizontal Slide</option>
                <option value="cross_fade">Cross-Fade</option>
                <option value="zoom">Zoom Scale In/Out</option>
                <option value="coverflow">3D Coverflow Carousel</option>
                <option value="cards">Card Stack Depth</option>
                <option value="cube">3D Cube Flip</option>
              </select>
            </div>

            {/* Transition Speed (ms) */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Transition Speed: {config.transitionSpeed}ms
              </label>
              <input
                type="range"
                min={200}
                max={1500}
                step={50}
                value={config.transitionSpeed || 600}
                onChange={(e) => updateConfig({ transitionSpeed: parseInt(e.target.value) })}
                className="w-full accent-[#DF0C88]"
              />
            </div>

            {/* Autoplay Delay */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Autoplay Interval: {(config.autoplay.delay / 1000).toFixed(1)}s
              </label>
              <input
                type="range"
                min={2000}
                max={15000}
                step={500}
                value={config.autoplay.delay || 6000}
                onChange={(e) => updateConfig({
                  autoplay: { ...config.autoplay, delay: parseInt(e.target.value) },
                })}
                className="w-full accent-[#DF0C88]"
              />
            </div>

            {/* Autoplay Checkboxes */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoplay.enabled}
                  onChange={(e) => updateConfig({
                    autoplay: { ...config.autoplay, enabled: e.target.checked },
                  })}
                  className="rounded text-[#DF0C88]"
                />
                <span>Enable Autoplay</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoplay.pauseOnHover}
                  onChange={(e) => updateConfig({
                    autoplay: { ...config.autoplay, pauseOnHover: e.target.checked },
                  })}
                  className="rounded text-[#DF0C88]"
                />
                <span>Pause on Hover</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.loop}
                  onChange={(e) => updateConfig({ loop: e.target.checked })}
                  className="rounded text-[#DF0C88]"
                />
                <span>Infinite Loop</span>
              </label>
            </div>

            {/* Ken Burns Effect */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.kenBurns?.enabled}
                  onChange={(e) => updateConfig({
                    kenBurns: { ...config.kenBurns, enabled: e.target.checked },
                  })}
                  className="rounded text-[#DF0C88]"
                />
                <span>Ken Burns Slow Pan / Zoom</span>
              </label>
              <select
                value={config.kenBurns?.direction || 'zoom-in'}
                onChange={(e) => updateConfig({
                  kenBurns: { ...config.kenBurns, direction: e.target.value as any },
                })}
                disabled={!config.kenBurns?.enabled}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 disabled:opacity-40"
              >
                <option value="zoom-in">Zoom In</option>
                <option value="zoom-out">Zoom Out</option>
                <option value="pan-left">Pan Left</option>
                <option value="pan-right">Pan Right</option>
              </select>
            </div>

            {/* Gesture & Interaction */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.touchDrag}
                  onChange={(e) => updateConfig({ touchDrag: e.target.checked })}
                  className="rounded text-[#DF0C88]"
                />
                <span>Touch &amp; Mouse Drag Navigation</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.keyboardNav}
                  onChange={(e) => updateConfig({ keyboardNav: e.target.checked })}
                  className="rounded text-[#DF0C88]"
                />
                <span>Keyboard Arrow Keys (Left / Right)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.pauseOffscreen}
                  onChange={(e) => updateConfig({ pauseOffscreen: e.target.checked })}
                  className="rounded text-[#DF0C88]"
                />
                <span>Pause Autoplay When Off-Screen</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 8. TAB 4: ARROWS & PAGINATION */}
      {activeTab === 'navigation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Arrows Settings */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Navigation Arrows</h5>
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.arrows.showDesktop}
                      onChange={(e) => updateConfig({ arrows: { ...config.arrows, showDesktop: e.target.checked } })}
                      className="rounded text-[#DF0C88]"
                    />
                    <span>Desktop</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.arrows.showTablet}
                      onChange={(e) => updateConfig({ arrows: { ...config.arrows, showTablet: e.target.checked } })}
                      className="rounded text-[#DF0C88]"
                    />
                    <span>Tablet</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.arrows.showMobile}
                      onChange={(e) => updateConfig({ arrows: { ...config.arrows, showMobile: e.target.checked } })}
                      className="rounded text-[#DF0C88]"
                    />
                    <span>Mobile</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Arrow Button Style</label>
                  <select
                    value={config.arrows.style || 'circle'}
                    onChange={(e) => updateConfig({ arrows: { ...config.arrows, style: e.target.value as any } })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2"
                  >
                    <option value="circle">Round Circle</option>
                    <option value="rounded">Rounded Square</option>
                    <option value="square">Sharp Square</option>
                    <option value="minimal">Minimal Chevron</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Button Size (px)</label>
                  <input
                    type="number"
                    min={28}
                    max={64}
                    value={config.arrows.size || 48}
                    onChange={(e) => updateConfig({ arrows: { ...config.arrows, size: parseInt(e.target.value) || 48 } })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Icon Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.arrows.color || '#0f172a'}
                      onChange={(e) => updateConfig({ arrows: { ...config.arrows, color: e.target.value } })}
                      className="w-8 h-8 rounded border p-0.5 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.arrows.color || '#0f172a'}
                      onChange={(e) => updateConfig({ arrows: { ...config.arrows, color: e.target.value } })}
                      className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Hover Icon Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.arrows.hoverColor || '#DF0C88'}
                      onChange={(e) => updateConfig({ arrows: { ...config.arrows, hoverColor: e.target.value } })}
                      className="w-8 h-8 rounded border p-0.5 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.arrows.hoverColor || '#DF0C88'}
                      onChange={(e) => updateConfig({ arrows: { ...config.arrows, hoverColor: e.target.value } })}
                      className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Pagination Settings */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Pagination &amp; Dots</h5>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Pagination Type</label>
                  <select
                    value={config.pagination.type || 'bullets'}
                    onChange={(e) => updateConfig({ pagination: { ...config.pagination, type: e.target.value as any } })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2"
                  >
                    <option value="bullets">Bullets / Dots</option>
                    <option value="dynamic_bullets">Dynamic Scaling Bullets</option>
                    <option value="numbers">Numbers (1, 2, 3)</option>
                    <option value="fraction">Fraction (3 / 8)</option>
                    <option value="progress_bar">Top Progress Bar</option>
                    <option value="none">None (Hidden)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Shape</label>
                  <select
                    value={config.pagination.shape || 'pill'}
                    onChange={(e) => updateConfig({ pagination: { ...config.pagination, shape: e.target.value as any } })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2"
                  >
                    <option value="pill">Pill (Expands on active)</option>
                    <option value="dot">Round Dot</option>
                    <option value="line">Line Bar</option>
                    <option value="square">Square</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Active Color</label>
                  <input
                    type="color"
                    value={config.pagination.activeColor || '#DF0C88'}
                    onChange={(e) => updateConfig({ pagination: { ...config.pagination, activeColor: e.target.value } })}
                    className="w-full h-8 rounded border p-0.5 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Inactive Color</label>
                  <input
                    type="color"
                    value={config.pagination.color || '#cbd5e1'}
                    onChange={(e) => updateConfig({ pagination: { ...config.pagination, color: e.target.value } })}
                    className="w-full h-8 rounded border p-0.5 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. TAB 5: STYLING & TYPOGRAPHY */}
      {activeTab === 'style' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Typography */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200 space-y-4">
              <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                Slide Typography
              </h5>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Heading Font Size ({activeDevice.toUpperCase()}): {config.typography.headingSize?.[activeDevice] ?? 42}px
                  </label>
                  <input
                    type="range"
                    min={20}
                    max={72}
                    value={config.typography.headingSize?.[activeDevice] ?? 42}
                    onChange={(e) => updateResponsiveField('typography', 'headingSize', parseInt(e.target.value))}
                    className="w-full accent-[#DF0C88]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Heading Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.typography.headingColor || '#ffffff'}
                      onChange={(e) => updateConfig({ typography: { ...config.typography, headingColor: e.target.value } })}
                      className="w-8 h-8 rounded border p-0.5 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.typography.headingColor || '#ffffff'}
                      onChange={(e) => updateConfig({ typography: { ...config.typography, headingColor: e.target.value } })}
                      className="w-28 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.typography.headingShadow}
                      onChange={(e) => updateConfig({ typography: { ...config.typography, headingShadow: e.target.checked } })}
                      className="rounded text-[#DF0C88]"
                    />
                    <span>Text Drop Shadow</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Container Styling */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200 space-y-4">
              <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                Slider Container Styling
              </h5>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Container Background Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.container.bgColor || '#020617'}
                      onChange={(e) => updateConfig({ container: { ...config.container, bgColor: e.target.value } })}
                      className="w-8 h-8 rounded border p-0.5 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.container.bgColor || '#020617'}
                      onChange={(e) => updateConfig({ container: { ...config.container, bgColor: e.target.value } })}
                      className="w-28 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Primary CTA Button Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.buttonsStyle.primaryBg || '#DF0C88'}
                      onChange={(e) => updateConfig({ buttonsStyle: { ...config.buttonsStyle, primaryBg: e.target.value } })}
                      className="w-8 h-8 rounded border p-0.5 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.buttonsStyle.primaryBg || '#DF0C88'}
                      onChange={(e) => updateConfig({ buttonsStyle: { ...config.buttonsStyle, primaryBg: e.target.value } })}
                      className="w-28 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. TAB 6: DESIGN PRESETS */}
      {activeTab === 'presets' && (
        <div className="space-y-6">
          <div className="p-4 bg-pink-50 border border-pink-200 rounded-2xl">
            <h4 className="text-xs font-bold text-[#DF0C88] uppercase tracking-wider">
              1-Click Design Presets
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Instantly style your image slider for high impact hero banners, peek carousels, or multi-card stores.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.keys(SLIDER_PRESETS).map((pKey) => {
              const isSelected = config.activePreset === pKey;
              return (
                <div
                  key={pKey}
                  onClick={() => applyPreset(pKey)}
                  className={`p-4 rounded-3xl border transition-all cursor-pointer space-y-2.5 ${
                    isSelected
                      ? 'border-[#DF0C88] bg-pink-50/40 ring-2 ring-pink-500/20 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-xs text-slate-900">{pKey}</h5>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-[#DF0C88] text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {pKey === 'Classic hero banner' && 'Full width, 560px height, single slide with bold headings and navigation arrows.'}
                    {pKey === 'Product promo carousel' && 'Multi-card boxed grid with 3 desktop, 2 tablet, 1 mobile slide view.'}
                    {pKey === 'Peek carousel (1.2 per view)' && 'Carousel that shows a subtle edge peek of the next slide for high engagement.'}
                    {pKey === 'Fade banner with arrows' && 'Gentle cross-fade transitions with Ken Burns slow motion zoom.'}
                    {pKey === 'Thumbnail gallery' && 'Interactive thumbnail strip underneath the slider for desktop viewing.'}
                    {pKey === 'Full-screen mobile story' && 'Vertical story format optimized for smartphone swipe gestures.'}
                  </p>
                  <button
                    type="button"
                    className={`w-full py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-[#DF0C88] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-[#DF0C88] hover:text-white'
                    }`}
                  >
                    {isSelected ? 'Active Preset' : 'Apply Preset'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Custom Preset Save */}
          <div className="p-5 bg-white rounded-3xl border border-slate-200 space-y-3">
            <h5 className="font-bold text-xs text-slate-900">Save Your Custom Preset</h5>
            <p className="text-xs text-slate-500">Save the current slider configuration to reuse on other pages.</p>
            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                value={customPresetName}
                onChange={(e) => setCustomPresetName(e.target.value)}
                placeholder="e.g. My Festive Slider Theme"
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              />
              <button
                type="button"
                onClick={handleSaveCustomPreset}
                disabled={!customPresetName.trim()}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-[#DF0C88] disabled:opacity-40 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. TAB 7: ADVANCED & BREAKPOINTS */}
      {activeTab === 'advanced' && (
        <div className="space-y-6">
          <div className="p-5 bg-white rounded-3xl border border-slate-200 space-y-4">
            <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Responsive Breakpoints Configuration
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Desktop Breakpoint (px)
                </label>
                <input
                  type="number"
                  value={config.desktopBreakpoint || 1024}
                  onChange={(e) => updateConfig({ desktopBreakpoint: parseInt(e.target.value) || 1024 })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">Default: 1024px. Screens ≥ this width use Desktop mode.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tablet Breakpoint (px)
                </label>
                <input
                  type="number"
                  value={config.tabletBreakpoint || 768}
                  onChange={(e) => updateConfig({ tabletBreakpoint: parseInt(e.target.value) || 768 })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">Default: 768px. Screens below this width use Mobile mode.</p>
              </div>
            </div>
          </div>

          <div className="p-5 bg-white rounded-3xl border border-slate-200 space-y-4">
            <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Custom Classes &amp; Scoped CSS
            </h5>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Custom CSS Class</label>
              <input
                type="text"
                value={config.customCssClass || ''}
                onChange={(e) => updateConfig({ customCssClass: e.target.value })}
                placeholder="e.g. promo-slider-hero mb-8"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Advanced CSS (Scoped)</label>
              <textarea
                rows={4}
                value={config.advancedCss || ''}
                onChange={(e) => updateConfig({ advancedCss: e.target.value })}
                placeholder="/* Custom CSS applied strictly to this slider instance */"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* MEDIA PICKER MODAL */}
      {mediaPickerOpen && (
        <MediaPickerModal
          isOpen={mediaPickerOpen}
          onClose={() => {
            setMediaPickerOpen(false);
            setMediaTarget(null);
          }}
          onSelect={handleMediaSelect}
        />
      )}

      {/* BULK MEDIA PICKER MODAL */}
      {bulkMediaPickerOpen && (
        <MediaPickerModal
          isOpen={bulkMediaPickerOpen}
          multiple={true}
          onClose={() => setBulkMediaPickerOpen(false)}
          onSelect={() => {}}
          onSelectMultiple={handleBulkAddSlides}
        />
      )}
    </div>
  );
};
