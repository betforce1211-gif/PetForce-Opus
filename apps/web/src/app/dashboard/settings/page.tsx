"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { useHousehold } from "@/lib/household-context";

type Tab = "members" | "invites" | "settings";

export default function SettingsPage() {
  const { householdId } = useHousehold();
  const [activeTab, setActiveTab] = useState<Tab>("members");

  const dashboardQuery = trpc.dashboard.get.useQuery(
    { householdId: householdId! },
    { enabled: !!householdId }
  );

  if (!householdId) {
    return (
      <main style={pageShell}>
        <div style={centeredMessage}>
          <p style={{ color: "#6B7280" }}>No household selected.</p>
          <Link href="/dashboard" style={actionButton}>Go to Dashboard</Link>
        </div>
      </main>
    );
  }

  if (dashboardQuery.isLoading) {
    return (
      <main style={pageShell}>
        <div style={centeredMessage}>
          <div style={spinner} />
          <p style={{ color: "#6B7280", margin: 0 }}>Loading settings...</p>
        </div>
      </main>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <main style={pageShell}>
        <div style={centeredMessage}>
          <p style={{ color: "#EF4444" }}>Failed to load settings.</p>
          <button onClick={() => dashboardQuery.refetch()} style={actionButton}>Retry</button>
        </div>
      </main>
    );
  }

  const { household, members } = dashboardQuery.data;
  const currentMember = members.find((m) => true); // Will be replaced by caller check
  const isAdmin = members.some(
    (m) => m.householdId === householdId && (m.role === "owner" || m.role === "admin")
  );

  return (
    <main style={pageShell}>
      <div style={settingsLayout}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Link href="/dashboard" style={{ color: "#6366F1", textDecoration: "none", fontSize: "0.875rem" }}>
              &larr; Dashboard
            </Link>
            <h1 style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0, color: "#1E1B4B" }}>
              Settings
            </h1>
          </div>
        </div>

        {/* Tabs */}
        <div style={tabBar}>
          {(["members", "invites", "settings"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...tabButton,
                borderBottomColor: activeTab === tab ? "#6366F1" : "transparent",
                color: activeTab === tab ? "#6366F1" : "#6B7280",
                fontWeight: activeTab === tab ? 600 : 400,
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {activeTab === "members" && (
            <MembersTab householdId={householdId} members={members} isAdmin={isAdmin} />
          )}
          {activeTab === "invites" && (
            <InvitesTab householdId={householdId} isAdmin={isAdmin} />
          )}
          {activeTab === "settings" && (
            <HouseholdSettingsTab householdId={householdId} household={household} isAdmin={isAdmin} />
          )}
        </div>
      </div>
    </main>
  );
}

// ── Members Tab ──

function MembersTab({
  householdId,
  members,
  isAdmin,
}: {
  householdId: string;
  members: { id: string; displayName: string; role: string; userId: string }[];
  isAdmin: boolean;
}) {
  const utils = trpc.useContext();
  const updateRole = trpc.member.updateRole.useMutation({
    onSuccess: () => utils.dashboard.get.invalidate(),
  });
  const removeMember = trpc.member.remove.useMutation({
    onSuccess: () => utils.dashboard.get.invalidate(),
  });
  const accessRequestsQuery = trpc.accessRequest.listByHousehold.useQuery(
    { householdId },
    { enabled: isAdmin }
  );
  const approveRequest = trpc.accessRequest.approve.useMutation({
    onSuccess: () => {
      utils.dashboard.get.invalidate();
      utils.accessRequest.listByHousehold.invalidate();
    },
  });
  const denyRequest = trpc.accessRequest.deny.useMutation({
    onSuccess: () => utils.accessRequest.listByHousehold.invalidate(),
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Members List */}
      <div style={glassCard}>
        <h2 style={sectionTitle}>Members</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {members.map((member) => (
            <div key={member.id} style={memberRow}>
              <div style={initialsCircle}>
                {member.displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <span style={{ flex: 1, fontSize: "0.875rem", color: "#1E1B4B" }}>
                {member.displayName}
              </span>
              {isAdmin ? (
                <select
                  value={member.role}
                  onChange={(e) =>
                    updateRole.mutate({
                      householdId,
                      memberId: member.id,
                      role: e.target.value as "owner" | "admin" | "member" | "sitter",
                    })
                  }
                  style={roleSelect}
                >
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="sitter">Sitter</option>
                </select>
              ) : (
                <span style={{ ...roleBadge, backgroundColor: roleBadgeColors[member.role] ?? "#6B7280" }}>
                  {member.role}
                </span>
              )}
              {isAdmin && (
                <button
                  onClick={() => {
                    if (confirm(`Remove ${member.displayName} from this household?`)) {
                      removeMember.mutate({ householdId, memberId: member.id });
                    }
                  }}
                  style={dangerButtonSmall}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pending Access Requests */}
      {isAdmin && accessRequestsQuery.data && accessRequestsQuery.data.length > 0 && (
        <div style={glassCard}>
          <h2 style={sectionTitle}>Pending Requests</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {accessRequestsQuery.data.map((req) => (
              <div key={req.id} style={memberRow}>
                <div style={{ ...initialsCircle, background: "linear-gradient(135deg, #F59E0B, #FBBF24)" }}>
                  {req.displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.875rem", color: "#1E1B4B", fontWeight: 600 }}>
                    {req.displayName}
                  </div>
                  {req.message && (
                    <div style={{ fontSize: "0.75rem", color: "#6B7280", marginTop: "0.125rem" }}>
                      &ldquo;{req.message}&rdquo;
                    </div>
                  )}
                </div>
                <button
                  onClick={() => approveRequest.mutate({ householdId, requestId: req.id })}
                  style={actionButtonSmall}
                >
                  Approve
                </button>
                <button
                  onClick={() => denyRequest.mutate({ householdId, requestId: req.id })}
                  style={dangerButtonSmall}
                >
                  Deny
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Invites Tab ──

function InvitesTab({ householdId, isAdmin }: { householdId: string; isAdmin: boolean }) {
  const utils = trpc.useContext();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "sitter">("member");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const invitesQuery = trpc.invitation.listByHousehold.useQuery(
    { householdId },
    { enabled: isAdmin }
  );
  const createInvite = trpc.invitation.create.useMutation({
    onSuccess: () => {
      utils.invitation.listByHousehold.invalidate();
      setEmail("");
    },
  });
  const revokeInvite = trpc.invitation.revoke.useMutation({
    onSuccess: () => utils.invitation.listByHousehold.invalidate(),
  });

  if (!isAdmin) {
    return (
      <div style={glassCard}>
        <p style={{ color: "#6B7280" }}>Only owners and admins can manage invitations.</p>
      </div>
    );
  }

  const pendingInvites = (invitesQuery.data ?? []).filter((i) => i.status === "pending");
  const pastInvites = (invitesQuery.data ?? []).filter((i) => i.status !== "pending");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Create Invite */}
      <div style={glassCard}>
        <h2 style={sectionTitle}>Create Invitation</h2>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={inputLabel}>Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              style={inputField}
            />
          </div>
          <div>
            <label style={inputLabel}>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "member" | "sitter")}
              style={roleSelect}
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="sitter">Sitter</option>
            </select>
          </div>
          <button
            onClick={() => createInvite.mutate({ householdId, email: email || undefined, role })}
            disabled={createInvite.isLoading}
            style={actionButton}
          >
            {createInvite.isLoading ? "Creating..." : "Create Invite"}
          </button>
        </div>

        {/* Show newly created invite link */}
        {createInvite.data && (
          <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "rgba(99, 102, 241, 0.05)", borderRadius: "0.5rem", border: "1px solid rgba(99, 102, 241, 0.15)" }}>
            <div style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: "0.25rem" }}>Invite link created! Share this with the invitee:</div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <code style={{ flex: 1, fontSize: "0.8rem", padding: "0.375rem 0.5rem", background: "rgba(255,255,255,0.8)", borderRadius: "0.375rem", overflowX: "auto", whiteSpace: "nowrap" }}>
                {typeof window !== "undefined" ? `${window.location.origin}/join?token=${createInvite.data.token}` : ""}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/join?token=${createInvite.data!.token}`);
                  setCopiedToken(createInvite.data!.token);
                  setTimeout(() => setCopiedToken(null), 2000);
                }}
                style={actionButtonSmall}
              >
                {copiedToken === createInvite.data.token ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div style={glassCard}>
          <h2 style={sectionTitle}>Pending Invitations</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {pendingInvites.map((inv) => (
              <div key={inv.id} style={memberRow}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.875rem", color: "#1E1B4B" }}>
                    {inv.email ?? "Link invite"}{" "}
                    <span style={{ ...roleBadge, backgroundColor: roleBadgeColors[inv.role] ?? "#6B7280" }}>
                      {inv.role}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>
                    Created {new Date(inv.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/join?token=${inv.token}`);
                    setCopiedToken(inv.token);
                    setTimeout(() => setCopiedToken(null), 2000);
                  }}
                  style={actionButtonSmall}
                >
                  {copiedToken === inv.token ? "Copied!" : "Copy Link"}
                </button>
                <button
                  onClick={() => revokeInvite.mutate({ householdId, invitationId: inv.id })}
                  style={dangerButtonSmall}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Invites */}
      {pastInvites.length > 0 && (
        <div style={glassCard}>
          <h2 style={sectionTitle}>Past Invitations</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {pastInvites.map((inv) => (
              <div key={inv.id} style={{ ...memberRow, opacity: 0.6 }}>
                <div style={{ flex: 1, fontSize: "0.85rem", color: "#1E1B4B" }}>
                  {inv.email ?? "Link invite"}
                </div>
                <span style={{
                  padding: "0.125rem 0.5rem",
                  borderRadius: "999px",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  textTransform: "capitalize",
                  color: "white",
                  backgroundColor:
                    inv.status === "accepted" ? "#22C55E" :
                    inv.status === "declined" ? "#EF4444" : "#9CA3AF",
                }}>
                  {inv.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Household Settings Tab ──

function HouseholdSettingsTab({
  householdId,
  household,
  isAdmin,
}: {
  householdId: string;
  household: { name: string; joinCode: string | null; theme: { primaryColor: string; secondaryColor: string; avatar: string | null } };
  isAdmin: boolean;
}) {
  const utils = trpc.useContext();
  const [name, setName] = useState(household.name);
  const [primaryColor, setPrimaryColor] = useState(household.theme.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(household.theme.secondaryColor);
  const [codeCopied, setCodeCopied] = useState(false);

  const updateHousehold = trpc.household.update.useMutation({
    onSuccess: () => utils.dashboard.get.invalidate(),
  });
  const regenerateCode = trpc.household.regenerateJoinCode.useMutation({
    onSuccess: () => utils.dashboard.get.invalidate(),
  });
  const deleteHousehold = trpc.household.delete.useMutation({
    onSuccess: () => {
      window.location.href = "/dashboard";
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* General */}
      <div style={glassCard}>
        <h2 style={sectionTitle}>General</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div>
            <label style={inputLabel}>Household Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputField}
            />
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div>
              <label style={inputLabel}>Primary Color</label>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                style={{ width: 48, height: 36, border: "1px solid #D1D5DB", borderRadius: "0.375rem", cursor: "pointer" }}
              />
            </div>
            <div>
              <label style={inputLabel}>Secondary Color</label>
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                style={{ width: 48, height: 36, border: "1px solid #D1D5DB", borderRadius: "0.375rem", cursor: "pointer" }}
              />
            </div>
          </div>
          <button
            onClick={() =>
              updateHousehold.mutate({
                id: householdId,
                name,
                theme: { primaryColor, secondaryColor },
              })
            }
            disabled={updateHousehold.isLoading}
            style={actionButton}
          >
            {updateHousehold.isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Join Code */}
      <div style={glassCard}>
        <h2 style={sectionTitle}>Join Code</h2>
        <p style={{ fontSize: "0.8rem", color: "#6B7280", margin: "0 0 0.5rem" }}>
          Share this code so others can request to join your household.
        </p>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <code style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            letterSpacing: "0.05em",
            padding: "0.5rem 1rem",
            background: "rgba(99, 102, 241, 0.05)",
            borderRadius: "0.5rem",
            border: "1px solid rgba(99, 102, 241, 0.15)",
            color: "#1E1B4B",
          }}>
            {household.joinCode ?? "Not set"}
          </code>
          {household.joinCode && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(household.joinCode!);
                setCodeCopied(true);
                setTimeout(() => setCodeCopied(false), 2000);
              }}
              style={actionButtonSmall}
            >
              {codeCopied ? "Copied!" : "Copy"}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => {
                if (confirm("Regenerate join code? The old code will stop working.")) {
                  regenerateCode.mutate({ householdId });
                }
              }}
              disabled={regenerateCode.isLoading}
              style={outlineButtonSmall}
            >
              {regenerateCode.isLoading ? "..." : "Regenerate"}
            </button>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      {isAdmin && (
        <div style={{ ...glassCard, borderColor: "rgba(239, 68, 68, 0.3)" }}>
          <h2 style={{ ...sectionTitle, color: "#EF4444" }}>Danger Zone</h2>
          <p style={{ fontSize: "0.8rem", color: "#6B7280", margin: "0 0 0.75rem" }}>
            Permanently delete this household and all its data.
          </p>
          <button
            onClick={() => {
              if (confirm("Are you sure? This will permanently delete the household, all pets, activities, and members. This cannot be undone.")) {
                deleteHousehold.mutate({ id: householdId });
              }
            }}
            style={{
              ...actionButton,
              background: "linear-gradient(135deg, #EF4444, #F87171)",
            }}
          >
            Delete Household
          </button>
        </div>
      )}
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

const settingsLayout: React.CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  padding: "1.25rem 1.5rem",
  gap: "1rem",
  maxWidth: 800,
  margin: "0 auto",
};

const centeredMessage: React.CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "1rem",
};

const tabBar: React.CSSProperties = {
  display: "flex",
  gap: "0",
  borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
  flexShrink: 0,
};

const tabButton: React.CSSProperties = {
  padding: "0.5rem 1rem",
  background: "none",
  border: "none",
  borderBottom: "2px solid transparent",
  cursor: "pointer",
  fontSize: "0.875rem",
  fontFamily: "inherit",
  transition: "all 0.15s",
};

const glassCard: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.7)",
  backdropFilter: "blur(10px)",
  borderRadius: "0.875rem",
  padding: "1.25rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  border: "1px solid rgba(255, 255, 255, 0.6)",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 700,
  margin: "0 0 0.75rem",
  color: "#1E1B4B",
};

const memberRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.6rem",
  padding: "0.5rem 0",
};

const initialsCircle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 16,
  background: "linear-gradient(135deg, #6366F1, #818CF8)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  fontSize: "0.7rem",
  flexShrink: 0,
};

const roleBadge: React.CSSProperties = {
  padding: "0.125rem 0.5rem",
  borderRadius: "999px",
  color: "white",
  fontSize: "0.7rem",
  fontWeight: 600,
  textTransform: "capitalize",
};

const roleBadgeColors: Record<string, string> = {
  owner: "#6366F1",
  admin: "#3B82F6",
  member: "#6B7280",
  sitter: "#22C55E",
};

const roleSelect: React.CSSProperties = {
  padding: "0.3rem 0.5rem",
  borderRadius: "0.375rem",
  border: "1px solid #D1D5DB",
  fontSize: "0.8rem",
  fontFamily: "inherit",
  cursor: "pointer",
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
  padding: "0.4rem 0.85rem",
  borderRadius: "0.5rem",
  background: "linear-gradient(135deg, #6366F1, #818CF8)",
  color: "white",
  fontSize: "0.8rem",
  fontWeight: 600,
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const actionButtonSmall: React.CSSProperties = {
  padding: "0.25rem 0.6rem",
  borderRadius: "0.375rem",
  background: "linear-gradient(135deg, #6366F1, #818CF8)",
  color: "white",
  fontSize: "0.75rem",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const outlineButtonSmall: React.CSSProperties = {
  padding: "0.25rem 0.6rem",
  borderRadius: "0.375rem",
  background: "rgba(255, 255, 255, 0.7)",
  color: "#6366F1",
  fontSize: "0.75rem",
  fontWeight: 600,
  border: "1px solid rgba(99, 102, 241, 0.3)",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const dangerButtonSmall: React.CSSProperties = {
  padding: "0.25rem 0.6rem",
  borderRadius: "0.375rem",
  background: "rgba(239, 68, 68, 0.1)",
  color: "#EF4444",
  fontSize: "0.75rem",
  fontWeight: 600,
  border: "1px solid rgba(239, 68, 68, 0.2)",
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
