import { z } from 'zod';

const phone = z.string().trim().transform((s) => s.replace(/[\s-]/g, '')).pipe(z.string().regex(/^\+?\d{8,15}$/, 'Enter a valid phone number'));

export const clientSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone,
  email: z.string().trim().email().max(254).optional().nullable(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  colorFormula: z.string().trim().max(2000).optional().nullable(),
  allergies: z.string().trim().max(2000).optional().nullable(),
  marketingConsent: z.boolean().default(false),
  whatsappConsent: z.boolean().default(false),
});
export const clientUpdateSchema = clientSchema.partial();

export const walletAdjustSchema = z.object({
  amount: z.coerce.number().refine((n) => n !== 0 && Math.abs(n) <= 1000000, 'Amount must be non-zero and at most ₹10,00,000'),
  type: z.enum(['TOPUP', 'ADJUSTMENT']),
  reason: z.string().trim().min(5).max(300),
}).refine((b) => b.type !== 'TOPUP' || b.amount > 0, { message: 'Top-ups must be positive', path: ['amount'] });

export const patchTestSchema = z.object({
  product: z.string().trim().min(2).max(120), result: z.enum(['PASSED', 'FAILED', 'REACTION']),
  notes: z.string().max(1000).optional(), testedAt: z.coerce.date(),
});
