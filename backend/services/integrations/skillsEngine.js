async function getLearnerSkills(userId) {
	// Mock Skills Engine data
	return [
		{ id: 's1', name: 'JavaScript Basics' },
		{ id: 's2', name: 'React Fundamentals' },
		{ id: 's3', name: 'API Design' },
	];
}

module.exports = { getLearnerSkills };


