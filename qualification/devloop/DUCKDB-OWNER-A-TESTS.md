# Candidate A semantic gate contract

Status: prospective, unexecuted. Product bytes remain at the independently
verified local source checkpoint `ca2dd6d321aaf4e479bfe31eb3e0b0163309cbad`.
This prepares the first candidate in [the owner wave](DUCKDB-OWNER-WAVE1.md);
it does not implement or qualify it. The test-only [golden oracle](recipes/duckdb-owner-a-semantic-oracle.json)
uses existing Triplex values, transaction receipts, temporal bases and Datalog.
No public schema DSL, commit-position input or response shape is added.

## Exact implementation boundary awaiting grant

Only an explicitly selected Duck `readScopePlan:"combined"` supplies the optional
internal read-scope callback. Core invokes it for `queryAll` with
`includeBasis:true`. Duck's existing same-bundle private transaction context lets
the inner snapshot reuse that transaction. Existing compiler, parameter binding,
type-domain queries, row ownership and C++ activation remain intact. Default
Duck, non-Duck, direct standalone executor and page/cursor flows are controls.

The callback must preserve the Effect environment and typed failure cause; it
must not detach the caller's fiber through a new `runPromise`. Capture the public
clock and resolve V/R before requesting the scope. Capture actual P exactly once
inside it. The outer scope performs transaction/ACK/error mapping without adding
another invocation timer. Keep the existing executor's30s guard at its current
work boundary; retain the external request deadline. Naively wrapping the whole
scope in the already timed `snapshot` function would change that boundary.
Acquisition masking remains a known separate cancellation issue. In particular,
moving P acquisition into the masked outer transaction can defer caller
interruption compared with today's separate metadata read, even with unchanged
numeric deadlines. Record that observable difference, not only physical drain.

Owning code at this checkpoint: `core/src/store/TriplesLive.ts:688`,
`core/src/Temporal.ts:39`, `core/src/storage/QueryExecutor.ts:115`,
`duckdb/src/query-executor-adapter.ts:57`, `:74`, `:153`,
`duckdb/src/effect-storage.ts:103`, `:118`, and
`duckdb/src/public-backend.mjs:746`. Prefix these paths with `packages/`.

## Tests to author against the implementation

| Gate | Independent oracle or failure witness |
| --- | --- |
| Core hook selected only for opted-in `queryAll/includeBasis` | A controlled executor records hook calls; missing hook, `includeBasis:false`, default Duck and every page/cursor call retain the old flow and response shape. |
| Clock before acquisition; P inside | A phase-controlled unit fake advances clock after scope request and position before acquisition. Response V uses the first clock; P and SQL use the position captured after acquisition. Exactly one clock/P capture; no post-answer reread. Do not use this test barrier in a timing diagnostic. |
| Effect environment and original failure | Caller-only dependency remains available inside the callback; typed validation/domain/row errors retain their causes. No detached fiber or leaked private token. |
| Nine public golden temporal/value cases | Seed three actual acknowledged receipts at the oracle's controlled fractional times; compare explicit rows and complete returned scope/P/V/R. Historical R remains independent of current P. |
| Existing internal earlier cut | Direct executor at P1 on the P3 file returns old rows; P3 with earlier R does too. This does not expand public cut support. |
| One physical acknowledged scope | A normal eligible read has one BEGIN, one in-scope P select, unchanged SQL and one complete post-transaction activation. Source spans distinguish wrapping from actual native callbacks. |
| Writer before and after acquisition | Coordinate by accepted queue/phase events, without sleeps. Compare rows to the model at each returned P; require every acknowledged command reconciled. P may differ between separate and combined profiles under a race, so compare each against its own cut. |
| Existing write-overlay nesting | A read inside a caller's same-bundle transaction observes its existing overlay; a later rollback removes it. The basis alone does not serialize an uncommitted overlay. |
| Foreign bundle token | Query service from B within A's physical transaction must fail before B's native SQL and never queue behind itself. An uncaught refusal must roll A back. Current code permits A to commit its own valid work if the caller catches the preflight refusal: foreign-owner branches do not set A's poison marker. Record that baseline distinction; any caught-foreign poisoning hardening is a separately approved change. |
| Caught nested error | A caught nested read/row failure still poisons the enclosing physical transaction; it cannot commit an apparent success. |
| Row ownership and delayed ACK | Inject malformed row, then hold/reject COMMIT or ownership activation in a test port. No rows/basis become public success before successful ACK plus complete activation. |
| Unknown BEGIN/COMMIT/rollback | Existing fencing and cleanup failure remain visible; no healthy reuse inferred from a caller error. Preserve raw phase/outcome and do not silently retry. |
| Reopen and other consumer interference | Close/reopen the same owned file, compare golden latest/history, then run existing foreign/native/catalog integrity negative checks. No removed or cached audit is permitted in A. |
| Active timeout and cancellation | Actual owned long query requests the native interrupt; await statement settlement, rollback/activation and healthy subsequent read. Distinguish caller settlement, interrupt request and proven physical drain. |
| Queued cancellation | Retain the already observed accepted metadata work after caller cancellation as a separate failure reproducer. A must not claim withdrawal unless that separate job implements and proves it. |

The unchanged SDK48 and common142 expectations are mandatory on the exact
candidate source/preimages. Relevant core type/consumer and required package
checks cover the optional SPI. No C++ recompilation is needed unless C++ bytes
actually change. Independent review must bind actual raw rows, source/build
identities and terminal/output anchors; an authored shape/unit check is not a
public/native pass.

## Stop and comparison rules

Stop A on any row/cut/clock mismatch; an audit omitted or reordered past public
success; foreign native SQL accepted; same-owner poisoned work committed; unacknowledged
cleanup/fencing hidden; a leaked owner/session; unproven native drain; source,
oracle or resource drift; or a resource/disk/120s diagnostic envelope breach.
Keep the first failure and its source preimages. Diagnose before another attempt;
do not add B's epoch reuse, C's cheaper audit or queued withdrawal as a repair
inside A's one-variable comparison.

After semantic gates, rerun the exact bounded stage observer/oracle with one
thread,128,000,000-byte memory,64,000,000-byte spill,30s request deadlines,
2GiB/2CPU aggregate reservation and120s envelope. Record `includeBasis` and
`readScopePlan` in actual profile identity. Count normal reads and the explicitly
cancelled request separately. A reduced activation count is mechanism evidence,
not throughput, writer-floor or physical-cancellation acceptance.

Only a later predeclared matched-cohort load with fixed writer floor, adequate
tails/repeats, independently correct returned cuts and resource compliance can
support promotion. The small strict16RPS diagnostics currently fail on all three
Datalog foundations. No candidate/default/page/scale improvement is promised.
