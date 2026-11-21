import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Package, 
  Search, 
  Truck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

export const GuestOrderTrackingView: React.FC = () => {
  const { setCurrentPage, showNotification } = useApp();

  const [orderNumber, setOrderNumber] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('order') || '';
    }
    return '';
  });
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!orderNumber || !email) {
      setError('Please provide both your order number and billing email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/account/track-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No matching order found.');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Unable to track order. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Delivered / Completed</span>;
      case 'processing':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Processing & Packing</span>;
      case 'on-hold':
      case 'pending':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Awaiting Payment</span>;
      case 'cancelled':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">Cancelled</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
        <button onClick={() => setCurrentPage('home')} className="hover:text-slate-800 cursor-pointer">Home</button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-900 font-semibold">Track Your Order</span>
      </div>

      <div className="text-center max-w-xl mx-auto mb-8">
        <div className="w-12 h-12 rounded-2xl bg-pink-50 text-[#DF0C88] flex items-center justify-center mx-auto mb-3">
          <Truck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading">
          Guest Order Tracking
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          To track your order, please enter your Order ID in the box below and press the "Track Order" button. This was given to you on your receipt and in the confirmation email you received.
        </p>
      </div>

      {/* Lookup Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs max-w-xl mx-auto">
        {error && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleTrackSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Order ID / Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 10482"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30 focus:border-[#DF0C88]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Billing Email *
            </label>
            <input
              type="email"
              required
              placeholder="Email used during checkout"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30 focus:border-[#DF0C88]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold rounded-xl shadow-xs text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer active:scale-98"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Track Order</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Result Display */}
      {result && (
        <div className="mt-8 bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-pink-400 font-bold uppercase tracking-wider mb-1">
                Verified Order Found
              </div>
              <h3 className="text-lg font-bold font-heading">
                Order #{result.number || result.id}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Placed on {new Date(result.dateCreated).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div>
              {getStatusBadge(result.status)}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Courier Info */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-[#DF0C88]" />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Delivery Method: {result.shippingLines?.[0]?.method_title || 'Royal Mail Tracked'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Dispatched to {result.billing?.city}, {result.billing?.postcode}
                  </span>
                </div>
              </div>
            </div>

            {/* Line items */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Purchased Items ({result.lineItems?.length || 0})
              </h4>
              <div className="divide-y divide-slate-100 border-y border-slate-100">
                {(result.lineItems || []).map((item: any) => (
                  <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-900">{item.name}</span>
                      <span className="text-slate-500 block text-[11px]">Quantity: {item.quantity}</span>
                    </div>
                    <span className="font-bold text-slate-900">£{parseFloat(item.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-900">Total Order Amount:</span>
              <span className="text-base font-extrabold text-[#DF0C88] font-heading">
                £{parseFloat(result.total).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
