import { httpClient } from './httpClient';

export const healthService = {
	async getHealth() {
		const { data } = await httpClient.get('/health');
		return data;
	},
	async getPostgres() {
		const { data } = await httpClient.get('/health/postgres');
		return data;
	},
	async getMongo() {
		const { data } = await httpClient.get('/health/mongo');
		return data;
	},
};


