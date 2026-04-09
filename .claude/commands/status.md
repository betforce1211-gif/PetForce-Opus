---
description: Show project health — git status, branch, recent commits, lint, type-check
allowed-tools: Bash
---
Show PetForce project health:

1. Run `git status` to show working tree state
2. Run `git log --oneline -5` to show recent commits
3. Run `pnpm lint` to check for lint errors
4. Run `pnpm build` to verify all packages compile

Report results with pass/fail for each step.
