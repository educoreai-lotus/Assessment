import { http } from './http';

export const examApi = {
  create(payload) {
    return http.post('/api/exams', payload).then(r => r.data);
  },
  start(examId, payload) {
    return http.post(`/api/exams/${encodeURIComponent(examId)}/start`, payload).then(r => r.data);
  },
  submit(examId, payload) {
    return http.post(`/api/exams/${encodeURIComponent(examId)}/submit`, payload).then(r => r.data);
  },
};


