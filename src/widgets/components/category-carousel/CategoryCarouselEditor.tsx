import React, { useState, useMemo } from 'react';
import {
  CategoryCarouselConfig,
  DeviceMode,
  CategoryCarouselItem,
  DEFAULT_CATEGORY_CAROUSEL_CONFIG,
  SEED_CATEGORIES,
  ContentSourceType,
} from './categoryCarouselTypes';
import {
  CATEGORY_CAROUSEL_PRESETS,
  applyPreset,
} from './categoryCarouselPresets';
import { CategoryCarouselWidget } from './CategoryCarouselWidget';
import {
  DeviceSwitcher,
  ResponsiveNumberInput,
  ResponsiveSelect,
  AccordionGroup,
  ColorInput,
  ContrastBadge,
} from './CategoryCarouselSharedControls';
import { MediaPickerModal } from '../../../admin/components/MediaPickerModal';
import { useApp } from '../../../context/AppContext';
import {
  LayoutGrid,
  Sliders,
  Play,
  Palette,
  Code,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Sparkles,
  Search,
  Check,
  RefreshCw,
  FolderTree,
  Monitor,
  Tablet,
  Smartphone,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface CategoryCarouselEditorProps {
  values: Partial<CategoryCarouselConfig>;
  onChange: (updated: CategoryCarouselConfig) => void;
}

export const CategoryCarouselEditor: React.FC<CategoryCarouselEditorProps> = ({
  values,
  onChange,
}) => {
  // Merge incoming values with complete default configuration
  const config: CategoryCarouselConfig = useMemo(() => {
    return {
      ...DEFAULT_CATEGORY_CAROUSEL_CONFIG,
      ...values,
      selectedCategoryIds:
        values?.selectedCategoryIds || DEFAULT_CATEGORY_CAROUSEL_CONFIG.selectedCategoryIds,
      customItems:
        values?.customItems || DEFAULT_CATEGORY_CAROUSEL_CONFIG.customItems,
      excludeCategoryIds:
        values?.excludeCategoryIds || DEFAULT_CATEGORY_CAROUSEL_CONFIG.excludeCategoryIds,
      itemOverrides:
        values?.itemOverrides || DEFAULT_CATEGORY_CAROUSEL_CONFIG.itemOverrides,
      slidesPerView: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.slidesPerView,
        ...(values?.slidesPerView || {}),
      },
      slidesToScroll: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.slidesToScroll,
        ...(values?.slidesToScroll || {}),
      },
      spaceBetween: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.spaceBetween,
        ...(values?.spaceBetween || {}),
      },
      layoutType: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.layoutType,
        ...(values?.layoutType || {}),
      },
      gridColumns: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.gridColumns,
        ...(values?.gridColumns || {}),
      },
      sectionPaddingTop: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.sectionPaddingTop,
        ...(values?.sectionPaddingTop || {}),
      },
      sectionPaddingBottom: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.sectionPaddingBottom,
        ...(values?.sectionPaddingBottom || {}),
      },
      imageHeight: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.imageHeight,
        ...(values?.imageHeight || {}),
      },
      imageWidth: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.imageWidth,
        ...(values?.imageWidth || {}),
      },
      titleSize: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.titleSize,
        ...(values?.titleSize || {}),
      },
      actionButtonSize: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.actionButtonSize,
        ...(values?.actionButtonSize || {}),
      },
      headingSize: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.headingSize,
        ...(values?.headingSize || {}),
      },
      visibilityResponsive: {
        ...DEFAULT_CATEGORY_CAROUSEL_CONFIG.visibilityResponsive,
        ...(values?.visibilityResponsive || {}),
      },
    };
  }, [values]);

  // Editor states
  const [activeTab, setActiveTab] = useState<'content' | 'layout' | 'behaviour' | 'style' | 'advanced'>('content');
  const [activeDevice, setActiveDevice] = useState<DeviceMode>('desktop');
  const [searchCategoryQuery, setSearchCategoryQuery] = useState('');
  const [editingItemOverrideId, setEditingItemOverrideId] = useState<number | string | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaTargetId, setMediaTargetId] = useState<string | number | null>(null);

  // App context for catalogue categories
  const app = useApp();
  const catalogueCategories = useMemo(() => {
    return Array.isArray(app?.categories) ? app.categories : [];
  }, [app?.categories]);

  // Filtered categories for search selector
  const filteredCategories = useMemo(() => {
    if (!searchCategoryQuery.trim()) return catalogueCategories;
    const q = searchCategoryQuery.toLowerCase();
    return catalogueCategories.filter(
      (c: any) =>
        c.name?.toLowerCase().includes(q) ||
        c.slug?.toLowerCase().includes(q) ||
        String(c.id).includes(q)
    );
  }, [catalogueCategories, searchCategoryQuery]);

  // Helper to update root config
  const updateConfig = (patch: Partial<CategoryCarouselConfig>) => {
    onChange({ ...config, ...patch });
  };

  // Handlers for categories selection & ordering
  const handleToggleCategory = (catId: number) => {
    const current = config.selectedCategoryIds;
    const exists = current.includes(catId);
    let updated: number[];
    if (exists) {
      updated = current.filter((id) => id !== catId);
    } else {
      updated = [...current, catId];
    }
    updateConfig({ selectedCategoryIds: updated });
  };

  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const list = [...config.selectedCategoryIds];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    updateConfig({ selectedCategoryIds: list });
  };

  // Custom Items handlers
  const handleAddCustomItem = () => {
    const newItem: CategoryCarouselItem = {
      id: `custom_${Date.now()}`,
      title: 'New Category',
      image: '/images/categories/cat_mobile-phone.png',
      link: '/shop',
      buttonText: 'Buy Now',
      isCustom: true,
    };
    updateConfig({
      customItems: [...config.customItems, newItem],
    });
  };

  const handleUpdateCustomItem = (id: string | number, patch: Partial<CategoryCarouselItem>) => {
    const updated = config.customItems.map((item) =>
      item.id === id ? { ...item, ...patch } : item
    );
    updateConfig({ customItems: updated });
  };

  const handleDeleteCustomItem = (id: string | number) => {
    updateConfig({
      customItems: config.customItems.filter((i) => i.id !== id),
    });
  };

  // Item Overrides handler
  const handleUpdateOverride = (
    itemId: string | number,
    field: string,
    value: any
  ) => {
    const current = config.itemOverrides[itemId] || {};
    updateConfig({
      itemOverrides: {
        ...config.itemOverrides,
        [itemId]: {
          ...current,
          [field]: value,
        },
      },
    });
  };

  // Apply design preset
  const handleApplyPreset = (presetId: string) => {
    const updated = applyPreset(config, presetId);
    onChange(updated);
  };

  // Reset to default seed
  const handleResetToSeed = () => {
    if (window.confirm('Reset Category Carousel back to the 8 default showcase categories from the reference design?')) {
      updateConfig({
        sourceType: 'catalogue_multi',
        selectedCategoryIds: [1375, 53, 55, 1378, 1347, 136, 149, 1374],
        customItems: SEED_CATEGORIES,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ====================================================================
          TOP TOOLBAR: Title, Device Switcher, Preset Quick-Switch, Reset
          ==================================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">Category Carousel Studio</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  Interactive Builder
                </span>
              </div>
              <p className="text-xs text-slate-400">
                8-card desktop responsive category strip with live catalogue linking & 7 design presets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DeviceSwitcher activeDevice={activeDevice} onChange={setActiveDevice} />
            <button
              type="button"
              onClick={handleResetToSeed}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
              title="Reset to 8 default showcase categories"
            >
              <RefreshCw className="w-3.5 h-3.5 text-pink-400" />
              <span>Reset Default 8</span>
            </button>
          </div>
        </div>

        {/* ==================================================================
            LIVE INTERACTIVE PREVIEW FRAME
            ================================================================== */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 px-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
                Live Viewport Preview:
              </span>
              <span className="font-mono text-pink-400">
                {activeDevice === 'desktop' ? 'Desktop (100% full width)' : activeDevice === 'tablet' ? 'Tablet (768px frame)' : 'Mobile (375px frame)'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span>Previewing current settings live</span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex justify-center overflow-x-auto min-h-[200px]">
            <div
              className="transition-all duration-300 bg-white rounded-lg shadow-inner overflow-hidden"
              style={{
                width: activeDevice === 'desktop' ? '100%' : activeDevice === 'tablet' ? '768px' : '375px',
                maxWidth: '100%',
              }}
            >
              <CategoryCarouselWidget config={config} isEditorPreview />
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          TAB NAVIGATION (Content, Layout, Behaviour, Style, Advanced)
          ==================================================================== */}
      <div className="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('content')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'content'
              ? 'bg-pink-600 text-white shadow-md shadow-pink-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>1. Content Source</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800/80 text-slate-300">
            {config.sourceType === 'catalogue_multi'
              ? `${config.selectedCategoryIds.length || 8}`
              : config.sourceType === 'custom_items'
              ? `${config.customItems.length}`
              : 'Auto'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('layout')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'layout'
              ? 'bg-pink-600 text-white shadow-md shadow-pink-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>2. Layout & Columns</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('behaviour')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'behaviour'
              ? 'bg-pink-600 text-white shadow-md shadow-pink-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>3. Carousel Behaviour</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('style')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'style'
              ? 'bg-pink-600 text-white shadow-md shadow-pink-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>4. Style & 7 Presets</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('advanced')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'advanced'
              ? 'bg-pink-600 text-white shadow-md shadow-pink-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>5. Advanced & A11y</span>
        </button>
      </div>

      {/* ====================================================================
          TAB 1: CONTENT SOURCE
          ==================================================================== */}
      {activeTab === 'content' && (
        <div className="space-y-5">
          {/* Source Strategy Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <label className="block text-xs font-bold text-slate-200 mb-2">
              Select Category Content Source
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[
                {
                  id: 'catalogue_multi',
                  title: 'Select From Catalogue',
                  desc: 'Pick specific categories from your shop database with reordering',
                },
                {
                  id: 'all_top_level',
                  title: 'All Top-Level Categories',
                  desc: 'Auto-fetches all root shop categories with exclusion options',
                },
                {
                  id: 'children_of_parent',
                  title: 'Child Subcategories',
                  desc: 'All child categories of a chosen parent (e.g. Mobile Phones)',
                },
                {
                  id: 'custom_items',
                  title: 'Custom Items / Tiles',
                  desc: 'Fully manual category items with custom images and links',
                },
              ].map((src) => {
                const isSelected = config.sourceType === src.id;
                return (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => updateConfig({ sourceType: src.id as ContentSourceType })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-pink-950/40 border-pink-500 text-white ring-1 ring-pink-500'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-white">{src.title}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-pink-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{src.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Source 1: Catalogue Multi-select */}
          {config.sourceType === 'catalogue_multi' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Catalogue Category Selection</h4>
                  <p className="text-[11px] text-slate-400">
                    Checked categories will appear in the carousel. Use the arrows below to reorder.
                  </p>
                </div>
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchCategoryQuery}
                    onChange={(e) => setSearchCategoryQuery(e.target.value)}
                    placeholder="Search shop categories..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              {/* Selected Categories List with Reordering */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-2">
                  Active in Carousel ({config.selectedCategoryIds.length} categories):
                </label>
                {config.selectedCategoryIds.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-700 text-center text-xs text-slate-400">
                    No categories selected yet. Use the category browser below or click "Reset Default 8".
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {config.selectedCategoryIds.map((catId, idx) => {
                      const cat = catalogueCategories.find((c: any) => c.id === catId);
                      const fallbackSeed = SEED_CATEGORIES.find((s) => s.categoryId === catId || s.id === String(catId));
                      const name = cat?.name || fallbackSeed?.title || `Category #${catId}`;
                      const count = cat?.count ?? 0;
                      const hasOverride = Boolean(config.itemOverrides[catId]);

                      return (
                        <div
                          key={catId}
                          className="flex items-center justify-between bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-[10px] font-mono flex-shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-medium text-slate-100 truncate">{name}</span>
                            <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                              {count} products
                            </span>
                            {hasOverride && (
                              <span className="text-[9px] font-bold text-pink-400 bg-pink-500/10 px-1 py-0.2 rounded border border-pink-500/20">
                                Overridden
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingItemOverrideId(editingItemOverrideId === catId ? null : catId)}
                              className="p-1 rounded text-slate-400 hover:text-pink-400 hover:bg-slate-700 cursor-pointer"
                              title="Edit item overrides"
                            >
                              <Palette className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveCategory(idx, 'up')}
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                              title="Move up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === config.selectedCategoryIds.length - 1}
                              onClick={() => handleMoveCategory(idx, 'down')}
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                              title="Move down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleCategory(catId)}
                              className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Category Browser / Selector */}
              <div className="pt-3 border-t border-slate-800">
                <label className="block text-[11px] font-semibold text-slate-300 mb-2">
                  Add From Catalogue Database ({filteredCategories.length} available):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {filteredCategories.map((cat: any) => {
                    const isSelected = config.selectedCategoryIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleToggleCategory(cat.id)}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-pink-950/30 border-pink-500 text-pink-300'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="truncate">
                          <p className="font-medium truncate">{cat.name}</p>
                          <p className="text-[10px] text-slate-400">{cat.count || 0} items</p>
                        </div>
                        {isSelected ? (
                          <Check className="w-4 h-4 text-pink-400 flex-shrink-0 ml-1" />
                        ) : (
                          <Plus className="w-4 h-4 text-slate-400 flex-shrink-0 ml-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Source 2: Child Subcategories parent selector */}
          {config.sourceType === 'children_of_parent' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-200">Choose Parent Category</h4>
              <p className="text-[11px] text-slate-400">
                Automatically display all subcategories under the selected parent category.
              </p>
              <select
                value={config.parentCategoryId || ''}
                onChange={(e) => updateConfig({ parentCategoryId: parseInt(e.target.value, 10) || undefined })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
              >
                <option value="">-- Choose a parent category --</option>
                {catalogueCategories
                  .filter((c: any) => !c.parent || c.parent === 0)
                  .map((cat: any) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.count || 0} items)
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Source 3: All Top-level with Exclude */}
          {config.sourceType === 'all_top_level' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-200">Exclude Categories</h4>
              <p className="text-[11px] text-slate-400">
                All top-level categories will automatically display. Select any you wish to hide from this carousel.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {catalogueCategories
                  .filter((c: any) => !c.parent || c.parent === 0)
                  .map((cat: any) => {
                    const isExcluded = config.excludeCategoryIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          const list = config.excludeCategoryIds;
                          const updated = isExcluded
                            ? list.filter((id) => id !== cat.id)
                            : [...list, cat.id];
                          updateConfig({ excludeCategoryIds: updated });
                        }}
                        className={`p-2 rounded-xl text-xs border text-left flex items-center justify-between cursor-pointer ${
                          isExcluded
                            ? 'bg-red-950/20 border-red-500/40 text-red-300'
                            : 'bg-slate-800/50 border-slate-700 text-slate-300'
                        }`}
                      >
                        <span className="truncate">{cat.name}</span>
                        <span className="text-[10px] opacity-75">{isExcluded ? 'Excluded' : 'Shown'}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Source 4: Custom Items Builder */}
          {config.sourceType === 'custom_items' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Custom Category Items</h4>
                  <p className="text-[11px] text-slate-400">
                    Define custom cards with independent images, titles, badges, and target URLs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom Card</span>
                </button>
              </div>

              <div className="space-y-3">
                {config.customItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-[10px] font-mono">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-xs text-white">{item.title}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setMediaTargetId(item.id);
                            setMediaPickerOpen(true);
                          }}
                          className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-pink-400 bg-slate-700 px-2 py-1 rounded cursor-pointer"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>Image</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomItem(item.id)}
                          className="p-1 text-red-400 hover:text-red-300 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Title</label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleUpdateCustomItem(item.id, { title: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Link URL</label>
                        <input
                          type="text"
                          value={item.link}
                          onChange={(e) => handleUpdateCustomItem(item.id, { link: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Image URL / Path</label>
                        <input
                          type="text"
                          value={item.image}
                          onChange={(e) => handleUpdateCustomItem(item.id, { image: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Item Override Drawer if open */}
          {editingItemOverrideId !== null && (
            <div className="p-4 bg-slate-950 border border-pink-500/50 rounded-2xl shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-pink-400" />
                  <h4 className="text-xs font-bold text-white">
                    Custom Overrides for Category #{editingItemOverrideId}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingItemOverrideId(null)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Custom Title Override</label>
                  <input
                    type="text"
                    value={config.itemOverrides[editingItemOverrideId]?.title || ''}
                    placeholder="Leave blank to use original category title"
                    onChange={(e) => handleUpdateOverride(editingItemOverrideId, 'title', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Custom Link Override</label>
                  <input
                    type="text"
                    value={config.itemOverrides[editingItemOverrideId]?.link || ''}
                    placeholder="Leave blank to use default category URL"
                    onChange={(e) => handleUpdateOverride(editingItemOverrideId, 'link', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 text-[11px]">Custom Image URL</label>
                    <button
                      type="button"
                      onClick={() => {
                        setMediaTargetId(`override_${editingItemOverrideId}`);
                        setMediaPickerOpen(true);
                      }}
                      className="text-[10px] text-pink-400 hover:underline cursor-pointer"
                    >
                      Pick from Media Library
                    </button>
                  </div>
                  <input
                    type="text"
                    value={config.itemOverrides[editingItemOverrideId]?.image || ''}
                    placeholder="/images/categories/... or URL"
                    onChange={(e) => handleUpdateOverride(editingItemOverrideId, 'image', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Badge Text (e.g. Sale, Hot)</label>
                  <input
                    type="text"
                    value={config.itemOverrides[editingItemOverrideId]?.badgeText || ''}
                    placeholder="Optional badge"
                    onChange={(e) => handleUpdateOverride(editingItemOverrideId, 'badgeText', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Extra Content Options */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-200">Carousel Content Filters & Sorting</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Sort Order</label>
                <select
                  value={config.sortBy}
                  onChange={(e) => updateConfig({ sortBy: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="manual">Manual Order (As Arranged Above)</option>
                  <option value="alpha_asc">Alphabetical (A to Z)</option>
                  <option value="count_desc">By Product Count (Highest First)</option>
                  <option value="newest">Newest Added First</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Maximum Items Limit</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={config.maxItems}
                  onChange={(e) => updateConfig({ maxItems: parseInt(e.target.value, 10) || 8 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex flex-col justify-end space-y-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={config.hideEmptyCategories}
                    onChange={(e) => updateConfig({ hideEmptyCategories: e.target.checked })}
                    className="accent-pink-500 rounded"
                  />
                  <span>Hide empty categories (0 items)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={config.showProductCount}
                    onChange={(e) => updateConfig({ showProductCount: e.target.checked })}
                    className="accent-pink-500 rounded"
                  />
                  <span>Show product count under title</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={config.openInNewTab}
                    onChange={(e) => updateConfig({ openInNewTab: e.target.checked })}
                    className="accent-pink-500 rounded"
                  />
                  <span>Open links in new tab</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 2: LAYOUT & COLUMNS (Responsive)
          ==================================================================== */}
      {activeTab === 'layout' && (
        <div className="space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-200">Responsive Columns & Viewport</h4>
                <p className="text-[11px] text-slate-400">
                  Configure cards visible per screen size. Unset values automatically inherit from the next larger device.
                </p>
              </div>
              <DeviceSwitcher activeDevice={activeDevice} onChange={setActiveDevice} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ResponsiveNumberInput
                label="Cards Visible At Once (Slides Per View)"
                value={config.slidesPerView}
                activeDevice={activeDevice}
                onChange={(updated) => updateConfig({ slidesPerView: updated })}
                min={1}
                max={12}
                step={0.25}
                allowDecimals
                description="Use decimals (e.g. 2.5 or 3.25) to show partial card peek on mobile/tablet"
              />

              <ResponsiveNumberInput
                label="Cards To Scroll Per Click / Swipe"
                value={config.slidesToScroll}
                activeDevice={activeDevice}
                onChange={(updated) => updateConfig({ slidesToScroll: updated })}
                min={1}
                max={8}
                step={1}
                description="How many cards advance on next/prev navigation"
              />

              <ResponsiveNumberInput
                label="Gap Between Cards"
                value={config.spaceBetween}
                activeDevice={activeDevice}
                onChange={(updated) => updateConfig({ spaceBetween: updated })}
                min={0}
                max={48}
                step={2}
                unit="px"
                description="Horizontal spacing between category cards (Default: 12-14px)"
              />

              <ResponsiveSelect
                label="Display Mode"
                value={config.layoutType}
                activeDevice={activeDevice}
                onChange={(updated) => updateConfig({ layoutType: updated })}
                options={[
                  { label: 'Carousel (Horizontal Swiper Slider)', value: 'carousel' },
                  { label: 'Static Multi-Row Grid', value: 'grid' },
                ]}
                description="Switch between a swipeable carousel and a static wrapped grid per device"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-200">Section Dimensions & Padding</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Container Max Width</label>
                <select
                  value={config.containerWidth}
                  onChange={(e) => updateConfig({ containerWidth: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="boxed">Boxed (Max-W 7XL / 90rem)</option>
                  <option value="full">Full Screen Edge-to-Edge</option>
                  <option value="narrow">Narrow Focused (1100px)</option>
                </select>
              </div>

              <div>
                <ResponsiveNumberInput
                  label="Section Padding Top"
                  value={config.sectionPaddingTop}
                  activeDevice={activeDevice}
                  onChange={(updated) => updateConfig({ sectionPaddingTop: updated })}
                  min={0}
                  max={120}
                  step={4}
                  unit="px"
                />
              </div>

              <div>
                <ResponsiveNumberInput
                  label="Section Padding Bottom"
                  value={config.sectionPaddingBottom}
                  activeDevice={activeDevice}
                  onChange={(updated) => updateConfig({ sectionPaddingBottom: updated })}
                  min={0}
                  max={120}
                  step={4}
                  unit="px"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 3: CAROUSEL BEHAVIOUR
          ==================================================================== */}
      {activeTab === 'behaviour' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-200">Looping & Autoplay</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={config.loop}
                  onChange={(e) => updateConfig({ loop: e.target.checked })}
                  className="accent-pink-500 rounded"
                />
                <div>
                  <span className="font-semibold block">Continuous Loop</span>
                  <span className="text-[11px] text-slate-400">Seamless infinite carousel wrap-around</span>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={config.rewind}
                  onChange={(e) => updateConfig({ rewind: e.target.checked })}
                  className="accent-pink-500 rounded"
                />
                <div>
                  <span className="font-semibold block">Rewind to Start</span>
                  <span className="text-[11px] text-slate-400">Smoothly bounce back to first item when reaching end</span>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={config.autoplay}
                  onChange={(e) => updateConfig({ autoplay: e.target.checked })}
                  className="accent-pink-500 rounded"
                />
                <div>
                  <span className="font-semibold block">Enable Autoplay</span>
                  <span className="text-[11px] text-slate-400">Automatically advance slides over time</span>
                </div>
              </label>

              <div>
                <label className="block text-slate-400 mb-1">Autoplay Interval / Delay (ms)</label>
                <input
                  type="number"
                  min={1500}
                  max={20000}
                  step={500}
                  value={config.autoplayDelay}
                  onChange={(e) => updateConfig({ autoplayDelay: parseInt(e.target.value, 10) || 5000 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={config.pauseOnHover}
                  onChange={(e) => updateConfig({ pauseOnHover: e.target.checked })}
                  className="accent-pink-500 rounded"
                />
                <span>Pause on mouse hover</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={config.pauseOffscreen}
                  onChange={(e) => updateConfig({ pauseOffscreen: e.target.checked })}
                  className="accent-pink-500 rounded"
                />
                <span>Pause when scrolled out of viewport (Performance)</span>
              </label>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-200">Interactions & Gestures</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={config.freeScroll}
                  onChange={(e) => updateConfig({ freeScroll: e.target.checked })}
                  className="accent-pink-500 rounded"
                />
                <div>
                  <span className="font-semibold block">Free Scroll / Momentum Drag</span>
                  <span className="text-[11px] text-slate-400">Fluid scrolling without snapping strictly to slide boundaries</span>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={config.keyboardNav}
                  onChange={(e) => updateConfig({ keyboardNav: e.target.checked })}
                  className="accent-pink-500 rounded"
                />
                <div>
                  <span className="font-semibold block">Keyboard Arrow Navigation</span>
                  <span className="text-[11px] text-slate-400">Left/Right keyboard keys control carousel</span>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={config.mousewheelScroll}
                  onChange={(e) => updateConfig({ mousewheelScroll: e.target.checked })}
                  className="accent-pink-500 rounded"
                />
                <div>
                  <span className="font-semibold block">Mousewheel Horizontal Scroll</span>
                  <span className="text-[11px] text-slate-400">Navigate slides with trackpad or mouse wheel</span>
                </div>
              </label>

              <div>
                <label className="block text-slate-400 mb-1">Slide Transition Speed (ms)</label>
                <input
                  type="number"
                  min={100}
                  max={2000}
                  step={50}
                  value={config.autoplaySpeed}
                  onChange={(e) => updateConfig({ autoplaySpeed: parseInt(e.target.value, 10) || 500 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 4: STYLE & 7 ONE-CLICK PRESETS
          ==================================================================== */}
      {activeTab === 'style' && (
        <div className="space-y-4">
          {/* Preset Selector Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  One-Click Design Presets (7 Curated Styles)
                </h4>
              </div>
              <span className="text-[10px] text-slate-400">Applies instant styling matching your theme</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {CATEGORY_CAROUSEL_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset.id)}
                  className={`p-3 rounded-xl border text-left transition-all group cursor-pointer ${
                    config.activePreset === preset.id
                      ? 'border-pink-500 bg-pink-950/30 ring-1 ring-pink-500'
                      : 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 hover:border-pink-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-100 group-hover:text-pink-400">
                      {preset.name}
                    </span>
                    {preset.id === 'light_grey_tiles' && (
                      <span className="text-[9px] bg-pink-500/20 text-pink-300 px-1 rounded">Default</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Section 1: Card Container Styling */}
          <AccordionGroup
            title="Card Container Styling"
            icon={<Palette className="w-4 h-4" />}
            description="Background color, border, corner radius, padding and hover effects"
            defaultOpen
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ColorInput
                label="Card Background Color"
                value={config.cardBgColor}
                onChange={(val) => updateConfig({ cardBgColor: val })}
                description="Default is #e8ecef matching the reference screenshot"
              />

              <ColorInput
                label="Card Border Color"
                value={config.cardBorderColor}
                onChange={(val) => updateConfig({ cardBorderColor: val })}
              />

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-1">
                  Card Corner Radius: {config.cardBorderRadius}px
                </label>
                <input
                  type="range"
                  min={0}
                  max={32}
                  value={config.cardBorderRadius}
                  onChange={(e) => updateConfig({ cardBorderRadius: parseInt(e.target.value, 10) })}
                  className="w-full accent-pink-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-1">
                  Card Padding: {config.cardPadding}px
                </label>
                <input
                  type="range"
                  min={8}
                  max={36}
                  value={config.cardPadding}
                  onChange={(e) => updateConfig({ cardPadding: parseInt(e.target.value, 10) })}
                  className="w-full accent-pink-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-1">
                  Card Min Height: {config.cardMinHeight}px
                </label>
                <input
                  type="range"
                  min={120}
                  max={260}
                  value={config.cardMinHeight}
                  onChange={(e) => updateConfig({ cardMinHeight: parseInt(e.target.value, 10) })}
                  className="w-full accent-pink-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-1">Card Hover Effect</label>
                <select
                  value={config.cardHoverEffect}
                  onChange={(e) => updateConfig({ cardHoverEffect: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="lift">Lift Up (-4px)</option>
                  <option value="scale">Scale Up (1.03x)</option>
                  <option value="glow">Pink Neon Glow</option>
                  <option value="border">Accent Border Highlight</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>
          </AccordionGroup>

          {/* Section 2: Image Styling */}
          <AccordionGroup
            title="Category Image Styling"
            icon={<ImageIcon className="w-4 h-4" />}
            description="Height, fit, shape, and hover animation"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <ResponsiveNumberInput
                  label="Image Height"
                  value={config.imageHeight}
                  activeDevice={activeDevice}
                  onChange={(updated) => updateConfig({ imageHeight: updated })}
                  min={40}
                  max={140}
                  step={2}
                  unit="px"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-1">Image Fit</label>
                <select
                  value={config.imageFit}
                  onChange={(e) => updateConfig({ imageFit: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="contain">Contain (Crisp & Fully Visible)</option>
                  <option value="cover">Cover (Fill Container)</option>
                  <option value="scale-down">Scale Down</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-1">Background Shape Behind Image</label>
                <select
                  value={config.imageHolderShape}
                  onChange={(e) => updateConfig({ imageHolderShape: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="circle">Circular Pod</option>
                  <option value="rounded">Rounded Square Pod</option>
                  <option value="square">Square Pod</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-slate-200 text-xs">
                  <input
                    type="checkbox"
                    checked={config.imageHolderEnabled}
                    onChange={(e) => updateConfig({ imageHolderEnabled: e.target.checked })}
                    className="accent-pink-500 rounded"
                  />
                  <span>Enable shaped pod behind icon</span>
                </label>
              </div>
            </div>
          </AccordionGroup>

          {/* Section 3: Typography */}
          <AccordionGroup
            title="Title & Typography"
            icon={<Sparkles className="w-4 h-4" />}
            description="Category heading size, weight, color and contrast checks"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <ResponsiveNumberInput
                  label="Title Font Size"
                  value={config.titleSize}
                  activeDevice={activeDevice}
                  onChange={(updated) => updateConfig({ titleSize: updated })}
                  min={12}
                  max={24}
                  step={1}
                  unit="px"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-1">Title Font Weight</label>
                <select
                  value={config.titleWeight}
                  onChange={(e) => updateConfig({ titleWeight: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="normal">Normal (400)</option>
                  <option value="medium">Medium (500)</option>
                  <option value="semibold">SemiBold (600)</option>
                  <option value="bold">Bold (700)</option>
                  <option value="extrabold">ExtraBold (800)</option>
                </select>
              </div>

              <ColorInput
                label="Title Text Color"
                value={config.titleColor}
                onChange={(val) => updateConfig({ titleColor: val })}
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-200">WCAG Accessibility Contrast</label>
                <div>
                  <ContrastBadge
                    textColor={config.titleColor}
                    bgColor={config.cardBgColor}
                  />
                </div>
              </div>
            </div>
          </AccordionGroup>

          {/* Section 4: "Buy Now" Subtext Link */}
          <AccordionGroup
            title="“Buy Now” Subtext Link"
            icon={<ChevronRight className="w-4 h-4" />}
            description="Sub-action link beneath category title"
          >
            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer text-slate-200 text-xs">
                <input
                  type="checkbox"
                  checked={config.showActionButton}
                  onChange={(e) => updateConfig({ showActionButton: e.target.checked })}
                  className="accent-pink-500 rounded"
                />
                <span className="font-semibold">Show "Buy Now" link underneath title</span>
              </label>

              {config.showActionButton && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Default Link Label</label>
                    <input
                      type="text"
                      value={config.actionButtonText}
                      onChange={(e) => updateConfig({ actionButtonText: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <ColorInput
                    label="Link Color"
                    value={config.actionButtonColor}
                    onChange={(val) => updateConfig({ actionButtonColor: val })}
                  />

                  <ColorInput
                    label="Link Hover Color"
                    value={config.actionButtonHoverColor}
                    onChange={(val) => updateConfig({ actionButtonHoverColor: val })}
                  />

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Link Style</label>
                    <select
                      value={config.actionButtonStyle}
                      onChange={(e) => updateConfig({ actionButtonStyle: e.target.value as any })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="plain">Clean Text (Reference Match)</option>
                      <option value="with_arrow">Text with Right Arrow (→)</option>
                      <option value="underlined">Underlined Text</option>
                      <option value="pill">Pill Button</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </AccordionGroup>

          {/* Section 5: Navigation Arrows & Dots */}
          <AccordionGroup
            title="Navigation Arrows & Dots"
            icon={<Sliders className="w-4 h-4" />}
            description="Next / Prev buttons and pagination bullets"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-slate-200 text-xs">
                <input
                  type="checkbox"
                  checked={config.showArrows}
                  onChange={(e) => updateConfig({ showArrows: e.target.checked })}
                  className="accent-pink-500 rounded"
                />
                <span className="font-semibold">Show Navigation Arrows</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-200 text-xs">
                <input
                  type="checkbox"
                  checked={config.showDots}
                  onChange={(e) => updateConfig({ showDots: e.target.checked })}
                  className="accent-pink-500 rounded"
                />
                <span className="font-semibold">Show Dots Pagination</span>
              </label>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Arrow Position</label>
                <select
                  value={config.arrowPosition}
                  onChange={(e) => updateConfig({ arrowPosition: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="sides_outside">Sides Outside Content</option>
                  <option value="sides_inside">Sides Floating Over Cards</option>
                  <option value="top_right">Top Right Beside Section Title</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Arrow Shape</label>
                <select
                  value={config.arrowShape}
                  onChange={(e) => updateConfig({ arrowShape: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="circle">Circular Button</option>
                  <option value="rounded_rect">Rounded Square</option>
                  <option value="minimal">Minimal (No Background)</option>
                </select>
              </div>
            </div>
          </AccordionGroup>

          {/* Section 6: Section Heading & Background */}
          <AccordionGroup
            title="Section Heading & Background"
            icon={<LayoutGrid className="w-4 h-4" />}
            description="Title, subtitle, alignment and page background color"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-slate-200 text-xs sm:col-span-2">
                <input
                  type="checkbox"
                  checked={config.showHeading}
                  onChange={(e) => updateConfig({ showHeading: e.target.checked })}
                  className="accent-pink-500 rounded"
                />
                <span className="font-semibold">Show Section Title (Leave unchecked for clean seamless banner look)</span>
              </label>

              {config.showHeading && (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Title Text</label>
                    <input
                      type="text"
                      value={config.headingText}
                      onChange={(e) => updateConfig({ headingText: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Title Alignment</label>
                    <select
                      value={config.headingAlignment}
                      onChange={(e) => updateConfig({ headingAlignment: e.target.value as any })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="left">Left Aligned</option>
                      <option value="center">Centered</option>
                      <option value="right">Right Aligned</option>
                    </select>
                  </div>
                </>
              )}

              <ColorInput
                label="Section Background Color"
                value={config.sectionBgColor}
                onChange={(val) => updateConfig({ sectionBgColor: val })}
              />
            </div>
          </AccordionGroup>
        </div>
      )}

      {/* ====================================================================
          TAB 5: ADVANCED & A11Y
          ==================================================================== */}
      {activeTab === 'advanced' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-200">Device Visibility Controls</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: 'desktop', label: 'Show on Desktop', icon: <Monitor className="w-4 h-4" /> },
                { key: 'tablet', label: 'Show on Tablet', icon: <Tablet className="w-4 h-4" /> },
                { key: 'mobile', label: 'Show on Mobile', icon: <Smartphone className="w-4 h-4" /> },
              ].map(({ key, label, icon }) => (
                <label
                  key={key}
                  className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/80 border border-slate-700 cursor-pointer text-xs text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={config.visibilityResponsive[key as DeviceMode] !== false}
                    onChange={(e) =>
                      updateConfig({
                        visibilityResponsive: {
                          ...config.visibilityResponsive,
                          [key]: e.target.checked,
                        },
                      })
                    }
                    className="accent-pink-500 rounded"
                  />
                  {icon}
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-200">HTML Attributes & Custom CSS</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Section Anchor ID</label>
                <input
                  type="text"
                  value={config.anchorId}
                  onChange={(e) => updateConfig({ anchorId: e.target.value })}
                  placeholder="e.g. shop-categories"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Custom CSS Class(es)</label>
                <input
                  type="text"
                  value={config.customCssClass}
                  onChange={(e) => updateConfig({ customCssClass: e.target.value })}
                  placeholder="e.g. my-category-carousel"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-400 mb-1">Custom CSS Code (Scoped)</label>
                <textarea
                  rows={3}
                  value={config.customCss}
                  onChange={(e) => updateConfig({ customCss: e.target.value })}
                  placeholder=".category-card { transition: all 0.3s ease; }"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white">WCAG Accessibility & Search Crawler (SEO)</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              This widget uses native semantic HTML: <code className="text-pink-400">role="region"</code>,{' '}
              <code className="text-pink-400">aria-roledescription="carousel"</code>, and true crawlable{' '}
              <code className="text-pink-400">&lt;a href="..."&gt;</code> anchor tags for optimal Google SEO indexing.
              Reduced motion preferences are respected automatically.
            </p>
          </div>
        </div>
      )}

      {/* ====================================================================
          MEDIA PICKER MODAL
          ==================================================================== */}
      {mediaPickerOpen && (
        <MediaPickerModal
          isOpen={mediaPickerOpen}
          onClose={() => {
            setMediaPickerOpen(false);
            setMediaTargetId(null);
          }}
          onSelect={(url) => {
            if (mediaTargetId && typeof mediaTargetId === 'string' && mediaTargetId.startsWith('override_')) {
              const realId = mediaTargetId.replace('override_', '');
              handleUpdateOverride(realId, 'image', url);
            } else if (mediaTargetId) {
              handleUpdateCustomItem(mediaTargetId, { image: url });
            }
            setMediaPickerOpen(false);
            setMediaTargetId(null);
          }}
        />
      )}
    </div>
  );
};
