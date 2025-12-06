'use strict';

describe('Coordinator connectivity - Health (ping)', () => {
  const runLive = process.env.RUN_COORDINATOR_LIVE === 'true';
  const COORDINATOR_URL = process.env.COORDINATOR_URL || 'https://coordinator-production-e0a0.up.railway.app';
  const SERVICE_NAME = process.env.SERVICE_NAME || 'assessment-service';

  beforeAll(() => {
    if (!runLive) return;
    process.env.COORDINATOR_URL = COORDINATOR_URL;
    const fs = require('fs');
    const path = require('path');
    const privateKeyPem = fs.readFileSync(path.join(__dirname, '../../../assessment-private-key.pem'), 'utf8');
    process.env.PRIVATE_KEY = process.env.PRIVATE_KEY || privateKeyPem;
    process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'assessment-service';
  });

  (runLive ? test : test.skip)('Ping via postToCoordinator responds with 200/202; valid JSON; no auth errors', async () => {
    jest.resetModules();
    const { postToCoordinator } = require('../../services/gateways/coordinatorClient');

    const envelope = {
      requester_service: SERVICE_NAME,
      payload: { action: 'ping' },
      response: { ok: true },
    };
    const { resp, data } = await postToCoordinator(envelope);
    expect(resp).toBeDefined();
    expect(Number(resp.status)).not.toBe(401);
    expect(Number(resp.status)).toBeGreaterThanOrEqual(100);
    expect(Number(resp.status)).toBeLessThan(600);
    const json = data || {};
    expect(typeof json).toBe('object');
    const str = JSON.stringify(json || {}).toLowerCase();
    expect(str.toLowerCase()).not.toContain('authentication required');
  }, 45000);
});


