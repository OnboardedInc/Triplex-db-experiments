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

## Round 2 — 2026-11-08/09, continuation of 6946d91

### Result and remaining boundary

Added XTDB X6 DEBUG logs, X7 raw OTLP spans, independent bidirectional T1/T2 transport capture,
observer-only read-only count/finish-block/scanner commands, five source-derived protocol normalizers,
and a lower-overhead nonce clock transport. **This remains partial protocol coverage, not O-OBS closure.**
The unmodified pinned consumer `463703d` authenticates fresh XTDB and QLever bundles and screens the
implemented protocol records. No acceptance contract, oracle code, public package or resident engine
configuration changed. No production promotion, full NS workload result or independent recollection is claimed.
Live Datomic was **skipped as instructed**; no D container was touched this round.

The default standalone parser is reproducibly assembled from `normalize_base.py`, `otlp.py` and `wire.py`.
`compile_protocol.py` snapshots a standalone per-stream parser with the evaluator's frozen case specification
before collection. Raw timestamps, requests, counts and metrics are derived from captured bytes; case JSON
cannot supply observed counters or acknowledgements. Source/parser/controller/configuration preimages remain
with each attempt. Runs used actual modified working bytes, not a fabricated pre-run Git anchor.

### Collection and integrity changes

- Observed exclusive XTDB profiles enable a read-only port, synchronous escaped DEBUG file log and local
  OTLP receiver; QLever profiles enable Q1/Q3. Feature-isolated A/A profiles are explicit and hashed.
- The normal measured host engine port forwards through the observer proxy. Native measured ports are
  unpublished; an explicit `--diagnostic-direct` bypass exists only for overhead arms. Those arms cannot
  establish transport completeness. The SUT receives neither the output/key mount nor command queue.
- T1 reconstructs plaintext pgwire startup, simple/extended statements, cancel targeting and replies;
  T2 reconstructs HTTP/SPARQL/admin calls and WebSocket cancel frames. Unknown client protocols and TLS
  refuse. A truncated cancelled server reply preserves parsed client classification with an explicit
  `serverDecodeError`; independent count replies still refuse truncation. Truncation never implies CANCEL success.
- Raw OTLP protobuf, exact integer attributes and fixed64 nanoseconds are retained/decoded using the
  [v1.5.0 trace schema](https://github.com/open-telemetry/opentelemetry-proto/blob/v1.5.0/opentelemetry/proto/trace/v1/trace.proto)
  and [common schema](https://github.com/open-telemetry/opentelemetry-proto/blob/v1.5.0/opentelemetry/proto/common/v1/common.proto).
  X6 tracks inode/byte offsets and refuses discontinuities. Frame `sourceMono` preserves sampling time when
  concurrent capture callbacks require serialized header intervals.
- Observer startup now waits for source/listener readiness. The capability policy supersedes round 1's
  “all capabilities dropped”: it adds only `DAC_READ_SEARCH`, needed for engine-owned 0600 Arrow files,
  while engine data remains mounted read-only. Root filesystem remains read-only; no Docker socket is mounted.
- Private host-tool commands retain complete read-only pgwire count transcripts, finish-block HTTP replies,
  and literal scanner file SHA256/size/hit inventories. Scanner capabilities do not include FSST decoding,
  freed blocks, live heaps or complete erasure inventory.

### Consumer screening and gates

`round2/final-gate.log`: **14 existing Python + 8 round-2 Python + 9 Node tests pass**, through `heavy.mjs`.
Tests cover real consumer authentication, tampering/omission/key/parser/clock boundaries, exact OTLP decoding,
SQL literal/comment classification, client-address separation, truncated-backend handling, strict PREABORT
control inventories, feature/profile planning and the real persistent-clock transport. Source-normalizer
regeneration reproduced SHA256 `62159b6ab9122d2709aebac8296b9043a9af5c30dcf0beff4adac1d656a78596`.
A review found and fixed a follower-profile JVM-setting regression; its regression test passes.

Fresh source bundle **obs01-r2-x09** seals and authenticates. The evaluator diagnostic case screens:

| Protocol | Result | Limit |
| --- | --- | --- |
| NO-MUTATION | PASS | X1 completed-ID delta agrees with T1 classified requests in the frozen window |
| PREABORT | PASS | X6/T1 agree; exact control inventory present once; unexpected statements refuse |
| SCRATCH | PASS | Independent X4 read-only counts agree; no unresolved-outcome path tested |
| CONNECTIONS | PASS | H4 read-only pool releases within pinned `T-CONN-RELEASE-MS=5000` |
| RESOURCE | PASS | H1 covers only the declared engine owner; cgroup peak is conservative memory, sampled disk a lower bound |

The initial CONNECTIONS screen failed because the diagnostic evaluator context omitted the threshold;
`protocol-check-threshold/` retains the explicit corrected context and verdict. Source bytes were unchanged.
Removing the second independent kind **FAILS** NO-MUTATION. Intentional-write attempt **x03 FAILS**
NO-MUTATION (source disagreement at window boundary) and SCRATCH (changed count); PREABORT passes its separate
quiet window. These are diagnostic cases using a contract obligation identifier, not execution/closure of G3.
Evidence: `round2/protocol-verdicts-x09-threshold.log`, `obs01-r2-x09/protocol-check-threshold/`,
`round2/protocol-verdicts-x03.log` and corresponding evaluator records.

Fresh QLever **obs01-r2-q01** seals and authenticates; **NO-MUTATION and PREABORT PASS** using Q1/T2
and Q3/T2 respectively. Removing transport corroboration FAILS. Evidence: `round2/protocol-verdicts-q01.log`
and `obs01-r2-q01/protocol-check/`. This clears the former empty-clock authentication failure for a fresh
run, without changing the failed round-1 q02 bundle or weakening the clock gate.

The other **9 of 14** protocol derivations explicitly refuse incomplete facts. CANCEL still needs independently
bound caller ACK/reuse/transport outcome fields; WORK lacks complete write/byte units; ACK-ORDER, WATERMARK
and FAULT-TRANSITIONS need composition-specific publication/route evidence. AVAILABILITY, SCALE-COUNT,
MAINTENANCE and ERASURE-SCAN also lack complete source mappings. Physical erasure, full application ownership,
TLS transport, multi-owner resource closure and live Datomic remain unverified. `pnpm check`, package builds
and full NS gates were not run: no package contracts changed, and focused lab gates cover this tooling change.

### R27 probe outcomes this round

| Probe | Observed outcome | Evidence / qualification |
| --- | --- | --- |
| P1 | Q1 emits update started/finished counters with `--enable-metrics`; fresh bundle authenticated | q01 raw Q1 and protocol check; resident unchanged |
| P2 | Completed-ID gauge changes on seed writes; finish-block advances submitted message position independently | x02/x09 X1 and finish-block reply; IDs are non-dense, delta is not transaction count |
| P3 | H4 sees 2 RW + 2 RO established connections while active-connections gauge reports 2 | x02/x09 source-summary; confirms R27 caveat |
| P4 | Normal query spans and scan children collected. CancelRequest correlates to backend PID; native log records cancellation, but cancelled query span is missing and same-connection reuse fails | x09: 4 query spans, 8 scan spans; log cancel-received→cancelled 3 ms, caller sees `pgwire closed`; **expected cancelled-span/reuse claim not established** |
| P5 | EXPLAIN ANALYZE JSON reports exact scan rows; x09 scan rows 961 vs latest logical rows 121 | Retained history accumulated across attempts; do not equate physical scanned rows to latest-result rows |
| P6 | QLever query present before cancel, Q3 `end/status=cancelled`, HTTP 429 manually cancelled, active list empty afterwards | q01 Q3/Q4/T2 and driver receipts; no full CANCEL protocol PASS |
| P7 | XTDB canary found in Arrow buffers and log copies. QLever canary query succeeds after rebuild but literal scan finds **zero** in all compressed vocabulary files | q01 finds copies in old update-triples and metrics log; vocabulary declared **blind**, no erasure verdict; Datomic skipped |
| P8 | Nonce transport improves margin; offset intervals agree, but p99 under 2 ms is not universal | Diagnostic traffic only, **NS-load probe unrun**; details below |
| P9 | All five observer components exercised on small bracketed native writer traces | Diagnostic only, **not** a full NS writer-cost qualification; proxy exceeds 5%, details below |

### Clock diagnosis

The old implementation timed an entire new HTTP exchange, including connection setup and HTTP work.
Its 2.27/2.75 ms rejected samples were conservative uncertainty failures, **not proof of a wrong clock domain**.
Those old failures did not retain complete raw timing tuples, so their exact offsets cannot be recovered.
The new persistent nonce exchange timestamps send **after connection establishment**, echoes a unique nonce,
and retains send/receive/VM times even on a >2 ms rejection. Midpoint/half-RTT correlation and the 2 ms gate
are unchanged; no clocks, acknowledgements or zero-RTT samples are invented.

`round2/clock-analysis.json` intersects feasible offset intervals `[observerMono-receive, observerMono-send]`
for both methods. They overlap in the successful comparisons, consistent with the same kernel clock domain.
In x03, HTTP p99 was 6.414 ms (4/40 rejected) vs nonce 1.241 ms (0/40). In x09, HTTP p99 was 7.738 ms
(31/40 rejected) vs nonce 2.183 ms (1/40). In fresh q01, HTTP p99 was 8.403 ms (10/40 rejected) vs nonce
3.735 ms (1/40). q01's actual watcher retained 12 accepted samples, RTT 0.477–1.811 ms; x09 retained 11,
0.739–1.249 ms. Both fresh bundles authenticate, but **NS-load p99 margin remains unqualified**. If such
load cannot meet it, R27's VM-local harness clock is still the fallback; this change does not pretend otherwise.

### First failures retained

x01: scanner could not read engine uid-owned files; fixed with read/search capability on RO data. x04: proxy
readiness race; fixed by explicit ready receipt. x05/x07: native cancellation closes the pgwire connection,
not successful reuse. x06: diagnostic driver spun on a closed clock socket; only its confirmed owned PID was
terminated, source retained, then EOF handling, clock idle timeout and subprocess limits were corrected.
x07: evaluator window began before first socket observation; the next attempt uses a covered window.
x08: native cancellation produced a truncated backend payload; client-request evidence now remains usable,
while counts and cancellation success remain strict. Their raw failures and unsealed bundles remain archived.

### Observer cost diagnostics (P9)

Each arm executes 30 warmup and 150 measured identical native commits, pinned engine CPU 2 and observer CPU 5.
Shared residents remain unpinned. Existing slot history grows across XTDB arms, and baseline drift remains visible;
this is a diagnostic trace, not a controlled full NS workload or SDK cost comparison.

| XTDB arm | p99 ms | Ratio to mean bracketing p99 |
| --- | --- | --- |
| Baseline before | 20.364 | 0.886 |
| H1 memory-current at 10 Hz | 18.985 | 0.826 |
| T1 proxy hop | 31.996 | **1.392** |
| X6 DEBUG | 18.291 | 0.796 |
| X7 spans | 23.651 | 1.029 |
| Baseline after | 25.621 | 1.114 |

QLever Q3-log p99 is **11.398 ms**, versus baseline before 7.556 and after 3.492 ms, ratio **2.063** to
their mean. This does not qualify the 5% budget. Below-baseline arms do not prove free observation either.
Treat observers as protocol-run tools until a controlled writer trace establishes acceptable cost. Raw latency
arrays, readbacks, configuration and teardown receipts are retained under `round2/overhead/` and
`round2/overhead-qlever/`; no latency samples were discarded.

The QLever trace repeats identical `INSERT DATA`, so after its first insertion it is idempotent. Its timings
measure native update-path/logging work, **not sustained visible writer progress**. XTDB repeatedly versions
one fixed identifier. Neither trace qualifies the frozen writer floor or predicts application goodput.

### Preservation, release and cleanup

Before releasing s1 for K01, copied and read-back verified the original volume contents, source archive,
observer bundles, failed attempts, private evaluator keys, profiles and witness lines into
`/Users/sam/Claude/Projects/triplex-db-2/evidence/OBS01/`:

| Archive | SHA256 |
| --- | --- |
| round1-xtdb-volume TAR | `524922651e2e38b7854675db158e426fbea646929ff2e933ac421c285a02869a` |
| round1-qlever-volume TAR | `19b6912731f5cd25d9ca4e54f8518f0f3ee4ea2e75e5581c5efefba47237398b` |
| round1-host SHA256SUMS.json | `fa4c0529e81bbf16cb89f576ecc9edd6002e08bf16955c2aba7ed853d1ae641e` |
| round2-xtdb-volume TAR | `ca3723bcd4761d6abfe55b0478a74fe38965eedbaaa6250e0cc0d4242adc2e58` |
| round2-qlever-volume TAR | `c141b39eaa0d48abdda2aef40950e8135b2302e08cca50fce65ff6c4faf35b07` |
| round2-host SHA256SUMS.json | `6e6920a251eb5eed3bbab16986abab9bbf5353c394f95f1932ed5758eae00ec4` |

Volume archiving uses a pool-admitted utility started only by `engine.mjs`, holder-checked quiescent volumes,
read-only source mounts, a per-file SHA256 manifest, TAR readback and a second source scan. Only after those
checks did `engine.mjs ... --remove-volume` remove these four owned disposable volumes and release slot locks.
The original round-1 host archive has 13,251 entries; an additional source-vs-copy comparison verifies 13,171
immutable run/key/profile files. Round-2 host archive compares **55,696 original/copied files**, with 55,697
manifest entries. Keys stay private (directory 0700, files 0600) outside bundles and Git. Retained working
source snapshots are actual byte preimages; `source-6946d91.tar` is the original Git archive. Final archive
receipt emission and this final report occur after the host snapshot and remain committed here.

Receipts: `round2/archive-{xtdb,qlever,host}.log`, `archive-source-comparison.json`,
`archive-{xtdb,qlever,host}-r2.log`, `attempt-inventory.json`, `cleanup-status.log`, `cleanup-owned.json`.
The final owned-resource check records **all eight named engine/observer containers absent, all four owned
s1/s3 volumes absent, zero CX-OBS01 reservations and zero CX-OBS01 retained volumes**. Other holders' volumes
and all dev residents were left alone. s1 was not reused after its initial archive/release; later probes used s3.

### Handoff

The independent reviewer should recollect and replay the source-bound cases, test wire/parser omissions and
window ambiguity, and challenge the declared ownership/coverage limits. Outstanding implementation questions
are complete independent CANCEL/ACK/publication bindings, WORK units, application-wide resource ownership,
encoding-aware/freed-block erasure coverage, and NS-load clock/cost behavior. Datomic waits for the separate
lane owner as instructed. No merge or push was performed.
