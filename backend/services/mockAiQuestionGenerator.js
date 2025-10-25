// Mock AI generator: simulates theoretical questions per skill
async function generateQuestionsForSkill(skill) {
	const questionText = `Explain the concept of ${skill.name} and how it applies in real-world scenarios.`;
	return [
		{
			id: `ai-${skill.id}`,
			type: 'theoretical',
			source: 'AI',
			skill: skill.name,
			question: questionText,
			options: [
				'A) Example one',
				'B) Example two',
				'C) Example three',
				'D) Example four',
			],
			expected_answer: 'A',
		},
	];
}

function generateQuestionsForTopics(topic, skills) {
	return (skills || []).map((skill) => ({
		id: `${topic}-${skill}`.toLowerCase().replace(/\s+/g, '-'),
		question: `Explain how ${skill} applies in the context of ${topic}.`,
		type: 'theoretical',
		skill,
		topic,
	}));
}

module.exports = { generateQuestionsForSkill, generateQuestionsForTopics };


