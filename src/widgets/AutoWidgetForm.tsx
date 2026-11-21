import React, { useState, useMemo } from 'react';
import { WidgetFieldSchema, FieldOption, FormFieldItem } from './types';
import { MediaPickerModal } from '../admin/components/MediaPickerModal';
import { 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Search, 
  Check, 
  Eye,
  Tag,
  Folder,
  Filter,
  Layers,
  CheckSquare,
  Square,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  X,
  Mail,
  ArrowUp,
  ArrowDown,
  ListPlus
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ImageSliderEditor } from './components/image-slider/ImageSliderEditor';
import { CategoryCarouselEditor } from './components/category-carousel/CategoryCarouselEditor';

interface MiniRichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

const MiniRichTextEditor: React.FC<MiniRichTextEditorProps> = ({ value = '', onChange, placeholder = '' }) => {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const applyFormat = (prefix: string, suffix: string, defaultText: string = 'text') => {
    const el = textareaRef.current;
    if (!el) {
      onChange(value + `${prefix}${defaultText}${suffix}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.substring(start, end) || defaultText;
    const before = value.substring(0, start);
    const after = value.substring(end);
    const updated = `${before}${prefix}${selected}${suffix}${after}`;
    onChange(updated);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const handleLink = () => {
    const url = prompt('Enter link URL (e.g. /book-repair, /shop, https://...):', '/quote');
    if (!url) return;
    applyFormat(`<a href="${url}" class="underline font-semibold text-[#DF0C88]">`, '</a>', 'learn more');
  };

  const handleList = () => {
    applyFormat('<ul>\n  <li>', '</li>\n  <li>Item 2</li>\n</ul>', 'Item 1');
  };

  const handleClearTags = () => {
    const stripped = value.replace(/<[^>]*>?/gm, '');
    onChange(stripped);
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs focus-within:border-[#DF0C88] transition-all">
      {/* Rich Text Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 p-1.5 bg-slate-50 border-b border-slate-200 text-slate-700">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => applyFormat('<strong>', '</strong>', 'bold text')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            title="Bold (strong)"
          >
            <span className="font-black text-xs px-0.5">B</span>
          </button>
          <button
            type="button"
            onClick={() => applyFormat('<em>', '</em>', 'italic text')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 text-xs italic transition-colors cursor-pointer"
            title="Italic (em)"
          >
            <span className="font-serif italic text-xs px-0.5">I</span>
          </button>
          <button
            type="button"
            onClick={() => applyFormat('<u>', '</u>', 'underlined text')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 text-xs underline transition-colors cursor-pointer"
            title="Underline (u)"
          >
            <span className="underline text-xs px-0.5">U</span>
          </button>
          <button
            type="button"
            onClick={() => applyFormat('<mark class="bg-pink-500/20 text-pink-700 px-1 rounded">', '</mark>', 'highlighted')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 text-xs transition-colors cursor-pointer"
            title="Highlight / Mark text"
          >
            <span className="bg-yellow-200 text-slate-900 px-1 py-0.2 text-[10px] font-bold rounded">Mark</span>
          </button>
          <span className="w-px h-4 bg-slate-300 mx-1" />
          <button
            type="button"
            onClick={handleLink}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 text-xs transition-colors cursor-pointer"
            title="Insert Link"
          >
            <span className="text-[#DF0C88] font-bold text-xs">🔗 Link</span>
          </button>
          <button
            type="button"
            onClick={handleList}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 text-xs transition-colors cursor-pointer"
            title="Bullet list"
          >
            <span className="text-xs font-bold">• List</span>
          </button>
          <button
            type="button"
            onClick={handleClearTags}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-500 hover:text-rose-600 text-xs transition-colors cursor-pointer"
            title="Strip all HTML tags"
          >
            <span className="text-[10px] text-slate-500 font-mono">Clear</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
            showPreview ? 'bg-[#DF0C88] text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
          title="Toggle preview"
        >
          <span>{showPreview ? 'Edit' : 'Preview'}</span>
        </button>
      </div>

      {showPreview ? (
        <div 
          className="p-3 text-xs text-slate-800 min-h-[72px] prose prose-sm max-w-none bg-slate-50/50"
          dangerouslySetInnerHTML={{ __html: value || '<em class="text-slate-400">Empty content</em>' }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Enter rich formatted text (HTML supported)...'}
          className="w-full p-2.5 text-xs text-slate-800 bg-white focus:outline-none font-mono resize-y min-h-[72px]"
        />
      )}
    </div>
  );
};

interface AutoWidgetFormProps {
  schema: WidgetFieldSchema[];
  values: Record<string, any>;
  onChange: (newValues: Record<string, any>) => void;
}

export const AutoWidgetForm: React.FC<AutoWidgetFormProps> = ({ schema = [], values = {}, onChange }) => {
  // If editing a Category Carousel, render the dedicated CategoryCarouselEditor
  if (schema.some((f) => f.name === 'category_carousel_customizer')) {
    return (
      <CategoryCarouselEditor
        values={values}
        onChange={onChange}
      />
    );
  }

  // If editing an Image Slider, render the dedicated responsive ImageSliderEditor
  if (schema.some((f) => f.name === 'image_slider_customizer')) {
    return (
      <ImageSliderEditor
        values={values}
        onChange={onChange}
      />
    );
  }

  let products: any[] = [];
  let categories: any[] = [];
  try {
    const app = useApp();
    if (app && Array.isArray(app.products)) {
      products = app.products;
    }
    if (app && Array.isArray(app.categories)) {
      categories = app.categories;
    }
  } catch {
    products = [];
    categories = [];
  }

  const safeValues = values || {};
  const [activeMediaField, setActiveMediaField] = useState<string | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Extract unique categories with counts
  const availableCategories = useMemo(() => {
    const map = new Map<string, { slug: string; name: string; count: number }>();
    categories.forEach((c) => {
      if (c && c.slug) {
        map.set(c.slug.toLowerCase(), {
          slug: c.slug.toLowerCase(),
          name: c.name || c.slug,
          count: 0,
        });
      }
    });
    products.forEach((p) => {
      if (p.category) {
        const slug = p.category.toLowerCase().trim();
        const existing = map.get(slug);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(slug, {
            slug,
            name: p.category,
            count: 1,
          });
        }
      }
    });
    return Array.from(map.values());
  }, [categories, products]);

  // Extract unique brands with counts
  const availableBrands = useMemo(() => {
    const map = new Map<string, { slug: string; name: string; count: number }>();
    products.forEach((p) => {
      if (p.brand) {
        const slug = p.brand.toLowerCase().trim();
        const existing = map.get(slug);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(slug, {
            slug,
            name: p.brand,
            count: 1,
          });
        }
      }
    });
    if (map.size === 0) {
      ['apple', 'samsung', 'google', 'motorola'].forEach((b) => {
        map.set(b, { slug: b, name: b.toUpperCase(), count: 0 });
      });
    }
    return Array.from(map.values());
  }, [products]);

  // Condition options
  const conditionOptions = [
    { value: '', label: 'All Conditions' },
    { value: 'Pristine', label: 'Pristine (Grade A+)' },
    { value: 'Excellent', label: 'Excellent (Grade B)' },
    { value: 'Brand New', label: 'Brand New' },
    { value: 'Refurbished', label: 'Refurbished' },
  ];

  const handleFieldChange = (name: string, val: any) => {
    onChange({
      ...safeValues,
      [name]: val,
    });
  };

  const toggleCategory = (slug: string) => {
    const currentList: string[] = Array.isArray(safeValues.categorySlugs) ? [...safeValues.categorySlugs] : [];
    const exists = currentList.includes(slug);
    const updated = exists ? currentList.filter(s => s !== slug) : [...currentList, slug];
    handleFieldChange('categorySlugs', updated);
  };

  const selectAllCategories = () => {
    handleFieldChange('categorySlugs', availableCategories.map(c => c.slug));
  };

  const clearAllCategories = () => {
    handleFieldChange('categorySlugs', []);
  };

  const toggleBrand = (slug: string) => {
    const currentList: string[] = Array.isArray(safeValues.brands) ? [...safeValues.brands] : [];
    const exists = currentList.map(b => b.toLowerCase()).includes(slug.toLowerCase());
    const updated = exists
      ? currentList.filter(b => b.toLowerCase() !== slug.toLowerCase())
      : [...currentList, slug];
    handleFieldChange('brands', updated);
  };

  const selectAllBrands = () => {
    handleFieldChange('brands', availableBrands.map(b => b.slug));
  };

  const clearAllBrands = () => {
    handleFieldChange('brands', []);
  };

  const handleOpenMediaPicker = (fieldKey: string) => {
    setActiveMediaField(fieldKey);
    setMediaPickerOpen(true);
  };

  const handleMediaSelect = (url: string) => {
    if (!activeMediaField) return;

    if (activeMediaField.includes('.')) {
      // Nested repeater field e.g. "slides.0.image"
      const parts = activeMediaField.split('.');
      const arrayKey = parts[0];
      const index = parseInt(parts[1], 10);
      const subProp = parts[2];

      const currentList = Array.isArray(safeValues[arrayKey]) ? [...safeValues[arrayKey]] : [];
      if (currentList[index]) {
        currentList[index] = { ...currentList[index], [subProp]: url };
        handleFieldChange(arrayKey, currentList);
      }
    } else {
      handleFieldChange(activeMediaField, url);
    }
  };

  const renderField = (field: WidgetFieldSchema, currentVal: any, fieldKey: string) => {
    const value = currentVal !== undefined ? currentVal : field.defaultValue;

    switch (field.type) {
      case 'text': {
        const isToEmail = fieldKey.includes('toEmail') || field.name === 'toEmail';
        const parsedEmails = isToEmail && typeof value === 'string'
          ? value.split(/[,;\n\s]+/).map(e => e.trim()).filter(e => e && e.includes('@'))
          : [];

        return (
          <div className="space-y-1.5">
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
              placeholder={isToEmail ? "e.g. info@domain.co.uk, support@domain.co.uk" : ""}
              className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
            />
            {isToEmail && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                <span className="text-slate-500 font-semibold">Active Recipients ({parsedEmails.length}):</span>
                {parsedEmails.length === 0 ? (
                  <span className="text-amber-600 font-medium">⚠️ No recipients configured (will fallback to general store email)</span>
                ) : (
                  parsedEmails.map((email, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pink-50 border border-pink-200 text-[#DF0C88] font-bold text-[10px] font-mono">
                      <Mail className="w-2.5 h-2.5" />
                      <span>{email}</span>
                    </span>
                  ))
                )}
              </div>
            )}
          </div>
        );
      }

      case 'textarea':
        return (
          <textarea
            rows={3}
            value={value || ''}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
          />
        );

      case 'richtext':
        return (
          <MiniRichTextEditor
            value={value || ''}
            placeholder={field.description || "Enter rich formatted content..."}
            onChange={(newVal) => handleFieldChange(fieldKey, newVal)}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            min={field.min}
            max={field.max}
            step={field.step || 1}
            value={value !== undefined ? value : ''}
            onChange={(e) => handleFieldChange(fieldKey, parseFloat(e.target.value) || 0)}
            className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
          />
        );

      case 'boolean':
        return (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleFieldChange(fieldKey, e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#DF0C88]" />
            <span className="ml-3 text-xs font-semibold text-slate-700">
              {value ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'color':
        return (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={value || '#ffffff'}
              onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
              className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
            />
            <input
              type="text"
              value={value || '#ffffff'}
              onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
              className="w-32 text-xs font-mono bg-white border border-slate-200 rounded-xl px-3 py-2"
            />
          </div>
        );

      case 'image':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={value || ''}
                onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                placeholder="/uploads/my-image.webp or URL"
                className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3 py-2"
              />
              <button
                type="button"
                onClick={() => handleOpenMediaPicker(fieldKey)}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-[#DF0C88] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Media</span>
              </button>
            </div>
            {value && (
              <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                <img src={value} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        );

      case 'repeater': {
        const list = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-3">
            {list.map((item: any, idx: number) => (
              <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Item #{idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => {
                        if (idx === 0) return;
                        const updated = [...list];
                        const tmp = updated[idx - 1];
                        updated[idx - 1] = updated[idx];
                        updated[idx] = tmp;
                        handleFieldChange(fieldKey, updated);
                      }}
                      className="p-1 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === list.length - 1}
                      onClick={() => {
                        if (idx === list.length - 1) return;
                        const updated = [...list];
                        const tmp = updated[idx + 1];
                        updated[idx + 1] = updated[idx];
                        updated[idx] = tmp;
                        handleFieldChange(fieldKey, updated);
                      }}
                      className="p-1 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = list.filter((_: any, i: number) => i !== idx);
                        handleFieldChange(fieldKey, updated);
                      }}
                      className="p-1 rounded-md text-rose-500 hover:bg-rose-50 cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {field.subFields?.map((sub) => {
                    const subVal = item[sub.name];
                    return (
                      <div key={sub.name} className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-600">{sub.label}</label>
                        {renderSubField(sub, subVal, fieldKey, idx)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                const newItem: any = {};
                field.subFields?.forEach((sub) => {
                  newItem[sub.name] = sub.defaultValue || '';
                });
                if (field.name === 'slides') {
                  newItem.headingTag = list.length === 0 ? 'h1' : 'h2';
                }
                handleFieldChange(fieldKey, [...list, newItem]);
              }}
              className="w-full py-2 border-2 border-dashed border-slate-200 hover:border-[#DF0C88] text-slate-600 hover:text-[#DF0C88] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Item</span>
            </button>
          </div>
        );
      }

      case 'form_fields_builder': {
        const fieldsList: FormFieldItem[] = Array.isArray(value) && value.length > 0
          ? value
          : [
              { id: 'f_name', label: 'Your Full Name', name: 'name', type: 'text', placeholder: 'e.g. John Doe', required: true, width: 'half' },
              { id: 'f_email', label: 'Email Address', name: 'email', type: 'email', placeholder: 'e.g. john@example.com', required: true, width: 'half' },
              { id: 'f_phone', label: 'Phone Number', name: 'phone', type: 'tel', placeholder: 'e.g. +44 7900 123456', required: false, width: 'half' },
              { id: 'f_subject', label: 'Inquiry Subject', name: 'subject', type: 'select', placeholder: 'Select inquiry type', required: true, width: 'half', options: ['Repair Inquiry', 'Order / Refurbished Store', 'Sell / Trade-in Inquiry', 'Warranty Claim', 'Corporate / Fleet Repair', 'Other Question'] },
              { id: 'f_message', label: 'Message Details', name: 'message', type: 'textarea', placeholder: 'Describe your device model, fault, or query in detail...', required: true, width: 'full' },
            ];

        const updateFields = (newList: FormFieldItem[]) => {
          handleFieldChange(fieldKey, newList);
        };

        const handleAddField = (presetType: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'number') => {
          const id = `f_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
          let newField: FormFieldItem;
          switch (presetType) {
            case 'tel':
              newField = { id, label: 'Phone Number', name: `phone_${id}`, type: 'tel', placeholder: 'e.g. +44 7...', required: false, width: 'half' };
              break;
            case 'email':
              newField = { id, label: 'Secondary Email', name: `email_${id}`, type: 'email', placeholder: 'e.g. user@example.com', required: true, width: 'half' };
              break;
            case 'select':
              newField = { id, label: 'Device Model or Fault Type', name: `select_${id}`, type: 'select', placeholder: 'Select option', required: true, width: 'half', options: ['Screen Replacement', 'Battery Drain', 'Water Damage', 'Other'] };
              break;
            case 'textarea':
              newField = { id, label: 'Additional Notes / Fault Description', name: `notes_${id}`, type: 'textarea', placeholder: 'Please provide full details...', required: false, width: 'full' };
              break;
            case 'checkbox':
              newField = { id, label: 'I agree to the 6-Month Warranty Terms & Privacy Policy', name: `terms_${id}`, type: 'checkbox', required: true, width: 'full' };
              break;
            case 'number':
              newField = { id, label: 'Quantity / Purchase Year', name: `qty_${id}`, type: 'number', placeholder: '1', required: false, width: 'half' };
              break;
            default:
              newField = { id, label: 'Custom Field', name: `field_${id}`, type: 'text', placeholder: 'Enter information...', required: false, width: 'half' };
              break;
          }
          updateFields([...fieldsList, newField]);
        };

        const handleDeleteField = (idx: number) => {
          const updated = fieldsList.filter((_, i) => i !== idx);
          updateFields(updated);
        };

        const handleMoveField = (idx: number, direction: 'up' | 'down') => {
          const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (targetIdx < 0 || targetIdx >= fieldsList.length) return;
          const list = [...fieldsList];
          const temp = list[idx];
          list[idx] = list[targetIdx];
          list[targetIdx] = temp;
          updateFields(list);
        };

        return (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">Dynamic Form Fields Builder</span>
                <p className="text-[11px] text-slate-400">Add, edit, reorder, or delete fields shown to visitors</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-[#DF0C88] text-[11px] font-bold">
                {fieldsList.length} Fields Active
              </span>
            </div>

            {/* List of Fields */}
            <div className="space-y-3">
              {fieldsList.map((f, idx) => (
                <div key={f.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 transition-all hover:border-slate-300">
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
                        {f.label || `Field #${idx + 1}`}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-600 font-mono uppercase">
                        {f.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveField(idx, 'up')}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        title="Move up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === fieldsList.length - 1}
                        onClick={() => handleMoveField(idx, 'down')}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        title="Move down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteField(idx)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                        title="Delete field"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Form Field Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Field Label</label>
                      <input
                        type="text"
                        value={f.label || ''}
                        onChange={(e) => {
                          const updated = [...fieldsList];
                          updated[idx] = { ...updated[idx], label: e.target.value };
                          updateFields(updated);
                        }}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#DF0C88]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Field Type</label>
                      <select
                        value={f.type || 'text'}
                        onChange={(e) => {
                          const updated = [...fieldsList];
                          updated[idx] = { ...updated[idx], type: e.target.value as any };
                          updateFields(updated);
                        }}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#DF0C88]"
                      >
                        <option value="text">Single Line Text</option>
                        <option value="email">Email Address</option>
                        <option value="tel">Telephone / Mobile</option>
                        <option value="textarea">Multi-line Textarea</option>
                        <option value="select">Dropdown Select</option>
                        <option value="number">Number</option>
                        <option value="checkbox">Single Checkbox (Agreement)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Column Width</label>
                      <select
                        value={f.width || 'half'}
                        onChange={(e) => {
                          const updated = [...fieldsList];
                          updated[idx] = { ...updated[idx], width: e.target.value as any };
                          updateFields(updated);
                        }}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#DF0C88]"
                      >
                        <option value="half">Half Width (50% Column)</option>
                        <option value="full">Full Width (100% Row)</option>
                      </select>
                    </div>
                  </div>

                  {/* Placeholder & Required */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                    {f.type !== 'checkbox' && (
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Placeholder Text</label>
                        <input
                          type="text"
                          value={f.placeholder || ''}
                          onChange={(e) => {
                            const updated = [...fieldsList];
                            updated[idx] = { ...updated[idx], placeholder: e.target.value };
                            updateFields(updated);
                          }}
                          placeholder="e.g. Type your answer..."
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#DF0C88]"
                        />
                      </div>
                    )}

                    <div className="pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(f.required)}
                          onChange={(e) => {
                            const updated = [...fieldsList];
                            updated[idx] = { ...updated[idx], required: e.target.checked };
                            updateFields(updated);
                          }}
                          className="rounded text-[#DF0C88] focus:ring-[#DF0C88] w-4 h-4"
                        />
                        <span>Required Field</span>
                      </label>
                    </div>
                  </div>

                  {/* Options if select */}
                  {f.type === 'select' && (
                    <div className="pt-1">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Dropdown Options (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={Array.isArray(f.options) ? f.options.join(', ') : (f.options || '')}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const opts = raw.split(',').map((s) => s.trim()).filter(Boolean);
                          const updated = [...fieldsList];
                          updated[idx] = { ...updated[idx], options: opts };
                          updateFields(updated);
                        }}
                        placeholder="e.g. Screen Replacement, Battery Health, Other Fault"
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#DF0C88]"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Add Presets Bar */}
            <div className="p-3 bg-pink-50/50 border border-pink-200/60 rounded-2xl space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">Quick Add Preset Form Fields:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddField('text')}
                  className="px-2.5 py-1 rounded-lg bg-white border border-pink-200 text-slate-700 hover:border-[#DF0C88] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus className="w-3 h-3 text-[#DF0C88]" />
                  <span>+ Custom Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('tel')}
                  className="px-2.5 py-1 rounded-lg bg-white border border-pink-200 text-slate-700 hover:border-[#DF0C88] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus className="w-3 h-3 text-[#DF0C88]" />
                  <span>+ Phone / Mobile</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('email')}
                  className="px-2.5 py-1 rounded-lg bg-white border border-pink-200 text-slate-700 hover:border-[#DF0C88] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus className="w-3 h-3 text-[#DF0C88]" />
                  <span>+ Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('select')}
                  className="px-2.5 py-1 rounded-lg bg-white border border-pink-200 text-slate-700 hover:border-[#DF0C88] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus className="w-3 h-3 text-[#DF0C88]" />
                  <span>+ Dropdown Select</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('textarea')}
                  className="px-2.5 py-1 rounded-lg bg-white border border-pink-200 text-slate-700 hover:border-[#DF0C88] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus className="w-3 h-3 text-[#DF0C88]" />
                  <span>+ Detailed Message</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('number')}
                  className="px-2.5 py-1 rounded-lg bg-white border border-pink-200 text-slate-700 hover:border-[#DF0C88] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus className="w-3 h-3 text-[#DF0C88]" />
                  <span>+ Number</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('checkbox')}
                  className="px-2.5 py-1 rounded-lg bg-white border border-pink-200 text-slate-700 hover:border-[#DF0C88] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus className="w-3 h-3 text-[#DF0C88]" />
                  <span>+ Checkbox Terms</span>
                </button>
              </div>
            </div>
          </div>
        );
      }

      case 'product_picker': {
        const pickerMode = safeValues.pickerMode || 'category';
        const selectedCategorySlugs: string[] = Array.isArray(safeValues.categorySlugs) ? safeValues.categorySlugs : [];
        const selectedBrands: string[] = Array.isArray(safeValues.brands) ? safeValues.brands.map((b: string) => b.toLowerCase()) : [];
        const selectedCondition = safeValues.condition || '';
        const selectedManualIds: string[] = Array.isArray(safeValues.manualProductIds) ? safeValues.manualProductIds : [];
        const inStockOnly = Boolean(safeValues.inStockOnly);
        const onSaleOnly = Boolean(safeValues.onSaleOnly);
        const sortBy = safeValues.sortBy || 'popularity';
        const limit = Number(safeValues.limit) || 8;

        const filteredProducts = products.filter((p) =>
          p.title?.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.brand?.toLowerCase().includes(productSearch.toLowerCase())
        );

        // Filter matched products based on all active strategy settings
        const matchedProducts = products.filter((p) => {
          if (inStockOnly && !p.inStock) return false;
          if (onSaleOnly && (!p.regularPrice || p.price >= p.regularPrice)) return false;

          if (pickerMode === 'manual') {
            if (selectedManualIds.length === 0) return true;
            return selectedManualIds.includes(p.id) || (p.wpId && selectedManualIds.includes(String(p.wpId)));
          }

          if (pickerMode === 'brand') {
            if (selectedBrands.length === 0) return true;
            const pBrand = (p.brand || '').toLowerCase().trim();
            return selectedBrands.some((b: string) => pBrand.includes(b) || b.includes(pBrand) || p.title?.toLowerCase().includes(b));
          }

          if (pickerMode === 'category') {
            if (selectedCategorySlugs.length === 0) return true;
            const pCat = (p.category || '').toLowerCase().trim();
            return selectedCategorySlugs.some((c: string) => pCat.includes(c) || c.includes(pCat));
          }

          if (pickerMode === 'condition') {
            if (!selectedCondition) return true;
            return (p.condition || '').toLowerCase().includes(selectedCondition.toLowerCase());
          }

          if (pickerMode === 'filter') {
            let pass = true;
            if (selectedBrands.length > 0) {
              const pBrand = (p.brand || '').toLowerCase().trim();
              pass = pass && selectedBrands.some((b: string) => pBrand.includes(b) || b.includes(pBrand) || p.title?.toLowerCase().includes(b));
            }
            if (selectedCategorySlugs.length > 0) {
              const pCat = (p.category || '').toLowerCase().trim();
              pass = pass && selectedCategorySlugs.some((c: string) => pCat.includes(c) || c.includes(pCat));
            }
            if (selectedCondition) {
              pass = pass && (p.condition || '').toLowerCase().includes(selectedCondition.toLowerCase());
            }
            return pass;
          }

          return true;
        });

        const sortedMatched = [...matchedProducts].sort((a, b) => {
          if (sortBy === 'price_asc') return a.price - b.price;
          if (sortBy === 'price_desc') return b.price - a.price;
          if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
          if (sortBy === 'newest') return (b.wpId || 0) - (a.wpId || 0);
          return (b.reviewsCount || 0) - (a.reviewsCount || 0);
        });

        const displayMatched = sortedMatched.slice(0, limit);

        return (
          <div className="space-y-6 pt-4 border-t border-slate-200">
            {/* 1. BY CATEGORY SELECTOR */}
            {(pickerMode === 'category' || pickerMode === 'filter') && (
              <div className="p-4.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-pink-100 text-[#DF0C88] flex items-center justify-center shrink-0">
                      <Folder className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Select Categories (Multi-Select)</h4>
                      <p className="text-[11px] text-slate-500">Pick which device categories to pull products from</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={selectAllCategories}
                      className="px-2.5 py-1 text-[11px] font-bold text-[#DF0C88] hover:bg-pink-100/50 rounded-lg transition-colors cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={clearAllCategories}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {availableCategories.map((cat) => {
                    const isSelected = selectedCategorySlugs.includes(cat.slug);
                    return (
                      <div
                        key={cat.slug}
                        onClick={() => toggleCategory(cat.slug)}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-pink-50 border-[#DF0C88] text-slate-900 font-bold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                            isSelected ? 'bg-[#DF0C88] border-[#DF0C88] text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <span className="truncate capitalize">{cat.name}</span>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                          isSelected ? 'bg-pink-200 text-[#DF0C88]' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {cat.count}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                  <span>Selected:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedCategorySlugs.length === 0
                      ? 'All Categories (No filter active)'
                      : `${selectedCategorySlugs.length} Categories (${selectedCategorySlugs.join(', ')})`}
                  </span>
                </div>
              </div>
            )}

            {/* 2. BY BRAND SELECTOR */}
            {(pickerMode === 'brand' || pickerMode === 'filter') && (
              <div className="p-4.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-pink-100 text-[#DF0C88] flex items-center justify-center shrink-0">
                      <Tag className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Select Brands (Multi-Select)</h4>
                      <p className="text-[11px] text-slate-500">Pick which device manufacturer brands to display</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={selectAllBrands}
                      className="px-2.5 py-1 text-[11px] font-bold text-[#DF0C88] hover:bg-pink-100/50 rounded-lg transition-colors cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={clearAllBrands}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {availableBrands.map((b) => {
                    const isSelected = selectedBrands.includes(b.slug.toLowerCase());
                    return (
                      <div
                        key={b.slug}
                        onClick={() => toggleBrand(b.slug)}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-pink-50 border-[#DF0C88] text-slate-900 font-bold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                            isSelected ? 'bg-[#DF0C88] border-[#DF0C88] text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <span className="truncate capitalize">{b.name}</span>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                          isSelected ? 'bg-pink-200 text-[#DF0C88]' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {b.count}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                  <span>Selected:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedBrands.length === 0
                      ? 'All Brands (No filter active)'
                      : `${selectedBrands.length} Brands (${selectedBrands.map(b => b.toUpperCase()).join(', ')})`}
                  </span>
                </div>
              </div>
            )}

            {/* 3. BY CONDITION SELECTOR */}
            {(pickerMode === 'condition' || pickerMode === 'filter') && (
              <div className="p-4.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-pink-100 text-[#DF0C88] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Select Condition Filter</h4>
                    <p className="text-[11px] text-slate-500">Filter devices by refurbished condition grade</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {conditionOptions.map((opt) => {
                    const isSelected = selectedCondition === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleFieldChange('condition', opt.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#DF0C88] text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. MANUAL SEARCH & SELECTION */}
            {pickerMode === 'manual' && (
              <div className="p-4.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-pink-100 text-[#DF0C88] flex items-center justify-center shrink-0">
                      <CheckSquare className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Manual Product Selection</h4>
                      <p className="text-[11px] text-slate-500">Pick exact products to display in this carousel</p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-[#DF0C88]">
                    {selectedManualIds.length} Selected
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products by model or brand..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                  {filteredProducts.map((p) => {
                    const isChecked = selectedManualIds.includes(p.id) || (p.wpId && selectedManualIds.includes(String(p.wpId)));
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          const targetId = p.id;
                          const next = isChecked
                            ? selectedManualIds.filter((id) => id !== targetId && id !== String(p.wpId))
                            : [...selectedManualIds, targetId];
                          handleFieldChange('manualProductIds', next);
                        }}
                        className={`p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 text-xs transition-colors ${
                          isChecked ? 'bg-pink-50/60' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={p.image} alt={p.title} className="w-9 h-9 object-contain rounded-lg shrink-0 bg-white border border-slate-100 p-0.5" />
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate">{p.title}</span>
                            <span className="text-[10px] text-slate-400">
                              £{p.price} • {p.condition} • {p.brand}
                            </span>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 ${
                          isChecked ? 'bg-[#DF0C88] border-[#DF0C88] text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. LIVE MATCHED PRODUCTS PREVIEW PANEL */}
            <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-pink-50 text-[#DF0C88] flex items-center justify-center font-bold text-xs shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Live Matched Products Preview</h4>
                    <p className="text-[11px] text-slate-500">Live preview of devices matching your selection</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                    {matchedProducts.length} Items Matched
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    (Showing top {Math.min(limit, matchedProducts.length)})
                  </span>
                </div>
              </div>

              {matchedProducts.length === 0 ? (
                <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold block">No products currently match this strategy</span>
                    <span className="text-amber-700 text-[11px]">
                      Try selecting more categories or brands, or toggle "In-Stock Only" off.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-72 overflow-y-auto p-1">
                  {displayMatched.map((p) => {
                    return (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl border border-slate-200 bg-white hover:border-[#DF0C88]/50 transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="w-full h-20 bg-slate-50 rounded-lg p-1 flex items-center justify-center overflow-hidden">
                            <img src={p.image} alt={p.title} className="h-full object-contain mix-blend-multiply" />
                          </div>
                          <span className="font-bold text-slate-900 text-xs block line-clamp-1">{p.title}</span>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="font-black text-[#DF0C88]">£{p.price}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold truncate max-w-[80px]">
                            {p.condition || 'Pristine'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  const renderSubField = (sub: WidgetFieldSchema, subVal: any, parentKey: string, index: number) => {
    const fieldKey = `${parentKey}.${index}.${sub.name}`;
    const value = subVal !== undefined ? subVal : sub.defaultValue;

    if (sub.type === 'image') {
      return (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={value || ''}
            onChange={(e) => {
              const currentList = [...values[parentKey]];
              currentList[index] = { ...currentList[index], [sub.name]: e.target.value };
              handleFieldChange(parentKey, currentList);
            }}
            placeholder="/uploads/image.webp"
            className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
          />
          <button
            type="button"
            onClick={() => handleOpenMediaPicker(fieldKey)}
            className="p-1.5 rounded-lg bg-slate-900 text-white hover:bg-[#DF0C88] cursor-pointer"
            title="Browse media"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    if (sub.type === 'richtext' || (parentKey === 'slides' && (sub.name === 'subtitle' || sub.name === 'description'))) {
      return (
        <div className="space-y-1">
          <MiniRichTextEditor
            value={value || ''}
            placeholder="Enter slide details / description (rich formatting supported)..."
            onChange={(newVal) => {
              const currentList = [...values[parentKey]];
              currentList[index] = { ...currentList[index], [sub.name]: newVal };
              handleFieldChange(parentKey, currentList);
            }}
          />
        </div>
      );
    }

    if (sub.type === 'textarea') {
      return (
        <textarea
          rows={2}
          value={value || ''}
          onChange={(e) => {
            const currentList = [...values[parentKey]];
            currentList[index] = { ...currentList[index], [sub.name]: e.target.value };
            handleFieldChange(parentKey, currentList);
          }}
          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
        />
      );
    }

    if (sub.type === 'color') {
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value || '#ffffff'}
            onChange={(e) => {
              const currentList = [...values[parentKey]];
              currentList[index] = { ...currentList[index], [sub.name]: e.target.value };
              handleFieldChange(parentKey, currentList);
            }}
            className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
          />
          <input
            type="text"
            value={value || ''}
            onChange={(e) => {
              const currentList = [...values[parentKey]];
              currentList[index] = { ...currentList[index], [sub.name]: e.target.value };
              handleFieldChange(parentKey, currentList);
            }}
            placeholder="#DF0C88 or color name"
            className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
          />
        </div>
      );
    }

    if (sub.type === 'boolean') {
      return (
        <label className="relative inline-flex items-center cursor-pointer mt-1">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => {
              const currentList = [...values[parentKey]];
              currentList[index] = { ...currentList[index], [sub.name]: e.target.checked };
              handleFieldChange(parentKey, currentList);
            }}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#DF0C88]" />
          <span className="ml-2 text-[11px] font-semibold text-slate-700">
            {value ? 'Yes' : 'No'}
          </span>
        </label>
      );
    }

    if (sub.type === 'select' || sub.name === 'headingTag') {
      const defaultValue = sub.name === 'headingTag' ? (index === 0 ? 'h1' : 'h2') : (sub.defaultValue || '');
      const selectVal = value !== undefined && value !== '' ? value : defaultValue;
      return (
        <select
          value={selectVal}
          onChange={(e) => {
            const currentList = [...values[parentKey]];
            currentList[index] = { ...currentList[index], [sub.name]: e.target.value };
            handleFieldChange(parentKey, currentList);
          }}
          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#DF0C88]"
        >
          {sub.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={sub.type === 'number' ? 'number' : 'text'}
        value={value || ''}
        onChange={(e) => {
          const currentList = [...values[parentKey]];
          currentList[index] = {
            ...currentList[index],
            [sub.name]: sub.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
          };
          handleFieldChange(parentKey, currentList);
        }}
        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
      />
    );
  };

  return (
    <div className="space-y-4">
      {schema.map((field) => (
        <div key={field.name} className="space-y-1">
          <label className="block text-xs font-bold text-slate-700">{field.label}</label>
          {field.description && (
            <p className="text-[11px] text-slate-400">{field.description}</p>
          )}
          {renderField(field, values[field.name], field.name)}
        </div>
      ))}

      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
      />
    </div>
  );
};
