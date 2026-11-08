# Rulings recorded but not yet compiled (Q38c: RULINGS.md holds only compiled or explicitly listed entries)

These move into RULINGS.md when the contract version that compiles them is built.

## Q51b: EXP-P2X feed lag on XTDB (not compiled in 0.3.8: an experiment direction with no contract effect)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q51b feed lag on XTDB | The next XTDB P2/P3 experiment puts XTDB behind the same host log and broker as EXP-P2Q (EXP-P2B: XTDB as the replica, current and history layer), since that composition measured feed lag p99 12.8-24.5 ms and an ACK independent of the engine. The subject-stamp path stays the XTDB-native arm (A1) to compare against; a separate consumer database through ATTACH is not pursued unless P2B fails. | both engines stay candidates for every layer; fewer moving parts |

## Q57: EXP-D01b W0 SPEC readings A11-A15 (to fold into W0-1.1.2 with Q53's A01-A10; not compiled: W0-1.1.2 has to land first)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q57a A11 non-JSON number tokens | `NaN`, `Infinity` and `-Infinity` are W0.E_SHAPE, extending A01. | SPEC 4.4.1 |
| Q57b A12 long integer tokens | An integer token over 4,300 digits is still an integer token: E_VALUE for a value, E_BASIS for a tx. Implementations must not fail on their language's integer-parsing limits. | SPEC 2, 4.4 |
| Q57c A13 nesting depth | Any nesting depth is a valid JSON value, then E_VALUE; implementations must not fail on recursion limits. | SPEC 4.4.1 |
| Q57d A14 string order | Strings order by Unicode code point, which equals UTF-8 byte order. This covers object keys and the sorts of items, subjects, effects and projection, plus the basis guard's validTime comparison. Escapes follow A07. | SPEC 9 item 2 |
| Q57e A15 inconsistent receiver snapshots | Entries are kept as given and re-sorted stably by seq. Only seq = done + 1 releases; entries at or below done, and the second of two duplicates, stay waiting. | SPEC 8.9 |

## Q58: R23 log-of-record compositions (lab/research/R23-log-of-record-compositions.md)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q58a native-query tokens (provisional, replaces Q55c's native half; flagged for Sam) | Native queries go through a Triplex facade; engine ports are not a public surface. A request may carry `after: position` (wait until the replica marker reaches it within the deadline, then typed BasisNotAvailable{required, observed, replica}) or `at: position` (exact; also requires the engine to reconstruct it, else typed BasisNotReconstructible). A client session sends its own high-water mark (last commit position and last read basis) as an implicit `after`. Tokenless external callers get the replica's watermark and the reported position. Every answer carries {basis: {low, high}, route}. Replica unreachable stays ReplicaUnavailable. Default deadline 2 s. | R23 sections 2 and 7; mature systems (Mongo, Cosmos, XTDB client, LiteFS) |
| Q58b EXP-P2B | XTDB becomes a second replica behind the broker: one pgwire transaction per frame (ASSERT the marker, INSERT rows with a fixed `_valid_from`, INSERT the new marker; P0004 on guard failure); rows and marker read in one read-only transaction; the marker row is the eligibility authority; XTDB system time is not used to carry broker positions; Local log first, InMemory log plus an epoch bump as an arm; predictions and measurements per R23 section 6. It starts after the broker fix round (Q62) is re-verified, from the same author, so one writer owns the broker files. | R23 section 6; Q51b |
| Q58c broker substrate (hardening experiment after P2B) | The host log moves to SQLite through better-sqlite3 (WAL, synchronous=FULL, fullfsync=ON, checkpoint_fullfsync=ON, locking_mode=EXCLUSIVE, application-driven PASSIVE checkpoints, a worker thread when readers share the process), keeping a CRC32C prev-chain column, a `committed_at` column, an epoch row and the marker and checkpoint cross-checks (plain SQLite misses mid-WAL corruption). heads, claims and operations become tables; the overlay becomes a persisted `recent_rows` table. Predictions H1-H6 of R23 section 6.4. This replaces Q50d's rotation and lock items. | R23 section 3; Q50d |
| Q58d overlay rules | The overlay merge is allowed for entity pulls only, keyed by id with the greater LSN winning, under a tested invariant (identity columns never change; retraction is a new version). Engine aggregates, Datalog and executor reads and paged lists never merge: they wait or fail typed. Frames carry explicit tombstones so erasure and deletes cannot resurrect replica rows. | R23 section 5 |
| Q58e erasure reaches the log | Values held in the broker log, `recent_rows` and checkpoints must be erasable: value payloads in frames are encrypted per subject and erasure destroys the key (crypto-shredding), so TARGETS 7 holds without rewriting the log. Design in the hardening experiment. | R23 open question 4; TARGETS 7 |

## Q59: EXP-A01 contract 0.3.8 questions
| Q | Ruling | Basis |
| --- | --- | --- |
| Q59a placement | Keep the Q52 shapes and the Q52f rounding case out of the closable obligations until O-REPLAY 0.4.2 is accepted, then fold them back. | Q52 |
| Q59b ER-INFLIGHT-READ | Confirmed narrowed to a one-value erasure; ER-INFLIGHT-ALL-OR-NONE stays in G9.erasure.residual-shapes until 0.4.2. | Q52e |
| Q59c verification briefs | Every verification and re-check saves its own BRIEF file, so the registry's brief hash identifies the actual instructions. | Q55a |
| Q59d registry per obligation | Accepted as Q55a's intent: each claimed obligation needs a VERIFIER_REGISTRY entry for its commit, added by a regenerated contract version. | Q55a |
| Q59e unpinned oracles | Every answer-producing oracle gets a pin and a registry entry in a later version; until then claims that depend on an unpinned oracle are DIAGNOSTIC. | Q55a |
| Q59f case manifests | Case authors pin manifests through contract versions, starting with CS-POSITION and CS-NS (EXP-W01 for CS-GS). | Q55a |

## Q60: R22 measurement protocol PAIR-0 (lab/research/R22-noise-robust-benchmarking.md; provisional)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q60a design | Comparisons run as paired rounds: a duet (A0 and candidate at the same time on two identically configured slots, same trace window) or same-engine ABBA as the fallback; 8 rounds minimum, 12 default, 24 maximum, about 150 s each; pooled-quantile ratios with a bootstrap over rounds; looks at 8, 12, 18 and 24 rounds at 98.2%; A/A rounds in the pre-flight and every sixth round. A single run never decides a bar. | R22 sections 1, 2, 7 |
| Q60b margins | Superiority needs the lower bound of A/B at or above the claimed ratio (1.25 by default); "hold" needs the upper bound of B/A at or below 1.10 for p50 and 1.15 for p99. Orchestrator's interpretation, adjustable (NORTH-STAR item 4). | R22 section 2.3 |
| Q60c slot regime | Measurement slots run with a cpuset and no CPU quota; receipts record effective cpu.max, cpuset and cpu.weight; quota and cpuset arms are never compared; A0 is measured again under the new regime. | R22 section 3 (77% of periods throttled under the quota) |
| Q60d accounting | Latency histograms include every offered command (expired, failed and rejected at their censor time) next to the committed-only view; reads get an open-loop probe at a fixed rate; per-second goodput and per-second maximum latency are recorded. | R22 section 2.4 |
| Q60e windows | Absolute bars are judged only in GREEN windows (pre-registered noise signals and the A/A gate of R22 section 4.2); otherwise they are reported "unjudged". | R22 section 4 |
| Q60f execution mode | NS obligations gain a `paired-rounds` execution mode next to Q26's `single-execution`. | Q26 |
| Q60g screening series | A screening trace with a burst every 180 s is a new comparison series (TARGETS 2.1 item 5), so P2 and P3 rounds contain enough commands for p99; acceptance keeps the frozen trace. | R22 finding 4 |
| Q60h lease | A measurement window takes every heavy token and freezes pool admission for its duration. | R22 section 3.5 |
| Q60i A0 runs under the old protocol | EXP-N01's single-run A0 is diagnostic only; A0 numbers for comparisons come from paired rounds. | Q60a |

## Q61: EXP-E01 claim evaluator questions
| Q | Ruling | Basis |
| --- | --- | --- |
| Q61a contract source | `qualify` reads the contract from the authority ref (main), never from the claimed commit. | Q55a |
| Q61b registry shape | The evaluator reads 0.3.8's VERIFIER_REGISTRY (verifier, brief hash, branch, commit, verdict, subject) as written. | Q55a |
| Q61c oracle runners | The contract gains `oracleRunners` {argv, files for an unpinned oracle} plus an answer-extraction rule; O-REPLAY's default argv is `python3 -I lab/oracles/replay/cli.py {case}`. | Q55a step 4 |
| Q61d case manifests | Case manifest fields input, contentSha256, comparator and optional oracle and faultPoint are pinned. | Q59f |
| Q61e case-result/2 | case-result gains mode, rep, comparator and inputSha256; records that cannot be expressed fail closed. | Q47a |
| Q61f build spec | The build spec moves into the contract together with the build inputs in build-manifest. | Q55a step 1 |
| Q61g workload identity | Required only for CR-NS and CR-GS obligations, not for correctness obligations. | Q47b |
| Q61h frozen trace | Pinned as `writerTrace.generator.frozen` {sha256, seed, offerScheduleSha256}. | TARGETS 2.1 |
| Q61i image pins | Engine image pins move into the contract (from slots.json). | Q55a |
| Q61j fault witnesses | Fault witnesses are retained, not only `faultReps` asserted. | Q34 |
| Q61k A0 verification | The A0 side is verified through the registry entry's measuredBy. | Q55a |

## Q62: V-P2Q REJECT (lab/verify/P2Q/VERIFY.md)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q62a fix round | The broker author fixes C1 (in-transaction Datalog waits for the replica to reach sourceK or fails typed; executor reads are scope-wide in the CAS read set), C2 (the replica's real marker is read with the answer and an idle applier probes it), C3 (a process-wide registry of open stream directories plus the perl flock helper), M1 (segment-header checksum; refuse when the WATERMARK names an LSN above the scanned end), M2 (B beyond the resolved prefix waits or fails typed, on A0 too), M3 (pulls and retraction-target reads fall back to the log; typed BasisNotAvailable and ReplicaUnavailable), m1 (a post-fsync exception fails the broker and answers outcome-unknown) and m6 (the P3 harness records per-position source and consumer instants and fails on missing ACKs); then V-P2Q re-verifies the new head. | V-P2Q findings |
| Q62b hardening | M4 (Q50d) is met by the Q58c hardening experiment before the broker becomes a default; merging behind the default-off option needs only Q62a. | Q50d, Q58c |
| Q62c write amplification | A0 writes 653 triples per 10-fact command on QLever (24 rows, about 27 triples per row), not about 750; the cause is the row encoding and journal on every lane, owned by EXP-J01. | V-P2Q check 8 |
