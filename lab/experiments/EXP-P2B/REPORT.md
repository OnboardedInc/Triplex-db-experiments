# EXP-P2B — XTDB behind the broker

North star: P2 small atomic idempotent commits (10-fact diagnostic p50 ≤ 10 ms,
p99 ≤ 50 ms with 256 readers), P1 exact pinned reads, P3 ordered resumable feed.
Authority: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. Design:
Q58b/R23 §6, Q51b/c, Q58c, Q89/Q90c, Q96a–d and Q98j.

## Result and verification boundary

**Implementation delivered for adversarial review; offline gates complete.**
`gates-attempt12.log` built core/testkit/broker/QLever/XTDB, emitted declarations,
typechecked the affected backends and completed 48 XTDB driver/native/compiler/
route tests plus 80 QLever regression tests. Final focused source-bound broker
rebuilds (`broker-final-attempt2.log`) completed all 12 broker/storage tests;
`qlever-attempt2.log` repeated all 80 QLever regressions after the clock change.
This is builder execution evidence, not independent promotion. Raw logs are in
the durable directory named by `OFFLINE-INDEX.md`, with `OFFLINE-SHA256SUMS`.

A disk-floor refusal interrupted attempt 10 before any child ran. Own generated
dependency copies were replaced with read-only reuse of matching lab dependencies;
this recovered only about 48 MB and initially did not restore the 5 GiB floor.
Later host headroom recovered independently to 9.7 GiB and the final gates resumed.
No engine, source, dependency store or evidence was deleted to make a trial fit.
`pnpm check` and the full `pack:check` consumer were not run; the pack script now
includes the private broker tarball. These remain integration checks.

The final 10-second **memory** diagnostic ran 256 readers, accounted for 14/14
commits and checked 194,153 repository reads, with no reported content/receipt/
feed-order/resume/clock errors. Source and build hashes remained unchanged.
Its tiny sample does **not meet the provisional P2 latency bars**:

| Facts band | Commits | Offer-to-ACK p50 ms | p99 ms |
| ---------- | ------: | ------------------: | -----: |
| 5–10       |       9 |               45.94 |  82.45 |
| 11–25      |       2 |               70.96 |  70.96 |
| 26–50      |       3 |               34.30 |  41.74 |

Read p99 was 9.80 ms; directly written-subject durable feed lag p99 was 35.23 ms
(14 observations). Routes: 191,132 replica, 3,023 overlay, zero log fallback.
The seed emitted no duplicate commands in this short window; duplicates and lost
ACKs are exercised by the tests. Worker listener-count warnings were retained;
no claim of long-run memory stability is made.

No live XTDB run, exclusive slot, year-one population, maintenance overlap,
engine restart/stall, native engine conformance, Local/InMemory log comparison,
P2 latency acceptance or P3 acceptance is claimed. The exact live and full
conformance commands are in `COMMANDS.md`; evidence is indexed in `EVIDENCE.json`.

## Implementation

- New private `@triplex-build/triplex-broker` package holds the one shared durable
  decision loop, SQLite worker/log, codecs, persisted source rows, fencing and feed.
  It imports core public exports and has no engine dependency. QLever's existing
  public factory and internal module paths are compatibility facades onto this
  package. QLever retains its optimized SPARQL storage adapter.
- `BrokerReplica` separates fresh marker reads, guarded fences and publication.
  XTDB requests one frame per publication. Each pgwire write transaction performs
  an ASSERT of position/epoch/incarnation, inserts final assertion versions with
  `_valid_from = 1970-01-01T00:00:00Z`, updates logical `tx_meta`, and inserts the
  marker. Assertion ids use the collision-safe existing `[scope,id] encoding`.
  No XTDB system-time coordinate carries a broker position.
- P0004 is a definitive guard rejection. A publication retry that reaches P0004
  does not mark itself successful: it returns no success counts, forcing the
  broker's post-publication marker probe to decide whether the frame already
  landed or a fence/replay is needed. A lost response therefore cannot trap the
  applier in permanent retries of an already-applied guard.
- `XtdbClient.readSnapshot` reserves one connection, begins READ ONLY, reads marker
  and rows, then commits. Cancellation requests protocol cancellation and waits
  for the active driver operation to settle before releasing that connection.
  The marker in that snapshot determines replica eligibility.
- `makeBrokerStorageAdapter` adapts P2Q staging/CAS, nested savepoints, claims,
  immutable-cut masking, replica/overlay/source routing and source-view support
  to an engine-neutral row driver. XTDB Datalog receives that source view and the
  replica basis gate; it never runs an engine aggregate over a host row merge.
  Dependency-state currently reduces an eligible replica row scan in TypeScript;
  this is correct-path scaffolding with unmeasured scale cost.
- `makeXtdbRuntime` adds an explicit broker factory and broker read options.
  `XTDB_COMMIT_PATH=broker` plus an absolute `XTDB_BROKER_DIR` opts into the same
  path for existing gates. Without either opt-in, the native adapter stays selected.
  The Effect scope closes the broker before releasing the engine connection.
- `decisionStamp: true` assigns integer-microsecond stamps under the broker
  decision loop, persists them in frames and operation receipts, rewrites new/
  retracted rows and journal metadata, and binds the returned transaction receipt.
  Recovery and lost-ACK replay preserve the original stamp; decided-time mode refuses
  existing unstamped history rather than silently adopting a new record-time contract. The public boundary
  exposes milliseconds. Valid-time defaults retain their staged values. Published
  record-time watermarks gate repository reads; a transaction retains its source
  watermark. The QLever compatibility factory leaves stamping opt-in.
- Native broker mode waits for a requested logical position and compares fresh
  marker/epoch/incarnation after every answer sequence. Native record-time cuts
  refuse; transaction-local Datalog record-time cuts also refuse. Full RT01
  integration is still required. Native gate/refusal/reset/success tests are
  included in the final XTDB test run.

## Coverage and evidence

`packages/broker/test/composition.test.ts` covers actual SQLite-backed broker
commits with a memory replica: immediate overlay reads, later retraction leaving
an old cut byte-identical, outage fallback, duplicate command resolution, recovery,
replica catch-up, future-position refusal, record-time reads and same-operation
lost ACK. The final test also checks operation stamp replay after reopening.
Seven unchanged upstream storage corpus cases run in this composition. A Datalog-
using upstream case was excluded explicitly, rather than answered by a fake executor.
The full unchanged runtime corpus is an unrun live command in `COMMANDS.md`.

`packages/xtdb/test/broker.test.ts` uses a narrow SQL model, checking the actual
emitted guard, fixed physical valid time, atomic row+marker statement list,
snapshot request, duplicate publication, lost response/P0004 and invalid-marker
refusal. It is not proof that XTDB 2.2.0 accepts the emitted SQL. The three native
tests check refusal before a behind replica is queried, refusal after an
incarnation reset at the same position, and success at an unchanged named cut.

`packages/xtdb/test/broker-route.test.ts` runs testkit `/route` on the actual
adapter/read-driver path with generated history, forcing replica, overlay,
eviction-to-log and outage-to-log. It declares the snapshot contract and covers
L/V/P/T/TP reads, later retirement and repeated cuts. It uses the harness's
**offline fold, not an independent oracle**. Raw-lifetime history is a separate
contract and is excluded. This base's `/route` model permits T beyond the last
record watermark; those future-T requests are excluded from equivalence and must
remain typed refusals under Q90. Future positions remain covered. Partial source
and SQL-model stubs are explicitly labelled offline; no engine result is fabricated.

The memory measurement uses the unchanged frozen P2X/P2Q generator, retained
under its own source hash. The final driver includes open-loop offer-time latency
per band, concurrent pinned repository readers, immediate receipt reads, original
receipt checks on duplicates/lost ACKs, actual fsynced consumer checkpoints, full
feed-page traversal, exact position/order/subject/attribute/valid-range checks,
byte-exact re-read and checkpoint reopen. Raw sampled rows and all mismatches,
trace, source/build preimages and hashes, lock/native runtime observations and
before/after live slot identity are retained under the durable evidence directory.
It emits **DIAGNOSTIC**, never an NS PASS. The final source-bound memory rerun completed successfully. Its source/build preimages are retained in that attempt directory.

P3 reports **arm B: host broker/SQLite source of truth with XTDB replica**.
**Arm A1: XTDB-native source/feed with an off-engine consumer is not run here.**
Whether arm B counts as lane X awaits Sam (Q98j). No erasure, W0 dependency expansion,
maintenance overlap or process-stop consumer qualification is inferred.

All attempts are retained. Attempts 1–8 include type/setup and fixture failures;
9 completed the then-current gate set; 10 was a resource refusal; 11 found a test
expectation using bigint instead of Triplex's integer scalar; 12 passed after
correcting that expectation. Memory attempt 4 detected a clock-observation race;
attempt 5 passed using an actual writer-worker post-commit monotonic timestamp
and deferred LSN join. That timestamp is emitted only for this append, never
reconstructed for old evidence. The first
format check mistakenly included generated `dist` outputs; the bounded source
format check is `format-attempt2.log`. New source files are formatted and linted;
`harness-lint-final.log` covers the last measurement-driver edits.

## PASS / verdict / receipt audit (rule 9a)

No code added here grants acceptance or promotion authority. These are the places
that interpret observations as success or construct a receipt:

1. **Broker decision and operation replay (`broker.ts`, `sqlite-worker.ts`).**
   Content: the exact member's positions/stamp are persisted together with its
   frame and operations index; duplicate resolution reads that original identity.
   Freshness: new ACK follows this attempt's actual append and watermark
   publication. Binding: scope/operation/attempt/LSN/epoch and placeholder map.
   A durability failure remains outcome-unknown. No engine slot claim is made.
2. **Startup fence and applier publication (`HostBroker.start`, `applyLoop`).**
   Content: exact expected marker position/epoch/incarnation. Freshness: a probe
   sent after the fence/publication; XTDB returns no synthetic inserted counts.
   Binding: expected frame and current fence. P0004 alone is never a PASS.
3. **Repository, dependency-state and Datalog basis gates.** Content: actual
   marker plus kernel visibility/masking; dependency-state requires an exact
   replica or proof that no missing frame touches its attributes. Freshness:
   same read snapshot for rows/marker; immutable transaction source cut; fresh
   before/after Datalog probes. Binding: requested position/time and scope.
4. **Final native gate.** Content: requested position reached, identical marker
   and incarnation after answering; typed output hydration remains the existing
   native contract. Freshness: probes bracket this answer sequence. Binding:
   scope and explicit basis. Record-time cuts refuse. The final offline native tests execute these paths.
5. **Tests and `gates.mjs`.** Content: assertions on actual returned rows,
   emitted statements, original receipts and `/route` violations. Freshness:
   source builds precede tests in the same worktree. Binding: bounded test list
   and retained command logs. Exit zero is test evidence only; refused attempt 10
   did not execute a test and does not inherit an earlier attempt's result.
6. **`measure.mjs`.** Content: observed rows/receipts/feed fields checked against
   this generated trace, exact accounting and replay; mismatch bytes retained.
   Freshness: a UUID attempt, fresh source stream and consumer, before/after
   source/build checks, actual durable checkpoint reopen and writer-worker hrtime
   sampled after the actual SQLite commit returns. Binding: source/build
   preimages, generator/trace/lock/native hashes; live owner, endpoint, exact
   container/image/caps and slot config observed before/after. Its only verdict
   is diagnostic; no scale/maintenance/independent-oracle acceptance is implied.

## Pins, dependencies, retention and handoff

`lab/acceptance/` is unchanged. `source-change-hashes.json` lists old/new SHA256
for every changed tracked path and finds no matching explicit `{path,sha256}`
contract pin in this base. No pins were regenerated. The contract builder must
review transitive build identities in its next version.

The lockfile keeps every previous entry and adds only the new broker importer
and two workspace links. No external dependency version changed. The initial
local install skipped native scripts; `native-install.json` records reuse of the
existing lab-owned better-sqlite3 12.10.0 binary and its checksum. At the disk
floor, own generated package directories were replaced with read-only reuse
links to matching lab dependency directories; `dependency-reuse.json` records
paths, retention and free-space observations. This initially did not restore the 5 GiB
floor; subsequent host recovery allowed the final runs. Sources, pnpm store,
all receipts and engine state were retained.

Remaining work: run full pack/root integration checks; merge the reviewed final INT-Q/RT01 heads
in the authorized integration window; resolve RT01 stamping/API details and
Q51c's opaque/bigint migration; run the documented exclusive XTDB commands and
fault/scale/native gates; then obtain independent adversarial verification.
The inherited numeric public position/1,024-ordinal representation is preserved;
Q51c is not claimed complete. No main merge, push, release or deployment was done.
