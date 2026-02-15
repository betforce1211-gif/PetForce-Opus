import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { householdProcedure, router } from "../trpc";
import {
  db,
  healthRecords,
  medications,
  pets,
} from "@petforce/db";
import {
  createHealthRecordSchema,
  updateHealthRecordSchema,
  createMedicationSchema,
  updateMedicationSchema,
} from "@petforce/core";
import type { HealthSummary } from "@petforce/core";

export const healthRouter = router({
  // ── Health Records ──

  listRecords: householdProcedure
    .input(
      z.object({
        type: z
          .enum(["vet_visit", "vaccination", "checkup", "procedure"])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select()
        .from(healthRecords)
        .where(eq(healthRecords.householdId, ctx.householdId));

      if (input.type) {
        return rows.filter((r) => r.type === input.type);
      }
      return rows;
    }),

  createRecord: householdProcedure
    .input(createHealthRecordSchema)
    .mutation(async ({ ctx, input }) => {
      const [record] = await db
        .insert(healthRecords)
        .values({
          householdId: ctx.householdId,
          petId: input.petId,
          type: input.type,
          date: input.date,
          vetOrClinic: input.vetOrClinic ?? null,
          reason: input.reason ?? null,
          notes: input.notes ?? null,
          cost: input.cost ?? null,
          vaccineName: input.vaccineName ?? null,
          nextDueDate: input.nextDueDate ?? null,
        })
        .returning();
      return record;
    }),

  updateRecord: householdProcedure
    .input(updateHealthRecordSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [record] = await db
        .update(healthRecords)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(
            eq(healthRecords.id, id),
            eq(healthRecords.householdId, ctx.householdId)
          )
        )
        .returning();
      return record;
    }),

  deleteRecord: householdProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(healthRecords)
        .where(
          and(
            eq(healthRecords.id, input.id),
            eq(healthRecords.householdId, ctx.householdId)
          )
        );
      return { success: true };
    }),

  // ── Medications ──

  listMedications: householdProcedure
    .input(z.object({ activeOnly: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select()
        .from(medications)
        .where(eq(medications.householdId, ctx.householdId));

      if (input.activeOnly) {
        return rows.filter((m) => m.isActive);
      }
      return rows;
    }),

  createMedication: householdProcedure
    .input(createMedicationSchema)
    .mutation(async ({ ctx, input }) => {
      const [med] = await db
        .insert(medications)
        .values({
          householdId: ctx.householdId,
          petId: input.petId,
          name: input.name,
          dosage: input.dosage ?? null,
          frequency: input.frequency ?? null,
          startDate: input.startDate ?? null,
          endDate: input.endDate ?? null,
          prescribedBy: input.prescribedBy ?? null,
          notes: input.notes ?? null,
        })
        .returning();
      return med;
    }),

  updateMedication: householdProcedure
    .input(updateMedicationSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [med] = await db
        .update(medications)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(
            eq(medications.id, id),
            eq(medications.householdId, ctx.householdId)
          )
        )
        .returning();
      return med;
    }),

  deleteMedication: householdProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(medications)
        .where(
          and(
            eq(medications.id, input.id),
            eq(medications.householdId, ctx.householdId)
          )
        );
      return { success: true };
    }),

  // ── Dashboard summary ──

  summary: householdProcedure.query(async ({ ctx }) => {
    const now = new Date();

    // Active medications count
    const allMeds = await db
      .select()
      .from(medications)
      .where(
        and(
          eq(medications.householdId, ctx.householdId),
          eq(medications.isActive, true)
        )
      );

    // Overdue vaccinations: type=vaccination AND nextDueDate < now
    const allRecords = await db
      .select()
      .from(healthRecords)
      .where(eq(healthRecords.householdId, ctx.householdId));

    const overdueVaccinations = allRecords.filter(
      (r) =>
        r.type === "vaccination" &&
        r.nextDueDate &&
        new Date(r.nextDueDate) < now
    );

    // Next future appointment (vet_visit, checkup, or procedure with date > now)
    const futureAppointments = allRecords
      .filter(
        (r) =>
          (r.type === "vet_visit" ||
            r.type === "checkup" ||
            r.type === "procedure") &&
          new Date(r.date) > now
      )
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

    let nextAppointment: HealthSummary["nextAppointment"] = null;
    if (futureAppointments.length > 0) {
      const appt = futureAppointments[0];
      const householdPets = await db
        .select()
        .from(pets)
        .where(eq(pets.householdId, ctx.householdId));
      const petMap = new Map(householdPets.map((p) => [p.id, p.name]));
      nextAppointment = {
        petName: petMap.get(appt.petId) ?? "Unknown",
        date: appt.date.toISOString(),
        reason: appt.reason,
      };
    }

    const result: HealthSummary = {
      activeMedicationCount: allMeds.length,
      overdueVaccinationCount: overdueVaccinations.length,
      nextAppointment,
    };

    return result;
  }),
});
