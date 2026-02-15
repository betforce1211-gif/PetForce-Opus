"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";
import type {
  TaskKind,
  Pet,
  HouseholdFeedingStatus,
  UpcomingCalendarEvents,
  CalendarEvent,
  HealthSummary,
} from "@petforce/core";
import { TASK_KIND_ICONS, TASK_KIND_LABELS } from "@petforce/core";

// ── Internal task item type ──

interface TaskItem {
  id: string;
  kind: TaskKind;
  title: string;
  petName: string | null;
  time: string | null; // display time e.g. "8:00 AM"
  sortKey: number; // for chronological sort within non-alert tasks
}

// ── Props ──

interface Props {
  householdId: string;
  pets: Pet[];
  onOpenHealth: () => void;
  onOpenFeeding: () => void;
}

// ── Aggregation helpers ──

function getIncompleteFeedingTasks(data: HouseholdFeedingStatus): TaskItem[] {
  const tasks: TaskItem[] = [];
  for (const pet of data.pets) {
    for (const s of pet.schedules) {
      if (s.log !== null) continue; // already done
      const [hh, mm] = s.schedule.time.split(":").map(Number);
      const d = new Date();
      d.setHours(hh, mm, 0, 0);
      tasks.push({
        id: `feeding-${s.schedule.id}`,
        kind: "feeding",
        title: s.schedule.label,
        petName: pet.petName,
        time: d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        sortKey: hh * 60 + mm,
      });
    }
  }
  return tasks;
}

function getTodayCalendarTasks(data: UpcomingCalendarEvents): TaskItem[] {
  const todayStr = new Date().toISOString().split("T")[0];
  const tasks: TaskItem[] = [];
  for (const ev of data.events) {
    const evDate = ev.scheduledAt.split("T")[0];
    if (evDate !== todayStr) continue;
    if (ev.kind === "holiday") continue;
    if (ev.completedAt) continue;

    const kind = mapCalendarKind(ev);
    const d = new Date(ev.scheduledAt);
    const mins = d.getHours() * 60 + d.getMinutes();
    tasks.push({
      id: `cal-${ev.id}`,
      kind,
      title: ev.title,
      petName: ev.petName || null,
      time: mins > 0
        ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : null,
      sortKey: mins,
    });
  }
  return tasks;
}

function mapCalendarKind(ev: CalendarEvent): TaskKind {
  switch (ev.kind) {
    case "birthday":
      return "birthday";
    case "health":
      return "health";
    default:
      return "activity";
  }
}

function getHealthAlertTasks(data: HealthSummary): TaskItem[] {
  const tasks: TaskItem[] = [];
  if (data.overdueVaccinationCount > 0) {
    tasks.push({
      id: "alert-vaccines",
      kind: "alert",
      title: `${data.overdueVaccinationCount} overdue vaccination${data.overdueVaccinationCount > 1 ? "s" : ""}`,
      petName: null,
      time: null,
      sortKey: -1,
    });
  }
  if (data.activeMedicationCount > 0) {
    tasks.push({
      id: "medication-reminder",
      kind: "medication",
      title: `${data.activeMedicationCount} active medication${data.activeMedicationCount > 1 ? "s" : ""}`,
      petName: null,
      time: null,
      sortKey: 9999,
    });
  }
  return tasks;
}

function aggregateAndSort(
  feedingData: HouseholdFeedingStatus | undefined,
  calendarData: UpcomingCalendarEvents | undefined,
  healthData: HealthSummary | undefined
): Map<TaskKind, TaskItem[]> {
  const all: TaskItem[] = [];
  if (feedingData) all.push(...getIncompleteFeedingTasks(feedingData));
  if (calendarData) all.push(...getTodayCalendarTasks(calendarData));
  if (healthData) all.push(...getHealthAlertTasks(healthData));

  // Group by kind in display order
  const order: TaskKind[] = ["alert", "feeding", "activity", "health", "medication", "birthday"];
  const grouped = new Map<TaskKind, TaskItem[]>();
  for (const kind of order) {
    const items = all.filter((t) => t.kind === kind);
    if (items.length === 0) continue;
    items.sort((a, b) => a.sortKey - b.sortKey);
    grouped.set(kind, items);
  }
  return grouped;
}

// ── Component ──

export function TodayTasksSidebar({ householdId, pets, onOpenHealth, onOpenFeeding }: Props) {
  const today = new Date().toISOString().split("T")[0];

  const feedingQuery = trpc.feeding.todayStatus.useQuery(
    { householdId, date: today },
    { refetchInterval: 30_000 }
  );
  const calendarQuery = trpc.calendar.upcoming.useQuery(
    { householdId, limit: 20 },
    { refetchInterval: 30_000 }
  );
  const healthQuery = trpc.health.summary.useQuery(
    { householdId },
    { refetchInterval: 30_000 }
  );

  const isLoading = feedingQuery.isLoading || calendarQuery.isLoading || healthQuery.isLoading;
  const isError = feedingQuery.isError || calendarQuery.isError || healthQuery.isError;

  // Aggregate tasks
  const sections = aggregateAndSort(feedingQuery.data, calendarQuery.data, healthQuery.data);
  const totalTasks = Array.from(sections.values()).reduce((sum, items) => sum + items.length, 0);

  function handleTaskClick(task: TaskItem) {
    if (task.kind === "alert" || task.kind === "health" || task.kind === "medication") {
      onOpenHealth();
    } else if (task.kind === "feeding") {
      onOpenFeeding();
    }
    // activity & birthday — no modal, just informational
  }

  return (
    <aside style={sidebarStyle}>
      <div style={sidebarAccentBar} />
      <h2 style={sidebarTitle}>
        <span style={titleEmoji}>{"\u2705"}</span>
        Today&apos;s Tasks
        {!isLoading && !isError && totalTasks > 0 && (
          <span style={countBadge}>{totalTasks}</span>
        )}
      </h2>

      {isLoading ? (
        <div style={centeredState}>
          <div style={spinnerStyle} />
          <p style={stateText}>Loading tasks...</p>
        </div>
      ) : isError ? (
        <div style={centeredState}>
          <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>{"\u274C"}</span>
          <p style={stateText}>Could not load tasks</p>
          <button
            type="button"
            onClick={() => {
              feedingQuery.refetch();
              calendarQuery.refetch();
              healthQuery.refetch();
            }}
            style={retryBtn}
          >
            Retry
          </button>
        </div>
      ) : totalTasks === 0 ? (
        <div style={centeredState}>
          <span style={{ fontSize: "2rem", lineHeight: 1, opacity: 0.8 }}>{"\uD83C\uDF89"}</span>
          <p style={{ ...stateText, fontWeight: 600, color: "#1A1637" }}>All caught up!</p>
          <p style={stateText}>No tasks for today.</p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {Array.from(sections.entries()).map(([kind, items]) => (
            <div key={kind}>
              <div style={sectionHeader}>
                <span>{TASK_KIND_ICONS[kind]}</span>
                <span>{TASK_KIND_LABELS[kind]}</span>
                <span style={sectionCount}>{items.length}</span>
              </div>
              {items.map((task) => (
                <div
                  key={task.id}
                  style={{
                    ...taskRow,
                    borderLeft: task.kind === "alert"
                      ? "3px solid #DC2626"
                      : "3px solid transparent",
                    cursor: task.kind === "activity" || task.kind === "birthday" ? "default" : "pointer",
                  }}
                  onClick={() => handleTaskClick(task)}
                >
                  <div style={taskIconWrap}>
                    <span style={{ fontSize: "0.85rem", lineHeight: 1 }}>
                      {TASK_KIND_ICONS[task.kind]}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={taskTitle}>{task.title}</div>
                    {task.petName && (
                      <div style={taskMeta}>{task.petName}</div>
                    )}
                  </div>
                  {task.time && (
                    <span style={taskTime}>{task.time}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <Link href="/dashboard/log-activity" style={tileLinkStyle}>+ Log Activity</Link>
    </aside>
  );
}

// ── Styles ──

const sidebarStyle: React.CSSProperties = {
  width: 320,
  flexShrink: 0,
  background: "rgba(255, 255, 255, 0.65)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: "1rem",
  padding: "1.5rem 1.25rem 1.25rem",
  boxShadow:
    "0 1px 3px rgba(0,0,0,0.04), 0 4px 24px rgba(99, 102, 241, 0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
  border: "1px solid rgba(255, 255, 255, 0.5)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const sidebarAccentBar: React.CSSProperties = {
  height: 3,
  background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)",
  margin: "-1.5rem -1.25rem 1.25rem -1.25rem",
  borderTopLeftRadius: "1rem",
  borderTopRightRadius: "1rem",
};

const sidebarTitle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 700,
  margin: "0 0 1rem",
  color: "#1A1637",
  textAlign: "center",
  letterSpacing: "-0.01em",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5rem",
};

const titleEmoji: React.CSSProperties = {
  fontSize: "1.1rem",
  lineHeight: 1,
};

const countBadge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 22,
  height: 22,
  borderRadius: 11,
  background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
  color: "white",
  fontSize: "0.7rem",
  fontWeight: 700,
  padding: "0 0.4rem",
  letterSpacing: "0.02em",
};

const centeredState: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5rem",
  textAlign: "center",
  padding: "2rem 0.75rem",
};

const stateText: React.CSSProperties = {
  color: "#A5A8BA",
  fontSize: "0.8rem",
  margin: 0,
  fontWeight: 500,
  letterSpacing: "0.01em",
};

const spinnerStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  border: "3px solid rgba(99, 102, 241, 0.15)",
  borderTopColor: "#6366F1",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const retryBtn: React.CSSProperties = {
  padding: "0.35rem 0.8rem",
  borderRadius: "0.5rem",
  background: "linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)",
  color: "white",
  fontSize: "0.75rem",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  marginTop: "0.25rem",
};

const sectionHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  fontSize: "0.675rem",
  fontWeight: 700,
  color: "#6366F1",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  padding: "0.75rem 0 0.375rem",
  borderBottom: "1px solid rgba(99, 102, 241, 0.08)",
  marginBottom: "0.375rem",
};

const sectionCount: React.CSSProperties = {
  marginLeft: "auto",
  fontSize: "0.65rem",
  fontWeight: 600,
  color: "#A5A8BA",
};

const taskRow: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "0.625rem",
  padding: "0.5rem 0.25rem 0.5rem 0.5rem",
  borderBottom: "1px solid rgba(99, 102, 241, 0.05)",
  borderRadius: "0.375rem",
  margin: "0 -0.25rem",
  transition: "background-color 0.15s ease",
};

const taskIconWrap: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "0.375rem",
  background: "rgba(99, 102, 241, 0.06)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const taskTitle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "0.8rem",
  color: "#1A1637",
  letterSpacing: "-0.005em",
  lineHeight: 1.4,
};

const taskMeta: React.CSSProperties = {
  color: "#A5A8BA",
  fontSize: "0.7rem",
  fontWeight: 500,
  marginTop: "0.1rem",
  letterSpacing: "0.01em",
};

const taskTime: React.CSSProperties = {
  color: "#A5A8BA",
  fontSize: "0.65rem",
  whiteSpace: "nowrap",
  fontWeight: 500,
  letterSpacing: "0.01em",
  marginTop: "0.1rem",
};

const tileLinkStyle: React.CSSProperties = {
  marginTop: "auto",
  paddingTop: "0.75rem",
  borderTop: "1px solid rgba(99, 102, 241, 0.08)",
  color: "#6366F1",
  fontSize: "0.8rem",
  fontWeight: 600,
  textDecoration: "none",
  textAlign: "center",
  letterSpacing: "0.01em",
  transition: "color 0.2s ease",
};
