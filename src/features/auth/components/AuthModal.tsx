import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../shared/components/ui/Dialog';
import { useAuthModalStore } from '../store/useAuthModalStore';
import { Sparkles, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import logoImg from '../../../assets/Green Modern Organic Health Food Logo_20260531_122513_0000.png';

export const AuthModal = () => {
  const { isOpen, closeModal, view } = useAuthModalStore();

  const googleMutation = useMutation({
    mutationFn: () => authService.loginWithGoogle(),
    onSuccess: () => {
      toast.success('Signed in successfully!');
      closeModal();
    },
    onError: (error: Error) => {
      console.error(error);
      toast.error(error.message || 'Google sign in failed.');
    },
  });

  const isLogin = view === 'login';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="max-w-[400px] p-0 overflow-hidden bg-white dark:bg-slate-950 border-white/20 dark:border-white/10 shadow-2xl rounded-3xl">
        
        {/* Top Banner / Branding */}
        <div className="relative bg-gradient-to-br from-primary to-amber-600 p-8 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-secondary/25 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-28 h-28 bg-secondary/15 blur-2xl rounded-full -translate-x-1/2 translate-y-1/2" />
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src={logoImg} 
                alt="Tulete Logo" 
                className="h-9 w-9 object-contain rounded-xl bg-white p-1 shadow-md"
              />
              <span className="text-2xl font-extrabold tracking-tight text-white">Tulete</span>
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-secondary animate-pulse" />
              <span className="text-[10px] font-black tracking-wider uppercase text-white">Premium</span>
            </div>
          </div>
        </div>

        <DialogHeader className="sr-only">
          <DialogTitle>{isLogin ? 'Sign In' : 'Sign Up'}</DialogTitle>
          <DialogDescription>
            Please sign in with your Google account to proceed.
          </DialogDescription>
        </DialogHeader>

        {/* Body Content */}
        <div className="p-8 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="space-y-6 w-full"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                {isLogin ? 'Welcome Back' : 'Get Started'}
              </h2>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto leading-relaxed">
                Please sign in with Google to proceed.
              </p>
            </div>

            {/* Modern Google Button */}
            <button
              type="button"
              disabled={googleMutation.isPending}
              onClick={() => googleMutation.mutate()}
              className="w-full h-12 flex items-center justify-center gap-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 dark:hover:shadow-none hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none select-none relative overflow-hidden group cursor-pointer"
            >
              {googleMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              <span>
                {googleMutation.isPending ? 'Connecting...' : 'Continue with Google'}
              </span>
            </button>

            <div className="pt-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed">
              Secure &middot; Instant &middot; Organic
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
