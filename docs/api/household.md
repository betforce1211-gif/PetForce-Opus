<!-- owner: backend -->

# household router

[Developer]

CRUD operations for households, plus join-code management. The household is the top-level entity in PetForce — everything else belongs to one.

**Auth level:** mixed (`protectedProcedure` for most ops, `householdProcedure` for join-code regeneration)

---

## Procedures

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `household.list` | query | protected | List all households the current user belongs to |
| `household.getById` | query | protected | Get a single household by ID |
| `household.create` | mutation | protected | Create a new household (caller becomes Owner) |
| `household.update` | mutation | protected | Update household name and/or theme |
| `household.delete` | mutation | protected | Delete a household and all associated data |
| `household.regenerateJoinCode` | mutation | household | Generate a new join code — Owner only |

---

## `household.list` — query

**Auth:** `protectedProcedure`
**Input:** None
**Returns:** `Household[]`

---

## `household.getById` — query

**Auth:** `protectedProcedure`
**Input:** `{ id: string (UUID) }`
**Returns:** `Household | null`

---

## `household.create` — mutation

**Auth:** `protectedProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `name` | string (1-100 chars) | yes |
| `theme` | `{ primaryColor: hex, secondaryColor: hex, avatar: url \| null }` | no |

**Returns:** `Household`

---

## `household.update` — mutation

Theme is merged (partial update — omitted theme fields are preserved).

**Auth:** `protectedProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `id` | string (UUID) | yes |
| `name` | string (1-100 chars) | no |
| `theme` | partial `{ primaryColor, secondaryColor, avatar }` | no |

**Returns:** `Household`

---

## `household.delete` — mutation

Deletes a household and all associated data (cascading).

**Auth:** `protectedProcedure`
**Input:** `{ id: string (UUID) }`
**Returns:** `{ success: true }`

---

## `household.regenerateJoinCode` — mutation

Generate a new join code. **Owner only.**

**Auth:** `householdProcedure`
**Input:** `{ householdId: string }`
**Returns:** `Household` (with new `joinCode`)
**Errors:** `FORBIDDEN` if caller is not owner

---

## Related routers

- [dashboard](./dashboard.md) — dashboard aggregation and onboarding
- [member](./member.md) — member management
- [invitation](./invitation.md) — email-based invitations
- [access-request](./access-request.md) — join-code-based requests
