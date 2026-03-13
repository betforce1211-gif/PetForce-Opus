import { eq, and, gte, lte, desc, asc, sql, isNotNull } from "drizzle-orm";
import { householdProcedure, router } from "../trpc.js";
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

// ---------------------------------------------------------------------------
// Helpers: Build a UNION ALL query across feeding_logs, medication_logs, and
// activities, applying WHERE filters for householdId, date range, and optional
// memberId / petId / taskType — all in SQL.
// ---------------------------------------------------------------------------

/**
 * Build individual sub-queries for each completion source, filtered in SQL.
 * Returns three separate Drizzle query builders that can be executed in
 * parallel or combined as needed.
 */
function buildDateBounds(from: string, to: string) {
  const fromDate = new Date(`${from}T00:00:00Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);
  return { fromDate, toDate };
}

export const reportingRouter = router({
  // -----------------------------------------------------------------------
  // completionLog — paginated, filterable list of all completions
  // -----------------------------------------------------------------------
  completionLog: householdProcedure
    .input(reportingCompletionLogSchema)
    .query(async ({ ctx, input }) => {
      const { fromDate, toDate } = buildDateBounds(input.from, input.to);
      const offset = input.offset ?? 0;
      const limit = input.limit ?? 50;

      // Build pet/member name lookup maps (still needed for display names)
      const [householdPets, householdMembers] = await Promise.all([
        db.select().from(pets).where(eq(pets.householdId, ctx.householdId)),
        db
          .select()
          .from(members)
          .where(eq(members.householdId, ctx.householdId)),
      ]);

      const petMap = new Map(householdPets.map((p) => [p.id, p.name]));
      const memberMap = new Map(
        householdMembers.map((m) => [m.id, m.displayName])
      );

      // We run separate queries per task type (only for types we need) and
      // combine results.  Each query applies WHERE + ORDER BY + LIMIT/OFFSET
      // at the SQL level.
      //
      // When no taskType filter is set we fetch (limit + offset) rows from
      // each source, merge, re-sort, then slice — this keeps each individual
      // query bounded while still producing correct results.

      const wantFeeding =
        !input.taskType || input.taskType === "feeding";
      const wantMedication =
        !input.taskType || input.taskType === "medication";
      const wantActivity =
        !input.taskType || input.taskType === "activity";

      // Determine per-source fetch size.  When querying a single type we can
      // apply exact offset+limit.  When merging multiple types we need to
      // over-fetch from each source, then merge-sort and re-slice.
      const singleType = !!input.taskType;
      const fetchLimit = singleType ? limit : offset + limit;
      const fetchOffset = singleType ? offset : 0;

      type RawRow = {
        id: string;
        taskType: ReportTaskType;
        taskName: string;
        petId: string;
        completedById: string;
        completedAt: Date;
        skipped: boolean;
      };

      const queries: Promise<RawRow[]>[] = [];

      // --- Feeding logs query ---
      if (wantFeeding) {
        const feedingConditions = [
          eq(feedingLogs.householdId, ctx.householdId),
          gte(feedingLogs.completedAt, fromDate),
          lte(feedingLogs.completedAt, toDate),
        ];
        if (input.memberId) {
          feedingConditions.push(
            eq(feedingLogs.completedBy, input.memberId)
          );
        }
        if (input.petId) {
          feedingConditions.push(eq(feedingLogs.petId, input.petId));
        }

        queries.push(
          db
            .select({
              id: feedingLogs.id,
              taskName: feedingSchedules.label,
              petId: feedingLogs.petId,
              completedById: feedingLogs.completedBy,
              completedAt: feedingLogs.completedAt,
              skipped: feedingLogs.skipped,
            })
            .from(feedingLogs)
            .innerJoin(
              feedingSchedules,
              eq(feedingLogs.feedingScheduleId, feedingSchedules.id)
            )
            .where(and(...feedingConditions))
            .orderBy(desc(feedingLogs.completedAt))
            .limit(fetchLimit)
            .offset(fetchOffset)
            .then((rows) =>
              rows.map((r) => ({
                ...r,
                taskType: "feeding" as ReportTaskType,
                taskName: r.taskName ?? "Feeding",
              }))
            )
        );
      }

      // --- Medication logs query ---
      if (wantMedication) {
        const medConditions = [
          eq(medicationLogs.householdId, ctx.householdId),
          gte(medicationLogs.loggedDate, input.from),
          lte(medicationLogs.loggedDate, input.to),
        ];
        if (input.memberId) {
          medConditions.push(
            eq(medicationLogs.loggedBy, input.memberId)
          );
        }

        // medication_logs doesn't have petId directly — it's on the
        // medications table.  We join to medications to get petId + name.
        const medQuery = db
          .select({
            id: medicationLogs.id,
            taskName: medications.name,
            petId: medications.petId,
            completedById: medicationLogs.loggedBy,
            completedAt: medicationLogs.createdAt,
            skipped: medicationLogs.skipped,
          })
          .from(medicationLogs)
          .innerJoin(
            medications,
            eq(medicationLogs.medicationId, medications.id)
          )
          .where(
            and(
              ...medConditions,
              ...(input.petId
                ? [eq(medications.petId, input.petId)]
                : [])
            )
          )
          .orderBy(desc(medicationLogs.createdAt))
          .limit(fetchLimit)
          .offset(fetchOffset)
          .then((rows) =>
            rows.map((r) => ({
              ...r,
              taskType: "medication" as ReportTaskType,
              taskName: r.taskName ?? "Medication",
            }))
          );

        queries.push(medQuery);
      }

      // --- Activities query ---
      if (wantActivity) {
        const actConditions = [
          eq(activities.householdId, ctx.householdId),
          isNotNull(activities.completedAt),
          isNotNull(activities.completedBy),
          gte(activities.completedAt, fromDate),
          lte(activities.completedAt, toDate),
        ];
        if (input.memberId) {
          actConditions.push(eq(activities.completedBy, input.memberId));
        }
        if (input.petId) {
          actConditions.push(eq(activities.petId, input.petId));
        }

        queries.push(
          db
            .select({
              id: activities.id,
              taskName: activities.title,
              petId: activities.petId,
              completedById: activities.completedBy,
              completedAt: activities.completedAt,
              skipped: sql<boolean>`false`.as("skipped"),
            })
            .from(activities)
            .where(and(...actConditions))
            .orderBy(desc(activities.completedAt))
            .limit(fetchLimit)
            .offset(fetchOffset)
            .then((rows) =>
              rows.map((r) => ({
                id: r.id,
                taskType: "activity" as ReportTaskType,
                taskName: r.taskName,
                petId: r.petId,
                completedById: r.completedById!,
                completedAt: r.completedAt!,
                skipped: false,
              }))
            )
        );
      }

      // Execute all source queries in parallel
      const results = await Promise.all(queries);
      let merged = results.flat();

      // Merge-sort by completedAt descending
      merged.sort(
        (a, b) => b.completedAt.getTime() - a.completedAt.getTime()
      );

      // If we queried multiple types we over-fetched, so re-slice now
      if (!singleType) {
        merged = merged.slice(offset, offset + limit);
      }

      const entries: TaskCompletionEntry[] = merged.map((r) => ({
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

  // -----------------------------------------------------------------------
  // contributions — aggregated counts per member, done via SQL GROUP BY
  // -----------------------------------------------------------------------
  contributions: householdProcedure
    .input(reportDateRangeSchema)
    .query(async ({ ctx, input }) => {
      const { fromDate, toDate } = buildDateBounds(input.from, input.to);

      const householdMembers = await db
        .select()
        .from(members)
        .where(eq(members.householdId, ctx.householdId));

      const memberMap = new Map(
        householdMembers.map((m) => [m.id, m.displayName])
      );

      // Run three GROUP BY queries in parallel — one per task type
      const [feedingCounts, medCounts, actCounts] = await Promise.all([
        // Feeding logs grouped by completedBy
        db
          .select({
            memberId: feedingLogs.completedBy,
            completed: sql<number>`count(*) filter (where ${feedingLogs.skipped} = false)`.mapWith(Number),
            skipped: sql<number>`count(*) filter (where ${feedingLogs.skipped} = true)`.mapWith(Number),
          })
          .from(feedingLogs)
          .where(
            and(
              eq(feedingLogs.householdId, ctx.householdId),
              gte(feedingLogs.completedAt, fromDate),
              lte(feedingLogs.completedAt, toDate)
            )
          )
          .groupBy(feedingLogs.completedBy),

        // Medication logs grouped by loggedBy
        db
          .select({
            memberId: medicationLogs.loggedBy,
            completed: sql<number>`count(*) filter (where ${medicationLogs.skipped} = false)`.mapWith(Number),
            skipped: sql<number>`count(*) filter (where ${medicationLogs.skipped} = true)`.mapWith(Number),
          })
          .from(medicationLogs)
          .where(
            and(
              eq(medicationLogs.householdId, ctx.householdId),
              gte(medicationLogs.loggedDate, input.from),
              lte(medicationLogs.loggedDate, input.to)
            )
          )
          .groupBy(medicationLogs.loggedBy),

        // Activities grouped by completedBy (only completed ones)
        db
          .select({
            memberId: activities.completedBy,
            completed: sql<number>`count(*)`.mapWith(Number),
          })
          .from(activities)
          .where(
            and(
              eq(activities.householdId, ctx.householdId),
              isNotNull(activities.completedAt),
              isNotNull(activities.completedBy),
              gte(activities.completedAt, fromDate),
              lte(activities.completedAt, toDate)
            )
          )
          .groupBy(activities.completedBy),
      ]);

      // Merge counts per member
      const byMember = new Map<
        string,
        {
          completed: number;
          skipped: number;
          byType: Map<ReportTaskType, { completed: number; skipped: number }>;
        }
      >();

      function ensureMember(memberId: string) {
        let entry = byMember.get(memberId);
        if (!entry) {
          entry = { completed: 0, skipped: 0, byType: new Map() };
          byMember.set(memberId, entry);
        }
        return entry;
      }

      for (const row of feedingCounts) {
        const entry = ensureMember(row.memberId);
        entry.completed += row.completed;
        entry.skipped += row.skipped;
        entry.byType.set("feeding", {
          completed: row.completed,
          skipped: row.skipped,
        });
      }

      for (const row of medCounts) {
        const entry = ensureMember(row.memberId);
        entry.completed += row.completed;
        entry.skipped += row.skipped;
        entry.byType.set("medication", {
          completed: row.completed,
          skipped: row.skipped,
        });
      }

      for (const row of actCounts) {
        if (row.memberId) {
          const entry = ensureMember(row.memberId);
          entry.completed += row.completed;
          entry.byType.set("activity", {
            completed: row.completed,
            skipped: 0,
          });
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

  // -----------------------------------------------------------------------
  // trends — completion counts bucketed by day or week, via SQL
  // -----------------------------------------------------------------------
  trends: householdProcedure
    .input(reportingTrendsSchema)
    .query(async ({ ctx, input }) => {
      const { fromDate, toDate } = buildDateBounds(input.from, input.to);
      const granularity = input.granularity ?? "daily";

      // SQL expression for the date bucket
      const dateBucket =
        granularity === "daily"
          ? sql<string>`to_char(bucket_date, 'YYYY-MM-DD')`
          : sql<string>`to_char(bucket_date, 'IYYY-"W"IW')`;

      // Build a UNION ALL of all three sources with a common shape,
      // then group by the date bucket.
      const feedingSub = db
        .select({
          bucketDate: sql`date_trunc('day', ${feedingLogs.completedAt})`.as(
            "bucket_date"
          ),
          completed:
            sql<number>`count(*) filter (where ${feedingLogs.skipped} = false)`.as(
              "completed"
            ),
          skipped:
            sql<number>`count(*) filter (where ${feedingLogs.skipped} = true)`.as(
              "skipped"
            ),
        })
        .from(feedingLogs)
        .where(
          and(
            eq(feedingLogs.householdId, ctx.householdId),
            gte(feedingLogs.completedAt, fromDate),
            lte(feedingLogs.completedAt, toDate)
          )
        )
        .groupBy(sql`date_trunc('day', ${feedingLogs.completedAt})`);

      const medSub = db
        .select({
          bucketDate: sql`${medicationLogs.loggedDate}::timestamp`.as(
            "bucket_date"
          ),
          completed:
            sql<number>`count(*) filter (where ${medicationLogs.skipped} = false)`.as(
              "completed"
            ),
          skipped:
            sql<number>`count(*) filter (where ${medicationLogs.skipped} = true)`.as(
              "skipped"
            ),
        })
        .from(medicationLogs)
        .where(
          and(
            eq(medicationLogs.householdId, ctx.householdId),
            gte(medicationLogs.loggedDate, input.from),
            lte(medicationLogs.loggedDate, input.to)
          )
        )
        .groupBy(medicationLogs.loggedDate);

      const actSub = db
        .select({
          bucketDate: sql`date_trunc('day', ${activities.completedAt})`.as(
            "bucket_date"
          ),
          completed: sql<number>`count(*)`.as("completed"),
          skipped: sql<number>`0`.as("skipped"),
        })
        .from(activities)
        .where(
          and(
            eq(activities.householdId, ctx.householdId),
            isNotNull(activities.completedAt),
            isNotNull(activities.completedBy),
            gte(activities.completedAt, fromDate),
            lte(activities.completedAt, toDate)
          )
        )
        .groupBy(sql`date_trunc('day', ${activities.completedAt})`);

      // Execute all three in parallel, then merge in JS (simpler than a
      // raw SQL UNION ALL with Drizzle's type system)
      const [feedingRows, medRows, actRows] = await Promise.all([
        feedingSub,
        medSub,
        actSub,
      ]);

      // Merge into buckets by formatted date key
      const buckets = new Map<string, { completed: number; skipped: number }>();

      function formatBucketDate(d: unknown): string {
        const date = new Date(d as string);
        if (granularity === "daily") {
          return date.toISOString().split("T")[0];
        }
        // Weekly: ISO week (YYYY-Www)
        const day = new Date(date.toISOString().split("T")[0] + "T00:00:00Z");
        day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
        const yearStart = new Date(
          Date.UTC(day.getUTCFullYear(), 0, 1)
        );
        const weekNo = Math.ceil(
          ((day.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
        );
        return `${day.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
      }

      function addToBucket(key: string, completed: number, skipped: number) {
        let bucket = buckets.get(key);
        if (!bucket) {
          bucket = { completed: 0, skipped: 0 };
          buckets.set(key, bucket);
        }
        bucket.completed += completed;
        bucket.skipped += skipped;
      }

      for (const row of feedingRows) {
        const key = formatBucketDate(row.bucketDate);
        addToBucket(key, Number(row.completed), Number(row.skipped));
      }
      for (const row of medRows) {
        const key = formatBucketDate(row.bucketDate);
        addToBucket(key, Number(row.completed), Number(row.skipped));
      }
      for (const row of actRows) {
        const key = formatBucketDate(row.bucketDate);
        addToBucket(key, Number(row.completed), 0);
      }

      const points: TrendDataPoint[] = Array.from(buckets.entries())
        .map(([date, counts]) => ({ date, ...counts }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return points;
    }),

  // -----------------------------------------------------------------------
  // summary — aggregate stats for the date range, via SQL counts
  // -----------------------------------------------------------------------
  summary: householdProcedure
    .input(reportDateRangeSchema)
    .query(async ({ ctx, input }) => {
      const { fromDate, toDate } = buildDateBounds(input.from, input.to);

      const householdMembers = await db
        .select()
        .from(members)
        .where(eq(members.householdId, ctx.householdId));

      const memberMap = new Map(
        householdMembers.map((m) => [m.id, m.displayName])
      );

      // Run aggregate queries in parallel
      const [
        feedingAgg,
        medAgg,
        actAgg,
        feedingByMember,
        medByMember,
        actByMember,
        activeSchedules,
        activeMeds,
      ] = await Promise.all([
        // Total feeding counts
        db
          .select({
            completed: sql<number>`count(*) filter (where ${feedingLogs.skipped} = false)`.mapWith(Number),
            skipped: sql<number>`count(*) filter (where ${feedingLogs.skipped} = true)`.mapWith(Number),
          })
          .from(feedingLogs)
          .where(
            and(
              eq(feedingLogs.householdId, ctx.householdId),
              gte(feedingLogs.completedAt, fromDate),
              lte(feedingLogs.completedAt, toDate)
            )
          ),

        // Total medication counts
        db
          .select({
            completed: sql<number>`count(*) filter (where ${medicationLogs.skipped} = false)`.mapWith(Number),
            skipped: sql<number>`count(*) filter (where ${medicationLogs.skipped} = true)`.mapWith(Number),
          })
          .from(medicationLogs)
          .where(
            and(
              eq(medicationLogs.householdId, ctx.householdId),
              gte(medicationLogs.loggedDate, input.from),
              lte(medicationLogs.loggedDate, input.to)
            )
          ),

        // Total activity count (completed only, no skipped concept)
        db
          .select({
            completed: sql<number>`count(*)`.mapWith(Number),
          })
          .from(activities)
          .where(
            and(
              eq(activities.householdId, ctx.householdId),
              isNotNull(activities.completedAt),
              isNotNull(activities.completedBy),
              gte(activities.completedAt, fromDate),
              lte(activities.completedAt, toDate)
            )
          ),

        // Feeding counts by member (for contributions + top contributor)
        db
          .select({
            memberId: feedingLogs.completedBy,
            completed: sql<number>`count(*) filter (where ${feedingLogs.skipped} = false)`.mapWith(Number),
            skipped: sql<number>`count(*) filter (where ${feedingLogs.skipped} = true)`.mapWith(Number),
          })
          .from(feedingLogs)
          .where(
            and(
              eq(feedingLogs.householdId, ctx.householdId),
              gte(feedingLogs.completedAt, fromDate),
              lte(feedingLogs.completedAt, toDate)
            )
          )
          .groupBy(feedingLogs.completedBy),

        // Medication counts by member
        db
          .select({
            memberId: medicationLogs.loggedBy,
            completed: sql<number>`count(*) filter (where ${medicationLogs.skipped} = false)`.mapWith(Number),
            skipped: sql<number>`count(*) filter (where ${medicationLogs.skipped} = true)`.mapWith(Number),
          })
          .from(medicationLogs)
          .where(
            and(
              eq(medicationLogs.householdId, ctx.householdId),
              gte(medicationLogs.loggedDate, input.from),
              lte(medicationLogs.loggedDate, input.to)
            )
          )
          .groupBy(medicationLogs.loggedBy),

        // Activity counts by member
        db
          .select({
            memberId: activities.completedBy,
            completed: sql<number>`count(*)`.mapWith(Number),
          })
          .from(activities)
          .where(
            and(
              eq(activities.householdId, ctx.householdId),
              isNotNull(activities.completedAt),
              isNotNull(activities.completedBy),
              gte(activities.completedAt, fromDate),
              lte(activities.completedAt, toDate)
            )
          )
          .groupBy(activities.completedBy),

        // Active feeding schedules (for expected count)
        db
          .select()
          .from(feedingSchedules)
          .where(
            and(
              eq(feedingSchedules.householdId, ctx.householdId),
              eq(feedingSchedules.isActive, true)
            )
          ),

        // Active medications (for expected count)
        db
          .select()
          .from(medications)
          .where(
            and(
              eq(medications.householdId, ctx.householdId),
              eq(medications.isActive, true)
            )
          ),
      ]);

      const totalCompleted =
        feedingAgg[0].completed + medAgg[0].completed + actAgg[0].completed;
      const totalSkipped = feedingAgg[0].skipped + medAgg[0].skipped;
      const completedActivities = actAgg[0].completed;

      // Count expected tasks by computing active days per schedule/medication
      const rangeStart = new Date(input.from + "T00:00:00Z");
      const today = new Date(
        new Date().toISOString().split("T")[0] + "T00:00:00Z"
      );
      const rangeEnd = new Date(input.to + "T00:00:00Z");
      const effectiveRangeEnd = rangeEnd < today ? rangeEnd : today;

      const msPerDay = 86_400_000;

      function countActiveDays(start: Date, end: Date): number {
        const effStart = start > rangeStart ? start : rangeStart;
        const effEnd = end < effectiveRangeEnd ? end : effectiveRangeEnd;
        if (effStart > effEnd) return 0;
        return (
          Math.floor((effEnd.getTime() - effStart.getTime()) / msPerDay) + 1
        );
      }

      let totalExpectedFeedings = 0;
      for (const s of activeSchedules) {
        const schedStart = new Date(
          new Date(s.createdAt).toISOString().split("T")[0] + "T00:00:00Z"
        );
        totalExpectedFeedings += countActiveDays(schedStart, effectiveRangeEnd);
      }

      let totalExpectedMeds = 0;
      for (const m of activeMeds) {
        const medStart = m.startDate
          ? new Date(
              new Date(m.startDate).toISOString().split("T")[0] + "T00:00:00Z"
            )
          : new Date(
              new Date(m.createdAt).toISOString().split("T")[0] + "T00:00:00Z"
            );
        const medEnd = m.endDate
          ? new Date(
              new Date(m.endDate).toISOString().split("T")[0] + "T00:00:00Z"
            )
          : effectiveRangeEnd;
        totalExpectedMeds += countActiveDays(medStart, medEnd);
      }

      // Activities are ad-hoc: completed activities count as both expected and completed
      const totalExpected =
        totalExpectedFeedings + totalExpectedMeds + completedActivities;
      const totalMissed = Math.max(
        0,
        totalExpected - totalCompleted - totalSkipped
      );
      const completionRate =
        totalExpected > 0 ? totalCompleted / totalExpected : 0;

      // Build contributions from the per-member GROUP BY results
      const byMember = new Map<
        string,
        {
          completed: number;
          skipped: number;
          byType: Map<
            ReportTaskType,
            { completed: number; skipped: number }
          >;
        }
      >();

      function ensureMember(memberId: string) {
        let entry = byMember.get(memberId);
        if (!entry) {
          entry = { completed: 0, skipped: 0, byType: new Map() };
          byMember.set(memberId, entry);
        }
        return entry;
      }

      for (const row of feedingByMember) {
        const entry = ensureMember(row.memberId);
        entry.completed += row.completed;
        entry.skipped += row.skipped;
        entry.byType.set("feeding", {
          completed: row.completed,
          skipped: row.skipped,
        });
      }

      for (const row of medByMember) {
        const entry = ensureMember(row.memberId);
        entry.completed += row.completed;
        entry.skipped += row.skipped;
        entry.byType.set("medication", {
          completed: row.completed,
          skipped: row.skipped,
        });
      }

      for (const row of actByMember) {
        if (row.memberId) {
          const entry = ensureMember(row.memberId);
          entry.completed += row.completed;
          entry.byType.set("activity", {
            completed: row.completed,
            skipped: 0,
          });
        }
      }

      // Find top contributor from the already-aggregated data
      let topContributor: ReportingSummary["topContributor"] = null;
      let maxCount = 0;
      for (const [memberId, data] of byMember) {
        if (data.completed > maxCount) {
          maxCount = data.completed;
          topContributor = {
            memberId,
            memberName: memberMap.get(memberId) ?? "Unknown",
            count: data.completed,
          };
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
