# PetForce User Guide

PetForce is a household pet CRM — a shared space where your family manages everything about your pets in one place: profiles, health records, feeding schedules, expenses, and a calendar that ties it all together.

---

## Table of Contents

- [Getting Started](#getting-started)
- [The Dashboard](#the-dashboard)
- [Households & Members](#households--members)
- [Pet Profiles](#pet-profiles)
- [Health Tracking](#health-tracking)
- [Feeding Schedules](#feeding-schedules)
- [Calendar](#calendar)
- [Finance & Expenses](#finance--expenses)
- [Activity Timeline](#activity-timeline)

---

## Getting Started

1. **Sign up** — Create an account using your email (powered by Clerk authentication).
2. **Create a Household** — You'll be prompted to name your first household. You automatically become the **Owner**.
3. **Add your pets** — Click the **+ Add Pet** button on the Pets tile to create pet profiles.
4. **Invite your family** — Go to Settings to invite members by email. They'll get a link to join.

Once set up, your dashboard shows everything at a glance.

---

## The Dashboard

The dashboard is your home base — a grid of tiles that summarize your household at a glance.

### Tiles

| Tile | What it shows |
|------|---------------|
| **Quick Stats** | Pet count, activity count, member count |
| **Pets** | Pet cards with photos, names, breeds. Click to view/edit. |
| **Health** | Active medications, overdue vaccinations, next appointment. Click to manage. |
| **Members** | Household members with their roles |
| **Feeding** | Today's feeding completion. Tap chips to mark feedings done. |
| **Finance** | This month's spending, trend vs last month, top category. Click to manage. |
| **Quick Actions** | Shortcuts to log activity, add pet, or open settings |
| **Calendar** | Next 5 upcoming events across all categories. Click to open full calendar. |
| **Notes** | Coming soon — pet journal and notes |

### Activity Sidebar

On the right side, a timeline shows recent activities grouped by day (Today, Yesterday, etc.) — walks logged, feedings completed, vet visits recorded, and more.

---

## Households & Members

A **Household** is your shared pet-care space. Everyone in the household sees the same pets, schedules, and records.

### Roles

| Role | Permissions |
|------|------------|
| **Owner** | Full control — manage members, delete household, change settings |
| **Admin** | Manage pets, records, schedules, and members (except Owner) |
| **Member** | Add/edit pets, log activities, manage feedings and health records |
| **Sitter** | View-only access with ability to log feedings and activities |

### Inviting Members

1. Go to **Settings** (via the Quick Actions tile or sidebar)
2. Enter the person's email address and select a role
3. They'll receive an invitation link
4. Once accepted, they appear in the Members tile

### Join Codes

Each household has a **join code** that people can use to request access. The Owner can regenerate this code at any time from Settings.

### Household Customization

From Settings, you can customize:
- **Household name**
- **Primary color** — accent color used throughout the dashboard
- **Secondary color** — used for highlights and badges
- **Avatar** — household icon/image

---

## Pet Profiles

Each pet has a detailed profile with all the information your household needs.

### Pet Information

| Field | Description |
|-------|-------------|
| **Name** | Pet's name |
| **Species** | Dog, Cat, Bird, Fish, Reptile, or Other |
| **Breed** | Breed or mix |
| **Color** | Coat/fur color |
| **Sex** | Male, Female, or Unknown |
| **Date of Birth** | Used to calculate age and show birthdays on the calendar |
| **Weight** | Current weight |
| **Adoption Date** | When you got them |
| **Microchip Number** | For identification |
| **Rabies Tag Number** | Vaccination tag ID |
| **Medical Notes** | Allergies, conditions, special needs |
| **Photo** | Upload a photo (JPEG, PNG, or WebP, max 5 MB) |

### Managing Pets

- **Add a pet**: Click **+ Add Pet** on the Pets tile or use Quick Actions
- **Edit a pet**: Click any pet card on the Pets tile to open the edit modal
- **Delete a pet**: Open the edit modal and click Delete (Owner/Admin only)

---

## Health Tracking

The Health module tracks vet visits, vaccinations, and medications for all your pets. Click the **Health** tile on the dashboard to open it.

### Vet Visits

Record past and upcoming veterinary appointments.

| Field | Description |
|-------|-------------|
| Pet | Which pet the visit is for |
| Type | Vet Visit, Checkup, or Procedure |
| Date | When it happened/will happen |
| Vet/Clinic | Name of the vet or clinic |
| Reason | Why the visit occurred |
| Cost | How much it cost (optional — feeds into Finance) |
| Notes | Additional details |

### Vaccinations

Track your pets' vaccine history and upcoming due dates.

| Field | Description |
|-------|-------------|
| Vaccine Name | e.g., Rabies, DHPP, FVRCP |
| Date Given | When the vaccine was administered |
| Next Due Date | When the next dose is needed |
| Vet | Who administered it |
| Cost | Vaccination cost (optional) |

**Overdue alerts**: If a vaccination's next due date has passed, it shows as overdue on both the Health tile and the dashboard — so you never miss a booster.

**Suggestion chips**: Common vaccines appear as quick-select buttons based on species:
- **Dogs**: Rabies, DHPP, Bordetella, Leptospirosis, Canine Influenza, Lyme
- **Cats**: Rabies, FVRCP, FeLV, FIV, Bordetella

### Medications

Track active and past medications.

| Field | Description |
|-------|-------------|
| Name | Medication name (e.g., Apoquel) |
| Dosage | Amount (e.g., 50mg) |
| Frequency | How often — Once daily, Twice daily, etc. |
| Start Date | When the medication started |
| End Date | When it ends (leave blank for ongoing) |
| Prescribed By | Vet who prescribed it |
| Notes | Administration instructions |

Active medications show on the Health tile's summary row.

---

## Feeding Schedules

Set up daily feeding plans for each pet and track who fed them today.

### Setting Up Schedules

Click **Manage Schedules** on the Feeding tile (or **+ Add Schedule** if no schedules exist yet).

| Field | Description |
|-------|-------------|
| Pet | Which pet to feed |
| Label | Meal name — Breakfast, Lunch, Dinner, Snack (or custom) |
| Time | Scheduled feeding time |
| Food Type | What food (e.g., Kibble, Wet food) |
| Amount | How much (e.g., 1 cup, 2 scoops) |
| Notes | Special instructions |

**Suggestion chips**: Click Breakfast, Lunch, Dinner, or Snack to auto-fill the label and a sensible default time.

### Daily Tracking

On the dashboard's Feeding tile:
- Each pet shows their scheduled feedings as **chips**
- Tap a chip to mark that feeding as **complete** (shows a checkmark)
- Tap again to **undo** if marked by mistake
- A completion badge (e.g., "2/3") shows overall progress
- The tile auto-refreshes every 30 seconds

---

## Calendar

The Calendar shows everything happening across your household in a unified monthly view. Click the **Calendar** tile to open it.

### What appears on the calendar

| Event Type | Source | Color |
|------------|--------|-------|
| Activities | Logged walks, play, grooming, etc. | Blue |
| Feedings | Daily scheduled feeding times | Orange |
| Health | Vet visits, vaccinations, checkups | Red |
| Birthdays | Pet birthdays (from date of birth) | Pink |
| Holidays | 150+ national pet holidays and awareness days | Green |

### Using the Calendar

- **Navigate months**: Use the **<** and **>** arrows, or click **Today** to jump back to the current month
- **View a day**: Click any date to see that day's events in a detail panel
- **Add an event**: Click **+ Add** in the day detail panel to schedule a new activity
- **Filter**: Toggle **Holidays** and **Feedings** on/off to reduce clutter

### Pet Holidays

PetForce includes 150+ national pet holidays and awareness days throughout the year — from National Dog Day (August 26) to World Cat Day (August 8) to National Pet Dental Health Month (February). Toggle these on or off as you like.

---

## Finance & Expenses

Track what you spend on your pets. The Finance module combines general expenses with costs from health records for a complete spending picture.

Click the **Finance** tile to open it.

### Overview Tab

The Overview tab shows your spending at a glance:

- **Monthly total** — how much you've spent this month
- **Month-over-month trend** — percentage change vs last month (green = down, red = up)
- **By category** — visual breakdown of spending by type
- **By pet** — how much each pet costs
- **Recent transactions** — last 5 expenses with source labels

Use the **<** and **>** arrows to view previous months.

### Expense Categories

| Category | Examples |
|----------|---------|
| Food | Kibble, wet food, raw diet |
| Treats | Training treats, dental chews |
| Toys | Balls, chew toys, puzzle feeders |
| Grooming | Haircuts, nail trims, baths |
| Boarding | Daycare, pet hotels, boarding |
| Insurance | Pet insurance premiums |
| Supplies | Beds, leashes, litter, crates |
| Training | Classes, private sessions |
| Other | Anything else |

Health record costs (vet visits, vaccinations, medications) are **automatically included** in your finance totals — no need to enter them twice.

### Adding Expenses

In the **Expenses** tab:
1. Select a **pet**
2. Choose a **category**
3. Enter a **description** (suggestion chips appear based on category)
4. Enter the **amount**
5. Set the **date**
6. Add optional **notes**
7. Click **Add**

Existing expenses appear below, grouped by pet and sorted by date. You can edit or delete any expense inline.

---

## Activity Timeline

The sidebar on your dashboard shows a chronological feed of everything happening in your household:

- Walks logged
- Feedings completed
- Vet visits recorded
- Medications given
- Play sessions, grooming, and more

Activities are grouped by day — **Today**, **Yesterday**, then by weekday name or date. Each entry shows the activity type icon, title, which pet, who logged it, and when.

### Logging Activities

Use the **Log Activity** button in Quick Actions or at the bottom of the sidebar. Choose:
- **Pet** — which pet
- **Type** — Walk, Feeding, Vet Visit, Medication, Grooming, Play, or Other
- **Title** — what happened
- **Notes** — additional details
- **Date/Time** — when it happened (defaults to now)

Logged activities also appear on the Calendar.
