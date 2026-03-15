# Changelog

[Developer]

All notable changes to PetForce are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased]

### Added
- Notes module — household and pet-specific journal entries (CRUD via API)
- Reporting system — completion logs, member contributions, trends, and summary stats
- Analytics event tracking
- Gamification — XP, levels, streaks, and badges for members, household, and pets
- E2E test coverage expanded from 99 to 140 test cases across 26 test files
- Centralized env setup script (`infra/scripts/setup-env.sh`) for multi-worktree development
- Developer documentation: architecture guide, code conventions, multi-agent workflow

### Changed
- Playwright config updated to include all new test files in the authenticated project

---

## [0.3.0] - 2026-03-07

### Added
- Activity logging system — audit trail for all user actions
- Real-time dashboard sync improvements
- Data integrity fixes across household operations

### Fixed
- Cross-worker invite race condition
- Clerk re-auth timeout during E2E tests

---

## [0.2.0] - 2026-03-06

### Added
- Security hardening for API middleware
- Performance optimizations for dashboard queries
- Infrastructure monitoring setup

### Fixed
- Flaky E2E tests: tile loading races, safeGoto, screenshot catches

---

## [0.1.0] - 2026-03-05

### Added
- Initial release
- Household creation with owner, admin, member, sitter roles
- Pet profiles with full metadata and photo upload
- Health tracking: vet visits, vaccinations, medications
- Feeding schedules with daily completion tracking
- Calendar with 150+ pet holidays
- Finance and expense tracking with health cost rollup
- Email invitations and join-code access requests
- Dashboard with tile-based layout and activity sidebar
- Clerk authentication with test mode support
- Consolidated `.env.local` configuration via dotenv-cli
