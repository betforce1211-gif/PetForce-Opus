import { z } from "zod";
import { eq, and, lt, gt, asc, desc, inArray, count as drizzleCount } from "drizzle-orm";
import { householdProcedure, router } from "../trpc.js";
import {
  db,
  healthRecords,
  medications,
  medicationLogs,
  medicationSnoozes,
  pets,
} from "@petforce/db";
import {
  createHealthRecordSchema,
  updateHealthRecordSchema,
  createMedicationSchema,
  updateMedicationSchema,
  paginationInput,
} from "@petforce/core";
import type { HealthSummary, MedicationStatus, HouseholdMedicationStatus } from "@petforce/core";
import { logActivity } from "../lib/audit.js";

export const healthRouter = router({
  // ── Health Records ──

  listRecords: householdProcedure
    .input(
      z.object({
        type: z
          .enum(["vet_visit", "vaccination", "checkup", "procedure"])
          .optional(),
      }).merge(paginationInput)
    )
    .query(async ({ ctx, input }) => {
      const where = input.type
        ? and(eq(healthRecords.householdId, ctx.householdId), eq(healthRecords.type, input.type))
        : eq(healthRecords.householdId, ctx.householdId);
      const [items, [{ count }]] = await Promise.all([
        db
          .select()
          .from(healthRecords)
          .where(where)
          .orderBy(desc(healthRecords.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: drizzleCount() }).from(healthRecords).where(where),
      ]);
      return { items, totalCount: count };
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

      await logActivity({
        householdId: ctx.householdId,
        action: "health_record.updated",
        subjectType: "health_record",
        subjectId: record.id,
        subjectName: record.type,
        performedBy: ctx.membership.id,
        metadata: { recordType: record.type, changedFields: Object.keys(data) },
      });

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
    .input(z.object({ activeOnly: z.boolean().optional() }).merge(paginationInput))
    .query(async ({ ctx, input }) => {
      const where = input.activeOnly
        ? and(eq(medications.householdId, ctx.householdId), eq(medications.isActive, true))
        : eq(medications.householdId, ctx.householdId);
      const [items, [{ count }]] = await Promise.all([
        db
          .select()
          .from(medications)
          .where(where)
          .orderBy(desc(medications.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: drizzleCount() }).from(medications).where(where),
      ]);
      return { items, totalCount: count };
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

      await logActivity({
        householdId: ctx.householdId,
        action: "medication.updated",
        subjectType: "medication",
        subjectId: med.id,
        subjectName: med.name,
        performedBy: ctx.membership.id,
        metadata: { changedFields: Object.keys(data) },
      });

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

  // ── Medication daily status ──

  todayMedicationStatus: householdProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }))
    .query(async ({ ctx, input }) => {
      const today = input.date ?? new Date().toISOString().split("T")[0];

      const activeMeds = await db
        .select()
        .from(medications)
        .where(
          and(
            eq(medications.householdId, ctx.householdId),
            eq(medications.isActive, true)
          )
        );

      const logs = await db
        .select()
        .from(medicationLogs)
        .where(
          and(
            eq(medicationLogs.householdId, ctx.householdId),
            eq(medicationLogs.loggedDate, today)
          )
        );

      const householdPets = await db
        .select()
        .from(pets)
        .where(eq(pets.householdId, ctx.householdId));

      const snoozes = await db
        .select()
        .from(medicationSnoozes)
        .where(
          and(
            eq(medicationSnoozes.householdId, ctx.householdId),
            eq(medicationSnoozes.snoozeDate, today),
            eq(medicationSnoozes.snoozedBy, ctx.membership.id)
          )
        );

      const petMap = new Map(householdPets.map((p) => [p.id, p.name]));
      const logByMed = new Map(logs.map((l) => [l.medicationId, l]));
      const snoozeByMed = new Map(snoozes.map((s) => [s.medicationId, s]));

      const statuses: MedicationStatus[] = activeMeds.map((med) => ({
        medication: med,
        petName: petMap.get(med.petId) ?? "Unknown",
        log: logByMed.get(med.id) ?? null,
        snooze: snoozeByMed.get(med.id) ?? null,
      }));

      statuses.sort((a, b) => a.medication.name.localeCompare(b.medication.name));

      const result: HouseholdMedicationStatus = {
        date: today,
        medications: statuses,
        totalActive: activeMeds.length,
        totalLogged: logs.length,
      };

      return result;
    }),

  logMedicationCompletion: householdProcedure
    .input(z.object({
      medicationId: z.string().uuid(),
      loggedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      skipped: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [log] = await db
        .insert(medicationLogs)
        .values({
          medicationId: input.medicationId,
          householdId: ctx.householdId,
          loggedDate: input.loggedDate,
          loggedBy: ctx.membership.id,
          skipped: input.skipped ?? false,
        })
        .returning();
      return log;
    }),

  undoMedicationLog: householdProcedure
    .input(z.object({ medicationLogId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(medicationLogs)
        .where(
          and(
            eq(medicationLogs.id, input.medicationLogId),
            eq(medicationLogs.householdId, ctx.householdId)
          )
        );
      return { success: true };
    }),

  snoozeMedication: householdProcedure
    .input(z.object({
      medicationId: z.string().uuid(),
      snoozeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      snoozeDurationMinutes: z.number().min(1).max(1440),
    }))
    .mutation(async ({ ctx, input }) => {
      const snoozedUntil = new Date(Date.now() + input.snoozeDurationMinutes * 60 * 1000);

      await db
        .delete(medicationSnoozes)
        .where(
          and(
            eq(medicationSnoozes.medicationId, input.medicationId),
            eq(medicationSnoozes.householdId, ctx.householdId),
            eq(medicationSnoozes.snoozeDate, input.snoozeDate),
            eq(medicationSnoozes.snoozedBy, ctx.membership.id)
          )
        );

      const [snooze] = await db
        .insert(medicationSnoozes)
        .values({
          medicationId: input.medicationId,
          householdId: ctx.householdId,
          snoozeDate: input.snoozeDate,
          snoozedUntil,
          snoozedBy: ctx.membership.id,
        })
        .returning();

      return snooze;
    }),

  undoMedicationSnooze: householdProcedure
    .input(z.object({
      medicationId: z.string().uuid(),
      snoozeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(medicationSnoozes)
        .where(
          and(
            eq(medicationSnoozes.medicationId, input.medicationId),
            eq(medicationSnoozes.householdId, ctx.householdId),
            eq(medicationSnoozes.snoozeDate, input.snoozeDate),
            eq(medicationSnoozes.snoozedBy, ctx.membership.id)
          )
        );
      return { success: true };
    }),

  // ── Dashboard summary ──

  summary: householdProcedure.query(async ({ ctx }) => {
    const now = new Date();

    // Fetch only the data we need with targeted queries
    const [allMeds, overdueVaccinations, nextAppointmentRows] = await Promise.all([
      db
        .select()
        .from(medications)
        .where(
          and(
            eq(medications.householdId, ctx.householdId),
            eq(medications.isActive, true)
          )
        ),
      db
        .select()
        .from(healthRecords)
        .where(
          and(
            eq(healthRecords.householdId, ctx.householdId),
            eq(healthRecords.type, "vaccination"),
            lt(healthRecords.nextDueDate, now)
          )
        ),
      db
        .select({
          petId: healthRecords.petId,
          date: healthRecords.date,
          reason: healthRecords.reason,
        })
        .from(healthRecords)
        .where(
          and(
            eq(healthRecords.householdId, ctx.householdId),
            inArray(healthRecords.type, ["vet_visit", "checkup", "procedure"]),
            gt(healthRecords.date, now)
          )
        )
        .orderBy(asc(healthRecords.date))
        .limit(1),
    ]);

    let nextAppointment: HealthSummary["nextAppointment"] = null;
    if (nextAppointmentRows.length > 0) {
      const appt = nextAppointmentRows[0];
      // Fetch pet name only if we have an appointment
      const [pet] = await db
        .select({ name: pets.name })
        .from(pets)
        .where(eq(pets.id, appt.petId));
      nextAppointment = {
        petName: pet?.name ?? "Unknown",
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
