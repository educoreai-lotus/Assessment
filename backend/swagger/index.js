const fs = require('fs');
const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerDir = path.join(__dirname);
const swaggerOutFile = path.join(swaggerDir, 'swagger.json');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Assessment Microservice API',
      version: '1.0.0',
      description: 'Auto-generated API docs for Assessment integrations',
    },
    servers: [{ url: '/' }],
  },
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../controllers/*.js'),
  ],
};

const swaggerSpec = swaggerJSDoc(options);

function writeSpecFile() {
  try {
    if (!fs.existsSync(swaggerDir)) {
      fs.mkdirSync(swaggerDir, { recursive: true });
    }
    fs.writeFileSync(swaggerOutFile, JSON.stringify(swaggerSpec, null, 2));
  } catch (e) {
    // Non-fatal
    // eslint-disable-next-line no-console
    console.error('Failed to write swagger.json:', e.message);
  }
}

function mountSwagger(app) {
  writeSpecFile();
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

module.exports = { mountSwagger, swaggerSpec };


