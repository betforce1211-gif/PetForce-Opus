<!-- owner: backend -->

# finance router

[Developer]

Track pet expenses, set monthly budgets, and view spending analytics. The summary endpoint automatically merges general expenses with health record costs (vet visits, vaccinations, etc. with a `cost` field). Budget alerts fire at 80% (warning) and 100% (exceeded).

**Auth level:** `householdProcedure`

---

## Procedures

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `finance.listExpenses` | query | household | List expenses, optionally filtered by pet |
| `finance.createExpense` | mutation | household | Record an expense (triggers budget alert check) |
| `finance.updateExpense` | mutation | household | Update an expense (partial) |
| `finance.deleteExpense` | mutation | household | Delete an expense |
| `finance.summary` | query | household | Monthly spending summary with category and pet breakdowns |
| `finance.setBudget` | mutation | household | Create a monthly budget for the household or a pet |
| `finance.getBudgets` | query | household | List all budgets, optionally filtered by pet |
| `finance.getBudgetStatus` | query | household | Budget utilization and alert levels for a month |
| `finance.updateBudget` | mutation | household | Update budget amount, currency, or effective date |
| `finance.deleteBudget` | mutation | household | Delete a budget |

---

## `finance.listExpenses` — query

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `petId` | UUID | no |

**Returns:** `Expense[]`

---

## `finance.createExpense` — mutation

Budget alerts are automatically computed on creation. If spending exceeds 80% or 100% of a matching budget, the alert is included in the response.

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `petId` | UUID | yes |
| `category` | `food \| treats \| toys \| grooming \| boarding \| insurance \| supplies \| training \| other` | yes |
| `description` | string (1-200) | yes |
| `amount` | number (positive) | yes |
| `date` | Date | yes |
| `notes` | string (max 2000) | no |

**Returns:**

```ts
{
  expense: Expense
  budgetAlerts: Array<{
    budgetId: string
    petId: string | null
    petName: string | null
    monthlyAmount: number
    spent: number
    alertLevel: "warning" | "exceeded"
  }>
}
```

---

## `finance.updateExpense` — mutation

All fields optional. `id` and `householdId` always required.

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, id: UUID, ...partial fields }`
**Returns:** `Expense`

---

## `finance.deleteExpense` — mutation

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, id: UUID }`
**Returns:** `{ success: true }`

---

## `finance.summary` — query

Monthly spending summary. Automatically includes health record costs and budget utilization when budgets exist.

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `month` | string `YYYY-MM` | no (defaults to current month) |

**Returns:**

```ts
{
  monthlyTotal: number
  previousMonthTotal: number
  byCategory: { category: string, total: number }[]   // sorted by total desc
  byPet: { petId: string, petName: string, total: number }[]
  recentExpenses: FinanceSummaryItem[]                // last 5 items
  budgetUtilization?: BudgetStatus[]                  // included when budgets exist
}

// FinanceSummaryItem
{
  id: string
  description: string
  amount: number
  date: string           // ISO date
  category: string
  petId: string
  petName: string
  source: "expense" | "health"
}
```

---

## `finance.setBudget` — mutation

Create a monthly budget for the household or a specific pet.

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `petId` | UUID | no (omit for household-level budget) |
| `monthlyAmount` | number (positive) | yes |
| `currency` | string | no (default: `"USD"`) |
| `effectiveFrom` | Date | no (default: now) |

**Returns:** `Budget`

```ts
{
  id: string
  householdId: string
  petId: string | null
  monthlyAmount: number
  currency: string
  effectiveFrom: string   // ISO date
  createdBy: string
  createdAt: string
  updatedAt: string
}
```

---

## `finance.getBudgets` — query

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `petId` | UUID | no |

**Returns:** `Budget[]`

---

## `finance.getBudgetStatus` — query

Budget utilization and alert levels for a given month.

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `month` | string `YYYY-MM` | no (defaults to current month) |

**Returns:** `BudgetStatus[]`

```ts
{
  budget: Budget
  spent: number
  remaining: number
  utilizationPercent: number
  alertLevel: "ok" | "warning" | "exceeded"
  petName: string | null
}
```

Alert thresholds: `warning` at 80%, `exceeded` at 100%.

---

## `finance.updateBudget` — mutation

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, id: UUID, ...partial budget fields }`
**Returns:** `Budget`

---

## `finance.deleteBudget` — mutation

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, id: UUID }`
**Returns:** `{ success: true }`

---

## Key types

```ts
// Expense category enum
type ExpenseCategory =
  | "food" | "treats" | "toys" | "grooming" | "boarding"
  | "insurance" | "supplies" | "training" | "other"

// Budget alert levels
type AlertLevel = "ok" | "warning" | "exceeded"
```

---

## Related routers

- [health](./health.md) — health record costs included in finance.summary
- [pet](./pet.md) — expenses and budgets are scoped per pet
- [notification](./notification.md) — budget alert notifications
