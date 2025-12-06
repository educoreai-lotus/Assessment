'use strict';

describe('Coordinator connectivity - DevLab Gateway', () => {
  const runLive = process.env.RUN_COORDINATOR_LIVE === 'true';
  const COORDINATOR_URL = process.env.COORDINATOR_URL || 'https://coordinator-production-e0a0.up.railway.app';

  beforeAll(() => {
    if (!runLive) return;
    process.env.COORDINATOR_URL = COORDINATOR_URL;
    const fs = require('fs');
    const path = require('path');
    const privateKeyPem = fs.readFileSync(path.join(__dirname, '../../../assessment-private-key.pem'), 'utf8');
    process.env.PRIVATE_KEY = process.env.PRIVATE_KEY || privateKeyPem;
    process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'assessment-service';
  });

  (runLive ? test : test.skip)('requestCodingQuestions returns data or fallback; metadata.routed_to if available; no 401', async () => {
    jest.resetModules();
    const { requestCodingQuestions } = require('../../services/gateways/devlabGateway');
    const { postToCoordinator } = require('../../services/gateways/coordinatorClient');

    const out = await requestCodingQuestions({ amount: 1, skills: ['s_js_async'], humanLanguage: 'en', difficulty: 'medium' });
    expect(Array.isArray(out)).toBe(true);

    const envelope = {
      requester_service: 'assessment-service',
      payload: {
        action: 'coding',
        amount: 1,
        difficulty: 'medium',
        humanLanguage: 'en',
        programming_language: 'javascript',
        skills: ['s_js_async'],
      },
      response: { answer: [] },
    };
    const { resp, data } = await postToCoordinator(envelope);
    expect(resp && resp.status !== 401).toBe(true);
    if (data && data.metadata && data.metadata.routed_to) {
      const routed = String(data.metadata.routed_to).toLowerCase();
      expect(routed.includes('devlab') || routed.includes('coordinator')).toBe(true);
    }
  }, 45000);
});


