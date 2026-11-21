import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { StoreLocation } from '../types';
import { StoreMap } from './StoreMap';
import { PageHeader } from './PageHeader';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Send, 
  CheckCircle2, 
  MessageSquare, 
  Navigation, 
  Wrench, 
  Search, 
  ExternalLink, 
  ShieldCheck, 
  Zap 
} from 'lucide-react';

export const ContactView: React.FC = () => {
  const { stores, showNotification, startRepairBooking, setCurrentPage } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [branch, setBranch] = useState(stores[0]?.id || 'reading');
  const [subject, setSubject] = useState('General Enquiry');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Map and Stores state
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [searchLocation, setSearchLocation] = useState<string>('');
  const [activeStore, setActiveStore] = useState<StoreLocation | null>(() => stores[0] || null);

  // Sync activeStore if stores update
  React.useEffect(() => {
    if (!activeStore && stores.length > 0) {
      setActiveStore(stores[0]);
      setBranch(stores[0].id);
    }
  }, [stores, activeStore]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    stores.forEach((s) => {
      if (s.city) set.add(s.city);
    });
    return Array.from(set);
  }, [stores]);

  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      if (selectedCity !== 'all' && store.city.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }
      if (searchLocation.trim()) {
        const q = searchLocation.toLowerCase();
        const matchCity = store.city.toLowerCase().includes(q);
        const matchName = store.name.toLowerCase().includes(q);
        const matchAddress = store.address.toLowerCase().includes(q);
        const matchPostcode = store.postcode.toLowerCase().includes(q);
        if (!matchCity && !matchName && !matchAddress && !matchPostcode) return false;
      }
      return true;
    });
  }, [stores, selectedCity, searchLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    showNotification('Thank you! Your message has been sent to our customer service desk.');
  };

  const currentStore = activeStore || stores[0];

  return (
    <div className="w-full bg-white text-slate-900">
      
      {/* Top Reusable Page Header Banner */}
      <PageHeader
        title="Contact Us"
        subtitle="Need a quick quote, have a question about a mail-in repair, or want to visit a store? We're here to help 7 days a week."
        breadcrumbs={[
          { label: 'Home', onClick: () => setCurrentPage('home') },
          { label: 'Contact Us' }
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-16">

      {/* 2. Interactive Map & Store Locations Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pink-100/70 text-[11px] font-bold text-[#DF0C88] mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>Interactive Store Map</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-heading">
              Our High Street Stores & Workshops
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any location to view opening times, direct phone numbers, and get turn-by-turn directions.
            </p>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-900">{filteredStores.length}</strong> of {stores.length} UK Branches
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              placeholder="Search store by city, address or postcode (e.g. Reading, RG1, Newcastle)..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#DF0C88] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <span className="text-xs text-slate-500 font-semibold whitespace-nowrap mr-1">City:</span>
            <button
              onClick={() => setSelectedCity('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCity === 'all'
                  ? 'bg-[#DF0C88] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Cities
            </button>
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCity === city
                    ? 'bg-[#DF0C88] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* Map + Selected Store Card Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Interactive Leaflet Map View */}
          <div className="lg:col-span-8">
            <StoreMap 
              stores={filteredStores}
              activeStoreId={currentStore?.id}
              onSelectStore={(st) => {
                setActiveStore(st);
                setBranch(st.id);
              }}
              height="480px"
              className="shadow-md"
            />
          </div>

          {/* Active Store Sidebar Highlight */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            {currentStore ? (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black text-[#DF0C88] uppercase tracking-wider bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-md">
                      {currentStore.city}
                    </span>
                    {currentStore.isExpressHub && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-slate-900 text-white font-bold px-2 py-0.5 rounded-md">
                        <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                        <span>Express Hub</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                    {currentStore.name}
                  </h3>
                  <p className="text-xs text-slate-600 flex items-start gap-1.5 pt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#DF0C88] shrink-0 mt-0.5" />
                    <span>{currentStore.address}, <strong>{currentStore.postcode}</strong></span>
                  </p>
                </div>

                {/* Operating Hours */}
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-1.5 text-xs">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                    <Clock className="w-3.5 h-3.5 text-[#DF0C88]" />
                    <span>Branch Opening Hours:</span>
                  </div>
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>Mon - Fri:</span>
                    <span className="font-semibold text-slate-900">
                      {typeof currentStore.openingHours === 'object' ? currentStore.openingHours.weekdays : '09:00 - 18:00'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>Saturday:</span>
                    <span className="font-semibold text-slate-900">
                      {typeof currentStore.openingHours === 'object' ? currentStore.openingHours.saturday : '09:00 - 18:00'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>Sunday:</span>
                    <span className="font-semibold text-slate-900">
                      {typeof currentStore.openingHours === 'object' ? currentStore.openingHours.sunday : '10:30 - 16:30'}
                    </span>
                  </div>
                </div>

                {/* Contact Links & CTA Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => startRepairBooking({ storeId: currentStore.id })}
                    className="w-full bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Book Repair at {currentStore.city}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`tel:${(currentStore.phone || '').replace(/\s+/g, '')}`}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-3 rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3 h-3 text-[#DF0C88]" />
                      <span>Call Store</span>
                    </a>

                    <a
                      href={currentStore.mapLink || `https://maps.google.com/?q=${encodeURIComponent(currentStore.address + ' ' + currentStore.postcode)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 px-3 rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Navigation className="w-3 h-3 text-slate-600" />
                      <span>Directions ↗</span>
                    </a>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Walk-ins welcome with 6-Month Repair Guarantee</span>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                Select a store marker on the map to view details.
              </div>
            )}
          </div>

        </div>

        {/* Quick Branch Switcher Cards */}
        <div className="space-y-2 pt-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Click Any Branch to Focus on Map:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {filteredStores.map((store) => {
              const isSelected = currentStore?.id === store.id;
              return (
                <button
                  key={store.id}
                  onClick={() => {
                    setActiveStore(store);
                    setBranch(store.id);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-pink-50 border-[#DF0C88] ring-2 ring-[#DF0C88]/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-black uppercase text-[#DF0C88]">
                      {store.city}
                    </span>
                    {store.isExpressHub && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Express Hub" />
                    )}
                  </div>
                  <div className="font-bold text-xs text-slate-900 truncate">
                    {store.name.replace('iRepair Mobiles - ', '')}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {store.postcode}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* All 8 Store Locations Grid */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold text-[#DF0C88] uppercase tracking-wider">High Street Network</span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                All 8 UK Store Branches & Workshops ({stores.length})
              </h3>
            </div>
            <span className="text-xs text-slate-500">Walk-in repairs welcome daily 7 days a week</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stores.map((store) => {
              const isSelected = currentStore?.id === store.id;
              return (
                <div
                  key={store.id}
                  onClick={() => {
                    setActiveStore(store);
                    setBranch(store.id);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#DF0C88] bg-pink-50/40 ring-2 ring-[#DF0C88]/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#DF0C88] uppercase bg-pink-50 px-2 py-0.5 rounded border border-pink-100">
                        {store.city}
                      </span>
                      {store.isExpressHub && (
                        <span className="text-[9px] bg-slate-900 text-white font-bold px-1.5 py-0.5 rounded">
                          Express Hub
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{store.name || store.storeName}</h4>

                    <p className="text-[11px] text-slate-500 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#DF0C88] shrink-0 mt-0.5" />
                      <span>{store.streetAddress || store.address}, {store.postcode}</span>
                    </p>

                    <div className="text-[11px] text-slate-700 pt-1 space-y-0.5">
                      <a
                        href={`tel:${(store.phone || '').replace(/\s+/g, '')}`}
                        className="font-medium text-slate-900 hover:text-[#DF0C88] block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        📞 {store.phone}
                      </a>
                      {store.email && (
                        <a
                          href={`mailto:${store.email}`}
                          className="text-[10px] text-slate-500 hover:text-[#DF0C88] block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ✉️ {store.email}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      {store.workingHours?.Monday ? `Mon: ${store.workingHours.Monday}` : (typeof store.openingHours === 'object' ? store.openingHours?.weekdays : 'Open Today')}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startRepairBooking({ storeId: store.id });
                      }}
                      className="text-xs font-semibold text-[#DF0C88] hover:underline cursor-pointer"
                    >
                      Book →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Contact Form & Direct Inquiries Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start pt-6 border-t border-slate-200">
        
        {/* Left Side: Contact Information Cards */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900 font-heading">
              National Customer Desk
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-pink-50 text-[#DF0C88] flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">National UK Hotline</div>
                  <a href="tel:+447717103365" className="text-[#DF0C88] font-semibold hover:underline block mt-0.5">
                    +44 771 7103 365
                  </a>
                  <div className="text-[11px] text-slate-500 mt-0.5">Reading Flagship: +44 7922 446999</div>
                  <div className="text-[11px] text-slate-500">Newcastle Store: +44 7497 675123</div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-pink-50 text-[#DF0C88] flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Email Enquiries</div>
                  <a href="mailto:info@irepair-mobiles.co.uk" className="text-[#DF0C88] font-semibold hover:underline block mt-0.5">
                    info@irepair-mobiles.co.uk
                  </a>
                  <div className="text-[11px] text-slate-500 mt-0.5">Replies typically within 2 business hours</div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-pink-50 text-[#DF0C88] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Operating Hours</div>
                  <div className="text-slate-600 mt-0.5">Monday - Saturday: 09:00 - 18:00</div>
                  <div className="text-slate-600">Sunday: 10:30 - 16:30</div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-pink-50 text-[#DF0C88] flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Flagship High Street Hub</div>
                  <div className="text-slate-600 mt-0.5">49 Broad Street, Reading, RG1 2AA</div>
                  <div className="text-[11px] text-slate-500">Walk-in repairs welcome 7 days a week</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-2 text-xs shadow-md">
            <span className="font-bold text-[#DF0C88] uppercase tracking-wider text-[11px]">Emergency Repair Bench</span>
            <h4 className="text-sm font-bold text-white font-heading">Smashed screen or water dropped today?</h4>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              No booking required for emergencies. Bring your phone directly to any iRepair branch for immediate bench evaluation.
            </p>
          </div>
        </div>

        {/* Right Side: Interactive Contact Form */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm">
          {submitted ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-heading">
                Message Sent Successfully
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
                Thank you, <strong>{name}</strong>. An iRepair technician from our team will get in touch with you shortly at <strong>{email}</strong>.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 font-heading mb-2">
                Send Us a Message
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Your Name *</label>
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Davies"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#DF0C88] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input 
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 07700 900123"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#DF0C88] focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. alex.davies@example.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#DF0C88] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nearest Store Branch</label>
                  <select 
                    value={branch}
                    onChange={(e) => {
                      setBranch(e.target.value);
                      const found = stores.find((s) => s.id === e.target.value);
                      if (found) setActiveStore(found);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#DF0C88] focus:bg-white focus:outline-none"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                  <select 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#DF0C88] focus:bg-white focus:outline-none"
                  >
                    <option value="Repair Quote">Repair Quote Request</option>
                    <option value="Mail-In Query">Mail-in Status Inquiry</option>
                    <option value="Refurbished Shop">Refurbished Device Stock</option>
                    <option value="Warranty Claim">Warranty / Guarantee Inquiry</option>
                    <option value="Business Corporate">Corporate / Bulk Repair</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Your Message *</label>
                  <textarea 
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your device model, fault symptoms, or any question you have..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#DF0C88] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold py-3 px-8 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Message</span>
                </button>
              </div>
            </form>
          )}
        </div>

      </section>

      </div>
    </div>
  );
};
