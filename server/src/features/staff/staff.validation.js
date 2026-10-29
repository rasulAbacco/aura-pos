import { z } from 'zod';

const pct = z.coerce.number().min(0).max(100);
const phone = z.string().trim().regex(/^\+?[\d\s-]{8,20}$/);

/**
 * KYC minimisation: full Aadhaar is never stored (UIDAI masking guidance) — the service keeps
 * the last 4 digits only. PAN and bank account are stored masked.
 */
export const staffSchema = z.object({
  name: z.string().trim().min(2).max(100),
  designation: z.string().trim().min(2).max(60),
  phone,
  whatsapp: phone.optional().nullable(),
  branchId: z.uuid().optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  aadhaar: z.string().transform((s) => s.replace(/\s/g, '')).pipe(z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 digits')).optional(),
  pan: z.string().trim().toUpperCase().regex(/^[A-Z]{5}\d{4}[A-Z]$/, 'PAN format is ABCDE1234F').optional(),
  bankName: z.string().trim().max(80).optional().nullable(),
  bankAccount: z.string().trim().regex(/^\d{9,18}$/, 'Account number must be 9–18 digits').optional(),
  ifsc: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC').optional().nullable(),
  joinedOn: z.coerce.date().optional().nullable(),
  baseSalary: z.coerce.number().min(0).max(10000000).default(0).transform((n) => n.toFixed(2)),
  salaryFrequency: z.enum(['MONTHLY', 'WEEKLY', 'DAILY']).default('MONTHLY'),
  serviceCommission: pct.default(30),
  productCommission: pct.default(10),
  isBookable: z.boolean().default(true),
});
export const staffUpdateSchema = staffSchema.partial().extend({ status: z.enum(['ACTIVE', 'INACTIVE', 'EXITED']).optional() });
