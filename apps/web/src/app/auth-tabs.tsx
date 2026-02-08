"use client";

import { useState } from "react";
import { SignIn, SignUp } from "@clerk/nextjs";

export function AuthTabs() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <button
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        style={{
          marginBottom: "1.25rem",
          padding: "0.6rem 1.75rem",
          borderRadius: "0.5rem",
          border: "none",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: "0.95rem",
          backgroundColor: "#6366F1",
          color: "white",
        }}
      >
        {mode === "signin" ? "Sign Up" : "Sign In"}
      </button>
      {mode === "signin" ? (
        <SignIn routing="hash" forceRedirectUrl="/dashboard" />
      ) : (
        <SignUp routing="hash" forceRedirectUrl="/dashboard" />
      )}
    </div>
  );
}
