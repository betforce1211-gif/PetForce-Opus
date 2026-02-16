"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { GAMIFICATION_LEVELS } from "@petforce/core";

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
        <span style={{ color: "#A5A8BA", fontSize: "0.8rem" }}>Loading...</span>
      </div>
    );
  }

  if (statsQuery.isError) {
    return (
      <div style={centered}>
        <span style={{ color: "#EF4444", fontSize: "0.8rem" }}>Failed to load</span>
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
        <p style={{ color: "#A5A8BA", fontSize: "0.8rem", margin: "0.5rem 0 0" }}>
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
  me: { currentStreak: number; memberId: string };
  members: { memberId: string; totalXp: number }[];
}) {
  const rank = members.findIndex((m) => m.memberId === me.memberId) + 1;
  return (
    <div style={{ textAlign: "center" }}>
      {me.currentStreak > 0 && (
        <div style={streakRow}>
          <span style={{ fontSize: "1rem" }}>{"\uD83D\uDD25"}</span>
          <span style={streakText}>{me.currentStreak} day streak</span>
        </div>
      )}
      {members.length > 1 && (
        <p style={subInfoText}>
          Rank #{rank} of {members.length}
        </p>
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
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1A1637" }}>
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

function PetsView({ pets }: {
  pets: { petId: string; petName: string; totalXp: number; level: number }[];
}) {
  if (pets.length === 0) {
    return <p style={subInfoText}>No pets yet</p>;
  }
  const top = pets[0];
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", marginBottom: "0.2rem" }}>
        <span style={{ fontSize: "0.85rem" }}>{"\uD83D\uDC3E"}</span>
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1A1637" }}>
          {top.petName} — Lv.{top.level}
        </span>
      </div>
      <p style={subInfoText}>
        {top.totalXp} XP{pets.length > 1 ? ` · ${pets.length} pets tracked` : ""}
      </p>
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
  color: "#1A1637",
  letterSpacing: "-0.01em",
};

const progressContainer: React.CSSProperties = {
  marginBottom: "0.35rem",
};

const progressTrack: React.CSSProperties = {
  height: 6,
  borderRadius: 3,
  background: "rgba(99, 102, 241, 0.1)",
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
  color: "#A5A8BA",
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
  background: active ? "linear-gradient(135deg, #6366F1, #8B5CF6)" : "rgba(99, 102, 241, 0.08)",
  color: active ? "#fff" : "#7C7F95",
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
  color: "#F59E0B",
};

const subInfoText: React.CSSProperties = {
  margin: 0,
  fontSize: "0.7rem",
  color: "#7C7F95",
};

const linkBtn: React.CSSProperties = {
  marginTop: "auto",
  paddingTop: "0.75rem",
  borderTop: "1px solid rgba(99, 102, 241, 0.08)",
  color: "#6366F1",
  fontSize: "0.8rem",
  fontWeight: 600,
  textDecoration: "none",
  textAlign: "center",
  letterSpacing: "0.01em",
  background: "none",
  border: "none",
  borderTopStyle: "solid",
  borderTopWidth: "1px",
  borderTopColor: "rgba(99, 102, 241, 0.08)",
  cursor: "pointer",
};
