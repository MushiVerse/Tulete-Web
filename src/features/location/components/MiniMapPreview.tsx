import React, { useState } from 'react';
import { GoogleMap } from '@react-google-maps/api';
import { useThemeStore } from '../../../core/theme/useThemeStore';
import { MapPin, Layers } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '160px',
  borderRadius: '0.75rem',
};

const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];

const lightMapStyles = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
];

interface MiniMapPreviewProps {
  lat: number;
  lng: number;
  isLoaded: boolean;
  address?: string;
}

export const MiniMapPreview = ({ lat, lng, isLoaded, address }: MiniMapPreviewProps) => {
  const { isDark } = useThemeStore();
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'hybrid'>('roadmap');

  const safeLat = typeof lat === 'number' && !isNaN(lat) ? lat : (parseFloat(lat as any) || -6.1630);
  const safeLng = typeof lng === 'number' && !isNaN(lng) ? lng : (parseFloat(lng as any) || 35.7516);
  const center = { lat: safeLat, lng: safeLng };

  return isLoaded ? (
    <div className="mt-3 relative overflow-hidden rounded-xl border border-border shadow-sm group">
      {/* Selected Destination Pill Badge */}
      <div className="absolute top-2.5 left-2.5 z-10 bg-background/95 backdrop-blur-md border border-border text-foreground px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 shadow-md">
        <MapPin className="w-3.5 h-3.5 text-primary fill-primary/20" />
        <span>Selected Destination</span>
      </div>

      {/* Floating Satellite Mode Toggle Button */}
      <button
        type="button"
        onClick={() => setMapTypeId(prev => (prev === 'roadmap' ? 'hybrid' : 'roadmap'))}
        className={`absolute top-2.5 right-2.5 z-10 px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 shadow-md backdrop-blur-md border border-border transition-all cursor-pointer ${
          mapTypeId === 'hybrid'
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-background/95 text-foreground hover:bg-muted'
        }`}
        title={mapTypeId === 'hybrid' ? 'Switch to Standard Map' : 'Switch to Satellite View'}
      >
        <Layers className="w-3.5 h-3.5" />
        <span>{mapTypeId === 'hybrid' ? 'Map' : 'Satellite'}</span>
      </button>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={16}
        mapTypeId={mapTypeId}
        options={{
          disableDefaultUI: true,
          gestureHandling: 'none', // Make it static/preview only
          styles: mapTypeId === 'hybrid' ? [] : (isDark ? darkMapStyles : lightMapStyles)
        }}
      />

      {/* Sleek Visual Marker Pin Overlay with Thin Pointer Tip */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="relative flex flex-col items-center -translate-y-full mb-1">
          {/* Address Tooltip Tag */}
          {address && (
            <div className="mb-1.5 bg-slate-900/90 dark:bg-slate-100/95 text-white dark:text-slate-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-lg border border-white/20 dark:border-black/20 tracking-tight flex items-center gap-1.5 backdrop-blur-xs max-w-[220px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="truncate">{address}</span>
            </div>
          )}
          
          {/* Compact Pin Head with Thin Downward Pointer Tip */}
          <div className="relative flex flex-col items-center">
            <div className="absolute -inset-1 bg-primary/30 rounded-full animate-ping" />
            <div className="relative bg-primary text-primary-foreground p-1.5 rounded-full shadow-md border border-white dark:border-slate-900 flex items-center justify-center">
              <MapPin className="w-4 h-4 fill-current text-white" />
            </div>
            {/* Thin Pointer Tip */}
            <div className="w-0.5 h-2.5 bg-primary rounded-b-full shadow-xs -mt-0.5" />
          </div>

          {/* Ground Touch Shadow */}
          <div className="w-2.5 h-0.5 bg-black/50 rounded-full blur-[0.5px] mt-0.5" />
        </div>
      </div>
    </div>
  ) : (
    <div className="mt-3 w-full h-[160px] bg-muted animate-pulse rounded-xl border border-border flex items-center justify-center">
      <span className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
        <MapPin className="w-4 h-4 text-muted-foreground animate-bounce" />
        Loading Map & Selected Destination...
      </span>
    </div>
  );
};
