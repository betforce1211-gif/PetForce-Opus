"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { type TileId, TILE_MAP, TILE_DEFINITIONS } from "@/lib/dashboard-tiles";
import { useDashboardLayout } from "@/lib/use-dashboard-layout";

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
  const [isCustomizing, setIsCustomizing] = useState(false);
  const trackEvent = useTrackEvent();
  const trackedView = useRef(false);

  const { layout, visibleTiles, moveTile, toggleTile, resetLayout } = useDashboardLayout();

  // Drag-and-drop state
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    dragIndexRef.current = index;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      const fromIndex = dragIndexRef.current;
      if (fromIndex !== null && fromIndex !== toIndex) {
        // Map visible indices to layout.order indices
        const fromTile = visibleTiles[fromIndex];
        const toTile = visibleTiles[toIndex];
        const fromOrderIdx = layout.order.indexOf(fromTile);
        const toOrderIdx = layout.order.indexOf(toTile);
        moveTile(fromOrderIdx, toOrderIdx);
      }
      dragIndexRef.current = null;
      setDragOverIndex(null);
    },
    [visibleTiles, layout.order, moveTile]
  );

  const handleDragEnd = useCallback(() => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }, []);

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
          <p style={{ color: "var(--pf-text-secondary)", margin: 0, fontSize: "0.9rem", letterSpacing: "0.01em" }}>Loading your households...</p>
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
            <h2 style={{ margin: "0 0 0.75rem 0", fontSize: "1.3rem", color: "var(--pf-text)", fontWeight: 700, letterSpacing: "-0.01em" }}>
              Could not load your households
            </h2>
            <p style={{ color: "var(--pf-text-secondary)", margin: "0 0 1.25rem 0", fontSize: "0.875rem", lineHeight: 1.5 }}>
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
          <p style={{ color: "var(--pf-text-secondary)", margin: 0, fontSize: "0.9rem", letterSpacing: "0.01em" }}>Redirecting to setup...</p>
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
          <p style={{ color: "var(--pf-text-secondary)", margin: 0, fontSize: "0.9rem", letterSpacing: "0.01em" }}>Loading dashboard...</p>
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
            <h2 style={{ margin: "0 0 0.75rem 0", fontSize: "1.3rem", color: "var(--pf-text)", fontWeight: 700, letterSpacing: "-0.01em" }}>
              Could not load dashboard
            </h2>
            <p style={{ color: "var(--pf-text-secondary)", margin: "0 0 1.25rem 0", fontSize: "0.875rem", lineHeight: 1.5 }}>
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

  // Compute grid columns: 3 cols for 4+ tiles, 2 for 2-3, 1 for 1
  const colCount = visibleTiles.length >= 4 ? 3 : visibleTiles.length >= 2 ? 2 : 1;
  const rowCount = Math.ceil(visibleTiles.length / colCount);

  // At this point householdId is guaranteed non-null (guarded above)
  const activeHouseholdId = householdId as string;

  /** Render the content for a given tile ID */
  function renderTileContent(tileId: TileId) {
    switch (tileId) {
      case "stats":
        return (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            {[
              { icon: "\uD83D\uDC3E", label: "Pets", value: pets.length },
              { icon: "\uD83D\uDCCB", label: "Activities", value: recentActivities.length },
              { icon: "\uD83D\uDC65", label: "Members", value: members.length },
              { icon: "\uD83C\uDFE0", label: "Household", value: household.name },
            ].map((stat, i, arr) => (
              <div key={stat.label} style={{ ...statRow, borderBottom: i < arr.length - 1 ? "1px solid var(--pf-border)" : "none" }}>
                <span style={statIcon}>{stat.icon}</span>
                <span style={statLabel}>{stat.label}</span>
                <span style={statValue}>{stat.value}</span>
              </div>
            ))}
          </div>
        );

      case "pets":
        return (
          <>
            {pets.length === 0 ? (
              <div style={emptyState}>
                <span style={emptyStateIcon}>{"\uD83D\uDC3E"}</span>
                <p style={emptyStateTitle}>No pets yet</p>
                <p style={emptyStateSubtext}>Add your first pet to get started</p>
              </div>
            ) : (
              <div style={petGrid}>
                {pets.map((pet) => (
                  <div key={pet.id} onClick={() => !isCustomizing && setEditingPetId(pet.id)} style={{ cursor: isCustomizing ? "grab" : "pointer" }}>
                    <div style={petCard}>
                      {pet.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={pet.avatarUrl} alt={pet.name} style={petAvatarImg} />
                      ) : (
                        <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>{speciesEmoji[pet.species] ?? "\uD83D\uDC3E"}</span>
                      )}
                      <strong style={petCardName}>{pet.name}</strong>
                      {pet.breed && <span style={petCardBreed}>{pet.breed}</span>}
                      <span style={speciesBadge}>{pet.species}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!isCustomizing && (
              <button type="button" onClick={() => setShowAddPet(true)} style={{ ...tileLink, background: "none", border: "none", cursor: "pointer" }}>+ Add Pet</button>
            )}
          </>
        );

      case "health":
        return (
          <ErrorBoundary>
            <HealthTileContent
              householdId={activeHouseholdId}
              onManage={() => !isCustomizing && setShowHealthModal(true)}
            />
          </ErrorBoundary>
        );

      case "gamification":
        return (
          <ErrorBoundary>
            <GamificationTileContent
              householdId={activeHouseholdId}
              onManage={() => { if (!isCustomizing) { trackEvent("tile.opened", { tile: "gamification" }); setShowGamificationModal(true); }}}
            />
          </ErrorBoundary>
        );

      case "feeding":
        return (
          <ErrorBoundary>
            <FeedingTileContent
              householdId={activeHouseholdId}
              onManage={() => !isCustomizing && setShowFeedingModal(true)}
            />
          </ErrorBoundary>
        );

      case "finance":
        return (
          <ErrorBoundary>
            <FinanceTileContent
              householdId={activeHouseholdId}
              onManage={() => !isCustomizing && setShowFinanceModal(true)}
            />
          </ErrorBoundary>
        );

      case "reporting":
        return (
          <ErrorBoundary>
            <ReportingTileContent
              householdId={activeHouseholdId}
              onManage={() => !isCustomizing && setShowReportingModal(true)}
            />
          </ErrorBoundary>
        );

      case "calendar":
        return (
          <ErrorBoundary>
            <CalendarTileContent
              householdId={activeHouseholdId}
              onAddEvent={() => !isCustomizing && setShowAddEventModal(true)}
            />
          </ErrorBoundary>
        );

      case "notes":
        return (
          <ErrorBoundary>
            <NotesTileContent
              householdId={activeHouseholdId}
              onManage={() => !isCustomizing && setShowNotesModal(true)}
            />
          </ErrorBoundary>
        );
    }
  }

  /** Handle tile click to open modal (non-customize mode only) */
  function getTileClickHandler(tileId: TileId): (() => void) | undefined {
    if (isCustomizing) return undefined;
    const handlers: Partial<Record<TileId, () => void>> = {
      health: () => { trackEvent("tile.opened", { tile: "health" }); setShowHealthModal(true); },
      finance: () => { trackEvent("tile.opened", { tile: "finance" }); setShowFinanceModal(true); },
      reporting: () => { trackEvent("tile.opened", { tile: "reporting" }); setShowReportingModal(true); },
      calendar: () => { trackEvent("tile.opened", { tile: "calendar" }); setShowCalendarModal(true); },
      notes: () => { trackEvent("tile.opened", { tile: "notes" }); setShowNotesModal(true); },
    };
    return handlers[tileId];
  }

  // --- State 6: Dashboard loaded ---
  return (
    <main style={pageShell}>
      <div style={dashboardLayout}>
        {/* ── Customize toolbar ── */}
        <div style={toolbarStyle}>
          <button
            type="button"
            onClick={() => setIsCustomizing(!isCustomizing)}
            style={isCustomizing ? customizeBtnActive : customizeBtn}
          >
            {isCustomizing ? "Done" : "Customize"}
          </button>
          {isCustomizing && (
            <button type="button" onClick={resetLayout} style={resetBtn}>
              Reset to default
            </button>
          )}
        </div>

        {/* ── Content: tile grid + sidebar ── */}
        <div style={contentArea}>
          {/* ── Left: dynamic tile grid ── */}
          <div
            style={{
              ...gridArea,
              gridTemplateColumns: `repeat(${colCount}, 1fr)`,
              gridTemplateRows: `repeat(${rowCount}, 1fr)`,
            }}
          >
            {visibleTiles.map((tileId, visIdx) => {
              const def = TILE_MAP[tileId];
              const clickHandler = getTileClickHandler(tileId);
              const isDragOver = dragOverIndex === visIdx;

              return (
                <div
                  key={tileId}
                  draggable={isCustomizing}
                  onDragStart={() => handleDragStart(visIdx)}
                  onDragOver={(e) => handleDragOver(e, visIdx)}
                  onDrop={(e) => handleDrop(e, visIdx)}
                  onDragEnd={handleDragEnd}
                  onClick={clickHandler}
                  style={{
                    ...tileStyle,
                    cursor: isCustomizing ? "grab" : clickHandler ? "pointer" : undefined,
                    outline: isDragOver ? "2px solid var(--pf-primary)" : undefined,
                    outlineOffset: isDragOver ? -2 : undefined,
                    opacity: isDragOver ? 0.7 : 1,
                  }}
                >
                  <div style={{ ...tileAccentBar, background: def.accent }} />
                  {isCustomizing && (
                    <div style={dragHandle} title="Drag to reorder">
                      <span style={{ fontSize: "0.85rem", opacity: 0.5 }}>{"\u2630"}</span>
                    </div>
                  )}
                  <h2 style={sectionTitle}>
                    <span style={titleEmoji}>{def.emoji}</span>
                    {def.label}
                  </h2>
                  {renderTileContent(tileId)}
                </div>
              );
            })}
          </div>

          {/* ── Right: Today's Tasks sidebar ── */}
          <ErrorBoundary>
            <TodayTasksSidebar
              householdId={activeHouseholdId}
              pets={pets}
              onOpenHealth={() => setShowHealthModal(true)}
              onOpenFeeding={() => setShowFeedingModal(true)}
            />
          </ErrorBoundary>
        </div>

        {/* ── Customize panel: show/hide tiles ── */}
        {isCustomizing && (
          <div style={customizePanel}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--pf-text-muted)" }}>
              Show/hide tiles:
            </span>
            {TILE_DEFINITIONS.map((def) => {
              const isHidden = layout.hidden.includes(def.id);
              return (
                <button
                  key={def.id}
                  type="button"
                  onClick={() => toggleTile(def.id)}
                  style={{
                    ...tilePillBtn,
                    background: isHidden ? "var(--pf-surface)" : "var(--pf-primary)",
                    color: isHidden ? "var(--pf-text-muted)" : "white",
                    border: isHidden ? "1px solid var(--pf-border)" : "1px solid transparent",
                    opacity: isHidden ? 0.6 : 1,
                  }}
                >
                  {def.emoji} {def.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {editingPetId && (
        <PetEditModal petId={editingPetId} onClose={() => setEditingPetId(null)} />
      )}
      {showAddPet && (
        <PetAddModal onClose={() => setShowAddPet(false)} />
      )}
      {showFeedingModal && (
        <FeedingManageModal
          householdId={activeHouseholdId}
          onClose={() => setShowFeedingModal(false)}
        />
      )}
      {showCalendarModal && (
        <CalendarModal
          householdId={activeHouseholdId}
          onClose={() => setShowCalendarModal(false)}
        />
      )}
      {showHealthModal && (
        <HealthModal
          householdId={activeHouseholdId}
          onClose={() => setShowHealthModal(false)}
        />
      )}
      {showFinanceModal && (
        <FinanceModal
          householdId={activeHouseholdId}
          onClose={() => setShowFinanceModal(false)}
        />
      )}
      {showNotesModal && (
        <NotesModal
          householdId={activeHouseholdId}
          onClose={() => setShowNotesModal(false)}
        />
      )}
      {showReportingModal && (
        <ReportingModal
          householdId={activeHouseholdId}
          onClose={() => setShowReportingModal(false)}
        />
      )}
      {showGamificationModal && (
        <GamificationModal
          householdId={activeHouseholdId}
          onClose={() => setShowGamificationModal(false)}
        />
      )}
      {showAddEventModal && (
        <CalendarAddEventModal
          householdId={activeHouseholdId}
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
  dog: "\uD83D\uDC15", cat: "\uD83D\uDC08", bird: "\uD83D\uDC26", fish: "\uD83D\uDC1F", reptile: "\uD83E\uDD8E", other: "\uD83D\uDC3E",
};

// ── Styles ──

const pageShell: React.CSSProperties = {
  height: "calc(100vh - 45px)",
  overflow: "hidden",
  background: "var(--pf-bg)",
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
  gap: "0.625rem",
  minHeight: 0,
};

const tileStyle: React.CSSProperties = {
  background: "var(--pf-overlay)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: "0.75rem",
  padding: "0.875rem",
  boxShadow: "0 1px 3px var(--pf-shadow-soft), 0 4px 24px var(--pf-shadow-soft)",
  border: "1px solid var(--pf-border)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  transition: "box-shadow 0.25s ease, transform 0.25s ease, opacity 0.15s ease",
  position: "relative",
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
  color: "var(--pf-text)",
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
  color: "var(--pf-text-muted)",
  fontWeight: 500,
  letterSpacing: "0.01em",
};

const statValue: React.CSSProperties = {
  fontSize: "1.05rem",
  fontWeight: 700,
  color: "var(--pf-text)",
  letterSpacing: "-0.01em",
};

const tileLink: React.CSSProperties = {
  marginTop: "auto",
  paddingTop: "0.75rem",
  borderTop: "1px solid var(--pf-border)",
  color: "var(--pf-primary)",
  fontSize: "0.8rem",
  fontWeight: 600,
  textDecoration: "none",
  textAlign: "center",
  letterSpacing: "0.01em",
  transition: "color 0.2s ease",
};

const glassCard: React.CSSProperties = {
  background: "var(--pf-overlay-strong)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: "1rem",
  padding: "2rem",
  boxShadow: "0 1px 3px var(--pf-shadow-soft), 0 4px 24px var(--pf-shadow-soft)",
  border: "1px solid var(--pf-border)",
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
  background: "var(--pf-surface)",
  borderRadius: "0.75rem",
  border: "1px solid var(--pf-border-strong)",
  boxShadow: "0 1px 4px var(--pf-shadow-soft)",
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
  color: "var(--pf-text)",
  fontSize: "0.85rem",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  marginTop: "0.15rem",
};

const petCardBreed: React.CSSProperties = {
  color: "var(--pf-text-secondary)",
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
  color: "var(--pf-text)",
  fontSize: "0.9rem",
  letterSpacing: "-0.01em",
};

const emptyStateSubtext: React.CSSProperties = {
  color: "var(--pf-text-secondary)",
  fontSize: "0.8rem",
  margin: 0,
  fontWeight: 500,
  letterSpacing: "0.01em",
};

const spinner: React.CSSProperties = {
  width: 36,
  height: 36,
  border: "3px solid var(--pf-border-strong)",
  borderTopColor: "var(--pf-primary)",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

// ── Customize mode styles ──

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  marginBottom: "0.5rem",
  justifyContent: "flex-end",
};

const customizeBtn: React.CSSProperties = {
  padding: "0.35rem 0.75rem",
  borderRadius: "0.5rem",
  background: "var(--pf-surface)",
  color: "var(--pf-text-muted)",
  fontSize: "0.75rem",
  fontWeight: 600,
  border: "1px solid var(--pf-border)",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const customizeBtnActive: React.CSSProperties = {
  ...customizeBtn,
  background: "var(--pf-primary)",
  color: "white",
  border: "1px solid transparent",
};

const resetBtn: React.CSSProperties = {
  padding: "0.35rem 0.75rem",
  borderRadius: "0.5rem",
  background: "none",
  color: "var(--pf-text-muted)",
  fontSize: "0.75rem",
  fontWeight: 500,
  border: "1px solid var(--pf-border)",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const dragHandle: React.CSSProperties = {
  position: "absolute",
  top: "0.5rem",
  right: "0.5rem",
  cursor: "grab",
  padding: "0.15rem 0.3rem",
  borderRadius: "0.25rem",
  background: "var(--pf-highlight)",
};

const customizePanel: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  padding: "0.5rem 0",
  flexWrap: "wrap",
};

const tilePillBtn: React.CSSProperties = {
  padding: "0.3rem 0.6rem",
  borderRadius: "999px",
  fontSize: "0.7rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s ease",
  whiteSpace: "nowrap",
};
