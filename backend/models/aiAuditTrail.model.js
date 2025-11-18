const mongoose = require('mongoose');
const { Schema } = mongoose;

const AiAuditTrailSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => `audit_${new mongoose.Types.ObjectId().toString()}`,
    },
    exam_id: { type: String, index: true },
    attempt_id: { type: String, required: true, index: true },
    event_type: {
      type: String,
      enum: ['prompt', 'rerun', 'score_adjustment', 'mitigation', 'grading', 'other'],
      default: 'prompt',
    },
    model: {
      provider: String,
      name: String,
      version: String,
    },
    prompt: Schema.Types.Mixed,
    response: Schema.Types.Mixed,
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    latency_ms: Number,
    status: {
      type: String,
      enum: ['success', 'failure', 'timeout'],
      default: 'success',
    },
    error: Schema.Types.Mixed,
    executed_at: { type: Date, default: Date.now },
  },
  {
    collection: 'ai_audit_trail',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    minimize: false,
  }
);

AiAuditTrailSchema.index({ attempt_id: 1, executed_at: -1 });
AiAuditTrailSchema.index({ status: 1, executed_at: -1 });

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
module.exports = mongoose.model('AiAuditTrail', AiAuditTrailSchema);

