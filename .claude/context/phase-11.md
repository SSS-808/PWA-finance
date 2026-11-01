# Phase 11: PWA and offline (2026-11-02)

## In plain words
The app can sit on the iPhone's home screen with its own icon (a cloud-shaped wallet with a banknote) and opens full-screen like a normal app. Pages that show data (Home, Accounts, History, Budgets, Goals) are saved on the phone each time they load, and the five main ones are also saved in the background, so one online visit is enough. With no internet, or with the VPN off, the app shows the last saved copy within about 4 seconds, with a banner saying when it was saved. Fresh numbers come back by themselves once the server answers. Logging out deletes the copies. Adding entries offline is a later step.

## Decisions
- Owner's answers: icon "b3" (cloud wallet, stitched, strap, mint banknote); iPhone first; view pages only; 4-second wait; the hex colour copies live in `src/app/theme-colors.ts`; the install help sits only in Settings.
- Hand-written service worker, no Serwist, and Next.js `experimental.useOffline` stays off. It would wait forever with the VPN off. See [ADR-013](../../docs/adr/013-saved-copies-on-the-phone.md).
- The banner shows only when the helper says the page is a saved copy, not on a connection guess.
- Copies are deleted on every login, sign-up and forgot-password screen, not only by the log-out button.

## What was built
- **11.1** (PR #39): `src/app/manifest.ts`; icons (`src/app/icon.svg` is the source; `public/icons/icon-192.png` and `icon-512.png`, also used as `maskable`; `src/app/apple-icon.png` at 180 px); iPhone meta (`appleWebApp`); top-bar colours for light and dark; `viewport-fit=cover` with safe-area padding; the manifest skips the proxy; Settings → App ("Add to Home Screen" steps behind "?", or an Install button where the browser offers one; hidden inside the installed app); `tests/e2e/install.spec.ts`.
- **11.2** (PR #40): `public/sw.js`; `OfflineBanner` and `ForgetSavedPages` in `src/components/shared/offline.tsx`; `src/app/(auth)/layout.tsx`; the `/offline` page (public, no data); `sw.js` skips the proxy; Playwright blocks the helper except in `tests/e2e/offline.spec.ts`; the accessibility check covers `/offline`.
- **11.3** (PR #41): ADR-013; security.md §10; architecture.md, development.md and deploy.md §7; roadmap; this summary.
- **11.4**, added after the owner asked "so I can't view a page offline if I haven't visited it?": every page load sends the helper a `page-loaded` message. If the page came from the server, the helper saves Home, Accounts, History, Budgets and Goals in the background, one at a time, skipping copies younger than 30 minutes and stopping at the first failure. Redirected answers (the login screen) are never kept.

## Gotchas
- **iPhone keeps the home-screen app's login separate from Safari's**, so log in once inside the installed app.
- **The helper only runs in a built app.** `offline.spec.ts` is skipped under `pnpm dev`. Locally run it with `CI=1 pnpm test:e2e tests/e2e/offline.spec.ts`, after stopping `pnpm dev`.
- **To test a server that hangs** (like the VPN being off), Playwright needs `PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS=1`, so that `context.route` also catches the helper's requests. A route handler that never answers makes the request hang. The copy appeared after 4.1 s.
- **Icons are made from `src/app/icon.svg`** with `sharp`, which comes with Next.js and sits under `node_modules/.pnpm/sharp@*`. Render at 192 and 512 px into `public/icons/` and at 180 px into `src/app/apple-icon.png`. Fill the background with `#0a6b50`, because an iPhone turns see-through areas black.
- **Raise `VERSION` in `sw.js`** whenever its rules change, so phones drop the old caches.
- A new domain means installing the app again (deploy.md §7).
- On Vercel previews, Next.js adds `crossorigin="use-credentials"` to the manifest link by itself, so the preview's login protection doesn't block it.

## Checks (phase end)
- 623 unit tests pass.
- On GitHub, all checks passed on both PRs, including the full browser suite on #40. The offline test runs there against a built app.
- No database changes in this phase.
- Security review:
  - Only same-origin `GET` page loads that return `200` HTML are kept.
  - Redirects, error pages, forms, Settings and the CSV download are never kept.
  - The copies can't be read by other sites, and every login screen deletes them.
  - Known limit: a page still saving at the moment of log-out could land after the wipe; the next log-out removes it.
  - Phase 12's security headers must allow `worker-src 'self'` and `manifest-src 'self'`.

## Release (done 2026-11-02, PR #42)
1. No migrations: nothing went to the production database.
2. The owner chose to skip the practice-site test and to try it on the live site instead.
3. `dev` was merged into `main` with merge commit `d765e70`. App and Database checks on #42 were green; Browser tests were still running, but the identical code had passed them on #43. `dev` was then brought level with `main`.
4. Still for the owner, on the live site in Safari:
   - with the VPN on, choose Share → Add to Home Screen, open the app, log in, and wait a few seconds;
   - turn the VPN off and open the app: Home appears within about 4 s with the banner, and Budgets and the other main pages work too;
   - tap ＋: the "You're offline" page appears;
   - turn the VPN back on: the banner goes away and the numbers refresh.

## Next
Phase 10, Analytics, after 2–3 months of data (see the roadmap's "Order from here"). The own domain is still on hold.
