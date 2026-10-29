import crypto from 'node:crypto';

/** 256-bit URL-safe random token. Only its SHA-256 is ever stored. */
export const randomToken = () => crypto.randomBytes(32).toString('base64url');
export const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
/** Pseudonymised IP for logs/rate records (no raw IPs at rest). */
export const ipHash = (ip) => (ip ? sha256(`ip:${ip}`).slice(0, 32) : null);
