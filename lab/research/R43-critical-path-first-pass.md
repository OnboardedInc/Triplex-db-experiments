# R43: the critical path from today's accepted work to the first PASS cell and the first full composition column

Planner: R43 (Opus 5.5, high). Date: 2026-11-09 (UTC). Repository: /Users/sam/projects/triplex-db-2, main at 561e716f.
Goals and targets come only from lab/SCOPE.md, lab/NORTH-STAR.md and lab/TARGETS.md. Inherited files were read for code facts only.
North star: this note moves no priority by itself. It orders the work so the first P1 to P5 cell can close, then one whole column.

## 0. Answer

1. **No cell can PASS today, and the reason is not engine speed.** Every NS obligation is blocked by machinery that no accepted result
   supplies: the acceptance profile is year-one size (P-YEAR-ONE), which no lane fits on this host; O-OBS is pinned for screening
   only; the executing gate (G03) has no NS runner, fault injector or PAIR-0 runner; the evaluator (claim.mjs) cannot recompute an NS
   bar; the frozen trace, the CS-NS manifest, the build spec and all three A0 registry entries are null; calibration needs the year-one
   population on the A0 control.
2. **The first cell to reach PASS is NS.P3 (ordered, resumable change feed) on the broker log source,** landing in the all-QLever (+log)
   column. NS.P3 has the largest margin in the lab (lag p99 13.7 to 24.9 ms at zero readers against a 250 ms bar), the most mature
   correctness evidence (0 gaps, 0 order violations, 0 keyed duplicates over 100 crashes per crash point), receipt scope "engine" keyed
   by the source layer (so no lane-language rule applies, and the same receipt key covers every composition with that broker source), and
   no dependency on R42's open P2 latency question.
3. **The longest chain is the shared qualification chain, not the P3 product work:** NS-run design, G03 rounds 5 to 7 (NS runner, fault
   injector, single grant, PAIR-0 hook), G03 slot run, A0 measured under PAIR-0, a qualification-pins contract (0.4.1), calibration,
   prerequisite claims, three acceptance runs, the verifier. About 12 sequential agent rounds (range 11 to 16) and about 9.5 slot hours
   that cannot overlap, plus about 6.5 slot hours of parallel windows.
4. **Two blocking gaps have no owner and sit on that chain:** M01 (PAIR-0) has been parked since 2026-11-07, 2,900 lines behind main and
   absent from the scale-window queue; and nobody has designed how an NS run executes under Q86a (no candidate process on the Mac),
   given that the broker runs on the macOS host with F_FULLFSYNC and R28 never mentions it.
5. **The first question for Sam is new:** a rung ruling for NS like Q94a is for GS. Q94a covers only golden scenarios. NS.P1 to NS.P5 name
   P-YEAR-ONE, and calibration step C1 requires S.population.year-one closed on the A0 control, so without it no NS cell can close on any
   lane. The second question is Q60's host half (may acceptance windows pause the default colima VM), because absolute bars count only
   in GREEN windows and this host moved zero-reader runs by 1.6x minutes apart (R25).
6. **The first full column is a broker-sourced composition** (broker log as source of truth, its SQLite H1 store for current pulls and
   sweeps, an engine replica for history). Its long poles are P5 at the 100k rung (NS-P5-SCOPED-RELEASE-REACHED is defined at 100k) and P1
   and P2 under 256 readers, which depend on R42 explaining P2B's 46 ms in-memory commit p50.
7. **Pause or demote:** K01 live reruns and P5 A1 (lane X native, predicted to miss P5 by 10x), W02 live GS on xtdb (diagnostic before 0.4.0),
   QNODELAY's fifth receipt-hardening round. Move RT01 live G2/G6, G03's slot run and the M01 A/A duet ahead of them in the one-slot queue.

## 1. What a PASS needs, and what accepted work already supplies

### 1.1 The PASS predicate common to every cell

A scorecard cell is PASS when its NS obligation is closed for that composition (ACCEPTANCE 2, 5.5, 5.6). The table lists every condition
the contract and the evaluator check, with today's state.

| # | Condition | Source | State on 2026-11-09 | Owner today |
| --- | --- | --- | --- | --- |
| A1 | Profile P-YEAR-ONE plus P-NS (10m entities, 100m active facts, retained history) | obligations.json profiles; NS.* "Profiles: P-YEAR-ONE, P-NS" | infeasible on this host for every lane (R34 2.5, R37 4.3) | **none: needs a Sam ruling (section 6, R43-S1)** |
| A2 | Calibration VC record for all 31 NS thresholds, with C1 "S.population.year-one closed on the control profile" | load-contract calibration; CR-CALIBRATION; VC5 | impossible without A1's ruling; A0 control holds W0 only at 1k | none |
| A3 | Contract in the 0.4.0 series or later | Q90f, Q94e | main is 0.3.13; 0.3.14 FIX-FIRST round 2 running; 0.4.0 waits for 0.3.14 | CX-A01-0314 |
| A4 | Qualification pins: writerTrace.generator.frozen, CS-NS manifestSha256, BUILD_SPEC, A0_REGISTRY entries, a VERIFIER_REGISTRY entry per claimed obligation | qualificationRun.blockers (Q65f, Q67a) | all null | none planned (0.4.0's scope does not list them) |
| A5 | An executing gate: OBL runner, fault injector writing fault-witness/1, PAIR-0 paired-rounds runner, isolation in force | qualificationRun.blockers; Q86a-f | G03 round 4 offline; its report lists obl-case.ts, fault witnesses and PAIR-0 as unimplemented; no registered-slot run yet; no builder running now | CX-G03 (idle) |
| A6 | The evaluator recomputes every named NS bar from retained raw events | CR-NS | claim.mjs on main has no lag, gap or quantile recompute; gate.mjs gateNS ends at MEASURED or INVALID, never PASS (G03 round4/grant-audit.md) | none |
| A7 | O-OBS accepted, not screening-only | closability: every NS.* blocked by `oracle-screening-only:O-OBS`; Q82c needs verifier recollection | OBS01 round 5: 1 PASS, 9 FAIL protocols; paused until observation-configured exclusive slots | CX-OBS01 (paused) |
| A8 | GATE-POSITION: a qualified G7.position.coordinates receipt for that composition's source, four falsifiers included | Q31c, Q38a | falsifiers pass offline on P2Q; no qualified run | none until G03 |
| A9 | Claim prerequisites: G10.composition.identity-bound; W0.coverage-floors (P3, P5) | CLAIM_ADMISSION | both closable at pin level; no qualified run | none until G03 |
| A10 | Paired rounds against A0 from the A0 registry (claim.mjs stops with CONTROL-UNMATCHED otherwise) | Q46b, Q47b, Q60 | A0 registry null; A0-QLEVER and A0-XTDB hold the W0 population only at 1k (R34 2.5) | **none: no rule for a rung A0 cannot run (R43-b)** |
| A11 | Absolute bars judged only in GREEN windows (noise gate, A/A rounds) | Q60e | the A/A duet that measures s_d never ran | M01 (parked) |
| A12 | T-RUNS = 3 independent runs, and no earlier failed acceptance receipt for the same key and profile (VA12) | CR-NS; VA12 | a failed acceptance run poisons its key, so acceptance must follow passing screening | orchestrator |
| A13 | VV verifier: re-evaluate-and-spot, one spot rerun per lane and NS measurement, by an agent that wrote none of the code | 5.8; VV1-VV4 | none | orchestrator |

### 1.2 Cell by cell

Columns as in lab/SCORECARD.md section 1. C5 is read here as the broker log (QLever's log of record and broker) with an XTDB replica, which
is what EXP-P2B builds; section 5.3 item 11 explains why the columns need restating. "Supplied" lists accepted or merged results that
cover part of the cell; "missing" lists what the cell needs beyond section 1.1.

| Priority | C1 all-XTDB (XTQL) | C2 all-XTDB (SQL) | C3 all-QLever (+log) | C4 XTDB SoT + QLever reads | C5 broker log + XTDB reads (P2B) |
| --- | --- | --- | --- | --- | --- |
| **P1** pinned reads never block writers | Supplied: X02 XTQL parity on main; RT01 round A accepted offline (decided stamps on A0). Direction only: R16, reads exact but commit service 17 to 90-112 ms at 4+ readers on one node. Missing: reader follower (X05, locked worktree), 256 and 1,024 ladder on the frozen trace, writer ratio 1.25x on a quiet host (Q60) | As C1 with the SQL surface (G2 SQL 142/142 on main) | Supplied: INT-Q accepted (broker plus SQL01, 50 stops, zero acknowledged commits lost); R25: 0 SQLITE_BUSY over about 300k commits, 0 violations in about 91M reads. Missing: SPARQL reads need a QLever replica that holds the rung (A0 encoding fits 1k only), or a ruling that H1 repository reads count for the lane (R43-c); R42 (reader contention in the broker process); QNODELAY default | Nothing in flight: no QLever read index fed from an XTDB feed | Supplied: P2B round 1 (unaccepted) in memory, 194,153 reads at 256 readers, read p99 9.80 ms, zero errors. Missing: P2B merge; live XTDB replica reads |
| **P2** atomic idempotent commits, low latency | GAP, documented: native XTDB commit path closed (Q96d; P2X2 accepted, F3 p50 7.68 ms against 6, F5 33.00 ms against 20). Workaround is the broker (C5), counted as lane X only if Sam rules Q98j | shared with C1 | Supplied: INT-Q durability; P2Q offline p50 5.9 ms at zero readers (diagnostic). Missing: 256 readers (the same broker gave p50 45.94 ms, p99 82.45 ms in P2B round 1, R42 open); decided stamps in frames v2 (RT01 round B); hot-subject queue (Q51a) | GAP as C1 (the source is native XTDB) | As C3 (same broker); P2B round 2 diagnosing latency by stage |
| **P3** ordered resumable feed | Supplied: P2X native feed 0 gaps, 0 order violations, 0 keyed duplicates over 100 crashes per point (unreviewed, about 460 commits behind main); FD01 accepted offline (host consumer store removes the in-engine consumer write, three quarters of P2X's 2.9 s). Missing: P2X rebase and V-P2X (arm A1), all of section 3 | shared with C1 | **Supplied: broker feed 0 gaps, 0 order, 0 keyed duplicates; lag p99 13.7 to 24.9 ms at zero readers; FD01 accepted offline (feed contract, host SQLite consumer store, 900 crash observations); P3M running.** Missing: section 3 | As C1 (native XTDB source) | Same broker source as C3, so the same engine-scoped receipt key (section 3.2) |
| **P4** fast current values | Direction only: R16 single pull p50 3.95 / 3.81 / 5.34 ms at depth 1 / 3 / 10 (1.35x at depth 10 against a 1.1x flatness bar); 40-entity pull 35-40 ms. EXP-P4 paused. Missing: a current path that is flat and meets 1,100 pulls/s per core | As C1 | Supplied: R40 decomposition; Q97a design (current pulls from H1, estimated 1 to 2 ms p50, 8 to 20 ms p99); R25 split layout rows examined 1.00x from depth 1 to 10, p99 1.13x with 8 readers. Missing: EXP-QH1 (not started); throughput per core when the serving store is host SQLite with no CPU quota; lane-language rule for H1 pulls (R43-c) | Nothing in flight | H1 sits in the same broker, so QH1 serves this column too; otherwise as C1 |
| **P5** release activation over 100k | Supplied: P5 round A accepted offline (W0 fingerprints match O-DOMAIN at 1k and 10k; harness, trace mapper, admission). Native sweep predicted 200 to 800 s at 100k and fits only 1k (R34). P5 A1 stopped on the disk guard | As C1 | Supplied: round A harness; R25 short sweep commit p99 ratio 1.25x on the means (1.70x in one pass). Missing: round B on the host store (Q92d, estimated 15 to 45 s at 100k with 4 workers); outbox record kind in broker frames; replica at 100k (compact encoding, unowned) or a named detached state; throttled variant over a real rebuild (QG1 phase 2); lane-language rule (R43-c) | Needs QG1 phase 2 and a compact encoding; nothing in flight | Same host-store sweep as C3; XTDB replica at 100k needs an 8 to 20 GB forecast (R34) |

### 1.3 Cells the scorecard can state honestly today

1. **P2 for C1, C2 and C4 can move from OPEN to GAP** with the documented statement Q96d (native XTDB commit path closed in this VM;
   workaround: the broker as source of truth, EXP-P2B). GAP is a defined scorecard value and the evidence (P2X2, verify/P2X2 4155fda7) is
   accepted. This is not a PASS, but it stops the scorecard implying that the native path is still open.
2. **MEASURED values** could be entered for diagnostic numbers that have accepted receipts (P2X2 F3 and F5; QG1 phase 0 and 1), marked
   diagnostic. Optional; it shows movement without claiming closure.

## 2. Dependency graph of the remaining work

### 2.1 Graph

Legend: `==>` the longest chain to the first PASS (NS.P3); `-->` other dependencies; `[S]` a decision for Sam; `(x)` not on the path
to the first PASS.

```
  [S] R43-S1 NS rung (new; Q94a's shape for NS)          [S] Q60 host: quiet acceptance windows
          |                                                      |
          +----------------------------+-------------------------+
                                       |
                                       v
  (needed by calibration C1, by every acceptance run, and by A0's rung)

  CONTRACT TRACK
  0.3.14 round 2 (INT-Q, GS12F, valueDomain required) --> 0.3.14 merge
        --> RT01 live G2/G6 on a slot (Q96b, 1 h) --> 0.4.0 (RT01 A, O-REPLAY 0.5.0, FD01, Q89 minus g, Q90, Q92, Q95 minus S, Q98a-i)
        --> 0.4.0 merge ------------------------------------------------------------------------------+
                                                                                                      |
  GATE TRACK (longest)                                                                                v
  R44 NS-run design ==> G03 r5 ==> G03 r6 ==> G03 r7 ==> G03 registered-slot run ==> A0 under PAIR-0 at 1k (N02)
  (driver placement,    (NS runner,  (fault      (single    (isolation preflight,        |
   host broker, A0 rule, CR-NS spec)  injector)  grant)      1.5 h)                       |
           ^                 ^                                                            v
           |   M01 rebase --> M01 review --> M01 A/A duet (Q69a window, 2 slots, 1.5 h) -->+
           |                                                                              |
           |   OBS01 resume (H7 kqueue for broker publication, FAULT-TRANSITIONS DR,          |
           |   MAINTENANCE) --> V-O05 acceptance review (verifier recollection) ----------->+
           |                                                                              |
           |   CR-NS recompute in claim.mjs (P3 bars first) --> review ------------------->+
           |                                                                              v
           |                                               ==> 0.4.1 qualification pins (frozen trace, CS-NS manifest,
           |                                                   BUILD_SPEC, A0 registry, O-OBS acceptance pin, verifier registry)
           |                                               ==> calibration VC record (2.5 h)  <-- [S] R43-S1
           |                                               ==> prerequisite claims: G7.position.coordinates,
           |                                                   G10.composition.identity-bound, W0.coverage-floors (0.5 h)
           |                                               ==> NS.P3 acceptance, 3 runs plus crash schedules (2.5 h)  <-- [S] Q60
           |                                               ==> VV verifier spot rerun (1 h)
           |                                               ==> PASS: NS.P3 x C3 (and C5 by the source-keyed receipt)
           |
  LANE TRACK (P3 on the broker source; fits inside the gate track)
  FD01 (accepted offline) --> P3M (running) --> DI01 design check --> DI01 build --> DI01 review --+
  0.4.0 merge --> RT01 round B on the broker (frames v2 decided stamps, Q90c) -------------------+--> P3 screening window (2 h)
  (optional, composition C5) P2B r2 --> P2B r3..r5 --> V-P2B --> integration ---------------------+       --> acceptance

  DECISIONS NOT ON THE FIRST-PASS PATH
  [S] Q98j  broker feed counts as lane X? ....... (x) relabels P2 and P3 for C1/C2; blocks nothing in C3 or C5
  [S] Q94a  GS rung ............................. (x) GS only; fold into R43-S1 and ask once
  [S] Q86g  VM H1/H2 ............................ (x) if R1 and R4 stay on the named residual list for the first qualifying runs (R28 decision 4)
  [S] Q89g  public position token ............... (x) no NS cell; RT01's recordedAt already pins one commit (R33 5)
  [S] Q95-S erasure S1-S4 ....................... (x) GS.16 and the erasure requirement; the feed carries no values (R41 6)
  [S] Q78e  lane D tenancy ...................... (x) lane D GS.14 and GS.15; lane D has no scorecard column yet
```

### 2.2 Nodes

Rounds are builder-plus-review pairs; the lab's recent pairs take about 40 to 60 minutes (ledger: CX-A01-0314 25 min plus its review 18 min;
CX-FD01 18 min plus 8 min), so one round is budgeted at 1 to 1.5 hours with dispatch.

| Node | State | Owner | Rounds | Slot h | Longest chain |
| --- | --- | --- | --- | --- | --- |
| R43-S1 NS rung | not asked | Sam | 0 | 0 | gate input |
| Q60 host windows | pending since 2026-11-07 | Sam | 0 | 0 | gate input |
| 0.3.14 | FIX-FIRST round 2 running | CX-A01-0314 | 1 to 2 | 0 | no |
| RT01 live G2/G6 | queued behind K01 and P5 A1 | scale window | 1 | 1 | no |
| 0.4.0 | starts after 0.3.14 | contract builder | 2 to 3 | 0 | no (finishes inside the gate track) |
| R44 NS-run design | not started | Opus planner | 1 | 0 | **yes** |
| G03 rounds 5 to 7 | idle since round 4 | CX-G03 | 3 to 5 | 0 | **yes** |
| G03 registered-slot run | queued in the window | CX-G03 | 1 | 1.5 | **yes** |
| M01 rebase, review, A/A duet | parked since 2026-11-07; not in the queue | none | 2 to 3 | 1.5 (two slots) | joins the chain at A0 |
| OBS01 P3 protocols, V-O05 acceptance | paused | CX-OBS01, CX-VO05 | 2 to 3 | 1.5 | joins at 0.4.1 |
| CR-NS recompute | not started | none | 2 | 0 | joins at 0.4.1 |
| A0 under PAIR-0 (N02) | not started | orchestrator | 1 | 1.5 | **yes** |
| 0.4.1 qualification pins | not planned | contract builder | 1 to 2 | 0 | **yes** |
| Calibration VC | not started | orchestrator | 1 | 2.5 | **yes** |
| Prerequisite claims | not started | orchestrator | 1 | 0.5 | **yes** |
| P3M, DI01, RT01 round B | P3M running; DI01 waits for a design check; round B after 0.4.0 | CX-P3M, planner, CX-RT01 | 5 to 7 | 0 | no |
| P3 screening window | not scheduled | orchestrator | 1 | 2 | no |
| NS.P3 acceptance, 3 runs | | orchestrator | 1 | 2.5 | **yes** |
| VV verifier | | reviewer | 1 | 1 | **yes** |

## 3. The first PASS cell: NS.P3 on the broker log source

### 3.1 Why P3, and not another priority

| Priority, best composition | Margin against the bar | Product work still missing | Contract obstacles beyond section 1.1 | Verdict |
| --- | --- | --- | --- | --- |
| **P3, broker source** | lag p99 13.7 to 24.9 ms against 250 ms (10x), zero readers | DI01 (O-DOMAIN affected set), P3M (lag from the publication instant, 256 readers), RT01 round B stamps | none: receipt scope engine, keyed by the source layer; no lane-language rule | **first** |
| P5, broker host store | estimate 15 to 45 s against 100 s; ratio 1.25x on means, 1.70x in one pass | round B, outbox record kind, replica at 100k, throttled variant over a real rebuild | NS-P5-SCOPED-RELEASE-REACHED is defined at 100k; "in the lane's language" while the sweep reads SQLite H1 (R43-c) | second |
| P4, H1 | estimate 1 to 2 ms p50, 8 to 20 ms p99; throughput 600 to 2,500 pulls per CPU second against 1,100 | QH1 entire | lane-language rule; "per engine core" undefined for host SQLite | third |
| P1, any | unresolvable on this host so far (R25: zero-reader runs 1.6x apart) | readers off the broker's event loop (R42), 1,024 stress, split reads, maintenance in window | lane language; Q60 quiet host | later |
| P2, any | no passing number anywhere (best with 256 readers: p50 45.94 ms) | R42 cause and fix | Q60 | later |

### 3.2 Which column the P3 cell lands in, and at which rung

1. **Column C3, all-QLever (+log).** The broker, its SQLite store and the QLever replica are on main once 0.3.14 merges (INT-Q). No other
   product branch has to merge first.
2. **The same receipt key also covers C5.** NS.P2 and NS.P3 have receipt scope "engine" with layer "source": the key is (source, engine,
   image digest, config hash, slot). P2B uses the same broker as its source, so one closure on that broker build and configuration counts
   for C5 too, once the scorecard columns are restated by source assignment (section 5.3 item 11).
3. **The rung is set by the read side, not by the feed.** Q98h requires 256 readers "on the lane's read composition", and per-surface P1
   reads on lane Q are SPARQL, served by the QLever replica. In the A0 encoding (64 quads per fact) the replica holds the W0 population
   only at 1k (R34 2.5). So under a ruling shaped like Q94a, C3's rung is 1k until a compact replica encoding exists. Two ways to a 10k
   rung, both outside the longest chain:
   - read through P2B's XTDB replica (0.8 to 2 GB at 10k, R34), which needs P2B merged (3 to 5 rounds, in parallel);
   - accept H1 repository reads as the lane's reader load (R43-c), which needs EXP-QH1.
   **Recommendation:** run screening at 1k on C3 as soon as the lane track is done; run acceptance on whichever of C3 at its rung or C5 at
   10k is ready when the gate track finishes. Either fills both columns' P3 cell through the source key.

### 3.3 Exact steps and gates

| Step | Work | Exit gate | Depends on | Rounds | Slot h |
| --- | --- | --- | --- | --- | --- |
| 0 | Ask Sam R43-S1 (NS rung) and Q60 (quiet windows) together with Q94a | written rulings compiled as pending rows | nothing | 0 | 0 |
| 1 | Finish 0.3.14 (valueDomain required on the shared adapter interface) and merge | `build_contract.py --verify`; Q87 gate 108/108 on the merged branch | running | 1 to 2 | 0 |
| 2 | RT01 live G2 and G6 on an exclusive XTDB slot | G2 142/142; G6 route equivalence on A0 (Q96b) | step 1 for ordering only | 1 | 1 |
| 3 | Contract 0.4.0: RT01 A, O-REPLAY 0.5.0 pin, FD01 merge, Q89 minus g, Q90, Q92, Q95 minus S, Q98a-i, G03 isolation pins | --verify; Q87; reviewer ACCEPT | 1, 2 | 2 to 3 | 0 |
| 4 | R44 planner: how an NS run executes under Q86a (driver placement, R28 open decision 2; the host broker; consumer process; observer sources for P3; the A0 rule R43-b; the CR-NS recompute spec) | planner report plus proposed rulings | step 0 for the rung only | 1 | 0 |
| 5 | M01 rebase on main, review, merge default-off | PAIR gate tests; recompute MATCH on the offline receipt | none | 2 | 0 |
| 6 | G03 rounds 5 to 7: NS runner for CR-NS (bench driver as the run argv), fault injector writing fault-witness/1 for NS-P3-CRASH-BEFORE-EFFECT, -AFTER-EFFECT, -AFTER-CHECKPOINT, the single evaluator-owned grant (round4/grant-audit.md), the PAIR-0 hook from step 5 | offline suites; planted-fault controls; reviewer ACCEPT | 4, 5 | 3 to 5 | 0 |
| 7 | CR-NS recompute in claim.mjs for P3's bars (gaps over positions, order per subject, lag from retained publication instants, affected set against O-DOMAIN, visible duplicate effects) | planted forgeries refused; recompute equals the bench on retained raw events | 4 | 2 | 0 |
| 8 | OBS01 resumed for P3's protocols: OBS-FAULT-TRANSITIONS by durable readback of broker.db, OBS-MAINTENANCE, R27 gap G3 (broker publication instant by a kqueue watcher on the WAL, H7); V-O05 acceptance with verifier recollection | protocol PASS with planted negatives refused | 4 | 2 to 3 | 1.5 |
| 9 | Lane track: P3M (running), DI01 design check and build, RT01 round B on the broker (frames v2 stamp in FeedTransact) | P3M planted delays exact; DI01 zero misses and extras against O-DOMAIN `affected` on the W0 cases and a 10k trace; FD01 conformance with stamps | 3 | 5 to 7 | 0 |
| 10 | G03 registered-slot run; M01 A/A duet in a Q69a window (qlever-dev stopped about 75 min) | isolation preflight in force; s_d measured, window graded | 6, 5 | 1 | 3 |
| 11 | P3 screening window on C3 at its rung: frozen trace through the W0 trace mapper, one burst and one maintenance event (replica catch-up counts, TARGETS 1.1 P1 item 3), 256 readers, three crash points | 0 gaps, 0 order violations, 0 visible duplicates, lag p99 at or under 250 ms with margin; screening only | 9, 3 | 1 | 2 |
| 12 | A0 under PAIR-0 at the largest rung A0 fits (1k), budget re-freeze | registry entry with measuredBy | 10, R43-b | 1 | 1.5 |
| 13 | Contract 0.4.1: frozen acceptance trace, CS-NS manifest, BUILD_SPEC, A0 registry, O-OBS acceptance pin, VERIFIER_REGISTRY entries | --verify; Q87; claim.mjs clears every qualificationRun blocker | 3, 6, 7, 8, 12 | 1 to 2 | 0 |
| 14 | Calibration VC record on the control profile at the ruled rung (every NS threshold kept or tightened, UNATTAINABLE with its measurement where A0 cannot reach it) | CR-CALIBRATION | 13, R43-S1 | 1 | 2.5 |
| 15 | Prerequisite claims through the gate: G7.position.coordinates for the broker source, G10.composition.identity-bound, W0.coverage-floors at the rung | each QUALIFIED | 13 | 1 | 0.5 |
| 16 | NS.P3 acceptance: three independent runs plus the three crash schedules, only after step 11 shows margin (VA12) | CR-NS QUALIFIED in each of 3 runs; GREEN windows | 11, 14, 15, Q60 | 1 | 2.5 |
| 17 | VV verifier: re-evaluate every retained answer and coverage record; one spot rerun | VV1 to VV4 | 16 | 1 | 1 |

### 3.4 Estimate

| Measure | Value |
| --- | --- |
| Sequential rounds on the longest chain (steps 4, 6, 10, 12, 13, 14, 15, 16, 17) | 12 (range 11 to 16; P2Q took 11 review rounds and K01 13, so the upper end is real) |
| Slot hours on the longest chain | about 9.5 (G03 slot 1.5, A0 duet 1.5, calibration 2.5, prerequisites 0.5, acceptance 2.5, verifier 1) |
| Slot hours in parallel windows | about 6.5 (RT01 live 1, M01 A/A 1.5, OBS01 1.5, P3 screening 2, plus about 0.5 slack) |
| Lab time after Sam answers R43-S1 and Q60 | about 1 to 2 days of continuous work, if the one-slot queue gives these windows priority |

### 3.5 Risks

1. **Q60 unanswered:** if GREEN windows cannot be had on a loaded host, step 16 reports bars as unjudged, which never counts as met, even
   with P3's 10x margin.
2. **Broker on the Mac versus Q86a:** if R44 concludes the broker must run in a VM container, F_FULLFSYNC no longer applies and P2Q's
   durability evidence must be redone on Linux (R42 is measuring SQLite fsync on macOS and Linux; its answer feeds R44).
3. **The publication instant is CR evidence:** the broker's own timestamps are rejected by O-OBS (Q82a). Without H7 (step 8), lag has no
   trusted start point.
4. **O-DOMAIN speed:** DI01's equality check calls a stdlib Python oracle at every position of a 20-minute trace; untested at that size.
5. **Disk:** host free space swung from 4.8 GiB to 39 GiB today; G03 attempt 2 and P5 A1 both stopped on the 5 GiB floor.

## 4. From one cell to one full composition column

### 4.1 Which column first

The first full column is a broker-sourced composition: broker log as source of truth, H1 for current pulls and sweeps (Q97a, Q92d), an engine
replica for history. P2 and P3 are source-keyed, so they close once for both C3 and C5. P4 and P5 read H1, which is part of the broker, so
the work is shared. The two columns differ only in the replica, and the replica decides the rung:

| Replica | 10k | 100k (needed for NS.P5's scoped release) | Owner |
| --- | --- | --- | --- |
| QLever, A0 encoding | does not fit | does not fit | n/a |
| QLever, compact current graph (R24 Q1, R17) | fits by estimate | fits by estimate (R17 ran 69M triples in 1.86 GiB) | **none** |
| XTDB as P2B replica | fits (0.8 to 2 GB) | 8 to 20 GB, one exclusive run with a raised forecast | CX-P2B |

So C5 can reach 100k with work already in flight; C3 needs an unowned encoding. Recommendation: target C5 as the first full column unless
someone is assigned the compact QLever encoding now; keep C3 for P3 and P2 through the shared source key.

### 4.2 Work per priority beyond the gate chain (C5)

| Priority | Additional work | Slot h (screening plus 3 acceptance runs) | Longest item |
| --- | --- | --- | --- |
| P2 | R42 finding and fix for broker commit latency under 256 readers; P2B rounds 2 to 5; hot-subject queue (Q51a); RYOW per surface; decided stamps (RT01 round B) | 3 | R42's outcome is unknown; P2 has no passing number anywhere |
| P1 | readers on the XTDB replica (or a follower), 256 and 1,024 stress ladder, split reads, maintenance event per window, Q60 quiet host for the 1.25x writer ratio | 5 (ladder 5 levels x 600 s plus stress, three runs) | the writer ratio on this host |
| P3 | done by section 3 | 0 | |
| P4 | EXP-QH1 (G1 to G7 offline, G8 one slot run) on the shared broker; throughput per core rule for H1; matched history depth 1, 3, 10 | 3 | throughput per core |
| P5 | P5 round B on the host store; outbox record kind in broker frames; 100k seed (4.3 GB H1 plus a raised XTDB forecast); RQ01 sweep route and G6 (Q92h); throttled 10-minute variant over a real XTDB compaction | 5 | 100k seed and disk |
| all | R43-c lane-language rule for H1 reads (P1, P4, P5 are "in the lane's language") | 0 | |

### 4.3 Estimate for the full column

About 10 to 15 more sequential rounds after the first PASS (the P5 chain: round B, outbox, 100k seed, throttled variant; or P2 if R42 finds no
fix quickly), about 16 to 25 slot hours, about 3 to 5 days of lab time. The gate chain is paid once; every later cell reuses it.

### 4.4 Golden scenarios

No GS cell is on either path. All 20 are blocked at pin level by O-HAND (unpinned, no owner) and O-ERR (runner unpinned), by Q94e (diagnostic
before 0.4.0) and by CS-GS (TO-AUTHOR). The cheapest first GS cells after NS.P3 are GS.07 (threshold NS-P1-VIOLATIONS-MAX only; database PASS
already holds on lane X) and GS.19 (thresholds gaps and order only, which section 3 delivers), once O-HAND is pinned and Q94a is ruled.

## 5. Work to pause, the queue, and gaps nobody owns

### 5.1 In flight or queued, not on any critical path above

| Work | State | Why it is off the path | Recommendation |
| --- | --- | --- | --- |
| K01 round 13 and live reruns on xtdb-s1 | running; holds the next slot turn | seed clones for XTDB A0, which fits the W0 population only at 1k, where a reseed is cheap; not used by C3 or C5 | pause after round 13's offline review; drop its slot turn below the critical windows |
| P5 A1 at 1k on lane X native | stopped on the disk guard; waits for K01 | the native sweep is predicted to miss by 10x; the harness is already proven offline (round A) | demote; start P5 round B on the host store instead |
| W02 live GS on xtdb | queued | every GS receipt before 0.4.0 is diagnostic (Q94e); A0 single-flight measures queueing | pause until 0.4.1 |
| QNODELAY round 5 | running | fifth receipt-hardening round; the finding is stable since round 2; C3 and C5 serve current pulls from H1 | merge default-off with the receipt rule, or pause |
| DA01 round 5, DA04, DA03 | queued | lane D has no scorecard column and is not on either path | keep offline work; unpark tx2-datomic-dev only after the critical windows |
| ER01-C and the ER01 lane rounds | queued after RT01 A | erasure is a must-have and GS.16's long pole, but no P1 to P5 bar needs it | keep, below G03, M01 and OBS01 in agent priority |
| P2X rebase and arm A1 | not started | native lane X P3 comparison arm only | defer |
| QG1 phase 2 | waits for the P2Q merge | needed for C3's throttled P5 variant and a QLever replica beyond 1k, not for C5 | defer unless C3 is the target column |
| Nine locked agent-* worktrees (about 22 GiB) | idle | only M01's is needed | archive the other eight when the agent tool releases them; disk stopped two runs today |

### 5.2 Scale-window queue, reordered

Today's order (STATE, 2026-11-09): P5 A1, K01 live, G03 slot run, RT01 live G2/G6, W02 live GS, then DA04.
Proposed order: (1) RT01 live G2/G6, because 0.4.0 needs G6 (Q96b); (2) G03 registered-slot run; (3) M01 A/A duet in a Q69a window;
(4) OBS01 observation protocols; (5) P3 screening on C3; (6) A0 under PAIR-0; (7) calibration; (8) acceptance; then K01, P5 A1, W02, DA04.

### 5.3 Blocking gaps with no owner

| # | Gap | Blocks | Proposed owner |
| --- | --- | --- | --- |
| 1 | No NS rung ruling; NS.* name P-YEAR-ONE and calibration C1 needs S.population.year-one on the control | every NS cell | Sam (R43-S1) |
| 2 | No rule for an A0 control at a rung A0 cannot run; claim.mjs stops every CR-NS claim with CONTROL-UNMATCHED; the budgets text already says only absolute bars apply there | every NS cell above 1k | orchestrator ruling R43-b, then the claim.mjs change in G03 |
| 3 | No CR-NS recompute in the evaluator; gateNS never emits PASS | every NS cell | a builder (step 7) |
| 4 | M01 (PAIR-0) parked since 2026-11-07, behind main by its 18 changed harness files, absent from the queue | every NS cell (GREEN windows, A0 pairing) | resume CX-M01 or a fresh launch on a new worktree |
| 5 | G03 idle with obl runner, fault injector, PAIR-0 hook, observer integration and the single grant open | every claim | CX-G03 round 5 after R44 |
| 6 | NS run design under Q86a: driver placement (R28 open decision 2) and the host broker (R28 never names it) | every broker composition | R44 planner |
| 7 | O-OBS acceptance pin: verifier recollection, R27 gap G3 (broker publication instant) | every NS cell | CX-OBS01 resumed, CX-VO05 |
| 8 | Qualification pins (frozen acceptance trace, CS-NS manifest, BUILD_SPEC, A0 and verifier registry) are in no planned contract | every claim | contract 0.4.1 |
| 9 | QLever replica encoding beyond 1k (compact current graph) | C3 at any rung above 1k; C3's P5 at 100k; QG1 phase 2 | a planner or builder from R24 Q1 and R17 |
| 10 | Lane-language accounting for H1 reads (NS.P1, P4, P5 are "in the lane's language"; H1 is SQLite); "per engine core" for host SQLite | P1, P4, P5 on C3 and C5 | orchestrator ruling R43-c |
| 11 | Scorecard columns predate the broker, H1 and lane D: C5's "QLever SoT" is the broker log with no QLever in it; no Datomic column; P2 and P3 are source-keyed so one receipt fills several columns | reporting, and Q98j's framing | orchestrator restates columns by TARGETS 4.1 assignments |
| 12 | O-HAND unpinned with no owner; O-ERR runner unpinned (73 obligations) | all 20 GS, many G-goals | a builder after the first PASS |

## 6. Sam decisions, in the order to ask

| Order | Decision | Blocks a PASS? | Cells | Recommendation |
| --- | --- | --- | --- | --- |
| 1 | **R43-S1 (new): the NS rung.** NS acceptance and its calibration run at the largest W0 rung each composition fits on one exclusive slot inside the 50 GiB pool disk limit, with year-one reported as a projection, never as a pass; NS.P5's scoped release stays at 100k. Ask together with Q94a, which is the same rule for GS | **yes, every NS cell** | all 25 | accept; it states an engine limit plainly (SCOPE 3.2) and loosens no bar |
| 2 | **Q60, the host half:** may acceptance windows pause Sam's default colima VM and other heavy host jobs | **yes in practice:** absolute bars count only in GREEN windows; the P1 writer ratio cannot be resolved on this host | all | accept for named windows of 1 to 3 hours |
| 3 | **Q98j:** does a broker-sourced feed (and commit) count as lane X | no for C3 and C5; yes for C1 and C2's P2 and P3 | C1, C2 | count it as lane X's candidate, report the native arm beside it (R41-j) |
| 4 | Q86g, VM H1 and H2 | no, if R1 and R4 stay on the named residual list for the first qualifying runs (R28 decision 4) | none | approve anyway: today every Docker socket holder can write anywhere in Sam's home |
| 5 | Q95-S, Q89g, Q78e | no | GS.16; none; lane D GS.14 and GS.15 | ask after the first PASS |

## 7. Proposed orchestrator rulings

| Id | Ruling | Basis |
| --- | --- | --- |
| R43-a | The next contract after 0.4.0 is 0.4.1, "qualification pins", and carries only the frozen acceptance trace, the CS-NS manifest, BUILD_SPEC, A0 registry entries, the O-OBS acceptance pin and VERIFIER_REGISTRY entries, so 0.4.0 is not held for them | qualificationRun.blockers; Q65f; Q67a |
| R43-b | Where A0 cannot hold the rung's population, a CR-NS claim's absolute bars are judged in GREEN windows graded by A/A rounds of the candidate, and A0 is measured at the largest rung it fits for comparison and budgets only; claim.mjs records the A0 rung instead of stopping with CONTROL-UNMATCHED. Comparative and promotion claims still need a paired A0 at the same rung | ACCEPTANCE 8.6 ("where A0 cannot complete a rung, only the absolute bars and caps apply"); Q60e; R34 2.5 |
| R43-c | A repository read served by a registered current store of the composition (H1) counts for that composition's EP-REPO surfaces and is recorded with its route; native-language reads are reported separately per surface; "per engine core" for a host store uses the cores pinned to its reader threads | NS.P1, P4, P5 statements; Q97a; Q92d |
| R43-d | The scale-window queue gives priority to work on the longest chain (section 5.2) | NORTH-STAR item 1 |
| R43-e | Acceptance runs only after a screening run of the same composition shows the bar met with margin, because a failed acceptance receipt blocks its key and profile (VA12) | VA12 |

## 8. Sources read

| Source | What it gave |
| --- | --- |
| lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md | priorities, bars, 1.1 semantics, 4.1 composition identity, 6 golden scenarios |
| lab/SCORECARD.md | the 25 cells and their columns |
| lab/acceptance/ACCEPTANCE.md 0.3.13 (sections 0, 2, 5.5 to 5.8, 6.3, 10 NS, GS, S) and obligations.json (closability, qualificationRun, a0Registry, buildSpec, isolationAdmission, claimAdmission, profiles, receipt scopes) | the PASS predicate and every blocker |
| lab/acceptance/load-contract.json | frozen trace null, PAIR-0 protocol, calibration C1 |
| lab/acceptance/RULINGS-PENDING.md | Q51b, Q78e, Q86g, Q88, Q89 to Q98 |
| lab/STATE.md, lab/PLAN.md, lab/NOTEBOOK.md (last 300 lines), lab/agents/ledger.jsonl tail | queue, running agents, accepted results |
| lab/research/R33, R34, R37, R39, R40, R41; R25, R27, R28 (targeted sections) | per-priority readiness, sizes, observation sources, isolation |
| lab/bin/claim.mjs (main); .claude/worktrees/g03 lab/experiments/EXP-G03/REPORT.md and round4/grant-audit.md | evaluator and gate state |
| `git worktree list`; heads and reports of g03, fd01, p3m, p5a, p2b, k01, obs01, o06, rt01, qnodelay, contract-0314, int-q, gs12f, and the M01 agent worktree | branch state |
