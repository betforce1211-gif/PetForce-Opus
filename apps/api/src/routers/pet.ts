import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, householdProcedure, router } from "../trpc";
import { db, pets, members } from "@petforce/db";
import { createPetSchema, updatePetSchema } from "@petforce/core";

export const petRouter = router({
  listByHousehold: householdProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(pets)
      .where(eq(pets.householdId, ctx.householdId));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [pet] = await db
        .select()
        .from(pets)
        .where(eq(pets.id, input.id));
      if (!pet) return null;

      // Verify membership in pet's household
      const [membership] = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.householdId, pet.householdId),
            eq(members.userId, ctx.userId)
          )
        );
      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this pet's household",
        });
      }

      return pet;
    }),

  create: householdProcedure
    .input(createPetSchema)
    .mutation(async ({ ctx, input }) => {
      const [pet] = await db
        .insert(pets)
        .values({ ...input, householdId: ctx.householdId })
        .returning();
      return pet;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(updatePetSchema))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Look up pet and verify membership
      const [pet] = await db.select().from(pets).where(eq(pets.id, id));
      if (!pet) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pet not found" });
      }

      const [membership] = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.householdId, pet.householdId),
            eq(members.userId, ctx.userId)
          )
        );
      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this pet's household",
        });
      }

      const [updated] = await db
        .update(pets)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(pets.id, id))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Look up pet and verify membership + role
      const [pet] = await db.select().from(pets).where(eq(pets.id, input.id));
      if (!pet) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pet not found" });
      }

      const [membership] = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.householdId, pet.householdId),
            eq(members.userId, ctx.userId)
          )
        );
      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this pet's household",
        });
      }
      if (membership.role !== "owner" && membership.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can delete pets",
        });
      }

      await db.delete(pets).where(eq(pets.id, input.id));
      return { success: true };
    }),
});
