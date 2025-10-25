export async function submitBaselineExam({ userId = 'demo-user', answers, questions, passingGrade = 70 }) {
  const res = await fetch('https://assessment-tests-production.up.railway.app/api/v1/exams/baseline/submit', {
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


