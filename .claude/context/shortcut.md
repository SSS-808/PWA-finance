# iPhone Shortcut: add an expense from a payment screenshot

Status: planned 2026-11-17, owner answered "defaults". Next: mockup of the Settings screen, then build.

## In plain words
Double-tap the back of the iPhone. A Shortcut screenshots the bank's payment screen, reads the amount with Live Text, lets you fix it, asks for a category and sends it to the app. The app answers with a notification: "Saved: Food −₭25,000 (BCEL)".

```
Back Tap → screenshot → Live Text → confirm amount → pick category
  → POST https://<domain>/api/shortcut  (Authorization: Bearer pw_…)
  → "Saved: Food −₭25,000 (BCEL)"
```

## How it works
- **Key:** made in Settings, shown once, 32 random bytes with a `pw_` prefix. The database keeps only its SHA-256 hash. It can only add expenses; deleting it stops it at once.
- **Door:** `POST /api/shortcut` (route handler). Reads the key, asks the database for the key's account currency, parses the amount with the `money` module, then asks the database to save. Never logs the key or the amount.
- **Lock:** security-definer database functions callable by `anon` that only work with a valid key hash and only insert for that key's owner. The composite foreign keys still check account and category ownership. The Supabase secret key stays unused.
- **Proxy:** `/api/shortcut` joins `PUBLIC_PATHS` in `src/lib/supabase/proxy.ts`, or logged-out requests would be sent to `/login`.

## Owner's answers (all defaults, 2026-11-17)
1. Expenses only.
2. One key = one account, picked when the key is made.
3. Category from a menu in the Shortcut; an unknown name saves as "Other".
4. Date: today in the owner's time zone.
5. The Shortcut always shows the amount it read so it can be fixed before sending.
6. The same amount, category and note sent twice within 1 minute is refused ("Already saved").
7. Limit: 30 entries per hour per key.
8. Up to 3 keys, each with a name and "last used", plus delete.
9. Lives at More → Settings → iPhone Shortcut.
10. The Shortcut never moves money out of goals; the goal page shows its usual warning.

## Build steps
1. Mockup of the Settings screen (key list, make a key, the shown-once key).
2. PR 1: migration (`shortcut_keys` with RLS, the save functions, pgTAP), `src/app/api/shortcut/route.ts`, proxy open path, ADR-018.
3. PR 2: Settings screen (Sonnet brief), browser test: make a key, send an entry, see it in History.
4. Shortcut guide with the exact URL for the owner's domain.
5. Release: migration to prod first, then dev → main.

## Limits
- Live Text doesn't read Lao script; bank amounts are Latin digits, so they should read. Test with a real screenshot.
- Back Tap needs iPhone 8 or newer.
- Needs the own domain (bought 2026-11-17) or the VPN.
