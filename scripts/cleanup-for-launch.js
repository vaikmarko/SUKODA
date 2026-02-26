/**
 * SUKODA — Database Cleanup Script for Production Launch
 * 
 * This script removes all test data from Firestore:
 * - Test orders (pending + test payments)
 * - Test bookings
 * - Test mail queue entries
 * - Test followups
 * - Test referrals
 * - Test waitlist entries
 * 
 * USAGE:
 *   node scripts/cleanup-for-launch.js
 * 
 * REQUIREMENTS:
 *   - GOOGLE_APPLICATION_CREDENTIALS env variable pointing to service account key
 *   - Or run from Firebase emulator with FIRESTORE_EMULATOR_HOST
 *   - Or use: firebase use sukoda-77b52 && node scripts/cleanup-for-launch.js
 * 
 * ⚠️  THIS WILL DELETE ALL DATA. Run only once before going live.
 */

const admin = require('firebase-admin');

// Initialize with project ID
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || 'sukoda-77b52',
  });
}
const db = admin.firestore();

const DRY_RUN = process.argv.includes('--dry-run');

async function deleteCollection(collectionPath, batchSize = 100) {
  let totalDeleted = 0;
  let query = db.collection(collectionPath).limit(batchSize);

  while (true) {
    const snapshot = await query.get();
    if (snapshot.empty) break;

    // Also delete subcollections for orders
    if (collectionPath === 'orders') {
      for (const doc of snapshot.docs) {
        const paymentsSnap = await doc.ref.collection('payments').get();
        if (!paymentsSnap.empty) {
          const paymentBatch = db.batch();
          paymentsSnap.docs.forEach(p => paymentBatch.delete(p.ref));
          if (!DRY_RUN) await paymentBatch.commit();
          console.log(`  Deleted ${paymentsSnap.size} payment records from order ${doc.id}`);
        }
      }
    }

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would delete ${snapshot.size} documents from ${collectionPath}`);
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const info = collectionPath === 'orders'
          ? `${data.type}/${data.package}/${data.status} - ${data.customer?.email || 'no email'}`
          : collectionPath === 'bookings'
            ? `${data.status} - ${data.customerEmail || 'no email'} @ ${data.scheduledAt?.toDate?.()}`
            : doc.id;
        console.log(`    - ${doc.id}: ${info}`);
      }
      totalDeleted += snapshot.size;
      break; // Only show first batch in dry run
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    totalDeleted += snapshot.size;
    console.log(`  Deleted batch of ${snapshot.size} from ${collectionPath}`);
  }

  return totalDeleted;
}

async function main() {
  console.log('');
  console.log('='.repeat(60));
  console.log('  SUKODA — Database Cleanup for Production Launch');
  console.log('='.repeat(60));
  console.log('');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE — no data will be deleted\n');
  } else {
    console.log('⚠️  LIVE MODE — data WILL be permanently deleted!\n');
  }

  const collections = [
    'orders',
    'bookings',
    'mail',
    'followups',
    'referrals',
    'waitlist',
  ];

  const results = {};

  for (const collection of collections) {
    console.log(`\n📦 Cleaning: ${collection}`);
    try {
      const count = await deleteCollection(collection);
      results[collection] = count;
      console.log(`  ✅ ${collection}: ${count} documents ${DRY_RUN ? 'found' : 'deleted'}`);
    } catch (err) {
      console.error(`  ❌ Error cleaning ${collection}:`, err.message);
      results[collection] = 'error';
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('  Summary');
  console.log('='.repeat(60));
  for (const [col, count] of Object.entries(results)) {
    console.log(`  ${col}: ${count === 'error' ? '❌ error' : count + (DRY_RUN ? ' found' : ' deleted')}`);
  }
  console.log('');

  if (DRY_RUN) {
    console.log('👆 This was a dry run. To actually delete, run without --dry-run');
  } else {
    console.log('✅ Database is clean and ready for production!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Verify Firebase config has live Stripe keys (sk_live_...)');
    console.log('  2. Verify Stripe webhook uses live endpoint + secret');
    console.log('  3. Verify Resend API key is production');
    console.log('  4. Verify Cal.com API key is production');
    console.log('  5. Deploy: firebase deploy');
    console.log('  6. Test one small order to confirm everything works');
  }
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
