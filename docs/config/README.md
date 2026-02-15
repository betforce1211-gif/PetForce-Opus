# Configuration Guide

[Developer]

This guide covers all the external services and environment variables needed to run PetForce.

---

## Table of Contents

- [Environment Variables](#environment-variables)
- [Database (PostgreSQL / Supabase)](#database)
- [Authentication (Clerk)](#authentication)
- [File Storage (Supabase Storage)](#file-storage)
- [Web App (Next.js)](#web-app)
- [API Server (Hono)](#api-server)
- [Where Env Files Live](#where-env-files-live)

---

## Environment Variables

All variables at a glance:

| Variable | Required | Used by | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | yes | API, DB | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes | Web | Clerk public key (starts with `pk_test_` or `pk_live_`) |
| `CLERK_SECRET_KEY` | yes | Web, API | Clerk secret key (starts with `sk_test_` or `sk_live_`) |
| `CLERK_JWT_KEY` | no | API | Clerk PEM public key for direct JWT verification (recommended) |
| `SUPABASE_URL` | yes* | API | Supabase project URL (for pet photo uploads) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes* | API | Supabase service role key |
| `API_PORT` | no | API | API server port (default: `3001`) |
| `NEXT_PUBLIC_API_URL` | no | Web | API base URL (default: `http://localhost:3001`) |

\* Required only if pet photo uploads are needed. The app works without Supabase — photos just won't upload.

Copy `.env.example` at the repo root to get started:

```bash
cp .env.example .env
```

---

## Database

PetForce uses **PostgreSQL** via [Drizzle ORM](https://orm.drizzle.team/). The recommended hosting is [Supabase](https://supabase.com) (free tier available), but any PostgreSQL 15+ instance works.

### Option A: Supabase (recommended)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings > Database** and copy the connection string
3. Set `DATABASE_URL` in your `.env`:
   ```
   DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
4. Push the schema:
   ```bash
   pnpm --filter=@petforce/db db:push
   ```

### Option B: Local PostgreSQL

1. Install PostgreSQL (Homebrew: `brew install postgresql@15`)
2. Create a database:
   ```bash
   createdb petforce
   ```
3. Set `DATABASE_URL`:
   ```
   DATABASE_URL=postgresql://localhost:5432/petforce
   ```
4. Push the schema:
   ```bash
   pnpm --filter=@petforce/db db:push
   ```

### Schema Management

The schema is defined in `packages/db/src/schema.ts`. After making changes:

```bash
# Generate a migration file (optional, for version control)
pnpm --filter=@petforce/db db:generate

# Push schema directly to the database
pnpm --filter=@petforce/db db:push
```

**Note:** `drizzle-kit push` is interactive — it may prompt about constraints. For automated environments, use raw SQL via the `postgres` driver instead.

### Drizzle Kit Config

Located at `packages/db/drizzle.config.ts`. Reads `DATABASE_URL` from the environment. If running manually:

```bash
cd packages/db
export $(grep -v '^#' .env.local | xargs)
npx drizzle-kit push
```

---

## Authentication

PetForce uses [Clerk](https://clerk.com) for authentication. Clerk handles sign-up, sign-in, session management, and JWT tokens.

### Setup

1. Create an account at [clerk.com](https://clerk.com)
2. Create an application
3. Go to **API Keys** and copy:
   - **Publishable key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret key** → `CLERK_SECRET_KEY`

### How Auth Works

**Web app (Next.js):**
- Clerk's `<ClerkProvider>` wraps the app in `layout.tsx`
- `clerkMiddleware` in `src/middleware.ts` protects `/dashboard`, `/onboard`, and `/join` routes
- Unauthenticated users are redirected to the sign-in page
- Clerk issues a JWT that the web app sends to the API in the `Authorization` header

**API server (Hono):**
- Every tRPC request includes `Authorization: Bearer <jwt>`
- `clerk-auth.ts` verifies the token and extracts `userId`
- Two verification modes:
  - **`CLERK_JWT_KEY`** (recommended): Direct PEM public key verification — no network calls, faster
  - **`CLERK_SECRET_KEY`** fallback: Fetches JWKS from Clerk — works but slower, can fail in some environments

### Getting CLERK_JWT_KEY (recommended for API)

1. In Clerk dashboard, go to **API Keys > Advanced**
2. Copy the **PEM Public Key**
3. Set it in your env (replace newlines with `\n`):
   ```
   CLERK_JWT_KEY=-----BEGIN PUBLIC KEY-----\nMIIB...\n-----END PUBLIC KEY-----
   ```

### Clerk Test Mode

For local development, use Clerk's **test mode** keys (`pk_test_`, `sk_test_`). Test mode supports:
- OTP code `424242` for all test accounts
- No email verification required
- Compatible with Playwright E2E tests via `@clerk/testing`

---

## File Storage

Pet avatar photos are uploaded to [Supabase Storage](https://supabase.com/docs/guides/storage).

### Setup

1. In your Supabase project, go to **Storage**
2. Create a bucket named **`pet-avatars`**
3. Set the bucket to **public** (so avatars load without auth)
4. Copy your project URL and service role key:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

### How It Works

- The API server receives photo uploads at `POST /upload/pet-avatar`
- Files are validated: JPEG, PNG, or WebP only, max 5 MB
- Uploaded to `pet-avatars/{householdId}/{petId}.{ext}` (upsert — replaces existing)
- A public URL with a cache-buster timestamp is stored in the pet record
- The service role key is used server-side only (never exposed to the client)

### Without Supabase

If `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are not set, pet photo uploads will fail with an error. Everything else works fine — pets just won't have custom photos.

---

## Web App

The Next.js web app runs on port `3000` by default.

### Key Config

**`next.config.js`:**
- `transpilePackages`: Compiles `@petforce/ui` and `@petforce/core` from source (they use `noEmit`)
- `reactStrictMode`: Enabled

**`src/middleware.ts`:**
- Clerk middleware protecting `/dashboard`, `/onboard`, `/join`
- All other routes are public (landing page, sign-in, sign-up)

**`src/app/providers.tsx`:**
- tRPC client configured with `httpBatchLink` pointing at `NEXT_PUBLIC_API_URL`
- Clerk JWT automatically attached to every API request via `getToken()`
- React Query with 2 retries, 500ms delay

### Environment for Web

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env.local` | Client-side Clerk init |
| `CLERK_SECRET_KEY` | `.env.local` | Server-side Clerk (middleware) |
| `NEXT_PUBLIC_API_URL` | `.env.local` | tRPC API base URL |

`NEXT_PUBLIC_` variables are embedded at **build time** — rebuild after changing them.

---

## API Server

The Hono API server runs on `API_PORT` (default `3001`).

### Key Config

**`src/index.ts`:**
- CORS enabled for all origins (development)
- `/upload/*` routes for file uploads
- `/trpc/*` routes for tRPC
- `/health` endpoint returns `{ status: "ok" }`

**`env.cjs`:**
- Preload script that reads `.env.local` before any ESM imports
- Required because `tsx watch` doesn't auto-load env files, and ESM import hoisting means inline env loading runs too late
- Used via: `tsx --require ./env.cjs watch src/index.ts`

### Environment for API

| Variable | Where | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | `.env.local` | PostgreSQL connection |
| `CLERK_SECRET_KEY` | `.env.local` | JWT verification (fallback) |
| `CLERK_JWT_KEY` | `.env.local` | JWT verification (recommended) |
| `SUPABASE_URL` | `.env.local` | Pet photo storage |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` | Pet photo storage |
| `API_PORT` | `.env.local` | Server port (default: 3001) |

---

## Where Env Files Live

Each app/package can have its own `.env.local` file. The root `.env.example` is a template.

| File | Used by |
|------|---------|
| `.env.example` | Template (checked into git) |
| `apps/web/.env.local` | Next.js dev server |
| `apps/api/.env.local` | Hono API server (loaded via `env.cjs`) |
| `packages/db/.env.local` | Drizzle Kit CLI commands |
| `tests/.env` | Playwright E2E tests |

**Never commit `.env.local` or `.env` files.** They contain secrets.

The simplest setup is to put all variables in the root `.env` and symlink or copy to each app, but each app only reads its own env file.
