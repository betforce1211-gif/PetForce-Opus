import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { verifyToken } from "@clerk/backend";
import { appRouter } from "./router";
import type { Context } from "./trpc";

const app = new Hono();

app.use("/*", cors());

app.use("/trpc/*", async (c) => {
  let userId: string | null = null;

  const authHeader = c.req.header("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      // Use jwtKey (PEM public key) for direct verification — avoids JWKS fetch issues
      const jwtKey = process.env.CLERK_JWT_KEY?.replace(/\\n/g, "\n");
      const payload = await verifyToken(token, {
        ...(jwtKey
          ? { jwtKey }
          : { secretKey: process.env.CLERK_SECRET_KEY! }),
      });
      userId = payload.sub;
    } catch {
      // Invalid token — userId stays null, protectedProcedure will reject
    }
  }

  const response = await fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: (): Context => ({ userId }),
  });
  return response;
});

app.get("/health", (c) => c.json({ status: "ok" }));

const port = Number(process.env.API_PORT) || 3001;

console.log(`🐾 PetForce API running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
