/* Schema-only Mongo clone for Assessment service.
 * - Loads MONGO_URI from .env
 * - Ensures required collections exist in database "assessment"
 * - Creates missing collections; logs status; no documents inserted
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Missing MONGO_URI in environment (.env)');
    process.exit(1);
  }

  // Connect and select the "assessment" database
  await mongoose.connect(mongoUri, { dbName: 'assessment' });
  const client = mongoose.connection.getClient();
  const db = client.db('assessment');

  const requiredCollections = [
    'exam_packages',
    'aiAuditTrail',
    'proctoring_events',
    'incidents',
  ];

  const existing = (await db.listCollections().toArray()).map((c) => c.name);

  for (const name of requiredCollections) {
    if (existing.includes(name)) {
      console.log(`Already exists: ${name}`);
    } else {
      await db.createCollection(name);
      console.log(`Created collection: ${name}`);
    }
  }

  console.log('Mongo schema clone completed.');
}

main()
  .catch((err) => {
    console.error('Mongo clone error:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {}
  });


