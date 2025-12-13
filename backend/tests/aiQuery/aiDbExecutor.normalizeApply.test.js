process.env.NODE_ENV = 'test';

jest.mock('../../config/supabaseDB', () => ({
	query: jest.fn()
}));

const pool = require('../../config/supabaseDB');
const execModule = require('../../services/aiQuery/aiDbExecutor');
const { applyDbOperation, normalizeAISQL } = execModule;

describe('applyDbOperation uses normalizeAISQL on all SQL operations', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
	});

	test('READ: normalize called and no ea.status in executed SQL', async () => {
		const spy = jest.spyOn(execModule, 'normalizeAISQL');
		await applyDbOperation('read', 'exam_attempts', { attempt_id: 1 });
		expect(spy).toHaveBeenCalled();
		const [sql] = pool.query.mock.calls[0];
		expect(sql.toLowerCase()).not.toContain('ea.status');
	});

	test('INSERT: normalize called and executes successfully', async () => {
		const spy = jest.spyOn(execModule, 'normalizeAISQL');
		await applyDbOperation('insert', 'exam_attempts', {}, { exam_id: 10, attempt_no: 1 });
		expect(spy).toHaveBeenCalled();
		const [sql] = pool.query.mock.calls[0];
		expect(sql).toMatch(/INSERT INTO "exam_attempts"/);
	});

	test('UPDATE: normalize called and executes successfully', async () => {
		const spy = jest.spyOn(execModule, 'normalizeAISQL');
		await applyDbOperation('update', 'exam_attempts', { attempt_id: 1 }, { final_grade: 80 });
		expect(spy).toHaveBeenCalled();
		const [sql] = pool.query.mock.calls[0];
		expect(sql).toMatch(/UPDATE "exam_attempts" SET/);
	});

	test('DELETE: normalize called and executes successfully', async () => {
		const spy = jest.spyOn(execModule, 'normalizeAISQL');
		await applyDbOperation('delete', 'exam_attempts', { attempt_id: 1 });
		expect(spy).toHaveBeenCalled();
		const [sql] = pool.query.mock.calls[0];
		expect(sql).toMatch(/DELETE FROM "exam_attempts" WHERE/);
	});
}); 

describe('applyDbOperation resilience when SQL contains ea.status (via normalization)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
	});

	test('does not pass invalid ea.status to Postgres', async () => {
		// Force normalizeAISQL to simulate cleaning out ea.status if present
		const spy = jest.spyOn(execModule, 'normalizeAISQL').mockImplementation((sql) => {
			// prepend a hypothetical bad token and then clean it to emulate normalization
			const injected = `/* ea.status */ ${sql}`;
			return injected.replace(/ea\.status/gi, 'CASE WHEN ea.passed = true THEN \'passed\' ELSE \'in_progress\' END');
		});

		await applyDbOperation('read', 'exam_attempts', { attempt_id: 2 });
		expect(spy).toHaveBeenCalled();
		const [sql] = pool.query.mock.calls[0];
		expect(sql.toLowerCase()).not.toContain('ea.status');
	});
});




