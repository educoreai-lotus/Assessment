const { buildAIQuery } = require("./aiQueryBuilder");
const { sendAIQuery } = require("./aiQueryClient");
const { applyDbOperation } = require("./aiDbExecutor");

async function runAIQueryAndApply(operation, params) {
	const envelope = buildAIQuery(operation, params);
	const { data } = await sendAIQuery(envelope);

	let dbResult = null;
	if (operation !== "read") {
		dbResult = await applyDbOperation(
			operation,
			params.table,
			params.criteria,
			params.values
		);
	}

	return {
		success: true,
		coordinatorResponse: data,
		dbUpdate: dbResult
	};
}

module.exports = { runAIQueryAndApply };


