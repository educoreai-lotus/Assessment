const { Schema, model, Types } = require('mongoose');

const ExamPackageQuestionSchema = new Schema(
  {
    question_id: { type: String, index: true },
    skill_id: String,
    // New optional theoretical-question fields (Phase 08.1 – DevLab Integration Update)
    // When the item represents a theoretical question, these fields may be present.
    // They are optional to avoid breaking existing packages/documents.
    topic_id: { type: Number, required: false },
    topic_name: { type: String, required: false },
    humanLanguage: { type: String, required: false },
    // Normalized theoretical content fields (kept alongside legacy prompt/options for compatibility)
    question: { type: String, required: false },
    hints: { type: [String], required: false, default: undefined },
    correct_answer: { type: String, required: false },
    difficulty: { type: String, required: false },
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
      type: Schema.Types.ObjectId,
      default: () => new Types.ObjectId(),
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
    per_skill: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    engine: String,
    completed_at: Date,
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

