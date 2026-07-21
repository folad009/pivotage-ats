import { TRPCError } from "@trpc/server";

import { can } from "@/lib/rbac";
import { userListInputSchema } from "@/lib/validations/user";
import { listUsers } from "@/server/services/user.service";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

export const userRouter = createTRPCRouter({
  list: protectedProcedure
    .input(userListInputSchema)
    .query(({ ctx, input }) => {
      if (!can(ctx.session.user, "user:manage")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return listUsers(ctx.db, input);
    }),
});
