# Development

Phase 0 · 2026-10-09 · The commands below become real in Phase 1.

## 1. Prerequisites

| Tool | Version on this machine | Note |
|---|---|---|
| Node.js | 24 | |
| pnpm | 11 | Package manager |
| Docker Desktop | 29 | Must be running for local Supabase |
| Git, GitHub CLI (`gh`) | 2.54, 2.98 | |
| Supabase CLI | — | Installed as a project dev dependency; run it with `pnpm supabase …` |

## 2. First-time setup (after Phase 1)

```bash
pnpm install
pnpm supabase start
cp .env.example .env.local
pnpm dev
```

`supabase start` prints the local URL and keys. Copy them into `.env.local`.

## 3. Scripts

| Script | Does |
|---|---|
| `pnpm dev` | Runs the app at http://localhost:3000 |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint, including the module-boundary rules |
| `pnpm format` | Prettier |
| `pnpm test` | Vitest unit tests |
| `pnpm test:db` | pgTAP tests against local Supabase |
| `pnpm test:e2e` | Playwright end-to-end tests |
| `pnpm build` | Production build |
| `pnpm db:reset` | Rebuilds the local database from migrations and seed data |
| `pnpm db:types` | Regenerates `src/lib/supabase/database.types.ts` |

**Before every PR:** `typecheck`, `lint`, `test`, `test:db` and `build` must all pass.

## 4. Environments

| | Database | App | Data |
|---|---|---|---|
| Local | Supabase in Docker | localhost:3000 | Fake seed data, wipe anytime |
| Preview | Decided in Phase 1 ([requirements §6](requirements.md#6-open-questions-for-later-phases)) | A Vercel preview URL per PR | Fake |
| Production | Supabase cloud | Vercel, deployed from `main` | Your real data |

Analogy: local is a flight simulator, production is the real plane. Migrations are the checklist you run in both, so the two behave the same.

## 5. Testing strategy

```
          E2E (Playwright)       few: the main journeys, on a phone-sized screen
       DB tests (pgTAP)          RLS and constraints: the security and integrity rules
   Unit tests (Vitest)           many: money and every financial calculation
```

### Unit tests (Vitest), next to the code they test
- **Money:** `parseMoney` handles commas, USD decimals, rejects decimals for LAK, rejects empty, negative and too-long input, and gets `"1.005"` exactly right without floats. Also `formatMoney`; `addMoney` refusing to mix currencies; amounts outside the safe range rejected.
- **Calculations:** income and expenses leave out transfers, opening balances and adjustments; savings rate (zero income → none; negative savings); balance; spending by category; month date ranges in your time zone.
- **Zod schemas:** valid and invalid input for each form.

### Database tests (pgTAP, `supabase/tests/`)
- For each table: user B can't select, insert into or update user A's rows, and `anon` sees nothing.
- Rejected: an expense with a positive amount; a transaction in a different currency from its account; a category of the wrong kind; a transaction on another user's account; a transfer with only one side (at commit); a same-currency transfer that doesn't cancel out; a second opening balance on the same account; any hard delete.
- `create_transfer` writes both sides or neither. The audit log gets a row on every insert and update.

### End-to-end tests (Playwright, `tests/e2e/`)
- Sign up → confirm through the local email inbox → create an account with an opening balance → quick-add an expense → transfer → the dashboard shows the right numbers.
- A logged-out visitor gets redirected.
- Runs at 390 px wide and at desktop width.

### Coverage
All branches covered in `modules/money` and every `domain/calculations.ts`. No target elsewhere: test what the code does, not how many lines it touches.

### CI (GitHub Actions, set up in Phase 1)
On every PR: install → typecheck → lint → unit tests → DB tests (`supabase start` on the CI machine) → build. End-to-end tests join CI at the MVP release.

## 6. Git workflow

```
main  ──●──────────────●──────────────●──   (= the live site)
         \            /                \
          feat/auth ─●─●─●              fix/…
                 squash merge: one clean commit on main per task
```

- `main` is the live site. Vercel deploys it automatically once it's connected.
- **Exception:** the very first commit (these Phase 0 docs) goes straight onto `main`, because there is nothing to branch from yet.
- For each task: update `main` → create a branch `feat/<short-name>` or `fix/<short-name>` → open a PR into `main` → wait for CI to pass → squash merge.
- **Why squash merge:** each PR becomes one clean commit on `main`, so the history reads like a changelog. The branch's work-in-progress commits disappear.
- **Commit subjects:** a subject line only, starting with `Feat`, `Fix`, `Chore`, `Docs`, `Perf`, `Test` or `Refactor`. Example: `Feat: add quick-add expense sheet`.
- Never commit `.env.local` or any real financial data.

## 7. Definition of done (every task)

- [ ] typecheck, lint, test, test:db and build all pass
- [ ] New behaviour has tests
- [ ] UI changes measured at 320, 390, 768, 1024, 1280 and 1440 px: no overflow, no broken lines
- [ ] UI text lives in `src/messages/en.ts`
- [ ] Docs or an ADR updated if a decision changed
