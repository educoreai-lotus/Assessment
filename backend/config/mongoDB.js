const mongoose = require('mongoose');
require('dotenv').config();

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
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB Atlas');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
  }
};

module.exports = connectMongo;


