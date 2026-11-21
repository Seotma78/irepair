import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShoppingBag,
  Search,
  Filter,
  Plus,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  Download,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit,
  Tag,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  Smartphone,
  Save,
  X,
  Clock,
  Settings,
  HelpCircle,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface ProductItem {
  id: string;
  wpId?: number;
  externalId?: number;
  title: string;
  name: string;
  slug: string;
  sku?: string;
  category: string;
  categoryPath: string;
  hierarchicalUrl: string;
  canonicalUrl: string;
  brand: string;
  brandId?: string;
  price: number;
  regularPrice?: number;
  salePrice?: number;
  onSale: boolean;
  type: string;
  condition: string;
  inStock: boolean;
  stockStatus: string;
  stockCount: number;
  rating: number;
  reviewsCount: number;
  image: string;
  gallery: string[];
  description: string;
  shortDescription?: string;
  specifications: Record<string, string>;
  attributes: any[];
  variations?: any[];
  permalink?: string;
  customFields?: Record<string, string>;
  technicalDetailsHtml?: string;
  source: 'local' | 'woocommerce';
  lastSyncedAt?: string;
  localHidden: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface BrandItem {
  id: string;
  name: string;
  slug: string;
  product_count: number;
  source: string;
  external_id?: number;
}

const STORE_BASE_URL = 'https://irepair-mobiles.co.uk';

export const ProductsManagerView: React.FC = () => {
  const { categories, refreshProducts } = useApp();
  const [activeTab, setActiveTab] = useState<'products' | 'brands' | 'sync'>('products');

  // Products List State
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterBrand, setFilterBrand] = useState('all');
  const [filterCondition, setFilterCondition] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStock, setFilterStock] = useState('all');
  const [filterSource, setFilterSource] = useState<'all' | 'local' | 'woocommerce'>('all');
  const [filterType, setFilterType] = useState<'all' | 'simple' | 'variable'>('all');
  const [filterHidden, setFilterHidden] = useState(false);

  // Selected for Bulk Action
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Drawer / Modals
  const [inspectProduct, setInspectProduct] = useState<ProductItem | null>(null);
  const [variationsModalProduct, setVariationsModalProduct] = useState<ProductItem | null>(null);
  const [resyncingVarProductId, setResyncingVarProductId] = useState<string | null>(null);
  const [resyncingAllVars, setResyncingAllVars] = useState(false);
  const [resyncVarsSuccessMsg, setResyncVarsSuccessMsg] = useState<string | null>(null);
  const [resyncingSeoId, setResyncingSeoId] = useState<string | null>(null);
  const [resyncSeoMsg, setResyncSeoMsg] = useState<string | null>(null);
  const [localEditModalOpen, setLocalEditModalOpen] = useState(false);
  const [isEditingLocal, setIsEditingLocal] = useState(false);
  const [localFormData, setLocalFormData] = useState<any>({
    title: '',
    price: 0,
    regularPrice: '',
    categorySlug: 'accessories',
    brandName: 'iRepair',
    condition: 'Brand New',
    stockStatus: 'instock',
    stockQuantity: 10,
    sku: '',
    image: '',
    shortDescription: '',
    description: '',
  });

  // Brands Tab State
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);

  // Sync Engine State
  const [syncStatus, setSyncStatus] = useState<any | null>(null);
  const [syncProgress, setSyncProgress] = useState<any | null>(null);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [syncSettings, setSyncSettings] = useState<any>({
    brandSource: 'attribute',
    conditionSource: 'attribute',
    brandTaxonomy: 'pa_brand',
    conditionTaxonomy: 'pa_condition',
    importedStatuses: ['publish'],
    deletedPolicy: 'archive',
    imageMode: 'hotlink',
    syncIntervalMinutes: 30,
    webhookUrl: '',
    webhookSecret: '',
    technicalDetailsMetaKey: '',
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);
  const [dryRunPreview, setDryRunPreview] = useState<any | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // ACF Custom Fields Mapping State
  const [customFieldMappings, setCustomFieldMappings] = useState<any[]>([
    { role: 'delivery', label: 'Delivery text', metaKey: 'delivery_text', type: 'text', enabled: true },
    { role: 'warranty', label: 'Warranty Text', metaKey: 'warranty_text', type: 'text', enabled: true },
    { role: 'returns', label: 'Returns', metaKey: 'returns_', type: 'text', enabled: true },
    { role: 'technical_details', label: 'Technical Details', metaKey: 'technical_details', type: 'html', enabled: true },
  ]);
  const [savingCustomFields, setSavingCustomFields] = useState(false);
  const [testingAcf, setTestingAcf] = useState(false);
  const [acfTestReport, setAcfTestReport] = useState<any | null>(null);
  const [resyncingCustomFields, setResyncingCustomFields] = useState(false);
  const [resyncSuccessMsg, setResyncSuccessMsg] = useState<string | null>(null);
  const [resyncingShortDesc, setResyncingShortDesc] = useState(false);
  const [resyncShortDescSuccessMsg, setResyncShortDescSuccessMsg] = useState<string | null>(null);

  // Trust Badges Settings State
  const [trustBadgesSettings, setTrustBadgesSettings] = useState<any>({
    enabled: true,
    items: {
      delivery: { id: 'delivery', label: 'Delivery', icon: 'truck', fallbackText: 'Free Next-Day Tracked Delivery', enabled: true },
      warranty: { id: 'warranty', label: 'Warranty', icon: 'shield', fallbackText: '12 Months Hardware Guarantee', enabled: true },
      returns: { id: 'returns', label: 'Returns', icon: 'rotate-ccw', fallbackText: '14-Day Money Back Guarantee', enabled: true },
    },
  });
  const [savingTrustBadges, setSavingTrustBadges] = useState(false);

  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState({
    image: true,
    name: true,
    sku: true,
    brand: true,
    category: true,
    price: true,
    stock: true,
    source: true,
    status: true,
    actions: true,
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token') || '';
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        type: filterType !== 'all' ? filterType : '',
        category: filterCategory !== 'all' ? filterCategory : '',
        brand: filterBrand !== 'all' ? filterBrand : '',
        condition: filterCondition !== 'all' ? filterCondition : '',
        status: filterStatus !== 'all' ? filterStatus : '',
        stockStatus: filterStock !== 'all' ? filterStock : '',
        source: filterSource,
        hidden: filterHidden ? 'true' : 'false',
      });

      const res = await fetch(`/api/admin/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotalProducts(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load admin products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBrands = async () => {
    setLoadingBrands(true);
    try {
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch('/api/admin/products/meta/brands', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBrands(data.brands || []);
      }
    } catch (e) {
      console.error('Failed to fetch brands:', e);
    } finally {
      setLoadingBrands(false);
    }
  };

  const fetchSyncStatusAndSettings = async () => {
    try {
      const token = localStorage.getItem('admin_token') || '';
      const [statusRes, settingsRes, logsRes, acfRes, tbRes] = await Promise.all([
        fetch('/api/admin/products/sync/status', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/products/sync/settings', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/products/sync/logs', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/products/custom-fields/settings', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/products/trust-badges/settings', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (statusRes.ok) {
        const sData = await statusRes.json();
        setSyncStatus(sData);
        setSyncProgress(sData.progress);
      }
      if (settingsRes.ok) {
        const setts = await settingsRes.json();
        setSyncSettings(setts);
      }
      if (logsRes.ok) {
        const lData = await logsRes.json();
        setSyncLogs(lData.logs || []);
      }
      if (acfRes.ok) {
        const acfData = await acfRes.json();
        if (Array.isArray(acfData.mappings) && acfData.mappings.length > 0) {
          setCustomFieldMappings(acfData.mappings);
        }
      }
      if (tbRes.ok) {
        const tbData = await tbRes.json();
        if (tbData.settings) {
          setTrustBadgesSettings(tbData.settings);
        }
      }
    } catch (e) {
      console.error('Failed to fetch sync status:', e);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, limit, filterCategory, filterBrand, filterCondition, filterStatus, filterStock, filterSource, filterHidden, filterType]);

  // Debounced Search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchProducts();
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (activeTab === 'brands') fetchBrands();
    if (activeTab === 'sync') fetchSyncStatusAndSettings();
  }, [activeTab]);

  // Polling sync status if sync is running
  useEffect(() => {
    if (!syncProgress?.isRunning) return;
    const interval = setInterval(() => {
      fetchSyncStatusAndSettings();
    }, 2000);
    return () => clearInterval(interval);
  }, [syncProgress?.isRunning]);

  // Toggle Hide
  const handleToggleHide = async (product: ProductItem) => {
    try {
      const token = localStorage.getItem('admin_token') || '';
      const newHidden = !product.localHidden;
      const res = await fetch(`/api/admin/products/${product.id}/toggle-hide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ hidden: newHidden }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, localHidden: newHidden } : p))
        );
        if (inspectProduct?.id === product.id) {
          setInspectProduct({ ...inspectProduct, localHidden: newHidden });
        }
        await refreshProducts();
      }
    } catch (e) {
      alert('Failed to update hidden status');
    }
  };

  // Re-sync single product
  const handleResyncProduct = async (product: ProductItem) => {
    try {
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch(`/api/admin/products/sync/product/${product.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        alert(`Product ${product.title} has been re-synced successfully.`);
        fetchProducts();
        await refreshProducts();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to sync product');
      }
    } catch (e) {
      alert('Sync failed');
    }
  };

  // Trigger Sync
  const handleStartSync = async (mode: 'full' | 'incremental' | 'reconcile' | 'dry_run' | 'categories_only' | 'products_only') => {
    setSyncingNow(true);
    setDryRunPreview(null);
    try {
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch('/api/admin/products/sync/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: mode }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchSyncStatusAndSettings();
      } else {
        alert(data.error || 'Failed to start sync');
      }
    } catch (e) {
      alert('Network error while starting sync');
    } finally {
      setSyncingNow(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch('/api/admin/products/sync/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(syncSettings),
      });
      if (res.ok) {
        alert('Sync settings saved successfully.');
        fetchSyncStatusAndSettings();
      }
    } catch (e) {
      alert('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch('/api/admin/products/sync/test-connection', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e) {
      setTestResult({ success: false, error: 'Connection test failed' });
    } finally {
      setTestingConnection(false);
    }
  };

  // Save Custom Field Mappings
  const handleSaveCustomFields = async () => {
    setSavingCustomFields(true);
    try {
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch('/api/admin/products/custom-fields/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mappings: customFieldMappings }),
      });
      if (res.ok) {
        alert('Custom field mappings saved successfully!');
      } else {
        alert('Failed to save custom field mappings');
      }
    } catch (e: any) {
      alert('Error saving custom fields: ' + e.message);
    } finally {
      setSavingCustomFields(false);
    }
  };

  // Test ACF Connection
  const handleTestAcf = async () => {
    setTestingAcf(true);
    setAcfTestReport(null);
    try {
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch('/api/admin/products/custom-fields/test-connection', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAcfTestReport(data);
    } catch (e: any) {
      setAcfTestReport({
        success: false,
        message: 'Test failed: ' + e.message,
        testedSampleProducts: 0,
        fieldResults: [],
        warning: e.message,
      });
    } finally {
      setTestingAcf(false);
    }
  };

  // One-off Re-sync ACF Custom Fields for all products
  const handleResyncCustomFieldsAll = async () => {
    setResyncingCustomFields(true);
    setResyncSuccessMsg(null);
    try {
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch('/api/admin/products/custom-fields/resync-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setResyncSuccessMsg(`Re-synced custom fields for ${data.updatedCount} of ${data.totalCount} products successfully!`);
        fetchProducts();
        await refreshProducts();
      } else {
        alert(data.error || 'Failed to resync custom fields');
      }
    } catch (e: any) {
      alert('Error during custom fields resync: ' + e.message);
    } finally {
      setResyncingCustomFields(false);
    }
  };

  // One-off Re-sync raw HTML short descriptions for all products from WooCommerce
  const handleResyncShortDescriptionsAll = async () => {
    if (!confirm('Re-sync raw HTML short descriptions for all products directly from WooCommerce? This will preserve rich lists, bold, italics, links, and line breaks exactly as formatted in WordPress.')) {
      return;
    }
    setResyncingShortDesc(true);
    setResyncShortDescSuccessMsg(null);
    try {
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch('/api/admin/products/sync/resync-short-descriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResyncShortDescSuccessMsg(`Successfully re-synced raw HTML short descriptions for ${data.updatedCount} products from WooCommerce (${data.durationMs}ms)!`);
        fetchProducts();
        await refreshProducts();
      } else {
        alert(data.error || 'Failed to re-sync short descriptions');
      }
    } catch (e: any) {
      alert('Error during short descriptions re-sync: ' + e.message);
    } finally {
      setResyncingShortDesc(false);
    }
  };

  // Re-sync variations for a single product
  const handleResyncSingleProductVariations = async (productId: string) => {
    setResyncingVarProductId(productId);
    try {
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch(`/api/admin/products/${productId}/resync-variations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Successfully re-synced ${data.variationsCount} variations for product!`);
        fetchProducts();
        await refreshProducts();
        if (variationsModalProduct && variationsModalProduct.id === productId) {
          const updated = products.find(p => p.id === productId);
          if (updated) setVariationsModalProduct({ ...updated, variations: data.variations || updated.variations });
        }
      } else {
        alert(data.error || 'Failed to resync variations');
      }
    } catch (e: any) {
      alert('Error during variation resync: ' + e.message);
    } finally {
      setResyncingVarProductId(null);
    }
  };

  // Re-sync all variations across all variable products
  const handleResyncAllVariations = async () => {
    if (!confirm('Re-sync all variations for all variable products directly from WooCommerce? This queries all paginated variations (per_page=100) and updates price ranges and attribute matrices.')) {
      return;
    }
    setResyncingAllVars(true);
    setResyncVarsSuccessMsg(null);
    try {
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch('/api/admin/products/sync/resync-variations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResyncVarsSuccessMsg(`Successfully synced ${data.totalVariationsSynced} variations across ${data.syncedProducts} variable products (${data.durationMs}ms)!`);
        fetchProducts();
        await refreshProducts();
      } else {
        alert(data.error || 'Failed to resync variations');
      }
    } catch (e: any) {
      alert('Error during variations resync: ' + e.message);
    } finally {
      setResyncingAllVars(false);
    }
  };

  // Re-sync Rank Math SEO metadata for single product from WordPress
  const handleResyncProductSeo = async (prod: ProductItem) => {
    setResyncingSeoId(prod.id);
    setResyncSeoMsg(null);
    try {
      const path = prod.hierarchicalUrl || `/product/${prod.slug}/`;
      const res = await fetch('/api/seo/sync-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, entity_type: 'product' }),
      });
      const data = await res.json();
      if (data.success) {
        setResyncSeoMsg(`Rank Math SEO refreshed: "${data.page?.title || 'OK'}"`);
      } else {
        alert(data.error || 'Failed to sync SEO for this item');
      }
    } catch (e: any) {
      alert('Error during SEO sync: ' + e.message);
    } finally {
      setResyncingSeoId(null);
    }
  };

  // Save Trust Badges Settings
  const handleSaveTrustBadges = async () => {
    setSavingTrustBadges(true);
    try {
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch('/api/admin/products/trust-badges/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: trustBadgesSettings }),
      });
      if (res.ok) {
        alert('Product page trust badges settings saved successfully!');
      } else {
        alert('Failed to save trust badges settings');
      }
    } catch (e: any) {
      alert('Error saving trust badges settings: ' + e.message);
    } finally {
      setSavingTrustBadges(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['ID', 'External ID', 'Source', 'Title', 'Slug', 'SKU', 'Brand', 'Category', 'Price', 'Regular Price', 'Stock Status', 'Quantity', 'Status', 'Hidden', 'Last Synced'];
    const rows = products.map((p) => [
      p.id,
      p.externalId || '',
      p.source,
      `"${p.title.replace(/"/g, '""')}"`,
      p.slug,
      p.sku || '',
      `"${p.brand}"`,
      `"${p.category}"`,
      p.price,
      p.regularPrice || '',
      p.stockStatus,
      p.stockCount,
      p.status,
      p.localHidden ? 'Yes' : 'No',
      p.lastSyncedAt || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `irepair_products_catalog_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Bulk Actions
  const handleBulkAction = async (action: 'hide' | 'unhide' | 'resync') => {
    if (selectedIds.size === 0) return;
    try {
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch('/api/admin/products/bulk-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        fetchProducts();
        await refreshProducts();
      }
    } catch (e) {
      alert('Bulk action failed');
    }
  };

  // Save Local Product
  const handleSaveLocalProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('admin_token') || '';
      const method = isEditingLocal ? 'PUT' : 'POST';
      const endpoint = isEditingLocal ? `/api/admin/products/${localFormData.id}` : '/api/admin/products';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(localFormData),
      });

      if (res.ok) {
        setLocalEditModalOpen(false);
        fetchProducts();
        await refreshProducts();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to save product');
      }
    } catch (e) {
      alert('Error saving product');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-pink-50 text-[#DF0C88] border border-pink-100">
              <ShoppingBag className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Products & Inventory Module</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Local SQLite database mirror with one-way WooCommerce sync, variation management, and instant read-only mirroring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setLocalFormData({
                title: '',
                price: 0,
                regularPrice: '',
                categorySlug: 'accessories',
                brandName: 'iRepair',
                condition: 'Brand New',
                stockStatus: 'instock',
                stockQuantity: 10,
                sku: '',
                image: '',
                shortDescription: '',
                description: '',
              });
              setIsEditingLocal(false);
              setLocalEditModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Local Product
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'products'
              ? 'border-[#DF0C88] text-[#DF0C88]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Products Catalog ({totalProducts})
        </button>
        <button
          onClick={() => setActiveTab('brands')}
          className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'brands'
              ? 'border-[#DF0C88] text-[#DF0C88]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tag className="w-4 h-4" />
          Brands Directory
        </button>
        <button
          onClick={() => setActiveTab('sync')}
          className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'sync'
              ? 'border-[#DF0C88] text-[#DF0C88]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${syncProgress?.isRunning ? 'animate-spin text-[#DF0C88]' : ''}`} />
          Sync Engine & Dashboard
        </button>
      </div>

      {/* TAB 1: PRODUCTS LIST */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products by title, SKU, or brand..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#DF0C88]"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={filterCondition}
                  onChange={(e) => {
                    setFilterCondition(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">All Conditions</option>
                  <option value="new">Brand New</option>
                  <option value="refurbished">Refurbished</option>
                </select>

                <select
                  value={filterSource}
                  onChange={(e: any) => {
                    setFilterSource(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">All Sources</option>
                  <option value="woocommerce">WooCommerce (Synced)</option>
                  <option value="local">Local Only</option>
                </select>

                <select
                  value={filterType}
                  onChange={(e: any) => {
                    setFilterType(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="simple">Simple Products</option>
                  <option value="variable">Variable Products</option>
                </select>

                <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterHidden}
                    onChange={(e) => {
                      setFilterHidden(e.target.checked);
                      setPage(1);
                    }}
                    className="accent-[#DF0C88] rounded"
                  />
                  Hidden Only
                </label>
              </div>
            </div>

            {/* Bulk Actions Bar if items selected */}
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between bg-pink-50 p-3 rounded-xl border border-pink-200">
                <span className="text-xs font-bold text-pink-900">
                  {selectedIds.size} products selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBulkAction('hide')}
                    className="px-2.5 py-1 bg-white border border-pink-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-pink-100 cursor-pointer"
                  >
                    Hide Selected
                  </button>
                  <button
                    onClick={() => handleBulkAction('unhide')}
                    className="px-2.5 py-1 bg-white border border-pink-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-pink-100 cursor-pointer"
                  >
                    Unhide Selected
                  </button>
                  <button
                    onClick={() => handleBulkAction('resync')}
                    className="px-2.5 py-1 bg-[#DF0C88] text-white rounded-lg text-xs font-bold hover:bg-[#C50875] cursor-pointer"
                  >
                    Re-Sync Selected
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <th className="p-3 w-8">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === products.length && products.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(new Set(products.map((p) => p.id)));
                          else setSelectedIds(new Set());
                        }}
                        className="accent-[#DF0C88] rounded"
                      />
                    </th>
                    <th className="p-3 w-16">Image</th>
                    <th className="p-3">Product Name & SKU</th>
                    <th className="p-3">Brand</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Stock</th>
                    <th className="p-3">Source</th>
                    <th className="p-3">Last Synced</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#DF0C88]" />
                        Loading products from local database...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        No products found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => {
                      const isSelected = selectedIds.has(product.id);
                      return (
                        <tr
                          key={product.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            product.localHidden ? 'opacity-60 bg-slate-50/40' : ''
                          }`}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const next = new Set(selectedIds);
                                if (e.target.checked) next.add(product.id);
                                else next.delete(product.id);
                                setSelectedIds(next);
                              }}
                              className="accent-[#DF0C88] rounded"
                            />
                          </td>
                          <td className="p-3">
                            <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center">
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={product.title}
                                  className="w-full h-full object-contain p-0.5"
                                />
                              ) : (
                                <ShoppingBag className="w-5 h-5 text-slate-300" />
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900 line-clamp-1">{product.title}</div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5 flex-wrap">
                              <span>SKU: {product.sku || 'N/A'}</span>
                              <span>•</span>
                              <span className="capitalize">{product.type}</span>
                              {product.type === 'variable' && (!product.variations || product.variations.length === 0) && (
                                <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-sans font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> 0 variations
                                </span>
                              )}
                              {product.type === 'variable' && product.variations && product.variations.length > 0 && (
                                <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-sans font-semibold">
                                  {product.variations.length} variations
                                </span>
                              )}
                              {product.type === 'variable' && (!product.price || product.price === 0) && (
                                <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-sans font-bold flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> Missing price
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 font-semibold text-slate-700">{product.brand}</td>
                          <td className="p-3 text-slate-600 font-medium">
                            <span className="bg-slate-100 px-2 py-1 rounded text-[11px]">
                              {product.category}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-extrabold text-slate-900">
                              {product.type === 'variable' ? `From £${product.price.toFixed(2)}` : `£${product.price.toFixed(2)}`}
                            </div>
                            {product.regularPrice && product.regularPrice > product.price && (
                              <div className="text-[10px] text-slate-400 line-through">
                                £{product.regularPrice.toFixed(2)}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                product.inStock
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {product.inStock ? `${product.stockCount} in stock` : 'Out of stock'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                product.source === 'woocommerce'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {product.source}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400 text-[11px]">
                            {product.lastSyncedAt
                              ? new Date(product.lastSyncedAt).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'N/A'}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Variations Modal Drawer */}
                              {product.type === 'variable' && (
                                <button
                                  onClick={() => setVariationsModalProduct(product)}
                                  title="View & manage variations table"
                                  className="p-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-[#DF0C88] cursor-pointer"
                                >
                                  <Layers className="w-4 h-4" />
                                </button>
                              )}

                              {/* Single Product Variations Re-sync */}
                              {product.type === 'variable' && product.source === 'woocommerce' && (
                                <button
                                  onClick={() => handleResyncSingleProductVariations(product.id)}
                                  disabled={resyncingVarProductId === product.id}
                                  title="Re-sync variations from WooCommerce"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer disabled:opacity-50"
                                >
                                  <RefreshCw className={`w-4 h-4 ${resyncingVarProductId === product.id ? 'animate-spin text-[#DF0C88]' : ''}`} />
                                </button>
                              )}

                              {/* View Details / Drawer */}
                              <button
                                onClick={() => setInspectProduct(product)}
                                title="Inspect product"
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Hide / Unhide Toggle */}
                              <button
                                onClick={() => handleToggleHide(product)}
                                title={product.localHidden ? 'Show on React site' : 'Hide from React site'}
                                className={`p-1.5 rounded-lg cursor-pointer ${
                                  product.localHidden
                                    ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {product.localHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>

                              {/* Synced: Edit in WordPress */}
                              {product.source === 'woocommerce' && product.externalId && (
                                <a
                                  href={`https://irepair-mobiles.co.uk/wp-admin/post.php?post=${product.externalId}&action=edit`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Edit in WordPress wp-admin"
                                  className="p-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 flex items-center gap-1 text-[11px] font-bold"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}

                              {/* Local: Edit Form */}
                              {product.source === 'local' && (
                                <button
                                  onClick={() => {
                                    setLocalFormData({
                                      id: product.id,
                                      title: product.title,
                                      price: product.price,
                                      regularPrice: product.regularPrice || '',
                                      categorySlug: product.category,
                                      brandName: product.brand,
                                      condition: product.condition,
                                      stockStatus: product.stockStatus,
                                      stockQuantity: product.stockCount,
                                      sku: product.sku,
                                      image: product.image,
                                      shortDescription: product.shortDescription || '',
                                      description: product.description || '',
                                    });
                                    setIsEditingLocal(true);
                                    setLocalEditModalOpen(true);
                                  }}
                                  title="Edit Local Product"
                                  className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalProducts)} of {totalProducts} items
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <span className="px-3 py-1 font-bold text-slate-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BRANDS DIRECTORY */}
      {activeTab === 'brands' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">Configured Brands</h2>
              <p className="text-xs text-slate-500">
                Brands synchronized from WooCommerce attributes / taxonomies and local product brands.
              </p>
            </div>
            <button
              onClick={fetchBrands}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loadingBrands ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {brands.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-slate-900">{b.name}</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        b.source === 'woocommerce' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {b.source}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1">slug: {b.slug}</div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">
                    {b.product_count} published products
                  </span>
                  {b.source === 'woocommerce' && (
                    <a
                      href="https://irepair-mobiles.co.uk/wp-admin/edit.php?post_type=product&page=product_attributes"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-[#DF0C88] hover:underline flex items-center gap-1"
                    >
                      Edit in WP <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SYNC ENGINE & DASHBOARD */}
      {activeTab === 'sync' && (
        <div className="space-y-6">
          {/* Live Progress Bar */}
          {syncProgress?.isRunning && (
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-5 rounded-2xl shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sync in Progress: {syncProgress.phase.toUpperCase()}
                </div>
                <span className="text-xs font-mono">{syncProgress.currentStep}%</span>
              </div>
              <p className="text-xs text-pink-100 mb-3">{syncProgress.message}</p>
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-white h-full transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(5, syncProgress.currentStep)}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Trigger Buttons */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-black text-slate-900">Run Synchronization</h2>
            <p className="text-xs text-slate-500">
              Execute strict phased synchronization from WooCommerce into the local SQLite database.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <button
                disabled={syncProgress?.isRunning || syncingNow}
                onClick={() => handleStartSync('incremental')}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex flex-col text-left disabled:opacity-50 cursor-pointer"
              >
                <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[#DF0C88]" />
                  Incremental Sync
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Updates categories and changed products since last sync. Recommended.
                </span>
              </button>

              <button
                disabled={syncProgress?.isRunning || syncingNow}
                onClick={() => handleStartSync('full')}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex flex-col text-left disabled:opacity-50 cursor-pointer"
              >
                <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  Full Import
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Re-fetches all categories, brands, variations and product records.
                </span>
              </button>

              <button
                disabled={syncProgress?.isRunning || syncingNow}
                onClick={() => handleStartSync('reconcile')}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex flex-col text-left disabled:opacity-50 cursor-pointer"
              >
                <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Full Reconcile
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Re-scans store and archives or deletes items removed in WordPress.
                </span>
              </button>

              <button
                disabled={syncProgress?.isRunning || syncingNow}
                onClick={() => handleStartSync('dry_run')}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex flex-col text-left disabled:opacity-50 cursor-pointer"
              >
                <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Dry Run Preview
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Simulates full sync without writing changes to the database.
                </span>
              </button>

              <button
                disabled={syncProgress?.isRunning || syncingNow || resyncingShortDesc}
                onClick={handleResyncShortDescriptionsAll}
                className="p-4 rounded-xl border border-pink-200 bg-pink-50/70 hover:bg-pink-100 flex flex-col text-left disabled:opacity-50 cursor-pointer transition-colors"
                title="Re-sync raw HTML short descriptions for all products directly from WordPress"
              >
                <span className="font-extrabold text-sm text-[#DF0C88] flex items-center gap-2">
                  <RefreshCw className={`w-4 h-4 text-[#DF0C88] ${resyncingShortDesc ? 'animate-spin' : ''}`} />
                  {resyncingShortDesc ? 'Re-syncing...' : 'Re-sync Short Desc'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Updates all products with raw WordPress HTML short descriptions.
                </span>
              </button>

              <button
                disabled={syncProgress?.isRunning || syncingNow || resyncingAllVars}
                onClick={handleResyncAllVariations}
                className="p-4 rounded-xl border border-purple-200 bg-purple-50/80 hover:bg-purple-100 flex flex-col text-left disabled:opacity-50 cursor-pointer transition-colors"
                title="Paginated fetch of all variations across all variable products from WooCommerce"
              >
                <span className="font-extrabold text-sm text-purple-800 flex items-center gap-2">
                  <Layers className={`w-4 h-4 text-purple-700 ${resyncingAllVars ? 'animate-spin' : ''}`} />
                  {resyncingAllVars ? 'Syncing Vars...' : 'Re-sync Variations'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Fetches all paginated variations and recalculates price ranges.
                </span>
              </button>
            </div>

            {/* Variations re-sync notice */}
            {resyncVarsSuccessMsg && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs font-semibold text-purple-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-700 shrink-0" />
                  <span>{resyncVarsSuccessMsg}</span>
                </div>
                <button onClick={() => setResyncVarsSuccessMsg(null)} className="text-purple-700 hover:text-purple-900">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Short descriptions re-sync notice */}
            {resyncShortDescSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{resyncShortDescSuccessMsg}</span>
                </div>
                <button onClick={() => setResyncShortDescSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Detailed Connection Test Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900">WooCommerce Health & Permissions Check</h2>
                <p className="text-xs text-slate-500">
                  Tests product endpoints, variation loading, brand taxonomy detection, and currency settings.
                </p>
              </div>
              <button
                disabled={testingConnection}
                onClick={handleTestConnection}
                className="px-4 py-2 bg-[#DF0C88] text-white rounded-xl text-xs font-bold hover:bg-[#C50875] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                Test Connection
              </button>
            </div>

            {testResult && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                  {testResult.success ? 'WooCommerce REST API is Connected & Verified' : 'Connection Check Failed'}
                </div>
                {testResult.error && <p className="text-rose-700 font-semibold">{testResult.error}</p>}
                {testResult.success && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-slate-700 font-medium">
                    <div>Remote Products: <strong className="text-slate-900">{testResult.productCount}</strong></div>
                    <div>Variations Support: <strong className="text-slate-900">{testResult.variationsSupported ? 'Verified' : 'No'}</strong></div>
                    <div>Brand Source: <strong className="text-slate-900">{testResult.brandTaxonomyType}</strong></div>
                    <div>Store Currency: <strong className="text-slate-900">{testResult.currency}</strong></div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sync Settings Form */}
          <form onSubmit={handleSaveSettings} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-black text-slate-900">Sync Engine Configuration</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Brand Source</label>
                <select
                  value={syncSettings.brandSource}
                  onChange={(e) => setSyncSettings({ ...syncSettings, brandSource: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="attribute">WooCommerce Attribute (pa_brand / Brand)</option>
                  <option value="taxonomy">WordPress Taxonomy (product_brand)</option>
                  <option value="plugin">Plugin / Title Detection</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Condition Source</label>
                <select
                  value={syncSettings.conditionSource}
                  onChange={(e) => setSyncSettings({ ...syncSettings, conditionSource: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="attribute">Attribute (pa_condition / Condition)</option>
                  <option value="tag">Product Tag (Grade A / Grade B)</option>
                  <option value="title">Product Title Parsing</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Deleted Products Policy</label>
                <select
                  value={syncSettings.deletedPolicy}
                  onChange={(e) => setSyncSettings({ ...syncSettings, deletedPolicy: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="archive">Archive / Trash (Mark remote deleted)</option>
                  <option value="delete">Hard Delete from Local Database</option>
                  <option value="keep">Keep Active Locally</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Auto-Sync Interval</label>
                <select
                  value={syncSettings.syncIntervalMinutes}
                  onChange={(e) => setSyncSettings({ ...syncSettings, syncIntervalMinutes: parseInt(e.target.value, 10) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value={5}>Every 5 minutes</option>
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes (Default)</option>
                  <option value={60}>Every 1 hour</option>
                  <option value={360}>Every 6 hours</option>
                  <option value={1440}>Daily</option>
                  <option value={0}>Disabled (Manual only)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Image Storage Mode</label>
                <select
                  value={syncSettings.imageMode}
                  onChange={(e) => setSyncSettings({ ...syncSettings, imageMode: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="hotlink">Hotlink from WordPress (Instant)</option>
                  <option value="download">Download and Store Locally</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Technical Details Meta Key (ACF / Custom Field)</label>
                <input
                  type="text"
                  value={syncSettings.technicalDetailsMetaKey || ''}
                  onChange={(e) => setSyncSettings({ ...syncSettings, technicalDetailsMetaKey: e.target.value })}
                  placeholder="e.g. _technical_details or acf_specs"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {savingSettings ? 'Saving...' : 'Save Sync Settings'}
              </button>
            </div>
          </form>

          {/* Webhook Setup Guide */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#DF0C88]" />
              Real-Time WooCommerce Webhooks Setup
            </h2>
            <p className="text-xs text-slate-500">
              Configure real-time webhooks in WooCommerce to instantly trigger targeted product updates whenever an item is edited or sold out in wp-admin.
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between font-mono bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-600 truncate">{syncSettings.webhookUrl}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(syncSettings.webhookUrl);
                    setCopiedWebhook(true);
                    setTimeout(() => setCopiedWebhook(false), 2000);
                  }}
                  className="ml-2 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedWebhook ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copiedWebhook ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="text-[11px] text-slate-500">
                In WordPress, go to <strong>WooCommerce → Settings → Advanced → Webhooks</strong>. Create a new webhook with Topic <em>Product updated</em>, paste Delivery URL above, and secret: <code className="font-bold text-slate-800">{syncSettings.webhookSecret}</code>.
              </div>
            </div>
          </div>

          {/* WordPress ACF Custom Fields Mapping Section */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#DF0C88]" />
                  WordPress ACF Custom Fields Mapping
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure the 4 product-level ACF fields synced from WordPress WooCommerce. Values are read-only and edited only in WordPress. Variable products inherit these fields from their parent product.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleTestAcf}
                  disabled={testingAcf}
                  className="px-3 py-1.5 bg-pink-50 text-[#DF0C88] border border-pink-200 hover:bg-pink-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Test if ACF fields are accessible on a sample product"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingAcf ? 'animate-spin' : ''}`} />
                  {testingAcf ? 'Testing...' : 'Test Connection'}
                </button>

                <button
                  type="button"
                  onClick={handleResyncCustomFieldsAll}
                  disabled={resyncingCustomFields}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Re-sync custom fields for all existing products without waiting for modified dates"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resyncingCustomFields ? 'animate-spin' : ''}`} />
                  {resyncingCustomFields ? 'Re-syncing...' : 'Re-sync All Custom Fields'}
                </button>

                <button
                  type="button"
                  onClick={handleSaveCustomFields}
                  disabled={savingCustomFields}
                  className="px-4 py-1.5 bg-[#DF0C88] hover:bg-[#C50875] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingCustomFields ? 'Saving...' : 'Save Mappings'}
                </button>
              </div>
            </div>

            {/* Test Connection Report Banner */}
            {acfTestReport && (
              <div className={`p-4 rounded-xl border text-xs space-y-2 ${acfTestReport.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-2">
                    {acfTestReport.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
                    <span>{acfTestReport.message}</span>
                  </div>
                  <button onClick={() => setAcfTestReport(null)} className="text-slate-400 hover:text-slate-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {acfTestReport.warning && (
                  <div className="text-xs bg-white/80 p-2.5 rounded-lg border border-amber-200 text-amber-800 font-medium">
                    ⚠️ {acfTestReport.warning}
                  </div>
                )}

                {acfTestReport.fieldResults && acfTestReport.fieldResults.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                    {acfTestReport.fieldResults.map((fr: any) => (
                      <div key={fr.role} className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between font-bold font-sans">
                          <span className="text-slate-900 text-xs">{fr.label}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${fr.found ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {fr.found ? 'FOUND' : 'MISSING'}
                          </span>
                        </div>
                        <div className="text-slate-500 text-[10px]">Key: <code className="font-bold text-slate-800">{fr.metaKey}</code></div>
                        <div className="text-slate-500 text-[10px]">API: <span className="text-slate-700">{fr.sourceApi || 'None'}</span></div>
                        {fr.preview && (
                          <div className="text-[10px] text-slate-600 truncate bg-slate-50 p-1 rounded border border-slate-100">
                            {fr.preview}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Re-sync success message */}
            {resyncSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between font-bold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{resyncSuccessMsg}</span>
                </div>
                <button onClick={() => setResyncSuccessMsg(null)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Field Mappings List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {customFieldMappings.map((mapping, idx) => (
                <div key={mapping.role} className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{mapping.label}</div>
                      <div className="text-[11px] text-slate-500">Role: <code className="text-pink-600 font-semibold">{mapping.role}</code></div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[11px] font-bold text-slate-600">{mapping.enabled ? 'Active' : 'Disabled'}</span>
                      <input
                        type="checkbox"
                        checked={mapping.enabled}
                        onChange={(e) => {
                          const updated = [...customFieldMappings];
                          updated[idx] = { ...updated[idx], enabled: e.target.checked };
                          setCustomFieldMappings(updated);
                        }}
                        className="rounded text-[#DF0C88] focus:ring-[#DF0C88] w-4 h-4"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 text-[11px] mb-1">WordPress Meta Key</label>
                      <input
                        type="text"
                        value={mapping.metaKey}
                        onChange={(e) => {
                          const updated = [...customFieldMappings];
                          updated[idx] = { ...updated[idx], metaKey: e.target.value };
                          setCustomFieldMappings(updated);
                        }}
                        placeholder="meta key name"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 text-[11px] mb-1">Field Type</label>
                      <select
                        value={mapping.type}
                        onChange={(e) => {
                          const updated = [...customFieldMappings];
                          updated[idx] = { ...updated[idx], type: e.target.value as 'text' | 'html' };
                          setCustomFieldMappings(updated);
                        }}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="text">Plain Text (Text)</option>
                        <option value="html">WYSIWYG Editor (HTML)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Product Page Trust Badges Configuration Section */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#DF0C88]" />
                  Product Page Trust Badges Configuration
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure the 3 trust badges displayed directly below the Add to Basket button row. Values dynamically pull from the product's ACF fields with configurable fallbacks.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Master Enable</span>
                  <input
                    type="checkbox"
                    checked={trustBadgesSettings.enabled !== false}
                    onChange={(e) => setTrustBadgesSettings({ ...trustBadgesSettings, enabled: e.target.checked })}
                    className="rounded text-[#DF0C88] focus:ring-[#DF0C88] w-4 h-4"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleSaveTrustBadges}
                  disabled={savingTrustBadges}
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingTrustBadges ? 'Saving...' : 'Save Trust Badges'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {['delivery', 'warranty', 'returns'].map((badgeKey) => {
                const item = trustBadgesSettings.items?.[badgeKey] || {
                  id: badgeKey,
                  label: badgeKey.charAt(0).toUpperCase() + badgeKey.slice(1),
                  icon: badgeKey === 'delivery' ? 'truck' : badgeKey === 'warranty' ? 'shield' : 'rotate-ccw',
                  fallbackText: '',
                  enabled: true,
                };

                const updateItem = (partial: any) => {
                  setTrustBadgesSettings({
                    ...trustBadgesSettings,
                    items: {
                      ...trustBadgesSettings.items,
                      [badgeKey]: { ...item, ...partial },
                    },
                  });
                };

                return (
                  <div key={badgeKey} className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#DF0C88]"></span>
                        {item.label || badgeKey}
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <span className="text-[11px] font-bold text-slate-600">{item.enabled ? 'On' : 'Off'}</span>
                        <input
                          type="checkbox"
                          checked={item.enabled !== false}
                          onChange={(e) => updateItem({ enabled: e.target.checked })}
                          className="rounded text-[#DF0C88] focus:ring-[#DF0C88] w-4 h-4"
                        />
                      </label>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="block font-bold text-slate-700 text-[11px] mb-1">Badge Label</label>
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => updateItem({ label: e.target.value })}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 text-[11px] mb-1">Icon Style</label>
                        <select
                          value={item.icon}
                          onChange={(e) => updateItem({ icon: e.target.value })}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                        >
                          <option value="truck">Delivery Truck (truck)</option>
                          <option value="shield">Shield Guarantee (shield)</option>
                          <option value="rotate-ccw">Circular Return Arrow (rotate-ccw)</option>
                          <option value="package">Package / Box (package)</option>
                          <option value="check">Checkmark Badge (check)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 text-[11px] mb-1">Fallback Text (If ACF field empty)</label>
                        <input
                          type="text"
                          value={item.fallbackText || ''}
                          onChange={(e) => updateItem({ fallbackText: e.target.value })}
                          placeholder="e.g. Standard free delivery"
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* INSPECT PRODUCT DRAWER (Read-Only Mirror for Synced, Details for Local) */}
      {inspectProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end animate-fadeIn">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                    inspectProduct.source === 'woocommerce' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {inspectProduct.source} PRODUCT
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-1">{inspectProduct.title}</h2>
              </div>
              <button
                onClick={() => setInspectProduct(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {inspectProduct.source === 'woocommerce' && inspectProduct.externalId && (
                <a
                  href={`https://irepair-mobiles.co.uk/wp-admin/post.php?post=${inspectProduct.externalId}&action=edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 flex items-center gap-1.5 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Edit in WordPress
                </a>
              )}
              <button
                onClick={() => handleResyncProduct(inspectProduct)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Re-Sync This Product
              </button>
              <a
                href={inspectProduct.canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                View on Site
              </a>
              <button
                onClick={() => handleToggleHide(inspectProduct)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  inspectProduct.localHidden ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {inspectProduct.localHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {inspectProduct.localHidden ? 'Hidden (Click to Show)' : 'Visible (Click to Hide)'}
              </button>
            </div>

            {/* Product Gallery & Details */}
            <div className="space-y-4 text-xs">
              <div className="flex gap-4">
                <div className="w-28 h-28 rounded-xl bg-white border border-slate-200 p-2 flex items-center justify-center shrink-0">
                  <img src={inspectProduct.image} alt="" className="w-full h-full object-contain" />
                </div>
                <div className="space-y-1">
                  <div>Price: <strong className="text-slate-900 text-sm">£{inspectProduct.price.toFixed(2)}</strong></div>
                  <div>SKU: <strong className="text-slate-900">{inspectProduct.sku || 'N/A'}</strong></div>
                  <div>Brand: <strong className="text-slate-900">{inspectProduct.brand}</strong></div>
                  <div>Condition: <strong className="text-slate-900">{inspectProduct.condition}</strong></div>
                  <div>Stock: <strong className="text-slate-900">{inspectProduct.inStock ? `${inspectProduct.stockCount} in stock` : 'Out of stock'}</strong></div>
                </div>
              </div>

              {/* Variations Table */}
              {inspectProduct.variations && inspectProduct.variations.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/50">
                  <div className="font-bold text-slate-900">Variations ({inspectProduct.variations.length})</div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {inspectProduct.variations.map((v: any, idx: number) => (
                      <div key={v.id || idx} className="bg-white p-2 rounded border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="font-semibold">{v.sku || `V-${idx + 1}`}</span>
                          <span className="text-slate-400 text-[10px] ml-2">
                            {Object.entries(v.attributes || {}).map(([k, val]) => `${k}: ${val}`).join(' | ')}
                          </span>
                        </div>
                        <span className="font-extrabold text-slate-900">£{Number(v.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom fields (ACF) Panel (Read-Only) */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-[#DF0C88]" />
                      Custom Fields (ACF)
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Read-only · Managed & edited directly in WordPress wp-admin
                    </div>
                  </div>

                  {inspectProduct.source === 'woocommerce' && (inspectProduct.externalId || inspectProduct.wpId) && (
                    <a
                      href={`https://irepair-mobiles.co.uk/wp-admin/post.php?post=${inspectProduct.externalId || inspectProduct.wpId}&action=edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                      title="Open and edit ACF fields for this product in WordPress admin"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Edit in WordPress
                    </a>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  {/* Delivery text */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                      Delivery Text (delivery_text)
                    </div>
                    <div className="font-semibold text-slate-800">
                      {inspectProduct.customFields?.delivery_text || (inspectProduct as any).delivery_text || (
                        <span className="text-slate-400 italic">Not set (using default fallback)</span>
                      )}
                    </div>
                  </div>

                  {/* Warranty text */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                      Warranty Text (warranty_text)
                    </div>
                    <div className="font-semibold text-slate-800">
                      {inspectProduct.customFields?.warranty_text || (inspectProduct as any).warranty_text || (
                        <span className="text-slate-400 italic">Not set (using default fallback)</span>
                      )}
                    </div>
                  </div>

                  {/* Returns */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                      Returns (returns_)
                    </div>
                    <div className="font-semibold text-slate-800">
                      {inspectProduct.customFields?.returns_ || inspectProduct.customFields?.returns || (inspectProduct as any).returns_ || (
                        <span className="text-slate-400 italic">Not set (using default fallback)</span>
                      )}
                    </div>
                  </div>

                  {/* Technical Details */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Technical Details (technical_details - WYSIWYG HTML)
                    </div>
                    {inspectProduct.customFields?.technical_details || inspectProduct.technicalDetailsHtml ? (
                      <div className="mt-1 bg-white p-2.5 rounded border border-slate-200 max-h-36 overflow-y-auto text-[11px] prose prose-xs max-w-none text-slate-700">
                        <div dangerouslySetInnerHTML={{ __html: inspectProduct.customFields?.technical_details || inspectProduct.technicalDetailsHtml || '' }} />
                      </div>
                    ) : (
                      <div className="text-slate-400 italic">
                        Not set (falls back to WooCommerce attribute table)
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Rank Math SEO & Product Schema (Read-Only & Synced) */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#DF0C88]" />
                      Rank Math SEO &amp; Product Schema
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Single source of truth in WordPress · Overlays live price (£{inspectProduct.price.toFixed(2)}) &amp; stock into JSON-LD
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {inspectProduct.source === 'woocommerce' && (inspectProduct.externalId || inspectProduct.wpId) && (
                      <a
                        href={`https://irepair-mobiles.co.uk/wp-admin/post.php?post=${inspectProduct.externalId || inspectProduct.wpId}&action=edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                        title="Edit SEO in WordPress Rank Math metabox"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Edit in WP
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={resyncingSeoId === inspectProduct.id}
                      onClick={() => handleResyncProductSeo(inspectProduct)}
                      className="px-2.5 py-1 bg-pink-50 hover:bg-pink-100 text-[#DF0C88] border border-pink-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      title="Fetch live Rank Math SEO for this product from WordPress"
                    >
                      <RefreshCw className={`w-3 h-3 ${resyncingSeoId === inspectProduct.id ? 'animate-spin' : ''}`} />
                      Re-sync SEO
                    </button>
                  </div>
                </div>

                {resyncSeoMsg && (
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{resyncSeoMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Status</div>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-[11px]">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> Rank Math Synced
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Indexability</div>
                    <span className="font-bold text-slate-800 text-[11px]">
                      {inspectProduct.inStock ? 'Indexable (InStock)' : 'Indexable (OutOfStock)'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 col-span-2 sm:col-span-1">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Schema Type</div>
                    <span className="font-mono text-[11px] text-indigo-700 font-bold">Product + Offer</span>
                  </div>
                </div>
              </div>

              {/* Sync Tracking Panel */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-slate-600 font-mono text-[11px]">
                <div className="font-sans font-bold text-slate-900 text-xs mb-1">Sync Metadata</div>
                <div>Source: {inspectProduct.source}</div>
                <div>External ID: {inspectProduct.externalId || inspectProduct.wpId || 'None'}</div>
                <div>Last Synced: {inspectProduct.lastSyncedAt || 'N/A'}</div>
                <div>Canonical URL: {inspectProduct.canonicalUrl}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT LOCAL PRODUCT MODAL */}
      {localEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveLocalProduct}
            className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="font-black text-slate-900 text-base">
                {isEditingLocal ? 'Edit Local Product' : 'Create New Local Product'}
              </h2>
              <button
                type="button"
                onClick={() => setLocalEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  value={localFormData.title}
                  onChange={(e) => setLocalFormData({ ...localFormData, title: e.target.value })}
                  placeholder="e.g. Premium Magnetic Car Mount"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Selling Price (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={localFormData.price}
                    onChange={(e) => setLocalFormData({ ...localFormData, price: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Regular / Original Price (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={localFormData.regularPrice}
                    onChange={(e) => setLocalFormData({ ...localFormData, regularPrice: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={localFormData.brandName}
                    onChange={(e) => setLocalFormData({ ...localFormData, brandName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    value={localFormData.stockQuantity}
                    onChange={(e) => setLocalFormData({ ...localFormData, stockQuantity: parseInt(e.target.value, 10) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Image URL</label>
                <input
                  type="text"
                  value={localFormData.image}
                  onChange={(e) => setLocalFormData({ ...localFormData, image: e.target.value })}
                  placeholder="https://... or /uploads/..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Short Description <span className="font-normal text-xs text-slate-400">(Supports rich HTML, lists, bold, links, or line breaks)</span>
                </label>
                <textarea
                  rows={4}
                  value={localFormData.shortDescription}
                  onChange={(e) => setLocalFormData({ ...localFormData, shortDescription: e.target.value })}
                  placeholder="e.g. <ul><li>Display: 6.1 OLED</li><li>A15 Bionic</li></ul> or line breaks"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLocalEditModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#DF0C88] text-white rounded-xl text-xs font-bold hover:bg-[#C50875] cursor-pointer"
              >
                Save Local Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Variable Product Variations Modal */}
      {variationsModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50/70">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-pink-100 text-[#DF0C88]">
                    <Layers className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-pink-700">
                    Variable Product Variations
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 leading-snug">
                  {variationsModalProduct.title}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                  <span>Parent SKU: {variationsModalProduct.sku || 'N/A'}</span>
                  <span>•</span>
                  <span>WooCommerce ID: #{variationsModalProduct.externalId || variationsModalProduct.id}</span>
                  <span>•</span>
                  <span>{variationsModalProduct.variations?.length || 0} variations stored</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {variationsModalProduct.source === 'woocommerce' && (
                  <button
                    type="button"
                    onClick={() => handleResyncSingleProductVariations(variationsModalProduct.id)}
                    disabled={resyncingVarProductId === variationsModalProduct.id}
                    className="px-3 py-1.5 bg-[#DF0C88] text-white rounded-xl text-xs font-bold hover:bg-[#C50875] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resyncingVarProductId === variationsModalProduct.id ? 'animate-spin' : ''}`} />
                    {resyncingVarProductId === variationsModalProduct.id ? 'Syncing...' : 'Re-sync Variations'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setVariationsModalProduct(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {!variationsModalProduct.variations || variationsModalProduct.variations.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-pink-50 text-[#DF0C88] flex items-center justify-center mx-auto">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">No variations synced yet</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    This variable product has no variations stored in the local SQLite mirror yet. Click below to fetch all combinations directly from WooCommerce.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleResyncSingleProductVariations(variationsModalProduct.id)}
                    disabled={resyncingVarProductId === variationsModalProduct.id}
                    className="px-4 py-2 bg-[#DF0C88] text-white rounded-xl text-xs font-bold hover:bg-[#C50875] inline-flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resyncingVarProductId === variationsModalProduct.id ? 'animate-spin' : ''}`} />
                    Fetch Variations from WooCommerce
                  </button>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="p-3 w-14">Image</th>
                        <th className="p-3">Variation SKU & ID</th>
                        <th className="p-3">Attribute Combination</th>
                        <th className="p-3">Price</th>
                        <th className="p-3">Stock Status</th>
                        <th className="p-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {variationsModalProduct.variations.map((v: any, idx: number) => {
                        const attrEntries = Object.entries(v.attributes || {});
                        return (
                          <tr key={v.id || idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3">
                              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-0.5">
                                <img
                                  src={v.image || variationsModalProduct.image}
                                  alt={v.sku || 'Variation'}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            </td>
                            <td className="p-3 font-mono">
                              <div className="font-bold text-slate-900">{v.sku || `ID: ${v.id}`}</div>
                              {v.externalId && (
                                <div className="text-[10px] text-slate-400">WC #{v.externalId}</div>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1.5">
                                {attrEntries.length > 0 ? (
                                  attrEntries.map(([k, val]: any) => {
                                    const isAny = String(val).toLowerCase() === 'any' || val === '' || val === null;
                                    return (
                                      <span
                                        key={k}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                          isAny
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                                            : 'bg-slate-100 border-slate-200 text-slate-700'
                                        }`}
                                      >
                                        <span className="capitalize text-slate-500 font-normal">{k.replace('pa_', '')}:</span>
                                        <span>{isAny ? 'Any' : String(val)}</span>
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">All options (Any)</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="font-extrabold text-slate-900">
                                £{Number(v.price || 0).toFixed(2)}
                              </div>
                              {v.regularPrice && v.regularPrice > v.price && (
                                <div className="text-[10px] text-slate-400 line-through">
                                  £{Number(v.regularPrice).toFixed(2)}
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  v.inStock || v.stockStatus === 'instock'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {v.inStock || v.stockStatus === 'instock'
                                  ? `${v.stockQuantity ?? 'In'} stock`
                                  : 'Out of stock'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                  v.status === 'publish'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {v.status || 'publish'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Tip: Empty attributes represent wildcard variations that match any selected customer option.
              </span>
              <button
                type="button"
                onClick={() => setVariationsModalProduct(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
