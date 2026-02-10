import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "./providers";
import { AppHeader } from "./app-header";
import "./globals.css";

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
          <Providers>
            <AppHeader />
            {children}
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
