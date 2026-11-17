# ADR-018: The iPhone Shortcut adds expenses with a key that can do nothing else

**Status:** Accepted · 2026-11-17

## In plain words
The iPhone Shortcut can't log in like a person, so it carries a key instead. The key is like a mailbox slot: it can drop one expense into one account, and nothing more. It can't read balances, change or delete anything. The database keeps only a fingerprint of the key (a hash), so even someone who saw the database couldn't use it. Delete the key in Settings and the slot is closed.

```
Shortcut ──POST /api/shortcut──► Vercel (route) ──► Supabase as anon
  key + amount text               reads key → currency       shortcut_key_currency(key)
                                  amount → whole units       shortcut_add_expense(key, …)
                                  (money module)             checks the key, saves for its owner
```

## Context
- The owner wants to add a payment by screenshotting the bank app (roadmap order item 5).
- A Server Action can't be called from outside: its address changes with every deploy and it needs the login cookie.
- Calling Supabase directly would need the person's login token, which expires every hour, so the Shortcut would have to hold the password. The Supabase secret key skips every lock and must never leave the server ([security.md](../security.md) §3).

## Decision
- A `shortcut_keys` table: name, the account (and its currency) the key adds to, the SHA-256 hash of the key, when it was last used, and a per-hour counter. At most 3 keys per person. A key can be made and deleted, never changed.
- The key is 32 random bytes with a `pw_` prefix, shown once when it is made. Only its hash is stored.
- `POST /api/shortcut` reads `Authorization: Bearer pw_…` and a small JSON body (`amount`, optional `category` and `note`). It turns the amount into whole units with the `money` module, in the key's currency.
- Two `security definer` functions, run by `anon` only, take the key itself and hash it inside the database: `shortcut_key_currency(p_key)` and `shortcut_add_expense(p_key, p_amount_minor, p_category, p_note)`. Taking the key (not the hash) means a leaked hash is useless even against the API.
- `shortcut_add_expense` saves an **expense** for the key's owner on the key's account, dated today in the owner's time zone, with the named category (matched without case) or "Other", and the trip covering today, like the Add form. It refuses an archived account, the same entry sent twice within a minute, and more than 30 entries per key per hour.

## Consequences
- These are the only functions open to `anon` and the only `security definer` functions in `public`. The key is their whole check, so each one starts by finding the key, and the composite foreign keys still make sure the account and category belong to the key's owner.
- Supabase's security advisor warns about both functions ("Public Can Execute SECURITY DEFINER Function", lint 0028). That is this decision, not a mistake; any other function showing up there is.
- A stolen key can add at most 30 expenses an hour to one account until it's deleted. It can't read anything.
- Entries from the Shortcut look like any other entry: same rules, same audit log, editable in History.
- The goal-money question from the Add form isn't asked; the goal page shows its usual warning if a payment dips into goal money.
