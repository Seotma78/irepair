import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Globe, 
  RefreshCw, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  Search, 
  Eye, 
  Lock, 
  Layers, 
  FileText, 
  AlertCircle,
  Copy,
  Check,
  Building,
  MapPin,
  Clock,
  Sparkles,
  Sliders,
  ArrowRight,
  Download,
  Upload,
  Plus,
  Trash2,
  ChevronDown,
  CheckSquare,
  Square,
  FileSpreadsheet
} from 'lucide-react';

interface SeoPage {
  id: string;
  path: string;
  entity_type: string;
  title: string;
  meta_description: string;
  canonical_url: string;
  meta_robots: string;
  og_tags_json: string;
  twitter_tags_json: string;
  jsonld_raw?: string | null;
  jsonld_rewritten?: string | null;
  schema_types_json: string;
  h1_tags_json: string;
  h2_tags_json: string;
  http_status: number;
  content_hash?: string;
  status: 'ok' | 'changed' | 'blocked' | 'redirecting' | 'error';
  redirect_url?: string;
  is_indexable: number;
  is_local_override: number;
  baseline_robots?: string;
  baseline_indexable: number;
  captured_at: string;
  updated_at: string;
}

interface SeoSettings {
  wordpress_source_url: string;
  site_url: string;
  environment_mode: 'production' | 'staging';
  robots_source_mode: string;
  auto_sync_frequency: string;
  last_sync_at?: string;
  last_sync_status?: string;
  old_website_link_enabled?: number;
  old_website_link_text?: string;
  old_website_link_url?: string;
  old_website_link_new_tab?: number;
  old_website_link_desktop?: number;
  old_website_link_mobile?: number;
  product_schema_live_overlay?: number;
  allow_local_override?: number;
}

interface SeoRedirect {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
  origin: string;
  hit_count: number;
  created_at: string;
}

export const PageSeoManagerView: React.FC = () => {
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [settings, setSettings] = useState<SeoSettings | null>(null);
  const [redirects, setRedirects] = useState<SeoRedirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingType, setSyncingType] = useState<string | null>(null);
  const [syncingPath, setSyncingPath] = useState<string | null>(null);
  const [hasBaseline, setHasBaseline] = useState(false);
  const [latestSnapshotDate, setLatestSnapshotDate] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<
    'all' | 'pages' | 'products' | 'categories' | 'blog' | 'redirects' | 'import_export' | 'local_seo' | 'parity_audit' | 'slug_conflicts'
  >('all');

  // Filters & search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'changed' | 'redirecting' | 'error'>('all');
  const [indexFilter, setIndexFilter] = useState<'all' | 'indexable' | 'noindex'>('all');

  // Multi-select
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [syncDropdownOpen, setSyncDropdownOpen] = useState(false);
  const syncDropdownRef = useRef<HTMLDivElement>(null);

  // Modals & Panels
  const [inspectModalPage, setInspectModalPage] = useState<SeoPage | null>(null);
  const [overrideModalPage, setOverrideModalPage] = useState<SeoPage | null>(null);
  const [parityCheckData, setParityCheckData] = useState<any | null>(null);
  const [parityModalOpen, setParityModalOpen] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedRewritten, setCopiedRewritten] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);

  // Import / Export CSV State
  const [csvInput, setCsvInput] = useState('');
  const [csvDryRunLoading, setCsvDryRunLoading] = useState(false);
  const [csvApplyLoading, setCsvApplyLoading] = useState(false);
  const [csvPreviewResult, setCsvPreviewResult] = useState<any | null>(null);

  // Local SEO Quality State
  const [localSeoData, setLocalSeoData] = useState<{ issues: any[]; totalChecked: number } | null>(null);
  const [localSeoLoading, setLocalSeoLoading] = useState(false);

  // Parity Audit Tab State
  const [parityAuditData, setParityAuditData] = useState<any | null>(null);
  const [parityAuditLoading, setParityAuditLoading] = useState(false);

  // Slug Conflicts State
  const [slugConflicts, setSlugConflicts] = useState<{ count: number; conflicts: any[] } | null>(null);
  const [slugConflictsLoading, setSlugConflictsLoading] = useState(false);

  // Redirects Form State
  const [showAddRedirectModal, setShowAddRedirectModal] = useState(false);
  const [newFromPath, setNewFromPath] = useState('');
  const [newToPath, setNewToPath] = useState('');
  const [newStatusCode, setNewStatusCode] = useState<number>(301);

  // Override Form State
  const [overrideForm, setOverrideForm] = useState({
    title: '',
    meta_description: '',
    canonical_url: '',
    meta_robots: '',
    is_indexable: true,
  });

  // Close sync dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (syncDropdownRef.current && !syncDropdownRef.current.contains(e.target as Node)) {
        setSyncDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pagesRes, redirectsRes, conflictsRes] = await Promise.all([
        fetch('/api/seo/pages'),
        fetch('/api/seo/redirects'),
        fetch('/api/seo/slug-conflicts')
      ]);
      const data = await pagesRes.json();
      const redData = await redirectsRes.json();
      const confData = await conflictsRes.json();

      if (data.success) {
        setPages(data.pages || []);
        setSettings(data.settings || null);
        setHasBaseline(data.has_baseline_snapshot || false);
        setLatestSnapshotDate(data.latest_snapshot_date || null);
      }
      if (redData.success) {
        setRedirects(redData.redirects || []);
      }
      if (confData.success) {
        setSlugConflicts({ count: confData.count || 0, conflicts: confData.conflicts || [] });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to load SEO data: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Lazy load tab data when switching
  useEffect(() => {
    if (activeTab === 'local_seo' && !localSeoData) {
      loadLocalSeoQuality();
    } else if (activeTab === 'parity_audit' && !parityAuditData) {
      loadParityAudit();
    } else if (activeTab === 'slug_conflicts' && !slugConflicts) {
      loadSlugConflicts();
    }
  }, [activeTab]);

  const loadLocalSeoQuality = async () => {
    setLocalSeoLoading(true);
    try {
      const res = await fetch('/api/seo/local-seo-quality');
      const data = await res.json();
      if (data.success) {
        setLocalSeoData({ issues: data.issues || [], totalChecked: data.totalChecked || 0 });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to load local SEO audit: ' + err.message });
    } finally {
      setLocalSeoLoading(false);
    }
  };

  const loadParityAudit = async () => {
    setParityAuditLoading(true);
    try {
      const res = await fetch('/api/seo/parity-audit');
      const data = await res.json();
      if (data.success) {
        setParityAuditData(data.audit);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to load parity audit: ' + err.message });
    } finally {
      setParityAuditLoading(false);
    }
  };

  const loadSlugConflicts = async () => {
    setSlugConflictsLoading(true);
    try {
      const res = await fetch('/api/seo/slug-conflicts');
      const data = await res.json();
      if (data.success) {
        setSlugConflicts({ count: data.count || 0, conflicts: data.conflicts || [] });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to load slug conflicts: ' + err.message });
    } finally {
      setSlugConflictsLoading(false);
    }
  };

  const handleSyncFilterType = async (type: 'all' | 'pages' | 'products' | 'categories' | 'blog' | 'selected') => {
    setSyncDropdownOpen(false);
    setSyncingType(type);
    setSyncingAll(true);

    let label = 'all pages';
    if (type === 'pages') label = `pages (${counts.pages})`;
    else if (type === 'products') label = `products (${counts.products})`;
    else if (type === 'categories') label = `categories (${counts.categories})`;
    else if (type === 'blog') label = `blog posts (${counts.blog})`;
    else if (type === 'selected') label = `${selectedPaths.size} selected items`;

    setMessage({ type: 'info', text: `Syncing ${label} from WordPress source... This may take a few moments.` });

    try {
      const bodyPayload: any = { filter_type: type };
      if (type === 'selected') {
        bodyPayload.paths = Array.from(selectedPaths);
      }

      const res = await fetch('/api/seo/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json();

      if (data.success) {
        if (data.massNoindexDetected) {
          setMessage({
            type: 'warning',
            text: `⚠️ Mass-Noindex Safeguard Engaged: >20% of synced pages returned noindex. Indexability was automatically reverted to your pre-launch baseline!`
          });
        } else {
          setMessage({
            type: 'success',
            text: `Sync completed: ${data.summary.successful} succeeded, ${data.summary.failed} failed (${data.summary.updated} updated, ${data.summary.unchanged} unchanged).`
          });
        }
        setSelectedPaths(new Set());
        await loadData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to sync pages' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Error during sync: ' + err.message });
    } finally {
      setSyncingAll(false);
      setSyncingType(null);
    }
  };

  const handleSyncSingle = async (path: string, entityType: string) => {
    setSyncingPath(path);
    try {
      const res = await fetch('/api/seo/sync-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, entity_type: entityType }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Page ${path} refreshed successfully from WordPress.` });
        await loadData();
      } else {
        setMessage({ type: 'error', text: data.error || `Failed to refresh ${path}` });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `Sync error for ${path}: ` + err.message });
    } finally {
      setSyncingPath(null);
    }
  };

  const handleCreateBaselineSnapshot = async () => {
    if (!confirm('Create a new Baseline Snapshot? This will record the current indexability, canonical, and robots tags as the protected baseline to safeguard against staging noindex leaks.')) {
      return;
    }
    try {
      const res = await fetch('/api/seo/baseline-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshot_name: 'Pre-Launch Baseline Snapshot',
          notes: 'Captured state from ' + (settings?.wordpress_source_url || 'live site'),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Baseline snapshot created and indexability protected!' });
        await loadData();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to create baseline: ' + err.message });
    }
  };

  const handleRunParityCheck = async () => {
    try {
      const res = await fetch('/api/seo/parity-check');
      const data = await res.json();
      if (data.success) {
        setParityCheckData(data.parity);
        setParityModalOpen(true);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to run parity check: ' + err.message });
    }
  };

  const openOverrideModal = (page: SeoPage) => {
    if (!settings?.allow_local_override) {
      setMessage({
        type: 'warning',
        text: 'Emergency local overrides are disabled in SEO Settings. To protect ranking integrity, all SEO edits should be made in WordPress Rank Math.'
      });
      return;
    }
    setOverrideModalPage(page);
    setOverrideForm({
      title: page.title,
      meta_description: page.meta_description,
      canonical_url: page.canonical_url,
      meta_robots: page.meta_robots,
      is_indexable: page.is_indexable === 1,
    });
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModalPage) return;
    try {
      const res = await fetch('/api/seo/page-override', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: overrideModalPage.path,
          ...overrideForm,
          is_local_override: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Saved local override for ${overrideModalPage.path}` });
        setOverrideModalPage(null);
        await loadData();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to save override: ' + err.message });
    }
  };

  // CSV Dry-Run & Apply
  const handleCsvDryRun = async () => {
    if (!csvInput.trim()) {
      setMessage({ type: 'error', text: 'Please upload or paste CSV content first.' });
      return;
    }
    setCsvDryRunLoading(true);
    setCsvPreviewResult(null);
    try {
      const res = await fetch('/api/seo/import-baseline-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_content: csvInput, dry_run: true }),
      });
      const data = await res.json();
      if (data.success) {
        setCsvPreviewResult(data.result);
        setMessage({
          type: 'info',
          text: `CSV Parsed: ${data.result.totalRows} rows (${data.result.newCount} new, ${data.result.updateCount} updates, ${data.result.errorCount} errors). Preview shown below.`
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to parse CSV' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'CSV dry run failed: ' + err.message });
    } finally {
      setCsvDryRunLoading(false);
    }
  };

  const handleCsvApply = async () => {
    if (!csvInput.trim()) return;
    if (!confirm('Apply this baseline CSV to your active database? This will update SEO metadata and create a fresh baseline snapshot.')) {
      return;
    }
    setCsvApplyLoading(true);
    try {
      const res = await fetch('/api/seo/import-baseline-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_content: csvInput, dry_run: false }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          type: 'success',
          text: `Successfully imported baseline CSV! ${data.result.newCount} created, ${data.result.updateCount} updated.`
        });
        setCsvPreviewResult(null);
        setCsvInput('');
        await loadData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to apply CSV' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'CSV apply failed: ' + err.message });
    } finally {
      setCsvApplyLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result;
      if (typeof text === 'string') {
        setCsvInput(text);
        setMessage({ type: 'info', text: `Loaded ${file.name} (${(file.size / 1024).toFixed(1)} KB). Click "Preview / Dry Run" to inspect.` });
      }
    };
    reader.readAsText(file);
  };

  const handleAddRedirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFromPath || !newToPath) return;
    try {
      const res = await fetch('/api/seo/redirects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_path: newFromPath,
          to_path: newToPath,
          status_code: newStatusCode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Redirect from ${newFromPath} to ${newToPath} added.` });
        setShowAddRedirectModal(false);
        setNewFromPath('');
        setNewToPath('');
        await loadData();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to create redirect: ' + err.message });
    }
  };

  const handleDeleteRedirect = async (id: string, fromPath: string) => {
    if (!confirm(`Delete redirect rule for ${fromPath}?`)) return;
    try {
      const res = await fetch(`/api/seo/redirects/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Redirect deleted.` });
        await loadData();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Delete failed: ' + err.message });
    }
  };

  // Counts by entity type
  const counts = useMemo(() => {
    let pagesCount = 0;
    let productsCount = 0;
    let blogCount = 0;
    let categoriesCount = 0;

    for (const p of pages) {
      if (p.entity_type === 'product' || p.path.startsWith('/product/')) {
        productsCount++;
      } else if (p.entity_type === 'post') {
        blogCount++;
      } else if (['category', 'product_cat', 'product_category'].includes(p.entity_type)) {
        categoriesCount++;
      } else {
        pagesCount++;
      }
    }

    return {
      all: pages.length,
      pages: pagesCount,
      products: productsCount,
      categories: categoriesCount,
      blog: blogCount,
      redirects: redirects.length,
    };
  }, [pages, redirects]);

  // Filtered pages for table view
  const filteredPages = useMemo(() => {
    return pages.filter((p) => {
      // Tab filter
      if (activeTab === 'pages') {
        const isProduct = p.entity_type === 'product' || p.path.startsWith('/product/');
        const isPost = p.entity_type === 'post';
        const isCat = ['category', 'product_cat', 'product_category'].includes(p.entity_type);
        if (isProduct || isPost || isCat) return false;
      } else if (activeTab === 'products') {
        const isProduct = p.entity_type === 'product' || p.path.startsWith('/product/');
        if (!isProduct) return false;
      } else if (activeTab === 'categories') {
        const isCat = ['category', 'product_cat', 'product_category'].includes(p.entity_type);
        if (!isCat) return false;
      } else if (activeTab === 'blog') {
        if (p.entity_type !== 'post') return false;
      }

      const matchesSearch =
        p.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.meta_description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesIndex =
        indexFilter === 'all' ||
        (indexFilter === 'indexable' && p.is_indexable === 1) ||
        (indexFilter === 'noindex' && p.is_indexable === 0);

      return matchesSearch && matchesStatus && matchesIndex;
    });
  }, [pages, activeTab, searchTerm, statusFilter, indexFilter]);

  // Toggle selection
  const handleToggleSelect = (path: string) => {
    const next = new Set(selectedPaths);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    setSelectedPaths(next);
  };

  const handleSelectAllInView = () => {
    if (selectedPaths.size === filteredPages.length) {
      setSelectedPaths(new Set());
    } else {
      const next = new Set<string>();
      filteredPages.forEach((p) => next.add(p.path));
      setSelectedPaths(next);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : message.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : message.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {message.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            {message.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
            {message.type === 'info' && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-xs font-semibold hover:opacity-75 cursor-pointer ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-[#DF0C88] flex items-center justify-center font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">Rank Math SEO Mirror &amp; Sync</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-50 text-[#DF0C88] border border-pink-200">
                  {counts.all} Tracked URLs
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Single source of truth in WordPress Rank Math. Mirrors canonical tags, robots meta, OpenGraph cards, and schema graphs into server-rendered HTML.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export Baseline CSV Button */}
          <a
            href="/api/seo/export-baseline-csv"
            download="irepair_mobiles_baseline_seo.csv"
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Download full 283-URL baseline CSV audit"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </a>

          {/* Parity Check Modal Button */}
          <button
            type="button"
            onClick={handleRunParityCheck}
            className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Compare current SEO state with the pre-launch baseline"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Parity Check</span>
          </button>

          {/* Lock Baseline Snapshot Button */}
          <button
            type="button"
            onClick={handleCreateBaselineSnapshot}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Lock current indexability so moving WP to old.irepair-mobiles.co.uk won't corrupt rankings"
          >
            <Lock className="w-4 h-4 text-slate-600" />
            <span>Lock Baseline</span>
          </button>

          {/* Sync SEO from WordPress Split Dropdown */}
          <div className="relative" ref={syncDropdownRef}>
            <div className="flex items-center rounded-lg shadow-sm">
              <button
                type="button"
                onClick={() => handleSyncFilterType('all')}
                disabled={syncingAll}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#DF0C88] hover:bg-[#c20a76] disabled:opacity-50 rounded-l-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
                <span>{syncingAll ? 'Syncing...' : 'Sync SEO from WordPress'}</span>
              </button>
              <button
                type="button"
                disabled={syncingAll}
                onClick={() => setSyncDropdownOpen((prev) => !prev)}
                className="px-2 py-2 text-xs font-semibold text-white bg-[#c20a76] hover:bg-[#a50864] disabled:opacity-50 rounded-r-lg border-l border-pink-700 transition-colors cursor-pointer"
                title="Choose sync scope"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {syncDropdownOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 text-xs text-slate-700 divide-y divide-slate-100">
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => handleSyncFilterType('all')}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-900">Sync Everything</span>
                    <span className="text-[10px] text-slate-400">All {counts.all} URLs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSyncFilterType('pages')}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>Sync Pages Only</span>
                    <span className="text-[10px] text-slate-400">{counts.pages} URLs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSyncFilterType('products')}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>Sync Products Only</span>
                    <span className="text-[10px] text-slate-400">{counts.products} URLs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSyncFilterType('blog')}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>Sync Blog Articles</span>
                    <span className="text-[10px] text-slate-400">{counts.blog} URLs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSyncFilterType('categories')}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>Sync Categories</span>
                    <span className="text-[10px] text-slate-400">Taxonomies</span>
                  </button>
                </div>
                {selectedPaths.size > 0 && (
                  <div className="py-1 bg-pink-50/50">
                    <button
                      type="button"
                      onClick={() => handleSyncFilterType('selected')}
                      className="w-full text-left px-3.5 py-2 text-[#DF0C88] font-bold hover:bg-pink-100/60 flex items-center justify-between"
                    >
                      <span>Sync Selected ({selectedPaths.size})</span>
                      <span className="text-[10px] bg-[#DF0C88] text-white px-1.5 py-0.5 rounded">Action</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Safeguard & Quirks Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Baseline Protection Status Card */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 rounded-2xl shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-white">Baseline Protection Active</h2>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                SAFEGUARDED
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              When WordPress shifts to <code className="text-pink-300 bg-slate-800 px-1 py-0.5 rounded">old.irepair-mobiles.co.uk</code> with noindex checked, React retains the verified pre-launch indexability baseline.
            </p>
          </div>
        </div>

        {/* Mass-Noindex Safeguard Card */}
        <div className="bg-gradient-to-r from-slate-900 to-purple-950 text-white p-4 rounded-2xl shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5 text-pink-400" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-white">Verified Old-Site Quirks Preserved</h2>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                100% PARITY
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Dual H1 on BUDI Charging Stand &amp; iPhone 13 Mini, 0 H1 on Laptop Repair Shops, and long Rank Math descriptions are preserved verbatim as observed on the live WordPress site.
            </p>
          </div>
        </div>
      </div>

      {/* Slug Conflicts Alert Banner (if conflicts exist) */}
      {slugConflicts && slugConflicts.count > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-amber-900">
                {slugConflicts.count} Slug Conflict{slugConflicts.count > 1 ? 's' : ''} Detected
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Overlapping URLs found between CMS pages, blog posts, or 301 redirects. Check the Slug Conflicts tab to inspect resolutions.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('slug_conflicts')}
            className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-lg text-xs cursor-pointer shrink-0"
          >
            Review Conflicts
          </button>
        </div>
      )}

      {/* TAB NAVIGATION */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-px scrollbar-none text-xs">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-2 rounded-t-xl font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'all'
              ? 'bg-white border-t border-x border-slate-200 text-[#DF0C88] shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>All Tracked URLs</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700">
            {counts.all}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pages')}
          className={`px-3.5 py-2 rounded-t-xl font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'pages'
              ? 'bg-white border-t border-x border-slate-200 text-[#DF0C88] shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Pages</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700">
            {counts.pages}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`px-3.5 py-2 rounded-t-xl font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'products'
              ? 'bg-white border-t border-x border-slate-200 text-[#DF0C88] shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Products</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700">
            {counts.products}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('blog')}
          className={`px-3.5 py-2 rounded-t-xl font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'blog'
              ? 'bg-white border-t border-x border-slate-200 text-[#DF0C88] shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Blog Articles</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700">
            {counts.blog}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`px-3.5 py-2 rounded-t-xl font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-white border-t border-x border-slate-200 text-[#DF0C88] shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Categories</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700">
            {counts.categories}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('redirects')}
          className={`px-3.5 py-2 rounded-t-xl font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'redirects'
              ? 'bg-white border-t border-x border-slate-200 text-[#DF0C88] shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>301 Redirects</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800">
            {counts.redirects}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('import_export')}
          className={`px-3.5 py-2 rounded-t-xl font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'import_export'
              ? 'bg-white border-t border-x border-slate-200 text-[#DF0C88] shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Import / Export CSV</span>
        </button>

        <button
          onClick={() => setActiveTab('local_seo')}
          className={`px-3.5 py-2 rounded-t-xl font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'local_seo'
              ? 'bg-white border-t border-x border-slate-200 text-[#DF0C88] shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Local SEO Quality</span>
        </button>

        <button
          onClick={() => setActiveTab('parity_audit')}
          className={`px-3.5 py-2 rounded-t-xl font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'parity_audit'
              ? 'bg-white border-t border-x border-slate-200 text-[#DF0C88] shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Parity Audit ({counts.all} URLs)</span>
        </button>

        <button
          onClick={() => setActiveTab('slug_conflicts')}
          className={`px-3.5 py-2 rounded-t-xl font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'slug_conflicts'
              ? 'bg-white border-t border-x border-slate-200 text-[#DF0C88] shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Slug Conflicts</span>
          {slugConflicts && slugConflicts.count > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          )}
        </button>
      </div>

      {/* 1. TABLE VIEWS (All, Pages, Products, Categories, Blog) */}
      {['all', 'pages', 'products', 'categories', 'blog'].includes(activeTab) && (
        <div className="space-y-4">
          {/* Search, Filter & Bulk Stats Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[240px] flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by page slug or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DF0C88] focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Indexability:</span>
                <select
                  value={indexFilter}
                  onChange={(e) => setIndexFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#DF0C88]"
                >
                  <option value="all">All Pages</option>
                  <option value="indexable">Indexable Only</option>
                  <option value="noindex">Noindex Only</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#DF0C88]"
                >
                  <option value="all">All Statuses</option>
                  <option value="ok">OK (Synced)</option>
                  <option value="changed">Content Changed</option>
                  <option value="redirecting">Redirecting</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium shrink-0">
              {selectedPaths.size > 0 && (
                <span className="text-pink-600 font-bold bg-pink-50 px-2 py-0.5 rounded">
                  {selectedPaths.size} selected
                </span>
              )}
              <span>Showing <strong>{filteredPages.length}</strong> items</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#DF0C88]" />
                <span className="text-xs">Loading page SEO records...</span>
              </div>
            ) : filteredPages.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No URLs found matching the active filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="p-3.5 w-10 text-center">
                        <button
                          type="button"
                          onClick={handleSelectAllInView}
                          className="text-slate-500 hover:text-slate-900 cursor-pointer"
                          title="Select all currently visible"
                        >
                          {selectedPaths.size > 0 && selectedPaths.size === filteredPages.length ? (
                            <CheckSquare className="w-4 h-4 text-[#DF0C88]" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </th>
                      <th className="p-3.5">URL Path &amp; Type</th>
                      <th className="p-3.5">Meta Title &amp; Description</th>
                      <th className="p-3.5">Indexability</th>
                      <th className="p-3.5">Rank Math Schemas</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPages.map((page) => {
                      let schemaList: string[] = [];
                      try {
                        schemaList = JSON.parse(page.schema_types_json || '[]');
                      } catch (_) {}

                      const wpEditUrl = `${(settings?.wordpress_source_url || 'https://irepair-mobiles.co.uk').replace(/\/+$/, '')}${page.path}`;
                      const isSelected = selectedPaths.has(page.path);

                      return (
                        <tr
                          key={page.id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            isSelected ? 'bg-pink-50/20' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="p-3.5 align-top text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelect(page.path)}
                              className="text-slate-400 hover:text-slate-800 cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#DF0C88]" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>
                          </td>

                          {/* Path & Type */}
                          <td className="p-3.5 align-top">
                            <div className="flex items-center gap-1.5">
                              <code className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                {page.path}
                              </code>
                              <a
                                href={page.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-[#DF0C88] transition-colors"
                                title="Open live React page"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {page.entity_type}
                              </span>
                              {page.is_local_override === 1 && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded">
                                  Overridden
                                </span>
                              )}
                              {page.status === 'changed' && (
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1 rounded">
                                  Changed
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Title & Description */}
                          <td className="p-3.5 align-top max-w-sm">
                            <div className="font-semibold text-slate-900 line-clamp-1" title={page.title}>
                              {page.title || <span className="text-slate-400 italic">No title</span>}
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5" title={page.meta_description}>
                              {page.meta_description || <span className="text-slate-400 italic">No meta description</span>}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                              <span className="font-mono truncate max-w-xs">{page.canonical_url}</span>
                            </div>
                          </td>

                          {/* Indexability */}
                          <td className="p-3.5 align-top whitespace-nowrap">
                            {page.is_indexable === 1 ? (
                              <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Indexable</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-rose-700 font-semibold">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Noindex</span>
                              </div>
                            )}
                            <div className="text-[10px] text-slate-400 mt-0.5 max-w-[130px] truncate" title={page.meta_robots}>
                              {page.meta_robots}
                            </div>
                          </td>

                          {/* Rank Math Schemas */}
                          <td className="p-3.5 align-top">
                            {schemaList.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {schemaList.map((type, idx) => (
                                  <span
                                    key={idx}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                                  >
                                    {type}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">No JSON-LD</span>
                            )}
                          </td>

                          {/* HTTP Status */}
                          <td className="p-3.5 align-top whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                page.http_status === 200
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : page.http_status === 301 || page.http_status === 302
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {page.http_status} {page.http_status === 200 ? 'OK' : page.http_status === 301 ? '301 Move' : ''}
                            </span>
                            {page.redirect_url && (
                              <div className="text-[10px] text-amber-600 mt-1 max-w-[120px] truncate" title={page.redirect_url}>
                                &rarr; {page.redirect_url}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="p-3.5 align-top text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Sync Button */}
                              <button
                                type="button"
                                onClick={() => handleSyncSingle(page.path, page.entity_type)}
                                disabled={syncingPath === page.path}
                                className="p-1.5 text-slate-600 hover:text-[#DF0C88] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Sync this page from WordPress"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${syncingPath === page.path ? 'animate-spin' : ''}`} />
                              </button>

                              {/* Inspect / Diff Button */}
                              <button
                                type="button"
                                onClick={() => setInspectModalPage(page)}
                                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Inspect full SEO tags & schema"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit in WordPress */}
                              <a
                                href={wpEditUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center"
                                title="View / Edit in WordPress"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>

                              {/* Override Button (Only if allowed in settings) */}
                              {settings?.allow_local_override ? (
                                <button
                                  type="button"
                                  onClick={() => openOverrideModal(page)}
                                  className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                  title="Manual override for this page"
                                >
                                  Override
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. REDIRECTS TAB */}
      {activeTab === 'redirects' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <ArrowRight className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">301 Permanent Redirects</h2>
                <p className="text-xs text-slate-500">
                  Enforces legacy path redirection before CMS page/post lookup to guarantee zero 404s.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddRedirectModal(true)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#DF0C88] hover:bg-[#c20a76] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add 301 Redirect</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="p-3">From Path (Legacy)</th>
                  <th className="p-3">To Path (Destination)</th>
                  <th className="p-3">HTTP Status</th>
                  <th className="p-3">Origin</th>
                  <th className="p-3">Hit Count</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {redirects.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="p-3 font-mono font-bold text-slate-900">{r.from_path}</td>
                    <td className="p-3 font-mono text-emerald-700">
                      <a href={r.to_path} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                        <span>{r.to_path}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {r.status_code} Permanent
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">{r.origin}</td>
                    <td className="p-3 font-semibold text-slate-700">{r.hit_count}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteRedirect(r.id, r.from_path)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                        title="Delete redirect"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. IMPORT / EXPORT CSV TAB */}
      {activeTab === 'import_export' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-50 text-[#DF0C88] flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Baseline CSV Import &amp; Export</h2>
                  <p className="text-xs text-slate-500">
                    Import or export the verified Screaming Frog / Rank Math baseline CSV to audit all 283 tracked URLs.
                  </p>
                </div>
              </div>
              <a
                href="/api/seo/export-baseline-csv"
                download="irepair_mobiles_baseline_seo.csv"
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Current Baseline CSV</span>
              </a>
            </div>

            {/* Upload & Paste Controls */}
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-[#DF0C88] transition-colors bg-slate-50/50">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-800">
                  Drag and drop baseline CSV file here, or browse
                </div>
                <p className="text-[11px] text-slate-500 mt-1 mb-3">
                  Accepts standard Screaming Frog / Rank Math exported CSV containing entity_type, path, status_code, meta_title, meta_description, canonical_path, and meta_robots.
                </p>
                <label className="px-4 py-2 text-xs font-semibold text-white bg-[#DF0C88] hover:bg-[#c20a76] rounded-lg cursor-pointer shadow-sm inline-flex items-center gap-1.5">
                  <span>Browse CSV File</span>
                  <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  OR PASTE RAW CSV CONTENT
                </label>
                <textarea
                  rows={6}
                  value={csvInput}
                  onChange={(e) => setCsvInput(e.target.value)}
                  placeholder="entity_type,path,status_code,indexability,meta_title,meta_description,canonical_path,meta_robots..."
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#DF0C88] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCsvDryRun}
                  disabled={csvDryRunLoading || !csvInput.trim()}
                  className="px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" />
                  <span>{csvDryRunLoading ? 'Parsing...' : 'Preview / Dry Run'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCsvApply}
                  disabled={csvApplyLoading || !csvInput.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#DF0C88] hover:bg-[#c20a76] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{csvApplyLoading ? 'Applying...' : 'Apply to Baseline'}</span>
                </button>
              </div>
            </div>

            {/* Dry Run Preview Table */}
            {csvPreviewResult && (
              <div className="border border-slate-200 rounded-xl overflow-hidden mt-6 space-y-3 p-4 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-slate-900">
                    Dry Run Preview: {csvPreviewResult.totalRows} Rows
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                      {csvPreviewResult.newCount} New
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                      {csvPreviewResult.updateCount} Updates
                    </span>
                    {csvPreviewResult.errorCount > 0 && (
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                        {csvPreviewResult.errorCount} Errors
                      </span>
                    )}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                  <table className="w-full text-left text-xs divide-y divide-slate-100">
                    <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5">Path</th>
                        <th className="p-2.5">Title</th>
                        <th className="p-2.5">Action</th>
                        <th className="p-2.5">Robots</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {csvPreviewResult.preview.map((p: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-800">{p.path}</td>
                          <td className="p-2.5 font-sans truncate max-w-xs">{p.title}</td>
                          <td className="p-2.5 font-sans">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              p.action === 'new' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                              {p.action}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-500">{p.meta_robots}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. LOCAL SEO SCHEMA QUALITY TAB */}
      {activeTab === 'local_seo' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Local SEO Schema Quality Report</h2>
                <p className="text-xs text-slate-500">
                  Audits Schema.org LocalBusiness, MobilePhoneStore, and Organization entities for Google rich-result compliance.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadLocalSeoQuality}
              disabled={localSeoLoading}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${localSeoLoading ? 'animate-spin' : ''}`} />
              <span>Re-check Quality</span>
            </button>
          </div>

          {localSeoLoading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs">Analyzing Local SEO Schema nodes...</span>
            </div>
          ) : localSeoData ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  Checked <strong>{localSeoData.totalChecked}</strong> pages with JSON-LD schema graphs.
                </div>
                <div className="font-bold text-slate-700">
                  {localSeoData.issues.length === 0 ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> All Schema Quality Checks Passed
                    </span>
                  ) : (
                    <span className="text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> {localSeoData.issues.length} Optimization Recommendation{localSeoData.issues.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {localSeoData.issues.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs divide-y divide-slate-100">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Page Path</th>
                        <th className="p-3">Issue Type</th>
                        <th className="p-3">Observed Value</th>
                        <th className="p-3">WordPress Rank Math Action Hint</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {localSeoData.issues.map((iss, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-slate-900">{iss.path}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              iss.severity === 'warning' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'
                            }`}>
                              {iss.type}
                            </span>
                            <div className="text-[11px] text-slate-600 mt-0.5">{iss.message}</div>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-700 max-w-xs truncate" title={iss.foundValue}>
                            {iss.foundValue}
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded text-[11px] inline-flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" />
                              {iss.hint}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* 5. PARITY AUDIT TAB (283 URLs) */}
      {activeTab === 'parity_audit' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Full {counts.all}-URL Parity Audit</h2>
                <p className="text-xs text-slate-500">
                  Comprehensive audit across all {counts.pages} CMS pages, {counts.products} products, and {counts.blog} blog posts validating title, canonical, meta robots, and schema graph parity.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadParityAudit}
                disabled={parityAuditLoading}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${parityAuditLoading ? 'animate-spin' : ''}`} />
                <span>Re-run Audit</span>
              </button>
            </div>
          </div>

          {parityAuditLoading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs">Computing full 283-URL parity matrix...</span>
            </div>
          ) : parityAuditData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3 text-center text-xs">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <div className="text-xl font-extrabold text-slate-900">{parityAuditData.total}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Total URLs</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <div className="text-xl font-extrabold text-emerald-700">{parityAuditData.passedCount}</div>
                  <div className="text-[10px] text-emerald-800 uppercase font-bold">Passed Parity</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl">
                  <div className="text-xl font-extrabold text-purple-700">{parityAuditData.quirkCount}</div>
                  <div className="text-[10px] text-purple-800 uppercase font-bold">Quirks Preserved</div>
                </div>
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl">
                  <div className="text-xl font-extrabold text-rose-700">{parityAuditData.failedCount}</div>
                  <div className="text-[10px] text-rose-800 uppercase font-bold">Failed Parity</div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-xs divide-y divide-slate-100">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] sticky top-0 z-10 shadow-xs">
                    <tr>
                      <th className="p-3">Path &amp; Type</th>
                      <th className="p-3">Title Parity</th>
                      <th className="p-3">Canonical</th>
                      <th className="p-3">Robots &amp; Schema</th>
                      <th className="p-3">Quirk / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parityAuditData.items.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3">
                          <code className="font-bold text-slate-900 bg-slate-100 px-1 py-0.5 rounded text-[11px]">
                            {item.path}
                          </code>
                          <span className="ml-1 text-[10px] uppercase text-slate-400 font-bold">
                            {item.entity_type}
                          </span>
                        </td>
                        <td className="p-3 max-w-xs truncate" title={item.title}>
                          {item.title_matches ? (
                            <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate">{item.title}</span>
                            </span>
                          ) : (
                            <span className="text-rose-700">Missing Title</span>
                          )}
                        </td>
                        <td className="p-3">
                          {item.canonical_matches ? (
                            <span className="text-emerald-700 font-semibold">Matches Site URL</span>
                          ) : (
                            <span className="text-rose-700">Mismatch</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 text-[11px]">
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 font-bold text-slate-700">
                              {item.schema_types.length} schemas
                            </span>
                            {item.robots_matches && (
                              <span className="text-emerald-700 font-bold">Robots OK</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          {item.quirk_note ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200" title={item.quirk_note}>
                              Quirk Verified
                            </span>
                          ) : item.overall_pass ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Pass
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Check
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 6. SLUG CONFLICTS TAB */}
      {activeTab === 'slug_conflicts' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Slug Collision &amp; Conflict Inspector</h2>
                <p className="text-xs text-slate-500">
                  Validates slug uniqueness across reserved routes, CMS pages, published blog articles, and 301 redirects.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadSlugConflicts}
              disabled={slugConflictsLoading}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${slugConflictsLoading ? 'animate-spin' : ''}`} />
              <span>Re-scan Collisions</span>
            </button>
          </div>

          {slugConflictsLoading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
              <span className="text-xs">Scanning routes for collisions...</span>
            </div>
          ) : slugConflicts ? (
            <div className="space-y-4 text-xs">
              {slugConflicts.count === 0 ? (
                <div className="p-8 text-center bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div className="font-bold text-sm text-emerald-900">Zero Slug Conflicts Detected!</div>
                  <p className="text-emerald-700 text-xs max-w-md mx-auto">
                    All CMS pages, published blog articles, and 301 redirects resolve cleanly without namespace collisions or route shadowing.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs divide-y divide-slate-100">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Conflict Type</th>
                        <th className="p-3">Slug</th>
                        <th className="p-3">Description</th>
                        <th className="p-3">Paths Involved</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {slugConflicts.conflicts.map((c: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {c.type}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-900">{c.slug}</td>
                          <td className="p-3 text-slate-700">{c.description}</td>
                          <td className="p-3 font-mono text-[11px] text-slate-500">
                            {c.paths.join(' ↔ ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* INSPECT MODAL */}
      {inspectModalPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-pink-100 text-[#DF0C88] flex items-center justify-center font-bold">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">SEO Inspector: {inspectModalPage.path}</h3>
                  <p className="text-[11px] text-slate-500">
                    Captured from {settings?.wordpress_source_url} at {new Date(inspectModalPage.captured_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectModalPage(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Page Title</label>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-semibold text-slate-900">
                  {inspectModalPage.title}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meta Description</label>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-700">
                  {inspectModalPage.meta_description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Canonical URL</label>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] text-emerald-700 truncate">
                    {inspectModalPage.canonical_url}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meta Robots</label>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700">
                    {inspectModalPage.meta_robots}
                  </div>
                </div>
              </div>

              {/* JSON-LD Schema Graph */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Rank Math JSON-LD Schema Graph (Rewritten to {settings?.site_url})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(inspectModalPage.jsonld_rewritten || inspectModalPage.jsonld_raw || '');
                      setCopiedRewritten(true);
                      setTimeout(() => setCopiedRewritten(false), 2000);
                    }}
                    className="text-[11px] text-[#DF0C88] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedRewritten ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedRewritten ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60">
                  {inspectModalPage.jsonld_rewritten
                    ? JSON.stringify(JSON.parse(inspectModalPage.jsonld_rewritten), null, 2)
                    : 'No JSON-LD schema detected on this page.'}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <a
                href={`${(settings?.wordpress_source_url || '').replace(/\/+$/, '')}${inspectModalPage.path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in WordPress Source</span>
              </a>
              <button
                type="button"
                onClick={() => setInspectModalPage(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERRIDE MODAL */}
      {overrideModalPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden border border-slate-200">
            <form onSubmit={handleSaveOverride}>
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Emergency Local Override</h3>
                    <p className="text-[11px] text-slate-500">{overrideModalPage.path}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOverrideModalPage(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Custom Title</label>
                  <input
                    type="text"
                    value={overrideForm.title}
                    onChange={(e) => setOverrideForm({ ...overrideForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Custom Meta Description</label>
                  <textarea
                    rows={3}
                    value={overrideForm.meta_description}
                    onChange={(e) => setOverrideForm({ ...overrideForm, meta_description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Custom Canonical URL</label>
                  <input
                    type="url"
                    value={overrideForm.canonical_url}
                    onChange={(e) => setOverrideForm({ ...overrideForm, canonical_url: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-700">Allow Indexing by Search Engines</span>
                  <input
                    type="checkbox"
                    checked={overrideForm.is_indexable}
                    onChange={(e) =>
                      setOverrideForm({
                        ...overrideForm,
                        is_indexable: e.target.checked,
                        meta_robots: e.target.checked ? 'index, follow' : 'noindex, follow',
                      })
                    }
                    className="w-4 h-4 text-[#DF0C88] rounded border-slate-300 focus:ring-[#DF0C88] cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOverrideModalPage(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#DF0C88] hover:bg-[#c20a76] rounded-lg shadow-sm cursor-pointer"
                >
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD REDIRECT MODAL */}
      {showAddRedirectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden border border-slate-200">
            <form onSubmit={handleAddRedirect}>
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">Add 301 Permanent Redirect</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddRedirectModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Source Path (Legacy)</label>
                  <input
                    type="text"
                    required
                    placeholder="/old-page-path/"
                    value={newFromPath}
                    onChange={(e) => setNewFromPath(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Target Path (Destination)</label>
                  <input
                    type="text"
                    required
                    placeholder="/new-page-path/"
                    value={newToPath}
                    onChange={(e) => setNewToPath(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">HTTP Status Code</label>
                  <select
                    value={newStatusCode}
                    onChange={(e) => setNewStatusCode(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                  >
                    <option value={301}>301 - Permanent Redirect (SEO Link Equity Passed)</option>
                    <option value={302}>302 - Temporary Redirect</option>
                  </select>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddRedirectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#DF0C88] hover:bg-[#c20a76] rounded-lg shadow-sm cursor-pointer"
                >
                  Create Redirect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PARITY CHECK RESULTS MODAL */}
      {parityModalOpen && parityCheckData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Baseline Parity Check Results</h3>
                  <p className="text-[11px] text-slate-500">
                    Comparing current crawl state vs Pre-Launch Baseline snapshot
                  </p>
                </div>
              </div>
              <button
                onClick={() => setParityModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <div className="text-xl font-bold text-emerald-700">{parityCheckData.healthy_count}</div>
                  <div className="text-[10px] text-emerald-800 font-semibold uppercase">Fully Matching</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                  <div className="text-xl font-bold text-amber-700">{parityCheckData.warning_count}</div>
                  <div className="text-[10px] text-amber-800 font-semibold uppercase">Minor Changes</div>
                </div>
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl">
                  <div className="text-xl font-bold text-rose-700">{parityCheckData.critical_count}</div>
                  <div className="text-[10px] text-rose-800 font-semibold uppercase">Staging Noindex Risk</div>
                </div>
              </div>

              {parityCheckData.critical_count > 0 && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>Warning:</strong> One or more pages have acquired a <code>noindex</code> directive that differs from the baseline. Baseline snapshot protection is actively guarding these pages.
                  </span>
                </div>
              )}

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs divide-y divide-slate-100">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Path</th>
                      <th className="p-2.5">Title Parity</th>
                      <th className="p-2.5">Robots Parity</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parityCheckData.items.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold font-mono text-slate-800">{item.path}</td>
                        <td className="p-2.5">
                          {item.title_matches ? (
                            <span className="text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Matched
                            </span>
                          ) : (
                            <span className="text-amber-700 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" /> Changed
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          {item.is_staging_noindex_risk ? (
                            <span className="text-rose-700 font-bold bg-rose-50 px-1 py-0.5 rounded">
                              Protected Noindex Risk
                            </span>
                          ) : item.robots_matches ? (
                            <span className="text-emerald-700">Matched</span>
                          ) : (
                            <span className="text-amber-700">Different</span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-bold uppercase">
                            {item.current_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setParityModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
