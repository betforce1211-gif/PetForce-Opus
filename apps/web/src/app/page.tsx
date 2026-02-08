import { SignedIn, SignedOut } from "@clerk/nextjs";
import { AuthTabs } from "./auth-tabs";
import { DashboardRedirect } from "./dashboard-redirect";

export default function Home() {
  return (
    <main
      style={{
        height: "calc(100vh - 73px)",
        fontFamily: "system-ui, sans-serif",
        overflow: "hidden",
        background:
          "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 25%, #FDF2F8 50%, #FFF7ED 75%, #EEF2FF 100%)",
      }}
    >
      <SignedOut>
        <div
          style={{
            display: "flex",
            height: "100%",
          }}
        >
          {/* Left — Hero + Features */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem 3rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🐾</div>
            <h1
              style={{
                fontSize: "2.5rem",
                fontWeight: 800,
                color: "#1E1B4B",
                margin: "0 0 0.75rem",
                lineHeight: 1.1,
                whiteSpace: "nowrap",
              }}
            >
              Your pets deserve the{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #6366F1, #EC4899)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                best care
              </span>
            </h1>
            <p
              style={{
                fontSize: "1.1rem",
                color: "#6B7280",
                maxWidth: "480px",
                lineHeight: 1.6,
                margin: "0 0 2rem",
              }}
            >
              PetForce brings your whole household together to keep your furry,
              feathered, and scaly family members happy and healthy.
            </p>

            {/* Feature grid — 2x2 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                maxWidth: "480px",
                width: "100%",
              }}
            >
              <FeatureCard
                icon="💊"
                title="Track Health & Meds"
                description="Log vet visits, medications, and vaccinations."
              />
              <FeatureCard
                icon="👨‍👩‍👧‍👦"
                title="Coordinate as a Family"
                description="Share pet duties with family and sitters."
              />
              <FeatureCard
                icon="📋"
                title="Log Daily Activities"
                description="Record walks, feedings, and playtime."
              />
              <FeatureCard
                icon="💰"
                title="Manage Pet Finances"
                description="Track expenses, vet bills, and budgets."
              />
            </div>

            <p
              style={{
                marginTop: "2rem",
                color: "#9CA3AF",
                fontSize: "0.8rem",
              }}
            >
              Made with love for pets everywhere
            </p>
          </div>

          {/* Right — Auth Panel */}
          <div
            style={{
              width: "480px",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem",
              background: "rgba(255, 255, 255, 0.55)",
              backdropFilter: "blur(16px)",
              borderLeft: "1px solid rgba(255, 255, 255, 0.6)",
            }}
          >
            <p
              style={{
                fontSize: "1.1rem",
                color: "#4B5563",
                marginBottom: "1rem",
                fontWeight: 500,
              }}
            >
              Get started — it&apos;s free
            </p>
            <AuthTabs />
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <DashboardRedirect />
      </SignedIn>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(10px)",
        borderRadius: "0.875rem",
        padding: "1.25rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        border: "1px solid rgba(255,255,255,0.6)",
        textAlign: "left",
      }}
    >
      <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>{icon}</div>
      <h3
        style={{
          fontSize: "0.95rem",
          fontWeight: 700,
          color: "#1E1B4B",
          margin: "0 0 0.25rem",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: "0.825rem",
          color: "#6B7280",
          lineHeight: 1.45,
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
}
