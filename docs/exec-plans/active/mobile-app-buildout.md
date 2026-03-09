# Mobile App Buildout

**Goal:** Build Expo mobile app to feature parity with web, submit to App Store and Play Store

**Owner:** Mobile agent

**Status:** Not started

---

## Steps

- [ ] Set up EAS Build configuration (`eas build:configure`)
- [ ] Port onboarding and auth flow (Clerk + household creation)
- [ ] Port dashboard screen (tiles, activity sidebar)
- [ ] Port pet profiles (list, detail, create, edit)
- [ ] Port feeding tracking (schedules, daily completion chips)
- [ ] Port health records (vet visits, vaccinations, medications)
- [ ] Port calendar view (monthly view, event types, filters)
- [ ] Set up TestFlight (iOS) and internal testing track (Android)
- [ ] Create app store assets (icons, splash screens, screenshots)
- [ ] Write Privacy Policy and Terms of Service
- [ ] Submit to Apple App Store and Google Play Store

## Decision Log

_No decisions yet._

## Notes

- Apple Developer account required ($99/year)
- Google Play Console required ($25 one-time)
- App icons: 1024x1024 (iOS), 512x512 (Play Store)
- Same tRPC client as web, pointing at deployed API
- Push notifications deferred to a future plan
