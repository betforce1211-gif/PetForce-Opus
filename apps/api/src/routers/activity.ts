import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, householdProcedure, router } from "../trpc";
import { db, activities, members } from "@petforce/db";
import { createActivitySchema, updateActivitySchema } from "@petforce/core";

/** Helper: verify user is a member of the activity's household, return membership */
async function verifyActivityMembership(activityId: string, userId: string) {
  const [activity] = await db
    .select()
    .from(activities)
    .where(eq(activities.id, activityId));

  if (!activity) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Activity not found" });
  }

  const [membership] = await db
    .select()
    .from(members)
    .where(
      and(
        eq(members.householdId, activity.householdId),
        eq(members.userId, userId)
      )
    );

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of this activity's household",
    });
  }

  return { activity, membership };
}

export const activityRouter = router({
  listByHousehold: householdProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(activities)
      .where(eq(activities.householdId, ctx.householdId));
  }),

  listByPet: protectedProcedure
    .input(z.object({ petId: z.string().uuid(), householdId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify membership in the household
      const [membership] = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.householdId, input.householdId),
            eq(members.userId, ctx.userId)
          )
        );
      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this household",
        });
      }

      return db
        .select()
        .from(activities)
        .where(eq(activities.petId, input.petId));
    }),

  create: householdProcedure
    .input(createActivitySchema)
    .mutation(async ({ ctx, input }) => {
      const [activity] = await db
        .insert(activities)
        .values({
          ...input,
          householdId: ctx.householdId,
          memberId: ctx.membership.id,
        })
        .returning();
      return activity;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(updateActivitySchema))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await verifyActivityMembership(id, ctx.userId);

      const [activity] = await db
        .update(activities)
        .set(data)
        .where(eq(activities.id, id))
        .returning();
      return activity;
    }),

  complete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { membership } = await verifyActivityMembership(input.id, ctx.userId);

      const [activity] = await db
        .update(activities)
        .set({
          completedAt: new Date(),
          completedBy: membership.id,
        })
        .where(eq(activities.id, input.id))
        .returning();
      return activity;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await verifyActivityMembership(input.id, ctx.userId);

      await db.delete(activities).where(eq(activities.id, input.id));
      return { success: true };
    }),
});
