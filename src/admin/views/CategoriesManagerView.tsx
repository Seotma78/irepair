import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { MediaPickerModal } from '../components/MediaPickerModal';
import {
  FolderTree,
  Plus,
  Edit,
  Trash2,
  Search,
  ExternalLink,
  Save,
  X,
  Check,
  AlertCircle,
  CheckCircle2,
  Globe,
  Tag,
  Layers,
  ShieldCheck,
  RotateCcw,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  History,
  Lock,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';

interface AdminCategory {
  id: number;
  woo_id?: number | null;
  parent_woo_id?: number;
  parent_id?: number;
  parent: number;
  parentName?: string;
  name: string;
  slug: string;
  description?: string;
  count?: number;
  product_count?: number;
  image?: string;
  image_url?: string;
  display?: string;
  source?: 'woocommerce' | 'local';
  is_deleted_remote?: boolean;
  edited_locally?: boolean;
  synced_at?: string;
  hierarchicalUrl: string;
  updatedAt?: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
    permalink?: string;
    categoryUrl?: string;
    focusKeyword?: string;
    ogImage?: string;
    noindex?: boolean;
  };
}

interface SyncLogItem {
  id: string;
  type: string;
  started_at: string;
  finished_at?: string;
  status: 'running' | 'success' | 'failed';
  summary?: string;
  error?: string;
}

const STORE_BASE_URL = 'https://irepair-mobiles.co.uk';

export const CategoriesManagerView: React.FC = () => {
  const { refreshCategories } = useApp();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncHistory, setSyncHistory] = useState<SyncLogItem[]>([]);
  const [lastSync, setLastSync] = useState<SyncLogItem | null>(null);
  const [syncSummaryResult, setSyncSummaryResult] = useState<any | null>(null);
  const [showSyncResultModal, setShowSyncResultModal] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [overwriteLocalEdits, setOverwriteLocalEdits] = useState(false);

  // Tree expansion state: set of category IDs currently expanded
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  // Editing state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formParent, setFormParent] = useState<number>(0);
  const [formDescription, setFormDescription] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formDisplay, setFormDisplay] = useState('default');
  const [formMetaTitle, setFormMetaTitle] = useState('');
  const [formMetaDesc, setFormMetaDesc] = useState('');
  const [formCanonicalUrl, setFormCanonicalUrl] = useState('');
  const [formFocusKeyword, setFormFocusKeyword] = useState('');
  const [formNoindex, setFormNoindex] = useState(false);
  const [customCanonical, setCustomCanonical] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<AdminCategory | null>(null);

  // Media picker modal
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories', {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        // By default expand top parents
        const rootWithChildren = new Set<number>();
        data.forEach((c: AdminCategory) => {
          if (c.parent === 0) rootWithChildren.add(c.id);
        });
        setExpandedNodes(rootWithChildren);
      }
    } catch (err) {
      console.error('Failed to fetch admin categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch('/api/admin/categories/sync/status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsSyncing(Boolean(data.isRunning));
        setLastSync(data.lastSync);
        setSyncHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch category sync status:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchSyncStatus();
  }, []);

  const handleSyncFromWoo = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/categories/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
        },
        body: JSON.stringify({ overwriteLocalEdits }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync categories');
      }
      setSyncSummaryResult(data.summary);
      setShowSyncResultModal(true);
      await fetchCategories();
      await fetchSyncStatus();
      await refreshCategories();
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedNodes(new Set(categories.map((c) => c.id)));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Live calculated hierarchical URL for form preview
  const liveCalculatedUrl = useMemo(() => {
    if (!formSlug) return '/product-category/';
    const cleanSlug = formSlug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
    const pathSegments: string[] = [cleanSlug];

    const catMap = new Map<number, AdminCategory>(categories.map((c) => [c.id, c]));
    let currParentId = formParent;
    const visited = new Set<number>();

    while (currParentId && currParentId !== 0 && !visited.has(currParentId)) {
      visited.add(currParentId);
      const parentCat = catMap.get(currParentId);
      if (parentCat) {
        let seg = parentCat.slug;
        if (parentCat.id === 1375) {
          seg = 'mobiles';
        }
        pathSegments.unshift(seg);
        currParentId = parentCat.parent_id !== undefined ? parentCat.parent_id : parentCat.parent;
      } else {
        break;
      }
    }

    return `/product-category/${pathSegments.join('/')}/`;
  }, [formSlug, formParent, categories]);

  useEffect(() => {
    if (!customCanonical) {
      setFormCanonicalUrl(`${STORE_BASE_URL}${liveCalculatedUrl}`);
    }
  }, [liveCalculatedUrl, customCanonical]);

  const openEditModal = (cat: AdminCategory) => {
    setErrorMsg('');
    setSuccessMsg('');
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormParent(cat.parent_id !== undefined ? cat.parent_id : cat.parent || 0);
    setFormDescription(cat.description || '');
    setFormImage(cat.image_url || cat.image || '');
    setFormDisplay(cat.display || 'default');
    setFormMetaTitle(cat.seo?.metaTitle || `${cat.name} | iRepair Mobiles UK`);
    setFormMetaDesc(cat.seo?.metaDescription || cat.description || '');
    setFormCanonicalUrl(cat.seo?.canonicalUrl || `${STORE_BASE_URL}${cat.hierarchicalUrl}`);
    setFormFocusKeyword(cat.seo?.focusKeyword || cat.name.toLowerCase());
    setFormNoindex(Boolean(cat.seo?.noindex));
    setCustomCanonical(
      Boolean(cat.seo?.canonicalUrl && cat.seo.canonicalUrl !== `${STORE_BASE_URL}${cat.hierarchicalUrl}`)
    );
    setModalOpen(true);
  };

  const openNewModal = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setEditingCategory(null);
    setFormName('');
    setFormSlug('');
    setFormParent(0);
    setFormDescription('');
    setFormImage('');
    setFormDisplay('default');
    setFormMetaTitle('');
    setFormMetaDesc('');
    setFormCanonicalUrl('');
    setFormFocusKeyword('');
    setFormNoindex(false);
    setCustomCanonical(false);
    setModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSaving(true);

    try {
      const payload = {
        name: formName,
        slug: formSlug,
        parent: formParent,
        description: formDescription,
        image: formImage,
        display: formDisplay,
        seo: {
          metaTitle: formMetaTitle,
          metaDescription: formMetaDesc,
          canonicalUrl: formCanonicalUrl,
          focusKeyword: formFocusKeyword,
          noindex: formNoindex,
        },
      };

      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save category');
      }

      setSuccessMsg(
        editingCategory
          ? 'Category updated successfully! Permalinks and hierarchy updated.'
          : 'New category created successfully!'
      );

      await fetchCategories();
      await refreshCategories();
      setTimeout(() => {
        setModalOpen(false);
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      const res = await fetch(`/api/admin/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        setCategoryToDelete(null);
        await fetchCategories();
        await refreshCategories();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete category');
      }
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  // Build hierarchical tree with children count for table
  const treeNodes = useMemo(() => {
    const parentMap = new Map<number, AdminCategory[]>();
    const byId = new Map<number, AdminCategory>();

    categories.forEach((c) => {
      byId.set(c.id, c);
      const pid = c.parent_id !== undefined ? c.parent_id : c.parent || 0;
      if (!parentMap.has(pid)) parentMap.set(pid, []);
      parentMap.get(pid)!.push(c);
    });

    const result: { cat: AdminCategory; depth: number; hasChildren: boolean }[] = [];

    const traverse = (parentId: number, depth: number) => {
      const children = parentMap.get(parentId) || [];
      // Sort children by menu_order asc, then name asc
      children.sort((a, b) => {
        const orderA = a.parent === 0 && a.id === 1375 ? -1 : 0;
        const orderB = b.parent === 0 && b.id === 1375 ? -1 : 0;
        return orderA - orderB || a.name.localeCompare(b.name);
      });

      for (const child of children) {
        const childList = parentMap.get(child.id) || [];
        result.push({
          cat: child,
          depth,
          hasChildren: childList.length > 0,
        });
        if (expandedNodes.has(child.id)) {
          traverse(child.id, depth + 1);
        }
      }
    };

    traverse(0, 0);

    // If searching, filter across all categories
    if (search.trim()) {
      const q = search.toLowerCase();
      return categories
        .filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.slug.toLowerCase().includes(q) ||
            c.hierarchicalUrl.toLowerCase().includes(q)
        )
        .map((c) => ({ cat: c, depth: 0, hasChildren: false }));
    }

    return result;
  }, [categories, expandedNodes, search]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FolderTree className="w-6 h-6 text-[#DF0C88]" />
            <span>Product Categories &amp; Hierarchy</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Synchronize WooCommerce categories with full nested hierarchy, manage local categories, and audit SEO permalinks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sync status info */}
          {lastSync && (
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Last synced:{' '}
                <strong className="text-slate-700">
                  {new Date(lastSync.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </strong>
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                  lastSync.status === 'success'
                    ? 'bg-emerald-100 text-emerald-700'
                    : lastSync.status === 'failed'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700 animate-pulse'
                }`}
              >
                {lastSync.status}
              </span>
            </div>
          )}

          {/* Sync Button */}
          <button
            onClick={handleSyncFromWoo}
            disabled={isSyncing}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all ${
              isSyncing
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-[#DF0C88] hover:bg-[#C50875] text-white active:scale-95'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync from WooCommerce'}</span>
          </button>

          {/* Sync History Toggle */}
          <button
            onClick={() => setShowHistoryPanel((prev) => !prev)}
            className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="View sync history"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>History</span>
          </button>

          {/* New Local Category */}
          <button
            onClick={openNewModal}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Local Category</span>
          </button>
        </div>
      </div>

      {/* Sync History Panel (Collapsible) */}
      {showHistoryPanel && (
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#DF0C88]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Recent WooCommerce Category Sync Runs
              </h3>
            </div>
            <button
              onClick={() => setShowHistoryPanel(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Date &amp; Time</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Duration</th>
                  <th className="py-2 px-3">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {syncHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-500">
                      No sync logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  syncHistory.map((log) => {
                    let summaryObj: any = null;
                    try { summaryObj = JSON.parse(log.summary || '{}'); } catch (_) {}
                    return (
                      <tr key={log.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-slate-300">
                          {new Date(log.started_at).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              log.status === 'success'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : log.status === 'failed'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {summaryObj?.durationMs ? `${summaryObj.durationMs}ms` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {summaryObj ? (
                            <span className="flex items-center gap-3">
                              <span className="text-emerald-400">+{summaryObj.created || 0} created</span>
                              <span className="text-sky-400">~{summaryObj.updated || 0} updated</span>
                              <span className="text-rose-400">-{summaryObj.deleted || 0} removed</span>
                              <span className="text-slate-400">{summaryObj.unchanged || 0} unchanged</span>
                            </span>
                          ) : (
                            log.error || 'Running'
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sync Result Toast / Modal */}
      {showSyncResultModal && syncSummaryResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">WooCommerce Sync Completed</h3>
              </div>
              <button
                onClick={() => setShowSyncResultModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-slate-600">
                Fetched <strong>{syncSummaryResult.totalRemoteCategories || 0}</strong> categories from WooCommerce in{' '}
                <strong>{syncSummaryResult.durationMs}ms</strong>.
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">New Added</div>
                  <div className="text-lg font-black text-emerald-700">{syncSummaryResult.created}</div>
                </div>
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-100">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">Updated</div>
                  <div className="text-lg font-black text-sky-700">{syncSummaryResult.updated}</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">Removed / Soft-Deleted</div>
                  <div className="text-lg font-black text-amber-700">{syncSummaryResult.deleted}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">Unchanged (Protected)</div>
                  <div className="text-lg font-black text-slate-700">{syncSummaryResult.unchanged}</div>
                </div>
              </div>

              {syncSummaryResult.errors?.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Sync Warnings</span>
                  </div>
                  {syncSummaryResult.errors.map((err: string, i: number) => (
                    <div key={i} className="text-[11px] font-mono">{err}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowSyncResultModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search & Tree Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name, slug or URL..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#DF0C88] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          {!search && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <button
                onClick={expandAll}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
              >
                Collapse All
              </button>
            </div>
          )}

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Total:</span>
            <span className="font-bold text-slate-900 px-2 py-0.5 bg-slate-100 rounded-lg">
              {categories.length}
            </span>
          </div>
        </div>
      </div>

      {/* Categories Tree Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Category Name &amp; Hierarchy</th>
                <th className="py-3 px-4">Slug</th>
                <th className="py-3 px-4">Hierarchical URL</th>
                <th className="py-3 px-4 text-center">Source</th>
                <th className="py-3 px-4 text-center">Products</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#DF0C88]" />
                    <span>Loading category hierarchy...</span>
                  </td>
                </tr>
              ) : treeNodes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No categories found. Click "Sync from WooCommerce" to import live categories.
                  </td>
                </tr>
              ) : (
                treeNodes.map(({ cat, depth, hasChildren }) => {
                  const isExpanded = expandedNodes.has(cat.id);
                  const isSoftDeleted = Boolean(cat.is_deleted_remote);
                  const isLocal = cat.source === 'local';

                  return (
                    <tr
                      key={cat.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSoftDeleted ? 'bg-amber-50/40 text-slate-400' : ''
                      }`}
                    >
                      {/* Name with indentation & toggle */}
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div
                          className="flex items-center gap-1.5"
                          style={{ paddingLeft: `${depth * 20}px` }}
                        >
                          {hasChildren ? (
                            <button
                              onClick={() => toggleExpand(cat.id)}
                              className="p-1 rounded hover:bg-slate-200/80 text-slate-500 cursor-pointer"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-[#DF0C88]" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : (
                            <span className="w-5 shrink-0 text-center text-slate-300 select-none text-[10px]">
                              {depth > 0 ? '└' : '•'}
                            </span>
                          )}

                          <span
                            className={`${
                              depth === 0 ? 'font-bold text-slate-900' : 'text-slate-800'
                            } ${isSoftDeleted ? 'line-through opacity-70' : ''}`}
                          >
                            {cat.name}
                          </span>

                          {cat.id === 1375 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-pink-100 text-[#DF0C88] font-bold">
                              Root Parent
                            </span>
                          )}

                          {cat.edited_locally && (
                            <span
                              className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-sky-50 text-sky-700 font-semibold border border-sky-200"
                              title="Customized in local dashboard"
                            >
                              Customized
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Slug */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {cat.slug}
                      </td>

                      {/* Hierarchical URL */}
                      <td className="py-3 px-4 font-mono text-[11px] text-[#DF0C88]">
                        <a
                          href={cat.hierarchicalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-1"
                          title="View category page on storefront"
                        >
                          <span className="truncate max-w-[260px]">{cat.hierarchicalUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                        </a>
                      </td>

                      {/* Source badge */}
                      <td className="py-3 px-4 text-center">
                        {isSoftDeleted ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            Removed from Woo
                          </span>
                        ) : isLocal ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Local
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            WooCommerce
                          </span>
                        )}
                      </td>

                      {/* Product count */}
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {cat.product_count !== undefined ? cat.product_count : cat.count || 0}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(cat)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#DF0C88] hover:bg-pink-50 transition-colors cursor-pointer"
                            title="Edit Category &amp; SEO"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setCategoryToDelete(cat)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title={cat.source === 'woocommerce' ? 'Soft-delete (hide from store)' : 'Delete Category'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-pink-50 text-[#DF0C88] flex items-center justify-center">
                  <FolderTree className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingCategory ? `Edit Category: ${editingCategory.name}` : 'New Category'}
                  </h3>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span>Source: {editingCategory?.source === 'local' ? 'Local' : 'WooCommerce'}</span>
                    {editingCategory?.source === 'woocommerce' && (
                      <span className="text-amber-600 flex items-center gap-1 font-semibold">
                        <Lock className="w-3 h-3" /> Core attributes synced from WooCommerce
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {editingCategory?.source === 'woocommerce' && (
              <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <strong>WooCommerce Synced Category:</strong> Name, Slug, and Parent are managed on your WordPress / WooCommerce store and cannot be changed here to avoid sync divergence. You can customize the <strong>SEO Meta Title, Description, Display type, and Canonical URL</strong> below.
                </div>
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-4 mt-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs border border-emerald-200 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category Name {editingCategory?.source === 'woocommerce' && <Lock className="inline w-3 h-3 text-slate-400 ml-1" />}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={editingCategory?.source === 'woocommerce'}
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (!editingCategory) {
                        setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-xl text-xs ${
                      editingCategory?.source === 'woocommerce'
                        ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200'
                        : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-[#DF0C88]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Slug {editingCategory?.source === 'woocommerce' && <Lock className="inline w-3 h-3 text-slate-400 ml-1" />}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={editingCategory?.source === 'woocommerce'}
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs font-mono ${
                      editingCategory?.source === 'woocommerce'
                        ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200'
                        : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-[#DF0C88]'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Parent Category {editingCategory?.source === 'woocommerce' && <Lock className="inline w-3 h-3 text-slate-400 ml-1" />}
                  </label>
                  <select
                    disabled={editingCategory?.source === 'woocommerce'}
                    value={formParent}
                    onChange={(e) => setFormParent(parseInt(e.target.value, 10))}
                    className={`w-full px-3 py-2 border rounded-xl text-xs ${
                      editingCategory?.source === 'woocommerce'
                        ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200'
                        : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-[#DF0C88]'
                    }`}
                  >
                    <option value={0}>None (Top Level Root Category)</option>
                    {categories
                      .filter((c) => !editingCategory || c.id !== editingCategory.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.parent > 0 ? `— ${c.name}` : c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Display Type</label>
                  <select
                    value={formDisplay}
                    onChange={(e) => setFormDisplay(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#DF0C88]"
                  >
                    <option value="default">Default</option>
                    <option value="products">Products Only</option>
                    <option value="subcategories">Subcategories Only</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#DF0C88]"
                />
              </div>

              {/* Hierarchical Preview */}
              <div className="p-3 rounded-xl bg-slate-900 text-white text-xs space-y-1">
                <div className="text-[10px] text-pink-400 font-bold uppercase tracking-wider">
                  Live Hierarchical Canonical Permalink
                </div>
                <div className="font-mono text-[11px] text-slate-200 truncate">
                  {STORE_BASE_URL}{liveCalculatedUrl}
                </div>
              </div>

              {/* Rank Math Category SEO (Read-Only) */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#DF0C88]" />
                    <span>Rank Math SEO (Managed in WordPress)</span>
                  </h4>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Rank Math Synced
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Canonical Path:</span>
                    <span className="font-mono text-slate-700">{editingCategory ? editingCategory.hierarchicalUrl : '/product-category/'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Robots:</span>
                    <span className="text-emerald-700 font-semibold">index, follow</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  Category SEO titles, descriptions, and breadcrumb schemas are synced from Rank Math. To customize, edit in WordPress.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!editingCategory) return;
                      try {
                        const res = await fetch('/api/seo/sync-page', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ path: editingCategory.hierarchicalUrl, entity_type: 'product_category' }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          alert(`SEO for ${editingCategory.name} re-synchronized from WordPress!`);
                        } else {
                          alert(`Re-sync failed: ${data.error}`);
                        }
                      } catch (err: any) {
                        alert(`Re-sync error: ${err.message}`);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Re-sync SEO for this item
                  </button>

                  <a
                    href={`https://irepair-mobiles.co.uk/wp-admin/term.php?taxonomy=product_cat&tag_ID=${editingCategory?.woo_id || editingCategory?.id || ''}&post_type=product`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#DF0C88] bg-pink-50 hover:bg-pink-100 rounded-lg transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Edit in WordPress
                  </a>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#DF0C88] hover:bg-[#C50875] text-white flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              {categoryToDelete.source === 'woocommerce' ? 'Soft-Delete Category' : 'Delete Local Category'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {categoryToDelete.source === 'woocommerce'
                ? `Are you sure you want to hide "${categoryToDelete.name}" from the storefront? It will be marked as soft-deleted and can be restored anytime.`
                : `Are you sure you want to permanently delete "${categoryToDelete.name}"? Any subcategories will be reassigned to its parent.`}
            </p>
            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCategory}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-sm"
              >
                {categoryToDelete.source === 'woocommerce' ? 'Hide Category' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
