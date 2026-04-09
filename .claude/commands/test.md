---
description: Run tests for a specific package or the entire monorepo
allowed-tools: Bash
---
Run PetForce tests.

Always run `pnpm install` first.

If an argument is provided, scope to that package: `pnpm test --filter=$ARGUMENTS`
If no argument, run all tests: `pnpm test`

For E2E tests: `pnpm test:e2e`
