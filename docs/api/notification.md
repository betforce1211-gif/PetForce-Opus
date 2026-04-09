<!-- owner: backend -->

# notification router

[Developer]

Push token management and per-member notification preferences. Push tokens are registered per member per household (a user in two households has two token registrations). Preferences are also scoped per member per household.

**Auth level:** `householdProcedure`

---

## Procedures

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `notification.registerPushToken` | mutation | household | Register an Expo push token for the current member |
| `notification.unregisterPushToken` | mutation | household | Remove the push token (e.g., on logout) |
| `notification.updateEmail` | mutation | household | Update the notification email for the current member |
| `notification.getPreferences` | query | household | Get notification preferences (returns defaults if not set) |
| `notification.updatePreferences` | mutation | household | Update notification preferences (partial) |

---

## `notification.registerPushToken` — mutation

Register an Expo push token for mobile notifications.

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `expoPushToken` | string (min 1) | yes |

**Returns:** `{ success: boolean }`

---

## `notification.unregisterPushToken` — mutation

Remove the push token for the current member. Call on logout to stop receiving push notifications.

**Auth:** `householdProcedure`
**Input:** `{ householdId: string }`
**Returns:** `{ success: true }`

---

## `notification.updateEmail` — mutation

Update the notification email for the current member in this household.

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `email` | string (email) | yes |

**Returns:** `{ id: string, email: string }`

---

## `notification.getPreferences` — query

Get notification preferences for the current member. Returns defaults if no preferences have been set yet.

**Auth:** `householdProcedure`
**Input:** `{ householdId: string }`
**Returns:**

```ts
{
  streakAlerts: boolean      // default: true
  budgetAlerts: boolean      // default: true
  weeklyDigest: boolean      // default: true
  achievementAlerts: boolean // default: true
}
```

---

## `notification.updatePreferences` — mutation

Update notification preferences. Only include fields to change — omitted fields retain their current value.

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `streakAlerts` | boolean | no |
| `budgetAlerts` | boolean | no |
| `weeklyDigest` | boolean | no |
| `achievementAlerts` | boolean | no |

**Returns:** `NotificationPreferences` (merged with defaults)

---

## Related routers

- [finance](./finance.md) — budget alerts trigger push notifications when `budgetAlerts` is enabled
- [gamification](./gamification.md) — achievement unlocks trigger notifications when `achievementAlerts` is enabled
- [member](./member.md) — preferences are scoped to a member record
