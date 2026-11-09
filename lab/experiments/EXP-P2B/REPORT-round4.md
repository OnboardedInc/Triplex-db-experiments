# EXP-P2B round 4: publication-gated duplicates and bounded reader resources

North star: correctness of P1 exact logical pins, P2 idempotent original receipts
and P3 ordered resume. Authority: `lab/SCOPE.md`, `lab/NORTH-STAR.md`,
`lab/TARGETS.md`. This round performs no latency tuning or P2 measurement;
R44 moves that work into the VM. No engine, slot or acceptance file was touched.

## Result

**F1 and F2 fixes implemented; builder correctness checks pass.** Public duplicate
resolution now waits for a published, readable original receipt or refuses with
a typed deadline. Logical reader pins retain no SQL transaction between requests;
WAL admission has an explicit configurable bound and known refusals remain
retryable after maintenance.

The real ten-minute test completed **2,827 writes and 2,827 exact pinned reads in
600.006 seconds**, with **2,027,072 bytes (1.93 MiB) peak WAL** under a **32 MiB**
configured cap. The final source-bound gate completed **24 broker + 48 XTDB + 81
QLever + 9 reviewer-derived regressions = 162 tests**. No P2 latency result is
claimed.

This is builder evidence. It does not replace independent review or qualify a
live XTDB/VM composition, year-one scale, physical power loss or root-package
release readiness.

## Reviewer reproductions and F1

Review source: `verify/P2B` commit `171c71ed`, `VERIFY.md` and `review.test.ts`.
The original three probe files were copied into this worktree's `lab/verify/P2B/`;
unaltered copies are retained in durable `round4/review-original/`. Only evidence
ownership was changed before the baseline run. The copied original six schedules
completed on the old candidate (`baseline2.log`), including the positive defect
witnesses. Their success meant the defects reproduced, not correctness acceptance.
The first setup attempt could not resolve the public core package from the root;
an owned local dependency link fixed resolution. The failure is retained.

Public `HostBroker.claimAsync` now returns a found claim only when its position
is at or below the **published shared watermark**. It waits asynchronously, with
a default **2,000 ms** deadline covering lookup and publication. Expiry returns
`DuplicatePublicationTimeout`, a `WriteError` subclass with reason
`duplicate-publication-timeout`. `duplicateWaitMs` configures that public adapter
deadline. The adapter preserves this typed error instead of wrapping it.

The decision loop still calls `HostLog.claimAsync` directly for staged conflict
checks. Gating that internal lookup would wait for its own group to publish.
Ordinary lost-ACK operation replay and published command resolution keep their
original receipt, positions and stamp, including after reopen.

The corrected review schedule holds the real append-completion callback after
SQLite has committed. A direct claim and a public retry with a short deadline
refuse typed; a normal retry stays pending while broker head is zero. After the
original callback is released, the duplicate error names the original transaction
and its journal is immediately readable through `Triples.transaction(id)`.

## F2: a pin is a position, not a retained SQLite snapshot

`BrokerReadService` no longer starts an explicit read transaction. A completed
single-row marker probe retains no snapshot across JavaScript execution. The
eligibility marker and selected rows are then returned by **one native SQL
statement**, so they share its statement snapshot. `all()` finishes and releases
that snapshot before row parsing, predicates or caller code runs. There is no
iterator/callback holding a native statement across user scheduling. The old
reviewer's pause immediately after the marker `get()` therefore holds no SQLite
read transaction: checkpoints complete while that worker remains paused.

Each operation selects at most 4,097 candidate rows to detect an exceeded
**4,096-row** result limit. Results over **8 MiB** or operations whose observed
elapsed time exceeds **250 ms** refuse with `ReadOperationLimit` (reason
`read-operation-limit`); the caller can retry the same position. These are
post-operation result/elapsed checks, **not preemptive interruption of SQLite or
an OS scheduling guarantee**. The native call materializes its selected rows
before the byte check. No hard heap/RSS bound or hard real-time query deadline is
claimed. WAL admission below protects storage even if a native reader is
arbitrarily descheduled.

H1 still reads current and retired rows by assertion/retirement position. A
logical lease holds the retirement horizon; it holds no SQLite transaction.
After a lease is released and H1 retirement is purged, this branch's retained
`recent_rows` remains the complete source history and reconstructs the exact old
position with the existing temporal mask. No HS01 schema or branch was imported.
When HS01 removes that duplicate table, it must provide retained history that is
not deleted by H1 purge; indexed entity/id and assertion/retirement-position
selection; atomic marker-plus-rows statement reads; and bounded/pageable source
fallback and recovery. Its codec must preserve exact row bytes/meaning. Simply
removing `recent_rows` while deleting retired rows would break these pins.

## WAL admission and checkpoint bounds

`maxWalBytes` defaults to **128 MiB**, configurable per broker/store. All writer
append, pin, unpin and purge requests reserve capacity before mutation. With
`cache_spill=OFF`, one transaction's dirty-page list writes at most one WAL frame
per database page. For current physical WAL size W, SQLite page size S and cap C,
the writer sets `max_page_count` no higher than:

`floor((C - W - 32) / (S + 24))`.

This reserves the WAL header and a frame header/page for **every database page**,
a conservative bound rather than a prediction of changed pages. If the existing
database cannot fit that reservation, the request signals maintenance and returns
typed `WalCapacityExceeded` before its body starts. If page allocation hits the
reservation inside the append body, it becomes the same known refusal only after
SQLite's transaction wrapper has rolled back, `inTransaction` is false, the body
never reached its COMMIT boundary and the source marker remains at the previous
LSN. Other write/COMMIT/I/O failures still fail-stop with outcome unknown.
Known refusals do not advance the broker/log position or poison the stream; a
caller can checkpoint and retry. They do not silently retry or return an ACK.

The bound assumes the broker is the only writer, its existing ownership rule;
independent **read-only** connections are covered. It does not reserve host disk
against other agents or qualify arbitrary external database mutations. The cap
also limits the database size that can be admitted by this conservative policy:
a store larger than its configured reserve cannot keep writing. A larger store
must explicitly provision a larger WAL budget; this is not a year-one capacity
qualification or a claim that the compact HS01 layout is implemented here.

Maintenance uses PASSIVE then **TRUNCATE** when eligible, so physical WAL
headroom is returned, rather than retaining a RESTART high-water file. SQLite's
checkpoint connection still has `busy_timeout=0`. Reader coordination waits at
most **20 ms** on the maintenance thread; active/blocked readers yield an
incomplete/busy result, not an unbounded retry loop or a wait on the decider.
The existing RPC deadline is **30 s**. Those bounds concern cooperative gate/
SQLite lock waiting and the RPC deadline when the event loop runs; native I/O,
fsync and OS suspension are not hard real-time bounded. Observed caller and
checkpoint durations are retained below. No bound is inferred from a fast sample.

The external-reader regression deliberately holds a real SQLite transaction,
then writes until admission refuses. It checks WAL bytes remain below 16 MiB,
checkpoint returns incomplete promptly, release permits a complete checkpoint,
and the exact refused operation can then commit. A separate 1 MiB reservation
forces a body allocation overflow and verifies no row/head escaped rollback and
a smaller subsequent write succeeds. The copied delayed-source schedule still
completes its 48 large writes, explicitly checkpointing/retrying a typed
admission refusal if its burst consumes the conservative reserve.

## Ten-minute pin and gates

Completed attempt:
`long-pin-29284db8-0724-4679-b6e0-6fbcf627304f`.

| Observation                                                   |                Actual result |
| ------------------------------------------------------------- | ---------------------------: |
| Real monotonic pin interval                                   |               600,006.300 ms |
| Continuing writes / exact pinned reads                        |                2,827 / 2,827 |
| Read operation refusals / WAL admission refusals in long test |                        0 / 0 |
| Peak sampled physical WAL / configured cap                    | 2,027,072 / 33,554,432 bytes |
| Maximum observed gap between continuing commits               |                   429.880 ms |
| Maximum observed checkpoint request duration                  |                    40.997 ms |
| Ordered feed commit positions, including seed                 |                        2,828 |
| Worker transaction state after every read                     |                        false |

The copied burst schedule's WAL samples were
13,076,912; 26,203,232; 39,354,272; 52,530,032; 65,705,792; 9,883,912 bytes.
After explicit checkpoint, WAL was zero while the source worker was still
paused; all 48 actual commits completed. This demonstrates a released native
snapshot and recovery of headroom, not a 64 MiB hard limit. The separate external
snapshot test admitted five large writes, refused the next with a known capacity
error, and retained **8,190,592 bytes** under its **16,777,216-byte** cap. After
reader release/checkpoint the refused operation committed at position 8192, after
previous head 7168. The allocation-overflow regression and row-limit regression
also passed without exposing a partial write or partial successful read.

The long test executes from frozen source/build copies. A worker opens its own
read-only connection; a logical pin remains held for at least **600 real
monotonic seconds**. Continuing writes retire/replace the same subject. Every
successful worker answer is compared byte-for-byte with the original masked
rows, and its row hash and `inTransaction:false` are recorded. Each write samples
physical WAL bytes and asserts the configured 32 MiB cap. Checkpoint and purge
run periodically; H1's horizon must remain at the logical pin. After release,
H1 becomes ineligible but persisted-source fallback must still reproduce the
original bytes. Final feed replay must match every actual commit position, in
order, and its cursor resumes without redelivery. Source/build hashes are checked
again before a completed result is written. A partial samples file is not success.

Final gate: `gates-249c8e3a-5801-483c-a182-4a565fd6c445`, selected by
`bound-gates-final.log`, with `unchanged:true` and `executionComplete:true`.
Its fresh fixture observations are
`review-2eef4e45-ed9c-491b-b86b-9db30270904f/observations.json`.
The gate checks actual expected counts and fixture/source/native hashes; its
completion marker is not contract acceptance.

All prior failures remain: initial core resolution setup; the first new WAL
fixture's missing dependency lookup and delayed-read cleanup rejection; a bound
gate refusing rebuilt declaration union reordering; and a second bound gate
refusing a copied config changed during its input window. The final gate kept
source/runtime JS/native inputs stable and treated rebuilt declarations as
outputs while still running their build/typechecks. See the
[evidence index](EVIDENCE-round4.md), [compact results](ROUND4-RESULTS.json),
[commands](COMMANDS-round4.md) and checksum manifests. Bulky evidence remains at
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round4/`.

## PASS audit

- **`HostBroker.claimAsync` and adapter duplicate resolution:** content is the
  actual claim/transaction identity; a positive result requires its position to
  be covered by the actual published prefix. Freshness is a new lookup and
  current watermark, bounded by this call's deadline. Binding is this broker,
  command ID and claim position; internal staged checks remain separate. The
  public regression immediately reads the named original receipt, checks the
  pending interval and exercises typed timeout rather than only checking a tag.
- **`BrokerReadService.readRows` / pin answers:** content is actual marker and
  row bytes from one SQL statement, masked at the requested position. Freshness
  is a fresh completed statement per operation, never a leased SQL snapshot.
  Binding checks the file's identity, epoch and published prefix plus the named
  basis. Row/byte/elapsed limits refuse rather than truncate a successful answer.
- **`walBudget` and known body rollback classification:** admission checks the
  current actual WAL size/page size/page count and sets the native page ceiling;
  cache spill is disabled. A body-overflow refusal additionally checks actual
  rollback state and unchanged source LSN before treating the command as
  definitely uncommitted. Freshness is per mutation. Binding is the writer's
  actual file/connection, configured cap, source LSN and serialized request.
  Regressions inspect missing rows, unchanged head, bounded WAL and recovery.
- **Checkpoint status:** outcomes come from the actual SQLite pragma result and
  tracked reader gate, from this call; they remain maintenance observations,
  never commit receipts. Binding is the same source/checkpointer and request.
  Incomplete/busy/error is not relabeled complete. Bounds above explicitly exclude
  uninterruptible I/O and OS scheduling.
- **Copied/adapted `review.test.ts` assertions and `note`:** content is actual
  hand-derived cuts, original transaction receipts, feed positions/cursors and
  WAL bytes. New UUID output directories and fresh brokers/workers establish
  freshness. File, watermark, operation/command/transaction IDs and controlled
  append/reader gates bind each observation. Original defect-witness assertions
  were changed into regressions; their retained originals are not called passes
  of the fix. Partial notes or a later failed test are not adopted as success.
- **`round4/long-pin.mjs` and `read-worker.mjs`:** each answer is compared with
  the actual saved original cut, every successful commit/pin and WAL sample is
  checked, and feed output must equal the complete actual position list. A new
  UUID attempt, real 600-second monotonic interval and newly created samples bind
  freshness. Frozen source/build hashes are saved and rechecked; the source file,
  worker module, watermark, cap and exact position bind the result. No live slot
  or acceptance claim is made.
- **Fixture retention:** only this round's completed fixture directories were
  selected after all owning test subprocesses exited. Actual before/after hashes,
  device and inode identity verify the atomic rename preserved each file.
  Freshness binds the cutoff before this round's first launch and the completed
  final gate; the retention map binds original and durable paths. This is byte
  preservation, not requalification of a moved database.
- **`round4/finalize.py` and `finalize-and-check.mjs`:** content checks every recorded read hash against the
  saved hand-derived seed, actual WAL/cap, monotonic sequences and full completed
  denominators. It re-hashes frozen inputs and the final gate's current inputs,
  requires its successful counts/binding, and checks the native proof against
  the actual source database inode/device. Freshness comes from this completed
  UUID long attempt and the final gate's newly created observation directory,
  never an earlier result. Binding includes result/log hashes, exact source,
  native file, fixture bytes, pin, cap and feed counts. Manifest generation hashes
  current regular files without following dependency-directory symlinks.
- **`round4/gates.mjs` and report/index:** actual subprocess exit, expected test
  counts and absence of unhandled test errors are required, alongside unchanged
  captured source/test/lock/native input hashes. UUID logs/preimages bind this
  execution; source assertions, not exit zero alone, supply semantic evidence.
  The report uses completed attempts; manifests hash actual retained bytes and
  confer no independent acceptance or historical power-loss proof.

## Limits and pin impact

No changed path is referenced by an acceptance pin: the old/new pinned-hash
list is empty and `lab/acceptance/` is unchanged. Final source old/new hashes are
listed in `SOURCE-CHANGES-round4.json`, without re-pinning the contract.
Scoped lint has **0 errors, 0 warnings**. Authored library/harness/test files pass
formatting; the copied CJS pause worker is deliberately retained verbatim and is
the one scoped formatter exception. The original unaltered fixture is retained
separately. Git whitespace checks and Python helper parsing passed. Test/build
logs retain their Vite/build warnings; no failures are suppressed.

Open work: independent review of both fixes; integration with HS01's compact
history/recovery layout and explicit larger-store capacity configuration; VM/P2
qualification under R44. The storage proof is conservative and the query limits
are post-operation checks, not hard OS-preemption, native-I/O or memory ceilings.

No latency tuning, VM measurement, engine/slot, live XTDB, physical power loss,
filesystem exhaustion, full root `pnpm check`, `pack:check`, year-one layout/scale
or independent promotion was performed. Existing internal log recovery still
needs HS01's bounded paging for large stores. No merge or push was made.
