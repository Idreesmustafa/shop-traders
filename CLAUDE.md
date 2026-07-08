# Shop management SaaS

Multi-tenant subscription product for local trading shops in Pakistan. Each shop is a tenant with its own users, data, and set of enabled modules. Shops subscribe to plans; plans are bundles of modules. The platform owner runs a separate super-admin panel to manage shops, subscriptions, and module entitlements. Version 1 is web only: one API serving two separate web applications, the shop app for shop owners and staff, and the super-admin app for the platform owner. Core promise to the shop owner: fast billing, accurate stock, and ledgers that always add up.

## Stack

- Monorepo with pnpm workspaces
- `apps/api`: Node.js 22, TypeScript, Express, Mongoose, MongoDB Atlas
- `apps/web`: the shop application (React 18, Vite, TypeScript, TanStack Query, react-hook-form, Tailwind)
- `apps/admin`: the super-admin application, a separate React app on the same stack, talking only to `/api/admin/v1`
- `packages/shared`: zod schemas, shared types, module registry, money/date/tax utilities
- Documents: one HTML renderer for preview and browser print (primary output); PDF downloads via a serverless Chromium function, with a small external render service as fallback if platform limits bite
- Tests: Vitest, Supertest, mongodb-memory-server (replica set mode so transactions work)

Follow the software-architect skill for all design and coding work.

## Deployment (Vercel)

- Three Vercel projects from this monorepo: `api` as serverless functions (Express behind a single function entry), `web` and `admin` as static builds.
- MongoDB Atlas with a `MONGODB_URI` per environment; the Mongoose connection is cached at module scope and reused across invocations, never opened per request.
- Preview deployments are the staging loop: every pull request gets its own URL; `main` deploys to production.
- Vercel Cron triggers the nightly reconciliation endpoint; uploaded shop logos go to Vercel Blob.

## Commands

- `pnpm dev` run api, web, and admin in watch mode
- `pnpm test`, `pnpm lint`, `pnpm typecheck` must pass before any commit

## Tenancy and entitlements (the spine of the product)

- Tenant = shop. Every business document carries `shopId`. Every query filters by it. `shopId` comes from the authenticated user's verified token, never from client input.
- Platform admin is a separate plane: separate guard and token audience, routes under `/api/admin/v1`, cross-tenant by design, and every admin action is audit-logged. Support impersonation of a shop is allowed but always audit-logged with the admin's identity.
- Every feature belongs to a named module. The module registry lives in `packages/shared` so api and both web apps agree on codes. API route groups are wrapped in `requireModule('<code>')`; the shop app reads `/api/v1/me/entitlements` and hides disabled modules. The server check is the enforcement; the UI check is convenience.
- Subscription status drives access: `trial` and `active` are full access to entitled modules; `grace` (expired, within grace days) is read-only; `suspended` locks the shop out except for a renewal notice. Status checks sit in the same middleware chain as entitlements.

## How to work (applies to every task)

- You are working with a solo developer; there is no separate reviewer or QA. Review your own diffs, test what you build, and think about data safety without being asked.
- For any non-trivial task, present a short plan (approach, files touched, risks) before writing code. The plan needs explicit approval when the change affects data models, authentication, permissions, money handling, or deletes data.
- Work in small vertical slices that leave the project working after each step. Read existing code before changing it and match the established patterns.
- If a requirement is ambiguous in a way that changes the design, ask one precise question; otherwise state your assumption in one line and continue.
- Never claim something works without running it: run tests, lint, and typecheck before calling a task done, and report actual results.
- Hard rules: no secrets in code, commits, or logs; database structure and data reshaping only through version-controlled models and migration scripts, never ad hoc edits; no floating point for money; never skip or delete a failing test to look complete; never force-push or delete data without explicit confirmation; never invent a library API, check the installed types or documentation first.
- Finish each cloud session by pushing the branch and opening a pull request whose description states what changed, key decisions, what was tested, and anything left open.
- Git: conventional commits (feat, fix, refactor, test, chore), small and logical, each leaving the codebase working.

## Domain glossary

- **Khata / udhaar**: running credit ledger for a party. **Party**: customer or supplier (one collection, `type`).
- **Base unit / pack unit**: stock is counted in the base unit (piece, kg, litre); pack units define conversions (1 carton = 12 pieces). Documents record the entered unit and quantity plus the converted base quantity.
- **Price tier**: each sellable unit carries a retail price and optional wholesale price; a party's `priceType` picks the default, editable on the line within role limits.
- **Account**: a cash, bank, or mobile wallet (JazzCash, Easypaisa) balance owned by the shop. Every payment in or out references an account.
- **Tax**: shop-defined named tax (GST, SST, other) with a percentage rate. Products carry default taxes; documents snapshot them.
- **Invoice template**: a JSON layout definition rendered by one engine for preview, browser print, and PDF.
- **Module / plan / subscription**: feature bundle switching, commercial bundle of modules, and a shop's assignment to a plan with period and status.
- **Day close**: end-of-day reconciliation of expected versus counted cash on the cash account.

## Modules and ownership

`platform-admin`, `auth`, `shops`, `subscriptions`, `parties`, `products`, `inventory`, `purchases`, `sales`, `payments`, `khata`, `accounts`, `taxes`, `templates`, `expenses`, `reports`, `settings`.

- Only `inventory` writes `stockMovements`; only `khata` writes party ledger entries; only `accounts` writes account entries. Other modules call their services.
- `reports` is read-only over other modules' data. Modules never query another module's collections directly.

## Data rules (non-negotiable)

- Money: integer paisa in 64-bit-safe integers, fields suffixed `Paisa`; rupees only at the UI. Rounding on splits and taxes: round half up, remainder to the last line.
- Quantities: Decimal128 with three decimals, always in base units on stock records. Document lines store `unitId`, entered `quantity`, and computed `baseQuantity`. Conversion factors are immutable once used on documents; changes create a new unit version.
- Every multi-document write runs in one MongoDB transaction (session passed to every operation). Transactions need a replica set: Atlas provides one on every tier; tests use mongodb-memory-server in replica set mode.
- Costing: weighted average cost per base unit, updated on purchase receive, used for stock valuation and profit.
- Taxes: documents snapshot tax name, rate, base, and amount per line at finalize time; historical documents never reference live tax records. Shop setting `pricesIncludeTax` decides inclusive or exclusive math, implemented once in `packages/shared` with tests, used by api and web.
- Ledger pattern everywhere balances matter: `stockMovements`, khata entries, and account entries are append-only; corrections are reversing or adjustment entries with a required reason; cached balances (`products.currentStock`, `parties.balancePaisa`, `accounts.balancePaisa`) update in the same transaction; a reconciliation script recomputes and reports drift.
- Manual balance entry is an entry, not an edit: party opening balances and adjustments go through khata; account opening balances, deposits, withdrawals, and adjustments go through account entries; transfers are paired entries in one transaction.
- Stock cannot go negative: atomic conditional decrement (`findOneAndUpdate` with a `$gte` guard and `$inc`) inside the sale transaction; a null result is `INSUFFICIENT_STOCK`.
- Referential integrity is application-level: services verify referenced ids exist and belong to the same `shopId` before writing.
- Purchases carry payment terms: `creditDays` producing `dueDate`; payables aging derives from due dates.
- Document numbers: per-shop gapless sequences with configurable prefixes (invoice, receipt, purchase), incremented on a counter document inside the transaction.
- Sale and payment creation require a client `idempotencyKey` backed by a unique index; retries on flaky internet must never double-post.
- Timestamps are BSON dates in UTC; display Asia/Karachi.

## Key flows

- **Finalize sale (one transaction)**: server re-prices lines from product data by unit and party price type, applies discounts within role limits, computes tax snapshots per the inclusive/exclusive setting, creates the invoice with embedded lines, writes stock movements out (base quantities), records payment against the chosen account for the paid portion, writes khata debit for the credit portion, updates caches, returns the invoice.
- **Receive payment**: one payment against one account, allocated to one invoice or across several open invoices (bulk allocation, oldest first by default, editable); writes khata credit and account entry; produces a printable receipt.
- **Vendor payment**: mirror of the above toward a supplier, reducing payables against due dates.
- **Account transfer**: paired account entries in one transaction (for example cash to bank deposit).
- **Template render**: document data plus template JSON in, HTML out; the same renderer serves the builder preview, browser print, and PDF export, so output is identical everywhere.

## Roles

- Platform: `super_admin` (everything), `support` (read plus impersonation, no billing changes).
- Shop: `owner` (all entitled modules, users, settings, profit visibility), `manager` (operations and reports, no user or subscription management), `cashier` (sell, receive payments, look up stock; no cost prices, no profit, discounts capped).
- Enforce as named permissions in API middleware, combined with module entitlement checks. UI hiding is not enforcement.

## Invoice templates

Templates are block-based, not freeform canvas: page setup (A4, A5, 80mm), header block (logo, shop details), customer block, items table with column configuration (visibility, order, labels), totals block with tax breakdown options, footer block (terms, signature), and styling (accent color, font from an approved list, alignment). Shops can hold multiple templates and set a default per document type (invoice, receipt, statement). System default designs are themselves templates, so the builder and defaults share one pipeline.

## API and frontend conventions

- REST under `/api/v1` (shop) and `/api/admin/v1` (platform); plural nouns; error envelope `{ error: { code, message, details } }`; pagination `?page=&limit=` (default 20, max 100); date-range filters on transactional lists.
- All user-facing strings through i18n keys from the first screen (English now, Urdu later); layouts RTL-safe.
- Billing screen is keyboard-first: focused search, barcode scanners as keyboard input, Enter adds the line, visible shortcuts for unit switch, payment, and finalize.
- Every query renders loading, error with retry, and empty states.

## Testing requirements

Unit tests before done for: money math, unit conversion math, tax math (inclusive and exclusive, multi-tax lines, rounding), stock behavior, khata and account balance logic, payment allocation, permission checks, and entitlement blocking (a disabled module's endpoints return the correct error). Integration tests cover finalize-sale, receive-payment with bulk allocation, and vendor payment end to end against mongodb-memory-server in replica set mode.

## Out of scope for v1

FBR POS integration, automated gateway billing for subscriptions (manual activation at launch; PayFast or Safepay later), online storefront, offline mode, multi-branch, SMS or WhatsApp automation, accounting exports, owner mobile app (roadmap). If a change drifts into these, flag it instead of building it.
