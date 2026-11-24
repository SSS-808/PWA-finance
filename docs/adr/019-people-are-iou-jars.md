# ADR-019: Money lent and borrowed sits in a hidden IOU jar per person

**Status:** Accepted · 2026-11-24

## In plain words
Each person you lend to or borrow from gets an **IOU jar** for each currency. Lending moves money from your account into their jar; a repayment moves it back out. Above zero means they owe you; below zero means you owe them. A jar is an account the app keeps hidden, and every move is a transfer, so lending is never counted as spending.

```
Lend:      BCEL ──₭100,000──▶ [Nok · kip]    → Nok owes you ₭100,000
Pay back:  [Nok · kip] ──₭40,000──▶ Cash     → Nok owes you ₭60,000
In kip:    [Nok · baht] ──฿500──▶ Cash ₭300,000 → the baht debt is gone; the kip lands in Cash
Forgive:   [Kham · kip] −₭250,000 expense "Loans written off" → Kham owes you ₭0
```

## Context
- The owner lends to and borrows from friends often and wants to see who owes what (roadmap order item 6).
- Transfers already move money between accounts without counting as income or spending ([ADR-006](006-transactions-as-legs.md)), handle two currencies, and can be edited and deleted.
- Debts must never mix currencies ([ADR-008](008-no-currency-mixing.md)), but people sometimes pay back in a different currency.

## Decision
- A `people` table: a name per person, unique while active, archived rather than deleted so History keeps its names.
- A jar is an `accounts` row of type `person` with `person_id` set. One open jar per person per currency, made the first time it's needed. A jar never counts on Home (`show_on_home = false`), has no minimum, and can't turn into a real account. Only a jar can have a "pay back by" date (`due_on`). Jars carry their person's name, kept in step by a trigger, and don't take part in the one-name-per-currency rule for real accounts.
- `move_money_with_person` makes one transfer between a real account and the person's jar. Paid back in another currency, the two legs simply have different amounts: the jar's leg says what it pays off, the account's leg what you got.
- `start_person_balance` records a debt from before the app as an adjustment on the jar; no account changes.
- `forgive_person_balance` closes a jar's whole balance with one expense ("Loans written off") when they owed you, or one income ("Debts forgiven") when you owed them. The category is made the first time it's needed.
- All four functions run with the caller's own access (`security invoker`), so RLS and the composite foreign keys still apply.

## Alternatives considered
- **A separate loans table with its own entry kind:** every money screen, the balances view and Insights would need to learn a new kind. Transfers already do the job.
- **Mixing currencies inside one debt** (a baht debt paid down in kip): needs an exchange rate stored on the debt and breaks ADR-008. The exchange-transfer keeps each jar in one currency.

## Consequences
- Every screen that lists accounts (Accounts, Home cards, entry and transfer pickers, goals, Shortcut keys) must leave out `person` accounts. One place in the accounts module does this, with a test per screen.
- Insights counts a forgiven loan as spending in the month it's forgiven, which is when the money is really lost.
- Phase 8 (net worth) can count jars as money owed to you or by you without new tables.
- The database doesn't stop a goal or a Shortcut key from pointing at a jar; the app's pickers never offer one.
