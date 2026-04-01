---
name: pre-pr
description: Pre-pull-request checklist runner — lint, type-check, test, PR template, CODEOWNERS, and docs verification
---

# /pre-pr — Pre-Pull-Request Checklist

Run a comprehensive pre-PR checklist before opening a pull request. Catches issues that would fail CI or get flagged in review.

**Usage:** `/pre-pr` (no arguments needed — runs against the current branch)

## Process

### Step 1: Detect Branch and Diff

```bash
# Get current branch and base
BRANCH=$(git branch --show-current)
BASE="main"

# Ensure we're not on main
# Get the diff stat
git diff $BASE...HEAD --stat
git diff $BASE...HEAD --name-only
```

If on `main`, warn the user and ask them to create a feature branch first.

### Step 2: Run Checks (in order)

Run each check and report pass/fail with details:

#### 2a. Lint
```bash
pnpm lint
```
Report: pass/fail + count of errors/warnings.

#### 2b. Type Check
```bash
pnpm build
```
Report: pass/fail + first error if any.

#### 2c. Unit Tests
```bash
pnpm test 2>&1 || true
```
Report: pass/fail + count of passing/failing tests.

#### 2d. PR Size Check
Count lines changed:
```bash
git diff main...HEAD --stat | tail -1
```
- Under 400 lines: PASS
- 400-600 lines: WARN — consider splitting
- Over 600 lines: FAIL — strongly recommend splitting

#### 2e. PR Template Completeness
Check if the branch has changes that require specific PR template sections:
- **UI changes** (files in `apps/web/src/app/`, `apps/mobile/src/app/`, `packages/ui/`): remind user to include screenshots
- **API changes** (files in `apps/api/src/routers/`): remind user to document breaking changes
- **Schema changes** (files in `packages/db/`): remind user to list affected packages
- **Core changes** (files in `packages/core/`): remind user about breaking change impact

#### 2f. CODEOWNERS Verification
Check `.github/CODEOWNERS` exists and covers changed paths:
```bash
git diff main...HEAD --name-only
```
For each changed file, verify it matches at least one CODEOWNERS pattern.

#### 2g. Documentation Check
For new features or enhancements (not pure refactors or bug fixes), verify that docs were updated:
- Check if any files in `docs/` were modified
- If the PR adds new API endpoints, check `docs/api/`
- If the PR adds new user-facing features, check `docs/user-guide/`

#### 2h. Closes Issue Reference
Check recent commit messages and remind the user to include `Closes #<issue>` in their PR description if working on a tracked issue.

### Step 3: Report Card

Print a summary table:

```
## Pre-PR Report Card

| Check              | Status | Notes                    |
|--------------------|--------|--------------------------|
| Lint               | PASS   |                          |
| Type check         | PASS   |                          |
| Tests              | PASS   | 42 passed                |
| PR size            | WARN   | 523 lines (target: <400) |
| Screenshots needed | YES    | UI files changed         |
| CODEOWNERS         | PASS   |                          |
| Docs updated       | FAIL   | New endpoint, no docs    |
| Issue reference    | WARN   | Add "Closes #N" to PR    |

Overall: 6/8 passed, 1 warning, 1 action needed
```

### Step 4: Recommendations

Based on failures, provide specific actionable recommendations:
- Which lint errors to fix and where
- Which docs to update
- Whether to split the PR and suggested split points
- Remind about screenshots if UI changed

## Rules

- Never modify any files — this skill is read-only / diagnostic
- Always run checks against the diff from `main`, not the working tree
- If `pnpm test` or `pnpm lint` takes too long (>2 min), note it and move on
- Be specific about failures — file names, line numbers, error messages
