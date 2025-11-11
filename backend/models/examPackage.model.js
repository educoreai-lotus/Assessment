const { Schema, model, Types } = require('mongoose');

const ExamPackageQuestionSchema = new Schema(
  {
    question_id: { type: String, index: true },
    skill_id: String,
    prompt: Schema.Types.Mixed,
    options: [Schema.Types.Mixed],
    answer_key: Schema.Types.Mixed,
    metadata: Schema.Types.Mixed,
  },
  { _id: false }
);

const ExamPackageSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => `pkg_${Types.ObjectId().toString()}`,
    },
    exam_id: { type: String, required: true, index: true },
    attempt_id: { type: String, required: true, index: true },
    user: {
      user_id: { type: String, required: true, index: true },
      name: String,
      email: String,
    },
    questions: {
      type: [ExamPackageQuestionSchema],
      default: [],
    },
    grading: {
      final_grade: Number,
      passed: Boolean,
      rubric: Schema.Types.Mixed,
    },
    coverage_map: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    final_status: {
      type: String,
      enum: ['draft', 'in_progress', 'completed', 'cancelled', 'archived'],
      default: 'draft',
    },
    proctoring: Schema.Types.Mixed,
    lineage: {
      type: Schema.Types.Mixed,
      default: {},
    },
    attachments: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    collection: 'exam_packages',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    minimize: false,
  }
);

ExamPackageSchema.index({ exam_id: 1, attempt_id: 1 });
ExamPackageSchema.index({ final_status: 1, 'grading.passed': 1 });
ExamPackageSchema.index({ 'user.user_id': 1 });

module.exports = model('ExamPackage', ExamPackageSchema);

