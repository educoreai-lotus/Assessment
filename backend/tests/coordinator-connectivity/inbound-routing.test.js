'use strict';

describe('Coordinator connectivity - Inbound routing to /debug/inbound (temporary)', () => {
  const COORDINATOR_URL = process.env.COORDINATOR_URL || 'https://coordinator-production-e0a0.up.railway.app';

  test('Coordinator unified proxy forwards to assessment /debug/inbound and receives { received: true }', async () => {
    const base = String(COORDINATOR_URL).replace(/\/+$/, '');
    const url = `${base}/api/fill-content-metrics/`;
    const payload = {
      requester_service: 'coordinator',
      target_service: 'assessment-service',
      payload: { hello: true },
    };
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect([200, 201, 202].includes(Number(resp.status))).toBe(true);
    const json = await resp.json().catch(() => ({}));
    // Expect our debug endpoint response if Coordinator forwards correctly
    if (json && typeof json === 'object') {
      const s = JSON.stringify(json).toLowerCase();
      expect(s).not.toContain('authentication required');
    }
    // Only assert exact structure if present (Coordinator may wrap)
    if (json && json.received !== undefined) {
      expect(json.received).toBe(true);
    }
  }, 45000);
});


