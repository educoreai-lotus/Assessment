async function getDevLabQuestions(skill) {
	// Mock DevLab coding questions
	return [
		{
			id: `dev-${skill.id}`,
			type: 'coding',
			source: 'DevLab',
			skill: skill.name,
			question: `Write a short code example demonstrating ${skill.name}.`,
			expected_answer: 'Code sample string',
		},
	];
}

module.exports = { getDevLabQuestions };


