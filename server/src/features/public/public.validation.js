import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(10).max(4000),
  consent: z.literal(true, { message: 'Please agree to be contacted about your enquiry' }),
  website: z.string().max(0).optional().or(z.literal('')), // honeypot: real users leave it empty
});
