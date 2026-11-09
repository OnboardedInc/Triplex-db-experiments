# CX-VP2B round 2: EXP-P2B round-four fixes

**Verdict: ACCEPT-OFFLINE for F1 and F2.** No remaining finding in the requested
scope and no new high-severity finding identified. This is acceptance of the
reviewed offline fixes, not P1/P2/P3 performance or live-composition promotion.

Candidate: `e9f0014b0181ec536ffba599551a68a3f5bdb5cd` on
`exp/P2B-xtdb-behind-broker`. North star: P1 exact position pins and bounded
resources; P2 original durable receipts. Goals/targets come from `lab/SCOPE.md`,
`lab/NORTH-STAR.md`, `lab/TARGETS.md`; protocol from `lab/PROTOCOL.md`.
Read `REPORT-round4.md` and `EVIDENCE-round4.md` before examining the fixes.

## F1 — closed offline: duplicates wait for a readable original receipt

Reviewed `packages/broker/src/broker.ts:841` and
`packages/broker/src/StorageAdapter.ts:835`. Public claim resolution now waits
until the actual claim position is covered by the shared published watermark;
the timeout remains a typed `DuplicatePublicationTimeout` through the adapter.
The decision loop retains its separate ungated internal lookup.

The independent original reproduction holds the real append return after SQLite
commits, while broker head and published position remain zero. A public retry
with a 30 ms configured deadline refuses with `duplicate-publication-timeout`;
it does not report an unreadable committed receipt. A normal retry remains
pending across a real checkpoint request. After release it reports the original
transaction ID, and an immediate `Triples.transaction(id)` returns the same full
receipt, position, instant, command ID and original fact. The broker records one
commit. Checkpoint outcome was complete (8.94 ms observed SQLite interval).

A separate lost-ACK schedule holds the publication RPC with broker head already
2048 but shared published position zero. A direct public claim times out typed;
a concurrent same-operation retry remains pending through checkpointing. On
publication, it replays the original LSN, epoch, position map and decision stamp;
the feed contains exactly the one original commit. This checks the behind-
watermark case separately from delaying append completion.

An additional focused schedule issues the checkpoint request **before** submitting
the public duplicate, then verifies the complete original receipt and a single
commit. This establishes overlapping request lifetimes; it does not claim a
pause inside the kernel's checkpoint/fsync implementation. Its completed gate
and observations are identified in `round2/EVIDENCE.md`. Gate
`gate-30470d1b-b4e5-48fb-b242-1d80ce537b2a` completed **1/1**, with
unchanged before/after input hashes.

Reproductions: `round2/independent.test.ts:44`, `:69`, `:147`.

## F2 — closed offline under the declared conservative WAL policy

Reviewed `packages/broker/src/reader-service.ts:100` and `:125`,
`packages/broker/src/sqlite-worker.ts:140`, plus mutation admission and rollback
classification. Marker and selected row bytes share one native SQL statement;
completed operations retain no SQLite snapshot. A logical pin is a position and
retention lease. WAL admission reserves a conservative dirty-page upper bound
with cache spill disabled; capacity refusal does not advance the log or poison
a stream that can recover after maintenance.

The two descheduling schedules exercise different cases:

| Schedule | Actual result |
| --- | --- |
| Original pause immediately after marker `get()` | The worker remains paused while 48 large commits complete. One typed capacity refusal is checkpointed and retried with the identical command. Peak sampled WAL is 69,005,912 bytes under the configured 134,217,728-byte cap. Checkpoint truncates WAL to zero **before** releasing the worker. The delayed operation refuses `read-operation-limit`, and a fresh read at its original position is exact. |
| Pause **inside** an executing native statement | A reviewer-only SQLite function pauses evaluation after the marker row is reached. This retains a real implicit read snapshot and models a thread descheduled during native execution. Five 512 KiB writes succeed; the sixth refuses `wal-capacity-exceeded`. WAL samples stop at 8,190,592 bytes, below the 16,777,216-byte cap. Checkpoint reports incomplete in 21.26 ms, with 1,988 WAL frames and 12 checkpointed. After worker release and checkpoint, the **identical operation and payload** commit at 8192 after prior head 7168; its old pin remains exact. |

The native pause is test instrumentation, not a production callback. Incomplete
checkpointing proves the snapshot is actually retained; `inTransaction:false`
alone is not used to infer that an implicit read statement holds no snapshot.
The held operation exceeds its elapsed limit and refuses; a new operation at the
same logical position succeeds.

History schedule: assert at P=2048, retire that assertion while adding its
replacement at 3072, then purge while the logical lease is held. The old cut is
byte-exact after the existing temporal mask. Release the lease and purge: one
retired row is removed, H1 becomes ineligible, and the worker's persisted-source
fallback still reconstructs exactly the original cut. No live SQL transaction
spans the pin. Reproductions: `round2/independent.test.ts:88`, `:108`, `:131`.

The policy is deliberately conservative: a sufficiently large database requires
a larger configured WAL reserve, even after truncation. Byte/row/elapsed read
limits are checked after the native operation; they do not preempt SQLite or OS
suspension and do not provide a hard heap bound. These limits are accurately
disclosed in the builder report. This verdict does not remove them or qualify
large-store capacity/latency.

## Fresh tests and historical ten-minute evidence

- Fresh bound gate `gate-9899538e-0699-44de-98cb-bce6cfd0261c`: **38/38 tests**
  in ten files, including 24 unchanged broker tests, nine builder-adapted
  regressions and five independent schedules. Source/runner/public dependency/
  native-binary hashes stayed unchanged. Its exact input preimages are retained.
- The checkpoint-first arrival variation is a separate focused fresh test,
  introduced after the first gate; its own gate binds that later source version.
  See `round2/EVIDENCE.md`. The original first-gate test preimages remain intact.
- The builder's ten-minute run was **audited, not rerun for ten minutes**.
  `round2/audit-long-pin.py` verifies the committed result/sample hashes, all
  2,827 raw sequences, increasing positions/times, every recorded row hash
  against a full hand-derived seed row, the 32 MiB cap and the 2,027,072-byte
  (1.93 MiB) sampled peak. Raw sample times span 5.716–599,802.381 ms, consistent
  with the reported 600,006.300 ms pin interval. All 93 captured broker source/
  build files re-hash correctly; captured broker source matches the reviewed
  candidate exactly. The native proof still names the retained DB inode/device.
- The historical aggregate's 162-test total was not adopted as a fresh result.
  This review reran the F1/F2-relevant subset above, not all backend/compiler
  suites or the complete root check. No latency measurement is claimed.

## Source, evidence and branch handling

The candidate implementation was applied verbatim to this review branch as
`40fd76ae`. The two conflicts were the builder's copied reviewer test/config;
I kept the original independent versions. Candidate product source has **zero
byte differences** from `e9f0014b`; no reviewed code was fixed or edited.
The nine builder regressions were copied to `round2/builder.test.ts`, changing
only relative import depth, evidence ownership and the fixture-identity path.
Their original source is retained separately.

All new tools/results are under `lab/verify/P2B/round2/` and this report. Bulky
fixtures, raw logs, source preimages and metadata are durable under
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP2B/round2/`
and this review's existing owned `CX-VP2B/upstream/` fixture directory;
`round2/EVIDENCE.md` and `round2/SHA256SUMS` index the exact retained files.
Existing shared dependencies were reused read-only; no package install or global
cache/config change. Every heavy run used `lab/bin/heavy.mjs`; free space was
above 5 GiB when the work was admitted. Workers, services and brokers owned by
these probes are closed by their fixture cleanup.

No `lab/acceptance/` edit, contract version change or pinned-path hash move by
this review. The old/new moved-pin list is empty. No main-checkout edit, merge
into main, push, engine/Docker/VM lifecycle action or unrelated cleanup.

Reproduce with the existing lab dependency links and at least 5 GiB free:

```sh
node lab/bin/heavy.mjs --label CX-VP2B-R2 -- node lab/verify/P2B/round2/run.mjs
node lab/bin/heavy.mjs --label CX-VP2B-R2-arrival -- node lab/verify/P2B/round2/run.mjs --expected-count=1 -t 'a duplicate arriving after checkpoint request'
node lab/bin/heavy.mjs --label CX-VP2B-R2-audit -- python3 lab/verify/P2B/round2/audit-long-pin.py
```

The current default full suite has 39 tests after adding the focused arrival
variation; the recorded first full gate has 38. Do not relabel it as a 39-test run.

## Rule 9a: result/verdict audit

| Observation-to-result location | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `independent.test.ts` assertions | Full original receipt and exact masked cut equality, typed refusal, pending-before-release controls, single-commit/feed counts, actual WAL sizes and identical refused-command retry. | New UUID directory, real brokers, native SQLite operations and explicit cross-thread gates in each attempt. | Candidate source, actual source file/shared watermark, operation/command IDs, named positions, cap and concrete fixture rows. No engine slot. |
| `read-worker.cjs` responses | Actual read results and typed errors from the reviewed service; the native pause retains SQLite's actual statement, without substituting answer rows. | New worker/connection and operation per fixture. | Supplied exact file, shared watermark, source module and control buffer. |
| `builder.test.ts` assertions and partial `note` | Existing adapted regressions inspect actual rows, receipts, refusal/rollback and feed. Notes are observations, not independent completion markers; later test failure invalidates the run. | New UUID output/brokers; the original test source and mechanical adaptation are retained. | Current fixture hash, source file, positions, commands, cap and actual values. |
| Independent `note` | Records observed data after relevant assertions; JSON Map serialization is not used to establish position equality—assertions and explicit feed positions do that. A partial notes file is insufficient for a verdict. | New UUID file, no old result adoption. | Candidate ID, attempt and test schedule. |
| `run.mjs` gate result | Checks candidate source equality, actual child exit, expected test count, absence of unhandled errors and equal complete before/after input-hash maps. Semantic acceptance also requires the inspected assertions. | Fresh UUID gate and subprocess; exact source preimages retained before execution. | Candidate and local HEAD, source/tests/runner/lockfile, public core/testkit builds, native binary and actual dependency realpaths. |
| `audit-long-pin.py` positive comparisons | Re-hashes historical raw samples/result/frozen inputs, checks full hand-derived seed and every recorded read hash/count/time/position/WAL sample. | New audit of explicitly historical observations; no fresh ten-minute claim. | Committed summary/manifest hashes, named immutable attempt, actual DB identity and exact candidate source comparison. |
| `round2/manifest.mjs` | Rechecks completed gate counts/log hashes, current final-gate input hashes, historical audit equality and candidate source; hashes retained bytes and identifies new owned upstream fixtures by the completed gate time window. | Runs after test subprocess exit; no active database is moved or deleted. | Exact gate UUIDs, source paths, tool preimages and absolute evidence paths. |
| This verdict, evidence index and checksum manifest | Require completed source-bound test logs plus actual observed schedules, content comparisons and disclosed limits. Manifest hashes retained bytes, not semantic correctness. | Current review and named completed attempts; prior review evidence retained separately. | Exact candidate, review branch, gate/observation UUIDs and durable paths. |

Remaining work outside this scoped verdict: HS01 history/recovery integration and
larger-store reserve configuration; VM/R44/live XTDB qualification; performance,
year-one scale, hard native-operation/memory bounds, physical power loss and
filesystem exhaustion. No full root `pnpm check`, `pack:check` or fresh ten-minute
benchmark was run. There is no unresolved F1/F2 blocker from this review.
