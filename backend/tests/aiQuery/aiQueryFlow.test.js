process.env.NODE_ENV = 'test';

jest.mock('../../services/aiQuery/aiQueryClient', () => ({
	sendAIQuery: jest.fn().mockResolvedValue({ data: { ok: true, echo: true } })
}));

jest.mock('../../services/aiQuery/aiDbExecutor', () => ({
	applyDbOperation: jest.fn().mockResolvedValue({ rowCount: 1 })
}));

const { sendAIQuery } = require('../../services/aiQuery/aiQueryClient');
const { applyDbOperation } = require('../../services/aiQuery/aiDbExecutor');
const { runAIQueryAndApply } = require('../../services/aiQuery/aiQueryService');

describe('AI Query Flow', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('runs read without DB mutation', async () => {
		const res = await runAIQueryAndApply('read', { table: 'exam_attempts', criteria: { attempt_id: 1 } });
		expect(sendAIQuery).toHaveBeenCalledTimes(1);
		expect(applyDbOperation).not.toHaveBeenCalled();
		expect(res).toEqual({
			success: true,
			coordinatorResponse: { ok: true, echo: true },
			dbUpdate: null
		});
	});

	test('runs insert with DB mutation', async () => {
		const res = await runAIQueryAndApply('insert', {
			table: 'exam_attempts',
			criteria: {},
			values: { exam_id: 1, attempt_no: 1 }
		});
		expect(sendAIQuery).toHaveBeenCalledTimes(1);
		expect(applyDbOperation).toHaveBeenCalledWith(
			'insert',
			'exam_attempts',
			{},
			{ exam_id: 1, attempt_no: 1 }
		);
		expect(res.success).toBe(true);
		expect(res.coordinatorResponse).toEqual({ ok: true, echo: true });
		expect(res.dbUpdate).toEqual({ rowCount: 1 });
	});
});


