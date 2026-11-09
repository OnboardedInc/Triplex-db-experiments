# R37: golden scenario readiness audit (GS.01 to GS.20 on three lanes)

Planner: R37 (Opus 5.5, high). Date: 2026-11-09 (UTC). Repository: /Users/sam/projects/triplex-db-2, main at 8d098718.
Goals and targets come only from lab/SCOPE.md, lab/NORTH-STAR.md and lab/TARGETS.md (sections 1.1, 2.1, 6, 6.1, 7).
North star: GS is part of the done condition on all three lanes (SCOPE 2.5, TARGETS 6 rule 5); this audit moves no priority by itself.
It orders the work that lets the 20 scenarios measure P1 to P5 under the expected load.

## Summary

**No GS cell passes on any lane.**

| Lane | PASS | FAIL (ran) | CANNOT RUN | BLOCKED by a ruling | Total |
| --- | --- | --- | --- | --- | --- |
| X: XTDB 2.2.0 | 0 | 17 | 3 | 0 | 20 |
| Q: QLever 0.6.0 plus broker | 0 | 0 | 20 | 0 | 20 |
| D: Datomic Pro on Postgres (Q88b) | 0 | 0 | 18 | 2 | 20 |

1. **Lane X ran 17 scenarios, all FAIL, all diagnostic.** 12 had a database PASS and failed only bars (and domain checks that fail
   closed). 5 had a database FAIL. Across all 19 executed XTDB receipts, no read returned a wrong answer; every database failure is an
   error, an unaccounted command, or one real core defect (GS.12).
2. **Lane Q has never executed a scenario.** Its only receipt ran zero cases because the engine was down. The broker is unmerged, and
   Q91a makes any run on today's delta-only resident diagnostic.
3. **Lane D has no GS entry point at all.** The GS runner and gate accept only xtdb and qlever; the Datomic adapter is unmerged and
   lane D acceptance needs Postgres storage (Q88a, Q88b), which has not started.
4. **The harness itself is not yet able to close any GS obligation on any lane**, independent of engines: it uses its own world
   vocabulary instead of W0, so O-DOMAIN cannot judge its streams; its background trace is not the frozen TARGETS 2.1 trace; it admits
   its world by process evidence (Q93a forbids); and the contract's case set CS-GS is still TO-AUTHOR.
5. **Year-one size does not fit this host for any lane** (R34: the W0 100k population is 44.5M facts). TARGETS 6 rule 3 asks for
   year-one size, so a rung ruling from Sam is needed before any GS acceptance run (proposed ruling R37-a).

## 0. Sources read

| Source | What it gave |
| --- | --- |
| lab/STATE.md, lab/NOTEBOOK.md (2026-11-08 21:12Z to 2026-11-09 01:31Z) | merged, in-review and queued work; the scale window plan |
| lab/scenarios on main | the W01 merge (4989c7a7), older than W01b |
| branch exp/W01-golden-scenarios at 1d191991 (worktree .claude/worktrees/agent-af5dc0c632c7cd817) | the newest harness, REPORT-W01b.md, EVIDENCE-W01b.json, 13 more receipts. NOT merged to main |
| lab/runs/GS on main (10 receipts) and on the W01b branch (14 receipts) | per-scenario verdicts, bars, accounting, first failures |
| lab/acceptance/obligations.json (contract 0.3.12) | GS.01 to GS.20 obligations, CR-GS, GATE-POSITION, GATE-W0, CS-GS, T-RUNS |
| lab/acceptance/RULINGS.md, RULINGS-PENDING.md | Q24, Q38f, Q49, Q52, Q58e, Q68, Q78, Q88, Q89, Q90, Q91, Q92, Q93 |
| lab/research/R19, R34; lab/world/W0/SPEC.md; lab/oracles/domain/README.md | tenancy options; P5 data volume; W0 vocabulary and rules |
| branches exp/DA01-datomic-adapter, exp/SQL01-broker-sqlite, exp/P2Q-qlever-log-broker, exp/P5-release-sweep, exp/RQ01-route-equivalence, exp/G03-executing-gate | what each lane can run today |

## 1. The 20 scenarios against the three lanes

### 1.1 Cell key

| Code | Meaning |
| --- | --- |
| FAIL (ran) | a receipt exists with at least one executed case; the reason is given |
| CANNOT RUN | something is missing: product feature (P), harness piece (H), engine or lane capability (E), unmerged branch (B), oracle or W0 rule (O) |
| BLOCKED | the cell cannot proceed until a pending ruling is decided; no provisional ruling lets builders go ahead |
| PASS | none |

Every cell on every lane also needs the cross-lane prerequisites in section 1.5. They are not repeated per cell.

### 1.2 Lane X (XTDB 2.2.0): 17 FAIL, 3 CANNOT RUN

All XTDB receipts ran on the shared dev resident tx2-xtdb-dev (2 CPUs, 3 GiB), at rung 10k, with 1 reader against 256, scope
`subset:1/20 rung=10k readers=1 reduced-profile`, runKind `diagnostic`, contract 0.3.5 or 0.3.9, composition `triplex-public`
(Triplex A0 on XTDB), with other slots co-running (`coRunning` lists tx2-xtdb-s1 or s2 and tx2-qlever-dev).
Receipt ids are `GS-xtdb-<id>`; "main" means lab/runs/GS on main, "W01b" means the branch.

| GS | Verdict | Receipt (latest) | Database | Why it fails (from the receipt) |
| --- | --- | --- | --- | --- |
| 01 Monday rush | FAIL | 20261108T061758Z-f18ead (W01b) | PASS 18/0 | bars: commit p99 2,064,772 ms, read p99 26,777 ms, writer max wait 3,390,147 ms. The spec's domain claim (next task per reconcile pull) is never checked: 01/run.mjs has no expectDomain call |
| 02 Form submit | FAIL | 20261107T224353Z-4e292a (main) | PASS 34/1 | bars: commit p50 153,898 ms, p99 400,407 ms, first-pull p99 9,591 ms. first-pull-visible = 1.0 holds. Domain check fails closed (O-DOMAIN not wired) |
| 03 Webhook storm | FAIL | 20261107T225708Z-1516b3 (main) | PASS 51/1 | bars: commit p99 358,637 ms, feed lag p99 10,418 ms. Domain check (late older revision acknowledged `superseded`) fails closed; W0 has no such rule |
| 04 Lost ACK and restart | FAIL | 20261108T105742Z-843235 (W01b); earlier 20261107T230402Z-7dfa27, 20261108T011330Z-f2843e (main) | FAIL 15/41 | `ManagedRuntime disposed` and `All fibers interrupted` during the client restart (a harness race, fixed in c9baf21 and never rerun); 18 trace and 15 scenario commands unaccounted; pinned reads after restart 0 of 14 identical. Engine kill NOT_RUN (needs an exclusive slot); GS.04b NOT_APPLICABLE (no separate current index) |
| 05 Background-check burst | FAIL | 20261108T035651Z-2d7a5f (W01b) | PASS 18/0 | bars: read p99 6,907 ms, feed lag p99 22,811 ms. Domain claim not checked (no expectDomain) |
| 06 Decision fan-out | FAIL | 20261108T071743Z-54a313 (W01b) | PASS 16/0 | bars: commit p99 1,236,479 ms, feed lag p99 32,951 ms. GS.06b (shared location wage, affected set) is not checked (no expectDomain) |
| 07 Two reviewers | FAIL | 20261107T221803Z-d93ea6 (main) | PASS 17/0 | bars only: commit p99 285,733 ms, writer max wait 752,639 ms. 15 of 30 race commands got typed conflicts, as designed |
| 08 Address since October | FAIL | 20261107T231154Z-7221ef (main) | PASS 22/1 | bars: feed lag p99 12,122 ms, read p99 6,107 ms. Domain check fails closed |
| 09 Start dates move | FAIL | 20261108T022408Z-0a94e7 (W01b) | FAIL 8/49 | untyped ReadError and WriteError under engine overload; 20 trace and 21 scenario commands unaccounted; bars: read p99 30,013 ms, feed lag p99 3,284,902 ms. Domain claim not checked |
| 10 Release activation | FAIL | 20261107T234921Z-69e6d2 (main) | PASS 20/3 | bars: projected 100k sweep 136,040,199 ms (37.8 h), live commit p99 ratio 30.8; live read ratio 1.07 holds. Domain checks fail closed; no product outbox (spec gap); in-flight reconciles on the old release not built (R34 defers it, Q92j) |
| 11 Plan impact preview | FAIL | 20261108T043222Z-7b11df (W01b) | FAIL 16/4 | 87 preview inputs failed to read and 22 reader read errors (0 wrong answers); bars: projected 100k preview 594,692,779 ms |
| 12 Audit March 3 | FAIL | 20261107T223210Z-1bfd1d (main) | FAIL 20/3 | **real core defect:** an int64 overflow returns WriteError, not InvalidTripleError. Root cause on the W01b branch (12-audit-march-3/scenario.json `findings`): packages/core/src/store/TriplesLive.ts:277-288 never validates assert values; packages/xtdb/src/codecs.ts:84 throws RangeError; XtdbStorageAdapter.ts:456 wraps it. Proposed fix.patch is unmerged (`grep InvalidTripleError(` in packages/core/src finds no constructor on main). Bars: read p99 9,094 ms |
| 13 HRIS backfill | FAIL | 20261108T090034Z-67b0ec (W01b) | FAIL 8/28 | untyped `WriteError: undefined`; 10 trace and 9 scenario commands unaccounted; bulk read ratio not computed (null); trace commit p99 5,402,804 ms. No separate throttled bulk lane exists |
| 14 Account factory | CANNOT RUN | none (NOT_RUN by spec) | n/a | H: multi-tenant runner (one composition per tenant, per-tenant metrics); P: per-tenant storage (R19 bridge: large tenant own database, small tenants in cell databases). Its isolation verdict needs Sam's R19 call (pooled cells with per-tenant keys as storage isolation; provisional yes) |
| 15 Tenant mix | CANNOT RUN | none (NOT_RUN by spec) | n/a | as GS.14, plus H: the storage-level cross-tenant probe and the 10x slow consumer of TARGETS 6.1 |
| 16 PII erasure | CANNOT RUN | none (NOT_RUN by spec) | n/a | P: no erase or crypto-shredding on the public API (no `erase` in packages/*/src); goldens exist (O-REPLAY erase ops) |
| 17 Agent proposals | FAIL | 20261108T033759Z-3300a4 (W01b) | PASS 18/0 | bars: commit p99 1,051,698 ms, P4 read p99 13,668 ms. Domain claim (proposals never count) not checked |
| 18 Recruiter dashboards | FAIL | 20261108T080434Z-87b722 (W01b) | PASS 17/0 | bars: read p99 18,266 ms. P: no maintained projections (lists are built from per-subject pulls); H: the unchunked `find` case and the cursor-stability case are not generated; overdue domain claim not checked |
| 19 Feed consumer crash | FAIL | 20261107T232011Z-98ca23 (main) | PASS 24/2 | bars: feed lag p99 21,473 ms, affected-known lag p99 20,923 ms. Domain checks fail closed. The outbox is a harness JSON file beside the consumer (19/run.mjs:15), not the product's atomic outbox |
| 20 Midnight expiry | FAIL | 20261108T040852Z-98261c (W01b) | PASS 17/1 | bars: read p99 14,489 ms, feed lag p99 39,282 ms. Domain check fails closed. The time-only re-run needs a next-boundary scheduler, not a feed entry |

**Why every bar fails on lane X.** The `triplex-public` composition runs commits single-flight (writerConcurrency 1,
lab/scenarios/lib/composition.mjs:42 and 74-79 on the W01b branch) because A0 allocates positions with a scope-wide compare-and-set,
and 4 to 16 writers produced a retry storm. So every commit waits behind every other one, on a shared 2-CPU resident measured at 0.1
to 1 commit/s. Commit latencies of 285 s to 5,403 s are queueing, not engine service time. The fix is the composition (broker log
P2B, or per-subject keys P2X), not the scenarios.

**Aborted attempts (no scenario completed):** 20261108T211523Z-ea6353 (build failed, explicitly aborted) and
20261108T212031Z-015daa (stopped after 310 s live; 5 commands settled, 57 pending; zero scenarios). Neither changes any cell.

### 1.3 Lane Q (QLever 0.6.0 plus broker): 20 CANNOT RUN

The only receipt, GS-qlever-20261107T205955Z-c31274 (main, rung smoke, 2 readers, contract 0.2.0), executed zero cases. Its reasons
are `tx2-qlever-dev is not running`, `missing identity field counts`, `zero executed cases`. The harness accepts `--lane qlever`
(lab/scenarios/run.mjs:23), but four things are missing for every cell:

| Missing | Kind | Where it stands |
| --- | --- | --- |
| The broker composition on main | B | P2Q (exp/P2Q-qlever-log-broker 3536d8da) in review round 8; SQL01 (exp/SQL01-broker-sqlite 4863a8e0) accepted default-off and merges after P2Q in one integration round |
| The GS gate selecting the broker | H | the broker is chosen by `QLEVER_COMMIT_PATH=broker` and `QLEVER_BROKER_DIR` (packages/qlever/src/index.ts:40-48 on SQL01); gate.mjs GS never sets them and the receipt does not bind the broker directory |
| A built base index with a bounded delta | E | Q91a: QLever evidence counts only from a built base; qlever-dev's base holds 1 triple. EXP-QG1 is step 1 of the scale window, not started |
| Base and delta triple counts in the GS receipt | H | Q91a requires them in every QLever receipt; the GS receipt has no such field |

Scenario-specific gaps on lane Q, on top of those four:

| GS | Extra need on lane Q |
| --- | --- |
| 04 | engine kill means the broker process (P2Q tested 80 abrupt stops) and the QLever server; GS.04b is applicable here because H1 is a separate current store (SQL01) |
| 12 | the `2^60` write must fail typed (60-bit inline integers); GS.12's core fix (section 2) applies to every lane |
| 14, 15 | P: per-tenant log of record and cell indexes (R19 bridge for QLever); Sam's R19 call as on lane X |
| 16 | P: crypto-shredding of frame payloads in the broker log (Q58e), `cur` graph holds no PII literals (Q68f), index rebuild after erasure, FSST-aware scan with canaries (Q82d) |
| 18 | P: maintained projections; a QLever list query must read a built generation, not the delta |

### 1.4 Lane D (Datomic Pro on Postgres): 18 CANNOT RUN, 2 BLOCKED

| Missing for every cell | Kind | Where it stands |
| --- | --- | --- |
| A GS entry for lane D | H | lab/scenarios/run.mjs:23 accepts only xtdb and qlever; gate.mjs on DA01 allows `--lane datomic` only for G0 and G1 (exp/DA01 lab/bin/gate.mjs:714) |
| The Datomic adapter on main | B | exp/DA01-datomic-adapter da76bad6, round 5 building after V-DA01 round 2 FIX-FIRST (repeated :where or :in sections bypass route classification) |
| Postgres storage | B | Q88a: dev-storage evidence is diagnostic for every lost-ACK and P2 receipt obligation; EXP-DA04 has a brief only (lab/experiments/EXP-DA04-sql-storage/BRIEF.md) |
| A feed and lost-ACK resolution on the lane D path at GS load | E | DA03's NS smoke has not run; lane D P1 to P5 costs are unmeasured estimates (R29) |

| GS | Status | Extra need on lane D |
| --- | --- | --- |
| 01-13, 17-20 | CANNOT RUN | the four rows above; GS.04 engine kill means the transactor and Postgres (DA04 probes D1, D2); GS.04b is not applicable unless lane D adds a separate current store (`:f/live` is inside Datomic) |
| 14 | BLOCKED | Q78e (Sam): tiered, silo-all or pool-all; one transactor owns one storage table, so schemas and row security cannot split one system (RULINGS-PENDING Q88 row) |
| 15 | BLOCKED | Q78e, as GS.14 |
| 16 | CANNOT RUN | P: crypto-shredding first, excision second (Q88c ruled); keys in their own Postgres schema; DA04 step 8 only measures the excision inventory |

### 1.5 Cross-lane prerequisites (every cell on every lane)

| # | Prerequisite | Kind | Evidence |
| --- | --- | --- | --- |
| C1 | GS streams in W0 vocabulary, so O-DOMAIN can judge them | H, O | the GS world uses `:i9/*`, `:placement/branch`, `:worker/email` (lab/scenarios/lib/gen.mjs on W01b); W0 has no such attributes and rejects unknown ones with `W0.E_UNKNOWN` (lab/world/W0/SPEC.md section 3) |
| C2 | O-DOMAIN wired into the harness | H | lab/scenarios/lib/domain.mjs:25-28 fails closed even when lab/oracles/domain/cli.py exists ("the W01 adapter is not wired yet"); the W01b branch predates O-DOMAIN on main |
| C3 | every scenario that names a domain claim checks it | H | expectDomain appears in 02, 03, 08, 10, 11, 12, 19, 20 only; 01, 05, 06, 09, 17, 18 list domain claims and never check them, so they could PASS without them |
| C4 | the frozen TARGETS 2.1 trace as the background | H | the GS trace is a private generator (gen.mjs writerTrace, lines 310-311): 200-subject pool, no active set or Zipf, `burstOffsetMs = Infinity` (no burst ever), 12 to 30 s live windows |
| C5 | world admitted by content fingerprint (Q93a) | H | ensureWorld (runner.mjs:66-80) checks the last batch by commandId; every receipt shows `world.loaded: false` on one shared scope whose position grew from 193 to 1,426 across runs |
| C6 | bases named by position, then by decided record time | H, B | the runner pins `R = now - 1 ms` (runner.mjs:8-13); Q89a (D-C1) makes a recordedAt pin non-reproducible until RT01 lands; Q92a names the pattern (recordedPosition from the receipt) |
| C7 | the case set and its manifest | H | contract 0.3.12 `CS-GS.status = TO-AUTHOR`, manifestSha256 null; required cases include GS-04B-INDEX-PARTITION, GS-06B-SHARED-REFERENCE, GS-15-STORAGE-ACCESS, GS-19B-OUTBOX-CRASH and 40 witnesses |
| C8 | an executing gate and engine-side evidence | B | CR-GS needs ns-run, case-result and fault-witness evidence recomputed by the evaluator; G03 (exp/G03-executing-gate) round 3 and OBS01 (paused for slot-configured protocols) are not merged |
| C9 | GATE-POSITION per composition | H | no comparative claim on any composition until a VA-valid G7.position.coordinates receipt covers POSITION_REQUIRED_CASES |
| C10 | three runs per scenario per composition | n/a | CR-GS holds "in each of T-RUNS runs, on every compared composition"; T-RUNS = 3 |
| C11 | contract 0.4.0 series | B | Q90f: 0.4.0 starts a new comparison series; every GS receipt so far is 0.2.0 to 0.3.9 |
| C12 | a rung Sam accepts | ruling | TARGETS 6 rule 3 (year-one profile) cannot fit this host; see R37-a |

## 2. What GS.03 to GS.20 need that the P1-P5 work does not deliver

The P1-P5 work in flight (P2Q, SQL01, P2B, P2X, P4/H1, P5, RQ01, RT01, QG1, DA01-DA04, K01, G03) delivers fast pinned reads, small
atomic commits, the feed, the current store and the sweep. The table lists what each scenario needs in addition. GS.01 and GS.02 need
only the cross-lane items C1 to C12 and the P1, P2 and P4 work, so they are not listed.

| GS | Need beyond P1-P5 | Kind | Owner today |
| --- | --- | --- | --- |
| 03 | **Supersession of a late older vendor revision.** The scenario expects `superseded` (no current-value change, journaled). W0 has no vendor-revision rule and O-DOMAIN has no `signal-ack` operation, so no oracle exists for it. The outcome is a provisional product rule flagged for Sam (TARGETS 6.1, STATE "GS.03") | O, P | none |
| 04 | **Engine-kill fault on an exclusive slot** for each lane (XTDB container; QLever broker and server; Datomic transactor and Postgres). **GS.04b** current-index outage needs a composition with a separate current store (H1 on lanes Q and X-P2B) and bounded catch-up (Q31e, Q50d overlay bound). The W01b restart-race fix (c9baf21) has never been rerun | H, E | W01b (harness fix only); DA04 probes D1, D2 cover the Datomic kill offline of GS |
| 05 | domain re-evaluation check (C3); otherwise P1 and P3 | H | none |
| 06 | **GS.06b two-hop dependency:** a location or jurisdiction wage change must put exactly the affected workers in the feed's affected-subject set (Q40b). Needs a dependency-index consumer that follows two references, checked against O-DOMAIN `affected`. The scenario never checks it today (C3). R34's trace mapper deliberately never writes a shared entity in P5 rounds A and B | P, H | none (P5 defers shared-entity writes) |
| 07 | nothing beyond P2 CAS; database PASS already holds on lane X | none | n/a |
| 08 | **Derived-state re-run after a retroactive correction** (O-DOMAIN affected set) and the feed's valid-time range; explain at the old basis | H, O | none (P3 delivers the feed, not the re-run) |
| 09 | **Next-boundary recomputation** when start dates move (W0 obligations with due times; `dependencyState.nextTemporalBoundary` as the store witness) | P, H | none |
| 10 | **Atomic outbox for work items** (TARGETS 3; Q38f, Q42c one atomic unit with the basis guard); **in-flight reconciles finish on R1** (R34 defers the race: Q92j); rollback R1 to R2 to R1 publishes three deliveries | P | EXP-P5 rounds A and B publish sweep records only (Q68c frames); the race has no owner |
| 11 | preview equals activation at one common basis (TARGETS 6.1 item 4; Q44c previews never published) | H | EXP-P5 (sweep path); the GS.10 and GS.11 pairing is harness work |
| 12 | **Typed rejection of unholdable values in core** (fix.patch on W01b, unmerged); **bit-for-bit identical explain across engines**, which needs all three lanes and one basis naming (RT01) | P | none for the fix; RT01 for the basis |
| 13 | **A separate, throttled bulk lane** (TARGETS 2 "Bulk lane"; secondary bar live read p99 ≤ 1.5x). Today the world and the backfill go through the same single-flight `transact` as live commits | P | none |
| 14 | **Tenant provisioning and storage-layer isolation**: one composition per tenant, a new tenant's first release activation, per-tenant metrics | P, H, Sam | none; R19 and R32 are designs |
| 15 | as GS.14 at mix scale (1 large tenant, 1,000 small at year one), plus a direct cross-tenant storage access that must fail at the storage layer and a 10x slow tenant consumer | P, H, Sam | none |
| 16 | **Real erasure or crypto-shredding end to end** (TARGETS 7): public `erase` op (Q52g), ErasedValue markers at every basis, the erasure frontier on every index and cache (Q31f), the erasure ledger replayed after restore and rebuild, the protected-copy inventory with canary scans (Q82d), key-destruction evidence (TARGETS 7 item 9). Per lane: Q58e and Q68f (broker log, H1, `cur` graph); XTDB has no at-rest encryption (R19), so per-subject envelope keys in the adapter; Datomic Q88c | P | none (O-REPLAY 0.4.x models erase; W0 has the marker) |
| 17 | proposals never count as decisions (W0 rule PROP); check missing (C3) | H | none |
| 18 | **Maintained projections** for filtered, sorted, paged lists with stable cursors under writes (goal 8; Q66b cursor rules); the unchunked `find` case | P, H | none (H1 serves subject pulls, not lists) |
| 19 | **The product's atomic outbox** in place of the harness JSON file; crash points A, B, C, D and GS.19b receiver deduplication by (id, publication sequence) (Q31h, Q38f, Q42b) | P | none |
| 20 | **A time-boundary scheduler** that re-runs subjects at a valid-time boundary with no write at the boundary (W0 DOCEXP: the work item appears at B) | P | none |

### 2.1 The same needs grouped into experiments

| Need | Scenarios | Lanes |
| --- | --- | --- |
| Erasure (crypto-shredding plus inventory) | 16; also 12 and 18 modulo erasure | X, Q, D |
| Tenancy (runner plus per-tenant storage) | 14, 15 | X, Q, D (D blocked on Q78e) |
| Atomic outbox and live publication | 10, 19 (and the GS.10 race) | X, Q, D |
| Dependency index with two-hop references and time boundaries | 06b, 08, 09, 20 | X, Q, D |
| Maintained projections | 18 | X, Q, D |
| Bulk lane | 13 | X, Q, D |
| Supersession rule in W0 | 03 | oracle only |
| Core value validation | 12 (and the numbers rule in every scenario) | X, Q, D |

## 3. The shortest ordered path to all 20 on all three lanes

### 3.1 Principle

TARGETS 4.1 item 7 says only the two or three best compositions go on to end-to-end GS validation. So GS acceptance runs once per
lane on that lane's chosen composition, not on every arm. That keeps the GS campaign to three compositions times 20 scenarios times
T-RUNS = 3, which is 180 scenario runs, plus screening. The order below puts slot-free harness and product work first, so the
scarce exclusive slots are used only once a run can count.

### 3.2 In-flight experiments and the cells they unlock

| Experiment (state) | What it unlocks | Cells |
| --- | --- | --- |
| P2Q round 8 plus SQL01 (default-off; one integration round) | the lane Q composition; H1 current store; GS.04b on lane Q | all 20 on Q (necessary, not sufficient) |
| EXP-QG1 (queued; scale window step 1) | Q91a built base and bounded delta, reader leases across swaps | all 20 on Q (validity) |
| P2B (queued) or P2X (progressed, feed lag p99 2.9 s) | lane X writes stop being single-flight; P2 and P3 bars become reachable | every bar-failing X cell: 01-11, 13, 17-20 |
| P4/H1 and R25 (merged design; SQL01 carries H1) | P4 bars (first pull, pulls under tenants) | 02, 15, 17 on X and Q |
| DA01 round 5, then DA04, then DA03 (queued) | the lane D composition on Postgres; durable ACKs (Q88a); first lane D P1-P5 numbers | all 20 on D (necessary) |
| RQ01 (accepted; merging on its own subpath) | route equivalence as a gate (Q89f): the 30-of-40 class seen on lanes Q and D | every read check, every lane |
| RT01 plus O-REPLAY 0.5.0 plus contract 0.4.0 (queued after RQ01) | decided record time (Q90a); recordedAt pins become reproducible; the new comparison series | C6, C11 on every lane; GS.12 cross-engine identity |
| EXP-P5 round A (exp/P5-release-sweep 18640ea2; fingerprints match O-DOMAIN at 1k and 10k) | the W0 trace mapper (Q92k), the G0 fingerprint (Q92c), the sweep route | 10, 11 on all lanes; C1, C4, C5 reusable by GS |
| K01 (in review, simplified by Q93) | a fingerprint-admitted XTDB clone of the seeded world | C5 on X at 10k and above |
| G03 round 3 plus OBS01 (paused for slot-configured protocols) plus O-OBS (pinned for screening) | an executing gate with evaluator-owned evidence | C8 on every lane |
| W01b (unmerged, branch 1d191991) | harness fixes, 23 tests, 20/20 golden regeneration, GS.12 patch proof | the harness base for EXP-W02 |

### 3.3 Missing experiments (briefs)

Each brief below is one paragraph with its north-star line. They are listed in the order they should be dispatched.

**B1. EXP-W02: GS harness v2 on W0 and three lanes (builder, Codex medium; reviewer, Codex high).**
North star: the GS gate (all five priorities under the expected load, TARGETS 6) and the correctness floor; measured by the CS-GS case
set regenerating byte-identically and every domain claim checked by O-DOMAIN.
Merge W01b (1d191991) to main after a reviewer reads its diff. Re-base every scenario generator on W0's vocabulary and population,
reusing EXP-P5's W0 trace mapper (Q92k) for the background, so O-DOMAIN can judge every stream (C1). Wire lab/scenarios/lib/domain.mjs to
lab/oracles/domain/cli.py (`reconcile`, `affected`, `publish`, `receive`) and add the domain checks that 01, 05, 06, 09, 17 and 18 name
but never make (C2, C3). Replace the private writerTrace with the frozen TARGETS 2.1 generator: active set, Zipf s = 1.1, bursts at
120 s + k x 600 s, live windows long enough to hold one burst and one maintenance event (C4). Admit the world only by a G0 content
fingerprint read through the engine by the measuring process (Q93a), on a fresh scope per run, with store counts at start and end (C5).
Name bases by recordedPosition from the receipt (Q92a) until RT01 lands (C6). Add `--lane datomic` to run.mjs and the GS gate, the
QLever broker selection (`QLEVER_COMMIT_PATH=broker`, broker directory bound in the receipt), QLever base and delta counts (Q91a), and
the slot, resident and co-running set in the receipt. Author lab/acceptance/cases/CS-GS.json with every required case and witness (C7).
No packages/* changes.

**B2. EXP-GS12F: typed rejection of unholdable values in core (builder, Codex medium).**
North star: correctness floor under P2 (no silent precision loss, SCOPE 2.4: "a hard error, never silent conversion"); measured by
GS.12's `outcomes-match-golden` and the six invalid-integer cases of the W01b patch proof failing typed on all three lanes.
Apply lab/scenarios/12-audit-march-3/fix.patch from the W01b branch (validate assert values against TripleValue before command claims,
so InvalidTripleError is constructed at all), add the XTDB round trip the patch proof did not cover, and add the QLever ±2^59 and
Datomic long cases. It moves a pinned core file, so it lands with a contract version (0.4.0 is the natural one).

**B3. W0-1.2: supersession and the remaining scenario rules (W0 author, then V-D01 review).**
North star: correctness floor for P2 and P3 (GS.03 exactly-once and per-subject order); measured by new golden cases that O-DOMAIN and
the kernel both pass.
Add a vendor-revision rule (a `revision` attribute on a status signal; an older revision after a newer one is acknowledged `superseded`,
changes no current value and is journaled) and a `signal-ack` operation to O-DOMAIN, so GS.03's domain claim has an oracle. Check that
W0 covers every other domain claim the 20 scenarios name (GS.09 next boundaries, GS.12 explanation, GS.18 overdue). The rule stays
flagged for Sam until he confirms it.

**B4. EXP-ER01: erasure end to end on three lanes (planner first, then builders per lane).**
North star: Sam's must-have "real erasure or crypto-shredding of PII" (SCOPE 2.3), with P1 and P3 held during erasure (GS.16 bars);
measured by GS.16's three sub-schedules (pinned reader, rebuild, restore) and the canary scans of every protected copy.
A planner first writes one design that covers the public `erase` op (Q52g shape), the ErasedValue marker on every read route, the
erasure frontier on every index and cache (Q31f, TARGETS 7 item 7), the erasure ledger kept apart and replayed after restore and rebuild,
and per-subject keys: broker frames and H1 (Q58e, Q68f), XTDB rows through the adapter (XTDB has no at-rest encryption, R19), Datomic
values with excision as a second layer (Q88c). Builders then implement per lane, and the inventory scans use O-OBS's canary rule (Q82d).
This is the longest product item on the path and should start as soon as a planner slot is free.

**B5. EXP-OB01: the atomic outbox and live publication (builder, after P5 round B).**
North star: P5 (results published as work items through the atomic outbox, TARGETS 1.1 P5 item 3) and P3 (GS.19 zero duplicate
visible effects); measured by GS.19's crash points A to D and GS.10's rollback deliveries against O-DOMAIN `publish`.
Make the outbox a product path: outbox records, publication sequence, basis guard and retirement state in one atomic write under the
subject's CAS (Q42c), in the source transaction on lane X, in the same log frame on lane Q (Q68c), in the same Datomic transaction on
lane D. Then add the GS.10 race round that R34 deferred (Q92j): live reconciles publish, and in-flight reconciles finish on R1 while
the sweep evaluates R2.

**B6. EXP-DI01: dependency index consumer with references and time boundaries (planner design, then builder).**
North star: P3 ("so the runtime knows which subjects to re-run"; lag to "affected subjects known" p99 ≤ 250 ms, TARGETS 1.1 P3 item 4);
measured by GS.06b, GS.08, GS.09 and GS.20 affected sets against O-DOMAIN `affected`.
A durable consumer of the feed that computes affected subjects through two-hop references (Q40b) and keeps a next-boundary schedule
from `dependencyState.nextTemporalBoundary`, so a subject is re-run at a valid-time boundary with no write (GS.20). It records the
affected set and checkpoint in one durable write. GS.19's harness consumer is the prototype.

**B7. EXP-TN01: tenancy runner and storage-layer isolation (after Sam's R19 and Q78e calls).**
North star: Sam's must-have "tenant isolation at the storage layer" (SCOPE 2.3), with P1 and P4 held per tenant (GS.14, GS.15 bars);
measured by the GS-15-STORAGE-ACCESS case failing at the storage layer and per-tenant pull and commit bars.
A multi-tenant runner (one composition per tenant through `DatabaseScope.make` with the tenant, which composition.mjs already accepts),
per-tenant metrics, a direct cross-tenant storage probe and a 10x slow tenant consumer. Per lane: R19's bridge on X (large tenant its own
database, small tenants in about 10 cells, envelope keys) and Q (large tenant its own index and log, small tenants as named graphs in
cells, one log per tenant), and Sam's Q78e choice on D. Cannot start the storage half until Sam rules.

**B8. EXP-PR01: maintained projections for dashboards (planner first).**
North star: P1 and P4 (GS.18 lists at 256 concurrent readers from maintained projections); measured by GS.18's oracle match and cursor
stability under writes.
Decide whether core's derivation layer (packages/core/src/derivation/Materialization.ts, goal 8) or a host-side store beside H1
serves "placements in this branch with an overdue I-9" lists with filter, sort, paging and stable cursors (Q66b), and generate the
unchunked `find` case the spec lacks.

**B9. EXP-BK01: the bulk lane (planner design, then builder).**
North star: P2 and P1 (TARGETS 2 "separate, throttled; imports must not starve live reads"; GS.13 live read p99 ≤ 1.5x); measured by
GS.13's bulk ratio and the trace commit p99 with a 1M-fact import running.
A separate throttled ingest path with per-batch receipts that does not take the live writer's turn. On broker compositions this is
likely a second, rate-limited queue into the same log.

**B10. The GS campaigns (orchestrator, exclusive slots, one lane at a time).**
North star: all five priorities through TARGETS 6; measured by CR-GS: zero wrong answers, zero lost or duplicated commits, zero feed
gaps, every witness and fault outcome as expected, every bar met, in 3 runs.
Per lane: screening at 10k on an exclusive slot with residents parked, then the acceptance rung that R37-a settles, 3 fresh runs per
scenario, evidence through G03 and OBS01.

### 3.4 Order

| Step | Work | Slot | Unlocks |
| --- | --- | --- | --- |
| 0 | Rulings R37-a to R37-h (section 5); Sam's R19, Q78e, GS.03 calls | none | rung, harness rules, tenancy |
| 1 | B1 EXP-W02, B2 GS12F, B3 W0-1.2, B4 ER01 design, B6 DI01 design, B8 PR01 design, B9 BK01 design, in parallel | none | C1-C7; GS.12; GS.03 oracle |
| 2 | In flight: P2Q plus SQL01 merge; RQ01 merge; RT01 and contract 0.4.0 (with B2); DA01 r5; P5 rounds A and B | none | lane Q composition; C6, C11 |
| 3 | Scale window as planned (QG1, K01 live, G03 slot run), then XTDB GS screening of the 17 runnable scenarios on the current best X composition | X exclusive | first valid X numbers; shows how much P2B or P2X must close |
| 4 | P2B (or P2X), then XTDB GS screening again; DA04, then DA03 | X exclusive; D exclusive | X bars; lane D composition |
| 5 | QLever GS screening (after QG1 phase 2) | Q exclusive | first valid Q numbers |
| 6 | Builders for B4 ER01 per lane, B5 OB01, B6 DI01, B8 PR01, B9 BK01; B7 TN01 after Sam | some | GS.06b, 08, 09, 10, 13, 16, 18, 19, 20; 14, 15 |
| 7 | Lane D GS screening | D exclusive | first valid D numbers |
| 8 | Acceptance: all 20, fresh, 3 runs, each lane's chosen composition, at the R37-a rung | exclusive, one lane at a time | the GS part of done |

Critical path: B4 (erasure on three lanes) and B7 (tenancy, gated on Sam) are the longest; lane D's chain DA01 r5, DA04, DA03 is the
longest engine chain. Everything else fits inside those.

### 3.5 Cells that depend on Sam's open decisions

| Decision | Cells | Effect |
| --- | --- | --- |
| Q78e lane D tenant isolation (tiered, silo-all, pool-all) | D: GS.14, GS.15 | BLOCKED until decided; no provisional ruling exists |
| R19 (pending in STATE): do pooled cells with per-tenant envelope keys count as storage-layer isolation; how many small tenants are active in 15 minutes | X and Q: GS.14, GS.15 | provisional yes lets builders go ahead; the GS.15 isolation verdict is provisional until Sam confirms |
| Q89g public commit pin (A no field, B raw position, C opaque token; R33 recommends C) | none strictly | after Q90a, `recordedAt: receipt.instant` pins one commit exactly (R33 section 5), so no GS cell waits for Q89g if RT01 lands. If RT01 slips, GS bases name `recordedPosition` through the lab driver (Q92a), which a public caller cannot do, so GS.02, GS.04, GS.12 measure a path an application cannot use until Q89g B or C or RT01 |
| Q24 and Q49c erasure semantics (provisional, flagged) | all lanes: GS.16 | expectations are built on the provisional rule; a change by Sam regenerates GS.16's goldens |
| GS.03 `superseded` (provisional, flagged) | all lanes: GS.03 | as above for GS.03 |
| Q60 measurement margins and host (may acceptance windows pause Sam's default colima VM) | all lanes: every bar | without it, acceptance bars run on a host at load 7 to 13 on 12 cores |
| R37-a GS rung (new, section 5) | all 60 cells | TARGETS 6 rule 3 cannot be met on this host |

## 4. Measurement validity

### 4.1 Which receipts stay valid

**Verdict: no existing GS receipt can close or be compared, on any ruling. All of them stay as diagnostics.**

| Receipt group | Under Q91a (QLever built base) | Under Q93a (fingerprint admission) | Other invalidating facts | What survives |
| --- | --- | --- | --- | --- |
| GS-qlever-20261107T205955Z-c31274 (main) | DIAGNOSTIC at best: qlever-dev's base holds 1 triple, so any run on it reads the delta | n/a | executed zero cases; contract 0.2.0 | nothing |
| 9 XTDB receipts on main (20261107T221803Z-d93ea6 to 20261108T011330Z-f2843e) | not affected (Q91a covers QLever only) | invalid: the world was admitted by a commandId lookup of its last batch (runner.mjs:66-69), never by a content fingerprint read through the engine; every receipt shows `world.loaded: false` | shared dev resident with other slots co-running; 1 reader against 256; 12 to 30 s windows with no burst and no maintenance event; a private 200-subject trace (not TARGETS 2.1); record-time pins (Q89a D-C1); contracts 0.3.5 and 0.3.9 (before the 0.4.0 series, Q90f); single run each (T-RUNS = 3) | diagnostic correctness findings (below) |
| 10 more XTDB receipts on W01b (20261108T022408Z-0a94e7 to 20261108T105742Z-843235) | not affected | invalid, same reason | same as above; also not on main | same |
| 2 aborted W01b attempts (ea6353, 015daa) | not affected | invalid | zero scenarios completed | nothing |

**Diagnostic findings that stay valid as defect or harness reports** (they do not depend on load or on world admission):

1. **GS.12 core defect** (1bfd1d): unholdable integers fail as WriteError instead of InvalidTripleError. It is deterministic and
   independent of the engine's load; the W01b patch proof (evidence/gs12-patch/receipt.json on the branch) reproduces it offline.
2. **Zero wrong answers in 19 executed XTDB receipts.** Where reads failed (GS.04 f2843e: 16 read errors, GS.11 7b11df: 22), the
   receipts record `wrongAnswers: 0`. This supports, but does not prove, that lane X's pinned reads are exact at these shapes.
3. **GS.04 restart race** (843235): queued writers entered a disposed runtime. A harness defect, fixed at c9baf21, not yet rerun.
4. **Untyped WriteError and ReadError under overload** (GS.09 0a94e7, GS.13 67b0ec): unresolved. They are either overload symptoms or
   an error-mapping gap; W01b kept them as `engine-io-unresolved`. A valid exclusive-slot run decides which.
5. **The A0 composition serializes all writers** (composition.mjs:74-79). Every commit-latency bar on lane X measures this queue.

### 4.2 What a valid GS run needs

| Requirement | Rule | Value for a valid run |
| --- | --- | --- |
| Slot | TARGETS 6 rule 3; Q78b; Q92c | an exclusive slot per lane: X s1-s3 (3.5 GiB); Q s1 serving a built generation; D the exclusive 4.0 GiB slot with the Postgres pair (Q88b). Parkable residents parked (tx2-datomic-dev during X and Q runs). Never a dev resident. Co-running set recorded |
| Host | Q60 (pending Sam) | host load recorded per window; acceptance windows pause other heavy host jobs only if Sam agrees |
| Data volume binding | Q92c, Q93a, Q91a; NOTEBOOK 00:16Z "shared residents drift in size" | the W0 population at the rung (10k: about 4.45M facts and 434k positions; 100k: 44.5M facts; R34 line 80). The current GS world is 50,000 facts at 10k (`facts: size * 5`, runner.mjs:69), about 89 times smaller than W0's 10k population. Admission only by G0: a content fingerprint read through the engine by the measuring process, on its endpoint, before warm-up, against a digest pinned before the freeze. Store counts at start and end. On lane Q also base triples, delta triples and delta in the scanned blocks. A fresh scope or a fingerprint-verified clone per run, never a scope shared with earlier runs |
| Background trace | TARGETS 1.1, 2.1 items 1 to 5; Q92k | the frozen 2.1 generator through the W0 trace mapper: 2% active set, Zipf s = 1.1, 95/5 split, Poisson at 15 facts/s, bursts at 120 s + k x 600 s, 10% duplicates of system signals, 1% lost ACKs, 1% corrections 30 days back. Generator hash and seed bound. The scenario overlay on top, accounted separately (2.1 item 4; the runner already splits `trace` and `scenario`). A window of at least 180 s, so one full burst is inside it, and at least one maintenance event (XTDB compaction, QLever delta merge or generation swap, H1 catch-up) |
| Readers | TARGETS 1.1 P1 items 1, 2, 4 | 256 closed-loop pinned readers; 50% of reads on subjects written in the last 60 s; 10% split reads straddling a trace command; the driver records the basis it asked for |
| Basis | Q89a, Q89b, Q90a, Q92a | recordedPosition from the receipt until RT01 lands; recordedAt only on routes Q90 round 2 has lifted |
| Composition identity | TARGETS 4.1 item 2 | image digest, configuration hash and slot per layer, every replication edge, each index's watermark at read time |
| Evidence path | CR-GS; Q80a; Q82 | through the executing gate (G03) with evaluator-owned case context and engine-side evidence from the observer (OBS01) |
| Repeats | T-RUNS | 3 independent runs per scenario per composition |
| Contract | Q90f | contract 0.4.0 or later, with CS-GS pinned |
| Rung | TARGETS 6 rule 3; R37-a | year-one, or the rung Sam accepts under R37-a |

### 4.3 Year-one size on this host

| Composition | 10k (4.45M facts) | 100k (44.5M facts) | Year-one (100M active facts) |
| --- | --- | --- | --- |
| Broker host store (lanes X-P2B and Q) | 0.45 GB, fits | 4.3 GB plus frames, fits on the host disk | about 10 GB by extrapolation, fits the host disk only with nothing else large |
| QLever compact `cur` graph | 4.45M triples, fits | 44.5M triples, fits (R17 ran 69M in 1.86 GiB) | about 100M triples, unmeasured |
| XTDB A0 | 13 GB log, exceeds the 8 GiB slot forecast | 130 GB, infeasible | infeasible |
| XTDB as P2B replica | 0.8 to 2 GB, fits | 8 to 20 GB, needs a larger forecast | 18 to 45 GB, beyond one slot inside the 50 GiB pool limit |
| Datomic on Postgres | 1.5 to 3 GB, fits | 15 to 30 GB, needs a larger forecast | 34 to 68 GB, infeasible |

Sizes are R34's estimates (lab/research/R34-p5-sweep-brief.md lines 270 to 282), scaled linearly for the last column. The year-one
column is about the W0 225k rung by fact count. No lane runs GS at the full year-one profile on this host, so R37-a asks Sam for a rung.

## 5. Proposed rulings

| Id | Ruling | Basis | Who |
| --- | --- | --- | --- |
| R37-a | GS acceptance runs at the largest W0 rung each lane's chosen composition fits on one exclusive slot within the 50 GiB pool disk limit (expected: 100k for broker and QLever `cur` compositions; 10k for XTDB-replica and Datomic compositions unless the forecast is raised per run, Q92i). Year-one volumes are reported as a projection next to the measured rung, never as a pass. This loosens TARGETS 6 rule 3, so it waits for Sam; until he rules, GS stays OPEN at acceptance | TARGETS threshold policy; R34 sizes; SCOPE 3.2 (state an engine limit plainly) | Sam |
| R37-b | Every GS stream is W0-valid and every domain claim a scenario names is checked by O-DOMAIN; a scenario whose spec names a domain claim and whose run makes no such check fails closed. The W01 world vocabulary is retired | GATE-W0; TARGETS 6 rule 2 | orchestrator |
| R37-c | The GS background is the frozen TARGETS 2.1 trace through the W0 trace mapper (Q92k); the private writerTrace is retired; every measured window holds one burst and one maintenance event | TARGETS 1.1 P1 item 3, 2.1 | orchestrator |
| R37-d | GS world admission follows Q93a: a G0 content fingerprint per run; a fresh scope or verified clone per run; store counts at start and end; on lane Q the Q91a counts | Q93a, Q92c, Q91a | orchestrator |
| R37-e | Every GS receipt before contract 0.4.0 is DIAGNOSTIC: none closes an obligation or enters a comparison. The GS.12 defect and the W01b harness findings stay as defect reports | Q90f, Q91a, Q93a | orchestrator |
| R37-f | GS.04b applies only to compositions with a separate current store; on those it is required. GS.04's engine-kill schedule is required on every lane and runs only on an exclusive slot | TARGETS 4.1 item 6; Q31e | orchestrator |
| R37-g | GS.19's outbox and GS.10's publications must be the product's atomic outbox; a harness-side outbox file can pass only GS.19's P3 checks, as a diagnostic | TARGETS 3 (atomic path to the outbox); Q42c | orchestrator |
| R37-h | GS.10's race (in-flight reconciles finish on the old release) is scheduled as EXP-P5 round C, right after rounds A and B, and is required for GS.10 to close | Q92j; TARGETS 6 row 10 | orchestrator |
| R37-i | GS.03's vendor-revision rule goes into W0-1.2 with an O-DOMAIN `signal-ack` operation; the `superseded` outcome stays flagged for Sam | TARGETS 6.1; W0 lacks it | orchestrator, then Sam |

## 6. Decisions for Sam (in one place)

1. **R37-a, the GS rung.** Year-one size does not fit this host for any lane. Proposed: measure at the largest rung each lane fits on
   one exclusive slot and report year-one as a projection.
2. **Q78e, lane D tenancy.** Blocks lane D GS.14 and GS.15.
3. **R19, lanes X and Q tenancy.** Whether pooled cells with per-tenant keys count as storage-layer isolation (provisional yes), and how
   many small tenants are active in 15 minutes (provisional 10%).
4. **Q89g, public commit pin.** Blocks no GS cell if RT01 lands; it decides whether applications can name the exact commit GS reads at.
5. **GS.03 `superseded` and Q24/Q49c erasure semantics.** Both are provisional rules the GS goldens are built on.
6. **Q60, the measurement host.** Whether acceptance windows may pause the default colima VM.
