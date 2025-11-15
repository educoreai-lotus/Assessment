const { Schema, model, Types } = require('mongoose');

const ProctoringSessionSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => `procsess_${Types.ObjectId().toString()}`,
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

module.exports = model('ProctoringSession', ProctoringSessionSchema);


