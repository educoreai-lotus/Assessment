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
    const envelope = {
      service_requester: 'Assessment',
      payload: payload || {},
      response: {},
    };
    const { data } = await axios.post(url, envelope, { timeout: 15000 });
    return data;
  } catch (err) {
    console.warn('ProtocolCamera send summary failed, using mock. Reason:', err?.message || err);
    return mockSendSummary(payload);
  }
}

module.exports = { safeReceiveEvent, safeSendSummary };


