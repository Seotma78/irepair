import React, { useState, useEffect } from 'react';
import { WIDGET_REGISTRY } from '../../widgets/registry';
import { SectionInstance, CommonSectionSettings } from '../../widgets/types';
import { AutoWidgetForm } from '../../widgets/AutoWidgetForm';
import { DynamicPageRenderer } from '../../components/DynamicPageRenderer';
import { MediaPickerModal } from '../components/MediaPickerModal';
import {
  FileText,
  Plus,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Edit,
  Settings,
  History,
  ExternalLink,
  Check,
  Save,
  Globe,
  Sliders,
  Layers,
  X,
  Undo2,
  AlertCircle,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export const PagesManager: React.FC = () => {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePageId, setActivePageId] = useState<string | null>(null);

  // Active page editing state
  const [editTitle, setEditTitle] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editStatus, setEditStatus] = useState<'published' | 'draft'>('published');
  const [editSections, setEditSections] = useState<SectionInstance[]>([]);
  const [editSeo, setEditSeo] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Modals & Drawers
  const [widgetPickerOpen, setWidgetPickerOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionInstance | null>(null);
  const [seoDrawerOpen, setSeoDrawerOpen] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [confirmingRevId, setConfirmingRevId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [createPageModalOpen, setCreatePageModalOpen] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [ogImagePickerOpen, setOgImagePickerOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<any | null>(null);
  const [discardModalOpen, setDiscardModalOpen] = useState(false);

  // In-app Toast feedback (with Undo capability)
  const [toastNotice, setToastNotice] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
    undoAction?: () => void;
  } | null>(null);

  const SYSTEM_PAGES = ['home', 'home-2', 'shop', 'services', 'locations', 'track-repair', 'about', 'contact', 'warranty', 'terms', 'privacy'];

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cms/pages', {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPages(data);
      }
    } catch (e) {
      console.error('Failed to fetch pages:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const openPageEditor = async (pageId: string) => {
    try {
      const res = await fetch(`/api/admin/cms/pages/${pageId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActivePageId(data.id);
        setEditTitle(data.title);
        setEditSlug(data.slug);
        setEditStatus(data.status);
        setEditSections(data.sections || []);
        setEditSeo(data.seo || {});
        setHasUnsavedChanges(false);
        setToastNotice(null);
      }
    } catch (e) {
      console.error('Failed to load page:', e);
    }
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageTitle || !newPageSlug) return;

    try {
      const res = await fetch('/api/admin/cms/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
        },
        body: JSON.stringify({
          title: newPageTitle,
          slug: newPageSlug,
          status: 'draft',
          sections: [],
          seo: { metaTitle: newPageTitle },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCreatePageModalOpen(false);
        setNewPageTitle('');
        setNewPageSlug('');
        await fetchPages();
        openPageEditor(data.id);
      }
    } catch (err) {
      console.error('Failed to create page:', err);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    try {
      const res = await fetch(`/api/admin/cms/pages/${pageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        setPageToDelete(null);
        await fetchPages();
        setToastNotice({
          type: 'success',
          message: 'Page successfully deleted.',
        });
      } else {
        const data = await res.json().catch(() => ({}));
        setToastNotice({
          type: 'error',
          message: data.error || 'Failed to delete page.',
        });
      }
    } catch (e) {
      console.error('Failed to delete page:', e);
    }
  };

  const handleSavePage = async () => {
    if (!activePageId) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/cms/pages/${activePageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
        },
        body: JSON.stringify({
          title: editTitle,
          slug: editSlug,
          status: editStatus,
          sections: editSections,
          seo: editSeo,
          revisionNote: `Saved via Admin Dashboard by staff`,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setHasUnsavedChanges(false);
        setToastNotice({
          type: 'success',
          message: 'Page and sections successfully saved!',
        });
        setTimeout(() => setSaveSuccess(false), 2500);
        await fetchPages();
      }
    } catch (e) {
      console.error('Failed to save page:', e);
      setToastNotice({
        type: 'error',
        message: 'Failed to save page changes.',
      });
    } finally {
      setSaving(false);
    }
  };

  const HOME2_FULL_BLEED_WIDGETS = [
    'hero_bright_slider',
    'category_editorial_rail',
    'hero_split_quick_quote',
    'quick_service_cards_strip',
    'tabbed_devices_carousel',
    'process_steps_modern',
    'why_choose_us_metrics_dark',
    'reviews_carousel_modern',
    'store_locations_with_tracker',
    'faq_two_column_accordion',
  ];

  const handleAddSection = (widgetType: string) => {
    const def = WIDGET_REGISTRY[widgetType];
    if (!def) return;

    const isFullBleedHome2 = HOME2_FULL_BLEED_WIDGETS.includes(widgetType);

    const newSec: SectionInstance = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: widgetType,
      order: editSections.length + 1,
      visible: true,
      settings: JSON.parse(JSON.stringify(def.defaultSettings)),
      commonSettings: isFullBleedHome2
        ? { containerWidth: 'full', paddingY: 'none' }
        : { paddingY: 'medium' },
    };

    setEditSections([...editSections, newSec]);
    setHasUnsavedChanges(true);
    setWidgetPickerOpen(false);
    setEditingSection(newSec);
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= editSections.length) return;

    const list = [...editSections];
    const temp = list[index];
    list[index] = list[newIndex];
    list[newIndex] = temp;

    // reindex order
    list.forEach((s, i) => {
      s.order = i + 1;
    });

    setEditSections(list);
    setHasUnsavedChanges(true);
  };

  const handleToggleVisibility = (id: string) => {
    setEditSections(
      editSections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s))
    );
    setHasUnsavedChanges(true);
  };

  const handleDuplicateSection = (sec: SectionInstance) => {
    const dup: SectionInstance = {
      ...JSON.parse(JSON.stringify(sec)),
      id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      order: editSections.length + 1,
    };
    setEditSections([...editSections, dup]);
    setHasUnsavedChanges(true);
    setToastNotice({
      type: 'info',
      message: `Duplicated section added to page.`,
    });
  };

  const handleDeleteSection = (id: string) => {
    const secIndex = editSections.findIndex((s) => s.id === id);
    if (secIndex === -1) return;
    const deletedSection = editSections[secIndex];
    const def = WIDGET_REGISTRY[deletedSection.type] || { title: deletedSection.type };
    const sectionName = deletedSection.settings?.title || deletedSection.settings?.heading || def.title || deletedSection.type;

    const remaining = editSections.filter((s) => s.id !== id);
    const reindexed = remaining.map((s, idx) => ({ ...s, order: idx + 1 }));

    if (editingSection?.id === id) {
      setEditingSection(null);
    }

    setEditSections(reindexed);
    setHasUnsavedChanges(true);

    setToastNotice({
      type: 'info',
      message: `Section "${sectionName}" removed.`,
      undoAction: () => {
        setEditSections((prev) => {
          const restored = [...prev];
          restored.splice(secIndex, 0, deletedSection);
          return restored.map((s, idx) => ({ ...s, order: idx + 1 }));
        });
        setToastNotice({
          type: 'success',
          message: `Section "${sectionName}" restored.`,
        });
      },
    });
  };

  const handleSaveSectionSettings = (updated: SectionInstance) => {
    setEditSections(
      editSections.map((s) => (s.id === updated.id ? updated : s))
    );
    setEditingSection(null);
    setHasUnsavedChanges(true);
  };

  const fetchRevisions = async () => {
    if (!activePageId) return;
    try {
      const res = await fetch(`/api/admin/cms/pages/${activePageId}/revisions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRevisions(data);
        setConfirmingRevId(null);
        setRevisionModalOpen(true);
      }
    } catch (e) {
      console.error('Failed to load revisions:', e);
    }
  };

  const handleRestoreRevision = async (revId: string) => {
    if (!activePageId) return;

    try {
      const res = await fetch(`/api/admin/cms/pages/${activePageId}/revisions/${revId}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        setRevisionModalOpen(false);
        setConfirmingRevId(null);
        await openPageEditor(activePageId);
        setToastNotice({
          type: 'success',
          message: 'Revision successfully restored and loaded into editor.',
        });
      } else {
        setToastNotice({
          type: 'error',
          message: 'Failed to restore revision.',
        });
      }
    } catch (e) {
      console.error('Failed to restore revision:', e);
      setToastNotice({
        type: 'error',
        message: 'Network error restoring revision.',
      });
    }
  };

  // 1. PAGE LIST VIEW
  if (!activePageId) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Website Pages Manager</h1>
            <p className="text-xs text-slate-500 mt-1">Manage pages, visual section ordering, widgets, and SEO meta tags</p>
          </div>

          <button
            onClick={() => setCreatePageModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold shadow-sm hover:shadow-md flex items-center gap-1.5 cursor-pointer transition-all self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Page</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading pages...</div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="divide-y divide-slate-100">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-pink-50 text-[#DF0C88] flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-900">{page.title}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            page.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {page.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">/{page.slug}</p>
                      <span className="text-[11px] text-slate-500 mt-1 inline-block">
                        {page.sectionsCount} Sections • Last updated {new Date(page.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <a
                      href={`/${page.slug === 'home' ? '' : page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      title="View on site"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => openPageEditor(page.id)}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-[#DF0C88] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Sections</span>
                    </button>
                    {!SYSTEM_PAGES.includes(page.slug) && (
                      <button
                        onClick={() => setPageToDelete(page)}
                        className="p-2 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete custom page"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal: Delete Custom Page Confirmation */}
        {pageToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg text-slate-900 text-center mb-1">Delete Page?</h3>
              <p className="text-xs text-slate-500 text-center mb-6">
                Are you sure you want to delete <span className="font-bold text-slate-800">{pageToDelete.title}</span> (/{pageToDelete.slug})? This will permanently remove the page and all its configured sections.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPageToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePage(pageToDelete.id)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Delete Page
                </button>
              </div>
            </div>
          </div>
        )}

        {/* In-app Toast feedback in Page List */}
        {toastNotice && (
          <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold ${
                toastNotice.type === 'error'
                  ? 'bg-rose-900 text-white border-rose-800'
                  : toastNotice.type === 'info'
                    ? 'bg-slate-900 text-white border-slate-800'
                    : 'bg-emerald-900 text-white border-emerald-800'
              }`}
            >
              {toastNotice.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              {toastNotice.type === 'info' && <Layers className="w-4 h-4 text-pink-400 shrink-0" />}
              {toastNotice.type === 'success' && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
              <span>{toastNotice.message}</span>
              <button
                onClick={() => setToastNotice(null)}
                className="ml-2 text-white/60 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Modal: Create Page */}
        {createPageModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200">
              <h3 className="font-black text-lg text-slate-900 mb-1">Create New Page</h3>
              <p className="text-xs text-slate-500 mb-4">Set title and custom URL slug for the new page</p>

              <form onSubmit={handleCreatePage} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Page Title</label>
                  <input
                    type="text"
                    required
                    value={newPageTitle}
                    onChange={(e) => {
                      setNewPageTitle(e.target.value);
                      if (!newPageSlug) {
                        setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                      }
                    }}
                    placeholder="e.g. Student Repair Discount"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">URL Slug</label>
                  <div className="flex items-center">
                    <span className="text-xs text-slate-400 px-3 py-2.5 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl">/</span>
                    <input
                      type="text"
                      required
                      value={newPageSlug}
                      onChange={(e) => setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                      placeholder="student-discount"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-r-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreatePageModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold cursor-pointer shadow-sm"
                  >
                    Create Page
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. ACTIVE PAGE SECTION MANAGER
  return (
    <div className="space-y-6">
      {/* Editor Top Toolbar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (hasUnsavedChanges) {
                setDiscardModalOpen(true);
              } else {
                setActivePageId(null);
              }
            }}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer transition-colors"
            title="Back to pages list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => {
                  setEditTitle(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="font-black text-lg text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#DF0C88] focus:outline-none px-1"
              />
              <select
                value={editStatus}
                onChange={(e) => {
                  setEditStatus(e.target.value as any);
                  setHasUnsavedChanges(true);
                }}
                className={`text-xs font-bold px-2 py-1 rounded-full cursor-pointer focus:outline-none ${
                  editStatus === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <a
              href={`/${editSlug === 'home' ? '' : editSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-[#DF0C88] hover:text-[#C50875] flex items-center gap-1 mt-0.5 px-1 hover:underline cursor-pointer"
              title="Open public page with direct URL"
            >
              <span>/{editSlug}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSeoDrawerOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-sky-500" />
            <span>SEO Settings</span>
          </button>

          <button
            onClick={fetchRevisions}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Revisions</span>
          </button>

          <button
            onClick={() => setPreviewOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Preview</span>
          </button>

          <button
            onClick={handleSavePage}
            disabled={saving}
            className={`px-5 py-2 rounded-xl font-bold text-xs text-white flex items-center gap-1.5 cursor-pointer shadow-sm transition-all ${
              saveSuccess
                ? 'bg-emerald-600'
                : hasUnsavedChanges
                  ? 'bg-[#DF0C88] hover:bg-[#C50875] ring-2 ring-pink-400 ring-offset-2'
                  : 'bg-[#DF0C88] hover:bg-[#C50875]'
            }`}
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
                {hasUnsavedChanges && (
                  <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse ml-0.5" title="Unsaved changes pending" />
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Ordered Section Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Page Layout Sections ({editSections.length})
          </span>
          <button
            onClick={() => setWidgetPickerOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Section</span>
          </button>
        </div>

        {editSections.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 space-y-3">
            <p className="text-sm font-semibold text-slate-700">No sections added yet</p>
            <p className="text-xs text-slate-400">Click below to select your first widget from the library.</p>
            <button
              onClick={() => setWidgetPickerOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#DF0C88] text-white text-xs font-bold cursor-pointer"
            >
              Add First Widget
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {editSections.map((sec, idx) => {
              const def = WIDGET_REGISTRY[sec.type] || { title: sec.type };
              return (
                <div
                  key={sec.id}
                  className={`bg-white rounded-2xl p-4 border transition-all ${
                    sec.visible ? 'border-slate-200/90 shadow-xs' : 'border-slate-200 bg-slate-50/80 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Reorder arrows & Title */}
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-0.5">
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveSection(idx, 'up')}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === editSections.length - 1}
                          onClick={() => handleMoveSection(idx, 'down')}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="w-8 h-8 rounded-lg bg-pink-50 text-[#DF0C88] flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{def.title}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                            {sec.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {sec.settings?.title || sec.settings?.heading || sec.settings?.headline || 'Default settings configured'}
                        </p>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleVisibility(sec.id)}
                        className={`p-2 rounded-xl text-xs font-semibold cursor-pointer ${
                          sec.visible ? 'text-slate-500 hover:bg-slate-100' : 'text-amber-600 bg-amber-50'
                        }`}
                        title={sec.visible ? 'Hide on page' : 'Show on page'}
                      >
                        {sec.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => setEditingSection({ ...sec, settings: sec.settings || {} })}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-[#DF0C88] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Configure</span>
                      </button>

                      <button
                        onClick={() => handleDuplicateSection(sec)}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                        title="Duplicate section"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteSection(sec.id)}
                        className="p-2 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Delete section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Widget Library Picker */}
      {widgetPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="font-black text-lg text-slate-900">Choose a Widget to Add</h3>
                <p className="text-xs text-slate-500">Select any modular section from the iRepair Widget Registry</p>
              </div>
              <button
                onClick={() => setWidgetPickerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 my-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.values(WIDGET_REGISTRY).map((widget) => (
                <div
                  key={widget.type}
                  onClick={() => handleAddSection(widget.type)}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-[#DF0C88] bg-slate-50/50 hover:bg-pink-50/30 transition-all cursor-pointer group flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-pink-100/70 text-[#DF0C88] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 group-hover:text-[#DF0C88] transition-colors">
                      {widget.title}
                    </h4>
                    <p className="text-xs text-slate-500 leading-snug mt-1">{widget.description}</p>
                    <span className="text-[10px] font-mono text-slate-400 mt-2 block uppercase tracking-wider">
                      {widget.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Section Configuration Editor */}
      {editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className={`bg-white w-full ${editingSection.type === 'image_slider' ? 'max-w-5xl' : 'max-w-3xl'} rounded-3xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden`}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Configure: {WIDGET_REGISTRY[editingSection.type]?.title || editingSection.type}
                </h3>
                <p className="text-xs text-slate-500">Live section settings generated from widget schema</p>
              </div>
              <button
                onClick={() => setEditingSection(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Common Section Settings Accordion */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">Common Styling & Layout</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Section Width</label>
                    <select
                      value={editingSection.commonSettings?.containerWidth || 'boxed'}
                      onChange={(e) => {
                        const newWidth = e.target.value as 'boxed' | 'full' | 'narrow';
                        const updatedSettings = { ...(editingSection.settings || {}) };

                        if (editingSection.type === 'image_slider') {
                          if (newWidth === 'full') {
                            updatedSettings.layoutMode = {
                              desktop: 'full_bleed',
                              tablet: 'full_bleed',
                              mobile: 'full_bleed',
                            };
                            if (updatedSettings.cornerRadius?.desktop === 24) {
                              updatedSettings.cornerRadius = { desktop: 0, tablet: 0, mobile: 0 };
                            }
                          } else if (newWidth === 'boxed') {
                            updatedSettings.layoutMode = {
                              desktop: 'boxed',
                              tablet: 'boxed',
                              mobile: 'full',
                            };
                          }
                        } else if (
                          editingSection.type === 'dynamic_product_grid' ||
                          editingSection.type === 'trending_products_showcase' ||
                          editingSection.type === 'mobile_phone_brands_marquee' ||
                          editingSection.type === 'icon_boxes'
                        ) {
                          updatedSettings.layoutWidth = newWidth;
                          updatedSettings.containerWidth = newWidth;
                        }

                        setEditingSection({
                          ...editingSection,
                          commonSettings: {
                            ...editingSection.commonSettings,
                            containerWidth: newWidth,
                          },
                          settings: updatedSettings,
                        });
                      }}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-2 font-medium"
                    >
                      <option value="boxed">Boxed (Max-Width Container)</option>
                      <option value="full">Full Width (100% Screen Edge-to-Edge)</option>
                      <option value="narrow">Narrow (Content Centered)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Vertical Padding</label>
                    <select
                      value={editingSection.commonSettings?.paddingY || 'medium'}
                      onChange={(e) => {
                        setEditingSection({
                          ...editingSection,
                          commonSettings: {
                            ...editingSection.commonSettings,
                            paddingY: e.target.value as any,
                          },
                        });
                      }}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-2"
                    >
                      <option value="none">None</option>
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Anchor ID (for scroll links)</label>
                    <input
                      type="text"
                      placeholder="e.g. deals"
                      value={editingSection.commonSettings?.anchorId || ''}
                      onChange={(e) => {
                        setEditingSection({
                          ...editingSection,
                          commonSettings: {
                            ...editingSection.commonSettings,
                            anchorId: e.target.value,
                          },
                        });
                      }}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-2"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Settings Auto-Form */}
              <AutoWidgetForm
                schema={WIDGET_REGISTRY[editingSection.type]?.schema || []}
                values={editingSection.settings || {}}
                onChange={(newSettings) => {
                  setEditingSection({
                    ...editingSection,
                    settings: newSettings,
                  });
                }}
              />
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingSection(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveSectionSettings(editingSection)}
                className="px-5 py-2 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold cursor-pointer shadow-sm"
              >
                Apply Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer: SEO Settings */}
      {seoDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md h-full rounded-3xl shadow-2xl border border-slate-200 p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="font-black text-base text-slate-900">Per-Page SEO & Social Cards</h3>
                <button onClick={() => setSeoDrawerOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Meta Title</label>
                <input
                  type="text"
                  value={editSeo.metaTitle || ''}
                  onChange={(e) => setEditSeo({ ...editSeo, metaTitle: e.target.value })}
                  placeholder="Page title displayed in search engines"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Meta Description</label>
                <textarea
                  rows={3}
                  value={editSeo.metaDescription || ''}
                  onChange={(e) => setEditSeo({ ...editSeo, metaDescription: e.target.value })}
                  placeholder="Summary for Google SERP"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Canonical URL</label>
                <input
                  type="text"
                  value={editSeo.canonicalUrl || ''}
                  onChange={(e) => setEditSeo({ ...editSeo, canonicalUrl: e.target.value })}
                  placeholder="https://irepair-mobiles.co.uk/page"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">OG Share Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editSeo.ogImage || ''}
                    onChange={(e) => setEditSeo({ ...editSeo, ogImage: e.target.value })}
                    placeholder="/uploads/share-card.jpg"
                    className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5"
                  />
                  <button
                    type="button"
                    onClick={() => setOgImagePickerOpen(true)}
                    className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Browse
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editSeo.noindex)}
                    onChange={(e) => setEditSeo({ ...editSeo, noindex: e.target.checked })}
                    className="rounded border-slate-300 text-[#DF0C88] focus:ring-[#DF0C88]"
                  />
                  <span className="text-xs font-bold text-slate-700">noindex (Exclude from Search Engines)</span>
                </label>
              </div>
            </div>

            <button
              onClick={() => setSeoDrawerOpen(false)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl mt-6 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Modal: Revisions */}
      {revisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-black text-base text-slate-900">Revision History</h3>
              <button onClick={() => setRevisionModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 my-4">
              {revisions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No previous revisions recorded.</p>
              ) : (
                revisions.map((rev) => (
                  <div key={rev.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block">{rev.note || 'Snapshot'}</span>
                      <span className="text-[11px] text-slate-400">
                        by {rev.created_by} • {new Date(rev.created_at).toLocaleString()}
                      </span>
                    </div>
                    {confirmingRevId === rev.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleRestoreRevision(rev.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-xs"
                        >
                          Confirm Restore?
                        </button>
                        <button
                          onClick={() => setConfirmingRevId(null)}
                          className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-slate-600 text-[11px] font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingRevId(rev.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-[#DF0C88] hover:text-white text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Live Preview */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-sm">Previewing Draft: {editTitle}</span>
            </div>
            <button
              onClick={() => setPreviewOpen(false)}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
            >
              Close Preview
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <DynamicPageRenderer
              slug={editSlug}
              previewData={{
                title: editTitle,
                sections: editSections,
                seo: editSeo,
              }}
            />
          </div>
        </div>
      )}

      {/* Toast Notice inside Page Editor */}
      {toastNotice && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold ${
              toastNotice.type === 'error'
                ? 'bg-rose-900 text-white border-rose-800'
                : toastNotice.type === 'info'
                  ? 'bg-slate-900 text-white border-slate-800'
                  : 'bg-emerald-900 text-white border-emerald-800'
            }`}
          >
            {toastNotice.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toastNotice.type === 'info' && <Layers className="w-4 h-4 text-pink-400 shrink-0" />}
            {toastNotice.type === 'success' && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
            <span>{toastNotice.message}</span>
            {toastNotice.undoAction && (
              <button
                type="button"
                onClick={() => {
                  if (toastNotice.undoAction) toastNotice.undoAction();
                }}
                className="ml-2 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>
            )}
            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={() => {
                  handleSavePage();
                }}
                disabled={saving}
                className="ml-1.5 px-2.5 py-1 rounded-lg bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Now'}</span>
              </button>
            )}
            <button
              onClick={() => setToastNotice(null)}
              className="ml-1 text-white/60 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal: Discard Changes Confirmation */}
      {discardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-black text-lg text-slate-900 text-center mb-1">Unsaved Changes</h3>
            <p className="text-xs text-slate-500 text-center mb-6">
              You have unsaved changes to this page layout. Are you sure you want to discard them and return to the pages list?
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDiscardModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiscardModalOpen(false);
                  setActivePageId(null);
                  setHasUnsavedChanges(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Discard & Leave
              </button>
            </div>
          </div>
        </div>
      )}

      <MediaPickerModal
        isOpen={ogImagePickerOpen}
        onClose={() => setOgImagePickerOpen(false)}
        onSelect={(url) => setEditSeo({ ...editSeo, ogImage: url })}
      />
    </div>
  );
};
