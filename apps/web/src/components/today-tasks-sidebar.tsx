"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import type {
  TaskKind,
  Pet,
  HouseholdFeedingStatus,
  FeedingScheduleStatus,
  HouseholdMedicationStatus,
  UpcomingCalendarEvents,
  CalendarEvent,
  HealthSummary,
} from "@petforce/core";
import { TASK_KIND_ICONS, TASK_KIND_LABELS } from "@petforce/core";
import { useTrackEvent } from "@/lib/use-track-event";
import { useVisibilityRefetch } from "@/lib/use-visibility-refetch";

// ── Internal task item type ──

interface TaskItem {
  id: string;
  kind: TaskKind;
  title: string;
  petName: string | null;
  time: string | null; // display time e.g. "8:00 AM"
  sortKey: number; // for chronological sort within non-alert tasks
  snoozedUntil: Date | null; // non-null = currently snoozed by this member
  completed: boolean; // true = already done today
  skipped: boolean; // true = explicitly skipped
}

// ── Props ──

interface Props {
  householdId: string;
  pets: Pet[];
  onOpenHealth: () => void;
  onOpenFeeding: () => void;
}

// ── Aggregation helpers ──

function getActiveSnoozedUntil(s: FeedingScheduleStatus): Date | null {
  if (!s.snooze) return null;
  const until = new Date(s.snooze.snoozedUntil);
  return until.getTime() > Date.now() ? until : null;
}

function getAllFeedingTasks(data: HouseholdFeedingStatus): TaskItem[] {
  const tasks: TaskItem[] = [];
  for (const pet of data.pets) {
    for (const s of pet.schedules) {
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
        snoozedUntil: getActiveSnoozedUntil(s),
        completed: s.log !== null,
        skipped: s.log?.skipped ?? false,
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
    if (ev.kind === "feeding") continue; // already shown via feeding query
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
      snoozedUntil: null,
      completed: false,
      skipped: false,
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
      snoozedUntil: null,
      completed: false,
      skipped: false,
    });
  }
  return tasks;
}

function getActiveMedSnooze(ms: { snooze: { snoozedUntil: Date | string } | null }): Date | null {
  if (!ms.snooze) return null;
  const until = new Date(ms.snooze.snoozedUntil);
  return until.getTime() > Date.now() ? until : null;
}

function getMedicationTasks(data: HouseholdMedicationStatus): TaskItem[] {
  return data.medications.map((ms) => ({
    id: `med-${ms.medication.id}`,
    kind: "medication" as TaskKind,
    title: ms.medication.name,
    petName: ms.petName,
    time: ms.medication.dosage || ms.medication.frequency || null,
    sortKey: 9999,
    snoozedUntil: getActiveMedSnooze(ms),
    completed: ms.log !== null,
    skipped: ms.log?.skipped ?? false,
  }));
}

function aggregateAndSort(
  feedingData: HouseholdFeedingStatus | undefined,
  calendarData: UpcomingCalendarEvents | undefined,
  healthData: HealthSummary | undefined,
  medicationData: HouseholdMedicationStatus | undefined
): Map<TaskKind, TaskItem[]> {
  const all: TaskItem[] = [];
  if (feedingData) all.push(...getAllFeedingTasks(feedingData));
  if (calendarData) all.push(...getTodayCalendarTasks(calendarData));
  if (healthData) all.push(...getHealthAlertTasks(healthData));
  if (medicationData) all.push(...getMedicationTasks(medicationData));

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
  const trackEvent = useTrackEvent();

  const utils = trpc.useUtils();

  const feedingQuery = trpc.feeding.todayStatus.useQuery(
    { householdId, date: today },
    { refetchInterval: 10_000 }
  );
  const calendarQuery = trpc.calendar.upcoming.useQuery(
    { householdId, limit: 20 },
    { refetchInterval: 15_000 }
  );
  const healthQuery = trpc.health.summary.useQuery(
    { householdId },
    { refetchInterval: 15_000 }
  );
  const medicationQuery = trpc.health.todayMedicationStatus.useQuery(
    { householdId, date: today },
    { refetchInterval: 10_000 }
  );
  useVisibilityRefetch([
    () => feedingQuery.refetch(),
    () => calendarQuery.refetch(),
    () => healthQuery.refetch(),
    () => medicationQuery.refetch(),
  ]);

  // Mutations
  const logFeeding = trpc.feeding.logCompletion.useMutation({
    onSuccess: () => utils.feeding.todayStatus.invalidate(),
  });
  const snoozeFeeding = trpc.feeding.snooze.useMutation({
    onSuccess: () => utils.feeding.todayStatus.invalidate(),
  });
  const undoSnooze = trpc.feeding.undoSnooze.useMutation({
    onSuccess: () => utils.feeding.todayStatus.invalidate(),
  });
  const completeActivity = trpc.activity.complete.useMutation({
    onSuccess: () => {
      utils.calendar.monthEvents.invalidate();
      utils.calendar.upcoming.invalidate();
    },
  });
  const updateActivity = trpc.activity.update.useMutation({
    onSuccess: () => {
      utils.calendar.monthEvents.invalidate();
      utils.calendar.upcoming.invalidate();
    },
  });
  const deleteActivity = trpc.activity.delete.useMutation({
    onSuccess: () => {
      utils.calendar.monthEvents.invalidate();
      utils.calendar.upcoming.invalidate();
    },
  });
  const logMedication = trpc.health.logMedicationCompletion.useMutation({
    onSuccess: () => {
      utils.health.todayMedicationStatus.invalidate();
      utils.health.summary.invalidate();
    },
  });
  const undoMedicationLog = trpc.health.undoMedicationLog.useMutation({
    onSuccess: () => {
      utils.health.todayMedicationStatus.invalidate();
      utils.health.summary.invalidate();
    },
  });
  const snoozeMedication = trpc.health.snoozeMedication.useMutation({
    onSuccess: () => utils.health.todayMedicationStatus.invalidate(),
  });
  const undoMedicationSnooze = trpc.health.undoMedicationSnooze.useMutation({
    onSuccess: () => utils.health.todayMedicationStatus.invalidate(),
  });
  const undoFeedingCompletion = trpc.feeding.undoCompletion.useMutation({
    onSuccess: () => utils.feeding.todayStatus.invalidate(),
  });

  const isLoading = feedingQuery.isLoading || calendarQuery.isLoading || healthQuery.isLoading || medicationQuery.isLoading;
  const isError = feedingQuery.isError || calendarQuery.isError || healthQuery.isError || medicationQuery.isError;

  const sections = aggregateAndSort(feedingQuery.data, calendarQuery.data, healthQuery.data, medicationQuery.data);
  const allItems = Array.from(sections.values()).flat();
  const totalTasks = allItems.length;
  const pendingTasks = allItems.filter((t) => !t.completed && !t.skipped).length;

  function handleTaskClick(task: TaskItem) {
    if (task.kind === "alert" || task.kind === "health" || task.kind === "medication") {
      onOpenHealth();
    } else if (task.kind === "feeding") {
      onOpenFeeding();
    }
    // activity & birthday — no modal, just informational
  }

  function handleDone(task: TaskItem) {
    if (task.kind === "feeding") {
      trackEvent("feeding.completed", { skipped: false });
      const scheduleId = task.id.replace("feeding-", "");
      logFeeding.mutate({ householdId, feedingScheduleId: scheduleId, feedingDate: today });
    } else if (task.kind === "activity") {
      const id = task.id.replace("cal-", "");
      completeActivity.mutate({ id });
    } else if (task.kind === "medication") {
      const medId = task.id.replace("med-", "");
      logMedication.mutate({ householdId, medicationId: medId, loggedDate: today });
    }
  }

  function handleUndo(task: TaskItem) {
    if (task.kind === "feeding" && feedingQuery.data) {
      const scheduleId = task.id.replace("feeding-", "");
      for (const pet of feedingQuery.data.pets) {
        for (const s of pet.schedules) {
          if (s.schedule.id === scheduleId && s.log) {
            undoFeedingCompletion.mutate({ householdId, feedingLogId: s.log.id });
            return;
          }
        }
      }
    } else if (task.kind === "medication" && medicationQuery.data) {
      const medId = task.id.replace("med-", "");
      const ms = medicationQuery.data.medications.find((m) => m.medication.id === medId);
      if (ms?.log) {
        undoMedicationLog.mutate({ householdId, medicationLogId: ms.log.id });
      }
    }
  }

  function handleLater(task: TaskItem, minutes: number) {
    if (task.kind === "feeding") {
      const scheduleId = task.id.replace("feeding-", "");
      snoozeFeeding.mutate({
        householdId,
        feedingScheduleId: scheduleId,
        feedingDate: today,
        snoozeDurationMinutes: minutes,
      });
    } else if (task.kind === "activity") {
      const id = task.id.replace("cal-", "");
      const later = new Date(Date.now() + minutes * 60 * 1000);
      updateActivity.mutate({ id, scheduledAt: later });
    } else if (task.kind === "medication") {
      const medId = task.id.replace("med-", "");
      snoozeMedication.mutate({
        householdId,
        medicationId: medId,
        snoozeDate: today,
        snoozeDurationMinutes: minutes,
      });
    }
  }

  function handleSkip(task: TaskItem) {
    if (task.kind === "feeding") {
      trackEvent("feeding.completed", { skipped: true });
      const scheduleId = task.id.replace("feeding-", "");
      logFeeding.mutate({ householdId, feedingScheduleId: scheduleId, feedingDate: today, skipped: true });
    } else if (task.kind === "activity") {
      if (!confirm("Cancel this activity?")) return;
      const id = task.id.replace("cal-", "");
      deleteActivity.mutate({ id });
    } else if (task.kind === "medication") {
      const medId = task.id.replace("med-", "");
      logMedication.mutate({ householdId, medicationId: medId, loggedDate: today, skipped: true });
    }
  }

  function handleUndoSnooze(task: TaskItem) {
    if (task.kind === "feeding") {
      const scheduleId = task.id.replace("feeding-", "");
      undoSnooze.mutate({ householdId, feedingScheduleId: scheduleId, feedingDate: today });
    } else if (task.kind === "medication") {
      const medId = task.id.replace("med-", "");
      undoMedicationSnooze.mutate({ householdId, medicationId: medId, snoozeDate: today });
    }
  }

  function isMutating(task: TaskItem): boolean {
    if (task.kind === "feeding") return logFeeding.isLoading || snoozeFeeding.isLoading || undoSnooze.isLoading || undoFeedingCompletion.isLoading;
    if (task.kind === "activity") {
      return completeActivity.isLoading || updateActivity.isLoading || deleteActivity.isLoading;
    }
    if (task.kind === "medication") return logMedication.isLoading || undoMedicationLog.isLoading || snoozeMedication.isLoading || undoMedicationSnooze.isLoading;
    return false;
  }

  const hasActions = (kind: TaskKind) => kind === "feeding" || kind === "activity" || kind === "medication";

  return (
    <aside style={sidebarStyle}>
      <div style={sidebarAccentBar} />
      <h2 style={sidebarTitle}>
        <span style={titleEmoji}>{"\u2705"}</span>
        Today&apos;s Tasks
        {!isLoading && !isError && totalTasks > 0 && (
          <span style={countBadge}>{pendingTasks > 0 ? pendingTasks : "\u2713"}</span>
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
              medicationQuery.refetch();
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
              {items.map((task) => {
                const actionable = hasActions(task.kind);
                const busy = isMutating(task);
                const snoozed = task.snoozedUntil !== null;
                const snoozeLabel = snoozed
                  ? `Snoozed until ${task.snoozedUntil!.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                  : null;
                return (
                  <div
                    key={task.id}
                    style={{
                      ...taskRow,
                      borderLeft: task.kind === "alert"
                        ? "3px solid #DC2626"
                        : "3px solid transparent",
                      cursor: actionable || task.kind === "birthday" ? "default" : "pointer",
                      opacity: snoozed || task.completed || task.skipped ? 0.5 : 1,
                    }}
                    onClick={() => !actionable && handleTaskClick(task)}
                  >
                    <div style={taskIconWrap}>
                      <span style={{ fontSize: "0.85rem", lineHeight: 1 }}>
                        {task.skipped ? "\u23ED\uFE0F" : task.completed ? "\u2705" : TASK_KIND_ICONS[task.kind]}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        ...taskTitle,
                        textDecoration: task.completed || task.skipped ? "line-through" : "none",
                        color: task.skipped ? "#9CA3AF" : task.completed ? "#1A1637" : "#1A1637",
                      }}>{task.title}</div>
                      <div style={taskMeta}>
                        {snoozed && !task.skipped
                          ? snoozeLabel
                          : [task.petName, task.time, task.skipped ? "Skipped" : null].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    {actionable && (task.completed || task.skipped) && (
                      <div style={actionGroup}>
                        <button
                          type="button"
                          style={actionBtnUndo}
                          disabled={busy}
                          onClick={(e) => { e.stopPropagation(); handleUndo(task); }}
                        >
                          {busy ? "..." : "Undo"}
                        </button>
                      </div>
                    )}
                    {actionable && !task.completed && !task.skipped && (
                      <div style={actionGroup}>
                        <button
                          type="button"
                          style={actionBtnDone}
                          disabled={busy}
                          onClick={(e) => { e.stopPropagation(); handleDone(task); }}
                        >
                          {busy ? "..." : "Done"}
                        </button>
                        {(task.kind === "activity" || ((task.kind === "feeding" || task.kind === "medication") && !snoozed)) && (
                          <LaterDropdown
                            busy={busy}
                            onSelect={(mins) => handleLater(task, mins)}
                          />
                        )}
                        {(task.kind === "feeding" || task.kind === "medication") && snoozed && (
                          <button
                            type="button"
                            style={actionBtnUndo}
                            disabled={busy}
                            onClick={(e) => { e.stopPropagation(); handleUndoSnooze(task); }}
                          >
                            {busy ? "..." : "Undo"}
                          </button>
                        )}
                        {!snoozed && (
                          <button
                            type="button"
                            style={actionBtnSkip}
                            disabled={busy}
                            onClick={(e) => { e.stopPropagation(); handleSkip(task); }}
                          >
                            {task.kind === "activity" ? "Cancel" : "Skip"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <Link href="/dashboard/log-activity" style={tileLinkStyle}>+ Log Activity</Link>
    </aside>
  );
}

// ── Stepper Input ──

function StepperInput({ value, onChange, min, max }: { value: string; onChange: (v: string) => void; min: number; max: number }) {
  const num = parseInt(value, 10) || 0;
  const step = (dir: 1 | -1) => {
    const next = num + dir;
    if (next < min) onChange(String(max));
    else if (next > max) onChange(String(min));
    else onChange(String(next));
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }} onClick={(e) => e.stopPropagation()}>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={laterCustomInput}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <button type="button" style={stepperBtn} onClick={() => step(1)}>{"\u25B2"}</button>
        <button type="button" style={stepperBtn} onClick={() => step(-1)}>{"\u25BC"}</button>
      </div>
    </div>
  );
}

// ── Later Dropdown ──

const SNOOZE_PRESETS = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
];

function LaterDropdown({ busy, onSelect }: { busy: boolean; onSelect: (minutes: number) => void }) {
  const [open, setOpen] = useState(false);
  const [customH, setCustomH] = useState("0");
  const [customM, setCustomM] = useState("30");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handlePreset(mins: number) {
    onSelect(mins);
    setOpen(false);
  }

  function handleCustomSubmit() {
    const h = parseInt(customH, 10) || 0;
    const m = parseInt(customM, 10) || 0;
    const total = h * 60 + m;
    if (total < 1) return;
    onSelect(total);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        style={actionBtnLater}
        disabled={busy}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
      >
        {busy ? "..." : "Later"}
      </button>
      {open && (
        <div style={laterDropdownStyle} onClick={(e) => e.stopPropagation()}>
          {SNOOZE_PRESETS.map((p) => (
            <button
              key={p.minutes}
              type="button"
              style={laterOptionStyle}
              onClick={() => handlePreset(p.minutes)}
            >
              {p.label}
            </button>
          ))}
          <div style={{ borderTop: "1px solid rgba(99,102,241,0.1)", margin: "0.2rem 0" }} />
          <div style={laterCustomRow}>
            <StepperInput value={customH} onChange={setCustomH} min={0} max={23} />
            <span style={{ color: "#6B7280", fontSize: "0.75rem", fontWeight: 700 }}>:</span>
            <StepperInput value={customM} onChange={setCustomM} min={0} max={59} />
            <button
              type="button"
              style={laterCustomGoBtn}
              onClick={handleCustomSubmit}
            >
              Go
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ──

const sidebarStyle: React.CSSProperties = {
  width: 300,
  flexShrink: 0,
  background: "rgba(255, 255, 255, 0.65)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: "0.75rem",
  padding: "1rem 0.875rem 0.875rem",
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
  margin: "-1rem -0.875rem 0.75rem -0.875rem",
  borderTopLeftRadius: "0.75rem",
  borderTopRightRadius: "0.75rem",
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

const actionGroup: React.CSSProperties = {
  display: "flex",
  gap: "0.25rem",
  flexShrink: 0,
  alignItems: "center",
};

const actionBtnBase: React.CSSProperties = {
  fontSize: "0.65rem",
  fontWeight: 600,
  padding: "0.15rem 0.5rem",
  borderRadius: "999px",
  border: "none",
  cursor: "pointer",
  lineHeight: 1.4,
  whiteSpace: "nowrap",
  transition: "opacity 0.15s ease",
};

const actionBtnDone: React.CSSProperties = {
  ...actionBtnBase,
  background: "#059669",
  color: "white",
};

const actionBtnLater: React.CSSProperties = {
  ...actionBtnBase,
  background: "rgba(99, 102, 241, 0.08)",
  color: "#6366F1",
};

const actionBtnUndo: React.CSSProperties = {
  ...actionBtnBase,
  background: "rgba(245, 158, 11, 0.1)",
  color: "#D97706",
};

const actionBtnSkip: React.CSSProperties = {
  ...actionBtnBase,
  background: "#F3F4F6",
  color: "#6B7280",
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

const laterDropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  right: 0,
  minWidth: 130,
  background: "rgba(255,255,255,0.97)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderRadius: "0.5rem",
  padding: "0.3rem",
  boxShadow: "0 4px 20px rgba(0,0,0,0.12), 0 0 0 1px rgba(99,102,241,0.08)",
  zIndex: 100,
};

const laterOptionStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.35rem 0.6rem",
  border: "none",
  background: "transparent",
  borderRadius: "0.3rem",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "0.72rem",
  fontWeight: 500,
  color: "#1A1637",
  textAlign: "left",
  transition: "background-color 0.1s ease",
};

const laterCustomRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.25rem",
  padding: "0.3rem 0.4rem",
};

const laterCustomInput: React.CSSProperties = {
  width: 40,
  padding: "0.2rem 0.25rem",
  border: "1px solid rgba(99,102,241,0.2)",
  borderRadius: "0.25rem",
  fontSize: "0.72rem",
  fontFamily: "inherit",
  textAlign: "center",
  outline: "none",
  MozAppearance: "textfield",
  appearance: "textfield" as never,
};

const stepperBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 14,
  height: 11,
  border: "1px solid rgba(99,102,241,0.2)",
  borderRadius: 2,
  background: "rgba(99,102,241,0.04)",
  cursor: "pointer",
  fontSize: "0.4rem",
  color: "#6366F1",
  padding: 0,
  lineHeight: 1,
};

const laterCustomGoBtn: React.CSSProperties = {
  padding: "0.2rem 0.5rem",
  borderRadius: "0.25rem",
  border: "none",
  background: "#6366F1",
  color: "white",
  fontSize: "0.65rem",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  marginLeft: "0.15rem",
};
