import React from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useThemeStore } from '../../../core/theme/useThemeStore';
import { MapPin } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '150px',
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

export const MiniMapPreview = ({ lat, lng, isLoaded }: { lat: number; lng: number; isLoaded: boolean }) => {
  const { isDark } = useThemeStore();

  const safeLat = typeof lat === 'number' && !isNaN(lat) ? lat : (parseFloat(lat as any) || -6.1630);
  const safeLng = typeof lng === 'number' && !isNaN(lng) ? lng : (parseFloat(lng as any) || 35.7516);
  const center = { lat: safeLat, lng: safeLng };

  const dropAnimation = typeof window !== 'undefined' && (window as any).google?.maps?.Animation?.DROP;

  return isLoaded ? (
    <div className="mt-3 relative overflow-hidden rounded-xl border border-border shadow-sm group">
      {/* Selected Destination Pill Badge */}
      <div className="absolute top-2.5 left-2.5 z-10 bg-background/95 backdrop-blur-md border border-border text-foreground px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 shadow-md">
        <MapPin className="w-3.5 h-3.5 text-primary fill-primary/20" />
        <span>Selected Destination</span>
      </div>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={16}
        options={{
          disableDefaultUI: true,
          gestureHandling: 'none', // Make it static/preview only
          styles: isDark ? darkMapStyles : lightMapStyles
        }}
      >
        <Marker 
          position={center} 
          title="Selected Destination"
          animation={dropAnimation}
        />
      </GoogleMap>
    </div>
  ) : (
    <div className="mt-3 w-full h-[150px] bg-muted animate-pulse rounded-xl border border-border flex items-center justify-center">
      <span className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
        <MapPin className="w-4 h-4 text-muted-foreground animate-bounce" />
        Loading Map & Selected Destination...
      </span>
    </div>
  );
};
