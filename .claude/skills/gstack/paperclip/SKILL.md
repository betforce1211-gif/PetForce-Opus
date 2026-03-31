---
name: paperclip
preamble-tier: 4
version: 1.0.0
description: |
  Paperclip bridge: sync Paperclip tasks to GitHub issues, mark done on merge,
  show agent status, and audit drift between the two systems. The "adult in the
  room" that makes sure fast-moving Paperclip work lands properly in GitHub.
  Use when: "sync paperclip", "paperclip status", "what's paperclip doing",
  "sync issues", "mark done", "audit paperclip". (gstack)
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
---

<!-- Preamble: gstack paperclip bridge -->

# /paperclip — Paperclip ↔ GitHub Bridge

You are the **Release Governance Engineer** — the adult in the room between Paperclip
(the fast-moving agent orchestrator) and GitHub (the system of record). Your job is to
make sure every piece of work that Paperclip assigns gets tracked, reviewed, and landed
properly in the repo.

## User-invocable
When the user types `/paperclip`, run this skill.

## Arguments
- `/paperclip` — default: show status dashboard, then offer actions
- `/paperclip status` — show the full status dashboard
- `/paperclip sync` — sync all active Paperclip issues to GitHub issues
- `/paperclip audit` — find drift: issues in one system but not the other
- `/paperclip done PET-XX` — mark a Paperclip issue as done
- `/paperclip agents` — show all agents and their current assignments

---

## Step 0: Load Paperclip Config

```bash
CONTEXT_FILE="$HOME/.paperclip/context.json"
```

Read `~/.paperclip/context.json` to get `apiBase` and `companyId`. If the file doesn't
exist, **STOP**: "Paperclip isn't configured on this machine. Make sure Paperclip is
running at localhost:3100 and has a context file at ~/.paperclip/context.json."

Extract `API_BASE` and `COMPANY_ID` from the config file using python3:
```bash
API_BASE=$(python3 -c "import json; c=json.load(open('$HOME/.paperclip/context.json')); p=c.get('currentProfile','default'); print(c['profiles'][p].get('apiBase',''))")
COMPANY_ID=$(python3 -c "import json; c=json.load(open('$HOME/.paperclip/context.json')); p=c.get('currentProfile','default'); print(c['profiles'][p].get('companyId',''))")
```

Fetch all Paperclip issues and agents to a temp file (avoids shell quoting issues):
```bash
curl -sf "$API_BASE/api/companies/$COMPANY_ID/issues?limit=200" > /tmp/paperclip-issues.json
curl -sf "$API_BASE/api/companies/$COMPANY_ID/agents" > /tmp/paperclip-agents.json
```

If curl fails, **STOP**: "Can't reach Paperclip at $API_BASE. Is it running?"

---

## Step 1: Parse Arguments and Route

Parse the user's argument from the `/paperclip` invocation:

- No argument or `status` → go to **Step 2: Status Dashboard**
- `sync` → go to **Step 3: Sync All**
- `audit` → go to **Step 4: Audit**
- `done PET-XX` → go to **Step 5: Mark Done**
- `agents` → go to **Step 6: Agent Status**

---

## Step 2: Status Dashboard

Build a comprehensive view of what's happening across both systems.

### 2a: Parse Paperclip issues

Use python3 to read `/tmp/paperclip-issues.json` and categorize:

```bash
python3 - << 'PYEOF'
import json

with open('/tmp/paperclip-issues.json') as f:
    issues = json.load(f)

by_status = {}
for i in issues:
    s = i.get('status', 'unknown')
    by_status.setdefault(s, []).append(i)

print(f"Total: {len(issues)}")
for status in ['in_progress', 'todo', 'pending', 'blocked', 'in_review', 'done', 'backlog']:
    items = by_status.get(status, [])
    if items:
        print(f"\n{status.upper()} ({len(items)}):")
        for i in items:
            ident = i.get('identifier', '?')
            title = (i.get('title') or '')[:55]
            priority = i.get('priority', '?')
            agent = i.get('executionAgentNameKey') or 'unassigned'
            run = i.get('activeRun')
            run_status = f" [run:{run['status']}]" if run else ''
            print(f"  {ident:8s} {priority:10s} {agent:18s} {title}{run_status}")
PYEOF
```

### 2b: Check GitHub issue sync status

For each active Paperclip issue (in_progress, todo, pending), check if a matching
GitHub issue exists:

```bash
# Get all GitHub issues with paperclip label
gh issue list --label paperclip --state all --json number,title,state --limit 200 2>/dev/null || echo "[]"
```

Parse the results and cross-reference with Paperclip issues. For each Paperclip issue,
check if a GitHub issue exists with the `PET-XX` identifier in the title.

### 2c: Check open PRs for Paperclip references

```bash
gh pr list --state open --json number,title,body,headRefName --limit 50 2>/dev/null || echo "[]"
```

Scan PR bodies for `PET-XX` patterns. Note which Paperclip issues have associated PRs.

### 2d: Display the dashboard

Output a formatted dashboard:

```
╔══════════════════════════════════════════════════════════╗
║              PAPERCLIP ↔ GITHUB STATUS                    ║
╠══════════════════════════════════════════════════════════╣
║                                                            ║
║  PAPERCLIP                                                 ║
║  Total issues:  NN                                         ║
║  Active:        NN (in_progress + todo)                    ║
║  Running:       NN agents currently executing              ║
║  Done:          NN                                         ║
║                                                            ║
║  GITHUB SYNC                                               ║
║  Synced issues: NN / NN active (paperclip label)           ║
║  Open PRs:      NN referencing PET-XX                      ║
║  Missing sync:  NN Paperclip issues without GitHub issue   ║
║                                                            ║
╚══════════════════════════════════════════════════════════╝
```

Then list the **unsynced** issues (Paperclip issues without a matching GitHub issue):

```
UNSYNCED — these Paperclip issues have no GitHub issue:
  PET-58  critical  Quick-Log care events from dashboard
  PET-75  high      Define product analytics KPI framework
  ...
```

### 2e: Offer actions

Use AskUserQuestion:
- "Here's the current state. What would you like to do?"
- A) Sync all unsynced issues to GitHub (creates GitHub issues with `paperclip` label)
- B) Run a full audit (check for drift in both directions)
- C) Nothing — just wanted the status

If A → go to Step 3. If B → go to Step 4. If C → done.

---

## Step 3: Sync All

Sync all active Paperclip issues to GitHub. For each Paperclip issue that is
`in_progress`, `todo`, or `pending` and does NOT have a matching GitHub issue:

1. **Check if GitHub issue exists:**
```bash
gh issue list --label paperclip --search "PET-XX" --json number,title --jq '.[0].number' 2>/dev/null
```

2. **If not found, create it:**
```bash
eval "$(~/.claude/skills/gstack/bin/gstack-paperclip-sync github PET-XX 2>/dev/null)"
```

3. **Report each sync:**
   - `✓ PET-XX → GitHub #NN (created)`
   - `· PET-XX → GitHub #NN (already exists)`
   - `✗ PET-XX → failed to create`

4. **For issues that are `done` in Paperclip but open on GitHub**, close the GitHub issue:
```bash
gh issue close $GH_NUMBER --comment "Closed — Paperclip issue $PET_ID is marked done."
```

5. **Summary:**
```
Sync complete:
  Created:  N new GitHub issues
  Existing: N already synced
  Closed:   N GitHub issues (done in Paperclip)
  Failed:   N (list them)
```

This step is fully automatic — no confirmation needed per issue. The user said `/paperclip sync`.

---

## Step 4: Audit

Find drift between Paperclip and GitHub. Three categories:

### 4a: Paperclip issues with no GitHub issue

Active Paperclip issues (`in_progress`, `todo`, `pending`) that don't have a matching
GitHub issue with the `paperclip` label. These need syncing.

### 4b: GitHub issues with `paperclip` label that don't match a Paperclip issue

This can happen if:
- The Paperclip issue was deleted
- The GitHub issue title was edited and no longer contains `PET-XX`
- Someone manually created a `paperclip`-labeled issue

### 4c: Status mismatches

Issues that exist in both systems but have conflicting status:
- Done in Paperclip but still open on GitHub
- Open in Paperclip but closed on GitHub
- Priority changed in Paperclip but not reflected in GitHub labels

### 4d: PR coverage

Active Paperclip issues that have no associated PR (open or merged). These represent
work that was assigned but hasn't produced code yet.

### 4e: Output the audit report

```
PAPERCLIP ↔ GITHUB AUDIT
═════════════════════════

MISSING FROM GITHUB (N):
  PET-XX: <title> — needs sync
  ...

ORPHANED GITHUB ISSUES (N):
  #NN: <title> — no matching Paperclip issue
  ...

STATUS MISMATCHES (N):
  PET-XX ↔ #NN: Paperclip=done, GitHub=open — should close
  ...

NO PR COVERAGE (N):
  PET-XX: <title> — in_progress but no PR found
  ...

HEALTH: X/Y issues synced (Z%)
```

### 4f: Offer fixes

If any drift was found, use AskUserQuestion:
- A) Fix all automatically (sync missing, close done, skip orphans)
- B) Fix one by one (walk through each issue)
- C) Just the report — I'll handle it

---

## Step 5: Mark Done

Mark a specific Paperclip issue as done.

1. Parse the PET-XX identifier from the argument.

2. Run:
```bash
eval "$(~/.claude/skills/gstack/bin/gstack-paperclip-sync done PET-XX 2>/dev/null)"
```

3. If successful, also close the matching GitHub issue (if one exists):
```bash
GH_NUMBER=$(gh issue list --label paperclip --search "PET-XX" --json number --jq '.[0].number' 2>/dev/null)
if [ -n "$GH_NUMBER" ]; then
  gh issue close "$GH_NUMBER" --comment "Closed — PET-XX marked done via /paperclip."
fi
```

4. Report:
   - "PET-XX marked done in Paperclip. GitHub issue #NN closed."
   - Or: "PET-XX marked done in Paperclip. No matching GitHub issue found."
   - Or: "Failed to mark PET-XX done: <error>"

---

## Step 6: Agent Status

Show all Paperclip agents and what they're working on.

Parse `/tmp/paperclip-agents.json` and `/tmp/paperclip-issues.json`:

```bash
python3 - << 'PYEOF'
import json

with open('/tmp/paperclip-agents.json') as f:
    agents = json.load(f)
with open('/tmp/paperclip-issues.json') as f:
    issues = json.load(f)

# Build agent → issues mapping
agent_issues = {}
for i in issues:
    aid = i.get('assigneeAgentId')
    if aid:
        agent_issues.setdefault(aid, []).append(i)

for a in sorted(agents, key=lambda x: x.get('name', '')):
    name = a.get('name', '?')
    title = a.get('title', '')
    status = a.get('status', '?')
    aid = a.get('id')
    my_issues = agent_issues.get(aid, [])
    active = [i for i in my_issues if i.get('status') in ('in_progress', 'todo')]
    done = [i for i in my_issues if i.get('status') == 'done']
    running = [i for i in my_issues if i.get('activeRun') and i['activeRun'].get('status') == 'running']

    icon = '🟢' if running else ('🟡' if active else '⚪')
    print(f"{icon} {name} ({title}) — {len(active)} active, {len(done)} done")
    for i in running:
        print(f"   ▶ {i['identifier']}: {i.get('title','')[:50]}")
    for i in active:
        if not (i.get('activeRun') and i['activeRun'].get('status') == 'running'):
            print(f"   · {i['identifier']}: {i.get('title','')[:50]} [{i['status']}]")
PYEOF
```

Output the result, then offer:
- "Any idle agents you want to assign work to? Or any running agents you want to check on?"

---

## Important Rules

- **Never block on Paperclip API failures.** If the API is down, report it and continue
  with what you can do from GitHub alone.
- **The `paperclip` label is the sync key.** Every GitHub issue created by this skill
  gets the `paperclip` label. Never remove it — it's how we find synced issues.
- **PET-XX in the title is the cross-reference.** GitHub issue titles always start with
  `PET-XX:` so we can match them back to Paperclip.
- **GitHub is the system of record for code.** Paperclip assigns work, but PRs, reviews,
  and merges happen on GitHub. This skill bridges the gap.
- **Be idempotent.** Running `/paperclip sync` twice should not create duplicate issues.
  Always check before creating.
- **Priority label mapping:** critical → `priority:critical`, high → `priority:high`,
  medium → `priority:medium`, low → `priority:low`.
