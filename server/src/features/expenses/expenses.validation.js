import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../pnl/pnl.calculations.js';

export const expenseSchema = z.object({
  title: z.string().trim().min(2).max(150),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.coerce.number().positive().max(100000000).transform((n) => n.toFixed(2)),
  spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((s) => new Date(`${s}T00:00:00Z`)),
  paymentMode: z.enum(['BANK_TRANSFER', 'UPI', 'CASH', 'CREDIT_CARD']),
  vendor: z.string().trim().max(120).optional().nullable(),
  reference: z.string().trim().max(80).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  branchId: z.uuid().optional().nullable(),
});
export const expenseUpdateSchema = expenseSchema.partial();
export const voidSchema = z.object({ reason: z.string().trim().min(3).max(300) });
