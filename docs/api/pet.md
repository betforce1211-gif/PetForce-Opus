<!-- owner: backend -->

# pet router

[Developer]

CRUD for pets within a household. Pets are the core data entity — activities, feedings, health records, and expenses all reference a pet.

**Auth level:** `protectedProcedure` (membership is implicit via `householdId` on create/list)

---

## Procedures

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `pet.listByHousehold` | query | protected | List all pets in a household |
| `pet.getById` | query | protected | Get a single pet by ID |
| `pet.create` | mutation | protected | Add a pet to a household |
| `pet.update` | mutation | protected | Update pet details (partial) |
| `pet.delete` | mutation | protected | Remove a pet |

---

## `pet.listByHousehold` — query

**Auth:** `protectedProcedure`
**Input:** `{ householdId: string (UUID) }`
**Returns:** `Pet[]`

---

## `pet.getById` — query

**Auth:** `protectedProcedure`
**Input:** `{ id: string (UUID) }`
**Returns:** `Pet | null`

---

## `pet.create` — mutation

**Auth:** `protectedProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `name` | string (1-100) | yes |
| `species` | `dog \| cat \| bird \| fish \| reptile \| other` | yes |
| `breed` | string (max 100) | no |
| `color` | string (max 50) | no |
| `sex` | `male \| female \| unknown` | no |
| `dateOfBirth` | Date | no |
| `weight` | number (positive) | no |
| `adoptionDate` | Date | no |
| `microchipNumber` | string (max 50) | no |
| `rabiesTagNumber` | string (max 50) | no |
| `medicalNotes` | string (max 5000) | no |

**Returns:** `Pet`

---

## `pet.update` — mutation

All fields optional (partial update). `id` is always required.

**Auth:** `protectedProcedure`
**Input:** `{ id: UUID, ...partial pet fields }`
**Returns:** `Pet`

---

## `pet.delete` — mutation

**Auth:** `protectedProcedure`
**Input:** `{ id: string (UUID) }`
**Returns:** `{ success: true }`

---

## Key types

```ts
// Species enum
type Species = "dog" | "cat" | "bird" | "fish" | "reptile" | "other"

// Sex enum
type Sex = "male" | "female" | "unknown"
```

---

## Related routers

- [activity](./activity.md) — activities logged against a pet
- [feeding](./feeding.md) — feeding schedules per pet
- [health](./health.md) — health records and medications per pet
- [finance](./finance.md) — expenses per pet
- [calendar](./calendar.md) — pet birthdays included in calendar
