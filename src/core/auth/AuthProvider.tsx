import React, { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthStore } from './useAuthStore';
import { useFavoritesStore } from '../../features/favorites/hooks/useFavoritesStore';
import { UserProfile } from '../../features/auth/services/authService';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        useFavoritesStore.getState().initialize(firebaseUser.uid);
        try {
          if (!firebaseUser.email) throw new Error("User email is required");
          const emailKey = firebaseUser.email.toLowerCase();
          const userDoc = await getDoc(doc(db, 'users', emailKey, 'details', emailKey));
          
          if (userDoc.exists()) {
            const profile = userDoc.data();
            setUser({
              id: firebaseUser.uid,
              email: emailKey,
              displayName: profile.name || firebaseUser.displayName || undefined,
              role: profile.role || 'user',
            });
          } else {
            // Fallback if doc doesn't exist yet (e.g. during initial registration)
            setUser({
              id: firebaseUser.uid,
              email: emailKey,
              displayName: firebaseUser.displayName || undefined,
              role: 'user', // Default role
            });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          // Still log them in, but as a basic user
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: 'user',
          });
        }
      } else {
        useFavoritesStore.getState().initialize('guest_user');
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  return <>{children}</>;
};
