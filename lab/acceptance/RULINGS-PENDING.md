# Rulings recorded but not yet compiled (Q38c: RULINGS.md holds only compiled or explicitly listed entries)

These move into RULINGS.md when the contract version that compiles them is built.

## Q51b: EXP-P2X feed lag on XTDB (not compiled in 0.3.8: an experiment direction with no contract effect)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q51b feed lag on XTDB | The next XTDB P2/P3 experiment puts XTDB behind the same host log and broker as EXP-P2Q (EXP-P2B: XTDB as the replica, current and history layer), since that composition measured feed lag p99 12.8-24.5 ms and an ACK independent of the engine. The subject-stamp path stays the XTDB-native arm (A1) to compare against; a separate consumer database through ATTACH is not pursued unless P2B fails. | both engines stay candidates for every layer; fewer moving parts |

## Q73: EXP-D01b-112 readings for W0-1.1.3
| Q | Ruling | Basis |
| --- | --- | --- |
| Q73a deep writes | A publish or receive payload of any nesting depth is copied and written exactly (A13 applies to the writer as well as the reader). W0-1.1.3 adds a synthetic publish case with a payload of 20,000 nested arrays, delivered and stored unchanged. | EXP-D01b-112 SPEC-AMBIGUITY 1 |
| Q73b waiting at done + 1 | An inconsistent receiver snapshot with a waiting entry at done + 1 is kept as given (A15); an arriving seq equal to that entry is a duplicate, so the entry is never released. W0-1.1.3 adds a synthetic receive case: state {done 2, waiting [seq 3]}, deliveries [seq 3, seq 5]; projection applies 3 and 5, effects apply nothing, waiting [3, 5]. | EXP-D01b-112 SPEC-AMBIGUITY 2; A15 |

## Q78: lane D (Datomic) design decisions (R29)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q78e erasure and tenancy | Erasure is crypto-shredding first and excision of ciphertext second (batched, since excision is heavy); tenant isolation is one database per tenant. Whether a shared dev storage file satisfies storage-layer isolation, and whether dev storage is acceptable for final acceptance, are Sam's calls (pending). | R29 open questions |

## Q81: E01 delta check (round 3)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q81b counter, every request kind | Q77c applies to every request kind: an HTTP GET (or any method) the QLever counter does not positively classify as a read counts as a write; after a pgwire parser exception the connection's remaining traffic is counted as writes (or the connection refused) and survives tally resets. | CX-VC8-2 |
| Q81c default-off is byte-identical | An option that is off by default leaves every public client contract unchanged: J01's text-array binding becomes an explicit parameter descriptor used only by compact guards; untagged arrays keep their existing JSON handling; a differential public-client test with the option off proves it. The compact-on qualification (G1 off and on, each lane, receipts binding the encoding) runs on an exclusive slot before compact-on is used anywhere. | CX-VJ01 F1, F2 |

## Q86: R28 isolation for the executing gate (EXP-G03)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q86g VM hardening (Sam) | Narrowing the triplex2 VM's mounts (H1: today colima mounts $HOME writable, so every Docker socket holder can write anywhere in Sam's home) and blocking outbound traffic from tx2 containers (H2; today the VM reaches every Mac 127.0.0.1 service including ports 15442 and 17019) change the VM's security settings and wait for Sam. Until then R1, R4, D1, D2, D3, L1 and N1-N4 stay on the named unprotected list. | R28 decision 1 |

## Q88: lane D storage (from R32)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q78e tenant isolation (Sam) | Still waiting for Sam: one Datomic transactor owns one storage table, so schemas or row security cannot split one system. Options: tiered (small tenants pooled per cell with per-tenant envelope keys, large tenants with their own schema, roles and transactor; R32's recommendation, matches R19), silo every tenant (one transactor each; proves storage isolation literally, infeasible at 1,000 tenants), or pool every tenant (isolation enforced at the gateway, not storage). | R32 section 3 |

## Q89: route equivalence (from R31)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q89a record time at decision (design first) | Record time is to be stamped when the commit is decided, monotone in position, on every lane (broker writer lock, XTDB engine stamp, Datomic transactor value), with a record-time watermark that gates a named T like a future position. Today `transact` stamps before allocating a position (TriplesLive.ts:309 before :326), so a recordedAt cut is not a log prefix and an answer at a named T can change after it was served (R31 D-C1). Because this changes the core receipt `instant`, a planner designs it (R33) and it lands with a contract version. | R31 5.1 |
| Q89b refuse what a route cannot answer | Until Q89a lands, every store that retires rows by position refuses any basis naming a record time: H1 (including its pull predicate, sqlite-worker.ts:158), R24's planned current store, and Datomic's `:f/live` path. | R31 5.3, 5.4 |
| Q89c typed refusal | A route that cannot answer a basis exactly fails with a typed error, never an empty result with a flag; every route waits then refuses for a future position (and, after Q89a, a future record time). | R31 5.5 |
| Q89d DA01 read pins | DA01's next round pins multi-request Datalog (rule rounds, final query, optional pulls) to one position or held db (D-D1), refuses future positions (D-D3), seeks the position-to-t map (D-D4) and enumerates by subject for getByEntities (D-D5). | R31 5.2, 5.5 |
| Q89e Datomic current/history | Datomic separates current from history at the index level; R18 line 97 is superseded. DA03's P4 path reads `:f/live` for latest and position shapes and falls back to `:f/subject` for record-time shapes (Q89b). | R31 2, 3 |
| Q89f route-equivalence gate | The harness of R31 section 4 lives in packages/testkit and is a required gate for every branch that adds or changes a read route (SQL01, EXP-P4, P2X, DA01, DA03, R24's current store). | R31 4 |
| Q89g public position token (Sam) | Waiting for Sam with Q89a: add a position or opaque snapshot token to the public TemporalBasis so callers can pin "the latest committed tx (named exactly)". It changes the public TypeScript API (goal 10). | R31 R31-g |
| Q89h P4 arm X1 guard | Before any promotion of P4 arm X1, an initialization probe refuses default bounds when any row in tx_assertions has native valid time (D-X2). | R31 5.6 |
| Q89i a pinned read is an immutable snapshot | Every read at a named basis returns the snapshot as known at that basis: a retirement (retraction, deletion) recorded after the cut is invisible, including its metadata, so repeating the request after later commits returns identical bytes (HE-5). Raw-lifetime rows (a row with its whole later history, O-REPLAY AMB-01 A) are a separate history API with its own result contract and are compared separately; the route-equivalence harness names which contract each driver serves and never compares one against the other. | V-RQ01 F3; P1 |

## Q90: record time at decision, design (R33, lab/research/R33-record-time-at-decision.md)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q90a stamps | R33 S1-S7 (section 2.1): one integer-microsecond stamp per transaction, `max(previous + 1, clock)` in decision order, strictly increasing with position; public value `stamp / 1000` (epoch ms, no type change); clock-lead refusal; legacy adapters exempt until they declare `recordTime: "decided"`. | R33 2.1-2.2 |
| Q90b stagedAt | Omitted validFrom and the constraint instant use `stagedAt`; TransactionResult gains `stagedAt` (additive). | R33 2.3 |
| Q90c per lane | QLever broker stamps in commitGroup under the writer lock (frames v2; lost-ACK replays return the original stamp); QLever A0 and XTDB A0 stamp on the client under their existing scope CAS (refines Q89a's "A0 CURRENT_TIMESTAMP"); XTDB P2X uses the engine stamp after probe p9, else integer microseconds on both XTDB arms; Datomic stamps on the peer under :db/cas, validated by the gateway (not :db/txInstant). | R33 2.5-2.8 |
| Q90d watermark | The record-time watermark is the latest decided stamp; a read at T above it waits up to 2 s, then fails with typed BasisNotAvailable { axis: "recordedAt" } on every route; seals follow in round 2. | R33 3 |
| Q90e journal | Journal values never hold the transaction's own record instant: no `:_tx/instant`, change JSON v2. | R33 2.10 |
| Q90f oracle and contract | O-REPLAY 0.5.0 (R33 4.3) is built by a separate builder from section 4.3 only, then reviewed independently before its pin; G9-CUT-02b replaces G9-CUT-02; contract 0.4.0 starts a new comparison series and re-freezes both A0 controls. | R33 4.3-4.4, 6.5 |
| Q90g order | RT01 rounds A (core, testkit, harness, XTDB A0, QLever A0) start from main after RQ01 merges; round B lands on each lane branch (broker on SQL01's successor, P2X, DA01) after it merges main; Q89b is lifted per store only with RQ01 evidence for T and TP shapes (round 2). | R33 6.1, R33-h |
| Q89g options (Sam) | R33 section 5: (A) no new field; (B) a raw position in TemporalBasis; (C) an opaque scope-checked snapshot token (R33 recommends C). After Q90a, `recordedAt: receipt.instant` alone already pins one commit exactly. | R33 5 |

## Q91: the QLever lane reads from a built index (from R35)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q91a built base, bounded delta | QLever-lane performance evidence (P1, P4, P5, GS) counts only from a server whose data sits mostly in a built base index with a delta bounded by a declared rebuild threshold. Every QLever receipt records base triple count, delta triple count and the delta in the blocks the measured scans touched. The lane's design (R2, R8, R13, R17) always assumed this; nothing built or measured it, and qlever-dev's base holds 1 triple. Earlier QLever latency numbers from delta-only servers are DIAGNOSTIC. | R35 sections 1-3 |
| Q91b stop dropping data with --fresh | qlever-dev is no longer reset with --fresh as a delta policy; delta growth on shared residents is handled by the rebuild loop of Q91c once it is qualified. | R35 3 |
| Q91c generations from the log | EXP-QG1 (lab/experiments/EXP-QG1-qlever-generations/) builds the rebuild loop: phase 1 on an exclusive slot measures scan and join cost against delta size (monotonic and spread keys) on a 10M-triple base and picks the threshold; phase 2 rebuilds blue/green index generations from the broker log, with reader leases so one multi-request read stays on one generation, and checks Q89i byte identity across every swap. The feed stays the log. Bounding the delta per graph is rejected (all graphs share one server's blocks). | R35 5 |
| Q91d phase 0 on a copy | The first rebuild-index runs on a copy of qlever-dev's data on an exclusive slot, not on the shared resident, because several reviews read qlever-dev live and upstream bug #3172 can make a rebuild fail. | orchestrator |

## Q92: release activation sweep (P5, from R34; lab/research/R34-p5-sweep-brief.md section 8)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q92a | The P5 sweep basis is `{recordedPosition: P_act, validAt: V_act}` with `P_act` taken from the activation receipt by the driver and `V_act` from a deterministic runtime clock anchored at W0's population valid time (never the wall clock); no sweep names `recordedAt` until Q90 round 2 lifts Q89b for that store with RQ01 evidence for T and TP | R34 a; moves P5; P1 floor |
| Q92b | On every lane the sweep reads one unit per page (one SQLite read transaction, one statement set, one Datomic `as-of` value taken fresh from the latest db); nothing spans pages; a pin exists only where a store purges by position, and it is a retention pin with a lease | R34 b; moves P5 (never blocks writers) |
| Q92c | P5's data volume is the W0 population at the rung: every P5 receipt binds the fingerprint (`basis.tx`, fact count, worlds digest, release hashes) and the store's own counts at start and end; a mismatch fails closed; P5 runs only on a freshly seeded or fingerprint-verified clone on an exclusive slot, never a dev resident | R34 c; moves P5; correctness floor |
| Q92d | At the 10k and 100k rungs, lanes X and Q measure P5 on the broker's host store (S3); the engine replica is not read by the sweep, and the receipt names its state (seeded, compact `cur`, frozen generation, or detached). Engine-fed arms (X native, QLever A0) run at 1k as baselines, because the A0 encodings of the W0 population exceed the slot disks above 1k. This states an engine limit plainly (SCOPE 3.2); it rules out no engine for any layer | R34 d; moves P5 |
| Q92e | The sweep's cores are declared: in the VM the sweep runs on cores disjoint from the live arm's, W is in the receipt, and the about-1,100-subjects-per-second-per-core figure is checked at W = 1; a shared-core variant is reported beside it | R34 e; moves P5 |
| Q92f | Rounds are drawn as steady or burst rounds (seeded); both kinds must pass both ratio bars and the 100 s wall; the commit p99 verdict pools burst rounds to at least 25,000 commands per arm; screening may use a 180 s burst-period trace as its own named series | R34 f; moves P5, P2 |
| Q92g | Expected answers: worlds from O-DOMAIN's population for untouched placements and from O-REPLAY for placements written at or before the basis; outputs from O-DOMAIN `reconcile`; the outbox from O-DOMAIN `publish`, compared per subject and per item; G0's fingerprint sweep runs after every seed or clone | R34 g; moves P5 floor |
| Q92h | SQL01's `sweepPage` throws a typed `BasisNotAvailable` instead of returning `eligible: false, rows: []` (D-Q2), sweep pages run on dedicated sweep threads, not the live reader pool, and every lane's sweep route is a registered RQ01 route that must pass G6 | R34 h; moves P5, P1 |
| Q92i | Lane D's 100k sweep waits for the 10k receipt's bytes per fact; if the projection exceeds the slot disk forecast, the orchestrator either raises the lane D forecast for one exclusive run inside the 50 GiB pool disk limit or asks a planner for a compact fact encoding | R34 i; moves P5 (lane D) |
| Q92j | In rounds A and B only sweep records are published; live reconciles are pulls; GS.10's race (in-flight reconciles finishing on the old release) is a later round | R34 j; moves P5 |
| Q92k | The W0 trace mapper drives W0-valid commands on the swept scope from the frozen trace schedule; its source hash is bound; its first use starts a new comparison series (TARGETS 2.1 item 5) | R34 k; moves P5, P1 |

## Q93: seed reuse is admitted by content, not by process evidence (R36, lab/research/R36-k01-simplification.md section 6)
The table below is R36 section 6 verbatim (old rule, its status, new text). Q83d and Q83e are retired by Q93a; Q83a stays as a diagnostic aid.

| Ruling | Today | Proposed |
|---|---|---|
| **New Q93a: process evidence refuses, never grants** | n/a | For seed reuse on every lane, the only evidence that grants admission is a content fingerprint (G0) read through the engine by the process that will measure, on the endpoint it measures, before its warm-up, compared with a digest pinned before the freeze began (and with O-DOMAIN where one exists). Every other observation (stop, settle, log tails, frontiers, inspect, stderr, timers, owner state, copy hashes, plan hashes, disk) is refusal-only or a diagnostic, and no decision reads a diagnostic. |
| **New Q93b: G0 for K01** | n/a | Fields, pinning point and counts as in sections 2.1 and 3.2; every read has a deadline; the golden is published only after two starts of a clone each reproduce `D` and the layout digest `L`. |
| Q74a golden key | refuse a stale key | **unchanged** (refusal-only) |
| Q74b canonical freeze state | settled: finish-block, jobs 0, live index empty | becomes the **recipe**: two finish-blocks, jobs-0 waits, `docker stop -t 60`, copy from a stopped container. A timeout refuses; nothing in it grants. |
| Q74c E1 first | no clone receipt counts until E1 passes | **unchanged**; E1 is rerun when the recipe, the image or the XTDB version changes |
| Q74d readiness | `/healthz/started` plus C1-C8 PASS stored in `owner.json` | **replaced** by Q93a/b: health precondition plus G0 in the driver; `owner.json` holds slot ownership only |
| Q74e, Q74f, Q74g | maintenance event in the window; disk floor; broker compositions copy together | unchanged |
| Q83a Log4j flag | required so the stop lines appear | **kept as a diagnostic aid**; no rule requires the lines |
| Q83b settle and clean-stop evidence | gating evidence | **superseded by Q93a**: the steps stay in the recipe, their readings become diagnostics; `xt.live_tables` is read only on a freshly started node (K3) |
| Q83c block listing | never read an unlisted block | kept for diagnostic tools; B never reads `xt.block_files` |
| Q83d settle after fast compaction | gating predicate | **retired** |
| Q83e three frontiers F, M, T | gating, with a stopped-tail proof for (F, M] | **retired**; F and M recorded as diagnostics, T checked on the clone (K3) |
| Q92c, Q92g (P5 fingerprint) | "freshly seeded or fingerprint-verified clone"; G0 after every seed or clone | unchanged; Q93a makes K01 conform to them |
| `load-contract.json` lines 174-234 | binds Q83b, Q83d, Q83e precedence and the F/M/T schema | replace with the Q93a/b binding in the next contract version |
