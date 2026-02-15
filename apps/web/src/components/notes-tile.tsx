"use client";

import { trpc } from "@/lib/trpc";

interface NotesTileContentProps {
  householdId: string;
  onManage: () => void;
}

export function NotesTileContent({ householdId, onManage }: NotesTileContentProps) {
  const recentQuery = trpc.notes.recent.useQuery(
    { householdId },
    { refetchInterval: 30_000 }
  );

  if (recentQuery.isLoading) {
    return (
      <div style={centered}>
        <span style={{ color: "#A5A8BA", fontSize: "0.8rem" }}>Loading...</span>
      </div>
    );
  }

  if (recentQuery.isError) {
    return (
      <div style={centered}>
        <span style={{ color: "#EF4444", fontSize: "0.8rem" }}>Failed to load</span>
      </div>
    );
  }

  const data = recentQuery.data;
  if (!data || data.totalCount === 0) {
    return (
      <>
        <div style={centered}>
          <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>{"📝"}</span>
          <p style={{ color: "#A5A8BA", fontSize: "0.8rem", margin: "0.5rem 0 0" }}>
            No notes yet
          </p>
        </div>
        <button type="button" onClick={onManage} style={linkBtn}>
          + Add Note
        </button>
      </>
    );
  }

  return (
    <>
      <div style={notesList}>
        {data.notes.map((note) => (
          <div key={note.id} style={noteRow}>
            <div style={noteHeader}>
              <span style={noteTitle}>{note.title}</span>
              {note.petName ? (
                <span style={petBadge}>{note.petName}</span>
              ) : (
                <span style={householdBadge}>Household</span>
              )}
            </div>
            <p style={noteSnippet}>{note.snippet}</p>
          </div>
        ))}
      </div>
      <button type="button" onClick={onManage} style={linkBtn}>
        Manage Notes ({data.totalCount})
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

const notesList: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "0.35rem",
  overflow: "hidden",
};

const noteRow: React.CSSProperties = {
  padding: "0.3rem 0.25rem",
  borderBottom: "1px solid rgba(99, 102, 241, 0.06)",
};

const noteHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  marginBottom: "0.1rem",
};

const noteTitle: React.CSSProperties = {
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "#1A1637",
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const petBadge: React.CSSProperties = {
  padding: "0.1rem 0.45rem",
  borderRadius: "999px",
  background: "linear-gradient(135deg, #8B5CF6, #A78BFA)",
  color: "white",
  fontSize: "0.6rem",
  fontWeight: 600,
  flexShrink: 0,
};

const householdBadge: React.CSSProperties = {
  padding: "0.1rem 0.45rem",
  borderRadius: "999px",
  background: "rgba(99, 102, 241, 0.08)",
  color: "#6366F1",
  fontSize: "0.6rem",
  fontWeight: 600,
  flexShrink: 0,
};

const noteSnippet: React.CSSProperties = {
  fontSize: "0.72rem",
  color: "#7C7F95",
  margin: 0,
  lineHeight: 1.3,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
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
