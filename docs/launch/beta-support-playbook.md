# Beta Support Playbook

[Ops / Support]

This playbook covers how we handle beta user issues during the PetForce closed beta. Every support interaction is a data point — treat each one as a gift that makes the product better.

---

## Escalation Tiers

| Tier | Who handles it | Response SLA | Examples |
|------|---------------|--------------|----------|
| **T0 — Self-service** | In-app help / FAQ | Instant | "How do I invite someone?", "Where are my settings?" |
| **T1 — Standard** | Support team (CCO + rotating agent) | < 4 hours | Login trouble, UI confusion, missing data, feature questions |
| **T2 — Technical** | Backend / Web / Mobile agent | < 8 hours | Data sync issues, API errors, broken flows |
| **T3 — Critical** | Architect + DevOps | < 1 hour | Data loss, security issue, full outage, auth bypass |

### Escalation path

1. User reports issue (in-app widget, email, or beta Slack channel)
2. CCO triages → assign tier
3. T1: respond directly with template + workaround
4. T2: file GitHub issue (`beta-bug` label), ping owning agent, keep user updated
5. T3: page on-call immediately, file GitHub issue (`critical` + `beta-bug`), notify all beta users if widespread

---

## Common Issues and Responses

### Account & Auth

| Issue | Likely cause | Resolution | Template |
|-------|-------------|------------|----------|
| Can't sign up | Clerk invite-only mode, email typo | Verify email is on beta list; resend invite | AUTH-01 |
| Can't log in after signup | Session expired, cookies cleared | Clear cache, try incognito; check Clerk dashboard | AUTH-02 |
| "Not authorized" on every page | Household membership missing | Check if user completed onboarding; manually add to household if needed | AUTH-03 |

### Household & Members

| Issue | Likely cause | Resolution | Template |
|-------|-------------|------------|----------|
| Invite link doesn't work | Expired (>7 days) or revoked | Generate new invite from Settings > Invites | HOUSE-01 |
| Join code rejected | Code was regenerated | Ask household owner for current code | HOUSE-02 |
| Can't see other members' activities | Role is Sitter (view-only) | Confirm intended role; upgrade to Member if appropriate | HOUSE-03 |
| Household appears empty after joining | User created a second household instead of joining | Delete extra household; use invite link or join code for existing one | HOUSE-04 |

### Pet Profiles & Data

| Issue | Likely cause | Resolution | Template |
|-------|-------------|------------|----------|
| Photo upload fails | File too large (>5 MB) or wrong format | Resize to under 5 MB; use JPEG, PNG, or WebP | PET-01 |
| Pet data disappeared | Looking at wrong household | Switch households in selector | PET-02 |
| Duplicate pet entries | Created on web and mobile before sync | Merge manually; delete duplicate | PET-03 |

### Feeding & Schedules

| Issue | Likely cause | Resolution | Template |
|-------|-------------|------------|----------|
| Feeding chips don't update | Stale cache, websocket disconnect | Pull to refresh; hard-reload on web | FEED-01 |
| Schedule shows wrong time | Timezone mismatch | Check device timezone settings; we display in local time | FEED-02 |
| "Already marked complete" but I didn't | Another household member marked it | Check activity timeline for who completed it | FEED-03 |

### Health & Calendar

| Issue | Likely cause | Resolution | Template |
|-------|-------------|------------|----------|
| Vaccination shows overdue incorrectly | Next due date was entered wrong | Edit the vaccination record; correct the date | HEALTH-01 |
| Calendar events missing | Filter is hiding them | Check that Feedings and Holidays toggles are on | CAL-01 |
| Vet visit cost not in Finance | Cost field was left blank | Edit the vet visit; add the cost | HEALTH-02 |

### Performance & Reliability

| Issue | Likely cause | Resolution | Template |
|-------|-------------|------------|----------|
| Dashboard loads slowly | Large household, many activities | Note for backend team; check query performance | PERF-01 |
| App crashes on mobile | Expo runtime error | Collect crash log (`expo diagnostics`); file T2 issue | PERF-02 |
| Actions feel laggy | API latency spike | Check Grafana; if systemic, escalate T2 | PERF-03 |

---

## Response Templates

### AUTH-01: Can't sign up
> Hi [Name]! It looks like your email might not be on our beta access list yet. Can you confirm the exact email address you're trying to sign up with? I'll make sure it's added and send you a fresh invite link. Usually takes just a minute.

### AUTH-02: Can't log in
> Sorry about that! This usually happens when your browser session expired. Try these steps:
> 1. Clear your browser cache/cookies for our site
> 2. Try in an incognito/private window
> 3. If still stuck, let me know and I'll check your account on our end.

### AUTH-03: Not authorized
> This happens when your account isn't connected to a household yet. Did you complete the onboarding step where you create or join a household? If you skipped it, I can help get you connected.

### HOUSE-01: Invite link expired
> Invite links expire after 7 days for security. Ask your household owner to go to Settings > Invites and create a new one. They can also share the household join code as an alternative.

### HOUSE-04: Created wrong household
> No worries — this is a common one during beta! You accidentally created a new household instead of joining the existing one. Here's what to do:
> 1. I'll remove the extra household on our end
> 2. Ask your family member for the invite link or join code
> 3. Use that to join their household

### FEED-03: Someone else marked it
> Good news — your pet was fed! Check the activity timeline on the right side of your dashboard. It'll show who marked that feeding complete and when. That's the household coordination working as designed.

### PERF-02: Mobile crash
> Sorry about the crash! To help us fix this:
> 1. Note what you were doing right before it happened
> 2. Try closing and reopening the app
> 3. If it keeps crashing, send me a screenshot of the error (if one appears)
> We'll get a fix out quickly — beta bugs are our top priority.

### GENERIC: Acknowledged + investigating
> Thanks for flagging this, [Name]. I can see the issue and I'm looking into it now. I'll update you within [SLA time] with either a fix or a workaround. Appreciate your patience — this kind of feedback is exactly what makes the beta valuable.

---

## Triage Checklist

When a new issue comes in:

1. **Reproduce** — Can you see the same behavior? Check on both web and mobile.
2. **Classify** — Which tier? Which category above?
3. **Respond** — Send the appropriate template within the T1 SLA (< 4 hours).
4. **Track** — If T2+, create a GitHub issue with labels: `beta-bug`, priority label, owning package.
5. **Follow up** — After resolution, confirm with the user that it's fixed.
6. **Log** — Record the issue type in our beta feedback tracker for pattern analysis.

---

## Beta Slack Channel Rules

- `#petforce-beta` is the primary user-facing channel
- Respond to every message, even if it's just an acknowledgment
- Move technical debugging to threads to keep the channel clean
- Pin resolved workarounds so other beta users can find them
- Never share internal architecture details or other users' data in the channel

---

## Known Limitations (Beta)

Proactively share these with beta users to set expectations:

| Limitation | Status | Workaround |
|-----------|--------|------------|
| Push notifications not yet available on mobile | Phase 3 | Check the app periodically; feeding reminders show on dashboard |
| Offline mode not yet available | Phase 3 | Requires internet connection for all actions |
| No calendar sync (Google/Apple) | Phase 4 | Manually check PetForce calendar |
| Single household per account | Planned | Create separate accounts if needed |
| No data export | Planned | Contact support for manual export if needed |
