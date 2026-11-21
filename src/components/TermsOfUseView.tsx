import React from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from './PageHeader';
import { Calendar, FileText, Scale } from 'lucide-react';

export const TermsOfUseView: React.FC = () => {
  const { setCurrentPage } = useApp();

  return (
    <div className="w-full bg-white text-slate-900">
      
      {/* Reusable Page Header Banner */}
      <PageHeader
        title="Terms of Use"
        breadcrumbs={[
          { label: 'Home', onClick: () => setCurrentPage('home') },
          { label: 'Terms of Use' }
        ]}
      />

      {/* Main Terms of Use Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 md:p-12 space-y-8">
          
          {/* Header Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-100">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Calendar className="w-4 h-4 text-[#DF0C88]" />
              <span>Last Updated: <strong className="text-slate-800">[27-02-2025]</strong></span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold">
              <Scale className="w-3.5 h-3.5 text-[#DF0C88]" />
              <span>Governed by UK Law</span>
            </div>
          </div>

          {/* Introductory Statement */}
          <div className="space-y-4 text-sm sm:text-base text-slate-600 leading-relaxed">
            <p>
              Welcome to iRepair Mobiles. These Terms &amp; Conditions govern your use of our website{' '}
              <a 
                href="https://irepair-mobiles.co.uk" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[#DF0C88] font-semibold hover:underline"
              >
                https://irepair-mobiles.co.uk
              </a>{' '}
              and the purchase of our products and services. By accessing or using our site, you agree to comply with these terms.
            </p>
          </div>

          {/* Policy Sections */}
          <div className="space-y-8 text-sm sm:text-base text-slate-700 leading-relaxed pt-2">
            
            {/* 1. General Terms */}
            <div className="space-y-3">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                1. General Terms
              </h2>
              <ul className="list-disc list-outside pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
                <li>You must be at least 18 years old to place an order.</li>
                <li>We reserve the right to modify or discontinue any service without prior notice.</li>
                <li>Prices and product availability are subject to change without notice.</li>
              </ul>
            </div>

            {/* 2. Ordering & Payment */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                2. Ordering &amp; Payment
              </h2>
              <ul className="list-disc list-outside pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
                <li>All orders are subject to acceptance and availability.</li>
                <li>We accept payments via worldPay.</li>
                <li>Orders will be processed once payment is confirmed.</li>
              </ul>
            </div>

            {/* 3. Warranties & Liabilities */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                3. Warranties &amp; Liabilities
              </h2>
              <ul className="list-disc list-outside pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
                <li>iRepair Mobiles is not responsible for any indirect damages arising from the use of our products or services.</li>
                <li>We do not guarantee uninterrupted access to our website.</li>
              </ul>
            </div>

            {/* 4. Intellectual Property */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                4. Intellectual Property
              </h2>
              <ul className="list-disc list-outside pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
                <li>All content on this website, including text, images, and logos, is owned by iRepair Mobiles and cannot be used without permission.</li>
              </ul>
            </div>

            {/* 5. Governing Law */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                5. Governing Law
              </h2>
              <ul className="list-disc list-outside pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
                <li>These terms are governed by UK law. Any disputes will be resolved in UK courts.</li>
              </ul>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
};
