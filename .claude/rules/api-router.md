---
globs: ["apps/api/src/routers/**"]
---
STOP before editing API routers:
1. Every household-scoped procedure MUST use `householdProcedure`. Using `protectedProcedure` for household data is a SECURITY FAILURE, not a style issue.
2. Co-located unit tests required: {router}.test.ts next to {router}.ts
3. Full tRPC conventions (pagination, RBAC, error codes, response patterns): docs/dev/conventions.md
4. Router-specific context: apps/api/CLAUDE.md
