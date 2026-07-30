import React, { useMemo, useState, useEffect } from 'react';
import { GoogleMap, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { useLocationStore } from '../../location/store/useLocationStore';
import { storeService } from '../../stores/services/storeService';
import { MapPin, Store as StoreIcon, ExternalLink, Sparkles, X, Layers, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import { useThemeStore } from '../../../core/theme/useThemeStore';
import { motion, AnimatePresence } from 'framer-motion';

interface DiscoveryMapProps {
  items?: any[];
}

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '1.5rem',
};

// Default map center (Dodoma, Tanzania) if no location
const defaultCenter = {
  lat: -6.1630,
  lng: 35.7516,
};

const LIGHT_MAP_STYLES = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

const DARK_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
];

// Helper to safely parse lat/lng from location string ("-6.1630, 35.7516") or object
const parseStoreLocation = (locField: any): { lat: number; lng: number } | null => {
  if (!locField) return null;
  if (typeof locField === 'object') {
    const lat = Number(locField.lat ?? locField.latitude);
    const lng = Number(locField.lng ?? locField.longitude);
    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
      return { lat, lng };
    }
  }
  if (typeof locField === 'string') {
    const parts = locField.split(/[,;\s]+/).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
        return { lat, lng };
      }
    }
  }
  return null;
};

// High-visibility stable SVG pin marker icon using System Primary Color (#F99420)
const STORE_PIN_ICON = {
  url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="19" cy="19" r="16" fill="#F99420" stroke="#ffffff" stroke-width="3.5"/>
      <path d="M19 9L27 15.5V26H11V15.5L19 9Z" fill="white"/>
      <rect x="16" y="19" width="6" height="7" fill="#F99420"/>
    </svg>
  `)}`,
};

export const DiscoveryMap = ({ items = [] }: DiscoveryMapProps) => {
  const { isDark } = useThemeStore();
  const { currentLocation } = useLocationStore();
  const navigate = useNavigate();
  const [hoveredStore, setHoveredStore] = useState<any>(null);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [foodStores, setFoodStores] = useState<any[]>([]);

  // Fetch store markers from Firestore "foodStores" collection
  useEffect(() => {
    try {
      const storesRef = collection(db, 'foodStores');
      const unsubscribe = onSnapshot(storesRef, (snapshot) => {
        const list: any[] = [];
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const storeName = data.store || data.name || data.storeName || '';
          const pos = parseStoreLocation(data.location);

          if (pos && storeName) {
            list.push({
              id: docSnap.id,
              ...data,
              storeName,
              locationPos: pos,
              availability: data.availability !== false && data.available !== false,
            });
          }
        });
        setFoodStores(list);
      }, (err) => {
        console.warn('Error subscribing to foodStores for DiscoveryMap:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('foodStores listener error:', e);
    }
  }, []);

  // Compute final markers to display with proximity offset so nearby stores don't overlap
  const storeMarkers = useMemo(() => {
    const rawList = foodStores.length > 0 ? foodStores : (items.length > 0 ? items : storeService.getMockStores()).map((item) => {
      const pos = parseStoreLocation(item.location) || (typeof item.location === 'object' && item.location.lat ? item.location : null);
      const storeName = item.store || item.name || item.storeName || 'Store';
      return {
        id: item.id || item.objectID || `store_${Math.random()}`,
        ...item,
        storeName,
        locationPos: pos,
        availability: item.availability !== false && item.available !== false,
      };
    }).filter((s) => s.locationPos !== null);

    // Apply geometric fan-out offset for stores located very close to each other
    const adjusted: any[] = [];
    const minDistance = 0.00035; // ~35 meters threshold

    for (let i = 0; i < rawList.length; i++) {
      let { lat, lng } = rawList[i].locationPos;
      let count = 0;

      for (let j = 0; j < i; j++) {
        const prevLat = adjusted[j].locationPos.lat;
        const prevLng = adjusted[j].locationPos.lng;
        const dist = Math.hypot(lat - prevLat, lng - prevLng);
        if (dist < minDistance) {
          count++;
        }
      }

      if (count > 0) {
        const angle = count * (2 * Math.PI / 6);
        const radius = minDistance * Math.ceil(count / 6);
        lat += radius * Math.cos(angle);
        lng += radius * Math.sin(angle);
      }

      adjusted.push({
        ...rawList[i],
        locationPos: { lat, lng },
      });
    }

    return adjusted;
  }, [foodStores, items]);

  const center = useMemo(() => {
    if (currentLocation) {
      return { lat: currentLocation.lat, lng: currentLocation.lng };
    }
    if (storeMarkers.length > 0 && storeMarkers[0].locationPos) {
      return storeMarkers[0].locationPos;
    }
    return defaultCenter;
  }, [currentLocation, storeMarkers]);

  const isGoogleLoaded = typeof window !== 'undefined' && !!(window as any).google?.maps;

  const handleOpenStore = (storeObj: any) => {
    const targetStoreName = storeObj.storeName || storeObj.store || storeObj.name || storeObj.id;
    const storeImage = storeObj.imgURL || storeObj.imgUrl || storeObj.image || storeObj.imageUrl || '';
    const storeCategory = storeObj.cat || storeObj.category || 'Food';
    const storeAvailability = storeObj.availability !== undefined ? Boolean(storeObj.availability) : (storeObj.available !== false);

    // Pass image, category & availability via React Router location state so StoreDetailsPage opens with exact state
    navigate(`/store/${encodeURIComponent(targetStoreName)}`, {
      state: {
        storeData: {
          id: storeObj.id,
          store: targetStoreName,
          name: targetStoreName,
          imgURL: storeImage,
          category: storeCategory,
          cat: storeCategory,
          availability: storeAvailability,
          description: storeObj.description || '',
          location: storeObj.locationPos || storeObj.location,
          address: storeObj.address || 'Dodoma, Tanzania',
          rating: storeObj.rating || 4.8,
        }
      }
    });
  };

  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'hybrid'>('roadmap');
  const activeStore = hoveredStore || selectedStore;

  return (
    <div className="relative w-full h-[320px] md:h-[520px] rounded-[2rem] overflow-hidden shadow-xl ring-1 ring-border group">
      {/* Top Header Badge */}
      <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur-md px-4 py-2 rounded-full border border-border shadow-md flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary animate-pulse" />
        <span className="text-sm font-extrabold text-foreground">
          Stores & Outlets ({storeMarkers.length})
        </span>
      </div>

      {/* Floating Layer Switcher (Map vs Satellite) */}
      <div className="absolute top-4 right-4 z-10 bg-background/90 backdrop-blur-md p-1 rounded-2xl border border-border shadow-md flex items-center gap-1 select-none">
        <button
          onClick={() => setMapTypeId('roadmap')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            mapTypeId === 'roadmap'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          title="Vector Map View"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Map</span>
        </button>
        <button
          onClick={() => setMapTypeId('hybrid')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            mapTypeId === 'hybrid'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          title="Satellite Imagery View"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Satellite</span>
        </button>
      </div>

      {isGoogleLoaded ? (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={14}
          mapTypeId={mapTypeId}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
            clickableIcons: false,
            styles: mapTypeId === 'roadmap' ? (isDark ? DARK_MAP_STYLES : LIGHT_MAP_STYLES) : LIGHT_MAP_STYLES
          }}
        >
          {/* User's Current Location Pin */}
          {currentLocation && (
            <MarkerF
              position={{ lat: currentLocation.lat, lng: currentLocation.lng }}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              }}
              zIndex={999}
              title="Your Location"
            />
          )}

          {/* Interactive Stable Store Markers */}
          {storeMarkers.map((store) => (
            <MarkerF
              key={store.id}
              position={store.locationPos}
              title={store.storeName}
              icon={STORE_PIN_ICON}
              onMouseOver={() => setHoveredStore(store)}
              onClick={() => {
                setSelectedStore(store);
                handleOpenStore(store);
              }}
            />
          ))}

          {/* Floating Preview Modal Anchored Directly on Top of the Hovered Marker */}
          {activeStore && activeStore.locationPos && (
            <InfoWindowF
              position={activeStore.locationPos}
              onCloseClick={() => {
                setSelectedStore(null);
                setHoveredStore(null);
              }}
              options={{
                pixelOffset: typeof window !== 'undefined' && (window as any).google?.maps ? new (window as any).google.maps.Size(0, -35) : undefined,
              }}
            >
              <>
                <style>{`
                  .gm-style-iw-c {
                    background-color: ${isDark ? '#141416' : '#ffffff'} !important;
                    color: ${isDark ? '#F8FAFC' : '#0F172A'} !important;
                    border: 1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'} !important;
                    border-radius: 1.25rem !important;
                    padding: 8px !important;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.35) !important;
                  }
                  .gm-style-iw-tc::after {
                    background-color: ${isDark ? '#141416' : '#ffffff'} !important;
                  }
                  .gm-ui-hover-or-focus {
                    filter: ${isDark ? 'invert(1) brightness(200%)' : 'none'} !important;
                  }
                `}</style>
                <div
                  className={`w-[235px] flex flex-col items-start justify-start text-left gap-2 cursor-pointer p-1 pb-1.5 ${isDark ? 'text-[#F8FAFC]' : 'text-[#0F172A]'
                    }`}
                  onClick={() => handleOpenStore(activeStore)}
                >
                  {/* Store Preview Image */}
                  <div className={`w-full h-28 rounded-xl overflow-hidden relative border shrink-0 group ${isDark ? 'bg-[#27272A] border-[#3F3F46]' : 'bg-slate-100 border-slate-200'
                    }`}>
                    <img
                      src={activeStore.imgURL || activeStore.imgUrl || activeStore.image || activeStore.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400'}
                      alt={activeStore.storeName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  </div>

                  {/* Header Row: Category Badge (Far Left) & Availability (Far Right) */}
                  <div className="flex items-center justify-between w-full gap-2 mt-0.5">
                    <span
                      className="text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider shadow-sm truncate max-w-[130px] text-left"
                      style={{ backgroundColor: 'rgba(249, 148, 32, 0.18)', color: '#F99420' }}
                    >
                      {activeStore.cat || activeStore.category || 'Store'}
                    </span>

                    <span className={`text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full text-white shadow-sm shrink-0 ml-auto ${activeStore.availability !== false ? 'bg-emerald-500' : 'bg-slate-500'}`}>
                      {activeStore.availability !== false ? 'OPEN' : 'CLOSED'}
                    </span>
                  </div>

                  {/* Store Name & Description */}
                  <div className="flex flex-col items-start justify-start text-left w-full space-y-0.5 mt-0.5">
                    <h4 className={`font-extrabold text-sm leading-tight line-clamp-1 text-left w-full ${isDark ? 'text-white' : 'text-slate-900'
                      }`}>
                      {activeStore.storeName}
                    </h4>

                    <p className={`text-[11px] font-medium line-clamp-2 text-left w-full leading-snug ${isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                      {activeStore.description || activeStore.address || 'Explore full menu, pricing, and available store items.'}
                    </p>
                  </div>

                  {/* Action Button with adjusted padding */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenStore(activeStore);
                    }}
                    className="w-full py-2 px-3 text-white text-xs font-extrabold rounded-xl transition-all shadow-md flex items-center justify-between mt-1.5 mb-0.5 active:scale-95 hover:opacity-90 cursor-pointer"
                    style={{ backgroundColor: '#F99420' }}
                  >
                    <span>Open Store</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            </InfoWindowF>
          )}
        </GoogleMap>
      ) : (
        <iframe
          title="Discovery Map Embed"
          width="100%"
          height="100%"
          style={{
            border: 0,
            filter: isDark ? 'invert(90%) hue-rotate(180deg) contrast(120%)' : 'none'
          }}
          loading="lazy"
          allowFullScreen
          src={`https://maps.google.com/maps?q=${center.lat},${center.lng}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
          className="w-full h-full border-0 rounded-[2rem] transition-all duration-300"
        />
      )}
    </div>
  );
};


