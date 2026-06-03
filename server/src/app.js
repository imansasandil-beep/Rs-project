import express from 'express';
import { cors } from './middleware/cors.js';
import { requestLogger } from './middleware/request-logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(cors);
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
