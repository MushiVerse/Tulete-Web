import React, { useState, useEffect } from 'react';
import { useLocation as useRouterLocation, useOutlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TopNav } from '../shared/components/TopNav';
import { BottomNav } from '../shared/components/BottomNav';
import { Footer } from '../shared/components/Footer';
import { SearchOverlay } from '../features/search/components/SearchOverlay';
import { useLocationStore } from '../features/location/store/useLocationStore';
import { LocationPickerModal, GOOGLE_MAPS_LIBRARIES } from '../features/location/components/LocationPickerModal';
import { useJsApiLoader } from '@react-google-maps/api';
import { InstallPwaPrompt } from '../shared/components/InstallPwaPrompt';

export const MainLayout = () => {
  const location = useRouterLocation();
  const outlet = useOutlet();

  const { isPickerOpen, setPickerOpen } = useLocationStore();

  // Load Google Maps API script globally
  const { isLoaded: isMapLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden w-full">
        <TopNav />
        
        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto pb-32 md:pb-0 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full flex-1"
            >
              {React.cloneElement(outlet as React.ReactElement, { key: location.pathname })}
            </motion.div>
          </AnimatePresence>
          <Footer />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
      
      {/* Global Search Overlay */}
      <SearchOverlay />

      {/* Global Location Picker Modal */}
      <LocationPickerModal
        isOpen={isPickerOpen}
        onClose={() => setPickerOpen(false)}
        isLoaded={isMapLoaded}
      />

      {/* Floating Install Tulete PWA Prompt */}
      <InstallPwaPrompt />
    </div>
  );
};
