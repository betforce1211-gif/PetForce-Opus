"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignedIn } from "@clerk/nextjs";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { useHousehold } from "@/lib/household-context";
import { UserMenu } from "./user-menu";

export function AppHeader() {
  return (
    <header style={headerStyle}>
      <div style={leftSection}>
        <SignedIn>
          <HouseholdSwitcher />
        </SignedIn>
      </div>
      <Link href="/" style={brandLink}>
        🐾 PetForce
      </Link>
      <div style={rightSection}>
        <SignedIn>
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
            <span style={{ fontSize: "0.7rem", color: "#8B8FA3", marginLeft: "0.4rem", transition: "transform 0.2s ease", transform: open ? "rotate(180deg)" : "rotate(0)" }}>
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
                backgroundColor: h.id === householdId ? "rgba(99, 102, 241, 0.08)" : "transparent",
              }}
            >
              <span style={{ ...switcherDot, backgroundColor: h.theme.primaryColor }} />
              <span style={{ flex: 1, textAlign: "left", color: "#1A1637", fontWeight: h.id === householdId ? 600 : 400 }}>
                {h.name}
              </span>
              <span style={{ color: "#A5A8BA", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                {h.petCount}🐾 {h.memberCount}👥
              </span>
            </button>
          ))}
          <div style={{ borderTop: "1px solid rgba(99, 102, 241, 0.08)", margin: "0.35rem 0.5rem" }} />
          <button
            onClick={() => { setOpen(false); router.push("/onboard"); }}
            style={switcherItem}
          >
            <span style={{ color: "#6366F1", fontWeight: 600, fontSize: "0.85rem" }}>+ Create New Household</span>
          </button>
          <button
            onClick={() => { setOpen(false); router.push("/join"); }}
            style={switcherItem}
          >
            <span style={{ color: "#6366F1", fontWeight: 600, fontSize: "0.85rem" }}>Join a Household</span>
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
  padding: "0.75rem 1.75rem",
  borderBottom: "1px solid rgba(99, 102, 241, 0.08)",
  background: "rgba(255, 255, 255, 0.8)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  minHeight: 56,
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
};

const brandLink: React.CSSProperties = {
  fontWeight: 800,
  fontSize: "1.3rem",
  color: "#6366F1",
  textDecoration: "none",
  letterSpacing: "-0.02em",
  textAlign: "center",
};

const switcherIconWrap: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: "0.625rem",
  background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid rgba(99, 102, 241, 0.12)",
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
  color: "#1A1637",
  letterSpacing: "-0.015em",
};

const switcherSubtext: React.CSSProperties = {
  margin: "0.1rem 0 0",
  color: "#8B8FA3",
  fontSize: "0.7rem",
  fontWeight: 500,
  letterSpacing: "0.01em",
};

const switcherDropdown: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 0.5rem)",
  left: 0,
  minWidth: 280,
  background: "rgba(255, 255, 255, 0.95)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  borderRadius: "0.875rem",
  padding: "0.5rem",
  boxShadow: "0 8px 40px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.05), 0 0 0 1px rgba(99, 102, 241, 0.06)",
  border: "1px solid rgba(255, 255, 255, 0.6)",
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
  boxShadow: "0 0 0 2px rgba(255,255,255,0.8)",
};
