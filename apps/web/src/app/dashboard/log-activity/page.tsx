"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useHousehold } from "@/lib/household-context";

const activityTypes = [
  "walk", "feeding", "vet_visit", "medication", "grooming", "play", "other",
] as const;

const activityTypeLabels: Record<string, string> = {
  walk: "Walk",
  feeding: "Feeding",
  vet_visit: "Vet Visit",
  medication: "Medication",
  grooming: "Grooming",
  play: "Play",
  other: "Other",
};

export default function LogActivityPage() {
  const router = useRouter();
  const { householdId } = useHousehold();
  const [petId, setPetId] = useState("");
  const [type, setType] = useState<string>("walk");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const petsQuery = trpc.pet.listByHousehold.useQuery(
    { householdId: householdId! },
    { enabled: !!householdId }
  );

  const dashboardQuery = trpc.dashboard.get.useQuery(
    { householdId: householdId! },
    { enabled: !!householdId }
  );

  const createActivity = trpc.activity.create.useMutation({
    onSuccess() {
      router.push("/dashboard");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdId || !dashboardQuery.data) return;

    // Find the current user's member ID
    const currentMember = dashboardQuery.data.members[0];
    if (!currentMember) return;

    createActivity.mutate({
      householdId,
      memberId: currentMember.id,
      petId,
      type: type as (typeof activityTypes)[number],
      title,
      notes: notes || null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    });
  };

  if (!householdId) {
    return <p style={{ padding: "2rem", color: "#6B7280" }}>No household selected.</p>;
  }

  const pets = petsQuery.data ?? [];

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "3rem 1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Log an activity</h1>
      <p style={{ color: "#6B7280", marginBottom: "2rem" }}>Record a care activity for one of your pets.</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <label style={labelStyle}>
          <span style={labelTextStyle}>Pet</span>
          <select value={petId} onChange={(e) => setPetId(e.target.value)} required style={inputStyle}>
            <option value="">Select a pet...</option>
            {pets.map((pet) => (
              <option key={pet.id} value={pet.id}>{pet.name}</option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          <span style={labelTextStyle}>Activity type</span>
          <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
            {activityTypes.map((t) => (
              <option key={t} value={t}>{activityTypeLabels[t]}</option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          <span style={labelTextStyle}>Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Morning walk in the park"
            required
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          <span style={labelTextStyle}>Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional details..."
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </label>

        <label style={labelStyle}>
          <span style={labelTextStyle}>Scheduled time (optional)</span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            style={inputStyle}
          />
        </label>

        {createActivity.error && (
          <p style={{ color: "#EF4444", fontSize: "0.875rem" }}>{createActivity.error.message}</p>
        )}

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button type="button" onClick={() => router.back()} style={cancelButtonStyle}>
            Cancel
          </button>
          <button type="submit" disabled={createActivity.isLoading} style={submitButtonStyle(createActivity.isLoading)}>
            {createActivity.isLoading ? "Logging..." : "Log Activity"}
          </button>
        </div>
      </form>
    </main>
  );
}

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.25rem" };
const labelTextStyle: React.CSSProperties = { fontWeight: 600, fontSize: "0.875rem" };
const inputStyle: React.CSSProperties = {
  padding: "0.625rem 0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid #D1D5DB",
  fontSize: "1rem",
  outline: "none",
};
const cancelButtonStyle: React.CSSProperties = {
  padding: "0.75rem 1.5rem",
  borderRadius: "0.5rem",
  backgroundColor: "#F3F4F6",
  color: "#374151",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
};
const submitButtonStyle = (loading: boolean): React.CSSProperties => ({
  flex: 1,
  padding: "0.75rem 1.5rem",
  borderRadius: "0.5rem",
  backgroundColor: "#6366F1",
  color: "white",
  fontWeight: 600,
  border: "none",
  cursor: loading ? "not-allowed" : "pointer",
  opacity: loading ? 0.7 : 1,
});
