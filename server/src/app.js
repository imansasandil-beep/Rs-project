import express from 'express';
import { cors } from './middleware/cors.js';
import { requestLogger } from './middleware/request-logger.js';
import { rateLimit } from './middleware/rate-limit.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createRouter } from './routes.js';
import { serveClient } from './middleware/serve-client.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(cors);
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', rateLimit({ windowMs: 60_000, max: 240 }));

  app.use('/api', createRouter());

  // In production the built client is served from this same process. Mounted
  // after the API so a route collision can never shadow an endpoint.
  const client = serveClient();
  if (client) app.use(client);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
