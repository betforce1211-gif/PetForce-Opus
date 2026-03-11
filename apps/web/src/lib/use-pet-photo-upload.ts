import { useState, useRef, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function usePetPhotoUpload() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (
      petId: string,
      file: File,
      options?: { caption?: string; takenAt?: string }
    ) => {
      setIsUploading(true);
      setError(null);

      try {
        const token = await getTokenRef.current();
        const formData = new FormData();
        formData.append("petId", petId);
        formData.append("file", file);
        if (options?.caption) formData.append("caption", options.caption);
        if (options?.takenAt) formData.append("takenAt", options.takenAt);

        const res = await fetch(`${API_URL}/upload/pet-photo`, {
          method: "POST",
          headers: {
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Upload failed");
        }

        return data.photo;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  return { upload, isUploading, error };
}
