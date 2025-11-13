function mapUserId(id) {
  if (typeof id === 'string' && id.startsWith('u_')) {
    return parseInt(id.replace('u_', ''), 10);
  }
  return id;
}

module.exports = { mapUserId };


