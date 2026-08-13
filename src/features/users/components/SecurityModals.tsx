import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../shared/components/ui/Dialog';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { KeyRound, Trash2 } from 'lucide-react';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../../core/firebase/config';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { authService } from '../../auth/services/authService';

// Email regex pattern matching Flutter settingsHome.dart
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const passwordResetSchema = z.object({
  email: z.string()
    .min(1, 'Fill in your email')
    .refine((val) => emailRegex.test(val), { message: 'Invalid Email Format' }),
});

type PasswordResetForm = z.infer<typeof passwordResetSchema>;

export const ChangePasswordModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { user } = useAuthStore();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<PasswordResetForm>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      email: user?.email || auth.currentUser?.email || '',
    }
  });

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccess(false);
      const userEmail = user?.email || auth.currentUser?.email || '';
      setValue('email', userEmail);
    }
  }, [isOpen, user?.email, setValue]);

  const onSubmit = async (data: PasswordResetForm) => {
    setError('');
    setSuccess(false);
    try {
      await authService.resetPassword(data.email);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2500);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send password reset email';
      setError(errorMsg);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Please fill your valid email</DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground mt-1">
            Click &quot;Send&quot; then check your emails for verification
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          {error && <div className="text-[11px] text-rose-500 bg-rose-50 p-2.5 rounded-lg border border-rose-200">{error}</div>}
          {success && (
            <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg font-medium">
              Sent, please check your emails, thanks!
            </div>
          )}
          
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Email Address
            </label>
            <Input 
              type="email" 
              placeholder="Ex example@exmpl.ex" 
              {...register('email')} 
            />
            {errors.email && <p className="text-rose-500 text-[10px] mt-1 font-medium">{errors.email.message}</p>}
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Click &quot;Send&quot; then check your emails for verification
            </p>
          </div>

          <DialogFooter className="mt-6 flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ---- Delete Account Modal ----
export const DeleteAccountModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { logout } = useAuthStore();

  const handleDelete = async () => {
    setError('');
    setIsDeleting(true);
    try {
      if (!auth.currentUser || !auth.currentUser.email) throw new Error('Not authenticated');
      
      // Re-authenticate
      const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Delete user from Firebase Auth (Firestore user record could be deleted via Cloud Function, or here if rules allow)
      await deleteUser(auth.currentUser);
      
      // Sign out from local store
      logout();
      onClose();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete account';
      setError(errorMsg);
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-4">
            <Trash2 className="w-6 h-6 text-rose-600" />
          </div>
          <DialogTitle className="text-center text-rose-600">Delete Account</DialogTitle>
          <DialogDescription className="text-center">
            This action cannot be undone. This will permanently delete your account
            and remove your data from our servers. Please enter your password to confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {error && <div className="text-[11px] text-rose-500 bg-rose-50 p-2 rounded-lg">{error}</div>}
          
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Confirm Password</label>
            <Input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password" 
            />
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isDeleting}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting || !password}>
              {isDeleting ? 'Deleting...' : 'Delete Account Permanently'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
