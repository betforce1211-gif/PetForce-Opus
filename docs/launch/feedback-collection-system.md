# Feedback Collection System

[Product / Engineering]

How we collect, organize, and act on beta user feedback. Three channels: in-app widget, Day 7 email survey, and ongoing Slack.

---

## 1. In-App Feedback Widget

### Spec

A lightweight floating button in the bottom-right corner of the dashboard (web) and a "Send Feedback" option in the mobile settings menu.

**Trigger:** User taps the feedback button.

**Widget flow:**

1. **Category picker** — What kind of feedback?
   - Bug report
   - Feature request
   - Confusing / hard to use
   - Compliment (yes, collect these too)
   - Other

2. **Free text** — "Tell us more" (required, min 10 characters)

3. **Context capture** (automatic, no user action):
   - Current page/screen URL or route
   - Device type (web/iOS/Android)
   - Browser or app version
   - Household size (member count, pet count)
   - Account age (days since signup)
   - Screenshot attachment (optional, user-initiated)

4. **Submit** — "Thanks! We read every single one."

### Technical implementation

- Store feedback in a `feedback` table in the database:
  ```
  feedback
  ├── id (uuid, PK)
  ├── householdId (FK → households)
  ├── userId (FK → users, via Clerk)
  ├── category (enum: bug, feature, ux, compliment, other)
  ├── body (text)
  ├── pageRoute (text)
  ├── deviceType (text)
  ├── appVersion (text)
  ├── metadata (jsonb — household size, account age, etc.)
  ├── screenshotUrl (text, nullable)
  ├── status (enum: new, reviewed, actioned, closed)
  ├── createdAt (timestamp)
  └── updatedAt (timestamp)
  ```
- tRPC procedure: `feedback.submit` (authenticated, requires household membership)
- Rate limit: max 10 submissions per user per day (prevent spam during beta)
- Admin view: internal dashboard (or simple tRPC query) to review and triage feedback

### Privacy

- Feedback is associated with the user's household but displayed anonymously in any public summary
- Users can request deletion of their feedback
- No PII beyond what's already in their account

---

## 2. Day 7 Email Survey

Sent automatically 7 days after a user completes onboarding (creates or joins their first household).

### Subject line
"One week with PetForce — how's it going?"

### Survey questions

**Q1: How likely are you to recommend PetForce to a friend with pets?** (NPS)
- Scale: 0–10
- 0 = "Not at all likely" / 10 = "Extremely likely"

**Q2: What's the one thing PetForce does best for your household?** (Open text)
- Identifies our core value prop from the user's perspective

**Q3: What's the most frustrating thing you've experienced so far?** (Open text)
- Surfaces pain points we might not see in bug reports

**Q4: How many household members are actively using PetForce?** (Multiple choice)
- Just me
- 2 people
- 3–4 people
- 5+ people
- Insight: are households actually multi-player?

**Q5: Which features do you use most?** (Multi-select)
- Feeding tracking
- Health records (vet visits, vaccinations, meds)
- Activity logging (walks, play, grooming)
- Calendar
- Finance / expenses
- Notes
- Gamification (XP, streaks, badges)
- Insight: feature adoption ranking

**Q6: What feature is missing that would make PetForce essential for your household?** (Open text)
- Roadmap signal from real users

**Q7: How does PetForce compare to how you tracked pet care before?** (Multiple choice)
- Much better — can't go back
- Somewhat better
- About the same
- Worse — I prefer my old method
- Insight: are we actually solving the problem?

### Implementation

- Trigger: 7 days after `households.members.joinedAt` for each user
- Delivery: transactional email via the same provider as invite emails
- Survey host: simple form (can be a dedicated page in the web app at `/feedback/survey`)
- Store responses in a `survey_responses` table linked to the user
- Follow-up: if NPS <= 6 (detractor), auto-create a T1 support ticket for CCO to reach out personally

---

## 3. Ongoing Slack Feedback

The `#petforce-beta` Slack channel is an always-on feedback channel.

### Processing workflow

1. **Daily scan** — CCO reviews all messages from the past 24 hours
2. **Categorize** — Tag each piece of feedback: bug, feature request, UX issue, praise
3. **Log** — Enter into the feedback table (category: from_slack) or create GitHub issue if actionable
4. **Respond** — Acknowledge in Slack within 4 hours
5. **Weekly digest** — Summarize top themes in the weekly beta report

### Slack → GitHub bridge

When a Slack message describes a concrete bug or feature request:
1. Create a GitHub issue with `beta-feedback` label
2. Reply in Slack thread with the issue link
3. Update the user when it ships

---

## Feedback Review Cadence

| Frequency | Action | Who |
|-----------|--------|-----|
| Daily | Triage new in-app feedback, scan Slack | CCO |
| Weekly | Summarize themes, top bugs, top requests | CCO → team |
| After Day 7 survey batch | Analyze NPS, feature adoption, churn signals | CCO + Architect |
| End of beta | Full analysis report with recommendations for GA | CCO |

---

## Metrics to Track

| Metric | Source | Target |
|--------|--------|--------|
| Feedback volume | In-app widget | 2+ per active user over beta period |
| NPS score | Day 7 survey | See beta-success-criteria.md |
| Response rate (Day 7 survey) | Email delivery vs. completion | > 40% |
| Bug report → fix time | GitHub issue timestamps | < 48 hours for T1, < 24 hours for T2 |
| Feature request themes | Aggregated feedback | Top 5 identified by end of week 2 |
