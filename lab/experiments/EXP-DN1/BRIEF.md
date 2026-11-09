# DRAFT: EXP-DN1, the first lane D P1 to P5 measurement (Datomic on Postgres storage)

**Status: DRAFT, paused mid-research on 2026-11-09 at the coordinator's request.** Written by an Opus 5.5 planner (high). Not committed.
Sections marked "unread" rest on R29 and R32 only; the adapter code, engine.mjs, slots.json memory sizes and R50's lane D notes were
not yet read line by line. Every number below is a prediction (`[E]`) unless it cites a measurement.

**North star.** P2 and P3 first, then P4 and P1, then P5, on lane D, measured per `lab/TARGETS.md` sections 1 and 1.1 on the fixed
writer trace (section 2.1). Correctness floor: O-REPLAY equality, atomicity, idempotency and durability after an abrupt transactor
stop on Postgres storage.

**Scope.** `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. Sam's decisions of 2026-11-09 (`lab/research/SAM-decisions-2026-11-09.md`):
lane D is Datomic on Postgres storage with two agent slots; Q107-S option C on every lane (`:_tx/change` and `:_tx/changed-entity` stay
stored and queryable as ordinary triples; a miss caused by their cost is reported as a miss with a TODO).

**Depends on.** EXP-DP01 (a Sonnet builder is moving lane D from dev storage to Postgres storage now). DN1 starts only after DP01's
durability probe passes. Dev storage numbers never count (R32: an abrupt transactor stop can lose acknowledged commits).

**Evidence base.** R29 (lane design, section 6 table), R32 (storage, sizing, durability probe), EXP-DF01 (feed route, accepted offline;
synthetic recorded pages only, no live P3 number), EXP-DA00 (RSS: transactor 352 to 570 MiB, gateway 311 to 523 MiB). Lane D has zero
P1 to P5 measurements today.

## 1. Each priority on Datomic with Postgres storage

The shape every request takes:

```
 TS driver (Mac host)
   | HTTP/1.1 keep-alive, tagged JSON
   v
 gateway peer JVM (our Clojure)  ---- transactions ---->  transactor JVM (serial pipeline, indexing jobs)
   | object cache, memory index,                              | log write: one autocommit INSERT per tx
   | log tail in memory                                       v   (Postgres WAL fsync before it returns)
   | cache misses: SELECT (read-only role) -------------> Postgres (datomic_kvs)
```

### P1: 256 pinned readers never block writers

| Part | What happens |
| --- | --- |
| Datomic native | Queries run in the peer against an immutable db value. `d/db` never contacts the transactor. A past basis is `(d/as-of db t)`. Reads take no locks. With Postgres storage, peer cache misses go to Postgres, not to the transactor JVM (the main reason R32 moved off dev storage). |
| Our gateway path | HTTP accept, JSON decode, basis resolution (Triplex position P to Datomic t through the gateway's in-memory position map), the `triplex/fact` rule set over `:f/live`, `:f/valid-from`, `:f/valid-to`, tagged JSON encode. The same gateway JVM also forwards every write. |
| Prediction `[E]` | Read p99 at 256 readers: 20 to 80 ms (inside the 100 ms bar) if the gateway has at least 2 CPUs. Writer commit p99 ratio to the zero-reader run: 1.1x to 1.6x. The 1.25x bar is at risk. |
| Expected bottleneck | Commits queue behind reads on the gateway's CPUs and HTTP worker pool (R29 section 6, P1 risk 1). The transactor itself is not touched by reads. Second: peer object cache churn sending reads to Postgres. |
| Evidence | R29 section 6 P1 row; R16 measured XTDB's shared-JVM coupling at about 5x commit service time at 4 readers, which Datomic's process split is meant to avoid. No Datomic measurement yet. |

### P2: commit p50 <= 10 ms, p99 <= 50 ms (5 to 25 fact bands, 256 readers running)

| Part | What happens |
| --- | --- |
| Datomic native | `transact` sends tx-data to the transactor; the serial pipeline applies `:db/cas`, uniqueness, tx functions; one log write to storage (one Postgres INSERT, WAL-fsynced); ACK and novelty broadcast to peers. Datomic "always awaits acknowledgment from storage before reporting that a transaction is complete". |
| Our gateway path | Build tx-data from the Triplex commit (about 6 datoms per fact, so a 10-fact command is about 60 datoms plus tx annotations, claim entity and, under option C, the `:_tx/change` and `:_tx/changed-entity` triples); scope-wide `:db/cas` on `:triplex.scope/position` (DA01); wait for db-after on the same peer; return `{t, position}`. |
| Prediction `[E]` | Zero readers: p50 4 to 9 ms (R29: 3 to 10 ms on dev storage, plus 0.5 to 3 ms WAL fsync per R32), p99 15 to 40 ms. With 256 readers: p50 6 to 14 ms, p99 25 to 70 ms. The p50 bar is a coin flip; the p99 bar holds only if the write path is isolated from reads. |
| Expected bottleneck | (1) The scope-wide CAS: every command in one scope serializes and concurrent commands on different subjects conflict and replay; in the 60 s bursts (750 facts/s, about 50 commands/s) replays add queueing. (2) Postgres WAL fsync inside the VM. (3) Option C datoms per commit. (4) `memory-index-max` backpressure during bursts. |
| Evidence | R29 section 4.3 and section 6 P2 row; R32 section 2.4 CPU paragraph. Published anecdotes: transact about 40 ms through a Cloud load balancer; Datomic writes 2 to 5x slower than Postgres (one practitioner). None on-prem on Postgres. |

### P3: feed lag p99 <= 250 ms with 256 readers

| Part | What happens |
| --- | --- |
| Datomic native | `d/tx-range` reads the log; the recent tail is in memory on every peer. `tx-report-queue` pushes each tx report to the peer. |
| Our gateway path (DF01, accepted offline) | `GET /v1/db/{db}/log?fromT=&limit=&waitMs=`: long-poll; report queue is only a wakeup hint; each wake re-reads `tx-range` at a fresh cut; projects identity datoms; Triplex stamp from `:triplex.tx/recorded-at`; non-Triplex transactions returned as `skipped`. The consumer checkpoint lives in FD01's host SQLite store. |
| Prediction `[E]` | Lag p50 5 to 30 ms, p99 40 to 150 ms with 256 readers. Inside the bar unless the gateway's CPU is saturated by readers. |
| Expected bottleneck | The consumer's durable SQLite write (one fsync on the host per checkpoint) and the gateway's HTTP pool shared with 256 readers. O-DOMAIN fanout through referenced entities (GS.06b, a location's minimum wage) needs a reverse-ref lookup that DF01 does not do yet; that is a correctness gap for P3's "affected subjects known", not only a latency item. |
| Evidence | DF01 REPORT rounds 1 to 3 (offline only; its sub-ms timings are diagnostics, not latency). R29 P3 row. |

### P4: current pulls p50 <= 5 ms, p99 <= 25 ms, >= 1,100 pulls per CPU-second

| Part | What happens |
| --- | --- |
| Datomic native | Pull or a parameterized Datalog query on the unfiltered current db (latest basis). Retracted datoms do not appear in the current view. Whether current and history live in separate index segments (so history depth does not raise read cost) is disputed (R18 says no; the unofficial internals guide says yes); DN1's depth test settles it. |
| Our gateway path | Subject to fact entities via `:f/live` (VAET on a ref), then each fact entity's attribute and typed value, 3 to 6 hops, then tagged JSON for every value. |
| Size of the work | Weighted pull mix is about 450 facts per pull (0.5 x 125 + 0.35 x 500 + 0.15 x 1,400), so about 2,700 datoms touched and 450 tagged JSON values per pull. 1,100 pulls per CPU-s leaves 0.9 ms of CPU per pull, or about 0.33 microseconds per datom including encoding. |
| Prediction `[E]` | p50 2 to 8 ms, p99 15 to 50 ms, 250 to 700 pulls per gateway CPU-s. **The throughput bar is likely missed by 1.5x to 4x;** latency is near the bar. History flatness: within 1.1x if current and history are separate, else 1.2x to 2x at depth 10. |
| Expected bottleneck | The fact-entity indirection (about 6 datoms per Triplex fact) and JSON encoding in the gateway, not Datomic's index lookup. |
| Evidence | R29 section 4.2 (6 datoms per fact) and P4 row; TARGETS 1.1 P4 bucket mix. No measurement. |

### P5: 100k activation <= 100 s, live p99 and commit p99 each <= 1.5x

| Part | What happens |
| --- | --- |
| Datomic native | One `as-of t` db value shared by all sweep workers; no lock, no writer wait; old segments stay until `gc-storage`. A second peer process can run the sweep with its own cache (Datomic's practice of separate peers per load pattern). |
| Our gateway path | 100k pulls at one basis plus W0 evaluation in the TS kernel plus publication of work items through the atomic outbox path (transactions through the same serial transactor). |
| Prediction `[E]` | At P4's predicted 250 to 700 pulls per CPU-s, 100k pulls need 140 to 400 CPU-s, so 100 s needs 2 to 4 dedicated cores on a second peer. Work-item publication: at least 20% of subjects change outputs (W0 floor), so at least 20k outbox entities; batched 100 per transaction that is about 200 extra transactions, small next to the pulls. Live p99 within 1.5x only if the sweep runs on its own peer and CPUs. |
| Expected bottleneck | Pull CPU (same as P4) and object-cache eviction if the sweep shares the live gateway. 100k also needs host disk Sam is reclaiming. |

## 2. The first measurement experiment (after DP01 lands)

### 2.1 Where it runs

| Item | Plan |
| --- | --- |
| VM | triplex2: 8 CPU, 20 GiB, through `lab/bin/engine.mjs` only, `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock`. Never ports 15442/17019, never `/Users/sam/projects/triplex-db`. |
| Pool | 19 of 20 GiB (`lab/config/slots.json`). Lane D's exclusive slot pair per R32 2.4: Postgres 1.0 GiB plus Datomic container 3.0 GiB = 4.0 GiB. To confirm against the current slots.json `memBytes` (unread in this draft). |
| CPUs | Disjoint cpusets: transactor 1 CPU, gateway 2 CPUs, Postgres 1 CPU; the TS driver on the Mac host. The broker (lane Q) and XTDB (lane X) slots keep their own cpusets; DN1 measured windows must not overlap another lane's measured window (record the other slots' state in every receipt). |
| Rung | 10k subjects for P1 to P4. P5 at 10k first, then 100k when disk is available. |

### 2.2 Ordered steps

1. **Bring-up check.** DP01's Postgres slot up; G0; record `SHOW fsync, synchronous_commit, full_page_writes, wal_sync_method`, image
   ids, config hashes, cpusets.
2. **Gates before any number** (section 2.4). If any fails, stop.
3. **P2 at zero readers.** Fixed trace (section 2.1 of TARGETS), open loop, per size band, 10-fact probe as diagnostic. Record transactor
   `TransactionMsec`, `MemoryIndexMB`, Postgres `pg_stat_wal` and commit timing, CAS replay counts.
4. **P2 with 256 readers.** Same trace segment and burst phase; the 256 readers run the P1 mix.
5. **P3 in the same windows as steps 3 and 4.** Commit time stamped at the gateway's ACK (publication instant on the host monotonic
   clock), consumer durable record via DF01's route and FD01's SQLite store; gaps, per-subject order, resume, three crash points.
6. **A/A on steps 3 to 5** (section 2.3).
7. **P4.** Single-client weighted mix, per-bucket p50/p99; throughput per gateway CPU from the cpuset quota; io-stats storage-tier reads
   per pull; history depths 1, 3, 10 on a matched 1,000-subject sample.
8. **P1 ladder.** 1, 4, 16, 64, 256 readers (1,024 stress) with the writer trace; one forced indexing job (`d/request-index`) per window as
   the maintenance event; 10% straddling reads; driver-recorded basis checked by the verifier.
9. **P5 approach.** 10k sweep on the same gateway first (baseline), then a second peer process (gateway 2, own cpuset) for the sweep with
   64 live readers and the writer; then 100k when disk allows.
10. **Report** per priority: number, bar, gap, bottleneck evidence. A miss is reported plainly with its size.

### 2.3 A/A rule

Run each measured configuration twice back to back on the same trace segment. If p99 differs by more than 1.15x between the two (the
Q60 margin used in R32), the window is noisy: find the noise source (other slots, host activity) before comparing anything. Report both
runs, never the better one.

### 2.4 Gates (all must pass before a number counts)

| Gate | Pass condition |
| --- | --- |
| O-REPLAY equality | Datom count and hash over the probe databases equal O-REPLAY's answer from the saved receipts, after every window |
| Atomicity | No read at any basis sees part of a command; every command's facts appear at exactly one t |
| Idempotency | 10% duplicate signals and 1% lost ACKs: each returns the original receipt `{t, position}` 100% of the time |
| Durability after a transactor kill (Postgres storage) | Abrupt stop of the Datomic container at a seeded moment, then `up`; every saved receipt resolves through `/operation/{id}` to its original `{t, position}`; 0 lost acknowledged commits; same for an abrupt Postgres stop (R32 D1, D2) |
| Option C | `:_tx/change` and `:_tx/changed-entity` present and queryable for every commit |

### 2.5 Predictions to record before running

P2 zero readers p50 4 to 9 ms, p99 15 to 40 ms; P2 at 256 readers p50 6 to 14 ms, p99 25 to 70 ms; P3 lag p99 40 to 150 ms; P4 p50 2 to
8 ms, p99 15 to 50 ms, 250 to 700 pulls/CPU-s; P1 writer ratio 1.1x to 1.6x; P5 at 100k needs 2 to 4 sweep cores for 100 s.

### 2.6 Stop rule

1. Stop at the first failed gate; report it; no performance number from that run.
2. Stop a step after two A/A failures in a row.
3. Stop the whole experiment once P2, P3, P4 and P1 each have one A/A-clean number at 10k; P5 at 100k is a separate run.
4. Stop immediately on any OOM kill or memory above 85% of a cap, and on any sign of another lane's measured window overlapping.

## 3. Known Datomic limits that could make a bar unreachable

| Limit | Which bar | Size `[E]` |
| --- | --- | --- |
| One serial transactor per system; every write in every database of that system goes through it | P2, P1 writer ratio | Fine at 15 facts/s; bursts of 50 commands/s with scope-wide CAS replays are the risk |
| Scope-wide CAS (DA01) serializes all commands in a scope | P2 p99 in bursts | Per-subject CAS (a classpath tx function) is the planned fix; until then p99 could exceed 50 ms in bursts |
| Storage fsync per commit (Postgres WAL) | P2 p50 | 0.5 to 3 ms of the 10 ms budget |
| `memory-index-max` backpressure "radically slows" transactions | P2 p99 during bursts and P5 publication | Depends on slot heap (256m at s1 per R29); watch `MemoryIndexMB` |
| About 6 datoms per Triplex fact (fact-entity mapping) plus JSON encoding | P4 throughput, P5 wall time | Likely 1.5x to 4x short of 1,100 pulls/CPU-s; a native attribute view (R29 section 5 later arm) is the workaround |
| No valid time in Datomic (attributes plus predicates) | P4, P1 | Expired valid-time facts stay current until retracted; extra predicate cost per fact |
| Peer holds up to `memory-index-max` per connected database | Tenancy (GS.15), P1 | 1,000 tenant databases on one peer is a memory risk |
| Excision is slow, batched, and leaves copies until `gc-storage` | GS.16, not P1 to P5 | A few thousand datoms per batch on a live system |
| No source published | All | Engine repair is impossible; only workarounds |

## Still to do (before this brief is final)

1. Read `packages/datomic` (gateway Clojure and TS adapter): confirm the write path's executor, HTTP pool, per-route threading, and
   whether option C's `:_tx/change` and `:_tx/changed-entity` are already written on lane D.
2. Read `lab/config/slots.json` datomic slots (memBytes, cpus, cpuset) and `lab/bin/engine.mjs` datomic paths; fix section 2.1 sizes.
3. Read R50's lane D notes and any DP01 brief or report; align step order and gates with DP01's durability probe.
4. Read `lab/config/datomic/` (transactor.properties, entrypoint) for memory-index and write-concurrency settings.
5. Check the NS driver (`gate.mjs NS`) supports `--lane datomic`, and name the exact commands for each step.
6. Tighten predictions where code facts change them; independent review.
