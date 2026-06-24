import React from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '140px',
  borderRadius: '0.5rem',
};

export const MiniMapPreview = ({ lat, lng, isLoaded }: { lat: number; lng: number; isLoaded: boolean }) => {

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
          styles: [
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
          ]
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
