# Phase 4: Transactions, the heart of the app (2026-10-10)

## In plain words

You can now **record your money day to day**:
- **＋ in the middle of the bar:** expense or income in seconds. Most-used categories come first and the last account you used is pre-picked. "Saved: Food ₭45,000" appears and the balance updates.
- **Transfers** between your accounts, including **currency exchange** ("How much arrived?"). A transfer shows as one row and is never counted as spending or income.
- **Fix balance:** type what your bank app says, and a "Balance fix" row covers the difference.
- **History:** by day and by month, with filters (account, category, type) and a search of your notes. Each account's page lists its own transactions.
- **Edit or delete** anything; deleting asks first and is a soft delete.
- **Your own categories:** add, rename, hide, or show again (Settings → Manage categories).

## Tasks
| # | What | Commit |
|---|---|---|
| 4.1 | DB: edit/delete a transfer as a pair, fix balance (Opus) | `21c7511` |
| 4.2 | Add/edit/delete expense and income, ＋ button, History list | `5efb4cf` |
| 4.3 | Transfers, exchange, fix balance screens | `36115f3` |
| 4.4 | History filters, search, transactions per account | `94c0c59` |
| 4.5 | Custom categories | (your commit) |

## Decisions
- After Save you go back where you were, with a note. Pages without the note send you to History instead.
- The last-used account is remembered on the device (a cookie); categories are ordered by how often you use them.
- No sort by amount: mixing ₭ and $ in one order would mislead.
- Archived accounts can't be used in new or edited transfers or balance fixes; hidden categories stay on old entries.
- The ＋ reads "where am I" at the moment you tap it.
- **Token savings (you):** short briefs, only the current task in `task.md`, 3–5 robot tests per task, Opus reviews only the security-critical code. Helper cost dropped from about 250–320k to about 145–160k tokens per task.

## Problems we hit (and fixed)
- Your usage limit stopped 4.2 halfway. The progress log let the same helper resume exactly where it stopped.
- Next.js keeps hidden copies of earlier pages, so stale forms came back. Fixed with a fresh `key` per visit.
- Saving from Settings showed no note; the History tab lit up on the Add page; the ＋ sometimes kept a stale return address. All fixed by Opus.

## Security review (phase end)
- Every save, edit and delete checks you're logged in; currencies always come from your accounts in the database, never the browser.
- The database refuses wrong owners and wrong category types (composite keys), and edits can't touch transfers.
- Search text is passed safely (escaped, never pasted into filter text). The one place an ID is pasted into filter text accepts only a validated UUID.
- No float maths on money, no secret keys, and no unsafe HTML in `src/`.

## Numbers
372 unit tests (100% coverage on all domain code), 126 database tests, 60 robot browser tests (all six screen widths on the new pages).
