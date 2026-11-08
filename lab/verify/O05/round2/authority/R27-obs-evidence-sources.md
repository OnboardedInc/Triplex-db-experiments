# R27: where O-OBS evidence comes from, per protocol, on XTDB 2.2.0, QLever 0.6.0 and Datomic Pro 1.0.7745

**Written:** 2026-11-08 by planner R27 (Opus 5.5, high) under `lab/PROTOCOL.md`. **Moves:** P1 (OBS-NO-MUTATION, OBS-CONNECTIONS,
OBS-CANCEL), P2 and P3 (OBS-ACK-ORDER, OBS-WATERMARK, OBS-FAULT-TRANSITIONS), P5 (OBS-WORK, OBS-RESOURCE, OBS-MAINTENANCE) and the
erasure floor (OBS-ERASURE-SCAN). **Feeds:** EXP-O05 (O-OBS, built at `6852fc1` on `exp/O05-observation-oracle`), its CA01 item, and
the collector that O-OBS assumes but does not build.

## How to read this report

- **Evidence labels.** `[S]` read in pinned source at `path:line`: XTDB is `references/xtdb` (v2.2.0, `c6c1962`), QLever is
  `references/qlever` (v0.6.0, `6c5861a`), lab code is cited by branch and path. `[D]` vendor documentation: XTDB docs inside
  `references/xtdb/docs/`, Datomic docs on docs.datomic.com fetched 2026-11-08 (no personal details sent). `[W]` other web sources
  (forums, chat logs). `[P]` a measurement in an earlier lab report (R8, R16, R17, R22). `[E]` my inference. `[R16]` and similar point
  to `lab/research/`.
- **Not done.** Research only: no Docker, no engine, no VM command, no repository edit, no download. Every "exposes" claim is from
  source or docs; whether the pinned images were built with each feature (QLever's OpenTelemetry metrics in particular) is probe P1 in
  section 10.
- **Datomic has no source.** Datomic publishes binaries only `[R29]`, so every Datomic statement is `[D]`, `[W]` or `[E]`.
- **Source ids.** Sections 4 to 7 number every evidence source (X1, Q1, D1, H1, T1). The protocol table (section 3) refers to them.

## 0. Answer

**Every OBS protocol has a trustworthy source on XTDB and QLever except the parts that are Triplex's own timings. Datomic is weaker,
because its query engine (the peer library) runs inside the Triplex gateway, which is code under test.**

1. **Three findings change the plan.**
   - **QLever 0.6.0 has a Prometheus endpoint and a per-operation event log.** `--enable-metrics` serves `/metrics` with
     `qlever.sparql_operation.started|finished{operation=query|update}`, `qlever.delta_triples`, `qlever.index.rebuild_in_progress`
     and `qlever.index.load_time` (`src/util/metrics/ServerMetrics.cpp:34-77`, `src/engine/Server.cpp:694-703`) `[S]`. The default-on
     `<index>.metrics-log.jsonl` writes a `start` and an `end` line for every query and update, with the query id, client ip, full
     text and terminal status `ok|failed|cancelled|timeout` (`src/util/http/websocket/QueryId.h:61-75,159-192`, `Server.cpp:100-112`)
     `[S]`. The lab turns it off (`qlever-start.sh`: `--no-metrics-log --no-resource-usage-log`). R24's "no counters beyond CPU and page
     faults" is wrong for counters and for rows: the `application/qlever-results+json` answer carries per-operator `result_rows`
     (`src/engine/RuntimeInformation.cpp:201-217`) `[S]`. QLever still has no bytes counter.
   - **XTDB's EXPLAIN ANALYZE works; R16's harness decoded it wrongly.** The scan row's `attributes` column is a struct sent as JSON
     with `scan_rows_read`, `scan_pages_used`, `scan_files_used` and the pruned counts (`core/src/main/clojure/xtdb/query.clj:232-246`,
     `core/src/main/kotlin/xtdb/operator/scan/ScanMetrics.kt:13-24`) `[S]`. R16's probe printed `Object.values(r).join(" | ")`
     (`R16-xtdb-northstar/p4.mjs:29`), which turns the parsed JSON object into `[object Object]` `[P]`. Better still, XTDB's OpenTelemetry
     tracer puts the same counters on every scan span of the measured query itself, with no re-execution
     (`core/src/main/kotlin/xtdb/api/ICursor.kt:100-107`, `scan.clj:369-389`) `[S]`.
   - **XTDB's "latest submitted" log position is not a mutation counter.** Block flushes and compaction append `flush-block` and
     `tries-added` messages to the same source log (`core/src/main/kotlin/xtdb/indexer/LogProcessor.kt:122-123`,
     `compactor/Compactor.kt:150-152`) `[S]`. Use the gauge `node.tx.latestCompletedTxId{db=...}`, which only transactions advance
     (`database/Database.kt:376-378`, `indexer/SourceLogProcessor.kt:142-151`) `[S]`.
2. **Taxonomy (section 1).** Six kinds, in trust order: engine-internal (EI), transport-observed (TO), host-observed (HO),
   durable-readback (DR), harness-observed (HR, accepted only for caller-side fields), and SUT-reported (CR, always rejected).
   Anything Triplex code produces is CR, including the Datomic gateway, the P2Q broker's own timestamps and C8's counter while it runs
   inside the client process.
3. **Collector format (section 2), the answer to O-OBS CA01.** One observer sidecar per engine container, in the triplex2 VM, sharing
   the engine's network and PID namespaces, on its own CPU, launched by the orchestrator's tooling. It writes an `obs-bundle/1`:
   content-addressed raw chunks with a per-stream hash chain, an HMAC over each chunk header under a per-run key the SUT never sees,
   a clock bridge to the harness, and pinned stdlib normalizers that O-OBS reruns, so O-OBS's `records` are recomputed from raw bytes,
   never accepted as given. It stops accidental and adapter-level forgery; it does not stop an agent with shell access on the Mac
   (section 2.5).
4. **Coverage (section 3).** Of 42 protocol-by-engine cells, 26 reach EI or DR, 9 reach only TO or HO (CONNECTIONS, RESOURCE and
   WATERMARK on every engine, by their nature), 3 are caller-side probes with EI corroboration (AVAILABILITY), and 4 have no
   trustworthy source today: Datomic OBS-CANCEL drain, Datomic OBS-PREABORT for reads, physical OBS-ERASURE-SCAN on Datomic dev
   storage, and OBS-ACK-ORDER publication time for log-source compositions (the P2Q broker; counted under QLever). Section 9 names the
   smallest instrument for each.
5. **Erasure (section 8).** Plain `grep` gives false PASS on QLever's vocabulary (FSST-compressed by default,
   `src/index/IndexImpl.cpp:1507-1509`) and probably on Datomic segments. Every scan location needs a positive control: a canary
   written before erasure that the same scanner finds. The observers themselves (QLever metrics log, XTDB DEBUG log, OTLP spans,
   proxy captures, docker log files) become protected copies and must join `PROTECTED_COPY_INVENTORY`.

| Kind | XTDB 2.2.0 | QLever 0.6.0 | Datomic Pro 1.0.7745 |
| --- | --- | --- | --- |
| Best engine-internal channel | `/metrics` on healthz :8080; `xt.*` system tables; OTLP spans; DEBUG logs | `/metrics` (flag); `metrics-log.jsonl`; `cmd=` admin; runtime info | transactor `metrics-callback`; transactor log; an observer peer reading `d/log` |
| Read-side engine evidence | yes (spans, DEBUG SQL log, EXPLAIN ANALYZE) | yes (event log, active-query dump, runtime info) | none outside the gateway JVM |
| Protocol cells at EI or DR | 10 of 14 | 9 of 14 | 7 of 14 |
| Cells with no trustworthy source | 0 | 1 (log-source ACK-ORDER) | 3 (CANCEL, PREABORT reads, ERASURE-SCAN) |

## 1. Source-kind taxonomy O-OBS can enforce

### 1.1 The kinds

| Kind | Code | Definition | Trust rule | Examples |
| --- | --- | --- | --- | --- |
| Engine-internal | `EI` | Bytes produced by the engine's own code about its own state, read by the collector over a channel the SUT does not carry. Sub-kinds: `EI-metric` (sampled gauge or counter), `EI-table` (system table read), `EI-log` (event or log line), `EI-trace` (span), `EI-query` (the engine answers a collector-issued query), `EI-replay` (the collector re-runs the operation with an engine diagnostic, e.g. EXPLAIN ANALYZE). | Accepted. The SUT can influence it only through what it sends to the engine. | X1, X5, Q1, Q3, D1 |
| Transport-observed | `TO` | Bytes on the wire between the SUT and the engine, captured by a proxy in a different process (and container) from the SUT. | Accepted. Fails closed on unparseable traffic, as C8 does. Not accepted when the proxy runs inside the SUT's process. | T1, T2 |
| Host-observed | `HO` | Kernel or container-runtime facts: cgroup v2 files, `/proc`, the netns socket table, process start times, docker log timestamps, file sizes and scans. | Accepted. The SUT can change the value only by using the resource. | H1 to H8 |
| Durable-readback | `DR` | After the fact (often after a crash), an independent reader opens the durable bytes and reads them: Python `sqlite3` on the broker file, a collector query after restart, a file scan. | Accepted for FAULT-TRANSITIONS, ERASURE-SCAN and SCRATCH. | H6, X4 after restart |
| Harness-observed | `HR` | Caller-side facts recorded by the independent driver: `tCancelRequested`, `tCallerSettled`, `callerError`, probe outcomes. | Accepted only for fields the contract defines as caller-observed; never for engine-side fields. | NS driver events |
| SUT-reported | `CR` | Anything computed by Triplex code: adapter counters, receipts' own timings, the Datomic gateway's reports, the broker's `committed_at`, C8 inside the client process. | Rejected as evidence. May be retained for cross-checks. | `waitMs` from Triplex |

### 1.2 Rules O-OBS should enforce

1. **`source.kind` becomes a three-part string** `<code>/<engine>/<sourceId>`, for example `EI-metric/xtdb/X1.node.tx.latestCompletedTxId`
   or `HO/any/H1.memory.peak`. O-OBS keeps a per-protocol, per-engine allowlist (section 3); `CR/*` is refused (exit 2) and `HR/*` is
   accepted only for the caller-side fields listed in 1.1.
2. **Engine-side fields need at least one EI, TO, HO or DR source.** When the best source for a cell is TO or HO only, the verdict
   carries `sourceStrength: indirect` so a reader sees which PASSes rest on weaker evidence.
3. **Two independent kinds for the four P1 and P2 safety protocols** (NO-MUTATION, PREABORT, CANCEL, ACK-ORDER): require agreement of
   two sources of different kinds where both exist (for example X1 counter and T1 proxy). Disagreement is FAIL, not "pick one".
4. **Records are recomputed, not trusted.** `source.records` must equal what the pinned normalizer produces from the raw chunks named
   in `source.streamRefs` (section 2.3). This extends O-OBS's current hash check (`observe.py` `source()`), which binds the records to
   themselves only.

## 2. The authenticated collector format (`obs-bundle/1`)

### 2.1 Topology

```
 macOS host (harness, Triplex SUT, P2Q broker)          triplex2 VM (colima vz, cgroup v2, kernel 6.8)
 +------------------------------------------+          +---------------------------------------------------------------+
 | NS driver / gate (HR events)             |          |  tx2-<lane>-<slot>  (engine container, SUT engine)            |
 |   |                                      |          |    engine process(es)  :5432 / :7019 / :8470   :8080 healthz   |
 |   v                                      |  port    |        ^ localhost (shared netns)                             |
 | Triplex adapter --------------------------+--fwd---->|  tx2-obs-<slot>  (observer sidecar, own cpuset core)           |
 |   (connects to the proxy port, not the   |          |    T1/T2 proxy  ->  engine via 127.0.0.1                      |
 |    engine port)                          |          |    scrapers: /metrics, xt.* tables, cmd=stats, dump-active    |
 | clock-bridge pinger  <-------------------+--------->|    tailers: docker log file, metrics-log.jsonl, OTLP receiver |
 | kqueue watcher on broker WAL (H7)        |          |    host: /sys/fs/cgroup/docker/<id>/*, /proc/<pid>/*, netns   |
 +------------------------------------------+          |    writes /obs/<runId>/ (own volume), HMAC key mounted ro     |
                                                       +---------------------------------------------------------------+
```

- **Launch.** `lab/bin/engine.mjs` (orchestrator tooling) starts `tx2-obs-<slot>` next to the engine with `--network container:<engine>`,
  `--pid container:<engine>`, `--cgroupns host`, `/sys/fs/cgroup` read-only, the engine volume read-only, its own `/obs` volume, and
  `--cpuset-cpus` on a core no measurement slot uses `[E]`. Builder code never starts or configures it.
- **Why a sidecar and not the Mac.** It reads the healthz port that `engine.mjs` does not publish (`lab/bin/engine.mjs:80-95` publishes
  only 5432 and 7019) `[S]`, it sees the engine's `/proc` and cgroup, and its clock is the engine's clock.
- **Image.** Pinned by digest: Python 3 (stdlib only), `psql` for XTDB EI-query, and, if spans are used, a pinned OpenTelemetry
  Collector writing OTLP-JSON to a file (XTDB exports OTLP over HTTP with protobuf, `core/src/main/kotlin/xtdb/Tracer.kt:28` `[S]`).

### 2.2 Bundle layout

```
/obs/<runId>/
  bundle.json                  envelope (2.3), written at start, sealed at end
  streams/<streamId>/chunks/<seq>.bin      raw bytes exactly as read (HTTP body + status line + headers, log bytes, file reads)
  streams/<streamId>/chunks/<seq>.hdr.json chunk header (2.4)
  normalized/<protocol>/<subjectId>.json   O-OBS evidence objects whose source.records the normalizer reproduces
  clock/bridge.jsonl           clock-bridge samples (2.6)
  seal.json                    final head hash of every stream, HMAC over it
```

### 2.3 Envelope (`bundle.json`)

| Field | Content |
| --- | --- |
| `format` | `"obs-bundle/1"` |
| `runId`, `receiptId` | binds the bundle to one receipt (ACCEPTANCE 5.1); the receipt names `bundleSha256` |
| `collector` | `{imageDigest, sourceSha256, configSha256, containerId, cgroupPath, cpuset, startedAtMono, startedAtReal}` |
| `sut` | `{lane, engineContainerId, engineImageDigest, engineConfigSha256, enginePids [{role, pid, starttime}]}` (pid start times from `/proc/<pid>/stat` field 22) |
| `clock` | `{domain: "vm-monotonic-ms", bridge: "clock/bridge.jsonl", maxUncertaintyMs}` |
| `streams` | `[{streamId, kind (1.1 code), sourceId (sections 4 to 7), endpoint, method: scrape\|tail\|query\|scan\|capture\|replay, cadenceMs, normalizer {id, version, sha256}}]` |
| `keyId` | id of the per-run HMAC key (2.5); never the key |

### 2.4 Chunk header

`{streamId, seq, tStartMono, tEndMono, tStartReal, byteLength, sha256, prevHeaderSha256, hmac}` where `hmac` is HMAC-SHA256 over the
canonical header without `hmac`. `seq` is dense from 0; a missing `seq` is a gap; `prevHeaderSha256` chains the stream. Scrapes and
queries have one chunk per sample; tails have one chunk per read of new bytes plus a chunk at each file rotation or truncation
(detected by inode and size).

### 2.5 Authentication and its limit

1. The orchestrator generates a 32-byte key per run, writes it to a file mounted read-only into the observer only, and keeps a copy
   with the receipt evaluator. Python's `hmac` and `hashlib` are stdlib, so O-OBS stays stdlib-only. Ed25519 is not in the Python
   stdlib, so signatures would add a dependency `[E]`.
2. Every 10 s and at seal, the observer appends `{runId, streamId, seq, headSha256, tMono}` to a witness log that only the orchestrator
   tooling writes (`lab/agents/ledger.jsonl` or a sibling) `[E]`. A later edit then has to rewrite the bundle, the HMACs and the witness
   log together.
3. **What it proves:** the bundle came from a holder of the run key, in this order, without later edits, and its normalized records
   come from those bytes. **What it does not prove:** that no process running as the same macOS user read the key. All lab agents run
   as one user, so a determined agent can forge. The control for that is ACCEPTANCE 5.8's verifier spot-rerun by a different agent,
   which repeats the collection `[E]`.

### 2.6 One clock

- O-OBS needs one monotonic clock (`observe.py` README). The observer's `CLOCK_MONOTONIC` in the VM is that clock.
- Engine wall-clock stamps (QLever `ts-ms`, XTDB span times and `log_timestamp`, docker log timestamps, Datomic `:db/txInstant`) are
  VM `CLOCK_REALTIME`; the observer maps them by its own paired (realtime, monotonic) readings, same kernel, error under 1 ms `[E]`.
- Harness events on the Mac are mapped by a bridge: the harness sends a ping every second over the forwarded port, recording Mac
  monotonic send and receive; the observer records its receive time. Offset uncertainty is half the round trip. Each mapped time
  carries `±u`; an inequality the contract requires (for example `tAck >= tSourcePublished`) passes only with margin `u`. With
  T-WATERMARK-WAIT-MS at 10 ms (ACCEPTANCE line 120), `u` must stay under about 1 ms, which an ssh port forward should meet idle and
  may not meet under load `[E]`; the bridge rejects samples with a round trip above 2 ms.

### 2.7 Normalizers

Stdlib Python, pinned by hash, one per source id: Prometheus text parser, JSONL tail parser (QLever event log), log4j2 text-line parser
(XTDB DEBUG), OTLP-JSON span parser, `psql -A -t` output parser, cgroup and `/proc` parsers, pgwire and HTTP frame parsers for T1 and T2.
O-OBS (or a `verify` step before it) reruns the normalizer over the referenced chunks and compares with `source.records`.

## 3. Protocol x engine: source, kind, collection

Source ids are defined in sections 4 (XTDB), 5 (QLever), 6 (Datomic) and 7 (host and transport). "Best" is what O-OBS should require;
"Also" is the second, different-kind source for rule 1.2.3.

| Protocol | XTDB 2.2.0 | QLever 0.6.0 | Datomic Pro 1.0.7745 |
| --- | --- | --- | --- |
| **OBS-CANCEL** | Best `EI-trace` X7: `xtdb.query` span end is the drain instant, request id in a SQL comment in `query.text`. Also `EI-log` X6 (`Cancel request received`, `Query cancelled`) and `EI-metric` X1 `pgwire.cancelled_connections` as the engine-side ack. Reuse: T1 sees the next statement and its reply on the same backend connection. | Best `EI-log` Q3: `end` event with `status: cancelled\|timeout` for qid = request id (client sets the `Query-Id` header, `Server.cpp:995`). Also `EI-query` Q4 `cmd=dump-active-queries` polled at 250 ms for the active-sample series. Ack: T2 sees the WebSocket `cancel` frame and the HTTP close. | **Gap.** No engine listing; queries run in the gateway peer. Interim `HO` H5: per-thread CPU and name in `/proc/<pid>/task/*` of the gateway JVM (needs the gateway to name worker threads). Datomic's `:timeout` is "approximate" `[D]`. |
| **OBS-PREABORT** | Best `EI-log` X6: DEBUG `xtdb.pgwire` logs every parsed SQL text (`pgwire.clj:752-753`); coverage = continuous docker log. Also `TO` T1. | Best `EI-log` Q3: no `start` event with that qid over the window; the log never drops lines (queue blocks, `QueryEventLog.cpp:45-51`). Also `TO` T2. | Writes: `EI-log` D2 transactor log (one entry per transaction) plus D3 observer peer `tx-range`. Reads: **gap**, `TO` T3 (harness to gateway) only. |
| **OBS-CONNECTIONS** | Best `HO` H4: ESTABLISHED sockets on :5432 in the engine netns, joined to T1's per-pool upstream source ports. Also `EI-metric` X1 `pgwire.active_connections` (read-write port only, see 4.2). | Best `HO` H4 on :7019 joined to T2. No engine connection gauge. | Best `HO` H4 on the gateway port joined to T3. `RemotePeers` (D1) counts peers on the transactor, not client connections. |
| **OBS-SCRATCH** | Best `EI-query` X4: collector `psql` `SELECT COUNT(*)` per scratch relation at a fresh snapshot. Also `EI-table` X3 `xt.live_tables.row_count`. | Best `EI-query` Q5: collector SPARQL `COUNT` per scratch graph. | Best `EI-query` D3: observer peer counts datoms of the scratch attribute set. |
| **OBS-NO-MUTATION** | Best `EI-metric` X1 `node.tx.latestCompletedTxId` for every `db` tag. Also `TO` T1 (C8 classifier, out of process) and `EI-trace` X7 (no `xtdb.transaction` span). Never `latestSubmittedMsgId`. | Best `EI-metric` Q1 `qlever.sparql_operation.started{operation="update"}`; plus `EI-log` Q6 `Processing command` lines for mutating `cmd=` calls, which the counter misses. Also `TO` T2 and `HO` H6 (`.update-triples` size and mtime). | Best `EI-query` D3: observer peer `basis-t` after `d/sync`. Also `EI-metric` D1 `TransactionBytes` sample count per report (coarse) and `EI-log` D2. |
| **OBS-RESOURCE** | Best `HO` H1 cgroup `memory.peak`, `memory.current`, `memory.stat`, `io.stat` plus H3 disk. Corroborate with X1 `jvm.memory.*`, `xtdb.allocator.*`, `memory-cache.*`. | Best `HO` H1 plus H3. Corroborate with Q1 `qlever.memory_query_available`, `qlever.memory_cache_used` and Q7 resource-usage TSV. Planner memory: **gap** (outside `-m`, no metric). | Best `HO` H1 per container plus H2 `/proc/<pid>/status` `VmHWM` per JVM (transactor and gateway are separate owners). Corroborate with D1 `AvailableMB`, `MemoryIndexMB`. |
| **OBS-AVAILABILITY** | `HR` probe outcomes (they are caller-side by definition), corroborated by `EI-metric` X1 `latestCompletedTxId` advancing and X2 `/healthz/alive`. Restart events: `HO` H8 engine pid start time. | `HR` probes; corroborate with Q1 `finished` counters advancing, `/ping`, `qlever.server.start_time`; restarts H8. | `HR` probes; corroborate with D3 `basis-t` advancing and D1 `HeartbeatMsec`; restarts H8 per JVM. |
| **OBS-SCALE-COUNT** | Best `EI-query` X4 count by the collector, compared with O-REPLAY. The case result itself is `TO` T1 (the bytes the engine returned to Triplex). | `EI-query` Q5 and `TO` T2. | `EI-query` D3 and `TO` T3 (gateway answer, which is Triplex code, so D3 is the one that counts). |
| **OBS-WORK** | rowsScanned: Best `EI-trace` X7 scan span `scan_rows_read`, `scan_pages_used` on the measured run; fallback `EI-replay` X8 EXPLAIN ANALYZE. rowsWritten: X7 `operations.count`, X3 `xt.table_block_files.row_count` deltas. bytesWritten: `HO` H1 `io.stat` wbytes and H3 file-size deltas of `log/` and `buffers/`; X3 `xt.block_files.file_size`. | triplesTouched: `TO` T2 captures the update reply's delta-triples counts (`delta-triples.after.total`, R8) and `EI-metric` Q1 `qlever.delta_triples`. rowsScanned: `EI-replay` Q8 `result_rows` of index-scan leaves under `qlever-results+json`, cache cleared or `cache_status` checked. bytesWritten: `HO` H1, H3. bytes read: **gap** (H2 page faults and `io.stat` rbytes only). | rowsScanned: `EI-replay` D4 query-stats `:rows-in`/`:rows-out` and io-stats segment reads by the observer peer. rowsWritten: D3 datoms per transaction from `tx-range`. bytesWritten: `HO` H1 `io.stat` on the transactor; D1 `TransactionBytes`, `StoragePutBytes`. |
| **OBS-MAINTENANCE** | Events: `EI-table` X3 `xt.source_log_msgs` rows of `msg_type` `tries-added` and `flush-block` with `log_timestamp`; start instants from `EI-log` X6 DEBUG `compacting ...` / `compacted ...` and `finishing block` / `block uploaded`. Lag: `EI-metric` X1 `node.tx.lag.MsgId` (messages, not ms) plus H-side lag probe (9.6). | Events: `EI-log` Q9 `<index>.rebuild-index-log.txt` (start and "Index rebuild completed" lines) and `EI-metric` Q1 `rebuild_in_progress`, `index.load_time` at swap. Lag: delta size Q1. | Events: `EI-metric` D1 `CreateEntireIndexMsec`, `IndexWrites` at job end; `EI-log` D2 with the `datomic.index` logger at DEBUG for start `[W]`. Lag: D3 observer `basis-t` against transactor. |
| **OBS-ERASURE-SCAN** | `HO`/`DR` H6 scan of `/var/lib/xtdb/log` (`LOG`, `REPLICA_LOG`), `/var/lib/xtdb/buffers`, golden clones, and the observer stores, with a positive canary control per location. PASS on log-retained values only by crypto-shredding (section 8.1). | `HO`/`DR` H6 scan with an FSST-aware decoder for `.vocabulary.*`, plus `.update-triples`, `previous.*`, server log, metrics log, rebuild log; positive controls. | **Gap** for physical proof: H2 file encoding not documented. Excision (D5) plus `gc-storage` is the native path; scan needs a decoder or crypto-shredding. |
| **OBS-WATERMARK** | Best `TO` T1: the read's statements and replies on the wire, including the marker row in the same `READ ONLY` transaction and `SNAPSHOT_TOKEN`; serving index = which upstream the proxy forwarded to. Incarnation: H8 pid start time plus log epoch. `waitMs` is CR; bound it by T1 times. | Best `TO` T2: request and reply bytes, marker triple in the same request; incarnation fence from Q1 `qlever.index.load_time` and `cmd=get-index-id`. | Best `TO` T3 plus `EI-query` D3: observer peer reads the marker at the same `t`. |
| **OBS-ACK-ORDER** | Engine-source: `tSourcePublished` from `EI-trace` X7 `xtdb.transaction` span end (indexed) or `EI-table` X3 `xt.txs.system_time`; `tAck` is `HR` (the caller receives the ACK). Log-source (EXP-P2B): as the QLever column, gap G3. | Log-source (P2Q broker is the source of truth): durable row by `DR` H6 (`sqlite3` read-only). **Gap G3 today** for the publication instant: the broker's `committed_at` is CR; closable with `HO` H7 (kqueue write event on the WAL). `ackSender` is observable only if Triplex runs as a separate process from the harness; otherwise `HR`. | Engine-source: `EI-query` D3 `:db/txInstant` and `tx-range` arrival at the observer; `tAck` `HR`. |
| **OBS-FAULT-TRANSITIONS** | `DR`: after restart, X4 queries `xt.txs` and the marker rows by operation id; X3 `xt.source_log_msgs` for written-not-indexed messages. Pre-crash witness times from T1. | `DR`: after restart, Q5 SPARQL readback of receipt and watermark triples; H6 `.update-triples` presence. Log-source: H6 `sqlite3` on the broker file. | `DR`: observer peer D3 `tx-range` by operation id after restart. |

**Count.** EI or DR as the best source: XTDB 10 (CANCEL, PREABORT, SCRATCH, NO-MUTATION, SCALE-COUNT, WORK, MAINTENANCE,
ERASURE-SCAN, ACK-ORDER, FAULT-TRANSITIONS), QLever 9 (the same minus ACK-ORDER), Datomic 7 (SCRATCH, NO-MUTATION, SCALE-COUNT, WORK,
MAINTENANCE, ACK-ORDER, FAULT-TRANSITIONS). CONNECTIONS, RESOURCE and WATERMARK are HO or TO on every engine, because what they
measure is a socket, a cgroup or a wire exchange. AVAILABILITY is HR plus EI corroboration on all three. Four cells are gaps
(section 9). The log-source ACK-ORDER gap applies to any lane whose source of truth is the host broker, XTDB under EXP-P2B included.
"ERASURE-SCAN at EI or DR" means a sensitive scan exists; on XTDB it still FAILs on the log unless values are crypto-shredded.

## 4. XTDB 2.2.0 sources (question 2)

### 4.1 Catalog

| Id | Source | What it reports | Resolution and lag | Can the SUT influence it? | Collection cost |
| --- | --- | --- | --- | --- | --- |
| X1 | Prometheus `/metrics` on the healthz server, `healthz.port` 8080 in `xtdb-config.yaml` (`healthz.clj:56-60`; port default 0 = random, `api/metrics/HealthzConfig.kt:14-21`) | Gauges per `db`: `node.tx.latestCompletedTxId`, `node.tx.latestSubmittedMsgId`, `node.tx.latestProcessedMsgId`, `node.tx.lag.MsgId` (`database/Database.kt:376-388`); `pgwire.active_connections`, `pgwire.pending_connections`, counters `pgwire.total_connections`, `pgwire.cancelled_connections`, `pgwire.connections_refused`, timer `pgwire.tx.latency` (`pgwire.clj:1812-1816,1880-1890`); `query.timer`, `query.error`, `tx.error`, `node.tx.await/submit/execute` (`node/impl.clj:190-199`); `compactor.job.timer`, `compactor.jobs.available` (`compactor/Compactor.kt:195-208`); `block.upload.timer`, `xtdb.block.last_upload_time`, `xtdb.log.leader` (`indexer/LogProcessor.kt:412-425`); `memory-cache.*Bytes`, `xtdb.allocator.*`, JVM memory, GC, threads, `jvm.memory.direct.bytes`, `jvm.memory.netty.bytes` (`Metrics.kt:26-49`) `[S]` | Instantaneous gauges at scrape; counters cumulative since start. No lag beyond the scrape. | Only through its own traffic. | One HTTP GET; Micrometer scrape is in-JVM, cheap at 1 Hz to 4 Hz `[E]`. Port is not published to the Mac, so the sidecar reads it on localhost. |
| X2 | `/healthz/alive`, `/healthz/started`, `POST /system/finish-block` (`healthz.clj:62-141`) | alive: ingestion error or block lag over 5 per db; started: caught up to startup targets | Instant | No | Trivial |
| X3 | System tables over pgwire: `xt.txs` (`_id`, `committed`, `error`, `system_time`, `user_metadata`) `[R16]`; `xt.source_log_msgs` and `xt.replica_log_msgs` (`msg_id`, `log_offset`, `log_timestamp`, `msg_type` = tx, flush-block, tries-added, attach-database, ..., `msg`, `tx_ops` as text) (`log_tables.clj:31-52`); `xt.block_files`, `xt.table_block_files`, `xt.table_block_file_tries` (`block_tables.clj:31-56`); `xt.trie_stats`, `xt.live_tables`, `xt.live_columns`, `xt.metrics_timers`, `xt.metrics_gauges`, `xt.metrics_counters` (`information_schema.clj:171-192`); `pg_catalog.pg_stat_user_tables.n_live_tup` (`:123-126`) `[S]` | Exact engine state at the query's snapshot | Snapshot of the collector's own query | Only through its traffic | A query against the SUT engine: it consumes engine CPU and a pgwire thread, so poll at 1 Hz or less; `xt.txs` range polls scan (12 ms at 18.5k rows, `[P R16]` 3.2). `xt.source_log_msgs.tx_ops` renders tx payloads as text, a plaintext channel. |
| X4 | Collector-issued count and readback queries (`psql`, own connection, `BEGIN READ ONLY`) | Engine-computed answers | Snapshot | No | As X3 |
| X5 | (reserved: Flight SQL on :3000 offers nothing beyond pgwire for observation `[E]`) | | | | |
| X6 | Engine log on stdout through log4j2 (`main/src/main/resources/log4j2.xml`, `xtdb` at INFO; custom config via `-Dlog4j2.configurationFile`, `docker/Dockerfile` label) at DEBUG for `xtdb.pgwire`, `xtdb.compactor`, `xtdb.indexer` | `Interpreting SQL: <text>` for every parsed statement (`pgwire.clj:752-753`); `New connection`, `Connection closed` with `cid` (`:1673,139-152`); `Cancel request received for connection` (`:198-204`); `Query cancelled` (`:1139-1148`); `compacting '<table>' <tries> -> <out>` and `compacted ...` (`compactor/Compactor.kt:272-287`); `finishing block`, `block uploaded`, `finished block` (`indexer/BlockCutter.kt:179,261,300`) `[S]` | Default pattern stamps `HH:mm:ss` only (`log4j2.xml`); the docker json-file driver stamps each line in nanoseconds on receipt, which is host-observed `[E]` | Only by its SQL text; Triplex chooses the text, so the request id goes in a SQL comment | DEBUG on `xtdb.pgwire` writes one line per statement through a synchronous console appender: measurable cost at P1 rates. Enable in protocol runs only, A/A-checked `[E]`. Holds literal SQL text: a protected copy. |
| X7 | OpenTelemetry spans (`tracer: {enabled: true, endpoint: http://127.0.0.1:4318/v1/traces}` `[D]` `docs/.../ops/config/monitoring.md:70-95`; `api/metrics/TracerConfig.kt:8-14`) | `xtdb.query` with `query.text` (`query.clj:463`); child cursor spans with `cursor.row_count`, `cursor.page_count`, `cursor.total_time_ms` and the scan attributes `scan_rows_read`, `scan_pages_used`, `scan_files_used`, pruned counts (`api/ICursor.kt:97-107`, `operator/scan.clj:369-389`); `xtdb.transaction` with `operations.count` (`indexer/TxResolver.kt:200-202`); `xtdb.transaction.sql` with `query.text` (`indexer/SourceLogTxIndexer.kt:299-301`) `[S]` | Span start and end to the nanosecond; exported when the span ends | Only through query text | `SimpleSpanProcessor` exports every span on end with one HTTP call (`Tracer.kt:28`), so cost scales with spans per query; protocol runs only, not P1 throughput runs `[E]`. Spans hold query text: a protected copy. |
| X8 | `EXPLAIN ANALYZE <query>` replayed by the collector | Per operator `row_count`, `page_count`, times; scan `attributes` struct (`query.clj:232-246,267-289`) | Exact for the replay, not for the measured run | No | Re-executes the query; decode `attributes` as JSON (pgwire sends structs as JSON `[S]` `pgwire/PgType.kt:117,827-843`). |
| X9 | Files under `/var/lib/xtdb`: `log/LOG`, `log/REPLICA_LOG` (`api/log/LocalLog.kt:52,350`), `buffers/` (Arrow tries and block files) | Durable bytes; no compression codec appears in core `[S]` (grep finds none) | Instant | No | H3 and H6 read them from the read-only volume mount. |

### 4.2 Answers to the brief's XTDB checks

1. **Active queries and cancellation.** XTDB 2.2.0 has no active-query listing (no `pg_stat_activity` among the `pg_catalog` tables,
   `information_schema.clj:96-163`) `[S]`. Cancel is a PostgreSQL CancelRequest handled by `cmd-cancel`, which counts the request in
   `pgwire.cancelled_connections` whether or not a query was running, then calls the connection's `cancel-query!`, which cancels a
   `FutureTask` and answers SQLSTATE 57014 (`pgwire.clj:184,198-204,1139-1148`) `[S]`. The drain instant is the end of the
   `xtdb.query` span (X7) or the `Query cancelled` DEBUG line (X6). "The engine no longer listing the statement" (T-DRAIN-MS,
   ACCEPTANCE line 806) has no literal listing on XTDB; O-OBS should accept a continuous span or log record as the listing, and build
   `engineActiveSamples` from span intervals (CA-new-1 in section 11).
2. **Connection counts.** `pgwire.active_connections` counts the read-write server's connections. Both servers (`:read-write` and
   `:read-only`, `pgwire.clj:1931-1953`) register a gauge with the same name and no tag, and Micrometer returns the first registered
   meter for a duplicate id, so the read-only port's connections are not counted `[S]` for the code, `[E]` for Micrometer's duplicate
   behavior. With `readOnlyPort` in use, only H4 counts both.
3. **Committed-transaction counter.** `node.tx.latestCompletedTxId{db}` advances only when a transaction (committed or aborted) is
   appended as resolved; `FlushBlock` advances the source message id without it (`indexer/SourceLogProcessor.kt:136-151`) `[S]`. The
   tx id is the source-log message id `[R16]`, so it is not dense; "unchanged" is the test, not "count". `latestSubmittedMsgId` also
   moves on `flush-block` (every 15 min by default, `api/IndexerConfig.kt:16`) and on every compaction's `tries-added` publication
   (`compactor/Compactor.kt:150-152`) `[S]`: a NO-MUTATION check on it would fail without any write.
4. **Statement logging.** DEBUG `xtdb.pgwire` (X6) and query spans (X7). No per-session audit log exists, so C8's comment
   ("neither XTDB 2.2 nor QLever 0.6.0 exposes a per-session write log", `engine-write-counter.ts:7-9` on
   `exp/C8-read-only-frontier`) stays right for sessions; per-statement logs do exist.
5. **Metrics.** Micrometer Prometheus registry, all meters tagged `node-id` (`Metrics.kt:26-29`), on the healthz port `[S]`; the docs
   confirm `<node_url>:<healthz_port>/metrics` and `db=<name>` tags from 2.2 `[D]` `monitoring.md:42-49`. The image sets healthz to 8080
   in its standalone config (`docker/standalone/config.yaml`), and the lab config does too (`xtdb-config.yaml`). The same meters are
   readable as SQL through `xt.metrics_gauges`, `xt.metrics_counters` and `xt.metrics_timers` (X3), which costs a query on the SUT.
6. **Buffer pool and memory.** `memory-cache.pinnedBytes`, `.evictableBytes`, `.freeBytes` (`cache/MemoryCache.kt:270-277`),
   `xtdb.allocator.root.memory.allocated` and per-database child allocators (`Metrics.kt:56-103`), `memory-cache-misses` and
   `record-batch-requests` counters (`storage/LocalStorage.kt:45-46`) `[S]`. These are self-reports; the envelope check uses H1.
7. **Block and compaction events.** End events are durable and queryable: `xt.source_log_msgs` rows `tries-added` (one per compaction
   job's publication) and `flush-block`, and `xt.block_files.system_time` per block (X3). Start events exist only as DEBUG lines (X6)
   or as `end - duration` from `compactor.job.timer` when one job falls in a scrape interval `[E]`.
8. **Rows scanned for OBS-WORK.** Yes, two sources besides the broken decode: X7 on the measured run, and X8 replay with the
   `attributes` column read as JSON. R16's `[object Object]` came from `Object.values(r).join(" | ")` in `p4.mjs:29`, applied to a
   parsed JSON object `[P]`; the raw output shows `row_count` 1 and `page_count` 1 decoded correctly on the scan row
   (`R16-xtdb-northstar/p4-d1.out:31`). XTDB has no bytes-read counter; `scan_pages_used` times page size is the nearest `[E]`.

## 5. QLever 0.6.0 sources (question 3)

### 5.1 Catalog

| Id | Source | What it reports | Resolution and lag | SUT influence | Collection cost |
| --- | --- | --- | --- | --- | --- |
| Q1 | `GET /metrics` with `--enable-metrics` (off by default, `src/ServerMain.cpp:256-259`); needs a valid access token unless `--no-access-check` (`Server.cpp:694-703`) | `qlever.sparql_operation.started`, `.running`, `.finished` by `operation=query\|update`, `.duration` histogram, `.errors` by type, `qlever.http.errors`, `qlever.delta_triples`, `qlever.memory_query_available`, `qlever.memory_query_limit`, `qlever.memory_cache_used`, `qlever.memory_cache_limit`, `qlever.index.rebuild_in_progress`, `qlever.index.load_time`, `qlever.server.start_time`, `qlever.build_info` (`src/util/metrics/ServerMetrics.cpp:34-77`); `qlever.io_context.*` (`InstrumentedExecutor.cpp:18-28`) `[S]` | Cumulative counters, scrape-time gauges (`Metrics.cpp:49-54`) | Only through its requests. `started{update}` counts at dispatch (`Server.cpp:778`), `finished{update}` only on success (`:1415`), so an update that timed out but applied (R8 S5) shows in `started` only | One HTTP GET on the main port, handled in the HTTP coroutine `[E]`; 1 Hz. |
| Q2 | `cmd=stats`, `cmd=cache-stats`, `cmd=get-settings`, `cmd=get-index-id` (`Server.cpp:476-481,551-558`) | Index name, triple and subject counts of the loaded index, git hash (`:946-972`); cache entry counts and bytes (`:975-988`); runtime parameters; index id | Instant. `num-triples-normal` is the base index, not the delta `[S]` | No | Cheap. Log one INFO line each (`logCommand`, `:471-474`). |
| Q3 | Query event log `<index>.metrics-log.jsonl`, default on, off with `--no-metrics-log` (`ServerMain.cpp:119-122,383-388`) | One line per `start` (`ts-ms`, `event`, `qid`, `client-ip`, `query` text) and per `end` (`ts-ms`, `qid`, `status` ok, failed, cancelled, timeout) (`QueryId.h:157-192`), for queries and updates | Millisecond wall clock; the writer thread flushes each line (`QueryEventLog.cpp:36-41`) | qid can be chosen by the client through the `Query-Id` header (`Server.cpp:992-1004`); a duplicate is refused (`in_use`) | Append-only file on the index volume; `push` blocks when the queue is full, so a slow disk can stall query threads (`QueryEventLog.cpp:45-51`) `[S]`. Holds full operation text: a protected copy. |
| Q4 | `cmd=dump-active-queries` (access token or `--no-access-check`, `Server.cpp:559-566`) | Map qid to `{query, started-at}` from the registry (`QueryId.h:143-155`) | Instant snapshot | As Q3 | Cheap; poll at 250 ms during CANCEL windows. |
| Q5 | Collector-issued SPARQL `COUNT` and readback queries with `Query-Id: obs-...` | Engine answers | Snapshot of the request | No | One query slot (`-j 4`) per probe. |
| Q6 | Server stdout (`docker logs`) | `Processing command "<cmd>"` for every admin command (`Server.cpp:471-474`); `Processing the following <operation> from <ip>: <full text>` (`:347-352`); `Done processing update, total time was ... ms` (`:1396`); automatic rebuild lines (`RebuildIndexStrategy` log, R8) | Docker receive timestamps (HO) | Text only | Already produced; tailing is free. Holds plaintext (R17 6.2). |
| Q7 | `<index>.server.resource-usage-log.tsv`, default on, 2 s interval (`ServerMain.cpp:123-129,374-379`) | RSS and CPU of the server | 2 s | No | Lab disables it; H1 and H2 do better. |
| Q8 | Collector replay with `Accept: application/qlever-results+json` | `runtimeInformation.query_execution_tree`: per operator `result_rows`, `operation_time`, `cache_status`, `estimated_size`, children (`RuntimeInformation.cpp:201-217`, `ExportQueryExecutionTrees.cpp:995-998`) | Exact rows per operator of the replay | No | Re-executes; a cached replay reports `cache_status` cached and must be cleared (`cmd=clear-cache`) or rejected. |
| Q9 | `<index>.rebuild-index-log.txt` (`src/global/FileSuffixConstants.h:53-54`, `libqlever/Qlever.cpp:763`) | Timestamped `Rebuilding index from current data`, phase lines, `Index rebuild completed` (`src/index/IndexRebuilder.cpp:462-468,491-502,623`) and the `previous.*` keep or delete decisions (`Qlever.cpp:634-648`) | Second-resolution log timestamps `[E]` | No | Moved into place with the new index at swap (`Qlever.cpp:722`). |
| Q10 | Index directory files: `.vocabulary.*`, `.index.*`, `.update-triples`, `.allocated-graphs-state`, `.meta-data.json`, `.settings.json`, `previous.*/` (`FileSuffixConstants.h:18-54`) | Durable bytes | Instant | No | H3, H6. |

### 5.2 Answers to the brief's QLever checks

1. **Admin commands.** Read-only: `stats`, `cache-stats`, `get-settings`, `get-index-id`, `dump-active-queries`, `/ping`, `/metrics`.
   Mutating: `clear-cache`, `clear-cache-complete`, `clear-named-cache`, `clear-delta-triples`, `vacuum-delta-triples`, `rebuild-index`,
   `write-materialized-view`, `load-materialized-view`, `delete-materialized-view`, and `index-description`, `text-description` and any
   runtime-parameter key (`Server.cpp:476-735`) `[S]`. With `--no-access-check` (the lab's flag, `qlever-start.sh`) anyone who reaches the
   port, the SUT included, can call every one of them (`ServerMain.cpp:80-83`).
2. **Update counter.** Yes when Q1 is enabled: `started{operation="update"}` for NO-MUTATION, `finished{operation="update"}` for
   successes. Mutating `cmd=` calls bypass both counters, so NO-MUTATION also needs Q6's `Processing command` lines or T2's classifier
   (C8 already counts unknown commands as writes, `engine-write-counter.ts:454-462` on `exp/C8-read-only-frontier`).
3. **Active queries and cancel.** Q4 lists them; Q3 records the end status. Cancel is a WebSocket `cancel` text frame on `/watch/<qid>`
   (`src/util/http/websocket/WebSocketSession.cpp:57-59`) or the timeout timer (`Server.cpp:250-268`). A client disconnect does not
   cancel an update `[P R8]` 1.5.
4. **Rebuild log lines.** Q9 per rebuild (start, phases, completion), Q6 `Processing command "rebuild-index"`, Q1
   `rebuild_in_progress` and `index.load_time` (recorded at swap, `Server.cpp:1716-1722`) `[S]`.
5. **Bytes or rows counters.** Correction to R24: rows yes (Q8 per operator, and the update reply's delta counts), bytes no. The only
   bytes sources are host-side: H1 `io.stat` and H2 page-fault counts (R17's method).

## 6. Datomic Pro 1.0.7745 sources (lane D, R29)

R29 puts one transactor and one Triplex gateway peer (Clojure, our code) in one container, dev storage on the volume
(`lab/research/R29-datomic-lane-design.md` 2.1). The peer library, which plans and runs Datalog, lives inside the gateway JVM. That is
the core difference from XTDB and QLever: **read-side engine evidence is produced inside code under test.**

| Id | Source | What it reports | Resolution and lag | SUT influence | Collection cost |
| --- | --- | --- | --- | --- | --- |
| D1 | Transactor `metrics-callback=<ns>/<fn>` in the transactor properties (or `-Ddatomic.metricsCallback` on a peer) `[D]` https://docs.datomic.com/operation/monitoring.html | `TransactionBytes` (sum = bytes to the log, samples = number of transactions), `TransactionDatoms`, `TransactionBatch`, `TransactionMsec`, `LogWriteMsec`, `MemoryIndexMB`, `IndexWrites`, `CreateEntireIndexMsec` (both at the end of an indexing job), `IndexDatoms`, `StoragePutBytes`, `StorageGetBytes`, `RemotePeers`, `HeartbeatMsec`, `AvailableMB`, `ObjectCache`, `Alarm*` incl. `AlarmIndexingJobFailed`, `AlarmBackPressure` `[D]`. Format is a keyword map, "alpha" `[D]` | Aggregated per report; `MetricReport` is described per 1-minute period `[D]`, so per-operation resolution is not available | The callback is lab code on the transactor's classpath; the SUT gateway cannot reach it | Callback writes JSON lines to the observer volume; negligible `[E]` |
| D2 | Transactor log in `log-dir` (default `log/`), sample `bin/logback.xml` `[D]` https://docs.datomic.com/operation/configuring-logging.html | Every transaction logs an io-stats map in Pro under `:tx/process :event` `[D]` https://docs.datomic.com/reference/io-stats.html; indexing-job lines with the `datomic.index` logger at DEBUG, commented out by default `[W]` clojurians-log 2020-02-02 | Logback timestamps; exact event names unverified | No | Tail on the volume |
| D3 | An **observer peer**: a separate small JVM (collector code, not gateway code) connected to the same transactor | `@(d/sync conn)` then `d/basis-t` (most recent t reachable), `d/log` with `tx-range` (every committed transaction, its datoms and `:db/txInstant`), counts by query, `d/db-stats` `[D]` https://docs.datomic.com/clojure/index.html | Exact at the synced basis | No (it reads storage and the transactor directly) | A JVM: about 300 to 500 MiB with a small object cache `[E]`, which the pool barely has (R29 "Pool change needed"). Run only in protocol windows. |
| D4 | Observer-peer replay with `:query-stats` and `:io-context` | Per clause `:rows-in`, `:rows-out`, `:binds-in`, `:binds-out`, `:expansion` `[D]` https://docs.datomic.com/reference/query-stats.html; segment reads per tier (`:ocache`, `:valcache`, `:memcached`, storage key) and per index sort with `-load` counts `[D]` io-stats page. Counts, not bytes | Exact for the replay; query-stats is alpha and adds overhead `[D]` | No | Re-executes on the observer peer |
| D5 | Excision (`:db/excise`) with `d/sync-excise`, then `d/gc-storage` | Removes matching datoms from the index and the transaction log at the first indexing job after the excision; storage reclaimed after `gc-storage`; backups untouched; a permanent excision record remains `[D]` https://docs.datomic.com/reference/excision.html | Asynchronous (next indexing job) | Via commands | Native erasure path, the only one among the three engines that also cleans the log |
| D6 | Dev storage files: embedded H2 under the transactor's data directory, `data/db/datomic.mv.db` in a user report `[W]` clojurians-log 2025-10-21 | Durable segments | Instant | No | H6 scan; segment encoding is not documented, so a plain scan has unknown sensitivity |

What Datomic does not have `[D]`: no function lists active queries or connected clients (the Clojure API page lists none); `:timeout`
on `d/query` is "the number of milliseconds after which a query may be stopped", which is approximate; no external cancel. If the
gateway runs queries on its own executor and cancels by interrupting, only the gateway knows, and the gateway is the SUT.

## 7. Host-side and transport sources (question 4)

| Id | Source | What it reports | Resolution and lag | SUT influence and trust | Collection cost |
| --- | --- | --- | --- | --- | --- |
| H1 | cgroup v2 files of the engine container, `/sys/fs/cgroup/docker/<id>/` (layout `[P R22]` 2.1) | `memory.current`, `memory.peak` (high-water mark since cgroup creation; kernel 6.8 has no reset, reset-by-write arrived later `[E]`), `memory.stat` (anon, file, kernel, sock), `memory.events` (max, oom), `io.stat` (rbytes, wbytes, rios, wios per device), `cpu.stat` (usage_usec, throttled) | Exact at read; counters cumulative | Highest: kernel accounting; the container sees cgroupfs read-only. Page cache counts in `memory.current`; report anon and file separately | Microseconds per read; 10 Hz is fine. Peak per phase needs a fresh container per phase or 10 Hz sampling of `memory.current` (a lower bound between samples). |
| H2 | `/proc/<pid>/status` (`VmRSS`, `VmHWM`), `/proc/<pid>/stat` (utime, stime, minflt, majflt, starttime), `/proc/<pid>/io` (read_bytes, write_bytes), `/proc/<pid>/task/<tid>/{comm,stat}` | Per process (owner split for Datomic's two JVMs), per thread names and CPU | Exact at read; `VmHWM` resettable through `/proc/<pid>/clear_refs` with `5` | High; `/proc/<pid>/io` needs CAP_SYS_PTRACE or the same uid | Cheap; needs `--pid container:<engine>` |
| H3 | Disk: `statfs` of a per-slot volume, or `du -sb` of the volume directory, plus per-file sizes and mtimes | Bytes used | `du` walks the tree (XTDB `buffers/` has many files), so 5 s cadence; transient files (QLever rebuild temp, XTDB compaction output) can fall between samples | High | Smallest exact instrument: a per-slot loop-mounted filesystem, so `statfs` gives used blocks in O(1) at any cadence `[E]` |
| H4 | `/proc/net/tcp` and `/proc/net/tcp6` read inside the engine's netns | ESTABLISHED sockets per local port with remote address and port | Exact at read | High; joined to T1 or T2 for pool labels | Cheap at 10 Hz |
| H5 | Thread names and per-thread CPU of a JVM from H2 | Which worker threads run, and whether CPU stops after cancel | 10 Hz | The name is chosen by the process (the SUT for the Datomic gateway); the CPU is not | Cheap; Java virtual threads (XTDB pgwire, `pgwire.clj:1827-1831`) are invisible here |
| H6 | File scans and durable readback of volumes, golden clones and observer stores, with Python `sqlite3` (read-only URI) for the broker's SQLite file | Plaintext and derived-channel hits; committed rows | Point in time | High when the scanner is shown sensitive (8.4) | One pass per location; I/O heavy, schedule with `lab/bin/heavy.mjs` |
| H7 | macOS `select.kqueue` (Python stdlib) `NOTE_WRITE`/`NOTE_EXTEND` on the broker's WAL and log files | Time of each write to the log of record, host-observed | Sub-millisecond on the Mac clock, mapped by the clock bridge | High; the broker cannot write without triggering it | Cheap |
| H8 | Engine process start time (`/proc/<pid>/stat` field 22) and container start events | Restart events | Exact | High; with restart policy `no` (`compose.*.yaml`), any new start of the engine is a manual restart | Cheap |
| H9 | `docker stats` | Memory = usage minus inactive file pages, CPU percent, 1 s stream | 1 s, derived | Same source as H1, transformed; `[P R22]` warns against treating its CPU percent as a measure | Loads dockerd; use H1 instead |
| T1 | pgwire proxy in the observer (C8's frontend parser and classifier, moved out of the client process) | Every statement, its kind, upstream connection, timings, replies (row counts, CommandComplete, ErrorResponse, SQLSTATE) | Exact on the VM clock | High once out of process; stores bind values as keyed hashes, not plaintext | Adds one localhost hop; A/A-check the latency cost |
| T2 | HTTP and WebSocket proxy for QLever (C8's `classifyQleverRequest`) | Queries, updates, `cmd=` calls, the `Query-Id` header, reply status and update reply JSON | Exact | High | As T1 |
| T3 | HTTP proxy between the harness and the Datomic gateway | Requests and replies of the gateway (the gateway is SUT, so this observes the SUT boundary, not the engine) | Exact | Medium: shows what the SUT said, not what the engine did | As T1 |

**Trust ranking for OBS-RESOURCE.** H1 and H2 first (kernel accounting, no SUT path), H3 next (exact if per-slot filesystem, a lower
bound if `du` sampled), engine self-reports (X1, Q1, Q7, D1) only as corroboration, `docker stats` last. Mac-side owners (the host
broker, the kernel workers) have no cgroup; `ps -o rss=,time= -p <pid>` sampled from the observer's Mac half is HO but coarse `[E]`.

## 8. OBS-ERASURE-SCAN locations (question 5)

### 8.1 XTDB 2.2.0

| Location | Holds plaintext? | Scan method | Notes |
| --- | --- | --- | --- |
| `log/LOG`, `log/REPLICA_LOG` | Yes, after ERASE `[P R16]` (marker string, 2 hits each) | Byte scan; positive control | Local log is never truncated `[R16]`. PASS only by crypto-shredding (RULINGS Q58e). |
| `buffers/` (Arrow block and trie files, L0 to Ln) | Until compaction rewrites and GC deletes the files after `garbageLifetime` (24 h default) `[R16]` | Byte scan (no compression codec in core `[S]`); positive control | Derived channels need encoding-aware search: little-endian integer and decimal encodings, not only UTF-8. |
| Memory cache, JVM heap | Yes while resident | Not scannable from outside; restart clears | Out of scope for a file scan; state it in the inventory. |
| `xt.source_log_msgs.tx_ops` | Renders logged payloads as text (`log_tables.clj:31-34`) | EI-query with the canary | A query channel onto the log. |
| Observer stores: X6 DEBUG log (docker json log under `/var/lib/docker/containers/<id>/`), X7 span file | Yes when SQL text carries literals; Triplex binds values as parameters, but `xtdb.transaction.sql` spans carry the text only `[S]` | Byte scan | Must join the inventory. |
| Golden and clone volumes (R26) | Yes | Byte scan | They are backups in the inventory's sense. |

### 8.2 QLever 0.6.0

| Location | Holds plaintext? | Scan method | Notes |
| --- | --- | --- | --- |
| `.vocabulary.*` | Yes; every rebuild copies all old words (`IndexRebuilder.cpp:73-121`, `vocab.scanAll()` at `:108`), so a deleted literal survives rebuilds `[S]` `[P R17]` | **Decoder needed:** default vocabulary type is on-disk compressed (`IndexImpl.cpp:1507-1509`), FSST (`index/vocabulary/CompressionWrappers.h:88-99`); long literals may be externalized (`IndexRebuilder.cpp:93-95`) | A plain grep reported nothing in R17 because it cannot see inside `[P R17]`. Smallest instrument: a stdlib FSST decoder in the scanner (FSST symbol tables are small), or a positive control showing the scan fails, which turns the cell to "crypto-shredding required". |
| `.update-triples` | Yes, local vocabulary written with the delta (`DeltaTriples.cpp:648-670`) `[P R17]` | Byte scan | Rewritten after every update. |
| `.index.*` permutations | Ids, not strings `[E]` | Not a plaintext location; a derived channel if ids map to a surviving word | |
| `previous.*/` directories | Yes, full old index and old delta `[P R17]` | Byte scan | Default retention keeps the original and the most recent `[P R8]`. |
| `.metrics-log.jsonl`, server stdout, `.rebuild-index-log.txt` | Metrics and server logs hold full operation text (`Server.cpp:347`) `[P R17]` | Byte scan | Q3 and Q6 observers create these copies. |
| Observer proxy capture (T2) | Only if stored raw | Store hashed literal payloads | |

### 8.3 Datomic Pro 1.0.7745

| Location | Holds plaintext? | Scan method | Notes |
| --- | --- | --- | --- |
| Dev storage H2 file (D6) | Unknown encoding of segments `[E]` | Byte scan with positive control; if the control fails, no physical verdict is possible | Excision (D5) removes datoms from index and log at the next indexing job; storage reclaimed only after `gc-storage` `[D]`; H2 may keep freed pages until the file is compacted `[E]`. |
| Transactor `log/` | Unknown whether transaction data is logged `[D]` (the logging page does not say) | Byte scan | |
| Valcache directory, memcached | If configured | Byte scan | R29 does not configure them. |
| Backups (`backup-db`), golden volumes | Yes; excision does not touch backups `[D]` | Byte scan | |
| Gateway logs and caches | SUT | Byte scan | |

### 8.4 Method rules for every scan

1. **Positive control per location.** Before erasure, write a canary through the same path as the protected value; the scanner must
   find it in every location the inventory lists. A location where the control is not found yields REFUSED (scanner blind), never
   PASS. This closes the compressed-vocabulary false PASS.
2. **Scan from outside the engine.** Read-only mount in the observer; hash the file list and sizes into the chunk.
3. **Inventory gaps.** `PROTECTED_COPY_INVENTORY` (ACCEPTANCE 8.8) lists data copies but not engine logs, observer stores, old index
   generations (`previous.*`, XTDB garbage tries), or freed filesystem blocks. Proposed addition: "engine and observer logs, retained
   old generations, and freed blocks on the slot's filesystem (scan the block device or use a per-slot filesystem that is discarded)".

## 9. Gaps and the smallest instrument for each

| Gap | Cell | Why no trustworthy source | Smallest instrument | Kind it reaches |
| --- | --- | --- | --- | --- |
| G1 | Datomic OBS-CANCEL drain | No engine listing or cancel API; queries run in the gateway | Gateway names the worker thread `q<requestId-suffix>` for the query's duration (Linux `comm`, 15 bytes); the observer samples `/proc/<gateway>/task/*/comm` and per-thread CPU at 10 Hz (H5). A name can lie, but CPU going to zero within T-DRAIN-MS cannot. Better and larger: a separate query-peer process that only the observer can see into (JFR stream) | HO |
| G2 | Datomic OBS-PREABORT for reads | Reads leave no trace outside the gateway | T3 proves the gateway never received the request; for "the engine never ran it", G1's thread series over the coverage window | TO plus HO |
| G3 | Log-source OBS-ACK-ORDER (`tSourcePublished`) | The broker (SUT) is the source of truth and stamps `committed_at` itself | H7 kqueue on the WAL plus H6 readback mapping the write to the frame; or run the broker in the VM under the observer, where `fanotify`-style watching is available `[E]` | HO plus DR |
| G4 | Datomic OBS-ERASURE-SCAN physical proof | Segment encoding undocumented | Positive-control scan first; if blind, crypto-shredding with key-destruction evidence is the only PASS path | HO |
| G5 | QLever planner memory (T-PLANNER-MEM-BYTES) | Planner memory is outside `-m` and has no metric (R2) | H2 per-thread RSS is not available; sample `VmRSS` at 10 Hz with a planning-only request (`send=0`, if the planner runs before the first row `[E]`) | HO |
| G6 | QLever and XTDB bytes read per operation | No engine bytes counter | H1 `io.stat` rbytes and H2 `majflt` per window, with page cache dropped between arms only in diagnostic runs | HO |
| G7 | XTDB compaction job start instants | Only DEBUG lines | X6 at DEBUG on `xtdb.compactor` in maintenance runs | EI |
| G8 | All engines: OBS-WATERMARK `waitMs` and route timings | Measured inside Triplex | Bound by T1, T2 or T3 times: the first engine request after `tReadStart` bounds the wait from above | TO |
| G9 | OBS-NO-MUTATION on QLever when `--enable-metrics` is not set | Lab start script lacks the flag | Add `--enable-metrics` to `qlever-start.sh` (it already has `--no-access-check`) and re-enable the metrics log in protocol runs | EI |

## 10. Probes to run before relying on this (one bring-up, about an hour, on an exclusive slot)

| # | Probe | Prediction | If wrong |
| --- | --- | --- | --- |
| P1 | QLever 0.6.0 image with `--enable-metrics`: `curl /metrics` | Prometheus text with `qlever_sparql_operation_started_total{operation="update"}` (OTel to Prometheus naming) | Build lacks OTel: Q1 unavailable; NO-MUTATION falls back to T2 plus Q3 `start` events with update text |
| P2 | XTDB: scrape `:8080/metrics` from a sidecar in the container netns; one write, one read | `node_tx_latestCompletedTxId{db="xtdb"}` moves only on the write; `latestSubmittedMsgId` also moves after `POST /system/finish-block` | Re-read `Database.kt:376-388` |
| P3 | XTDB with `readOnlyPort` and two connections on each port | `pgwire_active_connections` shows 2, H4 shows 4 | If 4, Micrometer kept both; drop the caveat in 4.2 |
| P4 | XTDB tracer to a local OTLP receiver; one query, one cancel | `xtdb.query` span with `query.text`, scan child with `scan_rows_read`; cancelled query's span ends within ms of the CancelRequest | No spans: X7 unusable; CANCEL rests on X6 |
| P5 | XTDB EXPLAIN ANALYZE with a JSON decode | `attributes.scan_rows_read` equals the scanned rows | |
| P6 | QLever: cancel a long query over `/watch/<qid>` with `Query-Id` set | `end` line with `status: cancelled`; Q4 no longer lists the qid | |
| P7 | Scanner positive controls: canary in XTDB `buffers/`, QLever `.vocabulary.*`, Datomic H2 file | XTDB found; QLever not found by grep, found by the FSST decoder; Datomic unknown | Mark the location blind |
| P8 | Clock bridge under NS load | round trip p99 under 2 ms over the forwarded port | Move the harness clock reference into the VM |
| P9 | A/A cost of each observer (X6 DEBUG, X7 spans, Q3 log, T1 hop, H1 10 Hz) on writer commit p99 | Each under 5 percent | Observer is protocol-run only |

## 11. What this means for O-OBS (EXP-O05) and the contract

1. **Replace `KINDS` in `observe.py`** with the three-part kinds of 1.2 and the allowlist of section 3; refuse `CR/*`.
2. **CA01 answered:** `obs-bundle/1` (section 2). O-OBS gains a `--bundle <dir>` mode that checks HMACs, chains, `seq` density,
   reruns the pinned normalizers and only then evaluates. Key handling stays outside O-OBS (the evaluator passes the key file).
3. **CA-new-1 (OBS-CANCEL on XTDB and QLever):** accept a continuous engine event log (X7 spans, Q3 events) as the "engine listing";
   derive `engineActiveSamples` from it at 1000 ms or finer, with `coverage.kind: continuous-log`.
4. **CA-new-2 (OBS-NO-MUTATION):** name the counter per engine in the contract: XTDB `node.tx.latestCompletedTxId` (all `db` tags),
   QLever `qlever.sparql_operation.started{operation=update}` plus mutating admin commands, Datomic observer `basis-t`. Forbid XTDB
   `latestSubmittedMsgId` and source-log offsets.
5. **CA-new-3 (OBS-ERASURE-SCAN):** require a positive control per location (8.4) and add logs, observer stores, old generations and
   freed blocks to `PROTECTED_COPY_INVENTORY`.
6. **CA-new-4 (time):** every engine-clock time carries its mapping and `±u`; inequalities pass with margin `u` (2.6).
7. **C8 counter.** It becomes T1 and T2 by running in the observer, not the client process; its classifier is reused unchanged.

## 12. Corrections to earlier lab findings

| Report | Said | Correction | Evidence |
| --- | --- | --- | --- |
| R24 item 9, line 426 | QLever "exposes no bytes counter, only CPU and page faults" | True for bytes; QLever exposes operation counters, delta size and rebuild state (Q1) and per-operator rows (Q8) | `ServerMetrics.cpp:34-77`, `RuntimeInformation.cpp:201-217` `[S]` |
| R16 line 226, R24 line 363 | EXPLAIN ANALYZE output "did not decode usefully" | The engine output is fine; the probe's `Object.values(...).join` stringified a JSON object | `R16-xtdb-northstar/p4.mjs:29`, `query.clj:232-246` |
| C8 header comment | Neither engine exposes a per-session write log | No per-session log, but per-statement logs exist (XTDB X6, X7; QLever Q3, Q6) | section 4.2 item 4 |
| `qlever-start.sh` comment | metrics and resource logs disabled as "unbounded" | Right for long runs; protocol runs need Q3 on, on a separate volume path if possible | `ServerMain.cpp:119-129` |

## 13. Open questions

1. **For Sam (scope).** Lane D's gateway embeds the query engine, so read-side P1 evidence on Datomic (CANCEL, PREABORT) can only be
   host-observed. Accept HO for those cells on lane D, or require a split where the query peer is a separate process the gateway calls?
2. **For the orchestrator.** Is the per-run HMAC key plus witness log enough, given every agent runs as one macOS user, or should
   acceptance runs require the verifier's spot-rerun of collection (5.8) for every safety protocol?
3. Datomic: exact transactor log event names, whether transaction data appears in logs, and whether dev-storage segments are
   compressed. DA00 can answer all three with one canary transaction and `grep`.
4. XTDB: does Micrometer drop the read-only server's `pgwire.active_connections` (P3)?
5. QLever: is the pinned image built with OpenTelemetry (P1)? The flag is in source; the build option is not visible from source alone.
6. Should XTDB protocol runs use the Kafka log (retention deletes) to make ERASE plus retention a second erasure path, or is
   crypto-shredding the only path the lab tests (RULINGS Q58e says shredding for the broker log)?

## 14. Sources

- Pinned source: `references/xtdb` v2.2.0 (`c6c1962`), `references/qlever` v0.6.0 (`6c5861a`), paths as cited.
- Lab: `lab/acceptance/ACCEPTANCE.md` 6.3, 5.1, 5.2, 8.8 and threshold lines 795 to 809; `git show 6852fc1:lab/acceptance/oracle/observe.py`
  and `README.md`; `exp/C8-read-only-frontier:packages/qualification/src/engine-write-counter.ts`; `lab/research/R8, R16, R17, R22, R24,
  R26, R29`; `/Users/sam/Claude/Projects/triplex-db-2/R16-xtdb-northstar/p4.mjs`, `p4-d1.out`; `qlever-start.sh`, `xtdb-config.yaml`,
  `compose.xtdb.yaml`, `lab/bin/engine.mjs`, `lab/config/slots.json`.
- XTDB docs: `references/xtdb/docs/src/content/docs/ops/config/monitoring.md`.
- Datomic docs `[D]`: https://docs.datomic.com/operation/monitoring.html, https://docs.datomic.com/reference/io-stats.html,
  https://docs.datomic.com/reference/query-stats.html, https://docs.datomic.com/reference/excision.html,
  https://docs.datomic.com/operation/configuring-logging.html, https://docs.datomic.com/clojure/index.html,
  https://docs.datomic.com/javadoc/datomic/QueryRequest.html (timeout is approximate).
- Web `[W]`: https://clojurians-log.clojureverse.org/datomic/2020-02-02 (logback `datomic.index` logger),
  https://clojurians-log.clojureverse.org/datomic/2025-10-21 (dev storage `datomic.mv.db`),
  https://forum.datomic.com/t/imposing-peer-query-resource-limits/1855.
