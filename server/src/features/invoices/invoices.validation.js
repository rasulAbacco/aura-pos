import { z } from 'zod';
import { money, method } from '../pos/pos.validation.js';

export const voidSchema = z.object({ reason: z.string().trim().min(5).max(300) });

export const refundSchema = z.object({
  lines: z.array(z.object({ lineId: z.uuid(), quantity: z.coerce.number().int().min(1) })).min(1),
  payments: z.array(z.object({ method, amount: money, reference: z.string().max(60).optional() })).optional(),
  restock: z.boolean().default(true),
  reason: z.string().trim().max(300).default(''),
  preview: z.boolean().default(false), // true = only calculate the refund amount, change nothing
});
