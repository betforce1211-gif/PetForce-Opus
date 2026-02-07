import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../trpc";
import { db, activities } from "@petforce/db";
import { createActivitySchema, updateActivitySchema } from "@petforce/core";

export const activityRouter = router({
  listByHousehold: protectedProcedure
    .input(z.object({ householdId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(activities)
        .where(eq(activities.householdId, input.householdId));
    }),

  listByPet: protectedProcedure
    .input(z.object({ petId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(activities)
        .where(eq(activities.petId, input.petId));
    }),

  create: protectedProcedure
    .input(
      z.object({ householdId: z.string().uuid(), memberId: z.string().uuid() }).merge(
        createActivitySchema
      )
    )
    .mutation(async ({ input }) => {
      const [activity] = await db.insert(activities).values(input).returning();
      return activity;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(updateActivitySchema))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [activity] = await db
        .update(activities)
        .set(data)
        .where(eq(activities.id, id))
        .returning();
      return activity;
    }),

  complete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [activity] = await db
        .update(activities)
        .set({ completedAt: new Date() })
        .where(eq(activities.id, input.id))
        .returning();
      return activity;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(activities).where(eq(activities.id, input.id));
      return { success: true };
    }),
});
