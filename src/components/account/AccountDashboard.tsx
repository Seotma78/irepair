import React from 'react';
import { CustomerProfile } from '../../services/customerAuthApi';
import { WooCommerceOrder } from '../../services/customerAccountApi';
import { 
  Package, 
  MapPin, 
  CreditCard, 
  Heart, 
  ArrowRight, 
  Clock, 
  ShieldCheck, 
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  UserCheck
} from 'lucide-react';

interface AccountDashboardProps {
  customer: CustomerProfile;
  orders: WooCommerceOrder[];
  onNavigateTab: (tab: string, extra?: any) => void;
  onLogout: () => void;
}

export const AccountDashboard: React.FC<AccountDashboardProps> = ({
  customer,
  orders,
  onNavigateTab,
  onLogout,
}) => {
  const recentOrders = orders.slice(0, 3);
  const billing = customer.billing || {};
  const shipping = customer.shipping || {};

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Completed</span>;
      case 'processing':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Processing</span>;
      case 'on-hold':
      case 'pending':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Payment Pending</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">Cancelled</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-[#DF0C88]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#DF0C88] text-white">
                Customer Account
              </span>
              <span className="text-xs text-slate-300">WooCommerce Verified</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold font-heading">
              Hello, {customer.firstName || customer.displayName || 'Customer'}!
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              From your account dashboard you can view your{' '}
              <button 
                onClick={() => onNavigateTab('orders')}
                className="text-pink-400 font-semibold underline hover:text-pink-300"
              >
                recent orders
              </button>, manage your{' '}
              <button 
                onClick={() => onNavigateTab('addresses')}
                className="text-pink-400 font-semibold underline hover:text-pink-300"
              >
                shipping & billing addresses
              </button>, and edit your password.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('orders')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 text-pink-400" />
              <span>Orders ({orders.length})</span>
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigateTab('orders')}
          className="p-4 bg-white rounded-xl border border-slate-200/80 hover:border-[#DF0C88]/50 hover:shadow-md transition-all text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-lg bg-pink-50 text-[#DF0C88] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Package className="w-5 h-5" />
          </div>
          <div className="text-sm font-bold text-slate-900">My Orders</div>
          <p className="text-[11px] text-slate-500 mt-0.5">{orders.length} order(s) placed</p>
        </button>

        <button
          onClick={() => onNavigateTab('addresses')}
          className="p-4 bg-white rounded-xl border border-slate-200/80 hover:border-[#DF0C88]/50 hover:shadow-md transition-all text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="text-sm font-bold text-slate-900">Saved Addresses</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Billing & Delivery</p>
        </button>

        <button
          onClick={() => onNavigateTab('payment-methods')}
          className="p-4 bg-white rounded-xl border border-slate-200/80 hover:border-[#DF0C88]/50 hover:shadow-md transition-all text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="text-sm font-bold text-slate-900">Payment Methods</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Cards & Stripe</p>
        </button>

        <button
          onClick={() => onNavigateTab('wishlist')}
          className="p-4 bg-white rounded-xl border border-slate-200/80 hover:border-[#DF0C88]/50 hover:shadow-md transition-all text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Heart className="w-5 h-5" />
          </div>
          <div className="text-sm font-bold text-slate-900">My Wishlist</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Saved Devices</p>
        </button>
      </div>

      {/* Recent Orders Overview */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#DF0C88]" />
            <h3 className="text-sm font-bold text-slate-900 font-heading">Recent Orders</h3>
          </div>
          {orders.length > 0 && (
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-semibold text-[#DF0C88] hover:text-[#C50875] flex items-center gap-1 cursor-pointer"
            >
              <span>View All ({orders.length})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No orders placed yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              You have not placed any orders through iRepair Mobiles yet. Explore our genuine refurbished smartphones or book a device repair today.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentOrders.map((order) => (
              <div 
                key={order.id} 
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 font-bold text-xs">
                    #{order.number || order.id}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">
                        Order #{order.number || order.id}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(order.date_created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>•</span>
                      <span>{order.line_items?.length || 0} items</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Total</span>
                    <span className="text-sm font-bold text-slate-900">
                      £{parseFloat(order.total || '0').toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={() => onNavigateTab('order-detail', { orderId: order.id })}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-[#DF0C88] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Order</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Address Quick Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Billing Address Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#DF0C88]" />
              Default Billing Address
            </h4>
            <button
              onClick={() => onNavigateTab('addresses')}
              className="text-xs font-semibold text-[#DF0C88] hover:underline cursor-pointer"
            >
              Edit
            </button>
          </div>
          {billing.address_1 ? (
            <div className="text-xs text-slate-600 space-y-0.5">
              <p className="font-semibold text-slate-800">{billing.first_name} {billing.last_name}</p>
              <p>{billing.address_1}</p>
              {billing.address_2 && <p>{billing.address_2}</p>}
              <p>{billing.city}{billing.postcode ? `, ${billing.postcode}` : ''}</p>
              <p>{billing.country || 'United Kingdom'}</p>
              {billing.phone && <p className="text-slate-500 pt-1">Tel: {billing.phone}</p>}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No billing address set yet.</p>
          )}
        </div>

        {/* Shipping Address Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Default Shipping Address
            </h4>
            <button
              onClick={() => onNavigateTab('addresses')}
              className="text-xs font-semibold text-[#DF0C88] hover:underline cursor-pointer"
            >
              Edit
            </button>
          </div>
          {shipping.address_1 ? (
            <div className="text-xs text-slate-600 space-y-0.5">
              <p className="font-semibold text-slate-800">{shipping.first_name} {shipping.last_name}</p>
              <p>{shipping.address_1}</p>
              {shipping.address_2 && <p>{shipping.address_2}</p>}
              <p>{shipping.city}{shipping.postcode ? `, ${shipping.postcode}` : ''}</p>
              <p>{shipping.country || 'United Kingdom'}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No shipping address set yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};
