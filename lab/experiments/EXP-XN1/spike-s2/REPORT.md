Q1: unmeasured (XTDB Kafka module absent); Q2: unmeasured; Q3: unmeasured; Q4: mechanism documented, cost unmeasured; Q5: idle broker 0.040 cores, 290–295 MiB memory (382 MiB startup peak); loaded cost and added commit latency unmeasured. All performance bars remain unmeasured.

# XN-S2: Kafka-backed second XTDB node, engine-only spike

North star: P1, concurrent exact-basis reads without increasing writer commit latency; P2 commit and read-your-own-write cost; P3 visibility lag; P4 pull throughput. Authority: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. This is diagnostic evidence, with no acceptance, PASS, Triplex changes, durability qualification, or lane promotion.

## Result and prerequisite

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

## Conditions

The inspection hold was 12:43:07–12:43:10 UTC, well below ten minutes. `keepAwake: true`: `keep-awake.sh start` ran before the probe (`already-running`), and the exit trap stopped it (`remaining 0`) before releasing the lock. The second hold obeys the minimum two-minute rest. Prior XN-S1 and X05 results **had no keep-awake**, so they are historical context and not matched latency controls.

The writer configuration probe was pinned to CPUs 0,1, memory/swap 3,758,096,384 bytes, heap 2 GiB and direct memory 1 GiB, with no published ports. It never reached server startup or any log/storage initialization. The reader was not started. No performance load generator was started. The broker-only configuration and window are described below. All containers were task-prefixed and existed only during the owned lock windows; no other containers were changed.

## Exact node configuration

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

## Q1: writer latency and reader isolation

All latency values are milliseconds. Historical S1 used the single combined ASSERT (`one`) and an aged subject. No equivalent S2 transactions ran.

| Offered commits/s | Readers | XN-S1 p50 / p99 | XN-S2 Kafka + read node | Bar status |
| ---: | ---: | ---: | --- | --- |
| 15 | 0 | 16.47 / 90.25 | unmeasured | P2 unmeasured |
| 15 | 16, 64, 256 | not measured | unmeasured at each level | P1/P2 unmeasured |
| 55 | 0 | 7.88 / 38.95 | unmeasured | P2 unmeasured |
| 55 | 16 | 16.08 / 90.70 (2.33× p99) | unmeasured | P1/P2 unmeasured |
| 55 | 64, 256 | not measured | unmeasured at each level | P1/P2 unmeasured |

No 256/0-reader writer p99 ratio exists. In particular this spike does not establish the ≤1.25 ratio or ≤10/50 ms commit bars. It also does not provide a new keep-awake single-node baseline.

## Q2: read latency and goodput

| Pull | XN-S1 historical example at 16 clients | XN-S2 at 16 / 64 / 256 readers | Bar status |
| --- | --- | --- | --- |
| One 1,500-byte document | settled3-a: p50/p99 3.32/14.91 ms; 3,946.29 pulls/s | unmeasured / unmeasured / unmeasured | P1/P4 unmeasured |
| One 135,000-byte document | settled3-c: 5.19/13.26 ms; 2,790.71 pulls/s | unmeasured / unmeasured / unmeasured | P1/P4 unmeasured |
| Earlier basis per pull | supplemental-d, small document: 4.37/12.63 ms; 3,275.42 pulls/s | unmeasured for small and large documents | P1/P4 unmeasured |

S1 used 100k small and 2k large highly compressible synthetic documents. Neither those counts nor target-scale fixtures were seeded here. No throughput-per-core comparison, 256-reader p99, or 64→256 goodput result is available. Broker idle CPU cannot be used to extrapolate a four-core engine's loaded efficiency.

## Q3: ACK-to-read-node visibility

| Commits/s | Read-node readers | XN-S1 equivalent | XN-S2 p50 / p99 | Bar status |
| ---: | ---: | --- | --- | --- |
| 15 | 0 | no second node | unmeasured | P2/P3 unmeasured |
| 15 | 256 | no second node | unmeasured | P2/P3 unmeasured |
| 55 | 0 | no second node | unmeasured | P2/P3 unmeasured |
| 55 | 256 | no second node | unmeasured | P2/P3 unmeasured |

No ACK was produced by a Kafka-backed XTDB write, so no lag sample exists and no ≤250 ms p99 comparison can be made.

## Q4: exact past basis and waiting

| Mechanism | XN-S1 evidence | XN-S2 cost / status |
| --- | --- | --- |
| Per-pull `BEGIN READ ONLY WITH (SNAPSHOT_TOKEN, CLOCK_TIME)`, SELECT, COMMIT in one socket write | measured in S1; settled3-d at 16: 5.17/18.68 ms | unmeasured |
| Inline `SETTING SNAPSHOT_TOKEN=…, CLOCK_TIME=… SELECT …` | supplemental-d at 16: 4.37/12.63 ms | unmeasured |
| Follower wait, then exact snapshot | not a two-node S1 measurement | documented in R19, not executed here |

R19 sections 0–1 distinguish `AWAIT_TOKEN` (source-log message position; follower waits, default hard-coded 60 s limit in the cited source) from `SNAPSHOT_TOKEN` (exact system-time basis; a lagging follower raises `0B000` rather than waiting). The intended request is `BEGIN READ ONLY WITH (AWAIT_TOKEN='…', SNAPSHOT_TOKEN='…', CLOCK_TIME=TIMESTAMP '…')`, then the prepared pull, then COMMIT. This is a source-derived mechanism, not freshly verified Kafka behavior or measured overhead. No exact-past content test or wait-duration measurement ran here.

## Q5: Kafka resource floor

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

## Reading in five lines

1. A two-node Kafka-backed XTDB remains untested here; the local standalone image cannot express that topology.
2. The immediate gap is the missing XTDB Kafka runtime, not evidence that read-node isolation misses P1.
3. The supported storage configuration additionally needs an available object-store module and server; shared Local storage would remain diagnostic.
4. Next obtain the matching Kafka-capable image, prove two-node ACK/token visibility with byte checks, then run Q1 and Q3 first under keep-awake.
5. Only if those results are credible, run the 16/64/256 read ladder with sustained writers, all four engine cores accounted for, and exact-basis content checks.

## Commands, evidence, audit and cleanup

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
