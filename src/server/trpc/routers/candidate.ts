import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { mayBrowseCandidatePII } from "@/lib/rbac";
import { candidateListInputSchema } from "@/lib/validations/candidate";
import {
  getCandidate,
  listCandidates,
  listTags,
} from "@/server/services/candidate.service";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

export const candidateRouter = createTRPCRouter({
  list: protectedProcedure
    .input(candidateListInputSchema)
    .query(({ ctx, input }) => {
      if (!mayBrowseCandidatePII(ctx.session.user)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return listCandidates(ctx.db, ctx.session.user, input);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      if (!mayBrowseCandidatePII(ctx.session.user)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getCandidate(ctx.db, ctx.session.user, input.id);
    }),

  listTags: protectedProcedure.query(({ ctx }) => {
    if (!mayBrowseCandidatePII(ctx.session.user)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return listTags(ctx.db);
  }),
});
