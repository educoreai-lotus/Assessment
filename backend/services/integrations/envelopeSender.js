const { postToCoordinator } = require('../gateways/coordinatorClient');

async function sendToCoordinator({ targetService, payload, requester = (process.env.SERVICE_NAME || 'assessment-service') }) {
  const envelope = {
    requester_service: requester,
    payload: payload || {},
    response: { answer: '' },
    // include both snake_case and camelCase to satisfy different coordinator parsers
    target_service: targetService || undefined,
    targetService: targetService || undefined,
  };
  try {
    console.log('[OUTBOUND][ENVELOPE][SEND]', {
      target: targetService || 'unknown',
      targetService: targetService || 'unknown',
      requester,
      action: String(envelope.payload?.action || ''),
      keys: Object.keys(envelope.payload || {}),
    });
  } catch {}

  // Hard timeout guard at the sender level (upper bound). DevLab defaults to 60s.
  const hardTimeoutMs = (() => {
    if (String(targetService) === 'devlab-service') {
      const v = Number(process.env.DEVLAB_REQUEST_TIMEOUT_MS);
      return Number.isFinite(v) && v > 0 ? v : 60000;
    }
    const v = Number(process.env.COORDINATOR_TIMEOUT_MS);
    return Number.isFinite(v) && v > 0 ? v : 60000;
  })();
  const __t0 = Date.now();
  try {
    console.log('[COORD][SEND][START]', { target: targetService || 'unknown', timeout_ms: hardTimeoutMs });
  } catch {}

  const coreCall = postToCoordinator(envelope, targetService);
  let ret;
  try {
    ret = await Promise.race([
      coreCall,
      new Promise((_, reject) => setTimeout(() => reject(new Error(String(targetService) === 'devlab-service' ? 'DevLabTimeout' : 'CoordinatorTimeout')), hardTimeoutMs)),
    ]);
  } catch (err) {
    try { console.log('[COORD][SEND][TIMEOUT]', { target: targetService || 'unknown', elapsed_ms: Date.now() - __t0, message: String(err?.message || '') }); } catch {}
    throw err;
  }

  try {
    const status = ret?.resp?.status;
    const ok = !!ret?.resp?.ok;
    console.log('[COORD][SEND][STATUS]', { target: targetService || 'unknown', status, ok, elapsed_ms: Date.now() - __t0 });
  } catch {}

  // Normalize DevLab envelopes BEFORE logging, so logs don't show escaped JSON strings
  try {
    if (targetService === 'devlab-service' && ret && ret.data) {
      const body = ret.data;
      const ans = body?.response?.answer;
      let parsed = ans;
      let raw = null;
      if (typeof ans === 'string') {
        raw = ans;
        try {
          parsed = JSON.parse(ans);
          // If still string, parse once more (double-encoded)
          if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch {}
          }
        } catch { /* leave parsed as original string */ }
      }
      const answerObj = parsed && typeof parsed === 'object' ? parsed : null;
      const normalized = {
        ...body,
        response: {
          ...(body.response || {}),
          answer: answerObj ?? body?.response?.answer,
          answerRaw: raw || undefined,
        },
        // Promote for downstream consumers
        questions: Array.isArray(answerObj?.questions) ? answerObj.questions : (Array.isArray(body?.questions) ? body.questions : []),
        componentHtml: typeof answerObj?.componentHtml === 'string'
          ? answerObj.componentHtml
          : (typeof answerObj?.componentHTML === 'string'
            ? answerObj.componentHTML
            : (typeof answerObj?.component_html === 'string' ? answerObj.component_html : (typeof answerObj?.html === 'string' ? answerObj.html : null))),
        metadata: answerObj?.metadata || body?.metadata || null,
      };
      // Attach normalized to data for callers who want it
      try { ret.data._normalized = normalized; } catch {}

      // Log normalized snapshot (counts/lengths)
      try {
        console.log('[OUTBOUND][NORMALIZED_RESPONSE]', {
          targetService,
          action: String(envelope.payload?.action || ''),
          questionsCount: Array.isArray(normalized.questions) ? normalized.questions.length : 0,
          componentHtmlLen: normalized.componentHtml ? String(normalized.componentHtml).length : 0,
        });
      } catch {}
    }
  } catch {}

  // Fallback: still keep a small snapshot of the raw data for non-DevLab or debugging
  try {
    console.log('[COORD][SEND][PARSED]', { target: targetService || 'unknown', keys: ret && ret.data ? Object.keys(ret.data) : [] });
    let respString;
    if (typeof ret === 'string') respString = ret;
    else if (ret && typeof ret.data === 'string') respString = ret.data;
    else respString = JSON.stringify((ret && ret.data) || {});
    const snap = respString && respString.length > 2000 ? (respString.slice(0, 2000) + '…[truncated]') : respString;
    console.log('[OUTBOUND][ENVELOPE][RESPONSE_SNAPSHOT]', snap);
  } catch {}
  return ret;
}

module.exports = { sendToCoordinator };


