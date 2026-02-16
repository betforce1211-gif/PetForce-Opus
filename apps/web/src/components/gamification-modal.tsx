"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Modal } from "./modal";
import { GAMIFICATION_BADGES, GAMIFICATION_LEVELS, BADGE_CATEGORIES } from "@petforce/core";
import type { GamificationMemberView, GamificationHouseholdView, GamificationPetView, BadgeDefinition } from "@petforce/core";

interface GamificationModalProps {
  householdId: string;
  onClose: () => void;
}

type Tab = "members" | "household" | "pets";

export function GamificationModal({ householdId, onClose }: GamificationModalProps) {
  const [tab, setTab] = useState<Tab>("members");
  const statsQuery = trpc.gamification.getStats.useQuery({ householdId });
  const utils = trpc.useContext();
  const recalculate = trpc.gamification.recalculate.useMutation({
    onSuccess: () => {
      utils.gamification.getStats.invalidate({ householdId });
    },
  });

  return (
    <Modal open onClose={onClose}>
      <h2 style={titleStyle}>Gamification</h2>

      {/* Tab bar */}
      <div style={tabBar}>
        {(
          [
            { key: "members", label: "\uD83D\uDC64 Members" },
            { key: "household", label: "\uD83C\uDFE0 Household" },
            { key: "pets", label: "\uD83D\uDC3E Pets" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={tabBtn(tab === t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {statsQuery.isLoading && <p style={loadingText}>Loading...</p>}
      {statsQuery.isError && <p style={errorText}>Failed to load stats</p>}

      {statsQuery.data && (
        <>
          {tab === "members" && <MembersTab data={statsQuery.data} />}
          {tab === "household" && <HouseholdTab household={statsQuery.data.household} />}
          {tab === "pets" && <PetsTab pets={statsQuery.data.pets} />}
        </>
      )}

      {/* Refresh + Close */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.25rem" }}>
        <button
          type="button"
          onClick={() => recalculate.mutate({ householdId })}
          disabled={recalculate.isLoading}
          style={refreshBtn}
        >
          {recalculate.isLoading ? "Recalculating..." : "Refresh Stats"}
        </button>
        <button type="button" onClick={onClose} style={closeBtnStyle}>
          Done
        </button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════
// Members Tab
// ══════════════════════════════════════════

function MembersTab({ data }: { data: { members: GamificationMemberView[]; currentUserId: string } }) {
  const { members } = data;
  if (members.length === 0) {
    return <p style={emptyText}>No members yet. Complete tasks to earn XP!</p>;
  }

  const memberBadges = GAMIFICATION_BADGES.filter((b) => b.group === "member");
  const allEarned = new Set<string>();
  for (const m of members) {
    for (const b of m.unlockedBadgeIds) allEarned.add(b);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Leaderboard */}
      <div>
        <p style={sectionTitle}>Leaderboard</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {members.map((m, i) => {
            const medal = i === 0 ? "\uD83E\uDD47" : i === 1 ? "\uD83E\uDD48" : i === 2 ? "\uD83E\uDD49" : `#${i + 1}`;
            return (
              <div key={m.memberId} style={lbRow}>
                <span style={lbRank}>{medal}</span>
                <div style={lbInfo}>
                  <span style={lbName}>{m.memberName}</span>
                  <span style={lbSub}>Lv.{m.level} {m.levelName}</span>
                </div>
                <div style={lbRight}>
                  <span style={lbXp}>{m.totalXp} XP</span>
                  {m.currentStreak > 0 && (
                    <span style={lbStreak}>{"\uD83D\uDD25"} {m.currentStreak}d</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Member Badges */}
      <BadgesSection badges={memberBadges} earnedSet={allEarned} title="Member Badges" />
    </div>
  );
}

// ══════════════════════════════════════════
// Household Tab
// ══════════════════════════════════════════

function HouseholdTab({ household }: { household: GamificationHouseholdView }) {
  const maxLevel = GAMIFICATION_LEVELS[GAMIFICATION_LEVELS.length - 1].level;
  const isMaxLevel = household.level >= maxLevel;
  const progressPct = isMaxLevel ? 100 : household.nextLevelXp > 0
    ? Math.min(100, Math.round(((household.nextLevelXp - household.xpToNextLevel) / household.nextLevelXp) * 100))
    : 0;

  const householdBadges = GAMIFICATION_BADGES.filter((b) => b.group === "household");
  const earnedSet = new Set(household.unlockedBadgeIds);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Level overview */}
      <div style={statsSection}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div style={bigLevelBadge}>
            <span style={{ fontSize: "1.1rem", fontWeight: 800 }}>Lv.{household.level}</span>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1A1637" }}>{household.levelName}</p>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#7C7F95" }}>{household.householdName}</p>
          </div>
        </div>

        <div style={{ marginBottom: "0.5rem" }}>
          <div style={bigProgressTrack}>
            <div style={{ ...bigProgressFill, width: `${progressPct}%` }} />
          </div>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "#7C7F95", textAlign: "center" }}>
            {isMaxLevel ? "MAX LEVEL REACHED" : `${household.totalXp} / ${household.totalXp + household.xpToNextLevel} XP to Lv.${household.level + 1}`}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div style={statsGrid}>
        <div style={statCard}>
          <span style={{ fontSize: "1.25rem" }}>{"\u2B50"}</span>
          <span style={statCardValue}>{household.totalXp}</span>
          <span style={statCardLabel}>Total XP</span>
        </div>
        <div style={statCard}>
          <span style={{ fontSize: "1.25rem" }}>{"\uD83D\uDD25"}</span>
          <span style={statCardValue}>{household.currentStreak}</span>
          <span style={statCardLabel}>Streak</span>
        </div>
        <div style={statCard}>
          <span style={{ fontSize: "1.25rem" }}>{"\uD83D\uDC64"}</span>
          <span style={statCardValue}>{household.activeMemberCount}</span>
          <span style={statCardLabel}>Members</span>
        </div>
        <div style={statCard}>
          <span style={{ fontSize: "1.25rem" }}>{"\uD83C\uDFC6"}</span>
          <span style={statCardValue}>{household.longestStreak}</span>
          <span style={statCardLabel}>Best Streak</span>
        </div>
      </div>

      {/* Household Badges */}
      <BadgesSection badges={householdBadges} earnedSet={earnedSet} title="Household Badges" />
    </div>
  );
}

// ══════════════════════════════════════════
// Pets Tab
// ══════════════════════════════════════════

function PetsTab({ pets }: { pets: GamificationPetView[] }) {
  if (pets.length === 0) {
    return <p style={emptyText}>No pets yet. Add pets and complete tasks for them!</p>;
  }

  const petBadges = GAMIFICATION_BADGES.filter((b) => b.group === "pet");
  const allEarned = new Set<string>();
  for (const p of pets) {
    for (const b of p.unlockedBadgeIds) allEarned.add(b);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Pet leaderboard */}
      <div>
        <p style={sectionTitle}>Pet Leaderboard</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {pets.map((p, i) => {
            const medal = i === 0 ? "\uD83E\uDD47" : i === 1 ? "\uD83E\uDD48" : i === 2 ? "\uD83E\uDD49" : `#${i + 1}`;
            return (
              <div key={p.petId} style={lbRow}>
                <span style={lbRank}>{medal}</span>
                <div style={lbInfo}>
                  <span style={lbName}>{p.petName}</span>
                  <span style={lbSub}>Lv.{p.level} {p.levelName}</span>
                </div>
                <div style={lbRight}>
                  <span style={lbXp}>{p.totalXp} XP</span>
                  {p.currentStreak > 0 && (
                    <span style={lbStreak}>{"\uD83D\uDD25"} {p.currentStreak}d</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pet Badges */}
      <BadgesSection badges={petBadges} earnedSet={allEarned} title="Pet Badges" />
    </div>
  );
}

// ── Styles ──

// ══════════════════════════════════════════
// Shared Badges Section (category-grouped)
// ══════════════════════════════════════════

function BadgesSection({ badges, earnedSet, title }: {
  badges: BadgeDefinition[];
  earnedSet: Set<string>;
  title: string;
}) {
  // Group by category
  const byCategory = new Map<string, BadgeDefinition[]>();
  for (const badge of badges) {
    const cat = badge.category ?? "Other";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(badge);
  }

  // Order categories by BADGE_CATEGORIES order, then any remaining
  const orderedCats: string[] = [];
  for (const cat of BADGE_CATEGORIES) {
    if (byCategory.has(cat)) orderedCats.push(cat);
  }
  for (const cat of byCategory.keys()) {
    if (!orderedCats.includes(cat)) orderedCats.push(cat);
  }

  const earnedCount = badges.filter((b) => earnedSet.has(b.id)).length;

  return (
    <div>
      <p style={sectionTitle}>{title} ({earnedCount}/{badges.length})</p>
      {orderedCats.map((cat) => {
        const catBadges = byCategory.get(cat)!;
        const catEarned = catBadges.filter((b) => earnedSet.has(b.id)).length;
        return (
          <details key={cat} style={categoryDetails} open={catEarned < catBadges.length}>
            <summary style={categorySummary}>
              {cat} <span style={categoryCount}>{catEarned}/{catBadges.length}</span>
            </summary>
            <div style={badgeGrid}>
              {catBadges.map((badge) => {
                const earned = earnedSet.has(badge.id);
                return (
                  <div key={badge.id} style={badgeCard(earned)}>
                    <span style={{ fontSize: "1.5rem", lineHeight: 1, filter: earned ? "none" : "grayscale(100%)", opacity: earned ? 1 : 0.4 }}>
                      {badge.icon}
                    </span>
                    <span style={badgeName(earned)}>{badge.name}</span>
                    <span style={badgeDesc}>{badge.description}</span>
                  </div>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}

// ── Styles ──

const categoryDetails: React.CSSProperties = {
  marginBottom: "0.5rem",
};

const categorySummary: React.CSSProperties = {
  cursor: "pointer",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#1A1637",
  padding: "0.35rem 0",
  listStyle: "none",
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
};

const categoryCount: React.CSSProperties = {
  fontSize: "0.65rem",
  fontWeight: 500,
  color: "#A5A8BA",
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 1rem",
  fontSize: "1.4rem",
  fontWeight: 700,
  color: "#1A1637",
  letterSpacing: "-0.02em",
};

const tabBar: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  marginBottom: "1.25rem",
  borderBottom: "1px solid #E5E7EB",
  paddingBottom: "0.5rem",
};

const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: "0.4rem 0.75rem",
  borderRadius: "0.5rem",
  border: "none",
  background: active ? "linear-gradient(135deg, #6366F1, #8B5CF6)" : "transparent",
  color: active ? "#fff" : "#7C7F95",
  fontSize: "0.8rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s ease",
});

const closeBtnStyle: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  borderRadius: "0.625rem",
  border: "1px solid #E5E7EB",
  background: "#fff",
  color: "#1A1637",
  fontSize: "0.825rem",
  fontWeight: 600,
  cursor: "pointer",
};

const loadingText: React.CSSProperties = {
  color: "#A5A8BA",
  fontSize: "0.85rem",
  textAlign: "center",
  padding: "2rem 0",
};

const errorText: React.CSSProperties = {
  color: "#EF4444",
  fontSize: "0.85rem",
  textAlign: "center",
  padding: "2rem 0",
};

const emptyText: React.CSSProperties = {
  color: "#A5A8BA",
  fontSize: "0.85rem",
  textAlign: "center",
  padding: "2rem 0",
};

const sectionTitle: React.CSSProperties = {
  margin: "0 0 0.5rem",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#7C7F95",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

// Leaderboard styles
const lbRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  padding: "0.75rem",
  borderRadius: "0.625rem",
  background: "rgba(99, 102, 241, 0.03)",
  border: "1px solid rgba(99, 102, 241, 0.08)",
};

const lbRank: React.CSSProperties = {
  fontSize: "1.25rem",
  width: "2rem",
  textAlign: "center",
  flexShrink: 0,
};

const lbInfo: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "0.1rem",
};

const lbName: React.CSSProperties = {
  fontSize: "0.9rem",
  fontWeight: 600,
  color: "#1A1637",
};

const lbSub: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#7C7F95",
};

const lbRight: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "0.1rem",
};

const lbXp: React.CSSProperties = {
  fontSize: "0.9rem",
  fontWeight: 700,
  color: "#6366F1",
};

const lbStreak: React.CSSProperties = {
  fontSize: "0.7rem",
  color: "#F59E0B",
  fontWeight: 600,
};

// Badge styles
const badgeGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
  gap: "0.75rem",
};

const badgeCard = (earned: boolean): React.CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "0.35rem",
  padding: "1rem 0.5rem",
  borderRadius: "0.75rem",
  background: earned ? "rgba(99, 102, 241, 0.06)" : "rgba(0, 0, 0, 0.02)",
  border: `1px solid ${earned ? "rgba(99, 102, 241, 0.15)" : "rgba(0, 0, 0, 0.05)"}`,
  textAlign: "center",
});

const badgeName = (earned: boolean): React.CSSProperties => ({
  fontSize: "0.8rem",
  fontWeight: 600,
  color: earned ? "#1A1637" : "#A5A8BA",
});

const badgeDesc: React.CSSProperties = {
  fontSize: "0.7rem",
  color: "#7C7F95",
  lineHeight: 1.3,
};

// Stats styles
const statsSection: React.CSSProperties = {
  padding: "1rem",
  borderRadius: "0.75rem",
  background: "rgba(99, 102, 241, 0.03)",
  border: "1px solid rgba(99, 102, 241, 0.08)",
};

const bigLevelBadge: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 48,
  height: 48,
  borderRadius: "50%",
  background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
  color: "white",
};

const bigProgressTrack: React.CSSProperties = {
  height: 10,
  borderRadius: 5,
  background: "rgba(99, 102, 241, 0.1)",
  overflow: "hidden",
};

const bigProgressFill: React.CSSProperties = {
  height: "100%",
  borderRadius: 5,
  background: "linear-gradient(90deg, #6366F1, #8B5CF6)",
  transition: "width 0.5s ease",
};

const statsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "0.5rem",
};

const statCard: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "0.25rem",
  padding: "0.75rem 0.5rem",
  borderRadius: "0.625rem",
  background: "rgba(99, 102, 241, 0.03)",
  border: "1px solid rgba(99, 102, 241, 0.08)",
};

const statCardValue: React.CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 700,
  color: "#1A1637",
};

const statCardLabel: React.CSSProperties = {
  fontSize: "0.65rem",
  fontWeight: 500,
  color: "#7C7F95",
  textAlign: "center",
};

const refreshBtn: React.CSSProperties = {
  padding: "0.6rem 1.5rem",
  borderRadius: "0.625rem",
  background: "linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)",
  color: "white",
  fontSize: "0.825rem",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
  transition: "all 0.2s ease",
};
