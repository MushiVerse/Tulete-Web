import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row bg-background">
      {/* Visual branding area (hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground relative overflow-hidden">
        {/* Decorative circle */}
        <div className="absolute -top-24 -left-24 size-96 rounded-full bg-secondary/10 blur-3xl" />
        
        <div className="relative z-10">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-8">
            <span className="text-secondary-foreground font-bold text-2xl">T</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4 text-white">Tulete Platform</h1>
          <p className="text-lg text-slate-300 max-w-md">
            Your premium multi-service hub. Shopping, laundry, travel, and more all in one place.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-sm text-slate-400">© 2026 Tulete. All rights reserved.</p>
        </div>
      </div>

      {/* Form area */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-12 relative z-10">
        <div className="w-full max-w-md">
          <div className="md:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">T</span>
            </div>
            <span className="text-2xl font-bold text-primary">Tulete</span>
          </div>
          
          <Outlet />
        </div>
      </div>
    </div>
  );
};
