function buildProctoringSummaryPayload({ attempt, summary } = {}) {
  return {
    action: 'proctoring-summary',
    attempt_id: attempt?.attempt_id ?? null,
    exam_id: attempt?.exam_id ?? null,
    summary: summary || {},
  };
}

module.exports = {
  buildProctoringSummaryPayload,
};


