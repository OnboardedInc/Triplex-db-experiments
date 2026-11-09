# EXP-SQL01 — SQLite broker log and pinned H1 readers

**Result:** implemented as a default-off candidate, with the validation limits and one unresolved read-test finding below. Independent review remains required.

Builder: CX-SQL01. Branch: `exp/SQL01-broker-sqlite`, based on `1b55d2e` (`exp/P2Q-qlever-log-broker`). This report records builder evidence for a separate reviewer; it does not promote the broker or change its default-off option.

North star: P2 first (atomic durable small commits and lost-ACK resolution), P4 (exact indexed current pulls), and P5 (retention-pinned short pages), with P1 reader/writer separation. Goals and bars come only from `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`.

## Implementation

The existing broker option now opens `broker.db` through better-sqlite3 12.10.0. The pinned catalog and root override already contained that version; only the QLever importer's driver/types dependencies were added to the lockfile. The broader re-resolution produced by pnpm add was reduced to those six importer lines, preserving the other existing pins. A frozen installation completed using the required project store. No global package configuration was changed.

- A writer worker owns the committing connection and a SQLite exclusive lock on separate `broker.lock`. There is no perl helper, segment append, or WATERMARK file. WAL uses NORMAL locking, FULL synchronous, fullfsync and checkpoint_fullfsync, autocheckpoint disabled, a 16 MiB journal size limit, and SQLite >=3.51.3. The checkpointer has its own durable connection and PASSIVE timer every four seconds. Four readonly reader workers run short transactions, with the marker as their first query. The application main thread never opens `broker.db` through SQLite or `fs`.
- A commit transaction inserts the chained-CRC frame and `committed_at`, operation receipts, command claims, subject heads, persisted source/overlay rows, H1 live/retired moves, and marker. A source assertion/retraction keeps the full Triplex row, including exact lexical channels, valid time and packed ordinal positions. SQLite commit returns before the broker publishes the ACKED sidecar and acknowledges the caller.
- Recovery locks the stream, opens/recovers WAL, syncs adopted frames with PASSIVE, validates ACKED and the complete frame/marker chain, and appends the next epoch before readers start. Damaged or missing acknowledged frames refuse startup. A recovered unacknowledged commit remains legal and resolves through the operation/claim tables. The sidecar is a corruption witness, not a second log of record, and is intentionally not a second per-command fsync.
- `live_rows` is clustered by `(entity,id)`; `retired_rows` by `(entity,rpos,id)`. A pinned pull serves only at `H <= B <= W`, with B and H expressed in packed Triplex positions and W the snapshot's resolved frame prefix. It reads live assertions at/before B plus rows retired after B. `pinBasis` holds H below a sweep's basis; `sweepPage` limits a page to 64 subjects. Purge moves H atomically and deletes at most 2,000 retired rows per call. Persisted source rows retain historical fallback coverage.
- Repository outage pulls use asynchronous H1 reads and indexed source fallback; online overlay and source fallback also dispatch asynchronously. Claims in the adapter are asynchronous and convert store failures to typed WriteError. The old synchronous HostLog/broker utility methods remain for existing tools; broker decision checks still use small synchronous worker RPCs, and the feed utility retains its synchronous calling surface.
- The old persistent in-memory maps and row-payload overlay are gone. Only scalar head state and publication scheduling headers remain in memory. Replica catch-up reads bounded batches from SQLite. Existing repository composite routing, native/Datalog gates, incarnation fencing, applier idempotence and the default-off setting remain.
- Above 64 MiB WAL, the writer closes a shared gate, readers park between transactions, and RESTART has a 100 ms busy cap. The background connection keeps fullfsync enabled even when it closes last. Calibration runs within both writable workers using durable calibration connections.

The mechanism and adaptation rationale are in code comments citing EXP-SQL01/R25. Primary design inputs were the complete R25 report and its scripts/results, Q84a-e/Q58c/Q62b/Q72e/Q68a, R24 section 7, and P4's H1 code/report at `6f061a8`.

## Test adaptations and retained failures

Package tests that mutated removed segment bytes or killed a removed perl helper were replaced with SQLite recovery/corruption and owner exclusion tests. The lost-ACK/feed resume test now expects an epoch boundary without an exposed torn-frame abort gap: SQLite hides uncommitted WAL content from readers. A takeover refuses a closed store's claim lookup before append, returning WriteError rather than pretending a new commit has an uncertain outcome. It separately checks that the abandoned log cannot append.

The old verifier files themselves were left unchanged except for its shared harness: its independent oracle now reads frame payloads from SQLite with its own SQL reader, then independently decodes and replays those payloads. It does not use H1 or recent_rows to compute expected answers. Legacy segment-path callers are mapped to the adjacent broker.db in that oracle.

The full initial old verifier run is retained at `evidence/verifier-first.log`: **32 passed, 10 failed, 6 skipped**. The ten failures target removed infrastructure or superseded publication semantics: two segment damage cases, two FileHandle write/sync injection cases, two perl-helper signal cases, the FileHandle ACK trace, a torn-segment abort-gap case, and two assertions that an unACKed-but-committed frame must remain invisible until a separate WATERMARK write. Source publication is now SQLite's atomic durable commit. This is **not** a passing full legacy-verifier gate. Separate final runs preserve all applicable semantic cases, five storage-independent cases from the remaining files, and the SQLite replacement checks. Full verifier porting and independent acceptance remain with review.

First attempts remain in evidence: pnpm rejected store-dir with exec/run; the initial suite lacked installed ulidx and the first typecheck lacked core dist. A frozen install plus a normal core build resolved setup. The first baseline copy lacked root tsconfigs and ran no tests; the second and final baseline attempts passed. Initial SQLite package testing exposed the closed-claim Effect defect and the remaining segment-specific gap test; both were corrected, with logs retained. The initial empty-fact 80-kill probe was repeated with ten facts per commit and recovery checks of receipts plus row counts.

The follow-up epoch-prefix regression first failed at `evidence/epoch-before-vitest.log`: five no-write restarts ahead of a commit, with maxApplyCommands=1, never reached that commit. Fix `e5f6ae9` gives replica catch-up a partial commit-frame index and excludes epoch-only records from the commit budget; returned frames are CRC-checked. `evidence/epoch-fixed.log` passed. The frame feed still returns epoch records normally.

The first built ESM CLI smoke test failed (`evidence/final/dist-smoke.log`): Node passes a parent's `--input-type=module` to eval workers, making their CommonJS `require` undefined. Fix `3a53c3b` strips only that input-type flag, preserves resource/loader flags, and forwards worker exits/errors to outstanding async requests promptly. A new real ESM CLI subprocess test and the final built smoke test pass. The original startup failure and its timeout were retained.

The legacy verifier failure left exactly one tsx parent and its Node holder orphaned. Process inspection proved this worktree, script, stream path and IDs before those two processes were killed; `evidence/cleanup.json` retains ownership and the empty follow-up scan. No unrelated process or engine was targeted.

## Evidence and results

Implementation head for the first final gates: `a358809`. Each `evidence/final/<gate>.json` records command, head, source SHA-256 map, environment, start/end, result and log SHA-256. All completed first-final receipts have `sourceStillMatches: true`. `evidence/baseline-source.json` binds the `1b55d2e` archive and the small baseline harness/config adaptations. Build/dependency hashes and driver SQLite identity are in `evidence/build-dependencies.json`. Additional final results follow below.

| Gate at a358809 | Result |
| --- | --- |
| Package offline suite | 71 passed, 26 live tests skipped |
| QLever typecheck and build | Both exit 0 |
| Unchanged semantic verifier files, 60 seeds | 23/23 passed |
| Applicable old verifier storage cases | 5 passed, 3 obsolete cases explicitly filtered |
| qlever-dev light broker suite | 5/5 passed |
| Actual full-process SIGKILLs, ten facts/commit | 80 kills; 474 recorded ACKs; 0 lost frames, receipts or ten-row groups after successor recovery |
| R25 mid-WAL corruption reproduction | 100 ACKed ten-fact commits, writer SIGKILL, flip at 30% of WAL; restart refused through ACKED cross-check |
| H1 basis/retention/reopen and reader/writer tests | Four new SQLite tests passed within the package suite |
| Lint and whitespace | Scoped oxlint and git diff --check passed |

The first four SQLite tests cover ordinal cuts, assertion/retraction replacement, retained pins and below-H/above-W refusals, source fallback after purge, receipt/claim/row recovery, duplicate operation replay, CRC and sidecar refusal, and 1,600 fixed-basis pulls overlapping 200 writes.

### Outage cost: fresh baseline and candidate

Both arms run the verifier's same workload at 10k and 30k commands, with its independent frame-replay oracle, 64 concurrent producer loops, 500 target subjects, and one selected entity per outage pull. Baseline is the archived `1b55d2e` product source; candidate uses the worktree. These are short shared-host diagnostics, with millisecond-rounded raw outputs; they are not calibrated latency acceptance.

| Commands | Arm | Outage pull ms | Eight outage pulls ms | Lone commit ms | Commit overlapping outage pull ms |
| ---: | --- | ---: | ---: | ---: | ---: |
| 10,000 | segment baseline | 125 | 983 | 6 | 127 |
| 30,000 | segment baseline | 379 | 2,965 | 6 | 363 |
| 10,000 | SQLite candidate, 3a53c3b | 1 | 2 | 5 | 7 |
| 30,000 | SQLite candidate, 3a53c3b | 1 | 2 | 5 | 9 |

Raw baseline: `evidence/final/before/check3-outage-scale.json`; candidate: `evidence/final/r3-verifier/check3-outage-scale.json`. Both exactness checks pass. These values should not be read as a stable speedup factor from a single pair of shared-host runs. In the preceding e5f6ae9 run the DB file alone was about 80.5 MB at 10k and 271.4 MB at 30k, versus segment files of 15.0 MB and 45.2 MB; WAL and other project-owned files are additional.

### Reader versus writer diagnostic

`evidence/read-write.json`, final 3a53c3b run: 200 ten-fact broker commits per arm, offered every 20 ms; 0 versus 16 logical readers on four reader threads, fixed retained basis. Both arms completed all 200 commits; 150,568 pulls completed with zero errors or basis/row violations. Commit p50/p99 was 10.14/38.35 ms without readers and 8.63/40.05 ms with readers; pinned read p50/p99 was 0.284/3.155 ms, about 37,595 pulls/s. The read target remained fixed while writes touched other entities; replacement/retraction exactness is checked separately by the deterministic H1 tests and model schedules. Each phase lasted about four seconds. This establishes concurrent progress in that diagnostic only; it does not close the 256-reader, year-one-scale or calibrated P1 ratio gates.

## Boundaries and open work

No merge, push, default enablement, deployment, package publication, root pnpm check/pack check, Postgres/FoundationDB integration, browser/e2e, power-loss test, full 100k-subject sweep, erasure qualification or year-one-scale acceptance was done. Only qlever-dev at localhost:7070 was contacted for live checks; no engine lifecycle action, exclusive engine slot, unrelated database, default Docker daemon or forbidden port was used. All heavy commands used heavy.mjs and host free space remained above 5 GiB.

Legacy broker directories require explicit migration and are refused; there is no automatic segment-to-SQLite importer. Normal online repository composite routing is preserved; the new explicit pinned-pull API and outage route use H1. No automatic one-hour horizon advancement or pin expiry policy is introduced. Retention is explicit, source fallback rows remain retained, and abandoned pins are cleared on process restart because their reader threads died with the process. End-to-end P5 evaluation/publication is outside this experiment.

Synchronous compatibility utilities can still block their caller's event loop; application row reads use the asynchronous paths. Out-of-process feed readers can outlive a writer, so R25's separate-process recovery/epoch caveat remains; the qualified application reader pool dies with its owning broker. This run does not qualify damaged-sidecar recovery, a multi-process feed service, long-duration checkpoint starvation, the forced 64 MiB gate/stuck-reader scenario, or an erasure policy. The SQLite/source-index footprint is larger than the segment; latency improvements do not establish a storage budget or write-amplification bound.

## Final source-bound gates and unresolved finding

Final implementation head: `3a53c3b` (after `a358809` and `e5f6ae9`). Report/evidence-only commit follows. Final receipts use `evidence/final/r3-*`; they bind this head and the same source hashes before and after. The final frozen install also passed without changing the lockfile. `evidence/build-dependencies.json` binds the final compiled output and native better-sqlite3 binary. The branch's QLever package is private, so no publishable Changeset was added.

| Gate at 3a53c3b | Result / receipt |
| --- | --- |
| Offline package | 73 passed, 26 skipped; `r3-unit.json` |
| Typecheck / build / built ESM smoke | exit 0; `r3-typecheck.json`, `r3-build.json`, `r3-dist-smoke.json` |
| Semantic verifier, 60 seeds | 23/23 passed; `r3-verifier.json` |
| Applicable storage regressions | 5 passed, 3 skipped; `r3-storage.json` (three obsolete cases explicitly filtered) |
| qlever-dev | 5/5 passed; `r3-live.json` |
| Kill durability | 80 actual SIGKILLs, 474 ACKs, 0 lost; `r3-kill80.json` plus `evidence/kill80-final.json` |
| WAL corruption | startup refused through ACKED; `r3-flip-wal.json` plus `evidence/flip-wal.json` |
| Reader/writer | 200 commits per arm, 150,568 exact pinned pulls, 0 errors; `r3-read-write.json` |
| Frozen install | exit 0; `frozen-install.json` |

**Unresolved, do not erase with reruns:** at e5f6ae9, the first full package rerun reported 30 facts where the hot-subject test expected 40 after eight successful concurrent transactions (`evidence/final/r2-unit.log` and its source-bound receipt). The exact unchanged suite then passed 72/72 (`r2-unit-repeat.*`), and the final suite passed 73/73. Additional diagnosis repeated 50 far-valid-time schedules, 50 near-valid-time schedules, and 50 copies of the exact original package case with retained row/position/time diagnostics; none reproduced the failure. Logs are `evidence/hot-diagnostic.log`, `hot-near.log`, `hot-exact.log`; scripts and surviving raw diagnostics are copied to `evidence/diagnostics/` as text/JSON. The first failing fixture was removed by the package's existing afterAll cleanup, so that attempt has no row-level forensic trace. No storage fix is claimed for this observation. It remains a review finding and blocks a claim of completely established read correctness.

The final model schedules recorded 3,330 commits with no failed or unknown commits, 3,046 normal reads, 1,671/1,671 exact outage reads, 205 simulated crash-reopens, 301 replica regressions and 595 outage actions. Its 339 gate reads yielded 62 accepts, 277 typed refusals and zero stale accepts; the mismatch list is empty. These denominators are bounded generated schedules, not exhaustive interleavings.

The final high-fanout run emits Node MaxListeners warnings from temporary per-request worker error/exit handlers. Each handler is removed when its request settles; the warnings do not make this a sustained-leak measurement, and long-duration resource qualification remains open.

All passing gates are builder execution, not independent promotion. Open questions: the single non-reproduced 30/40 observation, complete migration of the old substrate-specific verifier tests, and the production/scale/retention/erasure boundaries above. Evidence and report are sealed by `evidence/MANIFEST.json`; source remains in the three implementation commits and raw stream directories recorded by their receipts.
