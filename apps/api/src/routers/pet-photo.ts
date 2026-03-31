import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router, verifyMembership } from "../trpc.js";
import { db, pets, petPhotos, activities } from "@petforce/db";
import { updatePetPhotoSchema } from "@petforce/core";
import { deletePetPhotoFile } from "../lib/supabase-storage.js";

export const petPhotoRouter = router({
  listByPet: protectedProcedure
    .input(z.object({ petId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const [pet] = await db.select().from(pets).where(eq(pets.id, input.petId));
      if (!pet) return [];

      await verifyMembership(pet.householdId, ctx.userId);

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

      await verifyMembership(photo.householdId, ctx.userId);

      const [updated] = await db
        .update(petPhotos)
        .set(data)
        .where(eq(petPhotos.id, id))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [photo] = await db
        .select()
        .from(petPhotos)
        .where(eq(petPhotos.id, input.id));
      if (!photo) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Photo not found" });
      }

      await verifyMembership(photo.householdId, ctx.userId);

      // Delete from storage
      try {
        await deletePetPhotoFile(photo.householdId, photo.petId, photo.id, photo.url);
      } catch {
        // Storage delete failed, but still remove DB record
      }

      await db.delete(petPhotos).where(eq(petPhotos.id, input.id));
      return { success: true };
    }),

  listByActivity: protectedProcedure
    .input(z.object({ activityId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const [activity] = await db
        .select()
        .from(activities)
        .where(eq(activities.id, input.activityId));
      if (!activity) return [];

      await verifyMembership(activity.householdId, ctx.userId);

      return db
        .select()
        .from(petPhotos)
        .where(eq(petPhotos.activityId, input.activityId))
        .orderBy(desc(petPhotos.createdAt));
    }),

  linkToActivity: protectedProcedure
    .input(z.object({ photoId: z.uuid(), activityId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [photo] = await db
        .select()
        .from(petPhotos)
        .where(eq(petPhotos.id, input.photoId));
      if (!photo) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Photo not found" });
      }

      await verifyMembership(photo.householdId, ctx.userId);

      const [updated] = await db
        .update(petPhotos)
        .set({ activityId: input.activityId })
        .where(eq(petPhotos.id, input.photoId))
        .returning();
      return updated;
    }),
});
