import { SignedIn, SignedOut } from "@clerk/nextjs";
import { AuthTabs } from "./auth-tabs";
import { DashboardRedirect } from "./dashboard-redirect";

export default function Home() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "3rem 2rem",
        fontFamily: "system-ui, sans-serif",
        minHeight: "calc(100vh - 73px)",
      }}
    >
      <SignedOut>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
          🐾 PetForce
        </h1>
        <p
          style={{
            color: "#6B7280",
            fontSize: "1.1rem",
            marginBottom: "2rem",
          }}
        >
          Household-centric pet CRM. Your pets deserve the best care
          management.
        </p>
        <AuthTabs />
      </SignedOut>

      <SignedIn>
        <DashboardRedirect />
      </SignedIn>
    </main>
  );
}
