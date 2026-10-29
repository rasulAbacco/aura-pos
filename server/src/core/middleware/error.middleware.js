import { AppError } from '../errors/errors.js';
import { env } from '../../config/env.js';

export function notFoundHandler(req, _res, next) {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `No route for ${req.method} ${req.path}`));
}

/** Uniform error body: { error: { code, message, requestId, details? } }. Never leaks stack traces. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = err.status ?? err.statusCode ?? 500;
  let code = typeof err.code === 'string' && !/^P\d{4}$/.test(err.code) ? err.code : 'INTERNAL_ERROR'; // hide raw Prisma codes
  let message = err.message;
  if (err.type === 'entity.parse.failed') { status = 400; code = 'INVALID_JSON'; message = 'Malformed JSON body'; }
  if (err.type === 'entity.too.large') { status = 413; code = 'PAYLOAD_TOO_LARGE'; message = 'Request body too large'; }
  // A malformed UUID in a lookup behaves like "not found" (no enumeration, no 500).
  if (err.code === 'P2023' || err.code === 'P2025' || /invalid input syntax for type uuid/i.test(err.message ?? '')) { status = 404; code = 'NOT_FOUND'; message = 'Resource not found'; }
  if (status >= 500) {
    req.log?.error({ err }, 'unhandled error');
    message = 'Something went wrong. Please try again.';
    code = 'INTERNAL_ERROR';
  }
  const body = { error: { code, message, requestId: req.id } };
  if (err.details && status < 500) body.error.details = err.details;
  if (status >= 500 && env.NODE_ENV === 'development') body.error.debug = err.message;
  res.status(status).json(body);
}
