import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../../../core/firebase/config';
import { LoginCredentials, RegisterCredentials } from '../schemas';

// User role definition
export type UserRole = 'user' | 'provider' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  createdAt: any;
}

export const authService = {
  /**
   * Helper to fetch or create a user profile in Firestore
   */
  async syncUserProfile(user: FirebaseUser, role: UserRole = 'user', name?: string): Promise<UserProfile> {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Create new profile document
      const newProfile: UserProfile = {
        id: user.uid,
        email: user.email || '',
        displayName: name || user.displayName || '',
        role,
        createdAt: serverTimestamp(),
      };
      await setDoc(userRef, newProfile);
      return newProfile;
    }

    return userSnap.data() as UserProfile;
  },

  /**
   * Sign in with Email and Password
   */
  async login(credentials: LoginCredentials) {
    const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
    // Profile is fetched in the auth listener, but we can fetch it here if needed immediately
    return userCredential.user;
  },

  /**
   * Register with Email and Password
   */
  async register(credentials: RegisterCredentials) {
    const userCredential = await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
    
    // Update Firebase Auth Profile
    await updateProfile(userCredential.user, { displayName: credentials.name });
    
    // Create Firestore Document
    await this.syncUserProfile(userCredential.user, 'user', credentials.name);
    
    return userCredential.user;
  },

  /**
   * Sign in with Google
   */
  async loginWithGoogle() {
    const userCredential = await signInWithPopup(auth, googleProvider);
    // Sync profile (creates document if it doesn't exist)
    await this.syncUserProfile(userCredential.user);
    return userCredential.user;
  },

  /**
   * Send Password Reset Email
   */
  async resetPassword(email: string) {
    return sendPasswordResetEmail(auth, email);
  },

  /**
   * Sign Out
   */
  async logout() {
    return signOut(auth);
  }
};
