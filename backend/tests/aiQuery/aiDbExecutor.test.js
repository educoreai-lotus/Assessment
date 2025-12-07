process.env.NODE_ENV = 'test';

jest.mock('../../config/supabaseDB', () => ({
	query: jest.fn()
}));

jest.mock('mongoose', () => ({
	connection: {
		db: {}, // truthy flag so executor sees Mongo as available
		collection: jest.fn()
	}
}));

const pool = require('../../config/supabaseDB');
const mongoose = require('mongoose');
const { applyDbOperation } = require('../../services/aiQuery/aiDbExecutor');

describe('aiDbExecutor (Postgres)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('reads from exam_attempts with criteria', async () => {
		pool.query.mockResolvedValueOnce({ rows: [{ attempt_id: 1 }] });
		const result = await applyDbOperation('read', 'exam_attempts', { attempt_id: 1 });
		expect(result.rows).toEqual([{ attempt_id: 1 }]);
		expect(pool.query).toHaveBeenCalled();
		const [sql, params] = pool.query.mock.calls[0];
		expect(sql).toContain('SELECT * FROM "exam_attempts"');
		expect(sql).toContain('WHERE');
		expect(params).toEqual([1]);
	});

	test('update without criteria throws', async () => {
		await expect(
			applyDbOperation('update', 'exam_attempts', {}, { final_grade: 90 })
		).rejects.toThrow(/criteria required/i);
	});
});

describe('aiDbExecutor (Mongo)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('inserts into proctoring_events', async () => {
		const insertOne = jest.fn().mockResolvedValue({ acknowledged: true, insertedId: 'x1' });
		mongoose.connection.collection.mockReturnValue({ insertOne });
		const result = await applyDbOperation('insert', 'proctoring_events', {}, { attempt_id: 'a1', event_type: 'info' });
		expect(insertOne).toHaveBeenCalledWith({ attempt_id: 'a1', event_type: 'info' });
		expect(result).toEqual({ acknowledged: true, insertedId: 'x1' });
	});

	test('delete without criteria throws', async () => {
		await expect(
			applyDbOperation('delete', 'proctoring_events', {}, {})
		).rejects.toThrow(/criteria required/i);
	});
});


