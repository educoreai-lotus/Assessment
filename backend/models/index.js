'use strict';

const isTest = process.env.NODE_ENV === 'test';

if (isTest) {
  // Simple in-memory store for proctoring sessions during tests
  const proctoringSessionStore = new Map();

  module.exports = {
    ExamPackage: {
      findOne: () => ({
        sort: () => ({
          lean: async () => null,
        }),
        lean: async () => null,
      }),
      findOneAndUpdate: async () => null,
      create: async () => ({
        _id: "mock123",
        exam_id: 1,
        theoretical_questions: [],
        coding_questions: [],
      }),
      save: async () => ({}),
    },
    ProctoringSession: {
      findOne: (filter = {}) => ({
        lean: async () => {
          const key = String(filter.attempt_id || '');
          return proctoringSessionStore.get(key) || null;
        },
      }),
      findOneAndUpdate: async (filter = {}, update = {}, _options = {}) => {
        const key = String(filter.attempt_id || '');
        const existing = proctoringSessionStore.get(key) || {};
        const next = {
          ...existing,
          attempt_id: String(update.attempt_id || existing.attempt_id || key),
          exam_id: String(update.exam_id || existing.exam_id || ''),
          camera_status: update.camera_status || existing.camera_status || 'inactive',
          start_time: existing.start_time || new Date(),
          events: Array.isArray(existing.events) ? existing.events : [],
        };
        proctoringSessionStore.set(key, next);
        return next;
      },
      create: async (doc = {}) => {
        const key = String(doc.attempt_id || '');
        proctoringSessionStore.set(key, { ...doc });
        return { ...doc };
      },
      save: async () => ({}),
    },
  };
} else {
  module.exports = {
    ExamPackage: require('./examPackage.model'),
    AiAuditTrail: require('./aiAuditTrail.model'),
    ProctoringEvent: require('./proctoringEvent.model'),
    ProctoringSession: require('./proctoringSession.model'),
    ProctoringViolation: require('./proctoringViolation.model'),
    Incident: require('./incident.model'),
    ExamContext: require('./examContext.model'),
  };
}

