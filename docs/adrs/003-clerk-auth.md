# ADR-003: Use Clerk for Authentication

**Status:** Accepted
**Date:** 2026-04-08
**Author:** Architect

## Context

PetForce needs authentication that:
- Supports both Next.js (web) and Expo (mobile) clients from a single provider
- Provides managed user accounts (email, social login, MFA) without building auth infrastructure
- Issues JWTs that can be verified on the API server without a runtime call to an external service
- Supports a test mode for E2E testing without real email verification or SMS OTPs

Auth is a foundational concern that touches every layer of the stack. A wrong choice here requires ripping out auth middleware, session management, and frontend SDK calls across all apps — an expensive migration.

## Decision

Use Clerk as the managed authentication provider. Clients authenticate via Clerk SDKs (`@clerk/nextjs` for web, `@clerk/expo` for mobile). The API server verifies JWTs using `CLERK_JWT_KEY` — public key verification is local, with no runtime calls to Clerk's API for auth checks.

The `ctx.userId` extracted in tRPC middleware is always a Clerk user ID string. All household membership checks build on top of this identity.

## Rationale

Clerk provides first-class SDKs for both Next.js and Expo, which is rare. Most auth providers treat mobile as a second-class citizen. Clerk's Expo SDK handles token refresh, secure storage, and native OAuth flows — functionality that would take weeks to build and maintain correctly.

Local JWT verification (via `CLERK_JWT_KEY`) means the API server's auth check has no external dependency. Even if Clerk's service has downtime, authenticated users with valid JWTs can continue to use the app. Only new signups and logins would be affected.

Clerk's test mode (`+clerk_test` email suffix, fixed OTP `424242`) enables E2E tests to authenticate deterministically without real email inboxes or SMS delivery. This is essential for reliable CI.

## Consequences

- Fast implementation: Clerk handles signup, login, password reset, MFA, and social auth out of the box — no auth infrastructure to maintain.
- JWT verification is local (using `CLERK_JWT_KEY`), so the API server has no runtime dependency on Clerk availability for auth checks on existing sessions.
- Vendor dependency: if Clerk is down, new user signups and logins fail. There is no local fallback for authentication initiation.
- `ctx.userId` in tRPC procedures is always a Clerk user ID string — it is the sole identity anchor for all authorization logic.
- **Agent constraint:** Clerk test mode uses `+clerk_test` email suffix with a fixed OTP code of `424242` — this is the only supported mechanism for E2E test authentication. Never write E2E tests that attempt to receive real emails, use magic links, or mock the Clerk SDK. See `tests/.env` for test credentials. Any test that bypasses Clerk entirely is invalid and will not be accepted.

## Alternatives Considered

**Auth.js (NextAuth):** Open-source, self-hosted. Rejected because: limited mobile (Expo) support — Auth.js is primarily designed for Next.js server-side auth. Mobile integration requires custom adapters with no official support.

**Supabase Auth:** Comes free with Supabase hosting. Rejected because: tightly coupled to the Supabase database layer (row-level security policies reference Supabase auth). We want auth decoupled from the database provider so either can be swapped independently.

**Firebase Auth:** Mature, multi-platform. Rejected because: locks into the Google ecosystem, Firebase JWT verification patterns differ from standard JWTs, and the Firebase SDK significantly increases bundle size on mobile.

**Custom auth:** Maximum control. Rejected because: high security risk for a small team — JWT signing, session management, and refresh token rotation are easy to implement incorrectly. Significant ongoing maintenance burden with no product differentiation.
