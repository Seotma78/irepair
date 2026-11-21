import React from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from './PageHeader';
import { Calendar, RotateCcw, Mail, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

export const ReturnCancellationPolicyView: React.FC = () => {
  const { setCurrentPage } = useApp();

  return (
    <div className="w-full bg-white text-slate-900">
      
      {/* Reusable Page Header Banner */}
      <PageHeader
        title="Return & Cancellation Policy"
        breadcrumbs={[
          { label: 'Home', onClick: () => setCurrentPage('home') },
          { label: 'Return & Cancellation Policy' }
        ]}
      />

      {/* Main Return & Cancellation Policy Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 md:p-12 space-y-8">
          
          {/* Header Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-100">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Calendar className="w-4 h-4 text-[#DF0C88]" />
              <span>Effective Date: <strong className="text-slate-800">27-02-2025</strong></span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 border border-pink-200 text-[#DF0C88] text-[11px] font-bold">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>14-Day Cooling-off Period</span>
            </div>
          </div>

          <div className="space-y-8 text-sm sm:text-base text-slate-700 leading-relaxed">
            
            {/* Right to Cancel */}
            <div className="space-y-3">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                Right to Cancel
              </h2>
              <ul className="list-disc list-outside pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
                <li>Customers may cancel orders within 14 days of delivery for any reason, with no penalty.</li>
                <li>If cancellation rights are not disclosed, the cancellation period extends to 12 months, followed by a 14-day window after notification.</li>
              </ul>
            </div>

            {/* Return Process */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                Return Process
              </h2>
              <div className="space-y-2 text-xs sm:text-sm text-slate-600">
                <p>
                  <strong className="text-slate-900">Step 1:</strong> Notify us via email (<a href="mailto:info@irepair-mobiles.co.uk" className="text-[#DF0C88] font-semibold hover:underline">info@irepair-mobiles.co.uk</a>) to request cancellation.
                </p>
                <p>
                  <strong className="text-slate-900">Step 2:</strong> Return goods in their original condition and packaging within 14 days of cancellation.
                </p>
                <p className="pl-4 text-slate-500">Include the original invoice or order number.</p>
              </div>
            </div>

            {/* Return Costs */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                Return Costs
              </h2>
              <ul className="list-disc list-outside pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
                <li>Customers are responsible for return postage costs unless the item is faulty, misdescribed, or damaged in transit.</li>
                <li>We recommend using a tracked and insured delivery service.</li>
              </ul>
            </div>

            {/* Refunds */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                Refunds
              </h2>
              <ul className="list-disc list-outside pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
                <li>Refunds are processed within 14 days of receiving returned goods.</li>
                <li>Issued via the original payment method.</li>
              </ul>
            </div>

            {/* Faulty or Damaged Goods */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                Faulty or Damaged Goods
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm">
                For items damaged during delivery or with defects not caused by the customer:
              </p>
              <ul className="list-disc list-outside pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
                <li>We cover return costs and provide a full refund, repair, or replacement.</li>
              </ul>
            </div>

            {/* Compliance Note */}
            <div className="pt-6 border-t border-slate-200 bg-slate-50/70 p-5 sm:p-6 rounded-2xl border space-y-3 text-xs sm:text-sm text-slate-600">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                Compliance Note:
              </h3>
              <p className="leading-relaxed">
                Fone &amp; Cases Limited trading as iRepair<br />
                Registered in England &amp; Wales (Company No. 14427155)<br />
                Registered Office: 20 West Street, Horsham, West Sussex, RH12 1PB<br />
                Pre-Contractual Information: Available on our website and emailed post-purchase.
              </p>
              <p className="text-slate-800 font-medium pt-1">
                To request a return or refund, contact{' '}
                <a 
                  href="mailto:info@irepair-mobiles.co.uk" 
                  className="text-[#DF0C88] font-bold hover:underline"
                >
                  info@irepair-mobiles.co.uk
                </a>{' '}
                with proof of purchase.
              </p>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
};
