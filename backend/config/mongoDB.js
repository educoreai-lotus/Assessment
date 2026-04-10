const mongoose = require('mongoose');
require('dotenv').config();

if (process.env.NODE_ENV === 'test') {
  // In tests, never connect to MongoDB.
  // Export a no-op function to maintain call compatibility.
  module.exports = async () => {};
} else {
  function resolveMongoUri() {
    return process.env.MONGO_DB_URI || process.env.MONGO_URI;
  }

  /** Non-empty MONGO_DB_NAME → mongoose dbName option; otherwise URI / driver default. */
  function resolveMongoDbNameOverride() {
    const raw = process.env.MONGO_DB_NAME;
    const name = raw != null ? String(raw).trim() : '';
    return name ? name : null;
  }

  const connectMongo = async () => {
    try {
      const mongoUri = resolveMongoUri();
      if (!mongoUri) {
        console.warn('⚠️ No MongoDB URI found in MONGO_DB_URI or MONGO_URI');
        return;
      }
      const dbNameOverride = resolveMongoDbNameOverride();
      const connectOpts = dbNameOverride ? { dbName: dbNameOverride } : {};
      await mongoose.connect(mongoUri, connectOpts);

      const actualDb =
        mongoose.connection.db?.databaseName ??
        mongoose.connection.name ??
        'unknown';
      const selectionSource = dbNameOverride
        ? 'MONGO_DB_NAME'
        : 'URI path or driver default';
      console.log(
        `✅ Connected to MongoDB database: ${actualDb} (selected via ${selectionSource})`,
      );
      // Preserve previous high-level message for consistency
      console.log('✅ Connected to MongoDB Atlas');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message);
    }
  };

  module.exports = connectMongo;
}
