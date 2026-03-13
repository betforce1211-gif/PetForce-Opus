import { router, householdProcedure, requireAdmin } from "../trpc.js";
import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";
import {
  db,
  households,
  members,
  pets,
  activities,
  feedingSchedules,
  feedingLogs,
  healthRecords,
  medications,
  medicationLogs,
  expenses,
  petNotes,
  memberGameStats,
  householdGameStats,
  petGameStats,
} from "@petforce/db";

export const exportRouter = router({
  /**
   * Export all household data as a structured JSON object.
   * Restricted to owners and admins.
   */
  household: householdProcedure.query(async ({ ctx }) => {
    const { householdId } = ctx;
    requireAdmin(ctx.membership);

    // Safety cap for log/time-series tables to prevent OOM on large households
    const ROW_LIMIT = 10_000;

    // Fetch all data in parallel (reference tables unbounded, log tables capped)
    const [
      householdRows,
      memberRows,
      petRows,
      activityRows,
      feedingScheduleRows,
      feedingLogRows,
      healthRecordRows,
      medicationRows,
      medicationLogRows,
      expenseRows,
      noteRows,
      memberGameRows,
      householdGameRows,
      petGameRows,
    ] = await Promise.all([
      db.select().from(households).where(eq(households.id, householdId)),
      db.select().from(members).where(eq(members.householdId, householdId)),
      db.select().from(pets).where(eq(pets.householdId, householdId)),
      db.select().from(activities).where(eq(activities.householdId, householdId)).orderBy(desc(activities.createdAt)).limit(ROW_LIMIT),
      db.select().from(feedingSchedules).where(eq(feedingSchedules.householdId, householdId)),
      db.select().from(feedingLogs).where(eq(feedingLogs.householdId, householdId)).orderBy(desc(feedingLogs.completedAt)).limit(ROW_LIMIT),
      db.select().from(healthRecords).where(eq(healthRecords.householdId, householdId)).orderBy(desc(healthRecords.createdAt)).limit(ROW_LIMIT),
      db.select().from(medications).where(eq(medications.householdId, householdId)),
      db.select().from(medicationLogs).where(eq(medicationLogs.householdId, householdId)).orderBy(desc(medicationLogs.createdAt)).limit(ROW_LIMIT),
      db.select().from(expenses).where(eq(expenses.householdId, householdId)).orderBy(desc(expenses.createdAt)).limit(ROW_LIMIT),
      db.select().from(petNotes).where(eq(petNotes.householdId, householdId)).orderBy(desc(petNotes.createdAt)).limit(ROW_LIMIT),
      db.select().from(memberGameStats).where(eq(memberGameStats.householdId, householdId)),
      db.select().from(householdGameStats).where(eq(householdGameStats.householdId, householdId)),
      db.select().from(petGameStats).where(eq(petGameStats.householdId, householdId)),
    ]);

    const household = householdRows[0];
    if (!household) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Household not found" });
    }

    // Build member lookup for readable names in logs
    const memberLookup = Object.fromEntries(
      memberRows.map((m) => [m.id, m.displayName])
    );

    // Build lookup maps for O(1) grouping
    const schedulesByPet = new Map<string, typeof feedingScheduleRows>();
    for (const fs of feedingScheduleRows) {
      const arr = schedulesByPet.get(fs.petId) ?? [];
      arr.push(fs);
      schedulesByPet.set(fs.petId, arr);
    }

    const logsBySchedule = new Map<string, typeof feedingLogRows>();
    for (const fl of feedingLogRows) {
      const arr = logsBySchedule.get(fl.feedingScheduleId) ?? [];
      arr.push(fl);
      logsBySchedule.set(fl.feedingScheduleId, arr);
    }

    const healthByPet = new Map<string, typeof healthRecordRows>();
    for (const hr of healthRecordRows) {
      const arr = healthByPet.get(hr.petId) ?? [];
      arr.push(hr);
      healthByPet.set(hr.petId, arr);
    }

    const medsByPet = new Map<string, typeof medicationRows>();
    for (const med of medicationRows) {
      const arr = medsByPet.get(med.petId) ?? [];
      arr.push(med);
      medsByPet.set(med.petId, arr);
    }

    const medLogsByMed = new Map<string, typeof medicationLogRows>();
    for (const ml of medicationLogRows) {
      const arr = medLogsByMed.get(ml.medicationId) ?? [];
      arr.push(ml);
      medLogsByMed.set(ml.medicationId, arr);
    }

    const activitiesByPet = new Map<string, typeof activityRows>();
    for (const a of activityRows) {
      const arr = activitiesByPet.get(a.petId) ?? [];
      arr.push(a);
      activitiesByPet.set(a.petId, arr);
    }

    const expensesByPet = new Map<string, typeof expenseRows>();
    for (const e of expenseRows) {
      if (!e.petId) continue;
      const arr = expensesByPet.get(e.petId) ?? [];
      arr.push(e);
      expensesByPet.set(e.petId, arr);
    }

    const notesByPet = new Map<string, typeof noteRows>();
    for (const n of noteRows) {
      if (!n.petId) continue;
      const arr = notesByPet.get(n.petId) ?? [];
      arr.push(n);
      notesByPet.set(n.petId, arr);
    }

    // Build O(1) lookup for pet game stats
    const petGameMap = new Map(petGameRows.map((g) => [g.petId, g]));

    // Group pet-related data by petId
    const petData = petRows.map((pet) => ({
      ...pet,
      feedingSchedules: (schedulesByPet.get(pet.id) ?? []).map((fs) => ({
        ...fs,
        logs: logsBySchedule.get(fs.id) ?? [],
      })),
      healthRecords: healthByPet.get(pet.id) ?? [],
      medications: (medsByPet.get(pet.id) ?? []).map((med) => ({
        ...med,
        logs: medLogsByMed.get(med.id) ?? [],
      })),
      activities: activitiesByPet.get(pet.id) ?? [],
      expenses: expensesByPet.get(pet.id) ?? [],
      notes: notesByPet.get(pet.id) ?? [],
      gamification: petGameMap.get(pet.id) ?? null,
    }));

    // Household-level notes (no pet attached)
    const householdNotes = noteRows.filter((n) => !n.petId);

    const truncated =
      activityRows.length >= ROW_LIMIT ||
      feedingLogRows.length >= ROW_LIMIT ||
      healthRecordRows.length >= ROW_LIMIT ||
      medicationLogRows.length >= ROW_LIMIT ||
      expenseRows.length >= ROW_LIMIT ||
      noteRows.length >= ROW_LIMIT;

    return {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      truncated,
      household: {
        name: household.name,
        theme: household.theme,
        createdAt: household.createdAt,
      },
      members: memberRows.map((m) => ({
        displayName: m.displayName,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      pets: petData,
      householdNotes,
      gamification: {
        household: householdGameRows[0] ?? null,
        members: memberGameRows.map((mg) => ({
          ...mg,
          memberName: memberLookup[mg.memberId] ?? "Unknown",
        })),
      },
    };
  }),
});
