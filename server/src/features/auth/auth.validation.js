import { z } from "zod";

export const password = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(200);
export const email = z.string().trim().toLowerCase().email().max(254);
const token = z.string().min(10).max(200);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password,
  phone: z.string().trim().min(8).max(20),
  salonName: z.string().trim().min(2).max(120),
  stateCode: z
    .string()
    .regex(/^\d{2}$/, "Two-digit GST state code")
    .optional(),
  acceptTerms: z.literal(true, {
    message: "You must accept the Terms and Privacy Policy",
  }),
});
export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(200),
  remember: z.boolean().default(true),
});
export const tokenSchema = z.object({ token });
export const emailSchema = z.object({ email });
export const resetSchema = z.object({ token, password });
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});
export const acceptInviteSchema = z.object({
  token,
  password,
  acceptTerms: z.literal(true),
});
