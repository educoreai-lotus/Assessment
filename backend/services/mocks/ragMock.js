// RAG mock payloads per exact data contracts
exports.mockIncident = async () => {
  return {
    source: 'rag_service',
    exam_id: 'ex_51a2',
    attempt_id: 'att_9m1x',
    user_id: 'u_123',
    incident_type: 'technical_error',
    messages: ['The page froze during question 3.'],
    decision: 'retake',
    is_counted_as_attempt: false,
  };
};

exports.mockAcknowledgeDecision = async (payload) => {
  return { status: 'accepted', payload };
};


