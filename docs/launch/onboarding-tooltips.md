# In-App Onboarding Tooltips

**Audience:** First-time users during initial app session
**Implementation:** Sequential tooltip overlay (dismiss to advance)
**Trigger:** First login after account creation
**Platform:** Web + Mobile (same copy, adapted layout)

---

## Tooltip Sequence

### 1. Household Creation

**Trigger:** User lands on dashboard for the first time (no household exists)
**Element:** "Create Household" button
**Position:** Below button, arrow pointing up

> **Start here — create your household**
> Your household is where your family coordinates pet care. Everyone you invite will share this space.

**CTA button:** "Create Household"
**Dismiss:** Clicking CTA or X

---

### 2. Household Naming

**Trigger:** Household creation modal opens
**Element:** Household name input field
**Position:** Right of field (desktop), below field (mobile)

> **Give it a name your family knows**
> "The Martinez Family" or "Furry Friends HQ" — whatever works. You can change it later.

**Dismiss:** User types in field or clicks X

---

### 3. Add Your First Pet

**Trigger:** Household created, user returns to dashboard
**Element:** "Add Pet" button or empty pet list area
**Position:** Below element, arrow pointing up

> **Now add your first pet**
> Name, species, and breed are all you need to start. You can add medical info and photos anytime.

**CTA button:** "Add Pet"
**Dismiss:** Clicking CTA or X

---

### 4. Pet Profile Completion

**Trigger:** Pet creation form opens
**Element:** Medical notes field
**Position:** Left of field (desktop), below field (mobile)

> **Medical notes are optional but valuable**
> Allergies, medications, vet name — anything your household should know. Everyone in your household can see these.

**Dismiss:** User interacts with form or clicks X

---

### 5. First Activity Log

**Trigger:** First pet created, user returns to dashboard
**Element:** Quick-log button (+ FAB on mobile, action bar on web)
**Position:** Above button, arrow pointing down

> **Log your first activity**
> Tap here to record a feeding, walk, or medication. It takes under 3 seconds — and your whole household will see it.

**CTA button:** "Log Activity"
**Dismiss:** Clicking CTA or X

---

### 6. Activity Type Selection

**Trigger:** Quick-log panel opens for the first time
**Element:** Activity type grid (feeding, walk, medication, vet visit)
**Position:** Top of panel

> **Pick what you just did**
> PetForce pre-fills the time and pet based on your most recent activity. Just tap the type and confirm.

**Dismiss:** User selects an activity type or clicks X

---

### 7. Invite Prompt (Delayed)

**Trigger:** After first activity is logged successfully
**Element:** Household members area in sidebar/settings
**Position:** Inline card below activity confirmation

> **Pet care is a team effort**
> Invite your partner, family, or pet sitter so everyone sees who did what. No more "did you feed the dog?" texts.

**CTA button:** "Invite Someone"
**Secondary:** "Maybe Later" (dismisses, shows again after 3rd activity log)
**Dismiss:** Either button

---

## Implementation Notes

### Sequencing rules
- Tooltips appear one at a time, in order
- Each tooltip must be dismissed (CTA click or X) before the next can appear
- If a user completes the action before seeing the tooltip (e.g., creates a pet via direct navigation), skip that tooltip
- The sequence resets only on account deletion — not on logout/login

### Persistence
- Track tooltip progress in user metadata: `onboardingStep: 1-7`
- Store completion: `onboardingComplete: true` after tooltip 7 is dismissed
- Never show the sequence again once complete

### Styling
- Use the household's theme colors for tooltip background/accent if available, otherwise use PetForce brand blue
- Max width: 280px (mobile), 320px (desktop)
- Backdrop: semi-transparent overlay (opacity 0.4) behind tooltip, highlighting the target element
- Animation: fade in 200ms, slide up 8px

### Accessibility
- Tooltips must be keyboard-navigable (Tab to CTA, Escape to dismiss)
- Screen reader: announce tooltip text when it appears
- Respect `prefers-reduced-motion` — disable slide animation, keep fade

### Analytics events
- `onboarding.tooltip.shown` — `{ step: number, tooltipId: string }`
- `onboarding.tooltip.cta_clicked` — `{ step: number, tooltipId: string }`
- `onboarding.tooltip.dismissed` — `{ step: number, tooltipId: string, method: "cta" | "x" | "action" }`
- `onboarding.complete` — `{ totalTimeSeconds: number, stepsSkipped: number[] }`
