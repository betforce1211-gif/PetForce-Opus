import type { Metadata } from "next";
import { ClerkProvider, SignedIn, UserButton } from "@clerk/nextjs";
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
            <SignedIn>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
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
              </div>
            </SignedIn>
          </header>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
