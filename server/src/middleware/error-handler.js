import { AppError } from '../lib/errors.js';
import { config } from '../config/env.js';

/** Terminal middleware for URLs no route claimed. */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: 'not_found', message: `No route for ${req.method} ${req.path}` },
  });
}

/* eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity. */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.details) body.error.details = err.details;
    return res.status(err.status).json(body);
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: { code: 'malformed_json', message: 'Request body is not valid JSON' },
    });
  }

  console.error(`[error] unhandled on ${req.method} ${req.path}`, err);

  const body = {
    error: { code: 'internal_error', message: 'Something went wrong on our side' },
  };
  if (!config.isProduction) body.error.debug = { message: err?.message, stack: err?.stack };
  res.status(500).json(body);
}
