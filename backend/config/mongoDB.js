const mongoose = require('mongoose');
require('dotenv').config();

function resolveMongoUri() {
  return process.env.MONGO_DB_URI || process.env.MONGO_URI;
}

const connectMongo = async () => {
  try {
    const mongoUri = resolveMongoUri();
    // In test mode, skip only if there is no Mongo URI provided.
    if (process.env.NODE_ENV === 'test' && !process.env.MONGO_DB_URI) {
      console.log('🧪 Test mode with no MONGO_DB_URI → skipping Mongo connection.');
      return;
    }
    if (!mongoUri) {
      console.warn('⚠️ No MongoDB URI found in MONGO_DB_URI or MONGO_URI');
      return;
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
  }
};

module.exports = connectMongo;


