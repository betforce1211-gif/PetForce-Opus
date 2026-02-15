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

  const data = summaryQuery.data;
  if (!data || (data.totalCompleted === 0 && data.totalSkipped === 0)) {
    return (
      <>
        <div style={centered}>
          <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>{"\uD83D\uDCCA"}</span>
          <p style={{ color: "#A5A8BA", fontSize: "0.8rem", margin: "0.5rem 0 0" }}>
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
      <div style={summaryList}>
        {/* On Time (completed, non-skipped) */}
        <div style={summaryRow}>
          <span style={summaryIcon}>{"\u2705"}</span>
          <span style={summaryLabel}>On Time</span>
          <span style={{ ...summaryValue, color: "#059669" }}>{data.totalCompleted}</span>
        </div>

        {/* Total tasks */}
        <div style={summaryRow}>
          <span style={summaryIcon}>{"\uD83D\uDCCB"}</span>
          <span style={summaryLabel}>Total Tasks</span>
          <span style={summaryValue}>{data.totalCompleted + data.totalSkipped}</span>
        </div>

        {/* Skipped */}
        <div style={{ ...summaryRow, borderBottom: "none" }}>
          <span style={summaryIcon}>{"\u23ED\uFE0F"}</span>
          <span style={summaryLabel}>Skipped</span>
          <span style={{ ...summaryValue, color: data.totalSkipped > 0 ? "#DC2626" : "#1A1637" }}>{data.totalSkipped}</span>
        </div>
      </div>

      <button type="button" onClick={onManage} style={linkBtn}>
        View Reports
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
