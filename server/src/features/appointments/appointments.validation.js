import { z } from 'zod';

export const STATUSES = ['BOOKED', 'CONFIRMED', 'WAITING', 'CHECKED_IN', 'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

export const availabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), staffId: z.uuid(), serviceId: z.uuid(),
  stepMin: z.coerce.number().int().min(5).max(60).default(15),
});

export const createSchema = z.object({
  customerId: z.uuid(), staffId: z.uuid(), serviceId: z.uuid(), resourceId: z.uuid().optional().nullable(),
  startsAt: z.coerce.date().optional(), durationMin: z.coerce.number().int().min(5).max(720).optional(),
  walkIn: z.boolean().default(false), notes: z.string().trim().max(500).optional(), branchId: z.uuid().optional(),
});

export const statusSchema = z.object({ status: z.enum(STATUSES), reason: z.string().trim().max(300).optional() });
export const rescheduleSchema = z.object({ startsAt: z.coerce.date(), staffId: z.uuid().optional(), resourceId: z.uuid().nullable().optional() });
