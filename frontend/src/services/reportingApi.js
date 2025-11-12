import { http } from './http';

export const reportingApi = {
  getSummary(params) {
    return http.get('/api/reporting/summary', { params }).then(r => r.data);
  },
};


