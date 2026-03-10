"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return <p style={{ color: "var(--pf-text-muted)" }}>Redirecting to dashboard...</p>;
}
