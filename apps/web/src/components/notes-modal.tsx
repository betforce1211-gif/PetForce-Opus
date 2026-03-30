"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Modal } from "./modal";

interface NotesModalProps {
  householdId: string;
  onClose: () => void;
}

export function NotesModal({ householdId, onClose }: NotesModalProps) {
  const utils = trpc.useContext();
  const dashboardQuery = trpc.dashboard.get.useQuery({ householdId });
  const notesQuery = trpc.notes.list.useQuery({ householdId });

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [petId, setPetId] = useState<string | null>(null);
  const [filterPetId, setFilterPetId] = useState<string | undefined>(undefined);

  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editPetId, setEditPetId] = useState<string | null>(null);

  const createMut = trpc.notes.create.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
      utils.notes.recent.invalidate();
      setTitle("");
      setContent("");
      setPetId(null);
    },
  });
  const updateMut = trpc.notes.update.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
      utils.notes.recent.invalidate();
      setEditId(null);
    },
  });
  const deleteMut = trpc.notes.delete.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
      utils.notes.recent.invalidate();
    },
  });

  const pets = dashboardQuery.data?.pets ?? [];
  const allNotes = notesQuery.data?.items ?? [];
  const petMap = new Map(pets.map((p) => [p.id, p.name]));

  // Client-side filter
  const filteredNotes = filterPetId === undefined
    ? allNotes
    : filterPetId === ""
      ? allNotes.filter((n) => n.petId === null)
      : allNotes.filter((n) => n.petId === filterPetId);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    createMut.mutate({
      householdId,
      petId: petId || null,
      title,
      content,
    });
  };

  const startEdit = (n: (typeof allNotes)[number]) => {
    setEditId(n.id);
    setEditTitle(n.title);
    setEditContent(n.content);
    setEditPetId(n.petId);
  };

  const handleSaveEdit = () => {
    if (!editId || !editTitle || !editContent) return;
    updateMut.mutate({
      householdId,
      id: editId,
      title: editTitle,
      content: editContent,
      petId: editPetId,
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this note?")) return;
    deleteMut.mutate({ householdId, id });
  };

  return (
    <Modal open onClose={onClose}>
      <h2 style={titleStyle}>Notes</h2>

      {/* Add Note Form */}
      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Add Note</legend>
        <form onSubmit={handleAdd} style={formGrid}>
          <label style={labelStyle}>
            <span style={labelText}>Pet</span>
            <select
              value={petId ?? ""}
              onChange={(e) => setPetId(e.target.value || null)}
              style={inputStyle}
            >
              <option value="">Household note</option>
              {pets.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
              required
              maxLength={100}
              style={inputStyle}
            />
          </label>
          <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
            <span style={labelText}>Content</span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note..."
              required
              maxLength={5000}
              rows={3}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </label>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              type="submit"
              disabled={createMut.isPending || !title || !content}
              style={addBtn(createMut.isPending)}
            >
              {createMut.isPending ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
        {createMut.error && <p style={errorText}>{createMut.error.message}</p>}
      </fieldset>

      {/* Filter chips */}
      <div style={chipRow}>
        <button
          type="button"
          onClick={() => setFilterPetId(undefined)}
          style={filterChip(filterPetId === undefined)}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilterPetId("")}
          style={filterChip(filterPetId === "")}
        >
          Household
        </button>
        {pets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setFilterPetId(p.id)}
            style={filterChip(filterPetId === p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Notes list */}
      <fieldset style={{ ...fieldsetStyle, marginTop: 0 }}>
        <legend style={legendStyle}>
          Notes ({filteredNotes.length})
        </legend>
        {filteredNotes.length === 0 ? (
          <p style={emptyText}>No notes yet. Add one above!</p>
        ) : (
          <div style={recordsContainer}>
            {filteredNotes.map((n) =>
              editId === n.id ? (
                <div key={n.id} style={noteCard}>
                  <div style={editFormGrid}>
                    <label style={labelStyle}>
                      <span style={labelText}>Pet</span>
                      <select
                        value={editPetId ?? ""}
                        onChange={(e) => setEditPetId(e.target.value || null)}
                        style={inputStyle}
                      >
                        <option value="">Household note</option>
                        {pets.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </label>
                    <label style={labelStyle}>
                      <span style={labelText}>Title</span>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        maxLength={100}
                        style={inputStyle}
                      />
                    </label>
                    <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
                      <span style={labelText}>Content</span>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        maxLength={5000}
                        rows={3}
                        style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                      />
                    </label>
                  </div>
                  <div style={editActions}>
                    <button type="button" onClick={handleSaveEdit} disabled={updateMut.isPending} style={saveBtn}>
                      {updateMut.isPending ? "..." : "Save"}
                    </button>
                    <button type="button" onClick={() => setEditId(null)} style={cancelBtn}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div key={n.id} style={noteCard}>
                  <div style={noteCardHeader}>
                    <span style={noteCardTitle}>{n.title}</span>
                    {n.petId ? (
                      <span style={petBadge}>{petMap.get(n.petId) ?? "Unknown"}</span>
                    ) : (
                      <span style={householdBadge}>Household</span>
                    )}
                  </div>
                  <span style={noteDate}>{formatDate(n.updatedAt)}</span>
                  <p style={noteContent}>{n.content}</p>
                  <div style={cardActions}>
                    <button type="button" onClick={() => startEdit(n)} style={editBtnStyle}>Edit</button>
                    <button type="button" onClick={() => handleDelete(n.id)} disabled={deleteMut.isPending} style={deleteBtnStyle}>Delete</button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
        {(updateMut.error || deleteMut.error) && (
          <p style={errorText}>{updateMut.error?.message ?? deleteMut.error?.message}</p>
        )}
      </fieldset>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
        <button type="button" onClick={onClose} style={closeBtnStyle}>
          Done
        </button>
      </div>
    </Modal>
  );
}

// ── Helpers ──

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

// ── Styles ──

const titleStyle: React.CSSProperties = {
  margin: "0 0 1rem",
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "var(--pf-text)",
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

const formGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "0.6rem",
};

const editFormGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "0.6rem",
};

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.2rem" };
const labelText: React.CSSProperties = { fontWeight: 600, fontSize: "0.75rem", color: "var(--pf-text-muted)" };

const inputStyle: React.CSSProperties = {
  padding: "0.4rem 0.6rem",
  borderRadius: "0.5rem",
  border: "1px solid var(--pf-input-border)",
  fontSize: "0.85rem",
  outline: "none",
};

const addBtn = (loading: boolean): React.CSSProperties => ({
  padding: "0.45rem 1.1rem",
  borderRadius: "0.5rem",
  background: "linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)",
  color: "white",
  fontWeight: 600,
  fontSize: "0.85rem",
  border: "none",
  cursor: loading ? "not-allowed" : "pointer",
  opacity: loading ? 0.7 : 1,
  whiteSpace: "nowrap",
});

const chipRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.4rem",
  margin: "0.75rem 0",
};

const filterChip = (active: boolean): React.CSSProperties => ({
  padding: "0.25rem 0.7rem",
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
});

const recordsContainer: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.6rem",
  maxHeight: "40vh",
  overflowY: "auto",
};

const noteCard: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  borderRadius: "0.625rem",
  border: "1px solid var(--pf-highlight)",
  background: "rgba(255, 255, 255, 0.8)",
};

const noteCardHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  marginBottom: "0.15rem",
};

const noteCardTitle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 700,
  color: "var(--pf-text)",
  flex: 1,
};

const petBadge: React.CSSProperties = {
  padding: "0.1rem 0.5rem",
  borderRadius: "999px",
  background: "linear-gradient(135deg, #8B5CF6, #A78BFA)",
  color: "white",
  fontSize: "0.65rem",
  fontWeight: 600,
  flexShrink: 0,
};

const householdBadge: React.CSSProperties = {
  padding: "0.1rem 0.5rem",
  borderRadius: "999px",
  background: "var(--pf-highlight)",
  color: "var(--pf-primary)",
  fontSize: "0.65rem",
  fontWeight: 600,
  flexShrink: 0,
};

const noteDate: React.CSSProperties = {
  fontSize: "0.72rem",
  color: "var(--pf-text-secondary)",
  fontWeight: 500,
};

const noteContent: React.CSSProperties = {
  fontSize: "0.825rem",
  color: "var(--pf-text-muted)",
  margin: "0.35rem 0",
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const cardActions: React.CSSProperties = {
  display: "flex",
  gap: "0.4rem",
  justifyContent: "flex-end",
  marginTop: "0.25rem",
};

const editActions: React.CSSProperties = {
  display: "flex",
  gap: "0.4rem",
  justifyContent: "flex-end",
  marginTop: "0.5rem",
};

const editBtnStyle: React.CSSProperties = {
  padding: "0.2rem 0.6rem",
  borderRadius: "0.375rem",
  background: "var(--pf-highlight)",
  color: "var(--pf-primary)",
  fontWeight: 600,
  fontSize: "0.75rem",
  border: "none",
  cursor: "pointer",
};

const deleteBtnStyle: React.CSSProperties = {
  padding: "0.2rem 0.6rem",
  borderRadius: "0.375rem",
  background: "rgba(239, 68, 68, 0.06)",
  color: "var(--pf-error-strong)",
  fontWeight: 600,
  fontSize: "0.75rem",
  border: "none",
  cursor: "pointer",
};

const saveBtn: React.CSSProperties = {
  padding: "0.2rem 0.6rem",
  borderRadius: "0.375rem",
  background: "var(--pf-primary)",
  color: "white",
  fontWeight: 600,
  fontSize: "0.75rem",
  border: "none",
  cursor: "pointer",
};

const cancelBtn: React.CSSProperties = {
  padding: "0.2rem 0.6rem",
  borderRadius: "0.375rem",
  background: "var(--pf-surface-muted)",
  color: "var(--pf-text-muted)",
  fontWeight: 600,
  fontSize: "0.75rem",
  border: "none",
  cursor: "pointer",
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

const errorText: React.CSSProperties = {
  color: "var(--pf-error)",
  fontSize: "0.825rem",
  marginTop: "0.5rem",
};

const emptyText: React.CSSProperties = {
  color: "var(--pf-text-secondary)",
  fontSize: "0.85rem",
  textAlign: "center",
  margin: "1rem 0 0.5rem",
};
