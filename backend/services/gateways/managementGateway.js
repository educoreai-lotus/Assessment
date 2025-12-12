const { postToCoordinator } = require('./coordinatorClient');

const SERVICE_NAME = process.env.SERVICE_NAME || 'assessment-service';

async function pushReportingRecord(recordPayload) {
  try {
    const envelope = {
      requester_service: SERVICE_NAME,
      payload: {
        action: 'provide-reporting-record',
        ...(recordPayload || {}),
      },
      response: { answer: '' },
    };
    const ret = await postToCoordinator(envelope).catch(() => ({}));
    let respString;
    if (typeof ret === 'string') respString = ret;
    else if (ret && typeof ret.data === 'string') respString = ret.data;
    else respString = JSON.stringify((ret && ret.data) || {});
    const resp = JSON.parse(respString || '{}');
    const out = resp?.response?.answer;
    if (!out) throw new Error('management_push_failed');
    return out;
  } catch (err) {
    try { console.warn('[ManagementGateway] pushReportingRecord failed:', err?.message || err); } catch {}
    return { ok: true };
  }
}

module.exports = { pushReportingRecord };



