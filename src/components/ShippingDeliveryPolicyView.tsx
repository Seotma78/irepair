import React from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from './PageHeader';
import { Calendar, Truck, Mail, CreditCard, Clock, ShieldCheck } from 'lucide-react';

export const ShippingDeliveryPolicyView: React.FC = () => {
  const { setCurrentPage } = useApp();

  return (
    <div className="w-full bg-white text-slate-900">
      
      {/* Reusable Page Header Banner */}
      <PageHeader
        title="Shipping & Delivery Policy"
        breadcrumbs={[
          { label: 'Home', onClick: () => setCurrentPage('home') },
          { label: 'Shipping & Delivery Policy' }
        ]}
      />

      {/* Main Shipping & Delivery Policy Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 md:p-12 space-y-8">
          
          {/* Header Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-100">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Calendar className="w-4 h-4 text-[#DF0C88]" />
              <span>Effective Date: <strong className="text-slate-800">27-02-2025</strong></span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 border border-pink-200 text-[#DF0C88] text-[11px] font-bold">
              <Truck className="w-3.5 h-3.5" />
              <span>UK Mainland Dispatch</span>
            </div>
          </div>

          <div className="space-y-8 text-sm sm:text-base text-slate-700 leading-relaxed">
            
            {/* Delivery Timeframes */}
            <div className="space-y-3">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                Delivery Timeframes
              </h2>
              <ul className="list-disc list-outside pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
                <li>All goods will be delivered within 30 days of order confirmation unless a longer period is mutually agreed upon in writing (e.g., for custom orders).</li>
                <li>Delays due to unforeseen circumstances (e.g., supply chain issues) will be communicated promptly, and customers may cancel for a full refund if the new timeframe is unacceptable.</li>
              </ul>
            </div>

            {/* Delivery Costs */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                Delivery Costs
              </h2>
              <ul className="list-disc list-outside pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
                <li>Postage fees (if applicable) are displayed clearly during checkout.</li>
                <li>Free delivery may apply for specific promotions or repair services—details will be provided before payment.</li>
              </ul>
            </div>

            {/* Tracking & Confirmation */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                Tracking &amp; Confirmation
              </h2>
              <ul className="list-disc list-outside pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
                <li>Customers receive an order confirmation email immediately after purchase, containing a summary of the contract (e.g., item description, price, delivery address).</li>
                <li>A dispatch notification with tracking information is sent once goods are shipped.</li>
              </ul>
            </div>

            {/* Payment Methods */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                Payment Methods
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm">Accepted payment options include:</p>
              <ul className="list-disc list-outside pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
                <li>Credit/Debit Cards (Visa, Mastercard)</li>
                <li>PayPal</li>
                <li>Apple Pay/Google Pay</li>
              </ul>
            </div>

            {/* International Shipping */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                International Shipping
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm">
                Currently, we only ship within the UK.
              </p>
            </div>

            {/* Compliance Note */}
            <div className="pt-6 border-t border-slate-200 bg-slate-50/70 p-5 sm:p-6 rounded-2xl border space-y-3 text-xs sm:text-sm text-slate-600">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                Compliance Note:
              </h3>
              <p className="leading-relaxed">
                Fone &amp; Cases Limited trading as iRepair<br />
                Registered in England &amp; Wales (Company No. 14427155)<br />
                Registered Office: 20 West Street, Horsham, West Sussex, RH12 1PB
              </p>
              <p className="text-slate-800 font-medium pt-1">
                For shipping-related inquiries, email us at{' '}
                <a 
                  href="mailto:info@irepair-mobiles.co.uk" 
                  className="text-[#DF0C88] font-bold hover:underline"
                >
                  info@irepair-mobiles.co.uk
                </a>
              </p>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
};
