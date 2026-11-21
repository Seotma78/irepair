import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { StoreLocation } from '../types';
import { MapPin, Navigation, Phone, Clock, Search, Crosshair, Check } from 'lucide-react';

interface StoreMapProps {
  stores?: StoreLocation[];
  activeStoreId?: string;
  onSelectStore?: (store: StoreLocation) => void;
  height?: string;
  interactivePicker?: boolean;
  currentCoords?: { lat: number; lng: number };
  onCoordsChange?: (coords: { lat: number; lng: number }) => void;
  zoom?: number;
  center?: [number, number];
  className?: string;
  fitAllStores?: boolean;
  zoomOnSelect?: boolean | number;
  showResetButton?: boolean;
}

// Custom Leaflet DivIcon generator
const createPinIcon = (isActive: boolean, label?: string) => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
      ">
        <div style="
          width: ${isActive ? '42px' : '34px'};
          height: ${isActive ? '42px' : '34px'};
          background: ${isActive ? '#DF0C88' : '#0F172A'};
          border: 3px solid #FFFFFF;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 8px 18px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s ease;
          ${isActive ? 'animation: pin-pulse 1.5s infinite;' : ''}
        ">
          <div style="
            transform: rotate(45deg);
            color: #FFFFFF;
            font-size: ${isActive ? '16px' : '13px'};
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            📍
          </div>
        </div>
        ${label ? `
          <div style="
            background: rgba(15, 23, 42, 0.9);
            color: #FFFFFF;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            margin-top: 4px;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            pointer-events: none;
          ">
            ${label}
          </div>
        ` : ''}
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

export const StoreMap: React.FC<StoreMapProps> = ({
  stores = [],
  activeStoreId,
  onSelectStore,
  height = '480px',
  interactivePicker = false,
  currentCoords,
  onCoordsChange,
  zoom = 7.0,
  center = [51.72, -0.25], // Centered across Solihull, Norwich, Reading, Eastbourne
  className = '',
  fitAllStores = true,
  zoomOnSelect = false,
  showResetButton = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const pickerMarkerRef = useRef<L.Marker | null>(null);

  // Helper to fit all markers to map bounds with comfortable padding so all 8 outlets are visible
  const fitAllMarkers = (mapInstance?: L.Map | null) => {
    const map = mapInstance || mapRef.current;
    if (!map || interactivePicker) return;
    const validStores = stores.filter((s) => s.latitude && s.longitude && s.latitude !== 0);
    if (validStores.length === 0) return;

    if (validStores.length === 1) {
      map.setView([validStores[0].latitude!, validStores[0].longitude!], 13);
      return;
    }

    const bounds = L.latLngBounds(validStores.map((s) => [s.latitude!, s.longitude!]));
    map.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom: 7.2,
    });
  };

  // Address search inside map
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // 1. Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const initialCenter: [number, number] = interactivePicker && currentCoords && currentCoords.lat !== 0
      ? [currentCoords.lat, currentCoords.lng]
      : center;

    const initialZoom = interactivePicker && currentCoords && currentCoords.lat !== 0 ? 15 : zoom;

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomSnap: 0.1,
      scrollWheelZoom: false,
    });

    const CARTO_KEY = (import.meta.env.VITE_MAP_API_KEY || 'cb1_4cye_1_4067d1d4f4e3176883712d72').trim();
    // CARTO Voyager raster tile URL with verified API key (no {r} retina suffix to avoid watermarking)
    const cartoTileUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_KEY}`;
    const osmTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const cartoLayer = L.tileLayer(cartoTileUrl, {
      attribution: '&copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      maxZoom: 19,
      subdomains: 'abcd',
    });

    cartoLayer.on('tileerror', () => {
      // If CARTO tile request encounters any rate limit or key error, failover smoothly
      if (map && !map.hasLayer(osmLayer)) {
        osmLayer.addTo(map);
      }
    });

    const osmLayer = L.tileLayer(osmTileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      subdomains: 'abc',
    });

    cartoLayer.addTo(map);

    mapRef.current = map;

    // Enable scroll zoom on click/focus
    map.on('focus', () => map.scrollWheelZoom.enable());
    map.on('blur', () => map.scrollWheelZoom.disable());

    // Invalidate size after layout mounts & fit all markers
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
        if (fitAllStores && !interactivePicker && stores.length > 0) {
          fitAllMarkers(mapRef.current);
        } else if (activeStoreId && zoomOnSelect && stores.length > 0) {
          const targetStore = stores.find((s) => s.id === activeStoreId);
          if (targetStore && targetStore.latitude && targetStore.longitude) {
            const targetZoom = typeof zoomOnSelect === 'number' ? zoomOnSelect : 13;
            mapRef.current.setView([targetStore.latitude, targetStore.longitude], targetZoom);
          }
        }
      }
    }, 250);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Admin Interactive Picker Mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !interactivePicker) return;

    const defaultLat = currentCoords?.lat && currentCoords.lat !== 0 ? currentCoords.lat : 51.4552;
    const defaultLng = currentCoords?.lng && currentCoords.lng !== 0 ? currentCoords.lng : -0.9734;

    if (!pickerMarkerRef.current) {
      const pickerMarker = L.marker([defaultLat, defaultLng], {
        draggable: true,
        icon: createPinIcon(true, 'Store Pin'),
      }).addTo(map);

      pickerMarker.on('dragend', () => {
        const pos = pickerMarker.getLatLng();
        onCoordsChange?.({ lat: Number(pos.lat.toFixed(5)), lng: Number(pos.lng.toFixed(5)) });
      });

      pickerMarkerRef.current = pickerMarker;
    } else {
      pickerMarkerRef.current.setLatLng([defaultLat, defaultLng]);
    }

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (pickerMarkerRef.current) {
        pickerMarkerRef.current.setLatLng(e.latlng);
        onCoordsChange?.({ lat: Number(e.latlng.lat.toFixed(5)), lng: Number(e.latlng.lng.toFixed(5)) });
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [interactivePicker, currentCoords?.lat, currentCoords?.lng, onCoordsChange]);

  // 3. Render Public Store Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || interactivePicker) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    const validStores = stores.filter((s) => s.latitude && s.longitude && s.latitude !== 0);
    if (validStores.length === 0) return;

    validStores.forEach((store) => {
      const isSelected = store.id === activeStoreId;
      const marker = L.marker([store.latitude!, store.longitude!], {
        icon: createPinIcon(isSelected, store.city),
        zIndexOffset: isSelected ? 1000 : 100,
      }).addTo(map);

      const hours = typeof store.openingHours === 'string'
        ? JSON.parse(store.openingHours)
        : (store.openingHours || {});

      const popupContent = `
        <div style="font-family: inherit; min-width: 210px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #DF0C88; background: #FDF2F8; padding: 2px 6px; border-radius: 4px;">
              ${store.city}
            </span>
            ${store.isExpressHub ? '<span style="font-size: 9px; font-weight: 800; background: #0F172A; color: #FFF; padding: 2px 6px; border-radius: 4px;">Express Hub</span>' : ''}
          </div>
          <h4 style="font-size: 13px; font-weight: 800; color: #0F172A; margin: 0 0 4px 0; line-height: 1.2;">
            ${store.name}
          </h4>
          <p style="font-size: 11px; color: #475569; margin: 0 0 6px 0; line-height: 1.35;">
            ${store.address}, <strong>${store.postcode}</strong>
          </p>
          <div style="font-size: 11px; color: #0F172A; margin-bottom: 6px;">
            📞 <a href="tel:${(store.phone || '').replace(/\s+/g, '')}" style="color: #DF0C88; font-weight: 700; text-decoration: none;">${store.phone}</a>
          </div>
          <div style="font-size: 10px; color: #64748B; margin-bottom: 8px;">
            🕒 Mon-Sat: ${hours.weekdays || '09:00 - 18:00'}
          </div>
          <div style="display: flex; gap: 6px; padding-top: 4px; border-top: 1px solid #E2E8F0;">
            <a href="${store.mapLink || `https://maps.google.com/?q=${encodeURIComponent(store.address + ' ' + store.postcode)}`}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; background: #0F172A; color: #FFF; font-size: 10px; font-weight: 700; padding: 6px 8px; border-radius: 6px; text-decoration: none;">
              Directions ↗
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { offset: [0, -32] });

      marker.on('click', () => {
        onSelectStore?.(store);
      });

      markersRef.current.set(store.id, marker);
    });

    if (fitAllStores) {
      fitAllMarkers(map);
    }
  }, [stores, interactivePicker, onSelectStore, fitAllStores]);

  // 4. Update Marker active states when selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || interactivePicker) return;

    markersRef.current.forEach((marker, storeId) => {
      const store = stores.find((s) => s.id === storeId);
      const isSelected = storeId === activeStoreId;
      marker.setIcon(createPinIcon(isSelected, store?.city));
      marker.setZIndexOffset(isSelected ? 1000 : 100);
    });

    // Only zoom in if zoomOnSelect is specifically enabled (false on homepage to show all 8 outlets)
    if (activeStoreId && zoomOnSelect) {
      const targetStore = stores.find((s) => s.id === activeStoreId);
      if (targetStore && targetStore.latitude && targetStore.longitude) {
        const targetZoom = typeof zoomOnSelect === 'number' ? zoomOnSelect : 14;
        map.flyTo([targetStore.latitude, targetStore.longitude], targetZoom, {
          duration: 0.8,
        });

        const marker = markersRef.current.get(targetStore.id);
        if (marker) {
          marker.openPopup();
        }
      }
    }
  }, [activeStoreId, stores, interactivePicker, zoomOnSelect]);

  // Admin Search / Geocode Address
  const handleGeocodeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchError('');

    try {
      // Server-side proxy geocoding with map api key
      const res = await fetch(`/api/maps/geocode?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.results) && data.results.length > 0) {
        const { lat, lng } = data.results[0];

        if (mapRef.current && pickerMarkerRef.current) {
          mapRef.current.flyTo([lat, lng], 16, { duration: 1 });
          pickerMarkerRef.current.setLatLng([lat, lng]);
          onCoordsChange?.({ lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) });
        }
      } else {
        setSearchError('Address or postcode not found. Try entering city or full postcode.');
      }
    } catch (err) {
      setSearchError('Could not locate address. You can click on the map directly.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className={`relative rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm bg-slate-100 ${className}`}>
      {/* Map Header / Admin Controls */}
      {interactivePicker && (
        <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col sm:flex-row gap-2">
          <form onSubmit={handleGeocodeSearch} className="flex-1 flex items-center bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 px-3 py-1.5">
            <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search UK address or postcode to pinpoint (e.g. RG1 2AA)..."
              className="w-full text-xs bg-transparent focus:outline-none"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-3 py-1 rounded-xl bg-[#DF0C88] text-white text-xs font-bold shrink-0 hover:bg-[#C50875] transition-colors"
            >
              {searching ? 'Locating...' : 'Find'}
            </button>
          </form>

          {currentCoords && (
            <div className="bg-slate-900/90 text-white backdrop-blur-md px-3.5 py-1.5 rounded-2xl text-[11px] font-mono shadow-lg flex items-center gap-2 self-start sm:self-center shrink-0">
              <Crosshair className="w-3.5 h-3.5 text-[#DF0C88]" />
              <span>{currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}</span>
            </div>
          )}
        </div>
      )}

      {/* Geocode Error Message */}
      {searchError && (
        <div className="absolute top-16 left-3 right-3 z-[1000] bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded-xl shadow-md">
          {searchError}
        </div>
      )}

      {/* Leaflet Map Canvas */}
      <div ref={containerRef} style={{ height }} className="w-full h-full z-0" />

      {/* Quick View All Stores Button */}
      {!interactivePicker && showResetButton && stores.length > 1 && (
        <button
          type="button"
          onClick={() => fitAllMarkers()}
          className="absolute top-3 right-3 z-[500] bg-white/95 hover:bg-white text-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl shadow-md border border-slate-200/80 flex items-center gap-1.5 transition-all hover:shadow-lg cursor-pointer"
          title="Zoom out to show all store locations"
        >
          <Navigation className="w-3.5 h-3.5 text-[#DF0C88]" />
          <span>View All {stores.length} Stores</span>
        </button>
      )}

      {/* Quick Centering Controls for UK branches */}
      {!interactivePicker && (
        <div className="absolute bottom-3 left-3 z-[500] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] text-slate-600 font-medium shadow-sm pointer-events-none hidden sm:block">
          📍 Click pins to view branch details & opening hours
        </div>
      )}
    </div>
  );
};
