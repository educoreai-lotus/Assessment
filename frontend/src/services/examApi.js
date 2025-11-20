import { http } from './http';

export const examApi = {
  create(payload) {
    return http.post('/api/exams', payload).then(r => r.data);
  },
  resolve(examId) {
    return http.get(`/api/exams/${encodeURIComponent(examId)}`).then(r => r.data);
  },
  start(examId, payload) {
    return http.post(`/api/exams/${encodeURIComponent(examId)}/start`, payload).then(r => r.data);
  },
  submit(examId, payload) {
    return http.post(`/api/exams/${encodeURIComponent(examId)}/submit`, payload).then(r => r.data);
  },
  proctoringStart(attemptId) {
    return http.post(`/api/proctoring/${encodeURIComponent(attemptId)}/start_camera`).then(r => r.data);
  },
  proctoringStartForExam(examId, payload) {
    return http.post(`/api/exams/${encodeURIComponent(examId)}/proctoring/start`, payload).then(r => r.data);
  },
  attempt(attemptId) {
    return http.get(`/api/attempts/${encodeURIComponent(attemptId)}`).then(r => r.data);
  },
  attemptsByUser(userId) {
    return http.get(`/api/attempts/user/${encodeURIComponent(userId)}`).then(r => r.data);
  },
};


