import { router, householdProcedure } from "../trpc.js";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
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
    const { membership, householdId } = ctx;

    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only owners and admins can export household data",
      });
    }

    // Fetch all data in parallel
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
      db.select().from(activities).where(eq(activities.householdId, householdId)),
      db.select().from(feedingSchedules).where(eq(feedingSchedules.householdId, householdId)),
      db.select().from(feedingLogs).where(eq(feedingLogs.householdId, householdId)),
      db.select().from(healthRecords).where(eq(healthRecords.householdId, householdId)),
      db.select().from(medications).where(eq(medications.householdId, householdId)),
      db.select().from(medicationLogs).where(eq(medicationLogs.householdId, householdId)),
      db.select().from(expenses).where(eq(expenses.householdId, householdId)),
      db.select().from(petNotes).where(eq(petNotes.householdId, householdId)),
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

    return {
      exportedAt: new Date().toISOString(),
      version: "1.0",
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
