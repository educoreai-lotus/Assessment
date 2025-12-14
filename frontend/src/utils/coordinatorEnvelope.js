export function parseEnvelope(input) {
  if (input == null) return { requester_service: '', payload: {}, response: { answer: '' } };
  let obj = input;
  if (typeof input === 'string') {
    try {
      obj = JSON.parse(input);
    } catch {
      return { requester_service: '', payload: {}, response: { answer: '' } };
    }
  }
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return { requester_service: '', payload: {}, response: { answer: '' } };
  }
  return obj;
}

export function stringifyEnvelope(envelope) {
  try {
    return JSON.stringify(envelope);
  } catch {
    return '{}';
  }
}

export function normalizeEnvelope(envelope) {
  const out = envelope && typeof envelope === 'object' ? { ...envelope } : {};
  const requester = (out.requester_service || out.requester || '').toString();
  const payloadIn = out.payload;
  const payload =
    payloadIn && typeof payloadIn === 'object'
      ? { ...payloadIn }
      : (() => {
          if (typeof payloadIn === 'string') {
            try { return JSON.parse(payloadIn); } catch { return {}; }
          }
          return {};
        })();
  const responseIn = out.response;
  const response =
    responseIn && typeof responseIn === 'object' ? { ...responseIn } : { answer: '' };
  if (response.answer == null) response.answer = '';

  const reqLower = requester.toLowerCase();
  if (!payload.action) {
    if (reqLower.includes('skills')) payload.action = 'start-baseline-exam';
    else if (reqLower.includes('course')) payload.action = 'start-postcourse-exam';
  }

  return { requester_service: requester, payload, response };
}


