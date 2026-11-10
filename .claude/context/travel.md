# Travel features (started 2026-11-06)

Order agreed with the owner: 1 more currencies, 2 Show on Home, 3 kip decimals, 4 trips.

| Step | PR | State |
|---|---|---|
| 13 travel currencies, own symbols S$ HK$ B$ CN¥ | #48 | Live 2026-11-10 (release #51) |
| Show on Home switch per account (replaced `HOME_CURRENCIES`) | #49 | Live 2026-11-10 (release #51) |
| Kip gets 2 decimals ([ADR-014](../../docs/adr/014-kip-has-decimals.md)) | #50 | Live 2026-11-10 (release #52). Backup taken just before: `C:\Users\asuss\Documents\wallet-backups\prod-before-kip-decimals-2026-11-10.sql` (holds login tokens too, keep it private) |
| Trips ([ADR-015](../../docs/adr/015-trips-are-labels.md)): database, pages and History filter, Trip field on Add and Edit, download column | #54–#56 | Live 2026-11-11 (release #58) |
| More tab and a calmer Home with a trip line (Home A) | #57 | Live 2026-11-11 (release #58) |

Approved mockups (Home A, trip screens): https://claude.ai/artifact/16KrPF6ojM1TaP1HyDTEoR

## Decisions
- Every currency has 2 decimals, because the owner's bank shows them.
- Kip gets real decimals, not a drawn `.00`. Always shown with `.00`.
- Home counts only switched-on accounts: cards, balances, month numbers, spending cards and Recent. Budgets and Goals summaries still count everything.
- A transfer stays in Recent if at least one side is switched on.
- The audit log is not rewritten for kip; the update adds one line per entry.
- Kip is released on its own, after the currencies and the switch, so a problem has one possible cause.
- Trips are labels on entries, not wallets. Only income and expenses carry a trip, two trips can't share a day, and deleting a trip keeps its entries.
- Trip totals stay per currency. Money in during a trip is its own line, not subtracted from Spent. No trip budget.
- The Trip field on Add appears only once a trip exists and fills itself in from the date. One tap labels a trip's untagged entries (`label_trip_entries`).
- Home A: the ＋ stays in the bottom bar, Money In / Money Out leave Home. The Settings tab became More (Budgets, Goals, Trips, Categories, then Settings). Home shows a trip line only during a trip.
- Hints use the "?" help button (`HelpHint`), never a text box.

## Kip release checklist (only on the owner's "release", and their OK for the data change)
1. `#48` and `#49` are already live.
2. Merge the kip PR into `dev` only after pushing its migration to staging. Owner tries the practice site.
3. Back up production to `C:\Users\asuss\Documents\wallet-backups` (outside the project): `pnpm supabase db dump --linked --data-only -f <file>`. Docker must be running. Check the file is not empty.
4. Owner stays out of the app for about 5 minutes.
5. Before: read kip totals per table and each account's balance.
6. Dry run must list exactly `20261109140000_kip_two_decimals.sql`. Push. The migration stops itself if a total is off.
7. After: each total and balance must be exactly 100 times the "before". `currencies.minor_unit` for LAK must be 2.
8. Merge `dev` → `main` with a merge commit. Vercel builds for a couple of minutes; until then kip looks 100 times too big.
9. Check the real site, then unlink.

Undo: divide the five columns by 100, set LAK back to 0, and put the old app back. Works only until kip with real decimals is saved; after that restore the backup.

## Lessons
- `pnpm db:types` overwrites `database.types.ts` with an error message when Docker is down. Check Docker first.
- Port 3000 can be held by another project, and Playwright then silently reuses that server (`reuseExistingServer`), so every test fails strangely. Check with `netstat`. Never stop someone else's server. A one-off config outside the repo can run the app on another port and send the browser there with `--host-resolver-rules=MAP localhost:3000 127.0.0.1:3100`, which keeps the login redirects working.
- A data migration can't be tested by pgTAP, because the database is empty when migrations run. Rehearse instead: `supabase db reset --local --no-seed --version <previous>`, load old-style data, snapshot every amount, `supabase migration up --local`, compare row by row. Also rehearse the failure path.
- After a scale change, stress tests with huge amounts can go over the new limit and fail in a confusing way (the form just doesn't save).
- Stacked task branches: start the next task from the open PR's branch; after its squash merge, `git rebase --onto origin/dev <old tip>` drops the already-merged commits.
- Screenshots can catch the loading skeleton; wait for the page's h1 before taking one.
- A Sonnet subagent can leave a background task running; stop it after its report.
- `dashboard.spec.ts` "switched off stays out of Home" passed only on retry once on GitHub; watch for it.
