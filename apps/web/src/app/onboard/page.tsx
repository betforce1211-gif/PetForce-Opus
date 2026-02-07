"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useHousehold } from "@/lib/household-context";

export default function OnboardPage() {
  const router = useRouter();
  const { switchHousehold } = useHousehold();
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366F1");
  const [secondaryColor, setSecondaryColor] = useState("#EC4899");

  const onboard = trpc.dashboard.onboard.useMutation({
    onSuccess(household) {
      switchHousehold(household.id);
      router.push("/dashboard");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onboard.mutate({
      name,
      displayName,
      theme: { primaryColor, secondaryColor, avatar: null },
    });
  };

  return (
    <main
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "3rem 1.5rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
        Create your household
      </h1>
      <p style={{ color: "#6B7280", marginBottom: "2rem" }}>
        Set up your first household to start managing your pets.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Household name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="The Smith Family"
            required
            style={inputStyle}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Your display name</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Jane Smith"
            required
            style={inputStyle}
          />
        </label>

        <div style={{ display: "flex", gap: "1rem" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
            <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Primary color</span>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              style={{ width: "100%", height: 40, border: "none", cursor: "pointer" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
            <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Secondary color</span>
            <input
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              style={{ width: "100%", height: 40, border: "none", cursor: "pointer" }}
            />
          </label>
        </div>

        {onboard.error && (
          <p style={{ color: "#EF4444", fontSize: "0.875rem" }}>
            {onboard.error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={onboard.isLoading}
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: "0.5rem",
            backgroundColor: "#6366F1",
            color: "white",
            fontWeight: 600,
            border: "none",
            cursor: onboard.isLoading ? "not-allowed" : "pointer",
            opacity: onboard.isLoading ? 0.7 : 1,
          }}
        >
          {onboard.isLoading ? "Creating..." : "Create Household"}
        </button>
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "0.625rem 0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid #D1D5DB",
  fontSize: "1rem",
  outline: "none",
};
