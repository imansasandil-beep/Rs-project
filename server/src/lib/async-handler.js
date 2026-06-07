/**
 * Express 4 does not catch rejections from async handlers — an awaited failure
 * becomes an unhandled rejection and the request hangs until it times out.
 * Wrapping every async route funnels those into the normal error handler.
 *
 * @template {import('express').RequestHandler} T
 * @param {T} handler
 * @returns {import('express').RequestHandler}
 */
export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
