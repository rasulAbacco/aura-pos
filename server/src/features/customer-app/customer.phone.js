import { badRequest } from '../../core/errors/errors.js';

/**
 * Indian mobile number → its 10 digits ("+91 98765 43210", "09876543210" and "9876543210" are the same).
 * Throws a friendly 400 when it isn't a valid mobile number.
 */
export function normalizeMobile(input) {
  let d = String(input ?? '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (!/^[6-9]\d{9}$/.test(d)) throw badRequest('Enter a valid 10-digit mobile number');
  return d;
}
