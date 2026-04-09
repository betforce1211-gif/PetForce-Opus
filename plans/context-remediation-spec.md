# PetForce Context Hierarchy Remediation Spec

**Goal:** Achieve 5/5 across all 6 audit categories → 100% score, Grade A, full Comprehensive tier compliance.

**Current State:** Grade B (76%) — Entry Point 5/5, Progressive Disclosure 4/5, Agent Infrastructure 4/5, Context Budgeting 3/5, Maintainability 3/5, Architectural Legibility 3/5.

**Target State:** Grade A (100%) — All categories 5/5.

---

## Category 1: Entry Point Quality (5/5 → 5/5) — MAINTAIN

**No changes needed.** CLAUDE.md is 196 lines, well-structured map with 33 internal links, Deep-Dive Docs table, skill routing, and hard rules. Exemplary.

**Maintenance only:** After all other changes in this spec are complete, update the Deep-Dive Docs table to include new pointers (ADRs, docs index).

### Task 1.1: Update CLAUDE.md Deep-Dive Docs table
- **File:** `CLAUDE.md`
- **Action:** Edit existing Deep-Dive Docs table
- **Changes:**
  - Add row: `| Architecture Decision Records | docs/adrs/README.md |`
  - Add row: `| Design proposals (in-progress) | docs/design/README.md |`
  - Add row: `| Documentation index | docs/README.md |`
  - Add row: `| Deployment topology | docs/config/deployment.md |`
  - Verify line count stays under 200 (adds ~4 lines to the table, bringing total to ~200)
- **Also add** a one-line mention of `/dev`, `/test`, `/migrate`, `/status` commands to the Agent Tooling section (after the gstack skills list) so agents discover the new commands

---

## Category 2: Progressive Disclosure (4/5 → 5/5)

**Gap analysis:** Missing glob-scoped rules, no docs/ index file, packages/config/ has no CLAUDE.md.

**Note on gstack CLAUDE.md (387 lines):** This is an outlier by the 200-line CLAUDE.md standard, but it is acceptable. gstack is a third-party skill plugin with its own internal documentation hierarchy. Its CLAUDE.md is the entry point for the gstack skill ecosystem (30+ skills), not a project CLAUDE.md. It follows skill conventions, not project conventions. No action needed.

### Task 2.1: Create `.claude/rules/` directory with glob-scoped rules

Create 4 rules files that auto-inject context when agents touch specific file patterns. This converts opt-in guardrails (petforce-guardrails skill) into always-on enforcement.

#### Task 2.1a: `.claude/rules/db-guard.md`
```yaml
---
globs: ["packages/db/**"]
---
```
**Content (target: ~8 lines) — enforcement trigger, NOT a summary:**
```
STOP before editing packages/db/**:
1. Run /guard (mandatory, no exceptions)
2. Review the full migration workflow and conventions: packages/db/CLAUDE.md
3. One concern per migration PR. Never drop columns without a deprecation PR first.
```

**Design principle:** This file is a distilled enforcement trigger. It does NOT duplicate the migration checklist — that lives authoritatively in `packages/db/CLAUDE.md`. The rule file's job is to stop the agent and point it to the right source of truth.

**Prerequisite (Task 2.1a-prereq):** Before creating this file, consolidate the Drizzle migration checklist. The canonical 6-step checklist must live in exactly ONE place: `packages/db/CLAUDE.md`. Update `packages/db/CLAUDE.md` to contain the definitive version (matching petforce-guardrails). Then update `petforce-guardrails/SKILL.md` to reference `packages/db/CLAUDE.md` instead of inlining the checklist: "See packages/db/CLAUDE.md for the full migration checklist."

#### Task 2.1b: `.claude/rules/core-guard.md`
```yaml
---
globs: ["packages/core/**"]
---
```
**Content (target: ~8 lines) — enforcement trigger, NOT a summary:**
```
STOP before editing packages/core/**:
1. Run /guard (mandatory, no exceptions)
2. Breaking changes here fail web, mobile, AND API simultaneously.
3. After changes: verify `pnpm build` passes for all packages.
4. Full conventions and schema patterns: packages/core/CLAUDE.md
```

**Design principle:** Same as db-guard — stop the agent, point to authoritative source. Does not duplicate schema naming conventions that already live in `packages/core/CLAUDE.md`.

#### Task 2.1c: `.claude/rules/api-router.md`
```yaml
---
globs: ["apps/api/src/routers/**"]
---
```
**Content (target: ~10 lines) — enforcement trigger + two additive rules not covered elsewhere:**
```
STOP before editing API routers:
1. Every household-scoped procedure MUST use `householdProcedure`. Using `protectedProcedure` for household data is a SECURITY FAILURE, not a style issue.
2. Co-located unit tests required: {router}.test.ts next to {router}.ts
3. Full tRPC conventions (pagination, RBAC, error codes, response patterns): docs/dev/conventions.md
4. Router-specific context: apps/api/CLAUDE.md
```

**Design principle:** Same trigger-and-pointer pattern as db-guard and core-guard. Only the two rules NOT already in `docs/dev/conventions.md` or `apps/api/CLAUDE.md` are inlined: (1) the `householdProcedure` security mandate with its severity framing, and (2) the co-located test requirement. All other router conventions (pagination, RBAC, return patterns, activity logging) already live authoritatively in `docs/dev/conventions.md` lines 70-180.

**Prerequisite:** Verify `apps/api/CLAUDE.md` contains error handling patterns (tRPC error code taxonomy: UNAUTHORIZED, FORBIDDEN, NOT_FOUND, BAD_REQUEST, CONFLICT). If not, add an "Error Handling" section (~10 lines) to `apps/api/CLAUDE.md` as part of this task.

#### Task 2.1d: `.claude/rules/ui-components.md`
```yaml
---
globs: ["packages/ui/**"]
---
```
**Content (target: ~6 lines) — enforcement trigger, NOT a summary:**
```
Tamagui components — shared by web AND mobile.
After any component change, verify BOTH apps render correctly.
Full conventions: packages/ui/CLAUDE.md
```

**Design principle:** Same pattern — trigger + pointer. The component conventions live in `packages/ui/CLAUDE.md`.

### Task 2.2: Create `docs/README.md` index file

**Audience clarification:** `docs/CLAUDE.md` (77 lines) already exists as the agent-facing context file for the Documentation agent — it describes scope, ownership, conventions, and coordination with other agents. The new `docs/README.md` serves a different purpose: a human-and-agent navigational index for the docs/ tree itself. These complement each other:
- `docs/CLAUDE.md` = "I am the Documentation agent — here's my role and rules"
- `docs/README.md` = "Here's how the docs directory is organized — find what you need"

- **File:** `docs/README.md`
- **Target:** ~60 lines
- **Content:**
  - One-paragraph overview of the docs structure
  - Table with 5 sections (user-guide, config, api, dev, runbooks) — each with description and link to section README
  - Quick-reference for which docs to read for common tasks (new feature → dev/conventions + api/; deployment → runbooks/; onboarding → user-guide/)
  - "Generated Content" section establishing the convention for future auto-generated docs (see Task 4.3)

### Task 2.3: Create `packages/config/CLAUDE.md`
- **File:** `packages/config/CLAUDE.md`
- **Target:** ~40 lines
- **Content:**
  - Overview: shared TypeScript and ESLint configurations for the monorepo
  - Impact scope: changes here affect the build pipeline of ALL packages and apps
  - Testing: after any edit, run `pnpm build` from root — verify zero regressions
  - What's in here: `tsconfig.base.json`, ESLint configs, shared compiler options
  - Coordinate with: Architect (for TS target changes), DevOps (for CI impact)
  - Link back to root CLAUDE.md conventions section

---

## Category 3: Agent Infrastructure (4/5 → 5/5)

**Gap analysis:** No `.claude/commands/`, no `.claude/settings.json` (team-shared), `settings.local.json` not gitignored, no `.mcp.json`, no hooks.

### Task 3.1: Create `.claude/settings.json` (team-shared)
- **File:** `.claude/settings.json`
- **Content:**
```json
{
  "permissions": {
    "deny": [
      "Bash(rm -rf:*)",
      "Bash(git push --force:*)",
      "Bash(git reset --hard:*)",
      "Bash(git clean -fd:*)",
      "Bash(DROP TABLE:*)",
      "Bash(DROP DATABASE:*)",
      "Bash(pnpm db:migrate:*)",
      "Bash(drizzle-kit push:*)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": "if echo \"$TOOL_INPUT\" | grep -qE 'packages/(db|core)/'; then echo '⚠️ PROTECTED SURFACE — run /guard before editing packages/db or packages/core'; fi",
            "statusMessage": "Checking protected surface boundary..."
          }
        ]
      },
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "if echo \"$TOOL_INPUT\" | grep -qE 'packages/(db|core)/'; then echo '⚠️ PROTECTED SURFACE — run /guard before editing packages/db or packages/core'; fi",
            "statusMessage": "Checking protected surface boundary..."
          }
        ]
      }
    ]
  }
}
```
- **Rationale:** Shared deny rules prevent destructive operations across all team members. The `pnpm db:migrate` and `drizzle-kit push` deny entries force explicit human approval for schema migrations — the most dangerous operation in the monorepo. PreToolUse hooks use the correct Claude Code nested schema (matcher → hooks array → command objects with statusMessage). Local overrides stay in `settings.local.json`.

**⚠️ Settings conflict resolution (Task 3.1-prereq):** The existing `.claude/settings.local.json` contains `"allow": ["Bash(bash:*)"]` which grants blanket shell access that could bypass the team deny list via shell expansion (e.g., `bash -c "rm -rf /"`). Resolution:
1. After creating `.claude/settings.json` (team), verify that Claude Code's permission merge behavior gives `deny` rules precedence over `allow` in a different settings file.
2. If deny does NOT take precedence: move the `allow` entries from `settings.local.json` into the team `settings.json` so both allow and deny live in one file with clear precedence.
3. Document the verified merge behavior in a comment at the top of `settings.local.json`.

### Task 3.2: Gitignore and untrack `settings.local.json`

This is a two-step sequential operation — the untrack MUST happen after the .gitignore edit.

**Step 1:** Edit `.gitignore` — append to the IDE section:
```
# Claude Code local settings
.claude/settings.local.json
```

**Step 2 (mandatory, not conditional):** The file IS currently tracked (confirmed by audit). Run:
```bash
git rm --cached .claude/settings.local.json
```
This untracks the file without deleting it locally. Without this step, the `.gitignore` entry has no effect on an already-tracked file.

**Step 3:** Commit both changes together with message: `fix: gitignore and untrack .claude/settings.local.json`

**⚠️ Phase 1 sequencing note:** This task CANNOT run in parallel with other Phase 1 tasks that modify git state. It must be sequenced: .gitignore edit → git rm --cached → commit, before any other file creation begins.

### Task 3.3: Create `.claude/commands/` directory with workflow commands

These provide lightweight aliases for common operations. Each command is a markdown file with YAML frontmatter.

#### Task 3.3a: `.claude/commands/dev.md`
```yaml
---
description: Start development servers for one or all apps
allowed-tools: Bash
---
```
**Content:** Instructions to run `pnpm install && pnpm dev` (or `pnpm dev --filter=$ARGUMENTS` if an argument is provided). List available filters: web, api, mobile.

#### Task 3.3b: `.claude/commands/test.md`
```yaml
---
description: Run tests for a specific package or the entire monorepo
allowed-tools: Bash
---
```
**Content:** Instructions to run `pnpm test` (or scoped to a package). Note: always `pnpm install` first. For E2E: `pnpm test:e2e`.

#### Task 3.3c: `.claude/commands/migrate.md`
```yaml
---
description: Safe database migration workflow with /guard enforcement
allowed-tools: Bash, Read
---
```
**Content:** Thin wrapper that invokes `/guard`, then references `packages/db/CLAUDE.md` for the canonical migration checklist. Does NOT re-list the steps — single source of truth.

#### Task 3.3d: `.claude/commands/status.md`
```yaml
---
description: Show project health — git status, branch, open issues, lint, type-check
allowed-tools: Bash
---
```
**Content:** Run `git status`, `git log --oneline -5`, `pnpm lint`, `pnpm build` and report results.

### Task 3.4: Create `.mcp.json` with Paperclip declaration
- **File:** `.mcp.json`
- **Content:**
```json
{
  "mcpServers": {
    "paperclip": {
      "_comment": "Task orchestration and agent governance — see CLAUDE.md Agent Tooling section",
      "url": "http://localhost:3100",
      "disabled": true
    }
  }
}
```
- **Rationale:** CLAUDE.md declares Paperclip at `localhost:3100` as the orchestration layer. Declaring it in `.mcp.json` — even disabled by default — signals to agents that this dependency exists and where it lives. The `disabled: true` prevents connection failures when Paperclip isn't running locally. Remove `disabled` when Paperclip is reliably available. An empty `mcpServers: {}` would signal "no MCP servers configured" which is misleading.
- **Note:** If Paperclip's MCP server spec is not yet finalized, use `"disabled": true` and add a TODO comment. The declaration is more useful than an empty file.

### ~~Task 3.5~~ — Merged into Task 3.1

Hook configuration is now included directly in the `.claude/settings.json` content in Task 3.1, using the correct Claude Code nested schema (separate matcher entries for Edit and Write, each with a `hooks` array containing command objects with `statusMessage`). No separate task needed.

**Verification:** After creating `.claude/settings.json`, test by attempting an edit to `packages/db/src/schema.ts` — the statusMessage "Checking protected surface boundary..." should appear, followed by the warning if the path matches.

---

## Category 4: Context Budgeting (3/5 → 5/5)

**Gap analysis:** `docs/api/README.md` at 1,503 lines, 123 duplicate headings, no glob-scoped rules (addressed in Cat 2), generated content mixed with authored docs.

### Task 4.1: Split `docs/api/README.md` into per-router files

This is the single highest-impact context budgeting fix.

- **Current:** 1 file, 1,503 lines, covers all 15 routers
- **Target:** 1 index file (~80 lines) + 15 router files (~80-120 lines each)

#### Task 4.1a: Create `docs/api/README.md` (new index)
- **Target:** ~80 lines
- **Content:**
  - API overview: tRPC + Hono on port 3001, SuperJSON serialization
  - Auth model: `protectedProcedure` vs `householdProcedure`
  - Table of all 15 routers with procedure count, auth level, and link to detail file
  - Common patterns: pagination, error codes, input validation
  - Link to `docs/dev/conventions.md` for full tRPC conventions

#### Task 4.1b: Create per-router doc files
For each of the 15 routers, create `docs/api/{router}.md`:
- `docs/api/dashboard.md`
- `docs/api/household.md`
- `docs/api/pet.md`
- `docs/api/activity.md`
- `docs/api/member.md`
- `docs/api/invitation.md`
- `docs/api/access-request.md`
- `docs/api/feeding.md`
- `docs/api/health.md`
- `docs/api/calendar.md`
- `docs/api/finance.md`
- `docs/api/notes.md`
- `docs/api/reporting.md`
- `docs/api/analytics.md`
- `docs/api/gamification.md`

Each file (~80-120 lines):
- Router name, description, auth level
- Table of procedures: name, type (query/mutation), inputs, outputs
- Example requests/responses for key procedures
- Related routers (cross-links)

### Task 4.2: Audit and deduplicate content overlap

The scanner found 123 duplicate headings. Perform a targeted dedup:

1. **Identify overlapping content** between:
   - `CLAUDE.md` conventions section ↔ `docs/dev/conventions.md` (likely overlap in naming, schema patterns)
   - `CLAUDE.md` product principles ↔ `docs/dev/product-principles.md` (root has one-liners, doc has detail — this is correct progressive disclosure, verify it's not duplicated)
   - `packages/db/CLAUDE.md` ↔ `petforce-guardrails SKILL.md` (Drizzle rules likely duplicated)
   - `apps/api/CLAUDE.md` ↔ `docs/dev/conventions.md` tRPC section
2. **Rule of ownership:** Each fact lives in exactly ONE authoritative file. Other files link to it.
3. **Apply the pattern:**
   - Root CLAUDE.md: one-liner pointers only (already correct)
   - Subdirectory CLAUDE.md: package-specific rules + links to docs/dev/ for shared conventions
   - docs/dev/: authoritative source for shared conventions
   - petforce-guardrails: enforcement rules (what to DO), not reference (what things ARE)
   - `.claude/rules/`: auto-injected context distilled from the above

### Task 4.3: Establish generated content convention

**Note:** The project currently has no auto-generated documentation files. Rather than creating an empty `docs/generated/` directory with a placeholder README (structure for structure's sake), this task establishes the convention in `docs/README.md` (Task 2.2):

- Add a "Generated Content" section to `docs/README.md` explaining: "If automated doc generation is added in the future (e.g., API docs from tRPC schemas, type docs from Zod), generated files go in `docs/generated/` and must not be manually edited."
- This is a documentation convention, not a directory creation task. The directory gets created when the first generated content exists.

---

## Category 5: Maintainability & Freshness (3/5 → 5/5)

**Gap analysis:** 3 broken internal links, no CI validation, no last-updated headers, doc-gardening is manual.

### Task 5.1: Fix broken internal links

The audit scanner detected 3 broken internal links. Before execution, run the scanner's link check to identify the exact files and targets:
```bash
bash ~/.claude/skills/context-audit/scripts/audit.sh . 2>&1 | jq '.maintainability'
```

**Known candidates** (from the scanner's 6 detected internal links, 3 broken):
- `docs/CLAUDE.md` references `docs/api/overview.md`, `docs/api/households.md`, `docs/api/pets.md`, `docs/api/activities.md` — these files don't exist (current API docs are in a single `docs/api/README.md`). Task 4.1b will create replacement files, but with different names (`household.md` not `households.md`). **Fix:** Update `docs/CLAUDE.md` file structure diagram to match the actual post-split file names.
- Verify all root CLAUDE.md Deep-Dive Docs links resolve to existing files
- Verify all subdirectory CLAUDE.md cross-references work

**Acceptance criteria:** Zero broken internal links when the audit scanner re-runs in Phase 5.

### Task 5.2: Establish freshness tracking via git-derived timestamps

**Design decision:** Manual `last-updated` HTML comments will rot — authors forget to bump dates, and there's no reliable enforcement without CI that checks whether content changed without a date bump. Instead, derive freshness from git history, which is always accurate.

**Approach:** Do NOT add manual `last-updated` comments to files. Instead:
1. Add an `<!-- owner: {agent-name} -->` comment to each `docs/` file — this is the only manual field, and it changes rarely (ownership transfers, not content edits).
2. Freshness is computed by CI from `git log --follow -1 --format=%ci -- <file>` — always accurate, zero maintenance.
3. Resolve the existing inconsistency: `docs/dev/engineering-standards.md` line 9 has `Last updated: 2026-03-31` in prose format. Remove this and all similar prose dates — git log is the source of truth.

**Owner tags for docs/ files:**
- `docs/dev/*` → `<!-- owner: architect -->`
- `docs/api/*` → `<!-- owner: backend -->`
- `docs/user-guide/*` → `<!-- owner: docs -->`
- `docs/runbooks/*` → `<!-- owner: devops -->`
- `docs/config/*` → `<!-- owner: devops -->`

**New files created by this spec** get their `owner` tag at creation time (Phase 1 and Phase 2).

### Task 5.3: Create CI workflow for documentation validation

#### Task 5.3a: `.github/workflows/doc-validation.yml`
- **Trigger:** `pull_request` targeting `main`, paths: `docs/**`, `CLAUDE.md`, `**/CLAUDE.md`, `.claude/**`, `packages/*/CLAUDE.md`, `apps/*/CLAUDE.md`
- **Tool:** `markdown-link-check` (npm package, installed as a dev dependency or via npx)
- **Config file:** `.markdown-link-check.json` at root — configure to check internal links only (relative paths), ignore external URLs, resolve `.md` extensions
- **Jobs:**

  **Job 1: Link check**
  ```bash
  npx markdown-link-check --config .markdown-link-check.json docs/**/*.md **/CLAUDE.md
  ```
  Fail on any broken internal link. This catches stale cross-references.

  **Job 2: Budget check**
  ```bash
  find docs/ -name '*.md' -not -path 'docs/generated/*' | while read f; do
    lines=$(wc -l < "$f")
    if [ "$lines" -gt 500 ]; then echo "FAIL: $f ($lines lines > 500)"; exit 1; fi
  done
  ```
  Applies to all `docs/` files except `docs/generated/`. Does NOT apply to `.claude/rules/` or `.claude/skills/` files (those follow skill conventions, not doc conventions).

  **Job 3: Freshness check (git-derived)**
  ```bash
  for f in $(git diff --name-only origin/main...HEAD -- 'docs/*.md'); do
    last_commit=$(git log --follow -1 --format=%ci -- "$f")
    days_ago=$(( ($(date +%s) - $(date -d "$last_commit" +%s)) / 86400 ))
    if [ "$days_ago" -gt 90 ]; then echo "WARN: $f last substantively changed $days_ago days ago"; fi
  done
  ```
  **Logic:** For files MODIFIED in this PR, check if the last git commit touching the file is >90 days old. If the file is being modified in this PR, it will show as fresh (0 days). The warning triggers when a PR touches a file that hasn't been touched in 90+ days — suggesting the edit may need a broader review for staleness.

  **Job 4: Structure check**
  ```bash
  for dir in apps/web apps/api apps/mobile packages/core packages/db packages/ui packages/config; do
    if [ ! -f "$dir/CLAUDE.md" ]; then echo "FAIL: Missing $dir/CLAUDE.md"; exit 1; fi
  done
  ```
  Verifies every app and package directory has a CLAUDE.md. The list is hardcoded to the known directories — add new ones as the monorepo grows.

### Task 5.4: Automate doc-gardener in CI

Convert `infra/scripts/doc-gardener` from a manual script to a scheduled CI job:

#### Task 5.4a: `.github/workflows/doc-gardener.yml`
- **Trigger:** Scheduled weekly — **Thursday night** (cron: `0 3 * * 5` UTC = Thursday 10pm ET) + `workflow_dispatch` for manual runs
- **Schedule rationale:** The weekly agent review runs Fridays (`docs/dev/weekly-agent-review.md` line 7). Thursday night gardening ensures findings are available for Friday review. Sunday would surface issues 5 days before anyone acts on them.
- **Jobs:**

  **Job 1: Run doc-gardener**
  ```bash
  bash infra/scripts/doc-gardener
  ```

  **Job 2: Create GitHub issue for findings**
  ```bash
  # If stale docs found (>90 days without git commit), create issue
  gh issue create --title "Doc gardener: stale docs found $(date +%Y-%m-%d)" \
    --body "$GARDENER_OUTPUT" --label "docs,maintenance"
  ```
  Uses `gh` CLI — the most durable output format for a 9-agent project (issues are tracked, assignable, closeable). No Slack webhooks or external integrations required.

  **Job 3: Broken link sweep**
  ```bash
  npx markdown-link-check --config .markdown-link-check.json docs/**/*.md **/CLAUDE.md
  # If failures, append to the issue created in Job 2
  ```

### Task 5.5: Add CODEOWNERS entries for docs

Add to `.github/CODEOWNERS`:
```
# Documentation
docs/                    @petforce/docs-team
docs/api/                @petforce/backend-team
**/CLAUDE.md             @petforce/architect
.claude/                 @petforce/architect
```

**Rationale:** `docs/api/` is owned by the Backend agent/team, not the Documentation team — API reference files must stay in sync with router code changes. More specific path (`docs/api/`) overrides the general `docs/` rule in CODEOWNERS.

**⚠️ Prerequisite (Task 5.5-prereq): Verify GitHub teams exist.** CODEOWNERS silently ignores entries for non-existent teams — no error, no reviewer auto-request, no accountability. Before adding entries:
```bash
gh api orgs/{org}/teams --jq '.[].slug' | grep -E 'docs-team|backend-team|architect'
```
If teams don't exist, create them:
```bash
gh api orgs/{org}/teams -f name="docs-team" -f privacy="closed"
gh api orgs/{org}/teams -f name="backend-team" -f privacy="closed"
gh api orgs/{org}/teams -f name="architect" -f privacy="closed"
```
If this is a personal repo (not an org), use individual GitHub usernames instead of team refs. The spec executor must verify which applies before writing CODEOWNERS.

---

## Category 6: Architectural Legibility (3/5 → 5/5)

**Gap analysis:** No ADRs, no design docs directory, architectural decisions embedded in prose.

### Task 6.1: Create ADR directory and template

#### Task 6.1a: `docs/adrs/README.md`
- **Target:** ~50 lines
- **Content:**
  - What ADRs are and why we use them
  - Table of all ADRs with number, title, status (proposed/accepted/deprecated/superseded), date
  - How to create a new ADR: copy template, fill in sections, submit PR
  - Link from root CLAUDE.md

#### Task 6.1b: `docs/adrs/template.md`
- **Target:** ~30 lines
- **Content:**
```markdown
# ADR-NNN: Title

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-NNN
**Date:** YYYY-MM-DD
**Author:** {name or agent}

## Context
What is the issue that we're seeing that motivates this decision?

## Decision
What is the change that we're proposing and/or doing?

## Consequences
What becomes easier or more difficult because of this change?

## Alternatives Considered
What other options were evaluated? Why were they rejected?
```

#### Task 6.1c–g: Backfill 5 foundational ADRs

Each ADR should be 60-100 lines with real rationale, not boilerplate. **Critical requirement:** The Consequences section must include at least one operationally-specific consequence that directly constrains how an agent writes code — not just abstract trade-offs.

**ADR-001: Use tRPC over REST for API layer**
- Context: Need type-safe API for monorepo with shared types across web, mobile, and API
- Decision: tRPC with Hono adapter, SuperJSON serialization
- Alternatives: REST + OpenAPI (broad client support but no type inference), GraphQL (flexible queries but over-engineered for this domain)
- Consequences:
  - End-to-end type safety from Zod schemas in `@petforce/core` through tRPC procedures to frontend hooks
  - **Agent constraint:** Any non-TypeScript consumer (webhooks, server-sent events, third-party integrations) CANNOT use tRPC — they must hit the Hono HTTP layer directly. This affects all future integration work.
  - SuperJSON enables Date/BigInt serialization without manual transforms
  - Locked to TypeScript clients — no Python/Go SDK possible

**ADR-002: Use Drizzle ORM over Prisma**
- Context: Need ORM for PostgreSQL with fine-grained query control and lightweight footprint
- Decision: Drizzle ORM with drizzle-kit for migrations
- Alternatives: Prisma (more mature but heavy, opaque query engine), Knex (query builder only, no schema-as-code), raw SQL (no type safety)
- Consequences:
  - SQL-like API means agents can write complex queries without learning an abstraction layer
  - **Agent constraint:** All schema changes go through `packages/db/src/schema.ts` → `drizzle-kit generate` → review SQL → `drizzle-kit migrate`. Never write raw migration SQL. See `packages/db/CLAUDE.md` for the full 6-step checklist.
  - Less mature ecosystem means fewer community examples — check Drizzle docs, not StackOverflow
  - Migration files are auto-generated SQL, not hand-written — never edit migration files directly

**ADR-003: Use Clerk for authentication**
- Context: Need managed auth with multi-platform support (Next.js web + Expo mobile)
- Decision: Clerk with JWT verification on API server via `CLERK_JWT_KEY`
- Alternatives: Auth.js (limited mobile support), Supabase Auth (database-coupled), Firebase Auth (Google ecosystem lock-in), custom (high maintenance)
- Consequences:
  - **Agent constraint:** Clerk test mode uses `+clerk_test` email suffix with OTP code `424242` — this is how E2E tests authenticate without real email. See `tests/.env` for test credentials.
  - JWT verification happens in API middleware using `CLERK_JWT_KEY` — NOT the Clerk SDK. The API server never calls Clerk's API at runtime.
  - Vendor dependency on Clerk — if Clerk is down, all auth is down. No local fallback.
  - Single auth layer: never implement parallel auth logic anywhere (enforced by petforce-guardrails)

**ADR-004: Use Tamagui for cross-platform UI**
- Context: Need shared component library for Next.js and Expo with household theme customization
- Decision: Tamagui with theme tokens supporting `primaryColor`, `secondaryColor` per household
- Alternatives: NativeWind (CSS-in-RN, no true component sharing), React Native Web (limited web styling), separate component libs (double maintenance)
- Consequences:
  - True cross-platform components — one component file runs on both web and mobile
  - **Agent constraint:** After ANY `packages/ui/` component change, verify BOTH web and mobile render correctly. A component that looks right on web may break on mobile (different layout engines).
  - Tamagui has a steep learning curve — use existing components as patterns, don't invent new styling approaches
  - Theme tokens must be used for colors — never hardcode hex values in components

**ADR-005: Household-centric data model**
- Context: Pet care is a collaborative, multi-member activity — families, sitters, and vets share responsibility
- Decision: Household as the root entity, all data scoped to `householdId`
- Alternatives: User-centric model (each user owns their pets — no collaboration), pet-centric model (pets are top-level — unclear who manages them)
- Consequences:
  - Natural multi-member collaboration — every data entity belongs to a Household, not a User
  - **Agent constraint (SECURITY):** Every household-scoped procedure MUST use `householdProcedure` middleware. Using `protectedProcedure` for household data is a SECURITY FAILURE — it allows cross-household data access (IDOR). No exceptions.
  - Foreign keys cascade through `householdId` — deleting a household deletes all its data
  - `joinCode` allows access requests — an attack surface that requires careful validation (7-day expiry, approval required)

**ADR-006: Gamification as lazy recalculation** *(bonus — addresses non-obvious architecture)*
- Context: Gamification stats (XP, levels, badges, streaks) across members, households, and pets
- Decision: Denormalized stats tables recalculated on-demand from completion history, not maintained in real-time
- Alternatives: Event-driven real-time stat updates (complex, error-prone), CQRS with separate read models (over-engineered for current scale)
- Consequences:
  - **Agent constraint:** Never update gamification stats directly — always call `gamification.recalculate` which rebuilds from source data. Direct stat updates will be overwritten.
  - Stats can be temporarily stale until recalculation — this is by design
  - Adding new badge types requires updating the recalculation logic, not adding new event handlers

### Task 6.2: Create `docs/design/` directory for design documents

#### Task 6.2a: `docs/design/README.md`
- **Target:** ~30 lines
- **Content:**
  - **Purpose clarification:** This directory is for **in-progress design proposals** — larger than an ADR but not yet implemented. ADRs record decisions already made; design docs explore proposals that may or may not be adopted. Execution plans (in `docs/exec-plans/`) are implementation-level; design docs are architecture-level.
  - Explicit statement: "This directory is currently empty. Design docs are created when a new architectural proposal is being evaluated. For historical decisions, see `docs/adrs/`."
  - Table of design docs with title, status, date (empty initially)
  - Template reference
  - **Note:** The empty-but-explained state is intentional. An agent reading this knows the difference between "no designs exist" and "no decisions were documented."

#### Task 6.2b: `docs/design/template.md`
- **Target:** ~25 lines
- **Content:**
```markdown
# Design: Title

**Status:** Draft | In Review | Approved | Implemented
**Date:** YYYY-MM-DD
**Author:** {name or agent}

## Problem Statement
## Proposed Solution
## Data Model Changes
## API Changes
## Migration Strategy
## Open Questions
```

### Task 6.3: Add Key Decisions section to architecture.md

- **File:** `docs/dev/architecture.md`
- **Action:** Insert a "Key Architectural Decisions" section as a new top-level section BEFORE the "Gamification System" section (line ~196). This positions it after the core architecture (domain model, data flow, API routers) and before the feature-specific appendix sections.
- **Target:** ~25 lines
- **Content:**
  - Table: Decision | ADR | Rationale (one-liner)
  - Links to each of the 6 ADR files
  - Note: "For full decision context and alternatives considered, read the linked ADR"
  - Cross-link to `docs/exec-plans/active/` for current implementation state

### Task 6.4: Close deployment and error handling legibility gaps

Two agent-critical knowledge paths are currently broken — an agent starting from CLAUDE.md cannot navigate to understand how the system is deployed or how errors are handled.

#### Task 6.4a: Add error handling section to `apps/api/CLAUDE.md`
- **File:** `apps/api/CLAUDE.md`
- **Target:** Add ~15 lines
- **Content:**
  - tRPC error code taxonomy: `UNAUTHORIZED` (no auth), `FORBIDDEN` (wrong role/household), `NOT_FOUND` (entity missing), `BAD_REQUEST` (validation failure), `CONFLICT` (duplicate resource)
  - Pattern: throw `TRPCError` with descriptive message, never return error objects in success responses
  - Permission checks early in procedure body — fail fast before business logic
  - Cross-link to `docs/dev/conventions.md` Error Handling section

#### Task 6.4b: Create deployment topology reference
- **File:** `docs/config/deployment.md` (or update existing if present)
- **Target:** ~50 lines
- **Content:**
  - ASCII diagram showing Railway services, Supabase connection, Clerk auth flow
  - Environment variable injection: Railway → `.env` → `dotenv-cli` → app
  - Production URL and health check endpoint
  - How `/ship` and `/land-and-deploy` map to Railway's deployment pipeline
  - Cross-link from root CLAUDE.md Deep-Dive Docs table (add row in Task 1.1)

### Task 6.5: Verify execution plans linkage

- **Action:** Verify that `docs/exec-plans/active/` is populated and linked from the new architecture.md Key Decisions section
- **Check:** `ls docs/exec-plans/active/` — if empty, note in the design docs README that execution plans are created per-phase and linked from the phase's ADR or design doc
- This is a verification task, not a creation task — exec-plans are already part of the project workflow

---

## Execution Order

Dependencies determine the order. Parallelizable tasks are grouped.

### Phase 0: Git Hygiene (must run first, sequential)
- Task 3.2: Gitignore and untrack `settings.local.json` (.gitignore edit → `git rm --cached` → commit)
- Task 3.1-prereq: Verify settings.json allow/deny merge behavior

### Phase 1: Foundation (parallel after Phase 0)
Execute in parallel:
- Task 2.1a-prereq: Consolidate Drizzle migration checklist in `packages/db/CLAUDE.md`
- Task 2.1a–d: Create `.claude/rules/` (4 files — enforcement triggers only)
- Task 2.2: Create `docs/README.md` (navigational index)
- Task 2.3: Create `packages/config/CLAUDE.md`
- Task 3.1: Create `.claude/settings.json` (deny list + hooks, correct nested schema)
- Task 3.3a–d: Create `.claude/commands/` (4 files)
- Task 3.4: Create `.mcp.json` (with Paperclip stub)
- Task 5.2: Add `<!-- owner: -->` tags to docs files + remove prose `Last updated:` lines
- Task 6.1a–b: Create ADR directory + template
- Task 6.2a–b: Create design docs directory + template (forward-looking, explicitly empty)
- Task 6.4a: Add error handling section to `apps/api/CLAUDE.md`

### Phase 2: Content (depends on Phase 1 structure)
Execute in parallel:
- Task 4.1a–b: Split API reference (index + 15 router files)
- Task 6.1c–g: Backfill 6 ADRs (including ADR-006: Gamification)
- Task 6.4b: Create deployment topology reference
- Task 5.5-prereq: Verify GitHub teams exist (or create them)
- Task 5.5: Add CODEOWNERS entries

### Phase 3: Integration (depends on Phase 2 content)
Execute in parallel:
- Task 1.1: Update CLAUDE.md Deep-Dive Docs table (ADRs, design, docs index, deployment, commands)
- Task 4.2: Audit and deduplicate content overlap (specific pairs identified)
- Task 4.3: Establish generated content convention (in docs/README.md)
- Task 5.1: Fix broken internal links (update docs/CLAUDE.md file structure diagram)
- Task 6.3: Add Key Decisions section to architecture.md (before Gamification section)
- Task 6.5: Verify execution plans linkage

### Phase 4: Automation (depends on Phase 3 integration)
Execute in parallel:
- Task 5.3a: Create doc-validation CI workflow (markdown-link-check, budget, freshness, structure)
- Task 5.4a: Create doc-gardener CI workflow (Thursday night schedule)
- Create `.markdown-link-check.json` config file

### Phase 5: Verification
- Re-run the context audit script
- Verify all categories score 5/5
- Verify zero broken links
- Verify all files under 500-line limit
- Test PreToolUse hook by attempting a `packages/db/` edit
- Verify CODEOWNERS entries resolve to valid teams/users

---

## Artifact Inventory

Total new files: ~36
Total edited files: ~9

### New files
| File | Lines (est.) | Category |
|------|-------------|----------|
| `.claude/rules/db-guard.md` | 8 | Progressive Disclosure |
| `.claude/rules/core-guard.md` | 8 | Progressive Disclosure |
| `.claude/rules/api-router.md` | 10 | Progressive Disclosure |
| `.claude/rules/ui-components.md` | 6 | Progressive Disclosure |
| `docs/README.md` | 60 | Progressive Disclosure |
| `packages/config/CLAUDE.md` | 40 | Progressive Disclosure |
| `.claude/settings.json` | 40 | Agent Infrastructure (deny + hooks) |
| `.claude/commands/dev.md` | 25 | Agent Infrastructure |
| `.claude/commands/test.md` | 25 | Agent Infrastructure |
| `.claude/commands/migrate.md` | 15 | Agent Infrastructure |
| `.claude/commands/status.md` | 25 | Agent Infrastructure |
| `.mcp.json` | 10 | Agent Infrastructure (Paperclip stub) |
| `.markdown-link-check.json` | 15 | Maintainability |
| `docs/api/README.md` (rewritten) | 80 | Context Budgeting |
| `docs/api/dashboard.md` | 90 | Context Budgeting |
| `docs/api/household.md` | 120 | Context Budgeting |
| `docs/api/pet.md` | 100 | Context Budgeting |
| `docs/api/activity.md` | 100 | Context Budgeting |
| `docs/api/member.md` | 80 | Context Budgeting |
| `docs/api/invitation.md` | 100 | Context Budgeting |
| `docs/api/access-request.md` | 80 | Context Budgeting |
| `docs/api/feeding.md` | 120 | Context Budgeting |
| `docs/api/health.md` | 120 | Context Budgeting |
| `docs/api/calendar.md` | 80 | Context Budgeting |
| `docs/api/finance.md` | 90 | Context Budgeting |
| `docs/api/notes.md` | 80 | Context Budgeting |
| `docs/api/reporting.md` | 90 | Context Budgeting |
| `docs/api/analytics.md` | 60 | Context Budgeting |
| `docs/api/gamification.md` | 70 | Context Budgeting |
| `.github/workflows/doc-validation.yml` | 80 | Maintainability |
| `.github/workflows/doc-gardener.yml` | 60 | Maintainability |
| `docs/adrs/README.md` | 50 | Architectural Legibility |
| `docs/adrs/template.md` | 30 | Architectural Legibility |
| `docs/adrs/001-trpc-api-layer.md` | 90 | Architectural Legibility |
| `docs/adrs/002-drizzle-orm.md` | 90 | Architectural Legibility |
| `docs/adrs/003-clerk-auth.md` | 90 | Architectural Legibility |
| `docs/adrs/004-tamagui-ui.md` | 90 | Architectural Legibility |
| `docs/adrs/005-household-data-model.md` | 90 | Architectural Legibility |
| `docs/adrs/006-gamification-lazy-recalc.md` | 80 | Architectural Legibility |
| `docs/design/README.md` | 30 | Architectural Legibility |
| `docs/design/template.md` | 25 | Architectural Legibility |
| `docs/config/deployment.md` | 50 | Architectural Legibility |

### Edited files
| File | Change | Category |
|------|--------|----------|
| `.gitignore` | Add `.claude/settings.local.json` + untrack | Agent Infrastructure |
| `CLAUDE.md` | Add 4 rows to Deep-Dive Docs table + commands mention | Entry Point |
| `docs/dev/architecture.md` | Add Key Decisions section before Gamification | Architectural Legibility |
| `.github/CODEOWNERS` | Add docs + API docs ownership entries (verified teams) | Maintainability |
| `packages/db/CLAUDE.md` | Consolidate as authoritative 6-step migration checklist | Context Budgeting |
| `.claude/skills/petforce-guardrails/SKILL.md` | Replace inline checklist with pointer to packages/db/CLAUDE.md | Context Budgeting |
| `apps/api/CLAUDE.md` | Add error handling section (tRPC error taxonomy) | Architectural Legibility |
| `docs/CLAUDE.md` | Update file structure diagram to match post-split API docs | Context Budgeting |
| Various `docs/**/*.md` | Add `<!-- owner: -->` tags, remove prose `Last updated:` lines | Maintainability |

---

## Expected Score After Remediation

| Category | Before | After | Justification |
|----------|--------|-------|---------------|
| Entry Point Quality | 5/5 | 5/5 | Maintained; updated Deep-Dive table with 4 new rows, commands mention. Line count ~200. |
| Progressive Disclosure | 4/5 | 5/5 | 4 glob-scoped rules (triggers, not summaries), docs/README.md index, full CLAUDE.md coverage including packages/config/, all cross-linked. |
| Agent Infrastructure | 4/5 | 5/5 | Team settings.json with deny list + correct nested PreToolUse hooks, 4 commands, .mcp.json with Paperclip stub, gitignored local settings, db:migrate in deny list. |
| Context Budgeting | 3/5 | 5/5 | API split into 16 files (all <150 lines), single-source-of-truth for migration checklist, rules files are enforcement triggers not summaries, docs/CLAUDE.md updated. |
| Maintainability | 3/5 | 5/5 | Git-derived freshness (no manual rot), CI validation with specific tools and commands, Thursday night gardening aligned with Friday review, verified CODEOWNERS, zero broken links. |
| Architectural Legibility | 3/5 | 5/5 | 6 ADRs with operational agent constraints in consequences, design doc directory (forward-looking, explicitly empty), Key Decisions in architecture.md, deployment topology, error handling patterns, all navigable from CLAUDE.md. |

**Projected Grade: A (100%)**

---

## Review Committee Feedback Incorporated

This spec has been through 1 round of review by 5 specialized agents. All required changes from all reviewers have been incorporated:

| Reviewer | Role | R1 Score | Key Changes Made |
|----------|------|----------|-----------------|
| R1 | Context Architecture | 7/10 | Rules files → enforcement triggers, checklist consolidation |
| R2 | Context Budget | 7/10 | api-router.md shrunk to ~10 lines, docs/CLAUDE.md in edit list, checklist version mismatch named |
| R3 | Agent Infrastructure | 5/10 | Hook schema fixed (nested format), git rm --cached mandatory, settings conflict resolution, db:migrate in deny list, Paperclip in .mcp.json |
| R4 | Maintainability | 5/10 | CI tools specified (markdown-link-check), git-derived freshness (no manual dates), Thursday schedule, CODEOWNERS team verification, broken links identified |
| R5 | Architectural Legibility | 7/10 | ADR consequences enriched with agent constraints, ADR-006 added, design docs purpose clarified, deployment topology added, error handling added |
