const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api/v1';

export async function buildPostCourseExam(courseId) {
	const res = await fetch(`${API_BASE}/exams/post-course/build?course_id=${courseId}`, {
		headers: {
			Authorization: 'Bearer demo-token',
			'x-user-id': localStorage.getItem('userId') || 'demo-user-1',
		},
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw err;
	}
	return await res.json();
}


