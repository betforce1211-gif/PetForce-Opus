import { env } from "./lib/env.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router.js";
import { verifyClerkToken } from "./lib/clerk-auth.js";
import { rateLimitMiddleware } from "./lib/rate-limit.js";
import uploadApp from "./routes/upload.js";
import type { Context } from "./trpc.js";

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000",
    credentials: true,
  })
);

// Rate limiting
app.use("/trpc/*", rateLimitMiddleware);
app.use("/upload/*", rateLimitMiddleware);

// --- File upload routes (before tRPC) ---
app.route("/upload", uploadApp);

app.use("/trpc/*", async (c) => {
  const userId = await verifyClerkToken(c.req.header("authorization"));

  const response = await fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: (): Context => ({ userId }),
  });
  return response;
});

app.get("/health", (c) => c.json({ status: "ok" }));

const port = env.PORT ?? env.API_PORT ?? 3001;

console.info(`🐾 PetForce API running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
