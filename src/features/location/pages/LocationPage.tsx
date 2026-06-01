import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocationStore } from '../hooks/useLocationStore';
import { locationService, GeoLocation } from '../services/locationService';
import { productService } from '../../products/services/productService';
import { InteractiveMap } from '../components/InteractiveMap';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { PageWrapper } from '../../../shared/components/PageWrapper';
import { Badge } from '../../../shared/components/ui/Badge';
import { 
  MapPin, Navigation, Compass, Plus, Trash2, 
  CheckCircle, Loader2, Sparkles, Route, Info, Eye 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const LocationPage = () => {
  const navigate = useNavigate();

  // Selected address state / form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('Nairobi');
  const [formCoords, setFormCoords] = useState<GeoLocation>({ lat: -1.2915, lng: 36.7900 });
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  const { 
    currentLocation, 
    currentAddressString,
    addressList, 
    selectedAddressId,
    driverLocation,
    activeRoutePath,
    isSimulating,
    initialize, 
    detectCurrentLocation, 
    saveAddress, 
    selectAddress,
    deleteAddress,
    setDefaultAddress,
    startDriverSimulation,
    stopDriverSimulation
  } = useLocationStore();

  // Initialize saved address book
  useEffect(() => {
    initialize('user_current');
  }, [initialize]);

  // Active address coordinates
  const activeAddress = addressList.find((a) => a.id === selectedAddressId);
  const activeCenter = activeAddress ? activeAddress.location : (currentLocation || { lat: -1.2915, lng: 36.7900 });

  // Map markers mapping
  const mapMarkers = addressList.map((addr) => ({
    id: addr.id,
    lat: addr.location.lat,
    lng: addr.location.lng,
    label: addr.title,
    type: (addr.id === selectedAddressId ? 'destination' : 'store') as any
  }));

  // Add current active browser location dot
  if (currentLocation) {
    mapMarkers.push({
      id: 'current_dot',
      lat: currentLocation.lat,
      lng: currentLocation.lng,
      label: 'Your Position',
      type: 'user' as any
    });
  }

  // Add delivery driver marker if simulating tracking
  if (driverLocation) {
    mapMarkers.push({
      id: 'sim_driver',
      lat: driverLocation.lat,
      lng: driverLocation.lng,
      label: 'Delivery Attendant (Mwangi)',
      type: 'driver' as any
    });
  }

  // Handle location detection trigger
  const handleDetect = async () => {
    setIsDetecting(true);
    const pos = await detectCurrentLocation();
    setFormCoords(pos);
    setIsDetecting(false);
  };

  // Map click selector translates custom pins
  const handleMapClick = async (coords: GeoLocation) => {
    setFormCoords(coords);
    if (!showAddForm) {
      // Find matching address string
      const addrStr = await locationService.reverseGeocode(coords.lat, coords.lng);
      saveAddress('user_current', {
        title: 'Map Selection Pin',
        addressLine: addrStr,
        city: 'Nairobi',
        location: coords,
        isDefault: false
      });
    }
  };

  // Handle address form submission
  const handleSubmitAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAddress.trim()) return;

    saveAddress('user_current', {
      title: formTitle.trim(),
      addressLine: formAddress.trim(),
      city: formCity,
      location: formCoords,
      isDefault: formIsDefault
    });

    setFormTitle('');
    setFormAddress('');
    setFormIsDefault(false);
    setShowAddForm(false);
  };

  // Handle Live Driver Dispatch Simulation Tracker
  const handleStartTrackingDemo = () => {
    if (!activeAddress) return;
    // Dispatch driver from Kibanda Delight (Nairobi center: -1.2990, 36.8120) to customer's home address!
    const storeOriginCoords = { lat: -1.3033, lng: 36.7900 }; // Mama Safi / ngong road base
    startDriverSimulation(storeOriginCoords, activeAddress.location);
  };

  return (
    <PageWrapper className="py-6 px-4 max-w-4xl mx-auto flex flex-col min-h-[85vh]">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
            Geolocation Hub
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-3">
            Address Book & Geotargeting
          </h1>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={() => handleDetect()} 
            variant="outline" 
            size="sm"
            disabled={isDetecting}
            className="font-bold text-xs"
          >
            {isDetecting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Compass className="w-4 h-4 mr-1.5" />}
            Refresh GPS Location
          </Button>

          <Button 
            onClick={() => setShowAddForm(!showAddForm)}
            size="sm"
            className="font-bold text-xs shadow-md"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Address
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Map View & Tracker console */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-4 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                Interactive Coordinates HUD Map
              </h3>
              
              <span className="text-[10px] text-slate-450 font-bold">
                {showAddForm ? '🎯 Click map to drop pin coordinates' : '📍 Visualizing Nairobi Saved Hubs'}
              </span>
            </div>

            <InteractiveMap
              center={activeCenter}
              markers={mapMarkers}
              routePath={activeRoutePath}
              onMapClick={handleMapClick}
              isLoading={isDetecting}
            />

            <div className="flex gap-2.5 items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900 mt-4 text-[10px] text-slate-500 font-semibold leading-relaxed">
              <Info className="w-4 h-4 text-primary flex-shrink-0" />
              <span>
                **Tulete Geotargeting Engine**: Double-click on any sector of the street coordinates above to instantly drop selection markers and update saved routing coordinates.
              </span>
            </div>
          </Card>

          {/* Realtime driver tracker simulator panel */}
          {activeAddress && (
            <Card className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
              <h3 className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white mb-4">
                <Route className="w-4 h-4 text-primary animate-pulse" />
                Realtime Dispatch & Routing Simulator
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="space-y-2">
                  <span className="text-[9px] uppercase font-extrabold tracking-widest text-slate-400">Transit Statistics</span>
                  <div className="flex justify-between text-xs font-bold border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Selected Hub:</span>
                    <span className="text-slate-900 dark:text-white">{activeAddress.title}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Transit Distance:</span>
                    <span className="text-slate-900 dark:text-white">
                      {locationService.calculateDistance({ lat: -1.3033, lng: 36.7900 }, activeAddress.location)} km
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500">Transit ETA:</span>
                    <span className="text-primary">
                      {locationService.getTravelDirections({ lat: -1.3033, lng: 36.7900 }, activeAddress.location).durationMins} minutes
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {isSimulating ? (
                    <Button 
                      onClick={() => stopDriverSimulation()} 
                      variant="outline" 
                      className="w-full text-xs font-bold border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white"
                    >
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin text-rose-500" />
                      Stop Dispatch Simulation
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleStartTrackingDemo()} 
                      className="w-full text-xs font-bold shadow-md bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Navigation className="w-4 h-4 mr-1.5 animate-bounce" />
                      Simulate Attendant Delivery
                    </Button>
                  )}
                  
                  <span className="text-[9px] text-slate-450 text-center block font-semibold italic">
                    {isSimulating ? 'Rider Mwangi is moving on the map grid towards home pin! 🚴' : 'Simulate live order dispatch path calculations.'}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: Address book lists & Form */}
        <div className="lg:col-span-1 space-y-6">
          {/* Add Address Form toggle panel */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Card className="p-5 border border-primary bg-white dark:bg-slate-900 shadow-md">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-primary mb-3">
                    Add Location Coordinates
                  </h3>

                  <form onSubmit={handleSubmitAddress} className="space-y-4">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Title (e.g. Office, Safaricom)</label>
                      <Input
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="e.g. Safaricom Office"
                        className="text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Street Address</label>
                      <Input
                        value={formAddress}
                        onChange={(e) => setFormAddress(e.target.value)}
                        placeholder="e.g. Suite 4B, Wood Avenue Plaza"
                        className="text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Coordinates Pin</label>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-bold bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span>Lat: {formCoords.lat.toFixed(5)}</span>
                        <span>Lng: {formCoords.lng.toFixed(5)}</span>
                      </div>
                      <span className="text-[8px] text-slate-450 italic mt-1 block">
                        Coordinates automatically match dropped pins on the map panel.
                      </span>
                    </div>

                    <div className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        id="isDefault"
                        checked={formIsDefault}
                        onChange={(e) => setFormIsDefault(e.target.checked)}
                        className="rounded text-primary focus:ring-primary border-slate-300"
                      />
                      <label htmlFor="isDefault" className="text-[10px] font-bold text-slate-650">
                        Set as Default delivery address
                      </label>
                    </div>

                    <div className="flex gap-2 justify-end pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddForm(false)}
                        className="font-bold text-xs"
                      >
                        Cancel
                      </Button>
                      
                      <Button
                        type="submit"
                        size="sm"
                        className="font-bold text-xs"
                      >
                        Save Address
                      </Button>
                    </div>
                  </form>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* SAVED ADDRESSES DIRECTORY LISTS */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
              Address Directory ({addressList.length})
            </h3>

            {addressList.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No addresses saved in your book yet.</p>
            ) : (
              addressList.map((addr) => {
                const isSelected = addr.id === selectedAddressId;

                return (
                  <Card 
                    key={addr.id}
                    onClick={() => selectAddress(addr.id)}
                    className={`p-4 border transition-all cursor-pointer shadow-sm ${
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className={`font-bold text-xs ${isSelected ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                            {addr.title}
                          </h4>
                          {addr.isDefault && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[8px] font-extrabold uppercase py-0 px-1">
                              Default
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          {addr.addressLine}, {addr.city}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAddress(addr.id);
                        }}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded-full transition-colors shrink-0"
                        title="Delete address"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-50 dark:border-slate-800 mt-2 text-[9px] text-slate-400">
                      <span>GPS: {addr.location.lat.toFixed(4)}, {addr.location.lng.toFixed(4)}</span>
                      
                      {!addr.isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDefaultAddress(addr.id);
                          }}
                          className="text-primary hover:underline font-bold"
                        >
                          Make Default
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};
