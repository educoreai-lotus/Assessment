async function getCourseTopics(course_id = 'demo-course') {
	return [
		{
			name: 'Advanced JavaScript',
			skills: ['Async', 'Promises', 'Error Handling'],
		},
		{
			name: 'React Components',
			skills: ['Hooks', 'State Management', 'Lifecycle'],
		},
		{
			name: 'API Integration',
			skills: ['REST APIs', 'HTTP', 'Error Responses'],
		},
	];
}

module.exports = { getCourseTopics };


