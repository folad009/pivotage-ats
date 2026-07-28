import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import type { AccessUser } from "@/lib/rbac-core";

/**
 * tRPC request context — available to every procedure. Holds the Prisma client
 * and the authenticated session (AGENTS.md §3).
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();
  return {
    db,
    session,
    headers: opts.headers,
  };
};

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

type StaffContext = {
  db: TRPCContext["db"];
  headers: Headers;
  session: NonNullable<TRPCContext["session"]> & {
    user: AccessUser & {
      email?: string | null;
      name?: string | null;
      accountType: "staff";
    };
  };
};

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

/** Open procedure — no authentication required. */
export const publicProcedure = t.procedure;

/** Authenticated staff procedure — narrows `ctx.session.user` to staff + role. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  const user = ctx.session?.user;
  if (!user || user.accountType !== "staff" || !user.role) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      db: ctx.db,
      headers: ctx.headers,
      session: {
        ...ctx.session!,
        user: {
          id: user.id,
          role: user.role,
          email: user.email,
          name: user.name,
          accountType: "staff" as const,
        },
      },
    } satisfies StaffContext,
  });
});
