<!-- owner: backend -->

# invitation router

[Developer]

Email-based invitations to join a household. Invitations generate a token-based link that the recipient follows to accept or decline. Invitations expire after 7 days.

**Auth level:** mixed (`householdProcedure` for management ops, `protectedProcedure` for token-based ops)

---

## Procedures

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `invitation.create` | mutation | household | Create an invitation link (Owner/Admin only) |
| `invitation.listByHousehold` | query | household | List all invitations for a household (Owner/Admin only) |
| `invitation.getByToken` | query | protected | Look up an invitation by token (used on the join page) |
| `invitation.accept` | mutation | protected | Accept an invitation and become a member |
| `invitation.decline` | mutation | protected | Decline a pending invitation |
| `invitation.revoke` | mutation | household | Revoke a pending invitation (Owner/Admin only) |

---

## `invitation.create` — mutation

Create an invitation link. **Owner or Admin only.** Expires in 7 days.

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `email` | string (email) | no |
| `role` | `admin \| member \| sitter` | yes |

**Returns:** `Invitation` (includes `token` for the invite link)

---

## `invitation.listByHousehold` — query

List all invitations for the household. **Owner or Admin only.**

**Auth:** `householdProcedure`
**Input:** `{ householdId: string }`
**Returns:** `Invitation[]`

---

## `invitation.getByToken` — query

Look up an invitation by its token (used on the join page to show household info before accepting).

**Auth:** `protectedProcedure`
**Input:** `{ token: string }`
**Returns:** `Invitation & { householdName: string }`

---

## `invitation.accept` — mutation

Accept an invitation and become a member with the invited role.

**Auth:** `protectedProcedure`
**Input:** `{ token: string }`
**Returns:** `Member`
**Errors:** `NOT_FOUND`, `BAD_REQUEST` (already used or expired), `CONFLICT` (already a member)

---

## `invitation.decline` — mutation

Decline a pending invitation.

**Auth:** `protectedProcedure`
**Input:** `{ token: string }`
**Returns:** `{ success: true }`

---

## `invitation.revoke` — mutation

Revoke a pending invitation before it is accepted. **Owner or Admin only.**

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, invitationId: UUID }`
**Returns:** `Invitation`

---

## Key types

```ts
// Invitation status enum
type InvitationStatus = "pending" | "accepted" | "declined" | "expired"
```

---

## Related routers

- [member](./member.md) — member management (invitation.accept creates a member)
- [access-request](./access-request.md) — alternative join flow via join code
- [household](./household.md) — join code regeneration
