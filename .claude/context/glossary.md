# Glossary (plain words)

New words get added here as they come up.

## Git and GitHub
- **Commit**: a saved snapshot of your code, with a short note about what changed.
- **Push**: upload your commits to GitHub.
- **Branch**: a side copy of the code where you try changes without touching the main version.
- **PR (pull request)**: asking to bring a branch's changes into `main`, so they can be checked first.
- **`main`**: the main version of the code. After the MVP deploy, it's what's live on the internet.

## Checks and tests
- **Type check**: catches mistakes like "you passed text where a number was expected" before the code runs.
- **Lint**: an automatic code reviewer for bad habits and rule breaks (like our "rooms" rule).
- **Format**: makes the code's spacing and layout tidy and consistent.
- **Build**: turns our code into the real website files. If the build fails, the site can't go online.
- **Unit test**: a small automatic check of one piece, like "does 12.50 become 1250?"
- **E2E test** (end-to-end): a robot opens the site in a real browser and checks it.
- **Coverage**: the share of the code the tests actually run. We require 100% for money code.
- **CI**: the robot on GitHub that runs every check after each push.

## Database
- **Database**: the filing cabinet where the app keeps data.
- **Table**: one drawer of the cabinet, like a spreadsheet sheet (accounts, transactions…).
- **Migration**: a numbered building plan for the database. Your laptop and the online database get built from the same plans.
- **Seed**: fake practice data, used only on your laptop.
- **RLS (Row Level Security)**: a guard on each table that only shows you rows with your name on them.
- **Constraint**: a rule the database enforces itself, like "an expense must be negative".
- **Soft delete**: putting a "deleted" sticker on a row instead of erasing it.
- **Audit log**: a diary of every change to a transaction.
- **pgTAP**: the tool we use to write tests for the database.
- **Supabase**: a service that gives us the database plus logins.
- **Studio**: Supabase's website for looking inside your database (`http://127.0.0.1:54323` on your laptop).
- **Docker**: runs a mini Supabase on your laptop inside "containers", like little sealed boxes.

## Logging in
- **Session**: proof that you're logged in, kept in a cookie (a small note the browser stores).
- **Proxy (the doorman)**: `src/proxy.ts` runs before every page and sends logged-out visitors to the login page. It's a convenience; the real locks are the server checks and RLS.
- **Server action**: a function that runs on the server when you press a form button, like "Log in" or "Save changes".
- **Mailpit**: the pretend inbox on your laptop that catches the app's emails (`http://127.0.0.1:54324`).
- **Token hash link**: the kind of email link we use. It works even if you open the email on a different device.
- **Suspense (loading boundary)**: a part of the page that shows "loading" for a moment while your data arrives; the rest of the page appears instantly.

## App and going online
- **Next.js**: the framework (toolkit) our website is built with.
- **Component**: one reusable piece of the screen, like a button or a form.
- **Deploy**: putting the app on the internet.
- **Vercel**: the company whose computers will run our website online.
- **Staging / production**: a practice copy with fake data / the real thing with your real money data.
- **Environment variables**: settings, like which database to talk to, kept outside the code. Secret ones never go in git.
- **MVP**: Minimum Viable Product, the first version that's actually usable.
- **ADR**: Architecture Decision Record, a one-page note on "what we chose and why" (`docs/adr/`).
