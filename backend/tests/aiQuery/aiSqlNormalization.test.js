process.env.NODE_ENV = 'test';

const { normalizeAISQL } = require('../../services/aiQuery/aiDbExecutor');

describe('normalizeAISQL - status alias handling', () => {
	test('replaces ea.status in SELECT/WHERE/ORDER BY with CASE and AS status', () => {
		const input = `
      SELECT ea.status, ea.final_grade
      FROM exam_attempts ea
      WHERE ea.status = 'passed'
      ORDER BY status DESC
    `;
		const out = normalizeAISQL(input);
		expect(out.toLowerCase()).not.toContain('ea.status');
		// SELECT should contain AS status
		expect(out).toMatch(/SELECT[\s\S]+AS status[\s\S]+FROM/i);
		// WHERE has CASE expression
		expect(out).toMatch(/WHERE[\s\S]+CASE[\s\S]+END\s*=\s*'passed'/i);
		// ORDER BY has CASE expression (no bare status)
		expect(out.toLowerCase()).not.toMatch(/\border\s+by\s+status\b/);
	});

	test('replaces plain status aliases (status, exam_status, attempt_status, state)', () => {
		const input = `
      SELECT status, exam_status, attempt_status, state
      FROM exam_attempts
      WHERE status <> 'failed'
      GROUP BY status
    `;
		const out = normalizeAISQL(input);
		expect(out.toLowerCase()).not.toContain(' exam_status');
		expect(out.toLowerCase()).not.toContain(' attempt_status');
		expect(out.toLowerCase()).not.toContain(' state\n');
		// All select aliases turned into CASE ... AS status (at least once)
		expect(out).toMatch(/AS status/);
		// WHERE and GROUP BY replaced with CASE
		expect(out).toMatch(/WHERE[\s\S]+CASE[\s\S]+END\s*<>\s*'failed'/i);
		expect(out).toMatch(/GROUP\s+BY[\s\S]+CASE[\s\S]+END/i);
	});

	test('prefers ea.passed when alias present; uses passed otherwise', () => {
		const withEa = `SELECT status FROM exam_attempts ea WHERE status='in_progress'`;
		const outEa = normalizeAISQL(withEa);
		expect(outEa).toContain("ea.passed");

		const noEa = `SELECT status FROM exam_attempts WHERE status='in_progress'`;
		const outNoEa = normalizeAISQL(noEa);
		expect(outNoEa).toContain("CASE WHEN passed");
		expect(outNoEa).not.toContain("ea.passed");
	});

	test('never leaves table-qualified .status tokens', () => {
		const input = `SELECT ea.status FROM exam_attempts ea`;
		const out = normalizeAISQL(input);
		expect(out.toLowerCase()).not.toContain('ea.status');
	});
}); 

describe('normalizeAISQL - baseline/postcourse inference', () => {
	test('status inference works regardless of exam type references', () => {
		const baseline = `
      SELECT status, final_grade FROM exam_attempts ea
      WHERE exam_type = 'baseline' AND status = 'passed'
    `;
		const postcourse = `
      SELECT status, final_grade FROM exam_attempts ea
      WHERE exam_type = 'postcourse' AND status <> 'failed'
    `;
		const outBase = normalizeAISQL(baseline);
		const outPost = normalizeAISQL(postcourse);
		// Both should contain CASE-based status and no ea.status
		for (const out of [outBase, outPost]) {
			expect(out).toMatch(/AS status/);
			expect(out).toMatch(/CASE[\s\S]+ea\.passed[\s\S]+END/);
			expect(out.toLowerCase()).not.toContain('ea.status');
		}
	});
});



