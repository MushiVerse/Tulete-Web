import React from 'react';
import { PageWrapper } from '../../shared/components/PageWrapper';
import { LoginForm } from '../../features/auth/components/LoginForm';

export const LoginPage = () => {
  return (
    <PageWrapper className="justify-center">
      <LoginForm />
    </PageWrapper>
  );
};
