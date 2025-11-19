function computeRemainingSeconds(expiresAtIso) {
  if (!expiresAtIso) return null;
  const exp = new Date(String(expiresAtIso)).getTime();
  if (!Number.isFinite(exp)) return null;
  const now = Date.now();
  const diff = Math.floor((exp - now) / 1000);
  return diff >= 0 ? diff : 0;
}

function isExpired(expiresAtIso) {
  if (!expiresAtIso) return false;
  const exp = new Date(String(expiresAtIso)).getTime();
  if (!Number.isFinite(exp)) return false;
  return Date.now() > exp;
}

module.exports = { computeRemainingSeconds, isExpired };


