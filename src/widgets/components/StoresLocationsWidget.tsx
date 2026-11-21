import React, { useState, useEffect, useRef } from 'react';
import { WidgetRenderProps } from '../types';
import { 
  MapPin, 
  Phone, 
  Clock, 
  Zap, 
  Navigation, 
  Layers, 
  Map as MapIcon, 
  ChevronLeft, 
  ChevronRight,
  Compass,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StoreMap } from '../../components/StoreMap';

// Haversine distance in miles
function calculateDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Radius of Earth in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const StoresLocationsWidget: React.FC<WidgetRenderProps> = ({ settings = {} }) => {
  const { startRepairBooking } = useApp();
  const [stores, setStores] = useState<any[]>(settings.stores || []);
  const [activeStoreId, setActiveStoreId] = useState<string>('');
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearestStoreId, setNearestStoreId] = useState<string | null>(null);
  const [nearestDistance, setNearestDistance] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'both' | 'grid'>('both');
  const [geoLocating, setGeoLocating] = useState<boolean>(false);

  // Touch swipe support for mobile slider
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  // Load stores from settings or CMS collections API
  useEffect(() => {
    if (settings.stores && settings.stores.length > 0) {
      setStores(settings.stores);
      if (!activeStoreId) {
        setActiveStoreId(settings.stores[0]?.id || '');
      }
      return;
    }

    fetch('/api/cms/collections/stores')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setStores(data);
          if (!activeStoreId) {
            setActiveStoreId(data[0]?.id || '');
          }
        }
      })
      .catch(() => {});
  }, [settings.stores]);

  const limit = Number(settings.limit) || 8;
  const displayStores = stores.slice(0, limit);

  // Helper to sync selection by store ID
  const selectStoreById = (storeId: string) => {
    setActiveStoreId(storeId);
    const idx = displayStores.findIndex((s) => s.id === storeId);
    if (idx >= 0) {
      setActiveSlideIndex(idx);
    }
  };

  // Helper to sync selection by slide index
  const selectStoreByIndex = (newIndex: number) => {
    if (displayStores.length === 0) return;
    const normalizedIndex = (newIndex + displayStores.length) % displayStores.length;
    setActiveSlideIndex(normalizedIndex);
    const targetStore = displayStores[normalizedIndex];
    if (targetStore) {
      setActiveStoreId(targetStore.id);
    }
  };

  const handlePrevSlide = () => selectStoreByIndex(activeSlideIndex - 1);
  const handleNextSlide = () => selectStoreByIndex(activeSlideIndex + 1);

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const diff = touchStartXRef.current - touchEndXRef.current;
    if (diff > 50) {
      handleNextSlide();
    } else if (diff < -50) {
      handlePrevSlide();
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  // Customer Geolocation: Find closest store and set active by default
  useEffect(() => {
    if (displayStores.length === 0) return;

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      setGeoLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoLocating(false);
          const uLat = pos.coords.latitude;
          const uLng = pos.coords.longitude;
          setUserLocation({ lat: uLat, lng: uLng });

          let minMiles = Infinity;
          let bestStore = displayStores[0];
          let bestIdx = 0;

          displayStores.forEach((st: any, idx: number) => {
            const sLat = Number(st.latitude);
            const sLng = Number(st.longitude);
            if (!isNaN(sLat) && !isNaN(sLng) && sLat !== 0) {
              const dist = calculateDistanceMiles(uLat, uLng, sLat, sLng);
              if (dist < minMiles) {
                minMiles = dist;
                bestStore = st;
                bestIdx = idx;
              }
            }
          });

          if (bestStore) {
            setActiveStoreId(bestStore.id);
            setActiveSlideIndex(bestIdx);
            setNearestStoreId(bestStore.id);
            setNearestDistance(Math.round(minMiles * 10) / 10);
          }
        },
        () => {
          setGeoLocating(false);
          // If customer declined location permission or timed out, default to first store
          if (!activeStoreId && displayStores.length > 0) {
            setActiveStoreId(displayStores[0].id);
            setActiveSlideIndex(0);
          }
        },
        { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 }
      );
    }
  }, [displayStores.length]);

  // Output LocalBusiness JSON-LD Schema
  useEffect(() => {
    if (displayStores.length === 0) return;

    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: displayStores.map((s, idx) => ({
        '@type': 'LocalBusiness',
        position: idx + 1,
        name: s.name,
        address: {
          '@type': 'PostalAddress',
          streetAddress: s.address,
          postalCode: s.postcode,
          addressCountry: 'GB',
        },
        telephone: s.phone,
        email: s.email,
        priceRange: '££',
      })),
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'json-ld-stores';
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById('json-ld-stores');
      if (existing) existing.remove();
    };
  }, [displayStores]);

  const currentActiveStore = displayStores[activeSlideIndex] || displayStores.find((s) => s.id === activeStoreId) || displayStores[0];

  return (
    <section className="py-16 bg-slate-50 border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-[#DF0C88] uppercase tracking-wider mb-2">
              <MapPin className="w-3.5 h-3.5" />
              <span>High Street Flagships Across Britain</span>
              <span aria-hidden="true">·</span>
              <span>Walk-in Without Appointment</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
              {settings.title || 'Visit Our UK High Street Stores'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {settings.subtitle || 'Walk in anytime without an appointment or pre-book online for priority express queue'}
            </p>

            {/* Geolocation Status / Nearest Store Indicator */}
            {nearestStoreId && nearestDistance !== null && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-pink-50 border border-pink-200/70 text-xs text-slate-800">
                <Compass className="w-3.5 h-3.5 text-[#DF0C88]" />
                <span>
                  Nearest branch to your location: <strong className="font-bold text-[#DF0C88]">{displayStores.find(s => s.id === nearestStoreId)?.city || 'Local Store'}</strong> ({nearestDistance} miles away)
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs self-start md:self-end">
            <button
              onClick={() => setViewMode('both')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'both' ? 'bg-[#DF0C88] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map & Stores</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'grid' ? 'bg-[#DF0C88] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Cards Only</span>
            </button>
          </div>
        </div>

        {/* Interactive Map (Synced with active store and auto-focuses on active store) */}
        {viewMode === 'both' && displayStores.length > 0 && (
          <div className="space-y-2">
            <StoreMap
              stores={displayStores}
              activeStoreId={activeStoreId}
              onSelectStore={(st) => selectStoreById(st.id)}
              height="400px"
              fitAllStores={false}
              zoomOnSelect={13}
              className="shadow-sm"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#DF0C88] inline-block animate-pulse" />
                Active store pin highlighted on map
              </span>
              <span className="hidden sm:inline text-slate-400">
                Use arrows or tap store cards below to view each branch location on the map.
              </span>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MOBILE & TABLET SLIDER MODE (< 1024px / lg:hidden)      */}
        {/* ======================================================== */}
        <div className="block lg:hidden">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
            
            {/* Slider Top Controls & Progress Indicator */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold">
                  {activeSlideIndex + 1} / {displayStores.length}
                </span>
                <span className="text-sm font-extrabold text-slate-900">
                  {currentActiveStore?.city || currentActiveStore?.name}
                </span>
                {currentActiveStore?.id === nearestStoreId && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Nearest Store</span>
                  </span>
                )}
              </div>

              {/* Prev / Next Navigation Arrows */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  aria-label="Previous Store"
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-all cursor-pointer border border-slate-200"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={handleNextSlide}
                  aria-label="Next Store"
                  className="w-9 h-9 rounded-full bg-slate-900 hover:bg-[#DF0C88] active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
                >
                  <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Quick City Quick-Jump Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {displayStores.map((st, idx) => {
                const isActive = idx === activeSlideIndex;
                const isNearest = st.id === nearestStoreId;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => selectStoreByIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                      isActive
                        ? 'bg-[#DF0C88] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{st.city || st.name}</span>
                    {isNearest && <span className="text-[10px]">📍</span>}
                  </button>
                );
              })}
            </div>

            {/* Current Active Store Card Slide with Touch Swipe */}
            <div 
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="transition-all duration-300"
            >
              {currentActiveStore && renderStoreCard(currentActiveStore, activeSlideIndex, true)}
            </div>

            {/* Bottom Slider Helper */}
            <div className="text-center text-[11px] text-slate-400 pt-1">
              Swipe or tap arrows to navigate between our 8 UK flagship stores.
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* DESKTOP GRID MODE (>= 1024px / hidden lg:grid)          */}
        {/* ======================================================== */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-6">
          {displayStores.map((store: any, idx: number) => renderStoreCard(store, idx, false))}
        </div>

      </div>
    </section>
  );

  // --- Sub-renderer: Individual Store Card (used in both Slider & Grid) ---
  function renderStoreCard(store: any, idx: number, isSlider: boolean = false) {
    const hours = typeof store.openingHours === 'string' ? JSON.parse(store.openingHours || '{}') : (store.openingHours || {});
    const features = Array.isArray(store.features) ? store.features : (typeof store.features === 'string' ? JSON.parse(store.features || '[]') : []);
    const isSelected = store.id === activeStoreId;
    const isNearest = store.id === nearestStoreId;

    // Pick realistic high street photo
    let storeImage = '/images/stores/flagship_storefront.jpg';
    const city = (store.city || store.name || '').toLowerCase();
    if (city.includes('basingstoke')) {
      storeImage = '/uploads/blog/f93044d4_basingstoke.jpg';
    } else if (idx % 2 === 1) {
      storeImage = '/uploads/blog/40054017_Shop-Photos-3.jpg';
    }

    return (
      <div
        key={store.id}
        onClick={() => selectStoreById(store.id)}
        className={`group bg-white rounded-2xl border transition-all duration-300 p-5 flex flex-col justify-between cursor-pointer ${
          isSelected
            ? 'border-[#DF0C88] ring-2 ring-[#DF0C88]/20 shadow-md'
            : 'border-slate-200/90 shadow-xs hover:shadow-xl hover:border-slate-300'
        } ${isSlider ? 'border-2' : ''}`}
      >
        <div>
          {/* Storefront Photography Header */}
          <div className="relative h-36 -mx-5 -mt-5 mb-4 overflow-hidden bg-slate-900 rounded-t-2xl">
            <img 
              src={storeImage} 
              alt={`${store.name} Storefront`}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />
            
            <span className="absolute bottom-2.5 left-3 text-xs font-black text-white uppercase tracking-wider drop-shadow-sm flex items-center gap-1.5">
              <span>{store.city}</span>
              {isSelected && (
                <span className="px-1.5 py-0.5 rounded bg-[#DF0C88] text-[9px] font-bold text-white uppercase tracking-wider">
                  Active
                </span>
              )}
            </span>

            <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1">
              {isNearest && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold shadow-md">
                  <MapPin className="w-3 h-3" />
                  <span>Nearest Store</span>
                </span>
              )}
              {(store.isExpressHub || store.is_express_hub === 1) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/90 text-white text-[10px] font-bold backdrop-blur-md">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Express Hub</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-sm text-slate-900 leading-snug">{store.name}</h3>
            {isNearest && nearestDistance !== null && (
              <span className="text-[11px] font-bold text-[#DF0C88] shrink-0">
                {nearestDistance} mi
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs text-slate-600 mb-4">
            <p className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>{store.address}, {store.postcode}</span>
            </p>

            <p className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <a 
                href={`tel:${store.phone}`} 
                className="hover:text-[#DF0C88] font-medium" 
                onClick={(e) => e.stopPropagation()}
              >
                {store.phone}
              </a>
            </p>

            <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
              <div className="flex justify-between">
                <span>Mon - Fri:</span>
                <span className="font-semibold text-slate-700">{hours.weekdays || '09:00 - 18:00'}</span>
              </div>
              <div className="flex justify-between">
                <span>Saturday:</span>
                <span className="font-semibold text-slate-700">{hours.saturday || '09:00 - 18:00'}</span>
              </div>
              <div className="flex justify-between">
                <span>Sunday:</span>
                <span className="font-semibold text-slate-700">{hours.sunday || '10:30 - 16:30'}</span>
              </div>
            </div>
          </div>

          {features.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {features.slice(0, 3).map((feat: string, fIdx: number) => (
                <span key={fIdx} className="text-[10px] px-2 py-0.5 bg-slate-50 rounded-md text-slate-600 border border-slate-150">
                  {feat}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              startRepairBooking({ storeId: store.id });
            }}
            className="w-full py-2.5 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Book Express Visit</span>
          </button>

          <a
            href={store.mapLink || `https://maps.google.com/?q=${encodeURIComponent(store.address + ' ' + store.postcode)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-full py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
          >
            <Navigation className="w-3 h-3" />
            <span>Get Directions</span>
          </a>
        </div>
      </div>
    );
  }
};
