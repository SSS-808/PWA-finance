# Launch-check fixes (2026-10-10)

## In plain words
The user did the human launch check and found the screens too wordy. Now: success messages are a **toast bubble** at the top that fades after 3 seconds; help text sits behind a small **"?" button** next to the label (or is grey example text inside the box, or gone); the Hidden categories list is folded behind a **"Show hidden"** link; and amount boxes show **commas while you type** (1,000,000).

## Decisions
- Toasts use `sonner`, one `<Toaster>` in the root layout. Only success messages are toasts; errors the person must act on stay on the page.
- The message still travels in the URL (`?saved=<id>`, `?notice=added`). `ToastOnce` shows it and then removes that one param with `window.history.replaceState(window.history.state, ...)`. Passing `null` as the state left the page list stale.
- `HelpHint` is a Radix `Popover` (already installed), 44px tap area, 20px icon.
- Hidden categories open with `?hidden=1`, the same pattern as `?archived=1` on Accounts. "Show again" keeps the list open.
- Commas are display only: `groupAmountInput` (money module, strings only, no floats) plus the shared `AmountInput`. `parseMoney` already stripped commas, so saved values did not change.
- Edit forms group the amount in `startValues`, because `react-hook-form` writes its own start value into the box.

## Gotchas
- E2E tests must expect the clean URL (the param is gone right after the toast). Where the clean URL equals the URL before the click, wait on the toast or the new row instead.
- Toast selector in tests: `[data-sonner-toast]`.
- Backspace right after a comma only removes the comma, which comes straight back; a second Backspace deletes the digit.
- For Phase 12 (CSP): `sonner` injects a `<style>` tag at runtime, so the policy must allow it.

## Checks
403 unit tests (100% on all rule code), 72 robot browser tests. Toast and help bubble measured inside the screen at 320, 390, 768, 1024, 1280 and 1440px, no sideways scrolling.

## Commits
`f93cafa` toasts · `64f6654` "?" buttons and "Show hidden" · commas while typing (the commit after it).

## Next
Phase 5.5: the first deploy ([docs/deploy.md](../../docs/deploy.md)). Then daily use for 1–2 weeks, then the design phase (5.6) with the user's reference app "Pocket Clear".
