process.env.NODE_ENV = 'test';

const { buildAIQuery } = require('../../services/aiQuery/aiQueryBuilder');

describe('aiQueryBuilder', () => {
	test('builds envelope with defaults', () => {
		const env = buildAIQuery('read', { table: 'exam_attempts' });
		expect(env.requester_service).toBe('assessment-service');
		expect(env.payload).toEqual({
			action: 'ai_query',
			operation: 'read',
			table: 'exam_attempts',
			criteria: {},
			values: {}
		});
		expect(env.response).toEqual({ rows: [], summary: '' });
	});

	test('includes criteria and values when provided', () => {
		const env = buildAIQuery('update', {
			table: 'exam_attempts',
			criteria: { attempt_id: 1 },
			values: { final_grade: 95.5 }
		});
		expect(env.payload.criteria).toEqual({ attempt_id: 1 });
		expect(env.payload.values).toEqual({ final_grade: 95.5 });
	});
});


