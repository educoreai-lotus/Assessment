'use strict';

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const processHandler = require('./handlers/processHandler');
const logger = require('../utils/logger');

class GrpcServer {
  constructor() {
    this.server = null;
    this.port = process.env.GRPC_PORT || 50051;
  }

  async start() {
    try {
      logger.info('Starting GRPC server', {
        service: process.env.SERVICE_NAME || 'microservice',
        port: this.port,
      });

      const PROTO_PATH = path.join(__dirname, '../../proto/microservice.proto');
      const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });

      const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
      const microservice = protoDescriptor.microservice && protoDescriptor.microservice.v1;
      if (!microservice || !microservice.MicroserviceAPI) {
        throw new Error('Failed to load microservice proto definition');
      }

      this.server = new grpc.Server();
      this.server.addService(microservice.MicroserviceAPI.service, {
        Process: processHandler.handle.bind(processHandler),
      });

      await new Promise((resolve, reject) => {
        this.server.bindAsync(
          `0.0.0.0:${this.port}`,
          grpc.ServerCredentials.createInsecure(),
          (error, port) => {
            if (error) {
              logger.error('Failed to start GRPC server', {
                service: process.env.SERVICE_NAME,
                error: error.message,
              });
              return reject(error);
            }
            logger.info('GRPC server started', {
              service: process.env.SERVICE_NAME,
              port,
            });
            this.server.start();
            resolve();
          }
        );
      });
    } catch (error) {
      logger.error('GRPC server startup failed', {
        service: process.env.SERVICE_NAME,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async shutdown() {
    if (this.server) {
      logger.info('Shutting down GRPC server', {
        service: process.env.SERVICE_NAME,
      });
      return new Promise((resolve) => {
        try {
          this.server.tryShutdown(() => {
            logger.info('GRPC server shut down', {
              service: process.env.SERVICE_NAME,
            });
            resolve();
          });
        } catch (e) {
          resolve();
        }
      });
    }
  }
}

module.exports = new GrpcServer();


