# Beta Success Criteria

[Product / CCO]

How we measure whether the PetForce beta is succeeding from a customer perspective. These criteria determine whether we're ready for general availability.

---

## North Star

> A household that starts using PetForce during beta should find it indispensable within 14 days — meaning they cannot coordinate pet care without it.

---

## 1. Net Promoter Score (NPS)

| Metric | Target | Red flag |
|--------|--------|----------|
| NPS (Day 7 survey) | >= 40 | < 20 |
| Promoters (9–10) | >= 40% of respondents | < 25% |
| Detractors (0–6) | < 20% of respondents | > 35% |

**Measurement:** Day 7 email survey, Q1 (0–10 scale).

**Action if below target:**
- NPS 20–39: Analyze detractor feedback for common themes; prioritize top 3 fixes
- NPS < 20: Pause beta invites; run user interviews with detractors; ship fixes before expanding

---

## 2. Activation Rate

A user is "activated" when they complete all of these within their first 7 days:

1. Create or join a household
2. Add at least 1 pet with a photo
3. Complete at least 1 feeding or log 1 activity
4. Have at least 1 other household member join

| Metric | Target | Red flag |
|--------|--------|----------|
| 7-day activation rate | >= 60% | < 35% |
| Time to activation | < 3 days median | > 5 days median |

**Why this matters:** A user who hasn't done all four hasn't experienced the core value (household coordination). If they drop off before step 4, we have an onboarding problem. If they drop off before step 3, we have a value-communication problem.

---

## 3. Retention

| Metric | Target | Red flag |
|--------|--------|----------|
| Day 7 retention (returned to app) | >= 70% | < 50% |
| Day 14 retention | >= 55% | < 35% |
| Day 30 retention | >= 40% | < 25% |

**Measurement:** User logged at least 1 action (feeding completion, activity log, or page view) on or after the specified day.

**Action if below target:**
- Identify where users drop off (which day, which screen was last visited)
- Segment by activation status — do activated users retain better?
- Run win-back emails at Day 3 and Day 10 for inactive users

---

## 4. Churn Thresholds

| Metric | Definition | Target | Red flag |
|--------|-----------|--------|----------|
| Beta churn rate (monthly) | % of activated users with zero activity in trailing 14 days | < 15% | > 30% |
| Household churn rate | % of households where ALL members are inactive (14 days) | < 10% | > 25% |
| Early churn (first 7 days) | % of signups who never activate | < 40% | > 60% |

**Key insight:** Individual churn matters less than household churn. If one member goes quiet but others stay active, the household is alive. If the whole household goes dark, we lost the customer.

**Action if above threshold:**
- Churn > 30%: Emergency — stop inviting new users, focus entirely on retention
- Churn 15–30%: Identify top 3 churn reasons from exit feedback; ship fixes weekly
- Early churn > 40%: Onboarding is broken — redesign first-run experience

---

## 5. Support Health

| Metric | Target | Red flag |
|--------|--------|----------|
| T1 response time | < 4 hours | > 8 hours |
| T2 resolution time | < 48 hours | > 72 hours |
| T3 (critical) response time | < 1 hour | > 2 hours |
| Support tickets per user per week | < 0.5 | > 1.0 |
| First-contact resolution rate | > 70% | < 50% |

**What "support tickets per user" tells us:**
- < 0.3: Product is intuitive; users are self-sufficient
- 0.3–0.5: Normal beta friction; most issues are discoverable
- 0.5–1.0: Significant UX problems or bugs; users are struggling
- > 1.0: Product is not ready for beta scale-up

---

## 6. Multi-Player Adoption

PetForce's value is household coordination. If households stay single-player, we're failing at our core thesis.

| Metric | Target | Red flag |
|--------|--------|----------|
| Avg members per active household | >= 2.0 | < 1.5 |
| % of households with 2+ active members | >= 50% | < 30% |
| Invite conversion rate | >= 40% | < 20% |

**"Active member"** = logged at least 1 action in the past 7 days.

**Action if below target:**
- Improve invite flow (is it too many steps? Is the invite email compelling?)
- Add "invite nudge" on dashboard if household has only 1 member after Day 3
- Test whether join codes or email invites convert better

---

## 7. Feature Adoption

Track which features beta users actually use to validate our roadmap priorities.

| Feature | Adoption target (% of activated users) | Red flag |
|---------|---------------------------------------|----------|
| Feeding tracking | >= 70% | < 50% |
| Activity logging | >= 50% | < 30% |
| Health records | >= 30% | < 15% |
| Calendar | >= 25% | < 10% |
| Finance | >= 15% | < 5% |
| Gamification | >= 20% | < 10% |
| Notes | >= 15% | < 5% |

**"Adoption"** = user has used the feature at least once in 14 days.

**Key signals:**
- If feeding tracking is below 50%, our core loop is broken
- If gamification is above 30%, it's driving engagement and should be promoted more
- If finance is below 5%, consider whether it belongs in the beta at all

---

## Beta Exit Criteria

We're ready for general availability when ALL of the following are true:

| Criterion | Threshold |
|-----------|-----------|
| NPS | >= 40 |
| 7-day activation rate | >= 60% |
| Day 14 retention | >= 55% |
| Monthly churn (activated users) | < 15% |
| Avg members per household | >= 2.0 |
| T3 critical bugs | 0 open |
| T2 bugs | < 5 open |
| Support tickets per user per week | < 0.5 |

If any criterion is red-flagged, we do NOT proceed to GA until it's resolved.

---

## Reporting Cadence

| Report | Frequency | Audience |
|--------|-----------|----------|
| Daily pulse (active users, new signups, tickets) | Daily | CCO |
| Weekly beta digest (all metrics above) | Weekly | Full team |
| NPS analysis (after Day 7 survey batch) | As surveys come in | CCO + Architect |
| Beta exit readiness review | Biweekly | CCO + Architect + CTO |
