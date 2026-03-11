import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc.js";
import { db, pets, members, petPhotos } from "@petforce/db";
import { updatePetPhotoSchema } from "@petforce/core";
import { deletePetPhotoFile } from "../lib/supabase-storage.js";

export const petPhotoRouter = router({
  listByPet: protectedProcedure
    .input(z.object({ petId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify access
      const [pet] = await db.select().from(pets).where(eq(pets.id, input.petId));
      if (!pet) return [];

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

      return db
        .select()
        .from(petPhotos)
        .where(eq(petPhotos.petId, input.petId))
        .orderBy(desc(petPhotos.createdAt));
    }),

  update: protectedProcedure
    .input(updatePetPhotoSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [photo] = await db
        .select()
        .from(petPhotos)
        .where(eq(petPhotos.id, id));
      if (!photo) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Photo not found" });
      }

      const [membership] = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.householdId, photo.householdId),
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
        .update(petPhotos)
        .set(data)
        .where(eq(petPhotos.id, id))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [photo] = await db
        .select()
        .from(petPhotos)
        .where(eq(petPhotos.id, input.id));
      if (!photo) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Photo not found" });
      }

      const [membership] = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.householdId, photo.householdId),
            eq(members.userId, ctx.userId)
          )
        );
      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this pet's household",
        });
      }

      // Delete from storage
      try {
        await deletePetPhotoFile(photo.householdId, photo.petId, photo.id, photo.url);
      } catch {
        // Storage delete failed, but still remove DB record
      }

      await db.delete(petPhotos).where(eq(petPhotos.id, input.id));
      return { success: true };
    }),
});
