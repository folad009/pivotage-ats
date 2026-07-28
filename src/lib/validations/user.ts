import { Role } from "@/lib/prisma-browser";
import { z } from "zod";

export const ROLES = Object.values(Role);

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .email("Enter a valid email address");

const nameField = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(120, "Too long");

const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters");

const optionalPasswordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const createUserSchema = z.object({
  email: emailField,
  name: nameField,
  role: z.nativeEnum(Role),
  password: passwordField,
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  id: z.string().min(1),
  email: emailField.optional(),
  name: nameField.optional(),
  role: z.nativeEnum(Role).optional(),
  password: optionalPasswordField,
  isActive: z.boolean().optional(),
});

export const userListInputSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserListInput = z.infer<typeof userListInputSchema>;
