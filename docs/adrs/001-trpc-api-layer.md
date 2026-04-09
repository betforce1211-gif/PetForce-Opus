# ADR-001: Use tRPC over REST for API Layer

**Status:** Accepted
**Date:** 2026-04-08
**Author:** Architect

## Context

PetForce is a monorepo with shared TypeScript packages (`@petforce/core` for types/schemas, `@petforce/db` for database). We need an API layer that:
- Provides end-to-end type safety from Zod schemas through API calls to frontend hooks
- Works with both Next.js (web) and Expo (mobile) clients
- Supports SuperJSON serialization for complex types (Dates, BigInts)
- Integrates with Hono as the HTTP server framework

The alternative — a REST API with OpenAPI — would require manual type synchronization between the shared schema definitions in `@petforce/core` and the API contract. In a fast-moving monorepo with 15+ domain areas, that drift becomes a source of bugs and regressions.

## Decision

Use tRPC v10 with the Hono adapter and SuperJSON serialization. All API endpoints are tRPC procedures organized into domain-specific routers (15 routers, 97 procedures). Zod schemas from `@petforce/core` serve as tRPC input validators.

Router registration lives in `apps/api/src/router.ts`. Each domain router (e.g., `householdRouter`, `petRouter`) is composed there into the root `appRouter`. The inferred `AppRouter` type is exported from `apps/api` and consumed by both web and mobile clients via `createTRPCClient`.

## Rationale

tRPC's core value proposition maps directly onto PetForce's monorepo architecture: because all packages share a single TypeScript compilation graph, changing a Zod schema in `@petforce/core` instantly surfaces type errors in the tRPC procedure that uses it AND in every frontend call site that invokes that procedure. This is a real safety net — not a theoretical one — that catches breaking changes before they reach production.

SuperJSON handles `Date` serialization automatically. Without it, dates would round-trip as strings and require manual parsing on every client call site.

## Consequences

- End-to-end type safety: changing a Zod schema in `@petforce/core` immediately surfaces type errors in both frontend and API code at compile time.
- SuperJSON handles Date and other complex type serialization automatically — no manual transforms needed on client call sites.
- Locked to TypeScript clients — no Python, Go, or other language SDKs can consume the API natively via tRPC.
- tRPC procedures are organized by domain, requiring explicit router registration in `apps/api/src/router.ts` for new routers to be reachable.
- **Agent constraint:** Any non-TypeScript consumer (webhooks, server-sent events, third-party integrations) CANNOT use tRPC — they must hit the Hono HTTP layer directly at the raw endpoint level. When implementing webhooks or external integrations, always add a plain Hono route handler, not a tRPC procedure. This is non-negotiable for interoperability.

## Alternatives Considered

**REST + OpenAPI:** Broad client support and well-understood patterns, but no type inference from shared schemas. Would require manual type synchronization between frontend and backend — a maintenance burden in a monorepo that already shares types.

**GraphQL:** Flexible queries and strong typing, but over-engineered for this domain. PetForce has well-defined data shapes that don't benefit from GraphQL's query flexibility. Added complexity of schema stitching, resolvers, and codegen without proportional benefit.
