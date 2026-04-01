"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { usePetPhotoUpload } from "@/lib/use-pet-photo-upload";
import { PET_PHOTO_MAX_SIZE, PET_PHOTO_ALLOWED_TYPES, PET_PHOTO_MAX_PER_PET } from "@petforce/core";

interface PetPhotoGalleryProps {
  petId: string;
  petName: string;
}

export function PetPhotoGallery({ petId, petName }: PetPhotoGalleryProps) {
  const photosQuery = trpc.petPhoto.listByPet.useQuery({ petId });
  const utils = trpc.useContext();
  const { upload, isUploading } = usePetPhotoUpload();
  const deletePhoto = trpc.petPhoto.delete.useMutation({
    onSuccess: () => utils.petPhoto.listByPet.invalidate({ petId }),
  });
  const updatePhoto = trpc.petPhoto.update.useMutation({
    onSuccess: () => utils.petPhoto.listByPet.invalidate({ petId }),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const photos = photosQuery.data ?? [];
  const atLimit = photos.length >= PET_PHOTO_MAX_PER_PET;

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      if (!(PET_PHOTO_ALLOWED_TYPES as readonly string[]).includes(file.type)) {
        alert(`${file.name}: Invalid type. Use JPEG, PNG, or WebP.`);
        continue;
      }
      if (file.size > PET_PHOTO_MAX_SIZE) {
        alert(`${file.name}: Too large. Max 10MB.`);
        continue;
      }
      try {
        await upload(petId, file);
        utils.petPhoto.listByPet.invalidate({ petId });
      } catch {
        // error shown via hook
      }
    }
  };

  const handleDelete = (photoId: string) => {
    if (!confirm("Delete this photo?")) return;
    deletePhoto.mutate({ id: photoId });
    if (lightboxIdx !== null) setLightboxIdx(null);
  };

  const handleSaveCaption = (photoId: string) => {
    updatePhoto.mutate({ id: photoId, caption: captionDraft || null });
    setEditingCaption(null);
  };

  // Close lightbox on Escape
  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowRight" && lightboxIdx < photos.length - 1) setLightboxIdx(lightboxIdx + 1);
      if (e.key === "ArrowLeft" && lightboxIdx > 0) setLightboxIdx(lightboxIdx - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIdx, photos.length]);

  return (
    <fieldset style={fieldsetStyle}>
      <legend style={legendStyle}>Photo Gallery ({photos.length}/{PET_PHOTO_MAX_PER_PET})</legend>

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        style={{
          ...dropZoneStyle,
          borderColor: dragOver ? "var(--pf-primary)" : "var(--pf-input-border)",
          background: dragOver ? "rgba(99, 102, 241, 0.05)" : "var(--pf-surface-muted)",
        }}
      >
        {isUploading ? (
          <span style={{ color: "var(--pf-text-secondary)", fontSize: "0.875rem" }}>Uploading...</span>
        ) : atLimit ? (
          <span style={{ color: "var(--pf-text-muted)", fontSize: "0.875rem" }}>Photo limit reached</span>
        ) : (
          <>
            <span style={{ fontSize: "1.5rem" }}>+</span>
            <span style={{ color: "var(--pf-text-secondary)", fontSize: "0.875rem" }}>
              Drop photos here or{" "}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={linkButtonStyle}
              >
                browse
              </button>
            </span>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div style={gridStyle}>
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              style={thumbContainerStyle}
              onClick={() => setLightboxIdx(idx)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.thumbnailUrl || photo.url}
                alt={photo.caption || `${petName} photo`}
                loading="lazy"
                style={photo.blurHash
                  ? { ...thumbImgStyle, background: `url(${photo.blurHash}) center/cover no-repeat` }
                  : thumbImgStyle
                }
              />
              {photo.caption && (
                <div style={thumbCaptionStyle}>{photo.caption}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && !photosQuery.isPending && (
        <p style={{ color: "var(--pf-text-muted)", fontSize: "0.875rem", textAlign: "center", margin: "0.5rem 0" }}>
          No photos yet. Add some memories of {petName}!
        </p>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && photos[lightboxIdx] && (
        <div style={lightboxOverlayStyle} onClick={() => setLightboxIdx(null)}>
          <div style={lightboxContentStyle} onClick={(e) => e.stopPropagation()}>
            {/* Navigation arrows */}
            {lightboxIdx > 0 && (
              <button
                type="button"
                onClick={() => setLightboxIdx(lightboxIdx - 1)}
                style={{ ...navButtonStyle, left: 8 }}
              >
                &lsaquo;
              </button>
            )}
            {lightboxIdx < photos.length - 1 && (
              <button
                type="button"
                onClick={() => setLightboxIdx(lightboxIdx + 1)}
                style={{ ...navButtonStyle, right: 8 }}
              >
                &rsaquo;
              </button>
            )}

            {/* Close button */}
            <button
              type="button"
              onClick={() => setLightboxIdx(null)}
              style={closeButtonStyle}
            >
              &times;
            </button>

            {/* Image — prefer WebP full size, fall back to original */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[lightboxIdx].webpUrl || photos[lightboxIdx].url}
              alt={photos[lightboxIdx].caption || `${petName} photo`}
              style={lightboxImgStyle}
            />

            {/* Caption & actions */}
            <div style={lightboxFooterStyle}>
              {editingCaption === photos[lightboxIdx].id ? (
                <div style={{ display: "flex", gap: "0.5rem", flex: 1 }}>
                  <input
                    type="text"
                    value={captionDraft}
                    onChange={(e) => setCaptionDraft(e.target.value)}
                    placeholder="Add a caption..."
                    maxLength={500}
                    style={{ ...captionInputStyle, flex: 1 }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveCaption(photos[lightboxIdx].id);
                      if (e.key === "Escape") setEditingCaption(null);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveCaption(photos[lightboxIdx].id)}
                    style={smallButtonStyle}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <span
                  onClick={() => {
                    setEditingCaption(photos[lightboxIdx].id);
                    setCaptionDraft(photos[lightboxIdx].caption || "");
                  }}
                  style={{ cursor: "pointer", color: "white", fontSize: "0.9rem", flex: 1 }}
                >
                  {photos[lightboxIdx].caption || "Click to add caption..."}
                </span>
              )}
              {photos[lightboxIdx].takenAt && (
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem" }}>
                  {new Date(photos[lightboxIdx].takenAt!).toLocaleDateString()}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleDelete(photos[lightboxIdx].id)}
                style={{ ...smallButtonStyle, background: "rgba(239,68,68,0.8)" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
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

const dropZoneStyle: React.CSSProperties = {
  border: "2px dashed var(--pf-input-border)",
  borderRadius: "0.5rem",
  padding: "1.25rem",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.25rem",
  cursor: "pointer",
  transition: "border-color 0.15s, background 0.15s",
  marginBottom: "0.75rem",
};

const linkButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--pf-primary)",
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
  fontSize: "inherit",
  textDecoration: "underline",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
  gap: "0.5rem",
};

const thumbContainerStyle: React.CSSProperties = {
  position: "relative",
  aspectRatio: "1",
  borderRadius: "0.5rem",
  overflow: "hidden",
  cursor: "pointer",
  border: "1px solid var(--pf-border-muted)",
};

const thumbImgStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const thumbCaptionStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
  color: "white",
  fontSize: "0.7rem",
  padding: "1rem 0.5rem 0.35rem",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const lightboxOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.85)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const lightboxContentStyle: React.CSSProperties = {
  position: "relative",
  maxWidth: "90vw",
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const lightboxImgStyle: React.CSSProperties = {
  maxWidth: "100%",
  maxHeight: "75vh",
  objectFit: "contain",
  borderRadius: "0.5rem",
};

const lightboxFooterStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "1rem",
  marginTop: "0.75rem",
  width: "100%",
  maxWidth: 600,
};

const closeButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: -40,
  right: 0,
  background: "none",
  border: "none",
  color: "white",
  fontSize: "2rem",
  cursor: "pointer",
  lineHeight: 1,
};

const navButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  background: "rgba(255,255,255,0.15)",
  border: "none",
  color: "white",
  fontSize: "2.5rem",
  cursor: "pointer",
  width: 44,
  height: 64,
  borderRadius: "0.5rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
  zIndex: 1,
};

const captionInputStyle: React.CSSProperties = {
  padding: "0.4rem 0.6rem",
  borderRadius: "0.375rem",
  border: "1px solid rgba(255,255,255,0.3)",
  background: "rgba(255,255,255,0.1)",
  color: "white",
  fontSize: "0.875rem",
  outline: "none",
};

const smallButtonStyle: React.CSSProperties = {
  padding: "0.4rem 0.75rem",
  borderRadius: "0.375rem",
  background: "rgba(255,255,255,0.15)",
  color: "white",
  border: "none",
  cursor: "pointer",
  fontSize: "0.8rem",
  fontWeight: 600,
};
