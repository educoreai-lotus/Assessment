import { http } from './http';

export const examApi = {
  start(payload) {
    return http.post('/api/exam/start', payload).then(r => r.data);
  },
  submit(payload) {
    return http.post('/api/exam/submit', payload).then(r => r.data);
  },
};


