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
- [ ] Staging first, then prod. The exact commands (`supabase link`, `supabase db push`) are added at Phase 5.5. You run them.
- [ ] The seed (fake demo data) never goes to prod. `db push` doesn't send it.

### 4. Login settings in Supabase (added in Phase 2)
- [ ] Site URL and redirect URLs (the web addresses login emails may send people back to)
- [ ] Email confirmation on, minimum password length 10, the same as `supabase/config.toml`

### 5. Vercel
- [ ] Import the GitHub repo
- [ ] Function region **Singapore (sin1)**, next to the database
- [ ] Environment variables (added in Phase 2): "Production" gets the prod keys, "Preview" gets the staging keys
- [ ] Turn on Deployment Protection for preview links, so only you can open them

### 6. After the deploy
- [ ] On your phone: sign up → confirm the email → log in → add an expense
- [ ] Supabase **Security Advisor** shows no warnings
- [ ] From now on: a branch and a PR for every change ([development.md §6](development.md#6-git-workflow))
