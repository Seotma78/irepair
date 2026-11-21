import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import {
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  Printer,
  ArrowRight,
  Loader2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Mail,
  Lock,
  X,
} from 'lucide-react';
import {
  fetchVerifiedOrder,
  fetchPaymentConfig,
  confirmOnsitePayment,
  createOnsiteExistingOrderIntent,
  VerifiedOrderDetails,
  PublicPaymentConfig,
  OnsiteIntentResponse,
} from '../services/paymentApi';
import { OnSiteStripeElements } from './express-checkout/OnSiteStripeElements';

export const OrderConfirmationView: React.FC = () => {
  const { setCurrentPage, clearCart, showNotification } = useApp();
  const { isAuthenticated } = useCustomerAuth();

  const [urlParams] = useState(() => {
    if (typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      const idIdx = pathParts.indexOf('order-confirmation');
      const rawId = idIdx !== -1 && pathParts[idIdx + 1] ? pathParts[idIdx + 1] : '';
      const searchParams = new URLSearchParams(window.location.search);
      const keyFromUrl = searchParams.get('key') || '';
      const piFromUrl = searchParams.get('payment_intent') || '';
      return { orderId: rawId, orderKey: keyFromUrl, paymentIntentId: piFromUrl };
    }
    return { orderId: '', orderKey: '', paymentIntentId: '' };
  });

  const [order, setOrder] = useState<VerifiedOrderDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<PublicPaymentConfig | null>(null);
  const [retrySession, setRetrySession] = useState<OnsiteIntentResponse | null>(null);
  const [loadingRetry, setLoadingRetry] = useState(false);

  const pollingTimerRef = useRef<any>(null);
  const clearedCartRef = useRef(false);
  const piConfirmedRef = useRef(false);

  const loadOrder = useCallback(async () => {
    if (!urlParams.orderId) {
      setLoading(false);
      setFetchError('No order ID provided.');
      return;
    }

    try {
      // If redirected back after a 3DS bank challenge on React, verify PaymentIntent immediately
      if (urlParams.paymentIntentId && !piConfirmedRef.current) {
        piConfirmedRef.current = true;
        try {
          const conf = await confirmOnsitePayment({
            orderId: urlParams.orderId,
            orderKey: urlParams.orderKey || null,
            paymentIntentId: urlParams.paymentIntentId,
          });
          if (conf?.order) {
            setOrder(conf.order);
            setFetchError(null);
            setLoading(false);
            if (conf.order.isPaid && !clearedCartRef.current) {
              clearedCartRef.current = true;
              try {
                localStorage.removeItem('irepair_clear_cart_source');
              } catch (_) {}
              clearCart();
            }
            if (typeof window !== 'undefined' && urlParams.orderKey) {
              window.history.replaceState(
                {},
                '',
                `/order-confirmation/${urlParams.orderId}/?key=${encodeURIComponent(urlParams.orderKey)}`
              );
            }
            return;
          }
        } catch (_) {}
      }

      const res = await fetchVerifiedOrder(urlParams.orderId, urlParams.orderKey || null);
      const fetched = res.order;
      setOrder(fetched);
      setFetchError(null);
      setLoading(false);

      // Clear frontend cart ONLY once WooCommerce confirms payment succeeded
      if (fetched.isPaid && !clearedCartRef.current) {
        clearedCartRef.current = true;
        try {
          if (localStorage.getItem('irepair_clear_cart_source')) {
            localStorage.removeItem('irepair_clear_cart_source');
            clearCart();
          }
        } catch (_) {}
      }

      if (fetched.isPaid || fetched.isSimulated || ['failed', 'cancelled', 'refunded'].includes(fetched.status)) {
        if (pollingTimerRef.current) {
          clearInterval(pollingTimerRef.current);
          pollingTimerRef.current = null;
        }
      }
    } catch (err: any) {
      setLoading(false);
      setFetchError(err.message || 'Unable to verify order details with WooCommerce.');
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    }
  }, [urlParams.orderId, urlParams.orderKey, urlParams.paymentIntentId, clearCart]);

  useEffect(() => {
    fetchPaymentConfig().then(setPaymentConfig).catch(() => {});
  }, []);

  useEffect(() => {
    loadOrder();

    pollingTimerRef.current = setInterval(() => {
      setPollCount((prev) => {
        const next = prev + 1;
        if (next >= 15) {
          setTimedOut(true);
          if (pollingTimerRef.current) {
            clearInterval(pollingTimerRef.current);
            pollingTimerRef.current = null;
          }
          return next;
        }
        loadOrder();
        return next;
      });
    }, 3000);

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, [loadOrder]);

  const handleManualRecheck = () => {
    setTimedOut(false);
    setPollCount(0);
    setLoading(true);
    loadOrder();
  };

  const handleOnsiteRetry = async () => {
    if (!order) return;
    setLoadingRetry(true);
    try {
      const session = await createOnsiteExistingOrderIntent(order.id, urlParams.orderKey || order.orderKey);
      setRetrySession(session);
    } catch (err: any) {
      showNotification(err.message || 'Unable to open payment form for this order.', 'error');
    } finally {
      setLoadingRetry(false);
    }
  };

  if (loading && !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-10 h-10 text-[#DF0C88] animate-spin mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">Verifying your order with WooCommerce...</h2>
        <p className="text-xs text-slate-500 mt-1">Checking authoritative payment confirmation from Stripe.</p>
      </div>
    );
  }

  if (fetchError || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-4">
          <Package className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Order Not Found</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {fetchError || 'We could not locate a verified WooCommerce order matching this link.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => setCurrentPage('track-order')}
              className="px-5 py-2.5 bg-[#DF0C88] text-white text-xs font-semibold rounded-xl hover:bg-[#C50875] cursor-pointer"
            >
              Track an Order
            </button>
            <button
              onClick={() => setCurrentPage('shop')}
              className="px-5 py-2.5 bg-slate-100 text-slate-800 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer"
            >
              Return to Shop
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isConfirmedPaid = Boolean(order.isPaid);
  const isSimulated = Boolean(order.isSimulated);
  const isFailedOrCancelled = ['failed', 'cancelled'].includes(order.status);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Simulated Dev/Staging Banner */}
      {isSimulated && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-100 border-2 border-amber-400 text-amber-950 text-xs flex items-center gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
          <div>
            <strong className="block font-extrabold uppercase">SIMULATED PAYMENT, NO REAL MONEY</strong>
            <span>This test order ({order.number}) was created locally in Dev/Staging mode. It does not exist in WooCommerce and no customer emails were sent.</span>
          </div>
        </div>
      )}

      {/* Status Banner */}
      {!isSimulated && isFailedOrCancelled && (
        <div className="mb-6 p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-3 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="block font-bold text-sm">
                Payment {order.status === 'cancelled' ? 'Cancelled' : 'Not Completed'}
              </strong>
              <p className="text-rose-700 mt-0.5">
                WooCommerce order #{order.number} currently has status <strong>{order.status}</strong>. No charge has been completed.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 pl-8">
            {paymentConfig?.handoffStyle === 'order_pay' ? (
              <button
                type="button"
                disabled={loadingRetry}
                onClick={handleOnsiteRetry}
                className="px-4 py-2 bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{loadingRetry ? 'Loading Stripe...' : 'Retry Payment on This Page'}</span>
              </button>
            ) : order.payUrl ? (
              <a
                href={order.payUrl}
                className="px-4 py-2 bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5"
              >
                <span>Retry Payment via Stripe</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : null}
            <button
              onClick={() => setCurrentPage('cart')}
              className="px-4 py-2 bg-white border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl hover:bg-rose-100 cursor-pointer"
            >
              Return to Cart
            </button>
          </div>
        </div>
      )}

      {!isSimulated && !isConfirmedPaid && !isFailedOrCancelled && (
        <div className="mb-6 p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {!timedOut ? (
                <Loader2 className="w-5 h-5 text-amber-600 animate-spin shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <div className="text-xs">
                <span className="font-bold block">
                  {timedOut
                    ? 'Payment Confirmation Still Pending'
                    : 'Confirming Payment with WooCommerce & Stripe...'}
                </span>
                <span className="text-amber-700">
                  {timedOut
                    ? `Order #${order.number} is still showing status "${order.status}". Click "Check Again" below or complete payment inline.`
                    : `Checking live WooCommerce order #${order.number} status (${pollCount + 1}/15)...`}
                </span>
              </div>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-white text-amber-800 border border-amber-200 shrink-0 uppercase">
              {order.status}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pl-8 text-xs">
            <button
              type="button"
              onClick={handleManualRecheck}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Check Again</span>
            </button>
            {paymentConfig?.handoffStyle === 'order_pay' ? (
              <button
                type="button"
                disabled={loadingRetry}
                onClick={handleOnsiteRetry}
                className="px-3.5 py-1.5 bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{loadingRetry ? 'Loading Stripe...' : 'Complete Payment Here'}</span>
              </button>
            ) : order.payUrl ? (
              <a
                href={order.payUrl}
                className="px-3.5 py-1.5 bg-white border border-amber-300 text-amber-900 font-semibold rounded-lg inline-flex items-center gap-1.5 hover:bg-amber-100"
              >
                <span>Complete Payment</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : null}
            {order.supportEmail && (
              <a
                href={`mailto:${order.supportEmail}?subject=${encodeURIComponent(`Order #${order.number} Payment Query`)}`}
                className="inline-flex items-center gap-1 text-amber-800 hover:underline font-semibold"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Support: {order.supportEmail}</span>
              </a>
            )}
          </div>
        </div>
      )}

      {isConfirmedPaid && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold block">Payment Confirmed by WooCommerce &amp; Stripe</span>
              <span className="text-emerald-700">
                Order #{order.number} is officially recorded in WooCommerce as <strong className="capitalize">{order.status}</strong>.
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shrink-0">
            Verified Paid
          </span>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8 text-center mb-6">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isConfirmedPaid
              ? 'bg-emerald-50 text-emerald-600'
              : isSimulated
              ? 'bg-amber-50 text-amber-600'
              : isFailedOrCancelled
              ? 'bg-rose-50 text-rose-600'
              : 'bg-amber-50 text-amber-600'
          }`}
        >
          {isConfirmedPaid ? (
            <CheckCircle2 className="w-10 h-10" />
          ) : isFailedOrCancelled ? (
            <AlertCircle className="w-10 h-10" />
          ) : (
            <Loader2 className={`w-9 h-9 ${!timedOut && !isSimulated ? 'animate-spin' : ''}`} />
          )}
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            isConfirmedPaid
              ? 'bg-emerald-100 text-emerald-800'
              : isSimulated
              ? 'bg-amber-200 text-amber-950'
              : isFailedOrCancelled
              ? 'bg-rose-100 text-rose-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {isSimulated
            ? 'Simulated Test Order'
            : isConfirmedPaid
            ? 'Order Confirmed'
            : isFailedOrCancelled
            ? `Order ${order.status}`
            : 'Awaiting Payment'}
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading mt-3">
          {isSimulated
            ? 'Simulated Test Order Recorded'
            : isConfirmedPaid
            ? 'Thank You For Your Order!'
            : isFailedOrCancelled
            ? 'Payment Was Not Completed'
            : 'Order Created — Awaiting Payment'}
        </h1>

        <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
          {isSimulated ? (
            'This is a local simulation order for testing only.'
          ) : isConfirmedPaid ? (
            <>
              WooCommerce has sent your confirmation email to{' '}
              <strong className="text-slate-900">{order.billing?.email || 'your email'}</strong>.{' '}
              {order.dispatchNote}
            </>
          ) : (
            `Current WooCommerce status for order #${order.number}: ${order.status}.`
          )}
        </p>

        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600">
          <div>
            <span className="text-slate-400 block text-[11px]">Order Number</span>
            <strong className="text-sm text-slate-900 font-mono">#{order.number}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Order Date</span>
            <strong className="text-sm text-slate-900">
              {order.dateCreated ? new Date(order.dateCreated).toLocaleDateString('en-GB') : '-'}
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Total</span>
            <strong className="text-sm text-[#DF0C88]">£{parseFloat(String(order.total || 0)).toFixed(2)}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Payment Method</span>
            <strong className="text-sm text-slate-900">{order.paymentMethodTitle || 'Stripe'}</strong>
          </div>
        </div>
      </div>

      {/* Dispatch Info (only when confirmed paid) */}
      {isConfirmedPaid && (
        <div className="bg-pink-50/70 border border-pink-100 rounded-2xl p-5 mb-6 flex items-start gap-4">
          <Truck className="w-6 h-6 text-[#DF0C88] shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 leading-relaxed">
            <h4 className="font-bold text-slate-900 mb-0.5">
              UK Tracked Dispatch &amp; Updates
            </h4>
            <p>
              {order.dispatchNote || 'Your order is being prepared for dispatch from our UK hub.'} Tracking updates will be sent via WooCommerce to{' '}
              <strong>{order.billing?.email}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Ordered Items Summary */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 mb-6">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Package className="w-4 h-4 text-[#DF0C88]" />
          Order Summary ({order.lineItems?.length || 0} items)
        </h3>

        <div className="divide-y divide-slate-100 border-y border-slate-100">
          {(order.lineItems || []).map((item, idx) => (
            <div key={idx} className="py-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center p-1 overflow-hidden shrink-0">
                  <Package className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{item.name}</h4>
                  <span className="text-slate-500 text-[11px]">
                    Qty: {item.quantity}
                    {item.meta && item.meta.length > 0
                      ? ` · ${item.meta.map((m) => `${m.key}: ${m.value}`).join(', ')}`
                      : ''}
                  </span>
                </div>
              </div>
              <span className="font-bold text-slate-900">
                £{parseFloat(String(item.total || 0)).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 flex justify-end">
          <div className="w-64 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Shipping:</span>
              <span className="font-semibold text-slate-700">
                {parseFloat(String(order.shippingTotal || 0)) === 0
                  ? 'FREE'
                  : `£${parseFloat(String(order.shippingTotal || 0)).toFixed(2)}`}
              </span>
            </div>
            {parseFloat(String(order.discountTotal || 0)) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount:</span>
                <span>-£{parseFloat(String(order.discountTotal)).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>UK VAT:</span>
              <span>£{parseFloat(String(order.totalTax || 0)).toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
              <span>Grand Total:</span>
              <span className="text-[#DF0C88]">£{parseFloat(String(order.total || 0)).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Address */}
      {order.shipping && order.shipping.address1 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 mb-8">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-600" />
            Delivery Address
          </h3>
          <div className="text-xs text-slate-600 space-y-0.5">
            <p className="font-bold text-slate-800">
              {order.shipping.firstName} {order.shipping.lastName}
            </p>
            <p>{order.shipping.address1}</p>
            {order.shipping.address2 && <p>{order.shipping.address2}</p>}
            <p>
              {order.shipping.city}, {order.shipping.postcode}
            </p>
            <p>{order.shipping.country || 'GB'}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {isAuthenticated ? (
          <button
            onClick={() => setCurrentPage('account')}
            className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-[#DF0C88] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>View in My Account</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setCurrentPage('track-order')}
            className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-[#DF0C88] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Track Order as Guest</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => window.print()}
            className="flex-1 sm:flex-none px-4 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>

          <button
            onClick={() => setCurrentPage('shop')}
            className="flex-1 sm:flex-none px-5 py-3 bg-pink-50 hover:bg-pink-100 text-[#DF0C88] text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Continue Shopping
          </button>
        </div>
      </div>

      {/* On-Site Pending Order Retry Modal (Zero Redirect) */}
      {retrySession && (
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
                  Complete Order #{retrySession.orderNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setRetrySession(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600 font-medium">Amount Due</span>
                <span className="text-base font-extrabold text-[#DF0C88]">
                  £{parseFloat(retrySession.total).toFixed(2)}
                </span>
              </div>

              <OnSiteStripeElements
                publishableKey={retrySession.publishableKey}
                clientSecret={retrySession.clientSecret}
                orderId={retrySession.orderId}
                orderNumber={retrySession.orderNumber}
                orderKey={retrySession.orderKey}
                amountLabel={`£${parseFloat(retrySession.total).toFixed(2)}`}
                allowedMethods={paymentConfig?.allowedMethods || ['card', 'apple_pay', 'google_pay']}
                onPaymentSuccess={() => {
                  setRetrySession(null);
                  showNotification('Payment confirmed by Stripe & WooCommerce!', 'success');
                  loadOrder();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
