# Lent and borrowed: money between you and people

Status: planned 2026-11-24, owner answered "defaults" plus the currency question below. Next: mockups, then build.

## In plain words
Each person gets an **IOU jar** per currency. Lending moves money from one of your accounts into their jar; a repayment moves it back out. A jar above zero means they owe you; below zero means you owe them.

```
Lend:      BCEL ──₭100,000──▶ [Nok · kip]   → Nok owes you ₭100,000
Pay back:  [Nok · kip] ──₭40,000──▶ Cash    → Nok owes you ₭60,000
Borrow:    [Ana · baht] ──฿500──▶ Cash      → You owe Ana ฿500
```

Underneath, a jar is a hidden account (type `person`) and every move is a **transfer**, so it never counts as income or spending, and editing, deleting and History already work.

## Paid back in another currency (owner's question)
Lent ฿500, Nok pays back ₭300,000. The repayment is a currency-exchange transfer, which the app already supports:

```
[Nok · baht] ──฿500──▶ Cash ₭300,000      → Nok owes you ฿0
```

- The "Pay back" form asks two amounts: **what it pays off** (฿500, in the jar's currency) and **what you got** (₭300,000, in the account's currency). The app shows the rate it works out (1 ฿ = 600 ₭) as a check.
- A partial one works the same way: ₭150,000 that pays off ฿250 leaves ฿250 owed.
- The debt stays in baht. Kip never gets mixed into the baht jar.
- Borrowing works the same in reverse (borrowed $20, paid back in kip).

## Owner's answers (defaults, 2026-11-24)
1. Design: IOU jars that use transfers.
2. A loan comes from a real account; an old debt from before the app can start with a typed amount and no account.
3. Partial repayments: any amount, as many times as needed.
4. Optional "pay back by" date per jar; late ones show red. No phone notifications.
5. One jar per person per currency; currencies never mix (see above for repayments in another currency).
6. More → "Lent & borrowed": a list of people with totals, and a page per person with their history.
7. Home: one line per currency, "People owe you ₭X · You owe ₭Y".
8. "Forgive": the rest becomes an expense ("Loans written off") when they owe you, or income when you owed them.
9. No interest (requirement D9).
10. Built now, before Phase 8.

## How it works
- **New table `people`** (id, user_id, name, archived_at) with RLS and pgTAP. A name is unique per user while active.
- **Accounts:** type `person` added; `person_id` set only on `person` accounts; one active jar per person per currency; `due_on date` only on jars; jars never count on Home's account cards or have a minimum.
- **Hidden jars:** every existing account list (Accounts, Home cards, entry and transfer pickers, goals, Shortcut keys) leaves out `person` accounts, in one central place in the accounts module.
- **Forgive** is one expense (or income) row on the jar for its whole balance, so Insights counts a written-off loan as spending.
- **History:** a transfer with a jar on one side reads "Lent to Nok", "Borrowed from Ana" or "Paid back by Nok".
- Phase 8 later counts jars as owed to you or owed by you without extra work.

## Build steps
1. Mockups (people list, person page, Lend / Borrow / Pay back with another currency, Forgive, Home line).
2. PR 1: migration (`people`, accounts `person` type, `person_id`, `due_on`), pgTAP, `pnpm db:types`, ADR-019.
3. PR 2: hide jars from every existing account list, with tests.
4. PR 3: the Lent & borrowed pages and forms (Sonnet brief).
5. PR 4: Home line, History labels, browser tests.
6. Release: migration to prod first, then dev → main.

## Risks
- A jar showing up where it shouldn't (Accounts list, Home total, a picker). PR 2 makes it one filter with a test per screen.
- Renaming a person renames all their jars at once (one `people` row), so names can't drift.
