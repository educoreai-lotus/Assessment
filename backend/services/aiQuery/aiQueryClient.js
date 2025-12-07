const { postToCoordinator } = require("../gateways/coordinatorClient");

async function sendAIQuery(envelope) {
	return await postToCoordinator(envelope);
}

module.exports = { sendAIQuery };


