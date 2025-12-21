import { http, httpReady } from './http';

export const examApi = {
  async create(payload) {
    await httpReady;
    try {
      // TEMP DIAGNOSTIC: log resolved base URL + endpoint
      // eslint-disable-next-line no-console
      console.log('[HTTP][EXAMS][CREATE][REQUEST]', {
        baseURL: http?.defaults?.baseURL || null,
        url: '/api/exams',
        timeout_ms: http?.defaults?.timeout,
      });
    } catch {}
    return http.post('/api/exams', payload).then(r => r.data);
  },
  async resolve(examId) {
    await httpReady;
    return http.get(`/api/exams/${encodeURIComponent(examId)}`).then(r => r.data);
  },
  async start(examId, payload) {
    await httpReady;
    return http.post(`/api/exams/${encodeURIComponent(examId)}/start`, payload).then(r => r.data);
  },
  async submit(examId, payload) {
    await httpReady;
    return http.post(`/api/exams/${encodeURIComponent(examId)}/submit`, payload).then(r => r.data);
  },
  async proctoringStart(attemptId) {
    await httpReady;
    return http.post(`/api/proctoring/${encodeURIComponent(attemptId)}/start_camera`).then(r => r.data);
  },
  async proctoringStartForExam(examId, payload) {
    await httpReady;
    return http.post(`/api/exams/${encodeURIComponent(examId)}/proctoring/start`, payload).then(r => r.data);
  },
  async attempt(attemptId) {
    await httpReady;
    return http.get(`/api/attempts/${encodeURIComponent(attemptId)}`).then(r => r.data);
  },
  async attemptsByUser(userId) {
    await httpReady;
    return http.get(`/api/attempts/user/${encodeURIComponent(userId)}`).then(r => r.data);
  },
  async saveContext(payload) {
    await httpReady;
    return http.post('/api/exams/context', payload).then(r => r.data);
  },
  async postcourseCoverage() {
    await httpReady;
    return http.post('/api/exams/postcourse/coverage', {
      requester_service: 'assessment-service',
      payload: { action: 'coverage_map' },
    }).then(r => r.data);
  },
};


