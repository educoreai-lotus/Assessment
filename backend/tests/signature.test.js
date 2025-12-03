const crypto = require('crypto');
const { generateSignature, verifySignature } = require('../utils/signature');

function genEcKeypair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  });
  return {
    privatePem: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    publicPem: publicKey.export({ type: 'spki', format: 'pem' }),
  };
}

describe('signature util (ECDSA P-256)', () => {
  test('generateSignature returns a base64 string; verifySignature validates true/false appropriately', () => {
    const { privatePem, publicPem } = genEcKeypair();
    const serviceName = 'assessment-service';
    const payload = { a: 1, b: 'x' };

    const sig = generateSignature(serviceName, privatePem, payload);
    expect(typeof sig).toBe('string');
    expect(sig.length).toBeGreaterThan(0);

    const ok = verifySignature(serviceName, sig, publicPem, payload);
    expect(ok).toBe(true);

    const bad = verifySignature(serviceName, sig, publicPem, { a: 2, b: 'x' });
    expect(bad).toBe(false);
  });
});


