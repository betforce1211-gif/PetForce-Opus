"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { useHousehold } from "@/lib/household-context";
import { useTrackEvent } from "@/lib/use-track-event";

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
          <p style={{ color: "var(--pf-text-muted)" }}>No household selected.</p>
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
          <p style={{ color: "var(--pf-text-muted)", margin: 0 }}>Loading settings...</p>
        </div>
      </main>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <main style={pageShell}>
        <div style={centeredMessage}>
          <p style={{ color: "var(--pf-error)" }}>Failed to load settings.</p>
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
            <Link href="/dashboard" style={{ color: "var(--pf-primary)", textDecoration: "none", fontSize: "0.875rem" }}>
              &larr; Dashboard
            </Link>
            <h1 style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0, color: "var(--pf-text)" }}>
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
                borderBottomColor: activeTab === tab ? "var(--pf-primary)" : "transparent",
                color: activeTab === tab ? "var(--pf-primary)" : "var(--pf-text-muted)",
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
              <span style={{ flex: 1, fontSize: "0.875rem", color: "var(--pf-text)" }}>
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
                <span style={{ ...roleBadge, backgroundColor: roleBadgeColors[member.role] ?? "rgba(107, 114, 128, 0.15)" }}>
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
                  <div style={{ fontSize: "0.875rem", color: "var(--pf-text)", fontWeight: 600 }}>
                    {req.displayName}
                  </div>
                  {req.message && (
                    <div style={{ fontSize: "0.75rem", color: "var(--pf-text-muted)", marginTop: "0.125rem" }}>
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
  const trackEvent = useTrackEvent();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "sitter">("member");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const invitesQuery = trpc.invitation.listByHousehold.useQuery(
    { householdId },
    { enabled: isAdmin }
  );
  const createInvite = trpc.invitation.create.useMutation({
    onSuccess: () => {
      trackEvent("member.invited", { role });
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
        <p style={{ color: "var(--pf-text-muted)" }}>Only owners and admins can manage invitations.</p>
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
            <div style={{ fontSize: "0.8rem", color: "var(--pf-text-muted)", marginBottom: "0.25rem" }}>Invite link created! Share this with the invitee:</div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <code style={{ flex: 1, fontSize: "0.8rem", padding: "0.375rem 0.5rem", background: "var(--pf-glass-bg)", borderRadius: "0.375rem", overflowX: "auto", whiteSpace: "nowrap" }}>
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
                  <div style={{ fontSize: "0.875rem", color: "var(--pf-text)" }}>
                    {inv.email ?? "Link invite"}{" "}
                    <span style={{ ...roleBadge, backgroundColor: roleBadgeColors[inv.role] ?? "rgba(107, 114, 128, 0.15)" }}>
                      {inv.role}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--pf-text-secondary)" }}>
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
                <div style={{ flex: 1, fontSize: "0.85rem", color: "var(--pf-text)" }}>
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
                    inv.status === "accepted" ? "var(--pf-success)" :
                    inv.status === "declined" ? "var(--pf-error)" : "var(--pf-text-secondary)",
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
                style={{ width: 48, height: 36, border: "1px solid var(--pf-input-border)", borderRadius: "0.375rem", cursor: "pointer" }}
              />
            </div>
            <div>
              <label style={inputLabel}>Secondary Color</label>
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                style={{ width: 48, height: 36, border: "1px solid var(--pf-input-border)", borderRadius: "0.375rem", cursor: "pointer" }}
              />
            </div>
          </div>
          <button
            onClick={() =>
              updateHousehold.mutate({
                householdId,
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
        <p style={{ fontSize: "0.8rem", color: "var(--pf-text-muted)", margin: "0 0 0.5rem" }}>
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
            color: "var(--pf-text)",
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

      {/* Data Export */}
      <DataExportCard householdId={householdId} householdName={household.name} isAdmin={isAdmin} />

      {/* Danger Zone */}
      {isAdmin && (
        <div style={{ ...glassCard, borderColor: "rgba(239, 68, 68, 0.3)" }}>
          <h2 style={{ ...sectionTitle, color: "var(--pf-error)" }}>Danger Zone</h2>
          <p style={{ fontSize: "0.8rem", color: "var(--pf-text-muted)", margin: "0 0 0.75rem" }}>
            Permanently delete this household and all its data.
          </p>
          <button
            onClick={() => {
              if (confirm("Are you sure? This will permanently delete the household, all pets, activities, and members. This cannot be undone.")) {
                deleteHousehold.mutate({ householdId });
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

// ── Data Export Card ──

function DataExportCard({
  householdId,
  householdName,
  isAdmin,
}: {
  householdId: string;
  householdName: string;
  isAdmin: boolean;
}) {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const trackEvent = useTrackEvent();

  const exportQuery = trpc.export.household.useQuery(
    { householdId },
    { enabled: false } // only fetch on demand
  );

  const handleExport = async () => {
    setExporting(true);
    setExported(false);
    try {
      const result = await exportQuery.refetch();
      if (result.data) {
        const json = JSON.stringify(result.data, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const slug = householdName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        a.href = url;
        a.download = `petforce-${slug}-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExported(true);
        trackEvent("data.exported", { format: "json" });
        setTimeout(() => setExported(false), 3000);
      }
    } finally {
      setExporting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div style={glassCard}>
        <h2 style={sectionTitle}>Data Export</h2>
        <p style={{ fontSize: "0.8rem", color: "var(--pf-text-muted)", margin: 0 }}>
          Only owners and admins can export household data.
        </p>
      </div>
    );
  }

  return (
    <div style={glassCard}>
      <h2 style={sectionTitle}>Data Export</h2>
      <p style={{ fontSize: "0.8rem", color: "var(--pf-text-muted)", margin: "0 0 0.75rem" }}>
        Download all your household data including pets, health records, medications, feeding schedules, expenses, and activities as a JSON file.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            ...actionButton,
            background: exporting
              ? "linear-gradient(135deg, #6B7280, #9CA3AF)"
              : "linear-gradient(135deg, #6366F1, #818CF8)",
            cursor: exporting ? "wait" : "pointer",
          }}
        >
          {exporting ? "Exporting..." : "Export as JSON"}
        </button>
        {exported && (
          <span style={{ fontSize: "0.8rem", color: "var(--pf-success)", fontWeight: 600 }}>
            Download started!
          </span>
        )}
        {exportQuery.isError && (
          <span style={{ fontSize: "0.8rem", color: "var(--pf-error)" }}>
            Export failed. Please try again.
          </span>
        )}
      </div>
    </div>
  );
}

// ── Styles ──

const pageShell: React.CSSProperties = {
  height: "calc(100vh - 73px)",
  overflow: "hidden",
  background: "var(--pf-page-gradient)",
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
  borderBottom: "1px solid var(--pf-border)",
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
  background: "var(--pf-glass-bg)",
  backdropFilter: "blur(10px)",
  borderRadius: "0.875rem",
  padding: "1.25rem",
  boxShadow: "var(--pf-glass-shadow)",
  border: "1px solid var(--pf-glass-border)",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 700,
  margin: "0 0 0.75rem",
  color: "var(--pf-text)",
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
  color: "var(--pf-text)",
  fontSize: "0.7rem",
  fontWeight: 600,
  textTransform: "capitalize",
};

const roleBadgeColors: Record<string, string> = {
  owner: "rgba(99, 102, 241, 0.15)",
  admin: "rgba(59, 130, 246, 0.15)",
  member: "rgba(107, 114, 128, 0.15)",
  sitter: "rgba(34, 197, 94, 0.15)",
};

const roleSelect: React.CSSProperties = {
  padding: "0.3rem 0.5rem",
  borderRadius: "0.375rem",
  border: "1px solid var(--pf-input-border)",
  fontSize: "0.8rem",
  fontFamily: "inherit",
  cursor: "pointer",
};

const inputLabel: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--pf-text-muted)",
  marginBottom: "0.25rem",
};

const inputField: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid var(--pf-input-border)",
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
  background: "var(--pf-glass-bg)",
  color: "var(--pf-primary)",
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
  color: "var(--pf-error)",
  fontSize: "0.75rem",
  fontWeight: 600,
  border: "1px solid rgba(239, 68, 68, 0.2)",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const spinner: React.CSSProperties = {
  width: 32,
  height: 32,
  border: "3px solid var(--pf-border-strong)",
  borderTopColor: "var(--pf-primary)",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};
