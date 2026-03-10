"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignedIn } from "@clerk/nextjs";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { useHousehold } from "@/lib/household-context";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "./theme-toggle";

export function AppHeader() {
  return (
    <header style={headerStyle}>
      <div style={leftSection}>
        <SignedIn>
          <HouseholdSwitcher />
        </SignedIn>
      </div>
      <Link href="/" style={brandLink}>
        <svg width="26" height="30" viewBox="0 0 160 180" fill="none" style={{ display: "block", flexShrink: 0 }}>
          <ellipse cx="32" cy="42" rx="18" ry="24" fill="var(--pf-primary)"/>
          <ellipse cx="66" cy="22" rx="17" ry="23" fill="var(--pf-primary)"/>
          <ellipse cx="100" cy="22" rx="17" ry="23" fill="var(--pf-primary)"/>
          <ellipse cx="130" cy="44" rx="16" ry="22" fill="var(--pf-primary)"/>
          <path d="M28 90 C24 72 40 62 58 64 C70 65 80 62 94 64 C118 66 140 76 136 96 C132 120 118 148 100 158 C86 166 72 166 58 158 C42 148 24 116 28 90 Z" fill="var(--pf-primary)"/>
          <text x="56" y="130" fontFamily="'Trebuchet MS', 'Arial Rounded MT Bold', system-ui" fontWeight="900" fontSize="36" fill="white" textAnchor="middle">P</text>
          <path d="M82 106 L74 120 L82 116 L72 132" fill="none" stroke="#FBBF24" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/>
          <text x="104" y="130" fontFamily="'Trebuchet MS', 'Arial Rounded MT Bold', system-ui" fontWeight="900" fontSize="36" fill="white" textAnchor="middle">F</text>
        </svg>
        <span>PetForce</span>
      </Link>
      <div style={rightSection}>
        <SignedIn>
          <ThemeToggle />
          <UserMenu />
        </SignedIn>
      </div>
    </header>
  );
}

function HouseholdSwitcher() {
  const router = useRouter();
  const { householdId, switchHousehold } = useHousehold();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const householdsQuery = trpc.dashboard.myHouseholds.useQuery(undefined, {
    retry: 2,
    retryDelay: 500,
  });
  const canCreateQuery = trpc.dashboard.canCreateHousehold.useQuery(undefined, {
    retry: 1,
  });

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

  const allHouseholds = householdsQuery.data ?? [];
  const current = allHouseholds.find((h) => h.id === householdId);

  if (!current) return null;

  const showDropdown = allHouseholds.length > 1;

  return (
    <div ref={ref} style={{ position: "relative", display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div style={switcherIconWrap}>
        <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>🐾</span>
      </div>
      <div>
        <button
          onClick={() => showDropdown && setOpen((v) => !v)}
          style={{
            ...switcherButton,
            cursor: showDropdown ? "pointer" : "default",
          }}
        >
          <span style={switcherTitle}>{current.name}</span>
          {showDropdown && (
            <span style={{ fontSize: "0.7rem", color: "var(--pf-text-secondary)", marginLeft: "0.4rem", transition: "transform 0.2s ease", transform: open ? "rotate(180deg)" : "rotate(0)" }}>
              ▾
            </span>
          )}
        </button>
        <p style={switcherSubtext}>
          {current.petCount} {current.petCount === 1 ? "pet" : "pets"} &middot;{" "}
          {current.memberCount} {current.memberCount === 1 ? "member" : "members"}
        </p>
      </div>

      {open && (
        <div style={switcherDropdown}>
          {allHouseholds.map((h) => (
            <button
              key={h.id}
              onClick={() => {
                switchHousehold(h.id);
                setOpen(false);
              }}
              style={{
                ...switcherItem,
                backgroundColor: h.id === householdId ? "var(--pf-highlight)" : "transparent",
              }}
            >
              <span style={{ ...switcherDot, backgroundColor: h.theme.primaryColor }} />
              <span style={{ flex: 1, textAlign: "left", color: "var(--pf-text)", fontWeight: h.id === householdId ? 600 : 400 }}>
                {h.name}
              </span>
              <span style={{ color: "var(--pf-text-secondary)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                {h.petCount}🐾 {h.memberCount}👥
              </span>
            </button>
          ))}
          <div style={{ borderTop: "1px solid var(--pf-border)", margin: "0.35rem 0.5rem" }} />
          {canCreateQuery.data?.canCreate && (
            <button
              onClick={() => { setOpen(false); router.push("/onboard"); }}
              style={switcherItem}
            >
              <span style={{ color: "var(--pf-primary)", fontWeight: 600, fontSize: "0.85rem" }}>+ Create New Household</span>
            </button>
          )}
          <button
            onClick={() => { setOpen(false); router.push("/join"); }}
            style={switcherItem}
          >
            <span style={{ color: "var(--pf-primary)", fontWeight: 600, fontSize: "0.85rem" }}>Join a Household</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Styles ──

const headerStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  padding: "0.4rem 1.25rem",
  borderBottom: "1px solid var(--pf-border)",
  background: "var(--pf-overlay)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  minHeight: 44,
};

const leftSection: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
};

const rightSection: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "0.5rem",
};

const brandLink: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.45rem",
  fontWeight: 800,
  fontSize: "1.35rem",
  color: "var(--pf-primary)",
  textDecoration: "none",
  letterSpacing: "-0.03em",
};

const switcherIconWrap: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: "0.625rem",
  background: "var(--pf-highlight)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid var(--pf-border-strong)",
  flexShrink: 0,
};

const switcherButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  background: "none",
  border: "none",
  padding: 0,
  fontFamily: "inherit",
};

const switcherTitle: React.CSSProperties = {
  fontSize: "0.95rem",
  fontWeight: 700,
  color: "var(--pf-text)",
  letterSpacing: "-0.015em",
};

const switcherSubtext: React.CSSProperties = {
  margin: "0.1rem 0 0",
  color: "var(--pf-text-secondary)",
  fontSize: "0.7rem",
  fontWeight: 500,
  letterSpacing: "0.01em",
};

const switcherDropdown: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 0.5rem)",
  left: 0,
  minWidth: 280,
  background: "var(--pf-overlay-strong)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  borderRadius: "0.875rem",
  padding: "0.5rem",
  boxShadow: "0 8px 40px var(--pf-shadow), 0 2px 8px var(--pf-shadow-soft), 0 0 0 1px var(--pf-border)",
  border: "1px solid var(--pf-border)",
  zIndex: 50,
};

const switcherItem: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.6rem",
  width: "100%",
  padding: "0.5rem 0.7rem",
  border: "none",
  background: "transparent",
  borderRadius: "0.5rem",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "0.85rem",
  transition: "background-color 0.15s ease",
};

const switcherDot: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  flexShrink: 0,
  boxShadow: "0 0 0 2px var(--pf-overlay)",
};
