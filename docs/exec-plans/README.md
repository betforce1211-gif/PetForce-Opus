# Execution Plans

Plans are first-class artifacts. They track multi-step features and initiatives as versioned markdown files checked into the repo.

## Structure

- `active/` — plans currently in progress
- `completed/` — finished plans (moved here when all steps are done)

## Plan Format

Each plan includes:

- **Goal** — one-sentence description
- **Owner** — which agent or person drives this
- **Status** — not started / in progress / blocked / completed
- **Steps** — checkbox list of concrete tasks
- **Decision Log** — key decisions made along the way
- **Notes** — anything else relevant

## Rules

- Agents should check `active/` before starting work to avoid conflicts
- Move plans to `completed/` once all steps are checked off
- If a plan is blocked, note why in the Decision Log
- Keep plans focused — one plan per initiative, not a mega-plan
