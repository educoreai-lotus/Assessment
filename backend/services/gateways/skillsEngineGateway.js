const { mockFetchBaselineSkills, mockPushAssessmentResults } = require('../mocks/skillsEngineMock');
const { sendToCoordinator } = require('../integrations/envelopeSender');
const { buildSkillsEngineFetchBaselinePayload, buildSkillsEngineResultPayload } = require('../integrations/payloadBuilders/skillsEngine.payload');
const SERVICE_NAME = process.env.SERVICE_NAME || 'assessment-service';

function getCoordinatorUrl() {
  const base = process.env.COORDINATOR_URL;
  if (!base) throw new Error('COORDINATOR_URL not set');
  return String(base).replace(/\/+$/, '');
}

function isUuidV1ToV5(value) {
  if (typeof value !== 'string') return false;
  const str = value.trim();
  // UUID v1-v5 regex
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

async function safeFetchBaselineSkills(params) {
  const t0 = Date.now();
  try {
    const userOriginal = params?.user_id ?? params?.userId ?? params?.user ?? null;
    // Fail fast when user_id is not a UUID (Coordinator/Skills Engine requires UUID)
    if (!isUuidV1ToV5(String(userOriginal || ''))) {
      try {
        console.log('[SKILLS_ENGINE][SKIPPED_NON_UUID]', { user_id_original: userOriginal });
      } catch {}
      try {
        console.log('[SKILLS_ENGINE][FALLBACK_USED]', { reason: 'non_uuid_user_id' });
      } catch {}
      return mockFetchBaselineSkills(params || {});
    }

    const payload = buildSkillsEngineFetchBaselinePayload(params || {});
    try {
      // eslint-disable-next-line no-console
      console.log('[OUTBOUND][COORDINATOR][SKILLS_ENGINE][FETCH_SKILLS][REQUEST_PAYLOAD]', {
        payload_keys: Object.keys(payload || {}),
      });
    } catch {}
    const ret = await sendToCoordinator({ targetService: 'skills-engine', payload }).catch((err) => {
      try { console.log('[SKILLS_ENGINE][FALLBACK_USED]', { reason: 'request_rejected' }); } catch {}
      return {};
    });
    let respString;
    if (typeof ret === 'string') respString = ret;
    else if (ret && typeof ret.data === 'string') respString = ret.data;
    else respString = JSON.stringify((ret && ret.data) || {});
    const resp = JSON.parse(respString || '{}');

    // New response format: response contains user_id and a grouped skills object
    // {
    //   response: {
    //     user_id: "user-123",
    //     skills: {
    //       "Category A": [{ skill_id, skill_name }, ...],
    //       "Category B": [...]
    //     }
    //   }
    // }
    const responseBlock = resp?.response || {};
    const grouped = responseBlock?.skills && typeof responseBlock.skills === 'object' ? responseBlock.skills : null;
    let flattenedSkills = [];
    if (grouped && !Array.isArray(grouped)) {
      for (const [_, arr] of Object.entries(grouped)) {
        if (Array.isArray(arr)) {
          for (const s of arr) {
            const sid = typeof s?.skill_id === 'string' ? s.skill_id : String(s?.skill_id || '');
            const sname = typeof s?.skill_name === 'string' ? s.skill_name : String(s?.skill_name || sid);
            if (sid) flattenedSkills.push({ skill_id: sid, skill_name: sname || sid });
          }
        }
      }
    }
    const hasNew = Array.isArray(flattenedSkills) && flattenedSkills.length > 0;

    // Legacy support: response.answer as array/object
    const answer = resp?.response?.answer;
    const isEmptyObject = answer && typeof answer === 'object' && !Array.isArray(answer) && Object.keys(answer).length === 0;
    const isEmptyArray = Array.isArray(answer) && answer.length === 0;

    if (!hasNew && (!answer || isEmptyObject || isEmptyArray)) {
      try { console.log('[MOCK-FALLBACK][SkillsEngine][baseline-skills]', { hasParams: !!params }); } catch {}
      return mockFetchBaselineSkills(params || {});
    }

    // Normalize output to { user_id, skills: [{ skill_id, skill_name }] }
    if (hasNew) {
      const user_id = responseBlock?.user_id ?? params?.user_id ?? null;
      try {
        console.log('[OUTBOUND][COORDINATOR][SKILLS_ENGINE][FETCH_SKILLS][SUCCESS][GROUPED]', {
          categories: Object.keys(grouped || {}).length,
          total_skills: flattenedSkills.length,
        });
        console.log('[SKILLS_ENGINE][SUCCESS]', { elapsed_ms: Date.now() - t0 });
      } catch {}
      return { user_id, skills: flattenedSkills };
    }

    // Legacy normalization: if answer is array of skills already
    try {
      console.log('[OUTBOUND][COORDINATOR][SKILLS_ENGINE][FETCH_SKILLS][SUCCESS][LEGACY]', {
        received_type: Array.isArray(answer) ? 'array' : (answer && typeof answer),
        count: Array.isArray(answer) ? answer.length : undefined,
      });
    } catch {}
    return { user_id: params?.user_id ?? null, skills: Array.isArray(answer) ? answer : [] };
  } catch (err) {
    try { console.log('[SKILLS_ENGINE][FALLBACK_USED]', { reason: err?.message || 'unknown_error' }); } catch {}
    console.warn('SkillsEngine baseline fetch via Coordinator failed, using mock. Reason:', err?.message || err);
    return mockFetchBaselineSkills(params || {});
  }
}

async function safePushAssessmentResults(payload) {
  try {
    const shaped = buildSkillsEngineResultPayload(payload || {});
    try {
      const reqStr = (() => { try { return JSON.stringify(envelope.payload); } catch { return String(envelope.payload); } })();
      const reqSnap = reqStr && reqStr.length > 1500 ? (reqStr.slice(0, 1500) + '…[truncated]') : reqStr;
      // eslint-disable-next-line no-console
      console.log('[OUTBOUND][COORDINATOR][SKILLS_ENGINE][PUSH_RESULTS][REQUEST_PAYLOAD]', reqSnap);
    } catch {}
    const ret = await sendToCoordinator({ targetService: 'skills-engine', payload: shaped }).catch(() => ({}));
    let respString;
    if (typeof ret === 'string') respString = ret;
    else if (ret && typeof ret.data === 'string') respString = ret.data;
    else respString = JSON.stringify((ret && ret.data) || {});
    const resp = JSON.parse(respString || '{}');
    const answer = resp?.response?.answer;
    const isEmptyObject = answer && typeof answer === 'object' && !Array.isArray(answer) && Object.keys(answer).length === 0;
    const isEmptyArray = Array.isArray(answer) && answer.length === 0;
    if (!answer || isEmptyObject || isEmptyArray) {
      try { console.log('[MOCK-FALLBACK][SkillsEngine][push-results]', { hasPayload: !!payload }); } catch {}
      return mockPushAssessmentResults(payload);
    }
    try {
      // eslint-disable-next-line no-console
      console.log('[OUTBOUND][COORDINATOR][SKILLS_ENGINE][PUSH_RESULTS][SUCCESS]', {
        request_summary: {
          user_id: payload?.user_id ?? null,
          exam_type: payload?.exam_type ?? null,
          skills: Array.isArray(payload?.skills) ? payload.skills.length : 0,
        },
        answer_type: answer && typeof answer,
      });
      const bodyStr = (() => { try { return JSON.stringify(answer); } catch { return String(answer); } })();
      const snapshot = bodyStr && bodyStr.length > 1500 ? (bodyStr.slice(0, 1500) + '…[truncated]') : bodyStr;
      console.log('[OUTBOUND][COORDINATOR][SKILLS_ENGINE][PUSH_RESULTS][RESPONSE_BODY]', snapshot);
    } catch {}
    return answer;
  } catch (err) {
    console.warn('SkillsEngine push results via Coordinator failed, using mock. Reason:', err?.message || err);
    return mockPushAssessmentResults(payload);
  }
}

module.exports = { safeFetchBaselineSkills, safePushAssessmentResults };


