/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AdminProvider } from './admin/context/AdminContext';
import { AdminLoginView } from './admin/AdminLoginView';
import { AdminLayout } from './admin/AdminLayout';
import { AdminGate } from './admin/AdminGate';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { DynamicPageRenderer } from './components/DynamicPageRenderer';
import { BookRepairView } from './components/BookRepairView';
import { ShopView } from './components/ShopView';
import { ProductDetailView } from './components/ProductDetailView';
import { TrackRepairView } from './components/TrackRepairView';
import { CheckoutView } from './components/CheckoutView';
import { CartDrawer } from './components/CartDrawer';
import { WooCommerceModal } from './components/WooCommerceModal';
import { WordPressSyncModal } from './components/WordPressSyncModal';
import { CategoryPageView } from './components/CategoryPageView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { AccountView } from './components/account/AccountView';
import { CartView } from './components/CartView';
import { OrderConfirmationView } from './components/OrderConfirmationView';
import { GuestOrderTrackingView } from './components/GuestOrderTrackingView';
import { AboutView } from './components/AboutView';
import { ContactView } from './components/ContactView';
import { ServicesView } from './components/ServicesView';
import { LocationsView } from './components/LocationsView';
import { PrivacyPolicyView } from './components/PrivacyPolicyView';
import { TermsOfUseView } from './components/TermsOfUseView';
import { WarrantyPolicyView } from './components/WarrantyPolicyView';
import { ShippingDeliveryPolicyView } from './components/ShippingDeliveryPolicyView';
import { ReturnCancellationPolicyView } from './components/ReturnCancellationPolicyView';
import { SellDevicesView } from './components/SellDevicesView';
import { CareerView } from './components/CareerView';
import { ApplyNowView } from './components/ApplyNowView';
import { MobilePhoneRepairShopsUKView } from './components/MobilePhoneRepairShopsUKView';
import { NorwichRepairShopPage } from './components/NorwichRepairShopPage';
import { BasingstokeRepairShopPage } from './components/BasingstokeRepairShopPage';
import { SouthendRepairShopPage } from './components/SouthendRepairShopPage';
import { EastbourneRepairShopPage } from './components/EastbourneRepairShopPage';
import { ReadingRepairShopPage } from './components/ReadingRepairShopPage';
import { SolihullRepairShopPage } from './components/SolihullRepairShopPage';
import { IpswichRepairShopPage } from './components/IpswichRepairShopPage';
import { parseProductRoute } from './utils/categoryUtils';
import { BlogIndexView } from './components/BlogIndexView';
import { BlogArchiveView } from './components/BlogArchiveView';
import { BlogPostDetailView } from './components/BlogPostDetailView';
import { RootSlugResolverView } from './components/RootSlugResolverView';
import { CheckCircle2, AlertCircle, Info, Wrench } from 'lucide-react';

const PublicAppContent: React.FC = () => {
  const {
    currentPage,
    setCurrentPage,
    viewProductDetail,
    products,
    notification,
    startRepairBooking,
    currentCategoryPath,
    navigateToCategory,
    blogPageNumber,
    blogArchiveType,
    blogArchiveSlug,
  } = useApp();

  // Intercept internal <a> link clicks so they update the URL bar smoothly
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Ignore external or protocol links
      if (
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        target.getAttribute('target') === '_blank'
      ) {
        return;
      }

      // Ignore server-handled resources (RSS, sitemaps, uploads, APIs)
      if (
        href === '/feed/' ||
        href === '/feed' ||
        href === '/blogs/feed/' ||
        href === '/blogs/feed' ||
        href === '/sitemap.xml' ||
        href.startsWith('/uploads/') ||
        href.startsWith('/api/')
      ) {
        return;
      }

      // Allow admin routes to switch root view
      if (href === '/admin-login' || href.startsWith('/admin')) {
        window.history.pushState({}, '', href);
        window.dispatchEvent(new Event('locationchange'));
        return;
      }

      // Handle anchor hash links
      if (href.startsWith('#')) {
        e.preventDefault();
        const el = document.getElementById(href.slice(1));
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      // Internal application routes
      if (href.startsWith('/')) {
        e.preventDefault();
        const cleanSlug = href.replace(/^\/+|\/+$/g, '');
        if (cleanSlug.startsWith('product/')) {
          const { productSlug } = parseProductRoute(cleanSlug);
          const found = products.find((p) => p.slug === productSlug || p.id === productSlug || (p.wpId && String(p.wpId) === productSlug));
          if (found) {
            viewProductDetail(found);
            return;
          }
        }
        if (cleanSlug.startsWith('product-category/')) {
          navigateToCategory(cleanSlug.replace(/^product-category\//, ''));
          return;
        }
        if (cleanSlug.startsWith('order-confirmation')) {
          setCurrentPage('order-confirmation');
          return;
        }
        setCurrentPage(cleanSlug || 'home');
      }
    };

    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
  }, [products, setCurrentPage, viewProductDetail, navigateToCategory]);

  // Set noindex meta tag dynamically for account, cart, checkout, order-confirmation, and tracking
  useEffect(() => {
    const sensitivePages = ['account', 'my-account', 'cart', 'checkout', 'order-confirmation', 'track-order', 'reset-password'];
    let robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      document.head.appendChild(robotsMeta);
    }
    if (sensitivePages.includes(currentPage)) {
      robotsMeta.content = 'noindex, nofollow';
    } else {
      robotsMeta.content = 'index, follow';
    }

    if (currentPage === 'sell-my-phone' || currentPage === 'sell-your-devices' || currentPage === 'sell-old-phone') {
      document.title = 'Sell Your Devices | Express UK Cash Trade-In - iRepair Mobiles';
    } else if (currentPage === 'career' || currentPage === 'careers' || currentPage === 'jobs') {
      document.title = 'Start Your Career With Us | Job Openings - iRepair Mobiles UK';
    } else if (currentPage === 'apply-now' || currentPage === 'apply' || currentPage === 'job-application') {
      document.title = 'Apply Now - Job Application | iRepair Mobiles UK';
    } else if (currentPage === 'mobile-phone-repair-shops-in-uk' || currentPage === 'mobile-phone-repair-shops' || currentPage === 'repair-shops-in-uk') {
      document.title = 'Mobile Phone Repair Shops in UK | Express Same Day Service - iRepair Mobiles';
    } else if (currentPage === 'mobile-phone-repair-shop-in-norwich' || currentPage === 'repair-shop-in-norwich' || currentPage === 'norwich-repair-shop') {
      document.title = 'Best Mobile Phone Repair Shop in Norwich... | iRepair Mobiles';
    } else if (currentPage === 'mobile-phone-repair-basingstoke' || currentPage === 'repair-basingstoke' || currentPage === 'basingstoke-repair-shop') {
      document.title = 'Your Trusted Mobile Phone Repair Shop in Basingstoke... | iRepair Mobiles';
    } else if (currentPage === 'phone-repairing-services-southend' || currentPage === 'repair-southend' || currentPage === 'southend-repair-shop' || currentPage === 'mobile-phone-repair-southend') {
      document.title = 'Looking for a Reliable Mobile Phone Repair Shop in Southend? | iRepair Mobiles';
    } else if (currentPage === 'mobile-phone-repair-shop-eastbourne' || currentPage === 'repair-shop-eastbourne' || currentPage === 'eastbourne-repair-shop' || currentPage === 'mobile-phone-repair-eastbourne') {
      document.title = 'Your Go-To Mobile Phone Repair Shop in Eastbourne – Quick & Expert Service! | iRepair Mobiles';
    } else if (currentPage === 'mobile-phone-repair-shop-in-reading' || currentPage === 'mobile-phone-repair-reading' || currentPage === 'repair-shop-in-reading' || currentPage === 'reading-repair-shop' || currentPage === 'repair-reading') {
      document.title = 'Expert Mobile Phone Repair Shop in Reading - iRepair Mobiles';
    } else if (currentPage === 'mobile-phone-repair-service-solihull' || currentPage === 'mobile-phone-repair-solihull' || currentPage === 'repair-service-solihull' || currentPage === 'solihull-repair-shop' || currentPage === 'repair-solihull' || currentPage === 'mobile-phone-repair-shop-solihull') {
      document.title = 'iRepair Mobiles - Your Trusted Mobile Phone Repair Shop in Solihull';
    } else if (currentPage === 'mobile-repair-shop-in-ipswich' || currentPage === 'mobile-phone-repair-shop-in-ipswich' || currentPage === 'repair-shop-in-ipswich' || currentPage === 'ipswich-repair-shop') {
      document.title = 'Get Expert Mobile Phone Repair in Ipswich at iRepair Mobiles';
    }
  }, [currentPage]);

  const renderCurrentView = () => {
    switch (currentPage) {
      case 'home':
        return <DynamicPageRenderer slug="home" />;
      case 'home-2':
        return <DynamicPageRenderer slug="home-2" />;
      case 'book-repair':
      case 'quote':
      case 'repairs':
        return <BookRepairView />;
      case 'shop':
      case 'offers':
      case 'accessories':
      case 'cases':
        return (
          <div className="space-y-6">
            <DynamicPageRenderer slug="shop" />
            <ShopView />
          </div>
        );
      case 'product-category':
        return <CategoryPageView categoryPath={currentCategoryPath} />;
      case 'product-detail':
        return <ProductDetailView />;
      case 'services':
        return <ServicesView />;
      case 'locations':
        return <LocationsView />;
      case 'track-repair':
        return (
          <div className="space-y-6">
            <DynamicPageRenderer slug="track-repair" />
            <TrackRepairView />
          </div>
        );
      case 'about':
      case 'about-us':
        return <AboutView />;
      case 'contact':
      case 'contact-us':
        return <ContactView />;
      case 'career':
      case 'careers':
      case 'jobs':
        return <CareerView />;
      case 'apply-now':
      case 'apply':
      case 'job-application':
        return <ApplyNowView />;
      case 'account':
      case 'my-account':
        return <AccountView />;
      case 'cart':
        return <CartView />;
      case 'checkout':
        return <CheckoutView />;
      case 'order-confirmation':
        return <OrderConfirmationView />;
      case 'track-order':
        return <GuestOrderTrackingView />;
      case 'warranty':
      case 'warranty-policy':
        return <WarrantyPolicyView />;
      case 'terms':
      case 'terms-of-use':
        return <TermsOfUseView />;
      case 'privacy':
      case 'privacy-policy':
        return <PrivacyPolicyView />;
      case 'shipping':
      case 'shipping-delivery':
      case 'shipping-delivery-policy':
        return <ShippingDeliveryPolicyView />;
      case 'returns':
      case 'return-cancellation':
      case 'return-cancellation-policy':
        return <ReturnCancellationPolicyView />;
      case 'sell-my-phone':
      case 'sell-your-devices':
      case 'sell-old-phone':
      case 'sell-device':
      case 'sell-devices':
        return <SellDevicesView />;
      case 'mobile-phone-repair-shops-in-uk':
      case 'mobile-phone-repair-shops':
      case 'repair-shops-in-uk':
        return <MobilePhoneRepairShopsUKView />;
      case 'mobile-phone-repair-shop-in-norwich':
      case 'repair-shop-in-norwich':
      case 'norwich-repair-shop':
        return <NorwichRepairShopPage />;
      case 'mobile-phone-repair-basingstoke':
      case 'repair-basingstoke':
      case 'basingstoke-repair-shop':
        return <BasingstokeRepairShopPage />;
      case 'phone-repairing-services-southend':
      case 'repair-southend':
      case 'southend-repair-shop':
      case 'mobile-phone-repair-southend':
        return <SouthendRepairShopPage />;
      case 'mobile-phone-repair-shop-eastbourne':
      case 'repair-shop-eastbourne':
      case 'eastbourne-repair-shop':
      case 'mobile-phone-repair-eastbourne':
        return <EastbourneRepairShopPage />;
      case 'mobile-phone-repair-shop-in-reading':
      case 'mobile-phone-repair-reading':
      case 'repair-shop-in-reading':
      case 'reading-repair-shop':
      case 'repair-reading':
        return <ReadingRepairShopPage />;
      case 'mobile-phone-repair-service-solihull':
      case 'mobile-phone-repair-solihull':
      case 'repair-service-solihull':
      case 'solihull-repair-shop':
      case 'repair-solihull':
      case 'mobile-phone-repair-shop-solihull':
        return <SolihullRepairShopPage />;
      case 'mobile-repair-shop-in-ipswich':
      case 'mobile-phone-repair-shop-in-ipswich':
      case 'repair-shop-in-ipswich':
      case 'ipswich-repair-shop':
        return <IpswichRepairShopPage />;
      case 'blogs':
        return <BlogIndexView initialPage={blogPageNumber} />;
      case 'blog-category-archive':
        return <BlogArchiveView type="category" slug={blogArchiveSlug} />;
      case 'blog-tag-archive':
        return <BlogArchiveView type="tag" slug={blogArchiveSlug} />;
      case 'blog-author-archive':
        return <BlogArchiveView type="author" slug={blogArchiveSlug} />;
      default:
        // Root-level dynamic resolution: CMS page > Blog post > 404
        return <RootSlugResolverView slug={currentPage} />;
    }
  };

  const showMobileBottomNav = currentPage !== 'checkout' && !currentPage.startsWith('admin');

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed right-6 z-[110] animate-in slide-in-from-bottom-5 duration-200 ${
          showMobileBottomNav ? 'bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6' : 'bottom-6'
        }`}>
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold ${
            notification.type === 'error'
              ? 'bg-rose-900 text-white border-rose-800'
              : notification.type === 'info'
                ? 'bg-slate-900 text-white border-slate-800'
                : 'bg-emerald-900 text-white border-emerald-800'
          }`}>
            {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
            {notification.type === 'info' && <Info className="w-4 h-4 text-sky-400" />}
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Header */}
      <Header />

      {/* Dynamic View Body (Reserves bottom padding on mobile so fixed bottom bar never obscures content) */}
      <main className={`flex-1 ${showMobileBottomNav ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0' : ''}`}>
        {renderCurrentView()}
      </main>

      {/* Footer */}
      <Footer />

      {/* Slide-out Cart Drawer */}
      <CartDrawer />

      {/* WooCommerce REST API payload inspector */}
      <WooCommerceModal />

      {/* WordPress & WooCommerce Live Product Sync with Yoast SEO */}
      <WordPressSyncModal />

      {/* Floating Action Button (Quick Repair Booking on Mobile - lifted above bottom nav) */}
      <div className={`fixed z-30 lg:hidden transition-all duration-200 ${
        showMobileBottomNav 
          ? 'bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-4' 
          : 'bottom-4 left-4'
      }`}>
        <button
          onClick={() => startRepairBooking()}
          className="bg-[#DF0C88] hover:bg-[#C50875] text-white shadow-xl px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 border border-[#DF0C88]/50 active:scale-95 transition-all cursor-pointer"
        >
          <Wrench className="w-4 h-4" />
          <span>Book Repair</span>
        </button>
      </div>

      {/* Mobile Bottom Navigation Bar (Hidden on checkout & admin, visible only below 768px) */}
      {showMobileBottomNav && <MobileBottomNav />}
    </div>
  );
};

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('locationchange', onLocationChange);
    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('locationchange', onLocationChange);
    };
  }, []);

  const normalizedPath = currentPath === '/' ? '/' : currentPath.replace(/\/+$/, '');

  return (
    <AppProvider>
      {normalizedPath === '/admin-login' ? (
        <AdminProvider>
          <AdminLoginView
            onSuccess={() => {
              window.history.pushState({}, '', '/admin');
              window.dispatchEvent(new Event('locationchange'));
              setCurrentPath('/admin');
            }}
          />
        </AdminProvider>
      ) : normalizedPath === '/admin' || normalizedPath.startsWith('/admin/') ? (
        <AdminProvider>
          <AdminGate
            onRequireLogin={() => {
              window.history.pushState({}, '', '/admin-login');
              window.dispatchEvent(new Event('locationchange'));
              setCurrentPath('/admin-login');
            }}
          >
            <AdminLayout
              onLogout={() => {
                window.history.pushState({}, '', '/admin-login');
                window.dispatchEvent(new Event('locationchange'));
                setCurrentPath('/admin-login');
              }}
            />
          </AdminGate>
        </AdminProvider>
      ) : (
        <CustomerAuthProvider>
          <PublicAppContent />
        </CustomerAuthProvider>
      )}
    </AppProvider>
  );
}
