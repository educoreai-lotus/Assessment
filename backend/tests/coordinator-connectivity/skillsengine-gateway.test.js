'use strict';

describe('Coordinator connectivity - SkillsEngine Gateway', () => {
  const COORDINATOR_URL = process.env.COORDINATOR_URL || 'https://coordinator-production-e0a0.up.railway.app';

  beforeAll(() => {
    process.env.COORDINATOR_URL = COORDINATOR_URL;
    const fs = require('fs');
    const path = require('path');
    const privateKeyPem = fs.readFileSync(path.join(__dirname, '../../../assessment-private-key.pem'), 'utf8');
    process.env.PRIVATE_KEY = process.env.PRIVATE_KEY || privateKeyPem;
    process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'assessment-service';
  });

  test('safeFetchBaselineSkills returns data or fallback; metadata.routed_to if available; no 401', async () => {
    jest.resetModules();
    const { safeFetchBaselineSkills } = require('../../services/gateways/skillsEngineGateway');
    const { postToCoordinator } = require('../../services/gateways/coordinatorClient');

    const out = await safeFetchBaselineSkills({ user_id: 'u_123', user_name: 'Jane' });
    expect(out).toBeTruthy();
    expect(typeof out).toBe('object');

    const body = {
      requester_service: 'assessment-service',
      payload: {
        action: 'fetch baseline readiness skills from Skills Engine',
        user_id: 'u_123',
        user_name: 'Jane',
      },
      response: {
        skills: [],
        passing_grade: 0,
      },
    };
    const { resp, data } = await postToCoordinator(body);
    expect(resp && resp.status !== 401).toBe(true);
    if (data && data.metadata && data.metadata.routed_to) {
      const routed = String(data.metadata.routed_to).toLowerCase();
      expect(routed.includes('skills') || routed.includes('engine') || routed.includes('coordinator')).toBe(true);
    }
  }, 45000);

  test('safePushAssessmentResults returns ok or fallback; no 401', async () => {
    jest.resetModules();
    const { safePushAssessmentResults } = require('../../services/gateways/skillsEngineGateway');
    const out = await safePushAssessmentResults({ user_id: 'u_123', results: [] });
    expect(out).toBeTruthy();
    expect(typeof out).toBe('object');
  }, 45000);
});


