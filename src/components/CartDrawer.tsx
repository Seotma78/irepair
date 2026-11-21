import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, Truck, AlertCircle } from 'lucide-react';
import { buildProductHierarchicalUrl } from '../utils/categoryUtils';
import { StripeExpressCheckout } from './express-checkout/StripeExpressCheckout';
import {
  fetchPaymentConfig,
  createHostedHandoff,
  PublicPaymentConfig,
  PaymentCartItemPayload,
} from '../services/paymentApi';

export const CartDrawer: React.FC = () => {
  const {
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    cart,
    appliedCoupon,
    removeFromCart,
    updateQuantity,
    cartSubtotal,
    setCurrentPage,
    viewProductDetail,
    categories,
    showNotification,
  } = useApp();

  const [paymentConfig, setPaymentConfig] = useState<PublicPaymentConfig | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const attemptKeyRef = useRef<string>('');

  useEffect(() => {
    attemptKeyRef.current = '';
  }, [cart, appliedCoupon]);

  useEffect(() => {
    if (isCartDrawerOpen) {
      fetchPaymentConfig().then(setPaymentConfig);
      setCheckoutError(null);
    }
  }, [isCartDrawerOpen]);

  if (!isCartDrawerOpen) return null;

  const freeShippingThreshold = 50.00;
  const progressPercent = Math.min(100, (cartSubtotal / freeShippingThreshold) * 100);
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - cartSubtotal);

  const cartItemsPayload: PaymentCartItemPayload[] = cart.map((item) => ({
    productId: item.product.id,
    variationId: item.selectedVariationId || undefined,
    quantity: item.quantity,
    selectedAttributes: item.selectedAttributes,
  }));

  const handleCheckout = async () => {
    setCheckoutError(null);
    const cfg = paymentConfig || (await fetchPaymentConfig());

    if (cfg?.useWooHosted && cfg.handoffStyle === 'hosted_checkout') {
      if (!cfg.gatewayAvailable) {
        const msg = cfg.unavailableMessage || 'Payments are temporarily unavailable. Please try again shortly.';
        setCheckoutError(msg);
        showNotification(msg, 'error');
        return;
      }
      try {
        setIsRedirecting(true);
        if (!attemptKeyRef.current) {
          attemptKeyRef.current = `mini_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        }
        try {
          localStorage.setItem('irepair_clear_cart_source', 'mini-cart');
        } catch (_) {}
        const res = await createHostedHandoff({
          items: cartItemsPayload,
          couponCode: appliedCoupon?.code || undefined,
          source: 'mini-cart',
          idempotencyKey: attemptKeyRef.current,
        });
        setIsCartDrawerOpen(false);
        if (res.mode === 'order_pay_required' || !res.redirectUrl.startsWith('http')) {
          setIsRedirecting(false);
          setCurrentPage('checkout');
          return;
        }
        window.location.assign(res.redirectUrl);
      } catch (err: any) {
        attemptKeyRef.current = '';
        const msg = err.message || 'Unable to start WooCommerce checkout.';
        setCheckoutError(msg);
        showNotification(msg, 'error');
        setIsRedirecting(false);
      }
      return;
    }

    setIsCartDrawerOpen(false);
    setCurrentPage('checkout');
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={() => setIsCartDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#DF0C88]" />
              <h2 className="text-base font-bold text-slate-900 font-heading">
                Your Shopping Bag ({cart.length})
              </h2>
            </div>
            <button
              onClick={() => setIsCartDrawerOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Tracker */}
          <div className="bg-pink-50/70 border-b border-pink-100 p-3.5 px-5">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-800 mb-1.5">
              <Truck className="w-4 h-4 text-[#DF0C88]" />
              {remainingForFreeShipping > 0 ? (
                <span>
                  Add <strong className="text-[#DF0C88] font-semibold">£{remainingForFreeShipping.toFixed(2)}</strong> more for <strong>FREE UK Tracked Delivery</strong>!
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  You have unlocked FREE UK Tracked Delivery!
                </span>
              )}
            </div>
            <div className="w-full h-1.5 bg-pink-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#DF0C88] transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800 font-heading">Your cart is currently empty</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Browse our certified refurbished iPhones, Samsung Galaxy, MacBooks, or fast chargers.
                </p>
                <button
                  onClick={() => { setIsCartDrawerOpen(false); setCurrentPage('shop'); }}
                  className="mt-5 px-5 py-2.5 bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
                >
                  Shop Refurbished Devices &amp; Tech
                </button>
              </div>
            ) : (
              cart.map((item, index) => (
                <div key={`${item.product.id}-${index}`} className="py-4 flex gap-4">
                  <a
                    href={buildProductHierarchicalUrl(item.product, categories)}
                    onClick={(e) => {
                      e.preventDefault();
                      setIsCartDrawerOpen(false);
                      viewProductDetail(item.product);
                    }}
                    className="w-20 h-20 aspect-square shrink-0 cursor-pointer block rounded-xl overflow-hidden border border-slate-200 bg-white hover:border-[#DF0C88] transition-colors p-1"
                  >
                    <img
                      src={item.variationImage || item.product.image}
                      alt={item.product.title}
                      width={80}
                      height={80}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain object-center"
                    />
                  </a>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <a
                          href={buildProductHierarchicalUrl(item.product, categories)}
                          onClick={(e) => {
                            e.preventDefault();
                            setIsCartDrawerOpen(false);
                            viewProductDetail(item.product);
                          }}
                          className="block cursor-pointer flex-1"
                        >
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-2 hover:text-[#DF0C88] transition-colors">
                            {item.product.title}
                          </h4>
                          {item.variationSku && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              SKU: {item.variationSku}
                            </span>
                          )}
                        </a>
                        <button
                          onClick={() => removeFromCart(index)}
                          className="text-slate-400 hover:text-[#DF0C88] transition-colors p-1 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1 text-[11px] text-slate-500 mt-1">
                        {item.selectedStorage && (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-medium">
                            {item.selectedStorage}
                          </span>
                        )}
                        {item.selectedColor && (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-medium">
                            {item.selectedColor}
                          </span>
                        )}
                        {item.selectedAttributes && Object.entries(item.selectedAttributes).map(([k, v]) => {
                          if (k.toLowerCase() === 'storage' || k.toLowerCase() === 'color' || k.toLowerCase() === 'colour') return null;
                          return (
                            <span key={k} className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-medium">
                              {k.charAt(0).toUpperCase() + k.slice(1)}: {v}
                            </span>
                          );
                        })}
                        <span className="text-slate-400">·</span>
                        <span className="text-emerald-700 font-medium">
                          {item.product.warrantyMonths}M Warranty
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                        <button
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-200 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 py-1 text-xs font-semibold text-slate-800 tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-200 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-sm font-bold text-slate-900 tabular-nums">
                        £{((item.unitPrice ?? item.product.price) * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout CTA */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-4">
              {paymentConfig?.isSimulatedMode && (
                <div className="px-3 py-2 rounded-lg bg-amber-100 border border-amber-300 text-amber-950 text-[11px] font-bold text-center">
                  SIMULATED PAYMENT, NO REAL MONEY
                </div>
              )}

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900 tabular-nums">£{cartSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Standard UK Shipping</span>
                  <span className="text-slate-900 font-medium">
                    {cartSubtotal >= freeShippingThreshold ? (
                      <span className="text-emerald-600 font-semibold">FREE</span>
                    ) : (
                      '£4.95'
                    )}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                  <span>Estimated Total Incl. VAT</span>
                  <span className="text-base text-[#DF0C88] tabular-nums">
                    £{(Math.max(0, cartSubtotal - (appliedCoupon?.discount || 0)) + (cartSubtotal >= freeShippingThreshold ? 0 : 4.95)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Encrypted WooCommerce Stripe checkout · Card, Apple Pay &amp; Google Pay</span>
              </div>

              <div className="w-full">
                <StripeExpressCheckout
                  location="mini-cart"
                  items={cartItemsPayload}
                  couponCode={appliedCoupon?.code || null}
                  price={cartSubtotal}
                  quantity={1}
                  inStock={true}
                />
              </div>

              {checkoutError && (
                <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{checkoutError}</span>
                </p>
              )}

              <button
                onClick={handleCheckout}
                disabled={isRedirecting || (Boolean(paymentConfig?.useWooHosted) && paymentConfig?.gatewayAvailable === false)}
                className="w-full bg-[#DF0C88] hover:bg-[#C50875] text-white font-semibold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <span>{isRedirecting ? 'Redirecting to Secure Checkout...' : 'Proceed to Checkout'}</span>
                {!isRedirecting && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setIsCartDrawerOpen(false); setCurrentPage('cart'); }}
                  className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center"
                >
                  View Full Cart
                </button>
                <button
                  onClick={() => { setIsCartDrawerOpen(false); setCurrentPage('shop'); }}
                  className="flex-1 py-2.5 text-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
