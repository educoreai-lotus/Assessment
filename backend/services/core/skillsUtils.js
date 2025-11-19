function normalizeSkills(input) {
  const out = [];
  const seen = new Set();
  const arr = Array.isArray(input) ? input : [];
  for (const s of arr) {
    let id = null;
    let name = null;
    if (typeof s === 'string') {
      id = s.trim();
      name = s.trim();
    } else if (s && typeof s === 'object') {
      id = String(s.skill_id || s.id || s.skill || s.skill_name || '').trim();
      name = String(s.skill_name || s.name || id || '').trim();
      if (!name && id) name = id;
    }
    if (!id) continue;
    const key = id.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ skill_id: id, skill_name: name || id });
  }
  return out;
}

module.exports = { normalizeSkills };


