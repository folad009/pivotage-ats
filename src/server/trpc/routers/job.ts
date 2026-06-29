import { z } from "zod";

import { jobListInputSchema } from "@/lib/validations/job";
import { getJob, listJobs } from "@/server/services/job.service";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

export const jobRouter = createTRPCRouter({
  list: protectedProcedure
    .input(jobListInputSchema)
    .query(({ ctx, input }) => {
      return listJobs(ctx.db, ctx.session.user, input);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(({ ctx, input }) => {
      return getJob(ctx.db, ctx.session.user, input.id);
    }),
});
