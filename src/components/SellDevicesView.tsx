import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from './PageHeader';
import { 
  Coins, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  ExternalLink, 
  Truck, 
  MapPin, 
  Lock, 
  HelpCircle, 
  ChevronDown, 
  Sparkles, 
  RotateCcw,
  Building2,
  Check
} from 'lucide-react';

const FAQS = [
  {
    q: 'Can I sell my phone if the screen is cracked, smashed, or the back glass is broken?',
    a: 'Yes, absolutely! At WeBuyYourTech and iRepair Mobiles UK, we accept devices in any physical condition—including cracked front screens, broken back glass, damaged OLED displays, worn-out batteries, and even devices that won’t turn on. Visit WeBuyYourTech.co.uk and choose the "Cracked Glass" or "Faulty" condition to see your instant guaranteed cash offer.',
  },
  {
    q: 'How and when do I get paid for my device?',
    a: 'You can get paid the very same day! If you post your device via our free Royal Mail Tracked 24 service, we inspect and issue payment on the day of delivery via Faster Payments direct to your UK bank account or PayPal. If you prefer instant cash in hand, simply walk into any of our 8 high-street iRepair stores across London and Essex, and walk out with cash in 15 minutes.',
  },
  {
    q: 'Is postage really 100% free with Royal Mail?',
    a: 'Yes! When you complete your trade-in on WeBuyYourTech.co.uk, you will be sent a prepaid Royal Mail Tracked 24 label or QR code. You can either print it at home or show the QR code on your phone at any UK Post Office or Royal Mail Delivery Office. Your parcel is fully tracked and insured.',
  },
  {
    q: 'What is the 14-Day Price Lock Guarantee?',
    a: 'Tech prices fluctuate weekly, but when you generate your valuation on WeBuyYourTech.co.uk, your quoted trade-in price is locked in for 14 full days. This gives you plenty of time to send your device or drop it in-store without worrying about price drops.',
  },
  {
    q: 'What do I need to do before sending my device?',
    a: 'Before sending or bringing in your device: 1. Back up your photos, contacts, and personal data. 2. Remove your Apple iCloud / Find My lock (for Apple devices) or Google / Samsung Account (for Android). 3. Remove your SIM card and memory card. 4. Factory reset the device. If you need help removing locks, our technicians in-store will gladly help you free of charge.',
  },
  {
    q: 'What happens if my device is inspected and the condition differs?',
    a: 'We believe in 100% transparency. If our technicians find that the device condition is different from what was selected, we will provide a clear, revised quote explaining why. If you are not completely satisfied with the revised offer, we will return your device to you completely free of charge. No risk, no stress.',
  },
  {
    q: 'Can I sell corporate fleets or multiple devices?',
    a: 'Yes! We regularly purchase bulk devices from UK businesses, schools, and offices upgrading their fleet of phones, MacBooks, and iPads. Contact our business trade-in desk or walk into an iRepair store for tailored corporate buyback rates.',
  },
];

export const SellDevicesView: React.FC = () => {
  const { setCurrentPage, stores } = useApp();

  // Partner buyback portal URL
  const WEBUY_TECH_URL = 'https://webuyyourtech.co.uk/';

  // FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  return (
    <div className="w-full bg-white text-slate-900">
      
      {/* 1. TOP HERO BANNER & BREADCRUMBS */}
      <PageHeader 
        title="Sell Your Phone"
        subtitle="Turn your old, cracked, or unwanted phones into instant cash via our partner portal WeBuyYourTech.co.uk. Guaranteed UK highest payout, free tracked Royal Mail postage, or walk into any of our 8 high-street stores."
        badge="UK PHONE BUYBACK & TRADE-IN"
        breadcrumbs={[
          { label: 'Home', onClick: () => setCurrentPage('home') },
          { label: 'Sell Your Phone' }
        ]}
      />

      {/* 2. TRUST HIGHLIGHT BAR (UK Standards) */}
      <div className="bg-slate-900 text-white border-b border-slate-800 py-3.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-around gap-4 text-xs font-semibold">
          <div className="flex items-center gap-2 text-pink-300">
            <Coins className="w-4 h-4 text-[#DF0C88]" />
            <span>Guaranteed Best UK Price Promise</span>
          </div>
          <div className="flex items-center gap-2 text-slate-200">
            <Truck className="w-4 h-4 text-emerald-400" />
            <span>Free Royal Mail Tracked 24 Postage</span>
          </div>
          <div className="flex items-center gap-2 text-slate-200">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Same-Day Faster Payments & PayPal</span>
          </div>
          <div className="flex items-center gap-2 text-slate-200">
            <MapPin className="w-4 h-4 text-sky-400" />
            <span>8 UK Stores for Instant Walk-In Cash</span>
          </div>
        </div>
      </div>

      {/* 3. HERO CALL-TO-ACTION & PARTNER ANNOUNCEMENT */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-pink-50/40 via-white to-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left 7 Columns: Introduction */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DF0C88]/10 border border-[#DF0C88]/20 text-[#DF0C88] text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Dedicated UK Buyback Service</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 font-heading tracking-tight leading-[1.15]">
                Sell Your Phone in the UK for <span className="text-[#DF0C88]">Instant Top Cash</span>
              </h2>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
                Looking to upgrade or clear out your drawer of old gadgets? iRepair Mobiles has partnered with <strong className="text-slate-900 font-bold">WeBuyYourTech.co.uk</strong>—the UK’s dedicated electronic trade-in specialist. Sell your old iPhone, Samsung Galaxy, Google Pixel, iPad, Apple Watch, or MacBook with zero hassle, zero auction fees, and a guaranteed 14-day price lock.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4">
                <a
                  href={WEBUY_TECH_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold text-sm sm:text-base px-6 py-3.5 rounded-xl shadow-lg shadow-pink-900/20 hover:shadow-xl transition-all transform active:scale-95 inline-flex items-center gap-2.5 cursor-pointer group"
                >
                  <span>Sell Now on WeBuyYourTech.co.uk</span>
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>

                <a
                  href="#store-dropoff"
                  className="bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 font-bold text-sm sm:text-base px-5 py-3.5 rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-[#DF0C88]" />
                  <span>Drop Off at 8 UK Stores</span>
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="pt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  100% GDPR Military Data Wipe
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-sky-600" />
                  Free Return Guarantee
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-700" />
                  UK Company Reg: 03133908
                </span>
              </div>
            </div>

            {/* Right 5 Columns: Visual Partner Buyback Card */}
            <div className="lg:col-span-5">
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#DF0C88]/20 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <div className="text-[11px] font-bold text-pink-400 uppercase tracking-wider">OFFICIAL RECYCLING PARTNER</div>
                      <div className="text-xl font-bold font-heading text-white">WeBuyYourTech.co.uk</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#DF0C88]/20 border border-[#DF0C88]/40 flex items-center justify-center text-[#DF0C88]">
                      <Coins className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="space-y-3 text-xs sm:text-sm text-slate-300">
                    <div className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Highest UK Valuation Guarantee:</strong> We track all UK competitors daily to beat major buyback sites.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Cracked & Broken Phones Accepted:</strong> Never throw away a broken phone—we pay top scrap and refurb rates.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>No Seller Deductions:</strong> Unlike marketplaces that take 13% commission, our quoted price is 100% yours.</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <a
                      href={WEBUY_TECH_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm text-center"
                    >
                      <span>Visit WeBuyYourTech.co.uk</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. 3-STEP SELLING PROCESS */}
      <section className="py-14 sm:py-20 bg-slate-50 border-t border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-[#DF0C88] text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Simple 3-Step Process</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-heading text-slate-900">
              How Selling Your Phone Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              From quote to cash in under 24 hours. No waiting for auction bidders, no buyer disputes, and no hidden fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            
            {/* Step 1 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs hover:shadow-md transition-shadow relative">
              <div className="w-12 h-12 rounded-2xl bg-pink-50 border border-pink-200 text-[#DF0C88] flex items-center justify-center font-black text-lg">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Get an Instant Quote
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Head over to our partner portal at <a href={WEBUY_TECH_URL} target="_blank" rel="noopener noreferrer" className="text-[#DF0C88] font-bold hover:underline">WeBuyYourTech.co.uk</a>. Select your brand, model, storage, and condition for an immediate locked-in valuation.
              </p>
              <div className="pt-2 text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>14-day guaranteed price lock</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs hover:shadow-md transition-shadow relative">
              <div className="w-12 h-12 rounded-2xl bg-pink-50 border border-pink-200 text-[#DF0C88] flex items-center justify-center font-black text-lg">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Post Free or Drop In-Store
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Use your free prepaid Royal Mail Tracked 24 postage pack to send it from any UK post office, or visit any of our 8 London and Essex branches for an instant in-person assessment.
              </p>
              <div className="pt-2 text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>Zero postage or drop-off fees</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs hover:shadow-md transition-shadow relative">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-black text-lg">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Get Paid Same Day
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Once inspected, your funds are sent immediately via Faster Payments to your UK bank account or PayPal. Or walk away with cash in hand in 15 minutes at an iRepair store.
              </p>
              <div className="pt-2 text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-600" />
                <span>Fast Bank Transfer, PayPal, or Cash</span>
              </div>
            </div>

          </div>

          <div className="mt-10 text-center">
            <a
              href={WEBUY_TECH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold px-8 py-3.5 rounded-xl shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Start Selling on WeBuyYourTech.co.uk</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

        </div>
      </section>

      {/* 6. POPULAR UK PHONES & CASH PAYOUT SHOWCASE */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-[#DF0C88] text-xs font-bold uppercase tracking-wider mb-2">
                <Coins className="w-3.5 h-3.5" />
                <span>Top Selling Devices</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-heading text-slate-900">
                Popular UK Phones &amp; Tech We Buy
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Sell any working or cracked phone directly on our partner buyback portal WeBuyYourTech.co.uk.
              </p>
            </div>

            <a
              href={WEBUY_TECH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs sm:text-sm font-bold text-[#DF0C88] hover:text-[#C50875] inline-flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>View All 500+ Supported Devices on WeBuyYourTech</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { brand: 'Apple', name: 'iPhone 15 Pro Max', badge: 'Hot Seller' },
              { brand: 'Apple', name: 'iPhone 14 Pro', badge: 'High Demand' },
              { brand: 'Apple', name: 'iPhone 13', badge: 'Easy Cash' },
              { brand: 'Samsung', name: 'Galaxy S24 Ultra', badge: 'Top Android' },
              { brand: 'Samsung', name: 'Galaxy S23', badge: 'Fast Payout' },
              { brand: 'Google', name: 'Pixel 8 Pro', badge: 'Pixel Cash' },
              { brand: 'Apple', name: 'iPad Pro 11" M2', badge: 'Tablet Trade-In' },
              { brand: 'Apple', name: 'Apple Watch Ultra 2', badge: 'Wearable Trade' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 hover:border-pink-300 hover:shadow-lg transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.brand}</span>
                    <span className="text-[10px] font-bold bg-pink-100 text-[#DF0C88] px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  </div>

                  <h4 className="text-base font-bold font-heading text-slate-900 group-hover:text-[#DF0C88] transition-colors">
                    {item.name}
                  </h4>

                  <div className="mt-4 bg-white rounded-xl p-3 border border-slate-200/60 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Condition:</span>
                      <strong className="text-emerald-600 text-xs font-bold">Working &amp; Cracked OK</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Live Valuation:</span>
                      <strong className="text-slate-700 text-xs font-semibold">On WeBuyYourTech</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-2">
                  <a
                    href={WEBUY_TECH_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-slate-900 hover:bg-[#DF0C88] text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Sell Your Phone</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 7. WHY CHOOSE WEBUYTECH & IREPAIR (Comparison Table) */}
      <section className="py-14 sm:py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Smart Selling Decision</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-heading text-slate-900">
              Why Sell to Us vs Other Marketplaces
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              See why thousands of UK customers choose our dedicated buyback service instead of dealing with private marketplace headaches.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-left text-xs sm:text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="py-4 px-5 font-bold">Feature / Benefit</th>
                  <th className="py-4 px-5 font-bold text-[#DF0C88] bg-slate-800">WeBuyYourTech & iRepair</th>
                  <th className="py-4 px-5 font-bold text-slate-300">eBay / Auction Sites</th>
                  <th className="py-4 px-5 font-bold text-slate-300">Facebook Marketplace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-3.5 px-5 font-semibold">Seller Fees & Commission</td>
                  <td className="py-3.5 px-5 bg-pink-50/50 font-bold text-emerald-600">£0.00 (Zero Fees)</td>
                  <td className="py-3.5 px-5 text-rose-600">12.8% + 30p per sale</td>
                  <td className="py-3.5 px-5 text-slate-500">Free, but high risk</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-5 font-semibold">Payment Speed</td>
                  <td className="py-3.5 px-5 bg-pink-50/50 font-bold text-emerald-600">Same-Day Faster Payments / 15-Min Cash</td>
                  <td className="py-3.5 px-5 text-slate-500">3 - 7 days bank hold</td>
                  <td className="py-3.5 px-5 text-slate-500">Cash in hand or fake transfers</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-5 font-semibold">Postage & Shipping Cost</td>
                  <td className="py-3.5 px-5 bg-pink-50/50 font-bold text-emerald-600">100% Free Royal Mail Tracked 24</td>
                  <td className="py-3.5 px-5 text-rose-600">Seller pays £7.99+ Special Delivery</td>
                  <td className="py-3.5 px-5 text-slate-500">Must travel or meet strangers</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-5 font-semibold">Buyer Fraud / Chargeback Protection</td>
                  <td className="py-3.5 px-5 bg-pink-50/50 font-bold text-emerald-600">100% Protected (No Chargebacks)</td>
                  <td className="py-3.5 px-5 text-rose-600">High chargeback & buyer dispute risk</td>
                  <td className="py-3.5 px-5 text-rose-600">Very high scam & fake currency rate</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-5 font-semibold">Cracked / Broken Tech Accepted</td>
                  <td className="py-3.5 px-5 bg-pink-50/50 font-bold text-emerald-600">Yes, top scrap & refurb values</td>
                  <td className="py-3.5 px-5 text-slate-500">Hard to sell, low interest</td>
                  <td className="py-3.5 px-5 text-slate-500">Constant time-wasters</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-5 font-semibold">Data Sanitization</td>
                  <td className="py-3.5 px-5 bg-pink-50/50 font-bold text-emerald-600">Military-grade GDPR Certified Wipe</td>
                  <td className="py-3.5 px-5 text-slate-500">DIY only (risk of data leaks)</td>
                  <td className="py-3.5 px-5 text-slate-500">DIY only (no verification)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-5 font-semibold">Physical Walk-in Option</td>
                  <td className="py-3.5 px-5 bg-pink-50/50 font-bold text-emerald-600">8 UK High-Street Branches</td>
                  <td className="py-3.5 px-5 text-slate-400">None</td>
                  <td className="py-3.5 px-5 text-slate-400">Meet strangers at doorstep</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </section>

      {/* 8. PRE-SALE CHECKLIST (How to prepare device) */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-5 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5 text-[#DF0C88]" />
                <span>Seller Checklist</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-heading text-slate-900">
                Before You Send or Drop Off Your Device
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Follow these 4 simple steps to ensure the fastest possible payout with zero inspection delays. If you are dropping off in an iRepair store, our technicians can do this for you!
              </p>

              <div className="pt-2">
                <a
                  href={WEBUY_TECH_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-md inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Ready to Sell? Go to WeBuyYourTech</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-[#DF0C88] flex items-center justify-center font-bold text-xs">
                  01
                </div>
                <h4 className="text-sm font-bold text-slate-900">Back Up Your Data</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Back up your photos, contacts, and WhatsApp chats to iCloud or Google Drive so your memories are safe.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-[#DF0C88] flex items-center justify-center font-bold text-xs">
                  02
                </div>
                <h4 className="text-sm font-bold text-slate-900">Remove iCloud & Google Lock</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sign out of Apple ID / Find My or remove your Google / Samsung Account so the device can be unlocked.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-[#DF0C88] flex items-center justify-center font-bold text-xs">
                  03
                </div>
                <h4 className="text-sm font-bold text-slate-900">Remove SIM & Memory Cards</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Eject your nano-SIM or microSD card. Check that any eSIM profile has been deleted from device settings.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-[#DF0C88] flex items-center justify-center font-bold text-xs">
                  04
                </div>
                <h4 className="text-sm font-bold text-slate-900">Factory Data Reset</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Perform a factory erase. We will also perform a certified military-grade wipe upon receiving the device.
                </p>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 9. STORE DROP-OFF OPTION (iRepair 8 UK Branches) */}
      <section id="store-dropoff" className="py-14 sm:py-20 bg-slate-900 text-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DF0C88]/20 border border-[#DF0C88]/40 text-pink-300 text-xs font-bold uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-[#DF0C88]" />
                <span>Prefer In-Person Cash Today?</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-heading text-white">
                Drop Off at Any of Our 8 UK Branches
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Don’t feel like waiting for Royal Mail? Bring your device into any iRepair Mobiles store across London and Essex. Our certified technicians will test your phone on the spot, verify the valuation, and hand you instant cash or initiate an instant Faster Payments transfer within 15 minutes!
              </p>

              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentPage('locations')}
                  className="bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer"
                >
                  <MapPin className="w-4 h-4" />
                  <span>View All 8 Stores & Opening Hours</span>
                </button>

                <a
                  href="tel:+447717103365"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm px-5 py-3 rounded-xl transition-colors inline-flex items-center gap-2"
                >
                  <span>Call Hotline: +44 771 7103 365</span>
                </a>
              </div>
            </div>

            {/* Store Grid Summary */}
            <div className="lg:col-span-6 grid grid-cols-2 gap-3 text-xs">
              {stores.slice(0, 6).map((store) => (
                <div
                  key={store.id}
                  onClick={() => setCurrentPage('locations')}
                  className="bg-slate-800/80 border border-slate-700/80 hover:border-[#DF0C88] p-3.5 rounded-xl transition-colors cursor-pointer group"
                >
                  <div className="font-bold text-white group-hover:text-pink-400 transition-colors flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#DF0C88]" />
                    <span>{store.city}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                    {store.address || store.streetAddress}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-semibold mt-1">
                    Instant Cash Payout Available
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>
      </section>

      {/* 10. FREQUENTLY ASKED QUESTIONS */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-3 mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-[#DF0C88] text-xs font-bold uppercase tracking-wider">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Got Questions?</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-heading text-slate-900">
              Selling Tech FAQs
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Everything UK sellers need to know about valuations, payment methods, broken device buyback, and free Royal Mail shipping.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-2xl overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left font-bold text-sm sm:text-base text-slate-900 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180 text-[#DF0C88]' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="p-4 sm:p-5 bg-white text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 11. FINAL BOTTOM CALL-TO-ACTION BANNER */}
      <section className="py-14 sm:py-16 bg-gradient-to-r from-pink-600 via-[#DF0C88] to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-black font-heading tracking-tight">
              Ready to Turn Your Old Phone into Cash?
            </h2>
            <p className="text-xs sm:text-sm text-pink-100 leading-relaxed">
              Visit our partner portal at <strong className="text-white">WeBuyYourTech.co.uk</strong> to get your instant guaranteed quote with a 14-day price lock and free insured Royal Mail postage!
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href={WEBUY_TECH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-sm sm:text-base px-8 py-3.5 rounded-xl shadow-xl transition-transform active:scale-95 inline-flex items-center gap-2.5 cursor-pointer group"
            >
              <span>Visit WeBuyYourTech.co.uk Now</span>
              <ExternalLink className="w-4 h-4 text-[#DF0C88] group-hover:translate-x-0.5 transition-transform" />
            </a>

            <button
              type="button"
              onClick={() => setCurrentPage('locations')}
              className="bg-black/20 hover:bg-black/30 border border-white/30 text-white font-bold text-sm px-6 py-3.5 rounded-xl transition-colors cursor-pointer"
            >
              Drop In At Our 8 Stores
            </button>
          </div>

          <div className="pt-2 text-[11px] text-pink-200">
            Powered by WeBuyYourTech.co.uk in partnership with iRepair Mobiles UK · Phone Fresh UK Limited
          </div>
        </div>
      </section>

    </div>
  );
};
