import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Tag,
  Truck,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { buildProductHierarchicalUrl } from '../utils/categoryUtils';
import { StripeExpressCheckout } from './express-checkout/StripeExpressCheckout';
import {
  fetchPaymentConfig,
  validateCouponLive,
  createHostedHandoff,
  PublicPaymentConfig,
  PaymentCartItemPayload,
} from '../services/paymentApi';

export const CartView: React.FC = () => {
  const {
    cart,
    cartSubtotal,
    appliedCoupon,
    setAppliedCoupon,
    removeFromCart,
    updateQuantity,
    clearCart,
    setCurrentPage,
    showNotification,
    viewProductDetail,
    categories,
  } = useApp();

  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express'>('standard');
  const [paymentConfig, setPaymentConfig] = useState<PublicPaymentConfig | null>(null);
  const [isRedirectingCheckout, setIsRedirectingCheckout] = useState(false);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);
  const attemptKeyRef = useRef<string>('');

  useEffect(() => {
    attemptKeyRef.current = '';
  }, [cart, appliedCoupon]);

  useEffect(() => {
    fetchPaymentConfig().then(setPaymentConfig);
    if (typeof window !== 'undefined') {
      const qs = new URLSearchParams(window.location.search);
      const err = qs.get('checkout_error');
      const cancelled = qs.get('payment_cancelled');
      if (err) {
        setCancelNotice(err);
      } else if (cancelled === '1' || cancelled === 'true') {
        setCancelNotice('Your payment was cancelled before completion. Your basket items have been kept.');
      }
    }
  }, []);

  const freeShippingThreshold = 50.00;
  const progressPercent = Math.min(100, (cartSubtotal / freeShippingThreshold) * 100);
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - cartSubtotal);

  const shippingCost =
    appliedCoupon?.freeShipping
      ? 0
      : cartSubtotal >= 50.00 && shippingMethod === 'standard'
      ? 0
      : shippingMethod === 'express'
      ? 6.95
      : 4.95;
  const discountAmount = appliedCoupon ? appliedCoupon.discount : 0;
  const netSubtotal = Math.max(0, cartSubtotal - discountAmount);
  const finalTotal = netSubtotal + shippingCost;
  const vatAmount = (finalTotal * 0.20) / 1.20;

  const cartItemsPayload: PaymentCartItemPayload[] = cart.map((item) => ({
    productId: item.product.id,
    variationId: item.selectedVariationId || undefined,
    quantity: item.quantity,
    selectedAttributes: item.selectedAttributes,
  }));

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    const clean = couponCode.trim();
    if (!clean) return;

    try {
      setApplyingCoupon(true);
      const res = await validateCouponLive(clean, cartSubtotal);
      if (res.valid && res.coupon) {
        setAppliedCoupon({
          code: res.coupon.code,
          discount: res.coupon.discount,
          freeShipping: res.coupon.freeShipping,
        });
        showNotification(`Coupon "${res.coupon.code}" applied (-£${res.coupon.discount.toFixed(2)})`, 'success');
        setCouponCode('');
      }
    } catch (err: any) {
      setCouponError(err.message || 'Invalid or expired coupon code.');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    showNotification('Coupon removed', 'info');
  };

  const handleProceedToCheckout = async () => {
    const cfg = paymentConfig || (await fetchPaymentConfig());
    if (cfg?.useWooHosted && cfg.handoffStyle === 'hosted_checkout') {
      if (!cfg.gatewayAvailable) {
        showNotification(cfg.unavailableMessage || 'Payments are temporarily unavailable. Please try again shortly.', 'error');
        return;
      }
      try {
        setIsRedirectingCheckout(true);
        if (!attemptKeyRef.current) {
          attemptKeyRef.current = `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        }
        try {
          localStorage.setItem('irepair_clear_cart_source', 'cart');
        } catch (_) {}
        const res = await createHostedHandoff({
          items: cartItemsPayload,
          couponCode: appliedCoupon?.code || undefined,
          source: 'cart',
          idempotencyKey: attemptKeyRef.current,
        });
        if (res.mode === 'order_pay_required' || !res.redirectUrl.startsWith('http')) {
          setIsRedirectingCheckout(false);
          setCurrentPage('checkout');
          return;
        }
        window.location.assign(res.redirectUrl);
      } catch (err: any) {
        attemptKeyRef.current = '';
        showNotification(err.message || 'Failed to redirect to WooCommerce checkout.', 'error');
        setIsRedirectingCheckout(false);
      }
      return;
    }

    setCurrentPage('checkout');
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        {cancelNotice && (
          <div className="max-w-md mx-auto mb-6 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{cancelNotice}</span>
          </div>
        )}
        <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-pink-50 text-[#DF0C88] flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 font-heading">
            Your Shopping Cart is Empty
          </h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            You don't have any devices, accessories or repair services in your cart right now. Browse our certified refurbished iPhones, laptops, and original accessories.
          </p>
          <button
            onClick={() => setCurrentPage('shop')}
            className="mt-6 w-full py-3 bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Explore Refurbished Tech
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
        <button onClick={() => setCurrentPage('home')} className="hover:text-slate-800 cursor-pointer">Home</button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-900 font-semibold">Shopping Cart</span>
      </div>

      {paymentConfig?.isSimulatedMode && (
        <div className="mb-6 p-3.5 rounded-2xl bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>SIMULATED PAYMENT, NO REAL MONEY — Development / Staging testing mode active.</span>
        </div>
      )}

      {cancelNotice && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{cancelNotice}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-heading flex items-center gap-2">
          <span>Shopping Cart</span>
          <span className="text-sm font-semibold text-slate-400">({cart.length} items)</span>
        </h1>
        <button
          onClick={clearCart}
          className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Cart</span>
        </button>
      </div>

      {/* Free Shipping Tracker */}
      <div className="bg-pink-50/70 border border-pink-100 rounded-2xl p-4 mb-8">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-800 mb-2">
          <Truck className="w-4 h-4 text-[#DF0C88]" />
          {remainingForFreeShipping > 0 ? (
            <span>
              Add <strong className="text-[#DF0C88] font-bold">£{remainingForFreeShipping.toFixed(2)}</strong> more to your cart to qualify for <strong>FREE Royal Mail Tracked Delivery</strong>!
            </span>
          ) : (
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              Congratulations! Your order qualifies for FREE Royal Mail Tracked Delivery!
            </span>
          )}
        </div>
        <div className="w-full h-2 bg-pink-200/70 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#DF0C88] transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Line Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="divide-y divide-slate-100">
              {cart.map((item, index) => {
                const itemKey = `${item.product.id}-${item.selectedColor || ''}-${item.selectedStorage || ''}-${index}`;
                return (
                  <div key={itemKey} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-4">
                      <a
                        href={buildProductHierarchicalUrl(item.product, categories)}
                        onClick={(e) => {
                          e.preventDefault();
                          viewProductDetail(item.product);
                        }}
                        className="w-16 h-16 sm:w-20 sm:h-20 aspect-square bg-white rounded-xl border border-slate-200 flex items-center justify-center p-1.5 shrink-0 cursor-pointer hover:border-[#DF0C88] transition-colors"
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

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#DF0C88]">
                            {item.product.category}
                          </span>
                          {item.variationSku && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              SKU: {item.variationSku}
                            </span>
                          )}
                        </div>
                        <a
                          href={buildProductHierarchicalUrl(item.product, categories)}
                          onClick={(e) => {
                            e.preventDefault();
                            viewProductDetail(item.product);
                          }}
                          className="block cursor-pointer"
                        >
                          <h3 className="text-sm font-bold text-slate-900 font-heading hover:text-[#DF0C88] cursor-pointer transition-colors">
                            {item.product.title}
                          </h3>
                        </a>

                        <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                          {item.selectedStorage && <span>Storage: <strong>{item.selectedStorage}</strong></span>}
                          {item.selectedColor && (
                            <>
                              <span>•</span>
                              <span>Color: <strong>{item.selectedColor}</strong></span>
                            </>
                          )}
                          {item.selectedAttributes && Object.entries(item.selectedAttributes).map(([k, v]) => {
                            if (k.toLowerCase() === 'storage' || k.toLowerCase() === 'color' || k.toLowerCase() === 'colour') return null;
                            return (
                              <React.Fragment key={k}>
                                <span>•</span>
                                <span>{k.charAt(0).toUpperCase() + k.slice(1)}: <strong>{v}</strong></span>
                              </React.Fragment>
                            );
                          })}
                          <span>•</span>
                          <span className="text-emerald-700 font-medium">12M Warranty</span>
                        </div>

                        <div className="text-sm font-bold text-slate-900 mt-1 sm:hidden">
                          £{((item.unitPrice !== undefined ? item.unitPrice : item.product.price) * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0">
                      <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                        <button
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                          className="p-1.5 px-2 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                          title="Decrease"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-xs font-bold text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          className="p-1.5 px-2 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                          title="Increase"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right min-w-[70px]">
                        <span className="text-sm font-extrabold text-slate-900 font-heading">
                          £{((item.unitPrice !== undefined ? item.unitPrice : item.product.price) * item.quantity).toFixed(2)}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          £{(item.unitPrice !== undefined ? item.unitPrice : item.product.price).toFixed(2)} each
                        </span>
                      </div>

                      <button
                        onClick={() => removeFromCart(index)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentPage('shop')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#DF0C88] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Continue Shopping</span>
            </button>
          </div>
        </div>

        {/* Cart Summary & Checkout Card */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-heading">
              Order Summary
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Items Subtotal:</span>
                <span className="font-semibold text-slate-800">£{cartSubtotal.toFixed(2)}</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-emerald-600">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    Coupon ({appliedCoupon.code}):
                  </span>
                  <span className="font-semibold">-£{appliedCoupon.discount.toFixed(2)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-700 font-semibold block mb-1.5">Estimated UK Shipping:</span>
                <div className="space-y-1.5">
                  <label className="flex items-center justify-between p-2 rounded-xl border border-slate-200 cursor-pointer text-[11px] hover:border-pink-300">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="shipping"
                        checked={shippingMethod === 'standard'}
                        onChange={() => setShippingMethod('standard')}
                        className="text-[#DF0C88] focus:ring-[#DF0C88]"
                      />
                      <span>Royal Mail Tracked 48 (2-3 days)</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      {cartSubtotal >= 50.00 || appliedCoupon?.freeShipping ? 'FREE' : '£4.95'}
                    </span>
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl border border-slate-200 cursor-pointer text-[11px] hover:border-pink-300">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="shipping"
                        checked={shippingMethod === 'express'}
                        onChange={() => setShippingMethod('express')}
                        className="text-[#DF0C88] focus:ring-[#DF0C88]"
                      />
                      <span>Royal Mail Tracked 24 (Next day)</span>
                    </div>
                    <span className="font-bold text-slate-900">£6.95</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-between text-slate-500 pt-2 border-t border-slate-100">
                <span>Includes 20% UK VAT:</span>
                <span>£{vatAmount.toFixed(2)}</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900 font-heading">Estimated Total:</span>
                <span className="text-xl font-extrabold text-[#DF0C88] font-heading">
                  £{finalTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Live WooCommerce Coupon Code Input */}
            <div className="pt-2 border-t border-slate-100">
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Coupon "{appliedCoupon.code}" applied</span>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="WooCommerce coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                    />
                    <button
                      type="submit"
                      disabled={applyingCoupon}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {applyingCoupon ? '...' : 'Apply'}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-[11px] text-rose-600 font-medium">{couponError}</p>
                  )}
                </form>
              )}
            </div>

            {/* Express Checkout Buttons (Apple Pay & Google Pay -> Hosted WooCommerce Stripe) */}
            <div className="w-full">
              <StripeExpressCheckout
                location="cart"
                items={cartItemsPayload}
                couponCode={appliedCoupon?.code || null}
                price={finalTotal}
                quantity={1}
                inStock={true}
              />
            </div>

            {/* Standard Checkout Button */}
            <button
              onClick={handleProceedToCheckout}
              disabled={isRedirectingCheckout || (Boolean(paymentConfig?.useWooHosted) && paymentConfig?.gatewayAvailable === false)}
              className="w-full py-3.5 bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <span>{isRedirectingCheckout ? 'Redirecting to WooCommerce Checkout...' : 'Proceed to Checkout'}</span>
              {!isRedirectingCheckout && <ArrowRight className="w-4 h-4" />}
            </button>

            <div className="pt-2 border-t border-slate-100 space-y-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>12-Month UK Warranty · Card, Apple Pay &amp; Google Pay via Stripe</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <span>30-Day Money-Back Guarantee, no hassle returns</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
