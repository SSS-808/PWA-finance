# ADR-013: The phone keeps copies of the pages you view, and forgets them at log-out

**Status:** Accepted · 2026-11-02

## In plain words
A small helper script lives in the phone's browser, between the app and the internet. It works like a photocopier: each time a page that only shows data loads online, it keeps a copy. When the server can't be reached (no internet, or the VPN is off in Laos), it shows the last copy with a banner, "Offline. Saved copy from Nov 2, 2:05 PM", and swaps in fresh numbers once the server answers again. Forms are never kept, so nothing can be added or changed offline yet. The copies are deleted whenever a login screen shows, so logging out leaves nothing behind.

```
phone ──► helper (public/sw.js) ──► internet ──► server
            │ answer within 4 s → show it, keep a copy
            └ no answer → last copy + banner, or the "You're offline" page
```

## Context
- The owner uses an iPhone and wants the app on the home screen, usable without a connection (roadmap "Order from here", 2026-11-02).
- In Laos, `vercel.app` addresses open only with a VPN. With the VPN off, a request doesn't fail; it hangs until the phone gives up, which can take a long time.
- All data is read on the server (Server Components). The browser holds no data of its own that could be shown offline.
- Next.js 16.4 has an experimental `useOffline` switch. It keeps a failed request waiting until the connection returns, and it counts a request still pending after 200 ms as "online". With the VPN off it would wait forever.

## Decision
- **A hand-written service worker** (`public/sw.js`), under 200 lines, no library. It only runs in a built app, not under `pnpm dev`.
- **Page loads: internet first.** If the server fails or hasn't answered within **4 seconds**, show the saved copy. After one miss it waits only 1 second for the next 30 seconds. A page with no copy waits for the server as long as it takes, then shows `/offline`.
- **Only view pages are kept:** Home, Accounts and each account, History, Budgets, Goals and each goal. At most 50 copies; the oldest go first. Forms, Settings, the CSV download and login pages are never kept.
- **The pages' code files** (`/_next/static/…`) are kept as well. Their names change whenever their content changes, so a kept file is never out of date.
- **In-app links** that get no answer within the wait are failed on purpose. Next.js then loads the page normally, and the helper serves the copy. Background prefetches are left alone.
- **The banner trusts the helper:** the page asks the helper whether it got a saved copy, instead of guessing from the connection.
- **Forgetting:** the login, sign-up and forgot-password screens delete every `pages-` cache. Log-out and an expired session both end on the login screen.
- `experimental.useOffline` stays off.

## Alternatives
- **Next.js `useOffline` alone:** keeps the app from crashing, but shows no data offline and waits forever when the VPN is off.
- **Serwist (a service-worker library):** it does more than we need. We'd also add a build step and a dependency the owner would have to learn.
- **Store the data in the phone's database (IndexedDB) and draw pages in the browser:** every page would need rewriting. That only pays off when adding entries offline arrives.

## Consequences
- ✅ The installed app opens with the last balances, even with no internet or with the VPN off. Fresh numbers replace them by themselves.
- ⚠️ **Personal data is stored on the phone** until the next log-out or login screen. If the session expires while offline, the copies stay until the app is next online and shows the login screen. The phone's own lock is what protects them.
- ⚠️ A page loaded at the very moment of log-out could be saved after the wipe. The next log-out deletes it.
- ⚠️ Changing the web address (a new domain) means installing the app again. Each address has its own helper and copies.
- ↩️ Adding entries offline is a later step. It needs a queue on the phone and its own decision.
- ↩️ Raise `VERSION` in `sw.js` whenever the helper's rules change, so phones drop the old caches.
