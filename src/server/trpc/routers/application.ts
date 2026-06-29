import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { mayBrowseCandidatePII } from "@/lib/rbac";
import {
  applicationBoardInputSchema,
  applicationListInputSchema,
} from "@/lib/validations/application";
import {
  getApplication,
  getBoardData,
  listApplications,
} from "@/server/services/application.service";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

export const applicationRouter = createTRPCRouter({
  board: protectedProcedure
    .input(applicationBoardInputSchema)
    .query(({ ctx, input }) => {
      if (!mayBrowseCandidatePII(ctx.session.user)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getBoardData(ctx.db, ctx.session.user, input.jobId);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(({ ctx, input }) => {
      if (!mayBrowseCandidatePII(ctx.session.user)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getApplication(ctx.db, ctx.session.user, input.id);
    }),

  list: protectedProcedure
    .input(applicationListInputSchema)
    .query(({ ctx, input }) => {
      if (!mayBrowseCandidatePII(ctx.session.user)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return listApplications(ctx.db, ctx.session.user, input);
    }),
});
