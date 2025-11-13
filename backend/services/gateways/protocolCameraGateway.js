const { sendSummaryToProtocolCamera } = require('../integrations/protocolCameraService');
const { mockEvent, mockSendSummary } = require('../mocks/protocolCameraMock');

async function safeReceiveEvent() {
  try {
    return await mockEvent();
  } catch {
    return mockEvent();
  }
}

async function safeSendSummary(payload) {
  try {
    return await sendSummaryToProtocolCamera(payload);
  } catch (err) {
    console.warn('ProtocolCamera send summary failed, using mock. Reason:', err?.message || err);
    return mockSendSummary(payload);
  }
}

module.exports = { safeReceiveEvent, safeSendSummary };


