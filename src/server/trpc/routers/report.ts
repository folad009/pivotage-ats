import { TRPCError } from "@trpc/server";

import { mayViewReports } from "@/lib/rbac";
import { reportFiltersSchema } from "@/lib/validations/report";
import {
  getConversionRates,
  getJobStatusSummary,
  getPipelineFunnel,
  getRecruiterActivity,
  getReportsOverview,
  getTimeToHireMetrics,
} from "@/server/services/reporting.service";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

function assertReportAccess(user: { id: string; role: import("@prisma/client").Role }) {
  if (!mayViewReports(user)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

export const reportRouter = createTRPCRouter({
  overview: protectedProcedure
    .input(reportFiltersSchema)
    .query(({ ctx, input }) => {
      assertReportAccess(ctx.session.user);
      return getReportsOverview(ctx.db, ctx.session.user, input);
    }),

  funnel: protectedProcedure
    .input(reportFiltersSchema)
    .query(({ ctx, input }) => {
      assertReportAccess(ctx.session.user);
      return getPipelineFunnel(ctx.db, ctx.session.user, input);
    }),

  timeToHire: protectedProcedure
    .input(reportFiltersSchema)
    .query(({ ctx, input }) => {
      assertReportAccess(ctx.session.user);
      return getTimeToHireMetrics(ctx.db, ctx.session.user, input);
    }),

  conversions: protectedProcedure
    .input(reportFiltersSchema)
    .query(({ ctx, input }) => {
      assertReportAccess(ctx.session.user);
      return getConversionRates(ctx.db, ctx.session.user, input);
    }),

  jobStatus: protectedProcedure
    .input(reportFiltersSchema)
    .query(({ ctx, input }) => {
      assertReportAccess(ctx.session.user);
      return getJobStatusSummary(ctx.db, ctx.session.user, input);
    }),

  recruiterActivity: protectedProcedure
    .input(reportFiltersSchema)
    .query(({ ctx, input }) => {
      assertReportAccess(ctx.session.user);
      return getRecruiterActivity(ctx.db, ctx.session.user, input);
    }),
});
