import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, Marker, MarkerF, type Libraries } from '@react-google-maps/api';
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
import { MapPin, Navigation, Search, Check, Sparkles, AlertCircle, ImagePlus, Loader2, X, History, Clock, Plus, Minus, RotateCw, Crosshair, Maximize2, Target, Layers } from 'lucide-react';
import { useLocationStore, SavedLocation } from '../store/useLocationStore';
import { useThemeStore } from '../../../core/theme/useThemeStore';
import { motion, AnimatePresence } from 'framer-motion';
import { storageService } from '../../../core/services/storageService';
import { locationService } from '../services/locationService';

const containerStyle = {
  width: '100%',
  height: '200px',
  borderRadius: '0.75rem',
};

// Default map center (Dodoma, Tanzania)
const defaultCenter = {
  lat: -6.1630,
  lng: 35.7516,
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
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
];

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

  const { addSavedLocation, currentLocation, savedLocations, setCurrentLocation } = useLocationStore();
  const { isDark } = useThemeStore();
  
  const [mapCenter, setMapCenter] = useState(
    currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : defaultCenter
  );
  const [selectedPos, setSelectedPos] = useState<{lat: number, lng: number} | null>(
    currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : null
  );
  
  const [addressText, setAddressText] = useState('');
  const [specificInstructions, setSpecificInstructions] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fallbackSuggestions, setFallbackSuggestions] = useState<Array<{ place_id: string; description: string; lat: number; lng: number }>>([]);
  
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [isUserTyping, setIsUserTyping] = useState(false);
  // Adjust container height based on fullscreen mode
  const dynamicContainerStyle = {
    ...containerStyle,
    height: isFullScreen ? '80vh' : containerStyle.height,
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const prevIdlePosRef = useRef<{ lat: number; lng: number } | null>(null);

  // Clean up preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const {
    ready,
    value: searchValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {},
    debounce: 300,
  });

  // Fetch OpenStreetMap Nominatim fallback suggestions ONLY when user is actively typing in search field
  useEffect(() => {
    if (isUserTyping && status !== 'OK' && searchValue.trim().length > 2) {
      const controller = new AbortController();
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchValue)}&limit=5`, {
            headers: { 'Accept-Language': 'en' },
            signal: controller.signal,
          });
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json)) {
              setFallbackSuggestions(json.map((item: any) => ({
                place_id: String(item.place_id),
                description: item.display_name,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
              })));
            }
          }
        } catch (e) {
          // ignore error
        }
      }, 350);
      return () => {
        clearTimeout(timer);
        controller.abort();
      };
    } else {
      setFallbackSuggestions([]);
    }
  }, [searchValue, status, isUserTyping]);

  const handleSelect = async (val: string) => {
    setIsUserTyping(false);
    setValue(val, false);
    clearSuggestions();
    setFallbackSuggestions([]);

    try {
      const results = await getGeocode({ address: val });
      const { lat, lng } = await getLatLng(results[0]);
      setMapCenter({ lat, lng });
      setSelectedPos({ lat, lng });
      setAddressText(results[0].formatted_address);
      setCurrentLocation({
        id: Date.now().toString(),
        address: results[0].formatted_address,
        lat,
        lng,
        specificInstructions: '',
        lastUsedAt: Date.now(),
      });
      if (mapRef.current) {
        mapRef.current.panTo({ lat, lng });
        mapRef.current.setZoom(16);
      }
    } catch (error) {
      console.error('Google Places Geocode error:', error);
    }
  };

  const handleFallbackSelect = (item: { description: string; lat: number; lng: number }) => {
    setIsUserTyping(false);
    setValue(item.description, false);
    clearSuggestions();
    setFallbackSuggestions([]);
    setMapCenter({ lat: item.lat, lng: item.lng });
    setSelectedPos({ lat: item.lat, lng: item.lng });
    setAddressText(item.description);
    setCurrentLocation({
      id: Date.now().toString(),
      address: item.description,
      lat: item.lat,
      lng: item.lng,
      specificInstructions: '',
      lastUsedAt: Date.now(),
    });
    if (mapRef.current) {
      mapRef.current.panTo({ lat: item.lat, lng: item.lng });
      mapRef.current.setZoom(16);
    }
  };

  const handleUseCurrentLocation = useCallback(async () => {
    setIsLocating(true);
    setIsUserTyping(false);
    clearSuggestions();
    setFallbackSuggestions([]);
    try {
      const loc = await locationService.detectUserLocation();
      setMapCenter({ lat: loc.lat, lng: loc.lng });
      setSelectedPos({ lat: loc.lat, lng: loc.lng });
      setAddressText(loc.address);
      setValue(loc.address, false);
      setCurrentLocation({
        id: Date.now().toString(),
        address: loc.address,
        lat: loc.lat,
        lng: loc.lng,
        specificInstructions: '',
        lastUsedAt: Date.now(),
      });
      if (mapRef.current) {
        mapRef.current.panTo({ lat: loc.lat, lng: loc.lng });
        mapRef.current.setZoom(16);
      }
    } catch (error) {
      console.error('Location detection failed:', error);
    } finally {
      setIsLocating(false);
    }
  }, [setValue, setCurrentLocation, clearSuggestions]);

  const updateSelectedLocation = useCallback(async (lat: number, lng: number) => {
    setSelectedPos({ lat, lng });
    setIsUserTyping(false);
    clearSuggestions();
    setFallbackSuggestions([]);
    try {
      const results = await getGeocode({ location: { lat, lng } });
      if (results[0] && results[0].formatted_address) {
        const rawAddr = results[0].formatted_address;
        const cleanedAddr = rawAddr.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4}(,\s*)?/i, '').trim() || rawAddr;
        setAddressText(cleanedAddr);
        setValue(cleanedAddr, false);
        setCurrentLocation({
          id: Date.now().toString(),
          address: cleanedAddr,
          lat,
          lng,
          specificInstructions: '',
          lastUsedAt: Date.now(),
        });
        return;
      }
    } catch (err) {
      // ignore
    }

    try {
      const fallbackAddress = await locationService.reverseGeocode(lat, lng);
      setAddressText(fallbackAddress);
      setValue(fallbackAddress, false);
      setCurrentLocation({
        id: Date.now().toString(),
        address: fallbackAddress,
        lat,
        lng,
        specificInstructions: '',
        lastUsedAt: Date.now(),
      });
    } catch (fallbackErr) {
      setAddressText('Selected Map Location');
    }
  }, [setValue, setCurrentLocation, clearSuggestions]);

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    updateSelectedLocation(lat, lng);
  }, [updateSelectedLocation]);

  // Auto-select center when map dragging stops
  const handleMapIdle = useCallback(() => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    if (!center) return;

    const lat = center.lat();
    const lng = center.lng();

    if (
      prevIdlePosRef.current &&
      Math.abs(prevIdlePosRef.current.lat - lat) < 0.00005 &&
      Math.abs(prevIdlePosRef.current.lng - lng) < 0.00005
    ) {
      return;
    }

    prevIdlePosRef.current = { lat, lng };
    updateSelectedLocation(lat, lng);
  }, [updateSelectedLocation]);

  const handleSaveLocation = async () => {
    if (!selectedPos || !specificInstructions.trim()) return;

    let imageUrl = undefined;
    if (selectedImage) {
      setIsUploading(true);
      try {
        imageUrl = await storageService.uploadFile(selectedImage, 'location_images');
      } catch (error) {
        console.error('Failed to upload location image:', error);
      } finally {
        setIsUploading(false);
      }
    }

    const newLocation = {
      address: addressText || 'Custom Map Location',
      lat: selectedPos.lat,
      lng: selectedPos.lng,
      specificInstructions,
      imageUrl,
    };

    addSavedLocation(newLocation);
    setCurrentLocation({
      id: Date.now().toString(),
      address: newLocation.address,
      lat: newLocation.lat,
      lng: newLocation.lng,
      specificInstructions: newLocation.specificInstructions,
      lastUsedAt: Date.now(),
    });

    setSpecificInstructions('');
    removeImage();
    onClose();
  };

  const handleQuickSelect = (loc: SavedLocation) => {
    setCurrentLocation(loc);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-card flex flex-col max-h-screen w-[95vw] sm:w-full">
        <DialogHeader className="p-5 border-b border-border bg-gradient-to-r from-primary/10 to-transparent relative overflow-hidden shrink-0">
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

        <div className="p-5 space-y-5 overflow-y-auto flex-1 hide-scrollbar scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* Quick Select Saved Locations */}
          {savedLocations.length > 0 && (
            <div className="space-y-2.5">
              <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Recent Locations
              </label>
              <div className="flex gap-3 overflow-x-auto pb-2 snap-x hide-scrollbar scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {savedLocations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => handleQuickSelect(loc)}
                    className="snap-start shrink-0 w-[200px] text-left p-3 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all shadow-sm group"
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 bg-primary/10 p-1 rounded-full text-primary">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">
                          {loc.specificInstructions?.trim() || loc.address}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {loc.specificInstructions?.trim() ? loc.address : 'No landmark'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(e) => {
                setIsUserTyping(true);
                setValue(e.target.value);
              }}
              onFocus={() => {
                if (searchValue.trim().length > 0) {
                  setIsUserTyping(true);
                }
              }}
              onBlur={() => {
                setTimeout(() => setIsUserTyping(false), 250);
              }}
              placeholder="Search for area, street name..."
              className="pl-10 bg-muted/50 border-border focus:bg-card transition-colors"
            />
            {isUserTyping && (status === "OK" || fallbackSuggestions.length > 0) && (
              <ul className="absolute z-20 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto hide-scrollbar scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {status === "OK" && data.map(({ place_id, description }) => (
                  <li
                    key={place_id}
                    role="option"
                    aria-selected={false}
                    className="p-3 hover:bg-muted cursor-pointer text-sm font-medium transition-colors border-b border-border last:border-0 text-foreground"
                    onMouseDown={() => handleSelect(description)}
                  >
                    {description}
                  </li>
                ))}
                {status !== "OK" && fallbackSuggestions.map((item) => (
                  <li
                    key={item.place_id}
                    role="option"
                    aria-selected={false}
                    className="p-3 hover:bg-muted cursor-pointer text-sm font-medium transition-colors border-b border-border last:border-0 text-foreground"
                    onMouseDown={() => handleFallbackSelect(item)}
                  >
                    {item.description}
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
            className="relative rounded-2xl overflow-hidden shadow-inner bg-card"
          >
            {isLoaded ? (
              <>
                <GoogleMap
                  mapContainerStyle={dynamicContainerStyle}
                  center={mapCenter}
                  zoom={14}
                  onClick={onMapClick}
                  onIdle={handleMapIdle}
                  onLoad={(map) => { mapRef.current = map; }}
                  mapTypeId={mapTypeId}
                  options={{
                    disableDefaultUI: true,
                    zoomControl: false,
                    gestureHandling: 'greedy',
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                    styles: mapTypeId === 'hybrid' ? [] : (isDark ? darkMapStyles : lightMapStyles),
                  }}
                >
                  {/* One‑hand toolbar – top‑left for thumb reach */}
                  <div className="absolute left-2 top-2 flex flex-col bg-card/90 border border-border text-foreground rounded-lg shadow-md p-1 space-y-1 backdrop-blur z-10">
                    <button
                      onClick={() => {
                        const map = mapRef.current;
                        if (map) map.setZoom((map.getZoom() || 14) + 1);
                      }}
                      className="p-1 hover:bg-primary/10 rounded"
                      title="Zoom In"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        const map = mapRef.current;
                        if (map) map.setZoom((map.getZoom() || 14) - 1);
                      }}
                      className="p-1 hover:bg-primary/10 rounded"
                      title="Zoom Out"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <button onClick={handleUseCurrentLocation} className="p-1 hover:bg-primary/10 rounded" title="My Location">
                      <Crosshair className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setMapTypeId(prev => (prev === 'roadmap' ? 'hybrid' : 'roadmap'))}
                      className={`p-1 rounded transition-colors ${
                        mapTypeId === 'hybrid'
                          ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                          : 'hover:bg-primary/10'
                      }`}
                      title={mapTypeId === 'hybrid' ? 'Switch to Standard Map' : 'Switch to Satellite View'}
                    >
                      <Layers className="w-5 h-5" />
                    </button>
                    <button onClick={() => setIsFullScreen(prev => !prev)} className="p-1 hover:bg-primary/10 rounded" title="Toggle Fullscreen">
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </GoogleMap>

                {/* Sleek Centered Location Target Pin with Thin Pointer Tip */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="relative flex flex-col items-center -translate-y-full mb-1">
                    {/* Address / Landmark Pill Badge above Marker */}
                    <div className="mb-1.5 bg-slate-900/90 dark:bg-slate-100/95 text-white dark:text-slate-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-lg border border-white/20 dark:border-black/20 tracking-tight flex items-center gap-1.5 backdrop-blur-xs max-w-[200px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="truncate">{addressText || 'Move map to select location'}</span>
                    </div>

                    {/* Compact Pin Head with Thin Downward Pointer Tip */}
                    <div className="relative flex flex-col items-center">
                      <div className="absolute -inset-1 bg-primary/30 rounded-full animate-ping" />
                      <div className="relative bg-primary text-primary-foreground p-1.5 rounded-full shadow-md border border-white dark:border-slate-900 flex items-center justify-center">
                        <MapPin className="w-4 h-4 fill-current text-white" />
                      </div>
                      {/* Thin Pointer Tip */}
                      <div className="w-0.5 h-2.5 bg-primary rounded-b-full shadow-xs -mt-0.5" />
                    </div>

                    {/* Ground Target Dot Shadow */}
                    <div className="w-2.5 h-0.5 bg-black/50 rounded-full blur-[0.5px] mt-0.5" />
                  </div>
                </div>
              </>
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
              className="space-y-4 overflow-hidden"
            >
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-warning" />
                  Any landmarks? <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. Near the big mango tree, Red gate..."
                  value={specificInstructions}
                  onChange={(e) => setSpecificInstructions(e.target.value)}
                  className="bg-card border-border/60 h-12 rounded-xl focus:ring-primary shadow-sm"
                />
                <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Helps our riders find you lightning fast ⚡ (Required)
                </p>
              </div>

              {/* Optional Image Upload */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <label className="text-sm font-bold text-foreground flex items-center justify-between">
                  <span>Photo of Location <span className="text-muted-foreground font-normal">(Optional)</span></span>
                </label>
                
                {previewUrl ? (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-border group">
                    <img src={previewUrl} alt="Location preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-background/80 backdrop-blur p-1.5 rounded-full text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-14 border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary"
                  >
                    <ImagePlus className="w-5 h-5" />
                    Add a photo of your gate/door
                  </button>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImageChange}
                />
              </div>
            </motion.div>
          )}
          </AnimatePresence>

        </div>

        <div className="p-5 border-t border-border bg-muted/30 flex justify-between items-center shrink-0">
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground font-semibold">
            Cancel
          </Button>
          <Button 
            onClick={handleSaveLocation} 
            disabled={!selectedPos || !specificInstructions.trim() || isUploading}
            className="font-bold shadow-md gap-2"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isUploading ? 'Uploading...' : 'Set Location'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
