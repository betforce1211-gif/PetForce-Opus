"use client";

import { trpc } from "@/lib/trpc";
import { ACTIVITY_TYPE_ICONS } from "@petforce/core";

interface CalendarTileContentProps {
  householdId: string;
  onAddEvent: () => void;
}

export function CalendarTileContent({ householdId, onAddEvent }: CalendarTileContentProps) {
  const upcomingQuery = trpc.calendar.upcoming.useQuery(
    { householdId, limit: 5 },
    { refetchInterval: 30_000 }
  );

  if (upcomingQuery.isLoading) {
    return (
      <div style={centered}>
        <span style={{ color: "#A5A8BA", fontSize: "0.8rem" }}>Loading...</span>
      </div>
    );
  }

  if (upcomingQuery.isError) {
    return (
      <div style={centered}>
        <span style={{ color: "#EF4444", fontSize: "0.8rem" }}>Failed to load</span>
      </div>
    );
  }

  const data = upcomingQuery.data;
  if (!data || data.events.length === 0) {
    return (
      <>
        <div style={centered}>
          <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>📅</span>
          <p style={{ color: "#A5A8BA", fontSize: "0.8rem", margin: "0.5rem 0 0" }}>
            No upcoming events
          </p>
        </div>
        <div style={footerRow}>
          <button type="button" onClick={(e) => { e.stopPropagation(); onAddEvent(); }} style={footerBtn}>+ Add Event</button>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={eventList}>
        {data.events.map((event) => (
          <div key={event.id} style={eventRow}>
            <span style={eventIcon}>
              {ACTIVITY_TYPE_ICONS[event.type] ?? "📝"}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={eventTitle}>{event.title}</div>
              <div style={eventMeta}>
                {event.petName ? `${event.petName} \u00b7 ` : ""}{event.scheduledAt ? formatEventTime(event.scheduledAt) : ""}
              </div>
            </div>
          </div>
        ))}
      </div>
      {data.totalUpcoming > data.events.length && (
        <div style={moreCount}>+{data.totalUpcoming - data.events.length} more</div>
      )}
      <div style={footerRow}>
        <button type="button" onClick={(e) => { e.stopPropagation(); onAddEvent(); }} style={footerBtn}>+ Add Event</button>
      </div>
    </>
  );
}

function formatEventTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const eventDate = iso.split("T")[0];

  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (eventDate === today) return time;

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (eventDate === tomorrow.toISOString().split("T")[0]) return `Tomorrow ${time}`;

  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

// ── Styles ──

const centered: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const eventList: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "0.15rem",
};

const eventRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.3rem 0.15rem",
  borderRadius: "0.375rem",
};

const eventIcon: React.CSSProperties = {
  fontSize: "0.85rem",
  lineHeight: 1,
  width: "1.25rem",
  textAlign: "center",
  flexShrink: 0,
};

const eventTitle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "0.75rem",
  color: "#1A1637",
  letterSpacing: "-0.005em",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const eventMeta: React.CSSProperties = {
  color: "#A5A8BA",
  fontSize: "0.65rem",
  fontWeight: 500,
  letterSpacing: "0.01em",
};

const moreCount: React.CSSProperties = {
  textAlign: "center",
  fontSize: "0.7rem",
  color: "#8B8FA3",
  fontWeight: 500,
  padding: "0.15rem 0",
};

const footerRow: React.CSSProperties = {
  marginTop: "auto",
  paddingTop: "0.6rem",
  borderTop: "1px solid rgba(99, 102, 241, 0.08)",
  display: "flex",
  justifyContent: "center",
};

const footerBtn: React.CSSProperties = {
  color: "#6366F1",
  fontSize: "0.75rem",
  fontWeight: 600,
  letterSpacing: "0.01em",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
};
