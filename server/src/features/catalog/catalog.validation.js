import { z } from 'zod';

const money = z.coerce.number().min(0).max(10000000).transform((n) => n.toFixed(2));

export const categorySchema = z.object({ name: z.string().trim().min(2).max(60) });

export const itemSchema = z.object({
  type: z.enum(['SERVICE', 'PRODUCT']),
  categoryId: z.uuid(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  price: money,
  cost: money.optional().nullable(),
  taxRate: z.coerce.number().min(0).max(100).default(18),
  sacHsn: z.string().trim().regex(/^\d{4,8}$/, 'SAC/HSN must be 4–8 digits').optional().nullable(),
  durationMin: z.coerce.number().int().min(5).max(720).optional().nullable(),
  sku: z.string().trim().max(40).optional().nullable(),
  barcode: z.string().trim().max(40).optional().nullable(),
  icon: z.string().trim().max(40).optional().nullable(),
  minStock: z.coerce.number().int().min(0).max(100000).default(0),
  commissionEligible: z.boolean().default(true),
  allowPriceOverride: z.boolean().default(true),
  isActive: z.boolean().default(true),
  openingStock: z.coerce.number().int().min(0).max(100000).optional(), // products, current branch
});

export const itemUpdateSchema = itemSchema.omit({ openingStock: true, type: true }).partial();
