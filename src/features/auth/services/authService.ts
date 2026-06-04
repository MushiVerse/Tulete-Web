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
    if (!user.email) throw new Error("User email is required");
    const emailKey = user.email.toLowerCase();
    const userRef = doc(db, 'users', emailKey, 'details', emailKey);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Create new profile document matching Flutter fields
      const newProfile = {
        name: name || user.displayName || 'Fill your name here!',
        phone: 'null',
        tokenId: 'null',
        uid: user.uid,
        email: emailKey,
        password: "can't display password",
        location: 'null',
        imgURL: user.photoURL || 'null',
        signedUpOn: new Date().toISOString()
      };
      await setDoc(userRef, newProfile);
      
      // Also write version control and token details like Flutter
      await setDoc(doc(db, 'tokenidswithemails', emailKey), {
        tokenId: 'null',
        email: emailKey,
        password: "can't display password",
        time: new Date().toISOString()
      });

      await setDoc(doc(db, 'versioncontrol', emailKey), {
        uid: user.uid,
        email: emailKey,
        updated: 'true'
      });

      return {
        id: user.uid,
        email: emailKey,
        displayName: newProfile.name,
        role,
        createdAt: newProfile.signedUpOn,
      };
    }

    const data = userSnap.data();
    return {
      id: user.uid,
      email: emailKey,
      displayName: data?.name || user.displayName || '',
      role,
      createdAt: data?.signedUpOn || '',
    };
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
