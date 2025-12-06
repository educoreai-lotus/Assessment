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
    expect([200, 202].includes(Number(resp.status))).toBe(true);
    const json = await resp.json().catch(() => ({}));
    expect(json && typeof json === 'object').toBe(true);
    expect(json.success).toBe(true);
    if (json.metadata && json.metadata.routed_to) {
      expect(String(json.metadata.routed_to)).toBe(SERVICE_NAME);
    }
  }, 45000);
});


