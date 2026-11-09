# Orchestrator state (read this first after any context compaction)

Updated: 2026-11-07 22:55Z (from `date -u`; earlier notebook headers ran ahead of the real clock, see NOTEBOOK), generation 2 running (scope v2).

## Read first, every time
1. lab/SCOPE.md (authoritative scope, Sam confirmed) 2. lab/NORTH-STAR.md (five priorities, fixed) 3. lab/TARGETS.md (measurements,
requirements, 20 golden scenarios) 4. lab/PLAN.md v2 5. this file 6. lab/SCORECARD.md 7. lab/NOTEBOOK.md tail.
Never use old targets: 256 req/s load bar, 10m/100m as a target, 256/512/1024 load acceptance, exact int64.

## Environment facts
- Repo /Users/sam/projects/triplex-db-2 (git, main). Harness on main: lab/bin/engine.mjs, gate.mjs, receipt.mjs, status.mjs, heavy.mjs.
- Docker: colima `triplex2` (6 CPU/12 GiB/60 GiB); ALWAYS DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock; after any
  colima command run `docker context use colima`. Dev engines: tx2-xtdb-dev :5470, tx2-qlever-dev :7070. Slots s1-s3.
- pnpm: always `--store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`; never `pnpm config set` (it rewrote pnpm-workspace.yaml once).
- Agents: research Sonnet xhigh; coding and verifiers Opus high (commander's intent + North star + Scope lines); adversarial review
  Codex gpt-6.1-sol xhigh (session 01a1b72e-26d6-77a1-ac09-6ab8c3b10d43 holds plan and contract history).
- Subagent harness refuses REPORT.md writes: agents return reports as text; the orchestrator saves them.
- Hourly cron ae766d26 (:07): learnings pass; reread NORTH-STAR first.

## Branches awaiting action
| Branch | State | Next |
| --- | --- | --- |
| exp/R01-entity-core | MERGED db249d8 (verified PROMOTE) | follow-ups go to EXP-R02 / EXP-F02 |
| O-REPLAY 0.3.1 (8cc2c26) | ACCEPTED (V-O03), MERGED 4591715; pinned in contract 0.3.6 (2c3bac6): 106 of 119 closable | EXP-O04 (F2 + erasure) running |
| W0-1.1.1 (ada2e90) | ACCEPTED (V-D01 delta check), MERGED e7c1346; 95 hashes verified | superseded by W0-1.1.2 (fedfcda, ACCEPTED after V-D01e; 136 cases), merging with its pin in contract 0.3.10 |
| exp/P2Q-qlever-log-broker (f711193) | V-P2Q round 2 REJECT head, not design: C1-C3, M1-M3, m1, m6 fixed; pulls exact on 4,540 fuzz reads; N1 lock lost when the flock helper dies, N2 stale answer at a reported basis after a zero-downtime rewind (4/153 fuzz gate reads) | fix round 2 (Q72), delta re-verify, merge default-off, P2B, SQLite store (Q58c, R25) |
| exp/P2X-xtdb-commit-feed (fb6681a) | PROGRESSED: 0 cross-subject conflicts (A0 thousands), service 6-8x lower at ~20k history; feed exact but lag p99 2.9 s (bar 250 ms); G1 PASS on and off | V-P2X later; EXP-P2B (XTDB behind the broker, Q51b) is the next XTDB P2/P3 move |
| exp/O04-oracle-erasure (a9c1327) | O-REPLAY 0.4.1 ACCEPTED (V-O04c, 85/85 probes, 15/15 plants) | merged with the pin move in contract 0.3.8 (merging alone breaks --verify); Q52 + SCHEMA note as 0.4.2 later |
| exp/D01c-o-domain (5d1fd1a) | ACCEPTED (V-D01c delta check): F1-F3 fixed, fingerprint exact, passes all 136 W0-1.1.2 cases (3 as decoded bytes) | merges with its pin in contract 0.3.10 |
| exp/D01b-w0-kernel (44bc957) | MERGED 02424ff: 87/87 cases, 6/6 fingerprint, 158 µs per subject (validation 80%); exp/D01b-w0-kernel-112 8483c50 passes all 136 W0-1.1.2 cases with a byte-only harness (4 writer/decoder faults the old harness hid now fail) | merge after contract 0.3.10 |
| exp/M01-paired-measurement (1e3c2b5) | PAIR-0 built and tested offline (coverage 91-93%, A/A false positives 7-9%, recompute rejects every round-8 forgery); live A/A not run (pool) | merge after EXP-N01 releases s1; then a measurement window (Q69a): stop qlever-dev about 75 min, run the A/A duet on s1+s3 |
| exp/002-qlever-baseline | MERGED 85aba57 (G0/G1/G2 PASS, G4 FAIL as expected) | QLever dev resident recreated from main config (holder EXP-000) |
| exp/F02-wire-exactness | MERGED 7247c82 (lab only; partly falsified) | fixes in EXP-F02b |
| exp/X02-xtql-parity (bf1ad4d) | PROGRESSED: G0/G1 PASS, G2 SQL 142/142, XTQL diagnostic 142/142, XTQL candidate timeouts under load | V-X02, then promote; EXP-C8 builds on it |
| exp/001-xtdb-baseline (049639d) | PASS all; task-languages.mjs cherry-picked to main | done |
| G01 golden vectors (main) | 49 vectors; AMB-01..17 ruled (RULINGS Q21) | compile Q21 into contract 0.3.2 with Codex v2 findings |
| contract 0.3.10 (main 64ab545) | W0-1.1.2 and O-DOMAIN 5d1fd1a pinned with the fingerprint; Q57, Q63-Q69, Q71, Q72f compiled; 157 obligations, 65 closable (61 before), O-DOMAIN and W0 blockers 0; still blocked: O-OBS 62, O-HAND 20, other unpinned oracles 20, O-TDK1 6; every claim also blocked evaluator-side (no executing gate, manifests, buildSpec, frozen trace, A0 registry) | 0.3.11: O-REPLAY 0.4.7 pin, Q70, Q72 after P2Q round 2 |
| contract 0.3.9 (main 6f17e2b) | Q58-Q62 compiled; 157 obligations; E01 field names, PAIR-0 and native tokens (provisional); build spec and frozen trace still null (fail closed) | 0.3.10: Q63, Q64 |
| contract 0.3.8 (main 445bc45) | O-REPLAY 0.4.1 pinned at a9c1327 with the oracle merged; 156 obligations; 117 closable, 6 blocked; qualification is a run; pending rows Q51b, Q57-Q62 | 0.3.9 compiles Q58-Q62 (Q57 after W0-1.1.2) |
| contract 0.3.7 (main ca42e06) | Q46-Q49 compiled; 153 obligations; W0-1.1.1 pinned ACCEPTED; O-DOMAIN fingerprint null; Q50-Q54 pending rows (no authority) | Codex round 7 DONE: NOT READY, 5 open (2 partial, 3 new), all accepted as Q55; 0.3.8 compiles Q50-Q55 |
| contract 0.3.3 (main 89376e1) | Q29-Q32 compiled; 142 obligations, 50 thresholds; W0 pin null until V-D01 | Codex round 3 |

## Pending Sam decisions for lane D (Q78e): does one Datomic database per tenant on a shared dev storage file count as storage-layer
isolation; is Datomic dev storage acceptable for the final acceptance run, or must it be SQL storage.

## Merged 2026-11-08: E01 claim evaluator (f060f7e, 128/128 on main); follow-up: the poison marker lives in the shared .git, so one
worktree's refusal blocks every worktree (move it to the worktree's own git dir).

## Pending Sam decisions on VM security (Q86g, from R28): (H1) narrow the triplex2 colima mounts: today $HOME is mounted writable
into the VM, so every Docker socket holder (all lab agents) can write anywhere in Sam's home; (H2) block outbound traffic from tx2
containers: today the VM reaches every Mac 127.0.0.1 service, including ports 15442 and 17019. Both need a VM restart (all residents).

## Running agents (10; protocol lab/PROTOCOL.md since 2026-11-08: Codex builders medium, Codex reviewers high, Opus planners high)
| Agent | Role, model, effort | Priority | Output |
| --- | --- | --- | --- |
| CX-DA01 lane D adapter (exp/DA01-datomic-adapter, on DA00 702643f) | builder, Codex medium | lane D, goal 7 floor | storage adapter, Datalog executor, G1 |
| CX-VP2Q-4 (verify/P2Q) | reviewer, Codex high | P2, P3 | delta re-check of broker round 3 1b55d2e |
| CX-SQL01 (exp/SQL01-broker-sqlite, on 1b55d2e) | builder, Codex medium | P2, P4, P5 | broker SQLite file per R25 (Q84): log of record, pinned readers, H1 rows |
| CX-X02-R3 resumed (exp/X02-xtql-parity) | builder, Codex medium | XTQL lane | Q79e grammar-based operand classification with a generated corpus; C8 merges after X02 |
| CX-A01-0311-R2 (contract/0.3.11) | builder, Codex medium | floor for claims | 0.3.11 fix round: O-REPLAY row results in comparators, Unicode, lane D composition fields, Q76c matrix record |
| CX-G03 (exp/G03-executing-gate) | builder, Codex medium | floor for claims | executing gate with container isolation per R28 (Q86a-f) |
| (queued) CX-DA01 round 2: Q85a-d (V-DA00 FIX-FIRST) after its current round | builder, Codex medium | lane D floor | then a joint DA00+DA01 review |
| CX-VO05-2 (verify/O05) | reviewer, Codex high | floor | review of O-OBS round 2 463703d |
| CX-OBS01 (exp/OBS01-observer) | builder, Codex medium | floor | observer sidecar writing obs-bundle/1 (R27, Q82) |
| R25 finish: SQLite pinned readers for the broker file and H1 (continuation) | planner, Opus 5.5, high | P1, P2, P4, P5 | /Users/sam/Claude/Projects/triplex-db-2/R25/ |
| CX-K01-R2 (exp/K01-seed-clone) | builder, Codex medium | measurement speed | R30 freeze protocol (Q83), 500-subject golden and clone with C1-C8 |

Paused at the 2026-11-08 Claude weekly limit and not resumed (effort may exceed high): the ten agents in lab/agents/handoffs/;
their work is in WIP commits on their branches. Still waiting for a slot: J01 default-off merge after C8 and X02 (J01 F1/F3 pass at 0d9a860; F2 compact-on recipe needs an executable launch envelope, run in a scale window); a scale window (park tx2-datomic-dev) for K01 live, W01b GS, J01 compact-on G1, X02 and C8 exclusive reruns; W01b live GS rerun on an exclusive XTDB slot (W01b offline work done at 1d19199: harness and restart fixes, 23 tests, 20/20 golden regeneration, GS.12 patch checks; the shared-engine rerun stopped incomplete), R25
R28 (planner); EXP-OBS01 observer sidecar per engine under engine.mjs (R27 section 6, Q82c) after O-OBS round 2, M01 (parked for the Q69a window).

## Codex review history
Codex plan-v2 review DONE: NOT READY, 14 findings all accepted (lab/reviews/plan-v2-review.responses.md, 675db6b). Codex round 2 DONE: 7 closed, 7 partial, 6 new, NOT READY; all accepted as Q31a-k (743cb1f). Contract 0.3.3 committed 89376e1 (142 obligations). Codex round 3 DONE: 11 closed, 2 partial, 5 new, NOT READY; accepted as Q34a-e (9a4fbb4). Contract 0.3.4 committed 60e4c57 (147 obligations, byte-identical regeneration). Codex round 4 DONE: NOT READY; accepted as Q38a-f (baeb9fd). Contract 0.3.5 committed 15a07b6 (149 obligations; 124 fail closed on null oracle pins; Q40 recorded-not-compiled; Q41 in RULINGS-PENDING.md). Codex round 5 DONE: 6 closed, 2 partial, 3 new; Q42a-c pending (59047ac). Contract 0.3.6 compiles Q40-Q42 once W0-1.1.0 lands; then Codex round 6. Rounds 6-8 since: open findings 4, 5, 10; round 8 accepted as Q67 (lab/reviews/plan-v2-round8.responses.md).

## Queue (NEXT FREE SLOTS, in order; restored 2026-11-08 after a table rewrite dropped it)
00. C8 follow-up after V-C8 (Q76b dead table, Q76d countSimplePaths in WL20) and clean XTDB G1/G2 on an exclusive slot after V-X02 (Q76f); merge C8 after X02.
0r. Research at the next free slots, in this order after EXP-O05: R27 engine-side evidence sources per O-OBS protocol (brief
    /Users/sam/Claude/Projects/triplex-db-2/R27/BRIEF.md), then R28 isolation design for EXP-G03 (brief .../R28/BRIEF.md). Sonnet xhigh.
0. EXP-O05 O-OBS observation oracle (brief lab/experiments/EXP-O05-observation-oracle/BRIEF.md): dispatch at the next free slot;
   O-OBS blocks 62 of 157 obligations, then V-O05 and a pin. Next after it: O-HAND hand derivations (20 obligations).
1. DONE: contract 0.3.10 merged 64ab545 (65 of 157 closable; 284/284 regressions); W0 kernel merged a199182.
1a. Contract 0.3.11 (A01): pin O-REPLAY 0.4.7 if V-O04g accepts; compile Q70, Q73, Q74, Q75 (Q75c pinned runners in contractBlockers, Q75g comparators inside O-REPLAY answers, Q75i promotion in admit_claim).
1d. A0 XTDB P1 ladder at an informative rung (`--subjects 500 --probe10-per-s 0`, N01 estimate +-2x) on s1 after V-X02 releases it;
    resume N01 a4d931a315c6b5664. Use R26's clone procedure if it is faithful.
1e. engine.mjs build-index-from-seed step for QLever (N01's 10k bulk seed at runs/qlever-seed/ns-v2-10k/), then the QLever A0 NS run.
1c. W0-1.1.3 when a W0 author slot frees: Q73a, Q73b cases; O-DOMAIN and the kernel must pass them.
2. V-O04h: re-check O-REPLAY 0.4.8 (Q70a-m) when it reports (resume a24def81f188f0df6); pin it in contract 0.3.11 with Q70 compiled.
3. V-P2Q delta re-verify after fix round 2 (resume aea2afc01cf3f010f); then merge P2Q behind its default-off option and re-freeze the A0
   control (Q72d); then EXP-P2B (XTDB behind the broker, Q58b), then the SQLite store (Q58c)
   on R25's design.
4. Measurement window (Q69a) once N01 releases s1: merge exp/M01-paired-measurement (1e3c2b5), stop qlever-dev, resume M01 for the A/A
   duet on s1 + s3 (it is parked and ready). Use R26's clone procedure for seeding if R26 finds it faithful.
5. EXP-G03 executing OBL gate (Q65f), after M01 merges.
6. EXP-P5 release sweep (R24 section 7), after the O-DOMAIN pin (0.3.10), P2B and the SQLite store.
7. Merge E01 (2796455) after V-E01 accepts it.
8. V-F02b independent verification of exp/F02b-wire-exactness-fixes (after its f1 G1 run).
9. EXP-Q07 QLever version side-by-side (R21 E1) when an exclusive QLever slot frees; GS.12 patch routing (from W01b).
10. O-DOMAIN unit tests for `[1}` and a late duplicate key (V-D01c D1, low).
11. XTDB 2.2.1 re-qualification when tagged.


## Exclusive slot queue (pool: xtdb-dev 3.0 + qlever-dev 3.5 leave 4.5 GiB)
XTDB (2026-11-08 01:55Z: s2 held by EXP-P4 slot smoke; s1 free but cannot fit until s2 is released; next V-X02, then the A0 ladder at 500 subjects): EXP-P2X done (s1 released) -> EXP-X05 (holds s2 + follower now) -> EXP-N01 A0 XTDB (N01 completed; orchestrator dispatches when the wait-slot poller reports READY) (s2 + follower capped about 1 GiB) -> EXP-N01 A0 XTDB (zero-readers, then ladder) -> V-X02 XTQL rerun.
QLever: EXP-P2Q controlled run list (Q50e) -> A0 QLever (bulk-seeded) -> EXP-Q07 version side-by-side (needs a dev resident paused or the XTDB queue drained).

## Gate window (owed reruns, run one at a time through heavy.mjs when several agents finish)
- F02b: G1 xtdb and G1 qlever f1 at c443381 (both last failed by timeouts only).
- X02: XTQL candidate G2 on an exclusive XTDB slot.

## Infrastructure policy (set about 20:00Z on 2026-11-07; the old header's date was an estimate)
Host saturated (36 GiB, about 14 GiB compressed, load 12-13 on 12 cores; Sam's default colima VM shares it), so the triplex2 VM cannot
grow. QLever dev resident raised to 3.5 GiB and recreated fresh after three OOM kills (pool now 10.0 of 11 GiB). Until pressure drops: no new
engine-heavy dispatches; heavy commands via lab/bin/heavy.mjs; gate reruns one at a time; latency judged only relatively. Check both dev
residents at every check-in; recreate qlever-dev fresh when its delta grows.

## Pending decisions for Sam (flagged, provisional rulings in force)
- Q58a (replaces Q55c) native queries after a commit: when a Triplex client commits and then runs a raw native query (SPARQL, XTQL or SQL)
  on the same client without naming a basis, should the query (a) wait for its own commit to reach the replica, up to a 2 s deadline,
  then fail typed, or (b) answer at once at the replica's position and report it? Provisional: (a) for the same client session, (b) for
  tokenless external callers (what the XTDB client, Mongo drivers, Cosmos SDK and LiteFS proxy do). Cost of (a): native latency includes
  replica lag, seconds on XTDB when its indexer is busy.
- Q60 measurement margins and host: "hold" margins 1.10 (p50) and 1.15 (p99), superiority 1.25 (provisional). May acceptance measurement
  windows pause Sam's default colima VM (4 vCPU) and other heavy host jobs? Not done without Sam.
- R15 presence/deletion/cascade: Option C staged; delete = end valid time; default restrict; cascade any-parent card-one.
- Q21 AMB-09: two equal-valued assertions on one entity are one value, so a duplicated pay fact never doubles a total (SUM 10, not 20).
- Q21 AMB-17: `find` fails with ConflictingValuesError when a returned document has a conflicted attribute (a projection omitting it succeeds).
- Q21 AMB-04: a -0.0 assertion keeps bit-exact -0.0 in the journal; the numeric rule overrides C6's old byte-identity promise.
- Q49c erased values in queries: match no value predicate, skipped by SUM/AVG/MIN/MAX, sorted last, one group per attribute (provisional).
- Q24 erasure: after the erasure commit publishes, reads at every basis (even before it) show a typed ErasedValue marker, not the value.
- R19 tenancy: do pooled cell databases with per-tenant envelope encryption count as storage-layer isolation for the 1,000 small tenants
  (provisional yes; large tenants siloed)? And how many small tenants are active in 15 minutes (provisional 10%)?
- R21: file the XTDB DECIMAL-to-BIGINT-through-double and `= ANY` precedence findings upstream? (publishes lab findings; not done)
- R18: Datomic-style `noHistory` for high-churn attributes? Default kept: history for everything (audit is a must-have).
- GS.03: a vendor's older revision arriving after a newer one is acknowledged as `superseded`, changes no current value, and is journaled.

- 22:35Z: running now: CX-A01-0311, CX-K01-R2, CX-DA01, CX-SQL01, CX-OBS01, CX-G03, CX-P2Q-R3 (round 4 fix F1), CX-VX02-3 (round 4 review), CX-O05-R2 (round 3 fixes R2-F1..F3). 9 of 10.
- K01 round 2 (05a23dd): Q83d settle evidence implemented, 41 tests and tsc pass; offline review CX-VK01 launched. Live run waits for the
  scale window: it needs pool capacity (park tx2-datomic-dev) and slot s1 cleared, but s1 holds CX-OBS01's retained source and canary, so
  OBS01 must release s1 first. Nothing was deleted.
- Running (9): CX-DA01, CX-SQL01, CX-A01-0311 (r3: evaluator suite), CX-X02-R3 (r4: Q79f), CX-P2Q-R3 (r5), CX-K01-R2 (r3),
  CX-VO05-2 (O-OBS r3 review), CX-OBS01 (r2; releases s1), CX-G03 (r2, no-slot work). Contract 0.3.11 merge undone per Q87.
  Scale window after DA01: park tx2-datomic-dev; K01 live, G03 slot run, W01b GS, J01 compact-on G1, X02/C8 exclusive reruns.
- SQL01 delivered (53d41ad): 73 package + 23 semantic + 5 live tests, 80 SIGKILLs with zero ACKed commits lost, outage pulls 1 ms at 10k
  and 30k commands. Open: one unreproduced pinned read that returned 30 of 40 facts (possible P1 torn read). Review CX-VSQL01 launched,
  told to reproduce that first. EXP-P5 waits for the SQL01 merge.
- DA01 round 1 delivered (4a540cc): G0 1,024 tests, G1 88/88 plus the full suite twice; resident READY, volume kept. Round 2 (Q85a-d
  fixes from V-DA00) dispatched; then a joint DA00+DA01 review. The Datomic resident stays up for DA01 round 2, so the scale window
  opens when K01 (offline review), X02 (review) and G03 (fixture migration) are ready for slot runs, not before.
- Contract 0.3.11 merged to main (Q87 gate: 108/108 evaluator, --verify byte-identical). O-REPLAY 0.4.9 pinned; lane D registered.
  Next contract: 0.3.12 compiles Q72, Q79e-f, Q80, Q82-Q87 plus G03's box pins. When CX-G03 round 3 ends, its next round starts by
  merging main (0.3.11 touched the same fixtures).
- INT-XCJ: X02 merged on int/X02-C8-J01 (7fcf69e): G0 1,070/1,070, evaluator 108/108; contract --verify fails only because X02 changed
  pinned packages/qualification/src/native/xtdb-workloads.ts. Pinned sources change only with a contract version, so contract 0.3.12
  round 2 merges int/X02-C8-J01 and re-pins it after checking the diff does not change the measured workload. INT-XCJ continues with C8, J01.
- Queued: EXP-DA04 (lane D on Postgres SQL storage, Q88b) after DA01 round 2 and the joint DA00+DA01 review merge; before DA03.
- Queued for DA01 round 3: Q89d (pin multi-request Datalog to one db, refuse future positions, seek the position-to-t map, enumerate by
  subject). Queued for SQL01's next round: Q89b on H1's pull predicate (sqlite-worker.ts:158). Running: CX-RQ01 (harness), R33 (design).
- SQL01 ACCEPT default-off (verify/SQL01 73fbe45); merges after P2Q in one integration round. Contract 0.3.12 (f5e7a41) in review; its
  round 2 re-pins the INT-XCJ workload files. P2Q round 7 fix (Q89c) running.
- Queued: EXP-RT01 round A (core, testkit, harness, both A0s) from main after RQ01 merges (Q90g). Running: CX-O06 (O-REPLAY 0.5.0).
- Pending Sam: Q86g (VM H1/H2), Q78e tenant isolation (lane D), Q89g public commit pin (A/B/C; R33 recommends C).
- INT-XCJ complete at b916d5d: X02, C8, J01 (default-off) integrated; G0 1,168/1,168, evaluator 108/108, C8 and J01 live tests proven
  (except the QLever C8 closure timeout, under CX-C8-R4). Main gets it in one step after contract 0.3.12 re-pins the two workload files
  (0.3.12 round 3 merges int/X02-C8-J01) and C8-R4 reports.
- Scale window plan (park tx2-datomic-dev once CX-VDA01 finishes; pool then 6.5 of 11 GiB, one 3.5 GiB exclusive slot at a time, run in
  this order): (1) EXP-QG1 phase 0 and 1 on qlever-s1 (a copy of qlever-dev's data, then the delta sweep; R35, Q91); (2) K01 live on
  xtdb-s1 once its offline review accepts; (3) G03 slot run per its SLOT-RUN.md once its fixture migration lands; (4) X02 and C8 exclusive
  G1/G2 reruns; (5) W01b GS rerun; (6) J01 compact-on G1. Unpark tx2-datomic-dev for EXP-DA04 after the window.
- Scale window adds: (7) EXP-P5 A1 at 1k on an exclusive XTDB slot (CX-P5A writes the commands).
- Main now has contract 0.3.12 (O-OBS pinned for screening, Q72/Q79e-f/Q80/Q82-Q88 compiled, workload re-pins) plus X02, C8 and J01
  (default-off); Q87 gate 108/108 on main after the merge. Next contract: 0.4.0 with RT01, O-REPLAY 0.5.0, Q89-Q92 and G03's pins.
- O-REPLAY 0.5.0 ACCEPT (exp/O06-oracle-record-time fed510e; verify/O06 fc78350): ready to pin in contract 0.4.0 together with RT01
  (the oracle merge and pin move go in one commit, Q45a). Not merged alone: 0.4.0 needs RT01's product side first.
- OBS01 round 5 (c55a728): all ten protocols worked; 1 PASS, 9 FAIL, 20 negatives refused, 59 tests. The nine remaining gaps need
  sources the shared residents cannot give without changes (engine statement logs, read-only engine-config mounts, crash and memory-failure
  windows, physical-file inventory for erasure scans); round5/SOURCES.md names each change. OBS01 pauses until the scale window, where those
  protocols run on exclusive slots configured for observation (with G03's containers); no resident is changed.
- K01 round 8 (6f7e11f): G0 covers all 89 declared columns in 11 tables plus dynamic columns; 167 tests. In review round 7. Queued for
  K01's next round: Q93c's normalized digest D' for E1 (fresh seed against golden).
- Queued: ER01-C (erasure core) after RT01 round A merges; then ER01-X and ER01-R; ER01-Q behind SQL01 and QG1 phase 2; ER01-D behind DA04.
  Running: ER01-S scanners (CX-OBS01). Pending Sam: Q95-S (S1-S4).
- Scale window OPEN (tx2-datomic-dev parked by the orchestrator, volume tx2-datomic-dev-data kept). Running in it: CX-QG1 on qlever-s1.
  Unpark for EXP-DA04 after the window.
- Housekeeping rule: when a branch merges or its verdict is recorded, archive untracked and ignored files of its builder and reviewer
  worktrees to /Users/sam/Claude/Projects/triplex-db-2/worktree-archive/ and git worktree remove them. Host disk 15 GiB free after 38 removals.
- Note: agents whose worktree was archived and removed (CX-INT-XCJ, CX-X02-R3, CX-VX02-3, CX-VDA01, CX-VSQL01-2, CX-J01-R2, CX-VJ01-2,
  CX-VC8-3 and the older ones in worktree-archive/INDEX.txt) cannot be resumed (codex needs its launch cwd); follow-up work on those
  branches uses a fresh launch with a new worktree. CX-XRUN replaces CX-INT-XCJ for the XTDB exclusive reruns.
- Scale window queue (one exclusive 3.5 GiB slot at a time; CX-XRUN holds xtdb-s1 now): next K01 live two-start and E1 per
  .claude/worktrees/k01/lab/experiments/EXP-K01-seed-clone/LIVE-round10.md (K01 r10 e525760, 397 tests; offline review skipped in favor of the
  live run because the remaining risk is native wire fidelity; an independent reviewer reads the live receipts after); then P5 A1 at 1k;
  then G03's slot run; then RT01 live G2 conformance and the G6 latency comparison on one slot; then W02 live GS on xtdb; then unpark tx2-datomic-dev for EXP-DA04.
