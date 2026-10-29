import { z } from 'zod';

export const receiptSchema = z.object({
  itemId: z.uuid(), quantity: z.coerce.number().int().min(1).max(100000),
  unitCost: z.coerce.number().min(0).max(1000000).optional(),
  supplierId: z.uuid().optional(), batchNo: z.string().trim().max(60).optional(),
  expiryDate: z.coerce.date().optional(), note: z.string().trim().max(300).optional(), branchId: z.uuid().optional(),
});

export const adjustmentSchema = z.object({
  itemId: z.uuid(), delta: z.coerce.number().int().refine((n) => n !== 0, 'Delta cannot be zero'),
  type: z.enum(['ADJUSTMENT', 'DAMAGE', 'BACKBAR_USE']), note: z.string().trim().min(3).max(300), branchId: z.uuid().optional(),
}).refine((b) => b.type === 'ADJUSTMENT' || b.delta < 0, { message: 'Damage and backbar use must reduce stock', path: ['delta'] });

export const transferSchema = z.object({
  itemId: z.uuid(), quantity: z.coerce.number().int().min(1), fromBranchId: z.uuid(), toBranchId: z.uuid(), note: z.string().max(300).optional(),
}).refine((b) => b.fromBranchId !== b.toBranchId, { message: 'Choose two different branches', path: ['toBranchId'] });

export const supplierSchema = z.object({
  name: z.string().trim().min(2).max(120), phone: z.string().max(20).optional(), email: z.string().email().optional(),
  gstin: z.string().regex(/^[0-9A-Z]{15}$/).optional(), address: z.string().max(300).optional(),
});
