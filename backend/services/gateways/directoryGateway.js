const { mockFetchPolicy, mockPushExamResults } = require('../mocks/directoryMock');
const { sendToCoordinator } = require('../integrations/envelopeSender');
const { buildDirectoryPolicyPayload, buildDirectoryResultPayload } = require('../integrations/payloadBuilders/directory.payload');
const SERVICE_NAME = process.env.SERVICE_NAME || 'assessment-service';

async function fetchPolicy(examType, userId, courseId) {
  const payload = buildDirectoryPolicyPayload({ exam_type: examType, user_id: userId, course_id: courseId });
  try {
    // Log outbound contract for diagnostics
    try {
      // eslint-disable-next-line no-console
      console.log('[DIRECTORY][POLICY][REQUEST]', {
        targetService: 'directory-service',
        route: payload?.route || null,
        payloadKeys: Object.keys(payload || {}),
      });
    } catch {}

    const ret = await sendToCoordinator({ targetService: 'directory-service', payload });

    // Inspect coordinator routing if present
    try {
      const routedTo = (ret && (ret.routed || ret.target_service || (ret.data && (ret.data.routed || ret.data.target_service)))) || null;
      // eslint-disable-next-line no-console
      console.log('[DIRECTORY][POLICY][ROUTED]', { routedTo, responseKeys: ret && ret.data ? Object.keys(ret.data) : [] });
    } catch {}

    let respString;
    if (typeof ret === 'string') respString = ret;
    else if (ret && typeof ret.data === 'string') respString = ret.data;
    else respString = JSON.stringify((ret && ret.data) || {});
    const resp = JSON.parse(respString || '{}');
    const out = resp?.response?.answer;
    if (!out) throw new Error('directory_fetch_policy_failed');

    // Detect misroute: analytics-like payloads should not be treated as policy
    if (out && typeof out === 'object') {
      const looksLikeAnalytics = ('entries' in out) || ('report_name' in out);
      if (looksLikeAnalytics) {
        try {
          // eslint-disable-next-line no-console
          console.error('[DIRECTORY][POLICY][MISROUTE]', { receivedKeys: Object.keys(out || {}), note: 'Analytics payload detected for policy request' });
        } catch {}
        throw new Error('directory_policy_misroute');
      }
      // Validate required fields by exam type
      const isBaseline = String(examType) === 'baseline';
      if (isBaseline) {
        if (typeof out.passing_grade !== 'number') {
          try { console.error('[DIRECTORY][POLICY][INVALID_SHAPE]', { examType, received: out }); } catch {}
          throw new Error('directory_policy_invalid_shape');
        }
      } else if (String(examType) === 'postcourse') {
        if (typeof out.passing_grade !== 'number' || typeof out.max_attempts !== 'number') {
          try { console.error('[DIRECTORY][POLICY][INVALID_SHAPE]', { examType, received: out }); } catch {}
          throw new Error('directory_policy_invalid_shape');
        }
      }
    }

    return out;
  } catch (err) {
    // Re-throw to allow safeFetchPolicy to apply the correct fallback per exam type
    throw err;
  }
}

// Backward-compatible safe wrapper
async function safeFetchPolicy(examType) {
  try {
    return await fetchPolicy(examType, undefined, undefined);
  } catch (err) {
    try { console.log('[MOCK-FALLBACK][Directory][policy]', { examType, reason: err?.message }); } catch {}
    // Hard fallback with explicit architectural logging for baseline/postcourse
    if (String(examType) === 'baseline') {
      try {
        // eslint-disable-next-line no-console
        console.warn('[BASELINE][POLICY][FALLBACK] passing_grade=70 (directory unavailable)');
      } catch {}
    } else if (String(examType) === 'postcourse') {
      try {
        // eslint-disable-next-line no-console
        console.warn('[POSTCOURSE][POLICY][FALLBACK] {"passing_grade":70,"max_attempts":3} (directory unavailable)');
      } catch {}
    }
    return mockFetchPolicy(examType);
  }
}

// Optional push to Directory (kept for compatibility); now via Coordinator envelope
async function safePushExamResults(payload) {
  try {
    const shaped = buildDirectoryResultPayload(payload || {});
    const ret = await sendToCoordinator({ targetService: 'directory', payload: shaped });
    let respString;
    if (typeof ret === 'string') respString = ret;
    else if (ret && typeof ret.data === 'string') respString = ret.data;
    else respString = JSON.stringify((ret && ret.data) || {});
    const resp = JSON.parse(respString || '{}');
    const out = resp?.response?.answer;
    if (!out) throw new Error('directory_push_results_failed');
    return out;
  } catch (err) {
    console.warn('Directory pushExamResults via Coordinator failed, using mock. Reason:', err?.message || err);
    return mockPushExamResults(payload);
  }
}

module.exports = { fetchPolicy, safeFetchPolicy, safePushExamResults };


