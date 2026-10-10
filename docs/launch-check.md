# Launch check: a human test before going online

The robots have checked that everything **works** (577 automatic tests). This list is for checking what only a person can judge: **is it easy, is it clear, would I actually use it?** About 30 minutes.

## Before you start

1. Open **Docker Desktop**, then in the terminal:
   ```bash
   pnpm db:start
   ```
   ```bash
   pnpm dev
   ```
2. Open **http://localhost:3000** in Chrome.
3. **See it phone-sized:** press `F12`, then `Ctrl + Shift + M`, and pick a phone (for example "iPhone 12 Pro") at the top.
4. **Emails** (sign-up, password reset) arrive in the pretend inbox: **http://127.0.0.1:54324**.
5. Use a **new account**, not the demo, and type numbers close to your real ones, so it feels real.

## The check (tick as you go)

### A. Getting in (5 min)
- [ ] Sign up with any made-up email → open the pretend inbox → click the link → you land on Home.
- [ ] Settings → **Log out** → log in again. Try one **wrong password**: is the message clear?
- [ ] **Forgot password?** → inbox → choose a new password → log in with it.

### B. Setting up (5 min)
- [ ] Settings: your **name**, main currency and time zone → Save → Home says "Hi, …".
- [ ] Add your **real accounts** (Cash, BCEL, USD, a card…) with roughly real amounts. Do the totals on Accounts look right?

### C. Daily use (10 min): the most important part
- [ ] Add **5 expenses** with the round ＋, as fast as you can. Is each one **about 5 seconds**? Is anything annoying?
- [ ] Add an **income** (salary).
- [ ] **Move money** BCEL → Cash. **Change dollars into kip** (the second box "How much arrived?").
- [ ] **Fix a balance** on one account to match a real number.
- [ ] **Edit** one expense and **delete** one.

### D. Looking back (5 min)
- [ ] **Home:** do this month's numbers make sense (income, spending, saved, savings rate)?
- [ ] Tap a bar under "Where your money went": does it show the right transactions?
- [ ] **History:** filter by one account, **search** a note, go back one month.
- [ ] **Settings → Manage categories:** add one, use it, then hide it.

### E. Look and feel (2 min)
- [ ] In phone size: is everything readable, and is anything hard to tap?
- [ ] Switch your computer to **dark mode**: does the app follow?

## Not in this first version (on purpose, so not bugs)

- No combined total across currencies (needs exchange rates; Phase 8)
- No budgets, goals, net-worth history, investments or analytics (Phases 6–10)
- No "install on phone" or offline mode yet (Phase 11)
- No repeating transactions, receipt photos, CSV import, or splitting one payment across categories
- No "restore" button for deleted items (they're kept safely; a restore screen comes later)
- No sort by amount (₭ and $ mixed would mislead)
- Plain look on purpose: function first, polish after the MVP

## What to tell me

Either **"good enough to launch"**, or a list like this:

> **Must fix before launch:** on the Add screen, I expected X but Y happened (what I did: …)
> **Nice to have later:** …

When you say go, **Phase 5.5 (going online)** starts. We'll follow [deploy.md](deploy.md) together: you create the free Supabase and Vercel accounts and paste the keys; I prepare every step.
