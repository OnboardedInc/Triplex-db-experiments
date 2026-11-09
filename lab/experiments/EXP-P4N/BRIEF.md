# EXP-P4N brief: can the H1 current pull reach 1,100 pulls per CPU-second, and what to build next

Planner: Opus 5.5 (high), 2026-11-09. Read-only on code; this is the only repository file written. No download, Docker or colima.
Goals and bars come only from `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`.

**North star: P4** (single-client pull p50 <= 5 ms, p99 <= 25 ms, >= 1,100 pulls per CPU-second per core, all serving CPU counted
per Q105a). **Guards:** P2 (commit latency, the G7 guard: p50 delta <= 0.5 ms, p99 ratio <= 1.1x judged under Q104a), P1 (pinned
reads never block writers), P5 (the 100k activation sweep needs the same per-pull cost on cold subjects). Correctness is the floor.

Inputs read: EXP-QH1 REPORT rounds 1 to 3 (worktree `qh1`, head `7965540b`), R46, R50, EXP-HS01 REPORT round 2 (worktree `hs01`), the
round 3 evidence under `/Users/sam/Claude/Projects/triplex-db-2/evidence/QH1-R3/` (ABAB summaries, per-segment arm JSON, profile
summary), RULINGS Q104a and RULINGS-PENDING Q99e, Q100a, Q100k, Q105a, Q105b, Q107-S.

**New measurements in this brief** (labelled [M] below): standalone thread-CPU benches on an APFS clone of round 3's candidate store
(10k W0, owner-keyed, round 1 HS01 layout), 300 placement owners, interleaved, 5 to 6 passes, host load average 8 to 11. They are
diagnostics on a loaded host; ratios are the result. Method and statement shapes are in appendix A.

## 1. Answer

1. **The bar is reachable on this design family, but only one candidate reaches it with the 1.2x screening margin (Q99e, 1,320
   pulls per CPU-second):** a per-owner current document stored outside the commit path, checked for staleness inside the pull's own
   read transaction. Bottom-up estimate **560 to 740 µs per pull, 1,350 to 1,790 pulls per CPU-second** on the same loaded host
   that gave round 3's 677. Cost: commit path untouched, about +85 to 100 bytes per fact of derived storage, and one new route to prove.
2. **The row path alone probably lands at 870 to 1,020 pulls per CPU-second loaded** after shrinking the tuple text (a) plus two
   cheap runtime levers (e). That is short of 1,100 under load and might reach it on a quiet host, but not with the 1.2x margin.
3. **Shrinking the tuple text is worth more than round 3 estimated.** Measured [M]: names once per fetch plus dropping per-row
   defaults cuts the text from **80.8 KB to 45.7 KB per owner (0.57x)** with **0 mismatches on 300 owners**, the reader statement
   from **454 to 340 µs (0.75x)**, and `JSON.parse` of the grouped variant from **179 to 90 µs (0.49x)**. Round 3 estimated 20 to 25%
   fewer bytes; the field breakdown shows 43%.
4. **A cache keyed by subject and basis with feed invalidation (b) is the wrong shape.** The P4 bar is measured on a bucket draw
   across all subjects, and the P5 sweep pulls each subject once, so a hit-only cache moves neither. Feed invalidation also races the
   commit's publication. A read-time staleness check by owner (measured [M] at **18 µs** per owner) is exact and makes feed
   invalidation unnecessary. That check is what turns (b) into the stored document of item 1.
5. **R46's in-commit document (c) still fails G7** (+0.91 ms commit p50 against 0.5 ms). Moving the document into a separate,
   unsynced, derived SQLite file filled off the commit path keeps its read cost and removes the commit-path cost.
6. **A binary row encoding (d) saves no CPU.** SQLite returning raw rows costs about the same as SQLite building JSON text
   ([M]: 161 to 203 µs against 200 µs for the same fields), and round 3 measured columnar transfer at +25 µs SQL, -26 µs parse. Its
   only use is shrinking the stored document's bytes.
7. **The round 3 calibration loop does not predict per-pull CPU** (section 4), so its "per calibration ms" normalization should be
   dropped. On a quiet host round 3's build would likely measure **800 to 1,000** pulls per CPU-second (1.2x to 1.5x of 677). Reaching
   1,100 from quietness alone needs 1.62x, which only R46's load-6-versus-load-34 span exceeded.

## 2. The budget and where the CPU is now

1,100 pulls per CPU-second is **909 µs of CPU per pull**, summed over every thread of the serving process (Q105a). The 1.2x screening
margin of Q99e is **758 µs (1,320 per CPU-second)**.

```
round 3 final build, c=1, loaded host (load 8.4), all threads ............ 1,477 us = 677 pulls/CPU-s
|
|- READER WORKERS ............................................... 766
|   |- owner row statement (78% of reader busy) ...... about 600   <- 83 KB tuple text, 15 fields, 7 dictionary joins per row
|   |- refs statement, entId cache, marker, glue ...... about 120
|   '- request messaging (MessageChannel per request) . about  45
|
|- MAIN THREAD .................................................. 515
|   |- JSON.parse of the tuple text (37% of main busy). about 190   <- driven by the same 83 KB
|   |- GC (12%) ......................................... about  63
|   |- adapter bucket + walk (11%) ....................... about  57
|   |- decode rest: ids, tuples to Triples, domain fast .. about  50
|   |- Effect runtime (7%) ............................... about  36
|   '- node internals, messaging, unattributed .......... about 120
|
'- OTHER THREADS (V8 GC helpers, 13%) ........................... 191

budget 909 us .............................................. gap 568 us (1.62x)
screening margin 758 us .................................... gap 719 us (1.95x)
```

**What the 83 KB is made of** [M] (300 owners, 458 rows per owner, 175.5 bytes per row as SQLite renders it):

| Field | Bytes per row | Share | Distinct per owner | Comment |
| --- | ---: | ---: | ---: | --- |
| transaction entity name (`te.name`) | 32.0 | 18% | 44 | repeated on every row of the same transaction |
| triple id (hex of a 16-byte blob, or 26-char text) | 32.0 | 18% | 458 | 66% blobs on this store; HS01 R2 stores W0 ids as integers |
| entity name | 20.7 | 12% | 150 | about 3 rows per entity |
| record instant `tx.at` and absolute valid-from | 26.0 | 15% | 44 | valid-from is `at + vf`; `vf` itself is an 8-digit offset |
| value (string, or ref target name for the 33% refs) | 10.9 | 6% | | |
| creator `c` | 9.0 | 5% | 1 | `"p5-seed"` on every row |
| `vto`, `y`, `x` (all null in W0), `sv` (always 1), blob flag, type | 15.0 | 9% | 1 | defaults |
| position | 6.8 | 4% | 44 | |
| attribute name | 7.1 | 4% | about 10 | 32 attributes exist in total |
| separators | 16.0 | 9% | | |

Round 3's dictionary-ids step failed because names moved to a per-process cache with a miss request, and about 160 entity names and
49 transactions per pull are unseen. Sending each name **once per fetch, inside the same answer**, needs no cache and no second
request, so the unseen-name problem does not apply.

## 3. Candidates, bottom-up

All estimates are in situ, all threads, on the same loaded host as round 3's 677, so they compare with 1,477 µs. Standalone numbers are
scaled by the measured in-situ factor of about 1.3 for reader SQL (600 in situ against 454 standalone) and about 1.06 for main-thread
parse (190 against 179). "Predicted" means unmeasured.

### 3.1 Summary table

| # | Candidate | µs per pull | Pulls per CPU-s | Reaches 909? 758? | P2 (commit, G7) | P1 (pinned reads, writers) | P5 (100k sweep) | Evidence |
| --- | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 0 | round 3 final | 1,477 | 677 | no / no | none | one read txn per pull | same per-pull cost | measured |
| a | shrink the tuple text | 1,150 to 1,250 | 800 to 870 | no / no | none | unchanged | same ratio, cold subjects included | SQL, bytes, parse [M]; GC predicted |
| a+e | (a) plus GC sizing and request-port reuse | 980 to 1,150 | 870 to 1,020 | borderline quiet / no | none | unchanged | same | (e) predicted |
| b | in-memory cache keyed by subject and basis, feed invalidation | hit 300 to 350; P4 draw about 900 to 1,000 | 1,000 to 1,100 on the P4 draw | no as measured | none | unchanged | no gain (each subject once) | arithmetic from (a) and [M] check cost |
| c | R46 per-subject document, written in the commit | 560 to 740 | 1,350 to 1,790 | yes / yes | **fails G7**: p50 +0.91 ms, p99 +0.41 ms, writer CPU +463 µs, WAL 2.1x | unchanged | gain if documents exist for all subjects | R46 bench4 [M there] |
| c' | **per-owner document in a separate derived file, filled off the commit path, staleness checked per pull** | 560 to 740 on a hit | 1,350 to 1,790 | yes / yes | commit path untouched; CPU and drive-flush interference to be measured | separate file, PASSIVE checkpoints only | gain if prefilled; stale subjects fall back | read pieces [M]; R46 W5d 247 µs |
| d | binary row encoding instead of JSON text | about equal to (a) | about equal | no | none | unchanged | none | [M] raw rows; QH1 R3 columnar |

### 3.2 (a) Shrink the tuple text: names once per fetch, drop per-row defaults

**Shape tested** [M] (variant V1 in appendix A): flat rows `[idKind, id, entityName, attrId, type, value, pos, vfOffset, creatorId]`;
a long form adds `vto, y, sv, x` only when any differs from its default (null, null, 1, null). Per fetch, one header of
`[pos, at, txName]` for the fetch's distinct positions (second statement), and the attribute and string dictionaries (32 attributes,
a handful of strings; send the used entries per fetch, no cross-pull cache). Main adds `at + vfOffset`.

| Measure [M], per owner, standalone | Round 3 statement (S0) | Shrunk (V1) | Ratio |
| --- | ---: | ---: | ---: |
| Text bytes | 80,828 | 45,720 | 0.57 |
| Reader SQL, thread CPU (rows statement plus tx header) | 454 µs | 340 µs | 0.75 |
| `JSON.parse` | 179 µs | about 100 µs (grouped variant at 40.1 KB: 90 µs) | about 0.55 |
| Decoded answers equal to S0 | | 300 of 300 owners (grouped variant) | |

Component costs of the rows statement on facts only [M]: range scan plus 7 integer fields as JSON 126 µs; adding the id (`typeof`
plus `hex`) +74 µs; the entity-name join +12 µs; the ref-name join +42 µs; the CASE wrappers +16 µs. The grouped-per-entity variant
(S1) is smaller (40.1 KB) but its SQL is **slower, 749 µs**, because `GROUP BY` sorts and `json()` re-parses each group: keep rows flat.

**Estimate in situ:** reader -150, parse -80, main GC and other threads -40 to -60 (fewer strings: 44 transaction names instead of
458) → **1,150 to 1,250 µs, 800 to 870 pulls per CPU-second.**

**Costs:** none on P2 or P1 (read path, same single read transaction). P5 gains the same ratio on cold subjects. Exactness risk: the
main thread now computes valid-from as `at + vfOffset`. When both are safe integers and the sum is safe, the result is exact. When
the sum exceeds 2^53, JS rounds the exact sum once, which equals SQLite's exact int64 sum converted to double. When either is REAL,
both sides do the same IEEE addition. This needs its own property test (section 5 gates).

**W0 ids after the HS01 round 2 merge** store as integers, which removes the `hex()` cost (74 µs standalone) but moves id text
reconstruction (base 36 plus head) to main. Predicted net -40 to -80 µs **on W0 only**; production ULIDs stay 16-byte blobs. Report
both shapes; never claim the W0-id gain for production.

### 3.3 (e) Two cheap runtime levers found in the profile

1. **GC sizing.** Main GC is 63 µs and V8 helper threads 191 µs per pull (together 17%). Allocation per pull is a few hundred KB of
   short-lived objects. `--max-semi-space-size=64` (fewer scavenges of mostly dead objects) and, as a separate arm,
   `--single-threaded-gc` (no helper-thread coordination) are flags on the serving process, recorded in the receipt, with no
   correctness risk. Predicted -50 to -150 µs. Unmeasured.
2. **Reuse one request port per reader worker.** `HostLog` creates a `MessageChannel` per request; the profile shows port setup,
   `addEventListener` and event-target work on both sides (about 10 to 20 µs each side, profile-inflated). Predicted -20 to -50 µs.

Applied after (a): **980 to 1,150 µs, 870 to 1,020 pulls per CPU-second.** This is the best row-path estimate. It does not reach
1,100 on a loaded host and cannot reach the 1,320 screening margin.

### 3.4 (b) An in-memory current-pull cache keyed by subject and basis, invalidated from the feed

Three problems, each decisive for P4 or P5:

1. **It does not move the P4 number as measured.** The P4 sample is a frozen bucket draw across all subjects; round 3's harness draws
   10,000 roots uniformly. A 256 MB cache of decoded owners (about 150 KB each) holds about 1,700 of 10,000 owners, so about 17% hits:
   0.17 x 330 + 0.83 x 1,060 ≈ 940 µs, about 1,060 per CPU-second at best.
2. **It does nothing for P5.** The activation sweep pulls each subject once.
3. **Feed invalidation is not exact by itself.** The feed consumer runs after publication, so a pull at the new position can arrive
   before the invalidation and get the old answer. Any cache must check staleness inside the pull's read transaction anyway.

**The exact check is cheap and makes the feed unnecessary.** The answer for owner `o` at basis `b` depends only on rows with `o` that
have `pos <= b` and `rpos > b`. If no row of `o` has `pos` or `rpos` in `(pd, b]`, the answer at `b` equals the answer at `pd`. So
an entry stamped with `pd` is valid for any `b` with `pd <= b <= marker` when `max(pos over facts of o, rpos over history of o) <= pd`,
read in the same transaction. Measured [M]: **18 µs per owner** warm (`max(pos)` over the owner range plus `max(rpos)` over history).
Valid time is not part of the key: the cached rows carry `vf` and `vto`, and the adapter applies the valid-time cut on decode, as H1
does today.

**Where (b) still helps:** hot-set traffic (TARGETS 2.1: 10 to 100 reads per write, at least 50% of reads on subjects written in the
last 60 s). A main-thread LRU of decoded owners keyed by `(owner, pd)` would skip parse and decode on repeat pulls (estimated 300 to
350 µs per hit). That is a P1 capacity lever for later, not the P4 answer.

### 3.5 (c) R46's per-subject document, and the off-commit variant (c')

**(c) in the commit transaction** [M in R46 bench4]: commit p50 2.99 → 3.90 ms (+0.91, fails the 0.5 ms G7 guard), p99 +0.41 ms,
writer CPU +463 µs, WAL bytes 2.1x. The cost scales with subject size, not commit size. Rejected for the same reason R46 gave.

**(c') the recommended variant:**

1. **Unit:** one document per owner (the owner's subtree only), holding exactly the shrunk text of (a) that `ownerRows(o, pd)` returns,
   plus a small column listing its external ref targets so the worker can follow them without parsing. Shared entities (location,
   jurisdiction) are owners too and get their own documents, so one jurisdiction change makes one document stale, never 1,000.
2. **Storage:** a separate SQLite file (`current.db`), WAL, `synchronous=OFF`, PASSIVE checkpoints only, never part of the source of
   truth, rebuildable from rows, deletable at any time. Its writes never take the store's write lock.
3. **Fill:** read-through. On a miss the reader already ran `ownerRows(o, b)`; if `b >= lastChange(o)` from the same transaction, it
   upserts `(o, pd = lastChange(o), text)` with `WHERE excluded.pd > current.pd`, `busy_timeout=0`, and skips the write on BUSY. An
   optional low-priority prefill walks owners for P5. No feed consumer, no commit-path work.
4. **Serve:** in the pull's read transaction on the store, for each owner reached: compute `lastChange(o)` (18 µs), read the document
   from `current.db`; serve it when `doc.pd == lastChange(o)` and `doc.pd <= b`; otherwise use the row path. The two files need no
   common snapshot, because the document is accepted only when the store's own snapshot proves it current.
5. **Erasure:** an erasure must move `lastChange(o)` (written as a change at a new position) or bump a global erasure sequence that
   every document carries and every pull compares (TARGETS section 7 item 7). This is a design requirement, tested by a mutant.

**Read cost on a hit, bottom-up:**

| Piece | Standalone µs | Source |
| --- | ---: | --- |
| request, marker, glue | about 30 | round 3 profile, de-inflated |
| 3 owner staleness checks (placement, location, jurisdiction) | 54 | [M] 18 each |
| document reads (40 to 46 KB plus two small) | about 22 | [M] 11 to 13 µs for a 40 KB text by key |
| worker total, x 1.3 in situ | **about 140** | |
| main: parse 95 to 105, decode 60, adapter 57, Effect 36, domain 15, messaging and internals 45, GC 40, unattributed 30 | **about 380 to 400** | [M] parse; round 3 profile for the rest |
| other threads | **100 to 120** | allocation roughly halves |
| **total** | **620 to 660 (range 560 to 740)** | **1,350 to 1,790 per CPU-second** |

R46 measured its compact document arm at 247 µs (W5d), without the adapter, Effect and messaging that the real stack carries; the
estimate above keeps those.

**Costs and risks of (c'):**

| Area | Effect | How the experiment checks it |
| --- | --- | --- |
| P2 commit latency | No commit-path work. Risks: fill CPU on shared cores, and drive-cache flushes (`F_FULLFSYNC` on macOS, virtio flush in the VM) that now also carry `current.db` pages | G7 under Q104a with fills running (section 5) |
| P1 | Store reads unchanged; `current.db` is never written by the commit writer; a long `current.db` read only delays that file's checkpoint | long-read test on `current.db` during commits |
| P5 | Sweep at a pinned basis: documents with `pd <= b` are served; subjects changed after `b` fall back to rows, exactly | prefilled 10k sweep arm |
| Storage | about +85 to 100 B per fact (45.7 KB / 458 facts = 100 B). W0 at HS01 R2 goes 217 → about 310 B per fact, over the 300 B G9 bar; ULID-shaped 308 → about 405. A binary document (d) would cost an estimated +40 to 60 B per fact. Q107-S option A would save more than that from the journal | report `current.db` bytes beside G9; G9 is an orchestrator bar, so the trade goes to the orchestrator |
| Memory | 10k documents are about 450 MB, beside a 0.97 GB store; R44's caps are 1 GiB (broker) and 0.75 GiB (reader service) | report RSS and page-cache footprint; VM sizing is R44 item 8's open question |
| VM layout | `current.db` is derived and lives with the reader role, not the source store; Q100o restricts writes to the source store only | state it in the receipt; ruling only if challenged |
| GS.02 | The reconcile pull right after a commit always misses and takes the row path, then fills | report hit share and miss cost under the writer trace |

### 3.6 (d) Binary row encoding

Measured [M] on the same rows: `raw().all()` arrays with Buffer ids 203 µs, with `hex` ids 161 µs, against 200 µs for SQLite-built
JSON text of the same fields. The worker would then add a JS packing loop (about 50 to 90 µs), and the main thread would create the same
id, name and value strings from bytes instead of from `JSON.parse`. Round 3 measured the columnar JSON variant at no gain, and R46's
compact-columns arms (W4b, W4d at 526 to 659 µs) matched its SQLite-text arm (W6 at 651 to 676 µs). Net CPU about zero, plus a new
codec to qualify under Q105b. **Use only as the storage format of (c') if G9 bytes become the binding constraint.**

### 3.7 Other options considered

1. **Moving decode or BFS into the worker:** moves CPU between threads, does not reduce it. Rejected for a per-CPU-second bar.
2. **Folding the refs statement into the rows statement:** about 40 µs standalone; small, and (c') removes it on hits. Deferred.
3. **Q107-S (journal record):** no effect on pull CPU (the journal branch already returns nothing for placement owners), but it
   frees the bytes (c') needs.

## 4. Measurement: an absolute bar on a loaded host

### 4.1 What the round 3 evidence says

1. **The calibration loop does not track per-pull CPU.** It is one 1M-iteration loop timed by wall clock before each segment. Over
   every segment of round 3 [M from `abab/*/r*-*.json`], the low-calibration quartile and the high-calibration quartile give nearly the
   same CPU per pull: `final` 1,482 µs at 1.65 ms against 1,438 µs at 3.71 ms; `s4b` 1,535 against 1,562; `baseline` 5,708 against
   6,015. The `cpuUsPerPull_perCalibrationMs` column in the round 3 summaries therefore normalizes nothing and should not be quoted.
2. **Spread of the same build:** `final` per round 1,265 to 1,526 µs (1.21x) in one run; `s4b` c=1 1,468 against 1,562 between two
   runs, c=4 1,665 against 1,423. R46 measured 1.5x to 1.8x between load averages 6 and 34 (W4b 583 against 1,066 µs).
3. **Every round 3 window was loaded** (load 7 to 12, calibration median 1.7 to 2.8 ms; the best calibration ever seen was 0.84 to 0.97).

### 4.2 Could 677 be materially higher on a quiet host?

Probably 20% to 50% higher, not 62%. On Apple silicon, CPU time per unit of work rises when threads land on efficiency cores and when
shared caches and memory bandwidth are contended; at load 8 to 12 on 6 performance plus 6 efficiency cores, some reader and main-thread
time very likely ran on efficiency cores. Round 2's quieter stage window ran about 1.3x cheaper than its in-situ ABAB. **Prediction for
`final` in a GREEN window: 800 to 1,000 pulls per CPU-second.** If it measures 1,100 or more, the row path is already at the bar and the
experiment below shrinks to (a) for margin.

### 4.3 How the next round measures absolute pulls per CPU-second

1. **A GREEN window (Q100k).** Lab heavy jobs paused, and Sam's default colima VM paused if Q100-S1 is approved; otherwise a passive
   recorder finds a quiet window (likely night). Record load average every segment.
2. **Replace the wall-clock calibration with a CPU reference probe.** A fixed workload shaped like a pull (one fixed owner statement in a
   reader worker plus `JSON.parse` of a fixed 80 KB text on main), timed in thread CPU in each segment, in the same process. Establish its
   quiet value once; a segment counts toward the absolute verdict only when the probe is within +10% of that value. The probe is a window
   grade, never a divisor.
3. **A/A inside every run.** Run the candidate build as two separate arm processes (A and A') interleaved with the comparison arm, at
   least 3 rounds (M01 PAIR-0), to get s_d of per-round CPU per pull. The absolute verdict is the median over rounds with a bootstrap 95%
   interval whose lower bound is at least 1,100 (and at least 1,320 before any acceptance attempt, Q99e).
4. **Longer windows:** at least 5,000 measured pulls per arm per round (round 3 used 3 x 500), c=1 and c=4, per-thread split beside the
   total, all threads counted once with `process.cpuUsage()` (round 2 confirmed it includes workers).
5. **The acceptance series is the VM (Q100a).** Mac numbers stay a separate diagnostic series. When a slot is granted, repeat steps 2 to 4
   in the triplex2 VM with cgroup `cpu.stat usage_usec` of the serving container as the denominator (R46 4.3). The VM's vCPUs are host
   threads, so the host must be quiet there too.
6. **Not available without root:** instruction counters (`powermetrics`, kperf) and P-core pinning on macOS. The lab cannot force
   performance cores, so the GREEN grade and the probe are the controls.

## 5. Recommended experiment: EXP-P4N

**Goal:** measure where the round 3 build really stands in a quiet window, shrink the row path, and build the off-commit current
document (c') only if the row path misses the 1,320 screening margin. One builder round per phase; Sonnet 5.5 builder, Codex reviewer.

**Base:** QH1 round 3 (`7965540b`) merged onto the accepted HS01 head (round 2 or 3, integer W0 ids). Store: a fresh 10k W0 seed on
that layout, plus HS01 R2's ULID-shaped diagnostic seed for a side measurement.

### 5.1 Ordered steps

| # | Step | Output |
| --- | --- | --- |
| 0 | Write `PREDICTIONS.md` (section 5.2) and commit it before any measurement | committed predictions |
| 1 | Harness: replace the calibration loop with the CPU reference probe; add A/A arms; 5,000 pulls per arm per round; bootstrap intervals | harness commit |
| 2 | **Quiet baseline:** measure `final` (round 3 build, on the merged base) in a GREEN window, c=1 and c=4, with A/A | the absolute number for today's best build |
| 3 | **Row path (a):** shrunk tuple text exactly as V1 (flat rows, tx header per fetch, attribute and string entries per fetch, defaults omitted, `vf` as offset); paired ABAB against `final`; per-step answer equality | `s-a` build and ratio |
| 4 | **Runtime levers (e):** arms `s-a` + `--max-semi-space-size=64`, `s-a` + `--single-threaded-gc`, and `s-a` + one request port per reader; keep a lever only if its paired ratio is below 0.97 in every round | `s-ae` build and ratios |
| 5 | **Decision point:** if `s-ae` in a GREEN window has a bootstrap lower bound >= 1,320 at c=1 and c=4, skip to step 8 | go or no-go for (c') |
| 6 | **(c') current documents:** `current.db`, read-through fill, staleness check by `lastChange(o)`, erasure sequence, prefill command; route `QH1d` registered in RQ01 | `s-doc` build |
| 7 | Measure `s-doc`: reads-only prefilled (hit path), reads-only cold (fill path), and writer trace on (hit share, miss cost); P5 arm: prefilled 10k sweep at a pinned basis | P4 numbers, hit share, fill CPU, `current.db` bytes and RSS |
| 8 | Gates (5.3) on the kept build; report; stop | REPORT.md |

### 5.2 Predictions (commit before measuring)

| # | Quantity | Prediction | Falsified if |
| ---: | --- | --- | --- |
| 1 | `final` in a GREEN window, c=1 | 800 to 1,000 pulls per CPU-second | above 1,100 or below 700 |
| 2 | Reference probe, quiet against round 3 load | 1.2x to 1.5x cheaper | under 1.1x |
| 3 | (a) text bytes per pull | 0.55 to 0.60 of `final` (about 46 to 50 KB) | above 0.65 |
| 4 | (a) reader statement, standalone | 0.72 to 0.80 of `final` | above 0.85 |
| 5 | (a) paired CPU ratio to `final`, in situ | 0.78 to 0.85 | above 0.90 |
| 6 | (e) GC sizing, paired against `s-a` | 0.90 to 0.97; other-thread CPU 191 → 100 to 150 µs | above 0.99 |
| 7 | (e) port reuse, paired against `s-a` | 0.97 to 0.99 | above 1.0 |
| 8 | `s-ae` paired ratio to `final` | 0.66 to 0.78 (980 to 1,150 µs loaded) | above 0.82 |
| 9 | `s-ae` in a GREEN window | 1,050 to 1,350 pulls per CPU-second | below 1,000 |
| 10 | `s-doc` hit path, paired ratio to `final` | 0.38 to 0.50 (560 to 740 µs loaded) | above 0.55 |
| 11 | `s-doc` hit path in a GREEN window | 1,600 to 2,300 pulls per CPU-second; reader under 200 µs, main 330 to 420 µs | below 1,320 |
| 12 | `s-doc` p50 / p99 at c=1 | 0.4 to 0.7 ms / 2 to 4 ms | p99 above 6 ms |
| 13 | Commit p50 delta with fills running | -0.1 to +0.15 ms | above +0.5 ms |
| 14 | Commit p99 ratio with fills running | bootstrap interval contains 1.0 | lower bound above 1 + A/A band |
| 15 | `current.db` at 10k | 85 to 100 B per fact (380 to 450 MB); prefill 5 to 15 s | above 120 B per fact |
| 16 | Miss cost (row path plus fill) | `s-ae` cost + 30 to 60 µs | + more than 120 µs |

### 5.3 Gates

| Gate | Pass rule |
| --- | --- |
| O-REPLAY equality, 100k | 100,000 pulls per kept build against today's row route by full-field digest, round 3's request mix (80% head with eight valid-time offsets, 15% record-time cut, 5% before it). **Plus a mutation replay for (c'):** a writer segment of at least 2,000 commands on hot owners interleaved with pulls at bases before, at and after each commit, compared with the row route at the same basis: zero mismatches. Independent Python O-REPLAY on the 30-root fixture (retractions, replacement, expiry, position cuts) passes through the shrunk route and the document route |
| Stale-document mutant | Removing the `lastChange(o)` check, or storing a fill made at a past basis with the current `pd`, must produce mismatches in the mutation replay and fail RQ01 |
| RQ01 | Routes `QH1s` (shrunk rows) and `QH1d` (documents) registered beside `source`; zero route violations; owner-rule, purge-between-hops and erasure-sequence mutants all fail |
| REAL round-trip (Q105b) | `real.test.ts` (3,000 doubles including 5e-324, MAX_VALUE, 2^53 neighbours, random bit patterns) bit-exact through both new routes; the 100,000-value codec gate through the shrunk codec; a new property test that main-side `at + vfOffset` equals SQLite's `(tx.at + f.vf)` rendering for int+int (safe and beyond 2^53), int+REAL and REAL+REAL, negative offsets included |
| P2 guard (G7 under Q104a) | At least 1,000 matched 10-fact commits per arm after warmup, arms: rows-only, rows plus fills running (readers pulling hot owners), and an A/A twin of rows-only; at least 3 rounds for s_d (M01 PAIR-0). p50 delta <= 0.5 ms at n >= 150. p99 counts as a regression only if the bootstrap 95% interval of the B/A ratio has a lower bound above 1 + the A/A band. GREEN window. Writer thread CPU per commit reported per arm |
| P1 | A `current.db` read transaction held for 10 s during commits leaves commit latency inside the A/A band; `current.db` is only checkpointed PASSIVE |
| Latency | Weighted p50 <= 5 ms and p99 <= 25 ms; largest bucket p99 <= 50 ms; per-bucket table from the authoritative W0 draw |
| Accounting | All threads of the serving process counted once (Q105a), including the fill and prefill threads; hit share and fallback share reported per window |

### 5.4 Stop rule

1. **Stop after step 5 with the row path** if `s-ae` passes 1,320 (lower bound) in a GREEN window. Do not build (c').
2. **Stop after step 7** whatever (c') measures. If `s-doc` misses 1,320 in a GREEN window, or prediction 10 is falsified, do not tune
   further: send the orchestrator the measured numbers and R50's question for Sam (whether the 1,100 bar, which comes from P5's 100 s on
   one core, should hold as a per-pull bar on the bucket draw).
3. **Stop at once** if any exactness gate fails twice for the same cause, or if G7 fails under Q104a with fills running and no
   mechanism is found within the round.
4. **Budget:** two builder rounds plus review. No 100k rung in this experiment (disk); 100k is arithmetic only.

## 6. Open questions for the orchestrator

1. **G9 against P4.** (c') adds about 100 B per fact of derived bytes, pushing W0 from 217 to about 310 B per fact. P4 ranks above
   storage size in Sam's list, but G9 is the lab's working-set guard. Proposed: report `current.db` separately and decide after step 7,
   with Q107-S option A and a binary document as the offsets.
2. **Q100-S1.** A GREEN window for step 2 is much easier if Sam lets the lab pause his default colima VM for an announced hour.
3. **HS01 merge.** Steps 2 to 8 assume QH1 round 3 rebased on the accepted HS01 head; the codec and route checks must be rerun after it.

## Appendix A. What was measured for this brief

Scratch scripts (disposable, in the session scratchpad): `shrink.cjs`, `variants.cjs`, `floor.cjs`, `maxpos.cjs`, `fields.sql`. They
read an APFS clone of `evidence/QH1-R3/store-candidate/broker.db` (the evidence store itself was opened only with `immutable=1`
read-only); the clone was deleted afterwards. Node 22.23.2, better-sqlite3 12.10.0 (SQLite 3.53), `mmap_size` 256 MB, basis = marker
position 6,958,095, 300 placement owners chosen by `ORDER BY (eid*2654435761) % 1000003`, thread CPU by `process.threadCpuUsage()`,
arms interleaved per owner with alternating order, first pass dropped, medians of 5 passes. Host load average 8 to 11.

**S0** is round 3's `h1Rows` owner statement as built by `sqlite-worker.ts` (unguarded names), with `qh_fallback` replaced by NULL
(W0 has no json or non-numeric number rows). **V1** rows statement:

```sql
SELECT json_group_array(
  CASE WHEN f.vto IS NULL AND f.y IS NULL AND (f.sv IS NULL OR f.sv=1) AND f.x IS NULL
    THEN json_array(typeof(f.id)='blob', <id as hex or text>, e.name, f.a, f.t, <value as in S0>, f.pos, <sn(f.vf)>, f.c)
    ELSE json_array(<same 9 fields>, <sn(f.vto) or NULL>, f.y, <sn(coalesce(f.sv,1))>, <x as in S0>) END)
FROM (<facts UNION ALL journal UNION ALL history, o=@o, pos<=@b, history rpos>@b>) f
JOIN ents e ON e.eid=f.e LEFT JOIN ents ref ON f.t=5 AND ref.eid=f.v;
-- tx header, second statement:
SELECT json_group_array(json_array(t.pos, <sn(t.at)>, te.name)) FROM txs t JOIN ents te ON te.eid=t.tx
WHERE t.pos IN (SELECT pos FROM (<same union>));
```

| Result | Value |
| --- | --- |
| Rows per owner | 458.0 |
| S0 / V1 / grouped S1 bytes per owner | 80,828 / 45,720 / 40,106 |
| S0 / V1 / V2 (entity ids plus entity header) / S1 reader SQL µs | 454 / 340 / 375 / 749 |
| `JSON.parse` S0 / S1 | 179 / 90 µs |
| S1 decoded equal to S0 | 300 of 300 owners, 137,403 rows |
| Facts-only components | 7 int fields 126; + id 200; + entity name 212; + ref name 254; V1 270 µs |
| Raw rows instead of JSON (same fields) | Buffer ids 203, hex ids 161 µs |
| Stored text read by key | 80.8 KB 21 to 28 µs; 40.1 KB 11 to 13 µs; 40.1 KB plus parse 98 to 115 µs |
| Owner staleness check (`max(pos)` facts, `max(rpos)` history) | 18 µs warm (122 µs on the first, cold pass) |
