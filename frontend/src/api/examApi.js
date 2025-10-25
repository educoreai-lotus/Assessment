const API_BASE = import.meta.env.VITE_API_BASE || 'https://assessment-tests-production.up.railway.app/api/v1';

export async function fetchBaselineExam() {
  const res = await fetch(`${API_BASE}/exams/baseline/build`, {
    method: 'POST',
    headers: {
      Authorization: "Bearer demo-token",
    },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}


