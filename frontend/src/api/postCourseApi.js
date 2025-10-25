export const API_BASE_URL = "https://assessment-tests-production.up.railway.app/api/v1";

export const buildPostCourseExam = async () => {
  const url = `${API_BASE_URL}/exams/postcourse/build`;
  console.log("🔗 Fetching from", url);
  const res = await fetch(url, { method: "POST" });
  return await res.json();
};

export const submitPostCourseExam = async (payload) => {
  const url = `${API_BASE_URL}/exams/postcourse/submit`;
  console.log("📡 Submitting to", url);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await res.json();
};
