import React, { useMemo } from 'react';
import { GoogleMap, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { useLocationStore } from '../../location/store/useLocationStore';
import { storeService } from '../../stores/services/storeService';
import { MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

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

export const DiscoveryMap = ({ items = [] }: DiscoveryMapProps) => {
  const { currentLocation } = useLocationStore();
  const navigate = useNavigate();
  const [selectedStore, setSelectedStore] = React.useState<any>(null);

  const center = useMemo(() => {
    if (currentLocation) {
      return { lat: currentLocation.lat, lng: currentLocation.lng };
    }
    return defaultCenter;
  }, [currentLocation]);

  const displayItems = useMemo(() => {
    if (items && items.length > 0) return items;
    return storeService.getMockStores();
  }, [items]);

  return (
    <div className="relative w-full h-[300px] md:h-[500px] rounded-[2rem] overflow-hidden shadow-xl ring-1 ring-border group">
      <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur-md px-4 py-2 rounded-full border border-border shadow-md">
        <h3 className="text-sm font-extrabold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Places Near You
        </h3>
      </div>
      
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={14}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
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
          />
        )}

        {/* Store/Item Pins */}
        {displayItems.map((item) => (
          item.location && (
            <MarkerF
              key={item.id || item.objectID}
              position={item.location}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
              }}
              onClick={() => setSelectedStore(item)}
            />
          )
        ))}

        {selectedStore && selectedStore.location && (
          <InfoWindowF
            position={selectedStore.location}
            onCloseClick={() => setSelectedStore(null)}
          >
            <div className="p-1 max-w-[200px]">
              <div className="w-full h-24 rounded-lg overflow-hidden mb-2">
                <img src={selectedStore.imgURL || selectedStore.imgUrl || selectedStore.image || selectedStore.imageUrl} alt={selectedStore.name || selectedStore.store} className="w-full h-full object-cover" />
              </div>
              <h4 className="font-extrabold text-sm text-gray-900 leading-tight">{selectedStore.name || selectedStore.store}</h4>
              <p className="text-xs text-gray-600 line-clamp-1 mb-2">{selectedStore.categories?.join(', ') || selectedStore.category}</p>
              <button 
                onClick={() => navigate(selectedStore.recordType === 'store' ? `/store/${selectedStore.id || selectedStore.objectID}` : `/product/${selectedStore.id || selectedStore.objectID}`)}
                className="w-full py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors"
              >
                View Details
              </button>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
};
