import React, { useState } from 'react';
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
import { ShieldAlert, KeyRound, Trash2 } from 'lucide-react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from 'firebase/auth';
import { auth } from '../../../core/firebase/config';
import { useAuthStore } from '../../../core/auth/useAuthStore';

// ---- Change Password Modal ----
const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Required'),
  newPassword: z.string().min(6, 'Must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordForm = z.infer<typeof passwordSchema>;

export const ChangePasswordModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema)
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const onSubmit = async (data: PasswordForm) => {
    setError('');
    setSuccess(false);
    try {
      if (!auth.currentUser || !auth.currentUser.email) throw new Error('Not authenticated');
      
      // Re-authenticate
      const credential = EmailAuthProvider.credential(auth.currentUser.email, data.currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Update password
      await updatePassword(auth.currentUser, data.newPassword);
      
      setSuccess(true);
      reset();
      setTimeout(onClose, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Change Password</DialogTitle>
          <DialogDescription className="text-center">
            Enter your current password and a new one to update your security credentials.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          {error && <div className="text-[11px] text-rose-500 bg-rose-50 p-2 rounded-lg">{error}</div>}
          {success && <div className="text-[11px] text-emerald-500 bg-emerald-50 p-2 rounded-lg">Password updated successfully!</div>}
          
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Current Password</label>
            <Input type="password" {...register('currentPassword')} />
            {errors.currentPassword && <p className="text-rose-500 text-[10px] mt-1">{errors.currentPassword.message}</p>}
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">New Password</label>
            <Input type="password" {...register('newPassword')} />
            {errors.newPassword && <p className="text-rose-500 text-[10px] mt-1">{errors.newPassword.message}</p>}
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Confirm New Password</label>
            <Input type="password" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-rose-500 text-[10px] mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Password'}
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
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
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
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Confirm Password</label>
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
