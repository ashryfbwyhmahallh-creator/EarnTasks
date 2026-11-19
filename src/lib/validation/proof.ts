import { z } from "zod";
export const payoutProofSchema = z.object({
  withdrawal_id: z.string().uuid("Invalid withdrawal reference"),
  phone_number: z
    .string().trim().min(7, "Enter a valid phone number").max(20, "Phone number is too long")
    .regex(/^\+?[0-9\s\-()]{7,20}$/, "Phone number contains invalid characters"),
  proof_url: z.string().trim().url("Provide a valid screenshot or video link").max(500),
  note: z.string().trim().max(500).optional(),
});
export type PayoutProofInput = z.infer<typeof payoutProofSchema>;