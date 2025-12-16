const { postToCoordinator } = require('../gateways/coordinatorClient');

async function sendToCoordinator({ targetService, payload, requester = (process.env.SERVICE_NAME || 'assessment-service') }) {
  const envelope = {
    requester_service: requester,
    payload: payload || {},
    response: { answer: '' },
  };
  try {
    console.log('[OUTBOUND][ENVELOPE][SEND]', {
      target: targetService || 'unknown',
      requester,
      action: String(envelope.payload?.action || ''),
      keys: Object.keys(envelope.payload || {}),
    });
  } catch {}
  const ret = await postToCoordinator(envelope).catch(() => ({}));
  let respString;
  if (typeof ret === 'string') respString = ret;
  else if (ret && typeof ret.data === 'string') respString = ret.data;
  else respString = JSON.stringify((ret && ret.data) || {});
  try {
    const snap = respString && respString.length > 2000 ? (respString.slice(0, 2000) + '…[truncated]') : respString;
    console.log('[OUTBOUND][ENVELOPE][RESPONSE_SNAPSHOT]', snap);
  } catch {}
  return ret;
}

module.exports = { sendToCoordinator };


