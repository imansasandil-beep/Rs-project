import express from 'express';
import { cors } from './middleware/cors.js';
import { requestLogger } from './middleware/request-logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createRouter } from './routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(cors);
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', createRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
