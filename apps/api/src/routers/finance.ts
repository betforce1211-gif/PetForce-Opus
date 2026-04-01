import { z } from "zod";
import { eq, and, gte, lt, gt, lte, isNull, isNotNull, desc, count as drizzleCount } from "drizzle-orm";
import { householdProcedure, router } from "../trpc.js";
import {
  db,
  budgets,
  expenses,
  healthRecords,
  pets,
} from "@petforce/db";
import {
  createExpenseSchema,
  updateExpenseSchema,
  financeSummaryInputSchema,
  createBudgetSchema,
  updateBudgetSchema,
  getBudgetStatusSchema,
  HEALTH_RECORD_TYPE_LABELS,
  paginationInput,
} from "@petforce/core";
import type { BudgetAlert, BudgetStatus, FinanceSummary, FinanceSummaryItem } from "@petforce/core";

function getMonthRange(monthStr?: string) {
  const now = new Date();
  const str = monthStr ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [yearStr, monStr] = str.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monStr, 10);
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1),
    prevStart: new Date(year, month - 2, 1),
    prevEnd: new Date(year, month - 1, 1),
  };
}

async function computeBudgetStatuses(
  householdId: string,
  monthStart: Date,
  monthEnd: Date,
  petMap: Map<string, string>
): Promise<BudgetStatus[]> {
  const activeBudgets = await db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.householdId, householdId),
        lte(budgets.effectiveFrom, monthEnd)
      )
    );

  if (activeBudgets.length === 0) return [];

  const monthExpenses = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.householdId, householdId),
        gte(expenses.date, monthStart),
        lt(expenses.date, monthEnd)
      )
    );
  const monthHealth = await db
    .select()
    .from(healthRecords)
    .where(
      and(
        eq(healthRecords.householdId, householdId),
        gte(healthRecords.date, monthStart),
        lt(healthRecords.date, monthEnd),
        isNotNull(healthRecords.cost),
        gt(healthRecords.cost, 0)
      )
    );

  // Compute spending per pet + household total
  const petSpend = new Map<string, number>();
  let householdTotal = 0;
  for (const e of monthExpenses) {
    petSpend.set(e.petId, (petSpend.get(e.petId) ?? 0) + e.amount);
    householdTotal += e.amount;
  }
  for (const h of monthHealth) {
    petSpend.set(h.petId, (petSpend.get(h.petId) ?? 0) + (h.cost ?? 0));
    householdTotal += h.cost ?? 0;
  }

  return activeBudgets.map((b) => {
    const spent = b.petId ? (petSpend.get(b.petId) ?? 0) : householdTotal;
    const remaining = Math.max(0, b.monthlyAmount - spent);
    const utilizationPercent = b.monthlyAmount > 0 ? (spent / b.monthlyAmount) * 100 : 0;
    const alertLevel = utilizationPercent >= 100 ? "exceeded" : utilizationPercent >= 80 ? "warning" : "ok";
    return {
      budget: {
        id: b.id,
        householdId: b.householdId,
        petId: b.petId,
        monthlyAmount: b.monthlyAmount,
        currency: b.currency,
        effectiveFrom: b.effectiveFrom,
        createdBy: b.createdBy,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      },
      spent,
      remaining,
      utilizationPercent: Math.round(utilizationPercent * 100) / 100,
      alertLevel,
      petName: b.petId ? (petMap.get(b.petId) ?? "Unknown") : null,
    } satisfies BudgetStatus;
  });
}

export const financeRouter = router({
  listExpenses: householdProcedure
    .input(z.object({ petId: z.uuid().optional(), ...paginationInput.shape }))
    .query(async ({ ctx, input }) => {
      const where = input.petId
        ? and(eq(expenses.householdId, ctx.householdId), eq(expenses.petId, input.petId))
        : eq(expenses.householdId, ctx.householdId);
      const [items, [{ count }]] = await Promise.all([
        db
          .select()
          .from(expenses)
          .where(where)
          .orderBy(desc(expenses.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: drizzleCount() }).from(expenses).where(where),
      ]);
      return { items, totalCount: count };
    }),

  createExpense: householdProcedure
    .input(createExpenseSchema)
    .mutation(async ({ ctx, input }) => {
      const [expense] = await db
        .insert(expenses)
        .values({
          householdId: ctx.householdId,
          petId: input.petId,
          category: input.category,
          description: input.description,
          amount: input.amount,
          date: input.date,
          notes: input.notes ?? null,
        })
        .returning();

      // Check budget thresholds after creating the expense
      const now = new Date(input.date);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const householdPets = await db.select().from(pets).where(eq(pets.householdId, ctx.householdId));
      const petMap = new Map(householdPets.map((p) => [p.id, p.name]));
      const statuses = await computeBudgetStatuses(ctx.householdId, monthStart, monthEnd, petMap);

      const budgetAlerts: BudgetAlert[] = statuses
        .filter((s) => s.alertLevel !== "ok")
        .filter((s) => s.budget.petId === null || s.budget.petId === input.petId)
        .map((s) => ({
          budgetId: s.budget.id,
          petId: s.budget.petId,
          petName: s.petName,
          monthlyAmount: s.budget.monthlyAmount,
          spent: s.spent,
          alertLevel: s.alertLevel as "warning" | "exceeded",
        }));

      return { expense, budgetAlerts };
    }),

  updateExpense: householdProcedure
    .input(updateExpenseSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [expense] = await db
        .update(expenses)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(
            eq(expenses.id, id),
            eq(expenses.householdId, ctx.householdId)
          )
        )
        .returning();
      return expense;
    }),

  deleteExpense: householdProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(expenses)
        .where(
          and(
            eq(expenses.id, input.id),
            eq(expenses.householdId, ctx.householdId)
          )
        );
      return { success: true };
    }),

  summary: householdProcedure
    .input(financeSummaryInputSchema)
    .query(async ({ ctx, input }) => {
      const { start: currentStart, end: currentEnd, prevStart, prevEnd } = getMonthRange(input.month);

      // Fetch pets and split expenses/health into targeted current/prev queries
      const [householdPets, currentExpenses, prevExpenses, currentHealth, prevHealth] = await Promise.all([
        db.select().from(pets).where(eq(pets.householdId, ctx.householdId)),
        db
          .select()
          .from(expenses)
          .where(
            and(
              eq(expenses.householdId, ctx.householdId),
              gte(expenses.date, currentStart),
              lt(expenses.date, currentEnd)
            )
          ),
        db
          .select()
          .from(expenses)
          .where(
            and(
              eq(expenses.householdId, ctx.householdId),
              gte(expenses.date, prevStart),
              lt(expenses.date, prevEnd)
            )
          ),
        db
          .select()
          .from(healthRecords)
          .where(
            and(
              eq(healthRecords.householdId, ctx.householdId),
              gte(healthRecords.date, currentStart),
              lt(healthRecords.date, currentEnd),
              isNotNull(healthRecords.cost),
              gt(healthRecords.cost, 0)
            )
          ),
        db
          .select()
          .from(healthRecords)
          .where(
            and(
              eq(healthRecords.householdId, ctx.householdId),
              gte(healthRecords.date, prevStart),
              lt(healthRecords.date, prevEnd),
              isNotNull(healthRecords.cost),
              gt(healthRecords.cost, 0)
            )
          ),
      ]);
      const petMap = new Map(householdPets.map((p) => [p.id, p.name]));

      // Compute totals
      const expenseTotal = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
      const healthTotal = currentHealth.reduce((sum, h) => sum + (h.cost ?? 0), 0);
      const monthlyTotal = expenseTotal + healthTotal;

      const prevExpenseTotal = prevExpenses.reduce((sum, e) => sum + e.amount, 0);
      const prevHealthTotal = prevHealth.reduce((sum, h) => sum + (h.cost ?? 0), 0);
      const previousMonthTotal = prevExpenseTotal + prevHealthTotal;

      // By-category breakdown
      const categoryMap = new Map<string, number>();
      for (const e of currentExpenses) {
        categoryMap.set(e.category, (categoryMap.get(e.category) ?? 0) + e.amount);
      }
      for (const h of currentHealth) {
        categoryMap.set(h.type, (categoryMap.get(h.type) ?? 0) + (h.cost ?? 0));
      }
      const byCategory = Array.from(categoryMap.entries())
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total);

      // By-pet breakdown
      const petTotalMap = new Map<string, number>();
      for (const e of currentExpenses) {
        petTotalMap.set(e.petId, (petTotalMap.get(e.petId) ?? 0) + e.amount);
      }
      for (const h of currentHealth) {
        petTotalMap.set(h.petId, (petTotalMap.get(h.petId) ?? 0) + (h.cost ?? 0));
      }
      const byPet = Array.from(petTotalMap.entries())
        .map(([petId, total]) => ({ petId, petName: petMap.get(petId) ?? "Unknown", total }))
        .sort((a, b) => b.total - a.total);

      // Recent expenses (last 5 across both sources)
      const recentItems: FinanceSummaryItem[] = [];
      for (const e of currentExpenses) {
        recentItems.push({
          id: e.id,
          description: e.description,
          amount: e.amount,
          date: new Date(e.date).toISOString(),
          category: e.category,
          petId: e.petId,
          petName: petMap.get(e.petId) ?? "Unknown",
          source: "expense",
        });
      }
      for (const h of currentHealth) {
        recentItems.push({
          id: h.id,
          description: h.reason ?? (HEALTH_RECORD_TYPE_LABELS[h.type] ?? h.type),
          amount: h.cost ?? 0,
          date: new Date(h.date).toISOString(),
          category: h.type,
          petId: h.petId,
          petName: petMap.get(h.petId) ?? "Unknown",
          source: "health",
        });
      }
      recentItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Budget utilization
      const budgetUtilization = await computeBudgetStatuses(ctx.householdId, currentStart, currentEnd, petMap);

      const result: FinanceSummary = {
        monthlyTotal,
        previousMonthTotal,
        byCategory,
        byPet,
        recentExpenses: recentItems.slice(0, 5),
        budgetUtilization: budgetUtilization.length > 0 ? budgetUtilization : undefined,
      };

      return result;
    }),

  // --- Budget endpoints ---

  setBudget: householdProcedure
    .input(createBudgetSchema)
    .mutation(async ({ ctx, input }) => {
      const [budget] = await db
        .insert(budgets)
        .values({
          householdId: ctx.householdId,
          petId: input.petId ?? null,
          monthlyAmount: input.monthlyAmount,
          currency: input.currency ?? "USD",
          effectiveFrom: input.effectiveFrom ?? new Date(),
          createdBy: ctx.membership.id,
        })
        .returning();
      return budget;
    }),

  getBudgets: householdProcedure
    .input(z.object({ petId: z.uuid().nullable().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(budgets.householdId, ctx.householdId)];
      if (input.petId !== undefined) {
        conditions.push(
          input.petId === null
            ? isNull(budgets.petId)
            : eq(budgets.petId, input.petId)
        );
      }
      const items = await db
        .select()
        .from(budgets)
        .where(and(...conditions))
        .orderBy(desc(budgets.createdAt));
      return items;
    }),

  getBudgetStatus: householdProcedure
    .input(getBudgetStatusSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getMonthRange(input.month);
      const householdPets = await db.select().from(pets).where(eq(pets.householdId, ctx.householdId));
      const petMap = new Map(householdPets.map((p) => [p.id, p.name]));
      return computeBudgetStatuses(ctx.householdId, start, end, petMap);
    }),

  updateBudget: householdProcedure
    .input(updateBudgetSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [budget] = await db
        .update(budgets)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(
            eq(budgets.id, id),
            eq(budgets.householdId, ctx.householdId)
          )
        )
        .returning();
      return budget;
    }),

  deleteBudget: householdProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(budgets)
        .where(
          and(
            eq(budgets.id, input.id),
            eq(budgets.householdId, ctx.householdId)
          )
        );
      return { success: true };
    }),
});
