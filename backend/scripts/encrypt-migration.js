'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function getKey() {
  const base64Key = process.env.MIGRATION_ENCRYPTION_KEY;
  if (!base64Key) {
    throw new Error('MIGRATION_ENCRYPTION_KEY is not set (expected 32-byte key base64-encoded)');
  }
  let keyBuf;
  try {
    keyBuf = Buffer.from(base64Key, 'base64');
  } catch {
    throw new Error('MIGRATION_ENCRYPTION_KEY is not valid base64');
  }
  if (keyBuf.length !== 32) {
    throw new Error(`MIGRATION_ENCRYPTION_KEY must decode to 32 bytes, got ${keyBuf.length}`);
  }
  return keyBuf;
}

function main() {
  const key = getKey();
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const inputPath = path.join(migrationsDir, 'assessment-db.json');
  const outputPath = path.join(migrationsDir, 'assessment-db.json.enc');

  const plaintext = fs.readFileSync(inputPath);

  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const out = {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };

  fs.writeFileSync(outputPath, JSON.stringify(out, null, 2));
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    message: 'Encrypted migration written',
    outputPath,
    size: ciphertext.length,
  }));
}

try {
  main();
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
}


