import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import {
  ShieldCheck,
  CreditCard,
  Lock,
  ShoppingBag,
  User,
  Mail,
  Phone,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { StripeExpressCheckout } from './express-checkout/StripeExpressCheckout';
import { OnSiteStripeElements } from './express-checkout/OnSiteStripeElements';
import {
  fetchPaymentConfig,
  fetchLiveShippingOptions,
  createHostedHandoff,
  createOnsitePaymentIntent,
  createSimulatedTestOrder,
  PublicPaymentConfig,
  LiveShippingOption,
  PaymentCartItemPayload,
  OnsiteIntentResponse,
} from '../services/paymentApi';

export const CheckoutView: React.FC = () => {
  const {
    cart,
    cartSubtotal,
    appliedCoupon,
    clearCart,
    setCurrentPage,
    showNotification,
  } = useApp();

  const { customer, isAuthenticated, openAuthModal } = useCustomerAuth();

  const [paymentConfig, setPaymentConfig] = useState<PublicPaymentConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Live WooCommerce shipping rates (Style 2)
  const [shippingRates, setShippingRates] = useState<LiveShippingOption[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<string>('');
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  // Customer Contact
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [createAccount, setCreateAccount] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');

  // Shipping & Billing Addresses
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [county, setCounty] = useState('');
  const [postcode, setPostcode] = useState('');
  const [country, setCountry] = useState('GB');
  const [sameAsShipping, setSameAsShipping] = useState(true);

  const [billingFirstName, setBillingFirstName] = useState('');
  const [billingLastName, setBillingLastName] = useState('');
  const [billingAddress1, setBillingAddress1] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingPostcode, setBillingPostcode] = useState('');

  const [orderNotes, setOrderNotes] = useState('');
  // Used ONLY when Dev/Staging Simulated Mode is active
  const [simMethod, setSimMethod] = useState<'card' | 'apple_pay' | 'google_pay'>('card');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onsiteSession, setOnsiteSession] = useState<OnsiteIntentResponse | null>(null);
  const attemptKeyRef = useRef<string>('');
  const paymentStepRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchPaymentConfig()
      .then((cfg) => {
        if (mounted) {
          setPaymentConfig(cfg);
          setLoadingConfig(false);
        }
      })
      .catch(() => {
        if (mounted) setLoadingConfig(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const requiresOrderPayFallback = Boolean(
    paymentConfig?.useWooHosted &&
      paymentConfig?.handoffStyle === 'hosted_checkout' &&
      paymentConfig?.supportsDirectMultiItemHandoff === false &&
      (cart.length > 1 || Boolean(appliedCoupon))
  );

  useEffect(() => {
    attemptKeyRef.current = '';
    setOnsiteSession(null);
  }, [cart, appliedCoupon, selectedShippingId, email, firstName, lastName, address1, city, postcode]);

  // Load live WooCommerce shipping options when in Style 2 (order_pay) or preview multi-item fallback
  useEffect(() => {
    if (
      !paymentConfig?.useWooHosted ||
      (paymentConfig.handoffStyle !== 'order_pay' && !requiresOrderPayFallback) ||
      cart.length === 0
    ) {
      return;
    }
    let mounted = true;
    setLoadingShipping(true);
    setShippingError(null);
    fetchLiveShippingOptions(cartSubtotal)
      .then((data) => {
        if (!mounted) return;
        const rates = data.rates || [];
        setShippingRates(rates);
        if (rates.length > 0) {
          setSelectedShippingId((prev) => prev || rates[0].id);
        }
      })
      .catch((err: any) => {
        if (mounted) setShippingError(err.message || 'Unable to fetch WooCommerce shipping options.');
      })
      .finally(() => {
        if (mounted) setLoadingShipping(false);
      });
    return () => {
      mounted = false;
    };
  }, [paymentConfig?.useWooHosted, paymentConfig?.handoffStyle, requiresOrderPayFallback, cartSubtotal, cart.length]);

  // Pre-fill customer profile fields
  useEffect(() => {
    if (customer) {
      setEmail(customer.email || '');
      setFirstName(customer.firstName || '');
      setLastName(customer.lastName || '');
      const ship = customer.shipping || {};
      const bill = customer.billing || {};

      if (ship.address_1) {
        setAddress1(ship.address_1 || '');
        setAddress2(ship.address_2 || '');
        setCity(ship.city || '');
        setCounty(ship.state || '');
        setPostcode(ship.postcode || '');
        setCountry(ship.country || 'GB');
      } else if (bill.address_1) {
        setAddress1(bill.address_1 || '');
        setAddress2(bill.address_2 || '');
        setCity(bill.city || '');
        setCounty(bill.state || '');
        setPostcode(bill.postcode || '');
        setCountry(bill.country || 'GB');
      }
      if (bill.phone) setPhone(bill.phone);
    }
  }, [customer]);

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 font-heading">Your cart is empty</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          Add a refurbished smartphone, laptop, or accessory to proceed with checkout.
        </p>
        <button
          onClick={() => setCurrentPage('shop')}
          className="px-6 py-2.5 bg-[#DF0C88] text-white text-xs font-bold rounded-xl hover:bg-[#C50875] cursor-pointer"
        >
          Browse Our Products
        </button>
      </div>
    );
  }

  if (loadingConfig) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <RefreshCw className="w-8 h-8 text-[#DF0C88] animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Connecting to WooCommerce payment gateway...</p>
      </div>
    );
  }

  const cartItemsPayload: PaymentCartItemPayload[] = cart.map((item) => ({
    productId: item.product.id,
    variationId: item.selectedVariationId || undefined,
    quantity: item.quantity,
    selectedAttributes: item.selectedAttributes,
  }));

  const selectedShippingObj = shippingRates.find((r) => r.id === selectedShippingId) || shippingRates[0];
  const shippingCost = paymentConfig?.isSimulatedMode
    ? cartSubtotal >= 50 ? 0 : 4.95
    : appliedCoupon?.freeShipping
    ? 0
    : selectedShippingObj
    ? selectedShippingObj.cost
    : cartSubtotal >= 50 ? 0 : 4.95;

  const discountAmount = appliedCoupon?.discount || 0;
  const totalAmount = Math.max(0, cartSubtotal - discountAmount) + shippingCost;
  const vatAmount = (totalAmount * 0.20) / 1.20;

  const allowedLabels = [
    paymentConfig?.wallets?.card !== false ? 'Debit / Credit Card' : null,
    paymentConfig?.wallets?.applePay !== false ? 'Apple Pay' : null,
    paymentConfig?.wallets?.googlePay !== false ? 'Google Pay' : null,
  ].filter(Boolean) as string[];

  // Style 1 Hosted Checkout Redirect (no duplicate address collection in React)
  const handleHostedCheckoutHandoff = async () => {
    setError(null);
    if (!paymentConfig?.gatewayAvailable) {
      setError(paymentConfig?.unavailableMessage || 'Payments are temporarily unavailable. Please try again shortly.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (!attemptKeyRef.current) {
        attemptKeyRef.current = `chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      }
      try {
        localStorage.setItem('irepair_clear_cart_source', 'checkout');
      } catch (_) {}
      const res = await createHostedHandoff({
        items: cartItemsPayload,
        couponCode: appliedCoupon?.code || undefined,
        source: 'checkout',
        idempotencyKey: attemptKeyRef.current,
      });
      if (res.mode === 'order_pay_required' || !res.redirectUrl.startsWith('http')) {
        setIsSubmitting(false);
        return;
      }
      window.location.assign(res.redirectUrl);
    } catch (err: any) {
      attemptKeyRef.current = '';
      setError(err.message || 'Unable to start WooCommerce hosted checkout.');
      setIsSubmitting(false);
    }
  };

  // Style 2 Order-Pay OR Dev/Staging Simulated Checkout
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !firstName || !lastName || !address1 || !city || !postcode) {
      setError('Please fill in all mandatory contact and delivery address fields.');
      window.scrollTo({ top: 100, behavior: 'smooth' });
      return;
    }

    if (country === 'GB') {
      const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();
      const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/;
      if (!ukPostcodeRegex.test(cleanPostcode)) {
        setError('Please enter a valid UK postcode (e.g. SW1A 1AA or NR1 1TR).');
        return;
      }
    }

    setIsSubmitting(true);

    const billingPayload = {
      firstName: sameAsShipping ? firstName : billingFirstName || firstName,
      lastName: sameAsShipping ? lastName : billingLastName || lastName,
      address1: sameAsShipping ? address1 : billingAddress1 || address1,
      address2: sameAsShipping ? address2 : '',
      city: sameAsShipping ? city : billingCity || city,
      county,
      postcode: (sameAsShipping ? postcode : billingPostcode || postcode).toUpperCase(),
      country,
      email: email.trim().toLowerCase(),
      phone,
    };

    const shippingPayload = {
      firstName,
      lastName,
      address1,
      address2,
      city,
      county,
      postcode: postcode.toUpperCase(),
      country,
    };

    try {
      // Dev/Staging Simulated Mode ONLY
      if (paymentConfig?.isSimulatedMode && !paymentConfig.useWooHosted) {
        const label =
          simMethod === 'apple_pay'
            ? 'Apple Pay'
            : simMethod === 'google_pay'
            ? 'Google Pay'
            : 'Debit / Credit Card';
        const sim = await createSimulatedTestOrder({
          items: cartItemsPayload,
          billing: billingPayload,
          paymentMethodTitle: label,
        });
        clearCart();
        showNotification(`Simulated order ${sim.orderNumber} created (Dev Mode)`, 'info');
        window.history.pushState({}, '', `/order-confirmation/${sim.orderId}/?key=${sim.orderKey}`);
        setCurrentPage('order-confirmation');
        return;
      }

      // Real Hosted WooCommerce Style 2: create pending WC order & redirect to WP /checkout/order-pay/
      if (!paymentConfig?.gatewayAvailable) {
        throw new Error(paymentConfig?.unavailableMessage || 'Payments are temporarily unavailable. Please try again shortly.');
      }

      if (!customer && createAccount && accountPassword) {
        try {
          await fetch('/api/customer/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName,
              lastName,
              email,
              password: accountPassword,
              termsAccepted: true,
            }),
          });
        } catch (_) {}
      }

      if (!attemptKeyRef.current) {
        attemptKeyRef.current = `onsite_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      }

      const res = await createOnsitePaymentIntent({
        items: cartItemsPayload,
        billing: billingPayload,
        shipping: shippingPayload,
        shippingOptionId: selectedShippingId || undefined,
        couponCode: appliedCoupon?.code || undefined,
        customerNote: orderNotes,
        idempotencyKey: attemptKeyRef.current,
      });

      setOnsiteSession(res);
      setIsSubmitting(false);
      setTimeout(() => {
        paymentStepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } catch (err: any) {
      attemptKeyRef.current = '';
      setError(err.message || 'Unable to initialize Stripe payment form. Please try again.');
      setIsSubmitting(false);
    }
  };

  const isHostedStyle1 = Boolean(
    paymentConfig?.useWooHosted &&
      paymentConfig?.handoffStyle === 'hosted_checkout' &&
      !requiresOrderPayFallback
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
        <button onClick={() => setCurrentPage('home')} className="hover:text-slate-800 cursor-pointer">Home</button>
        <ChevronRight className="w-3.5 h-3.5" />
        <button onClick={() => setCurrentPage('cart')} className="hover:text-slate-800 cursor-pointer">Cart</button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-900 font-semibold">Secure Checkout</span>
      </div>

      {/* Dev/Staging Simulated Banner */}
      {paymentConfig?.isSimulatedMode && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-100 border-2 border-amber-400 text-amber-950 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
          <div>
            <strong className="block font-extrabold uppercase">SIMULATED PAYMENT, NO REAL MONEY</strong>
            <span>Development / Staging simulated mode is enabled in Settings &gt; Payments. No real money is charged, no WooCommerce order is created, and no emails are sent.</span>
          </div>
        </div>
      )}

      {/* Gateway Unavailable Banner */}
      {paymentConfig?.useWooHosted && !paymentConfig.gatewayAvailable && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <strong className="block font-bold">Payments Temporarily Unavailable</strong>
            <span>{paymentConfig.unavailableMessage || 'Payments are temporarily unavailable. Please try again shortly.'}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 font-heading">
            Secure Checkout
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Powered by WooCommerce &amp; Stripe Gateway · {allowedLabels.join(' · ')}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Buyer Protection Guaranteed</span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
          <div>
            <strong className="block font-bold">Please check the following:</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {!isAuthenticated && (
        <div className="mb-6 p-4 bg-slate-900 text-white rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-pink-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold block">Already have an iRepair account?</span>
              <span className="text-slate-300">Sign in to checkout with your saved delivery details.</span>
            </div>
          </div>
          <button
            onClick={() => openAuthModal('login')}
            className="px-4 py-2 bg-[#DF0C88] hover:bg-[#C50875] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer self-start sm:self-center shrink-0"
          >
            Sign In Now
          </button>
        </div>
      )}

      {!requiresOrderPayFallback && (
        <div className="mb-6">
          <StripeExpressCheckout
            location="checkout"
            items={cartItemsPayload}
            couponCode={appliedCoupon?.code || null}
            price={cartSubtotal}
            quantity={1}
            inStock={true}
          />
        </div>
      )}

      {/* STYLE 1: Hosted WooCommerce Checkout Handoff (No duplicate address or fake card fields) */}
      {isHostedStyle1 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-50 text-[#DF0C88] flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 font-heading">
                  Hosted WooCommerce Stripe Checkout
                </h2>
                <p className="text-xs text-slate-500">
                  Your delivery address and payment details are entered securely on our official WooCommerce checkout page processed by Stripe.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <span className="font-bold text-slate-800 block">Accepted Payment Methods</span>
              <div className="flex flex-wrap gap-2">
                {allowedLabels.map((lbl) => (
                  <span
                    key={lbl}
                    className="px-3 py-1 rounded-lg bg-white border border-slate-200 font-semibold text-slate-800"
                  >
                    {lbl}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                Once payment succeeds, you will be returned straight back to your order confirmation page here.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleHostedCheckoutHandoff}
                disabled={isSubmitting || !paymentConfig?.gatewayAvailable}
                className="px-6 py-3.5 bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Transferring Basket to WooCommerce...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Continue to Secure WooCommerce Payment</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage('cart')}
                className="px-4 py-3.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Edit Basket
              </button>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-heading">
                Order Review ({cart.length} items)
              </h3>
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {cart.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-10 h-10 aspect-square bg-white rounded-lg border border-slate-200 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                        <img src={item.variationImage || item.product.image} alt={item.product.title} className="w-full h-full object-contain object-center" />
                      </div>
                      <div className="truncate">
                        <span className="font-semibold text-slate-900 block truncate">{item.product.title}</span>
                        <span className="text-[11px] text-slate-400">Qty: {item.quantity}</span>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900 shrink-0">
                      £{((item.unitPrice ?? item.product.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline text-sm font-bold text-slate-900">
                <span>Items Subtotal:</span>
                <span className="text-lg font-extrabold text-[#DF0C88]">£{cartSubtotal.toFixed(2)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-xs text-emerald-700 font-semibold">
                  <span>Coupon ({appliedCoupon.code}):</span>
                  <span>-£{appliedCoupon.discount.toFixed(2)}</span>
                </div>
              )}
              <p className="text-[11px] text-slate-500">
                Final live UK shipping &amp; VAT are confirmed on the WooCommerce Stripe checkout page before payment.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* STYLE 2 (order_pay) OR Dev/Staging Simulated Checkout */
        <form onSubmit={handleFormSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* STEP 1: CONTACT DETAILS */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-[#DF0C88] text-white text-xs font-bold flex items-center justify-center">
                  1
                </div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-heading">
                  Customer Contact Details
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="We will send order updates here"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="First name"
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
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telephone Number *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      placeholder="For courier delivery SMS updates"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                    />
                  </div>
                </div>
              </div>

              {!isAuthenticated && paymentConfig?.useWooHosted && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 select-none">
                    <input
                      type="checkbox"
                      checked={createAccount}
                      onChange={(e) => setCreateAccount(e.target.checked)}
                      className="rounded border-slate-300 text-[#DF0C88] focus:ring-[#DF0C88] w-4 h-4"
                    />
                    <span>Create an iRepair account to track orders and save details</span>
                  </label>

                  {createAccount && (
                    <div className="mt-3 max-w-sm">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Create Password *</label>
                      <input
                        type="password"
                        required
                        placeholder="At least 8 characters"
                        value={accountPassword}
                        onChange={(e) => setAccountPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* STEP 2: DELIVERY ADDRESS */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-[#DF0C88] text-white text-xs font-bold flex items-center justify-center">
                  2
                </div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-heading">
                  Delivery Address
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">House Name / Number &amp; Street *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 42 High Street"
                    value={address1}
                    onChange={(e) => setAddress1(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Apartment, Suite, Unit (Optional)</label>
                  <input
                    type="text"
                    placeholder="Flat 3B"
                    value={address2}
                    onChange={(e) => setAddress2(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Town / City *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. London"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">County (Optional)</label>
                    <input
                      type="text"
                      placeholder="County"
                      value={county}
                      onChange={(e) => setCounty(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">UK Postcode *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SW1A 1AA"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                    >
                      <option value="GB">United Kingdom (UK)</option>
                      <option value="IE">Ireland</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 select-none">
                    <input
                      type="checkbox"
                      checked={sameAsShipping}
                      onChange={(e) => setSameAsShipping(e.target.checked)}
                      className="rounded border-slate-300 text-[#DF0C88] focus:ring-[#DF0C88] w-4 h-4"
                    />
                    <span>Billing address is the same as my delivery address</span>
                  </label>

                  {!sameAsShipping && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <h3 className="text-xs font-bold text-slate-900 uppercase">Billing Address</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder="First name" value={billingFirstName} onChange={(e) => setBillingFirstName(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs" />
                        <input type="text" placeholder="Last name" value={billingLastName} onChange={(e) => setBillingLastName(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs" />
                      </div>
                      <input type="text" placeholder="Billing street address" value={billingAddress1} onChange={(e) => setBillingAddress1(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs" />
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder="Town / City" value={billingCity} onChange={(e) => setBillingCity(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs" />
                        <input type="text" placeholder="Postcode" value={billingPostcode} onChange={(e) => setBillingPostcode(e.target.value.toUpperCase())} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs uppercase font-mono" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* STEP 3: SHIPPING METHOD (Live from WooCommerce when Hosted ON) */}
            {paymentConfig?.useWooHosted && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-[#DF0C88] text-white text-xs font-bold flex items-center justify-center">
                    3
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-heading">
                    Live WooCommerce Shipping Method
                  </h2>
                </div>

                {loadingShipping ? (
                  <p className="text-xs text-slate-500">Loading live UK shipping options...</p>
                ) : shippingError ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                    {shippingError}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {shippingRates.map((rate) => (
                      <label
                        key={rate.id}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          selectedShippingId === rate.id ? 'border-[#DF0C88] bg-pink-50/40 shadow-xs' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="delivery"
                            checked={selectedShippingId === rate.id}
                            onChange={() => setSelectedShippingId(rate.id)}
                            className="text-[#DF0C88] focus:ring-[#DF0C88]"
                          />
                          <span className="text-xs font-bold text-slate-900">{rate.title}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-900">
                          {rate.cost === 0 ? <strong className="text-emerald-700">FREE</strong> : `£${rate.cost.toFixed(2)}`}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Order Notes &amp; Delivery Instructions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Special delivery instructions..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                  />
                </div>
              </div>
            )}

            {/* STEP 4: PAYMENT INFORMATION (STRICTLY Card, Apple Pay, Google Pay ONLY — On-Site React Stripe Elements) */}
            <div ref={paymentStepRef} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#DF0C88] text-white text-xs font-bold flex items-center justify-center">
                    {paymentConfig?.useWooHosted ? '4' : '3'}
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-heading">
                    On-Site Stripe Payment
                  </h2>
                </div>
                {onsiteSession && (
                  <button
                    type="button"
                    onClick={() => {
                      setOnsiteSession(null);
                      attemptKeyRef.current = '';
                    }}
                    className="text-xs font-semibold text-[#DF0C88] hover:underline cursor-pointer"
                  >
                    Edit Contact / Address
                  </button>
                )}
              </div>

              {paymentConfig?.useWooHosted ? (
                onsiteSession ? (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-2">
                      <span>
                        Order <strong>#{onsiteSession.orderNumber}</strong> created in WooCommerce ({onsiteSession.stripeMode.toUpperCase()} mode). Complete payment below without leaving this page.
                      </span>
                      <span className="font-bold shrink-0">£{parseFloat(onsiteSession.total).toFixed(2)}</span>
                    </div>

                    <OnSiteStripeElements
                      publishableKey={onsiteSession.publishableKey}
                      clientSecret={onsiteSession.clientSecret}
                      orderId={onsiteSession.orderId}
                      orderNumber={onsiteSession.orderNumber}
                      orderKey={onsiteSession.orderKey}
                      amountLabel={`£${parseFloat(onsiteSession.total).toFixed(2)}`}
                      allowedMethods={paymentConfig.allowedMethods}
                      buttonTheme={paymentConfig.buttonStyle?.theme}
                      buttonHeight={paymentConfig.buttonStyle?.height}
                      onPaymentSuccess={({ orderId, orderNumber, orderKey }) => {
                        try {
                          localStorage.removeItem('irepair_clear_cart_source');
                        } catch (_) {}
                        clearCart();
                        showNotification(`Order #${orderNumber} confirmed!`, 'success');
                        window.history.pushState(
                          {},
                          '',
                          `/order-confirmation/${orderId}/?key=${encodeURIComponent(orderKey)}`
                        );
                        setCurrentPage('order-confirmation');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onPaymentError={(msg) => setError(msg)}
                    />
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-[#DF0C88]" />
                        <span>On-Site Stripe Elements ({allowedLabels.join(' · ')})</span>
                      </span>
                      <Lock className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-slate-600">
                      Complete your contact details, UK delivery address &amp; shipping method above, then click <strong>Continue to Secure Payment</strong> to load Stripe&apos;s encrypted card &amp; wallet form right here — no redirect.
                    </p>
                  </div>
                )
              ) : (
                <div className="space-y-2.5 text-xs">
                  {paymentConfig?.allowedMethods.map((m) => (
                    <label
                      key={m}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer ${
                        simMethod === m ? 'border-amber-500 bg-amber-50' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="simPayment"
                          checked={simMethod === m}
                          onChange={() => setSimMethod(m)}
                        />
                        <span className="font-bold text-slate-900">
                          {m === 'apple_pay' ? 'Apple Pay (Simulated Test)' : m === 'google_pay' ? 'Google Pay (Simulated Test)' : 'Debit / Credit Card (Simulated Test)'}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-950">
                        TEST ONLY
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sticky Order Summary */}
          <div>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5 sticky top-24">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-heading">
                Order Review ({cart.length} items)
              </h3>

              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {cart.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-10 h-10 aspect-square bg-white rounded-lg border border-slate-200 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                        <img src={item.variationImage || item.product.image} alt={item.product.title} className="w-full h-full object-contain object-center" />
                      </div>
                      <div className="truncate">
                        <span className="font-semibold text-slate-900 block truncate">{item.product.title}</span>
                        <span className="text-[11px] text-slate-400">Qty: {item.quantity}</span>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900 shrink-0">
                      £{((item.unitPrice ?? item.product.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-xs pt-3 border-t border-slate-100">
                <div className="flex justify-between text-slate-600">
                  <span>Items Subtotal:</span>
                  <span className="font-semibold text-slate-900">£{cartSubtotal.toFixed(2)}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Coupon ({appliedCoupon.code}):</span>
                    <span className="font-semibold">-£{appliedCoupon.discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>Shipping:</span>
                  <span className="font-semibold text-slate-900">
                    {shippingCost === 0 ? <strong className="text-emerald-700">FREE</strong> : `£${shippingCost.toFixed(2)}`}
                  </span>
                </div>

                <div className="flex justify-between text-slate-500">
                  <span>Includes 20% UK VAT:</span>
                  <span>£{vatAmount.toFixed(2)}</span>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-900 font-heading">Total Due:</span>
                  <span className="text-xl font-extrabold text-[#DF0C88] font-heading">
                    £{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-600 select-none">
                <input
                  type="checkbox"
                  required
                  defaultChecked
                  className="mt-0.5 rounded border-slate-300 text-[#DF0C88] focus:ring-[#DF0C88] w-4 h-4 shrink-0"
                />
                <span>
                  I agree to the <a href="/terms-of-use/" className="text-[#DF0C88] underline" target="_blank">Terms &amp; Conditions</a> and <a href="/return-cancellation-policy/" className="text-[#DF0C88] underline" target="_blank">Returns Policy</a>.
                </span>
              </label>

              {onsiteSession ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-semibold text-center">
                  Order #{onsiteSession.orderNumber} ready — complete payment in Step 4 on the left.
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || (Boolean(paymentConfig?.useWooHosted) && !paymentConfig?.gatewayAvailable)}
                  className="w-full py-3.5 bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer active:scale-98"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Preparing On-Site Payment...</span>
                    </div>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>
                        {paymentConfig?.isSimulatedMode
                          ? `Create Simulated TEST Order • £${totalAmount.toFixed(2)}`
                          : `Continue to On-Site Payment • £${totalAmount.toFixed(2)}`}
                      </span>
                    </>
                  )}
                </button>
              )}

              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>12-Month UK Warranty · Card, Apple Pay &amp; Google Pay</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
