# R17: What QLever 0.6.0 offers for Sam's five priorities, at every layer including source of truth

**Written:** 2026-11-07. **Engine:** `adfreiburg/qlever:0.6.0` (digest `sha256:37d5ede1...49a78ec`, source tag `v0.6.0`, sha `6c5861a`). Source cites are `path:line @ 6c5861a`, relative to `references/qlever`.
**North star:** P1 to P5 in `lab/NORTH-STAR.md`, bars in `lab/TARGETS.md` section 1, scope in `lab/SCOPE.md` (QLever stays a candidate for every layer; gaps become workarounds).
**Builds on, not repeated:** R2 (capabilities), R5 (semantic blockers), R8 (write lifecycle), R10 (recursion), R13 (log of record), PLAN contracts C2 to C4.

## How to read this report

- **Evidence labels.** `[S]` pinned source. `[P]` measured by me in this session. `[W]` web page, unauthenticated. `[E]` my extrapolation. `[R8]` etc. = taken from the named prior report.
- **Confidence.** High = measured repeatedly or source and probe agree. Medium = one run, or one scale. Low = extrapolated.
- **Probe environment (read before trusting any absolute number).**
  - The pool was 9.0 of 11.0 GiB reserved (xtdb-dev 3.0, qlever-dev 2.5, R16's xtdb-s2 3.5), so slot `s3` (3.5 GiB) did not fit. I used a research-probe container `tx2-probe-r17` (1.86 GiB, 2 CPU quota, port 7066 in the reserved probe range 7061 to 7069, same pinned image, `DOCKER_HOST` = triplex2 socket), the same pattern as R2 and R8. The shared dev QLever and every other slot were not touched. The container and its volume were removed at the end; pool status shows no R17 reservation.
  - The VM was shared and busy: host load average 8 to 15 during the runs, `qlever-dev` and `xtdb-dev` at 100 to 200 percent CPU. Absolute latencies move by up to 2x to 3x between runs (the same baseline measured p50 43, 69 and 115 ms in three runs). Ratios inside one adjacent pair of runs are more reliable than numbers across runs. Server CPU seconds (from `/proc/<pid>/stat`) are used wherever "per core" matters.
  - Server flags: `-j 4 -m 600M` (1200M for exports) `-c 128M -e 64M --persist-updates --no-patterns --no-access-check --no-metrics-log` unless a section says otherwise. Clients ran inside the container, one new TCP connection per request (section 0 explains why).
  - Scale: the main index `A` has 68.98M triples (current graph 9.46M triples for 100k placements, about 8.5M compact ledger assertions of 7 triples). Year one is 100m active facts and 150M to 500M retained, so roughly 10x to 50x larger. Every scale claim beyond 74M triples is `[E]`.
- **Everything is in** `/Users/sam/Claude/Projects/triplex-db-2/R17-qlever-northstar/` (`scripts/`, `out/`, `feed/`). The synthetic world generator is `scripts/world.mjs`.

---

## 0. Skim layer

### 0.1 Verdicts

| # | Question | Verdict | Confidence |
|---|----------|---------|------------|
| 1 | P1 pinned reads that never block writers | **Semantics met natively, performance bars not met.** One request is one snapshot; 0 wrong answers and 0 errors in the 26,413 pulls stored in the ladder, `-j` and sweep windows (writer running in most). No lock stalls anything. But a 2-CPU server saturates at 4 readers (about 65 pulls/s, 34 per core), read p99 is 0.5 s at 16 readers and 1.4 s at 64, and the writer is CPU-starved by readers (command latency 15 ms alone, 114 ms with 4 readers, 826 ms with 64). A rebuild at 69M triples took 54 s and pushed read p50 from 108 ms to 1.4 s and write latency to 13 to 25 s with no rejection. A past-pinned read through the ledger is exact (0 changed answers while the writer modified those exact subjects) but costs 200 to 500 ms. | High (semantics, saturation), Medium (absolute latencies, noisy host) |
| 2 | P2 per-subject commit through the broker | **Guard, idempotency, read-your-own-write and atomic outbox all work natively; latency bar met only at an empty delta.** ACK p50 from the host (fsync 2.8 ms plus guarded update): 11.2 ms at delta 0, 33.8 ms at 100k, 129 ms at 500k. Update cost is about 6 ms plus 0.23 to 0.29 ms per 1,000 delta triples. 400 of 400 reads right after the ACK saw the write. Group commit reaches 112 commands/s (1,118 facts/s) at 64 concurrent clients, at 560 ms p50. | High |
| 3 | P3 change feed | **The log of record meets every P3 bar in a host test; QLever is not needed for the feed.** Zero gaps, zero per-subject order violations, exact resume after `kill -9` (10 frames replayed from the checkpoint, none missing), lag near zero. One hazard: a tailing consumer sees a frame about 3 ms before its fsync returns, so it must read only up to a durable watermark. A QLever-fed read layer can expose its own feed with a ledger `rp` range query at 20 to 41 ms per 100 positions. | High (log), Medium (QLever-side) |
| 4 | P4 current-value pull, separate from history | **Bars not met natively: p50 23 to 33 ms (bar 5), 35 to 45 pulls/s per core (bar 1,100).** The pull cost is flat from 7M to 74M total triples and does not change when 6x more ledger is added to the same current graph, so history size does not hurt the current graph at the sizes tested. A denormalized pull-bundle row set reads at p50 1.2 ms and 770 to 870 pulls/s per core, within about 1.3x of the bar, at the price of write amplification equal to each entity's fan-in. | High (numbers), Low (extrapolation to year-one size) |
| 5 | P5 release sweep | **Met in time, not met for live-traffic isolation, and pinned only as a single request.** One streamed request exports the whole 9.46M-row current graph in 33 s on one core and stays pinned through 677 updates and a rebuild swap. Set-at-a-time batches reach 815 to 825 pulls/s per core (100k pulls in about 120 to 134 s). A multi-request sweep over the current graph reads 31 different publications in 20 s at 1.5 commands/s. Running the sweep in the live server raises live read p99 by 1.7x to 3x. | High (pinning), Medium (isolation numbers) |
| 6 | Requirements | **Tenant isolation: yes, one small server costs 4 to 6 MB unique memory. Atomic outbox: yes. Real erasure: delete plus `rebuild-index` does NOT remove the value from the vocabulary; a full reindex or crypto-shredding is required. Silent precision loss: eight places found; a 6-kind write validator turns all of them into typed errors, with 0 wrong round trips in 6,241 accepted values.** | High |

### 0.2 Findings that change the plan

1. **QLever's HTTP server sets no `TCP_NODELAY`; a reused (keep-alive) connection adds about 40 ms to every response.** Measured tiny query: keep-alive p50 41.8 ms, new connection each time p50 0.37 ms. Source: the server only sets `reuse_address` on the acceptor (`src/util/http/HttpServer.h:155-156 @ 6c5861a`). Every client, including the C2 broker, must open a connection per request (or the engine gets a one-line patch). [P][S]
2. **Every update empties the whole result cache** (`src/engine/Server.cpp:1303-1309 @ 6c5861a`). Combined with the planner (finding 3), any query shape that relies on a cached sub-result (the 1,035,459-row path edge relation, the filtered 8.5M-row ledger scan) pays full price again after each commit. [S][P]
3. **The planner does not push a temporal `FILTER` or a `VALUES` binding into the ledger scan.** `FILTER(?rp <= P)` makes it scan and sort all 8.5M `c:rp` rows (0.6 to 0.9 s, or HTTP 500 "Tried to allocate 64 MB" at `-m 600M`). The robust exact-basis form returns `?rp` and `?rt` and filters in the kernel. [P]
4. **Delete plus `rebuild-index` leaves the deleted literal in the vocabulary.** The rebuild "merges existing and new words" (`src/index/IndexRebuilder.cpp:491-500 @ 6c5861a`); the rebuilt vocabulary had 60,020 words against 60,015 for a control index that never held the values. `previous.*` directories and the server log also keep the plaintext. [P][S]
5. **A pull is dominated by a fixed cost per round trip, not by reach.** A `VALUES` join round costs 3.4 to 5 ms (plus 0.4 to 0.5 ms per entity) and causes about 1,100 minor page faults on every index of 9M triples or more that I tried, against about 90 on a 1M-triple index and about 70 for a direct subject scan. Cause not identified (no ptrace or perf in the image). [P]
6. **Reads, writes and rebuilds compete for the same CPUs with no priority.** The update thread is one thread (`src/engine/Server.h:111 @ 6c5861a`); there is no admission control. [S][P]

### 0.3 Recommended role of QLever per layer

```
 commands --> [ HOST BROKER + LOG (F_FULLFSYNC, 3 ms) ]  <- decision, claims, feed, outbox
                     |  pure quad frames, idempotent replay
        +------------+-----------------+----------------------+
        v                              v                      v
 QLever READ REPLICAS            QLever HISTORY          QLever ANALYTICAL
 (current graph, small           (ledger graph,          (own process, own cores,
  delta, 1 process per           exact-basis pulls,      streamed export or batched
  2 cores, fed from log)         audit, explain)         VALUES; pinned by one request)
 P1 reads, P4 with bundle rows   p50 200-500 ms          P5 sweeps, plan impact
```

| Layer | QLever role | Why |
|-------|-------------|-----|
| Source of truth | **Not alone.** Log plus broker is the truth (C2); QLever is a derived copy. | No fsync, no rollback (R8); publication cost grows with delta (section 2). |
| Change feed | **Not QLever.** The host log. | Section 3. QLever can mirror it (`rp` range query). |
| Current index | **Yes as read replicas** for P1; P4 only with bundle rows or small per-tenant indexes. | Sections 1 and 4. |
| History index | **Yes.** | Exact-basis reads are exact; slow but acceptable for explain and audit. |
| Analytical copy | **Best fit.** | Bulk scans and set-at-a-time joins are where it is fast (section 5). |

---

## 1. Q1: P1, pinned reads that never block writers

### 1.1 Verdict

1. **Pinning is native and exact.** A request takes one located-triples snapshot when its execution context is constructed (`src/engine/QueryExecutionContext.h:255-262 @ 6c5861a`). In my runs every pull returned exactly the row count the independent generator predicts (`bad = 0`, `err = 0` in every stored window, 26,413 pulls in total, writer running in most of them). Naming the basis costs nothing: the first-hop query that also reads `<wm> <pos> ?pos` took 40.5 ms against 41.1 ms without it (same cache state), and it returned the marker with every row. [P]
2. **No lock couples readers and the writer, but they compete for CPU with no priority.** On a 2-CPU quota the server saturates at 4 closed-loop readers. Goodput stays at 60 to 70 pulls/s from 4 to 64 readers (the bar says it must not fall; it does not) while p50 rises with queueing. Writer commands wait behind reads. [P]
3. **The P1 bars at 256 and 1,024 readers cannot be met on 2 cores.** I did not run 256 or 1,024; the 64-reader point already has read p50 0.9 s and writer p50 0.83 s. [E] 256 readers at the same 65 to 70 pulls/s would queue about 3.6 s. Reads scale only with replicas.
4. **Updates and rebuilds do not stall readers by locking, but a rebuild saturates the CPUs.** [P] below.
5. **A past-pinned read through the ledger graph works and is exact, but needs a query shape the planner can handle and costs 3x to 9x a current pull.** [P] below.

Confidence: High for 1, 2, 4 (qualitative), Medium for absolute latencies (noisy shared host), Low for 3 beyond 64 readers.

### 1.2 Evidence: reader ladder with and without the fixed writer trace

Index `A`, `-j 4`, closed-loop readers, pull = frontier loop over 9 ref predicates, depth 4, mean reach 139 facts (4.4 requests per pull), writer = 1.5 commands/s of 10 facts (guarded update, 94 triples each). Raw: `out/b_p1_A-j4.json`.

| Readers | No writer: pulls/s, p50, p99 (ms) | With writer: pulls/s, p50, p99 (ms) | Writer command latency p50 / p99 (ms) | Server cores |
|--------:|-----------------------------------|-------------------------------------|----------------------------------------|-------------:|
| 0 (writer alone) | n/a | n/a | 15.5 / 39.7 | 0.02 |
| 1 | 29.6, 31, 77 | 29.4, 32, 63 | 60 / 126 | 0.9 |
| 4 | 64.9, 60, 130 | 56.4, 66, 192 | 114 / 447 | 1.9 |
| 16 | 65.9, 232, 501 | 60.0, 237, 486 | 278 / 684 | 1.9 |
| 64 | 70.3, 901, 1,375 | 64.6, 956, 1,393 | 826 / 1,413 | 1.9 |

- Read goodput with the writer is 8 to 13 percent lower at 4, 16 and 64 readers: the writer's CPU. Read p99 changed by +48 percent at 4 readers and by -3 to +1 percent at 16 and 64. [P]
- Client CPU was 0.04 to 0.07 core, so the clients did not take the server's quota. [P]
- The writer's latency is its read of the old values (about 5 to 7 ms alone) plus the guarded update; both queue behind reads. At 4 readers the P1 writer bar (p99 at most 1.25x its zero-reader baseline) is missed 11x. [P]

### 1.3 Evidence: `-j` and paced load

16 readers, repeated for `-j` 1, 2, 4, 16 (restart from the same delta file each time). Raw: `out/b_p1j_j*.json`.

| `-j` | Closed, no writer: pulls/s, p99 ms | Closed + writer: pulls/s, p99 ms | Writer p50 / p99 ms (closed) | Paced 16 x 1/s + writer: read p99 ms, writer p50 / p99 ms |
|-----:|------------------------------------|----------------------------------|------------------------------|-----------------------------------------------------------|
| 1 | 80, 334 | 52, 554 | 282 / 807 | 159, 42 / 328 |
| 2 | 65, 397 | 80, 332 | 165 / 450 | 75, 37 / 150 |
| 4 | 77, 389 | 72, 366 | 201 / 571 | 225, 44 / 277 |
| 16 | 92, 361 | 77, 403 | 272 / 1,084 | 83, 40 / 182 |

- **No consistent `-j` effect.** The spread inside one `-j` value (52 to 80 pulls/s) is as large as the spread between values. [P] (`-j` is "the number of queries that can be processed simultaneously", `src/ServerMain.cpp:84 @ 6c5861a`.)
- **Even at 25 percent CPU utilisation the writer is 2.5x to 3x slower than alone** (p50 37 to 44 ms against 15.5 ms) and p99 is 150 to 330 ms. [P] So the writer needs CPU it does not have a way to reserve inside one process.

### 1.4 Evidence: rebuild under load

Index `A` (68.98M triples) plus a 500k delta, 16 paced readers (1 pull/s each), writer 1.5 commands/s, `-j 4`, 2 CPUs. Raw: `out/rebuild_load_A-j4.json`.

| Phase | Reads p50 / p99 (ms) | Write command latency p50 / p99 (ms) |
|-------|----------------------|--------------------------------------|
| Before (500k delta) | 108 / 597 | 250 / 1,525 |
| During the 53.9 s rebuild | **1,425 / 3,181** | **12,955 / 25,387** |
| First 20 s after the swap (cold files, backlog) | 206 / 453 | 166 / 17,952 (p90 14.7 s) |
| 20 to 60 s after (delta now 0) | 61 / 458 | 37 / 293 |

- 0 read errors, 0 wrong answers, 0 writer errors: every update was accepted and applied (R8's result holds). RSS peak 1,183 MB. [P]
- The cost is CPU saturation by the rebuild's threads, not a lock. R8 measured 1.8x slower updates on 3 CPUs; with a 2-CPU quota and 16 live readers write latency p50 went from 250 ms to 13 s (about 50x) and read p50 from 108 ms to 1.4 s (13x). [P]
- A single rebuild at the current-graph-only size (9.46M triples) took 5.2 s idle and 6.7 s with writes (longq tests). [P]
- Levers I did not test: `rebuild-max-concurrent-permutation-pairs` (`src/global/RuntimeParameters.h:88-95 @ 6c5861a`, per R8 the main interference lever) and doing the rebuild in a different process.

### 1.5 Evidence: read pinned to a past publication through the ledger graph

Raw: `out/b_pin_A.json`, `scripts/pin2.py`.

- **Exactness.** At basis P = 1,999,999 (below every writer position) 20 ledger pulls returned exactly the oracle's row count (0 mismatches). While the writer (20 commands/s, 396 commands) modified exactly the 4 probed subjects, 40 repeated pinned pulls at the starting marker returned byte-identical answers (0 changed), while the current-graph answer changed for 4 of 4 subjects; the pull at the new head saw 1,027 rows against 187 at the old basis. [P]
- **Cost.** Ledger pull p50 198 ms (p90 526 ms, max 1.7 s) against 75 ms for the current-graph pull of the same roots in the same minute (about 2.6x); 239 to 496 ms while the writer runs (cache emptied by each commit). [P]
- **Query shape matters (finding 3).** The obvious form with `FILTER(?rp <= P)` and `OPTIONAL { ?a c:rt ?rt } FILTER(!BOUND(?rt) || ?rt > P)` failed with HTTP 500 at `-m 600M` and took 3 to 6 s per hop when it ran. The form that works returns `?rp` and `?rt` as columns, one `UNION` branch per entity with the entity as a constant (not `VALUES`), at most 8 entities per request (30 entities timed out), and applies both tests in the kernel. [P]

### 1.6 Design implication

- Run reads on separate QLever processes (read replicas) fed from the log; each is a derived copy that can be replaced. The writer's server only validates and applies. One replica per 2 cores gives about 65 to 90 pulls/s; to reach the P1 bars at 256 readers the pull itself must get cheaper (section 4) or the replica count grows.
- Always name the basis in the same query as the data (marker triple in the same request); a second request is a different snapshot.
- Do rebuilds on a standby generation and swap (R13 section 4.3) so live replicas never run a rebuild.
- Past-pinned reads go through the ledger with kernel-side filtering and bounded `UNION` chunks; budget 200 to 500 ms per pull.

---

## 2. Q2: P2, small atomic idempotent commits through the broker

### 2.1 Verdict

1. **The guarded single-operation update is accepted and behaves as C2 requires.** `DELETE { old terms, marker=P } INSERT { new terms, ledger quads, marker=P+n, claim triples } WHERE { marker=P }` returned HTTP 200 in every run (several thousand commands; the only HTTP 400s came from my own malformed terms in the first writer). Re-sending the identical update after publication returned 200 with `delta-triples.operation = {deleted 0, inserted 0, total 0}` and left the marker unchanged: the guard turns a duplicate into a detectable no-op (the engine still pays its fixed cost, 49 ms at 100k delta). [P]
2. **Latency is the delta, as R8 predicted, and the P2 bar needs a delta of at most about 10 to 20k triples.** [P] below.
3. **Read-your-own-write after publication: 400 of 400 reads issued right after the ACK saw the new value** (fresh connection, other snapshot). [P]
4. **Claims in the log resolve lost ACKs; the QLever claim triple is a cheap second witness** (`ASK` p50 4.2 ms, p99 24 ms). [P]
5. **The outbox is atomic.** 540 commits whose guarded update also inserted an outbox item; a checker query ran 3,116 times looking for a claim without an outbox item or the reverse: 0 torn snapshots. [P]
6. **Terms read back from QLever are not safe to use as delete terms in general.** TSV drops datatypes (`2025-09-13T05:54:58.517Z` without quotes broke my first writer with HTTP 400), JSON gives `xsd:int` for every integer and 13 digits for decimals. The delete side of a frame must come from the broker's own record of what it wrote (R13's pure quad frames), never from a read-back. [P]

Confidence: High.

### 2.2 Evidence: host-side end-to-end ACK latency

`scripts/broker_e2e.mjs` on the macOS host: write a 1 KiB frame, `fs.fsync` (F_FULLFSYNC on macOS, R13), then POST the guarded update through the VM port forward on a new connection, ACK after HTTP 200. Old values come from the broker's record (no engine read). Command = 10 facts about one placement (94 triples). 150 commands per row, sequential. Raw: `out/p2_latency_*.json`; host runs in `out/session-raw-outputs.txt`.

| Delta (triples) | Host fsync p50 (ms) | QLever update p50 / p99 (ms) | **ACK p50 / p99 (ms)** | In-container update p50 / p90 / p99 (ms) |
|----------------:|--------------------:|------------------------------|------------------------|-------------------------------------------|
| about 0 | 2.8 | 8.6 / 13.6 | **11.2 / 16.3** | 6.7 / 9.5 / 16.8 |
| 100,000 | 2.9 | 30.9 / 82.3 | **33.8 / 84.3** | 30.4 / 41.9 / 87.2 |
| 500,000 | 3.1 | 125 / 314 | **129 / 318** | 121.6 / 151 / 274 |
| 1,000,000 | n/a | n/a | n/a | 294 / 592 / 1,302 |

- Server-side phases at p50 (ms): delta 0 total 5 (operations 2, metadata 1, snapshot 1, disk 1); 100k total 29 (6, 10, 3, 8); 500k total 120 (6, 41, 26, 45); 1M total 293 (9, 83, 83, 107). [P]
- Model: update ms about 6 + 0.23 x (delta/1000) up to 500k, 0.29 at 1M. P2's bar (p50 at most 10 ms, p99 at most 50 ms) is met at delta about 0 only for p99 (16 ms) and misses p50 by 1.2 ms; p99 at most 50 ms holds up to about 40k delta triples. [E]
- The host to VM hop (ssh port forward) adds about 1 to 2 ms on a new connection. [P]
- Adding an engine-side read of the old values (what my first writer did) adds 5 to 7 ms. [P]

### 2.3 Evidence: group commit of concurrent subjects

`scripts/b_p2.py group`: C closed-loop clients, one applier that takes everything queued (maximum 64) into one guarded update. Delta started at 100k and drifted upward during the run (up to about 400k at the end), so the larger rows are conservative. Raw: `out/p2_group_D100k.json`.

| Clients | Commands/s | Facts/s | Mean group | Command latency p50 / p99 (ms) | Apply p50 / p99 (ms) |
|--------:|-----------:|--------:|-----------:|---------------------------------|----------------------|
| 1 | 19.5 | 195 | 1.0 | 49 / 133 | 49 / 133 |
| 4 | 26.2 | 262 | 2.0 | 140 / 341 | 71 / 196 |
| 16 | 62.7 | 627 | 8.0 | 241 / 395 | 125 / 205 |
| 64 | 111.8 | 1,118 | 32.0 | 560 / 923 | 263 / 623 |

The fixed bar of 15 facts/s average and the 750 facts/s burst are both sustainable on throughput (1,118 facts/s at 64 clients), at 0.5 s latency during the burst. The delta grows by about 11k triples/s at that rate, so a 1M ceiling is reached in about 90 s. [P][E]

### 2.4 Workarounds and what each costs

| Option | Effect on P2 | Cost / risk |
|--------|--------------|-------------|
| A. ACK at log fsync (3 ms), publish to QLever asynchronously, serve read-your-own-write from a broker overlay of unpublished quads merged into the pull | p50 about 4 to 5 ms, independent of delta | Overlay merge in the kernel for every pull of a touched subject; C2.4 ("ACK follows publication") must change |
| B. Keep delta at or below 15k triples by rebuilding the current-only index often | Meets p50 at about 12 ms | 100 triples/command is 150 commands; at 1.5 commands/s that is a rebuild every 100 s; a 9.46M-triple rebuild takes 5 to 7 s idle, a 69M-triple one 54 s under load. Works only for a small current index (per tenant, or sharded below about 10M triples). Not feasible at year-one size |
| C. Upstream fixes: #3607 merged 2026-10-06 (snapshot creation proportional to the update), #3267 and #3612 open (metadata update) | Authors report 700 ms to 60 ms per update at 500k delta on Wikidata [W] | Not in 0.6.0; needs a newer image or backport; I could not run it |
| D. `-o` (only PSO and POS permutations) | Would cut located-triple work by about 3x | Disables predicate variables, so `?s ?p ?o` pulls fail; not tested |

### 2.5 Design implication

- Commit path: log fsync (3 ms) is cheap; the QLever publish is the problem. Pick A (change C2.4 to "ACK after the durable log frame; reads at the returned position merge the overlay") or B for small per-tenant indexes.
- The guard and the claim triple can stay exactly as in C2.
- The broker must open a new connection per request (section 0 finding 1) and must keep its own current-value record for delete terms.

---

## 3. Q3: P3, change feed

### 3.1 Verdict

1. **The log of record is the feed, and it meets every P3 bar in a host test.** Zero gaps, zero per-subject order violations, exact resume (`kill -9` of the consumer, restart from the checkpoint, 0 missing, 10 frames redelivered), lag well under 250 ms. Frames carry `entity`, `attr`, `vf`, `vt` per fact (10 facts per frame in the test), so "entity, attribute and valid-time range affected" is a property of the frame, not of the engine. [P]
2. **A tailing consumer sees a frame before its fsync returns** (median 2.6 to 3.2 ms before the producer's post-fsync timestamp). A crash right then would leave the consumer holding an entry that was never durable. The consumer must read only up to a durable watermark that the broker publishes after the fsync. [P]
3. **QLever can mirror the feed from its own ledger** if it is only a read layer: an `rp` range query returns the next 100 positions in 20 to 41 ms, flat in history position. The obvious `VALUES` of transaction IRIs costs 2 to 3.3 s (planner, finding 3). [P]

Confidence: High for the host log; Medium for the QLever-side query (one index, cache cleared per run).

### 3.2 Evidence: host log and consumer

`scripts/feed_sim.mjs`: producer appends a framed record (8-byte header with CRC32C, JSON payload, 10 facts) and calls `fs.fsyncSync`; consumer is a separate process using `fs.watch` or polling; checkpoint = (LSN, byte offset) written tmp + fsync + rename every 50 frames. Raw: `out/feed_runs.log`.

| Run | Frames | Append + fsync p50 / p99 (ms) | Missing | Redelivered | Order violations | Lag vs post-fsync stamp p50 / p99 / max (ms) |
|-----|-------:|-------------------------------|--------:|------------:|-----------------:|-----------------------------------------------|
| 1.5 cps, watch | 69 | 3.5 / 7.2 | 0 | 0 | 0 | -3.2 / 0.05 / 0.05 |
| 1.5 cps, poll 1 ms | 53 | 3.5 / 5.7 | 0 | 0 | 0 | -2.7 / -0.5 / -0.5 |
| 1.5 cps, poll 5 ms | 54 | 3.5 / 6.7 | 0 | 0 | 0 | -0.9 / 3.0 / 3.0 |
| 75 cps burst, watch | 1,061 | 3.0 / 4.5 | 0 | 0 | 0 | -2.8 / -1.1 / 22 |
| back-to-back (no sleep) | 3,252 | 2.7 / 5.6 (max 24) | 0 | 0 | 0 | -2.6 / 0.4 / 4.8 |
| 75 cps, consumer `kill -9` at about 7 s, 3 s outage, resume | 1,431 | 3.0 / 4.5 | 0 | 10 | 0 | catch-up p90 0.95 s, max 3.0 s (the outage) |

Negative lag = the consumer saw the frame before the producer's fsync returned. [P]

### 3.3 Evidence: QLever-side feed queries

Index `A`, cache cleared before each run, 5 runs, median. Raw: `out/session-raw-outputs.txt` (`scripts/b_feedq.py`).

| Query | Mid-history (P = 500,000) | Old (P = 1,000) | Head |
|-------|--------------------------:|----------------:|-----:|
| `rp` range, `FILTER(?rp > P && ?rp <= P+100)`, 100 positions | 35.8 ms, 500 rows | 41.2 ms, 600 rows | 20.4 ms, 1,000 rows |
| `VALUES` of 100 transaction IRIs | 3,330 ms | 2,161 ms | 2,347 ms |
| `UNION` of 10 transaction-IRI constants | 88 ms | 94 ms | 103 ms |
| Marker poll (cursor of a read layer) | 1.1 ms | | |

### 3.4 Design implication

- Feed = log segments on the host. The consumer API is "frames after LSN n, up to the durable watermark". Resume is a checkpoint of (LSN, offset); redelivery of up to one checkpoint interval is handled by LSN dedupe.
- A read layer that needs its own cursor uses the marker triple (1 ms poll) and the `rp` range query; never `VALUES` of IRIs against the ledger.

---

## 4. Q4: P4, current values separate from history

### 4.1 Verdict

1. **Native pull cost is 23 to 33 ms at p50 and 35 to 45 pulls per server core per second, independent of reach.** Bars (p50 5 ms, 1,100 per core) are missed by 5x to 6x and 24x to 31x. [P]
2. **History size does not change it** at the sizes tested: adding a 59.5M-triple ledger to the same 9.46M-triple current graph left pulls at 22.9 ms against 24.5 ms; the ledger-to-current ratio from 7x to 88x (7M to 74M total triples) stayed within 24 to 39 ms. [P]
3. **A pull-bundle row set cuts a pull to one scan: p50 1.2 ms, p99 3.9 ms, 770 to 870 pulls per core per second**, about 1.3x short of the throughput bar. The price is write amplification. [P]
4. **A small index is much faster per pull** (0.95M triples: p50 4 to 10 ms, 100 to 225 per core) but the effect is a step with total index size, not with history: every index from 7.4M to 74M triples sits at 24 to 39 ms. [P]

Confidence: High for 1 and 3, Medium for 2 and 4 (noisy; one build per size), Low for any claim above 74M triples.

### 4.2 Evidence: pull forms (depth 4, ref predicates = 9, uniform roots)

Single client, sequential, cache cleared once, server CPU from `/proc`. "Path" = one query `<root> (p1|...|p9){0,4} ?x . ?x ?p ?o`. "Frontier" = one `VALUES` query per hop. Mean reach 139 facts, p50 113, p99 562, max 3,459 (oracle, 100,000 roots). Raw: `out/b_pull2_*.json`, `out/b_pull1.json`.

| Index | Form | p50 / p99 (ms) | Server CPU per pull (ms) | Pulls/s per core |
|-------|------|----------------|--------------------------|-----------------:|
| A (69M: current + ledger) | path | 23.0 / 58.5 | 22.9 | **43.6** |
| A | frontier | 32.2 / 59.8 | 28.8 | 34.7 |
| Acur (9.46M: current only) | path | 24.5 / 49.0 | 24.3 | 41.1 |
| Acur | frontier | 35.1 / 97.1 | 31.5 | 31.8 |
| A, ~80-fact pulls (30) | path / frontier | 18.5 / 26.4 | 24.7 / 26.3 | 40.5 / 38.0 |
| A, ~1,000-fact pulls (30) | path / frontier | 22.1 / 35.8 | 24.0 / 34.3 | 41.7 / 29.1 |

- Depth 3, 4, 6: 36.9, 33.5, 35.8 ms (the world is 3 to 4 hops deep, so reach barely grows). [P]
- Every answer matched the oracle (0 mismatches in more than 600 pulls). [P]
- The path form rebuilds a 1,035,459-row union of the 9 predicates for every query it cannot take from the cache, and the cache is emptied by each update. I measured the path form only without a writer. [P][S]

### 4.3 Evidence: where the time goes

| Probe (index H10, 73.9M triples unless stated) | p50 (ms) | Server CPU (ms) | Minor page faults |
|-----------------------------------------------|---------:|----------------:|------------------:|
| direct `GRAPH <cur> { <s> ?p ?o }` | 1.9 | 1.9 | 75 |
| `VALUES` of 1 root joined to `?s ?p ?o` | 3.4 | 3.4 | 1,116 |
| `VALUES` of 8 roots | 4.9 | 4.8 | 1,120 |
| full 4-hop pull | 24.6 | 23.3 | 5,169 |
| same, index Hnone (0.95M triples) | 0.7 to 1.0 per round | 1.1 | 87 |
| same, index Acur (9.46M) | 6.8 per round | 6.5 | 1,264 |

- Per-round cost is 3.4 to 6.5 ms plus 0.4 to 0.5 ms per entity; reach hardly matters. `MALLOC_*` and jemalloc `MALLOC_CONF` decay settings did not change the fault count. [P]
- The permutation block is 250 KB uncompressed per column and is a compile-time constant, not an index-build setting (`src/index/ConstantsIndexBuilding.h:96-102 @ 6c5861a`; no `qlever-index` option). A smaller block would reduce per-round cost on a point lookup; I could not test it without rebuilding the engine. [S]

### 4.4 Evidence: history size

| Index | Total triples | Ledger depth | Pull p50 (ms) | Server CPU (ms) | Pulls/s per core |
|-------|-------------:|--------------|--------------:|----------------:|-----------------:|
| Hnone (10k placements) | 0.95M | none | 4.1 and 10.1 (two runs) | 4.5 and 9.8 | 225 and 102 |
| H0 | about 7M [E] | live assertion only | 35.5 | 37.8 | 26.5 |
| H1 | about 14M [E] | 1 superseded version per fact | 32.2 | 32.3 | 31.0 |
| H3 | about 28M [E] | 3 | 40.4 | 39.3 | 25.5 |
| H10 | 73.9M | 10 | 25.1 | 23.6 | 42.4 |
| Acur vs A (100k placements) | 9.46M vs 68.98M | none vs live | 24.5 vs 23.0 | 24.3 vs 22.9 | 41.1 vs 43.6 |

No monotone growth with history depth from 7M to 74M; the 4x to 8x step between the 0.95M-triple index and the 7M-triple one is also present in the ledger-free Acur (9.46M, 33.6 ms), so it comes from total index size, not from history. Confirming the bar "flat as retained history grows (depths 1, 3, 10)" for the current graph: **met within noise** (24 to 39 ms at every depth). At year-one size (1 to 3.5 billion triples) the plateau is unmeasured. [P][E]

### 4.5 Evidence: bundle rows (upper bound for a one-scan pull)

Index Abun = Acur plus, for 10,000 roots, one literal row per fact in the depth-4 reach (`<root> <urn:pb:row> "x\tp\to"`), 1.37M extra triples. One query `SELECT ?r WHERE { <root> <urn:pb:row> ?r }`, 200 random roots, cache cleared: p50 1.17 to 1.27 ms, p99 2.7 to 3.9 ms, server CPU 1.15 to 1.30 ms (770 to 870 pulls/s per core), 0 mismatches against the oracle row count. [P]

Write amplification of keeping those rows current (by the generator's structure, `[E]`): a fact on a placement, task, form or doc touches 1 bundle; a worker about 1.4 placements; a branch about 200 bundles; an org about 2,000. A broker would need a reverse-reach index to find the bundles to rewrite.

### 4.6 Workarounds, ranked

| # | Workaround | Expected effect | Cost / risk |
|---|------------|-----------------|-------------|
| 1 | Bundle (support) rows for hot subject types, maintained by the feed consumer | 1.2 ms, 770 to 870 per core | Fan-in write amplification; hub entities (branch, org) need a size cap; double the current graph |
| 2 | Small per-tenant indexes (below about 1M triples each) | 4 to 10 ms, 100 to 225 per core (one noisy rerun) | Only for small tenants; large tenant needs another answer; ties into Q6 tenant isolation |
| 3 | Pulls on the kernel side from a streamed export (section 5) for sweeps | n/a for single live pulls | Memory in the kernel |
| 4 | Engine patch: expose the permutation block size; investigate the 1,100 faults per join | Unknown | Build QLever from source; no profiler available here |
| 5 | Hot-subject result cache | 0.6 to 1.1 ms on a repeat of the same root | Wiped by every update (`Server.cpp:1303-1309`); useful only between commits |

---

## 5. Q5: P5, release sweep

### 5.1 Verdict

1. **Throughput is reachable only with set-at-a-time evaluation.** Per-root pulls on 4 clients: 88 pulls/s, 46 per server core (100k would take 19 minutes). Batches of 1,000 roots (a two-column `VALUES (?root ?entity)` per hop, 5 requests per batch): 815 pulls/s per core; batches of 5,000: 825. 100k pulls = 120 to 134 s of one core, 0 mismatches against the oracle, 1.35x over the 100 s bar. [P]
2. **One streamed request exports the whole current graph and is pinned by construction.** 9,460,849 rows (716 MB TSV) in 32.9 s on one core, 287k rows/s, server RSS 107 MB. The kernel then assembles the 100k pulls from that single snapshot. [P]
3. **A sweep made of many requests over the current graph is not pinned.** With the marker in every hop query: 1 publication with no writer; 31 publications in 20 s at 1.5 commands/s, with 16 of 31 batches straddling at least two publications between their own hop queries; 122 publications at 20 commands/s, 29 of 29 batches straddling. [P]
4. **A rebuild or update storm does not break a single request's basis.** A streamed export held open by a slow reader (41 s) while 677 guarded updates applied and `rebuild-index` swapped the index (6.7 s): the stream returned the same 9,460,847 rows with the same 860 old-value markers and 0 new-value markers as the pre-update baseline, and finished normally; a fresh stream afterwards saw 7,610 new values. [P]
5. **The sweep hurts live traffic when it shares the process.** [P] below. The 1.5x bar is not met on a shared 2-CPU server.

Confidence: High for 1 to 4; Medium for 5 (noisy baselines).

### 5.2 Evidence: sweep forms

Index `A`, `-j 4`. Raw: `out/session-raw-outputs.txt` (`scripts/b_p5.py`, `scripts/export_stream.py`).

| Form | Wall for N pulls | Pulls/s | Pulls/s per server core | Extrapolated 100k | Mismatches |
|------|------------------|--------:|------------------------:|------------------:|-----------:|
| per-root pulls, 4 clients, 30 s | 2,645 pulls | 88 | 45.9 | 1,136 s | 0 |
| batched K=100, 2,000 roots | 5.4 s | 369 | 301 | 271 s | 0 |
| batched K=1,000, 4,000 roots | 4.8 s | 833 | 815 | 120 s | 0 |
| batched K=5,000, 10,000 roots | 13.4 s | 746 | 825 | 134 s | 0 |
| full current-graph export, 1 request | 32.9 s for the graph | n/a | n/a | 33 s plus kernel assembly | n/a |

Batch latency p50: 245 ms (K=100), 1,090 ms (K=1,000), 8,030 ms (K=5,000). The batch result has 1.4M rows for 10,000 roots, 140 rows per pull; hub entities (branch, org) are repeated per root in the output, which the export form avoids. [P]

Scaling [E]: the export is linear in current-graph rows, so 100m active facts is about 330 s and a kernel holding that graph needs on the order of 10 GB; a sweep at that size either shards the export by subject range (losing the single-request pin) or reads from a frozen generation (below).

### 5.3 Evidence: live-traffic impact

16 paced live readers (1 pull/s each) plus the 1.5 commands/s writer, 30 s windows, sweep on one extra thread. Baselines moved between runs, so each pair is quoted with its own baseline. Raw: `out/b_p5live_A-export.json` (pair 2) and `out/session-raw-outputs.txt` (pair 1).

| Run | Sweep | Live read p50 / p99 (ms) | Writer p50 / p99 (ms) | Server cores |
|-----|-------|--------------------------|-----------------------|-------------:|
| Pair 1 baseline | none | 44 / 162 (second baseline 69 / 231) | 24.5 / 99 (46 / 195) | 0.63 |
| Pair 1 with sweep | batched K=200, 209 pulls/s | **89 / 488** (2.1x to 3.0x p99) | 58 / 215 (1.1x to 2.2x p99) | 1.42 |
| Pair 2 baseline | none | 115 / 577 | 97 / 365 | 0.92 |
| Pair 2 with sweep | full export loop (did not finish one pass in 45 s on the loaded host) | 176 / 998 (1.7x p99) | 112 / 1,107 (3.0x p99) | 1.53 |

### 5.4 Design implication

- Run the sweep on a **separate, read-only QLever process built from a frozen generation** (checkpoint plus log suffix, R13 section 4.3). It has its own cores, never takes updates, and its basis is the generation, which solves pinning and isolation together. The cost is a second index (about 1.1 GB at 69M triples) and the build time (161 s at 69M triples in this setup).
- If the sweep must run on a live replica, use one streamed request for the basis and accept 1.7x to 3x live p99 on shared cores.
- Never run a sweep as many requests against the current graph and call it pinned; either name the marker in every request and retry on mismatch, or use the ledger path (section 1.5).

---

## 6. Q6: requirements

### 6.1 Tenant isolation at the storage layer

**Verdict.** One index and one server per tenant is cheap enough to be the default. [P]

| Tenants | Triples each | Disk each | Files each | Start (p50 / max) | RSS idle (mean) | PSS (mean) | Threads | cgroup total (incl. page cache) |
|--------:|-------------:|----------:|-----------:|-------------------|----------------:|-----------:|--------:|--------------------------------:|
| 10 | 3,000 | 83 KB | 24 | 84 / 96 ms | 30.4 MB | 5.9 MB | 8 | 798 MB |
| 40 | 3,000 | 83 KB | 24 | 69 / 96 ms | 30.4 MB | 4.2 MB | 8 | 976 MB |
| 10 | 300,000 | 6.4 MB | 24 | 61 / 65 ms | 30.4 MB | 6.2 MB | 8 | 902 MB |

- Server flags `-j 1 -m 32M -c 2M -e 2M`. RSS rises to 34 to 38 MB after one query. [P]
- 1,000 small tenants as resident processes [E]: 4 to 6 GB unique memory (PSS), 30 GB if RSS is summed naively, 8,000 threads, 24,000 files. A pool that starts a tenant's server on demand (60 to 95 ms) and evicts least-recently-used keeps this bounded.
- Named graphs per tenant in one index are soft isolation only: any query without `FROM` reads the union of all graphs (R2), and block metadata stores at most 20 graphs per block (`src/index/ConstantsIndexBuilding.h:106-108 @ 6c5861a`), so thousands of tenant graphs turn graph filtering into a per-row filter. [S]
- Per-tenant indexes also help P4 (section 4.4, workaround 2).
- Not measured: the large-tenant plus 1,000-small-tenants mix under load (scenario 15), and the cost of building a new tenant index live (scenario 14); a 3,000-triple index builds in 0.3 s and the 9.46M-triple current graph in well under a minute. [P]

### 6.2 Real erasure

**Verdict.** `DELETE DATA` followed by `rebuild-index` makes the value unreachable by query but does **not** remove it from the on-disk vocabulary. Hard erasure needs a full reindex without the value, or crypto-shredding. [P][S]

Experiment (`scripts/erase.py`, index of 30,015 triples with two canary literals, default logging on): insert a third canary by update, delete two of the three, `rebuild-index`, remove `previous.*`, restart.

| Step | What survives | Evidence |
|------|---------------|----------|
| After `DELETE DATA` | Query no longer returns the value. The value is still in `idx.update-triples` (plaintext), `server.log` and `idx.metrics-log.jsonl` (the server logs the full operation text, `Server.cpp:347`). | grep of the index directory |
| After `rebuild-index` | The rebuilt vocabulary has 60,020 words; a control index that never held the deleted values has 60,015. The deleted literals and the new IRIs stay in the vocabulary (`IndexRebuilder.cpp:491-500` merges existing and new words, no pruning). The previous index in `previous.<ts>/` holds the old files and the old `idx.update-triples`. | word counts (vocabulary is compressed, so a grep cannot see inside it) |
| After removing `previous.*` and restarting | Index files no longer hold a reachable triple; the vocabulary still holds the words; logs still hold the text. | grep and word count |

Confidence: High that the vocabulary is not pruned (source and differential count agree); Medium that the literal bytes are present in the vocabulary (inferred from the count, because the file is compressed and I did not decode it).

Options:

| Option | Removes value from | Cost |
|--------|--------------------|------|
| Full reindex from the log-folded quads without the value, swap, delete old generation and `previous.*` | Every permutation, vocabulary, update file | 161 s for 69M triples, well under a minute for the 9.46M-triple current graph, 1.2 GB peak RSS at 69M triples; hours at year-one scale [E]; logs must be scrubbed too |
| Crypto-shredding: write PII values as ciphertext literals, delete the key | Every copy at once, including logs and backups | PII attributes cannot be compared or ordered in QLever (ciphertext); equality only if deterministic encryption is used; key store becomes critical state |
| Disable query and metrics logging for update bodies (`--no-metrics-log` still leaves `server.log`) | Logs only | Needs log redaction or a patched `AD_LOG_INFO` at `Server.cpp:347` |

Implication: store erasable PII as ciphertext keyed per subject and use full reindex only as the scheduled backstop. History keeps its shape because the ledger quad stays; its value is ciphertext.

### 6.3 Atomic outbox and work items

**Verdict.** Native, because one operation is one snapshot. Outbox items inserted in the same guarded update as the data and claim: 3,116 checks over 540 commits, 0 snapshots with a claim lacking its outbox item or the reverse. [P] Failure case from R8 still applies: a timed-out update can leave a partial permutation state until the identical update is re-sent and returns 200 (R8 section 1); the log, not QLever, is the authority for outbox delivery.

### 6.4 No silent precision loss

**Where QLever 0.6.0 changes a value silently** (`scripts/prec.py`, INSERT DATA then JSON read-back, 80 cases; raw `out/prec_battery.json`):

| Kind | Silent change (sent, got) | Typed error from the engine instead |
|------|---------------------------|-------------------------------------|
| Integer beyond 60 bits | 2^59 gives -2^59; 2^59+1 gives -(2^59-1); -2^59-1 gives 2^59-1; 2^62 gives 0; 2^63-1 gives -1; -2^63 gives 0 | 2^63 and 10^30: HTTP 400 parse error |
| Integer lexical form | `007` returns `7`, `+5` returns `5`, `-0` returns `0` (value kept) | |
| Decimal | 1.10 returns 1.1; 0.30000000000000004 returns 0.3; 123456789.123456789 returns 123456789.1235; 99999999999999999999.99 returns 100000000000000000000.0 | |
| Double | 1.0000000000000002 returns 1.0; 1e308 returns a 40-digit integer; 9007199254740993 returns 9007199254740992.0; datatype reported as `xsd:decimal` | |
| dateTime | `.789123Z` returns `.789Z`; `+05:30` returns `+05:00`; `-00:30` returns `+00:00`; year 12345 returns `12345-01-01T00:00:00` | `24:00:00Z`, `23:59:60Z`, and `"not a date"^^xsd:dateTime` are stored as plain strings (datatype dropped, no error) |
| Boolean | | `"TRUE"^^xsd:boolean`: HTTP 400 |
| Invalid typed integer | | `"abc"^^xsd:integer`: HTTP 400 |
| Strings (empty, whitespace, tab/newline, NUL, C1 controls, NFC and NFD forms, U+FFFF, U+10FFFF, RTL, 1 MB) | none; all exact | |
| Custom datatype (`"123.4500"^^<urn:triplex:dt:decimal>`, int64 as `urn:triplex:dt:int64`) | none; kept byte for byte | |
| Language tag | kept as written | |

Comparison hazards from R2 still hold and I did not re-measure them: integer `=` decimal compares through a double (`9007199254740993 = 9007199254740992.0` is true), sums wrap past 2^59, and dateTime order uses local clock fields before the zone.

**Write-path validator** (`scripts/precval.py`): six kinds, each either produces an exact QLever term or raises a typed error.

| Kind | Accepted encoding | Typed error codes |
|------|-------------------|-------------------|
| int, scaled-integer money | `xsd:integer`, range [-2^59, 2^59-1] | `INTEGER_OUT_OF_RANGE`, `NOT_AN_INTEGER` |
| decimal (non-money) | custom datatype `urn:triplex:dt:decimal`, canonical text (no trailing zero, at most 38 digits); engine never compares it numerically, add an order key for ranges (R5) | `BAD_DECIMAL`, `NON_CANONICAL_DECIMAL` |
| instant | `xsd:dateTime`, `Z`, millisecond, 4-digit year 0001 to 9999 | `INSTANT_OUT_OF_RANGE` |
| string | plain literal | `UNPAIRED_SURROGATE` |
| boolean | `xsd:boolean` `true`/`false` | `NOT_A_BOOLEAN` |
| double (approximate values only) | `xsd:double` if the 13-digit print round-trips and the low 4 mantissa bits are zero | `DOUBLE_NOT_REPRESENTABLE`, `NON_FINITE_DOUBLE` |

Property test (9,000 generated values, edge-biased, 1,500 per kind, read back through JSON): **6,241 accepted, 6,241 exact round trips, 0 wrong.** Rejected values that the engine would have altered or refused: int 594 of 594; decimal 252 of 258 (the other 6 were non-canonical but exact); strings 265 of 265 (not valid UTF-8); doubles 712 of 1,270 (558 were exact, so the double rule is conservative by 44 percent); instants rejected for range only. Two bugs in my first versions are worth knowing: Python `strftime("%Y")` yields `1-01-01` for year 1 and QLever returns whatever lexical form it was sent, so the validator must emit canonical four-digit years; and QLever prints `...:00Z` without a fraction when milliseconds are zero. [P]

Implication: the validator belongs in the Triplex write path for QLever, before the frame is built; the frame then carries only terms that survive a round trip. This closes Sam's "hard error, never silent conversion" for the kinds tested. Not covered: comparisons across numeric kinds in raw queries (R2), and values that arrive through the bulk lane or `qlever-index` rather than UPDATE (R13: the index builder does not wrap integers the way UPDATE does, so rebuild equivalence needs its own test).

---

## 7. Summary table

Bars from `lab/TARGETS.md`. "Native" = what QLever 0.6.0 does without help.

| Priority or requirement | Native support | Measured number | Workaround | Risk |
|-------------------------|----------------|-----------------|------------|------|
| P1 pinned reads, never block writers | Snapshot per request, no locks, no torn reads (0 bad of 26,413 stored pulls) | 4 readers saturate 2 CPUs at 65 pulls/s; p99 0.5 s at 16, 1.4 s at 64; writer p50 15 ms alone, 114 ms at 4 readers, 826 ms at 64; rebuild: reads p50 1.4 s, writes 13 to 25 s, none rejected | Read replicas per 2 cores fed from the log; rebuild on a standby generation; marker in the same query | Medium: bars at 256 and 1,024 readers need many replicas or a cheaper pull |
| P1 read pinned to a past publication | Not native; ledger graph gives exact answers | p50 198 to 496 ms, 0 changed answers over 40 pinned reads under 396 writes | Kernel-side `rp`/`rt` filtering, entity constants in bounded `UNION` chunks | Medium: planner scans 8.5M rows if a temporal `FILTER` is written; 30-entity union timed out |
| P2 commit p50 at most 10 ms, p99 at most 50 ms | Guarded single-op update, idempotent no-op, claims, atomic outbox, RYOW | ACK p50 11.2 / 33.8 / 129 ms at delta 0 / 100k / 500k (fsync 2.8 ms inside); update about 6 + 0.23 to 0.29 ms per 1k delta triples; 112 commands/s at 64 clients | ACK at log fsync plus broker overlay; or keep delta below about 15k by frequent rebuilds of a small index; upstream #3607, #3267 | High: delta growth makes publication the bottleneck |
| P3 change feed | None in QLever; log is the feed | 0 gaps, 0 order violations, exact resume, fsync 3.0 to 3.5 ms; QLever `rp` range 20 to 41 ms per 100 positions | Durable watermark gating; checkpoint (LSN, offset) with LSN dedupe | Low |
| P4 current pull p50 at most 5 ms, at least 1,100 per core, flat vs history | Path or `VALUES` frontier; no history coupling | p50 23 to 33 ms; 35 to 45 per core; flat 7M to 74M triples; bundle rows 1.2 ms and 770 to 870 per core | Bundle rows; small per-tenant indexes (4 to 10 ms); engine patch for block size | High: 24x to 31x short natively; bundles cost write amplification |
| P5 sweep 100k pulls at one publication, ≤ 100 s, live ≤ 1.5x | Streamed single-request export is pinned; `VALUES` batches | Export 33 s, 287k rows/s, pinned across 677 updates and a rebuild; batches 815 to 825 per core (120 to 134 s for 100k); multi-request sweep sees 31 publications in 20 s; live p99 1.7x to 3x | Dedicated read-only process on a frozen generation; kernel assembles pulls | Medium: single-process sweep misses the 1.5x bar; export size grows with the graph |
| Tenant isolation | One index and server per tenant | 24 files, 83 KB for 3k triples, 4 to 6 MB unique memory, 60 to 95 ms start | On-demand pool with LRU eviction | Low to Medium: 1,000-tenant mix under load untested |
| Real erasure of PII | Delete makes it unreachable; rebuild keeps the vocabulary entry | 60,020 vocabulary words against 60,015 in a control; value also in `previous.*`, `server.log`, metrics log | Ciphertext PII plus key deletion; full reindex as backstop (161 s at 69M triples); log scrubbing | High until a shredding design is chosen |
| Atomic outbox and work items | One operation is one snapshot | 540 commits, 3,116 checks, 0 torn | Log remains the delivery authority | Low |
| No silent precision loss | Wraps integers beyond 60 bits, rounds decimals and doubles to 13 digits, truncates dateTime precision and zones, drops datatype for invalid dateTimes | 8 silent cases found; validator: 6,241 accepted, 0 wrong round trips, rejected values would have been altered or refused | Write-path validator, scaled-integer money, custom exact datatypes with order keys | Medium: raw-query numeric comparisons and bulk-lane loads are outside the validator |
| Keep-alive HTTP | No `TCP_NODELAY` | reused connection p50 41.8 ms against 0.37 ms | Connection per request, or one-line engine patch | Medium: easy to trip in a pooled client |

---

## 8. Open items and limits

1. **Scale.** Largest index 74M triples; year-one is 10x to 50x larger. Pull cost, rebuild time (54 s loaded at 69M), export time and the 5-to-8x small-index step are unmeasured above that.
2. **Noise.** A busy shared VM and a 2-CPU quota; baselines moved up to 2.6x between runs. Directions are reliable; single digits of percent are not. The `-j` matrix is within noise.
3. **Not run:** 256 and 1,024 readers; `rebuild-max-concurrent-permutation-pairs`; `-o`; a newer engine image with #3607; read replicas actually fed in parallel from one log; power-loss behaviour (R13); crypto-shredding implementation; bundle maintenance cost; the cause of the 1,100 faults per join.
4. **Unverified inference.** That the deleted literal bytes are physically in the rebuilt vocabulary (word counts only; the file is compressed).
5. **Probe deviation.** A 1.86 GiB research-probe container, not slot `s3` (pool full); removed at the end.

## Appendix: artifacts

Under `/Users/sam/Claude/Projects/triplex-db-2/R17-qlever-northstar/`:

- `scripts/`: `world.mjs` (generator, bundle rows), `build.sh`/`cbuild.sh`, `srv.sh`, `qc.py` (client, one connection per request), `load.py` (readers, writer), `p2lib.py`, `b_pull1/2.py`, `b_hist.py`, `b_micro.py`, `b_p1.py`, `b_p1j.py`, `rebuild_load.py`, `b_pin.py`, `pin2.py`, `b_p2.py`, `fill_delta.py`, `broker_e2e.mjs`, `mksubj.py`, `outbox.py`, `feed_sim.mjs`, `b_feedq.py`, `b_p5.py`, `b_p5live.py`, `export_stream.py`, `longq2.py`, `sweep_pin.py`, `tenants.py`, `erase.py`, `prec.py`, `precval.py`, `b_misc.py`.
- `out/`: JSON results (`b_p1_A-j4.json`, `b_p1j_j*.json`, `p2_*.json`, `b_hist_*.json`, `b_pull2_*.json`, `b_pin_A.json`, `rebuild_load_A-j4.json`, `prec_battery.json`, `precval.json`, `erase.json`, `feed_runs.log`, `expected_A.json`).
- `feed/`: producer and consumer logs from the feed runs.
- Web sources (unauthenticated): https://github.com/ad-freiburg/qlever/pull/3607, https://github.com/ad-freiburg/qlever/pull/3267, https://github.com/ad-freiburg/qlever/issues/3151 (draft PR for an auxiliary on-disk delta), https://docs.qlever.dev/materialized-views/ (views are read-only, cannot hold local-vocabulary entries, move with the old index on rebuild per `Qlever.cpp` in the pinned source), https://docs.qlever.dev/rebuild-index/.
