'use strict';

const isTest = process.env.NODE_ENV === 'test';

if (isTest) {
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
      findOne: () => ({
        lean: async () => null,
      }),
      findOneAndUpdate: async () => null,
      create: async () => null,
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
  };
}

