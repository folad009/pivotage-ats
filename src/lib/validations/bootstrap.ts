import { z } from "zod";

export const bootstrapAdminSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("BOOTSTRAP_ADMIN_EMAIL must be a valid email"),
  password: z
    .string()
    .min(12, "BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters"),
  name: z.string().trim().min(1).default("Administrator"),
});

export type BootstrapAdminInput = z.infer<typeof bootstrapAdminSchema>;

export function parseBootstrapAdminEnv(
  env: Record<string, string | undefined>,
): BootstrapAdminInput {
  return bootstrapAdminSchema.parse({
    email: env.BOOTSTRAP_ADMIN_EMAIL,
    password: env.BOOTSTRAP_ADMIN_PASSWORD,
    name: env.BOOTSTRAP_ADMIN_NAME ?? "Administrator",
  });
}
