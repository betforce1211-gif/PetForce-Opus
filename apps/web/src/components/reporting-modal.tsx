"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Modal } from "./modal";

interface ReportingModalProps {
  householdId: string;
  onClose: () => void;
}

type Tab = "summary" | "log" | "trends";

export function ReportingModal({ householdId, onClose }: ReportingModalProps) {
  const [tab, setTab] = useState<Tab>("summary");

  return (
    <Modal open onClose={onClose}>
      <h2 style={titleStyle}>Reporting</h2>

      {/* Tab bar */}
      <div style={tabBar}>
        {(
          [
            { key: "summary", label: "\uD83D\uDCCA Summary" },
            { key: "log", label: "\uD83D\uDCCB Activity Log" },
            { key: "trends", label: "\uD83D\uDCC8 Trends" },
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

      {tab === "summary" && <SummaryTab householdId={householdId} />}
      {tab === "log" && <ActivityLogTab householdId={householdId} />}
      {tab === "trends" && <TrendsTab householdId={householdId} />}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
        <button type="button" onClick={onClose} style={closeBtnStyle}>
          Done
        </button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════
// Summary Tab
// ══════════════════════════════════════════

function SummaryTab({ householdId }: { householdId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const summaryQuery = trpc.reporting.summary.useQuery(
    { householdId, from, to },
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

  const monthLabel = new Date(year, month - 1).toLocaleDateString([], { month: "long", year: "numeric" });
  const data = summaryQuery.data;

  return (
    <>
      {/* Month selector */}
      <div style={monthSelector}>
        <button type="button" onClick={goPrev} style={arrowBtn}>{"\u25C0"}</button>
        <span style={monthLabelStyle}>{monthLabel}</span>
        <button type="button" onClick={goNext} style={arrowBtn}>{"\u25B6"}</button>
      </div>

      {summaryQuery.isPending && <p style={emptyText}>Loading...</p>}
      {summaryQuery.isError && <p style={{ ...emptyText, color: "var(--pf-error)" }}>Failed to load summary</p>}

      {data && (
        <>
          {/* Big completion rate */}
          <div style={totalSection}>
            <span style={bigRate}>{Math.round(data.completionRate * 100)}%</span>
            <span style={bigRateLabel}>Completion Rate</span>
          </div>

          {/* Stat cards */}
          <div style={statCardsRow}>
            <div style={statCard}>
              <span style={statCardValue}>{data.totalCompleted}</span>
              <span style={statCardLabel}>Completed</span>
            </div>
            <div style={statCard}>
              <span style={{ ...statCardValue, color: data.totalSkipped > 0 ? "var(--pf-error-strong)" : "var(--pf-text)" }}>{data.totalSkipped}</span>
              <span style={statCardLabel}>Skipped</span>
            </div>
            <div style={statCard}>
              <span style={{ ...statCardValue, color: data.totalMissed > 0 ? "var(--pf-warning)" : "var(--pf-text)" }}>{data.totalMissed}</span>
              <span style={statCardLabel}>Missed</span>
            </div>
          </div>

          {/* Member contribution bars */}
          {data.contributions.length > 0 && (
            <fieldset style={fieldsetStyle}>
              <legend style={legendStyle}>Member Contributions</legend>
              <div style={contributionsList}>
                {data.contributions.map((c) => {
                  const total = c.completed + c.skipped;
                  const maxTotal = Math.max(...data.contributions.map((x) => x.completed + x.skipped), 1);
                  const barWidth = (total / maxTotal) * 100;
                  return (
                    <div key={c.memberId} style={contributionRow}>
                      <span style={contributionName}>{c.memberName}</span>
                      <div style={contributionBarContainer}>
                        <div style={{ ...contributionBarOuter, width: `${barWidth}%` }}>
                          {c.byType.map((bt) => {
                            const segWidth = total > 0 ? (bt.completed / total) * 100 : 0;
                            if (segWidth === 0) return null;
                            return (
                              <div
                                key={bt.taskType}
                                style={{ width: `${segWidth}%`, height: "100%", background: taskTypeColor[bt.taskType] }}
                                title={`${bt.taskType}: ${bt.completed}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                      <span style={contributionCount}>{c.completed}</span>
                    </div>
                  );
                })}
                {/* Legend */}
                <div style={legendRow}>
                  {(["feeding", "medication", "activity"] as const).map((t) => (
                    <span key={t} style={legendItem}>
                      <span style={{ ...legendDot, background: taskTypeColor[t] }} />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </fieldset>
          )}

          {data.totalCompleted === 0 && data.totalSkipped === 0 && (
            <p style={emptyText}>No task data for this month</p>
          )}
        </>
      )}
    </>
  );
}

// ══════════════════════════════════════════
// Activity Log Tab
// ══════════════════════════════════════════

type TaskTypeFilter = "feeding" | "medication" | "activity";

function ActivityLogTab({ householdId }: { householdId: string }) {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const to = now.toISOString().split("T")[0];

  const [memberFilter, setMemberFilter] = useState("");
  const [petFilter, setPetFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<TaskTypeFilter | "">("");
  const [limit, setLimit] = useState(50);

  const dashboardQuery = trpc.dashboard.get.useQuery({ householdId });
  const logQuery = trpc.reporting.completionLog.useQuery({
    householdId,
    from,
    to,
    memberId: memberFilter || undefined,
    petId: petFilter || undefined,
    taskType: (typeFilter as TaskTypeFilter) || undefined,
    offset: 0,
    limit,
  });

  const members = dashboardQuery.data?.members ?? [];
  const pets = dashboardQuery.data?.pets ?? [];
  const entries = logQuery.data ?? [];

  return (
    <>
      {/* Filters */}
      <div style={filterRow}>
        <select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)} style={filterSelect}>
          <option value="">All Members</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
        </select>
        <select value={petFilter} onChange={(e) => setPetFilter(e.target.value)} style={filterSelect}>
          <option value="">All Pets</option>
          {pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div style={chipRow}>
          {(["feeding", "medication", "activity"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(typeFilter === t ? "" : t)}
              style={typeChip(typeFilter === t)}
            >
              {taskTypeEmoji[t]} {t}
            </button>
          ))}
        </div>
      </div>

      {logQuery.isPending && <p style={emptyText}>Loading...</p>}
      {logQuery.isError && <p style={{ ...emptyText, color: "var(--pf-error)" }}>Failed to load log</p>}

      {!logQuery.isPending && entries.length === 0 && (
        <p style={emptyText}>No entries match the current filters</p>
      )}

      {entries.length > 0 && (
        <div style={logContainer}>
          {entries.map((e) => (
            <div key={e.id} style={logRow}>
              <span style={logIcon}>{taskTypeEmoji[e.taskType]}</span>
              <span style={logTaskName}>{e.taskName}</span>
              <span style={logPetName}>{e.petName}</span>
              <span style={logMember}>{e.completedByName}</span>
              <span style={logTimestamp}>{formatTimestamp(e.completedAt)}</span>
              {e.skipped && <span style={skipBadge}>Skipped</span>}
            </div>
          ))}

          {entries.length >= limit && (
            <button type="button" onClick={() => setLimit(limit + 50)} style={loadMoreBtn}>
              Load More
            </button>
          )}
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════
// Trends Tab
// ══════════════════════════════════════════

function TrendsTab({ householdId }: { householdId: string }) {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const to = now.toISOString().split("T")[0];

  const [granularity, setGranularity] = useState<"daily" | "weekly">("daily");

  const trendsQuery = trpc.reporting.trends.useQuery({
    householdId,
    from,
    to,
    granularity,
  });

  const points = trendsQuery.data ?? [];
  const maxVal = Math.max(...points.map((p) => p.completed + p.skipped), 1);

  return (
    <>
      {/* Granularity toggle */}
      <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <button type="button" onClick={() => setGranularity("daily")} style={typeChip(granularity === "daily")}>
          Daily
        </button>
        <button type="button" onClick={() => setGranularity("weekly")} style={typeChip(granularity === "weekly")}>
          Weekly
        </button>
      </div>

      {trendsQuery.isPending && <p style={emptyText}>Loading...</p>}
      {trendsQuery.isError && <p style={{ ...emptyText, color: "var(--pf-error)" }}>Failed to load trends</p>}

      {!trendsQuery.isPending && points.length === 0 && (
        <p style={emptyText}>No trend data for this period</p>
      )}

      {points.length > 0 && (
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Task Completion</legend>
          <div style={chartContainer}>
            <div style={chartArea}>
              {points.map((p) => {
                const total = p.completed + p.skipped;
                const heightPct = (total / maxVal) * 100;
                const completedPct = total > 0 ? (p.completed / total) * 100 : 0;
                const label = granularity === "daily" ? p.date.slice(5) : p.date;
                return (
                  <div key={p.date} style={barColumn}>
                    <div style={{ ...barWrapper, height: `${heightPct}%` }}>
                      <div
                        style={{ width: "100%", height: `${100 - completedPct}%`, background: "var(--pf-error)", borderRadius: completedPct === 0 ? "3px 3px 0 0" : "3px 3px 0 0" }}
                        title={`Skipped: ${p.skipped}`}
                      />
                      <div
                        style={{ width: "100%", height: `${completedPct}%`, background: "#10B981", borderRadius: completedPct === 100 ? "3px 3px 0 0" : "0" }}
                        title={`Completed: ${p.completed}`}
                      />
                    </div>
                    <span style={barLabel}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Chart legend */}
          <div style={{ ...legendRow, marginTop: "0.5rem" }}>
            <span style={legendItem}>
              <span style={{ ...legendDot, background: "#10B981" }} />
              completed
            </span>
            <span style={legendItem}>
              <span style={{ ...legendDot, background: "var(--pf-error)" }} />
              skipped
            </span>
          </div>
        </fieldset>
      )}
    </>
  );
}

// ══════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════

const taskTypeEmoji: Record<string, string> = {
  feeding: "\uD83C\uDF7D\uFE0F",
  medication: "\uD83D\uDC8A",
  activity: "\uD83C\uDFC3",
};

const taskTypeColor: Record<string, string> = {
  feeding: "var(--pf-warning)",
  medication: "#EC4899",
  activity: "var(--pf-primary)",
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// ══════════════════════════════════════════
// Styles
// ══════════════════════════════════════════

const titleStyle: React.CSSProperties = {
  margin: "0 0 1rem",
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "var(--pf-text)",
};

const tabBar: React.CSSProperties = {
  display: "flex",
  gap: "0.35rem",
  marginBottom: "1.25rem",
  borderBottom: "2px solid var(--pf-border-muted)",
  paddingBottom: "0",
};

const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: "0.5rem 1rem",
  fontSize: "0.85rem",
  fontWeight: 600,
  border: "none",
  borderBottom: active ? "2px solid var(--pf-primary)" : "2px solid transparent",
  marginBottom: "-2px",
  background: "none",
  color: active ? "var(--pf-primary)" : "var(--pf-text-muted)",
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
  color: "var(--pf-primary)",
  padding: "0.25rem 0.5rem",
};

const monthLabelStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 700,
  color: "var(--pf-text)",
  minWidth: "10rem",
  textAlign: "center",
};

const totalSection: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "1rem",
};

const bigRate: React.CSSProperties = {
  fontSize: "2.5rem",
  fontWeight: 800,
  color: "var(--pf-text)",
  display: "block",
  letterSpacing: "-0.02em",
};

const bigRateLabel: React.CSSProperties = {
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "var(--pf-text-secondary)",
  display: "block",
  marginTop: "0.15rem",
};

const statCardsRow: React.CSSProperties = {
  display: "flex",
  gap: "0.75rem",
  justifyContent: "center",
  marginBottom: "1rem",
};

const statCard: React.CSSProperties = {
  flex: 1,
  maxWidth: "10rem",
  textAlign: "center",
  padding: "0.75rem",
  borderRadius: "0.75rem",
  background: "rgba(99, 102, 241, 0.04)",
  border: "1px solid var(--pf-highlight)",
};

const statCardValue: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 800,
  color: "var(--pf-text)",
  display: "block",
};

const statCardLabel: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--pf-text-secondary)",
  display: "block",
  marginTop: "0.15rem",
};

const fieldsetStyle: React.CSSProperties = {
  border: "1px solid var(--pf-border-muted)",
  borderRadius: "0.75rem",
  padding: "0.75rem 1rem",
  margin: 0,
};

const legendStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "0.9rem",
  padding: "0 0.5rem",
  color: "var(--pf-text-muted)",
};

const contributionsList: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

const contributionRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
};

const contributionName: React.CSSProperties = {
  fontSize: "0.825rem",
  fontWeight: 600,
  color: "var(--pf-text)",
  width: "6rem",
  flexShrink: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const contributionBarContainer: React.CSSProperties = {
  flex: 1,
  height: 14,
  background: "var(--pf-highlight)",
  borderRadius: 7,
  overflow: "hidden",
};

const contributionBarOuter: React.CSSProperties = {
  height: "100%",
  display: "flex",
  borderRadius: 7,
  overflow: "hidden",
  transition: "width 0.3s ease",
};

const contributionCount: React.CSSProperties = {
  fontSize: "0.8rem",
  fontWeight: 700,
  color: "var(--pf-text)",
  width: "2rem",
  textAlign: "right",
  flexShrink: 0,
};

const legendRow: React.CSSProperties = {
  display: "flex",
  gap: "1rem",
  justifyContent: "center",
  marginTop: "0.25rem",
};

const legendItem: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.3rem",
  fontSize: "0.7rem",
  color: "var(--pf-text-muted)",
  fontWeight: 500,
  textTransform: "capitalize",
};

const legendDot: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 4,
  flexShrink: 0,
};

// --- Activity Log styles ---

const filterRow: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  marginBottom: "1rem",
  flexWrap: "wrap",
  alignItems: "center",
};

const filterSelect: React.CSSProperties = {
  padding: "0.35rem 0.6rem",
  borderRadius: "0.5rem",
  border: "1px solid var(--pf-input-border)",
  fontSize: "0.8rem",
  outline: "none",
  color: "var(--pf-text-muted)",
};

const chipRow: React.CSSProperties = {
  display: "flex",
  gap: "0.35rem",
};

const typeChip = (active: boolean): React.CSSProperties => ({
  padding: "0.25rem 0.65rem",
  borderRadius: "999px",
  fontSize: "0.75rem",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  background: active
    ? "linear-gradient(135deg, #6366F1, #8B5CF6)"
    : "var(--pf-highlight)",
  color: active ? "white" : "var(--pf-primary)",
  transition: "all 0.15s ease",
  textTransform: "capitalize",
});

const logContainer: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  maxHeight: "22rem",
  overflowY: "auto",
};

const logRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.4rem 0.35rem",
  fontSize: "0.8rem",
  borderBottom: "1px solid rgba(99, 102, 241, 0.05)",
  flexWrap: "wrap",
};

const logIcon: React.CSSProperties = {
  fontSize: "0.9rem",
  lineHeight: 1,
  flexShrink: 0,
};

const logTaskName: React.CSSProperties = {
  fontWeight: 600,
  color: "var(--pf-text)",
};

const logPetName: React.CSSProperties = {
  color: "var(--pf-primary)",
  fontWeight: 500,
  fontSize: "0.75rem",
};

const logMember: React.CSSProperties = {
  color: "var(--pf-text-secondary)",
  fontWeight: 500,
  fontSize: "0.75rem",
};

const logTimestamp: React.CSSProperties = {
  color: "var(--pf-text-secondary)",
  fontWeight: 500,
  fontSize: "0.72rem",
  marginLeft: "auto",
  flexShrink: 0,
};

const skipBadge: React.CSSProperties = {
  padding: "0.1rem 0.45rem",
  borderRadius: "999px",
  background: "rgba(239, 68, 68, 0.08)",
  color: "var(--pf-error-strong)",
  fontSize: "0.65rem",
  fontWeight: 700,
  flexShrink: 0,
};

const loadMoreBtn: React.CSSProperties = {
  padding: "0.45rem 1rem",
  borderRadius: "0.5rem",
  background: "var(--pf-highlight)",
  color: "var(--pf-primary)",
  fontWeight: 600,
  fontSize: "0.8rem",
  border: "none",
  cursor: "pointer",
  textAlign: "center",
  marginTop: "0.5rem",
};

// --- Trends styles ---

const chartContainer: React.CSSProperties = {
  padding: "0.25rem 0",
};

const chartArea: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: "2px",
  height: "10rem",
  padding: "0.25rem 0",
};

const barColumn: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  height: "100%",
  justifyContent: "flex-end",
  minWidth: 0,
};

const barWrapper: React.CSSProperties = {
  width: "100%",
  maxWidth: 24,
  display: "flex",
  flexDirection: "column",
  borderRadius: "3px 3px 0 0",
  overflow: "hidden",
  transition: "height 0.3s ease",
};

const barLabel: React.CSSProperties = {
  fontSize: "0.55rem",
  color: "var(--pf-text-secondary)",
  marginTop: "0.2rem",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "100%",
};

const closeBtnStyle: React.CSSProperties = {
  padding: "0.6rem 1.5rem",
  borderRadius: "0.5rem",
  background: "var(--pf-surface-muted)",
  color: "var(--pf-text-muted)",
  fontWeight: 600,
  fontSize: "0.875rem",
  border: "none",
  cursor: "pointer",
};

const emptyText: React.CSSProperties = {
  color: "var(--pf-text-secondary)",
  fontSize: "0.85rem",
  textAlign: "center",
  margin: "1rem 0 0.5rem",
};
