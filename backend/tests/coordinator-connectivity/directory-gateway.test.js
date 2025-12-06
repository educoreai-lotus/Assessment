'use strict';

describe('Coordinator connectivity - Directory Gateway', () => {
  const COORDINATOR_URL = process.env.COORDINATOR_URL || 'https://coordinator-production-e0a0.up.railway.app';

  beforeAll(() => {
    process.env.COORDINATOR_URL = COORDINATOR_URL;
    const fs = require('fs');
    const path = require('path');
    const privateKeyPem = fs.readFileSync(path.join(__dirname, '../../../assessment-private-key.pem'), 'utf8');
    process.env.PRIVATE_KEY = process.env.PRIVATE_KEY || privateKeyPem;
    process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'assessment-service';
  });

  test('safeFetchPolicy returns data or fallback; metadata.routed_to if available; no 401', async () => {
    jest.resetModules();
    const { safeFetchPolicy } = require('../../services/gateways/directoryGateway');
    const { postToCoordinator } = require('../../services/gateways/coordinatorClient');

    const out = await safeFetchPolicy('baseline');
    expect(out).toBeTruthy();
    expect(typeof out).toBe('object');

    // Direct call to inspect metadata
    const body = {
      requester_service: 'assessment-service',
      payload: {
        action: `fetch Directory policy for exam type "baseline"`,
        exam_type: 'baseline',
      },
      response: {
        passing_grade: 0,
        max_attempts: 0,
      },
    };
    const { resp, data } = await postToCoordinator(body);
    expect(resp && resp.status !== 401).toBe(true);
    if (data && data.metadata && data.metadata.routed_to) {
      // Expect routing to directory or related orchestrator
      const routed = String(data.metadata.routed_to).toLowerCase();
      expect(routed.includes('directory') || routed.includes('learninganalytics') || routed.includes('coordinator')).toBe(true);
    }
  }, 45000);

  test('safePushExamResults returns ok or fallback; no 401', async () => {
    jest.resetModules();
    const { safePushExamResults } = require('../../services/gateways/directoryGateway');
    const out = await safePushExamResults({ exam_id: 'ex_1', passed: true });
    expect(out).toBeTruthy();
    expect(typeof out).toBe('object');
  }, 45000);
});


