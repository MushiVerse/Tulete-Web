import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { forgotPasswordSchema, ForgotPasswordCredentials } from '../schemas';
import { authService } from '../services/authService';

export const ForgotPasswordForm = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordCredentials>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const resetMutation = useMutation({
    mutationFn: (data: ForgotPasswordCredentials) => authService.resetPassword(data.email),
    onSuccess: () => {
      setIsSubmitted(true);
      toast.success('Password reset email sent!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send reset email.');
    },
  });

  if (isSubmitted) {
    return (
      <div className="w-full space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We have sent a password reset link to your email address.
          </p>
        </div>
        <Link to="/login">
          <Button variant="outline" className="w-full mt-4">
            <ArrowLeft className="mr-2 size-4" /> Back to login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Forgot password?</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we'll send you a reset link
        </p>
      </div>

      <form onSubmit={handleSubmit((data) => resetMutation.mutate(data))} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="m@example.com"
          {...register('email')}
          error={errors.email?.message}
        />

        <Button type="submit" className="w-full" isLoading={resetMutation.isPending}>
          Send Reset Link
        </Button>
      </form>

      <div className="text-center">
        <Link to="/login" className="text-sm font-medium flex items-center justify-center text-primary hover:underline">
          <ArrowLeft className="mr-2 size-4" /> Back to login
        </Link>
      </div>
    </div>
  );
};
