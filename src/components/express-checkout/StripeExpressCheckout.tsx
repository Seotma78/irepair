import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import {
  fetchPaymentConfig,
  createHostedHandoff,
  createSimulatedTestOrder,
  calculateOnsiteExpressShipping,
  createOnsitePaymentIntent,
  PublicPaymentConfig,
  PaymentCartItemPayload,
  LiveShippingOption,
  OnsiteIntentResponse,
} from '../../services/paymentApi';
import { OnSiteStripeElements } from './OnSiteStripeElements';
import { AlertCircle, AlertTriangle, X, ShieldAlert, Lock, RefreshCw, Truck } from 'lucide-react';

interface StripeExpressCheckoutProps {
  location?: 'product' | 'cart' | 'mini-cart' | 'checkout';
  product?: Product;
  items?: PaymentCartItemPayload[];
  couponCode?: string | null;
  variationId?: number | string | null;
  selectedAttributes?: Record<string, string>;
  quantity?: number;
  price?: number;
  isCompleteSelection?: boolean;
  inStock?: boolean;
  className?: string;
}

const AppleMark: React.FC<{ className?: string }> = ({ className = 'w-[15px] h-[18px]' }) => (
  <svg className={`${className} fill-current shrink-0`} viewBox="0 0 170 170" aria-hidden="true">
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.13-1.9-14.34-6.08-3.69-3.03-7.61-7.8-11.77-14.32-5.04-7.82-9.24-16.84-12.6-27.08-3.57-10.74-5.36-20.99-5.36-30.77 0-11.43 2.94-20.98 8.81-28.65 5.88-7.66 13.28-11.67 22.22-12.01 4.46 0 9.6 1.29 15.42 3.85 5.82 2.57 9.57 3.91 11.25 4.02 1.34 0 5.47-1.56 12.39-4.69 6.53-2.9 12.05-4.13 16.57-3.69 12.16.98 21.31 5.79 27.45 14.42-10.88 6.61-16.21 15.88-15.99 27.81.22 9.29 3.63 17.01 10.22 23.16 4.46 4.24 9.75 7.03 15.88 8.37-1.12 3.57-2.46 7.03-4.02 10.38zM119.22 31.02c0 7.26-2.65 14.04-7.96 20.34-6.41 7.48-14.16 11.79-22.58 11.12-.11-.89-.17-1.84-.17-2.85 0-6.98 3.04-14.44 8.51-20.66 2.72-3.13 6.18-5.73 10.38-7.81 4.19-2.06 8.15-3.2 11.88-3.41.11 1.12.17 2.24.17 3.27z" />
  </svg>
);

const GoogleGMark: React.FC<{ className?: string }> = ({ className = 'w-[17px] h-[17px]' }) => (
  <svg className={`${className} shrink-0`} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z" />
    <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z" />
  </svg>
);

export const StripeExpressCheckout: React.FC<StripeExpressCheckoutProps> = ({
  location = 'product',
  product,
  items,
  couponCode,
  variationId,
  selectedAttributes = {},
  quantity = 1,
  price,
  isCompleteSelection = true,
  inStock = true,
  className = '',
}) => {
  const [config, setConfig] = useState<PublicPaymentConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [activeWalletTrigger, setActiveWalletTrigger] = useState<'apple_pay' | 'google_pay' | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Dev/Staging simulated-only modal state (unreachable when useWooHosted is ON or in Production)
  const [simModalWallet, setSimModalWallet] = useState<'apple_pay' | 'google_pay' | null>(null);
  const [simEmail, setSimEmail] = useState('test@example.co.uk');
  const [simName, setSimName] = useState('Test Customer');
  const [simSubmitting, setSimSubmitting] = useState(false);

  // On-Site Style 2 Express Modal state (Zero redirect to WordPress)
  const [onsiteModalWallet, setOnsiteModalWallet] = useState<'apple_pay' | 'google_pay' | null>(null);
  const [onsiteLoadingSummary, setOnsiteLoadingSummary] = useState(false);
  const [onsiteSummary, setOnsiteSummary] = useState<{
    items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number; image: string }>;
    subtotal: number;
    discount: number;
    couponCode: string | null;
    freeShipping: boolean;
    shippingCost: number;
    selectedRateId: string;
    shippingOptions: LiveShippingOption[];
    vatAmount: number;
    total: number;
  } | null>(null);
  const [onsiteShippingId, setOnsiteShippingId] = useState('');
  const [onsiteEmail, setOnsiteEmail] = useState('');
  const [onsiteFirstName, setOnsiteFirstName] = useState('');
  const [onsiteLastName, setOnsiteLastName] = useState('');
  const [onsitePhone, setOnsitePhone] = useState('');
  const [onsiteAddress1, setOnsiteAddress1] = useState('');
  const [onsiteAddress2, setOnsiteAddress2] = useState('');
  const [onsiteCity, setOnsiteCity] = useState('');
  const [onsitePostcode, setOnsitePostcode] = useState('');
  const [onsiteCreatingIntent, setOnsiteCreatingIntent] = useState(false);
  const [onsiteSession, setOnsiteSession] = useState<OnsiteIntentResponse | null>(null);
  const [onsiteModalError, setOnsiteModalError] = useState<string | null>(null);

  const attemptKeyRef = useRef<string>('');
  const { showNotification, setCurrentPage, setIsCartDrawerOpen, clearCart } = useApp();
  const { customer } = useCustomerAuth();

  useEffect(() => {
    if (customer?.email) {
      setSimEmail(customer.email);
      setOnsiteEmail(customer.email);
    }
    if (customer?.firstName) {
      setSimName(`${customer.firstName} ${customer.lastName || ''}`.trim());
      setOnsiteFirstName(customer.firstName || '');
      setOnsiteLastName(customer.lastName || '');
    }
    if (customer) {
      const addr = customer.shipping?.address_1 ? customer.shipping : customer.billing;
      if (addr?.address_1) {
        setOnsiteAddress1(addr.address_1 || '');
        setOnsiteAddress2(addr.address_2 || '');
        setOnsiteCity(addr.city || '');
        setOnsitePostcode(addr.postcode || '');
      }
      if (customer.billing?.phone) {
        setOnsitePhone(customer.billing.phone);
      }
    }
  }, [customer]);

  useEffect(() => {
    attemptKeyRef.current = '';
  }, [items, product?.id, variationId, quantity, couponCode, JSON.stringify(selectedAttributes)]);

  useEffect(() => {
    let isMounted = true;
    fetchPaymentConfig()
      .then((cfg) => {
        if (isMounted) {
          setConfig(cfg);
          setIsLoadingConfig(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingConfig(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const isLocationEnabled = useMemo(() => {
    if (!config) return false;
    if (location === 'product') return config.enableProductPage;
    if (location === 'cart') return config.enableCartPage;
    if (location === 'mini-cart') return config.enableMiniCart;
    if (location === 'checkout') return config.enableCheckoutPage;
    return true;
  }, [config, location]);

  if (isLoadingConfig || !config || !isLocationEnabled) {
    return null;
  }

  const showApple = config.wallets.applePay;
  const showGoogle = config.wallets.googlePay;
  if (!showApple && !showGoogle) {
    return null;
  }

  const isVariable = product?.type === 'variable' && (!items || items.length === 0);
  const isSelectionIncomplete = Boolean(isVariable && !isCompleteSelection);

  if ((isSelectionIncomplete || !inStock) && config.unselectedVariationAction === 'hide') {
    return null;
  }

  const resolvedItems: PaymentCartItemPayload[] =
    items && items.length > 0
      ? items
      : product
      ? [
          {
            productId: product.id,
            variationId: variationId || undefined,
            quantity,
            selectedAttributes,
          },
        ]
      : [];

  const handleWalletClick = async (wallet: 'apple_pay' | 'google_pay') => {
    setInlineError(null);

    if (isSelectionIncomplete) {
      showNotification(config.helperText || 'Please select storage & colour options above first', 'error');
      return;
    }
    if (!inStock) {
      showNotification('This item is currently out of stock', 'error');
      return;
    }
    if (resolvedItems.length === 0) {
      showNotification('Your basket is empty', 'error');
      return;
    }

    // Hosted WooCommerce Stripe Gateway (ON by default & locked in Production)
    if (config.useWooHosted) {
      if (!config.gatewayAvailable) {
        const msg = config.unavailableMessage || 'Payments are temporarily unavailable. Please try again shortly.';
        setInlineError(msg);
        showNotification(msg, 'error');
        return;
      }

      // Style 2 (On-Site React Checkout & Payment — Zero Redirect to WordPress)
      if (config.handoffStyle === 'order_pay') {
        setOnsiteModalError(null);
        setOnsiteSession(null);
        setOnsiteModalWallet(wallet);
        setOnsiteLoadingSummary(true);
        try {
          const summary = await calculateOnsiteExpressShipping({
            items: resolvedItems,
            couponCode: couponCode || undefined,
          });
          setOnsiteSummary(summary);
          setOnsiteShippingId(summary.selectedRateId);
        } catch (err: any) {
          setOnsiteModalError(err.message || 'Unable to load live WooCommerce pricing and shipping rates.');
        } finally {
          setOnsiteLoadingSummary(false);
        }
        return;
      }

      try {
        setActiveWalletTrigger(wallet);
        if (!attemptKeyRef.current) {
          attemptKeyRef.current = `hnd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        }

        if (location === 'cart' || location === 'mini-cart' || location === 'checkout') {
          try {
            localStorage.setItem('irepair_clear_cart_source', location);
          } catch (_) {}
        }

        const handoff = await createHostedHandoff({
          items: resolvedItems,
          couponCode: couponCode || undefined,
          source: location,
          idempotencyKey: attemptKeyRef.current,
        });

        setIsCartDrawerOpen(false);
        if (handoff.mode === 'order_pay_required' || !handoff.redirectUrl.startsWith('http')) {
          setActiveWalletTrigger(null);
          showNotification(
            handoff.message || 'Enter your delivery details below to complete payment on this page.',
            'info'
          );
          setCurrentPage('checkout');
          return;
        }
        window.location.assign(handoff.redirectUrl);
      } catch (err: any) {
        attemptKeyRef.current = '';
        const msg = err.message || 'Unable to start WooCommerce Stripe checkout.';
        setInlineError(msg);
        showNotification(msg, 'error');
        setActiveWalletTrigger(null);
      }
      return;
    }

    // Dev/Staging Simulated Mode ONLY (never reachable when useWooHosted is ON or in Production)
    if (config.isSimulatedMode) {
      setSimModalWallet(wallet);
    }
  };

  const handleOnsiteShippingChange = async (rateId: string) => {
    setOnsiteShippingId(rateId);
    setOnsiteSession(null);
    try {
      const summary = await calculateOnsiteExpressShipping({
        items: resolvedItems,
        couponCode: couponCode || undefined,
        shippingRateId: rateId,
      });
      setOnsiteSummary(summary);
    } catch (_) {}
  };

  const handleCreateOnsiteSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnsiteModalError(null);

    const cleanPostcode = onsitePostcode.replace(/\s+/g, '').toUpperCase();
    const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/;
    if (!ukPostcodeRegex.test(cleanPostcode)) {
      setOnsiteModalError('Please enter a valid UK postcode (e.g. SW1A 1AA or NR1 1TR).');
      return;
    }

    setOnsiteCreatingIntent(true);
    try {
      if (!attemptKeyRef.current) {
        attemptKeyRef.current = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      }
      const billing = {
        firstName: onsiteFirstName.trim(),
        lastName: onsiteLastName.trim(),
        email: onsiteEmail.trim().toLowerCase(),
        phone: onsitePhone.trim(),
        address1: onsiteAddress1.trim(),
        address2: onsiteAddress2.trim(),
        city: onsiteCity.trim(),
        postcode: onsitePostcode.trim().toUpperCase(),
        country: 'GB',
      };
      const session = await createOnsitePaymentIntent({
        items: resolvedItems,
        billing,
        shipping: billing,
        shippingOptionId: onsiteShippingId || undefined,
        couponCode: couponCode || undefined,
        idempotencyKey: attemptKeyRef.current,
      });
      setOnsiteSession(session);
    } catch (err: any) {
      attemptKeyRef.current = '';
      setOnsiteModalError(err.message || 'Unable to prepare Stripe express checkout session.');
    } finally {
      setOnsiteCreatingIntent(false);
    }
  };

  const handleSimulatedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.isSimulatedMode) return;

    setSimSubmitting(true);
    setInlineError(null);
    try {
      const parts = simName.trim().split(/\s+/);
      const sim = await createSimulatedTestOrder({
        items: resolvedItems,
        billing: {
          firstName: parts[0] || 'Test',
          lastName: parts.slice(1).join(' ') || 'Customer',
          email: simEmail.trim(),
          address1: 'Simulated Test Address',
          city: 'London',
          postcode: 'SW1A 1AA',
          country: 'GB',
        },
        paymentMethodTitle: simModalWallet === 'apple_pay' ? 'Apple Pay' : 'Google Pay',
      });

      setSimModalWallet(null);
      setIsCartDrawerOpen(false);
      window.history.pushState({}, '', `/order-confirmation/${sim.orderId}/?key=${sim.orderKey}`);
      setCurrentPage('order-confirmation');
    } catch (err: any) {
      setInlineError(err.message || 'Simulated order failed.');
    } finally {
      setSimSubmitting(false);
    }
  };

  const btnHeight = config.buttonStyle?.height || 46;
  const btnRadius = config.buttonStyle?.borderRadius ?? 5;
  const btnTheme = config.buttonStyle?.theme || 'black';
  const btnCols = config.buttonStyle?.columns === 1 ? 1 : 2;
  const isBuyPrefix = config.buttonStyle?.type === 'buy';

  const buttonThemeClasses =
    btnTheme === 'white'
      ? 'bg-white text-black border border-slate-200 hover:bg-slate-50'
      : btnTheme === 'white-outline'
      ? 'bg-white text-black border-2 border-black hover:bg-slate-50'
      : 'bg-black text-white hover:bg-[#161616]';

  const isDisabledLook = isSelectionIncomplete || !inStock || (config.useWooHosted && !config.gatewayAvailable);

  return (
    <div aria-label="Express Payment Options" className={`w-full ${className}`}>
      {config.showAdminTestModeBadge && (
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-amber-100 text-amber-900 border border-amber-300">
          <span>Admin Notice: {config.useWooHosted ? 'WordPress Stripe Test Mode Active' : 'Simulated Dev Mode (No Real Money)'}</span>
        </div>
      )}

      {config.adminWarning && (
        <div className="mb-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-700 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Admin Warning: {config.adminWarning}</span>
        </div>
      )}

      {config.useWooHosted && !config.gatewayAvailable && (
        <div className="mb-2 p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
          <span>{config.unavailableMessage || 'Payments are temporarily unavailable. Please try again shortly.'}</span>
        </div>
      )}

      {config.showDivider && (
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-200" />
          <span className="flex-shrink mx-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {config.dividerText || 'Express checkout'}
          </span>
          <div className="flex-grow border-t border-slate-200" />
        </div>
      )}

      {/* Side-by-Side Solid Black Buttons (Exact existing product page style) */}
      <div
        className={`grid ${
          btnCols === 2 && showApple && showGoogle ? 'grid-cols-2' : 'grid-cols-1'
        } gap-2.5`}
      >
        {showApple && (
          <button
            type="button"
            disabled={!inStock || activeWalletTrigger !== null || (config.useWooHosted && !config.gatewayAvailable)}
            onClick={() => handleWalletClick('apple_pay')}
            style={{ height: `${btnHeight}px`, borderRadius: `${btnRadius}px` }}
            aria-label="Pay directly with Apple Pay via Stripe"
            title={
              !inStock
                ? 'Out of stock'
                : config.useWooHosted && !config.gatewayAvailable
                ? 'Payments temporarily unavailable'
                : isSelectionIncomplete
                ? config.helperText || 'Select options to use express checkout'
                : 'Continue to WooCommerce Stripe Express Checkout with Apple Pay'
            }
            className={`w-full flex items-center justify-center font-medium text-[16px] leading-none transition-all select-none shadow-xs ${buttonThemeClasses} ${
              isDisabledLook ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.99]'
            }`}
          >
            {activeWalletTrigger === 'apple_pay' ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {isBuyPrefix && <span className="text-xs mr-1.5 font-normal">Buy with</span>}
                <AppleMark className="w-[15px] h-[18px] mr-[3px] -mt-[2px]" />
                <span className="tracking-[-0.02em]">Pay</span>
              </>
            )}
          </button>
        )}

        {showGoogle && (
          <button
            type="button"
            disabled={!inStock || activeWalletTrigger !== null || (config.useWooHosted && !config.gatewayAvailable)}
            onClick={() => handleWalletClick('google_pay')}
            style={{ height: `${btnHeight}px`, borderRadius: `${btnRadius}px` }}
            aria-label="Pay directly with Google Pay via Stripe"
            title={
              !inStock
                ? 'Out of stock'
                : config.useWooHosted && !config.gatewayAvailable
                ? 'Payments temporarily unavailable'
                : isSelectionIncomplete
                ? config.helperText || 'Select options to use express checkout'
                : 'Continue to WooCommerce Stripe Express Checkout with Google Pay'
            }
            className={`w-full flex items-center justify-center font-medium text-[16px] leading-none transition-all select-none shadow-xs ${buttonThemeClasses} ${
              isDisabledLook ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.99]'
            }`}
          >
            {activeWalletTrigger === 'google_pay' ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {isBuyPrefix && <span className="text-xs mr-1.5 font-normal">Buy with</span>}
                <GoogleGMark className="w-[17px] h-[17px] mr-[6px]" />
                <span className="tracking-[-0.02em]">Pay</span>
              </>
            )}
          </button>
        )}
      </div>

      {inlineError && (
        <p className="mt-2 text-xs text-rose-600 font-medium flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{inlineError}</span>
        </p>
      )}

      {/* Development/Staging ONLY Simulated Modal (strictly unreachable when Hosted Gateway is ON or in Production) */}
      {simModalWallet && config.isSimulatedMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-amber-300">
            <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-extrabold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>SIMULATED PAYMENT, NO REAL MONEY (Dev/Staging Mode)</span>
            </div>
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <span className="text-sm font-bold">
                Simulated {simModalWallet === 'apple_pay' ? 'Apple Pay' : 'Google Pay'} Test
              </span>
              <button
                type="button"
                onClick={() => setSimModalWallet(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSimulatedSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  This generates a local <code>TEST-</code> order only. It does NOT create a WooCommerce order, charge Stripe, or send customer emails.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Test Name</label>
                <input
                  type="text"
                  required
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Test Email</label>
                <input
                  type="email"
                  required
                  value={simEmail}
                  onChange={(e) => setSimEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={simSubmitting}
                className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50"
              >
                {simSubmitting
                  ? 'Creating TEST Order...'
                  : `Create Simulated TEST Order (£${((price || product?.price || 0) * quantity).toFixed(2)})`}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Style 2 On-Site Express Checkout Modal (Portal so Mini-Cart stays intact until paid) */}
      {onsiteModalWallet &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-auto max-h-[92vh] flex flex-col">
              <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#DF0C88]" />
                  <span className="text-sm font-bold">
                    {onsiteModalWallet === 'apple_pay' ? 'Apple Pay Express Checkout' : 'Google Pay Express Checkout'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOnsiteModalWallet(null);
                    setOnsiteSession(null);
                    attemptKeyRef.current = '';
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {onsiteLoadingSummary ? (
                  <div className="py-10 text-center space-y-2">
                    <RefreshCw className="w-7 h-7 text-[#DF0C88] animate-spin mx-auto" />
                    <p className="text-slate-500">Verifying live stock, UK shipping &amp; Stripe session...</p>
                  </div>
                ) : (
                  <>
                    {onsiteModalError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                        <span>{onsiteModalError}</span>
                      </div>
                    )}

                    {onsiteSummary && (
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {onsiteSummary.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between gap-2">
                              <span className="font-semibold text-slate-800 truncate">
                                {it.quantity}x {it.name}
                              </span>
                              <span className="font-bold text-slate-900 shrink-0">
                                £{it.lineTotal.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                        {onsiteSummary.discount > 0 && (
                          <div className="flex justify-between text-emerald-700 font-semibold pt-1 border-t border-slate-200">
                            <span>Coupon ({onsiteSummary.couponCode})</span>
                            <span>-£{onsiteSummary.discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-600">
                          <span>Shipping</span>
                          <span className="font-semibold text-slate-900">
                            {onsiteSummary.shippingCost === 0 ? 'FREE' : `£${onsiteSummary.shippingCost.toFixed(2)}`}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 font-bold text-slate-900">
                          <span>Total Due (incl. VAT)</span>
                          <span className="text-base font-extrabold text-[#DF0C88]">
                            £{onsiteSummary.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    {onsiteSession ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-2 rounded-xl">
                          <span>
                            Order <strong>#{onsiteSession.orderNumber}</strong> ready for payment
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setOnsiteSession(null);
                              attemptKeyRef.current = '';
                            }}
                            className="text-[#DF0C88] font-bold hover:underline cursor-pointer"
                          >
                            Edit Details
                          </button>
                        </div>

                        <OnSiteStripeElements
                          publishableKey={onsiteSession.publishableKey}
                          clientSecret={onsiteSession.clientSecret}
                          orderId={onsiteSession.orderId}
                          orderNumber={onsiteSession.orderNumber}
                          orderKey={onsiteSession.orderKey}
                          amountLabel={`£${parseFloat(onsiteSession.total).toFixed(2)}`}
                          allowedMethods={config.allowedMethods}
                          buttonTheme={config.buttonStyle?.theme}
                          buttonHeight={config.buttonStyle?.height}
                          focusWallet={onsiteModalWallet}
                          onPaymentSuccess={({ orderId, orderNumber, orderKey }) => {
                            if (location !== 'product') {
                              clearCart();
                            }
                            try {
                              localStorage.removeItem('irepair_clear_cart_source');
                            } catch (_) {}
                            setOnsiteModalWallet(null);
                            setOnsiteSession(null);
                            setIsCartDrawerOpen(false);
                            showNotification(`Order #${orderNumber} confirmed!`, 'success');
                            window.history.pushState(
                              {},
                              '',
                              `/order-confirmation/${orderId}/?key=${encodeURIComponent(orderKey)}`
                            );
                            setCurrentPage('order-confirmation');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          onPaymentError={(msg) => setOnsiteModalError(msg)}
                        />
                      </div>
                    ) : (
                      <form onSubmit={handleCreateOnsiteSession} className="space-y-3">
                        {onsiteSummary && onsiteSummary.shippingOptions.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-[#DF0C88]" />
                              <span>UK Delivery Method</span>
                            </span>
                            <div className="space-y-1.5">
                              {onsiteSummary.shippingOptions.map((opt) => (
                                <label
                                  key={opt.id}
                                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer ${
                                    onsiteShippingId === opt.id
                                      ? 'border-[#DF0C88] bg-pink-50/40'
                                      : 'border-slate-200'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 font-semibold text-slate-800">
                                    <input
                                      type="radio"
                                      name="onsiteExpressShipping"
                                      checked={onsiteShippingId === opt.id}
                                      onChange={() => handleOnsiteShippingChange(opt.id)}
                                    />
                                    <span>{opt.title}</span>
                                  </span>
                                  <span className="font-bold text-slate-900">
                                    {opt.cost === 0 ? 'FREE' : `£${opt.cost.toFixed(2)}`}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">First Name *</label>
                            <input
                              type="text"
                              required
                              value={onsiteFirstName}
                              onChange={(e) => setOnsiteFirstName(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Last Name *</label>
                            <input
                              type="text"
                              required
                              value={onsiteLastName}
                              onChange={(e) => setOnsiteLastName(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                            <input
                              type="email"
                              required
                              value={onsiteEmail}
                              onChange={(e) => setOnsiteEmail(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Phone *</label>
                            <input
                              type="tel"
                              required
                              value={onsitePhone}
                              onChange={(e) => setOnsitePhone(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Street Address *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 42 High Street"
                            value={onsiteAddress1}
                            onChange={(e) => setOnsiteAddress1(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Town / City *</label>
                            <input
                              type="text"
                              required
                              value={onsiteCity}
                              onChange={(e) => setOnsiteCity(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">UK Postcode *</label>
                            <input
                              type="text"
                              required
                              placeholder="SW1A 1AA"
                              value={onsitePostcode}
                              onChange={(e) => setOnsitePostcode(e.target.value.toUpperCase())}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono uppercase"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={onsiteCreatingIntent || !onsiteSummary}
                          className="w-full h-11 bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold rounded-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                        >
                          {onsiteCreatingIntent ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Loading Stripe Express Payment...</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4" />
                              <span>
                                Continue to{' '}
                                {onsiteModalWallet === 'apple_pay' ? 'Apple Pay / Card' : 'Google Pay / Card'}
                                {onsiteSummary ? ` · £${onsiteSummary.total.toFixed(2)}` : ''}
                              </span>
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
