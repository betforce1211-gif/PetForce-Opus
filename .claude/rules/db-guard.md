---
globs: ["packages/db/**"]
---
STOP before editing packages/db/**:
1. Run /guard (mandatory, no exceptions)
2. Review the full migration workflow and conventions: packages/db/CLAUDE.md
3. One concern per migration PR. Never drop columns without a deprecation PR first.
