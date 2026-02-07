"use client";

import { useState } from "react";
import { SignIn, SignUp } from "@clerk/nextjs";

export function AuthTabs() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        <button
          onClick={() => setTab("signin")}
          style={{
            padding: "0.5rem 1.5rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "1rem",
            backgroundColor: tab === "signin" ? "#6366F1" : "#E5E7EB",
            color: tab === "signin" ? "white" : "#374151",
          }}
        >
          Sign In
        </button>
        <button
          onClick={() => setTab("signup")}
          style={{
            padding: "0.5rem 1.5rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "1rem",
            backgroundColor: tab === "signup" ? "#6366F1" : "#E5E7EB",
            color: tab === "signup" ? "white" : "#374151",
          }}
        >
          Sign Up
        </button>
      </div>
      {tab === "signin" ? (
        <SignIn routing="hash" forceRedirectUrl="/" />
      ) : (
        <SignUp routing="hash" forceRedirectUrl="/" />
      )}
    </div>
  );
}
