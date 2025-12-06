'use strict';

const fs = require('fs');
const path = require('path');

describe('Coordinator connectivity - Signed outbound requests', () => {
  const runLive = process.env.RUN_COORDINATOR_LIVE === 'true';
  const COORDINATOR_URL = process.env.COORDINATOR_URL || 'https://coordinator-production-e0a0.up.railway.app';
  const SERVICE_NAME = process.env.SERVICE_NAME || 'assessment-service';
  let originalEnv;
  let originalFetch;
  let lastFetchOptions = null;
  let lastResponse = null;
  let lastBody = null;

  beforeAll(() => {
    if (!runLive) return;
    originalEnv = { ...process.env };
    originalFetch = global.fetch;

    // Load keys for signing and verifying
    const privateKeyPem = fs.readFileSync(path.join(__dirname, '../../../assessment-private-key.pem'), 'utf8');
    const publicKeyPem = fs.readFileSync(path.join(__dirname, '../../../assessment-public-key.pem'), 'utf8');
    process.env.PRIVATE_KEY = process.env.PRIVATE_KEY || privateKeyPem;
    process.env.COORDINATOR_URL = COORDINATOR_URL;
    process.env.SERVICE_NAME = SERVICE_NAME;
    process.env.COORDINATOR_PUBLIC_KEY = publicKeyPem;

    // Wrap real fetch to capture headers and status while still performing the real request
    const realFetch = global.fetch;
    global.fetch = async (url, options) => {
      lastFetchOptions = options || {};
      try {
        lastBody = JSON.parse(String(options?.body || '{}'));
      } catch {
        lastBody = null;
      }
      const resp = await realFetch(url, options);
      lastResponse = resp;
      return resp;
    };
  }, 30000);

  afterAll(() => {
    if (!runLive) return;
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  (runLive ? test : test.skip)('postToCoordinator sets headers and sends a valid signature; response not 401', async () => {
    jest.resetModules();
    const { verifySignature } = require('../../utils/signature');
    const { postToCoordinator } = require('../../services/gateways/coordinatorClient');

    const envelope = {
      requester_service: 'assessment-service',
      payload: { action: 'ping' },
      response: {},
    };

    const { resp, data } = await postToCoordinator(envelope);
    expect(resp).toBeDefined();
    expect(typeof data).toBe('object');

    // Header presence
    expect(lastFetchOptions).toBeTruthy();
    expect(lastFetchOptions.headers).toBeTruthy();
    expect(lastFetchOptions.headers['X-Service-Name']).toBeDefined();
    expect(lastFetchOptions.headers['X-Signature']).toBeDefined();

    // Signature validity (against our public key)
    const publicKeyPem = fs.readFileSync(path.join(__dirname, '../../../assessment-public-key.pem'), 'utf8');
    const isValid = verifySignature(
      SERVICE_NAME,
      lastFetchOptions.headers['X-Signature'],
      publicKeyPem,
      envelope
    );
    expect(isValid).toBe(true);

    // Body schema assertions
    expect(lastBody && typeof lastBody === 'object').toBe(true);
    expect(lastBody.requester_service).toBe(SERVICE_NAME);
    expect(lastBody).toHaveProperty('payload');
    expect(typeof lastBody.payload).toBe('object');
    expect(lastBody).toHaveProperty('response');
    expect(typeof lastBody.response).toBe('object');

    // Unified-proxy soft status rules
    expect(lastResponse).toBeDefined();
    expect(Number(lastResponse.status)).not.toBe(401);
    expect(Number(lastResponse.status)).toBeGreaterThanOrEqual(100);
    expect(Number(lastResponse.status)).toBeLessThan(600);
    const str = JSON.stringify(data || {});
    expect(str.toLowerCase()).not.toContain('authentication required');
  }, 45000);
});


