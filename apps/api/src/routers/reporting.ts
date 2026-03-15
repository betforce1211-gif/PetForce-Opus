/* eslint-disable no-restricted-syntax -- reporting requires raw SQL for UNION ALL, GROUP BY, count(*) FILTER, date_trunc */
import { eq, and, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { householdProcedure, router } from "../trpc.js";
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDateBounds(from: string, to: string) {
  // Return ISO strings — not Date objects — for use in raw SQL via
  // db.execute().  postgres-js's unsafe() (which Drizzle uses under the
  // hood) does not serialize Date parameters the same way the query builder
  // does, causing "Received an instance of Date" errors.
  const fromTs = `${from}T00:00:00.000Z`;
  const toTs = `${to}T23:59:59.999Z`;
  return { fromTs, toTs };
}

/**
 * Build the per-member + per-task-type aggregation query used by both
 * `contributions` and `summary`.  Returns rows grouped by (member_id, task_type)
 * with completed/skipped counts — all in a single SQL round-trip via UNION ALL.
 */
function buildContributionsQuery(
  householdId: string,
  from: string,
  to: string,
  fromTs: string,
  toTs: string
) {
  return sql`
    SELECT member_id, task_type,
           COUNT(*) FILTER (WHERE NOT skipped)::int AS completed,
           COUNT(*) FILTER (WHERE skipped)::int AS skipped
    FROM (
      SELECT fl.completed_by AS member_id, 'feeding'::text AS task_type, fl.skipped
      FROM feeding_logs fl
      WHERE fl.household_id = ${householdId}
        AND fl.completed_at >= ${fromTs}::timestamptz
        AND fl.completed_at <= ${toTs}::timestamptz
      UNION ALL
      SELECT ml.logged_by AS member_id, 'medication'::text AS task_type, ml.skipped
      FROM medication_logs ml
      WHERE ml.household_id = ${householdId}
        AND ml.logged_date >= ${from}
        AND ml.logged_date <= ${to}
      UNION ALL
      SELECT a.completed_by AS member_id, 'activity'::text AS task_type, false AS skipped
      FROM activities a
      WHERE a.household_id = ${householdId}
        AND a.completed_at IS NOT NULL
        AND a.completed_by IS NOT NULL
        AND a.completed_at >= ${fromTs}::timestamptz
        AND a.completed_at <= ${toTs}::timestamptz
    ) unified
    GROUP BY member_id, task_type
    ORDER BY member_id
  `;
}

interface ContributionRow {
  member_id: string;
  task_type: string;
  completed: number;
  skipped: number;
}

/**
 * Parse rows from `buildContributionsQuery` into MemberContribution[],
 * using the given member name map.  Also returns totals for use by summary.
 */
function parseContributionRows(
  rows: ContributionRow[],
  memberMap: Map<string, string>
) {
  let totalCompleted = 0;
  let totalSkipped = 0;
  let completedActivities = 0;

  const byMember = new Map<
    string,
    {
      completed: number;
      skipped: number;
      byType: { taskType: ReportTaskType; completed: number; skipped: number }[];
    }
  >();

  for (const row of rows) {
    if (!row.member_id) continue;
    const completed = Number(row.completed);
    const skipped = Number(row.skipped);
    totalCompleted += completed;
    totalSkipped += skipped;
    if (row.task_type === "activity") completedActivities += completed;

    let entry = byMember.get(row.member_id);
    if (!entry) {
      entry = { completed: 0, skipped: 0, byType: [] };
      byMember.set(row.member_id, entry);
    }
    entry.completed += completed;
    entry.skipped += skipped;
    entry.byType.push({
      taskType: row.task_type as ReportTaskType,
      completed,
      skipped,
    });
  }

  const contributions: MemberContribution[] = [];
  for (const [memberId, data] of byMember) {
    contributions.push({
      memberId,
      memberName: memberMap.get(memberId) ?? "Unknown",
      completed: data.completed,
      skipped: data.skipped,
      byType: data.byType,
    });
  }
  contributions.sort((a, b) => b.completed - a.completed);

  return { contributions, totalCompleted, totalSkipped, completedActivities };
}

export const reportingRouter = router({
  // -----------------------------------------------------------------------
  // completionLog — paginated, filterable list of all completions
  // Uses a single UNION ALL query with ORDER BY + LIMIT/OFFSET in SQL.
  // -----------------------------------------------------------------------
  completionLog: householdProcedure
    .input(reportingCompletionLogSchema)
    .query(async ({ ctx, input }) => {
      const { fromTs, toTs } = buildDateBounds(input.from, input.to);
      const offset = input.offset ?? 0;
      const limit = input.limit ?? 50;

      // Name lookup maps (lightweight — bounded by household size)
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

      // Build UNION ALL subqueries — only for requested task types
      const wantFeeding = !input.taskType || input.taskType === "feeding";
      const wantMedication =
        !input.taskType || input.taskType === "medication";
      const wantActivity = !input.taskType || input.taskType === "activity";

      const subqueries: SQL[] = [];

      if (wantFeeding) {
        subqueries.push(sql`
          SELECT fl.id, 'feeding'::text AS task_type,
                 COALESCE(fs.label, 'Feeding') AS task_name,
                 fl.pet_id, fl.completed_by AS completed_by_id,
                 fl.completed_at, fl.skipped
          FROM feeding_logs fl
          INNER JOIN feeding_schedules fs ON fl.feeding_schedule_id = fs.id
          WHERE fl.household_id = ${ctx.householdId}
            AND fl.completed_at >= ${fromTs}::timestamptz
            AND fl.completed_at <= ${toTs}::timestamptz
            ${input.memberId ? sql`AND fl.completed_by = ${input.memberId}` : sql``}
            ${input.petId ? sql`AND fl.pet_id = ${input.petId}` : sql``}
        `);
      }

      if (wantMedication) {
        subqueries.push(sql`
          SELECT ml.id, 'medication'::text AS task_type,
                 COALESCE(m.name, 'Medication') AS task_name,
                 m.pet_id, ml.logged_by AS completed_by_id,
                 ml.created_at AS completed_at, ml.skipped
          FROM medication_logs ml
          INNER JOIN medications m ON ml.medication_id = m.id
          WHERE ml.household_id = ${ctx.householdId}
            AND ml.logged_date >= ${input.from}
            AND ml.logged_date <= ${input.to}
            ${input.memberId ? sql`AND ml.logged_by = ${input.memberId}` : sql``}
            ${input.petId ? sql`AND m.pet_id = ${input.petId}` : sql``}
        `);
      }

      if (wantActivity) {
        subqueries.push(sql`
          SELECT a.id, 'activity'::text AS task_type,
                 a.title AS task_name,
                 a.pet_id, a.completed_by AS completed_by_id,
                 a.completed_at, false AS skipped
          FROM activities a
          WHERE a.household_id = ${ctx.householdId}
            AND a.completed_at IS NOT NULL
            AND a.completed_by IS NOT NULL
            AND a.completed_at >= ${fromTs}::timestamptz
            AND a.completed_at <= ${toTs}::timestamptz
            ${input.memberId ? sql`AND a.completed_by = ${input.memberId}` : sql``}
            ${input.petId ? sql`AND a.pet_id = ${input.petId}` : sql``}
        `);
      }

      if (subqueries.length === 0) return [];

      const unionAll = sql.join(subqueries, sql` UNION ALL `);

      const rows = (await db.execute(sql`
        SELECT * FROM (${unionAll}) unified
        ORDER BY completed_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `)) as unknown as Array<{
        id: string;
        task_type: string;
        task_name: string;
        pet_id: string;
        completed_by_id: string;
        completed_at: Date;
        skipped: boolean;
      }>;

      return rows.map(
        (r): TaskCompletionEntry => ({
          id: r.id,
          taskType: r.task_type as ReportTaskType,
          taskName: r.task_name,
          petId: r.pet_id,
          petName: petMap.get(r.pet_id) ?? "Unknown",
          completedById: r.completed_by_id,
          completedByName: memberMap.get(r.completed_by_id) ?? "Unknown",
          completedAt: new Date(r.completed_at).toISOString(),
          skipped: r.skipped,
        })
      );
    }),

  // -----------------------------------------------------------------------
  // contributions — per-member aggregation via single UNION ALL + GROUP BY
  // -----------------------------------------------------------------------
  contributions: householdProcedure
    .input(reportDateRangeSchema)
    .query(async ({ ctx, input }) => {
      const { fromTs, toTs } = buildDateBounds(input.from, input.to);

      const householdMembers = await db
        .select()
        .from(members)
        .where(eq(members.householdId, ctx.householdId));

      const memberMap = new Map(
        householdMembers.map((m) => [m.id, m.displayName])
      );

      const rows = (await db.execute(
        buildContributionsQuery(
          ctx.householdId,
          input.from,
          input.to,
          fromTs,
          toTs
        )
      )) as unknown as ContributionRow[];

      return parseContributionRows(rows, memberMap).contributions;
    }),

  // -----------------------------------------------------------------------
  // trends — completion counts bucketed by day/week via UNION ALL + GROUP BY
  // -----------------------------------------------------------------------
  trends: householdProcedure
    .input(reportingTrendsSchema)
    .query(async ({ ctx, input }) => {
      const { fromTs, toTs } = buildDateBounds(input.from, input.to);
      const granularity = input.granularity ?? "daily";

      // date_trunc interval must be a SQL keyword, not a parameterized value
      const truncExpr =
        granularity === "weekly"
          ? sql`date_trunc('week', completed_at)`
          : sql`date_trunc('day', completed_at)`;

      const rows = (await db.execute(sql`
        SELECT ${truncExpr} AS bucket_date,
               COUNT(*) FILTER (WHERE NOT skipped)::int AS completed,
               COUNT(*) FILTER (WHERE skipped)::int AS skipped
        FROM (
          SELECT fl.completed_at, fl.skipped
          FROM feeding_logs fl
          WHERE fl.household_id = ${ctx.householdId}
            AND fl.completed_at >= ${fromTs}::timestamptz
            AND fl.completed_at <= ${toTs}::timestamptz
          UNION ALL
          SELECT ml.logged_date::timestamp AS completed_at, ml.skipped
          FROM medication_logs ml
          WHERE ml.household_id = ${ctx.householdId}
            AND ml.logged_date >= ${input.from}
            AND ml.logged_date <= ${input.to}
          UNION ALL
          SELECT a.completed_at, false AS skipped
          FROM activities a
          WHERE a.household_id = ${ctx.householdId}
            AND a.completed_at IS NOT NULL
            AND a.completed_by IS NOT NULL
            AND a.completed_at >= ${fromTs}::timestamptz
            AND a.completed_at <= ${toTs}::timestamptz
        ) unified
        GROUP BY 1
        ORDER BY 1
      `)) as unknown as Array<{
        bucket_date: Date;
        completed: number;
        skipped: number;
      }>;

      return rows.map((r): TrendDataPoint => {
        const date = new Date(r.bucket_date);
        let dateStr: string;

        if (granularity === "daily") {
          dateStr = date.toISOString().split("T")[0];
        } else {
          // ISO week format: YYYY-Www
          const d = new Date(
            date.toISOString().split("T")[0] + "T00:00:00Z"
          );
          d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
          const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
          const weekNo = Math.ceil(
            ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
          );
          dateStr = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
        }

        return {
          date: dateStr,
          completed: Number(r.completed),
          skipped: Number(r.skipped),
        };
      });
    }),

  // -----------------------------------------------------------------------
  // summary — aggregate stats via single UNION ALL + GROUP BY, plus
  // expected-count calculations from active schedules/medications
  // -----------------------------------------------------------------------
  summary: householdProcedure
    .input(reportDateRangeSchema)
    .query(async ({ ctx, input }) => {
      const { fromTs, toTs } = buildDateBounds(input.from, input.to);

      // Run all queries in parallel:
      // 1. Members (for name lookup)
      // 2. Per-member + per-type aggregation (single UNION ALL — replaces 6 queries)
      // 3. Active feeding schedules (for expected count)
      // 4. Active medications (for expected count)
      const [householdMembers, perMemberRows, activeSchedules, activeMeds] =
        await Promise.all([
          db
            .select()
            .from(members)
            .where(eq(members.householdId, ctx.householdId)),

          db.execute(
            buildContributionsQuery(
              ctx.householdId,
              input.from,
              input.to,
              fromTs,
              toTs
            )
          ) as unknown as Promise<ContributionRow[]>,

          db
            .select()
            .from(feedingSchedules)
            .where(
              and(
                eq(feedingSchedules.householdId, ctx.householdId),
                eq(feedingSchedules.isActive, true)
              )
            ),

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

      const memberMap = new Map(
        householdMembers.map((m) => [m.id, m.displayName])
      );

      const {
        contributions,
        totalCompleted,
        totalSkipped,
        completedActivities,
      } = parseContributionRows(
        perMemberRows as ContributionRow[],
        memberMap
      );

      // ---- Expected count logic (unchanged) ----
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
        totalExpectedFeedings += countActiveDays(
          schedStart,
          effectiveRangeEnd
        );
      }

      let totalExpectedMeds = 0;
      for (const m of activeMeds) {
        const medStart = m.startDate
          ? new Date(
              new Date(m.startDate).toISOString().split("T")[0] +
                "T00:00:00Z"
            )
          : new Date(
              new Date(m.createdAt).toISOString().split("T")[0] +
                "T00:00:00Z"
            );
        const medEnd = m.endDate
          ? new Date(
              new Date(m.endDate).toISOString().split("T")[0] + "T00:00:00Z"
            )
          : effectiveRangeEnd;
        totalExpectedMeds += countActiveDays(medStart, medEnd);
      }

      // Activities are ad-hoc: completed count as both expected and completed
      const totalExpected =
        totalExpectedFeedings + totalExpectedMeds + completedActivities;
      const totalMissed = Math.max(
        0,
        totalExpected - totalCompleted - totalSkipped
      );
      const completionRate =
        totalExpected > 0 ? totalCompleted / totalExpected : 0;

      // Top contributor from already-aggregated data
      let topContributor: ReportingSummary["topContributor"] = null;
      let maxCount = 0;
      for (const c of contributions) {
        if (c.completed > maxCount) {
          maxCount = c.completed;
          topContributor = {
            memberId: c.memberId,
            memberName: c.memberName,
            count: c.completed,
          };
        }
      }

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
