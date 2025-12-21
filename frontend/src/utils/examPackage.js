// Normalize exam package to a common shape used by baseline and post-course
// Returns { questions, coding_questions, devlab_ui }
export function normalizeExamPackage(pkg) {
	// Defensive reads
	const rawQuestions = Array.isArray(pkg?.questions) ? pkg.questions : [];
	const normalizedQuestions = rawQuestions.map((p, idx) => {
		const qTypeRaw = (p?.metadata?.type || p?.type || 'mcq');
		const uiType = qTypeRaw === 'open' ? 'text' : qTypeRaw;
		const text =
			typeof p?.prompt === 'string'
				? p.prompt
				: (p?.prompt?.question || p?.prompt?.stem || '');
		const optsRaw = Array.isArray(p?.options) ? p.options : (Array.isArray(p?.prompt?.choices) ? p.prompt.choices : []);
		const opts = Array.isArray(optsRaw) ? optsRaw.map((o) => (typeof o === 'string' ? o : JSON.stringify(o))) : [];
		return {
			id: p?.question_id || p?.qid || p?.id || String(idx + 1),
			originalId: p?.question_id || p?.qid || p?.id || String(idx + 1),
			type: uiType,
			prompt: text,
			options: opts,
			skill: p?.prompt?.skill_name || p?.skill_name || p?.skill || p?.skill_id || 'General',
			skill_id: p?.skill_id || null,
		};
	});
	const codingQuestions = Array.isArray(pkg?.coding_questions) ? pkg.coding_questions : [];
	const devlabHtml =
		pkg?.devlab_ui?.componentHtml ||
		pkg?.devlabUi?.componentHtml ||
		pkg?.devlab_ui_html ||
		null;
	const devlab_ui = typeof devlabHtml === 'string' && devlabHtml.trim() !== '' ? { componentHtml: devlabHtml } : null;
	return {
		questions: normalizedQuestions,
		coding_questions: codingQuestions,
		devlab_ui,
	};
}


