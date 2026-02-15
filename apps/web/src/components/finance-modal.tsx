"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Modal } from "./modal";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_ICONS,
  EXPENSE_DESCRIPTION_SUGGESTIONS,
  HEALTH_RECORD_TYPE_LABELS,
  expenseCategories,
} from "@petforce/core";
import type { ExpenseCategory, FinanceSummary } from "@petforce/core";

interface FinanceModalProps {
  householdId: string;
  onClose: () => void;
}

type Tab = "overview" | "expenses";

export function FinanceModal({ householdId, onClose }: FinanceModalProps) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <Modal open onClose={onClose}>
      <h2 style={titleStyle}>Finance</h2>

      {/* Tab bar */}
      <div style={tabBar}>
        {(
          [
            { key: "overview", label: "\uD83D\uDCCA Overview" },
            { key: "expenses", label: "\uD83D\uDCB5 Expenses" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={tabBtn(tab === t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab householdId={householdId} />}
      {tab === "expenses" && <ExpensesTab householdId={householdId} />}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
        <button type="button" onClick={onClose} style={closeBtnStyle}>
          Done
        </button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════
// Overview Tab
// ══════════════════════════════════════════

function OverviewTab({ householdId }: { householdId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const summaryQuery = trpc.finance.summary.useQuery(
    { householdId, month: monthStr },
    { refetchInterval: 60_000 }
  );

  const goPrev = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const goNext = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const data: FinanceSummary | undefined = summaryQuery.data;
  const monthLabel = new Date(year, month - 1).toLocaleDateString([], { month: "long", year: "numeric" });

  // Compute % change
  const pctChange = data && data.previousMonthTotal > 0
    ? ((data.monthlyTotal - data.previousMonthTotal) / data.previousMonthTotal) * 100
    : data && data.monthlyTotal > 0 ? 100 : 0;
  const changeSign = pctChange > 0 ? "+" : "";
  const changeColor = pctChange > 0 ? "#DC2626" : pctChange < 0 ? "#059669" : "#6B7280";

  // Max for bar chart
  const maxCat = data ? Math.max(...data.byCategory.map((c) => c.total), 1) : 1;

  return (
    <>
      {/* Month selector */}
      <div style={monthSelector}>
        <button type="button" onClick={goPrev} style={arrowBtn}>{"\u25C0"}</button>
        <span style={monthLabelStyle}>{monthLabel}</span>
        <button type="button" onClick={goNext} style={arrowBtn}>{"\u25B6"}</button>
      </div>

      {summaryQuery.isLoading && <p style={emptyText}>Loading...</p>}
      {summaryQuery.isError && <p style={{ ...emptyText, color: "#EF4444" }}>Failed to load summary</p>}

      {data && (
        <>
          {/* Monthly total */}
          <div style={totalSection}>
            <span style={totalAmount}>${data.monthlyTotal.toFixed(2)}</span>
            <span style={{ ...totalChange, color: changeColor }}>
              {data.previousMonthTotal > 0
                ? `${changeSign}${pctChange.toFixed(0)}% vs last month ($${data.previousMonthTotal.toFixed(2)})`
                : "No previous month data"}
            </span>
          </div>

          {/* By-category breakdown */}
          {data.byCategory.length > 0 && (
            <fieldset style={fieldsetStyle}>
              <legend style={legendStyle}>By Category</legend>
              <div style={breakdownList}>
                {data.byCategory.map((cat) => {
                  const label = EXPENSE_CATEGORY_LABELS[cat.category] ?? HEALTH_RECORD_TYPE_LABELS[cat.category] ?? cat.category;
                  const icon = EXPENSE_CATEGORY_ICONS[cat.category] ?? "\uD83D\uDCB5";
                  const pct = (cat.total / maxCat) * 100;
                  return (
                    <div key={cat.category} style={breakdownRow}>
                      <span style={breakdownIcon}>{icon}</span>
                      <span style={breakdownLabel}>{label}</span>
                      <div style={barContainer}>
                        <div style={{ ...barFill, width: `${pct}%` }} />
                      </div>
                      <span style={breakdownAmount}>${cat.total.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* By-pet breakdown */}
          {data.byPet.length > 0 && (
            <fieldset style={{ ...fieldsetStyle, marginTop: "0.75rem" }}>
              <legend style={legendStyle}>By Pet</legend>
              <div style={breakdownList}>
                {data.byPet.map((pet) => (
                  <div key={pet.petId} style={breakdownRow}>
                    <span style={breakdownIcon}>{"\uD83D\uDC3E"}</span>
                    <span style={breakdownLabel}>{pet.petName}</span>
                    <span style={{ flex: 1 }} />
                    <span style={breakdownAmount}>${pet.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </fieldset>
          )}

          {data.monthlyTotal === 0 && data.previousMonthTotal === 0 && (
            <p style={emptyText}>No expenses for this month</p>
          )}
        </>
      )}
    </>
  );
}

// ══════════════════════════════════════════
// Expenses Tab
// ══════════════════════════════════════════

function ExpensesTab({ householdId }: { householdId: string }) {
  const utils = trpc.useContext();
  const dashboardQuery = trpc.dashboard.get.useQuery({ householdId });
  const expensesQuery = trpc.finance.listExpenses.useQuery({ householdId });

  const [petId, setPetId] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<ExpenseCategory>("food");
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const createMut = trpc.finance.createExpense.useMutation({
    onSuccess: () => {
      utils.finance.listExpenses.invalidate();
      utils.finance.summary.invalidate();
      resetForm();
    },
  });
  const updateMut = trpc.finance.updateExpense.useMutation({
    onSuccess: () => {
      utils.finance.listExpenses.invalidate();
      utils.finance.summary.invalidate();
      setEditId(null);
    },
  });
  const deleteMut = trpc.finance.deleteExpense.useMutation({
    onSuccess: () => {
      utils.finance.listExpenses.invalidate();
      utils.finance.summary.invalidate();
    },
  });

  const pets = dashboardQuery.data?.pets ?? [];
  const effectivePetId = petId || (pets.length === 1 ? pets[0].id : "");

  const allExpenses = expensesQuery.data ?? [];

  // Description suggestion chips
  const suggestions = EXPENSE_DESCRIPTION_SUGGESTIONS[category] ?? [];

  function resetForm() {
    setDescription("");
    setAmount("");
    setDate("");
    setNotes("");
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectivePetId || !description || !amount || !date) return;
    createMut.mutate({
      householdId,
      petId: effectivePetId,
      category,
      description,
      amount: parseFloat(amount),
      date: new Date(date),
      notes: notes || null,
    });
  };

  const startEdit = (r: (typeof allExpenses)[number]) => {
    setEditId(r.id);
    setEditCategory(r.category as ExpenseCategory);
    setEditDescription(r.description);
    setEditAmount(String(r.amount));
    setEditDate(toDateInput(r.date));
    setEditNotes(r.notes ?? "");
  };

  const handleSaveEdit = () => {
    if (!editId || !editDescription || !editAmount || !editDate) return;
    updateMut.mutate({
      householdId,
      id: editId,
      category: editCategory,
      description: editDescription,
      amount: parseFloat(editAmount),
      date: new Date(editDate),
      notes: editNotes || null,
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this expense?")) return;
    deleteMut.mutate({ householdId, id });
  };

  const petMap = new Map(pets.map((p) => [p.id, p.name]));
  const grouped = groupByPet(allExpenses);

  return (
    <>
      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Add Expense</legend>

        {/* Description suggestion chips */}
        {suggestions.length > 0 && (
          <div style={chipRow}>
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => setDescription(s)} style={suggestionChip(description === s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleAdd} style={formGrid}>
          {pets.length > 1 && (
            <label style={labelStyle}>
              <span style={labelText}>Pet</span>
              <select value={effectivePetId} onChange={(e) => setPetId(e.target.value)} required style={inputStyle}>
                <option value="">Select pet</option>
                {pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}
          <label style={labelStyle}>
            <span style={labelText}>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} style={inputStyle}>
              {expenseCategories.map((c) => (
                <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Description</span>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was it for?" required maxLength={200} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Amount ($)</span>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required min="0.01" step="0.01" style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Notes</span>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" maxLength={2000} style={inputStyle} />
          </label>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="submit" disabled={createMut.isLoading || !effectivePetId || !description || !amount || !date} style={addBtn(createMut.isLoading)}>
              {createMut.isLoading ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
        {createMut.error && <p style={errorText}>{createMut.error.message}</p>}
      </fieldset>

      <fieldset style={{ ...fieldsetStyle, marginTop: "1rem" }}>
        <legend style={legendStyle}>Expense Records</legend>
        {allExpenses.length === 0 ? (
          <p style={emptyText}>No expenses yet. Add one above!</p>
        ) : (
          <div style={recordsContainer}>
            {Array.from(grouped.entries()).map(([pId, items]) => (
              <div key={pId}>
                <div style={petGroupHeader}>{petMap.get(pId) ?? "Unknown Pet"}</div>
                {items
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((r) =>
                    editId === r.id ? (
                      <div key={r.id} style={recordRow}>
                        <select value={editCategory} onChange={(e) => setEditCategory(e.target.value as ExpenseCategory)} style={{ ...inputStyle, width: 100 }}>
                          {expenseCategories.map((c) => (
                            <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
                          ))}
                        </select>
                        <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" style={{ ...inputStyle, flex: 1 }} />
                        <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="$" style={{ ...inputStyle, width: 70 }} />
                        <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={inputStyle} />
                        <button type="button" onClick={handleSaveEdit} disabled={updateMut.isLoading} style={saveBtn}>{updateMut.isLoading ? "..." : "Save"}</button>
                        <button type="button" onClick={() => setEditId(null)} style={cancelBtn}>Cancel</button>
                      </div>
                    ) : (
                      <div key={r.id} style={recordRow}>
                        <span style={recordIcon}>{EXPENSE_CATEGORY_ICONS[r.category] ?? "\uD83D\uDCB5"}</span>
                        <span style={recordLabel}>{r.description}</span>
                        <span style={recordDate}>{formatDate(r.date)}</span>
                        <span style={recordMeta}>{EXPENSE_CATEGORY_LABELS[r.category] ?? r.category}</span>
                        <span style={recordAmount}>${r.amount.toFixed(2)}</span>
                        <span style={{ flex: 1 }} />
                        <button type="button" onClick={() => startEdit(r)} style={editBtnStyle}>Edit</button>
                        <button type="button" onClick={() => handleDelete(r.id)} disabled={deleteMut.isLoading} style={deleteBtnStyle}>Delete</button>
                      </div>
                    )
                  )}
              </div>
            ))}
          </div>
        )}
        {(updateMut.error || deleteMut.error) && <p style={errorText}>{updateMut.error?.message ?? deleteMut.error?.message}</p>}
      </fieldset>
    </>
  );
}

// ══════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════

function toDateInput(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().split("T")[0];
}

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function groupByPet<T extends { petId: string }>(items: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const arr = grouped.get(item.petId) ?? [];
    arr.push(item);
    grouped.set(item.petId, arr);
  }
  return grouped;
}

// ══════════════════════════════════════════
// Styles
// ══════════════════════════════════════════

const titleStyle: React.CSSProperties = {
  margin: "0 0 1rem",
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "#1A1637",
};

const tabBar: React.CSSProperties = {
  display: "flex",
  gap: "0.35rem",
  marginBottom: "1.25rem",
  borderBottom: "2px solid #E5E7EB",
  paddingBottom: "0",
};

const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: "0.5rem 1rem",
  fontSize: "0.85rem",
  fontWeight: 600,
  border: "none",
  borderBottom: active ? "2px solid #6366F1" : "2px solid transparent",
  marginBottom: "-2px",
  background: "none",
  color: active ? "#6366F1" : "#6B7280",
  cursor: "pointer",
  transition: "all 0.15s ease",
});

const monthSelector: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "1rem",
  marginBottom: "1rem",
};

const arrowBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  fontSize: "0.9rem",
  cursor: "pointer",
  color: "#6366F1",
  padding: "0.25rem 0.5rem",
};

const monthLabelStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 700,
  color: "#1A1637",
  minWidth: "10rem",
  textAlign: "center",
};

const totalSection: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "1rem",
};

const totalAmount: React.CSSProperties = {
  fontSize: "2rem",
  fontWeight: 800,
  color: "#1A1637",
  display: "block",
  letterSpacing: "-0.02em",
};

const totalChange: React.CSSProperties = {
  fontSize: "0.8rem",
  fontWeight: 600,
  display: "block",
  marginTop: "0.25rem",
};

const breakdownList: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.4rem",
};

const breakdownRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.25rem 0",
};

const breakdownIcon: React.CSSProperties = {
  fontSize: "0.9rem",
  width: "1.25rem",
  textAlign: "center",
  lineHeight: 1,
};

const breakdownLabel: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "0.825rem",
  color: "#1A1637",
  width: "5.5rem",
  flexShrink: 0,
};

const barContainer: React.CSSProperties = {
  flex: 1,
  height: 8,
  background: "rgba(99, 102, 241, 0.08)",
  borderRadius: 4,
  overflow: "hidden",
};

const barFill: React.CSSProperties = {
  height: "100%",
  background: "linear-gradient(135deg, #10B981, #059669)",
  borderRadius: 4,
  transition: "width 0.3s ease",
};

const breakdownAmount: React.CSSProperties = {
  fontSize: "0.825rem",
  fontWeight: 700,
  color: "#1A1637",
  width: "4.5rem",
  textAlign: "right",
  flexShrink: 0,
};

const fieldsetStyle: React.CSSProperties = {
  border: "1px solid #E5E7EB",
  borderRadius: "0.75rem",
  padding: "0.75rem 1rem",
  margin: 0,
};

const legendStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "0.9rem",
  padding: "0 0.5rem",
  color: "#374151",
};

const chipRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.4rem",
  marginBottom: "0.6rem",
};

const suggestionChip = (active: boolean): React.CSSProperties => ({
  padding: "0.25rem 0.7rem",
  borderRadius: "999px",
  fontSize: "0.75rem",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  background: active
    ? "linear-gradient(135deg, #6366F1, #8B5CF6)"
    : "rgba(99, 102, 241, 0.06)",
  color: active ? "white" : "#6366F1",
  transition: "all 0.15s ease",
});

const formGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "0.6rem",
};

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.2rem" };
const labelText: React.CSSProperties = { fontWeight: 600, fontSize: "0.75rem", color: "#374151" };

const inputStyle: React.CSSProperties = {
  padding: "0.4rem 0.6rem",
  borderRadius: "0.5rem",
  border: "1px solid #D1D5DB",
  fontSize: "0.85rem",
  outline: "none",
};

const addBtn = (loading: boolean): React.CSSProperties => ({
  padding: "0.45rem 1.1rem",
  borderRadius: "0.5rem",
  background: "linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)",
  color: "white",
  fontWeight: 600,
  fontSize: "0.85rem",
  border: "none",
  cursor: loading ? "not-allowed" : "pointer",
  opacity: loading ? 0.7 : 1,
  whiteSpace: "nowrap",
});

const petGroupHeader: React.CSSProperties = {
  fontSize: "0.8rem",
  fontWeight: 700,
  color: "#6366F1",
  padding: "0.25rem 0",
  borderBottom: "1px solid rgba(99, 102, 241, 0.1)",
  marginBottom: "0.35rem",
};

const recordsContainer: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

const recordRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.35rem 0.25rem",
  fontSize: "0.825rem",
  flexWrap: "wrap",
};

const recordIcon: React.CSSProperties = {
  fontSize: "0.9rem",
  lineHeight: 1,
};

const recordLabel: React.CSSProperties = {
  fontWeight: 600,
  color: "#1A1637",
};

const recordDate: React.CSSProperties = {
  color: "#6B7280",
  fontWeight: 500,
};

const recordMeta: React.CSSProperties = {
  color: "#A5A8BA",
  fontSize: "0.75rem",
};

const recordAmount: React.CSSProperties = {
  fontWeight: 700,
  color: "#059669",
  fontSize: "0.85rem",
};

const editBtnStyle: React.CSSProperties = {
  padding: "0.2rem 0.6rem",
  borderRadius: "0.375rem",
  background: "rgba(99, 102, 241, 0.06)",
  color: "#6366F1",
  fontWeight: 600,
  fontSize: "0.75rem",
  border: "none",
  cursor: "pointer",
};

const deleteBtnStyle: React.CSSProperties = {
  padding: "0.2rem 0.6rem",
  borderRadius: "0.375rem",
  background: "rgba(239, 68, 68, 0.06)",
  color: "#DC2626",
  fontWeight: 600,
  fontSize: "0.75rem",
  border: "none",
  cursor: "pointer",
};

const saveBtn: React.CSSProperties = {
  padding: "0.2rem 0.6rem",
  borderRadius: "0.375rem",
  background: "#6366F1",
  color: "white",
  fontWeight: 600,
  fontSize: "0.75rem",
  border: "none",
  cursor: "pointer",
};

const cancelBtn: React.CSSProperties = {
  padding: "0.2rem 0.6rem",
  borderRadius: "0.375rem",
  background: "#F3F4F6",
  color: "#374151",
  fontWeight: 600,
  fontSize: "0.75rem",
  border: "none",
  cursor: "pointer",
};

const closeBtnStyle: React.CSSProperties = {
  padding: "0.6rem 1.5rem",
  borderRadius: "0.5rem",
  background: "#F3F4F6",
  color: "#374151",
  fontWeight: 600,
  fontSize: "0.875rem",
  border: "none",
  cursor: "pointer",
};

const errorText: React.CSSProperties = {
  color: "#EF4444",
  fontSize: "0.825rem",
  marginTop: "0.5rem",
};

const emptyText: React.CSSProperties = {
  color: "#A5A8BA",
  fontSize: "0.85rem",
  textAlign: "center",
  margin: "1rem 0 0.5rem",
};
