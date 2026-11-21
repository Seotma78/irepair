import React, { useState, useEffect } from 'react';
import {
  MobilePhoneBrandsMarqueeWidget,
  MobilePhoneBrandsMarqueeConfig,
  DEFAULT_MOBILE_BRANDS_MARQUEE_CONFIG,
  STARTER_MOBILE_BRANDS,
  MobilePhoneBrandItem,
  BrandDestinationType,
} from '../../widgets/components/MobilePhoneBrandsMarqueeWidget';
import {
  Sliders,
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw,
  Save,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Sparkles,
  Layers,
  Settings,
  Palette,
  Type,
  Layout,
  MoveUp,
  MoveDown,
  Play,
  Pause,
  AlertCircle,
  HelpCircle,
  FolderTree,
  Globe,
  Radio
} from 'lucide-react';

const PRESETS: Record<string, Partial<MobilePhoneBrandsMarqueeConfig>> = {
  'Modern Clean White': {
    widgetName: 'Modern Clean White',
    sectionHeading: 'Popular Brands',
    showSectionHeading: true,
    showSubtitle: false,
    headingAlignment: 'center',
    backgroundColor: '#f8fafc',
    cardBg: '#ffffff',
    cardBorderColor: '#e2e8f0',
    cardBorderRadius: 18,
    cardShadow: 'sm',
    cardHoverEffect: 'lift',
    grayscale: false,
    grayscaleHoverColor: true,
    animationSpeed: 38,
    cardWidth: 170,
    cardHeight: 88,
  },
  'Minimalist Monochrome': {
    widgetName: 'Minimalist Monochrome',
    sectionHeading: 'Authorized & Serviced Brands',
    showSectionHeading: true,
    showSubtitle: true,
    subtitle: '100% genuine replacement screens, batteries & board repairs',
    headingAlignment: 'center',
    backgroundColor: '#ffffff',
    cardBg: '#ffffff',
    cardBorderColor: '#cbd5e1',
    cardBorderRadius: 12,
    cardShadow: 'none',
    cardHoverEffect: 'border_glow',
    grayscale: true,
    grayscaleHoverColor: true,
    animationSpeed: 32,
    cardWidth: 160,
    cardHeight: 80,
  },
  'Dark Obsidian': {
    widgetName: 'Dark Obsidian',
    sectionHeading: 'Leading Mobile Hardware',
    showSectionHeading: true,
    headingColor: '#ffffff',
    subtitleColor: '#94a3b8',
    showSubtitle: true,
    subtitle: 'From flagship titanium devices to budget champions',
    headingAlignment: 'center',
    backgroundColor: '#090d16',
    edgeFadeColor: '#090d16',
    cardBg: '#131b2e',
    cardBorderColor: '#1e293b',
    cardBorderRadius: 18,
    cardShadow: 'md',
    cardHoverEffect: 'lift',
    grayscale: false,
    grayscaleHoverColor: false,
    animationSpeed: 35,
    cardWidth: 175,
    cardHeight: 90,
  },
  'Vibrant Accent': {
    widgetName: 'Vibrant Accent',
    sectionHeading: 'Shop By Mobile Brand',
    showSectionHeading: true,
    showSubtitle: true,
    subtitle: 'Select any brand below to explore refurbished models & repairs',
    headingAlignment: 'center',
    backgroundColor: '#fdf2f8',
    edgeFadeColor: '#fdf2f8',
    cardBg: '#ffffff',
    cardBorderColor: '#fbcfe8',
    cardBorderRadius: 20,
    cardShadow: 'sm',
    cardHoverEffect: 'scale',
    showBrandName: true,
    showBadge: true,
    badgeBg: '#fce7f3',
    badgeColor: '#be185d',
    animationSpeed: 40,
    cardWidth: 180,
    cardHeight: 96,
  },
};

export const MobilePhoneBrandsMarqueeBuilderView: React.FC = () => {
  const [config, setConfig] = useState<MobilePhoneBrandsMarqueeConfig>(() => {
    const saved = localStorage.getItem('irepair_mobile_brands_marquee_custom_config');
    if (saved) {
      try {
        return { ...DEFAULT_MOBILE_BRANDS_MARQUEE_CONFIG, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_MOBILE_BRANDS_MARQUEE_CONFIG;
      }
    }
    return DEFAULT_MOBILE_BRANDS_MARQUEE_CONFIG;
  });

  const [activeTab, setActiveTab] = useState<'general' | 'motion' | 'cards' | 'logos' | 'brands'>('general');
  const [devicePreview, setDevicePreview] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [applyingToPage, setApplyingToPage] = useState(false);
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(null);

  // Available categories & pages fetched from API for destination pickers
  const [availableCategories, setAvailableCategories] = useState<Array<{ id: number; name: string; slug: string }>>([]);
  const [availablePages, setAvailablePages] = useState<Array<{ id: string; title: string; slug: string }>>([]);

  // Brand editing state
  const [editingBrandIndex, setEditingBrandIndex] = useState<number | null>(null);

  useEffect(() => {
    // Fetch live categories
    fetch('/api/categories')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setAvailableCategories(data);
        }
      })
      .catch(() => {});

    // Fetch live pages
    fetch('/api/cms/pages')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setAvailablePages(data);
        }
      })
      .catch(() => {});
  }, []);

  const updateConfig = (key: keyof MobilePhoneBrandsMarqueeConfig, val: any) => {
    setConfig((prev) => ({ ...prev, [key]: val }));
  };

  const handleReset = () => {
    setConfig(DEFAULT_MOBILE_BRANDS_MARQUEE_CONFIG);
    localStorage.removeItem('irepair_mobile_brands_marquee_custom_config');
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleSave = () => {
    localStorage.setItem('irepair_mobile_brands_marquee_custom_config', JSON.stringify(config));
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Add a new brand
  const handleAddBrand = () => {
    const brands = [...(config.brands || STARTER_MOBILE_BRANDS)];
    const newBrand: MobilePhoneBrandItem = {
      id: `custom_brand_${Date.now()}`,
      name: 'New Mobile Brand',
      logoSvgPreset: 'apple',
      altText: 'Smart mobile devices and repairs',
      order: brands.length + 1,
      visible: true,
      badge: 'New',
      destinationType: 'product_category',
      destinationValue: 'mobile-phones',
    };
    const updated = [...brands, newBrand];
    updateConfig('brands', updated);
    setEditingBrandIndex(updated.length - 1);
  };

  // Update specific brand
  const updateBrand = (index: number, updates: Partial<MobilePhoneBrandItem>) => {
    const brands = [...(config.brands || STARTER_MOBILE_BRANDS)];
    brands[index] = { ...brands[index], ...updates };
    updateConfig('brands', brands);
  };

  // Move brand up or down
  const moveBrand = (index: number, direction: 'up' | 'down') => {
    const brands = [...(config.brands || STARTER_MOBILE_BRANDS)];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= brands.length) return;

    const temp = brands[index];
    brands[index] = brands[targetIdx];
    brands[targetIdx] = temp;

    // Recalculate orders
    brands.forEach((b, idx) => {
      b.order = idx + 1;
    });

    updateConfig('brands', brands);
    if (editingBrandIndex === index) setEditingBrandIndex(targetIdx);
  };

  // Remove a brand
  const removeBrand = (index: number) => {
    const brands = [...(config.brands || STARTER_MOBILE_BRANDS)];
    brands.splice(index, 1);
    brands.forEach((b, idx) => {
      b.order = idx + 1;
    });
    updateConfig('brands', brands);
    setEditingBrandIndex(null);
  };

  // Apply to Homepage via CMS API
  const handleApplyToHomepage = async () => {
    setApplyingToPage(true);
    try {
      const res = await fetch('/api/cms/pages/home');
      if (!res.ok) throw new Error('Failed to fetch home page');
      const page = await res.json();
      const sections = [...(page.sections || [])];

      const existingIdx = sections.findIndex((s: any) => s.type === 'mobile_phone_brands_marquee');
      const newSection = {
        id: existingIdx >= 0 ? sections[existingIdx].id : `mbm-${Date.now()}`,
        type: 'mobile_phone_brands_marquee',
        order: existingIdx >= 0 ? sections[existingIdx].order : 4,
        visible: true,
        commonSettings: {
          containerWidth: config.layoutWidth || 'boxed',
          paddingY: 'medium',
        },
        settings: config,
      };

      if (existingIdx >= 0) {
        sections[existingIdx] = newSection;
      } else {
        // Place right after the hero / trending section
        sections.splice(2, 0, newSection);
      }

      const saveRes = await fetch('/api/cms/pages/home', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });

      if (!saveRes.ok) throw new Error('Failed to update page');

      setApplySuccessMessage('Successfully published Mobile Phone Brands Marquee to Homepage!');
      setTimeout(() => setApplySuccessMessage(null), 4000);
    } catch (e: any) {
      alert(`Error publishing to homepage: ${e.message}`);
    } finally {
      setApplyingToPage(false);
    }
  };

  const currentBrands = config.brands || STARTER_MOBILE_BRANDS;

  return (
    <div className="space-y-6">
      {/* Top Header / Actions Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#DF0C88] bg-pink-50 px-2 py-0.5 rounded-full font-bold">
              Standalone Widget Builder
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-semibold text-slate-600">Mobile Phone Brands Marquee</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Dynamic Mobile Phone Brands Marquee
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Configure every aspect of the seamless infinite brand logo marquee, customize individual mobile brands,
            set dynamic destination routing, and preview live across viewports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
            <span className="text-slate-500 px-2 font-semibold">Preset:</span>
            {Object.keys(PRESETS).map((pName) => (
              <button
                key={pName}
                onClick={() => setConfig((prev) => ({ ...prev, ...PRESETS[pName] }))}
                className="px-2.5 py-1 rounded-xl text-xs font-bold text-slate-700 hover:bg-white transition-all cursor-pointer"
              >
                {pName}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Reset to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handleCopyJson}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Copy Config JSON"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'JSON'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {savedNotice ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedNotice ? 'Saved!' : 'Save Preset'}</span>
          </button>

          <button
            type="button"
            onClick={handleApplyToHomepage}
            disabled={applyingToPage}
            className="px-4 py-2 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{applyingToPage ? 'Publishing...' : 'Publish to Homepage'}</span>
          </button>
        </div>
      </div>

      {applySuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{applySuccessMessage}</span>
        </div>
      )}

      {/* Main Dual Panel Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel: Settings Editor (5 columns) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Navigation Tabs */}
          <div className="bg-white rounded-2xl p-1.5 border border-slate-200/90 shadow-xs flex items-center gap-1 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap text-center ${
                activeTab === 'general' ? 'bg-[#DF0C88] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('motion')}
              className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap text-center ${
                activeTab === 'motion' ? 'bg-[#DF0C88] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Motion & Loop
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap text-center ${
                activeTab === 'cards' ? 'bg-[#DF0C88] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setActiveTab('logos')}
              className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap text-center ${
                activeTab === 'logos' ? 'bg-[#DF0C88] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Logos
            </button>
            <button
              onClick={() => setActiveTab('brands')}
              className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap text-center ${
                activeTab === 'brands' ? 'bg-[#DF0C88] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Brands ({currentBrands.length})
            </button>
          </div>

          {/* Tab Content Box */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-5">
            {/* 1. General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-sm text-slate-900">Heading & Layout Settings</h3>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={config.enabled !== false}
                      onChange={(e) => updateConfig('enabled', e.target.checked)}
                      className="rounded text-[#DF0C88] focus:ring-[#DF0C88]"
                    />
                    <span>Widget Enabled</span>
                  </label>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Widget Title (Internal)</label>
                  <input
                    type="text"
                    value={config.widgetName || ''}
                    onChange={(e) => updateConfig('widgetName', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-[#DF0C88] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Show Section Heading</label>
                  <input
                    type="checkbox"
                    checked={config.showSectionHeading !== false}
                    onChange={(e) => updateConfig('showSectionHeading', e.target.checked)}
                    className="rounded text-[#DF0C88] focus:ring-[#DF0C88]"
                  />
                </div>

                {config.showSectionHeading !== false && (
                  <>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Section Heading Text</label>
                      <input
                        type="text"
                        value={config.sectionHeading || ''}
                        onChange={(e) => updateConfig('sectionHeading', e.target.value)}
                        placeholder="Popular Brands"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-[#DF0C88] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Heading Size (px)</label>
                        <input
                          type="number"
                          value={config.headingFontSize || 28}
                          onChange={(e) => updateConfig('headingFontSize', Number(e.target.value))}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:border-[#DF0C88] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Heading Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={config.headingColor || '#0f172a'}
                            onChange={(e) => updateConfig('headingColor', e.target.value)}
                            className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={config.headingColor || '#0f172a'}
                            onChange={(e) => updateConfig('headingColor', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded-xl font-mono text-[11px]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Heading Alignment</label>
                        <select
                          value={config.headingAlignment || 'center'}
                          onChange={(e) => updateConfig('headingAlignment', e.target.value as any)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white"
                        >
                          <option value="center">Centered (Default)</option>
                          <option value="left">Left Aligned</option>
                          <option value="right">Right Aligned</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">HTML Heading Tag</label>
                        <select
                          value={config.headingTag || 'h2'}
                          onChange={(e) => updateConfig('headingTag', e.target.value as any)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white"
                        >
                          <option value="h2">H2 (Recommended)</option>
                          <option value="h3">H3</option>
                          <option value="h4">H4</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <label className="font-bold text-slate-700">Show Subtitle / Description</label>
                  <input
                    type="checkbox"
                    checked={config.showSubtitle === true}
                    onChange={(e) => updateConfig('showSubtitle', e.target.checked)}
                    className="rounded text-[#DF0C88] focus:ring-[#DF0C88]"
                  />
                </div>

                {config.showSubtitle && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Subtitle Text</label>
                    <textarea
                      rows={2}
                      value={config.subtitle || ''}
                      onChange={(e) => updateConfig('subtitle', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-[#DF0C88] focus:outline-none"
                    />
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100">
                  <label className="block font-bold text-slate-700 mb-1">Section Background</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.backgroundColor || '#f8fafc'}
                        onChange={(e) => {
                          updateConfig('backgroundColor', e.target.value);
                          updateConfig('edgeFadeColor', e.target.value);
                        }}
                        className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.backgroundColor || '#f8fafc'}
                        onChange={(e) => {
                          updateConfig('backgroundColor', e.target.value);
                          updateConfig('edgeFadeColor', e.target.value);
                        }}
                        className="w-full px-2 py-1 border border-slate-200 rounded-xl font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <select
                        value={config.layoutWidth || 'boxed'}
                        onChange={(e) => updateConfig('layoutWidth', e.target.value as any)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white"
                      >
                        <option value="boxed">Boxed (1280px max)</option>
                        <option value="full">Full Width</option>
                        <option value="narrow">Narrow (1024px)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Padding Top (px)</label>
                    <input
                      type="number"
                      value={config.sectionPaddingTop ?? 40}
                      onChange={(e) => updateConfig('sectionPaddingTop', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Padding Bottom (px)</label>
                    <input
                      type="number"
                      value={config.sectionPaddingBottom ?? 40}
                      onChange={(e) => updateConfig('sectionPaddingBottom', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. Motion & Scrolling Settings */}
            {activeTab === 'motion' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-sm text-slate-900">Marquee Animation & Loop</h3>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={config.autoplay !== false}
                      onChange={(e) => updateConfig('autoplay', e.target.checked)}
                      className="rounded text-[#DF0C88] focus:ring-[#DF0C88]"
                    />
                    <span>Autoplay Active</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Scroll Direction</label>
                    <select
                      value={config.scrollDirection || 'left'}
                      onChange={(e) => updateConfig('scrollDirection', e.target.value as any)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="left">Right-to-Left (Standard)</option>
                      <option value="right">Left-to-Right (Reverse)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Speed: {config.animationSpeed || 38}s Loop</label>
                    <input
                      type="range"
                      min={10}
                      max={80}
                      step={2}
                      value={config.animationSpeed || 38}
                      onChange={(e) => updateConfig('animationSpeed', Number(e.target.value))}
                      className="w-full accent-[#DF0C88]"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>Fast (10s)</span>
                      <span>Gentle (80s)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <label className="flex items-center justify-between cursor-pointer font-semibold text-slate-700">
                    <span>Pause on Hover</span>
                    <input
                      type="checkbox"
                      checked={config.pauseOnHover !== false}
                      onChange={(e) => updateConfig('pauseOnHover', e.target.checked)}
                      className="rounded text-[#DF0C88] focus:ring-[#DF0C88]"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer font-semibold text-slate-700">
                    <span>Pause on Keyboard Focus</span>
                    <input
                      type="checkbox"
                      checked={config.pauseOnFocus !== false}
                      onChange={(e) => updateConfig('pauseOnFocus', e.target.checked)}
                      className="rounded text-[#DF0C88] focus:ring-[#DF0C88]"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer font-semibold text-slate-700">
                    <span>Edge Fade Gradients (Left & Right)</span>
                    <input
                      type="checkbox"
                      checked={config.edgeFade !== false}
                      onChange={(e) => updateConfig('edgeFade', e.target.checked)}
                      className="rounded text-[#DF0C88] focus:ring-[#DF0C88]"
                    />
                  </label>

                  {config.edgeFade !== false && (
                    <div className="grid grid-cols-2 gap-3 pl-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Fade Width (px)</label>
                        <input
                          type="number"
                          value={config.edgeFadeWidth || 80}
                          onChange={(e) => updateConfig('edgeFadeWidth', Number(e.target.value))}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Fade Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={config.edgeFadeColor || config.backgroundColor || '#ffffff'}
                            onChange={(e) => updateConfig('edgeFadeColor', e.target.value)}
                            className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={config.edgeFadeColor || config.backgroundColor || '#ffffff'}
                            onChange={(e) => updateConfig('edgeFadeColor', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded-xl font-mono text-[11px]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <label className="flex items-center justify-between cursor-pointer font-semibold text-slate-700 pt-2 border-t border-slate-100">
                    <span>Show Navigation Arrows</span>
                    <input
                      type="checkbox"
                      checked={config.showNavigationArrows !== false}
                      onChange={(e) => updateConfig('showNavigationArrows', e.target.checked)}
                      className="rounded text-[#DF0C88] focus:ring-[#DF0C88]"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer font-semibold text-slate-700">
                    <span>Mouse Drag & Touch Swipe</span>
                    <input
                      type="checkbox"
                      checked={config.enableDragScroll !== false}
                      onChange={(e) => updateConfig('enableDragScroll', e.target.checked)}
                      className="rounded text-[#DF0C88] focus:ring-[#DF0C88]"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 3. Cards Appearance */}
            {activeTab === 'cards' && (
              <div className="space-y-4 text-xs">
                <h3 className="font-bold text-sm text-slate-900 pb-3 border-b border-slate-100">
                  Logo Card Appearance & Styling
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Card Width (px)</label>
                    <input
                      type="number"
                      value={config.cardWidth || 170}
                      onChange={(e) => updateConfig('cardWidth', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Card Height (px)</label>
                    <input
                      type="number"
                      value={config.cardHeight || 88}
                      onChange={(e) => updateConfig('cardHeight', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Corner Radius (px)</label>
                    <input
                      type="number"
                      value={config.cardBorderRadius ?? 18}
                      onChange={(e) => updateConfig('cardBorderRadius', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Card Spacing / Gap (px)</label>
                    <input
                      type="number"
                      value={config.cardGap ?? 18}
                      onChange={(e) => updateConfig('cardGap', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Card Background</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.cardBg || '#ffffff'}
                        onChange={(e) => updateConfig('cardBg', e.target.value)}
                        className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.cardBg || '#ffffff'}
                        onChange={(e) => updateConfig('cardBg', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded-xl font-mono text-[11px]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Border Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.cardBorderColor || '#e2e8f0'}
                        onChange={(e) => updateConfig('cardBorderColor', e.target.value)}
                        className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.cardBorderColor || '#e2e8f0'}
                        onChange={(e) => updateConfig('cardBorderColor', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded-xl font-mono text-[11px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Shadow</label>
                    <select
                      value={config.cardShadow || 'sm'}
                      onChange={(e) => updateConfig('cardShadow', e.target.value as any)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="none">None</option>
                      <option value="xs">Extra Subtle</option>
                      <option value="sm">Subtle (Default)</option>
                      <option value="md">Medium</option>
                      <option value="lg">Deep Lifted</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Hover Interaction</label>
                    <select
                      value={config.cardHoverEffect || 'lift'}
                      onChange={(e) => updateConfig('cardHoverEffect', e.target.value as any)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="lift">Lift Slightly (-4px)</option>
                      <option value="scale">Subtle Scale (1.05x)</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Logos & Badges */}
            {activeTab === 'logos' && (
              <div className="space-y-4 text-xs">
                <h3 className="font-bold text-sm text-slate-900 pb-3 border-b border-slate-100">
                  Logo Size & Color Effects
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Logo Max Width (px)</label>
                    <input
                      type="number"
                      value={config.logoMaxWidth || 120}
                      onChange={(e) => updateConfig('logoMaxWidth', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Logo Max Height (px)</label>
                    <input
                      type="number"
                      value={config.logoMaxHeight || 40}
                      onChange={(e) => updateConfig('logoMaxHeight', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <label className="flex items-center justify-between cursor-pointer font-semibold text-slate-700">
                    <div>
                      <span>Grayscale Filter</span>
                      <p className="text-[10px] text-slate-400 font-normal">Convert logos into uniform monochrome</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.grayscale === true}
                      onChange={(e) => updateConfig('grayscale', e.target.checked)}
                      className="rounded text-[#DF0C88] focus:ring-[#DF0C88]"
                    />
                  </label>

                  {config.grayscale && (
                    <label className="flex items-center justify-between cursor-pointer font-semibold text-slate-700 pl-2">
                      <div>
                        <span>Color on Hover</span>
                        <p className="text-[10px] text-slate-400 font-normal">Full brand colors reveal when card is hovered</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.grayscaleHoverColor !== false}
                        onChange={(e) => updateConfig('grayscaleHoverColor', e.target.checked)}
                        className="rounded text-[#DF0C88] focus:ring-[#DF0C88]"
                      />
                    </label>
                  )}

                  <label className="flex items-center justify-between cursor-pointer font-semibold text-slate-700 pt-2 border-t border-slate-100">
                    <div>
                      <span>Show Brand Name Text</span>
                      <p className="text-[10px] text-slate-400 font-normal">Render text label underneath the logo</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.showBrandName === true}
                      onChange={(e) => updateConfig('showBrandName', e.target.checked)}
                      className="rounded text-[#DF0C88] focus:ring-[#DF0C88]"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer font-semibold text-slate-700 pt-2 border-t border-slate-100">
                    <div>
                      <span>Show Feature Badge (e.g. Galaxy AI, iOS 18)</span>
                      <p className="text-[10px] text-slate-400 font-normal">Subtle tag in card top corner</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.showBadge === true}
                      onChange={(e) => updateConfig('showBadge', e.target.checked)}
                      className="rounded text-[#DF0C88] focus:ring-[#DF0C88]"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 5. Mobile Phone Brand Management */}
            {activeTab === 'brands' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Mobile Phone Brands Collection</h3>
                    <p className="text-[11px] text-slate-400">
                      Restricted to mobile phone manufacturers. Add, hide, reorder, or customize routing.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBrand}
                    className="px-3 py-1.5 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Brand</span>
                  </button>
                </div>

                {/* Brands List Accordion */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {currentBrands.map((brand, idx) => {
                    const isEditing = editingBrandIndex === idx;

                    return (
                      <div
                        key={brand.id || idx}
                        className={`rounded-2xl border transition-all ${
                          isEditing
                            ? 'border-[#DF0C88] bg-pink-50/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {/* Summary Bar */}
                        <div className="p-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-mono text-[10px] flex items-center justify-center font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-900 truncate">{brand.name}</span>
                            {brand.badge && (
                              <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold shrink-0">
                                {brand.badge}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Reorder Buttons */}
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveBrand(idx, 'up')}
                              className="p-1 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-30 cursor-pointer"
                              title="Move Up"
                            >
                              <MoveUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === currentBrands.length - 1}
                              onClick={() => moveBrand(idx, 'down')}
                              className="p-1 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-30 cursor-pointer"
                              title="Move Down"
                            >
                              <MoveDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Visibility Toggle */}
                            <button
                              type="button"
                              onClick={() => updateBrand(idx, { visible: !brand.visible })}
                              className={`p-1 rounded cursor-pointer ${
                                brand.visible !== false ? 'text-[#DF0C88]' : 'text-slate-300'
                              }`}
                              title={brand.visible !== false ? 'Visible' : 'Hidden'}
                            >
                              {brand.visible !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>

                            {/* Expand / Edit Details */}
                            <button
                              type="button"
                              onClick={() => setEditingBrandIndex(isEditing ? null : idx)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] cursor-pointer"
                            >
                              {isEditing ? 'Close' : 'Edit'}
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => removeBrand(idx)}
                              className="p-1 rounded hover:bg-rose-50 text-rose-500 cursor-pointer"
                              title="Remove Brand"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Expandable Edit Details Form */}
                        {isEditing && (
                          <div className="p-4 pt-1 border-t border-slate-100 space-y-3 bg-slate-50/50 rounded-b-2xl">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">Brand Name</label>
                                <input
                                  type="text"
                                  value={brand.name}
                                  onChange={(e) => updateBrand(idx, { name: e.target.value })}
                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white"
                                />
                              </div>
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">Brand ID (Slug)</label>
                                <input
                                  type="text"
                                  value={brand.id}
                                  onChange={(e) => updateBrand(idx, { id: e.target.value })}
                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white font-mono text-[11px]"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">Built-in Logo Preset</label>
                                <select
                                  value={brand.logoSvgPreset || ''}
                                  onChange={(e) => updateBrand(idx, { logoSvgPreset: e.target.value })}
                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white"
                                >
                                  <option value="">None / Custom URL</option>
                                  {STARTER_MOBILE_BRANDS.map((sb) => (
                                    <option key={sb.id} value={sb.logoSvgPreset}>
                                      {sb.name} Vector Logo
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">Custom Logo Image URL</label>
                                <input
                                  type="text"
                                  value={brand.logoUrl || ''}
                                  onChange={(e) => updateBrand(idx, { logoUrl: e.target.value })}
                                  placeholder="https://... (Optional)"
                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white"
                                />
                              </div>
                            </div>

                            {/* Destination Routing Dropdown & Value */}
                            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                              <span className="font-bold text-slate-800 block">Click Action & Destination</span>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                    Destination Type
                                  </label>
                                  <select
                                    value={brand.destinationType || 'brand_archive'}
                                    onChange={(e) =>
                                      updateBrand(idx, {
                                        destinationType: e.target.value as BrandDestinationType,
                                        destinationValue: '',
                                      })
                                    }
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white font-semibold"
                                  >
                                    <option value="brand_archive">1. Brand Archive (Shop Filter)</option>
                                    <option value="product_category">2. Product Category</option>
                                    <option value="custom_url">3. Custom URL</option>
                                    <option value="internal_page">4. Internal App Page</option>
                                    <option value="none">5. No Link</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                    Destination Target
                                  </label>
                                  {brand.destinationType === 'brand_archive' && (
                                    <input
                                      type="text"
                                      value={brand.destinationValue || brand.id}
                                      onChange={(e) => updateBrand(idx, { destinationValue: e.target.value })}
                                      placeholder="Brand slug (e.g. apple, samsung)"
                                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl"
                                    />
                                  )}

                                  {brand.destinationType === 'product_category' && (
                                    <select
                                      value={brand.destinationValue || ''}
                                      onChange={(e) => updateBrand(idx, { destinationValue: e.target.value })}
                                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white"
                                    >
                                      <option value="">Select Category...</option>
                                      {availableCategories.map((cat) => (
                                        <option key={cat.id} value={cat.slug}>
                                          {cat.name} ({cat.slug})
                                        </option>
                                      ))}
                                    </select>
                                  )}

                                  {brand.destinationType === 'custom_url' && (
                                    <input
                                      type="text"
                                      value={brand.destinationValue || ''}
                                      onChange={(e) => updateBrand(idx, { destinationValue: e.target.value })}
                                      placeholder="https://example.com"
                                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl"
                                    />
                                  )}

                                  {brand.destinationType === 'internal_page' && (
                                    <select
                                      value={brand.destinationValue || ''}
                                      onChange={(e) => updateBrand(idx, { destinationValue: e.target.value })}
                                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white"
                                    >
                                      <option value="">Select Page...</option>
                                      <option value="home">Home</option>
                                      <option value="shop">Shop / Refurbished</option>
                                      <option value="services">Repair Services</option>
                                      <option value="locations">Store Locations</option>
                                      <option value="contact">Contact Us</option>
                                      <option value="track-repair">Track Repair</option>
                                      {availablePages.map((p) => (
                                        <option key={p.id} value={p.slug}>
                                          {p.title} (/{p.slug})
                                        </option>
                                      ))}
                                    </select>
                                  )}

                                  {brand.destinationType === 'none' && (
                                    <div className="text-[11px] text-slate-400 italic py-1.5">
                                      Card will be informative only (no link action).
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">Optional Feature Badge</label>
                                <input
                                  type="text"
                                  value={brand.badge || ''}
                                  onChange={(e) => updateBrand(idx, { badge: e.target.value })}
                                  placeholder="e.g. Galaxy AI, Tensor G4"
                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white"
                                />
                              </div>
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">Alt Text (Accessibility)</label>
                                <input
                                  type="text"
                                  value={brand.altText || ''}
                                  onChange={(e) => updateBrand(idx, { altText: e.target.value })}
                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white"
                                />
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
          </div>
        </div>

        {/* Right Panel: Live Interactive Preview (7 columns) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Device Switcher & Controls */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-600 mr-2">Preview Viewport:</span>
              <button
                type="button"
                onClick={() => setDevicePreview('desktop')}
                className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  devicePreview === 'desktop'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop (1280px)</span>
              </button>
              <button
                type="button"
                onClick={() => setDevicePreview('tablet')}
                className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  devicePreview === 'tablet'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Tablet className="w-3.5 h-3.5" />
                <span>Tablet (768px)</span>
              </button>
              <button
                type="button"
                onClick={() => setDevicePreview('mobile')}
                className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  devicePreview === 'mobile'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile (375px)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">
                {currentBrands.filter((b) => b.visible !== false).length} active brands
              </span>
            </div>
          </div>

          {/* Render Frame */}
          <div className="bg-slate-200/80 rounded-3xl p-4 sm:p-6 border border-slate-300/80 shadow-inner overflow-hidden flex justify-center">
            <div
              className="bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 w-full"
              style={{
                maxWidth:
                  devicePreview === 'mobile'
                    ? '385px'
                    : devicePreview === 'tablet'
                    ? '768px'
                    : '100%',
              }}
            >
              {/* Fake Browser Window Header */}
              <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between text-xs select-none">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="ml-2 font-mono text-[10px] text-slate-400">
                    https://irepairmobiles.co.uk/#popular-brands
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-300 font-mono">
                  <span>LIVE COMPONENT</span>
                </div>
              </div>

              {/* Actual Widget Rendered with full props and live reactivity */}
              <MobilePhoneBrandsMarqueeWidget settings={config} isPreview={true} />
            </div>
          </div>

          {/* Help & Documentation Note */}
          <div className="bg-pink-50/60 rounded-2xl p-4 border border-pink-100 text-xs text-slate-600 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-[#DF0C88] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-slate-900">Seamless Infinite Looping Engine</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                The marquee automatically duplicates and staggers the mobile phone brand elements to achieve an infinite,
                gapless, zero-stutter loop. Hovering pauses the scroll for easy viewing and clicking.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
