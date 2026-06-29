import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { can } from "@/lib/rbac";
import { clientListInputSchema } from "@/lib/validations/client";
import { getClient, listClients } from "@/server/services/client.service";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

export const clientRouter = createTRPCRouter({
  list: protectedProcedure
    .input(clientListInputSchema)
    .query(({ ctx, input }) => {
      if (!can(ctx.session.user, "client:manage")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return listClients(ctx.db, input);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(({ ctx, input }) => {
      if (!can(ctx.session.user, "client:manage")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getClient(ctx.db, input.id);
    }),
});
