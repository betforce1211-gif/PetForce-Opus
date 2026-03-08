"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { useHousehold } from "@/lib/household-context";
import { PetEditModal } from "@/components/pet-edit-modal";
import { PetAddModal } from "@/components/pet-add-modal";
import { FeedingTileContent } from "@/components/feeding-tile";
import { FeedingManageModal } from "@/components/feeding-manage-modal";
import { CalendarTileContent } from "@/components/calendar-tile";
import { CalendarModal } from "@/components/calendar-modal";
import { CalendarAddEventModal } from "@/components/calendar-add-event-modal";
import { HealthTileContent } from "@/components/health-tile";
import { HealthModal } from "@/components/health-modal";
import { FinanceTileContent } from "@/components/finance-tile";
import { FinanceModal } from "@/components/finance-modal";
import { ReportingTileContent } from "@/components/reporting-tile";
import { ReportingModal } from "@/components/reporting-modal";
import { NotesTileContent } from "@/components/notes-tile";
import { NotesModal } from "@/components/notes-modal";
import { GamificationTileContent } from "@/components/gamification-tile";
import { GamificationModal } from "@/components/gamification-modal";
import { TodayTasksSidebar } from "@/components/today-tasks-sidebar";
import { useTrackEvent } from "@/lib/use-track-event";
import { ErrorBoundary } from "@/components/error-boundary";

export default function DashboardPage() {
  const router = useRouter();
  const { householdId, switchHousehold, clearHousehold } = useHousehold();
  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [showAddPet, setShowAddPet] = useState(false);
  const [showFeedingModal, setShowFeedingModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showReportingModal, setShowReportingModal] = useState(false);
  const [showGamificationModal, setShowGamificationModal] = useState(false);
  const trackEvent = useTrackEvent();
  const trackedView = useRef(false);

  const householdsQuery = trpc.dashboard.myHouseholds.useQuery(undefined, {
    retry: 2,
    retryDelay: 500,
  });
  const isValidHousehold = !!householdId && !!householdsQuery.data?.some((h) => h.id === householdId);
  const dashboardQuery = trpc.dashboard.get.useQuery(
    { householdId: householdId! },
    { enabled: isValidHousehold }
  );

  // Auto-select first household or redirect to onboard
  useEffect(() => {
    if (!householdsQuery.data) return;

    if (householdsQuery.data.length === 0) {
      // Don't redirect while a refetch is in flight — cache may be stale
      if (householdsQuery.isFetching) return;
      // Clear stale householdId (e.g. from previous user session) and redirect
      if (householdId) clearHousehold();
      router.push("/onboard");
    } else if (!householdId) {
      switchHousehold(householdsQuery.data[0].id);
    } else {
      // Validate that the stored householdId is still valid for this user
      const valid = householdsQuery.data.some((h) => h.id === householdId);
      if (!valid) {
        switchHousehold(householdsQuery.data[0].id);
      }
    }
  }, [householdsQuery.data, householdsQuery.isFetching, householdId, switchHousehold, clearHousehold, router]);

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

  // Track dashboard view once per mount
  if (!trackedView.current) {
    trackedView.current = true;
    trackEvent("dashboard.viewed", { petCount: pets.length, memberCount: members.length });
  }

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

            <div style={{ ...tileStyle, cursor: "pointer" }} onClick={() => { trackEvent("tile.opened", { tile: "health" }); setShowHealthModal(true); }}>
              <div style={{ ...tileAccentBar, background: tileAccents.health }} />
              <h2 style={sectionTitle}>
                <span style={titleEmoji}>🏥</span>
                Health
              </h2>
              <ErrorBoundary>
                <HealthTileContent
                  householdId={householdId}
                  onManage={() => setShowHealthModal(true)}
                />
              </ErrorBoundary>
            </div>

            {/* Row 2 */}
            <div style={tileStyle}>
              <div style={{ ...tileAccentBar, background: tileAccents.gamification }} />
              <h2 style={sectionTitle}>
                <span style={titleEmoji}>{"\uD83C\uDFC6"}</span>
                Gamification
              </h2>
              <ErrorBoundary>
                <GamificationTileContent
                  householdId={householdId}
                  onManage={() => { trackEvent("tile.opened", { tile: "gamification" }); setShowGamificationModal(true); }}
                />
              </ErrorBoundary>
            </div>

            <div style={tileStyle}>
              <div style={{ ...tileAccentBar, background: tileAccents.feeding }} />
              <h2 style={sectionTitle}>
                <span style={titleEmoji}>🍽️</span>
                Feeding
              </h2>
              <ErrorBoundary>
                <FeedingTileContent
                  householdId={householdId}
                  onManage={() => setShowFeedingModal(true)}
                />
              </ErrorBoundary>
            </div>

            <div style={{ ...tileStyle, cursor: "pointer" }} onClick={() => { trackEvent("tile.opened", { tile: "finance" }); setShowFinanceModal(true); }}>
              <div style={{ ...tileAccentBar, background: tileAccents.finance }} />
              <h2 style={sectionTitle}>
                <span style={titleEmoji}>{"\uD83D\uDCB0"}</span>
                Finance
              </h2>
              <ErrorBoundary>
                <FinanceTileContent
                  householdId={householdId}
                  onManage={() => setShowFinanceModal(true)}
                />
              </ErrorBoundary>
            </div>

            {/* Row 3 */}
            {/* Quick Actions — preserved for future custom dashboard
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
            */}
            <div style={{ ...tileStyle, cursor: "pointer" }} onClick={() => { trackEvent("tile.opened", { tile: "reporting" }); setShowReportingModal(true); }}>
              <div style={{ ...tileAccentBar, background: tileAccents.reporting }} />
              <h2 style={sectionTitle}>
                <span style={titleEmoji}>{"\uD83D\uDCCA"}</span>
                Reporting
              </h2>
              <ErrorBoundary>
                <ReportingTileContent
                  householdId={householdId}
                  onManage={() => setShowReportingModal(true)}
                />
              </ErrorBoundary>
            </div>

            <div style={{ ...tileStyle, cursor: "pointer" }} onClick={() => { trackEvent("tile.opened", { tile: "calendar" }); setShowCalendarModal(true); }}>
              <div style={{ ...tileAccentBar, background: tileAccents.calendar }} />
              <h2 style={sectionTitle}>
                <span style={titleEmoji}>📅</span>
                Calendar
              </h2>
              <ErrorBoundary>
                <CalendarTileContent householdId={householdId} onAddEvent={() => setShowAddEventModal(true)} />
              </ErrorBoundary>
            </div>

            <div style={{ ...tileStyle, cursor: "pointer" }} onClick={() => { trackEvent("tile.opened", { tile: "notes" }); setShowNotesModal(true); }}>
              <div style={{ ...tileAccentBar, background: tileAccents.notes }} />
              <h2 style={sectionTitle}>
                <span style={titleEmoji}>📝</span>
                Notes
              </h2>
              <ErrorBoundary>
                <NotesTileContent
                  householdId={householdId}
                  onManage={() => setShowNotesModal(true)}
                />
              </ErrorBoundary>
            </div>
          </div>

          {/* ── Right: Today's Tasks sidebar ── */}
          <ErrorBoundary>
            <TodayTasksSidebar
              householdId={householdId}
              pets={pets}
              onOpenHealth={() => setShowHealthModal(true)}
              onOpenFeeding={() => setShowFeedingModal(true)}
            />
          </ErrorBoundary>
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
      {showCalendarModal && (
        <CalendarModal
          householdId={householdId}
          onClose={() => setShowCalendarModal(false)}
        />
      )}
      {showHealthModal && (
        <HealthModal
          householdId={householdId}
          onClose={() => setShowHealthModal(false)}
        />
      )}
      {showFinanceModal && (
        <FinanceModal
          householdId={householdId}
          onClose={() => setShowFinanceModal(false)}
        />
      )}
      {showNotesModal && (
        <NotesModal
          householdId={householdId}
          onClose={() => setShowNotesModal(false)}
        />
      )}
      {showReportingModal && (
        <ReportingModal
          householdId={householdId}
          onClose={() => setShowReportingModal(false)}
        />
      )}
      {showGamificationModal && (
        <GamificationModal
          householdId={householdId}
          onClose={() => setShowGamificationModal(false)}
        />
      )}
      {showAddEventModal && (
        <CalendarAddEventModal
          householdId={householdId}
          defaultDate={new Date().toISOString().split("T")[0]}
          onClose={() => setShowAddEventModal(false)}
          onCreated={() => setShowAddEventModal(false)}
        />
      )}
    </main>
  );
}

// ── Utility data ──

const speciesEmoji: Record<string, string> = {
  dog: "🐕", cat: "🐈", bird: "🐦", fish: "🐟", reptile: "🦎", other: "🐾",
};

// ── Tile accent color mapping (unique gradient per tile) ──

const tileAccents = {
  stats:     "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
  pets:      "linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)",
  health:    "linear-gradient(135deg, #EC4899 0%, #F472B6 100%)",
  members:   "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)",
  feeding:   "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)",
  finance:   "linear-gradient(135deg, #10B981 0%, #059669 100%)",
  actions:   "linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)",
  reporting: "linear-gradient(135deg, #F97316 0%, #FB923C 100%)",
  calendar:     "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
  notes:        "linear-gradient(135deg, #6366F1 0%, #EC4899 100%)",
  gamification: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
};

// ── Styles ──

const pageShell: React.CSSProperties = {
  height: "calc(100vh - 45px)",
  overflow: "hidden",
  background: "linear-gradient(145deg, #EEEDFA 0%, #F0EEFB 20%, #F5F0FA 40%, #FAF0F5 60%, #FDF5F0 80%, #EEEDFA 100%)",
  fontFamily: "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif",
};

const dashboardLayout: React.CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  padding: "0.5rem 1rem",
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
  gap: "0.75rem",
  minHeight: 0,
};

const gridArea: React.CSSProperties = {
  flex: 1,
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gridTemplateRows: "repeat(3, 1fr)",
  gap: "0.625rem",
  minHeight: 0,
};

const tileStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.6)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: "0.75rem",
  padding: "0.875rem",
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
  margin: "-0.875rem -0.875rem 0.625rem -0.875rem",
  borderTopLeftRadius: "0.75rem",
  borderTopRightRadius: "0.75rem",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "0.9rem",
  fontWeight: 700,
  margin: "0 0 0.5rem",
  color: "#1A1637",
  textAlign: "center",
  letterSpacing: "-0.01em",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.4rem",
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

