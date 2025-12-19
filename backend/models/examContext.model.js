const mongoose = require('mongoose');
const { Schema } = mongoose;

const ExamContextSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => `examctx_${new mongoose.Types.ObjectId().toString()}`,
    },
    user_id: { type: String, required: true, index: true },
    exam_type: { type: String, required: true, index: true, enum: ['baseline', 'postcourse'] },
    competency_name: { type: String, default: null },
    exam_id: { type: String, default: null, index: true },
    attempt_id: { type: String, default: null, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    collection: 'exam_context',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    minimize: false,
  }
);

// In test mode, avoid touching mongoose.model and use a simple in-memory store
if (process.env.NODE_ENV === 'test') {
  const store = new Map();
  module.exports = {
    async findOne(filter = {}) {
      // Support lookup by user_id+exam_type, exam_id, or attempt_id
      if (filter && (filter.user_id || filter.exam_type)) {
        const key = `${String(filter.user_id || '')}:${String(filter.exam_type || '')}`;
        const val = store.get(key);
        if (val) return val;
      }
      const all = Array.from(store.values());
      if (filter && filter.exam_id != null) {
        const found = all.find((v) => String(v.exam_id || '') === String(filter.exam_id));
        if (found) return found;
      }
      if (filter && filter.attempt_id != null) {
        const found = all.find((v) => String(v.attempt_id || '') === String(filter.attempt_id));
        if (found) return found;
      }
      return null;
    },
    async findOneAndUpdate(filter = {}, update = {}, _options = {}) {
      const key = `${String(filter.user_id || '')}:${String(filter.exam_type || '')}`;
      const existing = store.get(key) || {};
      const next = {
        ...existing,
        user_id: String(update.user_id || existing.user_id || filter.user_id || ''),
        exam_type: String(update.exam_type || existing.exam_type || filter.exam_type || ''),
        competency_name: update.competency_name != null ? String(update.competency_name) : (existing.competency_name || null),
        exam_id: update.exam_id != null ? String(update.exam_id) : (existing.exam_id || null),
        attempt_id: update.attempt_id != null ? String(update.attempt_id) : (existing.attempt_id || null),
        metadata: typeof update.metadata === 'object' && update.metadata ? update.metadata : (existing.metadata || {}),
        updated_at: new Date(),
        created_at: existing.created_at || new Date(),
      };
      store.set(key, next);
      return next;
    },
    async create(doc = {}) {
      const key = `${String(doc.user_id || '')}:${String(doc.exam_type || '')}`;
      const next = {
        ...doc,
        created_at: new Date(),
        updated_at: new Date(),
      };
      store.set(key, next);
      return next;
    },
  };
  return;
}

module.exports = mongoose.model('ExamContext', ExamContextSchema);



