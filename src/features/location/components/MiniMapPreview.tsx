import React from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useThemeStore } from '../../../core/theme/useThemeStore';

const containerStyle = {
  width: '100%',
  height: '140px',
  borderRadius: '0.5rem',
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
  const center = { lat, lng };

  return isLoaded ? (
    <div className="mt-3 overflow-hidden rounded-lg border border-border shadow-sm">
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
        <Marker position={center} />
      </GoogleMap>
    </div>
  ) : (
    <div className="mt-3 w-full h-[140px] bg-muted animate-pulse rounded-lg border border-border flex items-center justify-center">
      <span className="text-xs text-muted-foreground">Loading Map Preview...</span>
    </div>
  );
};
