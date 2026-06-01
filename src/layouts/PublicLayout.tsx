import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { BottomNav } from '../shared/components/BottomNav';

export const PublicLayout = () => {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 max-w-7xl items-center justify-between px-4 md:px-8 mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">T</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-primary">Tulete</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">Home</Link>
            <Link to="/explore" className="text-sm font-medium text-muted-foreground hover:text-foreground">Explore</Link>
            <div className="flex items-center gap-4 ml-4">
              <Link to="/login" className="text-sm font-medium hover:underline underline-offset-4">Sign In</Link>
              <Link to="/register" className="text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md transition-colors">Get Started</Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
};
