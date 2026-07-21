import { applicationRouter } from "@/server/trpc/routers/application";
import { candidateRouter } from "@/server/trpc/routers/candidate";
import { clientRouter } from "@/server/trpc/routers/client";
import { interviewRouter } from "@/server/trpc/routers/interview";
import { jobRouter } from "@/server/trpc/routers/job";
import { noteRouter } from "@/server/trpc/routers/note";
import { reportRouter } from "@/server/trpc/routers/report";
import { userRouter } from "@/server/trpc/routers/user";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

export const appRouter = createTRPCRouter({
  /** Returns the currently authenticated user (id, name, email, role). */
  me: protectedProcedure.query(({ ctx }) => {
    return ctx.session.user;
  }),

  clients: clientRouter,
  jobs: jobRouter,
  candidates: candidateRouter,
  applications: applicationRouter,
  interviews: interviewRouter,
  notes: noteRouter,
  reports: reportRouter,
  users: userRouter,
});

export type AppRouter = typeof appRouter;
