# ADR-017: No offline: the app always talks to the server

**Status:** Accepted · 2026-11-14 · supersedes [ADR-013](013-saved-copies-on-the-phone.md)

## In plain words
The app no longer keeps copies of pages on the phone, and nothing can be added without internet. Every page comes straight from the server, the same way a normal website works. Installing the app on the Home Screen (its icon, full screen) stays, because it doesn't need any offline code.

Phones that already have the old offline helper get a small clean-up helper instead. It deletes the saved copies the first time the app opens online, then removes itself.

```
before: phone ──► offline helper (saved copies) ──► server
after:  phone ─────────────────────────────────────► server
        (old phones: clean-up helper deletes the copies once, then is gone)
```

## Context
- Phase 11 (ADR-013) added offline viewing: a service worker kept copies of view pages and showed them when the server didn't answer within 4 seconds.
- On 2026-11-13 adding entries offline was planned (an "outbox" on the phone). Step 1 was merged into `dev` (#62). Step 2 (#63) kept failing its browser tests, because service-worker timing made offline behaviour hard to test reliably.
- On 2026-11-14 the owner decided to drop offline completely.

## Decision
- Remove offline viewing: the saved copies, the "Offline. Saved copy" strip (`OfflineBanner`), the `/offline` page, `ForgetSavedPages` on the login screens, and `tests/e2e/offline.spec.ts`.
- Remove offline adding: step 1 (#62) is undone and step 2 (#63) is closed unmerged.
- `public/sw.js` becomes a clean-up helper. A browser checks an installed helper for updates on page loads, so phones with the old one receive this version, which deletes every cache and unregisters itself. The app no longer registers a helper, so new phones never get one.
- Keep the web app manifest and icons (install on the Home Screen).

## Consequences
- With no internet, or the VPN off in Laos, pages don't open; the browser shows its own error.
- Less code that runs on the phone, and fewer moving parts in tests.
- Personal data is no longer stored in the phone's Cache Storage.
- `public/sw.js` can be deleted once every phone has opened the app online at least once since the release (a few months is safe).
