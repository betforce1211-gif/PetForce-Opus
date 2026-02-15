import { protectedProcedure, router } from "../trpc";
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
});
