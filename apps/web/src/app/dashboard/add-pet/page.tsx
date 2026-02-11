"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useHousehold } from "@/lib/household-context";

const speciesOptions = ["dog", "cat", "bird", "fish", "reptile", "other"] as const;
const sexOptions = ["male", "female", "unknown"] as const;

export default function AddPetPage() {
  const router = useRouter();
  const { householdId } = useHousehold();
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<string>("dog");
  const [breed, setBreed] = useState("");
  const [color, setColor] = useState("");
  const [sex, setSex] = useState<string>("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [weight, setWeight] = useState("");
  const [adoptionDate, setAdoptionDate] = useState("");
  const [microchipNumber, setMicrochipNumber] = useState("");
  const [rabiesTagNumber, setRabiesTagNumber] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");

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
      color: color || null,
      sex: sex ? (sex as (typeof sexOptions)[number]) : null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      weight: weight ? parseFloat(weight) : null,
      adoptionDate: adoptionDate ? new Date(adoptionDate) : null,
      microchipNumber: microchipNumber || null,
      rabiesTagNumber: rabiesTagNumber || null,
      medicalNotes: medicalNotes || null,
    });
  };

  if (!householdId) {
    return <p style={{ padding: "2rem", color: "#6B7280" }}>No household selected.</p>;
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>Add a pet</h1>
      <p style={{ color: "#6B7280", marginBottom: "1.5rem" }}>Add a new pet to your household.</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Basic Info — responsive grid: 2 cols on desktop, 1 on mobile */}
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Basic Info</legend>
          <div style={gridStyle}>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Name</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Buddy" required style={inputStyle} />
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
              <input type="text" value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Golden Retriever" style={inputStyle} />
            </label>

            <label style={labelStyle}>
              <span style={labelTextStyle}>Color (optional)</span>
              <input type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Golden" maxLength={50} style={inputStyle} />
            </label>

            <label style={labelStyle}>
              <span style={labelTextStyle}>Sex (optional)</span>
              <select value={sex} onChange={(e) => setSex(e.target.value)} style={inputStyle}>
                <option value="">— Select —</option>
                {sexOptions.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              <span style={labelTextStyle}>Date of birth (optional)</span>
              <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} style={inputStyle} />
            </label>

            <label style={labelStyle}>
              <span style={labelTextStyle}>Weight in lbs (optional)</span>
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="25" min="0" step="0.1" style={inputStyle} />
            </label>
          </div>
        </fieldset>

        {/* Identification — responsive grid */}
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Identification</legend>
          <div style={gridStyle}>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Adoption date (optional)</span>
              <input type="date" value={adoptionDate} onChange={(e) => setAdoptionDate(e.target.value)} style={inputStyle} />
            </label>

            <label style={labelStyle}>
              <span style={labelTextStyle}>Microchip # (optional)</span>
              <input type="text" value={microchipNumber} onChange={(e) => setMicrochipNumber(e.target.value)} placeholder="900123456789012" maxLength={50} style={inputStyle} />
            </label>

            <label style={labelStyle}>
              <span style={labelTextStyle}>Rabies tag # (optional)</span>
              <input type="text" value={rabiesTagNumber} onChange={(e) => setRabiesTagNumber(e.target.value)} placeholder="R-12345" maxLength={50} style={inputStyle} />
            </label>
          </div>
        </fieldset>

        {/* Notes — full width */}
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Notes</legend>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Additional notes (optional)</span>
            <textarea value={medicalNotes} onChange={(e) => setMedicalNotes(e.target.value)} placeholder="Allergies, medications, special needs..." rows={3} maxLength={5000} style={{ ...inputStyle, resize: "vertical" }} />
          </label>
        </fieldset>

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

const fieldsetStyle: React.CSSProperties = {
  border: "1px solid #E5E7EB",
  borderRadius: "0.75rem",
  padding: "1rem 1.25rem",
  margin: 0,
};
const legendStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "0.95rem",
  padding: "0 0.5rem",
  color: "#374151",
};
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
  gap: "1rem",
};
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.25rem" };
const labelTextStyle: React.CSSProperties = { fontWeight: 600, fontSize: "0.875rem" };
const inputStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid #D1D5DB",
  fontSize: "0.9375rem",
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
