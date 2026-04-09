<!-- owner: backend -->

# notes router

[Developer]

Household and pet-specific notes and journals. Notes can be scoped to the entire household or to a specific pet. The `recent` query powers the dashboard notes tile.

**Auth level:** `householdProcedure`

---

## Procedures

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `notes.list` | query | household | List notes, optionally filtered by pet |
| `notes.recent` | query | household | Get the 4 most recent notes with snippets |
| `notes.create` | mutation | household | Create a note |
| `notes.update` | mutation | household | Update a note (partial) |
| `notes.delete` | mutation | household | Delete a note |

---

## `notes.list` — query

List all notes, optionally filtered by pet. Pass `petId: null` to return only household-level notes; omit `petId` entirely to return all notes.

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `petId` | UUID \| null | no |

**Returns:** `Note[]`

---

## `notes.recent` — query

Get the 4 most recent notes with content snippets. Used by the dashboard tile.

**Auth:** `householdProcedure`
**Input:** `{ householdId: string }`
**Returns:**

```ts
{
  notes: Note[]       // max 4, newest first
  totalCount: number  // total notes in household
}
```

---

## `notes.create` — mutation

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `petId` | UUID | no (omit for household-level note) |
| `title` | string (1-200) | yes |
| `content` | string (1-5000) | yes |

**Returns:** `Note`

---

## `notes.update` — mutation

All fields optional (partial update). `id` and `householdId` always required.

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, id: UUID, title?: string, content?: string }`
**Returns:** `Note`

---

## `notes.delete` — mutation

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, id: UUID }`
**Returns:** `{ success: true }`

---

## Related routers

- [pet](./pet.md) — notes optionally scoped to a specific pet
- [dashboard](./dashboard.md) — recent notes shown in dashboard tile
