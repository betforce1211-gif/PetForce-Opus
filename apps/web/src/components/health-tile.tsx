"use client";

import { trpc } from "@/lib/trpc";
import type { HealthSummary } from "@petforce/core";

interface HealthTileContentProps {
  householdId: string;
  onManage: () => void;
}

export function HealthTileContent({ householdId, onManage }: HealthTileContentProps) {
  const summaryQuery = trpc.health.summary.useQuery(
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

  const data: HealthSummary | undefined = summaryQuery.data;
  if (
    !data ||
    (data.activeMedicationCount === 0 &&
      data.overdueVaccinationCount === 0 &&
      !data.nextAppointment)
  ) {
    return (
      <>
        <div style={centered}>
          <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>{"\uD83C\uDFE5"}</span>
          <p style={{ color: "#A5A8BA", fontSize: "0.8rem", margin: "0.5rem 0 0" }}>
            No health records yet
          </p>
        </div>
        <button type="button" onClick={onManage} style={linkBtn}>
          + Add Record
        </button>
      </>
    );
  }

  return (
    <>
      <div style={summaryList}>
        {/* Active medications */}
        <div style={summaryRow}>
          <span style={summaryIcon}>{"\uD83D\uDC8A"}</span>
          <span style={summaryLabel}>Active Meds</span>
          <span style={summaryValue}>{data.activeMedicationCount}</span>
        </div>

        {/* Overdue vaccinations */}
        <div style={summaryRow}>
          <span style={summaryIcon}>
            {data.overdueVaccinationCount > 0 ? "\u26A0\uFE0F" : "\uD83D\uDC89"}
          </span>
          <span style={summaryLabel}>Overdue Vaccines</span>
          <span
            style={{
              ...summaryValue,
              color: data.overdueVaccinationCount > 0 ? "#DC2626" : "#1A1637",
              fontWeight: data.overdueVaccinationCount > 0 ? 800 : 700,
            }}
          >
            {data.overdueVaccinationCount}
          </span>
        </div>

        {/* Next appointment */}
        <div style={{ ...summaryRow, borderBottom: "none" }}>
          <span style={summaryIcon}>{"\uD83D\uDCC5"}</span>
          <span style={summaryLabel}>Next Appt</span>
          <span style={{ ...summaryValue, fontSize: "0.78rem" }}>
            {data.nextAppointment
              ? `${data.nextAppointment.petName} - ${formatShortDate(data.nextAppointment.date)}`
              : "None"}
          </span>
        </div>
      </div>

      <button type="button" onClick={onManage} style={linkBtn}>
        Manage Health
      </button>
    </>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
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
