import { httpClient } from './httpClient';

export const assessmentService = {
	async postIntegration(apiCaller, payloadObj) {
		const body = {
			api_caller: apiCaller,
			stringified_json: JSON.stringify(payloadObj || {}),
		};
		const { data } = await httpClient.post('/api/assessment/integration', body);
		return data;
	},

	async getIntegration(apiCaller, payloadObj) {
		const params = {
			api_caller: apiCaller,
			stringified_json: JSON.stringify(payloadObj || {}),
		};
		const { data } = await httpClient.get('/api/assessment/integration', { params });
		return data;
	},
};


