import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read .env file
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

// Collections that were likely migrated from biashara-connect
const COLLECTIONS_TO_DELETE = [
  'shops',
  'products', 
  'branches',
  'customers',
  'sales',
  'orders',
  'users',
  'user_roles'
];

const deleteCollection = async (collectionPath: string, apply: boolean) => {
  console.log(`\nProcessing collection: ${collectionPath}`);
  
  try {
    const colRef = collection(db, collectionPath);
    const snapshot = await getDocs(colRef);
    
    console.log(`  Found ${snapshot.size} documents`);
    
    if (snapshot.size === 0) {
      return 0;
    }
    
    if (!apply) {
      // Dry run - just show sample docs
      if (snapshot.size <= 5) {
        snapshot.docs.forEach(doc => {
          console.log(`    Would delete: ${doc.id}`);
        });
      } else {
        console.log(`    Sample docs (first 3):`);
        snapshot.docs.slice(0, 3).forEach(doc => {
          console.log(`      - ${doc.id}`);
        });
      }
      return snapshot.size;
    }
    
    // Actually delete in batches of 500
    let deleted = 0;
    const docs = snapshot.docs;
    
    for (let i = 0; i < docs.length; i += 500) {
      const batch = writeBatch(db);
      const batchDocs = docs.slice(i, i + 500);
      
      batchDocs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      deleted += batchDocs.length;
      console.log(`  Deleted batch: ${deleted}/${docs.length}`);
    }
    
    return deleted;
  } catch (error: any) {
    console.error(`  Error processing ${collectionPath}:`, error.message);
    return 0;
  }
};

const main = async () => {
  const apply = process.argv.includes('--apply');
  
  console.log('===========================================');
  console.log('Firebase Migration Rollback Script');
  console.log('===========================================');
  console.log(`Project: ${env.VITE_FIREBASE_PROJECT_ID}`);
  console.log(`Mode: ${apply ? 'APPLY (will delete data)' : 'DRY RUN (safe)'}`);
  console.log('===========================================');
  
  if (apply) {
    console.log('\n⚠️  WARNING: This will permanently delete data!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  let totalDeleted = 0;
  
  for (const col of COLLECTIONS_TO_DELETE) {
    const count = await deleteCollection(col, apply);
    totalDeleted += count;
  }
  
  console.log('\n===========================================');
  console.log(`Summary: ${totalDeleted} documents ${apply ? 'deleted' : 'would be deleted'}`);
  console.log('===========================================');
};

main().catch(console.error);
