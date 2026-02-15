import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { householdProcedure, router } from "../trpc";
import {
  db,
  expenses,
  healthRecords,
  pets,
} from "@petforce/db";
import {
  createExpenseSchema,
  updateExpenseSchema,
  financeSummaryInputSchema,
  HEALTH_RECORD_TYPE_LABELS,
} from "@petforce/core";
import type { FinanceSummary, FinanceSummaryItem } from "@petforce/core";

export const financeRouter = router({
  listExpenses: householdProcedure
    .input(z.object({ petId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select()
        .from(expenses)
        .where(eq(expenses.householdId, ctx.householdId));

      if (input.petId) {
        return rows.filter((r) => r.petId === input.petId);
      }
      return rows;
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
      return expense;
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
    .input(z.object({ id: z.string().uuid() }))
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
      const now = new Date();
      const monthStr = input.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const [yearStr, monStr] = monthStr.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monStr, 10);

      // Current month range
      const currentStart = new Date(year, month - 1, 1);
      const currentEnd = new Date(year, month, 1);

      // Previous month range
      const prevStart = new Date(year, month - 2, 1);
      const prevEnd = new Date(year, month - 1, 1);

      // Fetch pets for name mapping
      const householdPets = await db
        .select()
        .from(pets)
        .where(eq(pets.householdId, ctx.householdId));
      const petMap = new Map(householdPets.map((p) => [p.id, p.name]));

      // Fetch expenses for current + previous month
      const allExpenses = await db
        .select()
        .from(expenses)
        .where(eq(expenses.householdId, ctx.householdId));

      const currentExpenses = allExpenses.filter(
        (e) => new Date(e.date) >= currentStart && new Date(e.date) < currentEnd
      );
      const prevExpenses = allExpenses.filter(
        (e) => new Date(e.date) >= prevStart && new Date(e.date) < prevEnd
      );

      // Fetch health records with cost for current + previous month
      const allHealth = await db
        .select()
        .from(healthRecords)
        .where(eq(healthRecords.householdId, ctx.householdId));

      const currentHealth = allHealth.filter(
        (h) => h.cost != null && h.cost > 0 && new Date(h.date) >= currentStart && new Date(h.date) < currentEnd
      );
      const prevHealth = allHealth.filter(
        (h) => h.cost != null && h.cost > 0 && new Date(h.date) >= prevStart && new Date(h.date) < prevEnd
      );

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

      const result: FinanceSummary = {
        monthlyTotal,
        previousMonthTotal,
        byCategory,
        byPet,
        recentExpenses: recentItems.slice(0, 5),
      };

      return result;
    }),
});
