---
globs: ["packages/core/**"]
---
STOP before editing packages/core/**:
1. Run /guard (mandatory, no exceptions)
2. Breaking changes here fail web, mobile, AND API simultaneously.
3. After changes: verify `pnpm build` passes for all packages.
4. Full conventions and schema patterns: packages/core/CLAUDE.md
