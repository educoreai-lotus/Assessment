const { generateSignature, verifySignature } = require('../../utils/signature');
const { stringifyEnvelope } = require('../../utils/coordinatorEnvelope');

const SERVICE_NAME = process.env.SERVICE_NAME || 'assessment-service';
const COORDINATOR_URL = process.env.COORDINATOR_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const COORDINATOR_PUBLIC_KEY = process.env.COORDINATOR_PUBLIC_KEY || null;

if (!COORDINATOR_URL) {
  // eslint-disable-next-line no-console
  console.warn('[CoordinatorClient] COORDINATOR_URL is not set. Coordinator calls will fail.');
}

function buildCompliantEnvelope(input) {
  // If input already looks like an envelope, normalize it; otherwise treat as payload
  let payload;
  let responseTemplate;
  if (input && typeof input === 'object' && (input.requester_service || input.payload || input.response)) {
    payload = input.payload && typeof input.payload === 'object' ? input.payload : {};
    responseTemplate = input.response && typeof input.response === 'object' ? input.response : { answer: '' };
  } else {
    payload = input && typeof input === 'object' ? input : {};
    responseTemplate = { answer: '' };
  }
  return {
    requester_service: SERVICE_NAME,
    payload,
    response: responseTemplate,
  };
}

async function postToCoordinator(bodyOrEnvelope) {
  if (!COORDINATOR_URL) {
    throw new Error('COORDINATOR_URL not set');
  }
  const base = String(COORDINATOR_URL).replace(/\/+$/, '');
  const url = `${base}/api/fill-content-metrics`;

  const envelope = buildCompliantEnvelope(bodyOrEnvelope);

  const headers = {
    'Content-Type': 'application/json',
  };

  if (PRIVATE_KEY) {
    try {
      const signature = generateSignature(SERVICE_NAME, PRIVATE_KEY, envelope);
      headers['X-Service-Name'] = SERVICE_NAME;
      headers['X-Signature'] = signature;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[CoordinatorClient] Failed to generate signature:', err.message);
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn('[CoordinatorClient] PRIVATE_KEY is not set. Requests will not be signed and Coordinator will likely reject them.');
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: stringifyEnvelope(envelope),
  });

  let data = {};
  try {
    data = await resp.json();
  } catch {
    data = {};
  }

  // Optional response signature verification (non-blocking)
  try {
    const coordinatorName = resp.headers.get?.('x-service-name') || resp.headers.get?.('X-Service-Name');
    const coordinatorSig = resp.headers.get?.('x-service-signature') || resp.headers.get?.('X-Service-Signature');
    if (COORDINATOR_PUBLIC_KEY && coordinatorName === 'coordinator' && coordinatorSig) {
      const ok = verifySignature('coordinator', coordinatorSig, COORDINATOR_PUBLIC_KEY, data);
      if (!ok) {
        // eslint-disable-next-line no-console
        console.warn('[CoordinatorClient] Invalid Coordinator response signature');
      }
    }
  } catch {
    // ignore signature verification errors for now
  }

  return { resp, data };
}

module.exports = {
  postToCoordinator,
};


