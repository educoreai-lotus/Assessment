// Phase 08.5c – Delegates to gateway; no axios/env here
const { safeSendSummary } = require('../gateways/protocolCameraGateway');

exports.sendSummaryToProtocolCamera = async (payloadObj) => {
  return await safeSendSummary(payloadObj || {});
};


