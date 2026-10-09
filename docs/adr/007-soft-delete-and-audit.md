# ADR-007: Soft delete and an audit log for transactions

**Status:** Accepted · 2026-10-09

## In plain words
**Deleting doesn't really erase. It puts a "deleted" sticker on the row**, like moving a file to the recycle bin, so mistakes can be undone. And **every change is written in a diary** (the audit log): what it was before, what it became, and when. If a balance ever looks wrong, the diary shows why. It's one small table and one automatic rule, so it costs almost nothing, and a diary can't be filled in later for changes that already happened.

## Context
Deleting or editing financial history destroys information. You may want to undo a mistake, or see why a balance changed. An audit log can't be filled in after the fact: history from before it existed is gone.

## Decision
- **Transactions:** `deleted_at` (soft delete). Normal queries filter `deleted_at is null`, and partial indexes keep that fast.
- **Accounts and categories:** `archived_at`. They're hidden from pickers but keep their history.
- **No delete policies in RLS,** so the app can't hard-delete financial rows even if it has a bug.
- **Audit log:** a trigger writes the old and new row (as JSON) to `transaction_audit` on every insert and update, including soft deletes. Users can read their own history; nobody can change it.
- **Deleting your data for real** means deleting the user, which cascades to everything.

## Alternatives
- **Hard delete:** simplest, but mistakes can't be undone and the history has gaps.
- **Event sourcing** (store events, rebuild state from them): powerful, but far too much for this app.

## Consequences
- ✅ Undo is possible and every change can be traced, cheaply (one table, one trigger).
- ⚠️ Every query must remember `deleted_at is null`; a shared query helper handles that.
- ⚠️ The audit table grows, though at personal scale that's tiny.
