const express = require('express');
const router = express.Router();

const integrationController = require('../controllers/integrationController');

// Phase 08.6 – Universal Integration Endpoint
// All inbound integrations use this single endpoint.
router.post('/fill-content-metrics', integrationController.universalIntegrationHandler);

module.exports = router;


