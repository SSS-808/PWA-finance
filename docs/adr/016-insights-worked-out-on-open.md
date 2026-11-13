# ADR-016: Insights are worked out when you open them

**Status:** Accepted · 2026-11-13

## In plain words
Insights is like flipping back through your notebook every time you open it, instead of keeping a second notebook of summaries. Nothing new is saved; the page reads your entries and does the sums on the spot, so it can never disagree with History.

## Context
- Phase 10 adds an Insights page: month-by-month bars, a pie of each month's spending by category, a normal month, where money usually goes, the biggest expenses, how often budgets were kept, and where money came from (mockups approved 2026-11-13).
- The roadmap asks that every number explains how it was worked out.
- One person's entries are small enough to read in pages of 1,000, the same way Home and Budgets already do.

## Decision
- **No new tables.** A new `analytics` module reads income and expenses and works everything out in pure, fully tested functions.
- **Per currency, never added together** ([ADR-008](008-no-currency-mixing.md)). One currency at a time, the main one first; only currencies used in the period appear.
- **Every account counts**, including ones switched off on Home, like Budgets.
- **Full months only for averages.** The period is the last 3, 6 or 12 finished months (6 by default). This month appears in the bars, the pie and the biggest expenses as "so far", never in averages or budget scores.
- **Counting starts at your first entry.** In each currency, months before the first income or expense aren't counted, so a new user's average isn't dragged down by empty months.
- **Averages need 2 counted months.** Before that, the cards built on averages wait and say when they arrive.
- **Rounding:** an average is the total divided by the number of months, rounded half away from zero to a whole minor unit (`divide` in the money module).
- **A budget is kept** in a month when spending in its category stayed at or under the budget in force that month. Months without that budget don't count.
- **Charts are drawn by the app** (plain bars and an SVG pie), with no chart library.

## Alternatives
- **Monthly summary tables** filled by triggers: faster on huge data, but a second copy that can drift from the entries, and a migration to keep right.
- **Counting empty months from the period start:** simpler, but a new user would see averages far too low.
- **A chart library:** more chart types for free, but more to download on a phone for charts simple enough to draw.

## Consequences
- ✅ No database change and nothing to keep in sync.
- ✅ Every number can be traced to entries in History.
- ⚠️ A 12-month view reads a year of entries each time it opens; fine for one person, revisit if it gets slow.
- ⚠️ A first month that started mid-month counts as full, so its average looks a bit low; the "?" says so.
