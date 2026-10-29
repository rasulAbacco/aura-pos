import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../../config/env.js';

export const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
export { Prisma };

/** Postgres error helpers (driver-adapter errors surface the SQLSTATE in different places). */
export function pgCode(err) {
  return err?.code === 'P2002' ? '23505'
    : err?.meta?.driverAdapterError?.cause?.originalCode
    ?? err?.meta?.code ?? err?.cause?.code ?? err?.code;
}
export const isUniqueViolation = (err) => err?.code === 'P2002' || pgCode(err) === '23505';
export const isCheckViolation = (err) => pgCode(err) === '23514' || /violates check constraint/i.test(err?.message ?? '');
export const isExclusionViolation = (err) => pgCode(err) === '23P01' || /violates exclusion constraint/i.test(err?.message ?? '');
