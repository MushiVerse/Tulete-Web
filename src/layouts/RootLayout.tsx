import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AuthModal } from '../features/auth/components/AuthModal';
import { useAuthModalStore } from '../features/auth/store/useAuthModalStore';
import { OfflineBanner } from '../shared/components/OfflineBanner';

export const RootLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const openModal = useAuthModalStore((state) => state.openModal);

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
    <>
      <OfflineBanner />
      <Outlet />
      <AuthModal />
    </>
  );
};
