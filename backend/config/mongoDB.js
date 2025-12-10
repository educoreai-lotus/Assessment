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

  const connectMongo = async () => {
    try {
      const mongoUri = resolveMongoUri();
      if (!mongoUri) {
        console.warn('⚠️ No MongoDB URI found in MONGO_DB_URI or MONGO_URI');
        return;
      }
      await mongoose.connect(mongoUri, { dbName: 'assessment' });
      console.log('✅ Connected to MongoDB database: assessment');
      // Preserve previous high-level message for consistency
      console.log('✅ Connected to MongoDB Atlas');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message);
    }
  };

  module.exports = connectMongo;
}


