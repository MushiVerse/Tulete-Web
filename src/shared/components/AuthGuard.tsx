import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../core/auth/useAuthStore';
import { FullPageLoader } from './LoadingScreen';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: Array<'user' | 'provider' | 'admin'>;
}

export const AuthGuard = ({ children, allowedRoles }: AuthGuardProps) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    // Redirect to login and save the attempted url
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Role not authorized, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
