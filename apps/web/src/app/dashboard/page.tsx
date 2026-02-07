"use client";

import { useEffect } from "react";
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
      <main style={containerStyle}>
        <p style={{ color: "#6B7280" }}>Loading your households...</p>
      </main>
    );
  }

  // --- State 2: Query error ---
  if (householdsQuery.isError) {
    return (
      <main style={containerStyle}>
        <div style={errorBoxStyle}>
          <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem" }}>
            Could not load your households
          </h2>
          <p style={{ color: "#6B7280", margin: "0 0 1rem 0", fontSize: "0.875rem" }}>
            {householdsQuery.error?.message ?? "An unexpected error occurred."}
            {" "}Make sure the API server is running on port 3001.
          </p>
          <button
            onClick={() => householdsQuery.refetch()}
            style={retryButtonStyle}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  // --- State 3: No households, redirecting to onboard ---
  if (!householdsQuery.data?.length || !householdId) {
    return (
      <main style={containerStyle}>
        <p style={{ color: "#6B7280" }}>Redirecting to setup...</p>
      </main>
    );
  }

  // --- State 4: Dashboard data loading ---
  if (dashboardQuery.isLoading) {
    return (
      <main style={containerStyle}>
        <p style={{ color: "#6B7280" }}>Loading dashboard...</p>
      </main>
    );
  }

  // --- State 5: Dashboard data error ---
  if (dashboardQuery.isError) {
    return (
      <main style={containerStyle}>
        <div style={errorBoxStyle}>
          <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem" }}>
            Could not load dashboard
          </h2>
          <p style={{ color: "#6B7280", margin: "0 0 1rem 0", fontSize: "0.875rem" }}>
            {dashboardQuery.error?.message ?? "An unexpected error occurred."}
          </p>
          <button
            onClick={() => dashboardQuery.refetch()}
            style={retryButtonStyle}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const data = dashboardQuery.data;
  if (!data) return null;

  const { household, members, pets, recentActivities } = data;

  // --- State 6: Dashboard loaded ---
  return (
    <main style={containerStyle}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: household.theme.primaryColor,
            marginBottom: "0.75rem",
          }}
        />
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>{household.name}</h1>
        <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", color: "#6B7280" }}>
          <span>🐾 {pets.length} {pets.length === 1 ? "pet" : "pets"}</span>
          <span>👥 {members.length} {members.length === 1 ? "member" : "members"}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "2rem" }}>
        {/* Main content */}
        <div>
          {/* Pets section */}
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>Pets</h2>
              <Link href="/dashboard/add-pet" style={linkButtonStyle}>
                + Add Pet
              </Link>
            </div>
            {pets.length === 0 ? (
              <div style={emptyStateStyle}>
                <span style={{ fontSize: "2.5rem" }}>🐾</span>
                <p style={{ fontWeight: 600 }}>No pets yet</p>
                <p style={{ color: "#6B7280", fontSize: "0.875rem" }}>Add your first pet to get started</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
                {pets.map((pet) => (
                  <div key={pet.id} style={petCardStyle}>
                    <span style={{ fontSize: "2rem" }}>{speciesEmoji[pet.species] ?? "🐾"}</span>
                    <strong>{pet.name}</strong>
                    {pet.breed && <span style={{ color: "#6B7280", fontSize: "0.875rem" }}>{pet.breed}</span>}
                    <span style={speciesBadgeStyle}>{pet.species}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity feed */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>Recent Activity</h2>
              <Link href="/dashboard/log-activity" style={linkButtonStyle}>
                + Log Activity
              </Link>
            </div>
            {recentActivities.length === 0 ? (
              <div style={emptyStateStyle}>
                <span style={{ fontSize: "2.5rem" }}>📝</span>
                <p style={{ fontWeight: 600 }}>No activities yet</p>
                <p style={{ color: "#6B7280", fontSize: "0.875rem" }}>Log an activity to start tracking</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {recentActivities.map((activity) => {
                  const pet = pets.find((p) => p.id === activity.petId);
                  const member = members.find((m) => m.id === activity.memberId);
                  return (
                    <div key={activity.id} style={activityRowStyle}>
                      <span style={{ fontSize: "1.25rem" }}>
                        {activityTypeIcons[activity.type] ?? "📝"}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{activity.title}</div>
                        <div style={{ color: "#6B7280", fontSize: "0.75rem" }}>
                          {pet?.name}{pet && member ? " • " : ""}{member?.displayName}
                        </div>
                      </div>
                      <span style={{ color: "#6B7280", fontSize: "0.75rem" }}>
                        {formatTimeAgo(new Date(activity.createdAt))}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Members sidebar */}
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Members</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {members.map((member) => (
              <div key={member.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0" }}>
                <div style={initialsCircleStyle}>
                  {member.displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <span style={{ flex: 1 }}>{member.displayName}</span>
                <span style={{ ...roleBadgeStyle, backgroundColor: roleBadgeColors[member.role] ?? "#6B7280" }}>
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

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

const containerStyle: React.CSSProperties = {
  maxWidth: 1024,
  margin: "0 auto",
  padding: "2rem 1.5rem",
  fontFamily: "system-ui, sans-serif",
};

const linkButtonStyle: React.CSSProperties = {
  padding: "0.375rem 0.75rem",
  borderRadius: "0.375rem",
  backgroundColor: "#6366F1",
  color: "white",
  fontSize: "0.875rem",
  fontWeight: 600,
  textDecoration: "none",
};

const emptyStateStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "0.5rem",
  padding: "2rem",
  backgroundColor: "#FAFAFA",
  borderRadius: "0.5rem",
  textAlign: "center",
};

const petCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  padding: "1rem",
  backgroundColor: "#FFFFFF",
  borderRadius: "0.5rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const speciesBadgeStyle: React.CSSProperties = {
  alignSelf: "flex-start",
  padding: "0.125rem 0.5rem",
  borderRadius: "0.25rem",
  backgroundColor: "#6366F1",
  color: "white",
  fontSize: "0.75rem",
  textTransform: "capitalize",
};

const activityRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "0.75rem",
  padding: "0.625rem 0",
  borderBottom: "1px solid #E5E7EB",
};

const initialsCircleStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: "#6366F1",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  fontSize: "0.75rem",
};

const roleBadgeStyle: React.CSSProperties = {
  padding: "0.125rem 0.5rem",
  borderRadius: "0.25rem",
  color: "white",
  fontSize: "0.75rem",
  textTransform: "capitalize",
};

const errorBoxStyle: React.CSSProperties = {
  padding: "1.5rem",
  backgroundColor: "#FEF2F2",
  border: "1px solid #FECACA",
  borderRadius: "0.5rem",
};

const retryButtonStyle: React.CSSProperties = {
  padding: "0.5rem 1rem",
  borderRadius: "0.375rem",
  backgroundColor: "#6366F1",
  color: "white",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
};
