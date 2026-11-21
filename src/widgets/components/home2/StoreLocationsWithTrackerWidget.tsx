import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Navigation, ArrowRight, PackageCheck } from 'lucide-react';
import { WidgetRenderProps } from '../../types';
import { useApp } from '../../../context/AppContext';
import {
  STORE_LOCATIONS_WITH_TRACKER_DEFAULTS,
  Home2StoreLocationItem,
} from './home2Defaults';

export const StoreLocationsWithTrackerWidget: React.FC<WidgetRenderProps> = ({
  settings = {},
}) => {
  const { startRepairBooking, setCurrentPage, setTrackingQuery } = useApp();

  const heading = settings.heading ?? STORE_LOCATIONS_WITH_TRACKER_DEFAULTS.heading;
  const subtitle = settings.subtitle ?? STORE_LOCATIONS_WITH_TRACKER_DEFAULTS.subtitle;
  const syncStoresFromDb = settings.syncStoresFromDb !== false;
  const showOrderTracker = settings.showOrderTracker !== false;
  const trackerEyebrow =
    settings.trackerEyebrow ?? STORE_LOCATIONS_WITH_TRACKER_DEFAULTS.trackerEyebrow;
  const trackerHeading =
    settings.trackerHeading ?? STORE_LOCATIONS_WITH_TRACKER_DEFAULTS.trackerHeading;
  const trackerSubtitle =
    settings.trackerSubtitle ?? STORE_LOCATIONS_WITH_TRACKER_DEFAULTS.trackerSubtitle;

  const fallbackLocations: Home2StoreLocationItem[] =
    Array.isArray(settings.locations) && settings.locations.length > 0
      ? settings.locations
      : STORE_LOCATIONS_WITH_TRACKER_DEFAULTS.locations;

  const [dbLocations, setDbLocations] = useState<Home2StoreLocationItem[] | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [hoveredStoreId, setHoveredStoreId] = useState<string | null>(null);
  const [isTrackBtnHovered, setIsTrackBtnHovered] = useState(false);

  // Order Tracker Card state
  const [orderInput, setOrderInput] = useState('');

  useEffect(() => {
    if (!syncStoresFromDb) return;
    let active = true;
    fetch('/api/cms/collections/stores')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!active || !Array.isArray(data) || data.length === 0) return;
        const mapped: Home2StoreLocationItem[] = data.map((s: any) => {
          const hours =
            typeof s.openingHours === 'string'
              ? (() => {
                  try {
                    return JSON.parse(s.openingHours);
                  } catch {
                    return {};
                  }
                })()
              : s.openingHours || {};
          return {
            id: s.id,
            name: `${s.city || s.name} — ${(s.address || '').split(',')[0] || s.name}`,
            city: s.city || '',
            postcode: s.postcode || '',
            address: `${s.address || ''}${s.postcode ? `, ${s.postcode}` : ''}`,
            hours: `Mon–Sat ${hours.weekdays || '08:30–19:00'}`,
            phone: s.phone || '',
            mapLink:
              s.mapLink ||
              `https://maps.google.com/?q=${encodeURIComponent(
                `${s.address || ''} ${s.postcode || ''}`
              )}`,
            isOpen: true,
          };
        });
        setDbLocations(mapped);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [syncStoresFromDb]);

  const allStores = syncStoresFromDb && dbLocations ? dbLocations : fallbackLocations;

  const visibleStores = useMemo(() => {
    const query = activeFilter.trim().toLowerCase();
    const list = query
      ? allStores.filter(
          (st) =>
            st.name.toLowerCase().includes(query) ||
            st.city.toLowerCase().includes(query) ||
            st.postcode.toLowerCase().includes(query) ||
            st.address.toLowerCase().includes(query)
        )
      : allStores;
    return list.slice(0, 4);
  }, [allStores, activeFilter]);

  const handleStoreSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveFilter(searchInput);
  };

  const handleOrderTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = orderInput.trim();
    if (!trimmed) {
      setCurrentPage('track-order');
      return;
    }

    if (trimmed.toUpperCase().startsWith('RB-') || trimmed.toUpperCase().startsWith('RP-')) {
      setTrackingQuery(trimmed);
      setCurrentPage('track-repair');
      return;
    }

    window.history.pushState({}, '', `/track-order?order=${encodeURIComponent(trimmed)}`);
    setCurrentPage('track-order');
  };

  return (
    <section className="bg-[#F8FAFC] py-14 sm:py-16 border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`grid grid-cols-1 ${
            showOrderTracker ? 'lg:grid-cols-12' : ''
          } gap-8 items-start`}
        >
          {/* Left Column: Store Finder */}
          <div className={showOrderTracker ? 'lg:col-span-7 space-y-5' : 'space-y-5'}>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.4 }}
            >
              <h2
                className="text-2xl sm:text-3xl font-black text-[#0B0D12] tracking-tight font-heading"
                style={{ textWrap: 'balance' }}
              >
                {heading}
              </h2>
              {subtitle && (
                <p className="text-sm text-slate-600 mt-1.5">
                  {subtitle}
                </p>
              )}
            </motion.div>

            {/* Postcode / City Search Bar */}
            <form onSubmit={handleStoreSearch} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    if (!e.target.value.trim()) setActiveFilter('');
                  }}
                  placeholder="Enter UK postcode or city (e.g. RG21, NR2, Basingstoke)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-[#0B0D12] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E6007E]/25 focus:border-[#E6007E] transition-shadow"
                />
              </div>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.97 }}
                className="px-5 py-2.5 rounded-xl bg-[#E6007E] hover:bg-[#C4006B] text-white text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 shadow-2xs transition-colors cursor-pointer"
              >
                Search Stores
              </motion.button>
            </form>

            {/* 2x2 Compact Store Cards Grid with Left Accent Bar & X-Lift */}
            <AnimatePresence mode="wait">
              {visibleStores.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                  className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-2"
                >
                  <p className="text-sm font-bold text-[#0B0D12]">
                    No local branches matched "{activeFilter}"
                  </p>
                  <p className="text-xs text-slate-500">
                    Clear the filter or use our free Royal Mail Special Delivery service nationwide.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setActiveFilter('');
                    }}
                    className="text-xs font-bold text-[#E6007E] hover:underline cursor-pointer pt-1"
                  >
                    Show all UK flagship hubs
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key={`stores-${activeFilter || 'all'}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  {visibleStores.map((store, idx) => {
                    const isCardHovered = hoveredStoreId === store.id;
                    return (
                      <motion.div
                        key={store.id}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.15 }}
                        transition={{ duration: 0.32, delay: idx * 0.06 }}
                        whileHover={{
                          x: 4,
                          transition: { type: 'spring', stiffness: 360, damping: 24 },
                        }}
                        onMouseEnter={() => setHoveredStoreId(store.id)}
                        onMouseLeave={() => setHoveredStoreId(null)}
                        className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 hover:border-[#E6007E]/45 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-3"
                      >
                        {/* Left #E6007E Accent Highlight Bar */}
                        <motion.span
                          aria-hidden="true"
                          animate={{ scaleY: isCardHovered ? 1 : 0 }}
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-[#E6007E] origin-top"
                        />

                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-bold text-[#0B0D12] leading-snug">
                              {store.name}
                            </h3>
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold shrink-0 ${
                                store.isOpen !== false ? 'text-[#10B981]' : 'text-slate-400'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  store.isOpen !== false ? 'bg-[#10B981]' : 'bg-slate-400'
                                }`}
                              />
                              <span>{store.isOpen !== false ? 'Open' : 'Closed'}</span>
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                            {store.address} · {store.hours}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 pt-1 text-xs font-bold">
                          <button
                            type="button"
                            onClick={() => startRepairBooking({ storeId: store.id })}
                            className="text-[#E6007E] hover:text-[#C4006B] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <span>Book Slot</span>
                            <ArrowRight
                              className={`w-3 h-3 transition-transform duration-200 ${
                                isCardHovered ? 'translate-x-0.5' : ''
                              }`}
                            />
                          </button>

                          <a
                            href={store.mapLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-600 hover:text-[#0B0D12] inline-flex items-center gap-1 whitespace-nowrap"
                          >
                            <Navigation
                              className={`w-3 h-3 transition-transform duration-200 ${
                                isCardHovered ? 'translate-x-0.5 -translate-y-0.5 text-[#E6007E]' : ''
                              }`}
                            />
                            <span>Directions</span>
                          </a>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <button
                type="button"
                onClick={() => setCurrentPage('locations')}
                className="group text-xs font-bold text-[#E6007E] hover:text-[#C4006B] inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View all UK store locations</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Right Column: Interactive Track Your Order Card with Sheen Sweep CTA */}
          {showOrderTracker && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="lg:col-span-5"
            >
              <div className="bg-white rounded-3xl border border-slate-200/90 focus-within:border-[#E6007E]/45 focus-within:ring-2 focus-within:ring-[#E6007E]/15 shadow-xs p-6 sm:p-7 space-y-5 transition-all">
                <div>
                  {trackerEyebrow && (
                    <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#E6007E] mb-1.5">
                      {trackerEyebrow}
                    </span>
                  )}
                  <h3 className="text-xl font-black text-[#0B0D12] tracking-tight font-heading">
                    {trackerHeading}
                  </h3>
                  {trackerSubtitle && (
                    <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                      {trackerSubtitle}
                    </p>
                  )}
                </div>

                <form onSubmit={handleOrderTrackSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Order or Repair ID
                    </label>
                    <input
                      type="text"
                      value={orderInput}
                      onChange={(e) => setOrderInput(e.target.value)}
                      placeholder="e.g. RB-49281 or 10482"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs sm:text-sm font-medium text-[#0B0D12] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E6007E]/25 focus:border-[#E6007E] transition-shadow"
                    />
                  </div>

                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.97 }}
                    onMouseEnter={() => setIsTrackBtnHovered(true)}
                    onMouseLeave={() => setIsTrackBtnHovered(false)}
                    className="relative overflow-hidden w-full py-3 rounded-xl bg-[#E6007E] hover:bg-[#C4006B] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    {/* Sheen Sweep Effect */}
                    <motion.span
                      aria-hidden="true"
                      initial={{ x: '-120%' }}
                      animate={{ x: isTrackBtnHovered ? '140%' : '-120%' }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="pointer-events-none absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
                    />
                    <PackageCheck className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Track Order</span>
                  </motion.button>
                </form>

                {/* Live Repair Milestone Reference Card */}
                <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-bold text-[#0B0D12]">
                      Example: #10482 / RB-49281
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#10B981]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                      <span>Ready for Collection</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Enter your WooCommerce order number or branch repair ticket to view live diagnostics and courier tracking.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};

export default StoreLocationsWithTrackerWidget;
