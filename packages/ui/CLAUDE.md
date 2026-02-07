# Design System — packages/ui/

## Overview

Shared component library built with Tamagui. Components render natively on both web and mobile.

## Tech

- **Component framework:** Tamagui (cross-platform styled components)
- **Theming:** Tamagui tokens + household-specific theme overrides
- **Exports:** Components + Tamagui config

## Commands

```bash
pnpm build --filter=@petforce/ui
pnpm lint --filter=@petforce/ui
```

## File Structure

```
src/
├── index.ts              # Public exports
├── tamagui.config.ts     # Tamagui configuration + custom tokens
└── components/
    ├── Button.tsx         # Primary, secondary, outline variants
    ├── Card.tsx           # Surface card with shadow
    └── Avatar.tsx         # Avatar circle + image
```

## Conventions

- **All shared visual components** live here — not in `apps/web` or `apps/mobile`
- **Use `styled()` API** from Tamagui to create components
- **Variants** over props: Use Tamagui's variant system for component variations
- **Tokens:** Custom PetForce tokens are prefixed with `petforce` (e.g., `$petforcePrimary`)
- **Household theming:** Components should respect dynamic theme tokens so households can customize colors

## Custom Tokens

```
$petforcePrimary    → #6366F1 (Indigo)
$petforceSecondary  → #EC4899 (Pink)
$petforceBg         → #FAFAFA
$petforceSurface    → #FFFFFF
$petforceText       → #1A1A2E
$petforceTextMuted  → #6B7280
```

## Adding a New Component

1. Create `src/components/<Name>.tsx`
2. Use `styled()` from Tamagui
3. Export from `src/index.ts`
4. Component should work on both web and native without platform checks

## Consumers

- `@petforce/web` (Next.js)
- `@petforce/mobile` (Expo)
