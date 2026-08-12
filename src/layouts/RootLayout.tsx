import React, { useEffect, useLayoutEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AuthModal } from '../features/auth/components/AuthModal';
import { useAuthModalStore } from '../features/auth/store/useAuthModalStore';
import { useCurrencyLanguageStore } from '../core/config/currencyStore';

export const RootLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const openModal = useAuthModalStore((state) => state.openModal);
  
  // Subscribe to currency/language state to trigger instant real-time price re-renders across all views
  const currentLanguage = useCurrencyLanguageStore((state) => state.currentLanguage);

  // Disable automatic browser scroll restoration so every page starts at top
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Synchronously reset scroll position to top before browser paint (0ms latency, zero DOM thrashing)
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === '/login') {
      openModal('login');
      navigate('/', { replace: true });
    } else if (location.pathname === '/register') {
      openModal('register');
      navigate('/', { replace: true });
    }
  }, [location.pathname, openModal, navigate]);

  return (
    <div key={currentLanguage.code} className="w-full min-h-screen">
      <Outlet />
      <AuthModal />
    </div>
  );
};
