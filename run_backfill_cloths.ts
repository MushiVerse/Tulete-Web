import { algoliasearch } from 'algoliasearch';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const APP_ID = process.env.VITE_ALGOLIA_APP_ID || 'IU2RKVQF8F';
const WRITE_KEY = '5d512830694f945096cb870d6daf8854';
const adminClient = algoliasearch(APP_ID, WRITE_KEY);

const backfill = async () => {
  console.log('Starting Algolia Backfill...');
  
  try {
    const collectionsToSync = [
      { name: 'cloths', type: 'cloth' }
    ];

    let totalSynced = 0;

    for (const col of collectionsToSync) {
      console.log(`Fetching collection: ${col.name}...`);
      const snapshot = await getDocs(collection(db, col.name));
      
      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        let _geoloc;
        if (data.location && typeof data.location === 'string') {
          const [lat, lng] = data.location.split(',');
          if (lat && lng) {
            _geoloc = { lat: parseFloat(lat), lng: parseFloat(lng) };
          }
        }
        return {
          objectID: doc.id,
          recordType: col.type,
          ...data,
          ...( _geoloc && { _geoloc })
        };
      });

      if (records.length > 0) {
        console.log(`Pushing ${records.length} records to Algolia for ${col.name}...`);
        await adminClient.saveObjects({ indexName: 'tulete_items', objects: records as any });
        totalSynced += records.length;
      }
    }

    console.log(`Backfill Complete! Synced ${totalSynced} records to Algolia.`);
  } catch (error) {
    console.error('Backfill failed:', error);
  }
};

backfill();
