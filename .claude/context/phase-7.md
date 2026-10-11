# Phase 7: Savings goals (2026-10-12)

## In plain words
You can name something you're saving for, like "Laptop: ₭10,000,000", with an optional deadline. You then record money set aside for it ("Add money"), or take some back out, and a bar fills up. A goal with a deadline tells you how much a month you need to make it. Goals have their own page (Home → Goals), and Home shows the first three.

A goal is a **label on money you already have**. Adding money to a goal never changes an account balance.

## Decisions
- Earmark, not transfer ([ADR-011](../../docs/adr/011-goals-are-earmarks.md)).
- "Take out" is a negative contribution. The database refuses anything that would bring the saved amount below zero.
- Contributions are never changed or deleted; a mistake is corrected with one in the other direction.
- For a contribution the server reads the currency from the goal and sets the date itself. A goal's currency can't change after it's created. An archived goal accepts no money.
- The deadline is optional. The monthly amount is rounded up, so following it always reaches the target.
- "Reached" at 100%. A goal is archived, never deleted, and can be brought back.
- No new menu icon: Home has a Goals section with "See all", and Home stays the active menu item on the Goals pages.

## What was built
- **7.0** (PR #11): the `dev` branch flow. GitHub's checks run for `dev`; `docs/development.md` §6 describes tasks → `dev` → one release per phase.
- **7.1** (PR #12): tables `goals` and `goal_contributions`, view `goal_totals`, a trigger for "never below zero", Row Level Security, explicit grants, 29 database tests.
- **7.2** (PR #13): module `src/modules/goals`, pages `/goals`, `/goals/new`, `/goals/[id]`, `/goals/[id]/edit`; the progress bar became a shared component.
- **7.3**: `GoalSummary` on Home.

## Gotchas
- This was the first phase on `dev`. A task's migration goes to **staging** when the task lands in `dev`; production gets it at the release.
- Don't start a task on top of another task's unmerged branch. After a squash merge the second branch conflicts with `dev` in every file both touched, and has to be reconciled by hand.
- Home shows the Budgets and Goals sections only once an account exists, so browser tests must add an account first.
- A database test must count only its own test rows. One budgets test counted the whole table and failed on a laptop that had practice data.

## Checks (phase end)
545 unit tests (100% on all rule code), 177 database tests, 96 browser tests on GitHub. Security review: every query and action calls `requireUser()` first and checks its input with Zod; no user id, currency or date comes from the browser for a write; the database refuses other users' goals, a wrong currency, going below zero, and any change or delete of a contribution.

## Release checklist (waiting for the owner's "release")
1. Push `supabase/migrations/20261011212617_goals.sql` to production (rehearse first; exactly one file).
2. Merge `dev` into `main` with a merge commit, never a squash.
3. Read the rules back on production and unlink the laptop.
4. Try on the live site: add a goal, add money, take some out.

## Next
The design phase ([design-brief.md](design-brief.md)), when the owner says so.
