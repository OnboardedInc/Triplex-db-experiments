Q1 1/16 cases; measured worst p50/p99 21.89/90.80 ms (P2 missed in measured cases), 256/0 ratio unmeasured; Q2 0/12 cases; full bars unmeasured; Q3 0/8 cases; lag bar unmeasured; Q4 exact-basis mechanism met in the tested sequence; cost unmeasured; Q5 Kafka 0.101 cores / 421.9 MiB in measured cases; no separate cost bar.

# XN-S2: Kafka and shared S3, native two-node spike

North star: P1 concurrent exact-basis pulls without writer interference, P2 small atomic commits and read-your-own-write, P3 visibility lag, P4 current pulls. Authority: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. All results are engine-only diagnostics, with no acceptance, PASS, durability qualification or lane promotion.

## Topology proved

The AWS image works with Kafka and MinIO. In `live/topology-2`, the writer committed a unique probe whose full value was observed on the read node using an await token and a snapshot/clock pair. The read container was stopped and its Docker state was observed as exited; its endpoint was unavailable. The writer then updated that same probe and acknowledged it. After restarting, the read node returned `while-reader-stopped` at the new basis and `before` at the original exact snapshot and clock. These are real shared-log nodes with separate caches, not two connections to one node or shared local-log files.

The writer was log leader (`xtdb_log_leader=1`) and performed compaction: five compactor jobs, 7.868 cumulative seconds of compactor job time in the captured metrics. The read-only node had `xtdb_log_leader=0`, applied `ResolvedTx` replica messages to its own live index, and exposed no compactor jobs. `readOnlyDatabases: true` keeps the follower from becoming the source-log writer/compactor. S3 listed 12 object keys after a forced block finish, including `v06/blocks/b00.binpb`. This is the supported Kafka/remote-object-store shape; it does not use the unsupported shared `!Local` storage workaround.

Topology proof sources and observations are bound to commit `24e81c40df1709daae49e767bafb8a8a3a7daf82`, copied source hashes, exact container IDs, image IDs, CPU and memory settings. The hold lasted 146.282 seconds. This proves the tested sequence, not crash durability or production failover.

## Measurement conditions

All traffic runs inside the VM on the internal `tx2-xns2-net` network, without published ports. Kafka and MinIO each have CPU 0 and a 1 GiB hard memory/swap cap. The write node has CPUs 0,1; the read node CPUs 2,3; each has a 3.5 GiB hard memory/swap cap, 2 GiB heap and 1 GiB direct-memory limit. The Node load generator uses CPUs 4–7 and a 2 GiB cap. The full engine budget is four allocated cores, including the services sharing CPU 0.

The corrected keeper was copied from `lane/d-native:lab/experiments/EXP-DX1/vm-wake/keep-awake.sh`. Every enabled arm requires `running 8` and `"onePerCpu": true`; disabled arms require `running 0`. Only a helper that this task actually started is stopped. **Earlier sections below used the defective helper: their `keepAwake: true` flags do not prove a running keeper.** They remain historical evidence and are not matched controls.

The fixture contains 100,000 synthetic 1,500-byte documents and 2,000 synthetic 135,000-byte documents, plus 20,000 durable guarded updates and each case's new scopes. Payloads are highly compressible. This is a diagnostic small fixture, not year-one scale. Read checks compare the complete returned document bytes. Every read connection warms 100 checked pulls. Q1 has four reader worker threads; all requested clients execute closed-loop pulls on the read node. Q2 has a fixed 55-commit/s open-loop writer throughout the pull interval. A 95-document IN query counts as one pull.

The commit is S1's lean combined-ASSERT command: BEGIN, atomic idempotency/head guard, three payload documents (3,000/200/4,000 bytes), head update, command claim, COMMIT SYNC; one socket flush. Open-loop timing includes scheduled-arrival queueing and uses 16 writer sockets with 200 subject chains. Duplicate/stale guards are separately checked for P0004 and no partial writes. Open-loop cases have fresh per-case subject heads in an aged table; closed-loop aged controls reuse the subject with 20,000 updates.

**Before any new timing existed**, all new open-loop windows were frozen at 45 seconds, using the same prefix of S1's seeded Poisson trace (914511). Historical S1 windows were 60 seconds. The shorter trace was initially chosen to fit the Q1 matrix into one bounded hold after long contention for the lock; it applies equally to contemporaneous controls and two-node cases. Before any Q1 timing, the unchanged matrix was split into one hold per keeper arm to leave startup/warmup/cleanup margin. The queued unsplit attempt was cancelled before admission. Each arm restarts the nodes and executes a fresh follower barrier. Raw offered/acknowledged counts and samples are retained, with no failing case silently dropped.

Every case carries copied source preimages and hashes, exact inspected containers/images/cgroups and arm state. The collector recomputes quantiles and rejects mismatched source, freshness, container identity, CPU/caps, content/counts and incomplete workloads. These checks support diagnostic tables, not acceptance.

## Configuration that worked

Configuration keys came from the bundled AWS jar's serializer fields/class registrations, local R19 material and actual startup. No web documentation was consulted. `KafkaCluster.ClusterFactory` supplies the Kafka remote; its `LogFactory` supplies the shared source/replica log. S3 remote credentials are separate from the S3 object-store factory, which accepts endpoint and path-style access.

Writer YAML (`live/two-write.yaml`):

```yaml
# [XN-S2-LIVE] Why: serializer keys read from the shipped AWS jar; retain a real shared log and shared object store.
server:
  host: 0.0.0.0
  port: 5432
  numThreads: 300
remotes:
  kafkaCluster: !Kafka
    bootstrapServers: tx2-xns2-kafka:9092
    propertiesMap:
      max.request.size: "8388608"
      max.partition.fetch.bytes: "8388608"
      linger.ms: "0"
  minio: !S3
    accessKey: [access-key-removed]
    secretKey: [secret-key-removed]
log: !Kafka
  cluster: kafkaCluster
  topic: tx2-xns2-source
  autoCreateTopic: true
storage: !Remote
  objectStore: !S3
    remote: minio
    region: us-east-1
    bucket: tx2-xns2-data
    endpoint: http://tx2-xns2-s3:9000
    pathStyleAccessEnabled: true
diskCache:
  path: /var/lib/xtdb/cache
  maxSizeBytes: 268435456
memoryCache:
  maxSizeBytes: 536870912
healthz:
  host: 0.0.0.0
  port: 8080
```

Reader YAML (`live/two-read.yaml`):

```yaml
# [XN-S2-LIVE] Why: serializer keys read from the shipped AWS jar; retain a real shared log and shared object store.
server:
  host: 0.0.0.0
  port: 5432
  numThreads: 300
remotes:
  kafkaCluster: !Kafka
    bootstrapServers: tx2-xns2-kafka:9092
    propertiesMap:
      max.request.size: "8388608"
      max.partition.fetch.bytes: "8388608"
      linger.ms: "0"
  minio: !S3
    accessKey: [access-key-removed]
    secretKey: [secret-key-removed]
log: !Kafka
  cluster: kafkaCluster
  topic: tx2-xns2-source
  autoCreateTopic: true
storage: !Remote
  objectStore: !S3
    remote: minio
    region: us-east-1
    bucket: tx2-xns2-data
    endpoint: http://tx2-xns2-s3:9000
    pathStyleAccessEnabled: true
diskCache:
  path: /var/lib/xtdb/cache
  maxSizeBytes: 268435456
memoryCache:
  maxSizeBytes: 536870912
healthz:
  host: 0.0.0.0
  port: 8080

readOnlyDatabases: true
```

Same-day single-node control (`live/local.yaml`):

```yaml
server:
  host: 0.0.0.0
  port: 5432
  numThreads: 300
log: !Local
  path: /var/lib/xtdb/log
storage: !Local
  path: /var/lib/xtdb/buffers
memoryCache:
  maxSizeBytes: 536870912
healthz:
  host: 0.0.0.0
  port: 8080
```

Kafka environment is the exact `vals` dictionary in `live/window.py`; a single KRaft broker/controller uses node ID 1, listeners PLAINTEXT:9092 and CONTROLLER:9093, advertised hostname `tx2-xns2-kafka`, quorum `1@tx2-xns2-kafka:9093`, replication factors/minimum ISR 1, log directory `/var/lib/kafka/data`, heap `-Xms256m -Xmx512m`, message/fetch limit 8,388,608 and cluster ID `MkU3OEVBNTcwNTJENDM2Qk`. Full environment and mounts are preserved in each window's container inspection and command list.

Exact Kafka environment:

```text
KAFKA_NODE_ID=1
KAFKA_PROCESS_ROLES=broker,controller
KAFKA_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093
KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://tx2-xns2-kafka:9092
KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER
KAFKA_CONTROLLER_QUORUM_VOTERS=1@tx2-xns2-kafka:9093
KAFKA_INTER_BROKER_LISTENER_NAME=PLAINTEXT
KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1
KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1
KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1
KAFKA_LOG_DIRS=/var/lib/kafka/data
KAFKA_HEAP_OPTS=-Xms256m -Xmx512m
CLUSTER_ID=MkU3OEVBNTcwNTJENDM2Qk
KAFKA_MESSAGE_MAX_BYTES=8388608
KAFKA_REPLICA_FETCH_MAX_BYTES=8388608
```

MinIO starts as user 0 with `server /data --address :9000 --console-address :9001`, on a task-owned named volume. Throwaway local credentials are `[access-key-removed]` / `[secret-key-removed]`; bucket `tx2-xns2-data`. A local Node built-in SigV4 client creates the bucket via S3 PUT (HTTP 200); no external client package was needed. SeaweedFS was not needed.

## Downloads

None in this continuation: all engine and driver images were already local and run with `--pull never`. Image IDs, repo digests and sizes are in `live/images.json`. The AWS image is pinned to `sha256:d7989bfa11f94a92859a7e10655730ba22d565d4a9e8979dad899b8d27c0c29a`; Kafka to `sha256:0bc1bb2478f45b6cea78864df86acdc11e8df2c5172477819a4d12942cbe5d40`; MinIO to `sha256:fb893e36fc369d41e92f678b17ec27378fa5bf0576aeef7ac15460c13629ab5a`. The jar was copied from that local image into durable evidence, not downloaded.

## Harness failures retained

`control-commits-2` completed all 20,000 preparatory commits (221,114 ms), observed head 20,000, 20,001 claims and 60,000 payload documents, then rejected its history postflight because the 45-second timing change accidentally made the expected row count 45,000. No timing case ran. The source was corrected to a fixed 60,000, and the next attempt independently checks the retained fixture's live counts and last full payload bytes before using it. This failure is not hidden or labelled an engine failure. Empty pre-admission cancelled directories contain no benchmark observations.

The 95-document single-client control timed out after 180 seconds (warmup included in that bound), retaining progress through 2,000 of 5,000 planned timed pulls. It supplies no adopted quantile or goodput. The 4/16-client bulk controls were not run; they are outside the original Q2 small/pre-joined point-read question. The remaining c/d/e point/pinned controls ran in a new 63.092-second hold without repeating the completed a cases. All 22 completed control cases passed fresh collection checks. The quoted S1 current-read peaks were explicitly flushed and settled before history setup; the supplemental pinned comparator ran after history; these new controls run after the history/commit workload and JVM restarts. They are not a matched estimate of the image change alone.

<!-- CURRENT-TABLES -->

## Same-day single-node controls

All timing pairs below are p50 / p99 milliseconds. These controls use the AWS image and a Local log/storage, not the earlier standalone image.

| Keeper | Offered/s | Same-node readers | AWS Local p50 / p99 | Historical S1 p50 / p99 |
| --- | ---: | ---: | ---: | ---: |
| off | 15 | 0 | 20.44 / 47.82 | 16.47 / 90.25 (no keeper) |
| off | 55 | 0 | 12.00 / 41.93 | 7.88 / 38.95 (no keeper) |
| off | 55 | 16 | 13.03 / 51.73 | 16.08 / 90.70 (no keeper) |
| on | 15 | 0 | 10.88 / 460.23 | 16.47 / 90.25 (no keeper) |
| on | 55 | 0 | 14.38 / 1,025.80 | 7.88 / 38.95 (no keeper) |
| on | 55 | 16 | 127.30 / 693.33 | 16.08 / 90.70 (no keeper) |

Closed-loop 1,000-command AWS controls (keeper on):

| Shape / history | p50 / p99 | n |
| --- | ---: | ---: |
| closed-one-control-commits-3-on-aged | 8.64 / 20.92 | 1000 |
| closed-one-control-commits-3-on-fresh | 8.90 / 34.81 | 1000 |
| closed-two-control-commits-3-on-aged | 8.67 / 24.78 | 1000 |
| closed-two-control-commits-3-on-fresh | 9.35 / 26.06 | 1000 |

## Q1: writer latency and isolation

| Keeper | Offered/s | Read-node readers | p50 / p99 | p99 / same-arm zero-reader | P2 ≤10/50 ms |
| --- | ---: | ---: | ---: | ---: | --- |
| off | 15 | 0 | 21.89 / 90.80 | 1.00 | missed |
| off | 15 | 16 | unmeasured | unmeasured | unmeasured |
| off | 15 | 64 | unmeasured | unmeasured | unmeasured |
| off | 15 | 256 | unmeasured | unmeasured | unmeasured |
| off | 55 | 0 | unmeasured | unmeasured | unmeasured |
| off | 55 | 16 | unmeasured | unmeasured | unmeasured |
| off | 55 | 64 | unmeasured | unmeasured | unmeasured |
| off | 55 | 256 | unmeasured | unmeasured | unmeasured |
| on | 15 | 0 | unmeasured | unmeasured | unmeasured |
| on | 15 | 16 | unmeasured | unmeasured | unmeasured |
| on | 15 | 64 | unmeasured | unmeasured | unmeasured |
| on | 15 | 256 | unmeasured | unmeasured | unmeasured |
| on | 55 | 0 | unmeasured | unmeasured | unmeasured |
| on | 55 | 16 | unmeasured | unmeasured | unmeasured |
| on | 55 | 64 | unmeasured | unmeasured | unmeasured |
| on | 55 | 256 | unmeasured | unmeasured | unmeasured |

The 256/0 ratio bar is ≤1.25; compare within the same rate and keeper arm. A ratio met against a slow baseline does not satisfy the absolute latency bar. Historical S1 reached 2.33× at only 16 readers (55/s); it did not measure 256. These are single windows, not repeated-run confidence bounds.

## Q3: ACK-to-observed follower visibility

| Keeper | Offered/s | Application readers | ACK count | Visible p50 / p99 | ≤250 ms p99 |
| --- | ---: | ---: | ---: | ---: | --- |
| off | 15 | 0 | unmeasured | unmeasured | unmeasured |
| off | 15 | 256 | unmeasured | unmeasured | unmeasured |
| off | 55 | 0 | unmeasured | unmeasured | unmeasured |
| off | 55 | 256 | unmeasured | unmeasured | unmeasured |
| on | 15 | 0 | unmeasured | unmeasured | unmeasured |
| on | 15 | 256 | unmeasured | unmeasured | unmeasured |
| on | 55 | 0 | unmeasured | unmeasured | unmeasured |
| on | 55 | 256 | unmeasured | unmeasured | unmeasured |

Visibility is the first read-node response containing all three exact expected payloads. The upper bound includes polling, RPC and a pool of 16 observer connections in addition to 0/256 application readers. It is not isolated ingestion latency, an ordered feed, or a change-feed resumption test. S1 has no separate-node comparator.

## Q2: pull latency and throughput

| Pull | Read-node clients | p50 / p99 ms | pulls/s | pulls/s / four engine cores | 256 p99 / goodput / P4 bars |
| --- | ---: | ---: | ---: | ---: | --- |
| 1,500 B current | 16 | unmeasured | unmeasured | unmeasured | unmeasured |
| 1,500 B current | 64 | unmeasured | unmeasured | unmeasured | unmeasured |
| 1,500 B current | 256 | unmeasured | unmeasured | unmeasured | unmeasured |
| 135,000 B current | 16 | unmeasured | unmeasured | unmeasured | unmeasured |
| 135,000 B current | 64 | unmeasured | unmeasured | unmeasured | unmeasured |
| 135,000 B current | 256 | unmeasured | unmeasured | unmeasured | unmeasured |
| 1,500 B past per pull | 16 | unmeasured | unmeasured | unmeasured | unmeasured |
| 1,500 B past per pull | 64 | unmeasured | unmeasured | unmeasured | unmeasured |
| 1,500 B past per pull | 256 | unmeasured | unmeasured | unmeasured | unmeasured |
| 135,000 B past per pull | 16 | unmeasured | unmeasured | unmeasured | unmeasured |
| 135,000 B past per pull | 64 | unmeasured | unmeasured | unmeasured | unmeasured |
| 135,000 B past per pull | 256 | unmeasured | unmeasured | unmeasured | unmeasured |

Each live Q2 case offers 55 guarded atomic commits/s while pulling 20,000 documents. Writer offered/ACK counts and queue-inclusive latency remain in the raw results. Past reads use a new per-query SETTING with the completed seed snapshot token and clock. The seed documents are immutable; the separate topology and Q4 probes verify changing values at distinct bases. This does not sample a distribution of many historical ages.

| AWS Local control pull | Clients | p50 / p99 | pulls/s |
| --- | ---: | ---: | ---: |
| a | 1 | 2.92 / 18.52 | 234.33 |
| a | 16 | 18.93 / 168.70 | 549.61 |
| a | 4 | 9.43 / 100.87 | 273.83 |
| c | 1 | 1.06 / 10.30 | 524.84 |
| c | 16 | 9.25 / 41.67 | 1,386.79 |
| c | 4 | 3.69 / 18.60 | 818.43 |
| d | 1 | 1.00 / 7.71 | 595.71 |
| d | 16 | 11.32 / 46.39 | 1,188.80 |
| d | 4 | 3.36 / 22.30 | 858.93 |
| e | 1 | 0.53 / 4.26 | 1,189.00 |
| e | 16 | 4.36 / 21.94 | 2,793.05 |
| e | 4 | 1.41 / 9.33 | 1,831.79 |

Control kinds: a small; b 95 small documents (one pull); c large; d small past-basis transaction; e small inline past basis. Historical S1 at 16 clients: small 3.32/14.91 ms and 3,946.29 pulls/s; large 5.19/13.26 ms and 2,790.71 pulls/s; small past transaction 4.37/12.63 ms and 3,275.42 pulls/s. S1 had no keeper or 256-reader case.

## Q5: loaded component cost

| Keeper / offered/s / readers | Component | Mean CPU cores in window | Memory current / lifetime peak MiB |
| --- | --- | ---: | ---: |
| off / 15 / 0 | tx2-xns2-kafka | 0.101 | 421.9 / 431.3 |
| off / 15 / 0 | tx2-xns2-s3 | 0.001 | 545.9 / 546.5 |
| off / 15 / 0 | tx2-xns2-write | 0.346 | 593.3 / 1163.8 |
| off / 15 / 0 | tx2-xns2-read | 0.034 | 562.1 / 1108.4 |

CPU is cgroup CPU-seconds / case elapsed-seconds; memory is cgroup resident/accounted current and container-lifetime peak, not Java heap alone. Sum all four components for the engine; allocation remains four cores. Keeper and client CPU are outside these engine cgroups. Keeper-on uses eight SCHED_IDLE VM workers, explicitly excluded from component CPU totals. Historical broker-only idle floor was 0.040 cores and 290–295 MiB, not a loaded comparison.

| Keeper / offered/s | Two-node minus matched Local p50 / p99 ms (zero readers) |
| --- | ---: |
| off / 15 | 1.46 / 42.98 |
| off / 55 | unmeasured |
| on / 15 | unmeasured |
| on / 55 | unmeasured |

The difference includes Kafka, S3, remote topology and the extra node; it does not isolate a Kafka-only causal latency increment. There is no provisional standalone Kafka CPU/memory bar.

## Q4: exact basis and waiting for a transaction

The writer exposes `SHOW LATEST_SUBMITTED_TX` with `await_token`. On the reader, `BEGIN READ ONLY WITH (AWAIT_TOKEN=…, SNAPSHOT_TOKEN=…, CLOCK_TIME=TIMESTAMP …)` waits, pins the basis, then executes the point read and COMMIT. `SETTING SNAPSHOT_TOKEN=…, CLOCK_TIME=… SELECT …` pins one query without a separate transaction. Token acceptance alone is insufficient: the probes check the changing value at both bases.

| Mechanism | n | p50 / p99 ms | Historical S1 |
| --- | ---: | ---: | --- |
| fresh await + pinned point read + COMMIT | unmeasured | unmeasured | no cross-node wait measurement |

The await+pull timer starts after obtaining token/snapshot/clock; ACK-to-observed includes those three writer metadata calls. The probe performs 500 sequential updates and fresh pinned reads, checking every value, and checks the previous exact value every 50 updates. It does not isolate the internal wait component. The Q2 current/past rows above measure the per-pull pinned query cost under load.

## Observation-to-verdict audit

There are no acceptance/PASS producers in this spike. The following places produce diagnostic content booleans, completed markers, adopted numbers or bar comparisons. They were reviewed for content, freshness and binding; the limits remain explicit.

| Producer | Content checked | Freshness | Binding and limits |
| --- | --- | --- | --- |
| `write.mjs` correct | Full successful three-document bytes; exact P0004 marker; rejected attempt has no payloads, unchanged head and correct claim presence | Fresh unique scope and immediate readback in this invocation | Exact writer URL and frozen command source; this is not crash durability |
| `write.mjs` history, `history-check.mjs` | 20k head position, 20,001 claims, 60k documents; retained-fixture recheck also checks last three full payloads | New preparation or fresh queries after restart, with its original scope | Same named database/volume and scope; the first erroneous boolean remains retained as false |
| `write.mjs` closed | All ACKs; resulting head/counts and last complete payload bytes | New per-case scope, postflight after timing, exclusive-create output | Timed record binds container/source; earlier unobserved payloads are counted, not individually read back |
| `write.mjs` open | Offered=ACK count, unique sample indices, claims/documents/head sum, correct reader count and no errors; two-node cases also query zero mismatching full payloads for the entire scope | Fresh scope per case and postflight after the interval | Exact writer and reader URLs, cgroups, trace source, arm and attempt; the earlier Local controls have count checks plus separate byte probes, not full-scope byte scans |
| `write.mjs` lag probes | Exactly all three expected row IDs and full bytes at first visibility; one unique observation per acknowledged command | Timer starts at this command's ACK, with a 30s observation deadline | Exact command ID and read-node connection; includes polling/RPC/pool queueing |
| `read.mjs`, `reader-worker.mjs` | Complete expected document bytes and row cardinality for every warm/timed response; Q2 sample indices unique and complete | New pulls in the timed interval; explicit seed snapshot/clock for past cases | Prepared query, generated ID, exact read URL, immutable source and client count; historical fixture values are otherwise unchanged |
| `background-writer.mjs` | Offered=ACK count, no errors, fresh command/document counts and zero mismatching stored bytes | New worker scope during this read case, postflight after draining | Its fixed 55/s trace and writer URL; results embedded in the bound parent case |
| `proof.mjs`, `barrier.mjs`, `wait.mjs` | Unique marker/current/past values; complete scalar/seed bytes; reader unavailable while stopped; 500 current values and sampled prior-basis values in the wait case | Fresh writer commit/tokens, new marker IDs and per-attempt exclusive outputs | Both node URLs, exact await/snapshot/clock tokens and observed container sequence; no inference from token acceptance alone |
| `read-probe.mjs` | Exact document bytes for one unnamed and 100 named prepared pulls | New requests and a unique exclusive output | Exact read-node URL and copied source; both paths use extended protocol, and this probe was not executed because admission hit the host disk floor |
| `s3.mjs`, `metrics.mjs` | HTTP success and retained raw S3/metrics bytes; topology audit checks expected object key and leader values | Actual requests within the owned topology hold | Internal task endpoints and local credentials; metrics are observations, not a correctness verdict |
| `common.mjs` measured/save | Actual samples plus raw before/after counters; exclusive-create outputs | Brackets the invocation; no reuse of an existing same-named file | Exact binding copied into each timed record; emitting a record alone does not qualify it |
| `window.py` completed/cleanup | Completed means only that all scheduled subprocesses exited zero; cleanup observes no remaining task containers | Fresh attempt directory, commands and timestamps; bounded hold | Exact image/container IDs, named volumes and copied source/config preimages; no semantic PASS follows from completed |
| `collect.py` | Recomputes quantiles from all samples; checks counts/content postflights, no errors, unique indices/lag IDs | Binding ≤ before ≤ after ≤ release; source copied for this attempt | SHA256 of every source preimage, exact container ID/image/start time, CPU/caps/no ports unchanged through final inspect, raw cgroup monotonicity; incomplete cases remain absent |
| `audit-topology.py` | Exact changing current/past values, matching probe ID, stopped state, S3 key and leader metrics | Writer clocks and metrics timestamps inside the actual hold | Same source hashes, writer start unchanged, read ID unchanged but start advanced, 55 raw file hashes; no crash-failover claim |
| `report-tables.py` | Only a freshly rerun successful collector can supply rows; comparison uses all declared cells and unique records | Runs the collector anew before table generation | Explicit matrix/rate/client/arm match; missing cells remain unmeasured, no selected retries or silent cross-arm baselines |
| `cleanup.py` | No task container exists, each inspected volume has the exact task prefix, empty final task volume/network listings | Fresh Docker observations under its owned cleanup hold | Only `tx2-xns2-*`; original raw evidence is retained before removing volumes |
| `finalize-evidence.py` | Every manifest target's bytes reread and SHA256 compared; all original manifests reverified | Executed after final collection and cleanup | Root-contained exact paths, all manifest hashes and helper/source hashes in the verification receipt; this verifies file bytes, not engine correctness |

No acceptance file or pinned path was edited, so there are no moved acceptance-pin hashes. No package, shared engine or lab tool changed. The full application path, ordered/resumable feed, lost-ACK recovery, multi-broker durability, tenant isolation, year-one fixture scale and production failover remain unverified.

## Exact commands and evidence

From this worktree, each active stage runs through the heavy runner. The controller enforces the canonical measurement lock, the two-minute rest, CPU/memory settings, `--pull never`, source copying and removal of containers before release. Complete expanded Docker commands and environment are in each attempt's `commands.json` and container inspections.

```sh
node lab/bin/heavy.mjs --label XN-S2-topology2 -- python3 lab/experiments/EXP-XN1/spike-s2/live/window.py topology 2
node lab/bin/heavy.mjs --label XN-S2-control-commits2 -- python3 lab/experiments/EXP-XN1/spike-s2/live/window.py control-commits 2
node lab/bin/heavy.mjs --label XN-S2-control-commits3 -- python3 lab/experiments/EXP-XN1/spike-s2/live/window.py control-commits 3
node lab/bin/heavy.mjs --label XN-S2-control-reads1 -- python3 lab/experiments/EXP-XN1/spike-s2/live/window.py control-reads 1
node lab/bin/heavy.mjs --label XN-S2-control-reads-rest1 -- python3 lab/experiments/EXP-XN1/spike-s2/live/window.py control-reads-rest 1
node lab/bin/heavy.mjs --label XN-S2-q1-off -- python3 lab/experiments/EXP-XN1/spike-s2/live/window.py q1-off 1
node lab/bin/heavy.mjs --label XN-S2-q1-on -- python3 lab/experiments/EXP-XN1/spike-s2/live/window.py q1-on 1
node lab/bin/heavy.mjs --label XN-S2-lag -- python3 lab/experiments/EXP-XN1/spike-s2/live/window.py lag 1
node lab/bin/heavy.mjs --label XN-S2-reads -- python3 lab/experiments/EXP-XN1/spike-s2/live/window.py reads 1
python3 lab/experiments/EXP-XN1/spike-s2/live/audit-topology.py
python3 lab/experiments/EXP-XN1/spike-s2/live/report-tables.py
node lab/bin/heavy.mjs --label XN-S2-cleanup -- python3 lab/experiments/EXP-XN1/spike-s2/live/cleanup.py
```

The command list describes the prepared full run; only attempts with retained observations are executed evidence. Final executed/missing stages, hold times, volume maximum/removal receipt and the manifest count are recorded in the final findings below. No downloads or web requests occurred.

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2/`. Current evidence lives under `live/`; all jars, raw logs and samples stay outside Git. `EVIDENCE.md` and `SHA256SUMS-live` index the final retained bytes; prior manifests/history remain intact.


## Final findings and limits

**The requested topology is real, but these settings did not meet the absolute commit bar.** The only completed two-node timed case offered 15 commits/s, no application readers, keeper off: all 690 commits acknowledged, with p50 **21.894 ms**, p99 **90.799 ms**, max **177.884 ms**. Its entire stored payload scope had zero byte mismatches. Against the same-day AWS Local/no-keeper control, the descriptive difference is +1.458 ms p50 / +42.983 ms p99. Against historical S1's 16.47/90.25 ms it is +5.424/+0.549 ms, with different client placement, history, image and window length; neither delta isolates Kafka alone.

The next 15/s, 16-reader case hit its **110-second whole-invocation limit before the timed-function start**. This bound includes writer connection/init/warmup and reader startup/warmup. No timed samples or throughput exist for it, and the existing evidence does not identify which preparatory operation stalled. Both engine processes remained running with no OOM or restart; their Docker health checks were unhealthy, although the SQL barrier and preceding writer case succeeded. Logs contain pgwire EOF/08P01 messages when clients close; these do not establish the timeout's cause. It would be wrong to call this a measured 110-second query latency or a demonstrated XTDB follower defect.

A new source version adds progress markers plus a 100-pull prepared-read probe. Its `diagnose-1` attempt acquired the lock but refused engine startup at the **host disk floor (<5 GiB)**. The probe was never invoked. At that point the floor prevented the remaining keeper-on Q1, 55/s/load cases, Q3 lag, Q2 read-node matrix and Q4 wait-cost run. No later benchmark was started. This ends the approximately three-hour spike with those cells explicitly unmeasured, rather than attributing failure to unsupported storage or inventing a performance verdict.

Reading in five lines:

1. Kafka + shared MinIO is a credible supported topology mechanism: both nodes served exact values and the follower caught up after restart.
2. P1 isolation and 256-reader latency/goodput remain unmeasured; the 16-reader preparation timeout blocks that conclusion.
3. P2 missed in the measured keeper-off case at zero readers: 21.89/90.80 ms versus 10/50 ms; the same-day Local controls also have substantial tail spikes.
4. The largest immediate gap is a reproducible, source-bound diagnosis of the pre-timing stall under a healthy, admitted window; this run cannot assign it to engine or client.
5. Next: run the committed progress/read probe, then complete the frozen Q1→Q3→Q2 matrix; repeat matched cohorts to distinguish history/compaction and VM/host effects before any lane decision.

Task containers were removed after each owned hold. Approximate observed controller hold durations were: topology 146.282 s; failed history preparation 258.481 s; commit controls 367.919 s; first read controls 249.882 s; remaining read controls 63.092 s; Q1-off partial 247.403 s; refused diagnosis 0.432 s. Each is below ten minutes. All keeper workers this task actually started were stopped; no already-running helper was stopped in this continuation. There was no keeper-on two-node timing.

Peak observed aggregate named-volume usage was **4,508,455,534 bytes** (limit 5,000,000,000). This is sampled at window cleanup, not a continuous volume high-water mark. Before Q1, the quiescent control volume and driver volume were inspected and removed, reducing retained volume usage to 1,860,783,746 bytes after the partial Q1 hold. Final cleanup inspected and removed the seven remaining task volumes and observed empty task container, volume and network listings, under its owned lock, 16:50:05.558–16:50:06.209 UTC. Cleanup was a direct lightweight `python3 .../live/cleanup.py`, not a new heavy job below the disk floor. Its receipt is `live/cleanup-1794329406209491000.json`; control retirement is in `live/q1-off-1/retired-control-volumes.json`.

Final raw state is `live/final-state.json`. No published port, download, colima command, shared resident, Triplex code, acceptance file or package changed. No active XN-S2 engine job remains. Host free space recovered during finalization, after cleanup and the approximately three-hour benchmark budget: no fixtures or benchmark containers were restarted. Only the final evidence fingerprint job resumed, completing at 16:57:36 UTC. It freshly verified all **430 new files (135,934,471 bytes)** plus the original 43 and Postgres 48 files: **521 files / 229,998,096 bytes total**. The new manifest SHA256 is `4c6a79c366ad0d8c16b814beeb791bc359d3a7044a4553582d0aa70b149818ab`; the adjacent evidence index anchors the separate verification receipt. File verification is not engine acceptance.

## Blockers found on the way

The following sections preserve the prior reports as history, with heading levels nested under this section. They describe the earlier standalone image and permissions, not the now-working AWS image. Their old helper flags are invalid as keep-awake proof; the correction above governs current measurements.

Postgres-backed log: unavailable in this image (`!Postgres` is an external-source remote; `log: !Postgres` is rejected). Q1–Q4 remain unmeasured; Q5 retains only the prior Kafka idle floor (0.040 cores, 290–295 MiB). All performance bars remain unmeasured.

### XN-S2: Kafka-backed second XTDB node, engine-only spike

North star: P1, concurrent exact-basis reads without increasing writer commit latency; P2 commit and read-your-own-write cost; P3 visibility lag; P4 pull throughput. Authority: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. This is diagnostic evidence, with no acceptance, PASS, Triplex changes, durability qualification, or lane promotion.

#### Result and prerequisite

**The requested topology cannot start with the permitted local XTDB image. Its Kafka module is missing. This is an installation blocker, not a measured rejection of two-node XTDB performance.** Kafka's image being local supplies the broker, not XTDB's Kafka integration.

The fresh writer start at 2026-11-10 12:43:10 UTC exited 1 while decoding YAML:

```text
InvalidPropertyValueException at remotes.kafkaCluster on line 7, column 17:
Unknown type '!Kafka'. Known types are: !DirectMirror, !InMemory, !Local, !Postgres
```

The image's effective classpath is `xtdb.jar:lib/*`. `/usr/local/lib/xtdb` contains only `xtdb.jar` and `config.yaml`; `lib` does not exist. Inspection of all 50,941 jar entries found no XTDB Kafka implementation and no Kafka client implementation. Kafka-named logging and Micrometer helper classes are present; these are not XTDB's log module. The sole `xtdb.api.Remote$Registration` service entry is `xtdb.postgres.PostgresRemote$Registration`. The actual parser failure corroborates the class inspection rather than inferring functionality from image names.

Local images were XTDB `sha256:a6a426505b95a36e4e0e1d0de88efcf4220cb6bde8f1f5e594b0a1f92a948a77`, Kafka `sha256:0bc1bb2478f45b6cea78864df86acdc11e8df2c5172477819a4d12942cbe5d40` and Node `node:22.23.2-bookworm-slim`; full IDs and image configuration are in `images.json`. There is no locally listed `ghcr.io/xtdb/xtdb-aws` image. Nothing was downloaded, installed, or fetched from the web.

The smallest next prerequisite is a Kafka-capable XTDB 2.2.0 classpath (`com.xtdb/xtdb-kafka` plus its runtime dependencies), or the matching `xtdb-aws` image described in R19. This task prohibits obtaining either from the network. The supported documented storage topology also needs an object store and its XTDB implementation; no S3-compatible server image is listed locally. Kafka plus shared `!Local` storage is an unsupported single-host diagnostic alternative from R19, but cannot bypass the missing Kafka module. I did not establish whether any other local storage server could substitute.

I did not repeat the shared-Local-log follower experiment as a replacement: X05 already documented permanent partial-record tail-reader failures. That topology does not answer this task's Kafka question. The XN-S1 `write.mjs`, `read.mjs`, `reader-worker.mjs`, `wire.mjs`, and `common.mjs` were read for reuse, but were not invoked or copied into a load generator because the engine prerequisite failed before seeding.

#### Conditions

The inspection hold was 12:43:07–12:43:10 UTC, well below ten minutes. `keepAwake: true`: `keep-awake.sh start` ran before the probe (`already-running`), and the exit trap stopped it (`remaining 0`) before releasing the lock. The second hold obeys the minimum two-minute rest. Prior XN-S1 and X05 results **had no keep-awake**, so they are historical context and not matched latency controls.

The writer configuration probe was pinned to CPUs 0,1, memory/swap 3,758,096,384 bytes, heap 2 GiB and direct memory 1 GiB, with no published ports. It never reached server startup or any log/storage initialization. The reader was not started. No performance load generator was started. The broker-only configuration and window are described below. All containers were task-prefixed and existed only during the owned lock windows; no other containers were changed.

#### Exact node configuration

**No two-node configuration worked.** These are the exact prepared YAMLs; only the writer YAML was executed, and it failed on the Kafka remote registration before contacting a broker. `writer.yaml`:

```yaml
server:
  host: 0.0.0.0
  port: 5432
  numThreads: 300
remotes:
  kafkaCluster: !Kafka
    bootstrapServers: tx2-xns2-kafka:9092
log: !Kafka
  cluster: kafkaCluster
  topic: tx2-xns2-source
  autoCreateTopic: true
storage: !Local
  path: /var/lib/xtdb/buffers
memoryCache:
  maxSizeBytes: 536870912
healthz:
  host: 0.0.0.0
  port: 8080
```

`reader.yaml` has exactly the same fields plus this top-level field:

```yaml
readOnlyDatabases: true
```

The intended shared-storage path was `/var/lib/xtdb/buffers` on one task-owned Docker volume; no shared writer/reader volume was actually created. The read node would be pinned to CPUs 2,3 with the same memory/JVM limits. `numThreads: 300` comes from R19's connection-cap analysis for 256 readers. Log keys come from R19's saved `docs/kafka.md`, not web lookups. No node ran with a local log, transient log, or altered durability as a substitute.

#### Q1: writer latency and reader isolation

All latency values are milliseconds. Historical S1 used the single combined ASSERT (`one`) and an aged subject. No equivalent S2 transactions ran.

| Offered commits/s | Readers | XN-S1 p50 / p99 | XN-S2 Kafka + read node | Bar status |
| ---: | ---: | ---: | --- | --- |
| 15 | 0 | 16.47 / 90.25 | unmeasured | P2 unmeasured |
| 15 | 16, 64, 256 | not measured | unmeasured at each level | P1/P2 unmeasured |
| 55 | 0 | 7.88 / 38.95 | unmeasured | P2 unmeasured |
| 55 | 16 | 16.08 / 90.70 (2.33× p99) | unmeasured | P1/P2 unmeasured |
| 55 | 64, 256 | not measured | unmeasured at each level | P1/P2 unmeasured |

No 256/0-reader writer p99 ratio exists. In particular this spike does not establish the ≤1.25 ratio or ≤10/50 ms commit bars. It also does not provide a new keep-awake single-node baseline.

#### Q2: read latency and goodput

| Pull | XN-S1 historical example at 16 clients | XN-S2 at 16 / 64 / 256 readers | Bar status |
| --- | --- | --- | --- |
| One 1,500-byte document | settled3-a: p50/p99 3.32/14.91 ms; 3,946.29 pulls/s | unmeasured / unmeasured / unmeasured | P1/P4 unmeasured |
| One 135,000-byte document | settled3-c: 5.19/13.26 ms; 2,790.71 pulls/s | unmeasured / unmeasured / unmeasured | P1/P4 unmeasured |
| Earlier basis per pull | supplemental-d, small document: 4.37/12.63 ms; 3,275.42 pulls/s | unmeasured for small and large documents | P1/P4 unmeasured |

S1 used 100k small and 2k large highly compressible synthetic documents. Neither those counts nor target-scale fixtures were seeded here. No throughput-per-core comparison, 256-reader p99, or 64→256 goodput result is available. Broker idle CPU cannot be used to extrapolate a four-core engine's loaded efficiency.

#### Q3: ACK-to-read-node visibility

| Commits/s | Read-node readers | XN-S1 equivalent | XN-S2 p50 / p99 | Bar status |
| ---: | ---: | --- | --- | --- |
| 15 | 0 | no second node | unmeasured | P2/P3 unmeasured |
| 15 | 256 | no second node | unmeasured | P2/P3 unmeasured |
| 55 | 0 | no second node | unmeasured | P2/P3 unmeasured |
| 55 | 256 | no second node | unmeasured | P2/P3 unmeasured |

No ACK was produced by a Kafka-backed XTDB write, so no lag sample exists and no ≤250 ms p99 comparison can be made.

#### Q4: exact past basis and waiting

| Mechanism | XN-S1 evidence | XN-S2 cost / status |
| --- | --- | --- |
| Per-pull `BEGIN READ ONLY WITH (SNAPSHOT_TOKEN, CLOCK_TIME)`, SELECT, COMMIT in one socket write | measured in S1; settled3-d at 16: 5.17/18.68 ms | unmeasured |
| Inline `SETTING SNAPSHOT_TOKEN=…, CLOCK_TIME=… SELECT …` | supplemental-d at 16: 4.37/12.63 ms | unmeasured |
| Follower wait, then exact snapshot | not a two-node S1 measurement | documented in R19, not executed here |

R19 sections 0–1 distinguish `AWAIT_TOKEN` (source-log message position; follower waits, default hard-coded 60 s limit in the cited source) from `SNAPSHOT_TOKEN` (exact system-time basis; a lagging follower raises `0B000` rather than waiting). The intended request is `BEGIN READ ONLY WITH (AWAIT_TOKEN='…', SNAPSHOT_TOKEN='…', CLOCK_TIME=TIMESTAMP '…')`, then the prepared pull, then COMMIT. This is a source-derived mechanism, not freshly verified Kafka behavior or measured overhead. No exact-past content test or wait-duration measurement ran here.

#### Q5: Kafka resource floor

| Quantity | XN-S1 single node | XN-S2 broker-only observation | Bar status |
| --- | --- | --- | --- |
| Idle broker CPU | no broker | 2.407575 CPU-s / 60 s = **0.040126 cores** | no loaded four-core result |
| Broker cgroup memory during sampling | no broker | **303,865,856–309,252,096 bytes (289.8–294.9 MiB)** | footprint only |
| Broker cgroup memory peak since startup | no broker | **400,973,824 bytes (382.4 MiB)** | footprint only |
| Broker log directory bytes | no broker | 20,975,782 → 20,984,502 bytes | below task volume limit |
| Added commit latency | historical Q1 numbers above, without keep-awake | unmeasured; no XTDB Kafka commit ran | P2 unmeasured |

The broker hold was **12:52:31–12:53:53 UTC (82 s)**, over nine minutes after the first hold ended. Seven raw samples span **12:52:52–12:53:52 UTC**. `keepAwake: true`; start returned `already-running`, exit-trap stop returned `remaining 0`. Sample timestamp granularity is one second and Docker observation calls add small boundary overhead. CPU counts include the sampling `docker exec` processes inside the cgroup. Memory is `memory.current` (including charged file cache), not JVM heap or process RSS; startup peak is `memory.peak`. Idle means no application topics or XTDB producers/consumers; KRaft metadata activity still runs.

Kafka started at 12:52:34.271 UTC, and `kafka-topics.sh --bootstrap-server localhost:9092 --list` returned an empty topic list before settling and sampling. Container `4004e2a26349293febb8ddb2d711458aafe37433367ccbde60b78c6addca0f97` was running with `OOMKilled: false` at the final inspect. It was pinned to CPU 0, memory and swap 1 GiB each, with hostname `tx2-xns2-kafka`, no published ports, and named volumes for data, secrets and config. It needed no custom Docker network for this broker-only probe.

Exact supplied Kafka environment (image defaults remain in `images.json`):

```sh
KAFKA_NODE_ID=1
KAFKA_PROCESS_ROLES=broker,controller
KAFKA_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093
KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://tx2-xns2-kafka:9092
KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER
KAFKA_CONTROLLER_QUORUM_VOTERS=1@tx2-xns2-kafka:9093
KAFKA_INTER_BROKER_LISTENER_NAME=PLAINTEXT
KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1
KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1
KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1
KAFKA_LOG_DIRS=/var/lib/kafka/data
KAFKA_HEAP_OPTS='-Xms256m -Xmx512m'
CLUSTER_ID=MkU3OEVBNTcwNTJENDM2Qk
```

This single-broker KRaft setup is not a replicated durability test. The idle footprint says nothing about Kafka's CPU, memory or latency under the source and replica traffic from XTDB. There is no read-node or writer CPU accounting to add to it, and no basis for declaring the whole four-core engine within budget.

#### Reading in five lines

1. A two-node Kafka-backed XTDB remains untested here; the local standalone image cannot express that topology.
2. The immediate gap is the missing XTDB Kafka runtime, not evidence that read-node isolation misses P1.
3. The supported storage configuration additionally needs an available object-store module and server; shared Local storage would remain diagnostic.
4. Next obtain the matching Kafka-capable image, prove two-node ACK/token visibility with byte checks, then run Q1 and Q3 first under keep-awake.
5. Only if those results are credible, run the 16/64/256 read ladder with sustained writers, all four engine cores accounted for, and exact-basis content checks.

#### Commands, evidence, audit and cleanup

Executed from this worktree, with `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock`:

```sh
node lab/bin/heavy.mjs --label XN-S2-inspect-final -- bash lab/experiments/EXP-XN1/spike-s2/inspect.sh
node lab/bin/heavy.mjs --label XN-S2-jar-index -- python3 lab/experiments/EXP-XN1/spike-s2/inspect-jars.py > /Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2/jar-inspection-console.txt
node lab/bin/heavy.mjs --label XN-S2-kafka-idle-attempt2 -- bash lab/experiments/EXP-XN1/spike-s2/kafka-cost.sh
python3 lab/experiments/EXP-XN1/spike-s2/summarize.py > /Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2/summary-console.txt
bash -n lab/experiments/EXP-XN1/spike-s2/inspect.sh
bash -n lab/experiments/EXP-XN1/spike-s2/kafka-cost.sh
```

The scripts contain every Docker argument and the lock/keep-awake lifecycle. Inspection source is commit `444e1f668046025b4a61701eb03ec24a11b20946`; the broker runner is commit `44edb2e7` (full ID in `source-binding-2.json`). The analysis helper was subsequently tightened to reject incomplete or differently bound observations before emitting its diagnostic arithmetic. The analysis helper, evidence index and manifest are committed at `9c49f595`. The report is committed last.

**First failures retained:** the writer's YAML failure and exit 1; the expected `docker cp` diagnostic confirming `lib/` is absent; and `cooldown-attempt1.json`. The first broker wrapper stalled before admission because Node's `Date.parse` rejected the newline-terminated timestamp; it was stopped without any container or lock creation, corrected with `.trim()`, and run as attempt 2. No failed engine measurement was replaced by a successful one. An earlier inspection wrapper was also stopped while waiting, before admission, to finish preparing its script.

Durable evidence root: **`/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2/`**. The 92,716,839-byte shipped jar stays there, outside Git. `EVIDENCE.md` indexes artifacts; committed `SHA256SUMS` covers all durable evidence files. All 43 files (92,838,963 bytes total) passed `shasum -a 256 -c` verification through the heavy wrapper. Both shell scripts passed `bash -n`; the analysis helper completed its observation-binding assertions. No raw directory or single bulky file was added to Git.

Observation/verdict audit (preamble 9a): no code emits a semantic PASS or acceptance receipt. These are all places observations become conclusions or derived output:

| Place | Content checked | Freshness checked | Binding checked |
| --- | --- | --- | --- |
| Missing-module conclusion in this report | actual `Unknown type '!Kafka'` text, exit 1, jar registrations and class entries | fresh 12:43:10 start and its log; copied current image jar | `config-container.json`, `images.json`, exact writer YAML/source hashes in `source-binding.json` |
| Broker startup observation in `kafka-cost.sh` | current-container `Kafka Server started` log and successful metadata CLI (empty application topic list) | new container and new data volume in this hold | exact task container ID, image, environment, mounts and caps retained in final inspect |
| `summarize.py` diagnostic CPU/memory summary | requires all seven samples, monotone counters/times, positive bounded memory; arithmetic from raw counters | sample timestamps after this container's start, within this hold; hold <10 min and rest ≥120 s | container ID matches creation output, image matches inspected Kafka image, CPU/memory/port caps match, runner SHA matches `source-binding-2.json` |
| Cleanup conclusion | empty task-prefixed container, volume and network listings | listings recorded after the broker exit trap | name filter restricted to `tx2-xns2`; timestamps in `cleanup-observed-at.txt` |

The jar indexer only extracts class entries/service text; it emits no module-support or acceptance verdict. Report claims remain diagnostic. Keep-awake invocation success is established by the runner/exit-trap command outcomes, not independently instrumented by the analysis helper. No unrelated VM workload was audited or stopped.

Removed volumes: `tx2-xns2-inspect-data`, `tx2-xns2-config-data`, `tx2-xns2-kafka-data`, `tx2-xns2-kafka-secrets`, `tx2-xns2-kafka-config`. Maximum observed broker data was about 21 MB, well below 5 GB; the two XTDB probe volumes held no database workload. Containers `tx2-xns2-inspect`, `tx2-xns2-config`, `tx2-xns2-kafka` are gone. No task network was created. Post-cleanup prefix listings are empty. Both owned locks were removed after stopping keep-awake; other parties' locks were never removed. Host free space was about 40 GiB before the runs.

No `lab/acceptance/` files were edited and no pinned path changed hash; only new `spike-s2/**` files were changed. No package code, lab tools, downloads, ports, shared residents, global Docker context, colima lifecycle, or main-checkout files were changed. No Triplex gates, scale benchmark, recovery test, actual Kafka transaction, two-node replication, token content test, or loaded performance comparison could be verified. The open prerequisite is supplying a Kafka-capable XTDB runtime and choosing available shared storage before dispatching the measurement again.


#### Postgres-backed log

Continuation requested 2026-11-10. The preceding report body is preserved as the initial Kafka investigation; this section adds the jar/serializer investigation. Same P1/P2/P3/P4 goals and authority. **No Postgres-backed XTDB shared log exists in the shipped local image. I stopped after establishing that fact, as instructed.** No Postgres server, writer/read-node stack, or Q1/Q3/Q2/Q5/Q4 load sequence was started in this continuation.

##### What `!Postgres` means

The shipped `xtdb/postgres.clj` describes itself as the configuration surface for the “Postgres external source” and calls Postgres an upstream. This is a bundled resource from the copied jar, not a web source. `postgres-jar.py` decoded classfile constant pools for the Postgres/log/storage classes and extracted relevant bundled resources. The 1,080,894-byte class index stays outside Git.

The shipped JVM independently reported these interfaces, methods and serialization descriptors (`attempt2/introspect.log`, exit 0):

| Class | Actual interface / role |
| --- | --- |
| `xtdb.postgres.PostgresRemote.Factory` | `xtdb.api.Remote.Factory<PostgresRemote>`; `open()` returns `PostgresRemote` connection coordinates |
| `xtdb.postgres.PostgresRemote` | `xtdb.api.Remote`; getters for upstream hostname/port/database/username/password; not a log |
| `xtdb.postgres.PostgresSource.Factory` | `xtdb.api.tx.ExternalSource.Factory`; opens an external source using the remotes map |
| `xtdb.postgres.PostgresSource` | `xtdb.api.tx.ExternalSource`; methods include initial snapshot, streaming changes, WAL lag and durable LSN |
| `xtdb.api.log.Log.Factory` | separate interface requiring `openSourceLog`, `openReplicaLog`, and read-only log open methods |
| `InMemoryLog.Factory`, `LocalLog.Factory` | implement `Log.Factory`; these are the core log factory classes registered by `Log.Factory.Companion` |

The jar registers `PostgresRemote.Registration` under `Remote.Registration` and `PostgresSource.Factory.Registration` under `ExternalSource.Registration`. It supplies no `META-INF/services/xtdb.api.log.Log$Registration` extension registration. `Log.Factory.Companion` class constants show the built-in InMemory/Local registrations and extension ServiceLoader path, not a Postgres factory. The Postgres module is `xtdb-postgres-source`; it supplies upstream ingestion and a DirectMirror indexer, not XTDB's source/replica log implementation. No bundled Postgres YAML/docs examples were found; `xtdb/postgres.clj` and the serializers supplied the configuration evidence.

**YAML remote fields:** `hostname`, `database`, `username`, `password` are required; `port` is optional and the runtime constructor confirmed its default is **5432**. `statusInterval` is a class property marked transient and is absent from the serialized fields. The Clojure helper uses `:host`, whereas the YAML serializer uses `hostname`.

```yaml
remotes:
  pg: !Postgres
    hostname: tx2-xns2-pg
    port: 5432
    database: xtdb
    username: client
    password: lab-only
```

This describes an upstream connection; it does not select a log. The separate `PostgresSource.Factory` serializer has four required fields: `remote`, `slotName`, `publicationName`, `indexer`. Its class constants include the missing/wrong-remote errors telling an external source to resolve a `!Postgres` entry under `remotes:`. An external Postgres source is not a mechanism by which two XTDB nodes share acknowledged XTDB commits. I did not test external-source ingestion or propose it as a substitute.

##### Fresh parser results and the misleading known-types list

All five fresh parser attempts exited **1**, without opening a database or contacting Postgres. Fixtures are committed under `postgres-config/`; raw logs, container IDs and complete final inspections are in `postgres-log/attempt2/`.

| Fixture | Observed result |
| --- | --- |
| `log: !XNUnknown {}` | Unknown type at `log`; lists `!DirectMirror, !InMemory, !Local, !Postgres` |
| `storage: !XNUnknown {}` | Unknown type at `storage`; lists `!InMemory, !Local, !Remote` |
| `remotes: {pg: !Postgres {}}` | `MissingFieldException`: `[hostname, database, username, password]` required for `!Postgres` |
| Complete Postgres remote above, then `log: !Postgres` with `remote: pg`, and `storage: !Local` | **Unknown type `!Postgres` at `log`**, despite also listing it among known types |
| `storage: !Remote` with `objectStore: !XNUnknown {}` | Unknown type at `storage.objectStore`; repeats `!DirectMirror, !InMemory, !Local, !Postgres` |

The decisive exact error is:

```text
InvalidPropertyValueException at log on line 8, column 6: Value for 'log' is invalid: Unknown type '!Postgres'. Known types are: !DirectMirror, !InMemory, !Local, !Postgres
```

The refusal is in `com.charleskorn.kaml.YamlPolymorphicInput.throwIfUnknownPolymorphicTypeException` (`YamlPolymorphicInput.kt:120`), called while deserializing `log`; the cause says the `!Postgres` serializer is absent from the requested polymorphic scope of `Factory`. The broad-looking known-types text is therefore **not a scope-valid capability list**. The same list appears for unrelated requested factory scopes. A registered remote tag alone cannot establish a registered log tag.

The actual shipped log implementations are **`!InMemory` and `!Local`**, established by the separate log factory API/registration contents, not by trusting that message's extra names. InMemory is process-local; Local is filesystem-backed and the previously measured unsupported shared-file read-only follower remains a separate, unreliable topology. There is no Postgres log factory to open even once, so this is not a two-node contention or storage-sharing failure.

Storage's own serializer recognizes **`!InMemory`, `!Local`, `!Remote`**. Remote requires an `ObjectStore.Factory`; the jar index identified its API but no supplied XTDB object-store provider/registration. The nested error's broad known-types list must not be treated as such a provider. Local storage can be mounted on a shared Docker volume for an unsupported diagnostic topology, but storage cannot supply the absent shared-log backend. No shared-storage or object-store runtime was started after the log prerequisite failed.

##### Measurements, commands, failures and cleanup

| Question | New Postgres-log measurements | Status |
| --- | --- | --- |
| Q1 writer isolation / commit p50/p99 | none; no accepted Postgres log configuration | unmeasured |
| Q3 ACK-to-read-node visibility | none; no commits or read node | unmeasured |
| Q2 point/large/past-basis read ladder | none | unmeasured |
| Q5 Postgres log CPU/memory/commit overhead | none; no Postgres server | unmeasured; prior Kafka idle number is not a Postgres number |
| Q4 wait-token/exact-basis cost | none | unmeasured |

Source for attempt 1: `e378f452`; source for attempt 2: **`5c4d52dc0e70c67acd8374a037ef5da084c95b86`**, with exact script, Clojure and fixture hashes in each attempt's `source-binding.json`. The cached jar is from the initial immutable image, and fresh image inspections confirm that same SHA256 image is still selected. No source, package, engine, broker or tooling was downloaded.

```sh
python3 lab/experiments/EXP-XN1/spike-s2/postgres-jar.py > /Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2/postgres-log/class-constants-excerpt.txt
node lab/bin/heavy.mjs --label XN-S2-postgres-probe-attempt2 -- bash lab/experiments/EXP-XN1/spike-s2/postgres-probe.sh
python3 lab/experiments/EXP-XN1/spike-s2/postgres-check.py
bash -n lab/experiments/EXP-XN1/spike-s2/postgres-probe.sh
```

Attempt 1 held the lock **13:02:29–13:02:30 UTC**, then failed because the local Kafka image has no `javap`; its broker was never started. `javap.txt`, container creation ID, images and source binding are retained. The host's Java command is also a stub with no runtime, so the successor uses the shipped XTDB JVM and Clojure reflection, without installing tooling. Attempt 2 held the lock **13:28:42–13:28:52 UTC** (10 seconds at recorded resolution), well below ten minutes and well beyond the required two-minute rest. No measurement overlapped another holder.

Both new starts returned **`already-running`**, so **neither hold called keep-awake stop**. `keepAwake: true`; the runner only stops when its own start says `started …`. Old initial-run artifacts and commands above retain their historical behavior; those scripts were not rerun in this continuation.

An initial offline indexer check rejected the last parser's fractional-second finish against the shell's whole-second end time. `indexer-first-check.txt` retains that finding. The indexer now respects the recorded precision by bounding finishes below the following second; the raw logs and runtime inspections were unchanged and no engine was rerun. `postgres-check.py` then checked all parser messages, expected exit codes, exact container IDs, immutable image, source hashes, CPU/memory/port caps, timing and keeper ownership before writing `observation-index.json`. This is a diagnostic index, not an acceptance receipt.

Preamble 9a audit for this continuation:

| Conclusion/output | Content | Freshness | Binding |
| --- | --- | --- | --- |
| Remote/source ownership and keys in report | bundled source, class constants, JVM interfaces and serializer fields, default port | fresh successful introspection; static bytes from unchanged immutable image | original jar checksum, fresh image IDs, introspection container ID and source hashes |
| No shipped Postgres log in report | actual `log: !Postgres` rejection, separate factory API and no log extension registration | new attempt's parser log and exit 1, not the earlier Kafka failure | complete committed remote/log fixture, exact image/container and start/finish inspection |
| `postgres-check.py` observation index | checks each specific message and process status; introspection fields and interfaces | requires this hold's timestamps (allowing recorded second resolution), minimum rest, new container starts | creation IDs, image IDs, fixture/runner hashes, resource caps, keeper start/stop ownership |
| Cleanup below | empty task-prefix lists | new post-run observation timestamp | only `tx2-xns2-*` resources queried |

The classfile extractor only lists bytes/strings and emits no support verdict. Shell exit zero means the collection loop completed, not that any node worked. No semantic PASS, acceptance receipt, contract or promotion was emitted. No pinned path changed; `lab/acceptance/`, packages and lab tools were untouched.

Removed containers: `tx2-xns2-pg-bytecode`, `tx2-xns2-pg-introspect`, `tx2-xns2-pg-parse`. Removed volumes: `tx2-xns2-pg-bytecode-data`, `tx2-xns2-pg-bytecode-config`, `tx2-xns2-pg-bytecode-secrets`, `tx2-xns2-pg-introspect-data`, `tx2-xns2-pg-parse-data`. No network was created. Post-run task-prefix container, volume and network lists are empty. No shared resident, other holder's resource, global Docker context, colima lifecycle or published port was touched. The only substantial temporary container copy was the approximately 93 MB jar, below the 5 GB retained-volume cap; no database workload was seeded.

New evidence: **`/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2/postgres-log/`**, indexed in `EVIDENCE.md` and `SHA256SUMS-postgres`. The original `SHA256SUMS` remains valid for the original 43 files. All 48 new evidence files (1,224,662 bytes), plus the original 43 files, passed checksum verification through the heavy wrapper. The observation checker and evidence index are committed at `fcdd2200`. The report is again committed last. The open prerequisite for the original two-node experiment remains an actual shared-log implementation (such as the missing Kafka module/image); the local Postgres server image does not supply that XTDB integration.
