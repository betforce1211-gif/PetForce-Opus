import type { Metadata } from "next";
import { ClerkProvider, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Providers } from "./providers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PetForce",
  description: "Household-centric pet CRM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem 2rem",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <Link
              href="/"
              style={{
                fontWeight: 700,
                fontSize: "1.25rem",
                color: "#6366F1",
                textDecoration: "none",
              }}
            >
              🐾 PetForce
            </Link>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <SignedOut>
                <Link
                  href="/sign-in"
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    color: "#6366F1",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    backgroundColor: "#6366F1",
                    color: "white",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Sign Up
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/dashboard"
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    color: "#6366F1",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Dashboard
                </Link>
                <UserButton />
              </SignedIn>
            </div>
          </header>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
