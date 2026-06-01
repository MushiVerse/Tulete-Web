import React, { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthStore } from './useAuthStore';
import { UserProfile } from '../../features/auth/services/authService';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch user role from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const profile = userDoc.data() as UserProfile;
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: profile.displayName || firebaseUser.displayName || undefined,
              role: profile.role,
            });
          } else {
            // Fallback if doc doesn't exist yet (e.g. during initial registration)
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
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
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  return <>{children}</>;
};
