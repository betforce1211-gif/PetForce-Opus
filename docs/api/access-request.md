<!-- owner: backend -->

# accessRequest router

[Developer]

Join-code-based requests to join a household. A user submits a request using the household's join code; an owner or admin then approves or denies it. This is the self-service alternative to email invitations.

**Auth level:** mixed (`protectedProcedure` for submitting a request, `householdProcedure` for management)

---

## Procedures

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `accessRequest.create` | mutation | protected | Submit a request to join using the household join code |
| `accessRequest.listByHousehold` | query | household | List pending requests (Owner/Admin only) |
| `accessRequest.approve` | mutation | household | Approve a request — requester becomes a member (Owner/Admin only) |
| `accessRequest.deny` | mutation | household | Deny a request (Owner/Admin only) |

---

## `accessRequest.create` — mutation

Submit a request to join a household using its join code.

**Auth:** `protectedProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `joinCode` | string | yes |
| `displayName` | string (1-50) | yes |
| `message` | string (max 500) | no |

**Returns:** `AccessRequest`
**Errors:** `NOT_FOUND` (bad join code), `CONFLICT` (already a member or pending request exists)

---

## `accessRequest.listByHousehold` — query

List pending access requests. **Owner or Admin only.**

**Auth:** `householdProcedure`
**Input:** `{ householdId: string }`
**Returns:** `AccessRequest[]` (pending only)

---

## `accessRequest.approve` — mutation

Approve a request. The requester is added as a `member`. **Owner or Admin only.**

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, requestId: UUID }`
**Returns:** `Member`

---

## `accessRequest.deny` — mutation

Deny a request. **Owner or Admin only.**

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, requestId: UUID }`
**Returns:** `{ success: true }`

---

## Key types

```ts
// Access request status enum
type AccessRequestStatus = "pending" | "approved" | "denied"
```

Approved requests create a `member` record with the `member` role. To grant a higher role, use `member.updateRole` after approval.

---

## Related routers

- [invitation](./invitation.md) — alternative join flow via email token
- [member](./member.md) — member management
- [household](./household.md) — join code regeneration
- [dashboard](./dashboard.md) — `pendingRequestCount` shown to owners/admins
