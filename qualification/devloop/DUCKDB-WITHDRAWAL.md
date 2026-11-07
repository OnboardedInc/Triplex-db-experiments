# DuckDB queued-read withdrawal prerequisite

Status: frozen correctness contract; implementation is an unapplied scratch
draft. The base is local commit `ca2dd6d321aaf4e479bfe31eb3e0b0163309cbad`.
No candidate build or engine trial has run. Root selected this separate repair
before candidate A because moving basis capture into A's masked acquisition
could otherwise worsen caller cancellation. A/B/C owner-cost mechanisms remain
separate and no performance or default claim follows from this repair.

## Reproducer and expected change

The retained control is `duckdb-public-read-stages-v1/0001`, terminal SHA
`efccbbde64a67467e036b98a067788de991e4074111bb670346658e57f0e5009`.
Its [source-bound analysis](../evidence/duckdb-public-read-stages-v1-analysis.json)
and [independent review](../reviews/duckdb-final-combined-stage-independent.json)
show an explicitly cancelled queued caller returning after0.436ms. Its accepted
metadata transaction later acquires after1,529.403ms and spends104.913ms of
service, including0.539ms of native current-position SQL. The gap is subsequent
physical work for that cancelled ticket, not an inferred slow final SQL query.

Reuse the exact public-read fixture/oracle/observer after proving untouched
scope P2/R1000.25. The bounded recipe remains one current and one historical read,
then15 normal burst answers plus one explicitly requested cancellation. Cancel
only after observing that exact request genuinely queued. Do not manufacture a
barrier, cancel another active query or relabel an already acquiring request as
queued. If it acquired before cancellation, retain the race and classify the
queued part inconclusive. The [prospective oracle](recipes/duckdb-withdrawal-oracle.json)
does not count an unimplemented test as passing.

## Narrow ownership-preserving mechanism

Give each accepted backend operation an internal queue ticket with an atomic
JavaScript state transition: queued → acquiring → settled, or queued → withdrawn.
Withdrawal succeeds only in queued state and prevents that ticket's callback
from calling resource readback, BEGIN, SQL, COMMIT or ownership activation. Its
FIFO continuation may later run a pure skip; distinguish this from native work
and from removing the JavaScript promise-chain node. Close still drains that
chain. Do not skip validation for any actual physical transaction.

A private acknowledged `not_started` outcome confirms successful withdrawal;
it is not COMMIT or rollback acknowledgment. Once acquisition starts, withdrawal
returns false. The read adapter must then await the original acquisition result,
avoid running cancelled user work and use the unchanged failure/rollback/audit
protocol. Unknown BEGIN/rollback/COMMIT remains visible and fences as before.
Never return a fabricated rollback acknowledgment for work that may have begun.

Wire cancellation only through existing read/metadata entry paths. Standalone
read invocation passes its abort signal to queue admission. The Duck executor's
read snapshot uses a private read-transaction helper that restores acquisition
interruptibility and attempts ticket withdrawal on interruption. Ordinary write
`StorageAdapter.withTransaction` retains its existing masked acquisition/work/
ACK behavior. Same-bundle flat nesting, caught same-owner poisoning and current
caught-foreign refusal semantics are unchanged. No detached Effect fiber,
second owner, C++ rewrite, cached audit or read-scope combination is introduced.

An active `runRecords` continues to use the real owned connection interrupt.
Its statement/rollback/activation completion must be independently observed;
caller settlement and an interrupt request alone are insufficient. Metadata
already acquiring through standalone `invoke()` retains its existing distinct
behavior: the caller can return interrupted before its read/COMMIT/audit later
finishes. The backend FIFO drains it, but this is not caller-acknowledged drain
or general active-metadata cancellation. The acknowledged read-helper race
instead waits for rollback/audit. Neither path may interrupt another request.
No write is abandoned or replayed.

## Required gates and stop conditions

- Phase-controlled unit ports cover queued withdrawal before start, cancellation
  racing acquisition, already acquired work, close while skip nodes remain,
  repeated cancellation, initialization/closed rejection and subsequent healthy
  reuse. These are correctness barriers, not timing fixtures.
- Original-fiber Effect tests cover interruption before awaiting `started`,
  interruption after queue registration, acquired-before-cancel rollback/ACK,
  failure/unknown cleanup dominance, nested read reuse and unchanged write/
  foreign-context behavior. No extra public query/schema input is added.
- The real public queued reproducer must prove zero later native statements,
  BEGIN/COMMIT/activation attributable to a successfully withdrawn ticket;15
  other burst answers and the two sequential answers still match exact basis
  and rows, and P remains2. An inconclusive queue race requires a new bounded
  attempt, not a retrospectively rewritten outcome.
- Actual active-query interrupt, rollback/audit and healthy reuse, close/reopen,
  current SDK48/common142, relevant type/consumer checks and independent exact
  candidate review remain mandatory. C++ binaries stay unchanged unless source
  evidence requires a native change.

Stop on another request being interrupted, native work after confirmed queued
withdrawal, skipped audit for an actual transaction, early unacknowledged return,
hidden unknown/fenced state, abandoned/replayed write, changed row/cut behavior,
stale source/oracle/profile, leaked owner, unbounded drain or any resource breach.
Keep first failure/source preimages. Do not repair it by changing queue limits,
deadlines, memory, spill or threading, and do not bundle A/B/C into this attempt.

The actual bounded engine gate remains one thread,128,000,000-byte memory,
64,000,000-byte maximum spill,30s request deadlines, a120s diagnostic envelope
and2GiB/2CPU aggregate reservation. Mac RSS is a watchdog, not hard containment.
Draft authoring occurs only under owned experiment scratch while current
qualified `src/dist` stays intact. Integration/build/trials wait for root's
explicit scheduling after X's finite measurement window.
