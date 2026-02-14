"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Modal } from "./modal";
import {
  FEEDING_LABEL_SUGGESTIONS,
  FEEDING_TIME_PRESETS,
} from "@petforce/core";

interface FeedingManageModalProps {
  householdId: string;
  onClose: () => void;
}

export function FeedingManageModal({ householdId, onClose }: FeedingManageModalProps) {
  const utils = trpc.useContext();

  // Fetch data
  const schedulesQuery = trpc.feeding.listSchedules.useQuery({ householdId });
  const dashboardQuery = trpc.dashboard.get.useQuery({ householdId });

  // Form state
  const [petId, setPetId] = useState("");
  const [label, setLabel] = useState("");
  const [time, setTime] = useState("");
  const [foodType, setFoodType] = useState("");
  const [amount, setAmount] = useState("");

  // Inline editing
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editFoodType, setEditFoodType] = useState("");
  const [editAmount, setEditAmount] = useState("");

  const createMut = trpc.feeding.createSchedule.useMutation({
    onSuccess: () => {
      utils.feeding.listSchedules.invalidate();
      utils.feeding.todayStatus.invalidate();
      setLabel("");
      setTime("");
      setFoodType("");
      setAmount("");
    },
  });

  const updateMut = trpc.feeding.updateSchedule.useMutation({
    onSuccess: () => {
      utils.feeding.listSchedules.invalidate();
      utils.feeding.todayStatus.invalidate();
      setEditId(null);
    },
  });

  const deleteMut = trpc.feeding.deleteSchedule.useMutation({
    onSuccess: () => {
      utils.feeding.listSchedules.invalidate();
      utils.feeding.todayStatus.invalidate();
    },
  });

  const pets = dashboardQuery.data?.pets ?? [];
  const schedules = schedulesQuery.data ?? [];

  // Auto-select first pet if only one
  const effectivePetId = petId || (pets.length === 1 ? pets[0].id : "");

  const handleSuggestion = (suggestion: string) => {
    setLabel(suggestion);
    const preset = FEEDING_TIME_PRESETS[suggestion];
    if (preset) setTime(preset);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectivePetId || !label || !time) return;
    createMut.mutate({
      householdId,
      petId: effectivePetId,
      label,
      time,
      foodType: foodType || null,
      amount: amount || null,
    });
  };

  const startEdit = (s: typeof schedules[number]) => {
    setEditId(s.id);
    setEditLabel(s.label);
    setEditTime(s.time);
    setEditFoodType(s.foodType ?? "");
    setEditAmount(s.amount ?? "");
  };

  const handleSaveEdit = () => {
    if (!editId || !editLabel || !editTime) return;
    updateMut.mutate({
      householdId,
      id: editId,
      label: editLabel,
      time: editTime,
      foodType: editFoodType || null,
      amount: editAmount || null,
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this feeding schedule?")) return;
    deleteMut.mutate({ householdId, id });
  };

  // Group schedules by pet
  const petMap = new Map(pets.map((p) => [p.id, p.name]));
  const grouped = new Map<string, typeof schedules>();
  for (const s of schedules) {
    const arr = grouped.get(s.petId) ?? [];
    arr.push(s);
    grouped.set(s.petId, arr);
  }

  return (
    <Modal open onClose={onClose}>
      <h2 style={titleStyle}>Manage Feeding Schedules</h2>

      {/* Add new schedule form */}
      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Add New Schedule</legend>

        {/* Suggestion chips */}
        <div style={chipRow}>
          {FEEDING_LABEL_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSuggestion(s)}
              style={suggestionChip(label === s)}
            >
              {s}
            </button>
          ))}
        </div>

        <form onSubmit={handleAdd} style={formGrid}>
          {pets.length > 1 && (
            <label style={labelStyle}>
              <span style={labelText}>Pet</span>
              <select value={effectivePetId} onChange={(e) => setPetId(e.target.value)} required style={inputStyle}>
                <option value="">Select pet</option>
                {pets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          )}
          <label style={labelStyle}>
            <span style={labelText}>Label</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Breakfast"
              required
              maxLength={50}
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
            <span style={labelText}>Food type</span>
            <input
              type="text"
              value={foodType}
              onChange={(e) => setFoodType(e.target.value)}
              placeholder="Kibble"
              maxLength={100}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Amount</span>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1 cup"
              maxLength={100}
              style={inputStyle}
            />
          </label>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              type="submit"
              disabled={createMut.isLoading || !effectivePetId || !label || !time}
              style={addBtn(createMut.isLoading)}
            >
              {createMut.isLoading ? "Adding..." : "Add"}
            </button>
          </div>
        </form>

        {createMut.error && (
          <p style={errorText}>{createMut.error.message}</p>
        )}
      </fieldset>

      {/* Existing schedules */}
      <fieldset style={{ ...fieldsetStyle, marginTop: "1rem" }}>
        <legend style={legendStyle}>Current Schedules</legend>

        {schedules.length === 0 ? (
          <p style={{ color: "#A5A8BA", fontSize: "0.85rem", textAlign: "center", margin: "1rem 0 0.5rem" }}>
            No feeding schedules yet. Add one above!
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {Array.from(grouped.entries()).map(([pId, items]) => (
              <div key={pId}>
                <div style={petGroupHeader}>{petMap.get(pId) ?? "Unknown Pet"}</div>
                {items
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((s) =>
                    editId === s.id ? (
                      /* Inline edit row */
                      <div key={s.id} style={scheduleRow}>
                        <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                        <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} style={inputStyle} />
                        <input value={editFoodType} onChange={(e) => setEditFoodType(e.target.value)} placeholder="Food" style={{ ...inputStyle, width: 80 }} />
                        <input value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="Amount" style={{ ...inputStyle, width: 70 }} />
                        <button type="button" onClick={handleSaveEdit} disabled={updateMut.isLoading} style={saveBtn}>
                          {updateMut.isLoading ? "..." : "Save"}
                        </button>
                        <button type="button" onClick={() => setEditId(null)} style={cancelBtn}>Cancel</button>
                      </div>
                    ) : (
                      /* Display row */
                      <div key={s.id} style={scheduleRow}>
                        <span style={schedLabel}>{s.label}</span>
                        <span style={schedTime}>{formatTime12(s.time)}</span>
                        {s.foodType && <span style={schedMeta}>{s.foodType}</span>}
                        {s.amount && <span style={schedMeta}>{s.amount}</span>}
                        <span style={{ flex: 1 }} />
                        <button type="button" onClick={() => startEdit(s)} style={editBtn}>Edit</button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id)}
                          disabled={deleteMut.isLoading}
                          style={deleteBtn}
                        >
                          Delete
                        </button>
                      </div>
                    )
                  )}
              </div>
            ))}
          </div>
        )}

        {(updateMut.error || deleteMut.error) && (
          <p style={errorText}>{updateMut.error?.message ?? deleteMut.error?.message}</p>
        )}
      </fieldset>

      {/* Close */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
        <button type="button" onClick={onClose} style={closeBtnStyle}>
          Done
        </button>
      </div>
    </Modal>
  );
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "pm" : "am";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m}${ampm}`;
}

// ── Styles ──

const titleStyle: React.CSSProperties = {
  margin: "0 0 1.25rem",
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "#1A1637",
};

const fieldsetStyle: React.CSSProperties = {
  border: "1px solid #E5E7EB",
  borderRadius: "0.75rem",
  padding: "0.75rem 1rem",
  margin: 0,
};

const legendStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "0.9rem",
  padding: "0 0.5rem",
  color: "#374151",
};

const chipRow: React.CSSProperties = {
  display: "flex",
  gap: "0.4rem",
  marginBottom: "0.6rem",
};

const suggestionChip = (active: boolean): React.CSSProperties => ({
  padding: "0.25rem 0.7rem",
  borderRadius: "999px",
  fontSize: "0.75rem",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  background: active
    ? "linear-gradient(135deg, #6366F1, #8B5CF6)"
    : "rgba(99, 102, 241, 0.06)",
  color: active ? "white" : "#6366F1",
  transition: "all 0.15s ease",
});

const formGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "0.6rem",
};

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.2rem" };
const labelText: React.CSSProperties = { fontWeight: 600, fontSize: "0.75rem", color: "#374151" };

const inputStyle: React.CSSProperties = {
  padding: "0.4rem 0.6rem",
  borderRadius: "0.5rem",
  border: "1px solid #D1D5DB",
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

const petGroupHeader: React.CSSProperties = {
  fontSize: "0.8rem",
  fontWeight: 700,
  color: "#6366F1",
  padding: "0.25rem 0",
  borderBottom: "1px solid rgba(99, 102, 241, 0.1)",
  marginBottom: "0.35rem",
};

const scheduleRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.35rem 0.25rem",
  fontSize: "0.825rem",
};

const schedLabel: React.CSSProperties = {
  fontWeight: 600,
  color: "#1A1637",
};

const schedTime: React.CSSProperties = {
  color: "#6B7280",
  fontWeight: 500,
};

const schedMeta: React.CSSProperties = {
  color: "#A5A8BA",
  fontSize: "0.75rem",
};

const editBtn: React.CSSProperties = {
  padding: "0.2rem 0.6rem",
  borderRadius: "0.375rem",
  background: "rgba(99, 102, 241, 0.06)",
  color: "#6366F1",
  fontWeight: 600,
  fontSize: "0.75rem",
  border: "none",
  cursor: "pointer",
};

const deleteBtn: React.CSSProperties = {
  padding: "0.2rem 0.6rem",
  borderRadius: "0.375rem",
  background: "rgba(239, 68, 68, 0.06)",
  color: "#DC2626",
  fontWeight: 600,
  fontSize: "0.75rem",
  border: "none",
  cursor: "pointer",
};

const saveBtn: React.CSSProperties = {
  padding: "0.2rem 0.6rem",
  borderRadius: "0.375rem",
  background: "#6366F1",
  color: "white",
  fontWeight: 600,
  fontSize: "0.75rem",
  border: "none",
  cursor: "pointer",
};

const cancelBtn: React.CSSProperties = {
  padding: "0.2rem 0.6rem",
  borderRadius: "0.375rem",
  background: "#F3F4F6",
  color: "#374151",
  fontWeight: 600,
  fontSize: "0.75rem",
  border: "none",
  cursor: "pointer",
};

const closeBtnStyle: React.CSSProperties = {
  padding: "0.6rem 1.5rem",
  borderRadius: "0.5rem",
  background: "#F3F4F6",
  color: "#374151",
  fontWeight: 600,
  fontSize: "0.875rem",
  border: "none",
  cursor: "pointer",
};

const errorText: React.CSSProperties = {
  color: "#EF4444",
  fontSize: "0.825rem",
  marginTop: "0.5rem",
};
