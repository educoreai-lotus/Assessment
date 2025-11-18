import { http } from './http';

export const analyticsApi = {
  // Unified inbound: learning analytics pulls via universal endpoint
  getExams(params) {
    return http
      .post('/api/fill-content-metrics', {
        requester_service: 'learninganalytics',
        stringified_json: JSON.stringify(params || {}),
      })
      .then(r => r.data);
  },
};


