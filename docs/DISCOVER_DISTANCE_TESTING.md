# Discover Screen – Distance Feature: Manual Testing

## What to verify

1. **Distance on cards** – Each Discover card shows either “X mi away” (when viewer and candidate have location) or “Distance unavailable” (when either is missing).
2. **Distance filter** – Changing “Within X miles” in Filters and applying updates the list and the badge on the Filters button (e.g. “50 mi”).
3. **Filter badge** – The Discover header Filters button shows the current radius (e.g. “50 mi”) so the active filter is visible.

## How to test in development

### 1. Distance on cards (mock backend)

- Log in as a user that has **location set** (e.g. complete Profile Setup with a map location, or use a persisted user that already has `locationCoordinates`).
- Open **Discover**. Each card should show:
  - **Location label** (e.g. “New York, NY, USA”).
  - **Distance**: “X mi away” (e.g. “12.3 mi away”) when both you and the candidate have coordinates; otherwise “Distance unavailable”.
- Log in as (or temporarily set) a user **without** location (e.g. new account before setting location, or clear `locationCoordinates` in dev). Open Discover – cards should show “Distance unavailable” because there is no viewer center.

### 2. Distance filter

- Open **Discover** → tap **Filters**.
- Change **Distance** (e.g. “Within 20 miles”) and tap **Apply** (or tap outside to save).
- Confirm:
  - The Filters button in the header shows the new radius (e.g. “20 mi”).
  - The list only includes people within that radius (in mock data, distances are fixed per user; you may see fewer cards with a smaller radius).
- Change radius again (e.g. to 100 mi) and apply – the badge and list should update accordingly.

### 3. Edge cases

- **No viewer location**: Ensure your profile has no map location (or use a user with `locationCoordinates: null`). Discover should still load; cards show “Distance unavailable”; filter radius is still applied by the backend using whatever center is available (e.g. backend may fall back or omit distance).
- **Candidate without location**: Mock users have coordinates; if you have a candidate with `locationCoordinates: null`, that card should show “Distance unavailable”.
- **Reset filters**: In Filters, tap **Reset** then apply. Radius should return to default (e.g. 50 mi) and the Filters badge should match.

## Unit tests (distance logic)

Distance calculation and formatting are covered by unit tests:

```bash
npm test -- utils/geo.test.ts
```

Or run all tests:

```bash
npm test
```

These tests check `haversineMiles` (same point, null/invalid inputs, NYC–Boston, symmetry) and `formatDistanceMiles` (formatting, null/negative/NaN, “&lt; 0.1 mi”).
