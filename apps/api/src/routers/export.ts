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

    // Group pet-related data by petId
    const petData = petRows.map((pet) => ({
      ...pet,
      feedingSchedules: feedingScheduleRows
        .filter((fs) => fs.petId === pet.id)
        .map((fs) => ({
          ...fs,
          logs: feedingLogRows.filter((fl) => fl.feedingScheduleId === fs.id),
        })),
      healthRecords: healthRecordRows.filter((hr) => hr.petId === pet.id),
      medications: medicationRows
        .filter((med) => med.petId === pet.id)
        .map((med) => ({
          ...med,
          logs: medicationLogRows.filter((ml) => ml.medicationId === med.id),
        })),
      activities: activityRows.filter((a) => a.petId === pet.id),
      expenses: expenseRows.filter((e) => e.petId === pet.id),
      notes: noteRows.filter((n) => n.petId === pet.id),
      gamification: petGameRows.find((g) => g.petId === pet.id) ?? null,
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
