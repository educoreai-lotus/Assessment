const axios = require('axios');
const { mockEvent, mockSendSummary } = require('../mocks/protocolCameraMock');

function getBaseUrl() {
  const base = process.env.PROTOCOL_CAMERA_BASE_URL;
  if (!base) throw new Error('PROTOCOL_CAMERA_BASE_URL not set');
  return base.replace(/\/+$/, '');
}

async function safeReceiveEvent() {
  try {
    return await mockEvent();
  } catch {
    return mockEvent();
  }
}

async function safeSendSummary(payload) {
  try {
    const base = getBaseUrl();
    const url = `${base}/api/protocol-camera/summary`;
    const body = {
      requester_service: 'assessment',
      payload: JSON.stringify(payload || {}),
      response: JSON.stringify({ status: 'acknowledged' }),
    };
    const { data } = await axios.post(url, body, { timeout: 15000 });
    const raw = data?.response ?? null;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return raw; }
    }
    return raw;
  } catch (err) {
    console.warn('ProtocolCamera send summary failed, using mock. Reason:', err?.message || err);
    return mockSendSummary(payload);
  }
}

module.exports = { safeReceiveEvent, safeSendSummary };


