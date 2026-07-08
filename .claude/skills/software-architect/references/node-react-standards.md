# Node.js, TypeScript, and React standards

Read this before writing or reviewing backend or frontend code. These conventions exist so every file in the codebase looks like it was written by the same careful person.

## Contents

1. TypeScript configuration and rules
2. Backend project structure
3. Validation with zod
4. Error handling
5. Authentication and authorization
6. MongoDB and Mongoose conventions
7. Configuration and secrets
8. Logging
9. Security middleware
10. Testing
11. React web standards
12. React Native (Expo) standards
13. Git and commit conventions

## 1. TypeScript configuration and rules

- `strict: true` always, plus `noUncheckedIndexedAccess: true` and `noImplicitOverride: true`. These settings catch the bug classes TypeScript exists to catch.
- No `any`. At true unknown boundaries (request bodies, third-party responses, JSON parsing) use `unknown` and narrow through zod validation immediately.
- Prefer `type` for data shapes, `interface` only when declaration merging is genuinely needed.
- Model states that cannot coexist as discriminated unions, not booleans: `{ status: 'paid' } | { status: 'credit'; due_paisa: number }` makes illegal states unrepresentable.
- Functions that can fail in expected ways return typed results or throw typed errors deliberately; never return `null` to mean "something went wrong" without documenting it.
- Name for meaning: `remainingCreditPaisa`, not `amt2`. Abbreviations only when universal (`id`, `url`).

## 2. Backend project structure

```
apps/api/src/
  modules/
    sales/
      sales.routes.ts      route definitions, validation wiring, thin handlers
      sales.service.ts     business logic, transactions, invariants
      sales.repo.ts        database access only (Mongoose)
      sales.model.ts       Mongoose schemas and models for this module's collections
      sales.schemas.ts     zod schemas for this module's inputs and outputs
    inventory/ ...
    khata/ ...
  lib/
    db.ts                  cached Mongoose connection (serverless-safe)
    errors.ts              AppError class and error codes
    auth.ts                token verification, requireAuth, requirePermission
    config.ts              zod-validated environment configuration
    logger.ts              pino logger factory
  app.ts                   express app assembly, middleware order
  server.ts                startup, port binding, graceful shutdown
```

Rules that keep this healthy:

- Route handlers are under ~15 lines: validate, call one service method, respond. Anything longer means logic is leaking into the wrong layer.
- Services never import express types. They take typed arguments and return typed results, which is what makes them unit-testable.
- One cached database connection for the whole app, exported from `lib/db.ts` and reused across serverless invocations.

## 3. Validation with zod

- Every endpoint's body, params, and query are parsed with a zod schema before the handler logic runs. Use a small `validate(schema)` middleware so the pattern is uniform.
- Schemas shared between backend and frontend (forms mirror API inputs) live in `packages/shared` and are imported by both. One definition, both sides agree forever.
- Validate environment configuration with zod at startup (see section 7).
- Derive TypeScript types from schemas (`z.infer<typeof createSaleSchema>`), never write the type twice by hand.

## 4. Error handling

- One `AppError` class carrying `code` (machine-readable, e.g. `INSUFFICIENT_STOCK`), `httpStatus`, `message`, and optional `details`.
- One central express error-handling middleware, registered last, converts `AppError` to the standard envelope `{ error: { code, message, details } }`, converts zod errors to `VALIDATION_ERROR` with field details, and converts unknown errors to a logged 500 with a generic message. Internal stack traces never reach the client.
- Async route handlers are wrapped (a tiny `asyncHandler` or express 5 native support) so rejected promises reach the error middleware instead of crashing the process.
- Never catch-and-continue silently. Catch only to add context, translate to `AppError`, or genuinely recover.

## 5. Authentication and authorization

- Passwords hashed with argon2id (or bcrypt with cost 12 or more). Never any homemade scheme, never reversible storage.
- Short-lived JWT access tokens (around 15 minutes) plus rotating refresh tokens stored server-side so sessions can be revoked. Web keeps tokens in httpOnly, secure, sameSite cookies; mobile keeps them in the platform secure store. Tokens never go in localStorage.
- Permission checks are middleware on every protected route: `requireAuth`, then `requirePermission('sales.create')`. Define permissions as named capabilities grouped into roles, not role-name string checks scattered through handlers.
- The server derives the acting user and shop from the verified token, never from the request body.
- Rate-limit authentication endpoints; return the same error for wrong email and wrong password.

## 6. MongoDB and Mongoose conventions

- One cached connection in `lib/db.ts`, created once and reused across serverless invocations (module-scope cache guarded by a promise); never connect per request, never per query.
- Each module defines its Mongoose schemas and models in its own `*.model.ts` with `strict: true`, field-level `required` and `enum`, and its indexes declared in the schema, including unique and compound indexes (`schema.index({ shopId: 1, code: 1 }, { unique: true })`) and the idempotency-key unique index. Verify indexes with a startup check or script; do not silently rely on autoIndex in production.
- zod at the API boundary remains the single source of input validation; Mongoose validation is the storage safety net, not a replacement.
- Transactions: any multi-document write runs inside `session.withTransaction`, and every operation in it passes `{ session }` explicitly. Passing the session through service and repository methods is a required pattern, not an optional one.
- Reports use aggregation pipelines kept inside repositories with a comment per stage; never `$where` or server-side JavaScript execution.
- Data reshaping and index changes ship as version-controlled migration scripts (for example migrate-mongo) executed on deploy; never ad hoc edits against a live database, and never rewrite an applied script.
- Validate incoming ids (`z.string().refine(isValidObjectId)`) and scope every query by `shopId`; a query without a shop filter is a bug even when the id looks unique.

## 7. Configuration and secrets

- All configuration through environment variables, parsed and validated by a zod schema in `lib/config.ts` at startup. A missing or malformed variable fails startup with a message naming the variable, instead of failing at 9 pm in front of the client.
- `.env` for local development, gitignored; `.env.example` committed with every key and a comment, no real values.
- No secrets in code, in git history, or in log output.

## 8. Logging

- pino, JSON output. Every request gets a request id (middleware) included in all its log lines, so one failing request can be traced end to end.
- Log levels mean something: `error` requires action, `warn` is suspicious, `info` is business events (sale finalized, payment received), `debug` is development detail.
- Never log passwords, tokens, or full request bodies of sensitive endpoints.

## 9. Security middleware

Baseline for every express app, in this order: `helmet` for headers, CORS with an explicit origin allowlist (never `*` with credentials), a JSON body limit (for example 1 MB), rate limiting on auth and other abuse-prone endpoints, then routes, then the error handler. Driver-level query building avoids injection (never `$where`, never queries assembled from raw user strings); React escaping covers most XSS; never use `dangerouslySetInnerHTML` with user content.

## 10. Testing

- Vitest for unit tests, Supertest against the express app for integration tests.
- Priority order for coverage, highest value first: money arithmetic (totals, discounts, tax, rounding), ledger and stock invariants (balances after sequences of operations, insufficient-stock rejection, reversal correctness), permission enforcement (the cashier cannot call owner endpoints), then general endpoint happy paths and validation failures.
- Business logic tests call services directly against mongodb-memory-server in replica set mode (so transactions work); they do not need HTTP.
- Test names state the rule: `rejects sale when stock is insufficient`, not `test sale 2`.
- Aim for meaningful coverage of the paths that lose money or trust when wrong, not a percentage target. A build that fails on test failure (CI or a local pre-push script) is required equipment.

## 11. React web standards

- Vite + React + TypeScript. Feature-based folders mirroring backend modules: `features/sales/`, `features/khata/`, each with its components, hooks, and queries together.
- **Server state belongs to TanStack Query**: all reads and mutations of API data go through `useQuery`/`useMutation` with stable query keys and targeted invalidation after mutations. Never copy server data into local state stores; that creates two sources of truth and the stale-data bugs that follow.
- Local UI state uses `useState`; small cross-cutting client state (current user, UI preferences) can use one light Zustand store. If a Redux-sized architecture feels necessary, the server state is probably in the wrong place.
- Forms use react-hook-form with `zodResolver`, importing the same schemas from `packages/shared` that the API validates with.
- Components stay presentational; anything with logic worth testing moves into a custom hook. A component pushing past ~150 lines is asking to be split.
- Every `useQuery` renders all three states: loading, error (with a retry action), and empty. A blank screen on failure is a bug.
- Routing with react-router; route guards check auth and permission, and the UI hides what the role cannot use, while remembering the server check is the real enforcement.
- Styling with Tailwind, consistently: spacing and colors from the theme scale, shared `Button`/`Input`/`Modal` components instead of restyled one-offs.
- Every user-facing string goes through i18n (react-i18next) keys from the first component, even when launching English-only. Retrofitting translation keys into a finished app is misery; adding a language to a keyed app is a table of strings. Keep layouts direction-safe for future RTL (Urdu).

## 12. React Native (Expo) standards

- Expo with TypeScript and expo-router. Reuse `packages/shared` schemas and types; keep one API client wrapper shared in structure with the web app.
- Tokens in `expo-secure-store`, never AsyncStorage.
- Handle the offline reality explicitly per the offline ladder in `architecture-patterns.md`: at minimum, detect connectivity, queue or clearly fail writes, and never lose user-entered data because a request failed.
- Keep screens thin the same way web components are kept thin; shared business logic lives in hooks or shared packages, not duplicated per platform.

## 13. Git and commit conventions

- Conventional commits: `feat(sales): add credit sale flow`, `fix(khata): correct rounding on partial payment`. Small commits, each leaving the app working.
- Branches per feature (`feat/pos-billing`); `main` always deployable.
- Never commit `.env`, credentials, `node_modules`, or generated artifacts; maintain `.gitignore` from day one.
- Before any commit: tests pass, linter passes, type check passes. Wire this into a pre-push hook or CI so it does not depend on memory.
