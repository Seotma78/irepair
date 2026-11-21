import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StoreLocation } from '../types';
import { StoreMap } from './StoreMap';
import { PageHeader } from './PageHeader';
import { 
  MapPin, 
  Phone, 
  Clock, 
  Wrench, 
  Search,
  Navigation,
  Sparkles
} from 'lucide-react';

export const LocationsView: React.FC = () => {
  const { stores, startRepairBooking, setCurrentPage } = useApp();
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [searchLocation, setSearchLocation] = useState<string>('');
  const [activeStore, setActiveStore] = useState<StoreLocation>(stores[0] || {} as StoreLocation);

  React.useEffect(() => {
    if (stores.length > 0 && (!activeStore.id || !stores.some(s => s.id === activeStore.id))) {
      setActiveStore(stores[0]);
    }
  }, [stores, activeStore.id]);

  const filteredStores = stores.filter(store => {
    if (selectedCity !== 'all' && store.city.toLowerCase() !== selectedCity.toLowerCase()) {
      return false;
    }
    if (searchLocation.trim()) {
      const q = searchLocation.toLowerCase();
      const matchCity = store.city.toLowerCase().includes(q);
      const matchAddress = store.address.toLowerCase().includes(q);
      const matchPostcode = store.postcode.toLowerCase().includes(q);
      if (!matchCity && !matchAddress && !matchPostcode) return false;
    }
    return true;
  });

  return (
    <div className="w-full bg-white text-slate-900">
      
      {/* Top Reusable Page Header Banner */}
      <PageHeader
        title="Find Our Stores"
        subtitle="Walk-in repairs welcome 7 days a week. Visit any of our 8 high-street branches across Britain."
        breadcrumbs={[
          { label: 'Home', onClick: () => setCurrentPage('home') },
          { label: 'Store Locations' }
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-12">
        
        {/* Intro Subtitle */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 border border-pink-200 text-[#DF0C88] text-xs font-semibold">
            <MapPin className="w-3.5 h-3.5" />
            <span>8 High Street Branches Across Britain</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 font-heading">
            Locate Your Nearest Branch
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Walk-in repairs welcome 7 days a week. Visit any store for an instant quote, free device health check, or express 30-minute repair.
          </p>
        </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input 
            type="text"
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
            placeholder="Search by city, town or postcode (e.g. Reading, RG1, Norwich)..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#DF0C88] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">City:</span>
          {['all', ...Array.from(new Set(stores.map(s => s.city)))].map(city => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCity === city
                  ? 'bg-[#DF0C88] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {city === 'all' ? 'All UK' : city}
            </button>
          ))}
        </div>
      </div>

      {/* Stores Grid & Detail Card Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Store Cards List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Available Branches ({filteredStores.length})
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredStores.map(store => {
              const isActive = activeStore.id === store.id;
              return (
                <div
                  key={store.id}
                  onClick={() => setActiveStore(store)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isActive 
                      ? 'border-[#DF0C88] bg-pink-50/40 ring-2 ring-[#DF0C88]/20 shadow-md' 
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#DF0C88] bg-pink-50 border border-pink-200 px-2 py-0.5 rounded">
                        {store.city}
                      </span>
                      {store.isExpressHub && (
                        <span className="text-[10px] bg-slate-900 text-white font-bold px-2 py-0.5 rounded">
                          Express Hub
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 font-heading">
                      {store.name || store.storeName}
                    </h3>

                    <p className="text-xs text-slate-500 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#DF0C88] shrink-0 mt-0.5" />
                      <span>{store.streetAddress || store.address} ({store.postcode})</span>
                    </p>

                    <div className="text-xs text-slate-700 pt-1 space-y-0.5">
                      <a 
                        href={`tel:${store.phone.replace(/\s+/g, '')}`}
                        className="font-medium text-slate-900 hover:text-[#DF0C88] block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        📞 {store.phone}
                      </a>
                      {store.email && (
                        <a 
                          href={`mailto:${store.email}`}
                          className="text-[11px] text-slate-500 hover:text-[#DF0C88] block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ✉️ {store.email}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {store.workingHours?.Monday ? `Mon: ${store.workingHours.Monday}` : store.openingHours?.weekdays}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startRepairBooking({ storeId: store.id });
                      }}
                      className="text-xs font-semibold text-[#DF0C88] hover:underline"
                    >
                      Book Visit →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Active Store Interactive Map & Details View */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-lg space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#DF0C88] uppercase tracking-wider">
              Selected Branch Details
            </span>
            <h2 className="text-xl font-bold text-slate-900 font-heading">
              {activeStore.name || activeStore.storeName}
            </h2>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
              <MapPin className="w-3.5 h-3.5 text-[#DF0C88]" />
              <span>{activeStore.streetAddress || activeStore.address}, {activeStore.city} {activeStore.postcode}</span>
            </p>
          </div>

          {/* Interactive Live Store Map */}
          <StoreMap
            stores={filteredStores}
            activeStoreId={activeStore.id}
            onSelectStore={setActiveStore}
            height="220px"
          />

          {/* Opening Hours Schedule */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
            <div className="font-bold text-slate-900 flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <Clock className="w-3.5 h-3.5 text-[#DF0C88]" />
              <span>Opening Hours:</span>
            </div>
            {activeStore.workingHours ? (
              <div className="space-y-1">
                {Object.entries(activeStore.workingHours).map(([day, hours]) => (
                  <div key={day} className="flex justify-between text-slate-600">
                    <span className="font-medium">{day}:</span>
                    <span className="font-semibold text-slate-900">{hours}</span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Monday – Friday:</span>
                  <span className="font-semibold text-slate-900">{activeStore.openingHours?.weekdays}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Saturday:</span>
                  <span className="font-semibold text-slate-900">{activeStore.openingHours?.saturday}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Sunday:</span>
                  <span className="font-semibold text-slate-900">{activeStore.openingHours?.sunday}</span>
                </div>
              </>
            )}
          </div>

          {/* Branch Features / Highlights */}
          {activeStore.features && activeStore.features.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700">Services at this Branch:</div>
              <div className="flex flex-wrap gap-1.5">
                {activeStore.features.map(f => (
                  <span key={f} className="text-[11px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium">
                    ✓ {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Direct CTA Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => startRepairBooking({ storeId: activeStore.id })}
              className="w-full bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
            >
              <Wrench className="w-4 h-4" />
              <span>Book Appointment at {activeStore.city}</span>
            </button>

            {/* Dedicated City Hub Landing Page Link if available */}
            {activeStore.id === 'eastbourne' && (
              <a
                href="/mobile-phone-repair-shop-eastbourne/"
                onClick={(e) => { e.preventDefault(); setCurrentPage('mobile-phone-repair-shop-eastbourne'); }}
                className="w-full bg-pink-50 hover:bg-pink-100 text-[#DF0C88] font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors border border-pink-200"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Visit Eastbourne Repair Hub Page →</span>
              </a>
            )}
            {activeStore.id === 'norwich' && (
              <a
                href="/mobile-phone-repair-shop-in-norwich/"
                onClick={(e) => { e.preventDefault(); setCurrentPage('mobile-phone-repair-shop-in-norwich'); }}
                className="w-full bg-pink-50 hover:bg-pink-100 text-[#DF0C88] font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors border border-pink-200"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Visit Norwich Repair Hub Page →</span>
              </a>
            )}
            {activeStore.id === 'basingstoke' && (
              <a
                href="/mobile-phone-repair-basingstoke/"
                onClick={(e) => { e.preventDefault(); setCurrentPage('mobile-phone-repair-basingstoke'); }}
                className="w-full bg-pink-50 hover:bg-pink-100 text-[#DF0C88] font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors border border-pink-200"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Visit Basingstoke Repair Hub Page →</span>
              </a>
            )}
            {activeStore.id === 'southend' && (
              <a
                href="/phone-repairing-services-southend/"
                onClick={(e) => { e.preventDefault(); setCurrentPage('phone-repairing-services-southend'); }}
                className="w-full bg-pink-50 hover:bg-pink-100 text-[#DF0C88] font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors border border-pink-200"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Visit Southend Repair Hub Page →</span>
              </a>
            )}
            {activeStore.id === 'reading' && (
              <a
                href="/mobile-phone-repair-shop-in-reading/"
                onClick={(e) => { e.preventDefault(); setCurrentPage('mobile-phone-repair-shop-in-reading'); }}
                className="w-full bg-pink-50 hover:bg-pink-100 text-[#DF0C88] font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors border border-pink-200"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Visit Reading Repair Hub Page →</span>
              </a>
            )}
            {activeStore.id === 'solihull' && (
              <a
                href="/mobile-phone-repair-service-solihull/"
                onClick={(e) => { e.preventDefault(); setCurrentPage('mobile-phone-repair-service-solihull'); }}
                className="w-full bg-pink-50 hover:bg-pink-100 text-[#DF0C88] font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors border border-pink-200"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Visit Solihull Repair Hub Page →</span>
              </a>
            )}
            {activeStore.id === 'ipswich' && (
              <a
                href="/mobile-repair-shop-in-ipswich/"
                onClick={(e) => { e.preventDefault(); setCurrentPage('mobile-repair-shop-in-ipswich'); }}
                className="w-full bg-pink-50 hover:bg-pink-100 text-[#DF0C88] font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors border border-pink-200"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Visit Ipswich Repair Hub Page →</span>
              </a>
            )}

            {(activeStore.mapUrl || activeStore.mapLink) && (
              <a
                href={activeStore.mapUrl || activeStore.mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors border border-slate-200"
              >
                <Navigation className="w-3.5 h-3.5 text-[#DF0C88]" />
                <span>Open in Google Maps ↗</span>
              </a>
            )}

            <a
              href={`tel:${activeStore.phone.replace(/\s+/g, '')}`}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#DF0C88]" />
              <span>Call Branch: {activeStore.phone}</span>
            </a>
          </div>

        </div>

      </div>

    </div>
  </div>
  );
};
