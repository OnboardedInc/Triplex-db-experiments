# R29: lane D design, a Datomic-based Triplex fact store

**Written:** 2026-11-08 by planner R29 (Opus 5.5, high), under `lab/PROTOCOL.md`. **Moves:** P1 to P5 on a third engine, plus the
correctness floor (ten goals, requirements). **Scope:** `lab/SCOPE.md` (lane D added 2026-11-08), `lab/NORTH-STAR.md`, `lab/TARGETS.md`.
Inherited homebase files were read for code facts only.

## How to read this report

- **Evidence labels.** `[S]` read in this repository at `path:line`. `[D]` Datomic or vendor documentation, URL given, fetched
  2026-11-08. `[W]` other web sources (forums, Jepsen, third-party write-ups, registries). `[E]` my inference, not measured.
  `[R16]`, `[R18]`, `[R23]` refer to earlier lab research.
- **Not done.** Research only. No binary downloaded, no container or engine started, no repository edit, no clone. Every Datomic
  latency below is an estimate or a published anecdote; none was measured here. Datomic publishes no source (the Maven Central
  `peer-1.0.7745-sources.jar` is 0 bytes, `[D]` https://repo1.maven.org/maven2/com/datomic/peer/1.0.7745/), so no `[S]` exists for
  Datomic internals.
- **Builder briefs:** `/Users/sam/Claude/Projects/triplex-db-2/R29/briefs/EXP-DA00.md`, `EXP-DA01.md`, `EXP-DA02.md`.

## 0. Answer

**Recommendation: build lane D on Datomic Pro 1.0.7745 with dev storage, one transactor and one Triplex gateway peer in one
container, and an explicit HTTP/JSON gateway that we own.**

| # | Question | Answer | Confidence |
| --- | --- | --- | --- |
| 1 | Which Datomic | Datomic Pro **1.0.7745** (2026-10-16), Apache 2.0 binaries, free. **Dev storage** (embedded storage server inside the transactor, files on the container volume) for DA00 to DA02. SQL storage on Postgres is a later arm, only if P1 or P5 shows cache misses hitting the transactor JVM. Datomic Local is rejected (no transactor). Zip from `https://datomic-pro-downloads.s3.amazonaws.com/1.0.7745/datomic-pro-1.0.7745.zip`; no vendor checksum exists, so the builder pins its own sha256 and cross-checks the bundled peer jar against Maven Central's `.sha1` and PGP `.asc`. | High on version and licence; Medium on dev storage holding up at the 100k rung |
| 2 | Deployment | Image built locally: `eclipse-temurin:21.0.13_9-jre-noble` pinned by digest, plus the verified Datomic tree, plus the gateway source. One container per slot (`tx2-datomic-<slot>`) runs two JVMs (transactor, gateway), each pinned to its own CPUs with `taskset`. Resident `tx2-datomic-dev`: cap **2.75 GiB**, 2 CPUs, transactor `-Xmx640m`, gateway `-Xmx1g`. Slots: 3.5 GiB. engine.mjs manages it as a third lane: same holder, reservation, lock and volume rules; health is the gateway's `/health`, which checks transactor reachability. | Medium (heap sizes are estimates; DA00 measures RSS) |
| 3 | TypeScript access | **(c) A thin JVM gateway** (Clojure on the Datomic peer library, run with the distribution's own `bin/run`), HTTP/1.1 + JSON with tagged exact values. (a) peer-server's Client wire protocol is undocumented transit and has only a one-maintainer work-in-progress JS client; (b) the REST server is legacy (critical fixes only) and has no log endpoint. Jepsen's own Datomic test used the same gateway pattern. | High |
| 4 | Mapping | **One Datomic database per Triplex scope.** Each Triplex assertion is a small fact entity (`:f/id`, `:f/subject`, `:f/live`, `:f/attr`, one typed value attribute, optional valid-time bounds). Commit metadata (Triplex position, tx id, recorded-at, operation id) are attributes of the Datomic transaction entity. Retraction retracts the `:f/live` datom and asserts `:f/retracted-in`, so the current index holds only live facts and Datomic's history holds the rest. Valid time lives in attributes (Datomic has transaction time only). | Medium-High |
| 5 | Native queries | Raw Datomic Datalog (EDN text) and pull, run by the gateway against the database value at the requested basis (`as-of t_P`, or the unfiltered db when the basis is latest), with a Triplex rule set (`fact`, `recorded-fact`, `history-fact`) that plays the role of XTDB's `facts()`, `recordedFacts()`, `history()` relations. The gateway rejects any function call in a query that is not on an allowlist, because Datomic Datalog can call any function on the peer's classpath. | Medium |
| 6 | P1 to P5 | Datomic's process split (writer and indexer in the transactor; queries in a peer) is the main structural advantage over XTDB, whose readers and indexer share one JVM and raised commit service time about 5x at 4 readers `[R16]`. Published latency numbers for Datomic Pro on local storage do not exist; every cost below is `[E]` until EXP-DA03 measures it. | Medium on mechanism; Low on numbers |
| 7 | References | Datomic/day-of-datomic, Datomic/mbrainz-sample, replikativ/datahike, jepsen-io/datomic, csm/datomic-client-js (section 7). | High |
| 8 | Build plan | EXP-DA00 image + resident + engine.mjs lane + gateway health + G0; EXP-DA01 storage adapter and Triplex Datalog executor to G1 88/88 plus the full suite; EXP-DA02 native Datalog surface toward G2 (71 tasks x 2). Briefs in `briefs/`. EXP-DA03 (first NS smoke) follows. | High |

**Pool change needed.** Today `tx2-xtdb-dev` 3.0 GiB plus `tx2-qlever-dev` 3.5 GiB leave 4.5 GiB of the 11 GiB pool for one 3.5 GiB
exclusive slot (`[S] lab/config/slots.json:6`, `[S] lab/locks/pool.json`). A 2.75 GiB lane D resident leaves 1.75 GiB, so **no
exclusive slot fits while all three residents run.** Recommended: `tx2-datomic-dev` is a **parkable resident**. Only the orchestrator
parks it (`engine.mjs down`, which already keeps the volume, so the Datomic dev storage survives) whenever an exclusive slot is needed,
and restarts it afterwards. A lane D NS run on `datomic-s1` (3.5 GiB) runs with the lane D resident parked: 3.0 + 3.5 + 3.5 = 10.0 GiB.

**The three experiments.**
1. **EXP-DA00** (correctness floor for every later lane D claim): image, verified download, `tx2-datomic-dev` under engine.mjs, gateway
   `/health`, `/v1/db/create`, a mem-database selftest, G0 with the new package.
2. **EXP-DA01** (goal 7 floor; P2 preconditions): `@triplex-build/triplex-datomic` storage adapter and query executor; G1 PASS 88/88 plus
   the complete suite; lost-ACK resolution by operation id.
3. **EXP-DA02** (ORM-plus-native requirement; P1 basis semantics for native reads): native Datalog and pull at a Triplex basis; 71 native
   tasks authored in Datomic Datalog; G2 toward 142/142.

## 1. Which Datomic

### 1.1 Version

| Item | Value | Evidence |
| --- | --- | --- |
| Release | Datomic Pro and Peer **1.0.7745**, 2026-10-16. Client API 1.0.91 (2026-07-10). | `[D]` https://docs.datomic.com/releases-pro.html |
| Licence | "Datomic Pro binaries are licensed under Apache 2.0, available at no cost, and include all features." No source is published (sources jar 0 bytes). | `[D]` releases page; `[D]` Maven Central listing |
| Java | 1.0.7705 and later require Java 17 or later and add Java 25 support. | `[D]` https://docs.datomic.com/changes/pro.html |
| Why 1.0.7745 and not 1.0.7705 | 1.0.7745 fixes a race where `sync` futures could fail to complete although the requested basis t was available, and fixes upsert tempids consuming entity ids. Lane D relies on both: `sync(t)` for read-your-own-write across processes, and tempid upsert for every subject and attribute entity (section 4). 1.0.7745 is 23 days old. | `[D]` changes page |
| Changes to avoid | 1.0.7705 permanently discontinued maintenance of composite tuple attributes. Lane D does not use composite tuples. | `[D]` changes page |

### 1.2 Storage for the lab

| Option | What it is | Verdict |
| --- | --- | --- |
| **dev** | "Runs an embedded JDBC server inside the transactor and stores data in local disk files"; "intended for development"; peers reach it through the transactor host. | **DA00 to DA02.** Fewest moving parts: one process owns the files on the slot volume. Cost: peer cache misses are served by the transactor JVM, so they compete with transaction processing `[E]`. |
| sql (Postgres) | Table `datomic_kvs`; setup scripts `bin/sql/postgres-*.sql`; only the Postgres driver ships with the transactor. | **Later arm** (after DA03), only if io-stats show storage reads during P1 or P5 windows and the transactor's commit latency moves with them. Costs a Postgres container (estimate 0.5 to 1 GiB) the pool does not have today. |
| mem | "no data is persisted after the application JVM process stops." | Gateway selftests only. |
| Datomic Local | Client API in one process, no transactor. | Rejected: reads and writes share one JVM, which is the XTDB P1 failure mode `[R16]`; not the Pro topology. |

Sources: `[D]` https://docs.datomic.com/operation/storage.html.

### 1.3 Fetch and verify (the builder does this in DA00; I did not download anything)

1. Fetch `https://datomic-pro-downloads.s3.amazonaws.com/1.0.7745/datomic-pro-1.0.7745.zip` into a new empty directory under
   `/Users/sam/Claude/Projects/triplex-db-2/downloads/datomic-pro-1.0.7745/` (durable, outside the repo). No sign-up or email is needed:
   the URL is on the public releases page `[D]`.
2. The vendor publishes **no checksum** for the zip `[D]` releases page. Record `shasum -a 256` of the zip in
   `lab/config/datomic/SHA256SUMS` on first fetch; every later fetch must match it.
3. Cross-check against an independent channel: the zip's `peer-1.0.7745.jar` must equal Maven Central's
   `https://repo1.maven.org/maven2/com/datomic/peer/1.0.7745/peer-1.0.7745.jar` by `.sha1`, and that jar's `.asc` must verify with gpg.
   Record the signing key fingerprint. The transactor jar has no external checksum; it is trusted through the zip hash plus the
   matching peer jar `[E]`.
4. Unzip on the host into the image build context (the JRE base image has no `unzip` `[E]`), hash the extracted tree, and bind that
   hash into the image label and the effective config.

## 2. Deployment in the triplex2 VM

### 2.1 Topology

```
        TypeScript (Triplex adapter, bench, gates) on the macOS host
                         |  HTTP/1.1 keep-alive, JSON with tagged exact values
                         v  127.0.0.1:8470 (dev), 8471-8473 (s1-s3)
 +------------------------ container tx2-datomic-<slot> (one memory cap) ------------------------+
 |                                                                                              |
 |  JVM 1: transactor (bin/transactor)          JVM 2: Triplex gateway peer (bin/run -m ...)    |
 |  - serial tx pipeline, :db/cas, tx fns        - object cache + memory index per db           |
 |  - background indexing                        - q / pull at (as-of db t) or current db       |
 |  - dev storage server -> /data (volume)  <--  - cache misses read storage through the        |
 |  - taskset: CPU A                             transactor's storage server                    |
 |       ^                                       - log tail (tx-range), tx-report-queue wakeup  |
 |       |  transactions (peer -> transactor)    - taskset: CPU B                               |
 |       +---------------------------------------+                                              |
 |                                                                                              |
 |  entrypoint.sh: start both, wait -n, exit when either exits (engine.mjs sees the exit)       |
 +----------------------------------------------------------------------------------------------+
```

Why one container with two JVMs and not two containers:
1. engine.mjs's unit is one container per slot with one reservation, one lock, one volume and one health check `[S]
   lab/bin/engine.mjs:207-278`. Two containers would need a user-defined Docker network (the transactor's `host` property must be an
   address the peer can reach `[D]` peer-server page) and a second reservation, like the XTDB follower `[S] lab/bin/engine.mjs:323-381`.
2. CPU separation, which is what P1 needs, still holds: `--cpuset-cpus` on the container plus `taskset -c` per JVM inside it.
   util-linux (`taskset`) is part of the Ubuntu base `[E]`.
3. Rejected for now: two containers (more plumbing before any number exists); transactor and gateway in one JVM (not supported, and
   it would recreate XTDB's shared-JVM coupling `[R16]`). A second container becomes worth it at the P5 sweep (a second peer for the
   sweep, section 6) or for the Postgres arm.

### 2.2 Image

| Layer | Pin | Note |
| --- | --- | --- |
| Base | `eclipse-temurin:21.0.13_9-jre-noble@sha256:0eda5830ed7b669abc246a8dc520ea8a23cab06f9a8d4b6964109e2f2394e46f` (arm64 manifest `sha256:e29bfdff2f7245d8be69ee092651149c026e1b8c2b2d4967c9563963f30076f3`) | `[W]` Docker Hub API, tag updated 2026-11-01. Java 21 LTS meets Datomic's Java 17 minimum. The builder re-checks the digest with `docker buildx imagetools inspect` before building. |
| Datomic | the verified extracted tree from 1.3 | `/opt/datomic` |
| Gateway | `packages/datomic/gateway/` source, run by the distribution's `bin/run -m triplex.gateway.main` with the source dir on the classpath | No build tool, no AOT. Dependencies only from jars already in Datomic's `lib/` (check for Jackson core and an HTTP server there first); otherwise the JDK's `com.sun.net.httpserver` with virtual threads (`java --list-modules` must list `jdk.httpserver`). |
| Config | `lab/config/datomic/transactor.properties`, `entrypoint.sh` | bind-mounted read-only, hashed into the effective config like `xtdb-config.yaml` |

The image is local, so slots.json pins its **image id** (`sha256:...` of the built image) and the build-input hash; `engine.mjs up`
refuses when the local image id differs. No registry push.

### 2.3 Memory envelope

Datomic's own guidance: the transactor launches with 1 GiB by default for development; the sample production settings target 4 GiB;
`memory-index-threshold` 32m and `memory-index-max` 512m are the recommended defaults; the heap must cover `memory-index-max` plus
`object-cache-max` plus headroom; peers may use up to `memory-index-max` per connected database; the peer example gives 50% of RAM to the
object cache `[D]` https://docs.datomic.com/operation/capacity.html.

| Setting | dev resident (2.75 GiB cap) | s1-s3 (3.5 GiB cap) | Why |
| --- | --- | --- | --- |
| Transactor heap | `-Xms640m -Xmx640m` | `-Xms1g -Xmx1g` | dev: below Datomic's 1 GiB dev default, so DA00 must show no backpressure at G1/G2 load; slots use the documented default |
| `memory-index-threshold` | 32m | 32m | documented default; one indexing job per 32 MB of novelty is also the P1 "maintenance event" (TARGETS 1.1 P1 item 3) |
| `memory-index-max` | 192m | 256m | below the 512m default to fit; backpressure "radically slows" transactions past it `[D]`, so DA03 watches `MemoryIndexMB` |
| `object-cache-max` (transactor) | 96m | 192m | transactor needs little cache |
| Gateway heap | `-Xms1g -Xmx1g` | `-Xms1792m -Xmx1792m` | peer: object cache + memory index per hot database + query working set |
| `datomic.objectCacheMax` (gateway) | 320m | 896m | about 30% and 50% of heap |
| Each JVM | `-XX:MaxMetaspaceSize=160m -XX:MaxDirectMemorySize=128m -XX:+ExitOnOutOfMemoryError` | same | bound the non-heap parts so the cap is predictable `[E]` |
| Estimated RSS | about 0.95 + 1.35 = 2.3 GiB | about 1.35 + 2.15 = 3.5 GiB tight | `[E]`: about 300 MiB of non-heap per JVM. DA00 records `docker stats` peaks; if the slot estimate is too tight, the gateway drops to `-Xmx1536m`. |
| CPUs | `--cpus 2`, transactor on one VM CPU, gateway on another | `--cpus 3` (1 transactor, 2 gateway) when the window allows | P1 attribution |
| Disk forecast | 4 GiB | 8 GiB | Datomic: "Expect every datom to be stored at least 3 times"; run `gc-storage` after bulk seeds `[D]` capacity |

### 2.4 engine.mjs changes (DA00)

| Piece | Change | Evidence |
| --- | --- | --- |
| slots.json | `lanes.datomic`: `image` (local tag), `imageId`, `buildInputsSha256`, `configSource: ["lab/config/datomic/transactor.properties", "lab/config/datomic/entrypoint.sh"]`, `containerPort: 8080`, `urlTemplate: "http://127.0.0.1:{port}"`, `envVar: "DATOMIC_GATEWAY_URL"`, `integrationEnv: {"DATOMIC_INTEGRATION": "1"}`. `slots.datomic`: dev 8470 (mode `resident`, `parkable: true`), s1-s3 8471-8473 (exclusive), each with `memBytes`, `cpus`, `transactorOpts`, `gatewayOpts`. Ports avoid the reserved 5461-5469 and 7061-7069 and every existing port. | `[S] lab/config/slots.json:10-11,40-60` |
| `effectiveConfig` | datomic branch: hashes of transactor.properties, entrypoint.sh, gateway source tree, image id, both JVM option strings, cap, cpus, cpuset | `[S] lab/bin/engine.mjs:68-112` |
| `runArgs` | `-v tx2-datomic-<slot>-data:/data`, config files read-only, `-e TRANSACTOR_JAVA_OPTS`, `-e GATEWAY_JAVA_OPTS`, `-e TX_CPUS`, `-e GW_CPUS` | `[S] lab/bin/engine.mjs:114-138` |
| Health | Docker health command without new packages: `bash -c 'exec 3<>/dev/tcp/127.0.0.1/8080; printf "GET /health HTTP/1.0\r\n\r\n" >&3; grep -q "200" <&3'`; host-side `probe` GETs `/health`, which answers 200 only when the gateway's connection to a `tx2-health` database completes `d/sync` within 2 s | `[S] lab/bin/engine.mjs:140-155` |
| Start order | entrypoint starts the transactor, waits for its port, creates `tx2-health` if absent, starts the gateway. `waitReady` timeout stays 240 s. | `[E]` |
| Park | No new command: `down` without `--remove-volume` already keeps the volume and releases the reservation `[S] lab/bin/engine.mjs:280-321`. Add the rule to `lab/agents/CODEX-PREAMBLE.md` rule 3: builders never park `tx2-datomic-dev`; only the orchestrator does. | `[S] lab/agents/CODEX-PREAMBLE.md` rule 3 |
| Selftest | `engine.mjs selftest --lane datomic`: a throwaway container (`--rm`, `--network none`, 1.5 GiB cap admitted against the pool like a research probe) runs the gateway's tests on `datomic:mem://` | `[E]` |

### 2.5 What has to give in the pool

| Configuration | xtdb-dev | qlever-dev | datomic-dev | Free of 11 GiB | What fits in the free space |
| --- | --- | --- | --- | --- | --- |
| Today | 3.0 | 3.5 | - | 4.5 | one 3.5 GiB slot, or 3.5 slot + 1.0 XTDB small follower `[S] slots.json:25` |
| Lane D resident running | 3.0 | 3.5 | 2.75 | 1.75 | a 1.5 GiB research probe or the selftest; **no exclusive slot** |
| Lane D resident parked | 3.0 | 3.5 | parked (volume kept) | 4.5 | as today |
| Lane D NS on datomic-s1 | 3.0 | 3.5 | parked | 1.0 after s1 | nothing else |

Alternatives rejected: shrinking `tx2-qlever-dev` (it was OOM-killed three times at 2.5 GiB `[S] slots.json:48`); shrinking
`tx2-xtdb-dev` below 3.0 GiB (no evidence it holds); growing the VM (STATE says the host is saturated and the VM cannot grow); lane D
with no resident at all (every G1/G2 iteration would wait for a slot window, and lane D needs many G1 iterations early). The cost of the
recommendation: lane X or Q exclusive-slot work and lane D resident work cannot run at the same time. The orchestrator schedules lane D
gate work in the gaps of the exclusive slot queue (STATE lists the queue).

## 3. TypeScript access for Triplex

| | (a) peer-server + Client protocol | (b) legacy REST server | **(c) gateway peer (ours)** | (d) other |
| --- | --- | --- | --- | --- |
| Status | Supported product; the wire protocol is not documented; the docs only say the Client library talks to the peer server over the network `[D]` https://docs.datomic.com/operation/peer-server.html. The only JS client is `datomic-client-js` 0.1.13, one maintainer, README "Basic communications work, to the point where I can make a basic query" `[W]` https://registry.npmjs.org/datomic-client-js | "The REST server is legacy and will no longer be supported for new development"; critical fixes only `[D]` https://docs.datomic.com/reference/rest.html | Our code on the official Peer API (Clojure 1.11.4 and the Peer API are on the classpath for classpath functions `[D]` https://docs.datomic.com/transactions/transaction-functions.html) | Datomic Local in-process (no transactor; dev/test); a JVM bridge inside Node (one process for readers and the TS kernel); Datahike (not Datomic) |
| Exactness (long, bigint, bigdec, instant) | transit has tagged 64-bit ints, bigdec and bigint, but JS decoders map them to library Long types; exact only with our own decoder `[E]` | EDN; JS EDN parsers turn integers into Number `[E]` | We define the encoding: every value tagged, longs and entity ids as decimal strings, doubles by Java 21 shortest round-trip text | n/a |
| Pinned reads | `as-of`, `since`, `history`, `sync`, `with` in the Client API `[D]` https://docs.datomic.com/client-api/datomic.client.api.html | `:as-of`, `:basis-t` in db descriptors `[D]` REST | `d/as-of`, held db values, `d/with` for staged reads | - |
| Log API | `tx-range` `[D]` Client API | No log endpoint on the REST page; events are Server-Sent Events of tx reports `[D]` REST | `d/tx-range` plus `d/tx-report-queue` wakeup; server-side long-poll | - |
| Transaction functions | classpath functions on the transactor, called by symbol `[D]` tx functions | via tx-data EDN | same, plus server-side composition of the commit | - |
| Latency | one hop to a peer (the peer server is a peer with its own cache `[D]`) | one hop | one hop to a peer | - |
| Code we own | a reverse-engineered TS transit client with request signing; nothing server-side (no place for basis mapping, feed long-poll or the query allowlist) | an EDN codec; nothing server-side | about 800 to 1,200 lines of Clojure plus the TS client `[E]` | - |

**Verdict: (c).** It is the only option where exactness, basis mapping, the feed tail and the C8 query allowlist live in code we hold and
test. It is also the pattern Jepsen used: "a small Clojure service that embeds the peer library to each node" speaking HTTP+EDN `[W]`
https://github.com/jepsen-io/datomic. (a) stays a fallback if Cognitect documents the protocol.

**Gateway API v1 (contract for DA01 and DA02).** JSON over HTTP/1.1 keep-alive, one route family per database:

| Route | Purpose |
| --- | --- |
| `GET /health` | 200 only after `d/sync` on `tx2-health` completes within 2 s; body: Datomic version, gateway source hash |
| `POST /v1/db/create`, `POST /v1/db/delete` | create (idempotent) and install the lane D schema; record the full Triplex scope string in the database and refuse a name collision; delete only for scopes whose env is `test` |
| `GET /v1/db/{db}/basis` | latest `{t, position, recordedAt}` |
| `POST /v1/db/{db}/transact` | one Triplex commit (section 4.3); returns `{t, position}` after the transactor acknowledges |
| `GET /v1/db/{db}/operation/{id}` | `d/sync` then look up the operation id; `committed` with `{t, position}` or `absent` |
| `POST /v1/db/{db}/read` | adapter reads at a basis (`by-entity`, `by-entities`, `by-id`, `pattern`, `history`), optionally over staged tx-data |
| `POST /v1/db/{db}/q`, `/pull` | Triplex Datalog after translation (DA01) and native Datalog and pull (DA02) at a basis, with timeout and row limit |
| `GET /v1/db/{db}/log?fromT=&limit=&waitMs=` | feed entries from the log (DA03) |

Value encoding: `{"t":"long","v":"-9223372036854775808"}`, `{"t":"double","v":-0.0}`, `{"t":"string","v":"..."}`,
`{"t":"bool","v":true}`, `{"t":"ref","v":"17592186045418"}`, `{"t":"instant","v":"1731000000000"}`, `{"t":"bigdec","v":"16.50"}`,
`{"t":"bigint","v":"..."}`, `{"t":"keyword","v":":f/attr"}`, `{"t":"uuid","v":"..."}`. NaN and infinities are rejected at both ends.

## 4. Mapping Triplex onto Datomic

### 4.1 What Triplex asks of a backend

1. `StorageAdapterService`: `withTransaction`, `nextCommitPosition`, `currentCommitPosition`, `dependencyState`, `claimCommand`,
   `insert`, `batchInsert`, `retract`, `getById`, `getByEntity`, `getByEntities`, `query`, `history`, `initialize`, `close`
   `[S] packages/core/src/storage/StorageAdapter.ts:20-88`.
2. A fact is a row with its own identity: `id`, `entity_id`, `attribute`, one typed value, `recorded_at`, `recorded_position`,
   `valid_from`, `valid_to`, `retracted_at`, `retracted_position`, `retract_tx_id`, `created_by`, `entity_type`, `schema_version`, `tx_id`
   `[S] packages/core/src/Triple.ts:76-98`. Two assertions with equal values are two supports of one value (C5, PLAN 4).
3. Value kinds: string, number (binary64), integer (canonical int64 decimal text), boolean, datetime (epoch-ms number), ref, json, blob
   `[S] packages/core/src/Value.ts:4-13,22-36`.
4. A read basis is `{validAt, recordedAt?, recordedPosition?}` `[S] packages/core/src/Temporal.ts:18-23`; instants are non-negative
   finite numbers, not necessarily integers.
5. The XTDB adapter keeps the whole Triplex timeline in its own columns, ignores native time, stages rows in memory and submits one
   transaction guarded by a scope-wide CAS on `MAX(position)` `[S] packages/xtdb/src/XtdbStorageAdapter.ts:195`, an operation-id
   duplicate guard (`:199`) and a lost-ACK lookup loop (`:306-319`).
6. A scope is a versioned tuple `["triplex-scope-v1", env, tenant, database, generation]`
   `[S] packages/core/src/runtime/DatabaseScope.ts`. G1 opens 89 fresh scopes per run
   `[S] packages/qualification/workloads/lab-conformance.ts:76,97`.

### 4.2 The mapping

| Triplex | Datomic | Notes |
| --- | --- | --- |
| Scope | **one database per scope**, named `s-<first 32 hex of sha256(scope)>`; a scope entity holds `:triplex.scope/key` (the full string) and `:triplex.scope/position` | Per-scope log, indexes and basis t. Name collisions are refused by comparing the stored key. "it is not uncommon to host hundreds of small databases on a staging or continuous integration system" `[D]` capacity. Test databases are deleted after a gate run. |
| Tenant | one database per tenant scope (storage-layer isolation of log and indexes); the dev storage file and Postgres table are shared | R19's pooled-cell question applies (open question 2) |
| Subject (`entity_id`) | entity with `:triplex.entity/id` (string, `:db.unique/identity`) | created by tempid upsert; lookup refs resolve against db-before, so a subject created in the same transaction must be referenced by tempid, not lookup ref `[W]` Jepsen |
| Attribute name | entity with `:triplex.attr/key` (string, unique identity) | Triplex attributes are data, not Datomic schema, so schema never changes at runtime |
| Fact (assertion) | entity: `:f/id` (string, `:db.unique/value`), `:f/subject` (ref, never retracted), `:f/live` (ref to the subject, retracted on retraction), `:f/attr` (ref), one of `:f.v/string`, `:f.v/long`, `:f.v/double`, `:f.v/boolean`, `:f.v/ref`, `:f.v/json`, `:f.v/blob` (+ `:f.v/blob-meta`), `:f/type` (keyword), `:f/valid-from` and `:f/valid-to` (double, omitted when open), `:f/created-by`, `:f/entity-type`, `:f/schema-version` | about 6 datoms per fact; value attributes `:db/index true` for value patterns |
| `recorded_position`, `tx_id`, `recorded_at` | attributes of the Datomic transaction entity: `:triplex.tx/position` (long, unique value), `:triplex.tx/id`, `:triplex.tx/recorded-at` (double), `:triplex.tx/operation-id` (string, unique value) | one Triplex commit is one Datomic transaction; position P maps to exactly one t; the gateway keeps P to t in an in-memory sorted map |
| Retraction | `[:db/retract f :f/live s]` plus `[:db/add f :f/retracted-in "datomic.tx"]` | retracted position, time and tx id come from the retracting transaction's annotations. An assertion retracted in the same Triplex commit is written without `:f/live` (asserting and retracting one datom in one Datomic transaction is a conflict hazard `[E]`). |
| Command id claim | entity `:triplex.claim/command-id` (string, `:db.unique/value`) + `:triplex.claim/tx` (ref) | a duplicate aborts the transaction with a unique conflict; `claimCommand` reads the claim first so a duplicate costs a read |
| Outbox, work items | entities in the same transaction (`:triplex.outbox/key` unique value) | atomic outbox path for free (TARGETS 3) |
| Feed checkpoint | consumer entity with `:triplex.consumer/position`, updated by `:db/cas` in the same transaction as the affected-subject record | "one durable write" (TARGETS 1.1 P3 item 4) |
| Valid time | `:f/valid-from`, `:f/valid-to` attributes; filtered in queries | Datomic has transaction time only; its docs and practitioners keep domain time in attributes `[W]` https://vvvvalvalval.github.io/posts/2017-07-08-Datomic-this-is-not-the-history-youre-looking-for.html |

### 4.3 One commit

```
Triplex withTransaction (TS)                 gateway                          transactor (serial)
  stage rows, claims, retractions  --POST /transact-->  build tx-data  --transact-->  apply :db/cas, uniqueness,
  sourceK, position = sourceK + 1                       one call                       write log to storage, ack
                                                                                       |
  TripleRow[] with position P    <--{t, P}------------  db-after on this peer <--------+
```

tx-data for one command (DA01, scope-wide CAS like the XTDB A0 arm):

```clojure
[[:db/cas scope-eid :triplex.scope/position K (inc K)]
 {:db/id "datomic.tx" :triplex.tx/position (inc K) :triplex.tx/id "<txId>"
  :triplex.tx/recorded-at 1.7310000000005E12 :triplex.tx/operation-id "<uuid>"}
 {:db/id "e:p-17" :triplex.entity/id "p-17"}
 {:db/id "a:i9/status" :triplex.attr/key "i9/status"}
 {:db/id "f:1" :f/id "<factId>" :f/subject "e:p-17" :f/live "e:p-17" :f/attr "a:i9/status"
  :f/type :string :f.v/string "section1-done"}
 {:db/id "c:1" :triplex.claim/command-id "<commandId>" :triplex.claim/tx "datomic.tx"}
 [:db/retract [:f/id "<old>"] :f/live <subject-eid>]
 [:db/add [:f/id "<old>"] :f/retracted-in "datomic.tx"]]
```

Failure mapping: `:db/cas` mismatch to `XtdbSerializationConflict`-equivalent (replay when `replaySafe`); unique conflict on a claim to
command conflict; unique conflict on the operation id to "already committed" (resolve to the original); transport loss or timeout to
`/operation/{id}` polling until the deadline, then `TransactionOutcomeUnknown` (same contract as `[S]
packages/xtdb/src/XtdbStorageAdapter.ts:306-319`). Datomic "always awaits acknowledgment from storage before reporting that a
transaction is complete" `[D]` https://docs.datomic.com/transactions/acid.html.

**Jepsen's intra-transaction finding applies.** "inside of a transaction Datomic behaves as if operations were evaluated concurrently";
"Transaction functions always observe the state of the database at the beginning of the transaction"; two identical CaS operations
both succeed `[W]` https://jepsen.io/analyses/datomic-pro-1.0.7075. Rules for lane D: exactly one `:db/cas` per guarded entity per
transaction; never two transaction functions that read each other's writes; uniqueness attributes, not reads, enforce "new identity".

### 4.4 Reads

| Read | Datomic | Why it is exact |
| --- | --- | --- |
| Latest basis (P = latest position, 80% of the trace mix) | the gateway's current db value when its basis t equals t_P; no filter | nothing after t_P exists in that value |
| Past basis P | `(d/as-of db t_P)`; current facts via `:f/live` | as-of hides every datom added after t_P and shows `:f/live` datoms retracted after t_P, which is Triplex visibility at P |
| `validAt` | predicates on `:f/valid-from` / `:f/valid-to` | domain time in attributes |
| explicit `recordedAt` | join `:f/subject` to the asserting and retracting transactions' `:triplex.tx/recorded-at` | recorded time is not monotonic in commit order (C1), so it takes this exact path |
| `getById`, `history(entity)` | via `:f/id` / `:f/subject` (never retracted) plus `:f/retracted-in` | full history without `d/history` |
| Inside `withTransaction` | the db value the transaction started from (held by the gateway for the transaction's lifetime), extended with `d/with` over the staged tx-data | Datomic's own speculative-database API `[D]` Client API `with`; DA01 probes whether `d/with` accepts the held value (it is unfiltered, so it should) |
| Read-your-own-write | the commit returns t; the same gateway already holds db-after; a second gateway would call `d/sync t` | Jepsen: reads that use `d/sync` were strict serializable, `d/db` may be stale `[W]` |

### 4.5 Where Datomic needs a workaround

| Need | Native? | Workaround | Cost or risk |
| --- | --- | --- | --- |
| Valid time | no | attributes plus query predicates (4.2) | valid-time-bounded facts stay in the current index until Triplex retracts them; same expiry gap R18 found on XTDB `[R18]` |
| Real erasure (TARGETS 7) | partly: excision | **crypto-shredding first** (per-subject key outside the database; values stored as ciphertext), **excision of the ciphertext datoms second** (`:db/excise` with `:db.excise/attrs`) | Excision "is a background operation that occurs during the first indexing job after an excision transaction"; "Excision puts a substantial burden on background indexing"; avoid "more than a few thousand datoms at a time on a live system"; data stays in storage until `gc-storage`; backups untouched `[D]` https://docs.datomic.com/reference/excision.html. GS.16 (10k subjects) must batch. The read-side boundary (ErasedValue after the erasure commit publishes) is exact via an `:f/erased-in` marker written with the erasure commit, before physical excision completes. |
| Tenant isolation | per database | database per tenant; per-tenant envelope keys for PII | 1,000 small tenants = 1,000 databases on one transactor; peers hold up to `memory-index-max` per connected database `[D]` capacity; GS.15 measures it |
| Per-subject CAS (P2) | `:db/cas` per entity | DA03: CAS on the subject's head (`:triplex.entity/position`), dense scope position allocated by a classpath transaction function from db-before | a classpath function is our code inside the transactor's serial pipeline; "a slow function delays every queued transaction" `[D]` tx functions |
| Query sandbox (C8) | no allowlist found | gateway walks the EDN and rejects function symbols outside an allowlist; `:timeout` on every query | Datomic Datalog can call any classpath function in a predicate or fn clause `[E]` |
| Decimal kind (goal 1, Q22) | `:db.type/bigdec` | prefer scaled `:db.type/long` and order-preserving strings per the numbers rule; probe bigdec equality (`1.0` against `1.00`) before using it | Java `BigDecimal.equals` depends on scale `[E]` |
| Large json and blob values | strings work | keep large payloads as blob references | Datomic stores values inside segments; large strings inflate segments `[E]` |
| Engine repair | impossible | workarounds only; Datahike as the open reference | no Datomic source `[D]` Maven listing |

### 4.6 Numbers rule on Datomic

| Triplex kind | Datomic type | Round trip | Order | Hard error |
| --- | --- | --- | --- | --- |
| integer (int64) | `:db.type/long` | exact over the full signed 64-bit range, more than the 2^53 floor | native | gateway rejects non-canonical text |
| number (binary64) | `:db.type/double` | exact (shortest round-trip text in Java 21; `JSON.parse` returns the same double) | native; probe `-0.0` against `0.0` (RULINGS AMB-04 keeps bit-exact -0.0) | NaN, infinities rejected |
| datetime, valid-from/to, recorded-at | `:db.type/double` | exact for fractional ms | native | non-finite rejected |
| money, hours | scaled `:db.type/long` or order-preserving decimal string | exact | native | - |
| Datomic entity ids in answers | long, can exceed 2^53 | sent as decimal strings | - | never sent as JSON numbers |

## 5. Native queries

**Surface.** `makeDatomicNativeQueries(client, scope)` mirrors `makeXtdbNativeQueries` `[S]
packages/xtdb/src/native/NativeQueries.ts:35-194`: `select(contract, input, build, options)` for Datalog and `pull(contract, input,
build, options)` for pull, each resolving a `NativeReadBasis` with `resolveNativeReadBasis` and returning rows, basis and a trace with
`language: "datomic-datalog"` and a mapping id `triplex-datomic/fact-entity-basis/1`.

**Context given to the builder function** (the Datomic counterpart of XTDB's closed relations `[S]
packages/xtdb/src/native/Sources.ts:5-17,113-115`):

| Context member | Returns | Meaning at basis (P, validAt, recordedAt) |
| --- | --- | --- |
| `bind(value)` | an `:in` variable name | exact tagged parameter |
| `attribute(name)` | an `:in` variable bound to the attribute entity id | Triplex schema identity, not a native ident |
| `facts()` | `(triplex/fact ?f ?e ?a ?v)` rule head | live at P and valid at `validAt` |
| `recordedFacts()` | `(triplex/recorded-fact ?f ?e ?a ?v ?vf ?vt)` | live at P over all business time |
| `history()` | `(triplex/history-fact ?f ?e ?a ?v ?pos ?rpos)` | every assertion known at P, retractions included |
| `$` | the db value at P (`as-of t_P` or current) | raw native access; no Triplex temporal guarantee, as XTDB documents for raw table reads |

Example a Datomic user can read:

```clojure
[:find ?worker ?status
 :in $ % ?attr ?validAt
 :where (triplex/fact ?f ?e ?attr ?status)
        [?e :triplex.entity/id ?worker]]
```

**Rules.** Rules are sent with the query (`%`); recursion uses the shared frontier loop with budgets (C8, `[S]
packages/xtdb/src/query/recursion.ts`), not unbounded recursive rules. **Results** come back tagged and are decoded through the contract's
declared row type (`decodeNativeRows`). **Limits:** `:timeout` per query and a row cap enforced by the gateway (it asks for maxRows + 1
and fails without a partial answer, as XTDB does). **History and as-of** are also available raw (`d/history` of the basis db) for
authors who want Datomic idioms. A later arm (DA04 or the P4 work) adds a native attribute view (`[?worker :i9/status ?s]` directly);
it is not needed for G2, because G2's tasks are authored against the basis relations.

## 6. The five priorities on Datomic

| P | Mechanism | Expected cost (evidence) | Risk | First measurement (lab/bench via NS) |
| --- | --- | --- | --- | --- |
| **P1** pinned reads, never block writers | Queries run in the gateway peer against immutable db values; the transactor (writes, indexing) is a different process on a different CPU. `d/db` does not contact the transactor `[R18]`. Past bases: `as-of t`. | No published numbers for on-prem query latency on local storage; one forum anecdote reports about 60 ms queries on Cloud with 3-5 query+transact pairs per call `[W]` https://forum.datomic.com/t/what-sort-of-q-transact-response-times-should-i-be-expecting/1856. `[E]` sub-ms to a few ms for a 50 to 200 fact pull on cached segments. | (1) The gateway forwards writes, so commit latency can queue behind 256 readers on the gateway's CPU: give the write path its own executor, or a second small write gateway. (2) Dev storage serves peer cache misses from inside the transactor JVM. (3) As-of reads merge current, memory and history parts `[W]` https://tonsky.me/blog/unofficial-guide-to-datomic-internals/. | EXP-DA03: `gate.mjs NS --lane datomic --rung 10k --ns-profile smoke --zero-readers`, then the ladder with `--baseline`; transactor and gateway on disjoint VM CPUs; force one indexing job per window with `d/request-index` (the maintenance event); per level: writer commit p99 against the zero-reader run, read p99, and gateway io-stats storage-tier reads per read (target: near 0 after warm-up). |
| **P2** small atomic idempotent commits, low latency | One `transact` per command; `:db/cas` on the scope head (DA01), then on the subject head (DA03); uniqueness for claims and operation ids; ACK after storage acknowledges; db-after on the same peer. "Under load, Datomic combines these techniques so that writes per transaction can average about one or fewer" `[D]` acid. | No published on-prem numbers: forum: `transact` about 40 ms through a Cloud load balancer while DynamoDB puts were under 5 ms `[W]` forum; one practitioner found Datomic writes 2 to 5x slower than PostgreSQL `[W]` https://clojurians-log.clojureverse.org/datomic/2018-01-17. `[E]` 3 to 10 ms p50 on dev storage at the trace's 1.5 commands/s. | Scope-wide CAS makes concurrent commands on different subjects conflict (P2X found the same on XTDB); about 6 datoms per fact means a 50-fact command is about 300 datoms; backpressure if `memory-index-max` is reached during bursts. | DA01's G5-style tests (duplicate, lost ACK, CAS race) first; then DA03 NS P2 per size band at zero readers and at 256 readers, plus the 10-fact probe. |
| **P3** ordered resumable feed | `d/tx-range` from the checkpoint t (start inclusive, end exclusive); "The most recent data in the log is also maintained in memory on all transactor and peer processes" `[D]` https://docs.datomic.com/reference/log.html. Feed entries are the commit's fact datoms (subject, attribute, valid-from, valid-to). `tx-report-queue` only wakes the tailer. Checkpoint and affected-subject record in one Datomic transaction. | `[E]` lag tens of ms: the log tail is already in peer memory. | Referenced-entity fanout (GS.06b: a location's minimum wage) needs the reverse-ref index (VAET on `:f.v/ref`) at feed time; the report queue is lost on restart (replay from the log covers it). | DA03 NS P3: lag p99 with 256 readers, gaps, per-subject order, three crash points. |
| **P4** fast current path separate from history | Current pull through `:f/live`: retracted datoms leave the current index and go to history `[W]` tonsky; latest basis uses the unfiltered db. | `[E]` per-core rate unknown; Datomic caches parsed queries when the query is the same data structure, so queries are parameterized with `:in`. | **Contradiction to settle:** R18 says Datomic's current and history are "Not separated" `[R18]` line 97; the unofficial internals guide says current indexes elide retracted datoms and as-of merges a separate history part `[W]` tonsky. Expired valid-time facts stay current until retracted. | NS P4 buckets, then history depth 1, 3, 10 on the matched sample, with io-stats segment counts per index as the "bytes read" measure (io-stats reports counts and ms per tier and per index, not bytes `[D]` https://docs.datomic.com/reference/io-stats.html). |
| **P5** release sweep, 100k subjects | One db value (`as-of t`) shared by every sweep worker; no lock, no writer wait; old segments live until `gc-storage` (time-based) `[R18]`. Later: the sweep on a second peer (Datomic's practice of separate instances per load pattern `[R18]` line 283). | `[E]` | One gateway: the sweep and live reads share CPU and the object cache (LRU eviction of the live working set). | NS P5 at 10k with live readers and the writer; then 100k on a slot with a second gateway peer. |

## 7. References to clone (public source; not cloned)

| Repository | URL | Use |
| --- | --- | --- |
| day-of-datomic | https://github.com/Datomic/day-of-datomic | idiomatic Peer API: `as-of`, `history`, log, `with`, tx functions, excision samples |
| mbrainz-sample | https://github.com/Datomic/mbrainz-sample | schema and query/rules examples for a realistic dataset; sizing reference |
| datahike | https://github.com/replikativ/datahike | open Datomic-style implementation (EPL); the only readable source for as-of/history index behavior, since Datomic has none |
| jepsen-io/datomic | https://github.com/jepsen-io/datomic | Jepsen's peer HTTP service and fault harness; template for the gateway and for DA01's lost-ACK and CAS tests |
| datomic-client-js | https://github.com/csm/datomic-client-js | evidence for option (a): how the Client protocol (transit) looks from JS |
| datascript | already in `references/datascript` | in-memory Datalog with Datomic semantics; useful for translator tests |

Add them to `references/MANIFEST.json` with the commit sha at clone time, like the existing entries.

## 8. Build plan

| Order | Id | Experiment | North star | Gates | Engine |
| --- | --- | --- | --- | --- | --- |
| 1 | EXP-DA00 | image, verified download, engine.mjs datomic lane, gateway health/create/selftest, package skeleton | correctness floor (every lane D receipt binds this image and config) | G0 PASS with the datomic package; `engine.mjs up/status/down` receipts; selftest PASS | `tx2-datomic-dev` once the orchestrator frees 2.75 GiB |
| 2 | EXP-DA01 | storage adapter, Triplex Datalog executor, lost-ACK resolution | goal 7 floor; P2 preconditions | G0, G1 PASS 88/88 + suite, `--previous` rerun PASS | dev |
| 3 | EXP-DA02 | native Datalog and pull surface, 71 native tasks, query allowlist | ORM plus native requirement; P1 basis exactness for native reads | G2 toward 142/142, every execution `datomic-datalog`; G1 still PASS | dev |
| 4 | EXP-DA03 (brief later) | NS smoke at 10k: P1 ladder, P2 bands, P3 feed, P4 buckets; per-subject CAS arm | P1 to P4 | NS MEASURED | datomic-s1 with the resident parked |

## 9. Open questions

1. **Pool (orchestrator, maybe Sam).** Accept the parkable lane D resident (2.75 GiB) and the rule that lane X or Q exclusive slots and
   lane D resident work alternate? The alternative is lane D with no resident.
2. **Tenant isolation (Sam).** Does one Datomic database per tenant count as storage-layer isolation when the dev storage file (or the
   Postgres `datomic_kvs` table) is shared? This is R19's pooled-cell question again; provisional yes with per-tenant envelope keys.
3. **Storage for acceptance (Sam).** Dev storage is "intended for development". Final acceptance on lane D probably needs SQL storage on
   Postgres, which costs pool memory that does not exist today.
4. **Erasure (orchestrator).** Crypto-shredding as primary, excision as defense in depth: confirm before GS.16 work starts.
5. **Our code inside the transactor.** DA03's classpath transaction function runs in Datomic's serial pipeline. Acceptable under the
   "correctness is the floor" rule if it is pure, bounded and tested on `datomic:mem`?
6. **R18 correction.** R18 line 97 says Datomic does not separate current from history; this report says it does (unofficial source).
   DA03's P4 history-flatness run with io-stats settles it; R18 gets a note either way.
7. **Unmeasured basics** for DA00 to record: dev storage defaults inside the zip (`config/samples/dev-transactor-template.properties`),
   `create-database` latency (G1 creates 89 databases per run), `-0.0` round trip and index order, bigdec equality, maximum practical
   string size, whether `d/with` accepts a held db value inside `withTransaction`.
