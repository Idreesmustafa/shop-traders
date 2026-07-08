# Review checklist

Walk this against the actual diff before presenting any completed work, and whenever explicitly asked to review code. Check the diff, not memory of the diff. Report failures honestly; a caught issue costs minutes, a shipped one costs trust.

## Correctness

- The change does what the requirement asked, and nothing extra crept in.
- Edge cases are handled: empty lists, zero and negative amounts, missing optional fields, first-run states, maximum sizes.
- Boundary math is right: off-by-one in pagination, date range inclusivity, rounding direction on splits and taxes.
- Concurrent use cannot corrupt state: simultaneous sales of the same stock, double-submitted forms, retried requests.

## Data integrity

- Money is integer minor units end to end; no float arithmetic anywhere in the path.
- Multi-row writes are inside a single transaction, and every query inside uses the transaction client.
- Ledger rules hold: entries append-only, corrections are reversing entries, cached balances updated in the same transaction as their entries.
- Schema changes are a new migration; no applied migration was edited; the migration runs from a clean database.
- Deletion policy respected: soft delete for reference data, no delete for financial data.

## Security

- Input validated with a schema before any logic; nothing trusts the client.
- Every new or changed route has `requireAuth` and the correct permission check.
- No secrets, tokens, or credentials in code, logs, or committed files.
- User and shop identity come from the verified token, not from request input.
- No raw SQL built by string interpolation; no `dangerouslySetInnerHTML` with user content.

## Errors and failure paths

- Every await and every external call has a defined failure behavior; nothing rejects into the void.
- Errors surface as the standard envelope with a correct status code and a machine-readable code.
- No empty catch blocks; no catch that logs and continues past a broken invariant.
- User-facing failure states exist in the UI: error with retry, not a blank screen or infinite spinner.

## Readability and design

- Names say what things are; a reader needs no tour guide.
- Business logic sits in services, not in route handlers or React components.
- No premature abstraction added; no third-time duplication left unextracted.
- Dead code, commented-out blocks, debug logging, and stray TODOs removed (or the TODO is deliberate and mentioned in handover).
- The diff is the minimal set of changes for the task; unrelated reformatting or drive-by edits are separated out.

## Tests

- Money math, ledger and stock behavior, and permission checks introduced or changed by this diff have tests.
- Tests assert behavior and rules, not implementation details; names read as specifications.
- The failure cases are tested, not only the happy path.
- The full test suite, linter, and type check were actually run and pass. If any could not be run, that is stated plainly in the handover.

## Frontend specifics

- Server data flows through TanStack Query with sensible keys and invalidation; none of it is copied into local stores.
- Forms validate with the shared schema and show field-level errors.
- Loading, error, and empty states render for every query on the changed screens.
- New user-facing strings went through i18n keys; layouts survive longer text.

## Handover

- The summary states what changed, key decisions, what was tested, and known limitations.
- Documentation touched by the change (README commands, env examples, API notes) is updated.
- Follow-up work is listed explicitly rather than left to be discovered.
