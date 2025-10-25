module.exports = {
	async getPostCoursePolicy({ userId }) {
		return {
			passing_grade: 70,
			max_attempts: 3,
			retry_cooldown_hours: 24,
		};
	},
};


