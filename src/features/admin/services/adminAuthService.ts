import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../core/firebase/config';
import { signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';

export interface AdminUser {
  uid: string;
  email: string;
  role: string;
  displayName?: string;
  store?: string;
}

/**
 * Checks whether a given user has the "Admin" role in the 'UsersandRoles' collection.
 */
export async function checkAdminPrivilege(user: FirebaseUser | null): Promise<{ isAdmin: boolean; adminData?: AdminUser }> {
  if (!user || !user.email) {
    return { isAdmin: false };
  }

  const cleanEmail = user.email.trim().toLowerCase();

  try {
    const usersAndRolesRef = collection(db, 'UsersandRoles');
    
    // 1. Query by email field
    const emailQuery = query(usersAndRolesRef, where('email', '==', cleanEmail));
    const snap = await getDocs(emailQuery);

    if (!snap.empty) {
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const role = String(data.role || data.Role || '').trim().toLowerCase();
        if (role === 'admin') {
          return {
            isAdmin: true,
            adminData: {
              uid: user.uid,
              email: cleanEmail,
              role: data.role || data.Role || 'Admin',
              displayName: user.displayName || data.name || cleanEmail,
              store: data.store || undefined,
            },
          };
        }
      }
    }

    // 2. Query by uid field
    const uidQuery = query(usersAndRolesRef, where('uid', '==', user.uid));
    const uidSnap = await getDocs(uidQuery);
    if (!uidSnap.empty) {
      for (const docSnap of uidSnap.docs) {
        const data = docSnap.data();
        const role = String(data.role || data.Role || '').trim().toLowerCase();
        if (role === 'admin') {
          return {
            isAdmin: true,
            adminData: {
              uid: user.uid,
              email: cleanEmail,
              role: data.role || data.Role || 'Admin',
              displayName: user.displayName || data.name || cleanEmail,
              store: data.store || undefined,
            },
          };
        }
      }
    }

    // 3. Direct document lookup by uid
    const directUidRef = doc(db, 'UsersandRoles', user.uid);
    const directUidSnap = await getDoc(directUidRef);
    if (directUidSnap.exists()) {
      const data = directUidSnap.data();
      const role = String(data.role || data.Role || '').trim().toLowerCase();
      if (role === 'admin') {
        return {
          isAdmin: true,
          adminData: {
            uid: user.uid,
            email: cleanEmail,
            role: data.role || data.Role || 'Admin',
            displayName: user.displayName || data.name || cleanEmail,
            store: data.store || undefined,
          },
        };
      }
    }

    // 4. Direct document lookup by email
    const directEmailRef = doc(db, 'UsersandRoles', cleanEmail);
    const directEmailSnap = await getDoc(directEmailRef);
    if (directEmailSnap.exists()) {
      const data = directEmailSnap.data();
      const role = String(data.role || data.Role || '').trim().toLowerCase();
      if (role === 'admin') {
        return {
          isAdmin: true,
          adminData: {
            uid: user.uid,
            email: cleanEmail,
            role: data.role || data.Role || 'Admin',
            displayName: user.displayName || data.name || cleanEmail,
            store: data.store || undefined,
          },
        };
      }
    }

    return { isAdmin: false };
  } catch (err) {
    console.error('Error verifying admin privileges from UsersandRoles:', err);
    return { isAdmin: false };
  }
}

export const adminAuthService = {
  checkAdminPrivilege,
  async loginAdmin(email: string, pass: string): Promise<AdminUser> {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const verification = await checkAdminPrivilege(userCredential.user);
    if (!verification.isAdmin || !verification.adminData) {
      await signOut(auth);
      throw new Error('Access Denied: Your account does not have Admin privileges in UsersandRoles.');
    }
    return verification.adminData;
  },
  async logoutAdmin(): Promise<void> {
    await signOut(auth);
  }
};
