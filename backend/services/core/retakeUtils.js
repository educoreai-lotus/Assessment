function selectFailedSkillIds(attemptSkills, passingGrade) {
  const pg = Number.isFinite(Number(passingGrade)) ? Number(passingGrade) : 70;
  const failed = new Set();
  for (const s of Array.isArray(attemptSkills) ? attemptSkills : []) {
    const status = String(s?.status || '').toLowerCase();
    const sid = String(s?.skill_id || '').trim();
    const score = Number(s?.score ?? 0);
    if (!sid) continue;
    if (status !== 'acquired' || score < pg) {
      failed.add(sid);
    }
  }
  return failed;
}

module.exports = { selectFailedSkillIds };


