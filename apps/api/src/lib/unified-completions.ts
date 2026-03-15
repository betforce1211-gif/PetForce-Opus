import { eq, and, gte, lte, inArray } from "drizzle-orm";
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

export interface CompletionCaches {
  schedules?: { id: string; label: string; householdId: string }[];
  medications?: { id: string; name: string; petId: string; householdId: string }[];
}

export async function fetchUnifiedCompletions(
  householdId: string,
  from: string,
  to: string,
  caches?: CompletionCaches
): Promise<RawCompletion[]> {
  const fromDate = new Date(`${from}T00:00:00Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);

  const results: RawCompletion[] = [];

  // Fetch all three log types in parallel
  const [fLogs, mLogs, completedActivities] = await Promise.all([
    db
      .select()
      .from(feedingLogs)
      .where(
        and(
          eq(feedingLogs.householdId, householdId),
          gte(feedingLogs.completedAt, fromDate),
          lte(feedingLogs.completedAt, toDate)
        )
      ),
    db
      .select()
      .from(medicationLogs)
      .where(
        and(
          eq(medicationLogs.householdId, householdId),
          gte(medicationLogs.loggedDate, from),
          lte(medicationLogs.loggedDate, to)
        )
      ),
    db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.householdId, householdId),
          gte(activities.completedAt, fromDate),
          lte(activities.completedAt, toDate)
        )
      ),
  ]);

  // --- Feeding logs ---
  if (fLogs.length > 0) {
    const scheduleIds = [...new Set(fLogs.map((l) => l.feedingScheduleId))];
    const schedules = caches?.schedules ??
      await db.select().from(feedingSchedules).where(inArray(feedingSchedules.id, scheduleIds));
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
  if (mLogs.length > 0) {
    const medicationIds = [...new Set(mLogs.map((l) => l.medicationId))];
    const meds = caches?.medications ??
      await db.select().from(medications).where(inArray(medications.id, medicationIds));
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
