# Storage & Database Security Model

## Database Access

### Connection Security

- **SSL/TLS:** Enforced in production (`ssl: 'require'` on the postgres client). Development connections use the default (no SSL for local PostgreSQL).
- **Connection string:** `DATABASE_URL` validated at startup via Zod — must be a `postgres://` or `postgresql://` URI.
- **Connection pooling:** Max 20 connections (prod), 5 (dev). Idle timeout 20s, connect timeout 10s, max lifetime 30 min.
- **Statement timeout:** 30s default, configurable via `DB_STATEMENT_TIMEOUT`.

### Row-Level Security (RLS)

RLS is **enabled on all 21 tables** (migration `0006_enable-rls-all-tables.sql`).

**Current policy: implicit DENY ALL.** No explicit `CREATE POLICY` statements exist, which means:

- The **service role** (used by the API server) **bypasses RLS** — this is by design. All authorization is enforced at the application layer via Clerk JWT verification and household membership checks.
- The **anon key** (if ever used) is blocked from reading or writing any table.
- Direct access via the Supabase Dashboard REST API (using the anon key) is blocked.

This is a defense-in-depth measure. If we later add client-side Supabase access (e.g., Realtime subscriptions), we'll add explicit per-table policies.

### Application-Layer Authorization

All tRPC procedures use one of:

| Procedure | Checks |
|-----------|--------|
| `publicProcedure` | No auth required |
| `protectedProcedure` | Valid Clerk JWT (extracts `userId`) |
| `householdProcedure` | Valid JWT + verified household membership |

Role-based helpers (`requireAdmin()`, `requireOwner()`) further restrict sensitive operations.

## Supabase Storage

### Buckets

| Bucket | Visibility | Purpose | Path structure |
|--------|-----------|---------|----------------|
| `pet-avatars` | Public | Pet profile pictures | `{householdId}/{petId}.{ext}` |
| `pet-photos` | Public | Pet photo gallery | `{householdId}/{petId}/{photoId}.{ext}` |

Both buckets are **public** (unauthenticated downloads via public URL). This is intentional — pet photos are shareable content and public URLs avoid signed-URL complexity.

### Upload Authorization

Uploads are **not** done directly from the client. The flow is:

1. Client sends file to the API server (`/api/upload/pet-avatar` or tRPC `petPhoto.upload`).
2. API server verifies Clerk JWT and household membership.
3. API server uploads to Supabase Storage using the **service role key** (server-side only).

The service role key is:
- Validated at startup (required, non-empty).
- Never exposed to the client.
- Only used in `apps/api/src/lib/supabase-storage.ts`.

### File Validation

Before upload, the API validates:
- **MIME type:** Only `image/jpeg`, `image/png`, `image/webp` allowed.
- **Magic bytes:** Binary signature checked (not just the `Content-Type` header).
- **File size:** Max 5 MB for both avatars and photos.

### Bucket Scoping

The Supabase client is used **exclusively** for the two buckets above. No other storage operations exist in the codebase. The `BUCKET` and `PHOTO_BUCKET` constants are hardcoded in `supabase-storage.ts`.

## Rate Limiting

Upload endpoints are rate-limited: 30 requests per 15 minutes per IP (production).

## Recommendations for Future Work

1. **Signed URLs:** If pet photos ever need to be private, switch buckets to private and generate short-lived signed URLs.
2. **Per-table RLS policies:** If client-side Supabase access is added (e.g., Realtime), create explicit policies scoped by `auth.uid()` and household membership.
3. **Key rotation:** Document a service role key rotation procedure.
