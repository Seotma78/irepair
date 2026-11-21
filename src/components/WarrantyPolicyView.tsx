import React from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from './PageHeader';
import { Calendar, ShieldCheck, Mail, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

export const WarrantyPolicyView: React.FC = () => {
  const { setCurrentPage } = useApp();

  return (
    <div className="w-full bg-white text-slate-900">
      
      {/* Reusable Page Header Banner */}
      <PageHeader
        title="Warranty Policy"
        breadcrumbs={[
          { label: 'Home', onClick: () => setCurrentPage('home') },
          { label: 'Warranty Policy' }
        ]}
      />

      {/* Main Warranty Policy Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 md:p-12 space-y-8">
          
          {/* Header Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-100">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Calendar className="w-4 h-4 text-[#DF0C88]" />
              <span>Effective Date: <strong className="text-slate-800">27-02-2025</strong></span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>12-Month Hardware Guarantee</span>
            </div>
          </div>

          <div className="space-y-8 text-sm sm:text-base text-slate-700 leading-relaxed">
            
            {/* Warranty Coverage */}
            <div className="space-y-3">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                Warranty Coverage
              </h2>
              <ul className="list-disc list-outside pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
                <li>Repairs include a 12-month warranty on parts and labor, starting from the date of repair completion.</li>
                <li>Covers defects arising directly from the repair service (e.g., faulty components, workmanship errors).</li>
              </ul>
            </div>

            {/* Exclusions */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                Exclusions
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm">Warranty is void if:</p>
              <ul className="list-disc list-outside pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
                <li>The device sustains accidental damage (e.g., drops, cracks).</li>
                <li>Liquid exposure or unauthorized modifications occur.</li>
                <li>Non-original or third-party parts are used post-repair.</li>
              </ul>
            </div>

            {/* Warranty Claims Process */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                Warranty Claims Process
              </h2>
              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <p>
                  <strong className="text-slate-900">Step 1:</strong> Contact us via email (<a href="mailto:info@irepair-mobiles.co.uk" className="text-[#DF0C88] font-semibold hover:underline">info@irepair-mobiles.co.uk</a>) with:
                </p>
                <ul className="list-disc list-outside pl-7 space-y-1 text-slate-600">
                  <li>Proof of repair (invoice/receipt).</li>
                  <li>Description of the issue.</li>
                </ul>

                <p>
                  <strong className="text-slate-900">Step 2:</strong> Return the item (if required) using a tracked service. Return costs are covered by us if the claim is valid.
                </p>

                <p>
                  <strong className="text-slate-900">Step 3:</strong> We assess the issue within 5 working days and resolve it via repair, replacement, or refund.
                </p>
              </div>
            </div>

            {/* Statutory Rights */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                Statutory Rights
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm">
                This warranty does not affect your statutory rights under the Consumer Rights Act 2015.
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
                To request a cancellation, email{' '}
                <a 
                  href="mailto:info@irepair-mobiles.co.uk" 
                  className="text-[#DF0C88] font-bold hover:underline"
                >
                  info@irepair-mobiles.co.uk
                </a>{' '}
                immediately.
              </p>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
};
