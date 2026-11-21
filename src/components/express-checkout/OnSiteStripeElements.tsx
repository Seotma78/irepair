import React, { useMemo, useState } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  ExpressCheckoutElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Lock, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  AllowedPaymentMethod,
  confirmOnsitePayment,
} from '../../services/paymentApi';

const stripePromiseCache = new Map<string, Promise<Stripe | null>>();

function getCachedStripePromise(publishableKey: string): Promise<Stripe | null> | null {
  const key = (publishableKey || '').trim();
  if (!key) return null;
  let existing = stripePromiseCache.get(key);
  if (!existing) {
    existing = loadStripe(key);
    stripePromiseCache.set(key, existing);
  }
  return existing;
}

export interface OnSiteStripeElementsProps {
  publishableKey: string;
  clientSecret: string;
  orderId: number;
  orderNumber: string;
  orderKey: string;
  amountLabel: string;
  allowedMethods: AllowedPaymentMethod[];
  buttonTheme?: 'black' | 'white' | 'white-outline';
  buttonHeight?: number;
  focusWallet?: 'apple_pay' | 'google_pay' | null;
  onPaymentSuccess: (result: { orderId: number; orderNumber: string; orderKey: string }) => void;
  onPaymentError?: (message: string) => void;
}

interface InnerFormProps {
  orderId: number;
  orderNumber: string;
  orderKey: string;
  amountLabel: string;
  allowedMethods: AllowedPaymentMethod[];
  buttonTheme?: 'black' | 'white' | 'white-outline';
  buttonHeight?: number;
  focusWallet?: 'apple_pay' | 'google_pay' | null;
  onPaymentSuccess: (result: { orderId: number; orderNumber: string; orderKey: string }) => void;
  onPaymentError?: (message: string) => void;
}

const OnSiteStripeInnerForm: React.FC<InnerFormProps> = ({
  orderId,
  orderNumber,
  orderKey,
  amountLabel,
  allowedMethods,
  buttonTheme = 'black',
  buttonHeight = 46,
  focusWallet = null,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expressReady, setExpressReady] = useState(false);
  const [expressAvailable, setExpressAvailable] = useState<boolean>(false);
  const [cardReady, setCardReady] = useState(false);

  const allowCard = allowedMethods.includes('card');
  const allowApple = allowedMethods.includes('apple_pay');
  const allowGoogle = allowedMethods.includes('google_pay');
  const allowWallets = allowApple || allowGoogle;

  const returnUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/order-confirmation/${orderId}/?key=${encodeURIComponent(orderKey)}`
      : `/order-confirmation/${orderId}/?key=${encodeURIComponent(orderKey)}`;

  const runStripeConfirm = async () => {
    if (!stripe || !elements) {
      const msg = 'Stripe payment form is still loading. Please wait a moment.';
      setErrorMsg(msg);
      onPaymentError?.(msg);
      return;
    }

    setErrorMsg(null);
    setStatusMessage('Authorising payment with Stripe...');
    setIsProcessing(true);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        const msg = submitError.message || 'Please check your payment details.';
        setErrorMsg(msg);
        onPaymentError?.(msg);
        setIsProcessing(false);
        setStatusMessage(null);
        return;
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: returnUrl,
        },
      });

      if (error) {
        const msg = error.message || 'Your card or wallet payment was declined.';
        setErrorMsg(msg);
        onPaymentError?.(msg);
        setIsProcessing(false);
        setStatusMessage(null);
        return;
      }

      if (paymentIntent && ['succeeded', 'requires_capture'].includes(paymentIntent.status)) {
        setStatusMessage('Verifying payment & confirming WooCommerce order...');
        await confirmOnsitePayment({
          orderId,
          orderKey,
          paymentIntentId: paymentIntent.id,
        });
        setIsProcessing(false);
        setStatusMessage(null);
        onPaymentSuccess({ orderId, orderNumber, orderKey });
        return;
      }

      const pendingMsg = `Payment status "${paymentIntent?.status || 'pending'}". Please complete authentication if prompted.`;
      setErrorMsg(pendingMsg);
      onPaymentError?.(pendingMsg);
    } catch (err: any) {
      const msg = err.message || 'Unable to confirm payment with WooCommerce.';
      setErrorMsg(msg);
      onPaymentError?.(msg);
    } finally {
      setIsProcessing(false);
      setStatusMessage(null);
    }
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    await runStripeConfirm();
  };

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {statusMessage && (
        <div className="p-3 rounded-xl bg-pink-50 border border-pink-200 text-[#DF0C88] text-xs font-semibold flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Apple Pay & Google Pay Wallet Buttons (Native Stripe Express Checkout Element) */}
      {allowWallets && (
        <div className={expressReady && !expressAvailable ? 'hidden' : 'space-y-2'}>
          {expressAvailable && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              {focusWallet === 'apple_pay'
                ? 'Express Apple Pay Wallet'
                : focusWallet === 'google_pay'
                ? 'Express Google Pay Wallet'
                : 'Express Wallet Payment'}
            </span>
          )}
          <ExpressCheckoutElement
            onReady={({ availablePaymentMethods }) => {
              setExpressReady(true);
              setExpressAvailable(
                Boolean(availablePaymentMethods?.applePay || availablePaymentMethods?.googlePay)
              );
            }}
            onClick={({ resolve }) => {
              resolve();
            }}
            onConfirm={async () => {
              await runStripeConfirm();
            }}
            onLoadError={() => {
              setExpressReady(true);
              setExpressAvailable(false);
            }}
            options={{
              buttonHeight: Math.min(55, Math.max(40, buttonHeight)),
              buttonTheme: {
                applePay: buttonTheme === 'white' ? 'white' : buttonTheme === 'white-outline' ? 'white-outline' : 'black',
                googlePay: buttonTheme === 'white' || buttonTheme === 'white-outline' ? 'white' : 'black',
              },
              paymentMethods: {
                applePay: allowApple ? 'always' : 'never',
                googlePay: allowGoogle ? 'always' : 'never',
                link: 'never',
                amazonPay: 'never',
                paypal: 'never',
                klarna: 'never',
              },
            }}
          />

          {focusWallet && expressReady && !expressAvailable && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
              {focusWallet === 'apple_pay'
                ? 'Apple Pay is unavailable in this browser/device — you can pay securely by Debit or Credit Card below.'
                : 'Google Pay is unavailable in this browser/session — you can pay securely by Debit or Credit Card below.'}
            </div>
          )}

          {allowCard && expressAvailable && (
            <div className="relative flex py-1.5 items-center">
              <div className="flex-grow border-t border-slate-200" />
              <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Or pay with card
              </span>
              <div className="flex-grow border-t border-slate-200" />
            </div>
          )}
        </div>
      )}

      {/* Debit / Credit Card Form via Stripe Payment Element */}
      {allowCard && (
        <form onSubmit={handleCardSubmit} className="space-y-4">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
            <PaymentElement
              onReady={() => setCardReady(true)}
              onLoadError={() => {
                setErrorMsg('Unable to load Stripe Card form. Please refresh and try again.');
              }}
              options={{
                layout: 'tabs',
                paymentMethodOrder: ['card'],
                wallets: {
                  applePay: 'never',
                  googlePay: 'never',
                },
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!stripe || !elements || !cardReady || isProcessing}
            className="w-full py-3.5 bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing Secure Payment...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Pay {amountLabel} Securely</span>
              </>
            )}
          </button>
        </form>
      )}

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-1">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>256-bit SSL encrypted · Direct WooCommerce &amp; Stripe confirmation</span>
      </div>
    </div>
  );
};

export const OnSiteStripeElements: React.FC<OnSiteStripeElementsProps> = (props) => {
  const stripePromise = useMemo(
    () => getCachedStripePromise(props.publishableKey),
    [props.publishableKey]
  );

  if (!stripePromise || !props.clientSecret) {
    return (
      <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
        Stripe Elements could not initialize (missing publishable key or client secret).
      </div>
    );
  }

  return (
    <Elements
      key={props.clientSecret}
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#DF0C88',
            colorText: '#0f172a',
            borderRadius: '10px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          },
        },
      }}
    >
      <OnSiteStripeInnerForm
        orderId={props.orderId}
        orderNumber={props.orderNumber}
        orderKey={props.orderKey}
        amountLabel={props.amountLabel}
        allowedMethods={props.allowedMethods}
        buttonTheme={props.buttonTheme}
        buttonHeight={props.buttonHeight}
        focusWallet={props.focusWallet}
        onPaymentSuccess={props.onPaymentSuccess}
        onPaymentError={props.onPaymentError}
      />
    </Elements>
  );
};
