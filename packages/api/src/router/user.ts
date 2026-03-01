import type { TRPCRouterRecord } from "@trpc/server";
import { eq } from "@acme/db";
import { z } from "zod/v4";

import { user } from "@acme/db/schema";

import { protectedProcedure } from "../trpc";

export const userRouter = {
  updateDisplayName: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(50).trim() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(user)
        .set({ name: input.name })
        .where(eq(user.id, ctx.session.user.id));

      return { name: input.name };
    }),
} satisfies TRPCRouterRecord;
