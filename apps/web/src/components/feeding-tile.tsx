"use client";

import { trpc } from "@/lib/trpc";
import type { HouseholdFeedingStatus, FeedingScheduleStatus } from "@petforce/core";

interface FeedingTileContentProps {
  householdId: string;
  onManage: () => void;
}

export function FeedingTileContent({ householdId, onManage }: FeedingTileContentProps) {
  const today = new Date().toISOString().split("T")[0];
  const statusQuery = trpc.feeding.todayStatus.useQuery(
    { householdId, date: today },
    { refetchInterval: 30_000 }
  );
  const utils = trpc.useContext();

  const logMut = trpc.feeding.logCompletion.useMutation({
    onSuccess: () => utils.feeding.todayStatus.invalidate(),
  });

  const undoMut = trpc.feeding.undoCompletion.useMutation({
    onSuccess: () => utils.feeding.todayStatus.invalidate(),
  });

  const handleToggle = (s: FeedingScheduleStatus) => {
    if (s.log) {
      undoMut.mutate({ householdId, feedingLogId: s.log.id });
    } else {
      logMut.mutate({
        householdId,
        feedingScheduleId: s.schedule.id,
        feedingDate: today,
      });
    }
  };

  if (statusQuery.isLoading) {
    return (
      <div style={centered}>
        <span style={{ color: "#A5A8BA", fontSize: "0.8rem" }}>Loading...</span>
      </div>
    );
  }

  if (statusQuery.isError) {
    return (
      <div style={centered}>
        <span style={{ color: "#EF4444", fontSize: "0.8rem" }}>Failed to load</span>
      </div>
    );
  }

  const data: HouseholdFeedingStatus | undefined = statusQuery.data;
  if (!data || data.totalScheduled === 0) {
    return (
      <>
        <div style={centered}>
          <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>🍽️</span>
          <p style={{ color: "#A5A8BA", fontSize: "0.8rem", margin: "0.5rem 0 0" }}>
            No feeding schedules
          </p>
        </div>
        <button
          type="button"
          onClick={onManage}
          style={linkBtn}
        >
          + Add Schedule
        </button>
      </>
    );
  }

  const { pets, totalScheduled, totalCompleted } = data;

  return (
    <>
      {/* Completion badge */}
      <div style={badgeRow}>
        <span style={completionBadge(totalCompleted === totalScheduled)}>
          {totalCompleted}/{totalScheduled}
        </span>
      </div>

      {/* Pet list */}
      <div style={petList}>
        {pets.map((pet) => (
          <div key={pet.petId} style={petSection}>
            <div style={petNameRow}>{pet.petName}</div>
            <div style={chipRow}>
              {pet.schedules.map((s) => {
                const done = !!s.log;
                return (
                  <button
                    key={s.schedule.id}
                    type="button"
                    onClick={() => handleToggle(s)}
                    disabled={logMut.isLoading || undoMut.isLoading}
                    style={chip(done)}
                    title={done ? "Click to undo" : "Click to mark done"}
                  >
                    <span>{done ? "\u2713" : "\u25CB"}</span>
                    {" "}{s.schedule.label} {formatTime(s.schedule.time)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={onManage} style={linkBtn}>
        Manage Schedules
      </button>
    </>
  );
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "pm" : "am";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m}${ampm}`;
}

// ── Styles ──

const centered: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const badgeRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  marginBottom: "0.25rem",
  marginTop: "-0.25rem",
};

const completionBadge = (allDone: boolean): React.CSSProperties => ({
  display: "inline-block",
  padding: "0.15rem 0.55rem",
  borderRadius: "999px",
  background: allDone
    ? "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(52, 211, 153, 0.12))"
    : "linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(251, 191, 36, 0.12))",
  color: allDone ? "#059669" : "#D97706",
  fontSize: "0.75rem",
  fontWeight: 700,
  letterSpacing: "0.02em",
});

const petList: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "0.35rem",
};

const petSection: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.2rem",
};

const petNameRow: React.CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 700,
  color: "#1A1637",
  letterSpacing: "-0.005em",
};

const chipRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.3rem",
};

const chip = (done: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "0.2rem",
  padding: "0.2rem 0.55rem",
  borderRadius: "999px",
  fontSize: "0.7rem",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  transition: "all 0.15s ease",
  background: done ? "rgba(16, 185, 129, 0.1)" : "rgba(99, 102, 241, 0.06)",
  color: done ? "#059669" : "#6B7280",
  textDecoration: done ? "line-through" : "none",
});

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
