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

// Normalize Skills Engine coordinator response into a consistent shape.
// Returns: { competency_name?: string, skills: Array<{ skill_id, skill_name }> }
function normalizeSkillsEngineResponse(body) {
  try {
    const out = { skills: [] };
    if (!body || typeof body !== 'object') return out;
    const response = body.response && typeof body.response === 'object' ? body.response : {};
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};

    // Try direct skills
    let skills = Array.isArray(response.skills) ? response.skills : null;

    // Try response.data.skills
    if (!skills && response.data && typeof response.data === 'object' && Array.isArray(response.data.skills)) {
      skills = response.data.skills;
    }

    // Try response.answer JSON string
    if (!skills && typeof response.answer === 'string') {
      try {
        const ans = JSON.parse(response.answer);
        if (ans && typeof ans === 'object') {
          if (Array.isArray(ans.skills)) skills = ans.skills;
          else if (ans.data && Array.isArray(ans.data.skills)) skills = ans.data.skills;
          else if (ans.response && Array.isArray(ans.response.skills)) skills = ans.response.skills;
          if (typeof ans.competency_name === 'string' && !out.competency_name) out.competency_name = ans.competency_name;
        }
      } catch {
        // ignore parse error
      }
    }

    // Fallback: payload.skills
    if (!skills && Array.isArray(payload.skills)) {
      skills = payload.skills;
    }

    // competency_name passthrough
    if (typeof response.competency_name === 'string') out.competency_name = response.competency_name;
    if (!out.competency_name && typeof payload.competency_name === 'string') out.competency_name = payload.competency_name;

    // Normalize items
    const norm = [];
    for (const s of Array.isArray(skills) ? skills : []) {
      if (s == null) continue;
      if (typeof s === 'string') {
        const id = s.trim();
        if (id) norm.push({ skill_id: id, skill_name: id });
        continue;
      }
      if (typeof s === 'object') {
        const sid = String(s.skill_id || s.id || '').trim();
        const sname = String(s.skill_name || s.name || sid).trim();
        if (sid) norm.push({ skill_id: sid, skill_name: sname || sid });
      }
    }
    out.skills = norm;
    return out;
  } catch (e) {
    try { console.warn('[SKILLS_ENGINE][NORMALIZE][WARN]', e?.message || e); } catch {}
    return { skills: [] };
  }
}

async function safeFetchBaselineSkills(params) {
  const t0 = Date.now();
  try {
    const userOriginal = params?.user_id ?? params?.userId ?? params?.user ?? null;
    // Allow request to proceed even if user_id is not a UUID (upstream may still accept or map)

    const payload = buildSkillsEngineFetchBaselinePayload(params || {});
    try {
      // eslint-disable-next-line no-console
      console.log('[OUTBOUND][COORDINATOR][SKILLS_ENGINE][FETCH_SKILLS][REQUEST_PAYLOAD]', {
        payload_keys: Object.keys(payload || {}),
      });
    } catch {}
    const ret = await sendToCoordinator({ targetService: 'skills-engine', payload }).catch((err) => {
      try { console.log('[SKILLS_ENGINE][FALLBACK_USED]', { reason: 'request_rejected', message: err?.message }); } catch {}
      return {};
    });
    let respString;
    if (typeof ret === 'string') respString = ret;
    else if (ret && typeof ret.data === 'string') respString = ret.data;
    else respString = JSON.stringify((ret && ret.data) || {});
    const resp = JSON.parse(respString || '{}');

    const normalized = normalizeSkillsEngineResponse(resp);
    try { console.log('[SKILLS_ENGINE][SUCCESS]', { elapsed_ms: Date.now() - t0 }); } catch {}
    return { user_id: params?.user_id ?? null, skills: normalized.skills || [] };
  } catch (err) {
    try { console.log('[SKILLS_ENGINE][FALLBACK_USED]', { reason: err?.message || 'unknown_error' }); } catch {}
    console.warn('SkillsEngine baseline fetch via Coordinator failed. Reason:', err?.message || err);
    return { user_id: params?.user_id ?? null, skills: [] };
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

module.exports = { safeFetchBaselineSkills, safePushAssessmentResults, normalizeSkillsEngineResponse };


