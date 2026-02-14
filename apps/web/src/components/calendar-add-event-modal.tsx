"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Modal } from "./modal";
import { ACTIVITY_TYPE_LABELS } from "@petforce/core";

const activityTypes = [
  "walk", "feeding", "vet_visit", "medication", "grooming", "play", "other",
] as const;

interface CalendarAddEventModalProps {
  householdId: string;
  defaultDate: string; // YYYY-MM-DD
  onClose: () => void;
  onCreated: () => void;
}

export function CalendarAddEventModal({
  householdId,
  defaultDate,
  onClose,
  onCreated,
}: CalendarAddEventModalProps) {
  const [petId, setPetId] = useState("");
  const [type, setType] = useState<string>("walk");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");

  const dashboardQuery = trpc.dashboard.get.useQuery({ householdId });
  const pets = dashboardQuery.data?.pets ?? [];
  const currentMember = dashboardQuery.data?.members[0];

  const createMut = trpc.activity.create.useMutation({
    onSuccess: () => onCreated(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMember || !petId) return;

    const scheduledAt = new Date(`${date}T${time}:00`);
    createMut.mutate({
      householdId,
      memberId: currentMember.id,
      petId,
      type: type as (typeof activityTypes)[number],
      title,
      notes: notes || null,
      scheduledAt,
    });
  };

  return (
    <Modal open onClose={onClose}>
      <h2 style={titleStyle}>Add Event</h2>

      <form onSubmit={handleSubmit} style={formGrid}>
        {/* Row 1 */}
        <label style={labelStyle}>
          <span style={labelText}>Pet</span>
          <select value={petId} onChange={(e) => setPetId(e.target.value)} required style={inputStyle}>
            <option value="">Select pet</option>
            {pets.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          <span style={labelText}>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
            {activityTypes.map((t) => (
              <option key={t} value={t}>{ACTIVITY_TYPE_LABELS[t] ?? t}</option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          <span style={labelText}>Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Vet checkup"
            required
            maxLength={200}
            style={inputStyle}
          />
        </label>

        {/* Row 2 */}
        <label style={labelStyle}>
          <span style={labelText}>Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          <span style={labelText}>Time</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          <span style={labelText}>Notes</span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            maxLength={2000}
            style={inputStyle}
          />
        </label>

        {/* Actions */}
        <div style={actionsRow}>
          {createMut.error && (
            <p style={errorText}>{createMut.error.message}</p>
          )}
          <div style={btnGroup}>
            <button type="button" onClick={onClose} style={cancelBtn}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMut.isLoading || !petId || !title}
              style={submitBtn(createMut.isLoading)}
            >
              {createMut.isLoading ? "Creating..." : "Create Event"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── Styles ──

const titleStyle: React.CSSProperties = {
  margin: "0 0 1.25rem",
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "#1A1637",
};

const formGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "0.75rem",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.2rem",
};

const labelText: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "0.75rem",
  color: "#374151",
};

const inputStyle: React.CSSProperties = {
  padding: "0.45rem 0.6rem",
  borderRadius: "0.5rem",
  border: "1px solid #D1D5DB",
  fontSize: "0.85rem",
  outline: "none",
};

const actionsRow: React.CSSProperties = {
  gridColumn: "1 / -1",
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  marginTop: "0.25rem",
};

const btnGroup: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "0.5rem",
};

const cancelBtn: React.CSSProperties = {
  padding: "0.5rem 1.1rem",
  borderRadius: "0.5rem",
  background: "#F3F4F6",
  color: "#374151",
  fontWeight: 600,
  fontSize: "0.85rem",
  border: "none",
  cursor: "pointer",
};

const submitBtn = (loading: boolean): React.CSSProperties => ({
  padding: "0.5rem 1.1rem",
  borderRadius: "0.5rem",
  background: "linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)",
  color: "white",
  fontWeight: 600,
  fontSize: "0.85rem",
  border: "none",
  cursor: loading ? "not-allowed" : "pointer",
  opacity: loading ? 0.7 : 1,
  boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
});

const errorText: React.CSSProperties = {
  color: "#EF4444",
  fontSize: "0.825rem",
  margin: 0,
};
