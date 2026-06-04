import React from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TopNav } from '../shared/components/TopNav';
import { BottomNav } from '../shared/components/BottomNav';
import { Footer } from '../shared/components/Footer';
import { SearchOverlay } from '../features/search/components/SearchOverlay';

export const MainLayout = () => {
  const location = useLocation();
  const outlet = useOutlet();

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
    </div>
  );
};
