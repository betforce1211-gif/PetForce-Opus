import { eq, and, gte, lte } from "drizzle-orm";
import {
  db,
  feedingLogs,
  feedingSchedules,
  medicationLogs,
  medications,
  activities,
} from "@petforce/db";
import type { ReportTaskType } from "@petforce/core";

export interface RawCompletion {
  id: string;
  taskType: ReportTaskType;
  taskName: string;
  petId: string;
  completedById: string;
  completedAt: Date;
  skipped: boolean;
}

export async function fetchUnifiedCompletions(
  householdId: string,
  from: string,
  to: string
): Promise<RawCompletion[]> {
  const fromDate = new Date(`${from}T00:00:00Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);

  const results: RawCompletion[] = [];

  // --- Feeding logs ---
  const fLogs = await db
    .select()
    .from(feedingLogs)
    .where(
      and(
        eq(feedingLogs.householdId, householdId),
        gte(feedingLogs.completedAt, fromDate),
        lte(feedingLogs.completedAt, toDate)
      )
    );

  if (fLogs.length > 0) {
    const schedules = await db
      .select()
      .from(feedingSchedules)
      .where(eq(feedingSchedules.householdId, householdId));
    const scheduleMap = new Map(schedules.map((s) => [s.id, s.label]));

    for (const log of fLogs) {
      results.push({
        id: log.id,
        taskType: "feeding",
        taskName: scheduleMap.get(log.feedingScheduleId) ?? "Feeding",
        petId: log.petId,
        completedById: log.completedBy,
        completedAt: log.completedAt,
        skipped: log.skipped,
      });
    }
  }

  // --- Medication logs ---
  const mLogs = await db
    .select()
    .from(medicationLogs)
    .where(
      and(
        eq(medicationLogs.householdId, householdId),
        gte(medicationLogs.loggedDate, from),
        lte(medicationLogs.loggedDate, to)
      )
    );

  if (mLogs.length > 0) {
    const meds = await db
      .select()
      .from(medications)
      .where(eq(medications.householdId, householdId));
    const medMap = new Map(meds.map((m) => [m.id, { name: m.name, petId: m.petId }]));

    for (const log of mLogs) {
      const med = medMap.get(log.medicationId);
      results.push({
        id: log.id,
        taskType: "medication",
        taskName: med?.name ?? "Medication",
        petId: med?.petId ?? "",
        completedById: log.loggedBy,
        completedAt: log.createdAt,
        skipped: log.skipped,
      });
    }
  }

  // --- Activities (completed ones) ---
  const completedActivities = await db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.householdId, householdId),
        gte(activities.completedAt, fromDate),
        lte(activities.completedAt, toDate)
      )
    );

  for (const act of completedActivities) {
    if (act.completedAt && act.completedBy) {
      results.push({
        id: act.id,
        taskType: "activity",
        taskName: act.title,
        petId: act.petId,
        completedById: act.completedBy,
        completedAt: act.completedAt,
        skipped: false,
      });
    }
  }

  return results;
}
