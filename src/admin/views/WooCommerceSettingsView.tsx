import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  ShieldCheck, 
  Key, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Save,
  Server
} from 'lucide-react';

export const WooCommerceSettingsView: React.FC = () => {
  const [storeUrl, setStoreUrl] = useState('https://irepair-mobiles.co.uk');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [apiVersion, setApiVersion] = useState('wc/v3');
  const [cacheDurationSeconds, setCacheDurationSeconds] = useState(300);
  const [brandTaxonomy, setBrandTaxonomy] = useState('pa_brand');
  const [conditionTaxonomy, setConditionTaxonomy] = useState('pa_condition');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Connection Test
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  // Clearing cache
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  // Re-sync short descriptions
  const [resyncingShortDesc, setResyncingShortDesc] = useState(false);
  const [resyncShortDescSuccess, setResyncShortDescSuccess] = useState<string | null>(null);

  const handleResyncShortDescriptions = async () => {
    if (!confirm('Re-sync raw HTML short descriptions for all products directly from WooCommerce?')) return;
    setResyncingShortDesc(true);
    setResyncShortDescSuccess(null);
    try {
      const res = await fetch('/api/admin/products/sync/resync-short-descriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResyncShortDescSuccess(`Re-synced ${data.updatedCount} products successfully!`);
        setTimeout(() => setResyncShortDescSuccess(null), 4000);
      } else {
        alert(data.error || 'Failed to re-sync short descriptions');
      }
    } catch (e: any) {
      alert('Error during short description re-sync: ' + e.message);
    } finally {
      setResyncingShortDesc(false);
    }
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/integrations/woocommerce', {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.configured) {
          setStoreUrl(data.storeUrl);
          setConsumerKey(data.maskedConsumerKey);
          setConsumerSecret(data.maskedConsumerSecret);
          setApiVersion(data.apiVersion || 'wc/v3');
          setCacheDurationSeconds(data.cacheDurationSeconds || 300);
          setBrandTaxonomy(data.brandTaxonomy || 'pa_brand');
          setConditionTaxonomy(data.conditionTaxonomy || 'pa_condition');
        }
      }
    } catch (e) {
      console.error('Failed to load WooCommerce config:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch('/api/admin/integrations/woocommerce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
        },
        body: JSON.stringify({
          storeUrl,
          consumerKey,
          consumerSecret,
          apiVersion,
          cacheDurationSeconds,
          brandTaxonomy,
          conditionTaxonomy,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSaveMessage('Credentials encrypted and saved successfully. Proxy cache cleared.');
        await fetchConfig();
      } else {
        setSaveMessage(data.error || 'Failed to save configuration');
      }
    } catch (err: any) {
      setSaveMessage('Network error while saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/integrations/woocommerce/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
        },
        body: JSON.stringify({
          storeUrl,
          consumerKey,
          consumerSecret,
          apiVersion,
        }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, error: 'Connection test failed: Network or server error' });
    } finally {
      setTesting(false);
    }
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const res = await fetch('/api/admin/integrations/woocommerce/clear-cache', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        setCacheCleared(true);
        setTimeout(() => setCacheCleared(false), 2000);
      }
    } catch (e) {
      console.error('Failed to clear cache:', e);
    } finally {
      setClearingCache(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">WooCommerce API & Proxy Integration</h1>
        <p className="text-xs text-slate-500 mt-1">
          Secure backend proxy configuration. Keys are encrypted at rest with AES-256-GCM and never exposed to the client browser.
        </p>
      </div>

      {/* Security Status Box */}
      <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-pink-900/60 text-[#DF0C88] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-pink-300" />
          </div>
          <div>
            <div className="font-bold text-white flex items-center gap-2">
              <span>AES-256-GCM Database Encryption Active</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">PROTECTED</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Consumer secrets are encrypted using <code className="text-pink-300 font-mono">process.env.ENCRYPTION_KEY</code> (or built-in secure seed).
            </div>
          </div>
        </div>
      </div>

      {saveMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">WooCommerce Store URL</label>
            <input
              type="url"
              required
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              placeholder="https://irepair-mobiles.co.uk"
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
            />
            <p className="text-[11px] text-slate-400 mt-1">Base domain of your WordPress / WooCommerce installation.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Consumer Key</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={consumerKey}
                  onChange={(e) => setConsumerKey(e.target.value)}
                  placeholder="ck_••••••••••••••••"
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Masked for privacy. Enter new key only to change.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Consumer Secret</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  placeholder="cs_••••••••••••••••"
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Masked for privacy. Enter new secret only to change.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">REST API Version</label>
              <select
                value={apiVersion}
                onChange={(e) => setApiVersion(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
              >
                <option value="wc/v3">wc/v3 (Recommended)</option>
                <option value="wc/v2">wc/v2</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cache Duration (Seconds)</label>
              <input
                type="number"
                min={30}
                max={3600}
                value={cacheDurationSeconds}
                onChange={(e) => setCacheDurationSeconds(parseInt(e.target.value, 10))}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Brand Taxonomy / Slug</label>
              <input
                type="text"
                value={brandTaxonomy}
                onChange={(e) => setBrandTaxonomy(e.target.value)}
                placeholder="pa_brand or tags"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
              />
            </div>
          </div>

          {/* Test Result Display */}
          {testResult && (
            <div
              className={`p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 border ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <div className="space-y-1">
                <span className="font-bold text-sm block">
                  {testResult.success ? 'Connection Successful!' : 'Connection Failed'}
                </span>
                {testResult.success ? (
                  <p>
                    HTTP {testResult.statusCode} OK • Response time: {testResult.responseTimeMs}ms • Store product sample: "
                    {testResult.sampleProductTitle}"
                  </p>
                ) : (
                  <p>{testResult.error}</p>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all"
              >
                {testing ? (
                  <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Server className="w-4 h-4 text-slate-500" />
                )}
                <span>Test Live Connection</span>
              </button>

              <button
                type="button"
                onClick={handleClearCache}
                disabled={clearingCache}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all"
              >
                <RefreshCw className={`w-4 h-4 text-slate-500 ${clearingCache ? 'animate-spin' : ''}`} />
                <span>{cacheCleared ? 'Cache Cleared!' : 'Clear Cache'}</span>
              </button>

              <button
                type="button"
                onClick={handleResyncShortDescriptions}
                disabled={resyncingShortDesc}
                className="px-4 py-2.5 rounded-xl border border-pink-200 hover:border-pink-300 bg-pink-50 text-[#DF0C88] text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all"
                title="Fetch raw HTML short descriptions for all products from WooCommerce"
              >
                <RefreshCw className={`w-4 h-4 text-[#DF0C88] ${resyncingShortDesc ? 'animate-spin' : ''}`} />
                <span>{resyncShortDescSuccess || (resyncingShortDesc ? 'Re-syncing...' : 'Re-sync Short Descriptions')}</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Encrypting & Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
