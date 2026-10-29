import { z } from 'zod';

export const clientSchema = z.object({
  name: z.string().trim().min(2, 'Enter the client’s name'),
  phone: z.string().trim().regex(/^\+?[\d\s-]{8,18}$/, 'Enter a valid phone number'),
  email: z.union([z.literal(''), z.string().email('Enter a valid email')]).optional(),
  notes: z.string().max(2000).optional(),
  colorFormula: z.string().max(2000).optional(),
  allergies: z.string().max(2000).optional(),
  marketingConsent: z.boolean().optional(),
});
