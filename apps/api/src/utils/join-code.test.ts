import { describe, it, expect } from "vitest";
import { generateJoinCode, generateInviteToken } from "./join-code";

describe("generateJoinCode", () => {
  it("returns format XXX-NNNN (3 letters, dash, 4 digits)", () => {
    const code = generateJoinCode();
    expect(code).toMatch(/^[A-Z]{3}-\d{4}$/);
  });

  it("excludes I and O from letters", () => {
    // Generate many codes to statistically verify I and O are excluded
    const codes = Array.from({ length: 100 }, () => generateJoinCode());
    const allLetters = codes.map((c) => c.slice(0, 3)).join("");
    expect(allLetters).not.toContain("I");
    expect(allLetters).not.toContain("O");
  });

  it("produces different codes on successive calls", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateJoinCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("generateInviteToken", () => {
  it("returns a base64url string", () => {
    const token = generateInviteToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("has expected length for 24 random bytes encoded as base64url", () => {
    const token = generateInviteToken();
    // 24 bytes -> 32 base64url chars
    expect(token).toHaveLength(32);
  });

  it("produces unique tokens", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateInviteToken()));
    expect(tokens.size).toBe(20);
  });
});
