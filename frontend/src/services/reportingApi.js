import { http } from './http';

export const reportingApi = {
  // Unified inbound: management/reporting via universal endpoint
  getSummary(params) {
    return http
      .post('/api/fill-content-metrics', {
        requester_service: 'management',
        stringified_json: JSON.stringify(params || {}),
      })
      .then(r => r.data);
  },
};


