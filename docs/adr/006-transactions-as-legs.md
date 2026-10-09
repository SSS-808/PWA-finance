# ADR-006: Each transaction row changes one account; a transfer is two linked rows

**Status:** Accepted · 2026-10-09

## In plain words
Moving money between **your own** accounts (BCEL → Cash) isn't income or spending. It's written as **two lines glued together**: minus 500,000 from BCEL, plus 500,000 into Cash. Both lines are saved together or not at all, so money can't vanish halfway. Reports skip these lines, so a transfer never looks like you earned or spent money. Changing dollars into kip works the same way, with a different amount on each line.

## Context
A transfer must move money between accounts without being counted as income or expense. It must also be saved all-or-nothing, and it must handle currency exchange (two different amounts).

## Decision
- Each `transactions` row is one change to one account (a "leg"), with a **signed** `amount_minor` and a `kind`: income, expense, transfer, opening_balance or adjustment.
- A transfer is **two rows sharing a `transfer_id`**: −X from one account, +Y into the other. X = Y when both accounts use the same currency; for an exchange, each side keeps its own amount.
- Transfers are created, edited and deleted only through database functions (`create_transfer` and so on), so each operation is one database transaction.
- A deferred constraint trigger refuses any transfer that isn't exactly one "out" and one "in" on two different accounts.
- Reports count only `income` and `expense` rows.
- Details and examples: [database.md §3](../database.md#3-the-transaction-model).

## Alternatives
- **One row with `from_account` and `to_account`:** an exchange needs two amounts, and every balance query has to check two columns.
- **Full double-entry bookkeeping** (categories become accounts, and every entry balances to zero): the most rigorous option, but heavy for a personal app. Our model is a simpler version of it and could be moved to it later.

## Consequences
- ✅ Balance is a plain `SUM`, currency exchange works naturally, and transfers can't leak into income or expense.
- ⚠️ Transfers must not be edited row by row. The functions handle them, and the trigger catches mistakes.
