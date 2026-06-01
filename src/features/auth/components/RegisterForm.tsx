import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';

import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { registerSchema, RegisterCredentials } from '../schemas';
import { authService } from '../services/authService';

export const RegisterForm = () => {
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterCredentials>({
    resolver: zodResolver(registerSchema),
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterCredentials) => authService.register(data),
    onSuccess: () => {
      toast.success('Account created successfully!');
      navigate('/dashboard');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create account.');
    },
  });

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
        <p className="text-sm text-muted-foreground">
          Enter your information to get started
        </p>
      </div>

      <form onSubmit={handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
        <Input
          label="Full Name"
          placeholder="John Doe"
          {...register('name')}
          error={errors.name?.message}
        />

        <Input
          label="Email"
          type="email"
          placeholder="m@example.com"
          {...register('email')}
          error={errors.email?.message}
        />
        
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          {...register('password')}
          error={errors.password?.message}
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />

        <Button type="submit" className="w-full" isLoading={registerMutation.isPending}>
          Create Account
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
};
