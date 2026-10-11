# Design brief (saved 2026-10-12, not started)

## In plain words
The app works but is plain grey. This file is the plan for giving it a look, to be used when the design phase starts. It is a paint-and-furniture plan: the rooms (login, accounts, transactions, dashboard) are already built and stay as they are.

The order of work does not change: E2E in CI → data export → Phase 6 Budgets. The design phase starts when the user says so. Until then "function before looks" still applies.

## Where this came from
- **Another AI's prompt** ("Build a Premium Responsive Expense Tracker PWA"). About 70% of it described things already built or already on the roadmap, so only its look-and-feel parts were kept.
- **Pocket Clear** (https://pocketclear.app/), the app the user logs in every day. Eight of the user's own screenshots were reviewed (Home, Reports, Add), in dark mode with kip amounts. The pictures are not stored in the repo.

## Decisions (the user answered "defaults" on 2026-10-12)
1. **When:** this brief is saved for the design phase. The order of work stays as above.
2. **References:** Pocket Clear leads (layout and feel). Copilot Money for polish. Lunch Money for the History list and filters. Monarch Money dropped (desktop-first, built on bank sync). Inspiration only, never a copy.
3. **Main colour:** deep emerald for buttons and the active nav item. Income and expense get their own green and red, clearly different from the emerald.
4. **Home buttons:** "Money In" and "Money Out" on Home. The ＋ in the nav stays.
5. **Categories:** each gets an icon and a colour, picked from a fixed set. The Add screen shows them as an icon grid.
6. **Reports page with tabs:** decide at Phase 10. Phase 6 stays as planned (a Home section plus a `/budgets` page, no new nav icon).

## The look (everything lives in `src/app/globals.css`)
| Token | Today | Target |
|---|---|---|
| `--primary` | grey (`oklch(0.205 0 0)`) | deep emerald |
| `--background` | pure white | light warm off-white; cards stay white |
| `--radius` | `0.625rem` (10px) | 12–18px on cards |
| `--income`, `--expense`, `--net` | do not exist | green, red, blue, each with a soft tinted version for tiles |
| `--chart-1` … `--chart-5` | greys | the category colours |

- Exact values are chosen from the mockups, not here.
- **Dark mode counts as much as light.** The user's phone runs dark. It keeps following the device; no manual switch. Pocket Clear's idea worth borrowing: near-black page, tiles tinted dark green, dark red or dark blue.
- **Colour is never the only signal.** Amounts keep their sign and label, so the app reads fine without colour.
- **Font:** Geist stays. It has no Lao letters, so a Lao-ready fallback font is needed before any Lao text is added.
- **Icons:** `lucide-react`, already installed.
- Subtle borders and soft shadows. No heavy gradients, no glass effects, no decoration for its own sake.

## Screens
### Home
- One emerald hero card **per currency**: balance big, the month's money in and money out below. Currencies are never added together (ADR-008).
- "Money In" and "Money Out" buttons that open Add with the kind already chosen. Today Add always opens on Expense (`add-form.tsx`), so this needs a small new `kind` param.
- Month switcher: already there (`DashboardMonthBar`).
- Spending by category: keep the bars. A donut needs a chart library and reads worse with long names.
- No streaks, rewards or upgrade cards. The first screen shows money, nothing else.
- Later: a "Spent today" line (new calculation, needs tests) and an eye icon to hide amounts.

### Add
- The amount is huge and sits at the top, green for money in and red for money out, on a softly tinted header. Transfers stay neutral.
- Categories as a grid of round icons, four per row.
- Keep what works: commas while typing, account, date, note, and the Transfer kind.
- Check that Save stays reachable while the phone keyboard is open.
- Later: a "+ New" category tile inside the picker.
- Skipped: subcategory, payment type, split, reminders. Our Account already does the job of payment type and keeps a balance.

### History
- Coloured amounts and the category icon in each row. Lunch Money is the reference for the list and its filters.

### Layout
- Phones keep the bottom nav, wide screens (1024px and up) keep the sidebar. Both exist in `app-nav.tsx`.
- Kip numbers are long. Tiles stack on phones; never four in a row.

## Category icons and colours need a database change
Checked 2026-10-12: no migration gives categories an icon or a colour. So decision 5 needs a new migration: two columns holding **keys** from a fixed set (with a check constraint), and defaults for the seeded categories. The colours themselves stay as tokens in `globals.css`; the database stores only the key. Same rules as always: pgTAP tests, `pnpm db:types`, and the migration reaches staging and production before the app code that needs it.

## Lessons from Pocket Clear's weak spots
- It shows kip with ".00", so `₭4,400,000.00` breaks onto two lines. Ours has no decimals for kip (`modules/money/domain/currency.ts`). Still measure at 320px.
- Its amount box has no commas while typing. Ours has.
- Its Home is crowded with four prompts above the transactions. Ours stays clean.

## Not part of the design phase
| From the prompt | Why not |
|---|---|
| One "Total balance" card | Currencies are never added together (ADR-008) |
| Income vs expense chart, "vs last month" | Phase 10 Analytics; new calculations |
| Budgets page | Phase 6, already planned |
| Analytics page | Phase 10 |
| Manifest, service worker, offline | Phase 11 |
| Vite, Recharts | The app is Next.js; a chart library is added only when a chart needs it |
| Demo mode, local storage | There is a real database |
| Pop-up Add form on desktop | The Add page works and returns to where the user was |
| Manual theme switch, tags, notification bell | Not in the requirements |
| "Implement, do not stop at a proposal" | The workflow is mockups first, then "OK, go" |

## Also waiting for this phase
Two leftovers from Phase 5.5: loading states (skeletons) and the accessibility pass.

## How the phase will run
1. Mockups a/b/c made from the real app: Home and Add, in light and dark.
2. The chosen one becomes tokens in `globals.css`.
3. Apply it to every screen.
4. Measure at 320, 390, 768, 1024, 1280 and 1440px, light and dark: page width = screen width, no overflow, no broken lines. Report the numbers.
5. All project checks pass.

## Still open
- Pocket Clear's Budgets tab has not been seen. It would help the look of Phase 6.
- Bringing over the user's Pocket Clear history (about 233 entries, May to September 2026) is only an idea. CSV export is a paid feature there.
