function parseEnvelope(input) {
  // Accept string or object; return normalized envelope object or throw with clear message
  if (input == null) return { requester_service: '', payload: {}, response: { answer: '' } };
  let obj = input;
  if (typeof input === 'string') {
    try {
      obj = JSON.parse(input);
    } catch (err) {
      const e = new Error('Invalid JSON string for envelope');
      e.cause = err;
      throw e;
    }
  }
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return { requester_service: '', payload: {}, response: { answer: '' } };
  }
  return obj;
}

function stringifyEnvelope(envelope) {
  const replacer = undefined; // stable ordering optional; JSON.stringify is deterministic per key insertion order
  const space = 0;
  try {
    return JSON.stringify(envelope, replacer, space);
  } catch (err) {
    const e = new Error('Failed to stringify envelope');
    e.cause = err;
    throw e;
  }
}

function normalizeEnvelope(envelope) {
  const out = envelope && typeof envelope === 'object' ? { ...envelope } : {};
  const requester = (out.requester_service || out.requester || '').toString();
  // Accept optional request id and service origin with flexible naming
  const requestId =
    out.request_id ||
    out.requestId ||
    (out.headers && (out.headers['x-request-id'] || out.headers['X-Request-Id'])) ||
    '';
  const serviceOrigin =
    out['service-origin'] ||
    out.service_origin ||
    out.serviceOrigin ||
    '';
  const payloadIn = out.payload;
  const payload =
    payloadIn && typeof payloadIn === 'object'
      ? { ...payloadIn }
      : (() => {
          if (typeof payloadIn === 'string') {
            try {
              return JSON.parse(payloadIn);
            } catch {
              return {};
            }
          }
          return {};
        })();

  const responseIn = out.response;
  const response =
    responseIn && typeof responseIn === 'object' ? { ...responseIn } : { answer: '' };

  if (response.answer == null) response.answer = '';

  // Default action adapters
  const reqLower = requester.toLowerCase();
  if (!payload.action) {
    if (reqLower.includes('skills')) {
      payload.action = 'start-baseline-exam';
    } else if (reqLower.includes('course')) {
      payload.action = 'start-postcourse-exam';
    }
  }

  return {
    requester_service: requester,
    request_id: requestId ? String(requestId) : undefined,
    service_origin: serviceOrigin ? String(serviceOrigin) : undefined,
    payload,
    response,
  };
}

module.exports = {
  parseEnvelope,
  stringifyEnvelope,
  normalizeEnvelope,
};


