const admin = require('firebase-admin');

// Initialize with Tulete's Firebase project
// Note: This requires authentication via GOOGLE_APPLICATION_CREDENTIALS env var
// or application default credentials
try {
  admin.initializeApp({
    projectId: 'fast-tz'
  });
} catch (e) {
  // Already initialized
}

const db = admin.firestore();

const COLLECTIONS_TO_CHECK = [
  'shops',
  'products',
  'branches', 
  'customers',
  'sales',
  'orders',
  'users',
  'user_roles',
  'cloths',
  'foods'
];

async function listCollections() {
  console.log('Connected to Firebase project: fast-tz\n');
  console.log('Checking collections...\n');
  
  for (const colName of COLLECTIONS_TO_CHECK) {
    try {
      const snapshot = await db.collection(colName).limit(1).get();
      if (!snapshot.empty) {
        const count = await db.collection(colName).count().get();
        console.log(`✓ ${colName}: ${count.data().count} documents`);
      }
    } catch (e) {
      // Collection doesn't exist or access denied
    }
  }
}

async function deleteCollection(colName, apply) {
  console.log(`\nProcessing: ${colName}`);
  
  try {
    const snapshot = await db.collection(colName).get();
    console.log(`  Found ${snapshot.size} documents`);
    
    if (snapshot.empty) return 0;
    
    if (!apply) {
      // Show sample
      snapshot.docs.slice(0, 3).forEach(doc => {
        console.log(`    Sample: ${doc.id}`);
      });
      return snapshot.size;
    }
    
    // Delete in batches
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`  ✓ Deleted ${snapshot.size} documents`);
    return snapshot.size;
  } catch (e) {
    console.error(`  Error: ${e.message}`);
    return 0;
  }
}

async function main() {
  const apply = process.argv.includes('--apply');
  const listOnly = process.argv.includes('--list');
  
  console.log('========================================');
  console.log('Firebase Migration Rollback');
  console.log('========================================');
  console.log(`Project: fast-tz (Tulete)`);
  console.log(`Mode: ${listOnly ? 'LIST ONLY' : (apply ? 'DELETE' : 'DRY RUN')}`);
  console.log('========================================\n');
  
  if (listOnly) {
    await listCollections();
    return;
  }
  
  if (apply) {
    console.log('⚠️  WARNING: Will delete data in 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));
  }
  
  let total = 0;
  for (const col of COLLECTIONS_TO_CHECK) {
    const count = await deleteCollection(col, apply);
    total += count;
  }
  
  console.log('\n========================================');
  console.log(`Total: ${total} documents ${apply ? 'deleted' : 'would be deleted'}`);
  console.log('========================================');
}

main().catch(console.error).finally(() => process.exit(0));
