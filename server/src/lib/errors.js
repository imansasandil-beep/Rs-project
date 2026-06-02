/**
 * Every error the API deliberately produces is an AppError. Anything else that
 * reaches the error handler is a bug, and is reported as a generic 500 so we
 * never leak a stack trace or a SQL string to the client.
 */
export class AppError extends Error {
  /**
   * @param {number} status  HTTP status code
   * @param {string} code    stable, machine-readable identifier
   * @param {string} message human-readable explanation
   * @param {object} [details] optional structured context (e.g. field errors)
   */
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    if (details !== undefined) this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const badRequest = (message, details) => new AppError(400, 'bad_request', message, details);
export const unauthorized = (message = 'Authentication required') =>
  new AppError(401, 'unauthorized', message);
export const forbidden = (message = 'You do not have access to this resource') =>
  new AppError(403, 'forbidden', message);
export const notFound = (resource = 'Resource') =>
  new AppError(404, 'not_found', `${resource} not found`);
export const conflict = (message, details) => new AppError(409, 'conflict', message, details);
export const unprocessable = (message, details) =>
  new AppError(422, 'unprocessable_entity', message, details);
export const tooManyRequests = (message = 'Too many requests') =>
  new AppError(429, 'too_many_requests', message);
