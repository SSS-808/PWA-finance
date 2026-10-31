# Design brief (saved 2026-10-12, started the same day)

## In plain words
The app works but is plain grey. This file is the plan for giving it a look. It is a paint-and-furniture plan: the rooms (login, accounts, transactions, dashboard) are already built and stay as they are.

The design phase started on 2026-10-12, after Phase 7 was released. The user picked look A; see "The pick" below.

## The pick (2026-10-12)
Three looks were drawn for Home and Add, light and dark: A "Emerald hero", B "Quiet cards", C "Tinted tiles". The user picked **A** and changed it with comments on the mockups. The mockups are on a private canvas, not in the repo. What was decided:

**Home**
- No page title and no greeting on screen. Home starts at the month switcher. Keep an invisible title for screen readers.
- The **main currency** card comes first (Settings → Main currency): solid emerald, white text, balance big, Income and Spending below, then Saved and Savings rate.
- Then **Money In** (soft green) and **Money Out** (soft red), side by side.
- Then the cards of the other currencies, smaller, in the same emerald.
- Then "Where your money went" as a white card: a round coloured icon per category and a bar in the category's colour.
- Then Recent, with the category icon and a green or red amount in each row.
- The bottom nav is a floating rounded pill. The active item is emerald on a soft emerald pill. The ＋ stays in the middle.

**Add**
- **Save sits at the top right**, next to the "Add" title, so it stays reachable with the keyboard open. No Save at the bottom.
- The Expense / Income / Transfer switch is plain grey.
- The amount is big, in a white card. Only the number is coloured (red for money out, green for money in). No tinted header: the user found it "too much red".
- Categories are **one row of 4**, swiped sideways for the rest, with dots under it. A "Show all" button on the right of "Category" opens the full grid and turns into "Show less" (the user first called it "Add more", then chose "Show all" on 2026-10-12).
- Every category icon **always has its own colour**. The picked one is a solid circle in its colour.
- Then Account and Date side by side, then Note.

## Task 5 mockups (approved 2026-10-31)
History, Accounts, Account details, Budgets and Goals were drawn on a private canvas (not in the repo), light and dark. The user approved them with one change: a debt reads "Owed ₭2,500,000", the word first.
- **Headers:** title left, a small emerald "+ Add" pill right (Accounts, Budgets, Goals).
- **History:** month switcher as a pill; a search box with a "Filters" button that opens Account, Category and Type; each day is a white card under its heading; a row shows the note and account on one line.
- **Accounts:** one white card per currency, its name and total above it; a fixed icon per account type in soft emerald (no database change); debts in the expense colour.
- **Account details:** an emerald card with name, type · currency and the big balance; Edit and Fix balance side by side; Recent with "See all"; Archive as a quiet link at the bottom.
- **Budgets:** month switcher; one card per currency with the total on top, then a row per category with its icon and a bar in its colour; over budget turns red and says "over"; a row opens its edit page.
- **Goals:** a card per goal with one target icon for all (no database change), the percent on the right, an emerald bar; a reached goal turns green with a tick.
- **Forms** (account, fix balance, budget, goal): like Add, a sticky title with a Save pill on top, and a back link instead of Cancel.

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

- The exact values live in `src/app/globals.css` (in since 2026-10-12): `--primary`, the neutrals, `--radius` at 14px, and `--income`, `--expense`, `--net`, each with a `-soft` twin for tiles (classes like `text-income`, `bg-expense-soft`). Every text colour was checked at 4.5:1 or better on its background, light and dark. `--destructive` in light mode was darkened for the same reason. The category colours and `--chart-*` come with the category task.
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

## How the phase runs
Each task has its own branch from `dev` and a PR into `dev`.
1. Tokens in `globals.css` (done 2026-10-12).
2. Home: the cards, Money In / Money Out, the nav, the Recent rows (done 2026-10-12). Category icons in the rows wait for task 3. The greeting is gone, so "Your name" in Settings is shown nowhere for now.
3. Category icons and colours: the migration, then the pickers and lists (done 2026-10-12). 24 icons and 10 colours; the keys live in `categories/domain/types.ts` and must match the migration's check constraints. The badge is `src/components/shared/category-icon.tsx`: it sits outside the categories module because client components can't import that module's barrel (it holds server code), and `domain/` files of other modules keep the icon and colour as plain strings because they may only import the money module.
4. Add: Save on top, the amount card, the category row (done 2026-10-12). The two edit screens share the forms, so they changed too. The title now lives inside the form, so these pages show no title while they load: fix it with the loading states in task 5. The Next.js dev badge is switched off (`next.config.ts`) because it sat on top of Save.
5. Every other screen, plus loading states and the accessibility pass (done 2026-10-31, PRs #25–#30). Accounts, History, Budgets and Goals follow the approved mockups; Settings, sign-in and problem pages follow the same rules. Every `<Suspense>` has a skeleton fallback (`components/shared/skeleton.tsx`). `tests/e2e/accessibility.spec.ts` runs axe (WCAG 2.2 AA tags) on 14 signed-in and 3 signed-out pages, light and dark: no problems found. A keyboard walk-through of History showed a logical order with a visible focus ring on every stop.
6. Measure at 320, 390, 768, 1024, 1280 and 1440px, light and dark: page width = screen width, no overflow, no broken lines. Report the numbers. All project checks pass.

## Still open
- Measured in the Add task: at 320px "Transportation" and "Entertainment" go onto two lines with a hyphen; nothing is cut off.
- Lunch Money's transaction list could not be loaded during the research. Look again before the History screen.
- Pocket Clear's Budgets tab was seen on its website on 2026-10-12: a ring with the percent used, then one thin bar per category. Ours already works that way.
- Bringing over the user's Pocket Clear history (about 233 entries, May to September 2026) is only an idea. CSV export is a paid feature there.
