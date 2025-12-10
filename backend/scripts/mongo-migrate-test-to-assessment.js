/* Migration: copy collections from 'test' DB to 'assessment' DB on the same cluster.
 * - Uses MONGO_URI from environment (.env) which should point to /assessment
 * - Reads from 'test' DB and upserts into 'assessment' DB (idempotent)
 * - Does NOT delete anything; prints instructions for manual cleanup
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Missing MONGO_URI in environment (.env)');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri, {});
  await client.connect();

  const assessmentDb = client.db('assessment');
  const testDb = client.db('test');

  const collectionsToMigrate = [
    'exam_packages',
    'ai_audit_trail',
    'proctoring_events',
    'proctoring_sessions',
    'proctoring_violations',
    'incidents',
  ];

  for (const name of collectionsToMigrate) {
    const existsCursor = testDb.listCollections({ name });
    const exists = await existsCursor.hasNext();
    if (!exists) {
      console.log(`skipped: ${name} (not found in 'test')`);
      continue;
    }

    const src = testDb.collection(name);
    const dst = assessmentDb.collection(name);

    const docs = await src.find({}).toArray();
    if (!docs.length) {
      console.log(`migrated: ${name} (0 docs)`);
      continue;
    }

    // Idempotent upsert on _id
    const ops = docs.map((d) => ({
      replaceOne: {
        filter: { _id: d._id },
        replacement: d,
        upsert: true,
      },
    }));

    const res = await dst.bulkWrite(ops, { ordered: false });
    const upserts = res.upsertedCount || 0;
    const modified = res.modifiedCount || 0;
    console.log(`migrated: ${name} (${docs.length} docs → upserted:${upserts}, modified:${modified})`);
  }

  console.log('Migration finished. To delete test DB, confirm manually.');
  await client.close();
}

run().catch((err) => {
  console.error('Migration error:', err?.message || err);
  process.exit(1);
});


