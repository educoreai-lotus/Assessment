const API_BASE = import.meta.env.VITE_API_BASE || 'https://assessment-tests-production.up.railway.app/api/v1';

export async function submitPostCourseExam(payload) {
	const res = await fetch(`${API_BASE}/exams/post-course/submit`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Bearer demo-token',
			'x-user-id': localStorage.getItem('userId') || 'demo-user-1'
		},
		body: JSON.stringify(payload)
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw err;
	}
	return await res.json();
}


