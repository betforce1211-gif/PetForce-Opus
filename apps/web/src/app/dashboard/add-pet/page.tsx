"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useHousehold } from "@/lib/household-context";

const speciesOptions = ["dog", "cat", "bird", "fish", "reptile", "other"] as const;

export default function AddPetPage() {
  const router = useRouter();
  const { householdId } = useHousehold();
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<string>("dog");
  const [breed, setBreed] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [weight, setWeight] = useState("");

  const createPet = trpc.pet.create.useMutation({
    onSuccess() {
      router.push("/dashboard");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdId) return;

    createPet.mutate({
      householdId,
      name,
      species: species as (typeof speciesOptions)[number],
      breed: breed || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      weight: weight ? parseFloat(weight) : null,
    });
  };

  if (!householdId) {
    return <p style={{ padding: "2rem", color: "#6B7280" }}>No household selected.</p>;
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "3rem 1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Add a pet</h1>
      <p style={{ color: "#6B7280", marginBottom: "2rem" }}>Add a new pet to your household.</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <label style={labelStyle}>
          <span style={labelTextStyle}>Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Buddy"
            required
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          <span style={labelTextStyle}>Species</span>
          <select value={species} onChange={(e) => setSpecies(e.target.value)} style={inputStyle}>
            {speciesOptions.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          <span style={labelTextStyle}>Breed (optional)</span>
          <input
            type="text"
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            placeholder="Golden Retriever"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          <span style={labelTextStyle}>Date of birth (optional)</span>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          <span style={labelTextStyle}>Weight in lbs (optional)</span>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="25"
            min="0"
            step="0.1"
            style={inputStyle}
          />
        </label>

        {createPet.error && (
          <p style={{ color: "#EF4444", fontSize: "0.875rem" }}>{createPet.error.message}</p>
        )}

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button type="button" onClick={() => router.back()} style={cancelButtonStyle}>
            Cancel
          </button>
          <button type="submit" disabled={createPet.isLoading} style={submitButtonStyle(createPet.isLoading)}>
            {createPet.isLoading ? "Adding..." : "Add Pet"}
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
