# PET-80: World Class API — Execution Plan

**Author:** CTO
**Date:** 2026-03-31
**Status:** Scoping complete — ready for CEO review

---

## Current State Assessment

The PetForce API is already production-grade for internal use:

| Capability | Status | Details |
|-----------|--------|---------|
| Type-safe RPC | Done | tRPC v10 with SuperJSON, end-to-end types |
| Auth | Done | Clerk JWT, 3-tier (public → protected → household) |
| RBAC | Done | Owner/admin role enforcement per procedure |
| Household isolation | Done | All data scoped via `householdProcedure` middleware |
| Rate limiting | Done | Granular (auth/upload/standard), user-aware, Redis or in-memory |
| Caching | Done | Redis/in-memory with TTL, smart invalidation |
| Observability | Done | OpenTelemetry spans, Pino structured logging, request IDs |
| Error handling | Done | Global handler, no stack leaks in prod |
| Health checks | Done | DB, Clerk, Redis, queue — returns degraded/ok |
| Compression | Done | gzip via Hono compress middleware |
| Request tracing | Done | X-Request-ID header, correlated in logs + spans |
| API versioning | Partial | X-API-Version header set, but no versioned routing |
| Graceful shutdown | Done | SIGTERM/SIGINT with connection/queue/telemetry cleanup |
| Timeout protection | Done | 30s per-procedure timeout |
| File uploads | Done | Magic byte validation, Supabase storage |
| Audit logging | Done | Important mutations logged |

**Surface:** 19 routers, ~80 procedures covering household, pets, activities, feeding, health, medications, calendar, finance, notes, reporting, analytics, gamification, photos, export, search, notifications.

---

## Gap Analysis — What "World Class" Means

### Tier 1: Ship This Quarter (High Impact, Internal)

| Gap | Impact | Effort | Owner |
|-----|--------|--------|-------|
| **Cursor-based pagination** | Offset pagination breaks on large datasets. Feeds, activity logs, and reporting queries need stable cursors. | Medium | Backend |
| **Input sanitization middleware** | XSS in notes/descriptions could be stored and rendered. Need HTML entity escaping on text inputs. | Low | Backend |
| **Idempotency keys for mutations** | Retry safety — double-tap on "log feeding" creates duplicates. `X-Idempotency-Key` header → dedup window. | Medium | Backend |
| **Missing API docs** | 4 routers undocumented: `petPhoto`, `export`, `search`, `notification`. | Low | Docs |
| **E2E API test suite** | No integration tests hitting real tRPC procedures. Need `vitest` + test DB. | Medium | QA |

### Tier 2: Ship Next Quarter (External Readiness)

| Gap | Impact | Effort | Owner |
|-----|--------|--------|-------|
| **REST/OpenAPI gateway** | tRPC is internal-only. Third-party integrations (vet clinics, pet stores) need REST + OpenAPI spec. Hono can serve both. | High | Backend + CTO |
| **API key auth** | Service-to-service auth for integrations. Separate from Clerk user auth. | Medium | Backend |
| **Webhook system** | Push events to integrations: pet added, activity completed, medication due. BullMQ already available. | High | Backend |
| **Versioned routing** | `/v1/`, `/v2/` prefixes for breaking changes. Need migration strategy. | Medium | Backend + CTO |
| **Field selection** | Return full objects always. Allow `?fields=id,name,species` for bandwidth-sensitive mobile. | Low | Backend |

### Tier 3: Future (Scale & Polish)

| Gap | Impact | Effort | Owner |
|-----|--------|--------|-------|
| **Real-time subscriptions** | tRPC supports WebSocket subscriptions. Dashboard live-updates, feeding notifications. | High | Backend |
| **GraphQL layer** | Alternative to REST for complex clients. Low priority — REST + tRPC covers 95% of cases. | Very High | - |
| **CDN edge caching** | Public/semi-public data (pet holidays, breed lists) could be edge-cached. | Low | DevOps |
| **API analytics** | Track endpoint usage patterns, error rates by procedure, latency P50/P95/P99. | Medium | DevOps |

---

## Recommended Execution Order

### Phase 1: Hardening (Sprint 3 — 2 weeks)

Already partially done (request IDs, compression, user-aware rate limiting, timeouts).

1. **Cursor pagination** — Replace offset-based pagination in `activity.listByHousehold`, `feeding.listSchedules`, `health.listRecords`, `finance.listExpenses`, `reporting.completionLog`, `notes.list`
2. **Idempotency keys** — Add `X-Idempotency-Key` middleware for all mutations. 5-minute dedup window in Redis.
3. **Input sanitization** — Add `sanitizeText()` utility, apply to all user-facing string inputs via Zod `.transform()`
4. **Complete API docs** — Document `petPhoto`, `export`, `search`, `notification` routers

### Phase 2: External API (Sprint 4-5 — 4 weeks)

5. **REST gateway** — Hono route layer that maps REST `GET/POST/PUT/DELETE` to tRPC procedures. Auto-generate OpenAPI 3.1 spec from Zod schemas.
6. **API key auth** — `api_keys` table, `X-API-Key` header, scoped permissions (read-only, household-scoped)
7. **Webhook system** — `webhooks` table (url, events, secret), BullMQ delivery with retry/backoff, HMAC signing
8. **Developer portal** — Swagger UI served at `/docs`, API key management UI

### Phase 3: Real-Time (Sprint 6 — 2 weeks)

9. **tRPC subscriptions** — WebSocket support for dashboard live-updates
10. **Event bus** — Internal pub/sub for cross-router event propagation (activity completed → gamification recalc → dashboard update)

---

## Architecture Decisions

### REST Gateway Approach

**Decision:** Thin REST layer on top of existing tRPC, not a rewrite.

```
Client → REST /v1/pets → Hono route handler → calls tRPC procedure internally → response
Client → tRPC /trpc/pet.listByHousehold → existing tRPC handler → response
```

Both REST and tRPC share the same business logic. REST is a mapping layer only. OpenAPI spec auto-generated from the Zod schemas already defined in `@petforce/core`.

### Pagination Strategy

**Decision:** Keyset (cursor) pagination using `createdAt` + `id` composite cursor.

```ts
// Cursor = base64(JSON.stringify({ createdAt, id }))
input: z.object({
  householdId: z.uuid(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
})
```

Backward-compatible: existing offset-based calls still work during migration.

### Idempotency Strategy

**Decision:** Redis-backed idempotency with 5-minute TTL.

```
X-Idempotency-Key: <client-generated-uuid>
```

- On first request: execute mutation, store result in Redis keyed by idempotency key
- On duplicate: return stored result without re-executing
- No key provided: execute normally (backward-compatible)

---

## Subtasks for Delegation

| # | Task | Assignee | Priority | Depends On |
|---|------|----------|----------|------------|
| 1 | Add cursor pagination to 6 list endpoints | Full-Stack Engineer | high | — |
| 2 | Add idempotency key middleware | Backend/Full-Stack | high | — |
| 3 | Add input sanitization utility + Zod transform | Backend/Full-Stack | medium | — |
| 4 | Document petPhoto, export, search, notification routers | Docs | medium | — |
| 5 | API integration test suite (vitest + test DB) | QA | medium | — |
| 6 | REST gateway + OpenAPI spec generation | Full-Stack + CTO review | high | 1 |
| 7 | API key auth system | Backend | high | 6 |
| 8 | Webhook delivery system | Backend | high | 6 |
| 9 | Developer portal (Swagger UI) | Frontend | medium | 6 |
| 10 | tRPC WebSocket subscriptions | Backend | medium | — |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| API response P95 latency | < 200ms |
| Error rate (5xx) | < 0.1% |
| API documentation coverage | 100% of routers |
| Integration test coverage | > 80% of procedures |
| Time to first API call (external dev) | < 15 minutes |
| Webhook delivery success rate | > 99.5% |

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| REST gateway adds maintenance burden | Medium | Auto-generate from Zod schemas, not hand-written routes |
| Cursor pagination breaks existing clients | Low | Backward-compatible — offset still works |
| Webhook delivery failures | Medium | BullMQ retry with exponential backoff, dead letter queue |
| API key leakage | Medium | Short-lived keys, scoped permissions, audit log on creation/use |

---

## Next Steps

1. **CEO review** — Validate scope and priority alignment
2. **Create subtasks in Paperclip** — Break into delegatable tickets
3. **Phase 1 kickoff** — Assign cursor pagination and idempotency to Full-Stack Engineer
4. **Phase 2 design** — CTO owns REST gateway architecture, review with team
