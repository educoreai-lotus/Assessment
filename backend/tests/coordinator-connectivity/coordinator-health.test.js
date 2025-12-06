'use strict';

describe('Coordinator connectivity - Health (ping)', () => {
  const COORDINATOR_URL = process.env.COORDINATOR_URL || 'https://coordinator-production-e0a0.up.railway.app';

  beforeAll(() => {
    process.env.COORDINATOR_URL = COORDINATOR_URL;
    const fs = require('fs');
    const path = require('path');
    const privateKeyPem = fs.readFileSync(path.join(__dirname, '../../../assessment-private-key.pem'), 'utf8');
    process.env.PRIVATE_KEY = process.env.PRIVATE_KEY || privateKeyPem;
    process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'assessment-service';
  });

  test('Ping via postToCoordinator responds with 200/202; valid JSON; no auth errors', async () => {
    jest.resetModules();
    const { postToCoordinator } = require('../../services/gateways/coordinatorClient');

    const envelope = {
      requester_service: 'assessment-service',
      payload: { action: 'ping' },
      response: {},
    };
    const { resp, data } = await postToCoordinator(envelope);
    expect(resp).toBeDefined();
    expect([200, 201, 202].includes(Number(resp.status))).toBe(true);
    expect(typeof data).toBe('object');
    const str = JSON.stringify(data || {});
    expect(str.toLowerCase()).not.toContain('authentication required');
  }, 45000);
});


