import React, { useState, useEffect } from 'react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useApp } from '../../context/AppContext';
import { customerAccountApi, WooCommerceOrder } from '../../services/customerAccountApi';
import {
  fetchPaymentConfig,
  fetchOrderPayUrl,
  createOnsiteExistingOrderIntent,
  OnsiteIntentResponse,
  AllowedPaymentMethod,
} from '../../services/paymentApi';
import { OnSiteStripeElements } from '../express-checkout/OnSiteStripeElements';
import { AccountDashboard } from './AccountDashboard';
import { AccountOrders } from './AccountOrders';
import { AccountOrderDetail } from './AccountOrderDetail';
import { AccountAddresses } from './AccountAddresses';
import { AccountDetails } from './AccountDetails';
import { AccountDownloads } from './AccountDownloads';
import { AccountPaymentMethods } from './AccountPaymentMethods';
import { AccountWishlist } from './AccountWishlist';
import { AccountGdprModal } from './AccountGdprModal';
import { GuestOrderTrackingView } from '../GuestOrderTrackingView';
import { 
  User, 
  Package, 
  MapPin, 
  CreditCard, 
  Heart, 
  Download, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  Truck, 
  ChevronRight, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight,
  AlertCircle,
  X
} from 'lucide-react';

export type AccountTab = 
  | 'dashboard'
  | 'orders'
  | 'order-detail'
  | 'downloads'
  | 'addresses'
  | 'account-details'
  | 'payment-methods'
  | 'wishlist'
  | 'track-order';

export const AccountView: React.FC = () => {
  const { customer, isAuthenticated, isLoading, logout, login, register } = useCustomerAuth();
  const { products, setCurrentPage, addToCart, setIsCartDrawerOpen, showNotification } = useApp();

  const [activeTab, setActiveTab] = useState<AccountTab>('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [orders, setOrders] = useState<WooCommerceOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [gdprModalOpen, setGdprModalOpen] = useState<boolean>(false);
  const [onsitePaySession, setOnsitePaySession] = useState<OnsiteIntentResponse | null>(null);
  const [onsiteAllowedMethods, setOnsiteAllowedMethods] = useState<AllowedPaymentMethod[]>(['card', 'apple_pay', 'google_pay']);

  // In-line Login/Register form states when guest visits /account
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Load customer orders
  const fetchOrders = async () => {
    if (!isAuthenticated) return;
    setLoadingOrders(true);
    try {
      const data = await customerAccountApi.getOrders(1, 'all');
      setOrders(data.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  const handleNavigateTab = (tab: AccountTab, extra?: any) => {
    if (tab === 'order-detail' && extra?.orderId) {
      setSelectedOrderId(extra.orderId);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderAgain = (order: WooCommerceOrder) => {
    if (!order.line_items || order.line_items.length === 0) return;
    order.line_items.forEach((item) => {
      // Re-add to app cart
      const existingProduct = products.find((p) => String(p.id) === String(item.product_id) || (p.wpId && String(p.wpId) === String(item.product_id)));
      if (existingProduct) {
        addToCart(existingProduct, item.quantity, undefined, undefined, item.variation_id);
      } else {
        addToCart(
          {
            id: String(item.product_id),
            title: item.name,
            slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            category: 'smartphone',
            brand: 'Apple',
            price: item.price || (parseFloat(item.total) / item.quantity),
            regularPrice: (item.price || (parseFloat(item.total) / item.quantity)) * 1.15,
            image: item.image?.src || 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=600&q=80',
            condition: 'Refurbished - Pristine (Grade A)',
            stockCount: 10,
            warrantyMonths: 12,
            rating: 4.9,
            reviewsCount: 140,
            inStock: true,
            description: item.name,
            specifications: {},
          },
          item.quantity,
          undefined,
          undefined,
          item.variation_id
        );
      }
    });
    showNotification('Items added back to your cart!', 'success');
    setIsCartDrawerOpen(true);
  };

  const handlePayNow = async (order: WooCommerceOrder) => {
    try {
      const cfg = await fetchPaymentConfig();
      if (cfg?.useWooHosted && cfg.handoffStyle === 'order_pay') {
        const session = await createOnsiteExistingOrderIntent(order.id, order.order_key);
        setOnsiteAllowedMethods(cfg.allowedMethods || ['card', 'apple_pay', 'google_pay']);
        setOnsitePaySession(session);
        return;
      }

      const res = await fetchOrderPayUrl(order.id);
      if (res.payUrl) {
        window.location.assign(res.payUrl);
        return;
      }
      showNotification('Payment link unavailable for this order.', 'error');
    } catch (err: any) {
      showNotification(err.message || 'Unable to launch payment form.', 'error');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    const res = await login(email, password, true);
    setAuthSubmitting(false);
    if (!res.success) {
      setAuthError(res.error || 'Invalid email or password.');
    } else {
      showNotification('Welcome back!', 'success');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!termsAccepted) {
      setAuthError('You must accept the terms & conditions to register.');
      return;
    }
    setAuthSubmitting(true);
    const res = await register({
      firstName,
      lastName,
      email,
      password,
      termsAccepted,
    });
    setAuthSubmitting(false);
    if (!res.success) {
      setAuthError(res.error || 'Failed to register account.');
    } else {
      showNotification('Account created successfully!', 'success');
    }
  };

  // If not authenticated, display login/register form
  if (!isAuthenticated && !isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white text-center">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#DF0C88] text-white">
              Customer Account
            </span>
            <h1 className="text-xl font-bold font-heading mt-2">
              {authMode === 'login' ? 'Sign In to Your Account' : 'Register Customer Account'}
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              {authMode === 'login'
                ? 'Access your orders, track repairs, and manage saved delivery addresses.'
                : 'Enjoy instant checkout, order history and warranty support.'}
            </p>

            <div className="flex bg-slate-800 p-1 rounded-xl mt-4 border border-slate-700/60">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setAuthError(null); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  authMode === 'login' ? 'bg-[#DF0C88] text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setAuthError(null); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  authMode === 'register' ? 'bg-[#DF0C88] text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          <div className="p-6">
            {authError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{authError}</span>
              </div>
            )}

            {authMode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.co.uk"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                      className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full py-3 bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold rounded-xl shadow-xs text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {authSubmitting ? 'Signing In...' : 'Sign In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                  />
                </div>

                <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-600 select-none pt-1">
                  <input
                    type="checkbox"
                    required
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-[#DF0C88] focus:ring-[#DF0C88] w-4 h-4 shrink-0"
                  />
                  <span>I agree to the Terms of Service & Privacy Policy.</span>
                </label>

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full py-3 bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold rounded-xl shadow-xs text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {authSubmitting ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <button
                onClick={() => handleNavigateTab('track-order')}
                className="text-xs text-[#DF0C88] font-semibold hover:underline flex items-center justify-center gap-1 mx-auto"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Track a Guest Order without logging in</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Logged-in Customer View
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
        <button onClick={() => setCurrentPage('home')} className="hover:text-slate-800 cursor-pointer">Home</button>
        <ChevronRight className="w-3.5 h-3.5" />
        <button onClick={() => handleNavigateTab('dashboard')} className="hover:text-slate-800 cursor-pointer">My Account</button>
        {activeTab !== 'dashboard' && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold capitalize">{activeTab.replace('-', ' ')}</span>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Sidebar / Mobile Tabs */}
        <div className="lg:col-span-1">
          {/* User Profile Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#DF0C88] to-purple-600 text-white font-bold text-lg flex items-center justify-center shadow-xs">
                {customer?.firstName ? customer.firstName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {customer?.displayName || `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || 'Valued Customer'}
                </div>
                <div className="text-xs text-slate-500 truncate">{customer?.email}</div>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-2 space-y-1">
              <button
                onClick={() => handleNavigateTab('dashboard')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-[#DF0C88] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => handleNavigateTab('orders')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'orders' || activeTab === 'order-detail'
                    ? 'bg-[#DF0C88] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4" />
                  <span>Orders</span>
                </div>
                {orders.length > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === 'orders' || activeTab === 'order-detail' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {orders.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleNavigateTab('downloads')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'downloads'
                    ? 'bg-[#DF0C88] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>Downloads</span>
              </button>

              <button
                onClick={() => handleNavigateTab('addresses')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'addresses'
                    ? 'bg-[#DF0C88] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Addresses</span>
              </button>

              <button
                onClick={() => handleNavigateTab('account-details')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'account-details'
                    ? 'bg-[#DF0C88] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Account Details</span>
              </button>

              <button
                onClick={() => handleNavigateTab('payment-methods')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'payment-methods'
                    ? 'bg-[#DF0C88] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Payment Methods</span>
              </button>

              <button
                onClick={() => handleNavigateTab('wishlist')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'wishlist'
                    ? 'bg-[#DF0C88] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Heart className="w-4 h-4" />
                <span>Wishlist</span>
              </button>

              <button
                onClick={() => handleNavigateTab('track-order')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'track-order'
                    ? 'bg-[#DF0C88] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Track an Order</span>
              </button>

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => setGdprModalOpen(true)}
                  className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Privacy Rights & GDPR</span>
                </button>

                <button
                  onClick={() => logout()}
                  className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </nav>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {activeTab === 'dashboard' && customer && (
            <AccountDashboard
              customer={customer}
              orders={orders}
              onNavigateTab={(tab, extra) => handleNavigateTab(tab as AccountTab, extra)}
              onLogout={logout}
            />
          )}

          {activeTab === 'orders' && (
            <AccountOrders
              orders={orders}
              loading={loadingOrders}
              onSelectOrder={(orderId) => {
                setSelectedOrderId(orderId);
                setActiveTab('order-detail');
              }}
              onRefresh={fetchOrders}
            />
          )}

          {activeTab === 'order-detail' && selectedOrderId && (
            <AccountOrderDetail
              orderId={selectedOrderId}
              onBack={() => setActiveTab('orders')}
              onOrderAgain={handleOrderAgain}
              onPayNow={handlePayNow}
            />
          )}

          {activeTab === 'addresses' && customer && (
            <AccountAddresses customer={customer} />
          )}

          {activeTab === 'account-details' && customer && (
            <AccountDetails customer={customer} />
          )}

          {activeTab === 'downloads' && (
            <AccountDownloads />
          )}

          {activeTab === 'payment-methods' && (
            <AccountPaymentMethods />
          )}

          {activeTab === 'wishlist' && (
            <AccountWishlist />
          )}

          {activeTab === 'track-order' && (
            <GuestOrderTrackingView />
          )}
        </div>
      </div>

      {/* GDPR Data Request Modal */}
      {customer && (
        <AccountGdprModal
          customer={customer}
          isOpen={gdprModalOpen}
          onClose={() => setGdprModalOpen(false)}
        />
      )}

      {/* On-Site Pending Order Payment Modal (Style 2 — Zero Redirect) */}
      {onsitePaySession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 my-auto">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#DF0C88]" />
                <span className="text-sm font-bold">
                  Pay Order #{onsitePaySession.orderNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOnsitePaySession(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600 font-medium">Amount Due</span>
                <span className="text-base font-extrabold text-[#DF0C88]">
                  £{parseFloat(onsitePaySession.total).toFixed(2)}
                </span>
              </div>

              <OnSiteStripeElements
                publishableKey={onsitePaySession.publishableKey}
                clientSecret={onsitePaySession.clientSecret}
                orderId={onsitePaySession.orderId}
                orderNumber={onsitePaySession.orderNumber}
                orderKey={onsitePaySession.orderKey}
                amountLabel={`£${parseFloat(onsitePaySession.total).toFixed(2)}`}
                allowedMethods={onsiteAllowedMethods}
                onPaymentSuccess={({ orderNumber }) => {
                  setOnsitePaySession(null);
                  showNotification(`Payment confirmed for Order #${orderNumber}!`, 'success');
                  fetchOrders();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
