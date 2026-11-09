# EXP-P5N brief: 100k activation in at most 100 s on the host store, with the journal triples kept

Planner: Opus 5.5, high. Date: 2026-11-09 (written after the 10:34 host reset). Read-only on code; this is the only file written.
Not committed.

**North star: P5** (activation of 100k subjects in at most 100 s, live read and commit p99 at most 1.5x their no-sweep values),
with **P1, P2 and P3 as constraints** that no design may trade away. Goals come only from `lab/SCOPE.md`, `lab/NORTH-STAR.md` and
`lab/TARGETS.md` (TARGETS 1.1 P5; `lab/acceptance/ACCEPTANCE.md` NS.P5 and NS-P5-SCOPED-RELEASE-REACHED).

**Hard constraint (Sam, 2026-11-09, Q107-S option C):** `:_tx/change` and `:_tx/changed-entity` stay stored and queryable as
ordinary triples on every lane, and activation keeps writing them. Nothing in this brief drops them. The broker-internal one-record
journal (R47 option B-store) stays off and is never used for a claim.

Evidence labels: **[M]** measured (path given), **[S]** read in source (path and line), **[D]** derived by arithmetic from [M] and [S],
**[E]** estimate with its method stated.

Sources read: P5B worktree `REPORT-roundB.md`, `REPORT-CX-P5A.md` (headline only), `lab/experiments/EXP-P5/roundB/round3/PREDICTIONS.json`;
evidence `/Users/sam/Claude/Projects/triplex-db-2/evidence/P5B-R3/` (`extrapolation-100k.json`, `b0-10k/receipt.json`,
`b1-10k/screen.json`, `b1-10k/pooled.json`, `b1-10k-02/screen.json`, `b1-1k-02`, `b1-1k-03`, `b1-10k.log`); R34 (sections 0, 1.2, 2.1,
2.5, 4.2 to 4.6, 6), R43, R50, R45 (headline), R47 (sections 1 and 2), R25 (P1 and sweep-ratio rows), HS01 `REPORT.md` rounds 1 and 2;
code on the P5B branch: `lab/bench/p5-host-screen.ts`, `lab/bench/lib/{sweep.ts, sweep-worker.ts, host-store.ts, w0-outbox.ts,
w0-world.ts}`, `packages/qlever/src/broker/{log.ts, sqlite-worker.ts}`, `packages/core/src/store/transactionMetadata.ts`.

---

## 0. Answer in eight lines

1. **The 33.9 s at 10k (4 workers) is mostly CPU in the lab sweep path, not writes.** World building ("decode") is 44.4 CPU-s, the
   SQLite page reads 33 s of transaction wall, publication 25.9 s summed (of which 17.8 s is outbox pulls queued on the sweep
   connections), commits 6.4 s summed. Commits including the journal triples are about 5% of worker time.
2. **The single largest cost is a sort comparator.** `worldOf` canonicalizes both facts on every comparison
   (`lab/bench/lib/w0-world.ts:74`), about 4.0 ms of the 9.1 ms per subject at 1 worker.
3. **The journal triples (option C) are not why P5 misses.** They are about 60% of the rows in an activation commit, but commits are
   about 4% of 1-worker wall; the journal's share of activation wall is about 1 to 2% [D]. Dropping them would not close a 3.4x gap.
4. **100 s at 100k is reachable on the host store under option C, on paper** [E]: after the fixes in section 2 the per-subject cost
   is about 1.8 to 2.5 ms of parallel CPU plus about 0.23 to 0.41 ms of serial writer time, so 3 sweep cores give about 71 to 98 s
   and 4 give about 54 to 74 s at 100k. With 2 cores it misses (about 104 to 144 s).
5. **The binding risks after that are P2 and the VM's CPU split, not wall.** The activation keeps the single writer 23 to 41 s busy at
   100k; each live commit that lands behind an activation commit waits up to 15 to 26 ms. In the 8 CPU VM duet, a sweep gets 4 cores
   only if both arms share one sweep cpuset (section 3).
6. **Measure on the 10k rung in a quiet host window first, then 100k on the host (83 GiB free is enough), then the VM duet.**
7. **Recommended experiment (section 4):** instrument, then five CPU fixes, then in-worker reads plus a pipelined publisher with the
   4-worker cap lifted, all at 10k with predictions committed first; seed 100k only if the 10k fit projects at most 85 s at 4 workers.
8. **If P5 still misses after that, report it as a miss with a TODO**, sized by the 10k fit; the journal's measured share goes in the
   report so the size of the option C cost is explicit.

---

## 1. Where the 33.9 s at 10k goes

### 1.1 The pipeline as built (P5B round 3)

```
 main thread (one Node event loop: driver, owner, publisher, position map)
   |                                             ^
   | "read" RPC per page                         | result bytes per page: canonical JSON of 64 records
   v                                             |   INCLUDING every subject's full world (sweep-worker.ts:55)
 broker.sweepPage  -> SQLite sweep connection k (k = round robin 0..3, log.ts:546)
   |   one BEGIN..COMMIT: BFS over facts + journal + history at P (sqlite-worker.ts:291-317)
   v
 rows (about 28.5k objects per page) -> structured clone to main -> host-store shape(): decodeHostRow + native->reference map
   -> structured clone again to the sweep worker thread
 sweep worker: reachableRows + worldOf (sort) = "decode"; evaluateW0 = "kernel"
   -> back to main: JSON.parse(all records + worlds)
   -> publishRecords (w0-outbox.ts): claim lookup; 64 sequential outbox pulls, EACH a full BFS on the SAME 4 sweep connections
      (host-store.ts:431-444); one transact (writer is serialized by writeTail; then verifyGroup readback + map append, harness)
   -> cursor file write + rename; only then does this worker take its next page
```

Each worker does read, compute and publish in series (`sweep.ts`, the `while` loop). Publication is not pipelined. Workers are capped
at 4 in two places (`sweep.ts` worker check; `log.ts:546` sweep worker 0..3).

### 1.2 Stage table, 10k, R2 activation, no live traffic [M `b1-10k/screen.json`]

Per-worker figures at W4 are the sums divided by 4. "Commit" is the whole `transact` call: prepare, BEGIN IMMEDIATE, row and journal
inserts, frame insert, COMMIT with `synchronous=FULL` and `fullfsync=ON` (`sqlite-worker.ts:27`), then the harness readback
(`verifyGroup`, `host-store.ts:188-235`) and position-map append.

| Stage | 1 worker: seconds of 92.7 | Per subject | 4 workers: summed s | Per worker s of 33.9 | Note |
| --- | ---: | ---: | ---: | ---: | --- |
| Fixed cost (fit intercept, 1k and 10k) | 1.5 | | | 1.7 | worker spawn, W0 pins, activation commit (8 to 27 ms), pin [D] |
| Read: SQLite page BFS, transaction wall | 27.1 (157 x 172.6 ms p50) | 2.7 ms | 33.1 (157 x 211 ms) | 8.3 | thread CPU only 13.5 s (W1) and 16.1 s (W4): wall is 1.4 to 2x CPU |
| Compute: decode (reachableRows + worldOf) | 39.9 CPU | 4.0 ms | 44.4 CPU | 11.1 | the sort comparator, section 1.3 |
| Compute: W0 kernel | 1.9 CPU | 0.19 ms | 2.5 CPU | 0.6 | matches R34's 0.16 ms |
| Compute: worker receive (row deserialize) | 2.9 CPU | 0.29 ms | 3.4 CPU | 0.8 | |
| Publish: outbox state pulls (10,000) | 1.0 | 0.10 ms | 17.8 | 4.4 | 17x worse at W4: they queue behind 200 ms page BFSes on the same connections |
| Publish: commit (157) | 4.05 (25.8 ms each) | 0.40 ms | 6.4 (40.6 ms each) | 1.6 | write + fsync + journal + harness readback, not split by the evidence |
| Publish: claim lookups | 0.12 | | 1.5 | 0.4 | |
| Residual, unattributed | 14.1 | 1.4 ms | | 4.9 | main-thread row mapping, two structured clones, JSON.parse of results with worlds, cursor writes, GC |

W1 to W4 speedup is **2.73x of 4**. The losses are the outbox pulls (1.0 to 17.8 s), longer page transactions (173 to 211 ms p50),
commits (25.8 to 40.6 ms each, writer serialization plus main-thread contention) and the shared main thread.

### 1.3 The decode term

`worldOf` sorts facts with `Buffer.compare(Buffer.from(canonical(a)), Buffer.from(canonical(b)))` (`w0-world.ts:74`). A world of about
445 facts takes about 4,000 comparisons, so about 8,000 `canonical` calls and 8,000 Buffer allocations per subject. Measured: 4.0 to
4.4 ms per subject at 1k and 10k, flat with store size [M `b1-1k-02`, `b1-1k-03`, `b1-10k`]. The same function builds G0's worlds,
which is why the 10k G0 took 104 s of CPU [M `b0-10k/receipt.json`].

### 1.4 The requested categories

| Category | 10k, 4 workers | Basis |
| --- | --- | --- |
| Read | about 8.3 s per worker of page BFS wall, plus 0.8 s receive | [M] |
| Compute | 11.7 s per worker (decode 11.1, kernel 0.6) | [M] |
| Write (row inserts) | inside the 40.6 ms commit; estimate 10 to 15 ms per page at W1 | [E] rows: each data row costs 3 DELETE-by-id probes plus 1 INSERT (`sqlite-worker.ts:170-172`); seed rate about 60 us per row including readback (797 s for 434,768 commands of about 29 rows) |
| Commit / fsync | estimate 5 to 12 ms per commit | [E] R25: zero-reader raw SQLite commit p99 8.8 to 14.1 ms on this host with fullfsync |
| Journal triples | per first-activation page: 4 metadata + 64 `:_tx/changed-entity` + 128 `:_tx/change` = **196 journal rows beside 128 fact rows** (60% of rows); on a re-activation 128 retractions add 128 more change rows (324 journal rows) | [S] `transactionMetadata.ts:30-57`; [M] HS01: 1.81 journal rows per fact |
| Journal share of wall | 6 to 9 ms of row work per page, so about 1.0 to 1.4 s of the 92.7 s at W1 (1.1 to 1.5%) and about 0.3 s per worker at W4 (about 1%) | [D] row share times the row-work estimate |
| Feed | none measured: the activation arms run no feed consumer | gap in the evidence; section 2.4 gives the P3 risk |
| Harness only (not product) | `verifyGroup` readback and position-map append inside every commit; the dense W0 reference map | [S]; estimate 3 to 7 ms per commit [E] |

### 1.5 Fixed cost against per-subject cost

| Kind | Size | How it scales to 100k |
| --- | --- | --- |
| Fixed per activation | about 1.5 to 1.7 s (fit intercept) | constant |
| Per page of 64 subjects | one read transaction, one commit, 64 outbox pulls, one cursor write | 1,563 pages at 100k |
| Per subject | BFS rows (about 445 facts), world build, kernel | linear |
| Store-size effect | page transaction p50 rose 15 to 30% from 1k to 10k (132 to 150 ms against 173 to 183 ms at W1); decode flat | estimate +10 to 25% on read at 100k (one more B-tree level, 10x dictionary) [E] |

Linear projection of today's code: about 324 s at 4 workers and 913 s at 1 worker at 100k [M `extrapolation-100k.json`], 3.2 to 3.4x
over the bar at 4 workers.

---

## 2. Is 100 s at 100k reachable under option C?

**The bar in per-subject terms:** 100 s minus about 2 s fixed, over 100,000 subjects, is **at most 0.98 ms of wall per subject,
about 1,020 subjects/s**.

### 2.1 Designs, each with its cost on wall, P2, P1 and P3

Savings are per subject at 10k unless stated. "Parallel" means work a sweep core does; "serial" means the one writer or the main
thread.

| # | Design | Saving [E unless marked] | P2 (commit latency during activation; R25 sweep ratio) | P1 (pinned reads never blocked) | P3 (feed lag while activation runs) |
| --- | --- | --- | --- | --- | --- |
| D1 | **Precompute each fact's canonical bytes once, then sort** (same `Buffer.compare` on the same bytes, so the order is identical by construction) | decode 4.0 to 0.3-0.5 ms parallel; also cuts G0 at 100k from about 18 to 24 min to a few minutes | positive: frees CPU the writer and live readers share | positive | positive |
| D2 | **Return the full world only for sampled subjects;** every subject returns a world hash | main-thread parse 0.5 to 1.0 ms serial | positive (main thread hosts the live writer path) | positive (live reads route through the main thread) | positive |
| D3 | **In-worker reads:** each sweep worker owns its readonly SQLite connection under the same gate, does BFS and decode in one thread (R34 2.1 design); the native-to-reference map is shared as a SharedArrayBuffer of native positions (about 3.5 MB at 10k, 35 MB at 100k), binary-searched | removes two structured clones and the main-thread row mapping: 0.5 to 1.5 ms, and the main thread stops being a serial point | positive | same snapshot rule: marker check `h <= P <= position` per transaction; the gate counter must include these connections | positive |
| D4 | **Batch the outbox state read:** one read of the 64 outbox entities in one transaction on a publisher connection outside the sweep pool; the existing `TripleLive` preconditions still reject a stale read at commit | 0.1 ms at W1; 1.8 ms per subject at W4 (17.8 s summed) | neutral | positive (64 BFS pulls per page leave the sweep connections) | neutral |
| D5 | **Pipeline publication:** workers push finished pages to a bounded queue (at most 2W pages); one publisher drains it; the cursor still advances only on ACK, as a set (already supported) | removes publish (6.5 s per worker at W4) from the worker chain | neutral if the publisher stays at 64-subject frames; it raises the publish rate, so the controller must gate it | neutral | more frames per second reach the feed sooner; see 2.4 |
| D6 | **Lift the 4-worker cap** (`sweep.ts`, `log.ts:546`) | wall scales with sweep cores until the writer floor (below) | more CPU contention for the live path on a shared host; in the VM, cpusets decide it | more concurrent reader transactions; see 2.3 | CPU contention |
| D7 | **Probe the journal table only for frontier ids that are transaction entities** (`_tx/` prefix; journal rows live only on the transaction entity, `transactionMetadata.ts:38`); journal rows stay reachable and queryable | 0.05 to 0.2 ms parallel | neutral | positive (shorter page transactions) | neutral |
| D8 | **Write path: skip the three DELETE-by-id probes for rows whose id was minted in this transaction** (a fresh assertion id cannot exist in facts, history or journal); retirements keep the move | 20 to 40% of row work on every commit, live commits included | positive for every commit | neutral | positive |
| D9 | **Bigger page cache or `mmap_size` on the readonly sweep connections only** | page transaction wall is 1.4 to 2x its thread CPU; 10 to 30% of read, low confidence | neutral | neutral | neutral |
| D10 | Batched commits: K activation pages per commit | saves one fsync and fixed cost per merged page (5 to 10 ms) | **negative:** the writer is held K times longer; a live commit waits behind it | neutral | fewer, larger frames |
| D11 | Smaller activation frames (16 to 32 subjects) | costs wall: more commits, more fsyncs | positive: hold time per commit drops to about 5 to 10 ms | neutral | more frames |
| D12 | **Activation frames join the live group commit:** live commands first, at most one activation frame per group, one fsync for the group | removes one fsync per page from writer time | **positive:** a live command never waits for a separate activation fsync; it waits at most for one frame's row work | neutral | neutral |
| D13 | Deferring index maintenance | **rejected:** SQLite maintains indexes inline; dropping and rebuilding the id indexes on live tables breaks lost-ACK readback and pinned reads by id | | | |
| D14 | Write ordering for SQLite locality | **not worth a step:** subjects are already sorted and new outbox entities get fresh, increasing dictionary ids, so inserts append to the entity-clustered tables; under 5% [E] | | | |
| D15 | Separating the sweep read from the write transaction | **already true** for page reads (dedicated readonly connections, WAL snapshots). The remaining couplings are the outbox pulls on the sweep connections (D4) and the shared main thread (D2, D3) | | | |

### 2.2 Bottom-up estimate after D1 to D8 (quiet host)

| Term | Per subject | Kind | Basis |
| --- | ---: | --- | --- |
| SQLite BFS read, including row objects | 1.2 to 1.5 ms | parallel | [M] store thread CPU 1.35 ms (W1) and 1.61 ms (W4) per subject, minus D7 |
| World build after D1 | 0.3 to 0.5 ms | parallel | [E] about 445 canonical calls plus 4,000 compares of precomputed Buffers |
| Kernel | 0.2 to 0.25 ms | parallel | [M] |
| Other worker work | 0.1 to 0.2 ms | parallel | [E] |
| **Sweep-core CPU, total** | **1.8 to 2.5 ms** | parallel | sum |
| Writer: one commit per page, 15 to 26 ms after D8 | 0.23 to 0.41 ms | serial | [M] 25.8 ms at W1 today, minus D8 [E] |
| Main thread | 0.1 to 0.2 ms | serial | [E] after D2, D3 |
| Store growth to 100k | +10 to 25% on read | | [E] section 1.5 |

Wall per subject is the larger of (sweep-core CPU x growth / cores) and the writer term. Projection at 100k, fixed 2 s included:

| Sweep cores | Wall at 100k | Verdict |
| ---: | ---: | --- |
| 2 | 104 to 144 s | miss |
| 3 | 71 to 98 s | pass with no margin at the top of the range |
| 4 | 54 to 74 s | pass |
| 6 | 39 to 52 s (writer floor 23 to 41 s) | pass |

1. **Reachable under option C on the host store, with at least 3 to 4 effective sweep cores and the fixes above.** Nothing in this
   estimate removes a journal row.
2. **Scaling limit of more workers:** the serial writer (23 to 41 s at 100k, 1,563 commits) and, before D3, the main thread. The host
   has 12 cores (M3 Pro, 6 performance and 6 efficiency) [M `sysctl`]; efficiency cores run this work slower, so W above 6 is
   unlikely to pay on the host [E]. In the VM the cpuset sets the limit (section 3).
3. **The 1,100 pulls per second per core in TARGETS P5** is not met on one core by the read term alone (about 670 to 830 subjects per
   CPU-second for the BFS); the wall bar is met only by spreading over cores. The receipt reports cores used = CPU-s over wall.

### 2.3 What option C costs, sized

| Where | Cost at 100k after fixes | Share |
| --- | --- | --- |
| Writer time | 196 journal rows of 324 per first-activation page; 4 to 8 ms per commit after D8 [E], so 6 to 12 s of the 23 to 41 s of writer time | about 25 to 30% of writer time; writer time is serial, so this matters only if the writer becomes the bottleneck (6 or more cores) |
| Read | one journal-table probe per frontier chunk today; removed by D7 without dropping anything | about 0 after D7 |
| Wall | 0 to 6 s, depending on whether the writer is on the critical path | at most about 6% of the bar |
| Store size | journal 315 MB of 970 MB at 10k (R50); about 3 to 4 GB at 100k [D] | disk and checkpoint load, not sweep reads (journal is its own table) |

**If P5 misses after the fixes, the journal cannot be the reason unless the miss is under about 6%.** The report must state the
measured journal share from the instrumented commit split (section 4 step 1).

### 2.4 Costs on P1, P2 and P3 for the whole design

1. **P2 (commit latency during activation).** The activation holds the writer 23 to 41 s at 100k. If the activation finishes in 60 s,
   the writer is 40 to 68% busy with it. A live commit that arrives during an activation commit waits up to one activation commit
   (15 to 26 ms after D8). With a base live p99 of X, the tail ratio is about (X + hold) / X, so the 1.5x bar needs hold at most about
   0.5X. On the Mac the broker's P2 p99 is 81 to 101 ms (R50), so 26 ms passes; in the VM raw SQLite p99 is 4.4 to 9.5 ms (R50 V1
   probe) and the broker end-to-end p99 is unmeasured, so a 26 ms hold could fail there. D12 (shared group fsync) or D11 (smaller
   frames) is the fix if it fails. Evidence today cannot settle it: P5B round 3 pooled 3.37x commit and 2.57x read p99, but its one
   A/A round gave 0.52x and 0.82x and the base writer was saturated (base commit p50 about 40 ms from queueing) [M `pooled.json`,
   `screen.json`]. R25's short sweep gave 1.25x on means, 1.70x and 0.93x per pass.
2. **P1 (pinned reads never blocked).** Sweep reads are WAL snapshots and never block the writer. The real risk is the checkpoint gate:
   RESTART waits up to 20 ms for zero readers and then gives up (`sqlite-worker.ts:107-126`), and while it waits it parks new readers,
   live ones included. With 4 or more back-to-back sweep transactions of 100 to 200 ms, RESTART may never find a gap, and the WAL can
   pass 64 MiB (W4 reached 31 MB at 10k [M]). Mitigation inside the rules: shorter page transactions (D7, D9). A further option,
   splitting one page into several read transactions at the same P, is exact under the pin (rows retired after P move to history with
   `rpos > P` and stay visible at P), but R34 1 defines a page as one read unit, so it needs a ruling and is not in this experiment.
3. **P3 (feed lag).** The activation adds about 16 frames per second for 100 s, each with 64 changed entities and 128 fact rows. Feeds
   build entries from fact rows and skip journal rows (R47 1), so the journal adds no feed entries. The risk is CPU contention and
   larger frames on the feed reader. Pipelining (D5) raises the frame rate. Gate: feed lag p99 at most 250 ms with a consumer attached
   while activation runs.

---

## 3. How to measure credibly

### 3.1 Where

| Place | Use | Conditions |
| --- | --- | --- |
| Mac host, quiet window | screening at 10k and 100k; DIAGNOSTIC | Sam's default colima VM paused (allowed 2026-11-09), triplex2 VM idle or stopped (its 8 vCPUs come from the same 12 cores), no other heavy job; calibration before and after each arm; load average and memory pressure recorded at 10 s cadence (R34 4.5) |
| triplex2 VM, 8 CPU / 20 GiB / 100 GiB (resized, as Sam approved) | the acceptance shape (R34 B3) | containers on cpusets with no quota; fsync on Linux differs from macOS `F_FULLFSYNC`, so P2 numbers count only from the VM |

### 3.2 VM layout for the 100k duet (8 CPUs)

```
 CPU 0-1  arm A: broker writer, live readers, trace driver
 CPU 2-3  arm B: broker writer, live readers, trace driver
 CPU 4-7  ONE shared sweep cpuset; each round only the treated arm sweeps (A/A rounds: neither)
```

1. **Why shared:** two private sweep cpusets would give each arm 2 cores, which the projection says misses (104 to 144 s). One shared
   set gives the sweeping arm 4 cores and the idle arm loses nothing, so duet compression does not come from it.
2. **Check:** 64 live readers plus the writer on 2 CPUs may saturate the live cpuset; the receipt records its CPU use and a window with
   a saturated live cpuset is INVALID, since saturation inflates the base p99 and compresses the ratio.
3. **Memory:** the sweep reads facts, ids, entities and heads, about 4.5 to 5 GB at 100k [D from the 10k dbstat: about 426 MB times 10];
   with about 1.5 to 2.5 GiB of processes per arm, two arms need about 13 to 15 GiB of 20 GiB. Gate on major faults and VM memory PSI.
4. **Disk:** two arm copies of about 9.1 to 10.3 GB plus one sealed copy, about 31 GB of the 100 GiB ceiling. Check whether the VM
   filesystem supports reflink clones; if not, the copies are full copies.

### 3.3 Rungs and disk

| Rung | Store | Seed time | Disk needed | Status |
| --- | --- | --- | --- | --- |
| 10k | 0.97 GB, sealed at `evidence/P5B-R3/b0-10k`, APFS clone per arm (12 KB per clone [M]) | none | under 5 GB with evidence | ready |
| 100k | 9.1 to 10.3 GB [M extrapolation; +13 B per fact once ids pass 2^25, HS01] | 2.3 to 3.2 h on the host (linear 8,212 s, power-law 11,350 s [M]) | about 18 GiB plus the 5 GiB floor (`extrapolation-100k.json` disk100k); host has about 83 GiB free | waits for section 4 step 4 |

Delete each arm's clone after its arm; keep the sealed seed and the receipts in `/Users/sam/Claude/Projects/triplex-db-2/evidence/P5N/`.

### 3.4 Sound A/A rule for the ratios

1. Randomized order per round, at least 12 rounds, an A/A round at least every sixth (R22 PAIR-0, R34 4.2).
2. **The live writer must not be saturated in the base arm:** offered rate set so base writer utilization is at most 50% (round 3's
   DILATE 2 left base commit p50 near 40 ms from queueing). Record utilization.
3. **Window validity:** s_d of ln(p50 ratio) over A/A rounds at most 0.28 for 12 rounds (R22), and the pooled A/A p99 ratio inside
   0.85 to 1.18 for both commit and read. Otherwise the window is INVALID, never FAIL or PASS.
4. **Verdict:** "holds" only if the paired-bootstrap 95% upper bound (whole rounds resampled) is at most 1.5 for both live read p99
   and commit p99; above 1.5 with a valid window is FAIL.
5. Commit p99 needs many commands (about 25,000 per arm for a tight bound, R22); at 10k screening report the bound as is and mark it
   wide.

---

## 4. Recommended experiment: EXP-P5N

**Builder:** Sonnet 5.5 at high, on a new branch from the P5B branch tip (`9949f8cc`). **Reviewer:** Codex gpt-6.1-sol at high.
**Classification:** DIAGNOSTIC throughout; nothing here closes NS.P5.

### 4.1 Predictions (commit them before any run, as `lab/experiments/EXP-P5N/PREDICTIONS.json`)

| Step | Measure | Prediction (low, center, high) |
| --- | --- | --- |
| 1 | commit split per page at W1: COMMIT plus fsync | 5, 8, 12 ms |
| 1 | journal row work per page | 4, 6, 9 ms |
| 1 | harness readback plus map append per commit | 3, 5, 7 ms |
| 1 | unattributed main-thread time at W1, 10k | at least 10 s |
| 2 | 10k wall after D1, D2, D4, D7, D8 | W1: 35, 45, 55 s; W4: 12, 15, 18 s |
| 2 | decode CPU per subject | at most 0.6 ms |
| 2 | outbox read time at W4, summed | at most 0.5 s |
| 2 | commit per page at W1 | 15, 20, 26 ms |
| 3 | 10k wall after D3, D5, D6 | W4: 6, 7.5, 9 s; W6: 4.5, 5.5, 7 s |
| 3 | sweep-core CPU per subject | 1.8, 2.1, 2.5 ms |
| 4 | 100k projection from the 1k and 10k fit, +20% growth | W4: 55, 65, 80 s; W3: 70, 85, 100 s |
| 5 | activation commit hold p99 at 10k | at most 30 ms |
| 5 | commit p99 ratio, read p99 ratio (host, valid window) | 1.1 to 1.6 (low confidence); read at most 1.3 |
| 5 | feed lag p99 during activation | at most 250 ms |
| all | journal rows per first-activation page | exactly 196 (4 + 64 + 128); re-activation adds 128 change rows |

### 4.2 Steps, in order

1. **Instrument only (no behavior change).** Split `transact` into prepare, BEGIN IMMEDIATE wait, fact-row statements, journal-row
   statements (count and microseconds each), frame insert, COMMIT plus fsync, harness readback and map append. Add main-thread event
   loop utilization and a per-page timeline (read start and end, decode, kernel, publish queue wait, commit). Run 10k W1 and W4 twice
   each in a quiet host window. This gives the baseline, the noise, and the measured journal share.
2. **CPU fixes, one commit each:** D1 (sort keys), D2 (sampled worlds plus per-subject world hash), D4 (batched outbox read on a
   publisher connection), D7 (journal probe for `_tx/` ids only), D8 (skip DELETE probes for fresh ids). After each, run 10k W1 once
   to attribute the saving; after all five, run W1 and W4 twice. All gates run after the group.
3. **Structure:** D3 (in-worker reads with the shared position map), D5 (pipelined publisher), D6 (cap lifted to 8 in `sweep.ts`
   and `log.ts`). Run 10k at W = 1, 2, 4, 6, 8. Fit wall = fixed + pages x max(worker chain / W, writer per page).
4. **Projection checkpoint.** Fit 1k and 10k (the 1k seed is sealed at `b0-1k-02`), add 20% for store growth, project 100k at W3 and
   W4. Continue only if W4 is at most 85 s.
5. **P1, P2, P3 screen at 10k** under section 3.4: 64 live readers (NS.P5), an unsaturated writer, a feed consumer attached,
   controller off then on, at least 12 rounds with A/A rounds. Record WAL maximum, RESTART completions, and the activation commit
   hold-time histogram.
6. **100k seed on the host:** seed through the product path as round 3 did, G0 at the 100k basis against the pinned O-DOMAIN
   digests (fast after D1), seal, archive the intent gzipped.
7. **100k host screening:** W3 and W4, controller on, one kill-and-resume, 64 live readers. The roughly 10-minute throttled variant
   over a real compaction stays out of this experiment.
8. **VM:** only if step 7 meets the wall bar: copy the sealed store in, re-run G0 in the VM, then the section 3.2 duet.

### 4.3 Gates (every step that changes code or data)

| Gate | Check |
| --- | --- |
| G-FP fingerprints | worlds, R2 and block digests equal O-DOMAIN at the seed basis on every arm's store, before activation and again after the live traffic (old-cut exactness, Q89i) |
| G-OUT outputs | coverage exactly once with the subject-list hash; G2 reconcile equal to O-DOMAIN on a 1-in-10 sample at 10k (raised from 1-in-50 because D1 and D2 touch world building) and 1-in-50 at 100k; G5 deliveries equal O-DOMAIN for every page in publication order; post-capture mutations do not show (NS-P5-POST-CAPTURE-MUTATION) |
| G-REC recovery | SIGKILL at three points (before publish, after commit before cursor, after cursor) at 10k; resume gives identical deliveries and no duplicate visible effect; after D8, the HS01 G8 stop subset passes with zero ACKed operations lost and zero feed gaps |
| G-JNL journal triples | for a sample of activation transactions, `match` and Datalog over `:_tx/change` and `:_tx/changed-entity` return the expected rows (196 per first-activation page, plus 128 change rows per re-activation page); `transactionByCommand` resolves; O-REPLAY R-JNL-5 on the sample; journal-table row counts equal start plus expected |
| G-P2 ratios | section 3.4 rule; a FAIL is reported with the hold-time histogram |
| G-P1 | WAL at most 64 MiB; at least one RESTART completes every 10 s while the sweep runs; no command waits beyond NS-P1-WRITER-WAIT-MAX-MS |
| G-P3 | feed lag p99 at most 250 ms during activation; zero gaps and order violations |
| Source | before and after source hashes match for every receipt; predictions file hash bound in every receipt |

### 4.4 Stop rule

1. **Any correctness gate fails:** stop and report. No speed is traded for it.
2. **After step 3:** if sweep-core CPU per subject is above 3.0 ms on the quiet host, or the step 4 projection is above 120 s at W4,
   do not seed 100k. Report P5 as a miss under option C, sized as projected wall over 100 s, with the remaining terms ranked and the
   journal's measured share stated.
3. **After step 5:** if the P2 ratio FAILs in a valid window, continue to 100k for the wall bar only, label P2 as a miss, and open D12
   (shared group fsync) as the TODO.
4. **Two INVALID windows in a row:** stop and ask the orchestrator for a quieter window.
5. **Resources:** host free disk under 25 GiB before a 100k step, or Sam says he needs the Mac: stop cleanly at the next page boundary.

---

## 5. Not in scope

1. Dropping or compacting `:_tx/change` or `:_tx/changed-entity` (option C).
2. The broker-internal one-record journal (R47 B-store); it stays off.
3. The throttled 10-minute variant over a real compaction or index rebuild (NS-P5-THROTTLED-COMPACTION): next experiment.
4. Splitting a page into several read transactions at the same P (needs a ruling, section 2.4 item 2).
5. The scoped release R3 at 100k (NS-P5-SCOPED-RELEASE-REACHED, 9,497 reached subjects): it reuses this path once 100k is seeded.
