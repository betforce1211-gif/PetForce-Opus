import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { householdProcedure, router } from "../trpc";
import { db, petNotes, pets } from "@petforce/db";
import { createNoteSchema, updateNoteSchema } from "@petforce/core";

export const notesRouter = router({
  list: householdProcedure
    .input(
      z.object({
        petId: z.string().uuid().nullable().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select()
        .from(petNotes)
        .where(eq(petNotes.householdId, ctx.householdId))
        .orderBy(desc(petNotes.updatedAt));

      if (input.petId === null) {
        // Household-only notes
        return rows.filter((r) => r.petId === null);
      }
      if (input.petId) {
        return rows.filter((r) => r.petId === input.petId);
      }
      return rows;
    }),

  recent: householdProcedure.query(async ({ ctx }) => {
    const allNotes = await db
      .select()
      .from(petNotes)
      .where(eq(petNotes.householdId, ctx.householdId))
      .orderBy(desc(petNotes.updatedAt));

    const householdPets = await db
      .select()
      .from(pets)
      .where(eq(pets.householdId, ctx.householdId));
    const petMap = new Map(householdPets.map((p) => [p.id, p.name]));

    const recentNotes = allNotes.slice(0, 4).map((n) => ({
      id: n.id,
      title: n.title,
      snippet: n.content.length > 80 ? n.content.slice(0, 80) + "..." : n.content,
      petName: n.petId ? petMap.get(n.petId) ?? "Unknown" : null,
      updatedAt: n.updatedAt,
    }));

    return {
      notes: recentNotes,
      totalCount: allNotes.length,
    };
  }),

  create: householdProcedure
    .input(createNoteSchema)
    .mutation(async ({ ctx, input }) => {
      const [note] = await db
        .insert(petNotes)
        .values({
          householdId: ctx.householdId,
          petId: input.petId ?? null,
          title: input.title,
          content: input.content,
        })
        .returning();
      return note;
    }),

  update: householdProcedure
    .input(updateNoteSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [note] = await db
        .update(petNotes)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(
            eq(petNotes.id, id),
            eq(petNotes.householdId, ctx.householdId)
          )
        )
        .returning();
      return note;
    }),

  delete: householdProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(petNotes)
        .where(
          and(
            eq(petNotes.id, input.id),
            eq(petNotes.householdId, ctx.householdId)
          )
        );
      return { success: true };
    }),
});
