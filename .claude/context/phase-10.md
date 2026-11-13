# Phase 10: Insights (2026-11-13)

## In plain words
More has a new Insights row. The Insights page looks back over the last 3, 6 or 12 finished months, one currency at a time:
- money in and out for each month;
- a pie of each month's spending by category;
- what a normal month costs;
- where money usually goes;
- the biggest expenses;
- how often each budget was kept;
- where money came from.

Nothing new is saved. The page does the sums from your entries each time it opens, so it always agrees with History. Averages wait until there are 2 finished months.

## Decisions
- The owner approved the mockups (https://claude.ai/artifact/7rsXMZG2GRL2FHgUC488sH) with the defaults. They added a pie for each month, with arrows to change month. "pic chart" meant a pie.
- Insights is a row at the top of More, so the bottom bar stays the same. Every account counts, including ones switched off on Home.
- This month shows only in the bars, the pie and the biggest expenses, marked "so far".
- Counting starts at the first entry in each currency, and averages need 2 counted months. See [ADR-016](../../docs/adr/016-insights-worked-out-on-open.md).
- Charts are drawn by the app: plain bars, and an SVG donut using `stroke-dasharray` on a circle whose length is 100. There's no chart library.
- **Category lists:**
  - A single leftover category keeps its name.
  - Two or more leftovers are grouped as "Everything else" (`en.insights.rest`), because every user has a default category called "Other". Home still says "Other" for its group.
- Biggest expenses has no "See all" link, because History can't sort by amount.

## What was built
- **#59:**
  - `money.divide`: an even split, rounded half away from zero, with integer maths only.
  - `src/modules/analytics`:
    - domain: `types`, `calculations`, `params`;
    - server: `getInsights`, `getNormalMonthOut`.
  - `dashboard` also exports `savingsRate` and `TOP_CATEGORIES`.
  - ADR-016 and the module table in architecture.md.
- **#60:**
  - `/insights` and `analytics/ui/*` (month bars, category pie, period menu, currency chips and the cards).
  - `analytics/domain/chart.ts`: pie geometry and month labels that are safe in the browser.
  - `categoryStrokeClass` in `category-icon.tsx`.
  - The More row (`more/ui/insights-row.tsx`) and the More tab lit on `/insights`.
  - `sw.js` v4.
  - `tests/e2e/insights.spec.ts`, plus updates to `more.spec` and `accessibility.spec`.

## Gotchas
- **Budgets can only start in the current month**, so a browser test can't make past budget months. "Budgets: how often kept" is proven by unit tests, including one built from the mockup's sample data.
- **A month button's accessible name must contain its visible text** (axe's label-in-name rule). The buttons are invisible overlays over each bar cell; the short month name sits beside them, hidden from screen readers.
- `Intl` with `en-GB` gives "Sept". Build "15 Sep" from `monthShort` instead.
- A full-page screenshot draws the fixed bottom bar in the middle of a long page. On the phone it stays at the bottom.
- The transactions note column is `description`.

## Checks (phase end)
- 718 unit tests pass, with 100% coverage on money and every `calculations.ts`.
- On GitHub, 142 browser tests passed on #60, none flaky.
- Light, dark and 320px pictures with six sample months: no sideways scroll, and the numbers match the mockup.
- No database changes in this phase.
