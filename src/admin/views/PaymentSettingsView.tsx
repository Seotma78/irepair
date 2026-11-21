import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Save,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Sliders,
  Smartphone,
  Eye,
  EyeOff,
  Layers,
  Activity,
  Check,
  X,
  Lock,
  Copy,
  Download,
  Code,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { clearCachedPaymentConfig } from '../../services/paymentApi';

type AllowedMethod = 'card' | 'apple_pay' | 'google_pay';

export const PaymentSettingsView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [backendOrigin, setBackendOrigin] = useState('');

  // Diagnostics & Plugin Modal
  const [isTesting, setIsTesting] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [showPluginDrawer, setShowPluginDrawer] = useState(false);
  const [pluginCode, setPluginCode] = useState('');
  const [loadingPlugin, setLoadingPlugin] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    useWooHosted: true,
    isProductionForced: false,
    environment: 'development',
    handoffStyle: 'hosted_checkout' as 'hosted_checkout' | 'order_pay',
    wooHostedBaseUrl: '',
    wordpressSourceUrl: 'https://irepair-mobiles.co.uk',
    returnUrlBase: '',
    cancelUrlBase: '',
    handoffSecret: '',
    allowedMethods: ['card', 'apple_pay', 'google_pay'] as AllowedMethod[],
    enableProductPage: true,
    enableCartPage: true,
    enableMiniCart: true,
    enableCheckoutPage: true,
    buttonTheme: 'black' as 'black' | 'white' | 'white-outline',
    buttonType: 'plain' as 'buy' | 'plain' | 'book' | 'donate' | 'checkout',
    buttonHeight: 46,
    buttonBorderRadius: 5,
    buttonColumns: 2,
    buttonGap: 10,
    showDivider: false,
    dividerText: 'Express checkout',
    unselectedVariationAction: 'disable' as 'disable' | 'hide',
    helperText: 'Select options to use express checkout',
    abandonedOrderMinutes: 60,
    dispatchNote: 'Your order is being prepared for dispatch from our UK hub.',
    supportEmail: 'info@irepair-mobiles.co.uk',
  });

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token') || '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await fetch('/api/admin/payments/settings', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load payment settings');
      }
      const s = data.settings;
      setBackendOrigin(data.backendOrigin || window.location.origin);
      setFormData({
        useWooHosted: Boolean(s.useWooHosted),
        isProductionForced: Boolean(s.isProductionForced),
        environment: s.environment || 'development',
        handoffStyle: s.handoffStyle === 'order_pay' ? 'order_pay' : 'hosted_checkout',
        wooHostedBaseUrl: s.wooHostedBaseUrl || '',
        wordpressSourceUrl: s.wordpressSourceUrl || 'https://irepair-mobiles.co.uk',
        returnUrlBase: s.returnUrlBase || '',
        cancelUrlBase: s.cancelUrlBase || '',
        handoffSecret: s.handoffSecretMasked || '',
        allowedMethods: Array.isArray(s.allowedMethods) && s.allowedMethods.length > 0
          ? s.allowedMethods
          : ['card', 'apple_pay', 'google_pay'],
        enableProductPage: Boolean(s.enableProductPage),
        enableCartPage: Boolean(s.enableCartPage),
        enableMiniCart: Boolean(s.enableMiniCart),
        enableCheckoutPage: Boolean(s.enableCheckoutPage),
        buttonTheme: s.buttonTheme || 'black',
        buttonType: s.buttonType || 'plain',
        buttonHeight: Number(s.buttonHeight) || 46,
        buttonBorderRadius: s.buttonBorderRadius != null ? Number(s.buttonBorderRadius) : 5,
        buttonColumns: Number(s.buttonColumns) === 1 ? 1 : 2,
        buttonGap: Number(s.buttonGap) || 10,
        showDivider: Boolean(s.showDivider),
        dividerText: s.dividerText || 'Express checkout',
        unselectedVariationAction: s.unselectedVariationAction === 'hide' ? 'hide' : 'disable',
        helperText: s.helperText || 'Select options to use express checkout',
        abandonedOrderMinutes: Number(s.abandonedOrderMinutes) || 60,
        dispatchNote: s.dispatchNote || 'Your order is being prepared for dispatch from our UK hub.',
        supportEmail: s.supportEmail || 'info@irepair-mobiles.co.uk',
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load payment settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const toggleAllowedMethod = (method: AllowedMethod) => {
    setFormData((prev) => {
      const exists = prev.allowedMethods.includes(method);
      const next = exists
        ? prev.allowedMethods.filter((m) => m !== method)
        : [...prev.allowedMethods, method];
      if (next.length === 0) return prev; // Keep at least one of the 3 allowed Stripe methods
      return { ...prev, allowedMethods: next };
    });
  };

  const handleSave = async (e?: React.FormEvent, extra?: Record<string, any>) => {
    if (e) e.preventDefault();
    try {
      setIsSaving(true);
      setSaveSuccess(null);
      setErrorMessage(null);

      const res = await fetch('/api/admin/payments/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ ...formData, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save payment settings');
      }
      clearCachedPaymentConfig();
      setSaveSuccess(extra?.regenerateSecret ? 'Shared Handoff Secret regenerated. Copy the new secret into WordPress Settings > iRepair Bridge.' : 'Payment gateway settings saved.');
      await loadSettings();
      setTimeout(() => setSaveSuccess(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunDiagnostics = async () => {
    try {
      setIsTesting(true);
      setDiagnosticResult(null);
      const res = await fetch('/api/admin/payments/test-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          handoffStyle: formData.handoffStyle,
          wooHostedBaseUrl: formData.wooHostedBaseUrl,
          useWooHosted: formData.useWooHosted,
        }),
      });
      const data = await res.json();
      setDiagnosticResult(data);
    } catch (err: any) {
      setDiagnosticResult({
        allPassed: false,
        checks: [
          {
            key: 'error',
            title: 'Diagnostic Request Error',
            status: 'fail',
            message: err.message || 'Network error running diagnostics',
          },
        ],
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCleanupAbandoned = async () => {
    try {
      setIsCleaningUp(true);
      const res = await fetch('/api/admin/payments/cleanup-abandoned', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cleanup failed');
      setSaveSuccess(`Cleanup complete: ${data.cancelledCount || 0} abandoned pending WooCommerce order(s) cancelled.`);
      setTimeout(() => setSaveSuccess(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleOpenPluginDrawer = async () => {
    setShowPluginDrawer(true);
    if (pluginCode) return;
    try {
      setLoadingPlugin(true);
      const res = await fetch('/api/admin/payments/plugin-source', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.content) {
        setPluginCode(data.content);
      } else {
        setErrorMessage(data.error || 'Failed to load WordPress mini-plugin source');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoadingPlugin(false);
    }
  };

  const handleCopy = (label: string, value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadPlugin = () => {
    if (!pluginCode) return;
    const blob = new Blob([pluginCode], { type: 'application/x-php' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'irepair-headless-checkout-bridge.php';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <RefreshCw className="w-8 h-8 text-[#DF0C88] animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading Payment Gateway settings...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#DF0C88] to-pink-500 text-white flex items-center justify-center shadow-sm shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-heading">
              Settings &gt; Payments
            </h1>
            <p className="text-xs text-slate-500">
              Real WooCommerce Hosted Stripe Payment Gateway (Card, Apple Pay &amp; Google Pay)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
              formData.useWooHosted
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-100 text-amber-900 border-amber-300'
            }`}
          >
            {formData.useWooHosted ? 'Hosted WooCommerce Stripe Active' : 'Simulated Dev Mode (No Real Money)'}
          </span>

          <button
            type="button"
            onClick={handleOpenPluginDrawer}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Code className="w-3.5 h-3.5 text-[#DF0C88]" />
            <span>WordPress Mini-Plugin</span>
          </button>

          <button
            type="button"
            onClick={handleRunDiagnostics}
            disabled={isTesting}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Activity className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Running 8 Checks...' : 'Test Configuration'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 8-Check Diagnostics Results */}
      {diagnosticResult && (
        <div
          className={`p-5 rounded-2xl border text-xs space-y-4 ${
            diagnosticResult.allPassed
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-amber-50/70 border-amber-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#DF0C88]" />
                Hosted WooCommerce &amp; Stripe Diagnostics (8 Checks)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Target WP Host: <span className="font-mono">{diagnosticResult.wooHostedBaseUrl}</span> · Detected WP Stripe Mode:{' '}
                <strong className="uppercase">{diagnosticResult.stripeMode || 'unknown'}</strong>
              </p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                diagnosticResult.allPassed
                  ? 'bg-emerald-200 text-emerald-900'
                  : 'bg-amber-200 text-amber-900'
              }`}
            >
              {diagnosticResult.allPassed
                ? diagnosticResult.hasWarnings
                  ? 'PASSED WITH WARNINGS'
                  : 'ALL 8 CHECKS PASSED'
                : 'ACTION REQUIRED'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(diagnosticResult.checks || []).map((chk: any) => (
              <div key={chk.key} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-800">{chk.title}</span>
                  {chk.status === 'pass' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] shrink-0">
                      <Check className="w-3 h-3" /> PASS
                    </span>
                  ) : chk.status === 'warn' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px] shrink-0">
                      <AlertTriangle className="w-3 h-3" /> WARN
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px] shrink-0">
                      <X className="w-3 h-3" /> FAIL
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">{chk.message}</p>
                {chk.details && (
                  <p className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-100">
                    {chk.details}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={(e) => handleSave(e)} className="space-y-6">
        {/* Section 1: Master Setting - Use WooCommerce payment gateway (hosted) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#DF0C88]" />
              WooCommerce Payment Gateway Mode
            </h2>
            <span className="text-[11px] font-mono text-slate-500">
              Runtime Environment: <strong>{formData.environment}</strong>
            </span>
          </div>

          <label
            className={`flex items-start gap-3.5 p-4 rounded-xl border-2 transition-colors ${
              formData.useWooHosted
                ? 'border-emerald-500 bg-emerald-50/40'
                : 'border-amber-400 bg-amber-50/60'
            } ${formData.isProductionForced ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input
              type="checkbox"
              checked={formData.useWooHosted}
              disabled={formData.isProductionForced}
              onChange={(e) => setFormData({ ...formData, useWooHosted: e.target.checked })}
              className="mt-1 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  Use WooCommerce payment gateway (hosted)
                </span>
                {formData.isProductionForced && (
                  <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-bold uppercase flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked ON in Production
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                When ON (recommended &amp; forced in Production), <strong>every</strong> payment entry point across the website (Product page Apple Pay / Google Pay buttons, Cart, Mini Cart, Checkout, and Account "Pay now") uses ONLY the real <strong>WooCommerce Stripe Payment Gateway</strong> hosted on WordPress. Built-in simulated payment routes return HTTP 403 and cannot run.
              </p>
            </div>
          </label>

          {!formData.useWooHosted && !formData.isProductionForced && (
            <div className="p-4 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-950 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="block font-bold">
                  SIMULATED PAYMENT MODE ACTIVE (Development / Staging Only)
                </strong>
                <p>
                  Every storefront checkout page will display a clear <strong>"SIMULATED PAYMENT, NO REAL MONEY"</strong> banner. Orders are prefixed with <code>TEST-</code>, stored locally for UI testing only, never written to WooCommerce, and never send customer emails.
                </p>
              </div>
            </div>
          )}

          {/* Checkout Flow Style */}
          <div className="pt-2 space-y-2">
            <span className="text-xs font-bold text-slate-800 block">
              Checkout Flow Style (when Hosted Gateway is ON)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  formData.handoffStyle === 'hosted_checkout'
                    ? 'border-[#DF0C88] bg-pink-50/40'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <input
                    type="radio"
                    name="handoffStyle"
                    checked={formData.handoffStyle === 'hosted_checkout'}
                    onChange={() => setFormData({ ...formData, handoffStyle: 'hosted_checkout' })}
                    className="text-[#DF0C88]"
                  />
                  <span>Style 1: Direct WooCommerce Hosted Checkout (Recommended)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 pl-6">
                  Redirects directly via single-use signed handoff to WordPress Checkout where Stripe Card, Apple Pay &amp; Google Pay run without duplicate address forms.
                </p>
              </label>

              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  formData.handoffStyle === 'order_pay'
                    ? 'border-[#DF0C88] bg-pink-50/40'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <input
                    type="radio"
                    name="handoffStyle"
                    checked={formData.handoffStyle === 'order_pay'}
                    onChange={() => setFormData({ ...formData, handoffStyle: 'order_pay' })}
                    className="text-[#DF0C88]"
                  />
                  <span>Style 2: On-Site React Checkout &amp; Stripe Payment (No Redirect)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 pl-6">
                  Collects contact &amp; UK address on React Checkout using live WooCommerce shipping rates, creates the WooCommerce order, and completes Card, Apple Pay &amp; Google Pay directly inside React via WooCommerce &amp; Stripe APIs without redirecting to WordPress.
                </p>
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Allowed Payment Methods (STRICTLY Card, Apple Pay, Google Pay ONLY) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#DF0C88]" />
              Allowed Payment Methods (Stripe Only)
            </h2>
            <span className="text-[11px] text-slate-500">
              No Bank Transfer, Cash on Delivery, PayPal, Klarna, Clearpay, or Link
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <label className="flex items-start gap-2.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:border-pink-300">
              <input
                type="checkbox"
                checked={formData.allowedMethods.includes('card')}
                onChange={() => toggleAllowedMethod('card')}
                className="mt-0.5 text-[#DF0C88] rounded"
              />
              <div>
                <span className="font-bold text-slate-900 block">Debit / Credit Card</span>
                <span className="text-[10px] text-slate-500">Visa, Mastercard, Amex via Stripe</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:border-pink-300">
              <input
                type="checkbox"
                checked={formData.allowedMethods.includes('apple_pay')}
                onChange={() => toggleAllowedMethod('apple_pay')}
                className="mt-0.5 text-[#DF0C88] rounded"
              />
              <div>
                <span className="font-bold text-slate-900 block">&#63743; Apple Pay</span>
                <span className="text-[10px] text-slate-500">Express &amp; Hosted Stripe Checkout</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:border-pink-300">
              <input
                type="checkbox"
                checked={formData.allowedMethods.includes('google_pay')}
                onChange={() => toggleAllowedMethod('google_pay')}
                className="mt-0.5 text-[#DF0C88] rounded"
              />
              <div>
                <span className="font-bold text-slate-900 block">Google Pay</span>
                <span className="text-[10px] text-slate-500">Express &amp; Hosted Stripe Checkout</span>
              </div>
            </label>
          </div>
        </div>

        {/* Section 3: Hosted Checkout URLs, Handoff Secret & Confirmation Settings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#DF0C88]" />
              Hosted Checkout URLs &amp; Handoff Security
            </h2>
            <span className="text-[11px] text-slate-400">Handoff secret encrypted with AES-256-GCM at rest</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="font-semibold text-slate-700 block">
                WooCommerce Hosted Base URL
              </label>
              <input
                type="url"
                value={formData.wooHostedBaseUrl}
                onChange={(e) => setFormData({ ...formData, wooHostedBaseUrl: e.target.value })}
                placeholder={formData.wordpressSourceUrl || 'https://irepair-mobiles.co.uk'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
              />
              <p className="text-[11px] text-slate-500">
                Defaults to WordPress source URL (<code>{formData.wordpressSourceUrl}</code>). Change this cleanly to <code>https://old.irepair-mobiles.co.uk</code> at launch when React moves onto the main domain.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">
                Order Confirmation Return URL Override (Optional)
              </label>
              <input
                type="url"
                value={formData.returnUrlBase}
                onChange={(e) => setFormData({ ...formData, returnUrlBase: e.target.value })}
                placeholder={`${backendOrigin}/order-confirmation`}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">
                Cancel Return URL Override (Optional)
              </label>
              <input
                type="url"
                value={formData.cancelUrlBase}
                onChange={(e) => setFormData({ ...formData, cancelUrlBase: e.target.value })}
                placeholder={`${backendOrigin}/cart`}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="font-semibold text-slate-700 block">
                Shared HMAC Handoff Secret (Sync with WordPress Settings &rarr; iRepair Bridge)
              </label>
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[240px]">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={formData.handoffSecret}
                    onChange={(e) => setFormData({ ...formData, handoffSecret: e.target.value })}
                    placeholder="Enter or regenerate 64-char HMAC secret..."
                    className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleSave(undefined, { regenerateSecret: true })}
                  disabled={isSaving}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  Regenerate Secret
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Note: For security, masked values (`••••`) are never returned once saved. Enter a new secret or click <strong>Regenerate Secret</strong> to generate a fresh key, then copy it into WordPress before saving if rotating.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">
                Abandoned Pending Order Cleanup (Minutes)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={10}
                  max={1440}
                  value={formData.abandonedOrderMinutes}
                  onChange={(e) => setFormData({ ...formData, abandonedOrderMinutes: parseInt(e.target.value, 10) || 60 })}
                  className="w-28 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleCleanupAbandoned}
                  disabled={isCleaningUp}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isCleaningUp ? 'Cleaning...' : 'Cancel Expired Pending Orders Now'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">
                Customer Support Email (Shown if confirmation times out)
              </label>
              <input
                type="email"
                value={formData.supportEmail}
                onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="font-semibold text-slate-700 block">
                Order Confirmation Fulfillment / Dispatch Note
              </label>
              <input
                type="text"
                value={formData.dispatchNote}
                onChange={(e) => setFormData({ ...formData, dispatchNote: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Express Button Placements & Appearance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#DF0C88]" />
            Express Button Placements &amp; Styling
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:border-pink-300">
              <input
                type="checkbox"
                checked={formData.enableProductPage}
                onChange={(e) => setFormData({ ...formData, enableProductPage: e.target.checked })}
                className="text-[#DF0C88] rounded"
              />
              <span className="font-semibold">Product Page</span>
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
              <span className="font-semibold">Checkout Page</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Button Theme</label>
              <select
                value={formData.buttonTheme}
                onChange={(e) => setFormData({ ...formData, buttonTheme: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              >
                <option value="black">Black (Default)</option>
                <option value="white">White</option>
                <option value="white-outline">White with Outline</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Button Height (40-55px)</label>
              <input
                type="number"
                min={40}
                max={55}
                value={formData.buttonHeight}
                onChange={(e) => setFormData({ ...formData, buttonHeight: parseInt(e.target.value, 10) || 46 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Border Radius (px)</label>
              <input
                type="number"
                min={0}
                max={25}
                value={formData.buttonBorderRadius}
                onChange={(e) => setFormData({ ...formData, buttonBorderRadius: parseInt(e.target.value, 10) || 5 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Columns</label>
              <select
                value={formData.buttonColumns}
                onChange={(e) => setFormData({ ...formData, buttonColumns: parseInt(e.target.value, 10) || 2 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              >
                <option value={2}>2 Equal Columns (Side-by-side)</option>
                <option value={1}>1 Column (Full Width)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Unselected Variations</label>
              <select
                value={formData.unselectedVariationAction}
                onChange={(e) => setFormData({ ...formData, unselectedVariationAction: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              >
                <option value="disable">Disable with helper message</option>
                <option value="hide">Hide completely</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Variation Helper Message</label>
              <input
                type="text"
                value={formData.helperText}
                onChange={(e) => setFormData({ ...formData, helperText: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Settings...' : 'Save Payment Settings'}</span>
          </button>
        </div>
      </form>

      {/* WordPress Mini-Plugin Source & Install Guide Modal */}
      {showPluginDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Code className="w-4 h-4 text-[#DF0C88]" />
                  <span>WordPress Mini-Plugin: iRepair Headless Checkout Bridge</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  File: <code>irepair-headless-checkout-bridge.php</code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPluginDrawer(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900">Quick WordPress Values</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200">
                    <div className="truncate pr-2">
                      <span className="text-[10px] text-slate-400 block">Backend API URL</span>
                      <code className="font-mono text-slate-900">{backendOrigin || window.location.origin}</code>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('backend', backendOrigin || window.location.origin)}
                      className="text-[#DF0C88] font-bold shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedKey === 'backend' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200">
                    <div className="truncate pr-2">
                      <span className="text-[10px] text-slate-400 block">Target WordPress Host</span>
                      <code className="font-mono text-slate-900">{formData.wooHostedBaseUrl || formData.wordpressSourceUrl}</code>
                    </div>
                    <a
                      href={`${formData.wooHostedBaseUrl || formData.wordpressSourceUrl}/wp-admin/options-general.php?page=irepair-bridge`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-700 hover:text-[#DF0C88] font-bold shrink-0 flex items-center gap-1"
                    >
                      <span>WP Bridge</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Complete PHP Plugin Source</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!pluginCode}
                    onClick={() => handleCopy('php', pluginCode)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedKey === 'php' ? 'Copied PHP' : 'Copy Code'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={!pluginCode}
                    onClick={handleDownloadPlugin}
                    className="px-3 py-1.5 bg-[#DF0C88] hover:bg-[#C50875] text-white rounded-lg font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .php</span>
                  </button>
                </div>
              </div>

              {loadingPlugin ? (
                <div className="py-10 text-center text-slate-500">Loading PHP plugin code...</div>
              ) : (
                <pre className="p-4 bg-slate-950 text-emerald-300 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed max-h-80">
                  {pluginCode || 'Unable to load plugin source.'}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
