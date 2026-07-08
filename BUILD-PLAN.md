# Build plan

Task-level execution plan for the shop management SaaS. Each unchecked box is sized for one focused Claude Code session: state the task, let Claude plan, approve, build, review against the skill's checklist, commit. Phases are sequential; tasks inside a phase are roughly in dependency order. Durations assume a solo build with Claude Code.

How to work: start sessions from the repo root so `CLAUDE.md` loads, keep one task per session, and `/clear` between tasks. Design-heavy tasks (marked with an asterisk) are worth running on Opus or opusplan; the rest run fine on Sonnet.

## Phase 0: platform foundation (about 2 weeks)

- [ ] * Scaffold the monorepo: pnpm workspaces (`apps/api`, `apps/web` shop app, `apps/admin` super-admin app, `packages/shared`), TypeScript strict configs, ESLint, Prettier, Vitest wiring, and a root README with commands.
- [ ] Build `apps/api` skeleton: express app assembly, zod-validated env config, pino logging with request ids, AppError and central error middleware, health endpoint, security middleware (helmet, CORS allowlist, body limit), and a cached Mongoose connection to MongoDB Atlas built for serverless reuse.
- [ ] * Design the core data models (Mongoose): shops, users, roles and permissions, plans, subscriptions, audit logs, with index creation verified at startup. Seed script with a demo shop and users for each role.
- [ ] Implement auth: login, short-lived access token, rotating refresh tokens, argon2id hashing, `requireAuth` and `requirePermission` middleware, rate limiting on auth routes, tests for permission denial.
- [ ] * Implement the module registry in `packages/shared` and the entitlement layer: `requireModule` middleware, subscription status handling (trial, active, grace read-only, suspended), and `/api/v1/me/entitlements`. Tests: disabled module returns the correct error; grace mode blocks writes.
- [ ] Build the platform admin plane: separate guard and token audience under `/api/admin/v1`, shops CRUD, create shop with owner user, assign plan, toggle modules, audit logging on every admin action.
- [ ] Build the shop app (`apps/web`) skeleton: API client with token refresh, TanStack Query setup, login flow end to end, layout shell with entitlement-aware navigation, i18n wiring with English strings.
- [ ] Build the super-admin app (`apps/admin`) skeleton: separate app on the same stack, admin login against `/api/admin/v1`, layout shell, and a shops list with create shop, plan assignment, and module toggles wired to the admin endpoints.
- [ ] Set up Vercel and Atlas: three Vercel projects from the monorepo (api as serverless functions, web and admin as static builds), a MongoDB Atlas cluster with environment variables per environment, and preview deployments on, so every pull request gets its own preview URL and `main` deploys to production. This is the run-and-see loop when building through Claude Code on the web.

## Phase 1: catalogue and parties (about 2 weeks)

- [ ] Categories and units: CRUD for categories; unit definitions per shop (base units and pack units with conversion factors); conversion helpers in `packages/shared` with tests.
- [ ] * Products: schema and API for products with base unit, pack units, retail and wholesale price per sellable unit, barcode, reorder level, default taxes placeholder; weighted-average cost fields.
- [ ] Products UI: list with fast search and filters, create and edit forms (shared zod schemas), unit and price management, barcode field.
- [ ] Parties: customers and suppliers with `price_type` (retail or wholesale), credit limit, contact details; list and forms.
- [ ] Opening balances: khata opening-balance entries for parties via the khata service (append-only from day one), with a simple entry screen and statement view stub.
- [ ] CSV import for products and parties: template download, upload with row-level validation errors, dry-run preview before commit.

## Phase 2: inventory and purchases (about 2 weeks)

- [ ] * Stock engine: append-only `stockMovements` collection owned by the inventory module, cached `currentStock` updated in the same MongoDB transaction, atomic conditional decrement helper (`findOneAndUpdate` with a `$gte` guard), reconciliation script, tests for concurrent decrement.
- [ ] Stock adjustments: manual in/out adjustments with required reason, movement history per product, low-stock list.
- [ ] Purchases: create and receive purchases with lines in any unit (converted to base), payment terms (`credit_days` producing `due_date`), unpaid tracking, weighted-average cost update on receive.
- [ ] Supplier ledger effect: purchase on credit writes khata credit to the supplier through the khata service; supplier statement view.
- [ ] Vendor payments: pay a supplier from an account placeholder (account wiring completes in phase 4), allocation against open purchases, payables list with aging buckets (current, 1 to 30, 31 to 60, over 60).

## Phase 3: sales, taxes, and billing (about 2.5 weeks)

- [ ] * Tax engine: shop-defined taxes (name, rate), product default taxes, inclusive and exclusive price math in `packages/shared` with exhaustive tests (multi-tax lines, rounding, remainder to last line).
- [ ] * Finalize-sale transaction on the API: server-side repricing by unit and party price type, discount limits by role, tax snapshots on lines, stock movements out, payment for paid portion, khata debit for credit portion, gapless invoice numbering, idempotency key handling. Integration tests.
- [ ] Billing screen: keyboard-first flow (focused search, barcode input, Enter adds line, unit switcher, quantity and discount editing, running totals with tax), cash, credit, and mixed payment, finalize with shortcut.
- [ ] Default invoice designs: two clean system templates (A4 and 80mm thermal) rendered from document data, shop branding settings (logo, colors), print stylesheet, invoice list with search and reprint.
- [ ] Returns: return against an invoice creating reversing stock movements and khata or refund entries; return receipt.

Milestone: demo-ready. From here the product can be shown to shop owners on staging.

## Phase 4: money, accounts, and ledgers (about 2 weeks)

- [ ] * Accounts module: cash, bank, and wallet accounts; append-only account entries; opening balances, deposits, withdrawals, adjustments with reason; transfers as paired entries in one transaction; cached balances plus reconciliation.
- [ ] Wire payments to accounts: every sale payment, receipt, vendor payment, and expense selects an account; backfill the phase 2 and 3 placeholder.
- [ ] Receive payment flow: single invoice or bulk allocation across open invoices (oldest first, editable), khata credit plus account entry, printable receipt document.
- [ ] Customer and supplier statements: date-ranged ledger statements with opening balance, entries, and closing balance; print view.
- [ ] Expenses: categories and daily entries against an account, feeding cash summary and profit.
- [ ] Day close: expected versus counted cash on the cash account, difference recorded with note, day summary print.

## Phase 5: dashboard and reports (about 1.5 weeks)

- [ ] Owner dashboard: today and month sales, cash and bank position, receivables, payables with overdue, low-stock count, top products, sales trend chart.
- [ ] Reports with date filters and print or PDF export: sales register, stock in hand and valuation, tax summary by tax name, receivables and payables aging, expense summary, profit (owner only).

## Phase 6: invoice template builder (about 3 weeks)

- [ ] * Template model and renderer: JSON schema for page setup, header, customer block, items-table column config, totals with tax breakdown options, footer, and styling; one HTML renderer used by preview, browser print, and PDF export; migrate the phase 3 default designs into system templates.
- [ ] Builder UI part 1: template list, create from a system template, page setup and styling controls, live preview with realistic sample data.
- [ ] Builder UI part 2: items-table column configuration (visibility, order, labels), totals and tax display options, footer and terms editing.
- [ ] Template assignment: multiple templates per shop, default per document type (invoice, receipt, statement), template picker at print time.
- [ ] PDF export hardening: serverless Chromium rendering endpoint (playwright-core with a serverless Chromium build) with timeouts, a small external render service as fallback if platform limits bite, and identical output verification against browser print.

## Phase 7: subscriptions, onboarding, and launch (about 2 weeks)

- [ ] Plans and subscriptions UI in super-admin: plans as module bundles with limits (user count), assign and change plans, trial length, manual payment log, renewal and status changes with audit trail.
- [ ] Grace and suspension behavior end to end: read-only banner and blocked writes in grace, lockout screen with renewal notice when suspended.
- [ ] Shop onboarding: create-shop wizard (details, owner account, plan or trial), first-run checklist inside the shop app (add products, opening balances, first sale).
- [ ] Super-admin overview: shops list with status, subscription expiries, basic usage stats; support impersonation with audit logging.
- [ ] Operations: production domains and environment variables on Vercel, Vercel Cron for the nightly reconciliation job, automated database backups (Atlas backups on a paid tier, scheduled dumps otherwise) with a tested restore, uptime check on `/health`, error alerting.
- [ ] Launch pack: concise user guide, super-admin runbook (activate, renew, suspend, restore), and a final pass of the review checklist across critical flows.

Total: approximately 17 working weeks.

## Post-v1 roadmap (separate scoping later)

Gateway subscription billing (PayFast or Safepay), owner mobile app (React Native, reusing the API), Urdu interface, multi-branch with stock transfer, WhatsApp or SMS payment reminders, FBR POS integration, accounting exports.
