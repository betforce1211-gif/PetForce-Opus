"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_ICONS } from "@petforce/core";

interface CareHistoryTimelineProps {
  petId: string;
  petName: string;
  householdId: string;
}

const PAGE_SIZE = 20;

export function CareHistoryTimeline({ petId, petName, householdId }: CareHistoryTimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const activitiesQuery = trpc.activity.listByPet.useQuery(
    { householdId, petId, limit, offset: 0 },
    { enabled: expanded },
  );

  const activities = activitiesQuery.data?.items ?? [];
  const totalCount = activitiesQuery.data?.totalCount ?? 0;
  const hasMore = activities.length < totalCount;

  if (!expanded) {
    return (
      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Care History</legend>
        <button type="button" onClick={() => setExpanded(true)} style={expandBtn}>
          View {petName}&apos;s care timeline
        </button>
      </fieldset>
    );
  }

  // Group activities by date
  const grouped = new Map<string, typeof activities>();
  for (const a of activities) {
    const date = new Date(a.createdAt).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const arr = grouped.get(date) ?? [];
    arr.push(a);
    grouped.set(date, arr);
  }

  return (
    <fieldset style={fieldsetStyle}>
      <legend style={legendStyle}>Care History</legend>

      {activitiesQuery.isPending ? (
        <p style={emptyText}>Loading care history...</p>
      ) : activities.length === 0 ? (
        <p style={emptyText}>No care events recorded for {petName} yet.</p>
      ) : (
        <div style={timelineContainer}>
          {Array.from(grouped.entries()).map(([date, items]) => (
            <div key={date} style={dateGroup}>
              <div style={dateHeader}>{date}</div>
              {items.map((a) => (
                <div key={a.id} style={eventRow}>
                  <div style={eventDot} />
                  <div style={eventContent}>
                    <div style={eventTop}>
                      <span style={eventIcon}>
                        {ACTIVITY_TYPE_ICONS[a.type] ?? "📋"}
                      </span>
                      <span style={eventTitle}>{a.title}</span>
                      <span style={eventType}>
                        {ACTIVITY_TYPE_LABELS[a.type] ?? a.type}
                      </span>
                      <span style={eventTime}>
                        {new Date(a.createdAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {a.notes && <p style={eventNotes}>{a.notes}</p>}
                    {a.completedAt && (
                      <span style={completedBadge}>Completed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {hasMore && (
            <button
              type="button"
              onClick={() => setLimit((l) => l + PAGE_SIZE)}
              disabled={activitiesQuery.isFetching}
              style={loadMoreBtn}
            >
              {activitiesQuery.isFetching ? "Loading..." : `Load more (${totalCount - activities.length} remaining)`}
            </button>
          )}
        </div>
      )}

      <button type="button" onClick={() => setExpanded(false)} style={collapseBtn}>
        Collapse
      </button>
    </fieldset>
  );
}

// ── Styles ──

const fieldsetStyle: React.CSSProperties = {
  border: "1px solid var(--pf-border-muted)",
  borderRadius: "0.75rem",
  padding: "1rem 1.25rem",
  margin: 0,
};

const legendStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "0.95rem",
  padding: "0 0.5rem",
  color: "var(--pf-text-muted)",
};

const expandBtn: React.CSSProperties = {
  padding: "0.5rem 1rem",
  borderRadius: "0.5rem",
  background: "rgba(99, 102, 241, 0.06)",
  color: "var(--pf-primary)",
  fontWeight: 600,
  fontSize: "0.85rem",
  border: "1px solid rgba(99, 102, 241, 0.15)",
  cursor: "pointer",
  width: "100%",
};

const emptyText: React.CSSProperties = {
  color: "var(--pf-text-secondary)",
  fontSize: "0.85rem",
  textAlign: "center",
  margin: "1rem 0 0.5rem",
};

const timelineContainer: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
  position: "relative",
};

const dateGroup: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
};

const dateHeader: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "var(--pf-primary)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  padding: "0.5rem 0 0.25rem",
  borderBottom: "1px solid rgba(99, 102, 241, 0.08)",
};

const eventRow: React.CSSProperties = {
  display: "flex",
  gap: "0.6rem",
  alignItems: "flex-start",
  paddingLeft: "0.5rem",
};

const eventDot: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "var(--pf-primary)",
  flexShrink: 0,
  marginTop: "0.45rem",
};

const eventContent: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "0.15rem",
  padding: "0.25rem 0",
};

const eventTop: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  flexWrap: "wrap",
};

const eventIcon: React.CSSProperties = {
  fontSize: "0.85rem",
};

const eventTitle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "0.85rem",
  color: "var(--pf-text)",
};

const eventType: React.CSSProperties = {
  fontSize: "0.7rem",
  fontWeight: 500,
  padding: "0.1rem 0.4rem",
  borderRadius: "999px",
  background: "var(--pf-highlight, rgba(99, 102, 241, 0.08))",
  color: "var(--pf-primary)",
};

const eventTime: React.CSSProperties = {
  fontSize: "0.7rem",
  color: "var(--pf-text-secondary)",
  marginLeft: "auto",
};

const eventNotes: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "var(--pf-text-muted)",
  margin: "0.1rem 0 0",
  lineHeight: 1.4,
};

const completedBadge: React.CSSProperties = {
  fontSize: "0.65rem",
  fontWeight: 600,
  color: "#16a34a",
  background: "rgba(22, 163, 74, 0.08)",
  padding: "0.1rem 0.4rem",
  borderRadius: "999px",
  alignSelf: "flex-start",
};

const loadMoreBtn: React.CSSProperties = {
  padding: "0.4rem 1rem",
  borderRadius: "0.5rem",
  background: "var(--pf-surface-muted)",
  color: "var(--pf-text-muted)",
  fontWeight: 600,
  fontSize: "0.8rem",
  border: "none",
  cursor: "pointer",
  alignSelf: "center",
};

const collapseBtn: React.CSSProperties = {
  padding: "0.35rem 0.8rem",
  borderRadius: "0.375rem",
  background: "var(--pf-surface-muted)",
  color: "var(--pf-text-muted)",
  fontWeight: 600,
  fontSize: "0.75rem",
  border: "none",
  cursor: "pointer",
  marginTop: "0.75rem",
  alignSelf: "flex-end",
};
