'use strict';

const logger = require('../../utils/logger');
const { AiAuditTrail } = require('../../../models');

class ProcessHandler {
  async handle(call, callback) {
    const startTime = Date.now();
    let envelope;
    try {
      const envelopeJson = call.request.envelope_json;
      envelope = JSON.parse(envelopeJson);

      const {
        request_id,
        tenant_id,
        user_id,
        target_service,
        payload,
        metadata,
      } = envelope;

      logger.info('[GRPC Process] Request received', {
        service: process.env.SERVICE_NAME,
        request_id,
        tenant_id,
        user_id,
        target_service,
        has_payload: !!payload,
        sync_type: payload && payload.sync_type,
      });

      const isBatchSync = payload && payload.sync_type === 'batch';
      let result;

      if (isBatchSync) {
        logger.info('[GRPC Process - BATCH SYNC] Processing batch request', {
          service: process.env.SERVICE_NAME,
          request_id,
          page: payload && payload.page,
          limit: payload && payload.limit,
          since: payload && payload.since,
        });
        result = await this.handleBatchSync(envelope);
      } else {
        logger.info('[GRPC Process - REAL-TIME] Processing query', {
          service: process.env.SERVICE_NAME,
          request_id,
          query: payload && payload.query,
          context: payload && payload.context,
        });
        result = await this.handleRealtimeQuery(envelope);
      }

      const responseEnvelope = {
        request_id,
        success: true,
        data: result.data,
        metadata: {
          ...(result.metadata || {}),
          processed_at: new Date().toISOString(),
          service: process.env.SERVICE_NAME,
          duration_ms: Date.now() - startTime,
          mode: isBatchSync ? 'batch' : 'realtime',
        },
      };

      logger.info('[GRPC Process] Request completed', {
        service: process.env.SERVICE_NAME,
        request_id,
        duration_ms: Date.now() - startTime,
        mode: isBatchSync ? 'batch' : 'realtime',
        success: true,
      });

      callback(null, {
        success: true,
        envelope_json: JSON.stringify(responseEnvelope),
        error: '',
      });
    } catch (error) {
      logger.error('[GRPC Process] Request failed', {
        service: process.env.SERVICE_NAME,
        request_id: envelope && envelope.request_id,
        error: error.message,
        stack: error.stack,
        duration_ms: Date.now() - startTime,
      });

      callback(null, {
        success: false,
        envelope_json: JSON.stringify({
          request_id: envelope && envelope.request_id,
          success: false,
          error: error.message,
          metadata: {
            processed_at: new Date().toISOString(),
            service: process.env.SERVICE_NAME,
          },
        }),
        error: error.message,
      });
    }
  }

  async handleBatchSync(envelope) {
    const { payload } = envelope;
    const page = Number((payload && payload.page) || 1);
    const limit = Math.min(Number((payload && payload.limit) || 1000), 2000);
    const since = payload && payload.since ? new Date(payload.since) : null;

    const offset = (page - 1) * limit;
    const data = await this.queryDatabase({ limit, offset, since });
    const totalCount = await this.getTotalCount({ since });
    const hasMore = page * limit < totalCount;

    logger.info('[Batch Sync] Data fetched', {
      service: process.env.SERVICE_NAME,
      page,
      records: Array.isArray(data) ? data.length : 0,
      total: totalCount,
      has_more: hasMore,
    });

    return {
      data: {
        items: data,
        page,
        limit,
        total: totalCount,
      },
      metadata: {
        has_more: hasMore,
        page,
        total_pages: Math.ceil(totalCount / Math.max(limit, 1)),
      },
    };
  }

  async handleRealtimeQuery(envelope) {
    const { user_id, payload } = envelope;
    const query = (payload && payload.query) || '';

    logger.info('[Real-time Query] Processing', {
      service: process.env.SERVICE_NAME,
      user_id,
      query,
    });

    let data;
    if (query && query.toLowerCase().includes('recent')) {
      data = await this.getRecentItems(user_id);
    } else if ((query && query.toLowerCase().includes('id')) || (query && query.toLowerCase().includes('show'))) {
      const id = this.extractId(query);
      const item = await this.getItemById(id);
      data = item ? [item] : [];
    } else {
      data = await this.getDefaultData(user_id);
    }

    return {
      data,
      metadata: {
        query_type: this.detectQueryType(query),
      },
    };
  }

  async queryDatabase({ limit, offset, since }) {
    const filter = {};
    if (since) {
      filter.executed_at = { $gte: since };
    }
    const docs = await AiAuditTrail
      .find(filter, {
        _id: 1,
        exam_id: 1,
        attempt_id: 1,
        event_type: 1,
        model: 1,
        prompt: 1,
        response: 1,
        metadata: 1,
        latency_ms: 1,
        status: 1,
        error: 1,
        executed_at: 1,
        created_at: 1,
        updated_at: 1,
      })
      .sort({ executed_at: -1 })
      .skip(offset)
      .limit(limit)
      .lean();
    return docs || [];
  }

  async getTotalCount({ since }) {
    const filter = {};
    if (since) {
      filter.executed_at = { $gte: since };
    }
    return AiAuditTrail.countDocuments(filter);
  }

  async getRecentItems(userId) {
    const filter = {};
    if (userId) {
      filter['metadata.user_id'] = userId;
    }
    const docs = await AiAuditTrail
      .find(filter, {
        _id: 1,
        exam_id: 1,
        attempt_id: 1,
        event_type: 1,
        model: 1,
        prompt: 1,
        response: 1,
        metadata: 1,
        latency_ms: 1,
        status: 1,
        error: 1,
        executed_at: 1,
        created_at: 1,
        updated_at: 1,
      })
      .sort({ executed_at: -1 })
      .limit(15)
      .lean();
    return docs || [];
  }

  async getItemById(id) {
    if (!id) return null;
    const doc = await AiAuditTrail
      .findOne({ _id: id }, {
        _id: 1,
        exam_id: 1,
        attempt_id: 1,
        event_type: 1,
        model: 1,
        prompt: 1,
        response: 1,
        metadata: 1,
        latency_ms: 1,
        status: 1,
        error: 1,
        executed_at: 1,
        created_at: 1,
        updated_at: 1,
      })
      .lean();
    return doc || null;
  }

  async getDefaultData(userId) {
    return this.getRecentItems(userId);
  }

  extractId(query) {
    const match = query && query.match(/[a-zA-Z0-9_\-]+/g);
    return match && match.length ? match[match.length - 1] : null;
  }

  detectQueryType(query) {
    const q = (query || '').toLowerCase();
    if (q.includes('recent')) return 'recent';
    if (q.includes('id') || q.includes('show')) return 'by_id';
    return 'default';
  }
}

module.exports = new ProcessHandler();


