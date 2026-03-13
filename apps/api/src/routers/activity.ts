import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, householdProcedure, router, verifyMembership } from "../trpc.js";
import { db, activities, pets } from "@petforce/db";
import { createActivitySchema, updateActivitySchema, paginationInput } from "@petforce/core";

export const activityRouter = router({
  listByHousehold: householdProcedure
    .input(paginationInput)
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(activities)
        .where(eq(activities.householdId, ctx.householdId))
        .orderBy(desc(activities.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  listByPet: householdProcedure
    .input(z.object({ petId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify the pet belongs to the claimed household
      const [pet] = await db
        .select()
        .from(pets)
        .where(eq(pets.id, input.petId));
      if (!pet || pet.householdId !== ctx.householdId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Pet does not belong to this household",
        });
      }

      return db
        .select()
        .from(activities)
        .where(
          and(
            eq(activities.petId, input.petId),
            eq(activities.householdId, ctx.householdId)
          )
        );
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

      const [existing] = await db
        .select()
        .from(activities)
        .where(eq(activities.id, id));
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Activity not found" });
      }

      await verifyMembership(existing.householdId, ctx.userId);

      // If petId is being changed, verify the new pet belongs to the same household
      if (data.petId && data.petId !== existing.petId) {
        const [pet] = await db
          .select()
          .from(pets)
          .where(eq(pets.id, data.petId));
        if (!pet || pet.householdId !== existing.householdId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Pet does not belong to this household",
          });
        }
      }

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
      const [existing] = await db
        .select()
        .from(activities)
        .where(eq(activities.id, input.id));
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Activity not found" });
      }

      const membership = await verifyMembership(existing.householdId, ctx.userId);

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
      const [existing] = await db
        .select()
        .from(activities)
        .where(eq(activities.id, input.id));
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Activity not found" });
      }

      await verifyMembership(existing.householdId, ctx.userId);

      await db.delete(activities).where(eq(activities.id, input.id));
      return { success: true };
    }),
});
