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

## Round 3 — 2026-11-09, continuation of 5aa62d5

### Result and boundary

Added strict source-derived parsing paths for the nine previously unconditional refusals and a resident-only
collection/screening path. **Complete positive protocol coverage is still not established.** Every one of the
fourteen protocols now has a fresh real resident bundle submitted to the pinned oracle with an actually delegated
context; the selected cohort returns **3 PASS, 11 FAIL, 0 REFUSED**. Its 28 delegation/protocol-negative contexts
return REFUSED. Missing fields remain missing, with explicit source-gap diagnostics. A protocol-name registry or
partial derivation is not a claim that an unchanged resident supplies a complete positive witness.

No exclusive slot was acquired, no engine volume was created/deleted, and no resident was stopped, recreated,
reconfigured, rebuilt or deliberately memory-failed. All resident collection uses `tx2-xtdb-dev`; the user allowed
either shared resident, so no QLever or Datomic run was needed. Lane D remains untouched pending EXP-DA04.
Tiny diagnostic tables use only the `obs01r3_*` namespace. Those fixture records remain; no unrelated table was changed.

### Exact oracle/contract/context binding

The screening implementation is `23e2273fc6b15b92821b318acd387f5484155d8a`, extracted with `git show` into
ignored `runs/OBS01/r3-oracle/observe.py`. The retained contract is **0.3.12 from f5e7a413e17948738472d3465bcfdda3b72b2e41**,
not this worktree's inherited 0.3.10. `round3/contract.json` contains the exact bytes and `round3/pins.json` their
SHA256 and canonical-context identity. The moving review branch later reached 72a1a164; its byte differences are
inputs, runner/verifier provenance and transitive digest. This run does not silently relabel its original contract snapshot.

Each family selects a relevant obligation whose **actual `oracles` contains O-OBS**, includes every threshold required
by that obligation, and names its registered protocol. WORK selects `G8.reuse.positive-witness`, exactly
`T-REUSE-AVOIDED`, witness kind `reuse`; MAINTENANCE separately pins `NS-P3-LAG-P99-MS`. No `needsNewOracle` or
registry-wide declaration substitutes for delegation. The real-bundle negative contexts change only the obligation
or requested protocol; their CLI exits are 2/REFUSED with CONTEXT-CONTRADICTION. The selected FAIL results occur
after the guard, not because a convenient unrelated obligation was used.

`screen_cli_round3.mjs` retains actual pinned CLI stdout/stderr and process exits, separately from the collection/helper
exit. Exit zero from `check_round3.py` means the diagnostic receipt was written, not semantic acceptance. The original
`cli-results.json` and later `cli-results-final.json` are separate attempts; old failures are retained.

### Implemented derivations and observed limits

`protocol_extra.py`, compiled inline with the existing exact source decoders, accepts native pgwire byte transcripts,
OTLP/log/proc/file samples and evaluator-frozen case selectors. It never accepts an arbitrary completed protocol object.
The field paths are:

- **CANCEL:** backend-PID targeted CancelRequest, native SQLSTATE 57014 caller outcome, and same-connection successful
  reuse from actual request/reply packets; native active-query snapshots are retained when supplied. Independent native
  drain, acknowledgement and complete active-window coverage still lack a complete resident derivation. It does not
  turn a closed socket, attempted cancel or absent span into a successful cancellation.
- **AVAILABILITY:** real caller read/write probe outcomes plus process-start/OOM-counter lifecycle observations.
  A stable process and unchanged OOM counter do not manufacture a failure instant. No resident OOM/restart was injected.
- **SCALE-COUNT:** all eighteen analytic columns are decoded as exact native integers/nulls, then compared by the
  unmodified oracle with O-REPLAY's independently computed result. The small native fixture retains active/retired
  domain, presence and type versions plus command/release marker rows. Its eight-entity width-1 count PASS is a
  **counts-only native representation diagnostic**, not full ORM/generator conformance or year-one population acceptance.
- **WORK:** exact scan-row totals and all explicitly supplied native write/triple/byte profiler units, with distinct
  candidate/comparison operations. Missing units are never filled with zero merely because SQL is SELECT. Native
  resident EXPLAIN ANALYZE supplies rows only; the other three units remain absent.
- **MAINTENANCE:** matched native start/end events and publication/checkpoint differences from native lag rows.
  Unchanged resident telemetry does not provide that complete event-plus-durable-consumer interval here.
- **WATERMARK:** flattened typed C1 eligibility/prefix/snapshot columns and actual observed read-start, engine-request,
  response and read-end intervals. Metadata and answer must be the **same native observation**, not two requests with
  equal SQL. A reviewed composition readback/query profile is still required; generic native reads do not establish routing.
- **ACK-ORDER:** native commit response, independently collected publication readback and nested source-bound WATERMARK
  references. A publication readback after ACK cannot prove earlier publication; its actual later time is retained.
  A second independent non-HR publication/route witness is still required and unavailable on this resident profile.
- **FAULT-TRANSITIONS:** actual observer-client process exit and post-exit marker readback, with transaction/marker
  identity matching before any durable transition object can be emitted. This is an observer-client crash, not a shared
  engine crash. The pgwire commit reply does not bind a native transaction position here, so the marker's business value
  is not mislabeled as that position and no durable transition is invented.
- **ERASURE-SCAN:** per-location raw-byte positive controls, surviving literal and UTF-16LE/UTF-32LE hits, and an actual
  publication readback when provided. `literal-byte-scan/1` cannot establish derived-channel absence. No publication time
  is copied from the case; no canary hit is invented. Full inventory, FSST, freed blocks and physical coverage remain deferred.

These conditional source mappings do **not** finish the missing collector/source integrations above. In particular,
CANCEL's complete two-kind engine-field witness and composition-specific ACK/WATERMARK witnesses remain open implementation
work. Changing resident configuration or supplying adapter assertions as observer facts was not used to conceal those gaps.

### Resident tooling and clocks

`engine.mjs observer-resident` launches only its own short-lived, digest-pinned Python observer after pool admission.
The observer shares the resident network/PID namespaces, has its own 128 MiB cap and CPU 5, RO engine/cgroup/code/key mounts,
read-only root and only DAC_READ_SEARCH. The resident receives no key/output mount. Existing unpinned residents can contend
for CPU; new observers refuse pinned CPU conflicts and reserve their CPU under the pool lock. No physical isolation claim follows.
Cases reject unowned table names, oversized fixture populations, unsafe stream IDs and reused evaluator keys. New engine
admissions respect the resident-observer reservation too. The observer has a 60-second process bound; cleanup retains a
reservation if its own container cannot be proven gone. Final heads are written/fsynced by host engine tooling only.

No new resident ports or tracing configuration are needed. Instead, the diagnostic harness clock reference is a **real separate
VM interpreter exchange**, bracketed with VM monotonic send/receive times including interpreter startup. Actual uncertainty is
retained in each envelope/context; the first selected cohort measured approximately 5.10–9.89 ms, not fabricated zero-RTT.
**This does not meet the <=1 ms observation precision floor and does not qualify NS clock behavior.** The ordinary exclusive
observer's 2 ms RTT gate is unchanged. These resident PASS results are screening diagnostics only, never P1–P5 promotion.

### Selected real-bundle ledger

Selected evidence lives in `round3/a03/<PROTOCOL>/`, except ERASURE-SCAN and ACK-ORDER (`a04`) and the corrected bounded
CANCEL attempt (`a07`). Each has frozen `case.json`, evaluator `context.json`, `evidence.json`, `derivation.json`, and CLI
receipts. Original bundle roots remain at `/Users/sam/projects/triplex-db-2/runs/engines/observers/obs01-r3-<attempt>-<protocol>/`.

| Protocol | Obligation | Actual screening result / reason |
| --- | --- | --- |
| CANCEL | G6.cancel.observed-drain | FAIL: native cancellation outcome/caller settlement missing; drain/ACK/coverage not established |
| PREABORT | G6.cancel.preaborted-no-work | FAIL: complete engine statement log absent; observer-only traffic cannot prove global absence |
| CONNECTIONS | G6.ownership.bounded-connections | PASS: declared diagnostic native socket pool returns to baseline within the pinned bound; not SDK pool qualification |
| SCRATCH | G6.cleanup.scratch-zero | PASS: independent before/after count of the private scratch relation agrees; no unresolved outcome |
| NO-MUTATION | G3.recursion.read-only-frontier | FAIL: completed gauge alone lacks a second independent complete resident write inventory |
| RESOURCE | S.capacity.admitted | FAIL: conservative cgroup peak exceeds the declared 3 GiB forecast by 131,072 bytes; not proof that process RSS exceeded its cap |
| AVAILABILITY | G6.resource.memory-failure-contained | FAIL: native caller probes exist, but no engine failure instant is source-recomputed; no resident memory fault was injected |
| SCALE-COUNT | S.population.year-one | PASS: eight-entity native fixture analytic counts equal independent O-REPLAY; not actual year-one scale |
| WORK | G8.reuse.positive-witness | FAIL: rowsWritten (also triplesTouched and bytesWritten) absent from native profiler |
| MAINTENANCE | G8.maintenance.bounded-boundaries | FAIL: native start/end and complete durable-consumer lag interval absent |
| ERASURE-SCAN | G9.erasure.protected-copies | FAIL: no erasure inventory/publication/control witness; physical coverage intentionally deferred |
| WATERMARK | G8.composition.watermark-routing | FAIL: serving-index/atomic eligibility/route witness absent |
| ACK-ORDER | G7.composition.ack-and-routed-ryow | FAIL: source-publication time, nested route and independent corroboration absent |
| FAULT-TRANSITIONS | G7.commit.protocol-transitions | FAIL: no position-bound durable transition; actual client crash and native marker readback retained |

One bundle/case does not establish repetitions, full application ownership, all contexts or obligation acceptance.
The broad declared socket maximum and engine-only resource envelope are explicit diagnostic case inputs, not discovered SDK limits.

### Failures retained and validation

- a02 AVAILABILITY initially exposed a screening-helper source-disagreement exception (an unavailable lifecycle stream
  had returned an empty probe list). The original stderr remains. The helper now lets O-OBS judge disagreements, and the
  lifecycle mapper emits only lifecycle fields; a03 correctly fails missing engine failure provenance instead.
- The first before/after inspection comparison treated Docker's nondeterministic Mounts array order as a change. The
  original `cleanup.json` is preserved. Sorting mounts by Destination shows identical resident ID, configuration, mount
  set and start time; the correction receipt states precisely what changed in the comparison.
- a03 CANCEL used duplicate output column names, producing native 08P01 rather than cancellation. The query aliases were
  corrected. a06 observed a real native 57014 cancellation but its observer exited without a seal; its precise process-exit
  cause was not captured and is **unverified**. It stays unqualified. Tooling now retains final container state and separate
  stdout/stderr before removal. The bounded a07 query has LIMIT 256, returns before cancellation, and reuses successfully;
  that is retained as a FAIL, not relabeled as successful cancellation.
- Review found `clear-cache` incorrectly classified as QLever read-only/session traffic. R27 lists it as mutating; it now
  counts as a write, with a binary HTTP regression test. No QLever resident was changed to test this parser fix.

`round3/gate-final.log`: **14 existing + 8 round-2 + 9 round-3 Python tests, and 9 Node tests pass** under heavy admission,
using the pinned consumer extracted from 23e2273. Tests cover binary reply parsing, exact counters above 2^53, missing-unit
refusal, surviving encoded canaries, untrusted field objects, source-cell mismatches, same-SQL/different-snapshot rejection,
missing OOM failure provenance, and mutating admin classification. `controller-final-tests.log` repeats the focused controller/
clock tests after admission changes. The final standalone source normalizer SHA256 is
`49b06589161d0c1f7d66e96a13778f943b58983a6bc60a176037242ba77e6d37`.
The a05 count smoke rechecks source compilation/authentication against a current controller. Actual collector/parser/controller
preimages remain per attempt; no later Git commit is retroactively assigned as a pre-run anchor.

No package contracts changed; pnpm/package builds, full NS tests, physical erasure and live lane D were not run. No independent
reviewer recollection or acceptance is claimed. All heavy probes/gates used heavy.mjs with host free space above 5 GiB.

### Deferred commands and open work

`round3/SCALE-WINDOW.md` contains exact available collector, clock, frozen-driver, A/A-arm, scanner-probe and pinned-oracle
invocations. It names the required external frozen driver/trace/fixture-reset artifacts rather than inventing runner flags.
`run_frozen_driver.mjs` validates those pins and the private daemon before executing a supplied argv. The document explicitly
states that no complete physical-erasure qualification command exists until the missing decoder/inventory implementation exists.
Those commands were not executed in this round. Remaining implementation questions are independent two-kind CANCEL engine facts,
composition-native publication/route bindings, all work units, durable maintenance lag and complete physical copy controls.

The new controller rejection test initially expected exit 1, but lab tooling correctly returns **3 for REFUSED**.
That first assertion failure is retained in `controller-negative.log`. `controller-negative-r2/result.json`
records the corrected live negative: an unowned relation is rejected, no observer is created, its reservation
is released, and the resident's ID/start time is unchanged. `controller-final-tests-r2.log` passes the nine
focused Node checks after the final cleanup changes.

### Final cleanup and retention

`round3/cleanup-final.json` records **36 attempt directories**: 33 sealed collection attempts, the unsealed a06
cancellation attempt, and two precollection controller refusals. All named observer containers are absent;
there are zero CX-OBS01-R3 reservations or containers. Every before/after resident identity/configuration/mount
set/start-time comparison is unchanged. No exclusive slot or new volume was used. The separate fault-client
SIGKILL targeted only the observer's disposable Popen child, never the engine or another agent's process.
`round3/summary.json` and `cli-results-final.json` retain the selected 14-case denominator separately from retries,
42 actual CLI results and 28 guard-negative refusals.

Final review also added a physical-prefix boundary check: truncated, nonzero-offset or size-mismatched file
reads cannot become full-file positive controls. The separate final parser regression run passes ten round-3
tests (`parser-final-regression.log`); this focused check ran after the full gate and archival snapshot.

All attempt bytes, private run keys, exact per-attempt parsers/controllers, case/inspection receipts and own
host witness lines were copied to `/Users/sam/Claude/Projects/triplex-db-2/evidence/OBS01/round3-host/`.
The archive compared **2,797 source/copied files**, all matched, with 2,798 manifest entries. Its
`SHA256SUMS.json` SHA256 is **be3e3773341e48bb84d4ad6f403be11afb3905f59d368a6aad83472c36225a42**.
`round3/archive.log` retains the copy verification. Keys remain private, outside bundles and Git.
Final report/documentation and the post-snapshot physical-prefix regression are committed here; the archive's
per-attempt copies continue to represent the actual collection bytes rather than a retroactive final-source anchor.
Original retained runs remain available for direct CLI replay. When restoring only the archive, relocate only the
trusted context's external normalizer paths, preserving exact parser bytes, raw chunks, HMACs and witness heads.
No merge or push was performed.

## Round 4 — 2026-11-09 UTC, continuation of 7edb91d

### Result: partial delivery, ten source gaps remain

The eleven original failures all classify as **(a)**: missing or misinterpreted observer evidence, including
cases that never exercised the required event. None establishes **(b)** prohibited engine behavior. I found
no **(c)** oracle error and did not change the oracle. The requested instruction to fix **every** (a) is
**not complete**. RESOURCE is corrected and re-screened; ten original gaps remain. Several require sources
disabled on the unchanged residents, actual composition-specific inputs, or a fault/maintenance/physical
exercise outside this round's shared-resident permission. Additional observer implementation is still needed
for WORK and position-bound FAULT-TRANSITIONS; those are not presented as externally solved blockers.

The final selected cohort has **4 screening PASS, 10 FAIL, 0 REFUSED** across fourteen real XTDB bundles.
All **28** delegation/protocol negatives are **REFUSED**. Selected passes are CONNECTIONS, SCRATCH,
SCALE-COUNT and RESOURCE. These are narrow diagnostic cases, not acceptance of the corresponding obligations,
the <=1 ms clock floor, application-wide ownership, P1–P5, or year-one scale. The count fixture remains eight
entities, the socket declaration remains a diagnostic native pool maximum, and RESOURCE samples the engine
owner only. A source gap is not evidence of a forbidden engine action.

Evidence: `round4/classification.json`, `round4/cli-results-a03.json`, `round4/summary.json` and per-protocol
`case.json`, `context.json`, `evidence.json`, `derivation.json`, `verdict.json`, `cli-a03/`.
The oracle remains **23e2273fc6b15b92821b318acd387f5484155d8a**, SHA256
`668136f3c99e09b5332363bb6beaac7f177d07ef7718eb59b2b801faeedcb2cb`. The contract remains the exact round-3
0.3.12 snapshot from f5e7a41, file SHA256 `8bb4b393a2b1636eea00a0609d04a28b54adaecdc5d2f9ffd6d582edb2fe935c`.
Both helper and actual CLI screening check these file pins. Moving review-branch bytes were not substituted.

### Classification of every original FAIL

Each original run and exact original/current reason is retained in `round4/classification.json`. The source
requirements below come from R27 sections 5–6 and its protocol/source tables, and the pinned O-OBS field/source
checks. No protocol-text contradiction was found that would justify classifying a failure as (c).

| Original FAIL | Class | Observed cause and round-4 disposition |
| --- | --- | --- |
| CANCEL | a | The bounded query completed before CancelRequest; it did not produce E-CANCELLED. No complete independent active/drain/transport-ACK witness exists. Fresh a01 still FAILs on `tCallerSettled`. This does not show the engine ignoring an active cancel. A safely cancellable workload and X6/X7 plus T1, or qualified Q3/Q4/T2, remain needed. |
| PREABORT | a | Own client traffic is not a complete resident statement log. X6 DEBUG logging is disabled and ingress is not forced through the observer. Fresh a01 FAILs on `engineStatementLog`; absence was never inferred from the observer's own SELECT. |
| NO-MUTATION | a | The X1 completed-ID delta is available, but the T1 recording covers only observer requests. Fresh a01 FAILs for lack of two independent agreeing kinds. Complete ingress capture/classification and an independent engine inventory remain needed; relabeling one capture as a second kind would be invalid. |
| RESOURCE | a, fixed for sampled profile | Lifetime cgroup `memory.peak` was labeled RSS. Its 131,072-byte excess above the 3 GiB forecast is not proof of process RSS exceeding that forecast. Fresh a04 obtains actual engine-process RSS and PASSes screening; limitations below apply. |
| AVAILABILITY | a | The probe generated an invalid-cast error, not the declared memory failure. HR probe outcomes exist; stable H8 PID/OOM counters cannot establish a failure time. Fresh a01 FAILs raw-field recomputation. No resident OOM or restart was induced. A safely contained memory-failure case with X1/X2 progress corroboration remains needed. |
| WORK | a | Actual EXPLAIN scan-row counters exist; `rowsWritten`, `triplesTouched` and `bytesWritten` do not. Fresh a03 FAILs on `rowsWritten`. Attributed X3/X7 and H1/H3 unit collection is still unimplemented here; global shared I/O and SQL spelling cannot be substituted or zero-filled. |
| MAINTENANCE | a | No native maintenance start/end or durable publication/checkpoint consumer lag was observed. Fresh a01 FAILs on `tStart`. Needs actual X3/X6 event boundaries and a real consumer interval. No shared rebuild was attempted. |
| ERASURE-SCAN | a | A truncated log prefix has neither complete protected-copy inventory nor observed erasure publication and per-location positive controls. Fresh a01 FAILs on `inventoryEntry`. Encoding-aware/freed-block coverage remains deferred; a prefix scan cannot establish physical erasure. |
| WATERMARK | a | A native SELECT 1 supplies no serving-index, atomic eligibility/marker, wait or routing facts. Fresh a01 FAILs on `servingIndex`. The actual composition routed-read surface and same-snapshot witness remain absent; inventing a metadata row would not fix this. |
| ACK-ORDER | a | The native control is not a commit. Publication time, ack boundary, routed RYOW and independent non-HR corroboration are absent. Fresh a02 FAILs on `tSourcePublished`. Needs the actual composition source/ack/read exercise and durable publication witness. |
| FAULT-TRANSITIONS | a | A disposable observer client really committed a marker, exited, and had that marker read back. No native transaction position binds that marker to a durable transition. Fresh a02 FAILs on `transition`. Position-bound xt.txs/marker collection remains unimplemented; only the observer child was killed, not the resident. |

All first failures and raw bundles remain available. **No category (b) finding is claimed** from these cases;
therefore there is no engine violation worked around. **No category (c) finding is claimed**; the oracle was
neither patched nor weakened. Missing implementation, missing experimental inputs, and disabled sources are
kept explicit rather than converted into a claim that the engine passed or failed the substantive obligation.

### Corrections and integrity changes

RESOURCE now records raw `/proc/<pid>/status`, `stat` before/after, cgroup membership before/after, and the
engine's cgroup PID inventory before/after. The decoder rejects missing RSS, process-set churn, PID reuse,
cgroup migration, wrong owner and incomplete coverage. It sums **VmRSS**, excluding the observer's separate
cgroup. Lifetime `memory.current`, `memory.peak` and `memory.max` remain raw context and never become RSS.
Both resident and ordinary protocol normalizers refuse resource samples lacking actual process RSS. The
older round-2 RESOURCE result must not be cited as a process-RSS qualification under the corrected meaning;
its original bytes and historical verdict remain retained.

The selected a04 resource observations each report **2,300,252,160 RSS bytes** and **4,830,924,800 allocated
disk bytes**, under the declared 3,221,225,472 / 20,000,000,000-byte forecasts. These are three sampled
snapshots, not a continuously observed high-water mark. RSS may double-count shared pages across processes,
and disk sampling can miss transient files. Application clients, broker and other owners are outside this
diagnostic envelope. Its measured clock uncertainty is **5.546773 ms**, not <=1 ms qualification.

Every new sample frame carries run, stream, source, engine-container and canonical case-digest bindings.
Resident pinned decoders reject mismatches, inconsistent run anchors, or embedded events before this attempt
or after their containing sample. A fresh HMAC alone is not treated as proof that an embedded wire event is
fresh. Metric/procfs bytes without embedded times rely on the observer's actual read path and private output
boundary; the SUT has no mount for that output, key or configuration.

New `verify_seal.py` checks exact configuration/envelope binding, HMACs, chunk byte lengths/digests, dense
chains, start/order bounds, final heads, decoder hashes and normalized-byte recomputation. The resident host
controller runs it **before** writing host witness heads or retention. Ordinary future `observer-retain` also
runs it; old runs without the retained verifier cannot be re-issued as newly verified retention, and retain
their historical contexts. A new resident volume check binds the read-only volume to the inspected engine's
slot. Before/after resident checks cover ID, start time, configuration, host configuration and mount set.

Two implementation errors were caught and retained during this work:

- a01 WORK, ACK-ORDER and FAULT-TRANSITIONS sealed but were refused before host witness/retention because
  the controller compared Docker's mount arrays in incidental order. The mount **set** was unchanged. The
  corrected deep comparison sorts by destination and still rejects changed mounts/settings, restart or
  configuration. WORK a03 and ACK/FAULT a02 are new attempts with fresh keys, not adopted old contexts.
- CONNECTIONS a01 FAILed `uncertain sample time order`: its first two samples were too close for the actual
  bridge uncertainty. Sampling now waits at least `max(100 ms, 2 * measured uncertainty + 10 ms)` between
  stages. a03 PASSes. Uncertainty was not reduced and observations were not reordered. This is an observer
  sampling-margin defect, not evidence of a pool leak or a bad clock correlation.

### Q91a and boundaries

`round4/q91a.json` pins the exact read-only ruling text and source-file hash. **No QLever bundle was newly
collected in round 4**; all selected real bundles are XTDB. Historical QLever timings are not retroactively
qualified. Future ordinary QLever observer plans now include mandatory `Q2-index-state`, even when the
caller selects only a transport stream. The collector retains actual stats and metrics HTTP bytes; the
decoder obtains exact base triple count from `num-triples-normal` and delta count from `qlever_delta_triples`.
Missing/invalid counts refuse normalization instead of becoming zero. A final scrape brackets shutdown.

That metadata explicitly records `touchedBlockDelta: null`, `rebuildThreshold: null` and
`timingQualification: DIAGNOSTIC`: a global delta count does not establish the delta in blocks a measured
scan touched or a bounded rebuild policy. This future-profile addition is **unit tested only**, not live
qualified this round. No resident script, metrics configuration, base index or delta was changed. Q91b/d
remain respected: no --fresh, shared rebuild, or exclusive slot was used. A live Q91a performance claim
still needs the QG1 threshold and touched-block sampler on the qualified built-base profile.

Live Datomic verification, NS-scale clock/overhead qualification and complete physical erasure coverage
were not run. The exact deferred driver/clock/overhead/erasure commands remain in
`lab/experiments/EXP-OBS01/round3/SCALE-WINDOW.md`; no microtrace is substituted for those exercises.

### PASS audit required by preamble 9a

The audited production-tooling surface is `lab/observer/` plus observer-related functions in
`lab/bin/{observer,resident-observer,observer-clock,archive-volume}.mjs`. Test assertions are fixture checks,
not live acceptance. Each row states the content, freshness and binding checks and the exact claim boundary.

| Code path producing a verdict, receipt or success-shaped observation | Content | Freshness | Binding / permitted claim |
| --- | --- | --- | --- |
| `collector.py:Bundle.append/seal` | Lossless payload hashes, signed dense chains; seal requires successful pinned decoder execution for every stream. | New output directory, byte budget, live source reads; append rejects writes after seal. | External per-run key; envelope pins run/source/engine/config/code. Seal means integrity/recomputability, **not semantic PASS**. |
| `normalize_base.py`, `protocol.py`, `protocol_extra.py`, generated/compiled decoders | Decode actual procfs, socket, metric, native reply, log, span and wire bytes; validate required shapes, exact counters and supported sources; missing values stay absent/refuse. RSS correction and no-zero-fill regressions exercised. | Resident `resident_normalize` checks per-frame attempt anchor and embedded event bounds; ordinary protocols require their evaluator window and retain source-clock mapping. | Resident run/source/stream/engine/case digest; protocol/source allowlists and pinned decoder bytes. Case inputs declare expectations; they do not supply observed engine facts. Incomplete mappings cannot claim complete source coverage. |
| `verify_seal.py:verify` | HMAC, bytes, chains, seal inventory and exact decoder rerun equality. Negative tests change normalized output, engine and seal. | Chunk starts cannot predate the envelope's attempt; current configuration and retained parser are read on invocation. Resident parser additionally checks embedded freshness. | Exact run/receipt/key/SUT/stream/config digest; reports **integrity only**, not semantic acceptance. |
| `resident-observer.mjs:residentObserver` witness/retention | New host integrity gate must succeed before publication; inspected slot volume must match. | Fresh run/key registry, unique output, current resident before/after; no adoption of failed a01 retention. | Actual engine ID/config/start/mounts/host config, evaluator key, copied code/parser digests and final heads; private output and host-only witness. |
| `observer.mjs:observerWitness` / watcher | Authenticates the witnessed header, stream, sequence and head digest. | Current managed state/holder under witness lock, fresh registered run/key; timestamp records actual host observation. | Witness attests **seeing an authenticated head**, not parsing content or semantic acceptance. Later retention/authentication checks the full bytes. |
| `observer.mjs:observerRetain` | Seal/head HMAC and independent final witness plus new full integrity/decoder gate. | Requires original stopped/removed observer and original holder; historical runs lacking the new verifier refuse new retention. | Retained run/key/source/parser/chunk/bridge digests, exact config and final witness heads. Retention is not PASS. |
| `observer-clock.mjs`, `observer.mjs:observerBridge` | Nonce-matched actual peer reply, bounded measured bracket; rejected samples retained. | Each exchange is live; run/stopping state rechecked before append. | Exact current observer/port/run and bridge bytes. Resident separate-process bracket declares its actual larger uncertainty; no zero fill or NS claim. |
| `check_round3.py` / legacy `check_protocols.py` | Delegate semantic checking to the unmodified O-OBS consumer after authentication and raw recomputation; never use helper exit zero as PASS. | Round-4 driver creates new run/key; case/context name that exact run. Historical helper replay describes its original run, **not fresh collection**. | Current helper checks exact consumer/contract file pins, actual O-OBS delegation, complete case bindings and thresholds. Legacy helper is not used to issue this round's results; its old broad contexts cannot substitute for current context selection. |
| `screen_cli_round3.mjs` | Runs actual pinned CLI; parses saved stdout; verifies exit 0/1/2 matches PASS/FAIL/REFUSED; negative results must be context contradictions. | Explicit attempt selection; outputs created exclusively under a new screen ID; no overwrite/adoption. | Exact bundle/key/context/evidence paths and consumer/contract file hashes. Result is the consumer's **screening-only** verdict. |
| `verify_retained.py` | Calls consumer authentication over retained bytes; emits `semanticAcceptance: false`. | Replay authenticates the original named run; it is not evidence of a new workload. | External retention/parser/key/witness anchors; its historical hardcoded consumer label is not an authority for round-4 pins. Not used for round-4 semantic results. |
| `summarize*.py`, `summarize_round4.mjs` | Diagnostic/count aggregation only. Round-4 summary matches each saved CLI stdout/exit and fourteen/twenty-eight denominators; checks all before/after resident identities and terminal removal receipts. | Reads final named screen cohort and performs live owned-reservation/container inspection. | Explicit attempt/run paths. Historical `sealed` booleans mean file presence only; round-4 names this `sealFilePresent` and never derives PASS from it. |
| `archive_volume.py` / `archive-volume.mjs` | Full archive member/readback hashes and unchanged source scan, no semantic assertion. | Host requires stopped/unattached owned volume; a new exclusive archive is created. | Exact volume/holder/source archive path; source and archive manifests. Not invoked round 4; no resident volume was archived or removed. |
| `archive_round2_host.py`, `archive_round3.py` | Source/copy hashes and complete destination manifest; copies raw sources, parsers, keys and own witness lines. | Round-4 path requires final no-owned-container/reservation receipt and a new archive directory; owned attempts are stopped before copying. | Selected round/run prefix and source/copy paths. `allMatched` is copy integrity, not semantic qualification. Original sources retained. |
| `test_resident_failure.mjs`, gate/tests | Assertions check actual returned error/content, inspected owner removal and unchanged resident ID/start time (live helper); unit tests use explicitly synthetic fixture bytes. | Live helper uses a fresh key/run; unit fixture directories are new. | Success means the stated cleanup/test assertion only. Live negative helper was updated for the required run binding but was **not rerun** round 4; fifty final gate assertions ran. |
| `run_*.mjs`, `final_probe.mjs`, `aa_round2.mjs`, probe scripts, `run_frozen_driver.mjs` | Retain actual commands/results/errors; frozen NS driver checks input hashes/scale/argv and private Docker endpoint. | New named attempts / supplied frozen manifest; collection status is not semantic PASS. | Exact command/run/fixture/driver/engine inputs. Historical drivers are not newly qualified by editing them. Resource admission is a grant check against the current ledger/config, not an observation-protocol verdict. |

The audit confirms the new RESOURCE PASS is based on content (raw VmRSS decoded again), freshness (new a04
process reads and attempt-bound signed frames) and binding (actual engine cgroup/PID incarnations, slot volume,
case, key, decoder and pinned contract/oracle). It does **not** confirm complete source coverage for the ten
remaining protocols, lifetime RSS peaks, full application ownership or NS precision. Those claims are not made.

### Gates, retries and cleanup

Final source gate: **40 Python + 10 Node tests pass**, including RSS/cache separation, missing RSS/process
churn/wrong cgroup, stale/misbound events, Q91 exact counts/diagnostic status, normalized-byte/engine/seal
tampering, and mount-order/restart/configuration checks. `round4/gate-final-source.log` retains the actual
heavy-wrapper execution. Earlier gate/screen cohorts and failures are preserved separately. No pnpm/root
package check was run because this change is lab observer tooling, not a package or public API change.

Reproduction of the final screen (use a new screen ID on replay; outputs intentionally refuse overwrite):

```sh
node lab/bin/heavy.mjs --label CX-OBS01-R4-gate -- node lab/observer/gate.mjs
OBS01_ROUND=4 OBS01_SCREEN_ID=review01 node lab/bin/heavy.mjs --label CX-OBS01-R4-review -- node lab/observer/screen_cli_round3.mjs a01,a02,a03,a04
```

Selected attempts: a01 for CANCEL/PREABORT/SCRATCH/NO-MUTATION/AVAILABILITY/SCALE-COUNT/MAINTENANCE/
ERASURE-SCAN/WATERMARK, a02 for ACK-ORDER/FAULT-TRANSITIONS, a03 for CONNECTIONS/WORK, a04 for RESOURCE.
There are **19 retained attempt directories**: sixteen published contexts and three sealed-but-unpublished
mount-order refusals. The first CLI cohort has only thirteen selected cases because WORK had not yet been
retried; final `cli-results-a03.json` has the full fourteen selected plus twenty-eight negatives.

`round4/cleanup-final.json` verifies all nineteen before/after resident identities, configurations, host
configurations, mount sets and start times unchanged, every owned sidecar removed, and **zero** CX-OBS01-R4
containers/reservations. No exclusive slot, volume, resident restart, shared rebuild or resident configuration
change occurred. Private keys remain outside bundles and Git. Own tiny `obs01r4_*` diagnostic tables remain;
no unrelated data was deleted. No live Datomic or NS-scale/physical-erasure acceptance was performed.

All nineteen attempts, actual per-attempt parsers/controllers, private keys, final/earlier CLI contexts and
own host witness lines were copied to `/Users/sam/Claude/Projects/triplex-db-2/evidence/OBS01/round4-host/`.
The archive compared **2,014 source/copied files**, all matched, with **2,015 manifest entries**;
`SHA256SUMS.json` SHA256 is **973ff31d0078d40d6796342798b13e5dd2fb398c6af0c253e001c09e30015c68**.
`round4/archive.log` retains the heavy-wrapper copy verification. Original run directories remain retained.
The report and archive receipt are committed after this archival snapshot; the archive contains the actual
collection code and evidence, not a retroactively invented pre-run Git anchor. No merge or push was performed.

## Round 5 — 2026-11-09 UTC, continuation of ca1c598

North star: the independent correctness-evidence floor for P1–P5, under `lab/SCOPE.md`, `lab/NORTH-STAR.md`
and `lab/TARGETS.md`. This round worked through **all ten** remaining failures. The initial per-protocol field,
source-kind and reachability table was written first in **`round5/SOURCES.md`**. It cites the pinned protocol
handlers by line number and R27's protocol/source rows. The exact consumer README is retained as
`round5/PROTOCOL-pinned.md`. Observed refinements are appended below the initial table, not presented as
pre-run knowledge.

### Result and exact evidence

Ten selected real XTDB bundles re-screen against unchanged O-OBS **23e2273** and the exact retained 0.3.12
contract: **1 PASS, 9 FAIL, 0 REFUSED**. All **20 context negatives REFUSED**. The new PASS is the declared
**XT2-ENGINE-COMMITTED disposable-client-crash** case. It is not an engine-restart/power-loss test or complete
commit-protocol qualification. The previous four passing protocols were not re-collected this round.

Authoritative final evidence:

- `round5/cli-results-a03.json`: ten actual selected CLI exits plus twenty negative-context exits.
- `round5/gap-status.json`: exact recomputed/new fields and each remaining required change/input.
- `round5/source-audit-a03-verified.json`: **70 source-read observations and 36 native queries** across the
  ten selected bundles. The audit re-authenticates each entire bundle with the pinned consumer/key/context,
  checks case/engine bindings, then decodes actual bytes. It is a reachability report, not an additional verdict.
- `round5/summary-a03.json`, `cleanup-final-a03.json`, `gate-selected.log`, and each attempt's context,
  evidence, derivation, actual CLI stdout/stderr and collector logs. Earlier cohorts remain separate.

The pins remain `round3/pins.json`: oracle file SHA256
`668136f3c99e09b5332363bb6beaac7f177d07ef7718eb59b2b801faeedcb2cb`; contract file SHA256
`8bb4b393a2b1636eea00a0609d04a28b54adaecdc5d2f9ffd6d582edb2fe935c`. No oracle, contract, threshold or context
guard was weakened. This builder's screens still require independent reviewer recollection.

### What was collected for each protocol, and where work stopped

| Protocol / selected attempt | Reachable source implemented and actual result | Remaining gap; change/input needed, not made |
| --- | --- | --- |
| CANCEL / a03 | T1 captures targeted native CancelRequest, **SQLSTATE 57014 / E-CANCELLED**, actual caller settlement and successful reuse on the same backend connection. X1 cancel/completed gauges and X2 health are retained as supplementary context. Bounded aggregate work avoids large result-message amplification. | FAIL on `transportAck`; independent `engineActiveSamples`, `tDrained` and second non-HR source remain missing. Enable X6 DEBUG/X7 tracing with complete capture, or a qualified Q3/Q4/T2 profile. An incrementing cancel counter alone does not prove drain. |
| PREABORT / a01 | Own T1 control traffic plus actual process/listener/source-access inspection retained. No tested preaborted statement was sent by the observer. | FAIL on `engineStatementLog`. Complete parsed-statement coverage needs enabled X6 (or Q3) and a validated complete ingress boundary. Own traffic cannot prove global absence. No logging flag or capture capability was changed. |
| NO-MUTATION / a01 | X1 completed-transaction snapshots cover db tags; the observed rebased delta is 0. Own T1 requests and X2 response bytes are retained. | FAIL: two independent agreeing kinds required. A second complete write inventory needs enabled engine witness plus complete capture; no inference from only the observer's SELECT, file sizes or submitted-message gauge. |
| AVAILABILITY / a04 | HR write ACK and read of the exact own marker/payload, X1 before/after gauges, actual X2 `Alive.` responses, H8 PID incarnation and OOM counters. Successful HR probes require matching query and expected read content, not just SQL success. | FAIL: no engine-bound memory-failure instant. The invalid-cast diagnostic is not a memory failure. A separately contained memory-fault case/engine is needed; shared-resident OOM/restart was not attempted. |
| WORK / a04 | X8 actual scan-row profiles; X3 `xt.txs`, `xt.live_tables`, `xt.trie_stats`, bounded `xt.source_log_msgs`; raw H1 cgroup `io.stat` and H3 allocated-file inventory before/after. All final system-table queries succeed. | FAIL on `rowsWritten`; attributed `triplesTouched` and `bytesWritten` also absent. Shared counter/net-row/file deltas cannot be attributed to this query or zero-filled. Need suitable per-operation tracing/counters and isolated accounting. File-backed block reads need the stable snapshot/engine fix described below. |
| MAINTENANCE / a04 | Same reachable X3 catalog/bounded-log sources plus X1 completed/processed/submitted positions and MsgId lag, before/after a real observation interval. | FAIL on `tStart`; native start/end logging and an actual durable publication/checkpoint consumer are absent. Enable X6 maintenance events and supply that consumer surface. MsgId lag is not milliseconds; no resident maintenance/rebuild was induced. |
| ERASURE-SCAN / a04 | Complete metadata enumeration of the mounted engine volume, own canary native write/readback, and bounded positive scans. Fresh canary bytes are found in **both `/engine/log/LOG` and `/engine/log/REPLICA_LOG`**. | FAIL on `inventoryEntry`: full protected-copy/freed-block inventory, actual publication, complete same-method controls/derived decoding and erasure/key-destruction exercise are absent. Need read-only protected-store/freed-block snapshots plus the actual exercise. Tail hits are positive evidence only; missing hits are never absence. |
| WATERMARK / a01 | Actual native T1 destination/traffic and H8 engine incarnation/process information. | FAIL on `servingIndex`: actual composition route, same-snapshot marker/eligibility and wait boundaries are not exposed by SELECT 1. Supply the real observable router/index endpoint and its evaluator input. An engine restart or fabricated metadata row cannot create that application witness. |
| ACK-ORDER / a03 | Actual native INSERT ACK in HR; X3 joins own marker `_system_from` to committed `xt.txs.system_time`, recovering **native commitPosition**, and verifies operation ID and payload. | FAIL on `tSourcePublished`: original publication instant, actual source/RYOW route and independent publication kind remain absent. Need real composition route plus X7 completion or independent broker-WAL publication observer. Native assigned system time is retained; a later read completion is not substituted for original publication. |
| FAULT-TRANSITIONS / a03 | Native transaction/marker join before and after killing **only the disposable observer client**, with operation ID, payload 1, committed BOOL, matching native position/time and actual wire commit/crash/read ordering. Position **742359911** survives the client crash. | **PASS, screening only**, for the declared XT2 transition. No engine crash, restart, power loss, log-source transition series or whole application recovery claim was exercised. Those variants need separately authorized isolated fault cases. |

This is not a claim that nine protocols are now complete. Reachable raw providers were implemented and
re-screened even when they could not establish the remaining required field. The full field lists and precise
source-kind/independence requirements are in `SOURCES.md`; the table above states what the selected bytes
actually establish. Disabled engine sources, unexposed application surfaces and unsafe live storage reads
were stopped at their specific gaps, with the needed change named rather than made.

### Source details and corrections found during the pass

**X3 predicates and R30 safety.** Initial unbounded log/block-table probes were rejected by XTDB's analyzer
with explicit required-bound errors. Those failures remain. The corrected log query uses the exact observed
`node.tx.latestProcessedMsgId` as a **point-query position only**, never a mutation counter. `xt.txs`,
`xt.live_tables`, `xt.trie_stats` and bounded source-log reads succeed in both final WORK and MAINTENANCE cases.

I did not proceed to file-backed `xt.block_files`/`xt.table_block_files` reads. R30 Q4 sections 4.1–4.2 document
that live GC can delete even a just-listed block, leaving a missing-file loader that hangs and can poison later
reads. A stable read-only clone/snapshot or corrected engine loader is needed. No guessed index, missing block,
freeze, clone, engine change or VM change was attempted. File metadata and safe catalog facts remain useful
context, but do not become per-operation work units.

**Native types and content.** Real pgwire BOOL OID 16 sends `t`/`f`. The decoder now uses RowDescription's
type and format, validates the representation and keeps ordinary text `t` as text. The first ACK/FAULT
attempts rejected this representation before a seal; their raw bytes/errors are preserved. The live retry
proves a real committed native transaction, not an aliased business `n` presented as a position. Before and
after joins must return exactly one matching row; query SQL, own relation, operation ID, integer payload,
committed BOOL, native position and equal marker/transaction system time are checked. A changed/empty/wrong
query or pre-crash readback cannot emit the transition witness.

The evaluator expectation fixes the marker payload **1** and operation ID from the case. The engine-assigned
position is late-bound from authenticated native readback, and then pinned in `transitionExpectations`;
it is not a preselected engine sequence number. Expectations for the concrete transaction/marker facts are
constructed independently from that case payload, not copied wholesale from an observed `facts` object.
Only XT2 is declared in this diagnostic case; a passing screen does not imply untested transitions.

**Health and availability.** X2 returned HTTP 200 with plaintext `Alive.`. Treating that as Prometheus caused
the first AVAILABILITY collector to refuse normalization; a tagged raw-HTTP health decoder fixes it. The
final availability read verifies `_id='availability'` via the exact expected query and returns `n=1`; a wrong
value, boolean masquerading as 1, different query, incomplete reply or error is not marked successful. The
actual failure remains an invalid-cast diagnostic, so no memory-failure recovery PASS is claimed.

**Publication time.** R27 identifies `xt.txs.system_time` as a candidate engine-source timestamp; it is now
collected and bound to the actual marker. This round has not qualified that assigned transaction timestamp
as the instant at which the source became durably published/readable. The old conditional mapping from a
later observer read's completion to `tSourcePublished` was removed for every profile. The latter is only an
upper bound on visibility and could reverse an ACK-order judgment. A completion/publication witness remains
required, rather than inventing timing from the readback.

**Physical source access.** The mounted engine volume has roughly 4,500 entries in this case; inventories
are explicitly limited to that volume. The final bounded scan examines 16 MiB of file tails, prioritizing log
files and recently modified buffers, and retains actual positive-hit bytes/offsets. It does not scan all bytes,
decode Arrow/FSST/freed blocks, establish erasure publication, or qualify absence. The observer cannot read
`/proc/1/root/etc/xtdb/*` with its current capabilities; actual permission errors are retained. Host-side mounted
configuration files and JVM options were read separately in `runtime-configs.json`. Capabilities/mounts were
not expanded. Historical host configuration bytes are not asserted to be the live JVM's parsed state.

**QLever alternative checked.** `qlever-source-probe.json` is an explicitly diagnostic **host reachability
probe, not an obs-bundle or timing receipt**. On the unchanged resident, stats and active-query endpoints return
200, `/metrics` returns 404, the base has **1 triple**, and delta/touched-block counts remain unavailable/null.
The startup configuration retains disabled metrics/event logs. Q91a timing remains DIAGNOSTIC. No QLever bundle,
--enable-metrics change, query-event-log enablement, cache clear, --fresh reset or rebuild was performed.

**Retained first failures.** Three a01 native cases were refused before sidecar start because two own batches
overlapped CPU 5; they were retried only after the other batch ended. Health decoding and native BOOL decoding
failures are retained under their original attempts. Earlier CANCEL cases settled successfully; a03's bounded
aggregate is actually cancelled and reused. No old key/run/context was adopted as a fresh result. The final
selection is a03 CANCEL/ACK/FAULT; a04 AVAILABILITY/WORK/MAINTENANCE/ERASURE; a01 PREABORT/NO-MUTATION/WATERMARK.

### PASS audit (preamble 9a)

The round-4 audit remains the enumeration for unchanged collector, clock, witness, retention, archive and
legacy diagnostic paths. The following completes that audit for every new or changed round-5 path producing
protocol fields, PASS/verdict or receipt-like success. None may promote an auxiliary snapshot into acceptance.

| Path | Content check | Freshness check | Exact binding and claim boundary |
| --- | --- | --- | --- |
| `reachable_sources.py:collect`, `file_inventory`, `positive_hits`; `resident_collect.py:session` and new branches | Actual raw HTTP, procfs, catalog/log replies, I/O/file metadata and positive bytes retained; positive hits contain the exact own canary. Bounds/errors/incomplete coverage stay explicit. No net-row/global-I/O zero fill or negative physical scan verdict. | New engine-managed sidecar/run/key; real before/after reads and native query/crash timestamps; no reused attempt bytes. | Native engine network/PID namespace and verified slot volume; source/case/run/engine-bound frames. Auxiliary `R5-context` is never selected as protocol corroboration or a second independence kind. |
| `wire.py:pgwire_records`, health decoder and generated `normalize.py` | BOOL requires OID 16, text format and exact t/f; ordinary text is preserved. Health status/body are decoded from retained raw HTTP, not a declared healthy label. | Values come from current signed sample bytes; embedded source times remain attempt-bound. | Pinned per-attempt standalone decoder; actual native result columns and source IDs. Type decoding itself emits no protocol PASS. |
| `protocol_extra.py:derive_extra` CANCEL | Actual SQLSTATE maps to E-CANCELLED; every settled native success/error also records its true settlement/error (success has no fabricated cancellation). Same-connection successful reuse reconstructed from native replies. | Targeted CancelRequest and settlement/reuse times from this transcript. | Backend PID correlation, actual connection/tag and case request/reuse IDs; no inferred ACK, active-query absence or drain instant. |
| `derive_extra/derive_resident` AVAILABILITY | HR success requires exact own SQL, complete native reply and expected read payload/type. X1/X2 cannot invent HR probes or an engine failure. H8 uses actual OOM/incarnation observations. | Probe/failure/lifecycle events are from this attempt; no OOM delta means no engine failure time. | Private relation, expected `_id`/payload and observed engine; invalid-cast is not relabeled a memory-failure event. FAIL remains. |
| `derive_extra` ACK-ORDER | Native position is accepted only from the exact transaction/marker join with committed native BOOL, matching times, operation ID and expected integer payload. HR ACK is actual successful native INSERT response. | This attempt's commit and later source readback; read completion is never original publication time. | Exact relation/operation/query/native position and source streams. Missing publication/route/independent kind keep FAIL; no copied CR metadata or fabricated publication. |
| `derive_extra` FAULT-TRANSITIONS; `check_round3.py` expectation construction | Exact INSERT and native join SQL; unique successful complete rows; actual committed BOOL, known payload/operation, same native position/system time before/after; digest over concrete transaction/marker facts. Expected payload comes from the evaluator case. | Actual pre-crash native join, observer-client exit, post-crash readback ordered around the real commit; stale/pre-crash readback refuses. | Case relation/operation, engine-assigned native position, exact variant/declared XT2, case expectations, decoder/key/bundle/context. Only the declared disposable-client-crash case receives screening PASS. |
| `verify_seal.py:verify`, host retention/witness publication | HMAC/chain/raw digest/normalizer recomputation plus new **every-frame** run/stream/source/engine/case binding check, including auxiliary streams. | Frame anchor/header bounds and embedded event times checked before host publication; correctly re-signed old-attempt frame is rejected in regression. | Current exact config/envelope/key and pinned parser. Host receipt claims integrity/recomputability, not semantic PASS. |
| `check_round3.py`, `screen_cli_round3.mjs` | Unmodified pinned O-OBS authenticates/recomputes and applies exact context/semantic rules. Actual CLI verdict/exit must agree; negative cases require context contradiction. | Explicit fresh named attempts; new exclusive output screen IDs preserve previous cohorts. | Same pinned oracle/contract hashes, delegated obligation/protocol/thresholds and actual run/key/context paths. Only O-OBS's screening verdict is reported. |
| `audit_round5.py` | Re-authenticates each full bundle, decodes actual bytes, checks positive-hit content and records actual native outcomes/columns; no extra semantic verdict. | Reads exact selected cohort and its signed attempt frames; no new workload claim from replay. | Pinned consumer hash, external key/context, matching case/run/engine, raw-frame and decoder digests. `source-audit-a03-verified.json` is authoritative; earlier unauthenticated diagnostic audits remain separate. |
| `summarize_round4.mjs` round-5 mode | Saved actual CLI stdout/exit and 10/20 denominators checked; before/after container identity/config/mount/start and removal receipts checked. File-presence and terminal-error hashes are labeled as such. | Final selected cohort plus current own reservation/container inspection. | Exact screen/attempt/run prefixes; summary counts existing verdicts only and never treats a seal file as PASS. |
| `probe_resident_q_sources.mjs`, `runtime-configs.json` | Actual read-only HTTP status/body hashes and container/config inspection; base/delta unknown values stay null. No timing or semantic success inferred. | Live requests/inspection, same container ID/start checked around Q probes. | Explicit resident endpoint/container and host-readable config-file hashes. Diagnostic host reachability only, not independent obs-bundle evidence. |
| `archive_round3.py` round-5 mode and gates/tests | Archive compares all copied source bytes/readback hashes and manifest; unit positives require known fixture contents, negatives alter query/payload/position/type/time. | New archive directory; selected final no-owned-resource receipt; fresh test/attempt directories. | Selected round/cohort prefix, exact copied sources/keys/witnesses; archive equality and passing assertions are not semantic acceptance. |

The new live PASS satisfies content, freshness and binding for **its declared narrow claim**. It does not
prove engine-restart durability, full transition-series coverage, source publication ordering or the nine
failed protocols. All other added observations remain partial facts or diagnostics.

### Gates, retention and unperformed work

**49 Python + 10 Node tests pass** in `round5/gate-selected.log` (59 total). New checks cover native bool
typing, health decoding, exact availability content, wrong native transaction/marker position/payload/time,
stale/pre-crash readback, and correctly signed frames from another attempt. Actual source collection,
fingerprint/audit and engine-dependent screening run through `heavy.mjs`; host free space was above 5 GiB.
No package/public API changed, so pnpm/root package gates were not run.

`cleanup-final-a03.json` covers **19 actual sidecar attempts**, including unsealed first failures, with zero
own containers/reservations and unchanged resident identity/config/host configuration/mount set/start time.
Three additional pre-admission CPU refusals have driver receipts but no started sidecar directory. No
exclusive slot, volume, resident lifecycle/configuration change, observer capability expansion or VM change
was made. Own tiny `obs01r5_*` diagnostic relations remain. All prior failures and actual per-attempt source
copies/keys remain retained; no unrelated data was deleted.

Nine complete protocol claims remain blocked at the table's named source/input boundaries. No disabled
logging/tracing/metrics flag, live block-file read, unprovided composition router, unsafe memory fault,
protected-store mount or freed-block/crypto-shredding exercise was silently substituted. Datomic, NS-scale
clock/overhead and full physical erasure qualification were not run. The exact deferred scale-window commands
remain in `lab/experiments/EXP-OBS01/round3/SCALE-WINDOW.md`. No oracle change, merge or push was performed.

All nineteen actual attempts, three pre-admission driver failures, exact per-attempt parsers/controllers,
private evaluator keys, source/CLI audits and own host witness lines were copied to
`/Users/sam/Claude/Projects/triplex-db-2/evidence/OBS01/round5-host/`. **3,061 source/copied files match**;
the manifest contains **3,062 entries**, with SHA256
**14f7d930b2343436f5ca6e31c6e7fb04fc669e5c655184e79e86fac3f589034a** for `SHA256SUMS.json`.
`round5/archive.log` retains the actual heavy-wrapper verification. The archive also checks host free space
again when admitted, before starting its fingerprint/copy. Original evidence remains in place; keys are
outside bundles and Git. This report/receipt is committed after the snapshot; actual per-attempt source
preimages remain authoritative, with no retroactive pre-run Git anchor.

## Round 6 — VM-side publication observer (2026-11-09)

**Result: implemented and offline gates PASS; the one VM overhead attempt REFUSED,
with a partial A/B overhead finding above the 5% limit. No NS/P3 acceptance claim.**
The VM attempt did not seal because its SQL01 `committed_at` CR stamps violate
F20. It remains failed evidence. No oracle/ruling/tolerance or candidate erasure,
broker or consumer code was changed by this implementation.

### Merge and scope

Merged main as observed at task start, `ccaf27e9127f4de0c1f199e9ad3ed8284551c608`,
into `exp/OBS01-observer`, creating merge `bfae93482279c507a9df0b8f3e638cf76ed3001c`
(first parent `1a7fc86c4ee90f2f255d4767c1ff9fcc55da308a`). Main subsequently advanced;
this report does not claim to include later main commits. The sole conflicted
file was `lab/bin/engine.mjs`, seven hunks: observer/Datomic imports; QLever seed
and metrics flags; effective config/pins; XTDB log and QLever mounts; Datomic
health branch; replacement/image guards; and command dispatch. Resolved by
retaining both features. Syntax and all nine engine regression tests pass.
Acceptance changes came only from the requested merge; no subsequent edit under
`lab/acceptance/`. Contract version/pins remain owned by the contract builder.

Read the main-checkout R44 sections 3.1–3.6 and 8, G03 `V-PROBES.md`, Q100q/r,
and current scope/protocol. G03 V2 establishes post-WAL-sync visibility only for
its tested image; V5 supports cross-container inotify. The G03 measured 470/703 us
p50/p99 is historical context, not this observer's precision. Q100q permits
different namespace inodes with common boot ID and zero time offsets.

### Implementation

- `lab/bin/vm-observer.mjs`, dispatched by `engine.mjs`: evaluator-only up/stop,
  status, failed-capture cleanup and controlled overhead probe. Uses existing
  private Docker endpoint, pool admission, immutable local image, fresh per-run
  key fingerprint, full source IDs/holder/mount bindings. Observer has no network,
  read-only root/source/code/key mounts, its own CPU, host PID/cgroup visibility,
  capability drop and private output/control. No exclusive slot is required.
- `vm_watch.py`: ctypes inotify on both databases' directories, query-only
  read-only marker/frontier polls, actual poll start/end times, WAL append chunks
  and final full-byte comparison, stable final main/WAL readbacks. Ready now
  requires a successful initial query for every source. Requested 250 us is
  recorded separately; actual periods/query costs bound each interval. Inotify
  wakes polling; it is not itself publication proof. Idle fallback is 10 ms.
- `vm_normalizer.py`: standalone pinned literal SQL01/FD01 schemas, BLOB preimages,
  SQLite WAL checksums/salts/frame structure and each committed snapshot, SQL01
  frame CRC32C/chain and payload/LSN/epoch/position binding, FD01 transaction
  checkpoint/frontier/deliveries/effects/affected row deltas. Source commit members
  map to per-position L/U; consumer affected rows map to transaction visibility.
  Non-COMMIT frame kinds/payloads remain raw evidence. Rewritten/reset WAL, stale
  final state and unknown schemas refuse. One WAL generation/stable main only;
  online checkpoint/generation rollover is explicitly unsupported/refused.
- Boot ID and `/proc/<pid>/timens_offsets` for observer/source PIDs, actual PID
  start times and cgroup bindings; zero monotonic/boottime offsets required.
  Namespace inode is recorded without an equality requirement. Realtime-to-VM
  monotonic correlation brackets millisecond CR stamps; F20 remains L−1 ms/U+5 ms.
  VM-local bridge data satisfies legacy bundle integrity only, not a Mac bridge
  or cross-process ping-p99 qualification.
- VM noise records: stat/loadavg/meminfo/diskstats, CPU/IO/memory pressure and
  observer scheduling hiccups. Cgroup-gone requires earlier positive exact-path
  observation and a still-visible host cgroup tree. Trusted ephemeral helper
  proves the long-lived observer's own removal with exact ID/path/nonce.
- `vm_verify.py`: independently verifies the seal/controller pins and invokes
  O-OBS authentication to rerun the copied normalizer, comparing exact output.
  This is integrity/parser equality, not a new registered NS semantic protocol.
  Driver, reader and relay clock-domain records remain G03's integration duty.

SQL01 schema/codec facts were read from merged `packages/qlever/src/broker/`
(sqlite-worker.ts, frame.ts, frames.ts) and rdf.ts; FD01 facts from the read-only
FD01 worktree's `packages/host/src/feed/ConsumerStore.ts`. Neither candidate is
imported/executed by the normalizer. The observer code itself is content pinned
in each attempt. [VM.md](../../observer/VM.md) gives exact reproduction/integration
commands, source lifecycle ordering, limitations and deferred runbook.

### Offline gates and retained attempts

All gates run through `heavy.mjs`, with a fresh output and source snapshot per
attempt and a 5 GiB free-space guard. `offline01` failed on a test harness oracle
path, retained unchanged. `offline02`–`offline09` pass their then-current gates;
these are successive development attempts, not independent qualification trials.
`offline09` is the final executable source: **9 Python tests and 9 engine tests**.

| Gate | Final result / evidence under `offline09/` |
| --- | --- |
| Planted 100/249/251/400 ms publication delays | PASS: deterministic intervals bounded by actual synthetic 0.55 ms period/cost; plus real host SQLite writes, independent RO polling and committed WAL snapshots for all four delays |
| Real host delay bracket widths | Source/consumer widths in us: 100 ms 540.667/425.333; 249 ms 543.542/399.375; 251 ms 574.958/411.167; 400 ms 460.584/424.875. Each is within its measured stream period/cost bound. Raw polls and commit-call intervals are in `host-delay-*.json`; host timing is not VM qualification |
| F20 early/late CR stamps | PASS: planted stamps outside both tolerance bounds refuse, including SQL01 realtime `committed_at`; no stamp substitution |
| F11 WAL tamper | PASS: prefix rewrite/reset, checksum corruption, and final WAL differing from captured chunks refuse |
| O-OBS standalone rerun | PASS: authenticated sealed fixture reruns through current merged O-OBS `authenticate`, exact normalization equality; changed parser negative refuses. Complete fixture/key/context/parser retained in `authenticated-fixture/` |
| Clock/identity negatives | PASS: nonzero offsets, boot mismatch, wrong run/time/source binding refuse; different time-namespace inodes with zero offsets accepted |
| Final-state / gone / schema negatives | PASS: final DB behind observed frontier, absent initial cgroup visibility, hidden host tree, and wrong FD01 schema refuse; RO mutation rejected |

No root `pnpm check` was run: this is isolated Python/engine evaluator tooling;
focused gates exercise its codecs, integrity, publication and lifecycle logic.
The complete NS consumer/relay integration, physical erasure and lane D were not
run this round.

### One VM attempt: findings, not promotion

Admission recorded G03/P-TINY idle and host free above 10 GiB. Existing image
`python@sha256:e48f59cdba69a3cbd9ed2cf0f348d90d45a8d350d98134cf1070bc106ee9ed90`
was used without pull. One controlled probe `vm01` (nonce `81e0eec92d06`) started
A then B on new owned fixture volumes; it stopped at B's F20 refusal. It did not
complete the planned ABBA sequence. Both arms have all 500 raw ten-row transaction
samples; no outliers were removed.

| Observation | Actual finding |
| --- | --- |
| Writer p99 | A 2,361,099 ns; B 5,621,754 ns; **+138.099%**, above Q100r's 5%. Partial A/B is a failed diagnostic, not completed causal/ABBA overhead qualification |
| Publication capture | 500 SQL01 frames / 500 committed WAL snapshots, 1,407 polls, 40 inotify events; final WAL equals captured chunks |
| Clock domains | Same boot `7a064e31-8ca0-47a5-926f-d2de8d786302`, both monotonic/boottime offsets zero, differing inodes; realtime correlation envelope spans 791 ns |
| Actual cadence | Period p50 392,296 ns, p99 12,082,294 ns; max-period-plus-query-cost bound 22,209,585 ns. Publication bracket p99/max 21,882,116 ns; no sub-ms precision claim |
| CR/F20 | **43** SQL01 `committed_at` intervals entirely more than 1 ms before L, largest early gap 8,253,312 ns. All are early, none late |
| Bundle outcome | REFUSED, unsealed; copied original parser independently reproduces exit 2 `F20 CR-INCONSISTENT SQL01 committed_at`. Diagnostic analysis checks dense HMAC chain, not seal or semantic admission |

The fixture deliberately follows SQL01's `Date.now()`-inside-transaction behavior:
`committed_at` is sampled **before** COMMIT/WAL synchronization. A correct common
clock does not make it a publication timestamp. The measured envelope rules out
an observer clock-domain mismatch at the scale of these gaps; source stamp
semantics and actual transaction/scheduling delay explain the inconsistency.
**Open question for the source/ruling owner:** how should a pre-COMMIT SQL01 stamp
satisfy Q100e/F20's early tolerance? No candidate code or oracle rule was altered
to work around it. The standalone normalizer continues to refuse.

`vm01/RESULT.json` and original raw outputs are unchanged. The old outer probe
returned process exit zero despite its JSON REFUSED; final code now returns 2 for
non-PASS, and that historical exit is not acceptance. Post-VM fixes add initial
poll readiness, final-state freshness, WAL version check and cleanup/volume
ownership guards. Their final offline gates pass, but **the exact final source's
VM overhead has not been measured**. The single allowed measurement was not
repeated. Original VM source copies remain authoritative.

### PASS/receipt audit (content, freshness, binding)

These are all new observation-to-verdict/receipt sites; inherited bundle routines
are included where called. No routine below declares semantic NS PASS.

| Site | Content check | Freshness and binding check |
| --- | --- | --- |
| `vm_normalizer.domain/same_domain` | UUID boot and both zero offsets, not inode equality | Records for observer and every configured source PID; common current boot, raw run/case/clock interval bindings |
| `read_state/schema/snapshot/history/wal_commits` | Exact columns, integrity check, WAL checksum/salts/commit boundary, frame CRC/chain/payload and positions; all committed snapshots replayed | Exact captured source main/WAL bytes/hash; stable current final, final frontier covers last poll; schema/profile/source bound in case |
| `brackets/bracket_for/crosscheck/normalize` | Monotone fresh RO visibility, L/U from actual poll/query bounds; F20 both sides; no requested-cadence inference | Raw start/end inside live run, matching source/container/run/case SHA; missing begin/end/source/clock or stale final refuses |
| `WalTail.update`, inotify and final readback | Immutable prefix plus final byte-for-byte equality, queue overflow/refused captures | Same source path/inode/window; reset, checkpoint or missing bytes refuses, never reuses an earlier generation |
| `vm_watch.run` ready/domain/noise/seen/gone | Every initial query succeeds before ready; zero-offset clock, actual cgroup identity; earlier seen path and self-visible host tree for disappearance | Effective full container ID/PID start time, key/run/case, current read times; incomplete gone-set prevents sealing |
| `engine` up/reserve/stop and `proveGone` | Exact holder/full ID/mounted volume/image, 32-byte key, verified seal/replay; gone helper exact nonce/path/ID/readback | Fresh name/nonce and one-use key registry, source running/PID inspection, prior cgroup path; foreign/preexisting volumes are not adopted; only owned reserved containers cleaned |
| `collector.Bundle`, `verify_seal`, `vm_verify.replay` | Content-addressed chunks, dense HMAC chain, seal/index/pins, O-OBS independent parser output equality; tamper negative | Evaluator-only per-attempt key/code/output, exact observed container and run/case/source binding, host-only witness/context; no seal means no admission |
| `probe` result | Complete raw 500 samples per arm, four arms and sealed/replayed evidence/gone proofs required; either ratio >1.05 FAIL, exception/incomplete REFUSED | Fresh per-arm volume/container and identity, own holder, preflight checks and immutable code/image; final code exits 2 on non-PASS |
| `test_vm`, `run_vm_offline` PASS | Assertions include positive planted bytes and negative tamper/clock/schema/freshness/visibility controls; subprocess statuses checked | Fresh temp DBs/run IDs, final source preimages before/after equal, new evidence directory, raw receipts; only offline gate PASS |
| `round6/diagnose.py` | HMAC/raw SHA/sequence, copied parser refusal, WAL equality and recomputed intervals | Actual failed attempt/key/parser/chain only; output explicitly DIAGNOSTIC and unsealed, no PASS |
| `round6/retain.py`, `finish.py` receipts | Complete file-set and read-back SHA equality, successful cleanup command statuses and empty own-holder inventory | Exact final gate pins versus current source, explicit durable root, private Docker endpoint/holder; retention is not semantic acceptance |

Synthetic fixtures explicitly declare `offline-synthetic`; they cannot assert live
VM clock qualification. A future G03 driver/relay/reader domain record is not
inferred from the source process record. Ephemeral gone-proof helpers are removed
by engine tooling; long-lived writer/observer disappearance has positive readback.

### Cleanup, retention and changed pins

Removed all created containers and both created volumes; no exclusive slot was
taken, no resident configuration/lifecycle changed. The failed observer's own
gone proof was recovered with `observer-vm-cleanup` after retaining the failure;
`vm01/1/observer-gone-recovery.json` and both `writer-gone.json` files retain
exact path/ID/visibility/nonce proofs. This recovery was not another overhead run.
Original fstrim exited 0 (data volume 267,583,488 bytes reclaimed); after proof
helper removal, fstrim again exited 0 (data volume 0 bytes) and `docker context
use colima` exited 0. Private DOCKER_HOST remains bound to triplex2. Final own
holder inventory is empty; host free was 14,432,243,712 bytes.

Durable evidence root:
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-OBS01/OBS01-round6/`.
[round6/INDEX.json](round6/INDEX.json) and [round6/SHA256SUMS](round6/SHA256SUMS)
index **665 files**, with complete file-set/read-back verification and 319 prior
offline manifest entries checked. Manifest SHA256:
`6685cd0f0c05aa460a2ac929653df9d6b565462d96b876a2fabe9dde45c2edb9`.
Keys, DBs, WALs and bulky chunks stay outside Git; only short index/manifest and
reproduction/analysis helpers are committed. `source-changes.json` records every
final gate pin with pre-merge, merged and new hashes (null means new file).

Existing changed evaluator path (re-pin by contract owner if covered):

| Path | Merged old SHA256 | New SHA256 |
| --- | --- | --- |
| `lab/bin/engine.mjs` | `cbfb075fa50bd9c50f8e572fcb7c3b96d909f41b902ada075a9ba8b4d31882f2` | `5cbbfc7e54786a2c1b51b1594146dfb08f98d66f5fa68c849cf8030ea8c1e105` |

Pre-merge engine SHA was
`e577e343d084e7203713e83f20e9a3b8ef8cc144d0d2d4188d65da5c64923f90`.
All VM files are newly added; legacy capture/collector/seal files are unchanged.
For exact VM-to-final differentiation: normalizer moved from
`bc91e819e27ae1940becf5dd19b5e9c219420c9ef687e0493287961b3ca24808` to
`10ae1ce19e104f6083c8d94a9aa6f899e27e8f0db23cb7e4730d83d3fdf97d09`;
watcher from `34f6bc5d6896ff6577bbdc2f5b476d3545e4f39e9334ced058ddbb89d3e09fc3`
to `ba49db1b705c07c3e1ca3da20b99f284fbb580b6a4f76c0d17f6be6353dbd7bd`.
All other exact source pins/preimages are retained in the attempt directories.
No merge into main or push was performed.

## Round 7 — schema-owned decision stamps (2026-11-09)

**North star:** P3 correctness: independent publication L/U remains the lag origin;
a pre-COMMIT decision stamp must be checked against the offer's decision window.
**Result:** offline gates PASS, 11 Python tests plus 9 engine regression tests.
No VM/engine measurement or lifecycle operation was run. The round-6 failure was
not replayed into PASS. The unmatched partial +138% on a busy host is **not a valid
overhead estimate**; G03 round 5 owns matched-arm observer overhead measurement.

Read the current main-checkout Q100s row in `lab/acceptance/RULINGS-PENDING.md`,
which refines Q100e/R44 F20: decision stamps use driver-send through U+5 ms;
publication claims retain L−1 ms through U+5 ms. Scope/North-star/protocol reread.
No main merge was requested or made this round, and no acceptance file was edited.
The exact Q100s row is retained as `Q100s.txt` with the source-file hash in the index.

### Changes and input binding

`vm_normalizer.py` now pins `sql01.frames.committed_at` to `decision` and
`observer.cr.atNs` to `publication` in evaluator code. It never reads a candidate
`kind` to choose the check. SQL01's decoded offer operation ID, attempt ID and
stream bind to exactly one evaluator-collected `driver-send` raw event for the
same source and run. That event supplies VM-monotonic `atNs` and its clock domain.
The parser checks the common boot/zero offsets and the current run interval;
missing/duplicate/wrong-source/stream/operation/attempt/run/clock/time records
refuse. A grouped decision must satisfy every member's send time (maximum lower
bound). Unknown/unbound decision frames refuse rather than inventing a send.

The source stamp's existing millisecond/realtime-correlation uncertainty interval
is preserved. A stamp refuses when that entire interval is before send or after
U+5 ms; boundary overlap remains resolution uncertainty, not an exact timestamp.
`stampChecks` emits the field, schema-owned kind, LSN, stamp bounds and decision
window. Publication CR points keep the original exact point check; lag positions
retain their observer-derived L/U unchanged.

The raw driver event format and trusted provenance requirement are documented in
[VM.md](../../observer/VM.md). This small normalizer round does not implement a
G03 driver transport adapter: the existing round-6 collector cannot manufacture
independent send records. A future trusted driver collection path must supply
them in evaluator-authenticated chunks; absent records refuse normalization.
Candidate receipts/configuration are not a substitute for a driver send record.

### Regressions and evidence

`heavy.mjs --label CX-OBS01-R7-offline -- python3 -B
lab/observer/run_vm_offline.py
/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-OBS01/OBS01-round7/offline01`
completed with 11 Python tests and 9 engine tests. Sources were copied before the
run and checked unchanged afterward. New regressions cover:

- Decision at 7 ms, driver send 5 ms, observer L 10 ms: accepted as a decision;
  reported lag L remains 10 ms.
- SQL01 decision at 2 ms (entire stored interval before send) or 20 ms (after
  U+5 ms): REFUSED/F20.
- Publication CR at 7 ms or 20 ms: REFUSED/F20 even if the record says
  `kind: decision`; this cannot select a weaker check.
- Missing/duplicate driver records and each identity/clock/freshness mismatch:
  REFUSED. Existing clock/WAL/schema/final-state and O-OBS authentication/parser
  recomputation gates continue to pass with the new driver record fixture.

Durable root:
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-OBS01/OBS01-round7/`.
[round7/INDEX.json](round7/INDEX.json) and [round7/SHA256SUMS](round7/SHA256SUMS)
cover 81 retained files, including the complete sealed offline fixture, key,
pinned parser, raw chunks, O-OBS context and test outputs. Manifest SHA256:
`bfce46b6ee742dd07effff3ed0d408e4270d343992c9f5cb593f836fb8808ed3`.
Retention checks the complete offline file set and read-back hashes, source pins,
and the unchanged round-6 manifest hash
`6685cd0f0c05aa460a2ac929653df9d6b565462d96b876a2fabe9dde45c2edb9`.
Raw round-6 outputs, parser, refusal and original measurement remain untouched.

### PASS audit and pin movements

The round-6 audit still applies to unchanged WAL/schema/clock/bracket/collector,
seal/HMAC, O-OBS replay, lifecycle and offline gate routines. All round-7 changed
observation-to-acceptance sites are listed here; these yield normalization or
fixture gates, never semantic NS PASS:

| Site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `STAMP_KINDS/stamp_window/crosscheck` | Literal schema-owned decision/publication classification; correct windows, publication ignores supplied kind | Uses this position's independently measured U/L | Pinned parser field path, unique position bracket; no candidate classification |
| `decision_send` | Exactly one actual driver-send per decoded offer; all group members required | Send inside this run's bounds, same boot and zero-offset domain | Existing raw-frame run/container/case/SHA checks plus source/stream/operation/attempt equality |
| `normalize` SQL01 decision check / `stampChecks` | Stored stamp interval versus [send,U+5 ms]; emits actual interval/window, no stamp-derived lag | Existing stable final WAL/readback and fresh poll checks retained | Exact CRC-validated SQL01 LSN/epoch/payload/member plus bound driver event |
| `test_vm` new gates | Positive decision acceptance, both negative decision edges, publication kind-spoof negative and nine send-identity/freshness negatives | Fresh DBs and random attempt run IDs; final source frozen for gate | Assertions verify actual stamp/lag output; original O-OBS seal/rerun/tamper gate retained |
| `round7/retain.py` index/receipt | Offline status and every manifest hash/file-set checked, read-back verified | Current source equals actual tested pins, original round-6 manifest unchanged | Explicit durable attempt root and old source from `08781c28`; retention receipt is not semantic acceptance |

No contract/pin update was made. Changed parser/test identities (contract owner
must re-pin any downstream reference to the former parser):

| Path | Old SHA256 (`08781c28`) | New SHA256 |
| --- | --- | --- |
| `lab/observer/vm_normalizer.py` | `10ae1ce19e104f6083c8d94a9aa6f899e27e8f0db23cb7e4730d83d3fdf97d09` | `dea777c2aeab0060d7f1d4b13f157a54f1cdbcf6c367fb3fc63c5ea49e5f965b` |
| `lab/observer/test_vm.py` | `5191b376fc5bbb805948af7e65b1b770d9a6973e5b8b7257e73efe5d82424933` | `046ec9ebbfcace452565f4e7d5bb9d0cb4f1f87d54f996790a847f5d9952fc4c` |

No VM overhead rerun, live driver integration, NS acceptance, root pnpm suite,
merge into main or push. Open work is G03's trusted driver-record integration and
matched-arm smoke; Q100s resolves the former decision/publication classification
question without retrospectively promoting the failed round-6 attempt.

## Round 8 — bind physical files, refuse unproven durability and inverted windows

**North star:** P3 correctness: source/consumer publication brackets must describe
the same physical store, and visibility must not be presented as durability.
**Result:** all **20 earlier tests remain passing**, plus 3 new Python tests
(14 Python + 9 Node total). All nine adapted reviewer probes meet their expected
outcomes. F1/F3 are corrected; F2's unsupported durable inference is closed by
refusal. **Live durable/P3 normalization is blocked until independently enforced
writer/VFS sync evidence exists.** This round does not implement or qualify that
instrumentation. No offline result is a durable/P3 or NS acceptance grant.

Read review `verify/OBS01-r7` at `2f1d1f10`, its `VERIFY-round7.md`, current scope,
North-star/protocol and main Q100b/r rows. Copied its exact probe to
[round8/reviewer/probe_round7.py](round8/reviewer/probe_round7.py), verified equal
to `git show 2f1d1f10:lab/verify/OBS01/probe_round7.py`; SHA256
`17c6f471c77ba56cb225ce6e41d55add543015d067b0bf1246b89880e27e63c1`.
[round8/probe_round8.py](round8/probe_round8.py) changes root/retention paths and
expected outcomes, records collector errors before refusal, and supplies actual
fixture writer-connection state. It preserves the original database replacement,
OFF/delayed-sync and 15.9 ms send reproductions. Both copies are committed.

### Findings and fixes

| Finding | Change | Offline proof |
| --- | --- | --- |
| F1: SQLite poll connection used an old inode while WAL/final reads used a replacement pathname | `FileBinding` holds opened main/WAL/SHM descriptors, checking device/inode/link identity at bind, before/after each poll, around tails and final reads; read handles are checked against held descriptors. Rename/delete/self-move inotify events refuse. Once an ancillary object is bound it cannot disappear or change. Raw events carry identities; the parser independently rejects inconsistent/missing bindings | Actual copied open-connection replacement probe now refuses with F1 after a fresh independent reader sees replacement LSN 1. Main inode changed 176698069 → 176698080. Same-byte replacements refuse for broker and consumer bindings; main/WAL/SHM identity-mutation negatives refuse |
| F1: bracket could shift to a later store/observation | Keep R44 formula: L is last-negative start, U first-positive end from bound file; never a later positive poll | Same-inode FULL collector control explicitly asserts L/U against its actual first positive and preceding negative polls; synthetic 400 ms later positive does not move [0,30 ns] |
| F2: readable state inferred to be durable without writer sync proof | Pinned offline source state now includes the **actual fixture writer connection's** WAL mode, synchronous level and SQLite version. OFF/NORMAL or missing state refuses. Live VM mode always refuses pending independent writer/VFS enforcement; neither an RO default PRAGMA nor a candidate FULL declaration can qualify it | Actual OFF writer readback is 0; copied delayed-sync probe refuses F2. FULL control readback is 2 and accepts only its explicitly offline visibility fixture. NORMAL, missing state and attempted VM use with the same FULL declaration refuse |
| F3: impossible send/window overlaps a coarse candidate stamp | Send after matched first-positive U refuses (not merely after U+5 ms); inverted stamp/window intervals refuse before overlap testing | Copied send 15.9 ms / U 10.55 ms / stamp [15,16] ms refuses F20. Send exactly U remains valid; send U+1 ns refuses. Grouped members use the latest send, so any member after U refuses |

Important F2 boundary: SQLite `synchronous` is **connection-local** and is not
recoverable from database/WAL bytes or the observer's RO connection. The reviewer
explicitly rejects a candidate configuration flag as proof. Q100b/r additionally
require the exact filesystem/device/flush class and implementation qualification.
Thus `writerState` with `scope=evaluator-offline-fixture` is an evaluator fixture
input bound by the protected case SHA; it does not authorize live durability.
`durability_state(..., 'vm')` refuses even if the same field claims FULL. This is
an explicit loss of unproven functionality, not a new qualified sync witness.
Future G03 integration needs independently enforced/witnessed synchronization
bound to writer/build, main/WAL identities and commit range, as well as its
already-required trusted driver-send adapter. No SUT code was changed.

### Gates and retention

All gates/fingerprinting used `heavy.mjs` with a free-space guard above 5 GiB.
They waited for the existing four admitted lab jobs; no slot limit was bypassed.
Commands, each using a fresh durable attempt directory:

```sh
node lab/bin/heavy.mjs --label CX-OBS01-R8-final -- \
  python3 -B lab/observer/run_vm_offline.py \
  /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-OBS01/OBS01-round8/offline02
node lab/bin/heavy.mjs --label CX-OBS01-R8-final-probes -- \
  python3 -B lab/experiments/EXP-OBS01/round8/probe_round8.py \
  /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-OBS01/OBS01-round8/probes02
```

Final offline suite: **14 Python + 9 Node**. The 11 earlier Python test methods
remain and their original assertions pass (their fixtures now supply actual
writer pragmas and file identities). Existing O-OBS authentication/sealed-fixture
parser re-execution and parser-change negative still pass. Original delay plants,
clock, WAL, schema and final-state gates remain.

Final adapted reviewer ledger: path replacement **REFUSED/F1**; synchronous OFF
**REFUSED/F2**; same-inode FULL **ACCEPTED as offline visibility only**; impossible
send **REFUSED/F20**; WAL rewrite, reset, checksum, unknown schema and checkpoint
rollover all **REFUSED**. FULL control's actual L/U are
853840928800625 / 853840940074916 ns and bracket the actual commit-call interval;
its first-positive/preceding-negative assertions pass. No precision beyond the
measured poll/query period is claimed.

`offline01` and `probes01` passed their then-current source. Extra first-positive
and independent-read assertions were then added to the adapted probe; the first
retention check correctly refused current-source drift. Both suites were rerun
as `offline02`/`probes02`, whose exact final source pins match current files. All
four attempts remain, without rewriting earlier results. The original reviewer
probe remains byte-identical and separate from the adapted version.

Durable root:
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-OBS01/OBS01-round8/`.
[round8/INDEX.json](round8/INDEX.json) / [round8/SHA256SUMS](round8/SHA256SUMS)
cover **239 files**, with **234 nested manifest entries** checked, complete file
sets and read-back hashes verified. Manifest SHA256:
`6cb918e50318e2fdcc51e742fc2627291b05c912fcead7cf8537e32117aedd98`.
Raw database/WAL/collector chunks, per-attempt source snapshots and sealed offline
fixtures/keys remain outside Git. No round-6/7 evidence was modified.

### PASS audit (new/changed verdict and receipt sites)

The unchanged round-6/7 HMAC/seal, schema/CRC/history, clock, offer binding,
publication stamp and O-OBS rerun audit continues to apply. New/changed sites:

| Site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `FileBinding.verify/check_open`, poll/tail/final paths | Exact opened descriptor versus path device/inode/link; no symlink/replacement; rename/delete refuses | Rechecked before/after queries and each byte read; descriptors held through capture | Same source main/WAL/SHM objects, not equal bytes at a later inode |
| `file_identity` | Required identity records; no bound-object substitution/removal | Orders actual physical observations by query-end/event time, across batched poll transport | All raw records already match run/container/case/source; final identity must equal earlier bound objects |
| `durability_state` | Actual offline fixture writer's WAL/FULL/version state required; OFF/NORMAL/missing refuses; **all VM use refuses** | Fixture state sampled from current test writer; no earlier/live profile inferred | State protected by exact source/case SHA; fixture scope cannot grant VM/P3 durability |
| `stamp_window` / SQL01 stamp overlap | Send ≤ U, ordered stamp and window intervals, unchanged tolerances | Matched current first-positive bracket and current driver send | Every decoded offer member retains source/stream/operation/attempt/run/clock binding |
| New Python regression gates | Same-byte replacement for both stores, altered physical IDs, source OFF/NORMAL/missing state and VM FULL declaration negative, copied inverted-window case; first-positive and boundary controls | Fresh SQLite fixtures and random run IDs; final source snapshot matches | Assertions use actual file IDs/writer pragmas and exact expected errors/output |
| Adapted `collector_case/fixture_case/main` receipts | Actual fresh reader sees replacement; F1 collector error required; OFF writer readback/F2 required; FULL first-positive control and exact nine expected outcomes | Fresh files/threads/attempt; raw samples and pre/post source hashes | Actual run/source/member send, physical IDs, fixture writer mode; explicit offline platform adapters, no VM claim |
| `run_vm_offline` / `round8/retain.py` | Child statuses, frozen source equality, all nine probe outcomes, original reviewer copy equality, complete manifests and read-back bytes | New final attempt IDs; earlier differing pins retained, not adopted | Exact current pins, reviewer commit source, durable roots, old/new hashes. PASS is an offline regression gate only |

### Moved source hashes and limits

No `lab/acceptance/` edits, contract version change or re-pin. Changed observer
source identities (old at `c1a14ad5`; contract owner updates downstream pins):

| Path | Old SHA256 | New SHA256 |
| --- | --- | --- |
| `lab/observer/vm_normalizer.py` | `dea777c2aeab0060d7f1d4b13f157a54f1cdbcf6c367fb3fc63c5ea49e5f965b` | `2b564d42d860ed983b4c8cbcf33b1ff103228fc597f764791ab32496df9b0118` |
| `lab/observer/vm_watch.py` | `ba49db1b705c07c3e1ca3da20b99f284fbb580b6a4f76c0d17f6be6353dbd7bd` | `e545745e2667a8bf1787d1951b053e65c27f951e37cce78e38a5167c6da827b2` |
| `lab/observer/test_vm.py` | `046ec9ebbfcace452565f4e7d5bb9d0cb4f1f87d54f996790a847f5d9952fc4c` | `9c128c47999fcb00e46088a5cf22771f332be01711f4d8817956a4a5c603b531` |
| `lab/observer/run_vm_offline.py` | `17a6fd5a0d40e52d273ddf3aca4d9ba3b1eb4e3fb191f52e324ae27d892dd429` | `10f92940f9823d4d46589abea1a10e12737757326ad10b058640769273f2b6dd` |

No Docker/engine/Colima lifecycle, volume, VM run, live inotify delivery, source
instrumentation, NS measurement, power-loss qualification, root pnpm suite, merge
into main or push. Live durable publication remains REFUSED pending the exact
independent sync witness above; driver/clock/overhead integration still belongs
to G03. Offline gates do not settle those open qualifications.

## Round 9: kernel sync witness (R48; rulings Q108a-d pending)

Builder: Claude Sonnet 5.5 (high). Branch `exp/OBS01-observer`, base `bcbf21c4` plus main merged (`8bcdec08`); `lab/acceptance` is main's byte for byte
and `python3 lab/acceptance/build_contract.py --verify` regenerates identically. No `lab/acceptance` edit, no contract version change, no re-pin.

### Outcome

| Item | Result |
| --- | --- |
| Probe window W0..W3 | **NOT RUN.** The preconditions held only briefly (host free disk crossed 10 GiB, no exclusive slot, G03 idle), but the triplex2 VM has **no bpftrace** (not installed in the VM, not in any local image), and a digest-pinned bpftrace image needs a pull, a download this task did not authorize. `witness-vm-probe` records `NOT-RUN` (`evidence/OBS01-R9/vm-w0w3-attempt01/RESULT.json`). No container, volume or VM setting was touched, so no fstrim was needed; the docker context is `default`. |
| Witness program | `lab/observer/vm_syncwitness.bt` (bpftrace, ext4 write/mkwrite/fsync/syncfs/truncate events with per-CPU sequence numbers). **Never attached anywhere**; its printf formats are checked against the parser layout offline. Attach syntax, BTF symbols (`ext4_sync_fs`, `ext4_page_mkwrite` via fentry/fexit) and tracefs access are first tested by W0. |
| Parser and per-commit join | `vm_normalizer.py`: `parse_witness`, `judge_witness`, `witness_context`, `witness_store`; the seven R48 8.3 codes; Q108b `D` rule; positions gain `D` and `durableEndNs = max(U, D)`. |
| Round 8 refusal | replaced by "refuse unless the witness is complete and every commit passes". VM mode without a witness still refuses `F2 TRACE-INCOMPLETE`. |
| Controller pieces | `lab/bin/sync-witness.mjs` (profile check, create arguments, observer hooks, W0-W3 harness) and `engine.mjs witness-vm-status|witness-vm-probe`. The harness is **unrun against Docker**. |
| Measured per-commit kernel cost | **none** (W2 not run). The gate is p99 <= 100 us from BPF `run_time_ns`/`run_cnt` deltas; R48's 5 to 60 us estimate is unverified. |

### Gates

Offline suite `offline02` (through `heavy.mjs`, disk guard above 5 GiB, frozen-source pins checked at the end): **32 Python + 13 Node**, all pass.
The 14 earlier Python tests and 9 earlier Node tests are unchanged and pass; new: 18 Python (`test_syncwitness.py`) and 4 Node.
`offline01` also passed an earlier state of the source and is retained; `offline02` is the final pinned run.

New Python gates: the eleven W1 planted modes through the same `judge_run` path the VM receipts use (1,000 commits each; per-commit expectation from
`vm_planted_writer.expected`); neighbor `sync` never credited even beside an honest FULL writer; failed, no-wait and before-write syncs not credited;
UNWITNESSED-WRITE rows (uncovered bytes, foreign cgroup, mmap, hole punch, foreign database write); CHECKPOINT-UNSYNCED with and without the covering
database sync plus restart-by-header; parser rows (missing start/detach, sequence gap, duplicate, count mismatch, garbage, field count, negative number,
record after detach, stderr `Lost N events`/`ERROR`); out-of-order file accepted, regressed per-CPU time refused; a 3,000-case seeded parser fuzz (never
anything but a `WitnessError`, accepted mutations never change the event count); 18 normalizer fixtures (one per code and sub-case) in both
`offline-synthetic` and `vm` clock modes; FULL accepted at the four planted delays (100, 249, 251, 400 ms) with `D <= U` and the lag bracket unchanged;
consumer lag end `max(U, D)` with lag start unchanged; trace chunk gap, non-UTF-8 and missing-stream refusals; observer-side shipping of the finished
trace, cgroup-id binding and detach timeout; trace program layout. Mutation spot checks (neighbor credit, ignoring `W(c)`, dropping the visible, ACK and
directory checks) each made the suite fail, then were reverted.

Probe receipt `probes01` (`probe_round9.py`): matrix **11/11** modes, code fixtures **36/36** (18 fixtures x 2 clock modes), 4/4 accepted FULL delays, and
the nine round 8 probe outcomes unchanged (`round8-replay`).

Durable evidence root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/OBS01-R9/` (225 files, manifest SHA256 `2ff2929d3175b90e7e8af7136ea863e9efdfc6da344a33717efcf9b4f9f5af0a`;
[round9/SHA256SUMS](round9/SHA256SUMS), [round9/INDEX.json](round9/INDEX.json)). Raw fixtures stay outside git.

### Round 8 F2 negatives

The nine round 8 outcomes are unchanged. Offline-synthetic mode without a witness keeps the pinned FULL fixture rule. The OFF and NORMAL writers are also
replayed **with kernel traces** in both clock modes: OFF refuses `SYNC-MISSING`, NORMAL refuses `ACK-BEFORE-DURABLE`, and the case's declared
`synchronous=2` is ignored. The traces are synthetic; "real trace" replay is W1's job in the VM.

### PASS audit (every site that turns observations into a verdict or receipt)

| Site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `parse_witness` | strict grammar per record; unsigned fields reject `-`; per-CPU sequence contiguous from 1 and equal to the `@n[cpu]` dump; no duplicate `(cpu, seq)`; per-CPU time monotone; enter <= exit; bpftrace `Lost N events`/`ERROR` refuse | start record before every event, detach after; events outside the interval refuse | `SW1` version tag; dump counts tie the tail of the stream |
| `witness_context` | trace chunks contiguous from offset 0 and UTF-8; program hash, kernel release and container id equal the case pins; boot id equals the witness clock-domain record | `firstCandidateStartNs` (VM CLOCK_MONOTONIC read before the first candidate starts) must be >= attach time | traced (dev, directory inode) set equals the case's store directories; witness clock joins the Q100q same-boot check; case hash covers the witness config |
| `witness_store` | writer cgroup id from the observer's own stat of the container cgroup directory equals the controller's; bound main/WAL device equals the witnessed device; a driver ACK binds to a committed (stream, operation, attempt) | ACK clock domain re-checked against the run's | F1 identities supply the (dev, inode) of the WAL and database, the only inodes judged |
| `judge_witness` `D(c)` | covering sync is a successful `ext4_sync_file` on the WAL inode or wait=1 `syncfs`/`sync` on its device, from the writer cgroup, whose **enter** is >= the latest exit of any write below `e_c`; WAL bytes `[0, len)` fully covered; mmap, foreign-cgroup, hole-punch refuse | only the live generation (writes after the last truncate or header rewrite) | inode, device, cgroup id and byte range; neighbor sync, other-inode sync, `sync_file_range`, failed sync, before-write sync are never credited (each has a fixture) |
| `commit_views`, `raise_problems` | `U(c)` from the unique publication bracket (already-visible commits use the first poll end as an upper bound); codes combine, primary is the first in table order | positions from this run's polls and WAL tail | member identity from the decoded frame |
| `normalize` annotation | `D`, `durableEndNs` only when a sync was witnessed | per commit of this run | `(epoch, lsn)` or frontier `(epoch, offset+1)` |
| `vm_syncwitness.judge_run`, `compare` (W1 receipt logic) | per-commit primary code against `expected` | WAL bytes, trace and ops from one session | session writer cgroup id and store directory (dev, inode) |
| `perCommitCost` (W2 gate) | per-interval counter deltas over commits inside the interval; backwards counters or no commit refuse | samples from the same session | witness PID from `docker inspect` |
| `stream_check` (W3 loss gate) | parser grammar and sequence rules, line by line | whole trace after detach | per-CPU dump |
| `verifyWitnessProfile` | exactly CAP_BPF + CAP_PERFMON, private namespaces, only the run volume and three read-only binds, pinned image, 256 MiB | read from `docker inspect` at `witnessUp` and each session | the exact container id and volume |
| `witness_finish` (observer) | whole-file shipping, size re-checked; missing detach, symlink or file refuse | read after the controller's `witness-done` | cgroup id per source emitted before `ready` |
| `probe_round9.py`, `run_vm_offline.py`, `retain.py` | 11 modes, 36 fixture outcomes, 4 delays and the 9 round 8 outcomes must match exactly | fresh attempt directories; frozen-source pins; drift fails | exact source pins, durable manifests read back |

### Divergences and findings

1. **`sync-before-write` expectation differs from R48 4.3.** A writer that syncs before each commit's writes still has a real covering sync for commit `i`
   (the next commit's pre-write sync), so the rule gives `ACK-BEFORE-DURABLE` for commits 1..n-1 and `SYNC-MISSING` only for the last. Refused either way;
   `vm_planted_writer.expected` encodes the rule-derived answer and W1 confirms or refutes it with a real kernel.
2. **`syncfs`** (superseded by round 10 F5: D is now an interval, see "Round 10"; the text below is what round 9 built). R48 4.1 lists the entry-only `ext4:ext4_sync_fs` tracepoint, which has no exit time and so cannot give `D`. The program uses the syscall
   entry as the conservative enter time plus a wait=1 `ext4_sync_fs` fexit with `ret=0` on the witnessed device inside the syscall.
3. **Latent bug fixed: `vm_verify.py` under `python3 -I`.** `observer-vm-stop` ran `python3 -I -B vm_verify.py`; from Python 3.11 `-I` implies `-P` (no script
   directory on `sys.path`), so its sibling imports fail on this host's Python 3.14. It now runs `-B -E -s` (verified only by the same flag test on a toy module).
4. Limits: write and restart ordering use write exit times (no entry time is recorded); one WAL generation per run; the normalizer reads the whole trace.

### Not done or not verified

- W0, W1, W2, W3 not run: no real `bpf()` call, tracepoint, cgroup id, `docker cp` into a stopped container's volume, planted writer inside a container, or
  per-commit cost. W4 not built (needs orchestrator approval).
- `vm_syncwitness.bt` syntax and symbol availability untested; `sync-witness.mjs`, the in-container planted writers, `vm_w3_load.py`, `witnessUp`/`witnessStop`
  and `witness_finish` over a real volume are unrun in Docker (the observer ingest and the pure controller functions are covered offline).
- Not in this round: B9 (G03 box policy, attach-before-candidate ordering, E12 stream with HMAC chain, after-ACK kill point) and CR-NS `claim.mjs`. No trusted
  driver yet emits `driver-ack` events. `firstCandidateStartNs` must be supplied by that controller.
- Fixtures use the pinned SQL01/FD01 schemas with host SQLite WAL bytes and synthetic kernel records, not a real broker or consumer.
- Host power loss and the guest-to-host half of the durability class remain the Q100r premise.

### Moved source hashes

No pinned `lab/acceptance` path moved. Changed observer/controller sources (old at `bcbf21c4`, new at round 9):

| Path | Old SHA256 | New SHA256 |
| --- | --- | --- |
| `lab/bin/engine.mjs` | `5cbbfc7e54786a2c1b51b1594146dfb08f98d66f5fa68c849cf8030ea8c1e105` | `4bf86d961564f8d73e1b2b7b50e7b57ed4144bac1d965aa07cca096e4c010929` |
| `lab/bin/vm-observer.mjs` | `5e179a7142f56fb72e464d1a111a23cb41ab350f71598243a66c6f6b7d16ec1d` | `43689e647bac6410960b750ecb23e81edfa9619dd734959d5f9941e979c6bb58` |
| `lab/observer/vm_normalizer.py` | `2b564d42d860ed983b4c8cbcf33b1ff103228fc597f764791ab32496df9b0118` | `524eee87e9f5a4d1274265e0894da8374c0da6f37d39e3dcc95e0938098aeba8` |
| `lab/observer/vm_watch.py` | `e545745e2667a8bf1787d1951b053e65c27f951e37cce78e38a5167c6da827b2` | `c9aa9ec317940d73223bad80528905ad151f1780028be54faf3733e8b9e97bac` |
| `lab/observer/run_vm_offline.py` | `10f92940f9823d4d46589abea1a10e12737757326ad10b058640769273f2b6dd` | `a6872dad66115a386b70b4f613682f4e839ca493b17d9ae7ebe3abdfba081475` |
| `lab/observer/test_engine.mjs` | `ed377820ddeea01d3eb5abe93b9092fd8dd781e6b667b41d0def9fd175054d0a` | `91ae20ed7a8b966428b1ac6d1bd449f732e2db1c43b946694e4f7910a8fe4b80` |
| `lab/observer/vm_syncwitness.bt` | new | `5c9444e91297b200e815f22b3d84426cc9e7a493053f5e46bf33ddd40bd1b4d3` |
| `lab/observer/vm_syncwitness.py` | new | `6c6aff0f154a88cf4b68440a36a5da90b13f8da6d0547566989bb0ca69c2ce3e` |
| `lab/observer/vm_planted_writer.py` | new | `18cf0f766e2b72a38576a7c65038adf6d1bfc3129842d16811f28723a29e784d` |
| `lab/observer/vm_w3_load.py` | new | `27e8dbf7b5f4bf3c0e535c8770c685c6244d0dee5d566158ce686c0e4ca913a9` |
| `lab/observer/test_syncwitness.py` | new | `515abbe5bbcd5a88c6c0e14e7dfcd5ddd82e90ae9ea08200b4991c99a0b5be8d` |
| `lab/bin/sync-witness.mjs` | new | `2e3fc0418783d63e88e92ba4d364c924753fb74de1a2c58d076b7711f706fb98` |
| `lab/experiments/EXP-OBS01/round9/probe_round9.py` | new | `dbaaebf667eb6b716403c4357f9473b9d0d309f82fbccca44dad7d4ad7464151` |

## Round 10: fixes for the round 9 FIX-FIRST review (F1 to F5) and the R49 items

Builder: Claude Sonnet 5.5 (high), offline only. Branch `exp/OBS01-observer`, base `44217f95`. Authority: `VERIFY-round9.md`, R48, R49, and the orchestrator's F5 decision
(interval, not a single instant). `lab/acceptance` untouched; no pinned acceptance path moved. Semantics are documented in `lab/observer/VM.md`, "Round 10".

### Outcome

| Item | Result |
| --- | --- |
| F1 split publication | `PUBLICATION-SPLIT` (new code 3 of 9). Per-transaction atomicity check; every frame-bearing commit bound to its logical position's real `U`; a position's `D` is the latest `D` of all commits carrying a piece of it; `read_state` refuses a marker ahead of an empty frames table. Refuses with and without a witness. |
| F2 early detach | `TRACE-INCOMPLETE` unless attach <= first poll start and detach >= the last poll end, final readback `atNs` and tailed WAL `atNs`, and detach <= observer end (one clock domain). A final readback with no integer `atNs` refuses. |
| F3 W1 compare | complete refusal set, primary code, run-level codes and per-commit outcomes; positive modes raise nothing; tables in `vm_planted_writer` (`EXPECTED_CODES`, `GLOBAL_CODES`). |
| F4 W3 | one state machine (`WitnessScan`) for `parse_witness` and `stream_check`; parity tests over 27 loss and grammar negatives. |
| F5 syncfs | `D_upper` = syscall exit, `D_lower` = `ext4_sync_fs(wait=1)` entry if recorded else syscall entry; violations only below `D_lower`; new `DURABILITY-UNPROVEN` (code 9) in `[D_lower, D_upper)`; file syncs keep R48's exact first-exit rule. The program records the extra interval (`S` has two more fields). |
| R49 clock | all 15 timestamps are `nsecs(monotonic)`; W0 clock step (`vm_clockprobe.bt`, `vm_clockcheck.py`, `clockVerdict`, tolerance 100 ms, slack 1 ms) coded, unrun. |
| R49 W0 checks | `perf_event_paranoid` + CAP_PERFMON-only attach, peak memory vs 256 MiB (refuse above 80% or on OOM), ext4 built in (`/sys/kernel/btf/ext4` absent, exact `bpftrace -l` names), `BPFTRACE_MAX_MAP_KEYS=65536` (profile floor 16384) recorded: all coded and unit-tested as pure verdicts, none run. |
| R49 image | `lab/observer/bpftrace-image/Dockerfile`, **not built**. |

### Gates

Run through `heavy.mjs` (`--label OBS01-R10`; free disk 9.0 GiB, above the 5 GiB floor). Durable receipt:
`/Users/sam/Claude/Projects/triplex-db-2/evidence/OBS01-R10/offline01/` (`RESULT.json` status PASS, frozen-source pins unchanged at the end; `SHA256SUMS` sha256
`5ca00d790f53661785b77cb978863446fa65482b9869fa32b36c5fb297384ef6`) and `reviewer-fixtures.{stdout,stderr}` beside it.

| Suite | Result |
| --- | --- |
| `test_vm.py` | 14/14 (unchanged) |
| `test_syncwitness.py` | 18/18 (unchanged tests; fixture helpers extended: `Trace.s` takes `fsenter/fsexit`, the normalizer fixture stamps final readbacks) |
| `test_round10.py` (new) | 40/40 |
| `test_engine.mjs` | 21/21: the 13 earlier plus 8 new (the earlier witness-profile test fixture now carries the two required `Env` entries) |
| Python total | 72 (32 earlier + 40 new); Node total 21 (13 + 8) |
| reviewer `review_round9.py` | 11/11: 6 controls + 5 regression fixtures. F1 to F4 pass unchanged; F5 passes with the adjusted expectation (below). Run with a fresh `OUT` so the committed reviewer evidence under `lab/verify/CX-VOBS7/results/` is untouched. |

Mutation spot checks (each made the suite fail, then was reverted byte for byte): violation test against `D_upper` instead of `D_lower`; the F2 detach comparison removed; the
split check removed; `compare` ignoring run-level codes; the counted-CPU-without-records check removed.

New tests per fix: F1 (marker-first, frame-first, no-witness, standalone `read_state`, atomic/horizon/rewrite controls, `commit_views` binding and ACK ownership, missing-`U` refusal, `D` of a
split publication), F2 (seven cases including both boundaries), F3 (global refusal for five positive/negative modes x three codes, exact sets for all eleven modes, mismatch kinds, the reviewer's result shape),
F4 (27 negatives identical on both paths, clean parity, shuffled order, stderr, UTF-8 and CRLF, CLI exit), F5 (interval table, interval over several syncs, eligibility, foreign/failed/no-wait, parser interval
checks, whole-normalizer refusals in both clock modes), R49 (no bare `nsecs`, `S` format, clock helper end to end with a stand-in child, verdict boundaries, perf, memory, ext4, map keys, whole W0 verdict, Dockerfile pins).

### Divergences from the brief (all of them)

1. **`PUBLICATION-SPLIT` is collected, not raised at the first bad snapshot.** The reviewer's F1 fixture requires a `WitnessError` whose code or `also` contains `VISIBLE-BEFORE-DURABLE`, so `history()` takes a
   findings list, the join still runs, and the refusal lists `PUBLICATION-SPLIT` with the other codes. Without a list (standalone `snapshot`/`read_state`/`history`) it raises immediately.
2. **The brief's "read_state must not accept a marker ahead of an empty frames table"** holds for standalone use; with a findings list `read_state` records the finding instead of raising (same reason).
   The empty-table rule is `marker.lsn != 0`, not a comparison with the seeded marker, because the real broker seeds a nonzero `crc`.
3. **What counts as a split is a judgement call.** A marker advance is a change of any of `lsn, epoch, position, crc, size` (a horizon-only `h` update, which the real broker does, is not a publication); a changed
   existing frame row (the fixtures set `committed_at` after the fact) is not a new frame. Both are therefore not splits, and the ACK for a member now binds to the commit that added its frame, not to that later row delta.
4. **New codes change the primary-code order.** Nine codes: `TRACE-INCOMPLETE, WITNESS-UNBOUND, PUBLICATION-SPLIT, UNWITNESSED-WRITE, CHECKPOINT-UNSYNCED, SYNC-MISSING, ACK-BEFORE-DURABLE,
   VISIBLE-BEFORE-DURABLE, DURABILITY-UNPROVEN`. Existing primaries are unchanged; the unproven code is last so a proven violation is the headline.
5. **F2 does more than the brief asks.** Attach must precede the first poll start, detach must follow the last tailed WAL chunk and not exceed the observer end, and every witness run (including the offline-fixture witness mode)
   needs an integer `atNs` on each `final` readback. `NormalizerCase.build` stamps finals at 590,000,000 ns for that reason.
6. **F5 eligibility.** The brief fixes `D_upper` and `D_lower` but not which syncfs may cover a commit. I kept the syscall entry >= `W(c)`, so a write between the syscall entry and the ext4 entry is not credited to that
   syncfs (`SYNC-MISSING`, the conservative side, still a false refusal in that narrow race). Over several eligible syncs a commit's interval is `[min D_lower, min D_upper]`. The ext4 interval is only recorded when the new
   `fentry:vmlinux:ext4_sync_fs` probe fires; `S` records are validated (`enter <= fsenter <= fsexit <= ts`, or both zero).
7. **R48's exact `D` for syncfs is not reproduced**: positions' `D` and `durableEndNs` use `D_upper` (the syscall exit), as the decision says. R48 4.2 would give the ext4 exit; round 9's "divergence 2" is annotated as superseded.
8. **F3 expectation for `mmap` is derived, not observed.** `{UNWITNESSED-WRITE, SYNC-MISSING}` (no write records exist for an mmap writer, so each commit also lacks a covering write); W1 in a real kernel confirms or refutes it.
9. **The reviewer's F5 test changed** (`review_round9.py`, `test_syncfs_syscall_boundary_must_not_change_r48_D`), only to expect `DURABILITY-UNPROVEN` with `D = 300`, `D_lower = 110` instead of the two violations, as ordered. Nothing else in the reviewer files changed.
10. **R49 thresholds I chose** (the brief says "a stated tolerance" and "high enough"): clock tolerance 100 ms and slack 1 ms (an offset below 100 ms is undetectable by this step; a boot-clock offset is suspended VM time, far larger);
    at least 20 clock samples; memory refusal above 80% of 256 MiB or any OOM kill; `BPFTRACE_MAX_MAP_KEYS` 65536 with a profile floor of 16384 and ceiling of 4194304. The memory peak is read before SIGINT, so
    memory used by the END probe and the dump is not in it.
11. **W0 CAP_PERFMON check is an attach test, not a table lookup**: a tracepoint attach under only CAP_BPF + CAP_PERFMON, with `perf_event_paranoid` recorded; on failure W0 refuses and the witness never gets CAP_SYS_ADMIN.
12. **The clock helper runs in the VM host's namespaces** (`colima ssh`), not in the observer container; they share CLOCK_MONOTONIC only because Q100q requires zero time offsets, which W0 does not itself verify.
13. **Dockerfile gap.** R49 gives `libbsd0` only as "0.12.1 series", so I did not invent a version: the build requires `--build-arg LIBBSD0_VERSION` and fails without it. `libicu74`, `libxml2`, `elfutils` and `libbpf1`/`libedit2` versions are copied from R49
    without their `.deb` hashes (R49 has hashes for five packages only). Apt sources are limited to component `main`; the suites stay the base image's. A closed package list makes the build fail if apt wants anything else.
13a. **`verifyWitnessProfile` now also requires** `BPFTRACE_MAX_MAP_KEYS` (within the floor and ceiling) and `BPFTRACE_PERF_RB_PAGES` in the container environment, and `witnessStop` records `maxMapKeys`/`perfRbPages` in the witness meta
    (the normalizer ignores those keys). That edited one earlier Node test fixture.
14. **W3 streaming memory** is one `{seq: ts}` map per CPU (about 0.3 GB for a 20-minute 100 commits/s run), not a constant-size scan, because out-of-order lines must stay accepted exactly as in the whole-file parser.
15. **Not touched although it reads these files:** the retained round 9 probe `round9/probe_round9.py` and its durable evidence were not re-run or edited (it still imports the helpers it used; its receipts describe round 9).

### PASS audit (rule 9a): every site that turns observations into a verdict or receipt

| Site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `WitnessScan.feed/finish` (used by `parse_witness` and `stream_check`) | grammar and numeric ranges per record, per-CPU sequence contiguity equal to the `@n` dump, per-CPU time order, `enter <= ts`, the syncfs interval inside the syscall, stderr lost/error | every record between this trace's start and detach records; events outside them refuse | `SW1` tag; one start and one detach; counts per CPU, including CPUs with no records |
| `witness_context` F2 | trace attach/detach against this run's first poll start, last poll end, final readback and tailed WAL `atNs`, and the observer `end` | the polls, finals and end of this attempt's stream | witness clock record's boot id equals the meta boot id and the run's (`same_domain`); program hash, kernel release, container id as round 9 |
| `publication_split`, `marker_advance`, `new_frames`, `read_state` | row deltas of each reconstructed SQL01 commit: marker published fields, new frames, last-frame binding; marker over an empty table | this run's final WAL bytes (replayed commit by commit) | frame `(epoch, lsn, crc)` against the marker; member identity from decoded frames |
| `commit_views` | position(s) and real `U` per commit from this run's brackets; ACKs per member | this run's brackets and ACK events | `(stream, operation, attempt)` -> the frame's `(epoch, lsn)` -> every commit carrying that position; ambiguous or unknown members refuse `WITNESS-UNBOUND` |
| `judge_witness` D interval | sync records from the writer's cgroup, `ret == 0`, wait=1, inode or device of the bound WAL; eligibility by syscall/file entry >= last covering write exit | the live WAL generation of this trace | inode, device and cgroup id from the observer's own stat; neighbor, other-inode, failed and no-wait syncs never count (fixtures) |
| `normalize` annotation | `D = D_upper`, `Dlower`, `durableEndNs = max(U, D)` per logical position (latest over all carrying commits) | this run | `(epoch, lsn)` or the frontier position |
| `vm_syncwitness.compare` (W1 PASS) | complete code set, primary, run-level codes, every commit outcome against the mode's tables | judged from this session's trace, ops and WAL | the session's writer cgroup and store directory; the expectation tables in `vm_planted_writer` |
| `vm_syncwitness.stream_check` (W3 PASS) | the same state machine as the normalizer | whole trace after detach | per-CPU dump |
| `clockVerdict`, `perfParanoidVerdict`, `memoryVerdict`, `ext4BuiltinVerdict`, `mapKeysVerdict`, `judgeW0` (W0 PASS) | samples/values against stated thresholds; an unrecorded value refuses | taken in the same W0 window (not run yet) | clock: the helper's receipt clock in the VM host; memory: the cgroup found by the witness container id; map keys: the container's own `docker inspect` environment; listing: exact probe names |
| Dockerfile | `.deb` SHA256 for five packages, exact versions elsewhere, closed package list, `bpftrace --version` | build time (not built) | base image digest; apt pins |
| `run_vm_offline.py` | child exit codes and frozen-source equality; now includes `test_round10.py` and the new sources | `offline01` is a fresh directory | exact source hashes in `RESULT.json` |

Known gaps: the memory peak is read before detach; the clock check cannot see an offset below its tolerance; `D_lower` from the ext4 entry is a lower bound under the orchestrator's decision (data writeback in `sync_inodes_sb` can
precede it), not a measurement of when durability began.

### Moved source hashes

No `lab/acceptance` path moved. Changed or new sources (old at `44217f95`):

| Path | Old SHA256 | New SHA256 |
| --- | --- | --- |
| `lab/bin/sync-witness.mjs` | `2e3fc0418783d63e88e92ba4d364c924753fb74de1a2c58d076b7711f706fb98` | `859e48234deac0daeee03bd519b9e171a5bba935fccc5e554de1eedd97519b8e` |
| `lab/observer/vm_normalizer.py` | `524eee87e9f5a4d1274265e0894da8374c0da6f37d39e3dcc95e0938098aeba8` | `5850ec4bbc102728f2306a918acd96340eb990888cab8b483db31572caefc983` |
| `lab/observer/vm_syncwitness.py` | `6c6aff0f154a88cf4b68440a36a5da90b13f8da6d0547566989bb0ca69c2ce3e` | `937d65054c18c82feb7cf7793754661d113542b6cca4ec6edc0b5b8cb6dd7451` |
| `lab/observer/vm_syncwitness.bt` | `5c9444e91297b200e815f22b3d84426cc9e7a493053f5e46bf33ddd40bd1b4d3` | `e68cd5cbbfd61cd09503357e6a99961ed61f5b9490c76931911d29f1d089b248` |
| `lab/observer/vm_planted_writer.py` | `18cf0f766e2b72a38576a7c65038adf6d1bfc3129842d16811f28723a29e784d` | `81bad0e1a9e52b989f446ca0f813226942edc23ecdd8a837e5ae2097bf8c2205` |
| `lab/observer/test_syncwitness.py` | `515abbe5bbcd5a88c6c0e14e7dfcd5ddd82e90ae9ea08200b4991c99a0b5be8d` | `83b090bac2eac75670bcec1ebce7ebcf94ff8d9b70782b3b689b8f249c0e5efa` |
| `lab/observer/test_engine.mjs` | `91ae20ed7a8b966428b1ac6d1bd449f732e2db1c43b946694e4f7910a8fe4b80` | `f41050a39668a83f7bad85a49929d015e5d920cb84e2596e9c57f414bf138be0` |
| `lab/observer/run_vm_offline.py` | `a6872dad66115a386b70b4f613682f4e839ca493b17d9ae7ebe3abdfba081475` | `77f437c7b3ec9ebeed20205d5da1313b862c889aaddeb7d9163c2f4117d9c8da` |
| `lab/verify/CX-VOBS7/review_round9.py` | `00cf057e23989d73767caec1ca127c3b5ff078e39e43b0d5ca0d0ad939b374f6` | `43d35c27b3f897564d91f6aa0c56c74798c3970dd7c981530787f318917d0191` |
| `lab/observer/test_round10.py` | new | `235f56eae2ea100c9af950143a8da5a0f04c4f05238e6936ef299142fdb78d72` |
| `lab/observer/vm_clockcheck.py` | new | `59693c70a9d8584749e20d5c04ed07d0207b138a64d5e31a47e53121963ef896` |
| `lab/observer/vm_clockprobe.bt` | new | `6090eeac95efb9f93d34b0e4589145e8b6ac3df072b42d39f83d08663a2bd3e9` |
| `lab/observer/bpftrace-image/Dockerfile` | new | `855bd90334e0737f87d9d94e45689e9b267391114f4d4cbcbdef65f11403ff23` |

### What did not run

- No VM, Docker, colima, engine or network command; no image pull, apt, pip or pnpm. W0, W1, W2, W3 and W4 not run; no real `bpf()` call.
- `vm_syncwitness.bt` and `vm_clockprobe.bt` have still **never been parsed by a real bpftrace**: `nsecs(monotonic)`, the new `fentry:vmlinux:ext4_sync_fs` probe and the two extra `printf` fields are checked only by text tests.
- The Dockerfile is **not built**; its `.deb` hashes, version pins and closed package list are unverified against the archive; `libbsd0`'s version is open.
- The new harness paths in `sync-witness.mjs` (`bpftraceOnce`, `clockStep`, `witnessCgroupFacts`, the session capture, `windowW0`) are syntax-checked only; their pure verdicts are unit-tested.
- `probe_round9.py` and the round 9 durable evidence were not re-run. B9 (G03 box policy, E12 stream) and CR-NS `claim.mjs` are still not built; no trusted driver emits `driver-ack` events yet.
- The synthetic traces model what the kernel records; nothing here is VM evidence, and host power loss stays the Q100r premise.

## Round 11: fixes for the round 10 FIX-FIRST review (R10-F1 to R10-F3)

Builder: Claude Sonnet 5.5 (high), offline only. Branch `exp/OBS01-observer`, base `e696c828`. Authority: `VERIFY-round10.md` and the orchestrator's R10-F3 decision (clock primitive proven from the program).
`lab/acceptance` untouched; no pinned acceptance path moved (none of the changed files is referenced under `lab/acceptance`). Semantics are in `lab/observer/VM.md`, "Round 11".

### Outcome

| Item | Result |
| --- | --- |
| R10-F1 | `witness_context` takes the attempt's clock interval. Every `wal` event in a witnessed run needs a nonnegative `int` `atNs` (bool, string, float, null, list, missing and negative refuse) at or after the attempt start and at or before the observer end, and every chunk is in the coverage bound. Refusal is `TRACE-INCOMPLETE`. |
| R10-F2 | Each ACK is classified independently: any ACK below `D_lower` gives `ACK-BEFORE-DURABLE` (primary); any ACK in `[D_lower, D_upper)` also gives `DURABILITY-UNPROVEN`, once per commit; order and duplicates do not matter. A commit has one `U` (`commit_views` binds one position), so there are no multiple-`U` cases; the `U` branch was already independent. |
| R10-F3 (a) | `lab/bin/clock-proof.mjs` (new, pure): `clockPrimitiveVerdict` binds the pinned `.bt` hash (harness hash before and after, `sha256sum` by the same bpftrace image on the mounted file) and the exact `bpftrace v0.20.2`, takes the compiled program from `bpftrace -d all` and requires every time read to be `bpf_ktime_get_ns` (id 5) with at least one call per `nsecs(monotonic)` source site (15); ids 118, 125, 160, 208 or those names refuse. `parseCompiledHelpers` reads IR, disassembly and verifier-log forms. W0 `checks.clock` is this proof alone. |
| R10-F3 (b) | `clockVerdict` is a transport sanity check against independent local CLOCK_MONOTONIC and CLOCK_BOOTTIME reads (`vm_clockcheck.py` now stamps both, bracketed). Status `CONSISTENT` / `INCONCLUSIVE` / `INCONSISTENT`; `pass` is true only for `CONSISTENT`. `INCONCLUSIVE` when the separation is not larger than the measured uncertainty (`tolerance + slack - min hop`) or there is no boot reference. `judgeW0` records it as `clockTransport` and blocks only on `INCONSISTENT`. VM.md no longer claims the offset is always large. |

### Gates

Run through `heavy.mjs` (`--label OBS01-R11`; free disk 15 GiB, above the 5 GiB floor). Durable receipt: `/Users/sam/Claude/Projects/triplex-db-2/evidence/OBS01-R11/offline01/` (`RESULT.json`, `SHA256SUMS`) and
`reviewer-round9.{stdout,stderr}`, `reviewer-round10.{stdout,stderr}` beside it. `RESULT.json` status PASS, frozen-source pins unchanged at the end; `SHA256SUMS` sha256 `b19e7b53dab56b56e882437ae9b03e0b639982aa7b405809c0bbed634a491bdf`.

| Suite | Result |
| --- | --- |
| `test_vm.py` | 14/14 (unchanged) |
| `test_syncwitness.py` | 18/18 (unchanged tests; the normalizer fixture now stamps `atNs` on tailed WAL chunks) |
| `test_round10.py` | 40/40 (unchanged) |
| `test_round11.py` (new) | 20/20: R10-F1 (control, missing, one of two missing, string/bool/negative/float/null/list, after end, before start, endpoints, late-vs-untimed) and R10-F2 (permutations of early/unproven/safe ACKs, duplicates, boundaries, `U` independence, file-sync point, multi-member publication through `commit_views` in all six ACK orders, two commits) |
| `node --test lab/observer/test_engine.mjs` | 25/25: the 21 earlier (the clock verdict and W0 tests rewritten for the new semantics) plus 4 new (parser on constructed samples, proof verdict, source-side check, observational INCONCLUSIVE shapes) |
| Python total | 92 (72 earlier + 20 new); Node total 25 |
| reviewer `review_round9.py` | 11/11 (fresh `OUT`) |
| reviewer `review_round10.py` | 4/4 (fresh `OUT`): the three round 10 regression fixtures plus the interval control now pass; the F3 expectation changed as in divergence 8 |

Mutation spot checks (each made the new tests fail, then was reverted byte for byte): the F2 `elif` restored; the WAL tail type check removed.

### Divergences from the brief (all of them)

1. **The bpftrace flag is not verified.** The brief says to check the 0.20.2 documentation in R49. R49 (`lab/research/R49-bpftrace-source.md`) does not document bpftrace's debug or dry-run options (it covers `nsecs`, `-l`, map keys and the image). With no bpftrace and no network offline I could not confirm any option. I rely on `-d all`
   (`COMPILE_FLAGS` in `clock-proof.mjs`), from my knowledge of the 0.20 series `-d STAGE` option (all, ast, codegen, codegen-opt, dis, libbpf, verifier). I did not use `--dry-run`: I could not confirm it exists in 0.20.2. Failure mode if wrong: empty or unparseable output, so W0 refuses (tested); the first W0 run must record the real output (`w0-compiled-program.txt`). A 120 s kill guards against the flag not being a dry run.
2. **The parser tests use constructed samples**, as the brief allows: LLVM IR (old `i64 ()*` and opaque `ptr` forms), BPF disassembly (`call 5`, `call 0x7d`) and verifier-log (`call bpf_ktime_get_ns#5`) lines written from my knowledge of those formats, labeled CONSTRUCTED in `test_engine.mjs`. None is a recording.
3. **BPF helper ids are from memory** of `include/uapi/linux/bpf.h` (5 ktime_get_ns, 118 jiffies64, 125 ktime_get_boot_ns, 160 ktime_get_coarse_ns, 208 ktime_get_tai_ns); not checkable offline. The parser also cross-checks names against ids when the output carries both, and refuses on any forbidden clock helper name, so one wrong id would be caught only where a name is printed.
4. **The compiled-call count rule is `>=`, not `==`.** `-d all` prints several stages, so the same call may appear in each; the rule is at least one `bpf_ktime_get_ns` call per `nsecs(monotonic)` source site (15) in the best-represented format. A site that vanished from every stage but one would not be caught; a boot read in any stage is.
5. **The dump uses placeholder positional arguments** (`1 2 3 4`) instead of the real store directory pair, which is not known until the later attach session. They change constants only. The binding to the exact program is by the source hash, not by the dump.
6. **Observational check semantics.** The brief says to report INCONCLUSIVE when the separation is not larger than the measured uncertainty. My uncertainty is `tolerance (100 ms, the stated transport bound) + slack (1 ms) - minimum measured hop`, because transport latency has no measured upper bound; with the guest usually unsuspended (separation about zero) the real W0 will report `INCONCLUSIVE` almost always, by design. `INCONSISTENT` also covers missing samples, partial references and a null sample set (an unrecorded transport check refuses W0, as before).
7. **`vm_clockcheck.py` returns null for the CLOCK_BOOTTIME fields on a platform without it** (the macOS host that runs the unit tests) rather than substituting another clock; the verdict then reports INCONCLUSIVE. The Node helper test asserts both behaviours by platform; a Linux run was not possible here.
8. **The R10-F3 reviewer fixture's expectation changed** (`lab/verify/CX-VOBS7/review_round10.py`, `test_w0_wrong_clock_can_pass_with_small_offset_or_transport_delay`), only because of the decision above: its sample shape has no independent references and tiny separations, so every case including the honest one is `INCONCLUSIVE` (none passes) instead of the honest case passing. The two assertions of the other three fixtures are unchanged.
9. **The shared normalizer fixture now stamps `atNs` on tailed WAL chunks** (`test_syncwitness.py`, `TAIL_NS = 580,000,000`). The round 10 fixture builder never gave WAL events an `atNs`, which is why the reviewer's R10-F1 fixture removed nothing from them and why the old code accepted the run; the real collector (`vm_watch.py`) stamps every chunk. All earlier tests pass with the stamped fixture.
10. **`judgeW0` result shape** gained `checks.clockTransport` and `clockIdentity` (who proved what); `windowW0` now records `clockProgram` (image, dump path, exit codes) next to the older `clock` entry. `witnessCreateArgs` and the witness session are untouched.
11. **`bpftraceOnce` gained an entrypoint override and a kill timeout** (the proof runs `sha256sum` and the dump with the same image). The other W0 callers behave as before.

### PASS audit (rule 9a): every site that turns observations into a verdict or receipt

Round 10's table still applies to its unchanged sites. New or changed in round 11:

| Site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `witness_context` WAL tail timing | each tailed chunk's `atNs` is a nonnegative `int` in `[lower, upper]`, then folded into the detach bound | events of this attempt's stream; `lower`/`upper` are this run's case start and observer end | the chunks are the ones joined to the final WAL bytes (`captured == wal` in `normalize`); one clock domain (`same_domain`) |
| `judge_witness` ACK/`U` classification | each ACK tested against `D_lower` and `[D_lower, D_upper)` separately; `U` tested once | this run's trace, ACK events and brackets | ACK to member via the frame's decoded identity, then to every commit of that publication (`commit_views`, unchanged) |
| `clockPrimitiveVerdict` (W0 `checks.clock` PASS) | source hash by a second party (the image's `sha256sum`), exact version string, helper ids and names parsed from the compiled program, count against source sites | taken in the same W0 window, run by that W0's containers; pinned file read before and after must be equal | the hash is of the file mounted into the image that ran the dump; the receipt records the image, the version output, `compiledSha256` of the judged text and the dump path. Not bound to the witness session's actual program run except through the same pinned file hash (`programSha256` in the witness meta is the same file) |
| `clockVerdict` (transport check, never a W0 PASS by itself) | min hop, monotonicity, separation of the independent references vs uncertainty | same window; references read on each receipt | local references read by the receiving helper in the VM; says nothing about which primitive the probe used |
| `judgeW0` | proof AND recorded transport not `INCONSISTENT` AND the R10 items | as above | as above |

Known gaps: the real dump format and the `-d all` flag are unverified until W0 runs; helper ids are from memory; the compiled count rule is `>=`; `programSha256` binds the source file, not the compiled bytes of the later attach session (a different bpftrace build with the same version string would compile the same text differently, and
only the pinned image digest guards that); the observational check will usually be `INCONCLUSIVE` in a real VM.

### Moved source hashes

No `lab/acceptance` path moved. Changed or new sources (old at `e696c828`):

| Path | Old SHA256 | New SHA256 |
| --- | --- | --- |
| `lab/bin/sync-witness.mjs` | `859e48234deac0daeee03bd519b9e171a5bba935fccc5e554de1eedd97519b8e` | `f07003dd43f04728073c27887c4d01b74478d3e1170561e03180e33f22c88e10` |
| `lab/observer/vm_normalizer.py` | `5850ec4bbc102728f2306a918acd96340eb990888cab8b483db31572caefc983` | `222dbe1455b2da1ca1346c3152b9411ff97452a9658a7da5aa68586d7eef3b46` |
| `lab/observer/vm_clockcheck.py` | `59693c70a9d8584749e20d5c04ed07d0207b138a64d5e31a47e53121963ef896` | `fe576d8d013a6f16774d86b9c06fe5c1e881c916129f45fea575e3f0174caa19` |
| `lab/observer/test_engine.mjs` | `f41050a39668a83f7bad85a49929d015e5d920cb84e2596e9c57f414bf138be0` | `312ed665595847125e213e1c68b442c86bbde4fe8f735189238dae660d036bca` |
| `lab/observer/test_syncwitness.py` | `83b090bac2eac75670bcec1ebce7ebcf94ff8d9b70782b3b689b8f249c0e5efa` | `ad8a8b882c478af003081e54382848cd541b65d59b94c259bddb322e326132a1` |
| `lab/observer/run_vm_offline.py` | `77f437c7b3ec9ebeed20205d5da1313b862c889aaddeb7d9163c2f4117d9c8da` | `276f58166358f96ab9ace17a9c901f3dff0104abc70778a9e870c7de375a66e3` |
| `lab/verify/CX-VOBS7/review_round10.py` | `a2e7d5c215ac56cfc5fdb4f8583c47054f778ab165e3c99751492112cf6b4401` | `65c7026bc6465f432c6c53159905f90f73e07685775c26b7e459a48e6abdb6c9` |
| `lab/bin/clock-proof.mjs` | new | `bb661980c8e1e72a4e35dab1e395fd5fef8cd09f9d99c15ed0f14e9c48c3cf3e` |
| `lab/observer/test_round11.py` | new | `791c44b66e696142cb28e3980ded60f210f2327ad45ae917a1e6eaa34770de2e` |

### What did not run

- No VM, Docker, colima, engine or network command; no image pull, apt, pip or pnpm. W0, W1, W2, W3 and W4 not run; no real `bpf()` call and no real bpftrace of any kind, so `bpftrace -d all`, `--version`, and the compiled-program format are all unobserved.
- `clockProgramStep`, the new `bpftraceOnce` options (entrypoint, timeout) and the updated `windowW0` wiring are syntax-checked only; their pure verdicts and the parser are unit-tested on constructed samples.
- The Dockerfile is still not built (libbsd0 version open); B9 and CR-NS `claim.mjs` still not built.
- `probe_round9.py` and earlier durable evidence were not re-run. The helper's real CLOCK_BOOTTIME path (Linux) was not exercised on this macOS host.
