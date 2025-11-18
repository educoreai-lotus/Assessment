const { Schema, model, Types } = require('mongoose');

const ProctoringViolationSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => `procviol_${new Types.ObjectId().toString()}`,
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

module.exports = model('ProctoringViolation', ProctoringViolationSchema);


