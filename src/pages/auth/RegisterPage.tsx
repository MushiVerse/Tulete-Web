import React from 'react';
import { PageWrapper } from '../../shared/components/PageWrapper';
import { RegisterForm } from '../../features/auth/components/RegisterForm';

export const RegisterPage = () => {
  return (
    <PageWrapper className="justify-center">
      <RegisterForm />
    </PageWrapper>
  );
};
