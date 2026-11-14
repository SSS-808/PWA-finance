# Adding entries offline (planned 2026-11-13)

Status: **built on dev (steps 1–2), not released.** The owner answered "defaults" on 2026-11-13; mockups approved the same day. Roadmap order item 4.

## In plain words
With no internet, Add saves the entry into a small **outbox** on the phone, like writing a receipt on a notepad when the bank is closed. When the app is open and online again, the outbox sends each entry to the server, which checks it exactly like a normal Add.

```
No internet:  ＋ Add → Save → "Saved on your phone. It'll be sent when you're back online."
                               └► outbox (on the phone)      Home: "2 waiting to send"
Back online:  open the app → outbox → server checks it → saved once → "2 entries sent"
```

## Decisions (owner, "defaults")
1. Only **money in and money out** work offline. Transfers and balance fixes still need the internet.
2. **Sending:** automatic when the app is open and online (on app open, the `online` event, and when the page becomes visible), plus a **Send now** button.
3. **Waiting entries** can be deleted, not edited. To change one, delete it and add it again.
4. **Balances while offline** stay as saved, with a note like "2 waiting entries aren't counted yet". The phone never redoes the sums.
5. **The overspend warning offline** still shows, using the saved copy's numbers. A "use goal money" choice is stored with the entry and applied when it's sent (`releaseGoalMoney` reads it from the form fields).
6. **Log out with entries waiting:** a warning first; "Log out anyway" deletes them.
7. **Wait before saving to the outbox:** 4 seconds without an answer, the same as pages (`WAIT_MS` in `sw.js`). This covers the VPN-off hang.
8. **No database change.** The phone makes the entry's ID (`crypto.randomUUID()`) and the server inserts it as `transactions.id`. Grants already allow inserting `id`. A repeat (Postgres `23505` on the key) counts as "already saved", but only if a read of that ID under RLS finds the user's own row; otherwise it's an error.

## What the code does today (found while planning)
- `public/sw.js` keeps only view pages (`VIEW_PAGES`), so **`/transactions/new` isn't kept offline**. It must be added to `VIEW_PAGES` and `MAIN_PAGES`, and `VERSION` bumped to `v5`.
- The Add page gets `today` from the server (`todayIn(profile.timeZone)` in `src/app/(app)/transactions/new/page.tsx`). A saved copy would show the copy's day, so the form must use the phone's today in the profile's time zone when it opens from a copy.
- `createEntry` (`src/modules/transactions/server/actions.ts`) inserts and then redirects. The outbox needs a variant that takes the phone-made ID and returns a result instead of redirecting. It reuses `entrySchema`, `buildRow`, `rememberAccount` and `releaseGoalMoney`.
- The login, sign-up and forgot-password screens delete every `pages-` cache (ADR-013). **The outbox must survive an expired login:** tag each waiting entry with the user ID; after login, send if it's the same person, else delete. Only an explicit log-out (after the warning) deletes it.
- iPhone web apps have no Background Sync, so sending happens only while the app is open.

## Build plan
1. **Mockups** (light and dark): the "Saved on your phone" toast on Add, the Home line "2 waiting to send", the Waiting page (each entry with Send now and Delete, plus a "couldn't save: reason" state), and the log-out warning.
2. **Step 1:**
   - Server: an idempotent create that takes the phone-made ID.
   - The outbox: an IndexedDB store and its queue logic as pure, fully tested functions.
3. **Step 2:**
   - Add falls back to the outbox, and the sending loop with a toast "2 entries sent".
   - The Home line, the Waiting page and the log-out warning.
   - Add kept offline (`sw.js` v5).
   - ADR-017 ("the phone keeps an outbox").
   - Browser tests with the network off: they run against a built app, like `offline.spec.ts`, and use `context.setOffline`.
4. **Release** on the owner's word. With no migration, a release is just a merge.

## Limits to tell the owner again
- Waiting entries are sent only while the app is open.
- Add must have been loaded once online. The background save does that, like Home.
- iOS can clear a website's stored data (very low space, long unused), and waiting entries would then be lost.
- Claude can't test on the iPhone. The owner tries the practice site with the VPN off.

## Later (not in this step)
The iPhone Shortcut (roadmap order item 5) reuses the same "already saved" rule for its receipt reference.
