"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { usePetAvatarUpload } from "@/lib/use-pet-avatar-upload";
import { PET_AVATAR_MAX_SIZE, PET_AVATAR_ALLOWED_TYPES } from "@petforce/core";
import { Modal } from "./modal";

const speciesOptions = ["dog", "cat", "bird", "fish", "reptile", "other"] as const;
const sexOptions = ["male", "female", "unknown"] as const;

interface PetEditModalProps {
  petId: string;
  onClose: () => void;
}

export function PetEditModal({ petId, onClose }: PetEditModalProps) {
  const petQuery = trpc.pet.getById.useQuery({ id: petId }, { enabled: !!petId });
  const utils = trpc.useContext();

  // Form state
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

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingAvatar, setExistingAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading } = usePetAvatarUpload();

  // Populate form when pet data loads
  useEffect(() => {
    const pet = petQuery.data;
    if (!pet) return;
    setName(pet.name);
    setSpecies(pet.species);
    setBreed(pet.breed ?? "");
    setColor(pet.color ?? "");
    setSex(pet.sex ?? "");
    setDateOfBirth(pet.dateOfBirth ? new Date(pet.dateOfBirth).toISOString().split("T")[0] : "");
    setWeight(pet.weight != null ? String(pet.weight) : "");
    setAdoptionDate(pet.adoptionDate ? new Date(pet.adoptionDate).toISOString().split("T")[0] : "");
    setMicrochipNumber(pet.microchipNumber ?? "");
    setRabiesTagNumber(pet.rabiesTagNumber ?? "");
    setMedicalNotes(pet.medicalNotes ?? "");
    setExistingAvatar(pet.avatarUrl ?? null);
  }, [petQuery.data]);

  const updatePet = trpc.pet.update.useMutation({
    async onSuccess() {
      if (photoFile) {
        try {
          await upload(petId, photoFile);
        } catch {
          // Photo upload failed but update succeeded
        }
      }
      utils.pet.getById.invalidate({ id: petId });
      utils.dashboard.get.invalidate();
      onClose();
    },
  });

  const deletePet = trpc.pet.delete.useMutation({
    onSuccess() {
      utils.dashboard.get.invalidate();
      onClose();
    },
  });

  const handlePhotoSelect = (file: File) => {
    if (!(PET_AVATAR_ALLOWED_TYPES as readonly string[]).includes(file.type)) {
      alert("Please select a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > PET_AVATAR_MAX_SIZE) {
      alert("Image must be under 5MB.");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePet.mutate({
      id: petId,
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

  const handleDelete = () => {
    if (!confirm(`Delete ${name || "this pet"}? This cannot be undone.`)) return;
    deletePet.mutate({ id: petId });
  };

  const displayAvatar = photoPreview ?? existingAvatar;
  const isSaving = updatePet.isLoading || isUploading;

  // Loading / error states inside modal
  let content: React.ReactNode;

  if (petQuery.isLoading) {
    content = (
      <div style={centeredState}>
        <div style={spinner} />
        <p style={{ color: "#8B8FA3", margin: 0, fontSize: "0.9rem" }}>Loading pet...</p>
      </div>
    );
  } else if (petQuery.isError) {
    content = (
      <div style={centeredState}>
        <p style={{ color: "#EF4444", fontSize: "0.9rem" }}>Failed to load pet: {petQuery.error.message}</p>
        <button onClick={onClose} style={cancelButtonStyle}>Close</button>
      </div>
    );
  } else if (!petQuery.data) {
    content = (
      <div style={centeredState}>
        <p style={{ color: "#8B8FA3", fontSize: "0.9rem" }}>Pet not found.</p>
        <button onClick={onClose} style={cancelButtonStyle}>Close</button>
      </div>
    );
  } else {
    content = (
      <form onSubmit={handleSubmit}>
        {/* Header: photo + title */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer.files[0];
              if (file) handlePhotoSelect(file);
            }}
            style={photoPickerStyle}
          >
            {displayAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayAvatar} alt="Pet photo" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
            ) : (
              <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>📷</span>
            )}
            <div style={photoOverlayStyle}>+</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePhotoSelect(file);
            }}
          />
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#1A1637" }}>
              Edit Pet — {petQuery.data.name}
            </h2>
            <span style={{ fontSize: "0.8rem", color: "#8B8FA3" }}>
              {photoFile ? photoFile.name : displayAvatar ? "Click photo to change" : "Click photo to add"}
            </span>
          </div>
        </div>

        {/* Basic Info */}
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
              <span style={labelTextStyle}>Breed</span>
              <input type="text" value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Golden Retriever" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Color</span>
              <input type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Golden" maxLength={50} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Sex</span>
              <select value={sex} onChange={(e) => setSex(e.target.value)} style={inputStyle}>
                <option value="">— Select —</option>
                {sexOptions.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Date of birth</span>
              <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Weight (lbs)</span>
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="25" min="0" step="0.1" style={inputStyle} />
            </label>
          </div>
        </fieldset>

        {/* Identification */}
        <fieldset style={{ ...fieldsetStyle, marginTop: "1rem" }}>
          <legend style={legendStyle}>Identification</legend>
          <div style={gridStyle}>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Adoption date</span>
              <input type="date" value={adoptionDate} onChange={(e) => setAdoptionDate(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Microchip #</span>
              <input type="text" value={microchipNumber} onChange={(e) => setMicrochipNumber(e.target.value)} placeholder="900123456789012" maxLength={50} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Rabies tag #</span>
              <input type="text" value={rabiesTagNumber} onChange={(e) => setRabiesTagNumber(e.target.value)} placeholder="R-12345" maxLength={50} style={inputStyle} />
            </label>
          </div>
        </fieldset>

        {/* Notes */}
        <fieldset style={{ ...fieldsetStyle, marginTop: "1rem" }}>
          <legend style={legendStyle}>Notes</legend>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Additional notes</span>
            <textarea value={medicalNotes} onChange={(e) => setMedicalNotes(e.target.value)} placeholder="Allergies, medications, special needs..." rows={2} maxLength={5000} style={{ ...inputStyle, resize: "vertical" }} />
          </label>
        </fieldset>

        {/* Errors */}
        {updatePet.error && (
          <p style={{ color: "#EF4444", fontSize: "0.875rem", marginTop: "0.75rem" }}>{updatePet.error.message}</p>
        )}
        {deletePet.error && (
          <p style={{ color: "#EF4444", fontSize: "0.875rem", marginTop: "0.75rem" }}>{deletePet.error.message}</p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "1.25rem" }}>
          <button type="button" onClick={onClose} style={cancelButtonStyle}>Cancel</button>
          <button type="submit" disabled={isSaving} style={submitButtonStyle(isSaving)}>
            {isUploading ? "Uploading photo..." : updatePet.isLoading ? "Saving..." : "Save Changes"}
          </button>
          <button type="button" onClick={handleDelete} disabled={deletePet.isLoading} style={deleteButtonStyle}>
            {deletePet.isLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <Modal open onClose={onClose}>
      {content}
    </Modal>
  );
}

// ── Styles ──

const centeredState: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "1rem",
  padding: "3rem 1rem",
};

const spinner: React.CSSProperties = {
  width: 36,
  height: 36,
  border: "3px solid rgba(99, 102, 241, 0.15)",
  borderTopColor: "#6366F1",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
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

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "0.75rem",
};

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.2rem" };
const labelTextStyle: React.CSSProperties = { fontWeight: 600, fontSize: "0.8rem", color: "#374151" };

const inputStyle: React.CSSProperties = {
  padding: "0.4rem 0.6rem",
  borderRadius: "0.5rem",
  border: "1px solid #D1D5DB",
  fontSize: "0.875rem",
  outline: "none",
};

const cancelButtonStyle: React.CSSProperties = {
  padding: "0.6rem 1.25rem",
  borderRadius: "0.5rem",
  backgroundColor: "#F3F4F6",
  color: "#374151",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  fontSize: "0.875rem",
};

const submitButtonStyle = (loading: boolean): React.CSSProperties => ({
  flex: 1,
  padding: "0.6rem 1.25rem",
  borderRadius: "0.5rem",
  backgroundColor: "#6366F1",
  color: "white",
  fontWeight: 600,
  border: "none",
  cursor: loading ? "not-allowed" : "pointer",
  opacity: loading ? 0.7 : 1,
  fontSize: "0.875rem",
});

const deleteButtonStyle: React.CSSProperties = {
  padding: "0.6rem 1.25rem",
  borderRadius: "0.5rem",
  backgroundColor: "#FEE2E2",
  color: "#DC2626",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  fontSize: "0.875rem",
};

const photoPickerStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: "50%",
  border: "2px dashed #D1D5DB",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  position: "relative",
  overflow: "hidden",
  flexShrink: 0,
  background: "#F9FAFB",
};

const photoOverlayStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 0,
  right: 0,
  width: 22,
  height: 22,
  borderRadius: "50%",
  background: "#6366F1",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.8rem",
  fontWeight: 700,
  lineHeight: 1,
};
