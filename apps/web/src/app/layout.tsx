import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "./providers";
import { ThemeProvider } from "./theme-provider";
import { AppHeader } from "./app-header";
import "./globals.css";

// Required: ClerkProvider in root layout needs runtime env vars
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
      <html lang="en" suppressHydrationWarning>
        <body>
          <ThemeProvider>
            <Providers>
              <AppHeader />
              {children}
            </Providers>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
