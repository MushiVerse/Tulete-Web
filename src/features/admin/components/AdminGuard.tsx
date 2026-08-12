import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../../../core/firebase/config';
import { checkAdminPrivilege, AdminUser, adminAuthService } from '../services/adminAuthService';
import { Loader2, ShieldAlert, LogOut, ArrowLeft } from 'lucide-react';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { useNavigate } from 'react-router-dom';

interface AdminGuardProps {
  children: React.ReactNode;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDenied, setIsDenied] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (!user) {
        setAdminUser(null);
        setIsDenied(false);
        setLoading(false);
        return;
      }

      try {
        const res = await checkAdminPrivilege(user);
        if (res.isAdmin && res.adminData) {
          setAdminUser(res.adminData);
          setIsDenied(false);
        } else {
          setAdminUser(null);
          setIsDenied(true);
        }
      } catch (e) {
        setAdminUser(null);
        setIsDenied(true);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm font-extrabold text-slate-400 tracking-wide uppercase">
          Verifying Admin Credentials in UsersandRoles...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <AdminLoginPage />;
  }

  if (isDenied || !adminUser) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Access Restricted</h2>
            <p className="text-sm text-slate-400 mt-2 font-medium">
              Signed in as <span className="text-white font-bold">{currentUser.email}</span>, but this account is not registered with <span className="text-rose-400 font-bold font-mono">role: "Admin"</span> in the <span className="text-slate-300 font-mono">UsersandRoles</span> Firestore collection.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex-1 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Web App
            </button>
            <button
              onClick={async () => {
                await adminAuthService.logoutAdmin();
              }}
              className="flex-1 h-11 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-extrabold flex items-center justify-center gap-2 transition-all border border-rose-500/30 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
