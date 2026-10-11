# ADR-011: A savings goal is an earmark, not a transfer

**Status:** Accepted · 2026-10-12

## In plain words
Think of labelled jars on a shelf: "New laptop", "Japan trip". Adding money to a goal is writing a note on a jar, "₭1,000,000 of my savings is for this". The money itself stays in whatever account it's in. The app doesn't move anything, so your account balances never change because of a goal.

## Context
Phase 7 adds savings goals with a target, an optional deadline and a progress bar. The question from the requirements was whether progress should be typed in or tied to an account. The owner chose (2026-10-12): you tap "Add money" on a goal and type an amount; it doesn't move money between accounts; you can take money back out; and a goal can be archived.

## Decision
- Two tables: `goals` (name, currency, target, optional deadline) and `goal_contributions` (amount and date for one goal).
- A positive contribution adds to a goal and a negative one takes money back out. The saved total is the sum, and the database refuses a row that would bring it below 0.
- Contributions are never changed or deleted. A mistake is corrected with a row in the other direction, so the history always adds up.
- A goal is in one currency. Contributions must use the same currency (enforced by a foreign key), so currencies are never mixed ([ADR-008](008-no-currency-mixing.md)).
- A goal is archived instead of deleted, like accounts and categories ([ADR-007](007-soft-delete-and-audit.md)).
- Access: Row Level Security (own rows only) plus explicit grants. Nobody can delete, and logged-out visitors have no access.

## Alternatives
- **Tie a goal to an account's balance:** progress would be automatic, but it works for only one account per goal, and spending from that account would silently shrink the goal.
- **Make each contribution a real transfer into a savings account:** accurate bookkeeping, but it forces an account per goal and makes "set aside ₭1,000,000" a four-field form.
- **Keep one "saved so far" number on the goal:** simplest, but there would be no history of when money went in or out.

## Consequences
- ✅ Adding money is one number and one tap, and account balances stay untouched.
- ✅ The history of a goal is complete and can't be edited away.
- ⚠️ The app can't know whether the money really exists. A goal can say ₭7,000,000 while the accounts hold less. It's a plan, not a balance.
- ↩️ Worth revisiting if goals should link to a savings account (the requirements mention it as optional).
