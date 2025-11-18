import { http } from './http';

function postUniversal(requester_service, payload = {}) {
  return http
    .post('/api/fill-content-metrics', {
      requester_service,
      stringified_json: JSON.stringify(payload || {}),
    })
    .then(r => r.data);
}

export const integrationsApi = {
  devlab(payload) {
    return postUniversal('devlab', payload);
  },
  protocolCamera(payload) {
    return postUniversal('protocol_camera', payload);
  },
  rag(payload) {
    return postUniversal('rag', payload);
  },
  health() {
    return http.get('/health').then(r => ({ status: r.status, data: r.data }));
  },
  healthPostgres() {
    return http.get('/health/postgres').then(r => ({ status: r.status, data: r.data }));
  },
  healthMongo() {
    return http.get('/health/mongo').then(r => ({ status: r.status, data: r.data }));
  },
};
