"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { useHousehold } from "@/lib/household-context";
import { PetEditModal } from "@/components/pet-edit-modal";
import { PetAddModal } from "@/components/pet-add-modal";
import { FeedingTileContent } from "@/components/feeding-tile";
import { FeedingManageModal } from "@/components/feeding-manage-modal";

export default function DashboardPage() {
  const router = useRouter();
  const { householdId, switchHousehold } = useHousehold();
  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [showAddPet, setShowAddPet] = useState(false);
  const [showFeedingModal, setShowFeedingModal] = useState(false);

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
          <p style={{ color: "#8B8FA3", margin: 0, fontSize: "0.9rem", letterSpacing: "0.01em" }}>Loading your households...</p>
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
            <h2 style={{ margin: "0 0 0.75rem 0", fontSize: "1.3rem", color: "#1A1637", fontWeight: 700, letterSpacing: "-0.01em" }}>
              Could not load your households
            </h2>
            <p style={{ color: "#8B8FA3", margin: "0 0 1.25rem 0", fontSize: "0.875rem", lineHeight: 1.5 }}>
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
          <p style={{ color: "#8B8FA3", margin: 0, fontSize: "0.9rem", letterSpacing: "0.01em" }}>Redirecting to setup...</p>
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
          <p style={{ color: "#8B8FA3", margin: 0, fontSize: "0.9rem", letterSpacing: "0.01em" }}>Loading dashboard...</p>
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
            <h2 style={{ margin: "0 0 0.75rem 0", fontSize: "1.3rem", color: "#1A1637", fontWeight: 700, letterSpacing: "-0.01em" }}>
              Could not load dashboard
            </h2>
            <p style={{ color: "#8B8FA3", margin: "0 0 1.25rem 0", fontSize: "0.875rem", lineHeight: 1.5 }}>
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

  // Group activities by date for sidebar
  const activityGroups = groupActivitiesByDate(recentActivities);

  // --- State 6: Dashboard loaded ---
  return (
    <main style={pageShell}>
      <div style={dashboardLayout}>
        {/* ── Content: 3x3 grid + sidebar ── */}
        <div style={contentArea}>
          {/* ── Left: 3x3 tile grid ── */}
          <div style={gridArea}>
            {/* Row 1 */}
            <div style={tileStyle}>
              <div style={{ ...tileAccentBar, background: tileAccents.stats }} />
              <h2 style={sectionTitle}>
                <span style={titleEmoji}>📊</span>
                Quick Stats
              </h2>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                {[
                  { icon: "🐾", label: "Pets", value: pets.length },
                  { icon: "📋", label: "Activities", value: recentActivities.length },
                  { icon: "👥", label: "Members", value: members.length },
                  { icon: "🏠", label: "Household", value: household.name },
                ].map((stat, i, arr) => (
                  <div key={stat.label} style={{ ...statRow, borderBottom: i < arr.length - 1 ? "1px solid rgba(99, 102, 241, 0.06)" : "none" }}>
                    <span style={statIcon}>{stat.icon}</span>
                    <span style={statLabel}>{stat.label}</span>
                    <span style={statValue}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={tileStyle}>
              <div style={{ ...tileAccentBar, background: tileAccents.pets }} />
              <h2 style={sectionTitle}>
                <span style={titleEmoji}>🐾</span>
                Pets
              </h2>
              {pets.length === 0 ? (
                <div style={emptyState}>
                  <span style={emptyStateIcon}>🐾</span>
                  <p style={emptyStateTitle}>No pets yet</p>
                  <p style={emptyStateSubtext}>Add your first pet to get started</p>
                </div>
              ) : (
                <div style={petGrid}>
                  {pets.map((pet) => (
                    <div key={pet.id} onClick={() => setEditingPetId(pet.id)} style={{ cursor: "pointer" }}>
                      <div style={petCard}>
                        {pet.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={pet.avatarUrl} alt={pet.name} style={petAvatarImg} />
                        ) : (
                          <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>{speciesEmoji[pet.species] ?? "🐾"}</span>
                        )}
                        <strong style={petCardName}>{pet.name}</strong>
                        {pet.breed && <span style={petCardBreed}>{pet.breed}</span>}
                        <span style={speciesBadge}>{pet.species}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => setShowAddPet(true)} style={{ ...tileLink, background: "none", border: "none", cursor: "pointer" }}>+ Add Pet</button>
            </div>

            <div style={tileStyle}>
              <div style={{ ...tileAccentBar, background: tileAccents.health }} />
              <h2 style={sectionTitle}>
                <span style={titleEmoji}>🏥</span>
                Health
              </h2>
              <div style={placeholderBody}>
                <div style={placeholderIconWrap}>
                  <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>🏥</span>
                </div>
                <p style={placeholderLabel}>Vet visits & medical records</p>
                <span style={comingSoonBadge}>Coming Soon</span>
              </div>
            </div>

            {/* Row 2 */}
            <div style={tileStyle}>
              <div style={{ ...tileAccentBar, background: tileAccents.members }} />
              <h2 style={sectionTitle}>
                <span style={titleEmoji}>👥</span>
                Members
              </h2>
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {members.map((member) => (
                  <div key={member.id} style={memberRow}>
                    <div style={initialsCircle}>
                      {member.displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <span style={memberName}>
                      {member.displayName}
                    </span>
                    <span style={{ ...roleBadge, backgroundColor: roleBadgeColors[member.role] ?? "#6B7280" }}>
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
              <Link href="/dashboard/settings" style={tileLink}>Invite Member</Link>
            </div>

            <div style={tileStyle}>
              <div style={{ ...tileAccentBar, background: tileAccents.feeding }} />
              <h2 style={sectionTitle}>
                <span style={titleEmoji}>🍽️</span>
                Feeding
              </h2>
              <FeedingTileContent
                householdId={householdId}
                onManage={() => setShowFeedingModal(true)}
              />
            </div>

            <div style={tileStyle}>
              <div style={{ ...tileAccentBar, background: tileAccents.reminders }} />
              <h2 style={sectionTitle}>
                <span style={titleEmoji}>🔔</span>
                Reminders
              </h2>
              <div style={placeholderBody}>
                <div style={placeholderIconWrap}>
                  <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>🔔</span>
                </div>
                <p style={placeholderLabel}>Upcoming tasks & alerts</p>
                <span style={comingSoonBadge}>Coming Soon</span>
              </div>
            </div>

            {/* Row 3 */}
            <div style={tileStyle}>
              <div style={{ ...tileAccentBar, background: tileAccents.actions }} />
              <h2 style={sectionTitle}>
                <span style={titleEmoji}>⚡</span>
                Quick Actions
              </h2>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.6rem", justifyContent: "center" }}>
                <Link href="/dashboard/log-activity" style={quickActionBtn}>📋 Log Activity</Link>
                <button type="button" onClick={() => setShowAddPet(true)} style={{ ...quickActionBtn, cursor: "pointer", fontFamily: "inherit" }}>🐾 Add Pet</button>
                <Link href="/dashboard/settings" style={quickActionBtn}>⚙️ Settings</Link>
              </div>
            </div>

            <div style={tileStyle}>
              <div style={{ ...tileAccentBar, background: tileAccents.calendar }} />
              <h2 style={sectionTitle}>
                <span style={titleEmoji}>📅</span>
                Calendar
              </h2>
              <div style={placeholderBody}>
                <div style={placeholderIconWrap}>
                  <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>📅</span>
                </div>
                <p style={placeholderLabel}>Appointments & events</p>
                <span style={comingSoonBadge}>Coming Soon</span>
              </div>
            </div>

            <div style={tileStyle}>
              <div style={{ ...tileAccentBar, background: tileAccents.notes }} />
              <h2 style={sectionTitle}>
                <span style={titleEmoji}>📝</span>
                Notes
              </h2>
              <div style={placeholderBody}>
                <div style={placeholderIconWrap}>
                  <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>📝</span>
                </div>
                <p style={placeholderLabel}>Pet journal & notes</p>
                <span style={comingSoonBadge}>Coming Soon</span>
              </div>
            </div>
          </div>

          {/* ── Right: Activity timeline sidebar ── */}
          <aside style={sidebarStyle}>
            <div style={sidebarAccentBar} />
            <h2 style={sidebarTitle}>
              <span style={titleEmoji}>📋</span>
              Activity Timeline
            </h2>
            {recentActivities.length === 0 ? (
              <div style={{ ...emptyState, padding: "2rem 0.75rem" }}>
                <span style={emptyStateIcon}>📝</span>
                <p style={emptyStateTitle}>No activities yet</p>
                <p style={emptyStateSubtext}>Log an activity to start tracking</p>
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: "auto" }}>
                {activityGroups.map((group) => (
                  <div key={group.label}>
                    <div style={dateGroupHeader}>{group.label}</div>
                    {group.activities.map((activity) => {
                      const pet = pets.find((p) => p.id === activity.petId);
                      const member = members.find((m) => m.id === activity.memberId);
                      return (
                        <div key={activity.id} style={activityRow}>
                          <div style={activityIconWrap}>
                            <span style={{ fontSize: "0.9rem", lineHeight: 1 }}>
                              {activityTypeIcons[activity.type] ?? "📝"}
                            </span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={activityTitle}>
                              {activity.title}
                            </div>
                            <div style={activityMeta}>
                              {pet?.name}{pet && member ? " \u00b7 " : ""}{member?.displayName}
                            </div>
                          </div>
                          <span style={activityTime}>
                            {formatTimeShort(new Date(activity.createdAt))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
            <Link href="/dashboard/log-activity" style={tileLink}>+ Log Activity</Link>
          </aside>
        </div>
      </div>
      {editingPetId && (
        <PetEditModal petId={editingPetId} onClose={() => setEditingPetId(null)} />
      )}
      {showAddPet && (
        <PetAddModal onClose={() => setShowAddPet(false)} />
      )}
      {showFeedingModal && (
        <FeedingManageModal
          householdId={householdId}
          onClose={() => setShowFeedingModal(false)}
        />
      )}
    </main>
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
  owner: "#5B4FCF", admin: "#3B82F6", member: "#7C7F95", sitter: "#10B981",
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

function formatTimeShort(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  petId: string | null;
  memberId: string | null;
  createdAt: string | Date;
}

function groupActivitiesByDate(activities: ActivityItem[]): { label: string; activities: ActivityItem[] }[] {
  const sorted = [...activities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const groups: { label: string; activities: ActivityItem[] }[] = [];
  for (const activity of sorted) {
    const label = formatDateLabel(new Date(activity.createdAt));
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.activities.push(activity);
    } else {
      groups.push({ label, activities: [activity] });
    }
  }
  return groups;
}

// ── Tile accent color mapping (unique gradient per tile) ──

const tileAccents = {
  stats:     "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
  pets:      "linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)",
  health:    "linear-gradient(135deg, #EC4899 0%, #F472B6 100%)",
  members:   "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)",
  feeding:   "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)",
  reminders: "linear-gradient(135deg, #EF4444 0%, #F87171 100%)",
  actions:   "linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)",
  calendar:  "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
  notes:     "linear-gradient(135deg, #6366F1 0%, #EC4899 100%)",
};

// ── Styles ──

const pageShell: React.CSSProperties = {
  height: "calc(100vh - 57px)",
  overflow: "hidden",
  background: "linear-gradient(145deg, #EEEDFA 0%, #F0EEFB 20%, #F5F0FA 40%, #FAF0F5 60%, #FDF5F0 80%, #EEEDFA 100%)",
  fontFamily: "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif",
};

const dashboardLayout: React.CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  padding: "1rem 1.75rem",
};

const centeredMessage: React.CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "1.25rem",
};

const contentArea: React.CSSProperties = {
  flex: 1,
  display: "flex",
  gap: "1.25rem",
  minHeight: 0,
};

const gridArea: React.CSSProperties = {
  flex: 1,
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gridTemplateRows: "repeat(3, 1fr)",
  gap: "0.875rem",
  minHeight: 0,
};

const sidebarStyle: React.CSSProperties = {
  width: 320,
  flexShrink: 0,
  background: "rgba(255, 255, 255, 0.65)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: "1rem",
  padding: "1.5rem 1.25rem 1.25rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 24px rgba(99, 102, 241, 0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
  border: "1px solid rgba(255, 255, 255, 0.5)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const sidebarAccentBar: React.CSSProperties = {
  height: 3,
  background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)",
  margin: "-1.5rem -1.25rem 1.25rem -1.25rem",
  borderTopLeftRadius: "1rem",
  borderTopRightRadius: "1rem",
};

const tileStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.6)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: "1rem",
  padding: "1.25rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 24px rgba(99, 102, 241, 0.05), inset 0 1px 0 rgba(255,255,255,0.7)",
  border: "1px solid rgba(255, 255, 255, 0.5)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  transition: "box-shadow 0.25s ease, transform 0.25s ease",
};

const tileAccentBar: React.CSSProperties = {
  height: 3,
  background: "linear-gradient(135deg, #6366F1, #EC4899)",
  margin: "-1.25rem -1.25rem 1rem -1.25rem",
  borderTopLeftRadius: "1rem",
  borderTopRightRadius: "1rem",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 700,
  margin: "0 0 0.75rem",
  color: "#1A1637",
  textAlign: "center",
  letterSpacing: "-0.01em",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5rem",
};

const sidebarTitle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 700,
  margin: "0 0 1rem",
  color: "#1A1637",
  textAlign: "center",
  letterSpacing: "-0.01em",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5rem",
};

const titleEmoji: React.CSSProperties = {
  fontSize: "1.1rem",
  lineHeight: 1,
};

const statRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.625rem",
  padding: "0.5rem 0.25rem",
};

const statIcon: React.CSSProperties = {
  fontSize: "1.35rem",
  width: "2rem",
  textAlign: "center",
  lineHeight: 1,
};

const statLabel: React.CSSProperties = {
  flex: 1,
  fontSize: "0.825rem",
  color: "#7C7F95",
  fontWeight: 500,
  letterSpacing: "0.01em",
};

const statValue: React.CSSProperties = {
  fontSize: "1.05rem",
  fontWeight: 700,
  color: "#1A1637",
  letterSpacing: "-0.01em",
};

const tileLink: React.CSSProperties = {
  marginTop: "auto",
  paddingTop: "0.75rem",
  borderTop: "1px solid rgba(99, 102, 241, 0.08)",
  color: "#6366F1",
  fontSize: "0.8rem",
  fontWeight: 600,
  textDecoration: "none",
  textAlign: "center",
  letterSpacing: "0.01em",
  transition: "color 0.2s ease",
};

const placeholderBody: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5rem",
  textAlign: "center",
};

const placeholderIconWrap: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: "50%",
  background: "rgba(99, 102, 241, 0.06)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "0.25rem",
};

const placeholderLabel: React.CSSProperties = {
  color: "#A5A8BA",
  fontSize: "0.8rem",
  margin: 0,
  fontWeight: 500,
  letterSpacing: "0.01em",
};

const comingSoonBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "0.2rem 0.65rem",
  borderRadius: "999px",
  background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08))",
  color: "#6366F1",
  fontSize: "0.65rem",
  fontWeight: 600,
  marginTop: "0.25rem",
  letterSpacing: "0.03em",
  textTransform: "uppercase",
};

const quickActionBtn: React.CSSProperties = {
  display: "block",
  padding: "0.6rem 0.875rem",
  borderRadius: "0.625rem",
  background: "rgba(99, 102, 241, 0.05)",
  color: "#1A1637",
  fontSize: "0.825rem",
  fontWeight: 500,
  textDecoration: "none",
  textAlign: "center",
  border: "1px solid rgba(99, 102, 241, 0.1)",
  transition: "all 0.2s ease",
  letterSpacing: "0.01em",
};

const dateGroupHeader: React.CSSProperties = {
  fontSize: "0.675rem",
  fontWeight: 700,
  color: "#6366F1",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  padding: "0.75rem 0 0.375rem",
  borderBottom: "1px solid rgba(99, 102, 241, 0.08)",
  marginBottom: "0.375rem",
};

const glassCard: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.65)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: "1rem",
  padding: "2rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 24px rgba(99, 102, 241, 0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
  border: "1px solid rgba(255, 255, 255, 0.5)",
  maxWidth: 400,
  textAlign: "center",
};

const petGrid: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
  gap: "0.6rem",
  alignContent: "start",
};

const petCard: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.2rem",
  padding: "0.75rem",
  background: "rgba(255, 255, 255, 0.8)",
  borderRadius: "0.75rem",
  border: "1px solid rgba(139, 92, 246, 0.1)",
  boxShadow: "0 1px 4px rgba(99, 102, 241, 0.05)",
  transition: "all 0.2s ease",
  alignItems: "flex-start",
  cursor: "pointer",
};

const petAvatarImg: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  objectFit: "cover",
  border: "2px solid rgba(139, 92, 246, 0.15)",
};

const petCardName: React.CSSProperties = {
  color: "#1A1637",
  fontSize: "0.85rem",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  marginTop: "0.15rem",
};

const petCardBreed: React.CSSProperties = {
  color: "#8B8FA3",
  fontSize: "0.72rem",
  fontWeight: 500,
  letterSpacing: "0.01em",
};

const speciesBadge: React.CSSProperties = {
  alignSelf: "flex-start",
  padding: "0.15rem 0.55rem",
  borderRadius: "999px",
  background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
  color: "white",
  fontSize: "0.65rem",
  fontWeight: 600,
  textTransform: "capitalize",
  marginTop: "0.3rem",
  letterSpacing: "0.02em",
};

const activityRow: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "0.75rem",
  padding: "0.6rem 0.25rem",
  borderBottom: "1px solid rgba(99, 102, 241, 0.05)",
  transition: "background-color 0.15s ease",
  borderRadius: "0.5rem",
  margin: "0 -0.25rem",
};

const activityIconWrap: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "0.5rem",
  background: "rgba(99, 102, 241, 0.06)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const activityTitle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "0.8rem",
  color: "#1A1637",
  letterSpacing: "-0.005em",
  lineHeight: 1.4,
};

const activityMeta: React.CSSProperties = {
  color: "#A5A8BA",
  fontSize: "0.7rem",
  fontWeight: 500,
  marginTop: "0.1rem",
  letterSpacing: "0.01em",
};

const activityTime: React.CSSProperties = {
  color: "#A5A8BA",
  fontSize: "0.65rem",
  whiteSpace: "nowrap",
  fontWeight: 500,
  letterSpacing: "0.01em",
  marginTop: "0.1rem",
};

const memberRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.625rem",
  padding: "0.4rem 0.25rem",
  borderRadius: "0.5rem",
  transition: "background-color 0.15s ease",
};

const memberName: React.CSSProperties = {
  flex: 1,
  fontSize: "0.85rem",
  color: "#1A1637",
  fontWeight: 500,
  letterSpacing: "-0.005em",
};

const initialsCircle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 17,
  background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  fontSize: "0.7rem",
  flexShrink: 0,
  letterSpacing: "0.02em",
  boxShadow: "0 2px 8px rgba(99, 102, 241, 0.2)",
};

const roleBadge: React.CSSProperties = {
  padding: "0.15rem 0.55rem",
  borderRadius: "999px",
  color: "white",
  fontSize: "0.65rem",
  fontWeight: 600,
  textTransform: "capitalize",
  letterSpacing: "0.02em",
};

const actionButton: React.CSSProperties = {
  padding: "0.5rem 1.1rem",
  borderRadius: "0.625rem",
  background: "linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)",
  color: "white",
  fontSize: "0.825rem",
  fontWeight: 600,
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
  whiteSpace: "nowrap",
  letterSpacing: "0.01em",
  boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
  transition: "all 0.2s ease",
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

const emptyStateIcon: React.CSSProperties = {
  fontSize: "2rem",
  lineHeight: 1,
  marginBottom: "0.25rem",
  opacity: 0.8,
};

const emptyStateTitle: React.CSSProperties = {
  fontWeight: 600,
  margin: "0.5rem 0 0.25rem",
  color: "#1A1637",
  fontSize: "0.9rem",
  letterSpacing: "-0.01em",
};

const emptyStateSubtext: React.CSSProperties = {
  color: "#A5A8BA",
  fontSize: "0.8rem",
  margin: 0,
  fontWeight: 500,
  letterSpacing: "0.01em",
};

const spinner: React.CSSProperties = {
  width: 36,
  height: 36,
  border: "3px solid rgba(99, 102, 241, 0.15)",
  borderTopColor: "#6366F1",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

