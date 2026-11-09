# V-P2Q verification of exp/P2Q-qlever-log-broker (head d7c6086): REJECT (saved by the orchestrator, 2026-11-08 00:01Z)

**Reason:** at d7c6086 two read surfaces can return a stale answer presented as an answer at basis B, and two runtimes for one scope in one
process lose ACKed frames; the brief makes a stale read served as current a REJECT. **What held:** repository pulls exact on 3,190
adversarial reads (0 mismatches against the log replayed to B); ACK path correctly ordered; feed and Q31c falsifiers pass; A0 unchanged by
diff with the option off. **Bounded fix:** the query executor inside a transaction, the broker's cached replica marker, the in-process lock.
Verifier commit e64dfc3 on verify/P2Q; summaries under lab/verify/P2Q/evidence/ on that branch; logs in /Users/sam/Claude/Projects/triplex-db-2/V-P2Q/.
Reproduce from the worktree root: offline `npx vitest run --config lab/verify/P2Q/vitest.config.ts` (`V_P2Q_SEEDS=60` for the full fuzz);
live `V_P2Q_LIVE=1 QLEVER_URL=http://127.0.0.1:7070 npx vitest run --config lab/verify/P2Q/vitest.config.ts tests/live/live.test.ts`.

| # | Check | Result |
| --- | --- | --- |
| 1 | Durability and framing | FINDING C3, M1, m1, m2 (torn tails, middle-frame flips, crash windows pass) |
| 2 | ACK ordering, group commit, lost ACK, CAS | PASS (m1 is a fault-path hang) |
| 3 | Read routing and eligibility | FINDING C1, C2, M2, M3 (repository pulls pass) |
| 4 | Feed | PASS (Q55d lag recomputed; m6 harness change) |
| 5 | Q31c falsifiers | PASS (branch's four plus three of the verifier's) |
| 6 | A0 unchanged with the option off | PASS by diff and offline suite (37 passed, 24 skipped); 2 live A0 tests time out on the loaded resident; matched main control NOT RUN |
| 7 | Recompute the numbers | FINDING m3, m4: every number with raw samples reproduces; "about 750 triples" does not (653-663) |
| 8 | Write amplification | PASS with correction: A0 653 and candidate 655 (+4 deleted marker) triples per 10-fact command |

## Critical
- **C1 Datalog inside a transaction answers at sourceK from a replica that has not reached it.** `QleverQueryExecutor.ts:219-223` takes
  `sourceView.sourcePosition` without `resolveBasis`. Live, inside one transaction at sourceK 2048 with no applier: oracle 1 row, repository
  pull 1, Datalog `execute` 0, Datalog after publication 1. Executor reads are not in the transaction's CAS read set, so a decision on the stale
  answer commits without conflict. Fix: wait for the replica to reach sourceK inside a transaction (deadline, then typed BasisNotAvailable) or
  refuse in-transaction Datalog; mark executor reads scope-wide in the read set.
- **C2 after an unnoticed replica regression, Datalog and dependencyState trust the cached marker.** `broker.ts:612-625` `waitPublished`
  compares against cached `replicaMarker`; `BrokerStorageAdapter.ts:419, 446-450`; `applyLoop` re-reads the marker only with a batch to publish.
  Emulated restart without persisted updates: cached 3071 against real 0; `queryAll(..., {includeBasis: true})` returned 0 rows at reported
  basis 2048 (1 before); `dependencyState` at 2048 gave sourcePosition 0; repository pull at 2048 gave 3 rows via the log (matches the oracle).
  Fix: read the real marker in the same request as the answer (or before and after) and refuse below B; probe the marker while idle.
- **C3 a second broker in the same process takes over the LOCK and ACKed frames are lost.** `log.ts:88-111` treats a LOCK held by its own
  pid as stale. Offline: A ACKs a2 after B opens the directory; reopen classifies the tail as torn and a2 is gone. Through `makeQleverRuntime`
  with `QLEVER_COMMIT_PATH=broker`, two runtimes for one scope: run 1 truncated ACKed a2 and b2 and LSN 3 named two frames; run 3 lost a2 and
  b2 again after a fence race. Fix: process-wide registry of open stream directories by realpath refusing a second open; the Q50d flock; an
  explicit takeover flag for crash-simulation tests.

## Major
- **M1** one flipped bit in the segment header's firstLsn (bytes 24-31; 62 of 256 header bits) scans as torn-tail at offset 32; a full open cut
  25,590 bytes to 205 and 0 of 4 ACKed commands survived (backup kept). Fix: checksum the header (or require firstLsn = 1 for segment 1); refuse
  to start when the on-disk WATERMARK names an LSN above the scanned valid end (also catches m2).
- **M2** a repository pull at B beyond the resolved prefix answers and changes later (B 5125 with head 2048: 1 row, then 4); A0 does the same.
  Fix: typed BasisNotAvailable or wait to the deadline for B > `lastPositionOf(durableLsn)`.
- **M3** outage and beyond-watermark reads untyped, no fallback: 458/458 pulls failed with generic ReadError during an outage; 31 retracting
  commits failed "Cannot read retraction target" (so Q31e's commits-continue-during-outage holds only for assert-only commands); Datalog beyond
  the watermark a plain Error after 2,003 ms; native SPARQL with a token above the watermark an immediate RangeError. Fix: fall back to
  `broker.fromLog` for pulls and retraction-target reads (or the Q50a current index); typed BasisNotAvailable and ReplicaUnavailable.
- **M4** Q50d hardening absent (overlay bound and backpressure, rotation and checkpoints, flock).

## Minor
m1 an exception after fsync hangs the commit (no answer after 3 s, unhandled rejection, broker not failed; frame durable, resend after reopen
returns already-committed): fail the broker and give pending commands outcome-unknown (`broker.ts:402-413`). m2 last-frame damage truncated
silently offline (R13's known limit; M1's WATERMARK check). m3 evidence identity: no receipt at HEAD d7c6086, seven ran its dist; row 1, the
ACK-path row and crash receipts ran older dists; 018b1a ran the same stale dist as cad02c; the verifier's d7c6086 crash rerun reproduces 0 keyed
and 129 unkeyed visible duplicates. m4 wording: "136 replay attempts" is distinct replayed keys (store counter 129); p99 is the sample max when
n < 100; the warmup drop (3/30, 6/60, 20/120) undisclosed; "about 750" is 653-663. m5 `QLEVER_COMMIT_PATH` flips A0 process-wide; receipts
must record it. m6 the P3 harness drops samples: record per-position source and consumer instants and fail on missing ACKs (cad02c recorded 29
ACKed commits as error:ReadError because the RYOW pull failed).

## Per check (selected)
- Durability: 1,885 cuts of the last frame classify correctly; 74 full opens truncated with byte-identical backup, burned LSN, EPOCH_BEGIN at
  lsn+1; 62,760 single-bit middle-frame flips refused; crash before fsync return = outcome-unknown, replayed, resend returns the txId; mid-write =
  torn tail, LSN burned; between fsync and watermark = no ACK (m1), watermark republished on reopen; 20 random-kill rounds: 1,888 ACKed, 0 lost,
  160 outcome-unknown of which 37 durable.
- ACK: 620 traced ACKs, 0 ordering violations; at each ACK the on-disk watermark, durable LSN and overlay hold the commit; at most 64 members per
  frame; lone ACK p50 4.3 ms against fsync p50 2.84 ms; six concurrent commands with one commandId: 1 commit, 5 CommandAlreadyCommittedError with
  the same txId; CAS conflict typed `QleverBrokerConflict` (serialization-conflict).
- Routing: S1-S6 pass; fuzz 60 seeds, 3,190 reads, 0 mismatches (replica 1,628, log 1,120, overlay 442; 294 regressions (64 detected), 206
  crash-reopens, 267 outages; 60/60 converged, 0 duplicate `_row` literals).
- Feed: 400 commits x 4 variants x 100 crashes (34/33/33), 101 restarts each, missing 0, extras 0; visible duplicates keyed-split 0,
  keyed-atomic 0, unkeyed-split 129, unkeyed-atomic 0; a frame without the watermark update is not delivered; checkpoint is tmp, fsync,
  rename, directory fsync.
- Q31c: allocator widths [1, 600, 600, 300, 1025, ...]: 1025 rejected with BrokerInvalidTransaction, at most 1,024 ordinals per frame,
  positions unique and consecutive; nested transacts consecutive and every cut exact; burned LSN empty and listed aborted. Caveat: C3 breaks
  "no LSN names two frames".
- Write amplification: each 10-fact command writes 24 rows (10 facts + 14 journal rows), about 27 triples per row (`_row` JSON, 3 scalar
  channels, 4 channels each for recorded_at, recorded_position, valid_from, schema_version, plus id, entity, attribute, type, tx_id and value
  columns); claims add 4 and the operation 3. The amplification is the row encoding and journal, not the broker: 7x R17's 94.

## Q55c read surfaces today
| Surface | Basis reported | Token honored | Replica unreachable | Status |
| --- | --- | --- | --- | --- |
| Repository pull | caller's B (or head) | yes, never below B; B beyond head answered (M2) | generic ReadError, no fallback | M2, M3 |
| Repository pull in a transaction | sourceK | exact through the overlay | ReadError | ok |
| Datalog in a transaction | sourceK | no wait, stale | n/a | C1 |
| Datalog outside (`queryAll`) | only with includeBasis (head) | waits 2 s on the cached marker then untyped; stale after an unnoticed regression | ReadError | C2 |
| dependencyState | sourcePosition | cached marker | ReadError | C2 |
| Native SPARQL | the replica's marker, correctly | token above watermark: immediate RangeError | ReadError | M3 |

## Q55d: P3 lag from source publication (source instant = the frame event at fsync return)
| Run | n | missingAck | source to consumer p50 / p90 / p99 / max ms | report's ACK-based figure |
| --- | --- | --- | --- | --- |
| 2591e8 offline | 3,414 | 0 | 6.1 / 9.1 / 13.7 / 41.5 | 5.9 / 8.9 / 12.8 / 41.3 |
| 0bccda dev | 114 | 0 | 7.1 / 11.7 / 24.9 / 42.1 | 6.4 / 10.3 / 24.5 / 41.1 |
| 5a02c5 A0 | 2 | 3 | no source timestamps | 870 / 1,403 |
Fsync return to client ACK p50 0.2 / 0.3 ms, p99 1.4 / 11.4 ms (offline / dev). The P3 conclusion stands (p99 at or under 250 ms).

## Recomputed numbers
All 10 raw files match their sha256; 207/207 receipt fields match (nearest-rank percentiles). Row 1 and row 2, the open-loop rows, A0 2 of 114
ACKed (at least 3 of the 112 unknown actually committed), offline burst 4.7/25.0 with 3,414 committed and 0 unaccounted, feed 5.9/12.8 and 24.5
all match; the ACK-path-alone row has no raw data (rerun: lone ACK p50 4.3 ms, fsync p50 2.84 ms); 42.2 ms is one sample, 33.7 the cold first
command, 0bccda started at host load 31; cad02c exclusion confirmed (stale dist, other seed, 242 apply errors) and 018b1a should be labelled or
excluded too; "about 750 triples" does not reproduce (653 live, 663 from receipts).

## V-P2Q round 2 on f711193 (Q62a fix round): REJECT this head, not the design (saved by the orchestrator, 2026-11-08 01:41Z)
- Fixed as claimed: C1, C2 (for regressions with downtime), C3 (in one process), M1 (256/256 header flips refused), M2, M3 (1,506/1,506
  outage pulls exact via the log), m1, m6 (lag recomputed from raw: 33/33 complete, p50 5.1 / p99 12.1 ms, measured on a dirty tree at
  d7c6086, not at f711193). Fuzz: 3,034 normal and 1,506 outage pulls, 0 mismatches; 185 reads beyond the prefix never answered beyond it;
  3,200 commits, 0 failures, 60/60 seeds converged. Unchanged checks re-run: 620 ACKs, 0 order violations; feed crash duplicates
  0/129/0/0 (keyed-split/unkeyed-split/keyed-atomic/unkeyed-atomic); 1,017 ACKed under random kills, 0 lost.
- N1 critical: `KernelLock` ignores the perl flock helper's exit after locking. SIGKILL of the helper, or Ctrl-C to the holder's process
  group, lets a second process open the stream; both append (30 and 62 LSNs each named two ACKed frames) and the broker then refuses to
  start. Fix: spawn the helper detached with INT/TERM/HUP ignored so it exits only on stdin EOF; on its exit fail-stop the log.
- N2 critical: before/after marker probes cannot certify the answer's snapshot. Live: Datalog with includeBasis returned 0 rows at
  reported basis 2048 (log replay: 1) after a zero-downtime rewind and replay between the probes; the fuzz hit it unprompted in 4 of 153
  accepted gate reads. Same gap for dependencyState and native SPARQL with awaitBasisMs. Fix: Q67c (marker in the answer's own request, or
  (incarnation, marker) compared before and after).
- N3 major: with the option off, A0 now makes one extra request for a fresh basis above its observed position and fails typed above the
  published position (main answers it). N4 major: each outage pull replays the whole log synchronously (30k commands: 544 ms per pull, a
  concurrent commit 617 ms against 3 ms alone, +85 MB RSS). N5 minor: waiting gates flood the replica with probes (89 per waiter per
  second during a regression), one TCP connection each. N7: native SPARQL is typed only with awaitBasisMs. N8: the cross-process flock
  test imports dist/index.js and hangs on a fresh checkout.
- Errors: the branch raises `ReadError` with `basis-not-available` / `replica-unavailable`; the contract pins `BasisNotAvailable` /
  `basis-not-reached` and `ReplicaUnavailable` / `replica-unreachable`, so every case pinned to those ids fails. Contract inconsistency:
  E-UNAVAILABLE-CUT and E-BASIS-NOT-AVAILABLE name different errors for a basis beyond the latest committed position.
- Evidence: verify/P2Q 856af98 (round-1 commit rebased as 818819b), lab/verify/P2Q/evidence-f711193/, logs in
  /Users/sam/Claude/Projects/triplex-db-2/V-P2Q/f711193/. Rulings: Q72 (pending).
