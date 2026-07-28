import { ClientStatus } from "@/lib/prisma-browser";
import { z } from "zod";

export const CLIENT_STATUSES = Object.values(ClientStatus);

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalText = z
  .string()
  .trim()
  .max(120, "Too long")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const createClientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160, "Too long"),
  contactEmail: optionalEmail,
  industry: optionalText,
  status: z.nativeEnum(ClientStatus).default(ClientStatus.ACTIVE),
});

export const updateClientSchema = createClientSchema.partial().extend({
  id: z.string().min(1),
});

export const clientListInputSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  status: z.nativeEnum(ClientStatus).optional(),
  search: z.string().trim().optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ClientListInput = z.infer<typeof clientListInputSchema>;
