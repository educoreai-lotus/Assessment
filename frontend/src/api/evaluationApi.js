export const API_BASE_URL = "https://assessment-tests-production.up.railway.app/api/v1";

export async function submitBaselineExam({ userId = 'demo-user', answers, questions, passingGrade = 70 }) {
  const url = `${API_BASE_URL}/exams/baseline/submit`;
  console.log('🔗 Fetching from', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer demo-token',
    },
    body: JSON.stringify({ user_id: userId, answers, questions, passing_grade: passingGrade }),
  });
  if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
  return res.json();
}

export async function buildBaselineExam() {
  const url = `${API_BASE_URL}/exams/baseline/build`;
  console.log('🔗 Fetching from', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer demo-token',
    },
  });
  if (!res.ok) throw new Error(`Build failed: ${res.status}`);
  return res.json();
}


