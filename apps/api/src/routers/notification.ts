import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { householdProcedure, router } from "../trpc.js";
import { db, members, notificationPreferences } from "@petforce/db";
import { updateNotificationPreferencesSchema } from "@petforce/core";
import type { NotificationPreferences } from "@petforce/core";

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

  getPreferences: householdProcedure.query(async ({ ctx }) => {
    const defaults: NotificationPreferences = {
      streakAlerts: true,
      budgetAlerts: true,
      weeklyDigest: true,
      achievementAlerts: true,
    };

    const [record] = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.memberId, ctx.membership.id),
          eq(notificationPreferences.householdId, ctx.householdId),
        ),
      );

    return record?.preferences ?? defaults;
  }),

  updatePreferences: householdProcedure
    .input(updateNotificationPreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      // Get current preferences or defaults
      const [existing] = await db
        .select()
        .from(notificationPreferences)
        .where(
          and(
            eq(notificationPreferences.memberId, ctx.membership.id),
            eq(notificationPreferences.householdId, ctx.householdId),
          ),
        );

      const merged: NotificationPreferences = {
        streakAlerts: input.streakAlerts ?? existing?.preferences?.streakAlerts ?? true,
        budgetAlerts: input.budgetAlerts ?? existing?.preferences?.budgetAlerts ?? true,
        weeklyDigest: input.weeklyDigest ?? existing?.preferences?.weeklyDigest ?? true,
        achievementAlerts: input.achievementAlerts ?? existing?.preferences?.achievementAlerts ?? true,
      };

      if (existing) {
        const [updated] = await db
          .update(notificationPreferences)
          .set({ preferences: merged, updatedAt: new Date() })
          .where(eq(notificationPreferences.id, existing.id))
          .returning();
        return updated.preferences;
      }

      const [created] = await db
        .insert(notificationPreferences)
        .values({
          memberId: ctx.membership.id,
          householdId: ctx.householdId,
          preferences: merged,
        })
        .returning();
      return created.preferences;
    }),
});
