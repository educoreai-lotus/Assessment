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
    const p = payload || {};
    const uid = p.user_id || null;
    const eid = p.exam_id || null;
    const aid = p.attempt_id || null;
    if (!uid || !eid || !aid) {
      try { console.error('[SUBMIT][SE_PAYLOAD_INVALID]', { user_id: uid, exam_id: eid, attempt_id: aid }); } catch {}
      return null; // never send invalid
    }
    try {
      // eslint-disable-next-line no-console
      console.log('[OUTBOUND][SKILLS_ENGINE][SUBMIT_PAYLOAD]', {
        user_id: uid, exam_id: String(eid), attempt_id: String(aid),
        skills_count: Array.isArray(p.skills) ? p.skills.length : 0,
      });
    } catch {}

    const ret = await sendToCoordinator({ targetService: 'skills-engine', payload: p }).catch(() => ({}));
    let respString;
    if (typeof ret === 'string') respString = ret;
    else if (ret && typeof ret.data === 'string') respString = ret.data;
    else respString = JSON.stringify((ret && ret.data) || {});
    const resp = JSON.parse(respString || '{}');
    return resp?.response?.answer ?? null;
  } catch (err) {
    console.warn('SkillsEngine push results via Coordinator failed. Reason:', err?.message || err);
    return null;
  }
}

module.exports = { safeFetchBaselineSkills, safePushAssessmentResults, normalizeSkillsEngineResponse };


