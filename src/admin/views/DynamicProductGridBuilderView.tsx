import React, { useState, useEffect } from 'react';
import {
  DynamicProductGridWidget,
  DynamicProductGridConfig,
  DEFAULT_DYNAMIC_PRODUCT_GRID_CONFIG,
  ConditionTabConfig,
  BrandFilterConfig,
} from '../../widgets/components/DynamicProductGridWidget';
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
  ExternalLink,
  Sparkles,
  Layers,
  Settings,
  Palette,
  Type,
  Grid,
  Image as ImageIcon,
  DollarSign,
  Tag,
  Layout,
  Code,
  FileText,
  AlertCircle
} from 'lucide-react';

const PRESETS: Record<string, Partial<DynamicProductGridConfig>> = {
  'iRepair Featured Grid': {
    widgetName: 'iRepair Featured Grid',
    sectionHeading: 'Popular certified refurbished phones & tech',
    subtitle: 'All devices thoroughly tested with 70-point diagnostics and 12-month free warranty',
    headingColor: '#0f172a',
    backgroundColor: '#f8fafc',
    pricingMode: 'outright_only',
    showConditionTabs: true,
    showBrandFilters: true,
    accentColor: '#DF0C88',
    cardBorderRadius: 20,
    buttonBg: '#0f172a',
    buttonHoverBg: '#DF0C88',
    showPromoBanner: true,
    promoBg: '#0f172a',
    promoTitle: 'Trade in your old phone & get up to £300 off',
    columnsDesktop: 4,
  },
  'Apple Refurbished Store': {
    widgetName: 'Apple Certified Grid',
    sectionHeading: 'Apple Certified Refurbished',
    subtitle: 'Tested to pristine standards, new battery & outer shell, 1-year guarantee',
    headingColor: '#1d1d1f',
    backgroundColor: '#ffffff',
    pricingMode: 'outright_only',
    showConditionTabs: true,
    showBrandFilters: true,
    defaultBrandFilter: 'Apple',
    accentColor: '#0071e3',
    cardBorderRadius: 18,
    buttonBg: '#0071e3',
    buttonHoverBg: '#0077ed',
    showPromoBanner: false,
    columnsDesktop: 3,
  },
  'Cyber Minimal Dark': {
    widgetName: 'Cyber Dark Grid',
    sectionHeading: 'Next-Gen Mobile Hardware',
    subtitle: 'High performance flagships inspected with 70-point diagnostics',
    headingColor: '#f8fafc',
    backgroundColor: '#090d16',
    cardBg: '#131b2e',
    cardBorderColor: '#1e293b',
    cardTitleColor: '#f1f5f9',
    priceColor: '#38bdf8',
    accentColor: '#38bdf8',
    tabActiveBg: '#38bdf8',
    tabActiveText: '#090d16',
    tabInactiveBg: '#1e293b',
    tabInactiveText: '#94a3b8',
    buttonBg: '#38bdf8',
    buttonTextColor: '#090d16',
    showPromoBanner: true,
    promoBg: '#1e293b',
    columnsDesktop: 4,
  },
  'Carousel Mode': {
    widgetName: 'Smooth Product Carousel',
    sectionHeading: 'Hot Trending Picks',
    subtitle: 'Swipe or click arrows to explore our best deals this week',
    displayMode: 'carousel',
    showCarouselArrows: true,
    columnsDesktop: 4,
    showPromoBanner: false,
  },
};

export const DynamicProductGridBuilderView: React.FC = () => {
  const [config, setConfig] = useState<DynamicProductGridConfig>(() => {
    const saved = localStorage.getItem('irepair_dynamic_product_grid_custom_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_DYNAMIC_PRODUCT_GRID_CONFIG,
          ...parsed,
          pricingMode: 'outright_only',
          upfrontCostText: '',
          monthlyTermMonths: 0,
        };
      } catch (e) {
        return DEFAULT_DYNAMIC_PRODUCT_GRID_CONFIG;
      }
    }
    return DEFAULT_DYNAMIC_PRODUCT_GRID_CONFIG;
  });

  const [activeTabSection, setActiveTabSection] = useState<number>(1);
  const [devicePreview, setDevicePreview] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [applyingToPage, setApplyingToPage] = useState(false);
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(null);

  // Helper to update shallow setting
  const updateConfig = (key: keyof DynamicProductGridConfig, val: any) => {
    setConfig((prev) => ({ ...prev, [key]: val }));
  };

  // Reset to default
  const handleReset = () => {
    setConfig(DEFAULT_DYNAMIC_PRODUCT_GRID_CONFIG);
    localStorage.removeItem('irepair_dynamic_product_grid_custom_config');
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  // Save to localStorage
  const handleSave = () => {
    localStorage.setItem('irepair_dynamic_product_grid_custom_config', JSON.stringify(config));
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  // Copy JSON
  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Apply to Homepage via CMS API
  const handleApplyToHomepage = async () => {
    setApplyingToPage(true);
    try {
      const res = await fetch('/api/cms/pages/home');
      if (!res.ok) throw new Error('Failed to fetch home page');
      const page = await res.json();
      const sections = [...(page.sections || [])];

      // Check if dynamic_product_grid already exists, update it, otherwise insert after hero
      const existingIdx = sections.findIndex((s: any) => s.type === 'dynamic_product_grid');
      const newSection = {
        id: existingIdx >= 0 ? sections[existingIdx].id : `dpg-${Date.now()}`,
        type: 'dynamic_product_grid',
        order: existingIdx >= 0 ? sections[existingIdx].order : 3,
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
        sections.splice(2, 0, newSection);
      }

      const updateRes = await fetch('/api/cms/pages/home', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...page,
          sections,
        }),
      });

      if (updateRes.ok) {
        setApplySuccessMessage('Successfully published Dynamic Product Grid to the live Homepage!');
        setTimeout(() => setApplySuccessMessage(null), 4000);
      } else {
        throw new Error('API save returned status ' + updateRes.status);
      }
    } catch (err: any) {
      console.error(err);
      setApplySuccessMessage('Saved locally! (Database sync note: check admin pages manager)');
      setTimeout(() => setApplySuccessMessage(null), 4000);
    } finally {
      setApplyingToPage(false);
    }
  };

  // Apply a preset
  const handleApplyPreset = (presetName: string) => {
    const presetData = PRESETS[presetName];
    if (presetData) {
      setConfig((prev) => ({ ...prev, ...presetData }));
    }
  };

  // Section title list
  const sectionsList = [
    { id: 1, title: '1. General Settings', icon: Settings },
    { id: 2, title: '2. Product Source', icon: Layers },
    { id: 3, title: '3. Condition Tabs', icon: Tag },
    { id: 4, title: '4. Brand Filters & Logos', icon: Sparkles },
    { id: 5, title: '5. Product Grid & Layout', icon: Grid },
    { id: 6, title: '6. Product Cards', icon: Layout },
    { id: 7, title: '7. Product Images', icon: ImageIcon },
    { id: 8, title: '8. Product Information', icon: FileText },
    { id: 9, title: '9. Pricing & Terms', icon: DollarSign },
    { id: 10, title: '10. Promotional Content', icon: Sparkles },
    { id: 11, title: '11. Buttons & CTA', icon: Sliders },
    { id: 12, title: '12. Typography', icon: Type },
    { id: 13, title: '13. Colors & Backgrounds', icon: Palette },
    { id: 14, title: '14. Borders & Shadows', icon: Layout },
    { id: 15, title: '15. Spacing & Dimensions', icon: Grid },
    { id: 16, title: '16. Responsive Settings', icon: Smartphone },
    { id: 17, title: '17. Carousel Settings', icon: Sliders },
    { id: 18, title: '18. Advanced & Export', icon: Code },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-900 text-slate-100 overflow-hidden font-sans">
      
      {/* ================= TOP CONTROLS TOOLBAR ================= */}
      <div className="h-14 border-b border-slate-800 bg-slate-950 px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#DF0C88] flex items-center justify-center text-white font-black text-sm">
            DG
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
              Dynamic Product Grid Builder
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-mono px-2 py-0.5 rounded-full font-bold">
                Live Editor
              </span>
            </h1>
            <p className="text-[10px] text-slate-400">
              Interactive two-panel visual configuration with real-time updates
            </p>
          </div>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setDevicePreview('desktop')}
            className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              devicePreview === 'desktop'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setDevicePreview('tablet')}
            className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              devicePreview === 'tablet'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => setDevicePreview('mobile')}
            className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              devicePreview === 'mobile'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>

        {/* Presets and Actions */}
        <div className="flex items-center gap-2">
          {/* Preset Selector */}
          <select
            onChange={(e) => {
              if (e.target.value) handleApplyPreset(e.target.value);
            }}
            defaultValue=""
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 cursor-pointer font-medium focus:outline-none"
          >
            <option value="" disabled>Load Preset...</option>
            {Object.keys(PRESETS).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleCopyJson}
            className="p-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-800 cursor-pointer transition-all"
            title="Copy JSON configuration"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{copied ? 'Copied!' : 'JSON'}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-800 cursor-pointer transition-all"
            title="Reset to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savedNotice ? 'Saved!' : 'Save Preset'}</span>
          </button>

          <button
            type="button"
            onClick={handleApplyToHomepage}
            disabled={applyingToPage}
            className="px-3.5 py-1.5 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{applyingToPage ? 'Publishing...' : 'Publish to Home'}</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {applySuccessMessage && (
        <div className="bg-emerald-600 text-white text-xs px-5 py-2 font-bold flex items-center justify-between shrink-0 animate-fade-in">
          <span>{applySuccessMessage}</span>
          <button
            type="button"
            onClick={() => setApplySuccessMessage(null)}
            className="text-white hover:text-emerald-100 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* ================= MAIN SPLIT PANELS ================= */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ---------------- LEFT PANEL: ACCORDION SETTINGS (420px) ---------------- */}
        <div className="w-[420px] bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 overflow-hidden">
          <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              18 Settings Sections
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Click section to edit</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 custom-scrollbar">
            {sectionsList.map((sec) => {
              const isOpen = activeTabSection === sec.id;
              const IconComp = sec.icon;

              return (
                <div key={sec.id} className="bg-slate-950">
                  <button
                    type="button"
                    onClick={() => setActiveTabSection(isOpen ? 0 : sec.id)}
                    className={`w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold transition-all cursor-pointer ${
                      isOpen
                        ? 'bg-slate-900 text-[#DF0C88] border-l-4 border-[#DF0C88]'
                        : 'text-slate-300 hover:bg-slate-900/50 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComp className={`w-4 h-4 ${isOpen ? 'text-[#DF0C88]' : 'text-slate-400'}`} />
                      <span>{sec.title}</span>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>

                  {/* Accordion Content */}
                  {isOpen && (
                    <div className="p-4 bg-slate-900/40 space-y-4 text-xs border-t border-slate-800/50">
                      
                      {/* 1. GENERAL SETTINGS */}
                      {sec.id === 1 && (
                        <div className="space-y-3.5">
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">Widget Name</label>
                            <input
                              type="text"
                              value={config.widgetName || ''}
                              onChange={(e) => updateConfig('widgetName', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                            />
                          </div>

                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-300 font-semibold">Enable Widget Entirely</span>
                            <input
                              type="checkbox"
                              checked={config.enableWidget !== false}
                              onChange={(e) => updateConfig('enableWidget', e.target.checked)}
                              className="accent-[#DF0C88] w-4 h-4"
                            />
                          </div>

                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-300 font-semibold">Show Section Heading</span>
                            <input
                              type="checkbox"
                              checked={config.showSectionHeading !== false}
                              onChange={(e) => updateConfig('showSectionHeading', e.target.checked)}
                              className="accent-[#DF0C88] w-4 h-4"
                            />
                          </div>

                          {config.showSectionHeading && (
                            <div>
                              <label className="text-[11px] font-bold text-slate-400 block mb-1">Heading Text</label>
                              <input
                                type="text"
                                value={config.sectionHeading || ''}
                                onChange={(e) => updateConfig('sectionHeading', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-300 font-semibold">Show Subtitle</span>
                            <input
                              type="checkbox"
                              checked={config.showSubtitle !== false}
                              onChange={(e) => updateConfig('showSubtitle', e.target.checked)}
                              className="accent-[#DF0C88] w-4 h-4"
                            />
                          </div>

                          {config.showSubtitle && (
                            <div>
                              <label className="text-[11px] font-bold text-slate-400 block mb-1">Subtitle Text</label>
                              <textarea
                                rows={2}
                                value={config.subtitle || ''}
                                onChange={(e) => updateConfig('subtitle', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                              />
                            </div>
                          )}

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">Heading Alignment</label>
                            <div className="grid grid-cols-3 gap-2">
                              {(['left', 'center', 'right'] as const).map((align) => (
                                <button
                                  key={align}
                                  type="button"
                                  onClick={() => updateConfig('headingAlignment', align)}
                                  className={`py-1.5 rounded-lg font-bold capitalize ${
                                    config.headingAlignment === align
                                      ? 'bg-[#DF0C88] text-white'
                                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                                  }`}
                                >
                                  {align}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">Content Width Layout</label>
                            <div className="grid grid-cols-3 gap-2">
                              {(['boxed', 'full', 'narrow'] as const).map((w) => (
                                <button
                                  key={w}
                                  type="button"
                                  onClick={() => updateConfig('layoutWidth', w)}
                                  className={`py-1.5 rounded-lg font-bold capitalize ${
                                    config.layoutWidth === w
                                      ? 'bg-[#DF0C88] text-white'
                                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                                  }`}
                                >
                                  {w}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">Display Mode</label>
                            <div className="grid grid-cols-2 gap-2">
                              {(['grid', 'carousel'] as const).map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => updateConfig('displayMode', m)}
                                  className={`py-1.5 rounded-lg font-bold uppercase tracking-wider ${
                                    config.displayMode === m
                                      ? 'bg-[#DF0C88] text-white'
                                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                                  }`}
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 2. PRODUCT SOURCE */}
                      {sec.id === 2 && (
                        <div className="space-y-3.5">
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">Product Filter Category</label>
                            <select
                              value={config.productSource || 'all'}
                              onChange={(e) => updateConfig('productSource', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                            >
                              <option value="all">All Store Products</option>
                              <option value="smartphones">Smartphones Only</option>
                              <option value="featured">Featured Devices Only</option>
                              <option value="sale">Sale / Discounted Only</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">
                              Max Products to Display: {config.maxProducts || 12}
                            </label>
                            <input
                              type="range"
                              min={2}
                              max={24}
                              value={config.maxProducts || 12}
                              onChange={(e) => updateConfig('maxProducts', Number(e.target.value))}
                              className="w-full accent-[#DF0C88]"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">Default Sorting</label>
                            <select
                              value={config.defaultSort || 'featured'}
                              onChange={(e) => updateConfig('defaultSort', e.target.value as any)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                            >
                              <option value="featured">Featured First</option>
                              <option value="price-asc">Price: Low to High</option>
                              <option value="price-desc">Price: High to Low</option>
                              <option value="rating">Top Rated</option>
                            </select>
                          </div>

                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-300 font-semibold">Include Out-of-Stock Items</span>
                            <input
                              type="checkbox"
                              checked={config.includeOutOfStock !== false}
                              onChange={(e) => updateConfig('includeOutOfStock', e.target.checked)}
                              className="accent-[#DF0C88] w-4 h-4"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">Empty State Message</label>
                            <input
                              type="text"
                              value={config.emptyStateMessage || ''}
                              onChange={(e) => updateConfig('emptyStateMessage', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                            />
                          </div>
                        </div>
                      )}

                      {/* 3. CONDITION TABS */}
                      {sec.id === 3 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-300 font-semibold">Show Condition Filter Tabs</span>
                            <input
                              type="checkbox"
                              checked={config.showConditionTabs !== false}
                              onChange={(e) => updateConfig('showConditionTabs', e.target.checked)}
                              className="accent-[#DF0C88] w-4 h-4"
                            />
                          </div>

                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-300 font-semibold">Show 'All Conditions' Tab</span>
                            <input
                              type="checkbox"
                              checked={config.showAllConditionTab !== false}
                              onChange={(e) => updateConfig('showAllConditionTab', e.target.checked)}
                              className="accent-[#DF0C88] w-4 h-4"
                            />
                          </div>

                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-300 font-semibold">Show Product Count in Tabs</span>
                            <input
                              type="checkbox"
                              checked={config.showProductCountInTabs !== false}
                              onChange={(e) => updateConfig('showProductCountInTabs', e.target.checked)}
                              className="accent-[#DF0C88] w-4 h-4"
                            />
                          </div>

                          {/* Repeater: Condition Tabs List */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Manage Tabs ({config.conditionTabs?.length || 0})
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const newTab: ConditionTabConfig = {
                                    id: `tab_${Date.now()}`,
                                    label: 'Open Box',
                                    conditionValue: 'Open Box',
                                    enabled: true,
                                    badgeText: 'Special',
                                    badgeBg: '#fce7f3',
                                    badgeColor: '#be185d',
                                  };
                                  updateConfig('conditionTabs', [...(config.conditionTabs || []), newTab]);
                                }}
                                className="text-[10px] font-bold text-[#DF0C88] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" /> Add Tab
                              </button>
                            </div>

                            <div className="space-y-2">
                              {(config.conditionTabs || []).map((tab, idx) => (
                                <div
                                  key={tab.id}
                                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={tab.enabled}
                                        onChange={(e) => {
                                          const next = [...(config.conditionTabs || [])];
                                          next[idx].enabled = e.target.checked;
                                          updateConfig('conditionTabs', next);
                                        }}
                                        className="accent-[#DF0C88]"
                                      />
                                      <span className="font-bold text-white text-xs">{tab.label}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = (config.conditionTabs || []).filter((_, i) => i !== idx);
                                        updateConfig('conditionTabs', next);
                                      }}
                                      className="text-slate-500 hover:text-red-400 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <span className="text-[10px] text-slate-500 block">Tab Label</span>
                                      <input
                                        type="text"
                                        value={tab.label}
                                        onChange={(e) => {
                                          const next = [...(config.conditionTabs || [])];
                                          next[idx].label = e.target.value;
                                          updateConfig('conditionTabs', next);
                                        }}
                                        className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
                                      />
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-slate-500 block">Match Keyword</span>
                                      <input
                                        type="text"
                                        value={tab.conditionValue}
                                        onChange={(e) => {
                                          const next = [...(config.conditionTabs || [])];
                                          next[idx].conditionValue = e.target.value;
                                          updateConfig('conditionTabs', next);
                                        }}
                                        className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 4. BRAND FILTERS */}
                      {sec.id === 4 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-300 font-semibold">Show Brand Filter Strip</span>
                            <input
                              type="checkbox"
                              checked={config.showBrandFilters !== false}
                              onChange={(e) => updateConfig('showBrandFilters', e.target.checked)}
                              className="accent-[#DF0C88] w-4 h-4"
                            />
                          </div>

                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-300 font-semibold">Show 'All Brands' Pill</span>
                            <input
                              type="checkbox"
                              checked={config.showAllBrandsPill !== false}
                              onChange={(e) => updateConfig('showAllBrandsPill', e.target.checked)}
                              className="accent-[#DF0C88] w-4 h-4"
                            />
                          </div>

                          {/* Repeater: Brand List */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Manage Brands ({config.brandFilters?.length || 0})
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const newBrand: BrandFilterConfig = {
                                    id: `brand_${Date.now()}`,
                                    name: 'Xiaomi',
                                    slug: 'Xiaomi',
                                    logoUrl: 'https://ee.co.uk/content/dam/ee/logos/brand-logos/GoogleLogo_72x72_1x1.png',
                                    enabled: true,
                                  };
                                  updateConfig('brandFilters', [...(config.brandFilters || []), newBrand]);
                                }}
                                className="text-[10px] font-bold text-[#DF0C88] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" /> Add Brand
                              </button>
                            </div>

                            <div className="space-y-2">
                              {(config.brandFilters || []).map((brand, idx) => (
                                <div
                                  key={brand.id}
                                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={brand.enabled}
                                        onChange={(e) => {
                                          const next = [...(config.brandFilters || [])];
                                          next[idx].enabled = e.target.checked;
                                          updateConfig('brandFilters', next);
                                        }}
                                        className="accent-[#DF0C88]"
                                      />
                                      {brand.logoUrl && (
                                        <img src={brand.logoUrl} alt="" className="w-4 h-4 object-contain" />
                                      )}
                                      <span className="font-bold text-white text-xs">{brand.name}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = (config.brandFilters || []).filter((_, i) => i !== idx);
                                        updateConfig('brandFilters', next);
                                      }}
                                      className="text-slate-500 hover:text-red-400 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <span className="text-[10px] text-slate-500 block">Brand Name</span>
                                      <input
                                        type="text"
                                        value={brand.name}
                                        onChange={(e) => {
                                          const next = [...(config.brandFilters || [])];
                                          next[idx].name = e.target.value;
                                          next[idx].slug = e.target.value;
                                          updateConfig('brandFilters', next);
                                        }}
                                        className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
                                      />
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-slate-500 block">Logo URL</span>
                                      <input
                                        type="text"
                                        value={brand.logoUrl || ''}
                                        onChange={(e) => {
                                          const next = [...(config.brandFilters || [])];
                                          next[idx].logoUrl = e.target.value;
                                          updateConfig('brandFilters', next);
                                        }}
                                        className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white font-mono"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 5. PRODUCT GRID */}
                      {sec.id === 5 && (
                        <div className="space-y-3.5">
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">
                              Desktop Columns: {config.columnsDesktop || 4}
                            </label>
                            <input
                              type="range"
                              min={1}
                              max={6}
                              value={config.columnsDesktop || 4}
                              onChange={(e) => updateConfig('columnsDesktop', Number(e.target.value))}
                              className="w-full accent-[#DF0C88]"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">
                              Tablet Columns: {config.columnsTablet || 2}
                            </label>
                            <input
                              type="range"
                              min={1}
                              max={4}
                              value={config.columnsTablet || 2}
                              onChange={(e) => updateConfig('columnsTablet', Number(e.target.value))}
                              className="w-full accent-[#DF0C88]"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">
                              Mobile Columns: {config.columnsMobile || 1}
                            </label>
                            <input
                              type="range"
                              min={1}
                              max={2}
                              value={config.columnsMobile || 1}
                              onChange={(e) => updateConfig('columnsMobile', Number(e.target.value))}
                              className="w-full accent-[#DF0C88]"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">
                              Card Gap: {config.cardGap || 20}px
                            </label>
                            <input
                              type="range"
                              min={8}
                              max={40}
                              value={config.cardGap || 20}
                              onChange={(e) => updateConfig('cardGap', Number(e.target.value))}
                              className="w-full accent-[#DF0C88]"
                            />
                          </div>
                        </div>
                      )}

                      {/* 6. PRODUCT CARDS */}
                      {sec.id === 6 && (
                        <div className="space-y-3.5">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] font-bold text-slate-400 block mb-1">Card Background</label>
                              <input
                                type="color"
                                value={config.cardBg || '#ffffff'}
                                onChange={(e) => updateConfig('cardBg', e.target.value)}
                                className="w-full h-8 bg-transparent cursor-pointer rounded"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-400 block mb-1">Card Border Color</label>
                              <input
                                type="color"
                                value={config.cardBorderColor || '#e2e8f0'}
                                onChange={(e) => updateConfig('cardBorderColor', e.target.value)}
                                className="w-full h-8 bg-transparent cursor-pointer rounded"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">
                              Border Radius: {config.cardBorderRadius || 20}px
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={40}
                              value={config.cardBorderRadius || 20}
                              onChange={(e) => updateConfig('cardBorderRadius', Number(e.target.value))}
                              className="w-full accent-[#DF0C88]"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">
                              Card Internal Padding: {config.cardPadding || 16}px
                            </label>
                            <input
                              type="range"
                              min={8}
                              max={32}
                              value={config.cardPadding || 16}
                              onChange={(e) => updateConfig('cardPadding', Number(e.target.value))}
                              className="w-full accent-[#DF0C88]"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">Card Shadow</label>
                            <select
                              value={config.cardShadow || 'hover-lift'}
                              onChange={(e) => updateConfig('cardShadow', e.target.value as any)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                            >
                              <option value="none">None</option>
                              <option value="sm">Subtle (sm)</option>
                              <option value="md">Medium (md)</option>
                              <option value="lg">Large (lg)</option>
                              <option value="hover-lift">Hover Lift & Elevation</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* 7. PRODUCT IMAGES */}
                      {sec.id === 7 && (
                        <div className="space-y-3.5">
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">
                              Image Stage Height: {config.imageHeight || 210}px
                            </label>
                            <input
                              type="range"
                              min={120}
                              max={320}
                              value={config.imageHeight || 210}
                              onChange={(e) => updateConfig('imageHeight', Number(e.target.value))}
                              className="w-full accent-[#DF0C88]"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">Image Fit</label>
                            <select
                              value={config.imageFit || 'contain'}
                              onChange={(e) => updateConfig('imageFit', e.target.value as any)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                            >
                              <option value="contain">Contain (Crisp Device Isolated)</option>
                              <option value="cover">Cover (Fill Container)</option>
                            </select>
                          </div>

                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-300 font-semibold">Enable Image Hover Zoom</span>
                            <input
                              type="checkbox"
                              checked={config.enableImageZoomOnHover !== false}
                              onChange={(e) => updateConfig('enableImageZoomOnHover', e.target.checked)}
                              className="accent-[#DF0C88] w-4 h-4"
                            />
                          </div>
                        </div>
                      )}

                      {/* 8. PRODUCT INFORMATION */}
                      {sec.id === 8 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-300 font-semibold">Show Brand Label</span>
                            <input
                              type="checkbox"
                              checked={config.showBrandBadge !== false}
                              onChange={(e) => updateConfig('showBrandBadge', e.target.checked)}
                              className="accent-[#DF0C88] w-4 h-4"
                            />
                          </div>

                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-300 font-semibold">Show Condition Pill Badge</span>
                            <input
                              type="checkbox"
                              checked={config.showConditionBadge !== false}
                              onChange={(e) => updateConfig('showConditionBadge', e.target.checked)}
                              className="accent-[#DF0C88] w-4 h-4"
                            />
                          </div>

                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-300 font-semibold">Show Star Ratings</span>
                            <input
                              type="checkbox"
                              checked={config.showRatings !== false}
                              onChange={(e) => updateConfig('showRatings', e.target.checked)}
                              className="accent-[#DF0C88] w-4 h-4"
                            />
                          </div>

                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-300 font-semibold">Show Specs Highlights</span>
                            <input
                              type="checkbox"
                              checked={config.showSpecsList !== false}
                              onChange={(e) => updateConfig('showSpecsList', e.target.checked)}
                              className="accent-[#DF0C88] w-4 h-4"
                            />
                          </div>

                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-300 font-semibold">Show Next-Day Delivery Badge</span>
                            <input
                              type="checkbox"
                              checked={config.showDeliveryBadge !== false}
                              onChange={(e) => updateConfig('showDeliveryBadge', e.target.checked)}
                              className="accent-[#DF0C88] w-4 h-4"
                            />
                          </div>
                        </div>
                      )}

                      {/* 9. PRICING */}
                      {sec.id === 9 && (
                        <div className="space-y-3.5">
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">Pricing Display Mode</label>
                            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
                              <span className="font-bold text-emerald-400 block mb-0.5">Real Outright Retail Price</span>
                              Displays the actual selling price (e.g. £179.00), strikethrough original price, and savings badge.
                            </div>
                          </div>

                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-300 font-semibold">Show Strikethrough Original Price</span>
                            <input
                              type="checkbox"
                              checked={config.showRegularPriceStrikethrough !== false}
                              onChange={(e) => updateConfig('showRegularPriceStrikethrough', e.target.checked)}
                              className="accent-[#DF0C88] w-4 h-4"
                            />
                          </div>

                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-300 font-semibold">Show 'Save £X' Badge</span>
                            <input
                              type="checkbox"
                              checked={config.showSavingsBadge !== false}
                              onChange={(e) => updateConfig('showSavingsBadge', e.target.checked)}
                              className="accent-[#DF0C88] w-4 h-4"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">Savings Badge Text</label>
                            <input
                              type="text"
                              value={config.savingsBadgeText || 'Save'}
                              onChange={(e) => updateConfig('savingsBadgeText', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                              placeholder="Save"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">Currency Symbol</label>
                            <input
                              type="text"
                              value={config.currencySymbol || '£'}
                              onChange={(e) => updateConfig('currencySymbol', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                              placeholder="£"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">Price Font Size: {config.priceFontSize || 22}px</label>
                            <input
                              type="range"
                              min={16}
                              max={32}
                              step={1}
                              value={config.priceFontSize || 22}
                              onChange={(e) => updateConfig('priceFontSize', Number(e.target.value))}
                              className="w-full accent-[#DF0C88]"
                            />
                          </div>
                        </div>
                      )}

                      {/* 10. PROMOTIONAL CONTENT */}
                      {sec.id === 10 && (
                        <div className="space-y-3.5">
                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-300 font-semibold">Show Promotional Banner</span>
                            <input
                              type="checkbox"
                              checked={config.showPromoBanner !== false}
                              onChange={(e) => updateConfig('showPromoBanner', e.target.checked)}
                              className="accent-[#DF0C88] w-4 h-4"
                            />
                          </div>

                          {config.showPromoBanner && (
                            <>
                              <div>
                                <label className="text-[11px] font-bold text-slate-400 block mb-1">Banner Position</label>
                                <select
                                  value={config.promoBannerPosition || 'top'}
                                  onChange={(e) => updateConfig('promoBannerPosition', e.target.value as any)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                                >
                                  <option value="top">Top (Above Filters)</option>
                                  <option value="bottom">Bottom (Under Grid)</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-slate-400 block mb-1">Promo Badge</label>
                                <input
                                  type="text"
                                  value={config.promoBadge || ''}
                                  onChange={(e) => updateConfig('promoBadge', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-slate-400 block mb-1">Promo Title</label>
                                <input
                                  type="text"
                                  value={config.promoTitle || ''}
                                  onChange={(e) => updateConfig('promoTitle', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-slate-400 block mb-1">Promo Button Text</label>
                                <input
                                  type="text"
                                  value={config.promoButtonText || ''}
                                  onChange={(e) => updateConfig('promoButtonText', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* 11. BUTTONS */}
                      {sec.id === 11 && (
                        <div className="space-y-3.5">
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">Button Label</label>
                            <input
                              type="text"
                              value={config.buttonText || ''}
                              onChange={(e) => updateConfig('buttonText', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">Button Action</label>
                            <select
                              value={config.buttonAction || 'modal'}
                              onChange={(e) => updateConfig('buttonAction', e.target.value as any)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                            >
                              <option value="modal">Open Product Details Modal</option>
                              <option value="cart">Add Directly to Basket (with check feedback)</option>
                              <option value="shop">Redirect to Full Shop Page</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] font-bold text-slate-400 block mb-1">Button Background</label>
                              <input
                                type="color"
                                value={config.buttonBg || '#0f172a'}
                                onChange={(e) => updateConfig('buttonBg', e.target.value)}
                                className="w-full h-8 bg-transparent cursor-pointer rounded"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-400 block mb-1">Button Text Color</label>
                              <input
                                type="color"
                                value={config.buttonTextColor || '#ffffff'}
                                onChange={(e) => updateConfig('buttonTextColor', e.target.value)}
                                className="w-full h-8 bg-transparent cursor-pointer rounded"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">
                              Button Border Radius: {config.buttonRadius || 14}px
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={30}
                              value={config.buttonRadius || 14}
                              onChange={(e) => updateConfig('buttonRadius', Number(e.target.value))}
                              className="w-full accent-[#DF0C88]"
                            />
                          </div>
                        </div>
                      )}

                      {/* 12. TYPOGRAPHY */}
                      {sec.id === 12 && (
                        <div className="space-y-3.5">
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">
                              Section Heading Size: {config.headingFontSize || 30}px
                            </label>
                            <input
                              type="range"
                              min={18}
                              max={48}
                              value={config.headingFontSize || 30}
                              onChange={(e) => updateConfig('headingFontSize', Number(e.target.value))}
                              className="w-full accent-[#DF0C88]"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">
                              Card Title Size: {config.cardTitleFontSize || 15}px
                            </label>
                            <input
                              type="range"
                              min={12}
                              max={22}
                              value={config.cardTitleFontSize || 15}
                              onChange={(e) => updateConfig('cardTitleFontSize', Number(e.target.value))}
                              className="w-full accent-[#DF0C88]"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">
                              Price Font Size: {config.priceFontSize || 22}px
                            </label>
                            <input
                              type="range"
                              min={16}
                              max={34}
                              value={config.priceFontSize || 22}
                              onChange={(e) => updateConfig('priceFontSize', Number(e.target.value))}
                              className="w-full accent-[#DF0C88]"
                            />
                          </div>
                        </div>
                      )}

                      {/* 13. COLORS AND BACKGROUNDS */}
                      {sec.id === 13 && (
                        <div className="space-y-3.5">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] font-bold text-slate-400 block mb-1">Section Background</label>
                              <input
                                type="color"
                                value={config.backgroundColor || '#f8fafc'}
                                onChange={(e) => updateConfig('backgroundColor', e.target.value)}
                                className="w-full h-8 bg-transparent cursor-pointer rounded"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-400 block mb-1">Brand Accent Color</label>
                              <input
                                type="color"
                                value={config.accentColor || '#DF0C88'}
                                onChange={(e) => updateConfig('accentColor', e.target.value)}
                                className="w-full h-8 bg-transparent cursor-pointer rounded"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 14. BORDERS AND SHADOWS */}
                      {sec.id === 14 && (
                        <div className="space-y-3.5">
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">
                              Card Border Width: {config.cardBorderWidth || 1}px
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={6}
                              value={config.cardBorderWidth || 1}
                              onChange={(e) => updateConfig('cardBorderWidth', Number(e.target.value))}
                              className="w-full accent-[#DF0C88]"
                            />
                          </div>
                        </div>
                      )}

                      {/* 15. SPACING AND DIMENSIONS */}
                      {sec.id === 15 && (
                        <div className="space-y-3.5">
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">
                              Section Padding Top: {config.sectionPaddingTop || 48}px
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={120}
                              value={config.sectionPaddingTop || 48}
                              onChange={(e) => updateConfig('sectionPaddingTop', Number(e.target.value))}
                              className="w-full accent-[#DF0C88]"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">
                              Section Padding Bottom: {config.sectionPaddingBottom || 56}px
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={120}
                              value={config.sectionPaddingBottom || 56}
                              onChange={(e) => updateConfig('sectionPaddingBottom', Number(e.target.value))}
                              className="w-full accent-[#DF0C88]"
                            />
                          </div>
                        </div>
                      )}

                      {/* 16. RESPONSIVE SETTINGS */}
                      {sec.id === 16 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-300 font-semibold">Hide Widget on Mobile Devices</span>
                            <input
                              type="checkbox"
                              checked={config.hideOnMobile || false}
                              onChange={(e) => updateConfig('hideOnMobile', e.target.checked)}
                              className="accent-[#DF0C88] w-4 h-4"
                            />
                          </div>
                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-300 font-semibold">Hide Widget on Desktop Devices</span>
                            <input
                              type="checkbox"
                              checked={config.hideOnDesktop || false}
                              onChange={(e) => updateConfig('hideOnDesktop', e.target.checked)}
                              className="accent-[#DF0C88] w-4 h-4"
                            />
                          </div>
                        </div>
                      )}

                      {/* 17. CAROUSEL SETTINGS */}
                      {sec.id === 17 && (
                        <div className="space-y-3.5">
                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-300 font-semibold">Show Next/Prev Arrow Buttons</span>
                            <input
                              type="checkbox"
                              checked={config.showCarouselArrows !== false}
                              onChange={(e) => updateConfig('showCarouselArrows', e.target.checked)}
                              className="accent-[#DF0C88] w-4 h-4"
                            />
                          </div>
                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-300 font-semibold">Enable Autoplay</span>
                            <input
                              type="checkbox"
                              checked={config.carouselAutoplay || false}
                              onChange={(e) => updateConfig('carouselAutoplay', e.target.checked)}
                              className="accent-[#DF0C88] w-4 h-4"
                            />
                          </div>
                        </div>
                      )}

                      {/* 18. ADVANCED SETTINGS */}
                      {sec.id === 18 && (
                        <div className="space-y-3.5">
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">Custom CSS Class</label>
                            <input
                              type="text"
                              value={config.customCssClass || ''}
                              onChange={(e) => updateConfig('customCssClass', e.target.value)}
                              placeholder="e.g. my-custom-grid"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">HTML Anchor ID</label>
                            <input
                              type="text"
                              value={config.customId || ''}
                              onChange={(e) => updateConfig('customId', e.target.value)}
                              placeholder="e.g. trending-phones-section"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs font-mono"
                            />
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------------- RIGHT PANEL: LIVE INTERACTIVE PREVIEW ---------------- */}
        <div className="flex-1 bg-slate-950 p-4 md:p-6 overflow-y-auto flex flex-col items-center custom-scrollbar">
          
          {/* Device Mockup Wrapper */}
          <div
            className={`transition-all duration-300 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-800 my-auto ${
              devicePreview === 'mobile'
                ? 'w-[375px]'
                : devicePreview === 'tablet'
                ? 'w-[768px]'
                : 'w-full max-w-[1360px]'
            }`}
          >
            {/* Device Bar Indicator */}
            <div className="bg-slate-900 text-slate-400 px-4 py-2 text-[10px] flex items-center justify-between border-b border-slate-800 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Rendered Preview &mdash; {devicePreview.toUpperCase()} ({devicePreview === 'mobile' ? '375px' : devicePreview === 'tablet' ? '768px' : '100%'})
              </span>
              <span>Dynamic Product Grid Widget</span>
            </div>

            {/* Rendered Widget Inside Device */}
            <div className="w-full bg-white text-slate-900">
              <DynamicProductGridWidget
                settings={config}
                isPreview={true}
              />
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
