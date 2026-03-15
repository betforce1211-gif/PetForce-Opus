"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useHousehold } from "@/lib/household-context";
import { useTrackEvent } from "@/lib/use-track-event";

type Mode = "loading" | "choose" | "create" | "join";

export default function OnboardPage() {
  const router = useRouter();
  const { switchHousehold } = useHousehold();
  const trackEvent = useTrackEvent();

  const householdsQuery = trpc.dashboard.myHouseholds.useQuery();
  const canCreateQuery = trpc.dashboard.canCreateHousehold.useQuery();

  const [mode, setMode] = useState<Mode>("loading");
  const [didRoute, setDidRoute] = useState(false);

  // ── Scenario routing ──
  useEffect(() => {
    if (didRoute) return;
    if (householdsQuery.isLoading || canCreateQuery.isLoading) return;

    const hh = householdsQuery.data ?? [];
    const canCreate = canCreateQuery.data?.canCreate ?? true;

    if (hh.length > 0 && !canCreate) {
      // Owner who already has a household — redirect to dashboard
      router.push("/dashboard");
      setDidRoute(true);
      return;
    }

    if (hh.length > 0) {
      // Existing user adding another household — go straight to create form
      setMode("create");
    } else {
      // Brand new user — show welcome choose screen
      setMode("choose");
    }
    setDidRoute(true);
  }, [householdsQuery.isLoading, householdsQuery.data, canCreateQuery.isLoading, canCreateQuery.data, didRoute, router]);

  // ── Create state ──
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366F1");
  const [secondaryColor, setSecondaryColor] = useState("#EC4899");

  const utils = trpc.useContext();
  const onboard = trpc.dashboard.onboard.useMutation({
    onSuccess(household) {
      trackEvent("household.created");
      // Immediately update cache so dashboard doesn't see stale empty array
      utils.dashboard.myHouseholds.setData(undefined, (old) => [
        ...(old ?? []),
        {
          id: household.id,
          name: household.name,
          theme: household.theme,
          petCount: 0,
          memberCount: 1,
          role: "owner" as const,
        },
      ]);
      switchHousehold(household.id);
      router.push("/dashboard");
    },
    onError() {
      // Refresh household list on error
      utils.dashboard.myHouseholds.invalidate();
    },
  });

  // ── Join state ──
  const [joinCode, setJoinCode] = useState("");
  const [joinDisplayName, setJoinDisplayName] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [joinSubmitted, setJoinSubmitted] = useState(false);

  const createRequest = trpc.accessRequest.create.useMutation({
    onSuccess: () => setJoinSubmitted(true),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onboard.mutate({
      name,
      displayName,
      theme: { primaryColor, secondaryColor, avatar: null },
    });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    createRequest.mutate({
      joinCode: joinCode.trim(),
      displayName: joinDisplayName.trim(),
      message: joinMessage.trim() || undefined,
    });
  };

  // Whether to show back button (only if user has no households — came from welcome screen)
  const hasHouseholds = (householdsQuery.data ?? []).length > 0;
  // Whether user already owns a household (affects heading text and back button)
  const isOwner = (householdsQuery.data ?? []).some((h: { role: string }) => h.role === "owner");

  // ── Loading ──
  if (mode === "loading") {
    return (
      <main style={pageShell}>
        <div style={centeredContainer}>
          <p style={{ color: "var(--pf-text-muted)", fontSize: "0.95rem" }}>Loading...</p>
        </div>
      </main>
    );
  }

  // ── Choose mode: two cards side by side ──
  if (mode === "choose") {
    return (
      <main style={pageShell}>
        <div style={centeredContainer}>
          <div style={{ textAlign: "center", maxWidth: 600 }}>
            <h1 style={heading}>Welcome to PetForce</h1>
            <p style={subtitle}>How would you like to get started?</p>

            <div style={cardRow}>
              <button type="button" onClick={() => setMode("create")} style={optionCard}>
                <span style={cardEmoji}>🏠</span>
                <strong style={cardTitle}>Create a Household</strong>
                <p style={cardDesc}>
                  Start fresh — set up your household name, colors, and invite others later.
                </p>
              </button>

              <button type="button" onClick={() => setMode("join")} style={optionCard}>
                <span style={cardEmoji}>🔑</span>
                <strong style={cardTitle}>Join a Household</strong>
                <p style={cardDesc}>
                  Someone already set things up? Enter their join code to request access.
                </p>
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Join: submitted success ──
  if (mode === "join" && joinSubmitted) {
    return (
      <main style={pageShell}>
        <div style={centeredContainer}>
          <div style={formCard}>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: "2.5rem" }}>🎉</span>
              <h2 style={{ ...formHeading, marginTop: "0.5rem" }}>Request Sent!</h2>
              <p style={{ color: "var(--pf-text-muted)", fontSize: "0.875rem", margin: "0.5rem 0 1.25rem" }}>
                The household owner will review your request. You&apos;ll be added once approved.
              </p>
              <button type="button" onClick={() => router.push("/dashboard")} style={primaryButton}>
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Create or Join form ──
  return (
    <main style={pageShell}>
      <div style={centeredContainer}>
        <div style={formCard}>
          {hasHouseholds ? null : (
            <button type="button" onClick={() => setMode("choose")} style={backLink}>
              ← Back
            </button>
          )}

          {mode === "create" ? (
            <>
              <h1 style={formHeading}>{isOwner ? "Create another household" : "Create your household"}</h1>
              <p style={formSubtitle}>{isOwner ? "Add a new household to your account." : "Set up your household to start managing your pets."}</p>

              <form onSubmit={handleCreate} style={formStack}>
                <div style={fieldRow}>
                  <label style={fieldWrap}>
                    <span style={labelText}>Household name</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="The Smith Family"
                      required
                      style={inputStyle}
                    />
                  </label>
                  <label style={fieldWrap}>
                    <span style={labelText}>Your display name</span>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Jane Smith"
                      required
                      style={inputStyle}
                    />
                  </label>
                </div>

                <div style={fieldRow}>
                  <label style={fieldWrap}>
                    <span style={labelText}>Primary color</span>
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      style={colorInput}
                    />
                  </label>
                  <label style={fieldWrap}>
                    <span style={labelText}>Secondary color</span>
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      style={colorInput}
                    />
                  </label>
                </div>

                {onboard.error && (
                  <p style={errorText}>{onboard.error.message}</p>
                )}

                <button type="submit" disabled={onboard.isLoading} style={{ ...primaryButton, opacity: onboard.isLoading ? 0.7 : 1 }}>
                  {onboard.isLoading ? "Creating..." : "Create Household"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 style={formHeading}>Join a household</h1>
              <p style={formSubtitle}>Enter the join code shared by your household owner.</p>

              <form onSubmit={handleJoin} style={formStack}>
                <div style={fieldRow}>
                  <label style={fieldWrap}>
                    <span style={labelText}>Join Code</span>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="ABC-1234"
                      required
                      style={{ ...inputStyle, textAlign: "center", fontSize: "1.1rem", letterSpacing: "0.05em", fontWeight: 600 }}
                    />
                  </label>
                  <label style={fieldWrap}>
                    <span style={labelText}>Your display name</span>
                    <input
                      type="text"
                      value={joinDisplayName}
                      onChange={(e) => setJoinDisplayName(e.target.value)}
                      placeholder="How you'd like to appear"
                      required
                      style={inputStyle}
                    />
                  </label>
                </div>

                <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <span style={labelText}>Message (optional)</span>
                  <textarea
                    value={joinMessage}
                    onChange={(e) => setJoinMessage(e.target.value)}
                    placeholder="Hi! I'd like to help take care of the pets."
                    rows={2}
                    style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                  />
                </label>

                {createRequest.isError && (
                  <p style={errorText}>{createRequest.error?.message}</p>
                )}

                <button
                  type="submit"
                  disabled={!joinCode.trim() || !joinDisplayName.trim() || createRequest.isLoading}
                  style={{ ...primaryButton, opacity: !joinCode.trim() || !joinDisplayName.trim() ? 0.5 : 1 }}
                >
                  {createRequest.isLoading ? "Sending..." : "Request Access"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

// ── Styles ──

const pageShell: React.CSSProperties = {
  minHeight: "calc(100vh - 73px)",
  background: "var(--pf-page-gradient)",
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
};

const centeredContainer: React.CSSProperties = {
  minHeight: "calc(100vh - 73px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "2rem 1rem",
};

const heading: React.CSSProperties = {
  fontSize: "1.75rem",
  fontWeight: 700,
  color: "var(--pf-text)",
  margin: "0 0 0.25rem",
  letterSpacing: "-0.02em",
};

const subtitle: React.CSSProperties = {
  color: "var(--pf-text-muted)",
  fontSize: "0.95rem",
  margin: "0 0 2rem",
};

const cardRow: React.CSSProperties = {
  display: "flex",
  gap: "1rem",
  justifyContent: "center",
};

const optionCard: React.CSSProperties = {
  flex: "1 1 0",
  maxWidth: 260,
  background: "var(--pf-glass-bg)",
  backdropFilter: "blur(10px)",
  borderRadius: "0.875rem",
  padding: "2rem 1.5rem",
  border: "1px solid var(--pf-glass-border)",
  boxShadow: "0 1px 3px var(--pf-shadow-soft), 0 4px 20px var(--pf-highlight)",
  cursor: "pointer",
  textAlign: "center",
  transition: "all 0.2s ease",
  fontFamily: "inherit",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "0.5rem",
};

const cardEmoji: React.CSSProperties = {
  fontSize: "2.25rem",
  lineHeight: 1,
};

const cardTitle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 700,
  color: "var(--pf-text)",
  letterSpacing: "-0.01em",
};

const cardDesc: React.CSSProperties = {
  fontSize: "0.825rem",
  color: "var(--pf-text-muted)",
  margin: 0,
  lineHeight: 1.5,
};

const formCard: React.CSSProperties = {
  background: "var(--pf-glass-bg)",
  backdropFilter: "blur(10px)",
  borderRadius: "0.875rem",
  padding: "2rem",
  border: "1px solid var(--pf-glass-border)",
  boxShadow: "0 1px 3px var(--pf-shadow-soft), 0 4px 20px var(--pf-highlight)",
  width: "100%",
  maxWidth: 480,
};

const backLink: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--pf-primary)",
  fontSize: "0.825rem",
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
  marginBottom: "1rem",
  fontFamily: "inherit",
};

const formHeading: React.CSSProperties = {
  fontSize: "1.4rem",
  fontWeight: 700,
  color: "var(--pf-text)",
  margin: "0 0 0.25rem",
  letterSpacing: "-0.02em",
};

const formSubtitle: React.CSSProperties = {
  color: "var(--pf-text-muted)",
  fontSize: "0.875rem",
  margin: "0 0 1.5rem",
};

const formStack: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
};

const fieldRow: React.CSSProperties = {
  display: "flex",
  gap: "1rem",
};

const fieldWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  flex: 1,
};

const labelText: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "0.8rem",
  color: "var(--pf-text-muted)",
};

const inputStyle: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid var(--pf-input-border)",
  fontSize: "0.925rem",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const colorInput: React.CSSProperties = {
  width: "100%",
  height: 40,
  border: "none",
  cursor: "pointer",
  borderRadius: "0.375rem",
};

const primaryButton: React.CSSProperties = {
  padding: "0.7rem 1.5rem",
  borderRadius: "0.5rem",
  background: "linear-gradient(135deg, #6366F1, #818CF8)",
  color: "white",
  fontWeight: 600,
  fontSize: "0.9rem",
  border: "none",
  cursor: "pointer",
  letterSpacing: "0.01em",
  boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
};

const errorText: React.CSSProperties = {
  color: "var(--pf-error)",
  fontSize: "0.85rem",
  margin: 0,
};
