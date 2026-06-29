import { z } from "zod";

export const reportFiltersSchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
    clientId: z.string().min(1).optional(),
    jobId: z.string().min(1).optional(),
    includeArchived: z.coerce.boolean().optional().default(false),
  })
  .refine((data) => data.from <= data.to, {
    message: "Start date must be before end date",
    path: ["from"],
  });

export type ReportFilters = z.infer<typeof reportFiltersSchema>;
