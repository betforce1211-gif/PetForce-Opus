"use client";

import { trpc } from "@/lib/trpc";

interface ReportingTileContentProps {
  householdId: string;
  onManage: () => void;
}

function getMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const to = now.toISOString().split("T")[0];
  return { from, to };
}

export function ReportingTileContent({ householdId, onManage }: ReportingTileContentProps) {
  const { from, to } = getMonthRange();
  const summaryQuery = trpc.reporting.summary.useQuery(
    { householdId, from, to },
    { refetchInterval: 60_000 }
  );

  if (summaryQuery.isPending) {
    return (
      <div style={centered}>
        <span style={{ color: "var(--pf-text-secondary)", fontSize: "0.8rem" }}>Loading...</span>
      </div>
    );
  }

  if (summaryQuery.isError) {
    return (
      <div style={centered}>
        <span style={{ color: "var(--pf-error)", fontSize: "0.8rem" }}>Failed to load</span>
      </div>
    );
  }

  const data = summaryQuery.data;
  if (!data || (data.totalExpected === 0)) {
    return (
      <>
        <div style={centered}>
          <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>{"\uD83D\uDCCA"}</span>
          <p style={{ color: "var(--pf-text-secondary)", fontSize: "0.8rem", margin: "0.5rem 0 0" }}>
            No activity data yet
          </p>
        </div>
        <button type="button" onClick={onManage} style={linkBtn}>
          View Reports
        </button>
      </>
    );
  }

  return (
    <>
      <p style={monthLabel}>This Month</p>
      <div style={summaryList}>
        {/* On Time (completed, non-skipped) */}
        <div style={summaryRow}>
          <span style={summaryIcon}>{"\u2705"}</span>
          <span style={summaryLabel}>On Time</span>
          <span style={{ ...summaryValue, color: "var(--pf-success-strong)" }}>{data.totalCompleted}</span>
        </div>

        {/* Total tasks */}
        <div style={summaryRow}>
          <span style={summaryIcon}>{"\uD83D\uDCCB"}</span>
          <span style={summaryLabel}>Total Tasks</span>
          <span style={summaryValue}>{data.totalExpected}</span>
        </div>

        {/* Skipped */}
        <div style={summaryRow}>
          <span style={summaryIcon}>{"\u23ED\uFE0F"}</span>
          <span style={summaryLabel}>Skipped</span>
          <span style={{ ...summaryValue, color: data.totalSkipped > 0 ? "var(--pf-error-strong)" : "var(--pf-text)" }}>{data.totalSkipped}</span>
        </div>

        {/* Missed */}
        <div style={{ ...summaryRow, borderBottom: "none" }}>
          <span style={summaryIcon}>{"\u274C"}</span>
          <span style={summaryLabel}>Missed</span>
          <span style={{ ...summaryValue, color: data.totalMissed > 0 ? "var(--pf-warning)" : "var(--pf-text)" }}>{data.totalMissed}</span>
        </div>
      </div>

      <button type="button" onClick={onManage} style={linkBtn}>
        View Reports
      </button>
    </>
  );
}

// ── Styles ──

const monthLabel: React.CSSProperties = {
  textAlign: "center",
  fontSize: "0.7rem",
  fontWeight: 600,
  color: "var(--pf-text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  margin: 0,
};

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
  borderBottom: "1px solid var(--pf-highlight)",
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
  color: "var(--pf-text-secondary)",
  fontWeight: 500,
};

const summaryValue: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 700,
  color: "var(--pf-text)",
};

const linkBtn: React.CSSProperties = {
  marginTop: "auto",
  paddingTop: "0.75rem",
  borderTop: "1px solid var(--pf-highlight)",
  color: "var(--pf-primary)",
  fontSize: "0.8rem",
  fontWeight: 600,
  textDecoration: "none",
  textAlign: "center",
  letterSpacing: "0.01em",
  background: "none",
  border: "none",
  borderTopStyle: "solid",
  borderTopWidth: "1px",
  borderTopColor: "var(--pf-highlight)",
  cursor: "pointer",
};
