import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import type { Context } from "./trpc";

const app = new Hono();

app.use("/*", cors());

app.use("/trpc/*", async (c) => {
  const response = await fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: (): Context => ({
      // TODO: Extract userId from Clerk session
      userId: c.req.header("x-user-id") ?? null,
    }),
  });
  return response;
});

app.get("/health", (c) => c.json({ status: "ok" }));

const port = Number(process.env.API_PORT) || 3001;

console.log(`🐾 PetForce API running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
