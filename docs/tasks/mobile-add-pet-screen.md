# Task: Mobile Add Pet Screen

**Agent:** Mobile
**Branch:** `agent/mobile`
**Priority:** After mobile auth + household context are in place

## Prerequisites

Before this screen can work end-to-end, the mobile app needs:

1. **tRPC client setup** in `apps/mobile/src/lib/trpc.ts` (same pattern as web)
2. **Clerk auth integration** (Expo-compatible — `@clerk/clerk-expo`)
3. **Household context** — knowing which household the user belongs to
4. **Tab or stack navigation** to reach the add-pet screen

## What to Build

An "Add Pet" screen at `apps/mobile/src/app/add-pet.tsx` (or nested under a dashboard group) that collects:

### Section 1: Basic Info
- Name (required)
- Species (picker: dog, cat, bird, fish, reptile, other)
- Breed (optional text)
- Color (optional text, max 50)
- Sex (optional picker: male, female, unknown)
- Date of birth (optional date picker)
- Weight in lbs (optional numeric)

### Section 2: Identification
- Adoption date (optional date picker)
- Microchip # (optional text, max 50)
- Rabies tag # (optional text, max 50)

### Section 3: Notes
- Additional notes (optional textarea, max 5000, maps to `medicalNotes` field)

## Shared Resources (already done)

These are all in `@petforce/core` and ready to import:

- `createPetSchema` — Zod schema with all fields (used for form validation + tRPC input)
- `petSpecies`, `petSex` — const arrays for picker options
- `PET_SPECIES_LABELS`, `PET_SEX_LABELS` — display labels
- `PetSpecies`, `PetSex` — TypeScript types

The tRPC mutation is `pet.create` — same as web, takes `householdId` + schema fields.

## UI Notes

- Use Tamagui components from `@petforce/ui` where possible
- Keep the form compact — user hates scrolling. Use 2-column layouts on tablets.
- On success, navigate back to the dashboard/pet list
- Show inline validation errors
