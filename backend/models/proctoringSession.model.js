const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProctoringSessionSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => `procsess_${new mongoose.Types.ObjectId().toString()}`,
    },
    attempt_id: { type: String, required: true, index: true, unique: true },
    exam_id: { type: String, required: true, index: true },
    start_time: { type: Date, default: Date.now },
    camera_status: {
      type: String,
      enum: ['inactive', 'active'],
      default: 'inactive',
      index: true,
    },
    events: {
      type: Array,
      default: [],
    },
  },
  {
    collection: 'proctoring_sessions',
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
module.exports = mongoose.model('ProctoringSession', ProctoringSessionSchema);


