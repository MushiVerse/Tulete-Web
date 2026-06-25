import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, Marker, type Libraries } from '@react-google-maps/api';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from 'use-places-autocomplete';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { MapPin, Navigation, Search, Check, Sparkles, AlertCircle } from 'lucide-react';
import { useLocationStore } from '../store/useLocationStore';
import { motion, AnimatePresence } from 'framer-motion';

const containerStyle = {
  width: '100%',
  height: '200px',
  borderRadius: '0.75rem',
};

// Default map center (Nairobi CBD)
const defaultCenter = {
  lat: -1.286389,
  lng: 36.817223,
};

// We load the script globally — must be defined outside the component to prevent re-renders
export const GOOGLE_MAPS_LIBRARIES: Libraries = ["places"];

export const LocationPickerModal = ({ 
  isOpen, 
  onClose,
  isLoaded
}: { 
  isOpen: boolean; 
  onClose: () => void;
  isLoaded: boolean;
}) => {

  const { addSavedLocation, currentLocation } = useLocationStore();
  
  const [mapCenter, setMapCenter] = useState(
    currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : defaultCenter
  );
  const [selectedPos, setSelectedPos] = useState<{lat: number, lng: number} | null>(
    currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : null
  );
  
  const [addressText, setAddressText] = useState('');
  const [specificInstructions, setSpecificInstructions] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const mapRef = useRef<google.maps.Map | null>(null);

  const {
    ready,
    value: searchValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      /* Define search scope here if needed */
    },
    debounce: 300,
  });

  const handleSelect = async (val: string) => {
    setValue(val, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address: val });
      const { lat, lng } = await getLatLng(results[0]);
      setMapCenter({ lat, lng });
      setSelectedPos({ lat, lng });
      setAddressText(results[0].formatted_address);
      if (mapRef.current) {
        mapRef.current.panTo({ lat, lng });
        mapRef.current.setZoom(16);
      }
    } catch (error) {
      console.error('Error: ', error);
    }
  };

  const handleUseCurrentLocation = useCallback(() => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setMapCenter({ lat, lng });
          setSelectedPos({ lat, lng });
          if (mapRef.current) {
            mapRef.current.panTo({ lat, lng });
            mapRef.current.setZoom(16);
          }
          
          // Reverse geocode
          try {
            const results = await getGeocode({ location: { lat, lng } });
            if (results[0]) {
              setAddressText(results[0].formatted_address);
              setValue(results[0].formatted_address, false);
            }
          } catch (e) {
            console.error('Google Maps Geocoding failed:', e);
            // Fallback to OpenStreetMap Nominatim from locationService
            try {
              const { locationService } = await import('../services/locationService');
              const fallbackAddress = await locationService.reverseGeocode(lat, lng);
              setAddressText(fallbackAddress);
              setValue(fallbackAddress, false);
            } catch (fallbackErr) {
              setAddressText('Current Location Selected');
            }
          }
          setIsLocating(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setIsLocating(false);
          if (error.code === error.PERMISSION_DENIED) {
            alert('Location access was denied. Please enable it in your browser settings.');
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
      setIsLocating(false);
    }
  }, [setValue]);

  // Auto-locate user when the modal opens if they haven't set a location yet
  useEffect(() => {
    if (isOpen && !currentLocation && !selectedPos && !isLocating) {
      handleUseCurrentLocation();
    }
  }, [isOpen, currentLocation, selectedPos, isLocating, handleUseCurrentLocation]);

  const onMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setSelectedPos({ lat, lng });
    
    // Reverse geocode
    try {
      const results = await getGeocode({ location: { lat, lng } });
      if (results[0]) {
        setAddressText(results[0].formatted_address);
        setValue(results[0].formatted_address, false);
      }
    } catch (err) {
      console.error('Google Maps Geocoding failed on map click:', err);
      // Fallback to OpenStreetMap Nominatim
      try {
        const { locationService } = await import('../services/locationService');
        const fallbackAddress = await locationService.reverseGeocode(lat, lng);
        setAddressText(fallbackAddress);
        setValue(fallbackAddress, false);
      } catch (fallbackErr) {
        setAddressText('Custom Map Location');
      }
    }
  }, [setValue]);

  const handleSaveLocation = () => {
    if (!selectedPos) return;
    addSavedLocation({
      address: addressText || 'Custom Map Location',
      lat: selectedPos.lat,
      lng: selectedPos.lng,
      specificInstructions,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-card">
        <DialogHeader className="p-5 border-b border-border bg-gradient-to-r from-primary/10 to-transparent relative overflow-hidden">
          <DialogTitle className="text-xl font-extrabold flex flex-col gap-1 text-foreground relative z-10">
            <span className="flex items-center gap-2">
              <MapPin className="w-6 h-6 text-primary" />
              Where to? 🛵
            </span>
            <span className="text-xs font-semibold text-muted-foreground mt-1 leading-relaxed">
              Set your location to see accurate pricing and exact delivery times. ✨
            </span>
          </DialogTitle>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
        </DialogHeader>

        <div className="p-5 space-y-5">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(e) => setValue(e.target.value)}
              disabled={!ready}
              placeholder="Search for area, street name..."
              className="pl-10 bg-muted/50 border-border focus:bg-card transition-colors"
            />
            {status === "OK" && (
              <ul className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {data.map(({ place_id, description }) => (
                  <li
                    key={place_id}
                    role="option"
                    aria-selected={false}
                    className="p-3 hover:bg-muted cursor-pointer text-sm font-medium transition-colors border-b border-border last:border-0"
                    onMouseDown={() => handleSelect(description)}
                  >
                    {description}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button 
            variant="outline" 
            className={`w-full justify-start gap-2 border-primary/30 text-primary transition-all font-extrabold py-6 rounded-xl shadow-sm ${
              isLocating ? 'bg-primary/10 animate-pulse' : 'hover:bg-primary/10 hover:border-primary'
            }`}
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
          >
            <Navigation className={`w-5 h-5 ${isLocating ? 'animate-bounce' : ''}`} />
            {isLocating ? 'Locating you...' : 'Use Current Location 📍'}
          </Button>

          {/* Map Area */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl overflow-hidden shadow-inner border border-border/60"
          >
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={mapCenter}
                zoom={14}
                onClick={onMapClick}
                onLoad={(map) => { mapRef.current = map; }}
                options={{
                  disableDefaultUI: true,
                  zoomControl: true,
                  styles: [
                    // Modern clean styling
                    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
                  ]
                }}
              >
                {selectedPos && (
                  <Marker 
                    position={selectedPos} 
                    animation={google.maps.Animation.DROP}
                  />
                )}
              </GoogleMap>
            ) : (
              <div className="w-full h-[200px] bg-muted flex items-center justify-center animate-pulse">
                <span className="text-muted-foreground font-medium">Loading Map...</span>
              </div>
            )}
          </motion.div>

          {/* Specific Instructions input appears only if location is selected */}
          <AnimatePresence>
          {selectedPos && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden"
            >
              <label className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-warning" />
                Any landmarks? (Optional)
              </label>
              <Input
                placeholder="e.g. Near the big mango tree, Red gate..."
                value={specificInstructions}
                onChange={(e) => setSpecificInstructions(e.target.value)}
                className="bg-card border-border/60 h-12 rounded-xl focus:ring-primary shadow-sm"
              />
              <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Helps our riders find you lightning fast ⚡
              </p>
            </motion.div>
          )}
          </AnimatePresence>

        </div>

        <div className="p-5 border-t border-border bg-muted/30 flex justify-between items-center">
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground font-semibold">
            Cancel
          </Button>
          <Button 
            onClick={handleSaveLocation} 
            disabled={!selectedPos}
            className="font-bold shadow-md gap-2"
          >
            <Check className="w-4 h-4" />
            Set Location
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
