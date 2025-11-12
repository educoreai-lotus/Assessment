import { http } from './http';

export const analyticsApi = {
  getExams(params) {
    return http.get('/api/analytics/exams', { params }).then(r => r.data);
  },
};


