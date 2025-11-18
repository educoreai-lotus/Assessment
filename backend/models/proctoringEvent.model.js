const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProctoringEventSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => `proctor_${new mongoose.Types.ObjectId().toString()}`,
    },
    attempt_id: { type: String, required: true, index: true },
    source: {
      type: String,
      enum: ['webcam', 'microphone', 'screen', 'system', 'proctor', 'other'],
      default: 'system',
    },
    event_type: {
      type: String,
      enum: ['alert', 'warning', 'info', 'evidence'],
      default: 'info',
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    detected_at: { type: Date, default: Date.now },
    payload: Schema.Types.Mixed,
    classification: {
      type: String,
      enum: ['noise', 'suspicious', 'violation', 'system'],
      default: 'noise',
    },
    resolved: { type: Boolean, default: false },
    resolution: {
      type: Schema.Types.Mixed,
      default: {},
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    collection: 'proctoring_events',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    minimize: false,
  }
);

ProctoringEventSchema.index({ attempt_id: 1, detected_at: -1 });
ProctoringEventSchema.index({ severity: 1, event_type: 1 });

module.exports =
  process.env.NODE_ENV === 'test'
    ? {}
    : mongoose.model('ProctoringEvent', ProctoringEventSchema);

