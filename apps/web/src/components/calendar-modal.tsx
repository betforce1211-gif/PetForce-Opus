"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { trpc } from "@/lib/trpc";
import { ACTIVITY_TYPE_ICONS } from "@petforce/core";
import { CalendarAddEventModal } from "@/components/calendar-add-event-modal";

interface CalendarModalProps {
  householdId: string;
  onClose: () => void;
}

function getMonthStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonthStr(month: string): { year: number; mon: number } {
  const [y, m] = month.split("-").map(Number);
  return { year: y, mon: m };
}

function formatMonthLabel(month: string): string {
  const { year, mon } = parseMonthStr(month);
  const date = new Date(year, mon - 1, 1);
  return date.toLocaleDateString([], { month: "long", year: "numeric" });
}

export function CalendarModal({ householdId, onClose }: CalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState(() => getMonthStr(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [addEventDate, setAddEventDate] = useState<string | null>(null);
  const [showFeedings, setShowFeedings] = useState(false);
  const [showHolidays, setShowHolidays] = useState(true);

  const monthQuery = trpc.calendar.monthEvents.useQuery(
    { householdId, month: currentMonth },
    { enabled: !!householdId }
  );

  const utils = trpc.useContext();

  const completeMut = trpc.activity.complete.useMutation({
    onSuccess: () => {
      utils.calendar.monthEvents.invalidate();
      utils.calendar.upcoming.invalidate();
    },
  });

  const { year, mon } = parseMonthStr(currentMonth);

  const navigateMonth = (delta: number) => {
    const d = new Date(year, mon - 1 + delta, 1);
    setCurrentMonth(getMonthStr(d));
    setSelectedDate(null);
  };

  const gridData = useMemo(() => {
    const firstDay = new Date(year, mon - 1, 1).getDay();
    const daysInMonth = new Date(year, mon, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, mon]);

  const todayStr = new Date().toISOString().split("T")[0];

  // Filter events based on toggles
  const days = useMemo(() => {
    const raw = monthQuery.data?.days ?? {};
    if (showFeedings && showHolidays) return raw;
    const filtered: Record<string, typeof raw[string]> = {};
    for (const [key, events] of Object.entries(raw)) {
      const kept = events.filter((e) => {
        if (!showFeedings && e.kind === "feeding") return false;
        if (!showHolidays && e.kind === "holiday") return false;
        return true;
      });
      if (kept.length > 0) filtered[key] = kept;
    }
    return filtered;
  }, [monthQuery.data?.days, showFeedings, showHolidays]);

  const selectedEvents = selectedDate ? (days[selectedDate] ?? []) : [];

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div style={backdrop} onClick={onClose}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <button style={closeBtn} onClick={onClose} aria-label="Close">&times;</button>

        {/* Header */}
        <div style={headerRow}>
          <div style={navGroup}>
            <button onClick={() => navigateMonth(-1)} style={navBtn}>&lt;</button>
            <h2 style={monthTitle}>{formatMonthLabel(currentMonth)}</h2>
            <button onClick={() => navigateMonth(1)} style={navBtn}>&gt;</button>
          </div>
          <div style={headerActions}>
            <button
              onClick={() => setShowHolidays(!showHolidays)}
              style={toggleBtn(showHolidays, "#10B981")}
              title={showHolidays ? "Hide pet holidays" : "Show pet holidays"}
            >
              🐾 Holidays {showHolidays ? "On" : "Off"}
            </button>
            <button
              onClick={() => setShowFeedings(!showFeedings)}
              style={toggleBtn(showFeedings, "#D97706")}
              title={showFeedings ? "Hide feeding schedules" : "Show feeding schedules"}
            >
              🍽️ Feedings {showFeedings ? "On" : "Off"}
            </button>
            <button
              onClick={() => {
                setCurrentMonth(getMonthStr(new Date()));
                setSelectedDate(todayStr);
              }}
              style={todayBtnStyle}
            >
              Today
            </button>
            <button
              onClick={() => setAddEventDate(selectedDate ?? todayStr)}
              style={addEventBtnStyle}
            >
              + Add Event
            </button>
          </div>
        </div>

        {/* Body: grid + optional detail */}
        <div style={bodyArea}>
          {/* Month grid */}
          <div style={gridContainer}>
            <div style={dowRow}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} style={dowCell}>{d}</div>
              ))}
            </div>

            <div style={gridStyle}>
              {gridData.map((day, i) => {
                if (day === null) {
                  return <div key={`blank-${i}`} style={blankCell} />;
                }

                const dateKey = `${currentMonth}-${String(day).padStart(2, "0")}`;
                const dayEvents = days[dateKey] ?? [];
                const isToday = dateKey === todayStr;
                const isSelected = dateKey === selectedDate;

                return (
                  <div
                    key={dateKey}
                    onClick={() => setSelectedDate(dateKey === selectedDate ? null : dateKey)}
                    style={{
                      ...dayCell,
                      ...(isSelected ? dayCellSelected : {}),
                      ...(isToday && !isSelected ? dayCellToday : {}),
                      cursor: "pointer",
                    }}
                  >
                    <span style={{
                      ...dayNumber,
                      ...(isToday ? dayNumberToday : {}),
                    }}>
                      {day}
                    </span>
                    <div style={pillContainer}>
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div key={ev.id} style={eventPill(!!ev.completedAt)}>
                          <span style={{ fontSize: "0.55rem", lineHeight: 1 }}>
                            {ACTIVITY_TYPE_ICONS[ev.type] ?? "📝"}
                          </span>
                          <span style={pillText}>{ev.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <span style={overflowText}>+{dayEvents.length - 3} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day detail panel */}
          {selectedDate && (
            <div style={detailPanel}>
              <div style={detailHeader}>
                <h3 style={detailTitle}>
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </h3>
                <button onClick={() => setAddEventDate(selectedDate)} style={detailAddBtn}>
                  + Add
                </button>
              </div>

              {selectedEvents.length === 0 ? (
                <div style={detailEmpty}>
                  <p style={{ color: "#A5A8BA", fontSize: "0.85rem", margin: 0 }}>
                    No events scheduled
                  </p>
                </div>
              ) : (
                <div style={detailList}>
                  {selectedEvents.map((ev) => (
                    <div key={ev.id} style={detailRow}>
                      <span style={detailIcon}>
                        {ACTIVITY_TYPE_ICONS[ev.type] ?? "📝"}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={detailEventTitle}>{ev.title}</div>
                        <div style={detailEventMeta}>
                          {ev.petName}
                          {ev.memberName ? ` \u00b7 ${ev.memberName}` : ""}
                          {" \u00b7 "}
                          {formatTime(ev.scheduledAt)}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, marginTop: "0.1rem" }}>
                        {ev.completedAt ? (
                          <span style={completedBadge}>Done</span>
                        ) : ev.kind === "activity" ? (
                          <button
                            onClick={() => completeMut.mutate({ id: ev.id })}
                            disabled={completeMut.isLoading}
                            style={completeButtonStyle}
                          >
                            {completeMut.isLoading ? "..." : "Complete"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {addEventDate && (
        <CalendarAddEventModal
          householdId={householdId}
          defaultDate={addEventDate}
          onClose={() => setAddEventDate(null)}
          onCreated={() => {
            utils.calendar.monthEvents.invalidate();
            utils.calendar.upcoming.invalidate();
            setAddEventDate(null);
          }}
        />
      )}
    </div>,
    document.body
  );
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) {
    const timePart = iso.split("T")[1];
    if (timePart) {
      const [h, m] = timePart.split(":");
      const hour = parseInt(h, 10);
      const ampm = hour >= 12 ? "pm" : "am";
      const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${h12}:${m}${ampm}`;
    }
    return "";
  }
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// ── Styles ──

const backdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  animation: "fadeIn 0.2s ease",
};

const panel: React.CSSProperties = {
  position: "relative",
  background: "#fff",
  borderRadius: "1rem",
  width: "92vw",
  maxWidth: 960,
  height: "85vh",
  display: "flex",
  flexDirection: "column",
  padding: "1.5rem",
  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  animation: "slideUp 0.25s ease",
  overflow: "hidden",
};

const closeBtn: React.CSSProperties = {
  position: "absolute",
  top: "0.75rem",
  right: "0.75rem",
  background: "none",
  border: "none",
  fontSize: "1.5rem",
  color: "#6B7280",
  cursor: "pointer",
  lineHeight: 1,
  width: 32,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "0.5rem",
  zIndex: 1,
};

const headerRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexShrink: 0,
  marginBottom: "0.75rem",
};

const navGroup: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
};

const navBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "0.5rem",
  border: "1px solid rgba(99, 102, 241, 0.15)",
  background: "rgba(245, 245, 255, 0.8)",
  color: "#6366F1",
  fontSize: "1rem",
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const monthTitle: React.CSSProperties = {
  fontSize: "1.15rem",
  fontWeight: 700,
  color: "#1A1637",
  margin: 0,
  letterSpacing: "-0.01em",
  minWidth: "13rem",
  textAlign: "center",
};

const headerActions: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  marginRight: "2rem",
};

const toggleBtn = (active: boolean, activeColor = "#D97706"): React.CSSProperties => ({
  padding: "0.35rem 0.8rem",
  borderRadius: "0.5rem",
  border: `1px solid ${active ? activeColor + "30" : "rgba(99, 102, 241, 0.15)"}`,
  background: active
    ? `${activeColor}14`
    : "rgba(245, 245, 255, 0.8)",
  color: active ? activeColor : "#8B8FA3",
  fontSize: "0.75rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s ease",
});

const todayBtnStyle: React.CSSProperties = {
  padding: "0.35rem 0.8rem",
  borderRadius: "0.5rem",
  border: "1px solid rgba(99, 102, 241, 0.15)",
  background: "rgba(245, 245, 255, 0.8)",
  color: "#6366F1",
  fontSize: "0.8rem",
  fontWeight: 600,
  cursor: "pointer",
};

const addEventBtnStyle: React.CSSProperties = {
  padding: "0.35rem 0.8rem",
  borderRadius: "0.5rem",
  background: "linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)",
  color: "white",
  fontSize: "0.8rem",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
};

const bodyArea: React.CSSProperties = {
  flex: 1,
  display: "flex",
  gap: "0.75rem",
  minHeight: 0,
};

const gridContainer: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  background: "rgba(245, 245, 255, 0.5)",
  borderRadius: "0.75rem",
  padding: "0.5rem",
  border: "1px solid rgba(99, 102, 241, 0.06)",
  overflow: "hidden",
};

const dowRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "1px",
  marginBottom: "0.2rem",
  flexShrink: 0,
};

const dowCell: React.CSSProperties = {
  textAlign: "center",
  fontSize: "0.7rem",
  fontWeight: 700,
  color: "#8B8FA3",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  padding: "0.3rem 0",
};

const gridStyle: React.CSSProperties = {
  flex: 1,
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gridAutoRows: "1fr",
  gap: "1px",
  background: "rgba(99, 102, 241, 0.04)",
  borderRadius: "0.5rem",
  overflow: "hidden",
};

const blankCell: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.3)",
};

const dayCell: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.9)",
  padding: "0.2rem 0.3rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.1rem",
  overflow: "hidden",
  transition: "all 0.15s ease",
};

const dayCellToday: React.CSSProperties = {
  background: "rgba(99, 102, 241, 0.04)",
};

const dayCellSelected: React.CSSProperties = {
  background: "rgba(99, 102, 241, 0.08)",
  boxShadow: "inset 0 0 0 2px rgba(99, 102, 241, 0.3)",
};

const dayNumber: React.CSSProperties = {
  fontSize: "0.7rem",
  fontWeight: 600,
  color: "#374151",
  lineHeight: 1,
};

const dayNumberToday: React.CSSProperties = {
  color: "#6366F1",
  fontWeight: 800,
};

const pillContainer: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1px",
  flex: 1,
  overflow: "hidden",
};

const eventPill = (completed: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: "0.15rem",
  padding: "0.05rem 0.2rem",
  borderRadius: "0.2rem",
  background: completed
    ? "rgba(16, 185, 129, 0.1)"
    : "rgba(99, 102, 241, 0.06)",
  overflow: "hidden",
});

const pillText: React.CSSProperties = {
  fontSize: "0.55rem",
  fontWeight: 500,
  color: "#374151",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const overflowText: React.CSSProperties = {
  fontSize: "0.55rem",
  color: "#8B8FA3",
  fontWeight: 500,
  paddingLeft: "0.2rem",
};

// Detail panel

const detailPanel: React.CSSProperties = {
  width: 280,
  flexShrink: 0,
  background: "rgba(245, 245, 255, 0.6)",
  borderRadius: "0.75rem",
  padding: "1rem",
  border: "1px solid rgba(99, 102, 241, 0.06)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const detailHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "0.6rem",
  flexShrink: 0,
};

const detailTitle: React.CSSProperties = {
  fontSize: "0.95rem",
  fontWeight: 700,
  color: "#1A1637",
  margin: 0,
};

const detailAddBtn: React.CSSProperties = {
  padding: "0.2rem 0.55rem",
  borderRadius: "0.375rem",
  background: "rgba(99, 102, 241, 0.06)",
  color: "#6366F1",
  fontWeight: 600,
  fontSize: "0.75rem",
  border: "none",
  cursor: "pointer",
};

const detailEmpty: React.CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const detailList: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "0.2rem",
};

const detailRow: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "0.5rem",
  padding: "0.4rem 0.2rem",
  borderBottom: "1px solid rgba(99, 102, 241, 0.06)",
};

const detailIcon: React.CSSProperties = {
  fontSize: "0.95rem",
  lineHeight: 1,
  width: "1.25rem",
  textAlign: "center",
  flexShrink: 0,
  marginTop: "0.1rem",
};

const detailEventTitle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "0.8rem",
  color: "#1A1637",
  letterSpacing: "-0.005em",
};

const detailEventMeta: React.CSSProperties = {
  color: "#A5A8BA",
  fontSize: "0.7rem",
  fontWeight: 500,
  marginTop: "0.1rem",
};

const completedBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "0.15rem 0.5rem",
  borderRadius: "999px",
  background: "rgba(16, 185, 129, 0.1)",
  color: "#059669",
  fontSize: "0.65rem",
  fontWeight: 600,
};

const completeButtonStyle: React.CSSProperties = {
  padding: "0.2rem 0.5rem",
  borderRadius: "0.375rem",
  background: "linear-gradient(135deg, #6366F1, #7C3AED)",
  color: "white",
  fontWeight: 600,
  fontSize: "0.65rem",
  border: "none",
  cursor: "pointer",
};
