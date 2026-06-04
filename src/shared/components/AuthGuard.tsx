import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../core/auth/useAuthStore';
import { useAuthModalStore } from '../../features/auth/store/useAuthModalStore';
import { FullPageLoader } from './LoadingScreen';
import { Button } from './ui/Button';
import { PageContainer, ContentContainer } from './layout';
import { Lock } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: Array<'user' | 'provider' | 'admin'>;
}

export const AuthGuard = ({ children, allowedRoles }: AuthGuardProps) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const { openModal } = useAuthModalStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // If not authenticated and we finished loading, pop open the modern modal!
    if (!isLoading && !isAuthenticated) {
      openModal('login');
    }
  }, [isLoading, isAuthenticated, openModal]);

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    // Render a beautiful modern empty state while the modal is open over it
    return (
      <PageContainer>
        <ContentContainer size="md" className="flex flex-col items-center justify-center min-h-[70vh] text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Authentication Required</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
            You must be signed in to access this page. Please sign in or create an account to continue.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => navigate(-1)} variant="outline">
              Go Back
            </Button>
            <Button onClick={() => openModal('login')}>
              Sign In Now
            </Button>
          </div>
        </ContentContainer>
      </PageContainer>
    );
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Role not authorized, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
