import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { LogIn, ArrowRight, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { loginSchema, LoginCredentials } from '../schemas';
import { authService } from '../services/authService';
import { useAuthModalStore } from '../store/useAuthModalStore';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export const LoginForm = () => {
  const navigate = useNavigate();
  const { setView, closeModal } = useAuthModalStore();
  const [showPassword, setShowPassword] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginCredentials) => authService.login(data),
    onSuccess: () => {
      toast.success('Welcome back!');
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to sign in. Please check your credentials.');
    },
  });

  const googleMutation = useMutation({
    mutationFn: () => authService.loginWithGoogle(),
    onSuccess: () => {
      toast.success('Signed in with Google!');
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Google sign in failed.');
    },
  });

  return (
    <motion.div 
      className="w-full"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} className="space-y-2 mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground font-medium">
          Enter your credentials to access your account.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit((data) => loginMutation.mutate(data))} className="space-y-5">
        <motion.div variants={itemVariants}>
          <Input
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            icon={<Mail className="w-5 h-5" />}
            {...register('email')}
            error={errors.email?.message}
            className="bg-muted/50"
          />
        </motion.div>
        
        <motion.div variants={itemVariants} className="space-y-1">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            icon={<Lock className="w-5 h-5" />}
            rightElement={
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 hover:bg-muted rounded-md transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            {...register('password')}
            error={errors.password?.message}
            className="bg-muted/50"
          />
          <div className="text-right mt-1.5">
            <button 
              type="button"
              onClick={() => setView('forgot-password')}
              className="text-xs font-bold text-primary hover:text-primary/80 transition-colors bg-transparent border-none p-0 cursor-pointer"
            >
              Forgot password?
            </button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="pt-2">
          <Button 
            type="submit" 
            className="w-full h-12 text-sm font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all group rounded-xl" 
            isLoading={loginMutation.isPending}
          >
            Sign In
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>
      </form>

      <motion.div variants={itemVariants} className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-slate-400 font-bold tracking-widest">Or continue with</span>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Button 
          variant="outline" 
          type="button" 
          className="w-full h-12 bg-card border-border hover:bg-muted font-bold text-foreground shadow-sm" 
          onClick={() => googleMutation.mutate()}
          isLoading={googleMutation.isPending}
        >
          <svg className="mr-3 w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </Button>
      </motion.div>

      <motion.div variants={itemVariants} className="mt-8 text-center text-sm font-medium text-muted-foreground">
        Don't have an account?{' '}
        <button 
          type="button"
          onClick={() => setView('register')}
          className="font-bold text-primary hover:text-indigo-600 transition-colors bg-transparent border-none p-0 cursor-pointer"
        >
          Create an account
        </button>
      </motion.div>
    </motion.div>
  );
};
