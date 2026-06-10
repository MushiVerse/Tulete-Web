import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Send } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { forgotPasswordSchema, ForgotPasswordCredentials } from '../schemas';
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

export const ForgotPasswordForm = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { setView } = useAuthModalStore();

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
      <motion.div 
        className="w-full text-center"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants} className="space-y-4 mb-8">
          <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-secondary" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Check your email</h1>
          <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto">
            We have sent a password reset link to your email address. Please follow the instructions to reset your password.
          </p>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <Button 
            variant="outline" 
            onClick={() => setView('login')}
            className="w-full h-12 text-sm font-bold bg-card border-border text-foreground"
          >
            <ArrowLeft className="mr-2 w-4 h-4" /> Back to login
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="w-full"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} className="space-y-2 mb-8 text-center sm:text-left">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Forgot password?</h1>
        <p className="text-sm text-muted-foreground font-medium">
          Enter your email and we'll send you a reset link
        </p>
      </motion.div>

      <form onSubmit={handleSubmit((data) => resetMutation.mutate(data))} className="space-y-5">
        <motion.div variants={itemVariants}>
          <Input
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            {...register('email')}
            error={errors.email?.message}
            className="h-11 bg-muted border-border"
          />
        </motion.div>

        <motion.div variants={itemVariants} className="pt-2">
          <Button 
            type="submit" 
            className="w-full h-12 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all group" 
            isLoading={resetMutation.isPending}
          >
            Send Reset Link
            <Send className="ml-2 w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </Button>
        </motion.div>
      </form>

      <motion.div variants={itemVariants} className="mt-8 text-center text-sm font-medium">
        <button 
          type="button"
          onClick={() => setView('login')}
          className="inline-flex items-center text-muted-foreground hover:text-slate-700 dark:hover:text-slate-300 font-bold transition-colors bg-transparent border-none p-0 cursor-pointer"
        >
          <ArrowLeft className="mr-2 w-4 h-4" /> Back to login
        </button>
      </motion.div>
    </motion.div>
  );
};
