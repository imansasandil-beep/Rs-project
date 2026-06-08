import { randomUUID } from 'node:crypto';
import { config } from '../config/env.js';

// A test run makes hundreds of requests; one line each buries the assertions.
const SILENT = config.env === 'test';

/**
 * Gives every request an id (echoed as `X-Request-Id`) and writes one line per
 * response once it has actually been flushed, so the status and duration are real.
 */
export function requestLogger(req, res, next) {
  req.id = req.get('x-request-id') || randomUUID();
  res.set('X-Request-Id', req.id);

  if (SILENT) return next();

  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    console.log(
      `[${level}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms id=${req.id}`
    );
  });

  next();
}
