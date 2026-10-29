import { z } from 'zod';

export const planSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().nullable(),
  price: z.coerce.number().min(1).max(1000000).transform((n) => n.toFixed(2)),
  taxRate: z.coerce.number().min(0).max(100).default(18),
  discountPercent: z.coerce.number().min(0).max(100),
  appliesToServices: z.boolean().default(true),
  appliesToProducts: z.boolean().default(false),
  bonusWalletCredit: z.coerce.number().min(0).max(1000000).default(0).transform((n) => n.toFixed(2)),
  validityMonths: z.coerce.number().int().min(1).max(60),
  perks: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
});
export const planUpdateSchema = planSchema.partial();
export const cancelSchema = z.object({ reason: z.string().trim().min(3).max(300) });
