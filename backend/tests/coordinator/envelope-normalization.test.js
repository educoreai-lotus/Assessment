const { parseEnvelope, stringifyEnvelope, normalizeEnvelope } = require('../../utils/coordinatorEnvelope');

describe('Coordinator Envelope Utils', () => {
  test('stringified envelope parses correctly', () => {
    const input = {
      requester_service: 'skills-engine',
      payload: { action: 'start-baseline-exam', user_id: 'u_123' },
      response: { answer: '' },
    };
    const str = stringifyEnvelope(input);
    const parsed = parseEnvelope(str);
    const norm = normalizeEnvelope(parsed);
    expect(norm).toEqual({
      requester_service: 'skills-engine',
      payload: { action: 'start-baseline-exam', user_id: 'u_123' },
      response: { answer: '' },
    });
  });

  test('raw Course Builder object is normalized with envelope wrapper and action', () => {
    const raw = { learner_id: 'u_999', course_id: 'c_777', course_name: 'Intro to JS' };
    // adapter emulation: wrap if no requester_service
    let wrapped = raw;
    if (!wrapped.requester_service) {
      wrapped = {
        requester_service: 'course-builder',
        payload: { action: 'start-postcourse-exam', ...raw },
        response: { answer: '' },
      };
    }
    const norm = normalizeEnvelope(wrapped);
    expect(norm.requester_service).toBe('course-builder');
    expect(norm.payload.action).toBe('start-postcourse-exam');
    expect(norm.payload.course_id).toBe('c_777');
    expect(typeof norm.response.answer).toBe('string');
  });
});


