import React from 'react';
import { Link, useLocation, useOutlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav } from '../shared/components/BottomNav';
import { useAuthModalStore } from '../features/auth/store/useAuthModalStore';

export const PublicLayout = () => {
  const { openModal } = useAuthModalStore();
  const location = useLocation();
  const outlet = useOutlet();

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
              <button 
                onClick={() => openModal('login')}
                className="text-sm font-medium hover:underline underline-offset-4 bg-transparent border-none p-0 cursor-pointer text-foreground"
              >
                Sign In
              </button>
              <button 
                onClick={() => openModal('register')}
                className="text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md transition-colors cursor-pointer border-none"
              >
                Get Started
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {React.cloneElement(outlet as React.ReactElement, { key: location.pathname })}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
};
