import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../shared/components/ui/Dialog';
import { useAuthModalStore } from '../store/useAuthModalStore';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export const AuthModal = () => {
  const { isOpen, view, closeModal } = useAuthModalStore();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="max-w-[450px] p-0 overflow-hidden bg-white dark:bg-slate-950 border-white/20 dark:border-white/10 shadow-2xl rounded-3xl">
        
        {/* Modal Header / Branding Area */}
        <div className="relative bg-primary p-6 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/20 blur-2xl rounded-full -translate-x-1/2 translate-y-1/2" />
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shadow-lg shadow-secondary/20">
                <span className="text-primary font-black text-lg">T</span>
              </div>
              <span className="text-xl font-black tracking-tight">Tulete</span>
            </div>
            
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/20">
              <Sparkles className="w-3 h-3 text-secondary" />
              <span className="text-[10px] font-bold text-white tracking-wider uppercase">Premium</span>
            </div>
          </div>
        </div>

        {/* Accessibility Requirements for Dialog */}
        <DialogHeader className="sr-only">
          <DialogTitle>Authentication</DialogTitle>
          <DialogDescription>
            Login or create a Tulete account to access premium services.
          </DialogDescription>
        </DialogHeader>

        {/* Dynamic Form Content */}
        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {view === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <LoginForm />
              </motion.div>
            )}
            {view === 'register' && (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <RegisterForm />
              </motion.div>
            )}
            {view === 'forgot-password' && (
              <motion.div
                key="forgot-password"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <ForgotPasswordForm />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};
