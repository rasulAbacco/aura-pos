import { badRequest } from '../errors/errors.js';

/** Validate req[part] with a zod schema; replaces it with the parsed (stripped) value. */
export function parse(schema, value) {
  const r = schema.safeParse(value);
  if (!r.success) {
    throw badRequest('Request validation failed', r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
  }
  return r.data;
}

export const ok = (res, data, meta) => res.json(meta ? { data, meta } : { data });
export const created = (res, data) => res.status(201).json({ data });

export function pageArgs(query) {
  const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize ?? '25', 10) || 25));
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}

/** Recursively convert Prisma Decimals to fixed strings and Dates to ISO for JSON. */
export function toJSONSafe(v) {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return v.map(toJSONSafe);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    if (typeof v.toFixed === 'function' && typeof v.isNegative === 'function') return v.toFixed(2);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toJSONSafe(x)]));
  }
  return v;
}
