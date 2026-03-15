import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { protectedProcedure, router } from "../trpc.js";
import { db, analyticsEvents } from "@petforce/db";
import { trackEventSchema } from "@petforce/core";

export const analyticsRouter = router({
  track: protectedProcedure.input(trackEventSchema).mutation(async ({ ctx, input }) => {
    const [event] = await db
      .insert(analyticsEvents)
      .values({
        userId: ctx.userId,
        householdId: input.householdId ?? null,
        eventName: input.eventName,
        metadata: input.metadata ?? null,
      })
      .returning();
    return event;
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await db
        .delete(analyticsEvents)
        .where(and(eq(analyticsEvents.id, input.id), eq(analyticsEvents.userId, ctx.userId)))
        .returning();
      return deleted ?? null;
    }),
});
