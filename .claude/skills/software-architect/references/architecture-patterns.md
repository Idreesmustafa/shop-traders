# Architecture patterns

Read this before designing a new system, module, or schema, or when a feature touches money, stock, ledgers, tenancy, idempotency, jobs, or offline behavior.

## Contents

1. Default architecture: the modular monolith
2. Layering inside a module
3. Module boundaries
4. Data modeling rules
5. The ledger pattern (money and stock)
6. Concurrency and transactions
7. Idempotency
8. Multi-tenancy
9. API design
10. Background jobs
11. Caching
12. Offline strategy for mobile
13. Environments, backups, and operations
14. When to say no to complexity

## 1. Default architecture: the modular monolith

For small teams and small-to-medium products, the default is one deployable API application organized into well-separated internal modules, one web frontend, and optionally one mobile app, all sharing types through a shared package.

Microservices solve organizational problems (many teams shipping independently) at the cost of enormous operational complexity: distributed transactions, network failure handling, deployment orchestration, observability. A solo developer or small team gets all of the cost and none of the benefit. Do not propose microservices unless there is a concrete, current problem a monolith cannot solve. Good module boundaries inside a monolith preserve the option to split later, which is almost never needed.

Recommended repository layout (monorepo, pnpm workspaces):

```
project/
  apps/
    api/        Node.js + TypeScript + Express + Mongoose (MongoDB)
    web/        React + Vite + TypeScript
    mobile/     React Native (Expo) + TypeScript
  packages/
    shared/     zod schemas, shared types, money and date utilities
  CLAUDE.md
```

## 2. Layering inside a module

Each API module follows the same three layers, with dependencies pointing in one direction only:

- **Routes** parse and validate input, call one service method, shape the HTTP response. No business logic, no database access.
- **Services** contain the business logic and rules. They orchestrate repositories, enforce invariants, and own transactions. This is the only layer with domain decisions in it.
- **Repositories** perform data access (Mongoose calls and aggregation pipelines). No business decisions, no HTTP concepts.

The payoff: business rules live in exactly one findable place, services are testable without HTTP, and swapping storage details never touches logic. If a route file contains an `if` about business rules, or a repository decides whether something is allowed, the layering has broken.

## 3. Module boundaries

Organize the API by domain, not by technical role. `modules/sales/` containing its own routes, service, repository, and schemas beats global `controllers/`, `services/`, `models/` folders, because everything about a feature lives together.

Boundary rules:

- A module may call another module's **service**. It may never query another module's tables directly.
- Exactly one module owns each table. If two modules both write `stock_movements`, ownership is unclear and bugs follow. Instead, one module owns the write and exposes a service method.
- Shared pure utilities (money formatting, date handling, validation schemas) live in `packages/shared`, not copied into each app.

## 4. Data modeling rules

- **Primary keys**: MongoDB ObjectIds are fine (time-ordered); expose them as strings in the API and validate incoming ids.
- **Money**: integer paisa in 64-bit-safe integer fields suffixed `Paisa` (`totalPaisa`), so a reader can never confuse units. All arithmetic in integers; division (discount splits, tax) uses explicit rounding rules decided once and documented.
- **Quantities**: Decimal128 with a fixed three-decimal discipline for weighable or fractional goods; integers otherwise. Never JavaScript floats; convert Decimal128 at the repository boundary.
- **Timestamps**: BSON dates stored in UTC, converted to the shop's timezone only for display. Every document gets `createdAt`; mutable documents get `updatedAt` (Mongoose timestamps).
- **Deletion**: reference data (products, parties) is soft-deleted with `deletedAt` so history keeps pointing at real documents. Transactional and financial data is never deleted at all; see the ledger pattern.
- **Enums**: string enums validated with zod at the boundary and enforced again with `enum` in the Mongoose schema.
- **Embedding versus referencing**: embed what lives and dies with its parent (a sale's line items inside the sale document); reference what is shared (party, product) by id; never embed unbounded growth (a party's ledger entries are their own collection).
- **Referential integrity is application-level**: MongoDB will not enforce it, so services verify that referenced ids exist and belong to the same shop before writing, and tests cover it.
- **Naming**: collections camelCase plural (`sales`, `stockMovements`), fields camelCase, booleans phrased as questions (`isActive`).

## 5. The ledger pattern (money and stock)

Any quantity that must be trusted over time (customer credit balances, cash, stock on hand) is stored as an **append-only ledger of movements**, not as a mutable number that code adds to and subtracts from.

Why: a mutable balance that turns out wrong is unexplainable and unfixable, because the history of how it got there does not exist. A ledger is self-auditing: the balance is the sum of its entries, every entry says who, when, why, and what it references, and any past balance can be reconstructed.

Rules:

- Entries are immutable: inserted once, never updated, never deleted.
- Corrections are new **reversing entries** referencing the original (a return references its sale, a payment reversal references the payment).
- The true balance is `SUM(entries)`. For performance, keep a cached balance column (`parties.balancePaisa`, `products.currentStock`) updated **in the same transaction** that inserts the entry, and provide a reconciliation job or script that recomputes cached values from the ledger and reports drift.
- Every entry carries: what it belongs to (party, product), signed amount or quantity, a type (`sale`, `payment`, `purchase`, `adjustment`, `return`, `opening_balance`), a reference to the source document, the acting user, and a timestamp.
- Manual corrections are `adjustment` entries with a required reason field, never edits.

This one pattern is the difference between a system a shop owner can trust with their money and one they quietly abandon.

## 6. Concurrency and transactions

- Every multi-write operation (finalize a sale: invoice plus stock movements plus ledger entry plus cache updates) runs in **one MongoDB transaction** via a session, with every read and write inside passing `{ session }`. Partial success is worse than failure. Transactions require a replica set; MongoDB Atlas runs one on every tier, and local development uses a single-node replica set or mongodb-memory-server.
- Guard stock against races with an atomic conditional update inside the transaction:
  `Product.findOneAndUpdate({ _id, shopId, currentStock: { $gte: qty } }, { $inc: { currentStock: -qty } }, { session })`
  and treat a null result as "insufficient stock". Two cashiers selling the last unit simultaneously must not both succeed.
- Keep transactions short: no external API calls, no file I/O, no user waiting inside a transaction.
- Sequential document numbers (invoice numbers) come from a per-shop counter document, incremented with `findOneAndUpdate` and `$inc` inside the same transaction, so numbers are gapless per shop and never collide.

## 7. Idempotency

Any endpoint that creates a financial record (sale, payment) accepts a client-generated `idempotency_key` (UUID), stored with a unique constraint. If a request retries after a timeout (very common on shop internet connections), the server detects the duplicate key and returns the original result instead of double-billing. This is a small amount of code and a large amount of trust.

## 8. Multi-tenancy

Even when building for one client with one shop, put `shopId` on every business document and scope every query by it from day one. The cost now is one field and one filter discipline; the cost of retrofitting tenancy later is a rewrite. It also cleanly supports the likely future request of "the client opened a second branch". Resolve `shopId` server-side from the authenticated user, never from client input.

## 9. API design

- REST, versioned under `/api/v1`, plural nouns (`/api/v1/sales`, `/api/v1/parties/:id/ledger`).
- One consistent error envelope everywhere: `{ "error": { "code": "INSUFFICIENT_STOCK", "message": "...", "details": {} } }` with correct HTTP status codes. Machine-readable `code`, human-readable `message`.
- List endpoints paginate from the first day (`?page=&limit=`, capped limit) and support the filters reports will need (date range, party, status).
- Endpoints that change state are POST/PATCH, take their full input in the body, and return the created or updated resource.

## 10. Background jobs

Start with none. Add a job queue (BullMQ + Redis) only when a real need appears: sending SMS reminders, nightly reconciliation, report generation that exceeds request timeouts. A daily cron hitting an internal endpoint is often enough. Every job must be safe to run twice, because queues retry.

## 11. Caching

Do not add caching until a measured performance problem exists. MongoDB with correct indexes serves a shop's query volume without help. Premature caching adds the hardest bug class (stale data) for no benefit. Indexes to add from the start: `{ shopId: 1, createdAt: -1 }` on transactional collections, the unique keys, and the fields reports filter by.

## 12. Offline strategy for mobile

Offline support is a ladder. Climb only as far as the requirement demands, because each rung multiplies complexity:

1. **Online-only with graceful failure**: clear "no connection" states, automatic retry, no data loss on submit (the request is preserved and retried). Right default for an owner's companion app.
2. **Read cache plus write outbox**: recently fetched data is readable offline; writes queue locally in an outbox and sync in order when connectivity returns, using the idempotency keys from section 7. Handles the common "internet dropped for an hour" case.
3. **Full offline-first sync engine**: conflict resolution, sync protocol or CRDTs. This is a project-sized commitment. Only choose it when the business genuinely operates offline for long periods, and say so in the estimate.

State clearly in any plan which rung is being built, so nobody assumes rung 3 while paying for rung 1.

## 13. Environments, backups, and operations

- Three environments: local, staging, production. The client demos on staging; nobody develops on production.
- Automated daily database backups from the first week of production, kept off the server, with a **tested** restore procedure. An untested backup is a hope, not a backup.
- Structured logs with a request id on every line, so one failing request can be traced end to end.
- A `/health` endpoint checking database connectivity, for uptime monitoring.
- Deploys are scripted and repeatable (even if simple), never a series of manual server edits.

## 14. When to say no to complexity

Recognize and push back on these, briefly and with a reason:

- Microservices, Kubernetes, or event sourcing for a small-team application: operational cost with no current benefit.
- GraphQL when the team is small and the clients are known: REST plus shared TypeScript types delivers the same safety with far less machinery.
- A second database or a message broker "for scale" before any scale exists.
- Building configuration systems for hypothetical future requirements. Build for the requirement in front of you; keep the code clean enough that the future is cheap when it becomes the present.
