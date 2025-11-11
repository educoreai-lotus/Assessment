const axios = require('axios');

function getBaseUrl() {
  const base = process.env.PROTOCOL_CAMERA_BASE_URL;
  if (!base) throw new Error('PROTOCOL_CAMERA_BASE_URL not set');
  return base.replace(/\/+$/, '');
}

exports.sendSummaryToProtocolCamera = async (payload) => {
  const base = getBaseUrl();
  const url = `${base}/api/protocol-camera/summary`;
  const { data } = await axios.post(url, payload, { timeout: 10000 });
  return data;
};


