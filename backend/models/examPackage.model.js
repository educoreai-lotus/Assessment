const mongoose = require('mongoose');
const { Schema } = mongoose;

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

// Phase 08.2 – Dedicated coding questions storage (Mongo only)
const ExamPackageCodingQuestionSchema = new Schema(
  {
    question: { type: String, required: true },
    starter_code: { type: String, default: '' },
    expected_output: { type: String, default: '' },
    test_cases: { type: Array, default: [] },
    humanLanguage: { type: String, default: 'en' },
    programming_language: { type: String, default: 'javascript' },
    skills: { type: [String], default: [] },
    difficulty: { type: String, default: 'medium' },
    // Optional UI payload from DevLab, passed through transparently when present
    renderedComponent: Schema.Types.Mixed,
    // Full DevLab object for grading/judge engines (non-required)
    devlab: { type: Schema.Types.Mixed, required: false },
    requested_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ExamPackageSchema = new Schema(
  {
    _id: {
      type: Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    // New: explicit assessment type for the package (e.g., 'baseline', 'postcourse')
    assessment_type: { type: String, required: false, index: true },
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
    coding_questions: {
      type: [ExamPackageCodingQuestionSchema],
      default: [],
    },
    // Phase 08.3 – Coding answers and grading persistence (Mongo only; non-breaking)
    coding_answers: { type: Array, default: [] },
    coding_grading_results: { type: Array, default: [] },
    coding_score_total: { type: Number, default: 0 },
    coding_score_max: { type: Number, default: 0 },
    // DevLab final grading result envelope (iframe ingestion)
    coding_results: { type: Schema.Types.Mixed, required: false },
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
module.exports = mongoose.model('ExamPackage', ExamPackageSchema);

