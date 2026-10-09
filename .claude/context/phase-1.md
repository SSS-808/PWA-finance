# Phase 1: Foundation (2026-10-09 → 2026-10-10)

## In plain words

We built the **empty house and its safety systems**. There's no furniture yet (no screens you can use), but everything later phases need is in place and tested.

1. **The app shell** (task 1.1). A blank website that says "Personal Wallet", plus helpers that check the code automatically:
   - a *type checker* that catches mistakes before the code runs
   - a *linter* that checks the code for bad habits
   - a *formatter* that keeps the code tidy
   - *robot testers* that click through the site in a browser
2. **The money calculator** (task 1.2). A tiny, very careful calculator. It stores money as whole numbers (cents, whole kip), so it never makes the rounding mistakes computers make with decimals. **102 tests** prove it, including the famous traps.
3. **The database** (task 1.3). The filing cabinet where your money data will live:
   - **Locks:** each user can only open their own drawer.
   - **Rules:** an expense must be negative, and a transfer must have both sides.
   - **A diary:** every change is written down.
   - **Tests:** **81 tests** try to break in or break the rules, and all of them are refused.
   - **Practice data:** a fake demo user with sample accounts.
4. **The robot checker** (task 1.4). Every time you push code to GitHub, a robot re-runs all the tests on a fresh computer and shows ✅ or ❌. It skips pushes that only change docs.
5. **Going online:** moved to the end of the MVP (your decision). Steps are collected in `docs/deploy.md`.

## Decisions made in this phase

| Decision | Why |
|---|---|
| Commit straight to `main` until the MVP is online (you) | Nothing is live yet, so branches were extra work |
| Deploy at the MVP release, not now (you) | Finish the app first; `deploy.md` collects the steps meanwhile |
| Keep Next.js "Cache Components" on | It's the new Next.js default and becomes mandatory soon. It shows the page frame instantly and loads your data right after. |
| Supabase connection code waits for Phase 2 | Nothing would use it yet, and unused code shouldn't go online |
| CI skips docs-only pushes | No code changed, so there's nothing to test |
| Explain everything in plain words (you) | You're learning; decisions you don't understand aren't really yours |

## Problems we hit (and fixed)

- The page font showed as Times New Roman. A setting pointed at itself, so we pointed it at the Geist font.
- During cleanup in 1.1, a helper agent stopped a background program it couldn't identify. Nothing was lost.
- A test contained an invisible space character. We replaced it with a visible escape code, so nobody breaks it by accident.
- In 1.3, a helper agent froze while the database started. Claude finished the task and checked everything.
- A Supabase option to start fewer services did nothing, so we removed it instead of leaving a misleading line.

## Numbers

- Commits: `c7f3019` (merged as PR #1, 1.1), `7ecf946` (1.2), `8cba7ed` (1.3), `8bbcc91` (1.4)
- Tests: 102 unit (100% coverage on money), 81 database, 6 screen-width checks. First CI run: green in 1m37s.
- Seed balances checked by hand: BCEL ₭19,100,000 · Cash ₭4,105,000 · USD Cash $100.00 · Visa −$30.00

The full step-by-step tracker is in `.claude/archive/phase-1-task.md` (local only, not in git).
