"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { GAMIFICATION_LEVELS, GAMIFICATION_BADGES } from "@petforce/core";

interface GamificationTileContentProps {
  householdId: string;
  onManage: () => void;
}

type TileView = "me" | "home" | "pets";

export function GamificationTileContent({ householdId, onManage }: GamificationTileContentProps) {
  const [view, setView] = useState<TileView>("me");

  const statsQuery = trpc.gamification.getStats.useQuery(
    { householdId },
    { refetchInterval: 60_000 }
  );

  if (statsQuery.isLoading) {
    return (
      <div style={centered}>
        <span style={{ color: "var(--pf-text-secondary)", fontSize: "0.8rem" }}>Loading...</span>
      </div>
    );
  }

  if (statsQuery.isError) {
    return (
      <div style={centered}>
        <span style={{ color: "var(--pf-error)", fontSize: "0.8rem" }}>Failed to load</span>
      </div>
    );
  }

  const data = statsQuery.data;
  if (!data) return null;

  const me = data.members[0];

  if (!me) {
    return (
      <div style={centered}>
        <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>{"\uD83C\uDFC6"}</span>
        <p style={{ color: "var(--pf-text-secondary)", fontSize: "0.8rem", margin: "0.5rem 0 0" }}>
          No stats yet
        </p>
      </div>
    );
  }

  const maxLevel = GAMIFICATION_LEVELS[GAMIFICATION_LEVELS.length - 1].level;
  const isMaxLevel = me.level >= maxLevel;
  const progressPct = isMaxLevel ? 100 : me.nextLevelXp > 0
    ? Math.min(100, Math.round(((me.nextLevelXp - me.xpToNextLevel) / me.nextLevelXp) * 100))
    : 0;

  return (
    <>
      {/* Level & XP — always visible */}
      <div style={{ textAlign: "center", marginBottom: "0.25rem" }}>
        <div style={levelBadge}>
          <span style={{ fontSize: "0.7rem", fontWeight: 700 }}>Lv.{me.level}</span>
        </div>
        <p style={levelNameStyle}>{me.levelName}</p>
      </div>

      <div style={progressContainer}>
        <div style={progressTrack}>
          <div style={{ ...progressFill, width: `${progressPct}%` }} />
        </div>
        <p style={xpLabel}>
          {isMaxLevel ? "MAX LEVEL" : `${me.totalXp} XP`}
        </p>
      </div>

      {/* Pill toggles */}
      <div style={pillRow}>
        {(["me", "home", "pets"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            style={pillBtn(view === v)}
          >
            {v === "me" ? "Me" : v === "home" ? "Home" : "Pets"}
          </button>
        ))}
      </div>

      {/* View-specific content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {view === "me" && <MeView me={me} members={data.members} />}
        {view === "home" && <HomeView household={data.household} />}
        {view === "pets" && <PetsView pets={data.pets} />}
      </div>

      <button type="button" onClick={onManage} style={linkBtn}>
        View Details
      </button>
    </>
  );
}

function MeView({ me, members }: {
  me: { currentStreak: number; longestStreak: number; memberId: string; unlockedBadgeIds: string[]; totalXp: number };
  members: { memberId: string; totalXp: number }[];
}) {
  const rank = members.findIndex((m) => m.memberId === me.memberId) + 1;
  const memberBadges = GAMIFICATION_BADGES.filter((b) => b.group === "member");
  const nextBadges = memberBadges
    .filter((b) => !me.unlockedBadgeIds.includes(b.id))
    .slice(0, 2);

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
        <div style={miniStat}>
          <span style={{ fontSize: "0.85rem" }}>{"\uD83D\uDD25"}</span>
          <span style={miniStatValue}>{me.currentStreak}</span>
          <span style={miniStatLabel}>streak</span>
        </div>
        {members.length > 1 && (
          <div style={miniStat}>
            <span style={{ fontSize: "0.85rem" }}>{"\uD83C\uDFC5"}</span>
            <span style={miniStatValue}>#{rank}</span>
            <span style={miniStatLabel}>rank</span>
          </div>
        )}
        <div style={miniStat}>
          <span style={{ fontSize: "0.85rem" }}>{"\u2B50"}</span>
          <span style={miniStatValue}>{me.unlockedBadgeIds.length}</span>
          <span style={miniStatLabel}>{me.unlockedBadgeIds.length === 1 ? "badge" : "badges"}</span>
        </div>
      </div>
      {nextBadges.length > 0 && (
        <div style={badgePreviewRow}>
          <span style={badgePreviewLabel}>Next:</span>
          {nextBadges.map((b) => (
            <span key={b.id} style={badgeChip}>
              <span style={{ fontSize: "0.65rem" }}>{b.icon}</span>
              <span style={{ fontSize: "0.6rem", color: "var(--pf-text-secondary)" }}>{b.name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function HomeView({ household }: {
  household: { levelName: string; level: number; currentStreak: number; totalXp: number };
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", marginBottom: "0.2rem" }}>
        <span style={{ fontSize: "0.85rem" }}>{"\uD83C\uDFE0"}</span>
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--pf-text)" }}>
          Lv.{household.level} {household.levelName}
        </span>
      </div>
      <p style={subInfoText}>{household.totalXp} XP</p>
      {household.currentStreak > 0 && (
        <div style={streakRow}>
          <span style={{ fontSize: "1rem" }}>{"\uD83D\uDD25"}</span>
          <span style={streakText}>{household.currentStreak} day streak</span>
        </div>
      )}
    </div>
  );
}

const SPECIES_ICONS: Record<string, string> = {
  dog: "\uD83D\uDC36",
  cat: "\uD83D\uDC31",
  bird: "\uD83D\uDC26",
  fish: "\uD83D\uDC1F",
  reptile: "\uD83E\uDD8E",
  other: "\uD83D\uDC3E",
};

function PetsView({ pets }: {
  pets: { petId: string; petName: string; species: string; totalXp: number; level: number; levelName: string }[];
}) {
  if (pets.length === 0) {
    return <p style={subInfoText}>No pets yet</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      {pets.map((p) => (
        <div key={p.petId} style={petRow}>
          <span style={{ fontSize: "0.8rem", flexShrink: 0 }}>{SPECIES_ICONS[p.species] || "\uD83D\uDC3E"}</span>
          <span style={petName}>{p.petName}</span>
          <span style={petLevel}>Lv.{p.level}</span>
          <span style={petXp}>{p.totalXp} XP</span>
        </div>
      ))}
    </div>
  );
}

// ── Styles ──

const centered: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const levelBadge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.2rem 0.6rem",
  borderRadius: "999px",
  background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
  color: "white",
  marginBottom: "0.15rem",
};

const levelNameStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "var(--pf-text)",
  letterSpacing: "-0.01em",
};

const progressContainer: React.CSSProperties = {
  marginBottom: "0.35rem",
};

const progressTrack: React.CSSProperties = {
  height: 6,
  borderRadius: 3,
  background: "var(--pf-highlight)",
  overflow: "hidden",
};

const progressFill: React.CSSProperties = {
  height: "100%",
  borderRadius: 3,
  background: "linear-gradient(90deg, #6366F1, #8B5CF6)",
  transition: "width 0.5s ease",
};

const xpLabel: React.CSSProperties = {
  margin: "0.15rem 0 0",
  fontSize: "0.65rem",
  fontWeight: 600,
  color: "var(--pf-text-secondary)",
  textAlign: "center",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const pillRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: "0.25rem",
  marginBottom: "0.35rem",
};

const pillBtn = (active: boolean): React.CSSProperties => ({
  padding: "0.2rem 0.6rem",
  borderRadius: "999px",
  border: "none",
  background: active ? "linear-gradient(135deg, #6366F1, #8B5CF6)" : "var(--pf-highlight)",
  color: active ? "#fff" : "var(--pf-text-secondary)",
  fontSize: "0.65rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s ease",
});

const streakRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.35rem",
  marginBottom: "0.15rem",
};

const streakText: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--pf-warning)",
};

const subInfoText: React.CSSProperties = {
  margin: 0,
  fontSize: "0.7rem",
  color: "var(--pf-text-secondary)",
};

const miniStat: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "0.05rem",
};

const miniStatValue: React.CSSProperties = {
  fontSize: "0.8rem",
  fontWeight: 700,
  color: "var(--pf-text)",
  lineHeight: 1.1,
};

const miniStatLabel: React.CSSProperties = {
  fontSize: "0.55rem",
  color: "var(--pf-text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 600,
};

const badgePreviewRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.3rem",
  flexWrap: "wrap",
};

const badgePreviewLabel: React.CSSProperties = {
  fontSize: "0.6rem",
  fontWeight: 600,
  color: "var(--pf-text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const badgeChip: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.2rem",
  padding: "0.1rem 0.4rem",
  borderRadius: "999px",
  background: "var(--pf-highlight)",
  border: "1px dashed rgba(99, 102, 241, 0.2)",
};

const petRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.35rem",
  padding: "0.15rem 0",
};

const petName: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--pf-text)",
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const petLevel: React.CSSProperties = {
  fontSize: "0.6rem",
  fontWeight: 700,
  color: "var(--pf-primary)",
  flexShrink: 0,
};

const petXp: React.CSSProperties = {
  fontSize: "0.6rem",
  color: "var(--pf-text-secondary)",
  fontWeight: 600,
  flexShrink: 0,
};

const linkBtn: React.CSSProperties = {
  marginTop: "auto",
  paddingTop: "0.75rem",
  borderTop: "1px solid var(--pf-highlight)",
  color: "var(--pf-primary)",
  fontSize: "0.8rem",
  fontWeight: 600,
  textDecoration: "none",
  textAlign: "center",
  letterSpacing: "0.01em",
  background: "none",
  border: "none",
  borderTopStyle: "solid",
  borderTopWidth: "1px",
  borderTopColor: "var(--pf-highlight)",
  cursor: "pointer",
};
