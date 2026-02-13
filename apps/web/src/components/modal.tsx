"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ open, onClose, children }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div style={backdrop} onClick={onClose}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <button style={closeBtn} onClick={onClose} aria-label="Close">
          &times;
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}

const backdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  animation: "fadeIn 0.2s ease",
};

const panel: React.CSSProperties = {
  position: "relative",
  background: "#fff",
  borderRadius: "1rem",
  maxWidth: 680,
  width: "95vw",
  maxHeight: "90vh",
  overflowY: "auto",
  padding: "2rem",
  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  animation: "slideUp 0.25s ease",
};

const closeBtn: React.CSSProperties = {
  position: "absolute",
  top: "0.75rem",
  right: "0.75rem",
  background: "none",
  border: "none",
  fontSize: "1.5rem",
  color: "#6B7280",
  cursor: "pointer",
  lineHeight: 1,
  width: 32,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "0.5rem",
};
