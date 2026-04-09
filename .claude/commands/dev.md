---
description: Start development servers for one or all apps
allowed-tools: Bash
---
Start PetForce development servers.

If an argument is provided, use it as a filter: `pnpm dev --filter=$ARGUMENTS`
If no argument, start all apps: `pnpm install && pnpm dev`

Available filters: web, api, mobile
