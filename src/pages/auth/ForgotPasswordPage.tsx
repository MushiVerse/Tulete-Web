import React from 'react';
import { PageWrapper } from '../../shared/components/PageWrapper';
import { ForgotPasswordForm } from '../../features/auth/components/ForgotPasswordForm';

export const ForgotPasswordPage = () => {
  return (
    <PageWrapper className="justify-center">
      <ForgotPasswordForm />
    </PageWrapper>
  );
};
