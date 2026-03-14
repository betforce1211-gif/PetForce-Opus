import { z } from "zod";
import { eq, and, desc, isNull, count as drizzleCount } from "drizzle-orm";
import { householdProcedure, router } from "../trpc.js";
import { db, petNotes, pets } from "@petforce/db";
import { createNoteSchema, updateNoteSchema, paginationInput } from "@petforce/core";

export const notesRouter = router({
  list: householdProcedure
    .input(
      z.object({
        petId: z.string().uuid().nullable().optional(),
      }).merge(paginationInput)
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(petNotes.householdId, ctx.householdId)];
      if (input.petId === null) {
        conditions.push(isNull(petNotes.petId));
      } else if (input.petId) {
        conditions.push(eq(petNotes.petId, input.petId));
      }
      const where = and(...conditions);

      const [items, [{ count }]] = await Promise.all([
        db
          .select()
          .from(petNotes)
          .where(where)
          .orderBy(desc(petNotes.updatedAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: drizzleCount() }).from(petNotes).where(where),
      ]);
      return { items, totalCount: count };
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
