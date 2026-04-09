<!-- owner: backend -->

# member router

[Developer]

Manage household members and their roles. All member endpoints use `householdProcedure` — membership in the household is verified on every call.

**Auth level:** `householdProcedure`

---

## Procedures

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `member.listByHousehold` | query | household | List all members of the household |
| `member.invite` | mutation | household | Add a user directly as a member (Owner/Admin only) |
| `member.updateRole` | mutation | household | Change a member's role (Owner/Admin only) |
| `member.remove` | mutation | household | Remove a member from the household (Owner/Admin only) |

---

## `member.listByHousehold` — query

**Auth:** `householdProcedure`
**Input:** `{ householdId: string }`
**Returns:** `Member[]`

---

## `member.invite` — mutation

Add a user directly as a member. **Owner or Admin only.**

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `userId` | string | yes |
| `role` | `admin \| member \| sitter` | yes |
| `displayName` | string (1-50) | yes |

**Returns:** `Member`
**Errors:** `FORBIDDEN` (not owner/admin), `CONFLICT` (already a member)

---

## `member.updateRole` — mutation

Change a member's role. **Owner or Admin only.**

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `memberId` | UUID | yes |
| `role` | `owner \| admin \| member \| sitter` | yes |

**Returns:** `Member`

---

## `member.remove` — mutation

Remove a member from the household. **Owner or Admin only.** Cannot remove the last owner.

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, memberId: UUID }`
**Returns:** `{ success: true }`
**Errors:** `FORBIDDEN`, `NOT_FOUND`, `BAD_REQUEST` (last owner)

---

## Key types

```ts
// Member role enum
type MemberRole = "owner" | "admin" | "member" | "sitter"
```

Role hierarchy: `owner` > `admin` > `member` > `sitter`. Owners have full control; sitters have read-only access to pets and activities.

---

## Related routers

- [invitation](./invitation.md) — email-based invitations (creates members on accept)
- [access-request](./access-request.md) — join-code requests (creates members on approve)
- [household](./household.md) — household management
- [reporting](./reporting.md) — per-member contribution stats
