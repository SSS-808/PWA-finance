# Phase 3: Accounts (2026-10-10)

## In plain words

You can now tell the app **where your money lives**.

- **Add an account:** name, type (cash, bank, savings, credit card, loan…), currency, and how much is in it now. For a credit card the question changes to "How much do you owe on it now?".
- **The Accounts screen** groups accounts by currency, each with a **total**. Kip and dollars are never added together. Debts show as "$30.00 owed".
- **Open an account** to see its balance, then **Edit** it (name, type, starting amount) or **Archive** it. Archiving asks "Yes, archive?" first. Archived accounts are hidden but kept, and you can bring them back.
- **First visit with no accounts:** Home and Accounts show a big "Add your first account" button.
- **Accounts is in the bottom bar.**

With the demo data, the screen shows ₭23,205,000 and $70.00. That's exactly what we calculated by hand at the start of the project.

## How it was built (two tasks)
1. **Database** (Opus): `create_account` and `update_account`, each all-or-nothing, plus 17 safety tests.
2. **Screens** (the helper): the `accounts` module, 4 pages, the nav tab, empty states, unit and robot tests. Then Opus fixed a build error and a bug, and did the security review.

## Decisions

| Decision | Why |
|---|---|
| Starting amount uses today's date (no date box) | One less thing to fill in |
| Debts: type what you owe; stored as negative | It's how people think about debt |
| Starting amount editable later | Typos happen |
| Totals count active accounts only | Archived accounts are "closed" |
| Edit takes the currency from the database, not the browser | The browser can't be trusted |
| The nav shows at once; the current tab lights up a moment later | Next.js only knows the address of pages like `/accounts/123` when they're visited |
| New process: quick checks per task, full robot tests and a security review at the phase end | Saves tokens and time (you) |
| ADR-009: the Supabase client, not Prisma | Every query runs as you, so the database's guard always applies |

## Problems we hit (and fixed)
- **Build error:** the nav used the current address outside a "loading boundary". Fixed by showing the bar straight away with no tab highlighted, then highlighting the tab once the address is known.
- **"Bring back" with a name that's already taken** showed an error page. Now it says: rename one of them first. A robot test covers it.
- **Labels pointed at hidden copies of earlier pages** (Next.js keeps them in the background), so the helper made each form's IDs unique.

## Security review (phase end)
- Every query runs as you (RLS) and starts with a login check. Account IDs are checked as real IDs, and someone else's account is "not found".
- Archive and bring-back now also check the ID.
- No float maths on money, no secret keys, and no unsafe HTML anywhere in `src/` (searched).

## Numbers
- Tests: 223 unit (100% coverage on money, profile, accounts and calculations), 98 database, 28 robot browser tests (including all six screen widths).
- The full tracker is in `.claude/archive/phase-3-task.md` (local only).
