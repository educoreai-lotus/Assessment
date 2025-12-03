const crypto = require('crypto');

function buildMessage(serviceName, payload) {
  let message = `educoreai-${serviceName}`;
  if (payload) {
    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    message = `${message}-${payloadHash}`;
  }
  return message;
}

function generateSignature(serviceName, privateKeyPem, payload) {
  if (!serviceName || !privateKeyPem) {
    throw new Error('Missing serviceName or private key for signature');
  }
  const message = buildMessage(serviceName, payload);
  const sign = crypto.createSign('SHA256');
  sign.update(message);
  sign.end();
  return sign.sign(privateKeyPem, 'base64');
}

function verifySignature(serviceName, signature, publicKeyPem, payload) {
  if (!serviceName || !signature || !publicKeyPem) return false;
  const message = buildMessage(serviceName, payload);
  const verify = crypto.createVerify('SHA256');
  verify.update(message);
  verify.end();
  return verify.verify(publicKeyPem, signature, 'base64');
}

module.exports = {
  generateSignature,
  verifySignature,
};


