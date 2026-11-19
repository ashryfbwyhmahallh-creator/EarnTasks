import { z } from "zod";
export const emailSchema = z.string().trim().toLowerCase().email("Invalid email address");
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72, "Password is too long");
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: z.string().trim().min(2).max(24).optional(),
  ref: z.string().trim().max(12).optional(),
});
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});
export const withdrawalSchema = z.object({
  method: z.string().min(1),
  amount_points: z.number().int().positive("Amount must be a positive whole number of points"),
  destination: z.record(z.string()),
});