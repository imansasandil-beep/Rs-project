import { config } from '../config/env.js';

const ALLOWED_METHODS = 'GET,POST,PATCH,PUT,DELETE,OPTIONS';
const ALLOWED_HEADERS = 'Content-Type,Authorization,X-Request-Id';

/**
 * The client is a separate origin in development and may be one in production
 * too, so reflect exactly the configured origin — never `*`, since responses
 * carry a bearer-authenticated payload.
 */
export function cors(req, res, next) {
  const origin = req.get('origin');

  if (origin && origin === config.corsOrigin) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Expose-Headers', 'X-Request-Id');
  }

  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', ALLOWED_METHODS);
    res.set('Access-Control-Allow-Headers', ALLOWED_HEADERS);
    res.set('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  next();
}
