const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProctoringViolationSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => `procviol_${new mongoose.Types.ObjectId().toString()}`,
    },
    attempt_id: { type: String, required: true, index: true, unique: true },
    count: { type: Number, default: 0 },
    events: {
      type: [
        new Schema(
          {
            type: { type: String, required: true },
            timestamp: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  {
    collection: 'proctoring_violations',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    minimize: false,
  }
);

// In test mode, export harmless mock methods and avoid touching mongoose.model
if (process.env.NODE_ENV === 'test') {
  module.exports = {
    findOne: async () => null,
    findOneAndUpdate: async () => null,
    create: async () => ({}),
    save: async () => ({}),
  };
  return;
}

// Non-test: export actual model
module.exports = mongoose.model('ProctoringViolation', ProctoringViolationSchema);


