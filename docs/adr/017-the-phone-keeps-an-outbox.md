# ADR-017: The phone keeps an outbox

**Status:** Accepted · 2026-11-14

## In plain words
When the bank is closed you write a receipt on a notepad and hand it in later. The outbox is that notepad: with no internet, Add saves the entry on the phone, and the app sends it once it is open and online again. The server checks it exactly like a normal Add, and a receipt handed in twice still counts once.

## Context
- In Laos the app is used over a VPN that is often off, and the server then never answers instead of refusing ([ADR-013](013-saved-copies-on-the-phone.md)).
- The owner uses an iPhone web app. iOS has no Background Sync, so nothing can be sent while the app is closed.
- Entering money in and out is the thing people do most while away from a connection (owner's defaults, 2026-11-13).

## Decision
- **An outbox in IndexedDB** (`wallet-outbox`) holds entries that could not be sent yet. Each keeps exactly what the Add form posts, who was logged in, and when it was saved.
- **The phone makes the ID.** `crypto.randomUUID()` becomes `transactions.id`, so sending the same entry twice cannot make two rows.
- **A repeat counts as "already saved" only if that ID is one of the user's own rows** (a Postgres `23505` plus a read under RLS). Any other duplicate is an error, never a silent success.
- **Add always saves through one server action** (`sendOutboxEntry`), raced against 4 seconds (the same wait as `WAIT_MS` in `public/sw.js`). With no answer in time, or no network at all, the entry goes into the outbox under the same ID, so a late success cannot make a double.
- **Only income and expense work offline.** Transfers and balance fixes need the server, so Transfer is greyed on Add while the phone says it is offline.
- **Sending happens only while the app is open:** on open, when the phone comes back online, when the page becomes visible, on "Send now", and every 30 seconds while something waits. The server's answer decides what happens to each entry: saved, already saved or another user's (leaves the outbox), refused (stays, with a short reason, and is never retried), no answer or signed out (stays for the next try).
- **Waiting entries can be deleted, not edited.** A refused entry is also deleted and added again.
- **Log-out deletes the outbox after a warning.** An expired login keeps it: after logging in again, the same person's entries are sent and another person's are deleted.
- **No database change.** Grants already allow inserting `id`.

## Alternatives
- **Background Sync:** sends while the app is closed, but iOS does not support it.
- **A server-made ID with a separate "client reference" column:** needs a migration and a second unique rule to keep right.
- **Letting the phone redo the balance sums:** a second copy of the money rules on the phone that could disagree with the server. Balances stay as the server last said.
- **Editing waiting entries:** more screens for a rare case; delete and add again is enough.

## Consequences
- ✅ Adding money in and out works with the VPN off, and an entry is saved once however many times it is sent.
- ✅ No migration, so a release is just a merge.
- ⚠️ Waiting entries are only on that phone. They are sent only while the app is open.
- ⚠️ Add must have been loaded once online; the background saving of pages does that, like Home.
- ⚠️ iOS can clear a website's stored data (very low space, long unused), and waiting entries would then be lost.
- ⚠️ With the VPN off the phone still says it is online, so Transfer stays tappable and fails like before.
- ⚠️ Waiting entries are not in any total yet; Home says so.
- ⚠️ Claude can't test on the iPhone; the owner tries the practice site with the VPN off.
