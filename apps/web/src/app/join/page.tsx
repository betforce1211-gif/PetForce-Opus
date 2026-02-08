"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useHousehold } from "@/lib/household-context";

export default function JoinPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  return (
    <main style={pageShell}>
      <div style={centeredContainer}>
        {token ? <AcceptInvite token={token} /> : <RequestAccess />}
      </div>
    </main>
  );
}

// ── Accept Invite Mode ──

function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const { switchHousehold } = useHousehold();

  const inviteQuery = trpc.invitation.getByToken.useQuery({ token });
  const acceptMutation = trpc.invitation.accept.useMutation({
    onSuccess: (member) => {
      switchHousehold(member.householdId);
      router.push("/dashboard");
    },
  });
  const declineMutation = trpc.invitation.decline.useMutation({
    onSuccess: () => router.push("/dashboard"),
  });

  if (inviteQuery.isLoading) {
    return (
      <div style={glassCard}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <div style={spinner} />
          <p style={{ color: "#6B7280", margin: 0 }}>Looking up invitation...</p>
        </div>
      </div>
    );
  }

  if (inviteQuery.isError) {
    return (
      <div style={glassCard}>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", color: "#1E1B4B" }}>
          Invitation Not Found
        </h2>
        <p style={{ color: "#6B7280", margin: "0 0 1rem", fontSize: "0.875rem" }}>
          {inviteQuery.error?.message ?? "This invitation link may be invalid or expired."}
        </p>
        <button onClick={() => router.push("/dashboard")} style={actionButton}>
          Go to Dashboard
        </button>
      </div>
    );
  }

  const invite = inviteQuery.data;

  if (invite.status !== "pending") {
    return (
      <div style={glassCard}>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", color: "#1E1B4B" }}>
          Invitation {invite.status}
        </h2>
        <p style={{ color: "#6B7280", margin: "0 0 1rem", fontSize: "0.875rem" }}>
          This invitation has already been {invite.status}.
        </p>
        <button onClick={() => router.push("/dashboard")} style={actionButton}>
          Go to Dashboard
        </button>
      </div>
    );
  }

  const isExpired = new Date() > new Date(invite.expiresAt);

  return (
    <div style={glassCard}>
      <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
        <span style={{ fontSize: "2.5rem" }}>🏠</span>
      </div>
      <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", color: "#1E1B4B", textAlign: "center" }}>
        You&apos;re invited to join
      </h2>
      <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", color: "#6366F1", textAlign: "center", fontWeight: 700 }}>
        {invite.householdName}
      </h3>
      <p style={{ color: "#6B7280", margin: "0 0 1.5rem", fontSize: "0.85rem", textAlign: "center" }}>
        You&apos;ll join as a <strong style={{ textTransform: "capitalize" }}>{invite.role}</strong>
      </p>

      {isExpired ? (
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#EF4444", fontWeight: 600, margin: "0 0 1rem" }}>
            This invitation has expired.
          </p>
          <button onClick={() => router.push("/dashboard")} style={actionButton}>
            Go to Dashboard
          </button>
        </div>
      ) : (
        <>
          {(acceptMutation.isError || declineMutation.isError) && (
            <p style={{ color: "#EF4444", fontSize: "0.8rem", textAlign: "center", margin: "0 0 0.75rem" }}>
              {acceptMutation.error?.message ?? declineMutation.error?.message}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              onClick={() => acceptMutation.mutate({ token })}
              disabled={acceptMutation.isLoading}
              style={actionButton}
            >
              {acceptMutation.isLoading ? "Joining..." : "Accept & Join"}
            </button>
            <button
              onClick={() => declineMutation.mutate({ token })}
              disabled={declineMutation.isLoading}
              style={outlineButton}
            >
              Decline
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Request Access Mode ──

function RequestAccess() {
  const [joinCode, setJoinCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const createRequest = trpc.accessRequest.create.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  if (submitted) {
    return (
      <div style={glassCard}>
        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: "2.5rem" }}>🎉</span>
          <h2 style={{ margin: "0.5rem 0", fontSize: "1.25rem", color: "#1E1B4B" }}>
            Request Sent!
          </h2>
          <p style={{ color: "#6B7280", margin: "0 0 1.25rem", fontSize: "0.875rem" }}>
            The household owner will review your request. You&apos;ll be added once approved.
          </p>
          <button onClick={() => (window.location.href = "/dashboard")} style={actionButton}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={glassCard}>
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <span style={{ fontSize: "2.5rem" }}>🔑</span>
      </div>
      <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.25rem", color: "#1E1B4B", textAlign: "center" }}>
        Join a Household
      </h2>
      <p style={{ color: "#6B7280", margin: "0 0 1.25rem", fontSize: "0.85rem", textAlign: "center" }}>
        Enter the household&apos;s join code to request access.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <label style={inputLabel}>Join Code</label>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABC-1234"
            style={{ ...inputField, textAlign: "center", fontSize: "1.1rem", letterSpacing: "0.05em", fontWeight: 600 }}
          />
        </div>
        <div>
          <label style={inputLabel}>Your Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How you'd like to appear"
            style={inputField}
          />
        </div>
        <div>
          <label style={inputLabel}>Message (optional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi! I'd like to help take care of the pets."
            rows={2}
            style={{ ...inputField, resize: "vertical" }}
          />
        </div>

        {createRequest.isError && (
          <p style={{ color: "#EF4444", fontSize: "0.8rem", margin: 0 }}>
            {createRequest.error?.message}
          </p>
        )}

        <button
          onClick={() =>
            createRequest.mutate({
              joinCode: joinCode.trim(),
              displayName: displayName.trim(),
              message: message.trim() || undefined,
            })
          }
          disabled={!joinCode.trim() || !displayName.trim() || createRequest.isLoading}
          style={{
            ...actionButton,
            opacity: !joinCode.trim() || !displayName.trim() ? 0.5 : 1,
            width: "100%",
            padding: "0.6rem",
          }}
        >
          {createRequest.isLoading ? "Sending..." : "Request Access"}
        </button>
      </div>
    </div>
  );
}

// ── Styles ──

const pageShell: React.CSSProperties = {
  height: "calc(100vh - 73px)",
  overflow: "hidden",
  background: "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 25%, #FDF2F8 50%, #FFF7ED 75%, #EEF2FF 100%)",
  fontFamily: "system-ui, sans-serif",
};

const centeredContainer: React.CSSProperties = {
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
};

const glassCard: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.7)",
  backdropFilter: "blur(10px)",
  borderRadius: "0.875rem",
  padding: "2rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  border: "1px solid rgba(255, 255, 255, 0.6)",
  width: "100%",
  maxWidth: 420,
};

const inputLabel: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#6B7280",
  marginBottom: "0.25rem",
};

const inputField: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid #D1D5DB",
  fontSize: "0.875rem",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const actionButton: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  borderRadius: "0.5rem",
  background: "linear-gradient(135deg, #6366F1, #818CF8)",
  color: "white",
  fontSize: "0.85rem",
  fontWeight: 600,
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const outlineButton: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  borderRadius: "0.5rem",
  background: "rgba(255, 255, 255, 0.7)",
  color: "#6B7280",
  fontSize: "0.85rem",
  fontWeight: 600,
  border: "1px solid #D1D5DB",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const spinner: React.CSSProperties = {
  width: 32,
  height: 32,
  border: "3px solid rgba(99, 102, 241, 0.2)",
  borderTopColor: "#6366F1",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};
