import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import {
  CreditCard,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Smartphone,
  Eye,
  EyeOff,
  ShoppingBag,
  Layers,
  Terminal,
  Activity,
  Check,
  X,
  Lock,
} from 'lucide-react';

export const ExpressCheckoutSettingsView: React.FC = () => {
  const { adminUser } = useAdmin();
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Diagnostic tests state
  const [isTesting, setIsTesting] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState({
    enabled: true,
    mode: 'test',
    testPublishableKey: '',
    testSecretKey: '',
    livePublishableKey: '',
    liveSecretKey: '',
    webhookSecret: '',
    enableProductPage: true,
    enableCartPage: true,
    enableMiniCart: false,
    enableCheckoutPage: false,
    enableApplePay: true,
    enableGooglePay: true,
    enableLink: true,
    buttonTheme: 'black',
    buttonType: 'plain',
    buttonHeight: 46,
    buttonBorderRadius: 5,
    buttonColumns: 2,
    buttonGap: 10,
    showDivider: false,
    dividerText: 'Express checkout',
    unselectedVariationAction: 'disable',
    helperText: 'Select options to use express checkout',
    allowGuestCheckout: true,
    collectPhoneNumber: true,
    appleMerchantId: 'merchant.com.irepairmobiles.uk',
  });

  const [showTestSecret, setShowTestSecret] = useState(false);
  const [showLiveSecret, setShowLiveSecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  // Load existing settings
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/express-checkout/settings', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('cms_auth_token') || ''}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setFormData({
          enabled: Boolean(data.enabled),
          mode: data.mode || 'test',
          testPublishableKey: data.testPublishableKey || '',
          testSecretKey: data.testSecretKeyMasked || '',
          livePublishableKey: data.livePublishableKey || '',
          liveSecretKey: data.liveSecretKeyMasked || '',
          webhookSecret: data.webhookSecretMasked || '',
          enableProductPage: Boolean(data.enableProductPage),
          enableCartPage: Boolean(data.enableCartPage),
          enableMiniCart: Boolean(data.enableMiniCart),
          enableCheckoutPage: Boolean(data.enableCheckoutPage),
          enableApplePay: Boolean(data.enableApplePay),
          enableGooglePay: Boolean(data.enableGooglePay),
          enableLink: Boolean(data.enableLink),
          buttonTheme: data.buttonTheme || 'black',
          buttonType: data.buttonType || 'buy',
          buttonHeight: Number(data.buttonHeight) || 48,
          buttonBorderRadius: Number(data.buttonBorderRadius) || 12,
          buttonColumns: Number(data.buttonColumns) || 2,
          buttonGap: Number(data.buttonGap) || 8,
          showDivider: Boolean(data.showDivider),
          dividerText: data.dividerText || 'Express checkout',
          unselectedVariationAction: data.unselectedVariationAction || 'disable',
          helperText: data.helperText || 'Select options to use express checkout',
          allowGuestCheckout: Boolean(data.allowGuestCheckout),
          collectPhoneNumber: Boolean(data.collectPhoneNumber),
          appleMerchantId: data.appleMerchantId || 'merchant.com.irepairmobiles.uk',
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load express settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      setErrorMessage(null);

      const res = await fetch('/api/admin/express-checkout/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('cms_auth_token') || ''}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSaveSuccess(true);
      loadSettings();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunDiagnostics = async () => {
    try {
      setIsTesting(true);
      setDiagnosticResult(null);

      const res = await fetch('/api/admin/express-checkout/test-config', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('cms_auth_token') || ''}`,
        },
      });
      const data = await res.json();
      setDiagnosticResult(data);
    } catch (err: any) {
      setDiagnosticResult({
        allPassed: false,
        error: err.message || 'Network error running diagnostics',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <RefreshCw className="w-8 h-8 text-[#DF0C88] animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading Express Checkout configuration...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#DF0C88] to-pink-500 text-white flex items-center justify-center shadow-sm">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-heading">
                Express Checkout Gateway (Apple Pay & Google Pay)
              </h1>
              <p className="text-xs text-slate-500">
                1-tap direct checkout on product pages powered by Stripe & WooCommerce
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {formData.mode === 'test' ? (
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>TEST MODE ACTIVE</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>LIVE MODE ACTIVE</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleRunDiagnostics}
            disabled={isTesting}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Activity className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Testing...' : 'Test Configuration'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Express Checkout settings updated successfully! Changes are active in the storefront.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Diagnostics Results Panel */}
      {diagnosticResult && (
        <div className={`p-5 rounded-2xl border text-xs space-y-3.5 ${diagnosticResult.allPassed ? 'bg-emerald-50/70 border-emerald-200' : 'bg-amber-50/70 border-amber-200'}`}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#DF0C88]" />
              Diagnostic Test Results
            </h3>
            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${diagnosticResult.allPassed ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'}`}>
              {diagnosticResult.allPassed ? 'ALL CHECKS PASSED' : 'ATTENTION REQUIRED'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Stripe API */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">1. Stripe API Keys</span>
                {diagnosticResult.stripeKeys?.pass ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <X className="w-4 h-4 text-rose-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-600">{diagnosticResult.stripeKeys?.message}</p>
            </div>

            {/* Apple Pay Domain */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">2. Apple Pay Domain File</span>
                {diagnosticResult.applePayDomain?.pass ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <X className="w-4 h-4 text-rose-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-600">{diagnosticResult.applePayDomain?.message}</p>
            </div>

            {/* Webhook */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">3. Stripe Webhook Endpoint</span>
                {diagnosticResult.webhookStatus?.pass ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <X className="w-4 h-4 text-rose-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-600">{diagnosticResult.webhookStatus?.message}</p>
            </div>

            {/* Shipping Zones */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">4. UK Shipping & Tax Rates</span>
                {diagnosticResult.shippingZones?.pass ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <X className="w-4 h-4 text-rose-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-600">{diagnosticResult.shippingZones?.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Section 1: Master Enable & Environment Modes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#DF0C88]" />
            Gateway Status & Environment
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 cursor-pointer bg-slate-50">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="mt-1 w-4 h-4 text-[#DF0C88] rounded"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Enable Express Checkout Globally</span>
                <span className="text-[11px] text-slate-500">
                  Activates Apple Pay, Google Pay, and Link express buttons across supported store locations.
                </span>
              </div>
            </label>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="text-xs font-bold text-slate-900 block">Environment Mode</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="test"
                    checked={formData.mode === 'test'}
                    onChange={() => setFormData({ ...formData, mode: 'test' })}
                    className="text-[#DF0C88]"
                  />
                  <span>Test Mode (Sandbox)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="live"
                    checked={formData.mode === 'live'}
                    onChange={() => setFormData({ ...formData, mode: 'live' })}
                    className="text-[#DF0C88]"
                  />
                  <span>Live Production</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Placements & Supported Wallets */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#DF0C88]" />
            Locations & Supported Wallets
          </h2>

          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold text-slate-800 block mb-2">Display Locations</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:border-pink-300">
                  <input
                    type="checkbox"
                    checked={formData.enableProductPage}
                    onChange={(e) => setFormData({ ...formData, enableProductPage: e.target.checked })}
                    className="text-[#DF0C88] rounded"
                  />
                  <span className="font-semibold">Product Page (Row 2)</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:border-pink-300">
                  <input
                    type="checkbox"
                    checked={formData.enableCartPage}
                    onChange={(e) => setFormData({ ...formData, enableCartPage: e.target.checked })}
                    className="text-[#DF0C88] rounded"
                  />
                  <span className="font-semibold">Cart Page</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:border-pink-300">
                  <input
                    type="checkbox"
                    checked={formData.enableMiniCart}
                    onChange={(e) => setFormData({ ...formData, enableMiniCart: e.target.checked })}
                    className="text-[#DF0C88] rounded"
                  />
                  <span className="font-semibold">Mini Cart Drawer</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:border-pink-300">
                  <input
                    type="checkbox"
                    checked={formData.enableCheckoutPage}
                    onChange={(e) => setFormData({ ...formData, enableCheckoutPage: e.target.checked })}
                    className="text-[#DF0C88] rounded"
                  />
                  <span className="font-semibold">Top of Checkout</span>
                </label>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-800 block mb-2">Supported Digital Wallets</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:border-pink-300">
                  <input
                    type="checkbox"
                    checked={formData.enableApplePay}
                    onChange={(e) => setFormData({ ...formData, enableApplePay: e.target.checked })}
                    className="text-[#DF0C88] rounded"
                  />
                  <div>
                    <span className="font-bold block"> Apple Pay</span>
                    <span className="text-[10px] text-slate-500">Safari on iOS / macOS</span>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:border-pink-300">
                  <input
                    type="checkbox"
                    checked={formData.enableGooglePay}
                    onChange={(e) => setFormData({ ...formData, enableGooglePay: e.target.checked })}
                    className="text-[#DF0C88] rounded"
                  />
                  <div>
                    <span className="font-bold block">GPay Google Pay</span>
                    <span className="text-[10px] text-slate-500">Chrome & Android</span>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:border-pink-300">
                  <input
                    type="checkbox"
                    checked={formData.enableLink}
                    onChange={(e) => setFormData({ ...formData, enableLink: e.target.checked })}
                    className="text-[#DF0C88] rounded"
                  />
                  <div>
                    <span className="font-bold block">Link by Stripe</span>
                    <span className="text-[10px] text-slate-500">Fast 1-click checkout</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Stripe API Keys (Masked & Encrypted) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#DF0C88]" />
              Stripe Credentials (AES-256-GCM Encrypted)
            </h2>
            <span className="text-[11px] text-slate-400">Secret keys are never sent to browser</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Test Publishable Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Test Publishable Key</label>
              <input
                type="text"
                placeholder="pk_test_..."
                value={formData.testPublishableKey}
                onChange={(e) => setFormData({ ...formData, testPublishableKey: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
              />
            </div>

            {/* Test Secret Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Test Secret Key</label>
              <div className="relative">
                <input
                  type={showTestSecret ? 'text' : 'password'}
                  placeholder="sk_test_..."
                  value={formData.testSecretKey}
                  onChange={(e) => setFormData({ ...formData, testSecretKey: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowTestSecret(!showTestSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showTestSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Live Publishable Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Live Publishable Key</label>
              <input
                type="text"
                placeholder="pk_live_..."
                value={formData.livePublishableKey}
                onChange={(e) => setFormData({ ...formData, livePublishableKey: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
              />
            </div>

            {/* Live Secret Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Live Secret Key</label>
              <div className="relative">
                <input
                  type={showLiveSecret ? 'text' : 'password'}
                  placeholder="sk_live_..."
                  value={formData.liveSecretKey}
                  onChange={(e) => setFormData({ ...formData, liveSecretKey: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowLiveSecret(!showLiveSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showLiveSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Button Style & Layout Options */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#DF0C88]" />
            Button Style & UX Customisation
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Button Theme */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Button Theme</label>
              <select
                value={formData.buttonTheme}
                onChange={(e) => setFormData({ ...formData, buttonTheme: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none"
              >
                <option value="black">Black (Default - Matches Screenshot)</option>
                <option value="white">White</option>
                <option value="white-outline">White with Outline</option>
              </select>
            </div>

            {/* Button Type */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Call to Action Type</label>
              <select
                value={formData.buttonType}
                onChange={(e) => setFormData({ ...formData, buttonType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none"
              >
                <option value="buy">Buy with Apple/Google Pay</option>
                <option value="plain">Plain (Logo Only)</option>
                <option value="checkout">Checkout</option>
                <option value="book">Book</option>
                <option value="donate">Donate</option>
              </select>
            </div>

            {/* Button Height */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Button Height (40-55px)</label>
              <input
                type="number"
                min={40}
                max={55}
                value={formData.buttonHeight}
                onChange={(e) => setFormData({ ...formData, buttonHeight: parseInt(e.target.value, 10) || 48 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none"
              />
            </div>

            {/* Border Radius */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Border Radius (px)</label>
              <input
                type="number"
                min={0}
                max={25}
                value={formData.buttonBorderRadius}
                onChange={(e) => setFormData({ ...formData, buttonBorderRadius: parseInt(e.target.value, 10) || 12 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none"
              />
            </div>

            {/* Columns */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Layout Columns (Desktop/Tablet)</label>
              <select
                value={formData.buttonColumns}
                onChange={(e) => setFormData({ ...formData, buttonColumns: parseInt(e.target.value, 10) || 2 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none"
              >
                <option value={2}>2 Equal Columns (Side-by-side)</option>
                <option value={1}>1 Column (Stacked Full Width)</option>
              </select>
            </div>

            {/* Unselected Variation Behavior */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Unselected Variations</label>
              <select
                value={formData.unselectedVariationAction}
                onChange={(e) => setFormData({ ...formData, unselectedVariationAction: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none"
              >
                <option value="disable">Disable with helper message (Recommended)</option>
                <option value="hide">Hide completely until chosen</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Helper text when options are required</label>
              <input
                type="text"
                value={formData.helperText}
                onChange={(e) => setFormData({ ...formData, helperText: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Optional Section Divider Label</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.showDivider}
                  onChange={(e) => setFormData({ ...formData, showDivider: e.target.checked })}
                  className="w-4 h-4 text-[#DF0C88] rounded"
                />
                <input
                  type="text"
                  disabled={!formData.showDivider}
                  value={formData.dividerText}
                  onChange={(e) => setFormData({ ...formData, dividerText: e.target.value })}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none disabled:opacity-50"
                  placeholder="Express checkout"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allowGuestCheckout}
                onChange={(e) => setFormData({ ...formData, allowGuestCheckout: e.target.checked })}
                className="text-[#DF0C88] rounded"
              />
              <span className="font-semibold text-slate-700">Allow Guest Express Checkout (On by default)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.collectPhoneNumber}
                onChange={(e) => setFormData({ ...formData, collectPhoneNumber: e.target.checked })}
                className="text-[#DF0C88] rounded"
              />
              <span className="font-semibold text-slate-700">Collect Phone Number in Wallet Sheet</span>
            </label>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-400">Storefront Visual Preview</span>
            <span className="text-slate-400">Desktop & Mobile responsive preview</span>
          </div>

          <div className="bg-white text-slate-900 p-5 rounded-xl border border-slate-800 max-w-lg mx-auto space-y-3">
            {formData.showDivider && (
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {formData.dividerText || 'Express checkout'}
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>
            )}

            <div className={`grid ${formData.buttonColumns === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-2.5`}>
              {formData.enableApplePay && (
                <div
                  style={{
                    height: `${formData.buttonHeight}px`,
                    borderRadius: `${formData.buttonBorderRadius}px`,
                  }}
                  className={`flex items-center justify-center font-medium text-[16px] select-none transition-all shadow-xs ${
                    formData.buttonTheme === 'white'
                      ? 'bg-white text-black border border-slate-200'
                      : formData.buttonTheme === 'white-outline'
                      ? 'bg-white text-black border-2 border-black'
                      : 'bg-black text-white'
                  }`}
                >
                  {formData.buttonType === 'buy' && <span className="text-xs mr-1.5 font-normal">Buy with</span>}
                  <svg className="w-[15px] h-[18px] mr-1 -mt-0.5 fill-current" viewBox="0 0 170 170" aria-hidden="true">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.13-1.9-14.34-6.08-3.69-3.03-7.61-7.8-11.77-14.32-5.04-7.82-9.24-16.84-12.6-27.08-3.57-10.74-5.36-20.99-5.36-30.77 0-11.43 2.94-20.98 8.81-28.65 5.88-7.66 13.28-11.67 22.22-12.01 4.46 0 9.6 1.29 15.42 3.85 5.82 2.57 9.57 3.91 11.25 4.02 1.34 0 5.47-1.56 12.39-4.69 6.53-2.9 12.05-4.13 16.57-3.69 12.16.98 21.31 5.79 27.45 14.42-10.88 6.61-16.21 15.88-15.99 27.81.22 9.29 3.63 17.01 10.22 23.16 4.46 4.24 9.75 7.03 15.88 8.37-1.12 3.57-2.46 7.03-4.02 10.38zM119.22 31.02c0 7.26-2.65 14.04-7.96 20.34-6.41 7.48-14.16 11.79-22.58 11.12-.11-.89-.17-1.84-.17-2.85 0-6.98 3.04-14.44 8.51-20.66 2.72-3.13 6.18-5.73 10.38-7.81 4.19-2.06 8.15-3.2 11.88-3.41.11 1.12.17 2.24.17 3.27z" />
                  </svg>
                  <span className="tracking-tight">Pay</span>
                </div>
              )}

              {formData.enableGooglePay && (
                <div
                  style={{
                    height: `${formData.buttonHeight}px`,
                    borderRadius: `${formData.buttonBorderRadius}px`,
                  }}
                  className={`flex items-center justify-center font-medium text-[16px] select-none transition-all shadow-xs ${
                    formData.buttonTheme === 'white' || formData.buttonTheme === 'white-outline'
                      ? 'bg-white text-slate-900 border border-slate-300'
                      : 'bg-black text-white'
                  }`}
                >
                  {formData.buttonType === 'buy' && <span className="text-xs mr-1.5 font-normal">Buy with</span>}
                  <svg className="w-[17px] h-[17px] mr-1.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z" />
                  </svg>
                  <span className="tracking-tight">Pay</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Express Checkout Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
