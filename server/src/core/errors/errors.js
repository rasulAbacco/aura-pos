/** Errors carrying an HTTP status and a stable machine-readable code. */
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Business-rule violation (422 by default). Thrown by pure domain code. */
export class DomainError extends AppError {
  constructor(code, message, details) { super(422, code, message, details); }
}

export const badRequest = (message, details) => new AppError(400, 'VALIDATION_FAILED', message, details);
export const unauthorized = (message = 'Authentication required') => new AppError(401, 'UNAUTHENTICATED', message);
export const forbidden = (message = 'You do not have permission to perform this action') => new AppError(403, 'FORBIDDEN', message);
export const notFound = (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found`);
export const conflict = (code, message, details) => new AppError(409, code, message, details);
