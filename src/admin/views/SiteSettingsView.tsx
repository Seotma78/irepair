import React, { useState, useEffect } from 'react';
import { MediaPickerModal } from '../components/MediaPickerModal';
import { useApp } from '../../context/AppContext';
import { 
  Settings, 
  Menu, 
  Save, 
  Plus, 
  Trash2, 
  Check, 
  Image as ImageIcon,
  Share2,
  Shield,
  Key,
  Copy,
  Terminal,
  RefreshCw,
  Lock,
  RotateCcw
} from 'lucide-react';

export const SiteSettingsView: React.FC = () => {
  let appRefresh: (() => Promise<void>) | null = null;
  try {
    const app = useApp();
    if (app && app.refreshSiteSettings) {
      appRefresh = app.refreshSiteSettings;
    }
  } catch {
    appRefresh = null;
  }

  const [activeTab, setActiveTab] = useState<'general' | 'menus' | 'security'>('general');
  const [settings, setSettings] = useState<any>({});
  const [primaryMenu, setPrimaryMenu] = useState<any[]>([]);
  const [footerMenu, setFooterMenu] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Key generator states
  const [generatedJwtKey, setGeneratedJwtKey] = useState('');
  const [generatedEncKey, setGeneratedEncKey] = useState('');

  const generateNewKey = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const handleGenerateKeys = () => {
    setGeneratedJwtKey(generateNewKey());
    setGeneratedEncKey(generateNewKey());
  };

  // Logo picker modal
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);
  const [logoTarget, setLogoTarget] = useState<'logoUrl' | 'logoWhiteUrl'>('logoUrl');

  const openLogoPicker = (target: 'logoUrl' | 'logoWhiteUrl') => {
    setLogoTarget(target);
    setLogoPickerOpen(true);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [setRes, menuRes] = await Promise.all([
        fetch('/api/cms/settings'),
        fetch('/api/admin/cms/menus', {
          headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
        }),
      ]);

      if (setRes.ok) {
        const s = await setRes.json();
        setSettings(s);
      }

      if (menuRes.ok) {
        const m = await menuRes.json();
        const pri = m.find((row: any) => row.location === 'primary');
        const foo = m.find((row: any) => row.location === 'footer');
        if (pri) setPrimaryMenu(pri.items || []);
        if (foo) setFooterMenu(foo.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/cms/settings/general', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        if (appRefresh) {
          await appRefresh();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMenus = async () => {
    setSaving(true);
    try {
      await Promise.all([
        fetch('/api/admin/cms/menus/primary', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
          },
          body: JSON.stringify({ items: primaryMenu, title: 'Main Navigation' }),
        }),
        fetch('/api/admin/cms/menus/footer', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
          },
          body: JSON.stringify({ items: footerMenu, title: 'Footer Links' }),
        }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Global Site Settings & Navigation</h1>
          <p className="text-xs text-slate-500 mt-1">Configure brand identity, contact phone numbers, and navigation menus</p>
        </div>

        <button
          onClick={activeTab === 'general' ? handleSaveSettings : handleSaveMenus}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer self-start transition-all"
        >
          {saving ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : saved ? (
            <>
              <Check className="w-4 h-4" />
              <span>Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'general' ? 'bg-[#DF0C88] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>General Brand Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('menus')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'menus' ? 'bg-[#DF0C88] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Menu className="w-4 h-4" />
          <span>Navigation Menus Builder</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('security');
            if (!generatedJwtKey) handleGenerateKeys();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'security' ? 'bg-[#DF0C88] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Security &amp; API Keys</span>
        </button>
      </div>

      {/* TAB 1: GENERAL SETTINGS */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Website Brand Name</label>
              <input
                type="text"
                value={settings.siteName || ''}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tagline</label>
              <input
                type="text"
                value={settings.tagline || ''}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Top Announcement Banner Text</label>
            <input
              type="text"
              value={settings.announcementBarText || ''}
              onChange={(e) => setSettings({ ...settings, announcementBarText: e.target.value })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5"
            />
          </div>

          {/* Brand Logos: Header & Footer */}
          <div className="pt-2 border-t border-slate-100 space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#DF0C88]" />
                <span>Brand Identity: Header &amp; Footer Logo Images</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize the logo image displayed in the top header navigation bar and the dark footer area.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 1. Header Logo */}
              <div className="p-4.5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Header Navbar Logo (Light Theme)</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-pink-100 text-[#DF0C88] rounded-full font-bold">
                    Header
                  </span>
                </div>

                {/* Preview Box on white */}
                <div className="h-20 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-3 overflow-hidden shadow-2xs">
                  <img
                    src={settings.logoUrl || '/src/assets/images/irepair-logo.svg'}
                    alt="Header Logo Preview"
                    className="max-h-12 max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/src/assets/images/irepair-logo.svg';
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={settings.logoUrl || ''}
                    onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                    placeholder="/src/assets/images/irepair-logo.svg or URL"
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openLogoPicker('logoUrl')}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-[#DF0C88] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Select From Media</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, logoUrl: '/src/assets/images/irepair-logo.svg' })}
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Reset to default SVG logo"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Footer Logo */}
              <div className="p-4.5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Footer Logo (Dark Theme / White)</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-slate-800 text-slate-200 rounded-full font-bold">
                    Footer
                  </span>
                </div>

                {/* Preview Box on dark slate-950 */}
                <div className="h-20 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-3 overflow-hidden shadow-2xs">
                  <img
                    src={settings.logoWhiteUrl || '/src/assets/images/irepair-logo-white.svg'}
                    alt="Footer Logo Preview"
                    className="max-h-12 max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/src/assets/images/irepair-logo-white.svg';
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={settings.logoWhiteUrl || ''}
                    onChange={(e) => setSettings({ ...settings, logoWhiteUrl: e.target.value })}
                    placeholder="/src/assets/images/irepair-logo-white.svg or URL"
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openLogoPicker('logoWhiteUrl')}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-[#DF0C88] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Select From Media</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, logoWhiteUrl: '/src/assets/images/irepair-logo-white.svg' })}
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Reset to default white SVG logo"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={settings.phone || ''}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Support Email</label>
              <input
                type="email"
                value={settings.email || ''}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Number</label>
              <input
                type="text"
                value={settings.whatsapp || ''}
                onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Physical Head Office Address</label>
            <input
              type="text"
              value={settings.address || ''}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5"
            />
          </div>

          {/* Social Links */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Share2 className="w-3.5 h-3.5" />
              <span>Social & Reviews Links</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Facebook URL</label>
                <input
                  type="text"
                  value={settings.socialLinks?.facebook || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    socialLinks: { ...settings.socialLinks, facebook: e.target.value },
                  })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Instagram URL</label>
                <input
                  type="text"
                  value={settings.socialLinks?.instagram || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    socialLinks: { ...settings.socialLinks, instagram: e.target.value },
                  })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Twitter / X URL</label>
                <input
                  type="text"
                  value={settings.socialLinks?.twitter || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    socialLinks: { ...settings.socialLinks, twitter: e.target.value },
                  })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Google Reviews URL</label>
                <input
                  type="text"
                  value={settings.socialLinks?.googleReview || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    socialLinks: { ...settings.socialLinks, googleReview: e.target.value },
                  })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: MENU BUILDER */}
      {activeTab === 'menus' && (
        <div className="space-y-6">
          {/* Primary Nav */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Header Main Navigation</h3>
                <p className="text-xs text-slate-400">Order and links displayed in the public top navigation bar</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPrimaryMenu([
                    ...primaryMenu,
                    { id: `m_${Date.now()}`, label: 'New Link', url: '/', type: 'internal', target: '_self' },
                  ]);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-[#DF0C88] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Link</span>
              </button>
            </div>

            <div className="space-y-2">
              {primaryMenu.map((item, idx) => (
                <div key={item.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}.</span>
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => {
                      const list = [...primaryMenu];
                      list[idx].label = e.target.value;
                      setPrimaryMenu(list);
                    }}
                    placeholder="Label"
                    className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                  />
                  <input
                    type="text"
                    value={item.url}
                    onChange={(e) => {
                      const list = [...primaryMenu];
                      list[idx].url = e.target.value;
                      setPrimaryMenu(list);
                    }}
                    placeholder="/slug or URL"
                    className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                  />
                  <button
                    onClick={() => setPrimaryMenu(primaryMenu.filter((_, i) => i !== idx))}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Nav */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Footer Menu Columns</h3>
                <p className="text-xs text-slate-400">Links displayed in the site footer</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFooterMenu([
                    ...footerMenu,
                    { id: `f_${Date.now()}`, label: 'Footer Link', url: '/services', type: 'internal' },
                  ]);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-[#DF0C88] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Link</span>
              </button>
            </div>

            <div className="space-y-2">
              {footerMenu.map((item, idx) => (
                <div key={item.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}.</span>
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => {
                      const list = [...footerMenu];
                      list[idx].label = e.target.value;
                      setFooterMenu(list);
                    }}
                    placeholder="Label"
                    className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                  />
                  <input
                    type="text"
                    value={item.url}
                    onChange={(e) => {
                      const list = [...footerMenu];
                      list[idx].url = e.target.value;
                      setFooterMenu(list);
                    }}
                    placeholder="/slug or URL"
                    className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                  />
                  <button
                    onClick={() => setFooterMenu(footerMenu.filter((_, i) => i !== idx))}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY & API KEYS */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-8">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#DF0C88]" />
              <span>Authentication &amp; Encryption Key Guide</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Where to find, generate, and configure your <code className="font-mono text-[#DF0C88] font-bold">JWT_SECRET</code> and <code className="font-mono text-[#DF0C88] font-bold">ENCRYPTION_KEY</code> for production deployment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Key 1: JWT Secret */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Token Signing</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Active</span>
              </div>
              <h4 className="text-sm font-black text-slate-900 font-mono">JWT_SECRET</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Signs and verifies admin authentication JWTs (JSON Web Tokens) for sessions, cookies, and HTTP Bearer tokens.
              </p>
              <div className="pt-2 text-xs text-slate-500 space-y-1">
                <div><strong>Default:</strong> Protected fallback automatically seeded on startup.</div>
                <div><strong>Location:</strong> Configured in <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">/.env</code> or Cloud Run / Docker environment variables.</div>
              </div>
            </div>

            {/* Key 2: Master Encryption Key */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">AES-256-GCM At Rest</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Active</span>
              </div>
              <h4 className="text-sm font-black text-slate-900 font-mono">ENCRYPTION_KEY</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Encrypts WooCommerce consumer secrets before storing them in the SQLite database, ensuring credentials are never exposed in cleartext.
              </p>
              <div className="pt-2 text-xs text-slate-500 space-y-1">
                <div><strong>Default:</strong> Deterministic 32-byte hash seed automatically initialized.</div>
                <div><strong>Location:</strong> Configured in <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">/.env</code> or Cloud Run / Docker environment variables.</div>
              </div>
            </div>
          </div>

          {/* Key Generator Widget */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#DF0C88]" />
                  <span>Instant 1-Click Production Key Generator</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Generate cryptographically secure 256-bit random keys ready to paste into your <code className="text-pink-300 font-mono">.env</code> file.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateKeys}
                className="px-3.5 py-2 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start transition-all shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Generate New Keys</span>
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 font-semibold mb-1">
                  <span>Generated JWT_SECRET:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedJwtKey);
                      setCopiedKey('jwt');
                      setTimeout(() => setCopiedKey(null), 2000);
                    }}
                    className="text-[11px] text-[#DF0C88] hover:text-pink-300 flex items-center gap-1 cursor-pointer font-bold"
                  >
                    {copiedKey === 'jwt' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'jwt' ? 'Copied!' : 'Copy Key'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={generatedJwtKey}
                  className="w-full text-xs font-mono bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-pink-300 select-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 font-semibold mb-1">
                  <span>Generated ENCRYPTION_KEY:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedEncKey);
                      setCopiedKey('enc');
                      setTimeout(() => setCopiedKey(null), 2000);
                    }}
                    className="text-[11px] text-[#DF0C88] hover:text-pink-300 flex items-center gap-1 cursor-pointer font-bold"
                  >
                    {copiedKey === 'enc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'enc' ? 'Copied!' : 'Copy Key'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={generatedEncKey}
                  className="w-full text-xs font-mono bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-pink-300 select-all"
                />
              </div>
            </div>

            {/* Terminal Command Tip */}
            <div className="mt-4 pt-4 border-t border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-400">
              <Terminal className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
              <div>
                <span>Or generate directly in your terminal using Node.js:</span>
                <code className="block mt-1 font-mono text-pink-300 bg-slate-950 p-2 rounded-lg border border-slate-800 select-all">
                  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      <MediaPickerModal
        isOpen={logoPickerOpen}
        onClose={() => setLogoPickerOpen(false)}
        onSelect={(url) => setSettings({ ...settings, [logoTarget]: url })}
      />
    </div>
  );
};
