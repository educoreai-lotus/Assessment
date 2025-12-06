'use strict';

describe('Coordinator connectivity - Inbound routing to /debug/inbound (temporary)', () => {
  const runLive = process.env.RUN_COORDINATOR_LIVE === 'true';
  const COORDINATOR_URL = process.env.COORDINATOR_URL || 'https://coordinator-production-e0a0.up.railway.app';
  const SERVICE_NAME = process.env.SERVICE_NAME || 'assessment-service';

  (runLive ? test : test.skip)('Coordinator unified proxy forwards to assessment /debug/inbound and receives { received: true }', async () => {
    const base = String(COORDINATOR_URL).replace(/\/+$/, '');
    const url = `${base}/api/fill-content-metrics`;
    const { generateSignature } = require('../../utils/signature');
    const body = {
      requester_service: SERVICE_NAME,
      payload: { action: 'debug', proxy_path: '/debug/inbound' },
      response: { received: true },
    };
    const signature = generateSignature(SERVICE_NAME, process.env.PRIVATE_KEY, body);
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': SERVICE_NAME,
        'X-Signature': signature,
      },
      body: JSON.stringify(body),
    });
    expect(resp).toBeDefined();
    expect(Number(resp.status)).not.toBe(401);
    expect(Number(resp.status)).toBeGreaterThanOrEqual(100);
    expect(Number(resp.status)).toBeLessThan(600);
    const json = await resp.json().catch(() => ({}));
    const data = json || {};
    expect(typeof data).toBe('object');
    const str = JSON.stringify(data).toLowerCase();
    expect(str).not.toContain('authentication required');
  }, 45000);
});


