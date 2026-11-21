import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  MapPin, 
  Wrench, 
  ArrowRight, 
  Clock, 
  Award,
  Lock,
  Sparkles,
  Phone,
  Navigation
} from 'lucide-react';

import { PageHeader } from './PageHeader';

export const AboutView: React.FC = () => {
  const { setCurrentPage, startRepairBooking, stores } = useApp();

  return (
    <div className="w-full bg-white text-slate-900">
      
      {/* Top Reusable Page Header Banner */}
      <PageHeader 
        title="About Us"
        breadcrumbs={[
          { label: 'Home', onClick: () => setCurrentPage('home') },
          { label: 'About Us' }
        ]}
      />

      {/* ========================================================= */}
      {/* SECTION 1: The UK's Leading Tech Repair Specialist        */}
      {/* ========================================================= */}
      <section className="py-12 sm:py-16 lg:py-20 border-b border-slate-100 bg-gradient-to-b from-slate-50/60 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left Column: Heading & Detailed Description */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-50 border border-pink-200/80 text-[#DF0C88] text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-[#DF0C88]" />
                <span>UK REGISTERED TECH SPECIALISTS</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 font-heading tracking-tight leading-[1.15]">
                The UK's Leading Tech Repair Specialist
              </h2>

              <div className="space-y-4 text-slate-600 text-sm sm:text-base leading-relaxed">
                <p>
                  At iRepair Mobiles, we specialize in providing fast, reliable, and affordable mobile phone and laptop repair services. As part of Phone Fresh UK Limited—a trusted name in the tech repair industry since July 16, 2014 (Company Number: 03133908)—we are dedicated to delivering high-quality repair solutions for all major brands and models.
                </p>
                <p>
                  With over 18 years of experience, our skilled technicians are passionate about technology and committed to ensuring that every device is repaired using premium-quality parts and advanced techniques. Whether it’s a cracked screen, battery replacement, water damage repair, or software issue, we provide efficient solutions to restore your device to peak performance.
                </p>
              </div>

              {/* Quick stats pills */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#DF0C88] font-heading">18+ Years</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Industry Experience</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">6 Months</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Repair Guarantee</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">8 Branches</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">High Street Stores</div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => startRepairBooking()}
                  className="bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold py-3 px-6 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-pink-500/20 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Book an Express Repair</span>
                </button>
                <button
                  onClick={() => setCurrentPage('locations')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3 px-5 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer border border-slate-200"
                >
                  <MapPin className="w-4 h-4 text-[#DF0C88]" />
                  <span>Find Nearest Store</span>
                </button>
              </div>
            </div>

            {/* Right Column: Provided Image */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-slate-100 aspect-4/3 sm:aspect-16/11 group">
                <img 
                  src="https://irepair-mobiles.co.uk/wp-content/uploads/2024/01/3.jpg"
                  alt="iRepair Mobiles clean technician workshop"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="text-xs font-bold uppercase tracking-wider text-pink-300">Certified Diagnostics Lab</div>
                  <div className="text-sm font-semibold">Precision Micro-Soldering & Hardware Lab</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* ========================================================= */}
      {/* SECTION 2: 3 Value Proposition Boxes (33% Width Each)     */}
      {/* ========================================================= */}
      <section className="py-14 sm:py-18 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#DF0C88]">
              WHY CUSTOMERS TRUST US
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading">
              Our Core Service Commitments
            </h2>
          </div>

          {/* Exactly 3 boxes: 100% on mobile, 33.333% each on tablet and laptop */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            
            {/* Box 1: Fast Repair Services */}
            <div className="bg-slate-50/80 hover:bg-white rounded-3xl p-7 lg:p-8 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-pink-200 transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-13 h-13 rounded-2xl bg-[#DF0C88]/10 text-[#DF0C88] border border-[#DF0C88]/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#DF0C88] group-hover:text-white transition-all duration-300">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 font-heading">
                  Fast Repair Services
                </h3>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  A damaged device in today’s modern world can create a whole mountain of trouble, our mission is to reduce downtime to a minimum and get most devices repaired in as little as 15 minutes in store and at the roadside with our mail order repair services being completed in under 24 hours of receipt.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-200/70 flex items-center gap-2 text-xs font-bold text-[#DF0C88]">
                <Clock className="w-4 h-4" />
                <span>15-Minute While-You-Wait Repairs</span>
              </div>
            </div>

            {/* Box 2: Verified Partners */}
            <div className="bg-slate-50/80 hover:bg-white rounded-3xl p-7 lg:p-8 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-purple-200 transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-13 h-13 rounded-2xl bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 font-heading">
                  Verified Partners
                </h3>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  Booking your much-loved device for repair is testing. You need to know that you have the right team of techs for the job. After all, your phone is in most cases your right arm. We rigorously test and examine all our partner stores across the UK regularly to make sure they are consistent in their delivery of top-notch customer service.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-200/70 flex items-center gap-2 text-xs font-bold text-purple-600">
                <Award className="w-4 h-4" />
                <span>Rigorously Audited Quality Standards</span>
              </div>
            </div>

            {/* Box 3: Trusted Techs & After Care */}
            <div className="bg-slate-50/80 hover:bg-white rounded-3xl p-7 lg:p-8 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-13 h-13 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 font-heading">
                  Trusted Techs & After Care
                </h3>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  With a 15 year plus combined experience there is nothing to worry about. Your tech is safe in our hands, DBS checks are mandatory during our employee on boarding process which means your device is always safe with us. GDPR compliance means you can hold the same trust with us regarding your data too
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-200/70 flex items-center gap-2 text-xs font-bold text-emerald-600">
                <Lock className="w-4 h-4" />
                <span>DBS Checked & 100% GDPR Compliant</span>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* ========================================================= */}
      {/* SECTION 3: 3 Images Boxes                                  */}
      {/* ========================================================= */}
      <section className="py-14 sm:py-18 bg-slate-50/70 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#DF0C88]">
              INSIDE OUR WORKSHOPS
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading">
              Precision Engineering & High-Street Retail
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Take a closer look at our sterile repair stations, testing benches, and certified customer outlets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            
            {/* Image Box 1 */}
            <div className="rounded-3xl overflow-hidden shadow-lg border border-slate-200 bg-white group transition-all duration-300 hover:shadow-2xl hover:border-pink-300">
              <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
                <img 
                  src="https://irepair-mobiles.co.uk/wp-content/uploads/2023/04/download.webp"
                  alt="iRepair Mobiles service station"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="text-[11px] font-bold uppercase text-pink-300 tracking-wider">Expertise In Action</div>
                  <div className="text-sm font-bold">State-Of-The-Art Clean Benches</div>
                </div>
              </div>
              <div className="p-4 sm:p-5 bg-white">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Specialized anti-static workstations equipped with thermal imaging cameras, precision screwdrivers, and micro-soldering irons.
                </p>
              </div>
            </div>

            {/* Image Box 2 */}
            <div className="rounded-3xl overflow-hidden shadow-lg border border-slate-200 bg-white group transition-all duration-300 hover:shadow-2xl hover:border-pink-300">
              <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
                <img 
                  src="https://irepair-mobiles.co.uk/wp-content/uploads/2023/04/download-1.webp"
                  alt="iRepair Mobiles certified tech repair"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="text-[11px] font-bold uppercase text-pink-300 tracking-wider">Genuine Quality Parts</div>
                  <div className="text-sm font-bold">Tested Screens & Batteries</div>
                </div>
              </div>
              <div className="p-4 sm:p-5 bg-white">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every replacement component undergoes rigorous QA benchmarking for colour accuracy, touch sensitivity, and battery health before installation.
                </p>
              </div>
            </div>

            {/* Image Box 3 */}
            <div className="rounded-3xl overflow-hidden shadow-lg border border-slate-200 bg-white group transition-all duration-300 hover:shadow-2xl hover:border-pink-300">
              <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
                <img 
                  src="https://irepair-mobiles.co.uk/wp-content/uploads/2023/04/download-2.webp"
                  alt="iRepair Mobiles rapid repair diagnosis"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="text-[11px] font-bold uppercase text-pink-300 tracking-wider">Walk-In & Mail-In</div>
                  <div className="text-sm font-bold">Rapid Express Turnarounds</div>
                </div>
              </div>
              <div className="p-4 sm:p-5 bg-white">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Fast, seamless intake processes whether you visit our high street branches in person or send your device via prepaid Royal Mail tracked postal.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* ========================================================= */}
      {/* SECTION 4: UK's Leading Mobile Repair Specialist          */}
      {/* (Same section width as Section 1)                         */}
      {/* ========================================================= */}
      <section className="py-14 sm:py-20 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            <div className="lg:col-span-8 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold tracking-wide">
                <Award className="w-3.5 h-3.5 text-[#DF0C88]" />
                <span>NATIONWIDE REPAIR EXCELLENCE</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 font-heading tracking-tight leading-[1.15]">
                UK's Leading Mobile Repair Specialist
              </h2>

              <div className="space-y-4 text-slate-600 text-sm sm:text-base leading-relaxed">
                <p>
                  In the fast-paced digital age we live in today, our reliance on mobile devices is more significant than ever before.
                </p>
                <p>
                  Whether it’s staying connected with loved ones, managing our work, or simply staying entertained, our smartphones have become an integral part of our daily lives.
                </p>
                <p className="text-slate-800 font-medium">
                  But what happens when our trusty gadgets encounter unexpected mishaps or malfunctions? That’s where iRepair, the United Kingdom’s leading mobile repair specialist, comes to the rescue.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-4">
                <button
                  onClick={() => startRepairBooking()}
                  className="bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold py-3 px-6 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Get Instant Repair Quote</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-7 sm:p-8 space-y-6 shadow-xl border border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-[#DF0C88] flex items-center justify-center text-white shadow-lg shadow-pink-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading">
                Zero Risk. 100% Peace of Mind.
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="text-[#DF0C88] font-bold">✓</span>
                  <span><strong>No Fix, No Fee:</strong> You pay nothing if your device cannot be saved.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[#DF0C88] font-bold">✓</span>
                  <span><strong>6-Month Warranty:</strong> Comprehensive parts & labour guarantee.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[#DF0C88] font-bold">✓</span>
                  <span><strong>Data Confidentiality:</strong> Strict UK GDPR data sanitization.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>


      {/* ========================================================= */}
      {/* SECTION 5: Heritage (Established 2010) & Our Expertise   */}
      {/* ========================================================= */}
      <section className="py-14 sm:py-20 bg-slate-50/80 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">
            
            {/* Story / Established in 2010 Box */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>FOUNDED IN 2010</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading">
                  A Decade-Long Commitment to UK Device Owners
                </h3>

                <div className="space-y-3 text-slate-600 text-xs sm:text-sm leading-relaxed">
                  <p>
                    iRepair was established in 2010 with a singular mission, to provide top-notch mobile phone repair service to the people of the UK!
                  </p>
                  <p>
                    Over the past decade, we have tirelessly worked to become the go-to destination for all your mobile device needs. Our journey has been nothing short of remarkable, and our commitment to excellence has only grown stronger with time.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Phone Fresh UK Limited · Co. No. 03133908</span>
                <span className="font-bold text-slate-900">Inc. 2014</span>
              </div>
            </div>

            {/* Our Expertise Box */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-50 text-[#DF0C88] border border-pink-200 text-xs font-bold">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>OUR EXPERTISE</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading">
                  Passionate Specialists & Certified Technicians
                </h3>

                <div className="space-y-3 text-slate-600 text-xs sm:text-sm leading-relaxed">
                  <p>
                    At iRepair, we understand the value of your mobile device and the inconvenience that comes with any downtime.
                  </p>
                  <p>
                    That’s why we’ve assembled a team of highly skilled and certified technicians who are passionate about what they do. With years of experience under their belts, they are well-equipped to handle a wide range of mobile device issues, from cracked screens to water damage and everything in between.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-emerald-600 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Certified for Apple iPhone, iPad, Samsung Galaxy & Google Pixel</span>
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* ========================================================= */}
      {/* SECTION 6: Nationwide Presence                            */}
      {/* ========================================================= */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-50 border border-pink-200 text-[#DF0C88] text-xs font-bold tracking-wide">
                <MapPin className="w-3.5 h-3.5" />
                <span>8 LOCATIONS ACROSS BRITAIN</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-heading tracking-tight">
                Nationwide Presence
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                With multiple outlets across the UK, we are easily accessible, making it convenient for you to seek our services whenever you need them.
              </p>
            </div>

            <button
              onClick={() => setCurrentPage('locations')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition-all shadow-sm self-start md:self-end cursor-pointer"
            >
              <span>View Full Branch Schedule</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 8 Store Outlets Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {stores.map((store) => (
              <div 
                key={store.id}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-[#DF0C88] hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#DF0C88] uppercase bg-pink-50 px-2 py-0.5 rounded border border-pink-100">
                      {store.city}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Open 7 Days
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 font-heading">
                    {store.name || store.storeName}
                  </h4>

                  <p className="text-xs text-slate-500 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#DF0C88] shrink-0 mt-0.5" />
                    <span>{store.streetAddress || store.address}, {store.postcode}</span>
                  </p>

                  <div className="text-xs text-slate-700 pt-1">
                    <a 
                      href={`tel:${store.phone.replace(/\s+/g, '')}`}
                      className="hover:text-[#DF0C88] font-medium block"
                    >
                      📞 {store.phone}
                    </a>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-200/70 flex items-center justify-between">
                  {(store.mapUrl || store.mapLink) && (
                    <a
                      href={store.mapUrl || store.mapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-slate-500 hover:text-[#DF0C88] flex items-center gap-1"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Directions</span>
                    </a>
                  )}
                  <button
                    onClick={() => startRepairBooking({ storeId: store.id })}
                    className="text-xs font-bold text-[#DF0C88] hover:underline"
                  >
                    Book Visit →
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

    </div>
  );
};
