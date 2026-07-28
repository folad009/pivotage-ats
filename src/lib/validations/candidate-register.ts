import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(160, "Too long")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const registerCandidateSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, "First name is required")
      .max(80, "Too long"),
    lastName: z
      .string()
      .trim()
      .min(1, "Last name is required")
      .max(80, "Too long"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email address")
      .transform((value) => value.trim().toLowerCase()),
    phone: optionalText,
    password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterCandidateInput = z.infer<typeof registerCandidateSchema>;

export const applyToJobSchema = z.object({
  jobId: z.string().min(1),
});

export type ApplyToJobInput = z.infer<typeof applyToJobSchema>;
