<!-- owner: backend -->

# health router

[Developer]

Manage health records (vet visits, vaccinations, checkups, procedures) and medications for pets. Health record costs are automatically surfaced in the finance summary.

**Auth level:** `householdProcedure`

---

## Procedures

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `health.listRecords` | query | household | List health records, optionally filtered by type |
| `health.createRecord` | mutation | household | Create a health record |
| `health.updateRecord` | mutation | household | Update a health record (partial) |
| `health.deleteRecord` | mutation | household | Delete a health record |
| `health.listMedications` | query | household | List medications, optionally active only |
| `health.createMedication` | mutation | household | Add a medication |
| `health.updateMedication` | mutation | household | Update a medication (partial) |
| `health.deleteMedication` | mutation | household | Delete a medication |
| `health.summary` | query | household | Health dashboard summary (active meds, overdue vaccines, next appointment) |

---

## `health.listRecords` — query

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `type` | `vet_visit \| vaccination \| checkup \| procedure` | no |

**Returns:** `HealthRecord[]`

---

## `health.createRecord` — mutation

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `petId` | UUID | yes |
| `type` | `vet_visit \| vaccination \| checkup \| procedure` | yes |
| `date` | Date | yes |
| `vetOrClinic` | string (max 200) | no |
| `reason` | string (max 500) | no |
| `notes` | string (max 2000) | no |
| `cost` | number (>= 0) | no |
| `vaccineName` | string (max 200) | no |
| `nextDueDate` | Date | no |

**Returns:** `HealthRecord`

---

## `health.updateRecord` — mutation

All fields optional (partial update). `id` and `householdId` always required.

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, id: UUID, ...partial fields }`
**Returns:** `HealthRecord`

---

## `health.deleteRecord` — mutation

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, id: UUID }`
**Returns:** `{ success: true }`

---

## `health.listMedications` — query

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `activeOnly` | boolean | no |

**Returns:** `Medication[]`

---

## `health.createMedication` — mutation

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `petId` | UUID | yes |
| `name` | string (1-200) | yes |
| `dosage` | string (max 100) | no |
| `frequency` | string (max 100) | no |
| `startDate` | Date | no |
| `endDate` | Date | no |
| `prescribedBy` | string (max 200) | no |
| `notes` | string (max 2000) | no |

**Returns:** `Medication`

---

## `health.updateMedication` — mutation

All fields optional. `id` and `householdId` always required.

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, id: UUID, ...partial fields }`
**Returns:** `Medication`

---

## `health.deleteMedication` — mutation

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, id: UUID }`
**Returns:** `{ success: true }`

---

## `health.summary` — query

Get health dashboard summary for the household.

**Auth:** `householdProcedure`
**Input:** `{ householdId: string }`
**Returns:**

```ts
{
  activeMedicationCount: number
  overdueVaccinationCount: number
  nextAppointment: {
    petName: string
    date: string        // ISO date
    reason: string | null
  } | null
}
```

---

## Key types

```ts
// Health record type enum
type HealthRecordType = "vet_visit" | "vaccination" | "checkup" | "procedure"
```

Health records with a `cost` field are automatically included in `finance.summary` under the `health` source.

---

## Related routers

- [pet](./pet.md) — pets referenced by health records and medications
- [calendar](./calendar.md) — health records appear as calendar events
- [finance](./finance.md) — health record costs roll up into spending summaries
- [reporting](./reporting.md) — medication completions counted in reports
