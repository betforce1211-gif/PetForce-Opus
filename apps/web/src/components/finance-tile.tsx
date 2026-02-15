"use client";

import { trpc } from "@/lib/trpc";
import { EXPENSE_CATEGORY_LABELS, HEALTH_RECORD_TYPE_LABELS, EXPENSE_CATEGORY_ICONS } from "@petforce/core";
import type { FinanceSummary } from "@petforce/core";

interface FinanceTileContentProps {
  householdId: string;
  onManage: () => void;
}

export function FinanceTileContent({ householdId, onManage }: FinanceTileContentProps) {
  const summaryQuery = trpc.finance.summary.useQuery(
    { householdId },
    { refetchInterval: 60_000 }
  );

  if (summaryQuery.isLoading) {
    return (
      <div style={centered}>
        <span style={{ color: "#A5A8BA", fontSize: "0.8rem" }}>Loading...</span>
      </div>
    );
  }

  if (summaryQuery.isError) {
    return (
      <div style={centered}>
        <span style={{ color: "#EF4444", fontSize: "0.8rem" }}>Failed to load</span>
      </div>
    );
  }

  const data: FinanceSummary | undefined = summaryQuery.data;
  if (!data || (data.monthlyTotal === 0 && data.previousMonthTotal === 0)) {
    return (
      <>
        <div style={centered}>
          <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>{"\uD83D\uDCB0"}</span>
          <p style={{ color: "#A5A8BA", fontSize: "0.8rem", margin: "0.5rem 0 0" }}>
            No expenses tracked yet
          </p>
        </div>
        <button type="button" onClick={onManage} style={linkBtn}>
          + Add Expense
        </button>
      </>
    );
  }

  // Compute % change
  const pctChange = data.previousMonthTotal > 0
    ? ((data.monthlyTotal - data.previousMonthTotal) / data.previousMonthTotal) * 100
    : data.monthlyTotal > 0 ? 100 : 0;
  const changeSign = pctChange > 0 ? "+" : "";
  const changeColor = pctChange > 0 ? "#DC2626" : pctChange < 0 ? "#059669" : "#6B7280";

  // Top category
  const topCat = data.byCategory[0];
  const topCatLabel = topCat
    ? (EXPENSE_CATEGORY_LABELS[topCat.category] ?? HEALTH_RECORD_TYPE_LABELS[topCat.category] ?? topCat.category)
    : "None";
  const topCatIcon = topCat ? (EXPENSE_CATEGORY_ICONS[topCat.category] ?? "\uD83D\uDCB5") : "\uD83D\uDCB5";

  return (
    <>
      <div style={summaryList}>
        {/* This Month */}
        <div style={summaryRow}>
          <span style={summaryIcon}>{"\uD83D\uDCB0"}</span>
          <span style={summaryLabel}>This Month</span>
          <span style={summaryValue}>${data.monthlyTotal.toFixed(2)}</span>
        </div>

        {/* vs Last Month */}
        <div style={summaryRow}>
          <span style={summaryIcon}>{pctChange <= 0 ? "\uD83D\uDCC9" : "\uD83D\uDCC8"}</span>
          <span style={summaryLabel}>vs Last Month</span>
          <span style={{ ...summaryValue, color: changeColor, fontSize: "0.85rem" }}>
            {changeSign}{pctChange.toFixed(0)}%
          </span>
        </div>

        {/* Top Category */}
        <div style={{ ...summaryRow, borderBottom: "none" }}>
          <span style={summaryIcon}>{topCatIcon}</span>
          <span style={summaryLabel}>Top Category</span>
          <span style={{ ...summaryValue, fontSize: "0.78rem" }}>
            {topCatLabel}
          </span>
        </div>
      </div>

      <button type="button" onClick={onManage} style={linkBtn}>
        Manage Finance
      </button>
    </>
  );
}

// ── Styles ──

const centered: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const summaryList: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const summaryRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.625rem",
  padding: "0.5rem 0.25rem",
  borderBottom: "1px solid rgba(99, 102, 241, 0.06)",
};

const summaryIcon: React.CSSProperties = {
  fontSize: "1.2rem",
  width: "1.75rem",
  textAlign: "center",
  lineHeight: 1,
};

const summaryLabel: React.CSSProperties = {
  flex: 1,
  fontSize: "0.8rem",
  color: "#7C7F95",
  fontWeight: 500,
};

const summaryValue: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 700,
  color: "#1A1637",
};

const linkBtn: React.CSSProperties = {
  marginTop: "auto",
  paddingTop: "0.75rem",
  borderTop: "1px solid rgba(99, 102, 241, 0.08)",
  color: "#6366F1",
  fontSize: "0.8rem",
  fontWeight: 600,
  textDecoration: "none",
  textAlign: "center",
  letterSpacing: "0.01em",
  background: "none",
  border: "none",
  borderTopStyle: "solid",
  borderTopWidth: "1px",
  borderTopColor: "rgba(99, 102, 241, 0.08)",
  cursor: "pointer",
};
