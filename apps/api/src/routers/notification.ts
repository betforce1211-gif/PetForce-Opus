import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { householdProcedure, router } from "../trpc.js";
import { db, members } from "@petforce/db";

export const notificationRouter = router({
  /**
   * Register (or update) the Expo push token for the current member.
   * Called by the mobile app on startup or when the token changes.
   */
  registerPushToken: householdProcedure
    .input(z.object({ expoPushToken: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(members)
        .set({ expoPushToken: input.expoPushToken })
        .where(
          and(
            eq(members.id, ctx.membership.id),
            eq(members.householdId, ctx.householdId),
          ),
        )
        .returning({ id: members.id });

      return { success: !!updated };
    }),

  /**
   * Remove the push token for the current member (e.g. on logout).
   */
  unregisterPushToken: householdProcedure.mutation(async ({ ctx }) => {
    await db
      .update(members)
      .set({ expoPushToken: null })
      .where(
        and(
          eq(members.id, ctx.membership.id),
          eq(members.householdId, ctx.householdId),
        ),
      );

    return { success: true };
  }),

  /**
   * Update the member's notification email.
   * This is the email used for notification delivery (separate from Clerk auth email).
   */
  updateEmail: householdProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(members)
        .set({ email: input.email })
        .where(
          and(
            eq(members.id, ctx.membership.id),
            eq(members.householdId, ctx.householdId),
          ),
        )
        .returning({ id: members.id, email: members.email });

      return updated;
    }),
});
