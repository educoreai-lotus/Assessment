const crypto = require('crypto');

describe('coordinatorClient.postToCoordinator', () => {
  let originalEnv;
  let originalFetch;

  beforeAll(() => {
    originalEnv = { ...process.env };
    originalFetch = global.fetch;
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  test('sets X-Service-Name and X-Signature when PRIVATE_KEY is provided', async () => {
    const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });

    process.env.SERVICE_NAME = 'assessment-service';
    process.env.COORDINATOR_URL = 'https://coordinator.example.com';
    process.env.PRIVATE_KEY = privatePem;

    const mockHeaders = {
      get: () => null,
    };

    const fetchCalls = [];
    global.fetch = jest.fn(async (url, options) => {
      fetchCalls.push({ url, options });
      return {
        status: 200,
        headers: mockHeaders,
        async json() { return { success: true, data: { ok: true } }; },
      };
    });

    // Require after env set so it reads env on import
    jest.resetModules();
    const { postToCoordinator } = require('../services/gateways/coordinatorClient');

    const envelope = { requester_service: 'assessment-service', payload: { action: 'ping' }, response: {} };
    const { data } = await postToCoordinator(envelope);
    expect(data).toEqual({ success: true, data: { ok: true } });

    expect(fetchCalls.length).toBe(1);
    const { options } = fetchCalls[0];
    expect(options.headers['X-Service-Name']).toBe('assessment-service');
    expect(typeof options.headers['X-Signature']).toBe('string');
    expect(options.headers['X-Signature'].length).toBeGreaterThan(0);
  });
});


