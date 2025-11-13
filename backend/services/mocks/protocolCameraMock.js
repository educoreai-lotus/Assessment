// Protocol Camera mock payloads per exact data contracts
exports.mockEvent = async () => {
  return {
    exam_id: 'ex_51a2',
    attempt_id: 'att_9m1x',
    user_id: 'u_123',
    event_type: 'tab_switch',
    timestamp: '2025-11-07T16:20:15Z',
    severity_score: 2,
    resolution_status: 'unresolved',
  };
};

exports.mockSendSummary = async (payload) => {
  return {
    attempt_id: payload?.attempt_id || 'att_9m1x',
    summary: {
      events_total: 5,
      violations: 1,
      terminated: false,
    },
  };
};


