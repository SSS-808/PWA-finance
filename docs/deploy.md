# Deploy checklist

**In plain words:** "deploying" means putting the app on the internet, so you can open it on your phone anywhere. Right now it only runs on your laptop. We deploy once, at the MVP release (Phase 5.5). Until then, every phase adds its steps here while they're fresh, so deploy day is following a list instead of guessing.

**Who does what:** you do every step that needs a login, a password or a secret key. Claude prepares the steps and the commands, but never logs in or handles keys.

## The picture

```
GitHub (your code) ──► Vercel (runs the website) ──► Supabase "prod"    = your REAL money data
                         └─ preview links ─────────► Supabase "staging" = fake data, safe to break
```

- **Vercel** is the computer on the internet that runs the website. It's free for personal projects.
- **Supabase prod / staging** are two separate online databases: one real, one for practice. (Explained in [development.md §4](development.md#4-environments).)

## Steps

### 1. Accounts (one time)
- [ ] Supabase account (free plan)
- [ ] Vercel account, signed in with your GitHub (free "Hobby" plan)

### 2. Two Supabase projects
- [ ] Create `pwa-finance-staging`, region **Singapore** (closest to Laos, so it's faster)
- [ ] Create `pwa-finance-prod`, region **Singapore**
- [ ] Save each project's database password in a password manager, never in chat or code

### 3. Build the two databases from our migrations

**In plain words:** the new online databases are empty. Our migration files are the building plan (tables, rules, functions). "Linking" points your laptop at one online project, and "pushing" builds the plan there. Do staging first as a rehearsal, then prod.

You need each project's **Project ID**: 20 letters, shown in Supabase under Project Settings → General. It isn't secret.

- [ ] Log the Supabase tool in, one time. It opens your browser:
  ```bash
  pnpm supabase login
  ```
- [ ] **Staging.** Point the laptop at it. It asks for that project's database password; type it in the terminal (nothing shows while you type):
  ```bash
  pnpm supabase link --project-ref <staging-project-id>
  ```
- [ ] Rehearse. This only lists what would be built (5 migrations) and changes nothing:
  ```bash
  pnpm supabase db push --dry-run
  ```
- [ ] Build it. Answer `Y` when it asks:
  ```bash
  pnpm supabase db push
  ```
- [ ] In the Supabase dashboard, Table Editor shows `accounts`, `categories`, `profiles`, `transactions` and the others, each marked as RLS enabled.
- [ ] **Prod.** Repeat the three commands (`link`, `db push --dry-run`, `db push`) with the prod Project ID and the prod password.
- [ ] Unplug the laptop from prod when you're done, so no later command can touch the real database by accident:
  ```bash
  pnpm supabase unlink
  ```

Good to know:
- The seed (fake demo data) never goes online. `db push` doesn't send it.
- `link` may print that the local settings differ from the online ones. That's expected: `config.toml` describes the laptop setup, and step 4 sets the online one by hand.
- **Never** run `pnpm supabase db reset --linked`. It erases the online database the laptop is linked to.

### 4. Login settings in Supabase (prod now; staging when preview links are first used)
- [ ] **Authentication → Sign In / Providers:** "Confirm email" **on**. In the **Email** provider: minimum password length **10**. These match `supabase/config.toml`.
- [ ] **Your own email sender (SMTP).** Free Supabase projects can't edit email templates without one (found 2026-10-12), and the app needs our templates: with Supabase's default text, "Forgot password" doesn't work. We use Gmail, which is free and needs no domain:
  - Google account: turn on 2-Step Verification, then create an **app password** at `myaccount.google.com/apppasswords`. Save it in a password manager, never in chat or code.
  - **Authentication → Emails → SMTP Settings → Enable custom SMTP:** sender email = your Gmail address, sender name `Personal Wallet`, host `smtp.gmail.com`, port `465`, username = your Gmail address, password = the app password.
  - The app password can send and read that account's mail. Deleting it in Google cuts the access at once.
- [ ] **Authentication → Emails → Templates** (editable once SMTP is saved):
  - "Confirm sign up": subject `Confirm your Personal Wallet account`, body = the contents of `supabase/templates/confirmation.html`
  - "Reset password": subject `Reset your Personal Wallet password`, body = `supabase/templates/recovery.html`
  - Why: our links use `/auth/confirm?token_hash=…`, so they work even when the email is opened on a different device from the one used to sign up.
- [ ] Rate limits: keep Supabase's defaults online. The high limits in `config.toml` are only for the robot tests on your laptop.
- [ ] **After step 5** (it needs the site's address): **Authentication → URL Configuration:** Site URL = your Vercel address. Redirect URLs: add `https://<your-site>/auth/confirm`. The links in our emails start with the Site URL, so a wrong one sends people to the wrong place.
- [ ] Gmail is fine for personal use. Before letting others sign up, move to an email service with your own domain (Phase 12).

### 5. Vercel
- [ ] Import the GitHub repo. Add the environment variables below on the import screen, before the first deploy: the build stops without them.
- [ ] Function region **Singapore (sin1)**, next to the database. `vercel.json` in the repo sets it, so there's nothing to click.
- [ ] **Environment variables** (later under Settings → Environment Variables). The names are in `.env.example`:
  - `NEXT_PUBLIC_SUPABASE_URL`: the project URL (Supabase → Project Settings → API)
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the **publishable** key (starts with `sb_publishable_`). Never use the secret key here.
  - `ENABLE_EXPERIMENTAL_COREPACK` = `1`: makes Vercel use the pnpm version named in `package.json` (pnpm 11; Vercel's own list stopped at pnpm 10 when this was written).
  - Set the **prod** values for "Production" and the **staging** values for "Preview".
  - The two `NEXT_PUBLIC_` entries must have Type **Config**, chosen before saving. Vercel refuses type "Secret" for a `NEXT_PUBLIC_` name, and a saved Secret can't be viewed or switched: delete it and add it again.
  - `Invalid API key` in the logs means the URL and the key come from different projects, or the key was cut off.
- [ ] After changing a `NEXT_PUBLIC_` value: **Deployments → ⋯ → Redeploy**. These values are baked in when the site is built.
- [ ] Don't add Vercel's Supabase integration. It copies the secret key into the project; we only want the two public values.
- [ ] Turn on Deployment Protection for preview links, so only you can open them

Good to know: internet providers in Laos block every address ending in `.vercel.app` (found 2026-10-12; it only opens with a VPN). The block is on the name, so the site needs its own domain to open normally.

### 6. After the deploy
- [ ] On your phone: sign up → confirm the email → log in → add an expense
- [ ] Supabase **Security Advisor** shows no warnings
- [ ] From now on: a branch and a PR for every change ([development.md §6](development.md#6-git-workflow))
