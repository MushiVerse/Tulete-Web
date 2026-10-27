import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
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

const listCollections = async () => {
  console.log('Connected to Firebase project:', process.env.VITE_FIREBASE_PROJECT_ID);
  console.log('Listing all collections...\n');
  
  try {
    // Get all root collections
    const collections = await db.listCollections();
    
    for (const col of collections) {
      const snapshot = await getDocs(col);
      console.log(`Collection: ${col.id}`);
      console.log(`  Documents: ${snapshot.size}`);
      
      if (snapshot.size > 0 && snapshot.size <= 5) {
        console.log('  Sample docs:');
        snapshot.docs.slice(0, 3).forEach(doc => {
          console.log(`    - ${doc.id}`);
        });
      }
      console.log('');
    }
    
    console.log(`Total collections: ${collections.length}`);
  } catch (error) {
    console.error('Error listing collections:', error);
  }
};

listCollections();
