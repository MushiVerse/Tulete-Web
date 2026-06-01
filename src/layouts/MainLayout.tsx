import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../shared/components/Sidebar';
import { TopNav } from '../shared/components/TopNav';
import { BottomNav } from '../shared/components/BottomNav';
import { SearchOverlay } from '../features/search/components/SearchOverlay';

export const MainLayout = () => {
  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav />
        
        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
          <div className="mx-auto max-w-7xl h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
      
      {/* Global Search Overlay */}
      <SearchOverlay />
    </div>
  );
};
