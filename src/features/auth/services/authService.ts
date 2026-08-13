import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../../../core/firebase/config';
import { LoginCredentials, RegisterCredentials } from '../schemas';
import { locationService } from '../../location/services/locationService';

// User role definition
export type UserRole = 'user' | 'provider' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  createdAt: any;
  avatarUrl?: string;
  phone?: string;
  city?: string;
  bio?: string;
  country?: string;
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

    const googlePhoto = user.photoURL || null;

    if (!userSnap.exists()) {
      // Detect user country & city dynamically via IP Geolocation
      let detectedCountry = 'Tanzania';
      let detectedCity = 'null';
      try {
        const geo = await locationService.detectCountryAndCity();
        if (geo.country) detectedCountry = geo.country;
        if (geo.city && geo.city !== 'null') detectedCity = geo.city;
      } catch (e) {
        console.warn('Country/city geolocation detection failed, using fallback:', e);
      }

      // Create new profile document matching Flutter fields
      const newProfile = {
        name: name || user.displayName || 'Fill your name here!',
        phone: 'null',
        tokenId: 'null',
        uid: user.uid,
        email: emailKey,
        password: "can't display password",
        location: 'null',
        image: googlePhoto || 'null',
        imgURL: 'null',
        signedUpOn: new Date().toISOString(),
        city: detectedCity,
        bio: 'null',
        country: detectedCountry
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
        avatarUrl: googlePhoto || undefined,
        city: detectedCity !== 'null' ? detectedCity : undefined,
        country: detectedCountry,
      };
    }

    const data = userSnap.data();

    // If existing document missing image or image is 'null', and user has a Google photoURL, update the "image" field!
    if (googlePhoto && (!data?.image || data.image === 'null' || data.image === '')) {
      await updateDoc(userRef, { image: googlePhoto });
    }

    // If existing document missing country or city (or marked as 'null'), detect and update dynamically!
    if (!data?.country || data.country === 'null' || !data?.city || data.city === 'null') {
      try {
        const geo = await locationService.detectCountryAndCity();
        const updatesToSave: any = {};
        if ((!data?.country || data.country === 'null') && geo.country) {
          updatesToSave.country = geo.country;
          data.country = geo.country;
        }
        if ((!data?.city || data.city === 'null') && geo.city && geo.city !== 'null') {
          updatesToSave.city = geo.city;
          data.city = geo.city;
        }
        if (Object.keys(updatesToSave).length > 0) {
          await updateDoc(userRef, updatesToSave);
        }
      } catch (e) {
        console.warn('Failed to detect/update missing location/country:', e);
      }
    }

    const avatar = data?.image && data.image !== 'null' && data.image !== '' ? data.image : (googlePhoto || undefined);

    return {
      id: user.uid,
      email: emailKey,
      displayName: data?.name || user.displayName || '',
      role,
      createdAt: data?.signedUpOn || '',
      avatarUrl: avatar,
      phone: data?.phone && data.phone !== 'null' ? data.phone : undefined,
      city: data?.city && data.city !== 'null' ? data.city : undefined,
      bio: data?.bio && data.bio !== 'null' ? data.bio : undefined,
      country: data?.country && data.country !== 'null' ? data.country : undefined,
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
