import { http } from './http';

export const integrationsApi = {
  devlab(payload) {
    return http.post('/api/integrations/devlab', payload).then(r => r.data);
  },
  protocolCamera(payload) {
    return http.post('/api/integrations/protocol-camera', payload).then(r => r.data);
  },
  rag(payload) {
    return http.post('/api/integrations/rag', payload).then(r => r.data);
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


