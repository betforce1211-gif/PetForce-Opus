import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
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
        Create your account to get started
      </p>
      <SignUp routing="hash" forceRedirectUrl="/" />
    </main>
  );
}
