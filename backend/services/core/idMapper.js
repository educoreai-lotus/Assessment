function mapUserId(id) {
  if (typeof id === 'number') return id;
  if (typeof id === 'string') {
    const prefixed = id.match(/^u_(\d+)$/i);
    if (prefixed) return parseInt(prefixed[1], 10);
    const numeric = parseInt(id, 10);
    if (!Number.isNaN(numeric)) return numeric;
  }
  return null;
}

module.exports = { mapUserId };


