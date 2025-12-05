'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios').default;

const COORDINATOR_URL = process.env.COORDINATOR_URL;
const SERVICE_NAME = process.env.SERVICE_NAME || 'assessment-service';
const ENDPOINT = process.env.RAILWAY_BACKEND_URL; // Your deployed backend

if (!COORDINATOR_URL) {
  console.error('ERROR: COORDINATOR_URL env variable is missing');
  process.exit(1);
}

if (!ENDPOINT) {
  console.error('ERROR: RAILWAY_BACKEND_URL env variable is missing');
  process.exit(1);
}

async function registerService() {
  const payload = {
    serviceName: SERVICE_NAME,
    version: "1.0.0",
    endpoint: ENDPOINT,
    healthCheck: "/health",
    description: "Assessment microservice for exams, grading, and proctoring"
  };
  const { data } = await axios.post(
    `${COORDINATOR_URL}/register`,
    payload,
    { headers: { "Content-Type": "application/json" } }
  );
  return data;
}

async function uploadMigration(serviceId) {
  const filePath = path.join(__dirname, "..", "migrations", "assessment-migration.json");
  const migrationFile = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const { data } = await axios.post(
    `${COORDINATOR_URL}/register/${serviceId}/migration`,
    { migrationFile },
    { headers: { "Content-Type": "application/json" } }
  );
  return data;
}

async function main() {
  try {
    console.log("Registering service...");
    const registration = await registerService();
    const serviceId = registration.serviceId || registration.id;
    if (!serviceId) {
      throw new Error("Coordinator did not return a serviceId");
    }
    console.log("Uploading migration file...");
    const migration = await uploadMigration(serviceId);
    console.log(JSON.stringify({
      serviceId,
      registration,
      migration
    }, null, 2));
  } catch (err) {
    console.error("Migration upload failed:", err.message);
    process.exit(1);
  }
}

main();


