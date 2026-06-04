import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer, ContentContainer } from '../shared/components/layout';
import { Button } from '../shared/components/ui/Button';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <ContentContainer size="md" className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <h1 className="text-8xl font-extrabold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Page Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
          Oops! The page you are looking for doesn't exist or has been moved.
        </p>
        <Button onClick={() => navigate('/discover')} size="lg">
          Return to Discovery
        </Button>
      </ContentContainer>
    </PageContainer>
  );
};
