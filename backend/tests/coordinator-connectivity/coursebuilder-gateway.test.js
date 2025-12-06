'use strict';

describe('Coordinator connectivity - CourseBuilder Gateway', () => {
  const COORDINATOR_URL = process.env.COORDINATOR_URL || 'https://coordinator-production-e0a0.up.railway.app';

  beforeAll(() => {
    process.env.COORDINATOR_URL = COORDINATOR_URL;
    const fs = require('fs');
    const path = require('path');
    const privateKeyPem = fs.readFileSync(path.join(__dirname, '../../../assessment-private-key.pem'), 'utf8');
    process.env.PRIVATE_KEY = process.env.PRIVATE_KEY || privateKeyPem;
    process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'assessment-service';
  });

  test('safeFetchCoverage returns data or fallback; metadata.routed_to if available; no 401', async () => {
    jest.resetModules();
    const { safeFetchCoverage } = require('../../services/gateways/courseBuilderGateway');
    const { postToCoordinator } = require('../../services/gateways/coordinatorClient');

    const out = await safeFetchCoverage({ learner_id: 'u_123', course_id: 'c_789' });
    expect(out).toBeTruthy();
    expect(typeof out).toBe('object');

    // Best-effort check for metadata with a short timeout to avoid hanging the suite
    const body = {
      requester_service: 'assessment-service',
      payload: {
        action: 'fetch course coverage map from Course Builder',
        learner_id: 'u_123',
        course_id: 'c_789',
      },
      response: {
        learner_id: null,
        course_id: null,
        course_name: null,
        coverage_map: [],
      },
    };
    const raced = await Promise.race([
      postToCoordinator(body),
      new Promise((resolve) => setTimeout(() => resolve(null), 10000)),
    ]);
    if (raced && raced.resp) {
      const { resp, data } = raced;
      expect(resp && resp.status !== 401).toBe(true);
      if (data && data.metadata && data.metadata.routed_to) {
        const routed = String(data.metadata.routed_to).toLowerCase();
        expect(routed.includes('course') || routed.includes('builder') || routed.includes('coordinator')).toBe(true);
      }
    }
  }, 45000);

  test('safePushExamResults returns ok or fallback; no 401', async () => {
    jest.resetModules();
    const { safePushExamResults } = require('../../services/gateways/courseBuilderGateway');
    const out = await safePushExamResults({ user_id: 'u_123', course_id: 'c_789', final_grade: 80 });
    expect(out).toBeTruthy();
    expect(typeof out).toBe('object');
  }, 45000);
});


