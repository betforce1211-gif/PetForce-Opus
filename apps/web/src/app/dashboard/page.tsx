"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { useHousehold } from "@/lib/household-context";

export default function DashboardPage() {
  const router = useRouter();
  const { householdId, switchHousehold } = useHousehold();

  const householdsQuery = trpc.dashboard.myHouseholds.useQuery(undefined, {
    retry: 2,
    retryDelay: 500,
  });
  const dashboardQuery = trpc.dashboard.get.useQuery(
    { householdId: householdId! },
    { enabled: !!householdId }
  );

  // Auto-select first household or redirect to onboard
  useEffect(() => {
    if (!householdsQuery.data || householdId) return;

    if (householdsQuery.data.length === 0) {
      router.push("/onboard");
    } else {
      switchHousehold(householdsQuery.data[0].id);
    }
  }, [householdsQuery.data, householdId, switchHousehold, router]);

  // --- State 1: Initial query loading ---
  if (householdsQuery.isLoading) {
    return (
      <main style={pageShell}>
        <div style={centeredMessage}>
          <div style={spinner} />
          <p style={{ color: "#6B7280", margin: 0 }}>Loading your households...</p>
        </div>
      </main>
    );
  }

  // --- State 2: Query error ---
  if (householdsQuery.isError) {
    return (
      <main style={pageShell}>
        <div style={centeredMessage}>
          <div style={glassCard}>
            <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem", color: "#1E1B4B" }}>
              Could not load your households
            </h2>
            <p style={{ color: "#6B7280", margin: "0 0 1rem 0", fontSize: "0.875rem" }}>
              {householdsQuery.error?.message ?? "An unexpected error occurred."}
              {" "}Make sure the API server is running on port 3001.
            </p>
            <button onClick={() => householdsQuery.refetch()} style={actionButton}>
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  // --- State 3: No households, redirecting to onboard ---
  if (!householdsQuery.data?.length || !householdId) {
    return (
      <main style={pageShell}>
        <div style={centeredMessage}>
          <div style={spinner} />
          <p style={{ color: "#6B7280", margin: 0 }}>Redirecting to setup...</p>
        </div>
      </main>
    );
  }

  // --- State 4: Dashboard data loading ---
  if (dashboardQuery.isLoading) {
    return (
      <main style={pageShell}>
        <div style={centeredMessage}>
          <div style={spinner} />
          <p style={{ color: "#6B7280", margin: 0 }}>Loading dashboard...</p>
        </div>
      </main>
    );
  }

  // --- State 5: Dashboard data error ---
  if (dashboardQuery.isError) {
    return (
      <main style={pageShell}>
        <div style={centeredMessage}>
          <div style={glassCard}>
            <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem", color: "#1E1B4B" }}>
              Could not load dashboard
            </h2>
            <p style={{ color: "#6B7280", margin: "0 0 1rem 0", fontSize: "0.875rem" }}>
              {dashboardQuery.error?.message ?? "An unexpected error occurred."}
            </p>
            <button onClick={() => dashboardQuery.refetch()} style={actionButton}>
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  const data = dashboardQuery.data;
  if (!data) return null;

  const { household, members, pets, recentActivities } = data;
  const allHouseholds = householdsQuery.data ?? [];

  // --- State 6: Dashboard loaded ---
  return (
    <main style={pageShell}>
      <div style={dashboardLayout}>
        {/* ── Header bar ── */}
        <header style={headerBar}>
          <HouseholdSwitcher
            currentHousehold={household}
            allHouseholds={allHouseholds}
            petCount={pets.length}
            memberCount={members.length}
            onSwitch={switchHousehold}
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link href="/dashboard/add-pet" style={actionButton}>
              + Add Pet
            </Link>
            <Link href="/dashboard/log-activity" style={actionButtonOutline}>
              + Log Activity
            </Link>
            <Link href="/dashboard/settings" style={actionButtonOutline}>
              Settings
            </Link>
          </div>
        </header>

        {/* ── Content area: two columns ── */}
        <div style={contentArea}>
          {/* Left column — Pets */}
          <div style={leftColumn}>
            <div style={{ ...glassCard, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <h2 style={sectionTitle}>Pets</h2>
              {pets.length === 0 ? (
                <div style={emptyState}>
                  <span style={{ fontSize: "2.5rem" }}>🐾</span>
                  <p style={{ fontWeight: 600, margin: "0.5rem 0 0.25rem", color: "#1E1B4B" }}>No pets yet</p>
                  <p style={{ color: "#6B7280", fontSize: "0.85rem", margin: 0 }}>
                    Add your first pet to get started
                  </p>
                </div>
              ) : (
                <div style={petGrid}>
                  {pets.map((pet) => (
                    <div key={pet.id} style={petCard}>
                      <span style={{ fontSize: "2rem" }}>{speciesEmoji[pet.species] ?? "🐾"}</span>
                      <strong style={{ color: "#1E1B4B" }}>{pet.name}</strong>
                      {pet.breed && (
                        <span style={{ color: "#6B7280", fontSize: "0.8rem" }}>{pet.breed}</span>
                      )}
                      <span style={speciesBadge}>{pet.species}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column — Activity + Members */}
          <div style={rightColumn}>
            {/* Activity card */}
            <div style={{ ...glassCard, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <h2 style={sectionTitle}>Recent Activity</h2>
              {recentActivities.length === 0 ? (
                <div style={emptyState}>
                  <span style={{ fontSize: "2rem" }}>📝</span>
                  <p style={{ fontWeight: 600, margin: "0.5rem 0 0.25rem", color: "#1E1B4B" }}>No activities yet</p>
                  <p style={{ color: "#6B7280", fontSize: "0.85rem", margin: 0 }}>
                    Log an activity to start tracking
                  </p>
                </div>
              ) : (
                <div style={{ flex: 1, overflowY: "auto", marginTop: "0.25rem" }}>
                  {recentActivities.map((activity) => {
                    const pet = pets.find((p) => p.id === activity.petId);
                    const member = members.find((m) => m.id === activity.memberId);
                    return (
                      <div key={activity.id} style={activityRow}>
                        <span style={{ fontSize: "1.15rem" }}>
                          {activityTypeIcons[activity.type] ?? "📝"}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#1E1B4B" }}>
                            {activity.title}
                          </div>
                          <div style={{ color: "#9CA3AF", fontSize: "0.75rem" }}>
                            {pet?.name}{pet && member ? " \u00b7 " : ""}{member?.displayName}
                          </div>
                        </div>
                        <span style={{ color: "#9CA3AF", fontSize: "0.7rem", whiteSpace: "nowrap" }}>
                          {formatTimeAgo(new Date(activity.createdAt))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Members card */}
            <div style={glassCard}>
              <h2 style={sectionTitle}>Members</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {members.map((member) => (
                  <div key={member.id} style={memberRow}>
                    <div style={initialsCircle}>
                      {member.displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ flex: 1, fontSize: "0.875rem", color: "#1E1B4B" }}>
                      {member.displayName}
                    </span>
                    <span style={{ ...roleBadge, backgroundColor: roleBadgeColors[member.role] ?? "#6B7280" }}>
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Household Switcher ──

interface HouseholdSwitcherProps {
  currentHousehold: { id: string; name: string; theme: { primaryColor: string } };
  allHouseholds: { id: string; name: string; theme: { primaryColor: string }; petCount: number; memberCount: number }[];
  petCount: number;
  memberCount: number;
  onSwitch: (id: string) => void;
}

function HouseholdSwitcher({ currentHousehold, allHouseholds, petCount, memberCount, onSwitch }: HouseholdSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const showDropdown = allHouseholds.length > 1;

  return (
    <div ref={ref} style={{ position: "relative", display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <span style={{ fontSize: "1.5rem" }}>🐾</span>
      <div>
        <button
          onClick={() => showDropdown && setOpen((v) => !v)}
          style={{
            ...switcherButton,
            cursor: showDropdown ? "pointer" : "default",
          }}
        >
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0, color: "#1E1B4B" }}>
            {currentHousehold.name}
          </h1>
          {showDropdown && (
            <span style={{ fontSize: "0.75rem", color: "#6B7280", marginLeft: "0.35rem", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>
              ▾
            </span>
          )}
        </button>
        <p style={{ margin: 0, color: "#6B7280", fontSize: "0.8rem" }}>
          {petCount} {petCount === 1 ? "pet" : "pets"} &middot;{" "}
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </p>
      </div>

      {open && (
        <div style={switcherDropdown}>
          {allHouseholds.map((h) => (
            <button
              key={h.id}
              onClick={() => {
                onSwitch(h.id);
                setOpen(false);
              }}
              style={{
                ...switcherItem,
                backgroundColor: h.id === currentHousehold.id ? "rgba(99, 102, 241, 0.08)" : "transparent",
              }}
            >
              <span style={{ ...switcherDot, backgroundColor: h.theme.primaryColor }} />
              <span style={{ flex: 1, textAlign: "left", color: "#1E1B4B", fontWeight: h.id === currentHousehold.id ? 600 : 400 }}>
                {h.name}
              </span>
              <span style={{ color: "#9CA3AF", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                {h.petCount}🐾 {h.memberCount}👥
              </span>
            </button>
          ))}
          <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", margin: "0.25rem 0" }} />
          <button
            onClick={() => {
              setOpen(false);
              router.push("/onboard");
            }}
            style={switcherItem}
          >
            <span style={{ color: "#6366F1", fontWeight: 600, fontSize: "0.85rem" }}>+ Create New Household</span>
          </button>
          <button
            onClick={() => {
              setOpen(false);
              router.push("/join");
            }}
            style={switcherItem}
          >
            <span style={{ color: "#6366F1", fontWeight: 600, fontSize: "0.85rem" }}>Join a Household</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Utility data ──

const speciesEmoji: Record<string, string> = {
  dog: "🐕", cat: "🐈", bird: "🐦", fish: "🐟", reptile: "🦎", other: "🐾",
};

const activityTypeIcons: Record<string, string> = {
  walk: "🚶", feeding: "🍽️", vet_visit: "🏥", medication: "💊", grooming: "✂️", play: "🎾", other: "📝",
};

const roleBadgeColors: Record<string, string> = {
  owner: "#6366F1", admin: "#3B82F6", member: "#6B7280", sitter: "#22C55E",
};

function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ── Styles ──

const pageShell: React.CSSProperties = {
  height: "calc(100vh - 73px)",
  overflow: "hidden",
  background: "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 25%, #FDF2F8 50%, #FFF7ED 75%, #EEF2FF 100%)",
  fontFamily: "system-ui, sans-serif",
};

const dashboardLayout: React.CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  padding: "1.25rem 1.5rem",
  gap: "1rem",
};

const centeredMessage: React.CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "1rem",
};

const headerBar: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexShrink: 0,
};

const contentArea: React.CSSProperties = {
  flex: 1,
  display: "flex",
  gap: "1rem",
  minHeight: 0,
};

const leftColumn: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
};

const rightColumn: React.CSSProperties = {
  width: 340,
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  minHeight: 0,
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

const petGrid: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
  gap: "0.75rem",
  alignContent: "start",
};

const petCard: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  padding: "1rem",
  background: "rgba(255, 255, 255, 0.85)",
  borderRadius: "0.75rem",
  border: "1px solid rgba(255, 255, 255, 0.7)",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const speciesBadge: React.CSSProperties = {
  alignSelf: "flex-start",
  padding: "0.125rem 0.5rem",
  borderRadius: "999px",
  background: "linear-gradient(135deg, #6366F1, #818CF8)",
  color: "white",
  fontSize: "0.7rem",
  fontWeight: 600,
  textTransform: "capitalize",
  marginTop: "0.25rem",
};

const activityRow: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "0.6rem",
  padding: "0.5rem 0",
  borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
};

const memberRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.6rem",
  padding: "0.35rem 0",
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

const actionButtonOutline: React.CSSProperties = {
  padding: "0.4rem 0.85rem",
  borderRadius: "0.5rem",
  background: "rgba(255, 255, 255, 0.7)",
  color: "#6366F1",
  fontSize: "0.8rem",
  fontWeight: 600,
  textDecoration: "none",
  border: "1px solid rgba(99, 102, 241, 0.3)",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const emptyState: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  flex: 1,
  textAlign: "center",
  padding: "2rem 1rem",
};

const spinner: React.CSSProperties = {
  width: 32,
  height: 32,
  border: "3px solid rgba(99, 102, 241, 0.2)",
  borderTopColor: "#6366F1",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const switcherButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  background: "none",
  border: "none",
  padding: 0,
  fontFamily: "inherit",
};

const switcherDropdown: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 0.5rem)",
  left: 0,
  minWidth: 280,
  background: "rgba(255, 255, 255, 0.85)",
  backdropFilter: "blur(12px)",
  borderRadius: "0.875rem",
  padding: "0.375rem",
  boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
  border: "1px solid rgba(255, 255, 255, 0.6)",
  zIndex: 50,
};

const switcherItem: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.6rem",
  width: "100%",
  padding: "0.5rem 0.75rem",
  border: "none",
  background: "transparent",
  borderRadius: "0.5rem",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "0.875rem",
  transition: "background-color 0.15s",
};

const switcherDot: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  flexShrink: 0,
};
