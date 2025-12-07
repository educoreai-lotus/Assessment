function buildAIQuery(operation, params) {
	return {
		requester_service: "assessment-service",
		payload: {
			action: "ai_query",
			operation,
			table: params.table,
			criteria: params.criteria || {},
			values: params.values || {}
		},
		response: {
			rows: [],
			summary: ""
		}
	};
}

module.exports = { buildAIQuery };


