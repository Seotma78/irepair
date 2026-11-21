import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Globe, 
  ShieldCheck, 
  Link as LinkIcon, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Activity, 
  Clock, 
  Layers, 
  Lock,
  ArrowRight,
  HelpCircle,
  AlertCircle
} from 'lucide-react';

interface SeoSettings {
  wordpress_source_url: string;
  site_url: string;
  origins_to_rewrite_json: string;
  environment_mode: 'production' | 'staging';
  robots_source_mode: 'baseline_protected' | 'live_source' | 'force_noindex';
  media_url_mode: 'keep_source' | 'rewrite_site';
  auth_header?: string;
  auto_sync_frequency: 'disabled' | 'daily' | 'weekly';
  old_website_link_enabled?: number;
  old_website_link_text?: string;
  old_website_link_url?: string;
  old_website_link_new_tab?: number;
  old_website_link_desktop?: number;
  old_website_link_mobile?: number;
  product_schema_live_overlay?: number;
  allow_local_override?: number;
  last_sync_at?: string;
  last_sync_status?: string;
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

export const SeoSettingsView: React.FC = () => {
  const [settings, setSettings] = useState<SeoSettings | null>(null);
  const [redirects, setRedirects] = useState<SeoRedirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Form State
  const [sourceUrl, setSourceUrl] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [originsList, setOriginsList] = useState<string[]>([]);
  const [newOriginInput, setNewOriginInput] = useState('');
  const [envMode, setEnvMode] = useState<'production' | 'staging'>('production');
  const [robotsMode, setRobotsMode] = useState<'baseline_protected' | 'live_source' | 'force_noindex'>('baseline_protected');
  const [mediaMode, setMediaMode] = useState<'keep_source' | 'rewrite_site'>('keep_source');
  const [authHeader, setAuthHeader] = useState('');
  const [syncFreq, setSyncFreq] = useState<'disabled' | 'daily' | 'weekly'>('disabled');

  // Old Website Link & Schema Overlay Form State
  const [oldWebsiteEnabled, setOldWebsiteEnabled] = useState(true);
  const [oldWebsiteText, setOldWebsiteText] = useState('Visit old website');
  const [oldWebsiteUrl, setOldWebsiteUrl] = useState('https://old.irepair-mobiles.co.uk');
  const [oldWebsiteNewTab, setOldWebsiteNewTab] = useState(true);
  const [oldWebsiteDesktop, setOldWebsiteDesktop] = useState(true);
  const [oldWebsiteMobile, setOldWebsiteMobile] = useState(true);
  const [productSchemaLiveOverlay, setProductSchemaLiveOverlay] = useState(true);
  const [allowLocalOverride, setAllowLocalOverride] = useState(false);

  // New Redirect Form
  const [showAddRedirectModal, setShowAddRedirectModal] = useState(false);
  const [newFromPath, setNewFromPath] = useState('');
  const [newToPath, setNewToPath] = useState('');
  const [newStatusCode, setNewStatusCode] = useState<number>(301);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, redirectsRes] = await Promise.all([
        fetch('/api/seo/settings'),
        fetch('/api/seo/redirects'),
      ]);
      const settingsData = await settingsRes.json();
      const redirectsData = await redirectsRes.json();

      if (settingsData.success && settingsData.settings) {
        const s = settingsData.settings;
        setSettings(s);
        setSourceUrl(s.wordpress_source_url);
        setSiteUrl(s.site_url);
        setEnvMode(s.environment_mode);
        setRobotsMode(s.robots_source_mode);
        setMediaMode(s.media_url_mode);
        setAuthHeader(s.auth_header || '');
        setSyncFreq(s.auto_sync_frequency);

        setOldWebsiteEnabled(s.old_website_link_enabled !== 0);
        setOldWebsiteText(s.old_website_link_text || 'Visit old website');
        setOldWebsiteUrl(s.old_website_link_url || 'https://old.irepair-mobiles.co.uk');
        setOldWebsiteNewTab(s.old_website_link_new_tab !== 0);
        setOldWebsiteDesktop(s.old_website_link_desktop !== 0);
        setOldWebsiteMobile(s.old_website_link_mobile !== 0);
        setProductSchemaLiveOverlay(s.product_schema_live_overlay !== 0);
        setAllowLocalOverride(s.allow_local_override === 1);

        try {
          setOriginsList(JSON.parse(s.origins_to_rewrite_json));
        } catch (_) {
          setOriginsList([s.wordpress_source_url]);
        }
      }

      if (redirectsData.success) {
        setRedirects(redirectsData.redirects || []);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to load SEO settings: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTestSourceUrl = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/seo/test-source-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_url: sourceUrl,
          auth_header: authHeader,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(data.data);
      } else {
        setTestResult({ error: data.data?.error || 'Connection failed' });
      }
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/seo/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wordpress_source_url: sourceUrl,
          site_url: siteUrl,
          origins_to_rewrite: originsList,
          environment_mode: envMode,
          robots_source_mode: robotsMode,
          media_url_mode: mediaMode,
          auth_header: authHeader,
          auto_sync_frequency: syncFreq,
          old_website_link_enabled: oldWebsiteEnabled,
          old_website_link_text: oldWebsiteText,
          old_website_link_url: oldWebsiteUrl,
          old_website_link_new_tab: oldWebsiteNewTab,
          old_website_link_desktop: oldWebsiteDesktop,
          old_website_link_mobile: oldWebsiteMobile,
          product_schema_live_overlay: productSchemaLiveOverlay,
          allow_local_override: allowLocalOverride,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'SEO Settings saved successfully! Changes take effect immediately.' });
        setSettings(data.settings);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update settings' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Save failed: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAddOrigin = () => {
    const trimmed = newOriginInput.trim().replace(/\/+$/, '');
    if (!trimmed) return;
    if (!originsList.includes(trimmed)) {
      setOriginsList([...originsList, trimmed]);
    }
    setNewOriginInput('');
  };

  const handleRemoveOrigin = (orig: string) => {
    setOriginsList(originsList.filter((o) => o !== orig));
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

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs font-semibold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Source & Domain Strategy Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-50 text-[#DF0C88] flex items-center justify-center font-bold">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">WordPress Source &amp; Public Domain Settings</h2>
                <p className="text-xs text-slate-500">
                  Configure where Rank Math SEO metadata is captured from and how canonical domains are rewritten.
                </p>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#DF0C88] hover:bg-[#c20a76] disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* WordPress Source URL */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                WORDPRESS SOURCE URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  required
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://irepair-mobiles.co.uk"
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#DF0C88] focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleTestSourceUrl}
                  disabled={testing}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Activity className={`w-3.5 h-3.5 text-indigo-600 ${testing ? 'animate-spin' : ''}`} />
                  <span>{testing ? 'Testing...' : 'Test source URL'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                <strong>Development phase:</strong> <code className="text-pink-600">https://irepair-mobiles.co.uk</code>.<br />
                <strong>Launch phase:</strong> Update to <code className="text-indigo-600">https://old.irepair-mobiles.co.uk</code> when WordPress moves. Takes effect immediately with no redeploy!
              </p>
            </div>

            {/* Public Site URL */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                PUBLIC SITE URL (SITE_URL)
              </label>
              <input
                type="url"
                required
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://irepair-mobiles.co.uk"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#DF0C88] focus:bg-white focus:outline-none"
              />
              <p className="text-[11px] text-slate-500">
                The canonical public domain of this React website. All captured canonicals, og:url tags, and Rank Math schema @graph URLs are rewritten to this base origin.
              </p>
            </div>
          </div>

          {/* Test Result Display */}
          {testResult && (
            <div className={`p-4 rounded-xl border text-xs ${testResult.error ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
              <div className="font-bold flex items-center gap-1.5 mb-2">
                {testResult.error ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                <span>Source URL Diagnostic Report:</span>
              </div>
              {testResult.error ? (
                <div>Error: {testResult.error}</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-500">HTTP Status:</span>{' '}
                    <strong className="text-emerald-700">{testResult.status_code} OK</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Latency:</span>{' '}
                    <strong>{testResult.latency_ms} ms</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Rank Math Schema:</span>{' '}
                    <strong className={testResult.has_rank_math_schema ? 'text-emerald-700' : 'text-amber-700'}>
                      {testResult.has_rank_math_schema ? 'Detected (Valid)' : 'Not Found'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Cloudflare Block:</span>{' '}
                    <strong className={testResult.cloudflare_blocked ? 'text-rose-700' : 'text-emerald-700'}>
                      {testResult.cloudflare_blocked ? 'Blocked' : 'Clear / Pass'}
                    </strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500">Captured Title:</span>{' '}
                    <span className="font-medium truncate block">{testResult.title}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500">H1 Heading:</span>{' '}
                    <span className="font-medium truncate block">{testResult.h1}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Origins To Rewrite */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800">
              ORIGINS REWRITTEN TO PUBLIC SITE URL
            </label>
            <p className="text-[11px] text-slate-500">
              Any occurrence of these base URLs in Rank Math canonicals, Open Graph URLs, and JSON-LD schema graphs will be replaced with <code className="text-emerald-600">{siteUrl}</code>:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {originsList.map((orig, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 border border-slate-200 text-slate-800 flex items-center gap-1.5 font-mono"
                >
                  <span>{orig}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveOrigin(orig)}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer text-xs"
                    title="Remove origin"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 max-w-md pt-2">
              <input
                type="text"
                placeholder="https://example.com"
                value={newOriginInput}
                onChange={(e) => setNewOriginInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#DF0C88]"
              />
              <button
                type="button"
                onClick={handleAddOrigin}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Add Origin
              </button>
            </div>
          </div>
        </div>

        {/* Protection & Environment Modes Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Environment &amp; Indexability Protection</h2>
              <p className="text-xs text-slate-500">
                Safeguard search engine rankings when deploying between dev/staging and live production.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Environment Mode */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                ENVIRONMENT MODE
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`p-3.5 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                    envMode === 'production'
                      ? 'border-[#DF0C88] bg-pink-50/40 text-slate-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">Production Mode</span>
                    <input
                      type="radio"
                      name="envMode"
                      checked={envMode === 'production'}
                      onChange={() => setEnvMode('production')}
                      className="text-[#DF0C88] focus:ring-[#DF0C88]"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Outputs live canonical tags, indexable meta robots, and full sitemap indexing.
                  </span>
                </label>

                <label
                  className={`p-3.5 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                    envMode === 'staging'
                      ? 'border-amber-500 bg-amber-50/40 text-slate-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-700">Staging / Dev Mode</span>
                    <input
                      type="radio"
                      name="envMode"
                      checked={envMode === 'staging'}
                      onChange={() => setEnvMode('staging')}
                      className="text-amber-600 focus:ring-amber-600"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Forces <code className="text-rose-600">noindex, nofollow</code> across all pages to block search indexing.
                  </span>
                </label>
              </div>
            </div>

            {/* Robots Source Mode */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                ROBOTS SOURCE HANDLING
              </label>
              <select
                value={robotsMode}
                onChange={(e) => setRobotsMode(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
              >
                <option value="baseline_protected">
                  Baseline Protected (Recommended: ignores staging noindex)
                </option>
                <option value="live_source">
                  Live Source (Mirror WordPress robots tag verbatim)
                </option>
                <option value="force_noindex">
                  Force Noindex (Globally mark all pages as noindex)
                </option>
              </select>
              <p className="text-[11px] text-slate-500">
                When set to <strong>Baseline Protected</strong>, moving WordPress to <code>old.irepair-mobiles.co.uk</code> with noindex checked will NOT corrupt your live React site rankings.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
            {/* Media URL Handling */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                MEDIA &amp; UPLOAD URLS
              </label>
              <select
                value={mediaMode}
                onChange={(e) => setMediaMode(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
              >
                <option value="keep_source">Keep WordPress Source Media URLs (Recommended)</option>
                <option value="rewrite_site">Rewrite to Local Site Media</option>
              </select>
              <p className="text-[11px] text-slate-500">
                Keeps OG images and JSON-LD ImageObject URLs pointing to their high-resolution WordPress upload assets.
              </p>
            </div>

            {/* Basic Auth Header */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                STAGING BASIC AUTH HEADER (OPTIONAL)
              </label>
              <input
                type="text"
                placeholder="Basic dXNlcm5hbWU6cGFzc3dvcmQ="
                value={authHeader}
                onChange={(e) => setAuthHeader(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#DF0C88] focus:bg-white focus:outline-none font-mono"
              />
              <p className="text-[11px] text-slate-500">
                If the WordPress source URL is behind an HTTP password, enter the Authorization header here.
              </p>
            </div>
          </div>
        </div>

        {/* Top-Bar "Visit Old Website" Link & Schema Live Overlay Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-[#DF0C88] flex items-center justify-center font-bold">
              <LinkIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Header "Visit Old Website" Link &amp; Schema Overlay</h2>
              <p className="text-xs text-slate-500">
                Configure the utility top-bar link to the old WordPress site and live product schema price &amp; stock synchronization.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Enable Old Website Link */}
            <div className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="space-y-1 pr-4">
                <label className="text-xs font-bold text-slate-900 cursor-pointer" htmlFor="oldWebsiteLinkToggle">
                  Enable "Visit Old Website" Top-Bar Link
                </label>
                <p className="text-[11px] text-slate-500">
                  When enabled, displays a discreet external link in the top announcement bar. Auto-hides if the destination domain matches the current domain.
                </p>
              </div>
              <input
                id="oldWebsiteLinkToggle"
                type="checkbox"
                checked={oldWebsiteEnabled}
                onChange={(e) => setOldWebsiteEnabled(e.target.checked)}
                className="w-4 h-4 text-[#DF0C88] rounded border-slate-300 focus:ring-[#DF0C88] cursor-pointer mt-0.5"
              />
            </div>

            {oldWebsiteEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-[#DF0C88]/30">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    LINK TEXT
                  </label>
                  <input
                    type="text"
                    value={oldWebsiteText}
                    onChange={(e) => setOldWebsiteText(e.target.value)}
                    placeholder="Visit old website"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#DF0C88] focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">Default: "Visit old website"</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    DESTINATION URL
                  </label>
                  <input
                    type="url"
                    value={oldWebsiteUrl}
                    onChange={(e) => setOldWebsiteUrl(e.target.value)}
                    placeholder="https://old.irepair-mobiles.co.uk"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#DF0C88] focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">Point to the post-launch WordPress archive domain.</p>
                </div>

                <div className="col-span-1 md:col-span-2 flex flex-wrap gap-6 pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={oldWebsiteNewTab}
                      onChange={(e) => setOldWebsiteNewTab(e.target.checked)}
                      className="w-3.5 h-3.5 text-[#DF0C88] rounded border-slate-300 focus:ring-[#DF0C88]"
                    />
                    <span>Open in new tab (<code className="text-slate-500">target="_blank" rel="noopener noreferrer nofollow"</code>)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={oldWebsiteDesktop}
                      onChange={(e) => setOldWebsiteDesktop(e.target.checked)}
                      className="w-3.5 h-3.5 text-[#DF0C88] rounded border-slate-300 focus:ring-[#DF0C88]"
                    />
                    <span>Show on Desktop</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={oldWebsiteMobile}
                      onChange={(e) => setOldWebsiteMobile(e.target.checked)}
                      className="w-3.5 h-3.5 text-[#DF0C88] rounded border-slate-300 focus:ring-[#DF0C88]"
                    />
                    <span>Show on Mobile (in horizontal utility bar)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Product Schema Live Overlay Toggle */}
            <div className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 pt-4">
              <div className="space-y-1 pr-4">
                <label className="text-xs font-bold text-slate-900 cursor-pointer" htmlFor="prodOverlayToggle">
                  Product Schema Live Pricing &amp; Stock Overlay (Active)
                </label>
                <p className="text-[11px] text-slate-500">
                  Dynamically overlays current React store pricing (GBP), stock availability (InStock / OutOfStock), and SKU directly onto Rank Math's server-rendered product JSON-LD graph. Articles, breadcrumbs, and store identity remain perfectly preserved.
                </p>
              </div>
              <input
                id="prodOverlayToggle"
                type="checkbox"
                checked={productSchemaLiveOverlay}
                onChange={(e) => setProductSchemaLiveOverlay(e.target.checked)}
                className="w-4 h-4 text-[#DF0C88] rounded border-slate-300 focus:ring-[#DF0C88] cursor-pointer mt-0.5"
              />
            </div>

            {/* Emergency Local Override Safeguard Toggle */}
            <div className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="space-y-1 pr-4">
                <label className="text-xs font-bold text-slate-900 cursor-pointer" htmlFor="allowOverrideToggle">
                  Enable Emergency Local Overrides
                </label>
                <p className="text-[11px] text-slate-500">
                  Keep unchecked in standard operation (WordPress Rank Math is the single source of truth). Enabling allows emergency title or meta description edits directly in React admin when WordPress is unreachable.
                </p>
              </div>
              <input
                id="allowOverrideToggle"
                type="checkbox"
                checked={allowLocalOverride}
                onChange={(e) => setAllowLocalOverride(e.target.checked)}
                className="w-4 h-4 text-[#DF0C88] rounded border-slate-300 focus:ring-[#DF0C88] cursor-pointer mt-0.5"
              />
            </div>
          </div>
        </div>
      </form>

      {/* Redirects Manager Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <LinkIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">301 / 302 Redirect Manager</h2>
              <p className="text-xs text-slate-500">
                Manages URL redirects for legacy slugs, query search redirects, and URL alias preservation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddRedirectModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Add Redirect Rule</span>
          </button>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
              <tr>
                <th className="p-3">From Path</th>
                <th className="p-3">Destination URL</th>
                <th className="p-3">Status Code</th>
                <th className="p-3">Hits</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {redirects.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70">
                  <td className="p-3 font-mono font-bold text-slate-800">{r.from_path}</td>
                  <td className="p-3 font-mono text-emerald-700">
                    <span className="flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span>{r.to_path}</span>
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {r.status_code}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap text-slate-600">
                    <strong>{r.hit_count}</strong> requests
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleDeleteRedirect(r.id, r.from_path)}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Delete redirect"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Redirect Modal */}
      {showAddRedirectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleAddRedirect}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200"
          >
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Add 301 Permanent Redirect</h3>
              <button
                type="button"
                onClick={() => setShowAddRedirectModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Source Path (From)</label>
                <input
                  type="text"
                  required
                  placeholder="/old-page/"
                  value={newFromPath}
                  onChange={(e) => setNewFromPath(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#DF0C88] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Destination Path / URL (To)</label>
                <input
                  type="text"
                  required
                  placeholder="/new-page/"
                  value={newToPath}
                  onChange={(e) => setNewToPath(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#DF0C88] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Redirect HTTP Status</label>
                <select
                  value={newStatusCode}
                  onChange={(e) => setNewStatusCode(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#DF0C88] focus:outline-none"
                >
                  <option value={301}>301 Permanent Redirect (Recommended)</option>
                  <option value={302}>302 Temporary Redirect</option>
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddRedirectModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#DF0C88] hover:bg-[#c20a76] rounded-lg transition-colors cursor-pointer"
              >
                Add Redirect
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
