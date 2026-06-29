import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { mayBrowseCandidatePII, mayScheduleInterview } from "@/lib/rbac";
import { interviewListInputSchema } from "@/lib/validations/interview";
import {
  getApplicationScorecardSummary,
  getInterview,
  listInterviews,
  listPanelUserOptions,
} from "@/server/services/interview.service";
import { getScorecardForAuthor } from "@/server/services/scorecard.service";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

export const interviewRouter = createTRPCRouter({
  list: protectedProcedure
    .input(interviewListInputSchema)
    .query(({ ctx, input }) => {
      if (!mayBrowseCandidatePII(ctx.session.user)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return listInterviews(ctx.db, ctx.session.user, input);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(({ ctx, input }) => {
      if (!mayBrowseCandidatePII(ctx.session.user)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getInterview(ctx.db, ctx.session.user, input.id);
    }),

  panelUsers: protectedProcedure.query(({ ctx }) => {
    if (!mayScheduleInterview(ctx.session.user)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return listPanelUserOptions(ctx.db);
  }),

  scorecardSummary: protectedProcedure
    .input(z.object({ applicationId: z.string().min(1) }))
    .query(({ ctx, input }) => {
      if (!mayBrowseCandidatePII(ctx.session.user)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getApplicationScorecardSummary(
        ctx.db,
        ctx.session.user,
        input.applicationId,
      );
    }),

  myScorecard: protectedProcedure
    .input(z.object({ interviewId: z.string().min(1) }))
    .query(({ ctx, input }) => {
      if (!mayBrowseCandidatePII(ctx.session.user)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getScorecardForAuthor(
        ctx.db,
        ctx.session.user,
        input.interviewId,
      );
    }),
});
