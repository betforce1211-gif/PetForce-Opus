import { eq, and, gte, lte } from "drizzle-orm";
import { householdProcedure, router } from "../trpc";
import {
  db,
  feedingLogs,
  feedingSchedules,
  medicationLogs,
  medications,
  activities,
  pets,
  members,
} from "@petforce/db";
import {
  reportDateRangeSchema,
  reportingCompletionLogSchema,
  reportingTrendsSchema,
} from "@petforce/core";
import type {
  ReportTaskType,
  TaskCompletionEntry,
  MemberContribution,
  TrendDataPoint,
  ReportingSummary,
} from "@petforce/core";

interface RawCompletion {
  id: string;
  taskType: ReportTaskType;
  taskName: string;
  petId: string;
  completedById: string;
  completedAt: Date;
  skipped: boolean;
}

async function fetchUnifiedCompletions(
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

export const reportingRouter = router({
  completionLog: householdProcedure
    .input(reportingCompletionLogSchema)
    .query(async ({ ctx, input }) => {
      const raw = await fetchUnifiedCompletions(
        ctx.householdId,
        input.from,
        input.to
      );

      // Fetch lookup maps
      const householdPets = await db
        .select()
        .from(pets)
        .where(eq(pets.householdId, ctx.householdId));
      const petMap = new Map(householdPets.map((p) => [p.id, p.name]));

      const householdMembers = await db
        .select()
        .from(members)
        .where(eq(members.householdId, ctx.householdId));
      const memberMap = new Map(
        householdMembers.map((m) => [m.id, m.displayName])
      );

      let filtered = raw;

      if (input.memberId) {
        filtered = filtered.filter((r) => r.completedById === input.memberId);
      }
      if (input.petId) {
        filtered = filtered.filter((r) => r.petId === input.petId);
      }
      if (input.taskType) {
        filtered = filtered.filter((r) => r.taskType === input.taskType);
      }

      // Sort by completedAt desc
      filtered.sort(
        (a, b) => b.completedAt.getTime() - a.completedAt.getTime()
      );

      // Paginate
      const offset = input.offset ?? 0;
      const limit = input.limit ?? 50;
      const page = filtered.slice(offset, offset + limit);

      const entries: TaskCompletionEntry[] = page.map((r) => ({
        id: r.id,
        taskType: r.taskType,
        taskName: r.taskName,
        petId: r.petId,
        petName: petMap.get(r.petId) ?? "Unknown",
        completedById: r.completedById,
        completedByName: memberMap.get(r.completedById) ?? "Unknown",
        completedAt: r.completedAt.toISOString(),
        skipped: r.skipped,
      }));

      return entries;
    }),

  contributions: householdProcedure
    .input(reportDateRangeSchema)
    .query(async ({ ctx, input }) => {
      const raw = await fetchUnifiedCompletions(
        ctx.householdId,
        input.from,
        input.to
      );

      const householdMembers = await db
        .select()
        .from(members)
        .where(eq(members.householdId, ctx.householdId));
      const memberMap = new Map(
        householdMembers.map((m) => [m.id, m.displayName])
      );

      // Aggregate per member
      const byMember = new Map<
        string,
        {
          completed: number;
          skipped: number;
          byType: Map<ReportTaskType, { completed: number; skipped: number }>;
        }
      >();

      for (const r of raw) {
        let entry = byMember.get(r.completedById);
        if (!entry) {
          entry = { completed: 0, skipped: 0, byType: new Map() };
          byMember.set(r.completedById, entry);
        }

        if (r.skipped) {
          entry.skipped++;
        } else {
          entry.completed++;
        }

        let typeEntry = entry.byType.get(r.taskType);
        if (!typeEntry) {
          typeEntry = { completed: 0, skipped: 0 };
          entry.byType.set(r.taskType, typeEntry);
        }
        if (r.skipped) {
          typeEntry.skipped++;
        } else {
          typeEntry.completed++;
        }
      }

      const contributions: MemberContribution[] = [];
      for (const [memberId, data] of byMember) {
        contributions.push({
          memberId,
          memberName: memberMap.get(memberId) ?? "Unknown",
          completed: data.completed,
          skipped: data.skipped,
          byType: Array.from(data.byType.entries()).map(
            ([taskType, counts]) => ({
              taskType,
              ...counts,
            })
          ),
        });
      }

      // Sort by completed desc
      contributions.sort((a, b) => b.completed - a.completed);

      return contributions;
    }),

  trends: householdProcedure
    .input(reportingTrendsSchema)
    .query(async ({ ctx, input }) => {
      const raw = await fetchUnifiedCompletions(
        ctx.householdId,
        input.from,
        input.to
      );

      const granularity = input.granularity ?? "daily";

      function bucketKey(date: Date): string {
        const iso = date.toISOString().split("T")[0];
        if (granularity === "daily") return iso;
        // Weekly: ISO week (YYYY-Www)
        const d = new Date(iso);
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil(
          ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
        );
        return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
      }

      const buckets = new Map<string, { completed: number; skipped: number }>();

      for (const r of raw) {
        const key = bucketKey(r.completedAt);
        let bucket = buckets.get(key);
        if (!bucket) {
          bucket = { completed: 0, skipped: 0 };
          buckets.set(key, bucket);
        }
        if (r.skipped) {
          bucket.skipped++;
        } else {
          bucket.completed++;
        }
      }

      const points: TrendDataPoint[] = Array.from(buckets.entries())
        .map(([date, counts]) => ({ date, ...counts }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return points;
    }),

  summary: householdProcedure
    .input(reportDateRangeSchema)
    .query(async ({ ctx, input }) => {
      const raw = await fetchUnifiedCompletions(
        ctx.householdId,
        input.from,
        input.to
      );

      const householdMembers = await db
        .select()
        .from(members)
        .where(eq(members.householdId, ctx.householdId));
      const memberMap = new Map(
        householdMembers.map((m) => [m.id, m.displayName])
      );

      const totalCompleted = raw.filter((r) => !r.skipped).length;
      const totalSkipped = raw.filter((r) => r.skipped).length;
      const total = totalCompleted + totalSkipped;
      const completionRate = total > 0 ? totalCompleted / total : 0;

      // Find top contributor
      const memberCounts = new Map<string, number>();
      for (const r of raw) {
        if (!r.skipped) {
          memberCounts.set(
            r.completedById,
            (memberCounts.get(r.completedById) ?? 0) + 1
          );
        }
      }

      let topContributor: ReportingSummary["topContributor"] = null;
      let maxCount = 0;
      for (const [memberId, count] of memberCounts) {
        if (count > maxCount) {
          maxCount = count;
          topContributor = {
            memberId,
            memberName: memberMap.get(memberId) ?? "Unknown",
            count,
          };
        }
      }

      // Build contributions (reuse logic)
      const byMember = new Map<
        string,
        {
          completed: number;
          skipped: number;
          byType: Map<ReportTaskType, { completed: number; skipped: number }>;
        }
      >();

      for (const r of raw) {
        let entry = byMember.get(r.completedById);
        if (!entry) {
          entry = { completed: 0, skipped: 0, byType: new Map() };
          byMember.set(r.completedById, entry);
        }
        if (r.skipped) {
          entry.skipped++;
        } else {
          entry.completed++;
        }
        let typeEntry = entry.byType.get(r.taskType);
        if (!typeEntry) {
          typeEntry = { completed: 0, skipped: 0 };
          entry.byType.set(r.taskType, typeEntry);
        }
        if (r.skipped) {
          typeEntry.skipped++;
        } else {
          typeEntry.completed++;
        }
      }

      const contributions: MemberContribution[] = [];
      for (const [memberId, data] of byMember) {
        contributions.push({
          memberId,
          memberName: memberMap.get(memberId) ?? "Unknown",
          completed: data.completed,
          skipped: data.skipped,
          byType: Array.from(data.byType.entries()).map(
            ([taskType, counts]) => ({
              taskType,
              ...counts,
            })
          ),
        });
      }
      contributions.sort((a, b) => b.completed - a.completed);

      const result: ReportingSummary = {
        dateRange: { from: input.from, to: input.to },
        totalCompleted,
        totalSkipped,
        completionRate,
        topContributor,
        contributions,
      };

      return result;
    }),
});
