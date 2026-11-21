import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { 
  FileText, 
  Layers, 
  Image as ImageIcon, 
  Database, 
  Users, 
  ShoppingBag, 
  TrendingUp, 
  ShieldCheck, 
  Activity,
  ArrowRight,
  ExternalLink,
  Plus,
  RefreshCw,
  Clock
} from 'lucide-react';

interface DashboardHomeProps {
  onNavigate: (module: string) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ onNavigate }) => {
  const { adminUser } = useAdmin();
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/cms/stats', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setLogs(data.recentLogs || []);
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#780649] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-pink-300 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-[#DF0C88]" />
            <span className="capitalize">{adminUser?.role.replace('_', ' ')} Session Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Welcome back, {adminUser?.email.split('@')[0]}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            All content on the iRepair Mobiles public storefront is dynamically driven by this SQLite CMS database.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onNavigate('pages')}
            className="px-4 py-2.5 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold shadow-md hover:shadow-lg flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Manage Pages</span>
          </button>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/20 flex items-center gap-1.5 transition-all"
          >
            <span>View Live Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div
          onClick={() => onNavigate('pages')}
          className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">CMS Pages</span>
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-[#DF0C88] flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {loading ? '...' : stats?.pages || 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Custom layouts & SEO</span>
        </div>

        <div
          onClick={() => onNavigate('collections')}
          className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Collections</span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {loading ? '...' : (stats?.faqs || 0) + (stats?.reviews || 0) + (stats?.stores || 0)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">FAQs, Reviews, 8 Stores</span>
        </div>

        <div
          onClick={() => onNavigate('media')}
          className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Media Assets</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ImageIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {loading ? '...' : stats?.media || 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Images & WebP uploads</span>
        </div>

        <div
          onClick={() => onNavigate('products')}
          className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Products & Inventory</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="text-sm font-black text-emerald-600 flex items-center gap-1.5 mt-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Local Database Mirror</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Full Sync & Variations</span>
        </div>
      </div>

      {/* System Status and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#DF0C88]" />
              <h3 className="font-bold text-base text-slate-900">Recent Activity Log</h3>
            </div>
            <button
              onClick={fetchStats}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No recent logs recorded.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-start justify-between gap-4 text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{log.action}</span>
                    <span className="text-slate-400 text-[11px] ml-2">by {log.user_email}</span>
                    {log.details && (
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate max-w-sm">
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-4">
            Security & Architecture Status
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Database Storage</span>
                <span className="text-[11px] text-slate-500">Persistent SQLite Engine (data/cms.sqlite)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                Active
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">WooCommerce Secrets</span>
                <span className="text-[11px] text-slate-500">AES-256-GCM Encrypted at Rest</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                Secured
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Crawler Protection</span>
                <span className="text-[11px] text-slate-500">Robots.txt Disallow & noindex active</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                Hidden
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Rate Limiting</span>
                <span className="text-[11px] text-slate-500">5-attempt lockout on failed logins</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                Enforced
              </span>
            </div>

            <div
              onClick={() => onNavigate('smtp')}
              className="p-3 rounded-xl bg-pink-50/50 hover:bg-pink-50 border border-pink-200/80 flex items-center justify-between cursor-pointer transition-colors group"
            >
              <div>
                <span className="font-bold text-slate-900 block group-hover:text-[#DF0C88] transition-colors">
                  SMTP Mailer &amp; Form Notifications
                </span>
                <span className="text-[11px] text-slate-500">Configure outbound SMTP details &amp; view form submissions</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#DF0C88] text-white font-bold text-[10px] shrink-0">
                Manage SMTP →
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
