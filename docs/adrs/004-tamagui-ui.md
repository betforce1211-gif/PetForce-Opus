# ADR-004: Use Tamagui for Cross-Platform UI

**Status:** Accepted
**Date:** 2026-04-08
**Author:** Architect

## Context

PetForce needs a UI component library that:
- Shares components between Next.js (web) and Expo (mobile) without duplication
- Supports dynamic theming (each Household has custom `primaryColor`, `secondaryColor`)
- Provides performant styling with compile-time optimization for production builds
- Works within the Turborepo monorepo structure with a shared `packages/ui/` package

Multi-platform parity (Product Principle P13) is non-negotiable: web and mobile must match feature-for-feature every sprint. A library that requires separate component implementations for each platform directly undermines this principle by introducing maintenance drift.

## Decision

Use Tamagui as the cross-platform UI framework, hosted in `packages/ui/`. Theme tokens support per-household customization via `primaryColor` and `secondaryColor` values stored in the household's `theme` JSONB column. All shared components (buttons, inputs, cards, modals) live in `packages/ui/src/` and are consumed by both `apps/web/` and `apps/mobile/`.

Colors are never hardcoded — components use Tamagui theme tokens exclusively, which resolve to per-household values at render time.

## Rationale

Tamagui is the only mature cross-platform UI library that achieves true component sharing between React (web) and React Native (mobile) without requiring separate implementations for complex components. React Native Web gets close but struggles with sophisticated web layouts. NativeWind provides familiar syntax but still requires separate component trees.

The compile-time optimization story is significant for mobile: Tamagui's compiler extracts static styles at build time, reducing the JavaScript work required at render time on lower-end Android devices. This supports the sub-3-second interaction goal (Product Principle P2).

Per-household theming via Tamagui's token system means a household's brand colors propagate through the entire component tree without prop drilling or context gymnastics. The household's `primaryColor` and `secondaryColor` are injected at the theme level, and every component that uses `$primary` or `$secondary` tokens picks them up automatically.

## Consequences

- True cross-platform components: one component file in `packages/ui/` renders correctly on both web (Next.js) and mobile (Expo React Native).
- Per-household theming via Tamagui theme tokens means colors are never hardcoded — always use theme tokens (`$primary`, `$secondary`, etc.) for colors in components.
- Compile-time optimization: Tamagui extracts static styles at build time for better runtime performance, particularly on mobile.
- Tamagui has a steep learning curve compared to CSS-in-JS or Tailwind — use existing components in `packages/ui/` as patterns rather than inventing new styling approaches from scratch.
- **Agent constraint:** After ANY `packages/ui/` component change, verify BOTH web and mobile render correctly before marking work complete. A component that looks correct on web may break on mobile due to different layout engines (CSS flexbox vs. React Native's Yoga). Screenshot or recording evidence of both platforms is required in the PR. Do not submit component changes with only web verification.

## Alternatives Considered

**NativeWind (Tailwind for React Native):** Popular, familiar syntax for web developers. Rejected because: NativeWind doesn't provide true component sharing — web and mobile still require separate component implementations for anything beyond basic primitives.

**React Native Web:** Official cross-platform layer maintained by Meta. Rejected because: limited web-specific styling capabilities (CSS grid, complex selectors) and poor performance for complex layouts. The abstraction leaks in production.

**Separate component libraries (Radix for web, React Native Paper for mobile):** Best-in-class tools for each platform individually. Rejected because: double maintenance burden, inevitable feature drift between platforms, and direct violation of the Multi-Platform Parity principle (P13).
