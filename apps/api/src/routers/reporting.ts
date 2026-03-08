import { eq, and } from "drizzle-orm";
import { householdProcedure, router } from "../trpc";
import {
  db,
  feedingSchedules,
  medications,
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
import { fetchUnifiedCompletions } from "../lib/unified-completions";

export const reportingRouter = router({
  completionLog: householdProcedure
    .input(reportingCompletionLogSchema)
    .query(async ({ ctx, input }) => {
      // Fetch completions and lookup data in parallel
      const [raw, householdPets, householdMembers] = await Promise.all([
        fetchUnifiedCompletions(ctx.householdId, input.from, input.to),
        db.select().from(pets).where(eq(pets.householdId, ctx.householdId)),
        db.select().from(members).where(eq(members.householdId, ctx.householdId)),
      ]);

      const petMap = new Map(householdPets.map((p) => [p.id, p.name]));
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
      const completedActivities = raw.filter((r) => r.taskType === "activity").length;

      // Count expected tasks by computing active days per schedule/medication
      const rangeStart = new Date(input.from + "T00:00:00Z");
      const today = new Date(new Date().toISOString().split("T")[0] + "T00:00:00Z");
      const rangeEnd = new Date(input.to + "T00:00:00Z");
      const effectiveRangeEnd = rangeEnd < today ? rangeEnd : today;

      const msPerDay = 86_400_000;

      function countActiveDays(start: Date, end: Date): number {
        const effStart = start > rangeStart ? start : rangeStart;
        const effEnd = end < effectiveRangeEnd ? end : effectiveRangeEnd;
        if (effStart > effEnd) return 0;
        return Math.floor((effEnd.getTime() - effStart.getTime()) / msPerDay) + 1;
      }

      // Feeding schedules: each active schedule = 1 expected task per active day
      const activeSchedules = await db
        .select()
        .from(feedingSchedules)
        .where(
          and(
            eq(feedingSchedules.householdId, ctx.householdId),
            eq(feedingSchedules.isActive, true)
          )
        );

      let totalExpectedFeedings = 0;
      for (const s of activeSchedules) {
        const schedStart = new Date(new Date(s.createdAt).toISOString().split("T")[0] + "T00:00:00Z");
        totalExpectedFeedings += countActiveDays(schedStart, effectiveRangeEnd);
      }

      // Medications: each active medication = 1 expected task per active day
      const activeMeds = await db
        .select()
        .from(medications)
        .where(
          and(
            eq(medications.householdId, ctx.householdId),
            eq(medications.isActive, true)
          )
        );

      let totalExpectedMeds = 0;
      for (const m of activeMeds) {
        const medStart = m.startDate
          ? new Date(new Date(m.startDate).toISOString().split("T")[0] + "T00:00:00Z")
          : new Date(new Date(m.createdAt).toISOString().split("T")[0] + "T00:00:00Z");
        const medEnd = m.endDate
          ? new Date(new Date(m.endDate).toISOString().split("T")[0] + "T00:00:00Z")
          : effectiveRangeEnd;
        totalExpectedMeds += countActiveDays(medStart, medEnd);
      }

      // Activities are ad-hoc: completed activities already count as both expected and completed
      const totalExpected = totalExpectedFeedings + totalExpectedMeds + completedActivities;
      const totalMissed = Math.max(0, totalExpected - totalCompleted - totalSkipped);
      const completionRate = totalExpected > 0 ? totalCompleted / totalExpected : 0;

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
        totalMissed,
        totalExpected,
        completionRate,
        topContributor,
        contributions,
      };

      return result;
    }),
});
