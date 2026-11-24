import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read .env file manually
const envPath = resolve(process.cwd(), '.env');
const envContent = readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// The Firebase Client SDK does not support db.listCollections() (Admin SDK only),
// so inspect the known root collections directly.
const KNOWN_COLLECTIONS = [
  'foods',
  'products',
  'cloths',
  'foodStores',
  'brands',
  'Categories',
  'ecommerceCategory',
  'ecommerceSubCategory',
  'foodCategory',
  'foodSubCategory',
  'foodSubSubCategory',
  'orders',
  'users',
  'userViewed',
  'userfavorites',
  'analytics_searches',
];

const listCollections = async () => {
  console.log('Connected to Firebase project:', env.VITE_FIREBASE_PROJECT_ID);
  console.log('Inspecting Firestore collections...\n');

  let foundCount = 0;

  try {
    for (const colName of KNOWN_COLLECTIONS) {
      try {
        const snapshot = await getDocs(collection(db, colName));
        if (snapshot.size > 0) {
          foundCount++;
        }
        console.log(`Collection: ${colName}`);
        console.log(`  Documents: ${snapshot.size}`);

        if (snapshot.size > 0) {
          console.log('  Sample docs:');
          snapshot.docs.slice(0, 3).forEach(docSnap => {
            console.log(`    - ${docSnap.id}`);
          });
        }
        console.log('');
      } catch (colErr: any) {
        console.warn(`  [Skipped ${colName}]: ${colErr?.message || colErr}`);
      }
    }

    console.log(`Checked ${KNOWN_COLLECTIONS.length} collections (${foundCount} non-empty).`);
  } catch (error) {
    console.error('Error inspecting collections:', error);
  }
};

listCollections();
