import React, { useState, useEffect } from 'react';
import { WooCommerceOrder, customerAccountApi } from '../../services/customerAccountApi';
import { useApp } from '../../context/AppContext';
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  MapPin, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  RotateCcw, 
  XCircle, 
  MessageSquare,
  ExternalLink,
  ShieldCheck,
  Printer
} from 'lucide-react';

interface AccountOrderDetailProps {
  orderId: number;
  onBack: () => void;
  onOrderAgain: (order: WooCommerceOrder) => void;
  onPayNow: (order: WooCommerceOrder) => void;
}

export const AccountOrderDetail: React.FC<AccountOrderDetailProps> = ({
  orderId,
  onBack,
  onOrderAgain,
  onPayNow,
}) => {
  const { showNotification } = useApp();
  const [order, setOrder] = useState<WooCommerceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refund request modal state
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('Faulty item');
  const [refundDetails, setRefundDetails] = useState('');
  const [submittingRefund, setSubmittingRefund] = useState(false);

  // Cancel order modal
  const [cancellingOrder, setCancellingOrder] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    customerAccountApi.getOrder(orderId)
      .then((data) => {
        if (isMounted) {
          setOrder(data.order);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load order details');
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [orderId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="w-8 h-8 border-2 border-[#DF0C88] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading order #{orderId} from WooCommerce...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Unable to load order #{orderId}</h3>
        <p className="text-xs text-slate-500 mt-1">{error || 'Order not found'}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  const handleCancelOrder = async () => {
    if (!window.confirm(`Are you sure you want to cancel order #${order.number || order.id}?`)) {
      return;
    }
    setCancellingOrder(true);
    try {
      await customerAccountApi.cancelOrder(order.id);
      showNotification(`Order #${order.number || order.id} has been cancelled`, 'info');
      const refreshed = await customerAccountApi.getOrder(order.id);
      setOrder(refreshed.order);
    } catch (err: any) {
      showNotification(err.message || 'Could not cancel order', 'error');
    } finally {
      setCancellingOrder(false);
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRefund(true);
    try {
      await customerAccountApi.requestRefund(order.id, {
        reason: refundReason,
        details: refundDetails,
      });
      showNotification('Return request submitted. Our support team will contact you shortly.', 'success');
      setRefundModalOpen(false);
      setRefundDetails('');
    } catch (err: any) {
      showNotification(err.message || 'Failed to submit return request', 'error');
    } finally {
      setSubmittingRefund(false);
    }
  };

  const getStatusStep = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 4;
      case 'processing': return 2;
      case 'on-hold': return 1;
      case 'pending': return 1;
      case 'cancelled':
      case 'refunded':
      case 'failed': return 0;
      default: return 2;
    }
  };

  const currentStep = getStatusStep(order.status);
  const isPending = ['pending', 'failed', 'on-hold'].includes(order.status.toLowerCase());
  const canCancel = ['pending', 'on-hold'].includes(order.status.toLowerCase());

  // Extract courier tracking if present in meta
  const trackingNumber = order.meta_data?.find((m: any) => 
    m.key === '_tracking_number' || m.key === 'tracking_number' || m.key === '_royal_mail_tracking'
  )?.value || null;

  const courierName = order.meta_data?.find((m: any) => 
    m.key === '_tracking_provider' || m.key === 'courier'
  )?.value || 'Royal Mail';

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-[#DF0C88] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Orders</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {isPending && (
            <button
              onClick={() => onPayNow(order)}
              className="px-4 py-2 bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Pay Now</span>
            </button>
          )}

          <button
            onClick={() => onOrderAgain(order)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-pink-400" />
            <span>Order Again</span>
          </button>

          {canCancel && (
            <button
              onClick={handleCancelOrder}
              disabled={cancellingOrder}
              className="px-3 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              <span>Cancel Order</span>
            </button>
          )}

          <button
            onClick={() => setRefundModalOpen(true)}
            className="px-3 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-all cursor-pointer"
          >
            <span>Request Return / Refund</span>
          </button>

          <button
            onClick={() => window.print()}
            className="p-2 border border-slate-200 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition-colors"
            title="Print Receipt"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Order Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Header Bar */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-wider font-bold text-pink-400">
                Order #{order.number || order.id}
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-xs text-slate-300">
                Placed on {new Date(order.date_created).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="text-lg font-bold">
              Total: £{parseFloat(order.total || '0').toFixed(2)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300">Status:</span>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white backdrop-blur-xs">
              {order.status}
            </span>
          </div>
        </div>

        {/* Status Tracker Bar (for active orders) */}
        {currentStep > 0 && (
          <div className="p-6 bg-slate-50/70 border-b border-slate-200/80">
            <div className="max-w-2xl mx-auto">
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {/* Step 1 */}
                <div className={`flex flex-col items-center ${currentStep >= 1 ? 'text-[#DF0C88] font-bold' : 'text-slate-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 text-xs font-bold ${
                    currentStep >= 1 ? 'bg-[#DF0C88] text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    1
                  </div>
                  <span>Order Placed</span>
                </div>

                {/* Step 2 */}
                <div className={`flex flex-col items-center ${currentStep >= 2 ? 'text-[#DF0C88] font-bold' : 'text-slate-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 text-xs font-bold ${
                    currentStep >= 2 ? 'bg-[#DF0C88] text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    2
                  </div>
                  <span>Processing</span>
                </div>

                {/* Step 3 */}
                <div className={`flex flex-col items-center ${currentStep >= 3 ? 'text-[#DF0C88] font-bold' : 'text-slate-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 text-xs font-bold ${
                    currentStep >= 3 ? 'bg-[#DF0C88] text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    3
                  </div>
                  <span>Dispatched</span>
                </div>

                {/* Step 4 */}
                <div className={`flex flex-col items-center ${currentStep >= 4 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 text-xs font-bold ${
                    currentStep >= 4 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    4
                  </div>
                  <span>Delivered</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Courier Tracking Section if available */}
        {trackingNumber && (
          <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-emerald-700" />
              <div>
                <span className="text-xs font-bold text-emerald-900 block">
                  Courier Tracking: {courierName}
                </span>
                <span className="text-xs text-emerald-700 font-mono">
                  Tracking #: {trackingNumber}
                </span>
              </div>
            </div>
            <a
              href={`https://www.royalmail.com/track-your-item#/tracking-results/${trackingNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>Track Live</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Items List */}
        <div className="p-6">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-[#DF0C88]" />
            Order Items ({(order.line_items || []).length})
          </h4>

          <div className="divide-y divide-slate-100 border-y border-slate-100">
            {(order.line_items || []).map((item) => (
              <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    {item.image?.src ? (
                      <img src={item.image.src} alt={item.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <Package className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900">{item.name}</h5>
                    <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-2">
                      <span>Qty: <strong className="text-slate-800">{item.quantity}</strong></span>
                      <span>•</span>
                      <span>Unit: £{item.price ? parseFloat(String(item.price)).toFixed(2) : (parseFloat(item.total) / item.quantity).toFixed(2)}</span>
                    </div>

                    {/* Metadata (Storage, Color, Warranty) */}
                    {item.meta_data && item.meta_data.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {item.meta_data.map((meta, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600 font-medium">
                            {meta.key}: {String(meta.value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-slate-900">
                    £{parseFloat(item.total || '0').toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Financial Breakdown */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
            <div className="w-full max-w-xs space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-800">
                  £{parseFloat(order.subtotal || order.total || '0').toFixed(2)}
                </span>
              </div>

              {parseFloat(order.discount_total || '0') > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discounts Applied:</span>
                  <span className="font-semibold">-£{parseFloat(order.discount_total || '0').toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Shipping ({order.shipping_lines?.[0]?.method_title || 'Standard Tracked'}):</span>
                <span className="font-semibold text-slate-800">
                  {parseFloat(order.shipping_total || '0') === 0 ? 'FREE' : `£${parseFloat(order.shipping_total || '0').toFixed(2)}`}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>UK VAT (20% included):</span>
                <span className="font-semibold text-slate-800">
                  £{parseFloat(order.total_tax || '0').toFixed(2)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-extrabold text-slate-900 font-heading">
                <span>Total Paid:</span>
                <span className="text-[#DF0C88] text-base">
                  £{parseFloat(order.total || '0').toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Addresses & Payment Method Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Billing Address */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#DF0C88]" />
            Billing Address
          </h4>
          <div className="text-xs text-slate-600 space-y-0.5">
            <p className="font-semibold text-slate-800">{order.billing?.first_name} {order.billing?.last_name}</p>
            <p>{order.billing?.address_1}</p>
            {order.billing?.address_2 && <p>{order.billing?.address_2}</p>}
            <p>{order.billing?.city}{order.billing?.postcode ? `, ${order.billing?.postcode}` : ''}</p>
            <p>{order.billing?.country || 'United Kingdom'}</p>
            {order.billing?.email && <p className="text-slate-500 pt-1">Email: {order.billing?.email}</p>}
            {order.billing?.phone && <p className="text-slate-500">Phone: {order.billing?.phone}</p>}
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-emerald-600" />
            Delivery Address
          </h4>
          <div className="text-xs text-slate-600 space-y-0.5">
            <p className="font-semibold text-slate-800">{order.shipping?.first_name} {order.shipping?.last_name}</p>
            <p>{order.shipping?.address_1}</p>
            {order.shipping?.address_2 && <p>{order.shipping?.address_2}</p>}
            <p>{order.shipping?.city}{order.shipping?.postcode ? `, ${order.shipping?.postcode}` : ''}</p>
            <p>{order.shipping?.country || 'United Kingdom'}</p>
          </div>
        </div>

        {/* Payment & Courier Info */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-blue-600" />
            Payment & Courier
          </h4>
          <div className="text-xs text-slate-600 space-y-1.5">
            <div>
              <span className="text-slate-400 block text-[10px]">Payment Method:</span>
              <span className="font-semibold text-slate-800">
                {order.payment_method_title || order.payment_method || 'Online Payment'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Delivery Service:</span>
              <span className="font-semibold text-slate-800">
                {order.shipping_lines?.[0]?.method_title || 'Royal Mail Tracked Delivery'}
              </span>
            </div>
            {order.customer_note && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block text-[10px]">Customer Note:</span>
                <span className="italic text-slate-700">{order.customer_note}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Return / Refund Modal */}
      {refundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setRefundModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 z-10 border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 font-heading mb-1">
              Request Return or Refund
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Submit your return request for Order #{order.number || order.id}. Covered by our 30-day money-back guarantee.
            </p>

            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Return</label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                >
                  <option value="Faulty item">Faulty or not working as expected</option>
                  <option value="Cosmetic grade mismatch">Cosmetic condition differs from expectation</option>
                  <option value="Ordered wrong model">Ordered wrong model or colour</option>
                  <option value="Changed mind">Changed my mind (14-day cooling off)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Additional Details</label>
                <textarea
                  rows={3}
                  required
                  value={refundDetails}
                  onChange={(e) => setRefundDetails(e.target.value)}
                  placeholder="Please describe the issue in detail..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRefundModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRefund}
                  className="px-4 py-2 bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {submittingRefund ? 'Submitting...' : 'Submit Return Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
