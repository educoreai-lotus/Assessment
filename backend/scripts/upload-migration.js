'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios').default;

const COORDINATOR_BASE = 'https://coordinator-production-e0a0.up.railway.app';
const DEFAULT_ENDPOINT = 'https://assessment-tests-production.up.railway.app';

async function registerService() {
  const endpoint = process.env.RAILWAY_BACKEND_URL || DEFAULT_ENDPOINT;
  const payload = {
    serviceName: 'assessment-service',
    version: '1.0.0',
    endpoint,
    healthCheck: '/health',
    description: 'Assessment microservice responsible for exams and grading',
  };

  const url = `${COORDINATOR_BASE}/register`;
  const { data } = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  });
  return data;
}

async function uploadMigration(serviceId) {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const encPath = path.join(migrationsDir, 'assessment-db.json.enc');
  const fileRaw = fs.readFileSync(encPath, 'utf8');
  const migrationJson = JSON.parse(fileRaw);

  const url = `${COORDINATOR_BASE}/register/${encodeURIComponent(serviceId)}/migration`;
  const payload = {
    migrationFile: migrationJson,
  };
  const { data } = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  });
  return data;
}

async function main() {
  try {
    const registration = await registerService();
    const serviceId = registration.serviceId || registration.id || registration.service?.id;

    if (!serviceId) {
      throw new Error('Coordinator did not return a serviceId');
    }

    const migrationResp = await uploadMigration(serviceId);

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
      serviceId,
      uploadStatus: 'ok',
      coordinatorRegistration: registration,
      coordinatorMigrationResponse: migrationResp,
    }, null, 2));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({
      uploadStatus: 'error',
      error: err.message,
      stack: process.env.DEBUG ? err.stack : undefined,
    }));
    process.exit(1);
  }
}

main();


