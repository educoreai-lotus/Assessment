const { Schema, model, Types } = require('mongoose');

const IncidentSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => `incident_${Types.ObjectId().toString()}`,
    },
    attempt_id: { type: String, required: true, index: true },
    exam_id: { type: String, index: true },
    source: {
      type: String,
      enum: ['automation', 'proctor', 'appeal', 'system'],
      default: 'automation',
    },
    severity: {
      type: String,
      enum: ['info', 'low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    status: {
      type: String,
      enum: ['open', 'investigating', 'mitigated', 'closed'],
      default: 'open',
    },
    summary: { type: String, required: true },
    details: Schema.Types.Mixed,
    tags: {
      type: [String],
      default: [],
    },
    resolution: {
      type: Schema.Types.Mixed,
      default: {},
    },
    opened_at: { type: Date, default: Date.now },
    closed_at: Date,
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    collection: 'incidents',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    minimize: false,
  }
);

IncidentSchema.index({ attempt_id: 1, opened_at: -1 });
IncidentSchema.index({ severity: 1, status: 1 });

module.exports = model('Incident', IncidentSchema);

