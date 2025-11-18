if (process.env.NODE_ENV === 'test') {
  module.exports = {};
  return;
}

module.exports = {
  ExamPackage: require('./examPackage.model'),
  AiAuditTrail: require('./aiAuditTrail.model'),
  ProctoringEvent: require('./proctoringEvent.model'),
  ProctoringSession: require('./proctoringSession.model'),
  ProctoringViolation: require('./proctoringViolation.model'),
  Incident: require('./incident.model'),
};

