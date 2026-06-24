import { Router } from 'express';
import { getDb } from '../../db/connection.js';
import { config } from '../../config/env.js';

const startedAt = Date.now();

export const healthRoutes = Router();

/**
 * Liveness plus a real dependency check. A health endpoint that only proves the
 * event loop is turning will happily report "ok" while every request 500s on a
 * database that has gone away, so this actually queries it.
 */
healthRoutes.get('/', (req, res) => {
  let database = 'ok';
  let status = 'ok';

  try {
    getDb().prepare('SELECT 1 AS ok').get();
  } catch (err) {
    database = err.message;
    status = 'degraded';
  }

  res.status(status === 'ok' ? 200 : 503).json({
    status,
    database,
    uptime: Math.round((Date.now() - startedAt) / 1000),
    env: config.env,
    node: process.versions.node,
  });
});
