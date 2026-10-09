# Personal Wallet: project notes

Read `docs/` first: requirements, architecture, database, security, development, roadmap, adr/.

This is Next.js 16.4 with Cache Components on. Before writing Next.js code, read the matching guide in `node_modules/next/dist/docs/` (see `AGENTS.md`), not memory.

## Commands
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Format: `pnpm format:check` (fix with `pnpm format`)
- Unit tests: `pnpm test` (coverage gate: `pnpm test:coverage`, 100% on `modules/money` and `domain/calculations.ts`)
- E2E tests: `pnpm test:e2e` (starts the dev server itself)
- Build: `pnpm build`
- Database (Docker must be running): `pnpm db:start`, `pnpm db:reset` (migrations + seed), `pnpm test:db` (pgTAP), `pnpm db:types` (after every migration)

All of them must pass after every change.

## Project rules
- Money only goes through `src/modules/money` (integer minor units plus currency). Never floats, never `parseFloat` on amounts. See docs/adr/003.
- Import other modules only through `@/modules/<name>`. `domain/` stays pure (no React, Next.js or Supabase). ESLint enforces this.
- UI text lives in `src/messages/en.ts`.
- Colours and design tokens live only in `src/app/globals.css`. Components use token classes (`bg-background`, `text-muted-foreground`), never raw colours.
- Line endings are LF (`.gitattributes`).
- `supabase/migrations/` is the source of truth for the schema. Never edit a migration that has run on production; add a new one. Every new table gets RLS, policies and pgTAP tests in the same change (docs/security.md §8).
