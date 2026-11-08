# EXP-OBS01 — observer sidecar and obs-bundle/1

**Builder:** CX-OBS01, Codex gpt-6.1-sol, medium. **Branch:** `exp/OBS01-observer`, from main `78a2b7f`.
**Date:** 2026-11-08. **North star:** an independent collection floor for O-OBS and P1–P5 claims, without trading correctness for performance.
Authority: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; design R27, Q82a–e; consumer `exp/O05-observation-oracle` at `463703d`.

## Result and boundary

Implemented the independent collection foundation and demonstrated real retained bundles authenticating in the specified consumer.
**This is partial delivery of the requested O-OBS floor, not complete protocol coverage or acceptance.** The included normalizer
reconstructs source samples; it does not reconstruct every protocol's case fields. No O-OBS semantic PASS, P1–P5 promotion,
performance result or independent verifier recollection is claimed. The separate reviewer must repeat collection.

The missing pieces are XTDB X6 DEBUG/X7 spans and active-query/drain coverage, transport proxies for the two-kind safety rules,
protocol/case normalizers, physical scan decoders and controls, and live Datomic collection. There is no exclusive Datomic slot in
the current shared slots configuration. Its resident was not reconfigured or stopped. The D1 callback and H5 planning paths have
unit coverage only and require an orchestrator-provided exclusive slot and preconfigured callback.

## Implemented

- `lab/observer/collector.py`: Python stdlib sampler, exact source-byte retention, content-addressed objects/chunks, dense per-stream
  sequences, SHA256 chains over exact header bytes, HMAC-SHA256 headers and final seal. The external key is never serialized.
  A failed source or exhausted byte budget leaves unsealed evidence. Existing run directories are never overwritten.
- `lab/bin/observer.mjs` and `engine.mjs`: `observer-image`, `observer-up`, `observer-down`, `observer-watch`, `observer-witness`,
  `observer-bridge`, `observer-retain`, plus `logs --observer`. Only the exclusive slot holder can provision an observer.
  Pool admission includes its 128 MiB hard memory cap and full output forecast. The default output budget is 64 MiB plus 8 MiB for
  tooling/receipts; explicit budgets are bounded from 16 MiB through 1 GiB. Each new attempt must have a fresh key fingerprint and
  key ID; their registry is outside the observer mount. Earlier diagnostic attempts reused a test key; final run 05 uses a fresh key.
- Sidecar namespace/mount isolation: engine network and PID namespaces, host cgroup namespace, own pinned CPU with quota, read-only
  engine volume/cgroup/code/config/key, read-only root filesystem, all capabilities dropped, no-new-privileges, no Docker socket.
  Only its own output mount is writable. Engine teardown/replacement refuses while an observer exists. The SUT gets no output/key mount.
- XTDB X1 `/metrics` retains every metric/tag, including `node.tx.latestCompletedTxId` for every database. H1 reads the engine's actual
  cgroup v2 files and H4 reads IPv4/IPv6 sockets. QLever additionally samples Q1 metrics, Q4 active queries and Q3 event-log tails.
  D1 callback-file tail and H5 gateway thread CPU/name/stat snapshots are implemented as configurable source plans.
- QLever `--enable-metrics` and its event log are enabled only in the generated script for an exclusive `--observation-sources` slot.
  The shared `qlever-start.sh` and dev residents are unchanged. That flag also publishes an observer clock port on loopback.
- CPU claims are checked under the pool lock against pinned containers/reservations; future engines cannot overlap an admitted
  observer. Existing unpinned dev residents can still use that CPU: this is isolation from the measured slot, **not proof of a
  physically exclusive core systemwide**. Unpinned exclusive measurement slots refuse observer admission.
- Host tooling starts a watcher, samples clocks each second and fsyncs independently retained chain heads every ten seconds and at
  stop. The witness log is never mounted into the observer. The VM `tMono` on a witness is its header's collection end; new witnesses
  also record actual host observation monotonic and wall times. Bridge samples with RTT >2 ms are rejected, never manufactured.
- Standalone hash-pinned source decoding is rerun by O-OBS. Metric decimal strings and labels are preserved without float conversion.
  Kernel/socket data and lossless tail snapshots are decoded; detected rotations refuse continuous normalization.
- Per-run code/config/tooling receipts, raw failures, independent witnesses and stop records are retained. Final run 05 includes
  exact `engine.mjs`, `observer.mjs`, `lib.mjs`, collector and normalizer copies, plus mounted engine config bytes. Its copies match
  the final implementation (`evidence/final-source-copy-check.json`). Runs began from a modified working tree; this report does not
  claim a pre-run Git anchor or retroactively assign one.

### Representation choice

R27's envelope/header/seal interface is unchanged. Each authenticated chunk is a lossless sample frame containing the source bytes
in base64, their SHA256, and the observer interval. The exact original source bytes also live at `objects/<sha256>.bin`. HTTP capture
keeps actual received status/header/body bytes, including transfer encoding. Tail payloads retain inode, offset, rotation and new bytes.
Framing lets a standalone normalizer recover sample boundaries and observer times after O-OBS concatenates all chunks on stdin.
This is an explicit adaptation of the raw-chunk representation, not a claim that framed bytes are unframed vendor bytes.
`normalized/sources/*.json` and the redundant objects are convenience views; authenticated frames are the normalizer's authority.

## Gates and actual evidence

- `node lab/bin/heavy.mjs --label CX-OBS01-final-source-live -- node lab/observer/final_probe.mjs` completed. Its internal gate
  uses `git show 463703d:...` to load the exact consumer, without merging its branch. **14 Python tests and 7 Node tests pass**:
  actual writer/authenticator interoperability; altered raw bytes; wrong keys; missing final witnesses/chunks; parser replacement;
  missing seals; invalid clock uncertainty; repeat-run preservation; bounded output; actual HTTP capture/decoding; metric precision;
  log rotation; CPU/key/image/identity preconditions; protected ports; QLever profile and Datomic source planning.
  Evidence: `evidence/obs01-xtdb-05/gate.log` and `evidence/gate-final.log`.
- Final real XTDB run **obs01-xtdb-05**: sealed, final independent heads witnessed, and O-OBS `authenticate()` succeeds across all
  nine streams. `evidence/obs01-xtdb-05/authenticate.log` explicitly says `semanticAcceptance:false`. The evaluator key remains
  outside Git and the bundle at `runs/OBS01/final-evaluator.key`. Retained run:
  `/Users/sam/projects/triplex-db-2/runs/engines/observers/obs01-xtdb-05/`.
- Real XTDB run 04 and QLever run 01 also authenticate: `evidence/xtdb-live-authentication.json`,
  `evidence/qlever-live-authentication.json`. These are earlier diagnostic attempts, not substitutes for the final fresh-key run.
- QLever run 02 sealed with real cancellation evidence, but **authentication fails: clock bridge absent** because all clock attempts
  were rejected (2.27/2.75 ms RTT plus a startup socket failure). See `evidence/qlever-live-authentication-r2.json` and retained
  `obs01-qlever-02/bridge-rejections.jsonl`. This remains a recorded failure, not a passing safety witness.
- Live probes used an explicitly reduced **diagnostic-only** profile: XTDB 1.5 GiB/one CPU, 512 MiB heap/direct caps, 128 MiB cache;
  QLever 1 GiB/one CPU with 256M query memory. Both were pinned to CPU 0; observers to CPU 5. These fit beside the residents after the
  ordinary 3.5 GiB slot request was refused by the 9.25 GiB occupied pool. Profile bytes remain in this worktree's
  `runs/OBS01/diagnostic-config/`, and final mounted XTDB config bytes are copied in the final run. No production/performance bar is inferred.
- No public packages, generated dist artifacts, acceptance contract or publication pins changed. No dependency installation was needed.
  `pnpm check`, package builds, NS workload gates and package conformance suites were not run; this is a lab tooling change with focused
  unit and real-engine collection gates. There was no independent reviewer execution in this builder run.

## R27 P1–P9 probe ledger

| Probe | Outcome | Evidence / limit |
| --- | --- | --- |
| P1 QLever metrics | Feature confirmed | `/metrics` HTTP 200; actual `qlever_sparql_operation_*` gauges/counters and Q3 log collected. `evidence/obs01-qlever-01/p1-metrics.json`; authenticated run 01. |
| P2 XTDB mutation gauge | Partial diagnostic confirmation | Completed gauge changes across the write; reads return the canary without another observed change. Transaction IDs are non-dense (do not interpret their numeric difference as number of writes). Raw/tagged sequences in `evidence/diagnostic-summary.json`, driver events in each XTDB run directory. No finish-block comparison was run. |
| P3 read-only-port connections | Not run | Diagnostic slot did not enable/publish the additional read-only port. H4 and read-write connection gauges were collected, but the two-port Micrometer hypothesis is unverified. |
| P4 OTLP query/cancel spans | Not run | No OTLP receiver/exporter or X7 parser was implemented. X1 cannot establish query drain. |
| P5 EXPLAIN ANALYZE | Confirmed for one-row diagnostic | JSON `attributes.scan_rows_read=1`, pages used=1; decoded object retained in `evidence/obs01-xtdb-05/p5-explain.json`. This is driver-issued EI diagnostic output, not an X4 observer stream or O-OBS work acceptance. |
| P6 QLever cancel | Engine feature observed; bundle unqualified | First attempt ended `failed` at the query memory limit before cancel. Revised query reduced intermediate cardinality and cancelled earlier: Q4 lists `obs01-cancel-02`, Q3 records `status:cancelled`, HTTP settles 429, Q4 then `{}`. Q3 start/end differ by 15 ms on the engine wall clock. Revised bundle fails clock authentication; no OBS-CANCEL PASS. |
| P7 physical scan controls | Not run | No FSST/segment decoder or per-location positive-control scanner was implemented. The synthetic canary remains on retained volumes; no erasure verdict is claimed. |
| P8 bridge under NS load | Not run at NS load; diagnostic timing failure observed | Accepted samples <=2 ms in XTDB 04/05 and QLever 01; all three samples in QLever 02 rejected. No load p99 is established. Clock limitations fail closed rather than relaxing the 1 ms uncertainty. |
| P9 A/A observer cost | Not run | No matched writer trace/arms; reduced profiles and resident CPU contention cannot support the requested overhead comparison. |

## First failures and corrections

1. Standard slot admission refused while Datomic became resident. No resident was parked. A smaller, explicitly diagnostic profile
   was admitted through the same engine pool and heavy-job machinery.
2. Host unit tests initially tried Linux `/proc/self/cgroup` while constructing a fixture on macOS. Runtime identity discovery moved
   to the actual Linux run entry point; portable Bundle tests now use explicit fixture identity. Original failure log retained.
3. Reading `/proc/1/cgroup` inside the engine returned `/` because Docker gives it a private cgroup namespace. The observer instead
   resolves the engine's PID 1 after joining the **host** cgroup namespace and verifies the full engine container ID in that path.
4. First running observer lacked the HTTP file wrapper's `flush()` method. Preserved Docker traceback, added the method and an actual
   socket HTTP regression test. Run 02 is unsealed and retained.
5. Run 03 exhausted the initial byte budget while the heavy driver waited. Its unsealed failure is retained, along with evidence that
   the initial accounting underforecast filesystem allocation. The driver is now admitted before collection starts, accounting is more
   conservative, and the complete configurable budget plus receipt allowance enters pool admission. This is not filesystem quota proof.
6. QLever cancellation attempt 01 hit memory limits. Attempt 02 explicitly reduced intermediate cardinality and sent cancel sooner;
   the original failure remains in both the original receipts and the retained engine log.
7. QLever attempt 02 had no acceptable clock bridge. It is sealed but unqualified; the oracle rejection is preserved.

## Cleanup, retention and next work

`evidence/cleanup-status-final.txt` records final engine/pool state. Both CX-OBS01 exclusive engines and every observer container are
removed; their slot locks and observer reservations are released. The XTDB and QLever slot volumes are retained with explicit notes.
All first-failure directories, authenticated bundles, raw/normalized evidence, keys, watcher logs, rejected clock samples and witnesses
remain. The dev residents were neither stopped nor reconfigured. No original ZIP, unrelated state, source or unknown backend data was deleted.
No merge, push, deploy or publication was performed.

Remaining work before this can serve the full requested floor:

1. Add X6/X7 collection, trusted source parsers and an actual XTDB query-drain witness; add independent TO corroboration.
2. Supply evaluator-owned protocol normalizers and full case bindings. Source samples alone cannot satisfy `FIELDS` or the two-kind rules.
3. Provide an exclusive Datomic slot, observer-only callback source configuration and live H5 checks. The gateway is CR; no gateway
   response can substitute for an engine fact. D3 peer collection is not implemented.
4. Run P3/P4/P7/P9 and full P2/P8, including per-location canary controls and all protected observer copies in the erasure inventory.
5. Resolve the >2 ms bridge RTT under competing work and the lack of systemwide CPU exclusion without changing the shared residents.
6. Independent reviewer recollection and source/resource/case review are mandatory. The current code is ready for that review as a
   collection foundation; it is not ready to promote P1–P5 claims.
