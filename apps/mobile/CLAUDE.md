# Mobile App — apps/mobile/

## Overview

Expo React Native app (iOS + Android) using Expo Router for file-based navigation.

## Tech

- **Framework:** Expo SDK 55 (managed workflow)
- **Navigation:** Expo Router (file-based)
- **UI:** Tamagui components from `@petforce/ui`
- **Data fetching:** tRPC client via `@trpc/react-query`
- **Auth:** `@clerk/clerk-expo` with `expo-secure-store` token cache
- **Types/validation:** Consumed from `@petforce/core`

## Commands

```bash
pnpm dev --filter=mobile  # Start Expo dev server
```

Builds are handled via EAS (Expo Application Services).

## File Structure

```
src/
├── app/
│   ├── _layout.tsx           # Root layout (Stack nav + providers)
│   ├── (tabs)/
│   │   ├── _layout.tsx       # Tab navigator (Home, Pets, Activity, Settings)
│   │   ├── index.tsx         # Home/Dashboard
│   │   ├── pets.tsx          # Pet list
│   │   ├── activity.tsx      # Activity feed
│   │   └── settings.tsx      # Household settings + members
│   ├── pet/[id].tsx          # Pet detail
│   ├── activity/new.tsx      # Log new activity
│   ├── feeding/index.tsx     # Feeding schedules + daily status
│   ├── health/[petId].tsx    # Health records per pet
│   ├── medication/[petId].tsx # Medications per pet
│   ├── auth/sign-in.tsx      # Sign in (Clerk useSignIn)
│   ├── auth/sign-up.tsx      # Sign up (Clerk useSignUp)
│   ├── onboard.tsx           # Create household
│   └── join.tsx              # Join household via code
├── lib/
│   ├── trpc.ts               # tRPC client setup
│   ├── auth.ts               # Auth hook (wraps @clerk/clerk-expo useAuth)
│   ├── household.ts          # Household selection context
│   └── providers.tsx         # Combined providers wrapper
└── components/               # Mobile-specific components
```

## Conventions

- **Screens** go in `src/app/` following Expo Router conventions
- **Shared components** come from `@petforce/ui` — don't duplicate them here
- **Mobile-only components** go in `src/components/`
- **Navigation:** Use Expo Router's `<Stack>`, `<Tabs>`, and `<Link>`
- **Styling:** Use Tamagui — it renders to native views, not web divs
- **Push notifications:** Handle in this app, not in shared packages
- Always wrap the app in `<TamaguiProvider>` in the root layout

## Dependencies

- `@petforce/ui` — shared component library
- `@petforce/core` — shared types and validation
- API server must be running for tRPC calls (use device IP in development)
