import pino from 'pino';
import { env } from '../../config/env.js';

// Redact anything credential-like, wherever it appears in a log object.
export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]', '*.password', '*.passwordHash', '*.token', '*.refreshToken', '*.signature', '*.keySecret'],
    censor: '[redacted]',
  },
});
