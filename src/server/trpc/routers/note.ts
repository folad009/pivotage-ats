import { TRPCError } from "@trpc/server";

import { mayBrowseCandidatePII } from "@/lib/rbac";
import {
  activityFeedInputSchema,
  mentionUsersInputSchema,
} from "@/lib/validations/note";
import {
  getActivityFeed,
  searchMentionUsers,
} from "@/server/services/note.service";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

export const noteRouter = createTRPCRouter({
  activityFeed: protectedProcedure
    .input(activityFeedInputSchema)
    .query(({ ctx, input }) => {
      if (!mayBrowseCandidatePII(ctx.session.user)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getActivityFeed(ctx.db, ctx.session.user, input);
    }),

  mentionUsers: protectedProcedure
    .input(mentionUsersInputSchema)
    .query(({ ctx, input }) => {
      if (!mayBrowseCandidatePII(ctx.session.user)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return searchMentionUsers(ctx.db, input);
    }),
});
