import React, { useState, useEffect } from 'react';
import { useAdmin } from './context/AdminContext';
import { DashboardHome } from './views/DashboardHome';
import { PagesManager } from './views/PagesManager';
import { CollectionsManager } from './views/CollectionsManager';
import { MediaLibraryView } from './views/MediaLibraryView';
import { WooCommerceSettingsView } from './views/WooCommerceSettingsView';
import { UsersManagerView } from './views/UsersManagerView';
import { SiteSettingsView } from './views/SiteSettingsView';
import { WidgetsExplorerView } from './views/WidgetsExplorerView';
import { SmtpSettingsView } from './views/SmtpSettingsView';
import { CategoriesManagerView } from './views/CategoriesManagerView';
import { BlogManagerView } from './views/BlogManagerView';
import { DynamicProductGridBuilderView } from './views/DynamicProductGridBuilderView';
import { MobilePhoneBrandsMarqueeBuilderView } from './views/MobilePhoneBrandsMarqueeBuilderView';
import { ImageSliderBuilderView } from '../widgets/components/image-slider/ImageSliderBuilderView';
import { JobsManagerView } from './views/JobsManagerView';
import { ProductsManagerView } from './views/ProductsManagerView';
import { PaymentSettingsView } from './views/PaymentSettingsView';
import { PageSeoManagerView } from './views/PageSeoManagerView';
import { SeoSettingsView } from './views/SeoSettingsView';
import {
  LayoutDashboard,
  FileText,
  Layers,
  LayoutGrid,
  Database,
  Image as ImageIcon,
  ShoppingBag,
  CreditCard,
  Globe,
  Link as LinkIcon,
  Users,
  Settings,
  Mail,
  LogOut,
  ExternalLink,
  Shield,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  FolderTree,
  Smartphone,
  SlidersHorizontal,
  Briefcase,
  BookOpen,
} from 'lucide-react';

interface AdminLayoutProps {
  onLogout: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onLogout }) => {
  const { adminUser, logout } = useAdmin();
  const [activeModule, setActiveModule] = useState<'home' | 'products' | 'jobs' | 'blog' | 'pages' | 'categories' | 'page_seo' | 'widgets' | 'slider_builder' | 'grid_builder' | 'marquee_builder' | 'collections' | 'media' | 'smtp' | 'woocommerce' | 'express_checkout' | 'seo_settings' | 'users' | 'settings'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.title = 'Staff CMS Dashboard | iRepair Mobiles';
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.setAttribute('content', 'noindex, nofollow');
  }, [activeModule]);

  const navItems = [
    { id: 'home', label: 'Dashboard Home', icon: LayoutDashboard },
    { id: 'products', label: 'Products & Inventory', icon: ShoppingBag },
    { id: 'categories', label: 'Categories & Taxonomy', icon: FolderTree },
    { id: 'page_seo', label: 'Page SEO & Rank Math', icon: Globe },
    { id: 'blog', label: 'Blog & Articles', icon: BookOpen },
    { id: 'jobs', label: 'Careers & Jobs', icon: Briefcase },
    { id: 'slider_builder', label: 'Image Slider Studio', icon: SlidersHorizontal },
    { id: 'marquee_builder', label: 'Brand Marquee Builder', icon: Smartphone },
    { id: 'grid_builder', label: 'Dynamic Grid Builder', icon: LayoutGrid },
    { id: 'pages', label: 'Pages & Layouts', icon: FileText },
    { id: 'widgets', label: 'Widget Library', icon: Layers },
    { id: 'collections', label: 'Collections Hub', icon: Database },
    { id: 'media', label: 'Media Library', icon: ImageIcon },
    ...(adminUser?.role !== 'editor'
      ? [
          { id: 'smtp', label: 'SMTP & Inquiries', icon: Mail },
          { id: 'woocommerce', label: 'WooCommerce API', icon: ShoppingBag },
          { id: 'express_checkout', label: 'Payments', icon: CreditCard },
          { id: 'seo_settings', label: 'SEO & Domains', icon: LinkIcon },
          { id: 'users', label: 'Users & Permissions', icon: Users },
          { id: 'settings', label: 'Global Settings', icon: Settings },
        ]
      : []),
  ];

  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  const renderModuleView = () => {
    switch (activeModule) {
      case 'home':
        return <DashboardHome onNavigate={(mod) => setActiveModule(mod as any)} />;
      case 'products':
        return <ProductsManagerView />;
      case 'blog':
        return <BlogManagerView />;
      case 'jobs':
        return <JobsManagerView />;
      case 'slider_builder':
        return <ImageSliderBuilderView />;
      case 'marquee_builder':
        return <MobilePhoneBrandsMarqueeBuilderView />;
      case 'grid_builder':
        return <DynamicProductGridBuilderView />;
      case 'pages':
        return <PagesManager />;
      case 'categories':
        return <CategoriesManagerView />;
      case 'page_seo':
        return <PageSeoManagerView />;
      case 'widgets':
        return <WidgetsExplorerView onNavigate={(mod) => setActiveModule(mod as any)} />;
      case 'collections':
        return <CollectionsManager />;
      case 'media':
        return <MediaLibraryView />;
      case 'smtp':
        return <SmtpSettingsView />;
      case 'woocommerce':
        return <WooCommerceSettingsView />;
      case 'express_checkout':
        return <PaymentSettingsView />;
      case 'seo_settings':
        return <SeoSettingsView />;
      case 'users':
        return <UsersManagerView />;
      case 'settings':
        return <SiteSettingsView />;
      default:
        return <DashboardHome onNavigate={(mod) => setActiveModule(mod as any)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans selection:bg-[#DF0C88] selection:text-white">
      {/* Mobile Header Bar */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#DF0C88] flex items-center justify-center font-black text-sm">
            iR
          </div>
          <span className="font-extrabold text-sm tracking-tight">Staff CMS</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 md:min-h-screen z-30 transition-all ${
          mobileMenuOpen ? 'block' : 'hidden md:flex'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#DF0C88] to-pink-500 text-white flex items-center justify-center font-black shadow-md shadow-[#DF0C88]/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-sm text-white tracking-tight leading-tight">iRepair Mobiles</h2>
            <span className="text-[10px] font-mono uppercase tracking-wider text-pink-400 font-bold block">
              Lightweight CMS
            </span>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-pink-900/60 text-pink-300 font-bold text-xs flex items-center justify-center">
            {adminUser?.email.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{adminUser?.email}</p>
            <span className="text-[10px] font-semibold text-pink-400 capitalize block">
              {adminUser?.role.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveModule(item.id as any);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#DF0C88] text-white shadow-md shadow-[#DF0C88]/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors"
          >
            <span>Public Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-rose-900/50 hover:bg-rose-950/40 text-rose-400 text-xs font-bold cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200/90 px-6 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">CMS</span>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-slate-800 capitalize">
              {activeModule.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Database Connected</span>
            </span>
          </div>
        </header>

        {/* Body View */}
        <div className="flex-1 p-6 sm:p-8">
          {renderModuleView()}
        </div>
      </main>
    </div>
  );
};
