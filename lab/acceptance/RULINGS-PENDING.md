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
Q93a-c and the original amendment table are compiled in 0.3.13; Q83d/e retired. Q92c/g remain pending and unchanged.

| Ruling | Today | Proposed |
|---|---|---|

## Q94: golden scenarios (from R37, lab/research/R37-golden-scenario-readiness.md section 5)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q94a (waits for Sam) | GS acceptance runs at the largest W0 rung each lane's chosen composition fits on one exclusive slot within the 50 GiB pool disk limit (expected: 100k for broker and QLever `cur` compositions; 10k for XTDB-replica and Datomic compositions unless the forecast is raised per run, Q92i). Year-one volumes are reported as a projection next to the measured rung, never as a pass. This loosens TARGETS 6 rule 3, so it waits for Sam; until he rules, GS stays OPEN at acceptance | R37 a; TARGETS threshold policy; R34 sizes; SCOPE 3.2 (state an engine limit plainly) |

## Q95: erasure (EXP-ER01, from R38, lab/research/R38-erasure-design.md)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q95a | Keys are per protected assertion, random, from a durable pre-issued pool; this refines Q58e's "per subject" | R38 6.9 a |
| Q95b | Protected values are sealed in the TypeScript core before any adapter or engine; one `unseal` decodes every route; engines never see plaintext | R38 6.9 b |
| Q95c (waits for Sam, S3) | Protected attributes are refused for engine-side predicates, order, Unique, grouping and aggregates (`E-PROTECTED-NOT-INDEXABLE`); kernel-side semantics stay as Q49c, Q52 and Q56 | R38 6.9 c |
| Q95d | Native results return `SealedValue` or `ErasedValue` for protected cells; they decrypt only when the row's assertion id is projected | R38 6.9 d |
| Q95e | Two copies of every erasure record (data and ledger); the key store and ledger are never restored from an older copy; restore and key-store restore repair each other (3.6) | R38 6.9 e |
| Q95f | The frontier is the per-tenant ledger `seq`, read from the source's head row at each request's start; answers carry `erasure: {seq}` | R38 6.9 f |
| Q95g | Q82d under encryption is read as the four scans of 4.1, each with its own positive control | R38 6.9 g |
| Q95h | XTDB `ERASE` is not used; Datomic excision removes value datoms only; QLever generations drop erased envelopes; evaluation closures record assertion ids for protected observations | R38 6.9 h |
| Q95-S (Sam) | Waiting for Sam: R38 section 7, S1 (what a reader pinned before an erasure sees afterwards; amends Q89i), S2 (time to unrecoverable, about 20 minutes, and the key-store trade), S3 (protected attributes are kernel-only for comparison, order, Unique and range rules), S4 (erase only declared-protected attributes). R38 recommends S1 A, S2 accept with R = 15 min, S3 A, S4 A. Also stated: whether crypto-shredding meets GDPR Article 17 is contested, so counsel should confirm before Triplex calls it compliant. | R38 7 |

## Q96: lane X P2 (from R39, lab/research/R39-lane-x-p2.md)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q96a composition | P2 is measured per subject serially and in parallel across subjects, with the queue inside the candidate (Q51a); A0's single-flight composition stays only as a control arm. Golden scenario commit bars measured on single-flight A0 are DIAGNOSTIC (they measure queueing). | R39 3.2; R37 1.2 |
| Q96b stamps under concurrency | RT01 round A's client stamp is monotone only because A0 serializes every commit; any per-subject concurrent arm uses a decider-side stamp (the engine stamp after probe p9, or the broker's), per Q90c. RT01 round A's added scope-wide scan on A0 is measured on an engine before RT01 merges (G6). | R39 3.3 |
| Q96c the shortest path and the native check | Lane X's shortest path to P2 is XTDB behind the broker (EXP-P2B, Q51b, Q58b). EXP-P2X2 (lab/experiments/EXP-P2X2/BRIEF.md) runs once on an exclusive xtdb-s1 slot after K01's live run and before P5 A1, to settle whether the native path is closed, with the decision rule written in R39 4.5 before the run (native is closed if F3 p50 > 6 ms, or F5 p50 > 20 ms, or engine resolve > 7 ms per commit). If closed, the lab says so plainly (SCOPE 3.2) and keeps the native arm as a comparison. | R39 2, 4 |

## Q97: lane Q P4 (from R40, lab/research/R40-lane-q-p4.md)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q97a current pulls from H1 | Lane Q serves current-value pulls from the broker's SQLite H1 store, behind a default-off currentRoute: "h1" option; QLever keeps history, native SPARQL and analytics. This is the ruled design (Q68a, Q50a, Q68d), which SQL01 used only as an outage fallback. A route that cannot answer a basis exactly refuses (Q89b, Q89c, Q92h). EXP-QH1 (lab/experiments/EXP-QH1/BRIEF.md) builds it after P2Q and SQL01 merge; its G1 to G7 need no slot, G8 takes one exclusive qlever-s1 run. | R40 2-3 |
| Q97b the keep-alive stall | Every QLever latency measured from the host through QleverClient so far carries a 41 to 45 ms keep-alive stall on about a third of requests, because QLever never sets TCP_NODELAY and QleverClient keeps connections alive. QLever latency receipts record the connection mode; earlier QLever latency numbers are DIAGNOSTIC on this ground too. The fix is measured first as a connection per request from the host (no custom image), with the engine patch as the fallback. | R40 1, 4.3; R17 0.2 |
| Q97c multi-request pulls | A pull form that needs one request per BFS level cannot meet P4 from the host on QLever (transport alone is 18 to 32 ms per depth-6 pull), so no multi-request QLever pull form is a P4 candidate. | R40 1 |

## Q98: P3, the change feed (from R41, lab/research/R41-p3-readiness.md section 6)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q98a | **The feed contract.** P3 is measured only on identity-only feeds whose entries carry, per transaction, stream, epoch, offset or LSN, positions, txIds, operationId, commandIds and the decided stamp, and per change op (`assert`, `retract`, `erase`), entity, attribute, validFrom, validTo, position and assertion id, plus the erasure seq on erase changes. Entries never carry a value, an envelope or a key id. Resolutions are `commit`, `aborted`, `epoch` and `seal`. Core's value-bearing journal route (`transactions()` and its siblings) is a history API and serves P3 only as the A0 control. Consumer outputs hold subject ids and positions only | R41 a; TARGETS 1.1 P3, 3 row 3, 7 items 3 and 8; Q31c; R38 2.3, 3.2, 5.3; R33 3.6 |
| Q98b | **Consumer state off the engine's write path.** A P3 consumer writes its effects, affected set and checkpoint in one transaction of a host SQLite store with the Q84a pragmas. An engine-resident consumer (P2X `tx_feed_checkpoints`, a Datomic consumer entity) is a control arm only. Amends R29:244 and refines R18 3.4 item 5 (the checkpoint shares a transaction with the consumer's own outputs, not with the source) | R41 b; P2X trace-C 88da3e: consumer write p50 431 ms, p99 2,212 ms in the serial indexer; TARGETS 1.1 P3 item 4 needs one durable write, not the source's store |
| Q98c | **Publication instant per arm.** Broker: `watermarkAt` per LSN. XTDB as source: the host monotonic instant when the writer's COMMIT SYNC returns, recorded per tx id by the writer apart from the ACK, with XTDB `system_time` beside it as a cross-check. Datomic as source: the host monotonic instant when the TS client receives the transact result. Engine clocks are never subtracted from host clocks. A position without an instant fails the run | R41 c; TARGETS 1.1 P3 item 1; Q55d; Q67d; P2X trace-C 88da3e had 63 positions without one |
| Q98d | **Stamp and publication instant are separate.** The decided stamp is the entry's record time; it never starts a lag interval, and a publication instant is never a record time. A consumer re-runs a subject at the delivered entry's stamp or position, never at the wall clock's "now" | R41 d; Q90a, Q90d; R33 1.3 Q14-Q15 |
| Q98e | **The gap unit.** Gaps are counted over positions (Q31c coordinates), with every LSN or offset in the read range accounted as a commit, an abort, an epoch boundary or a seal. A seal is never a gap. Positions acknowledged after the consumer stopped are outside the run (the 7ed77c65 fix) and the run's end is the final published prefix (Q67d) | R41 e; Q31c; R33 3.6; N01 6f67e0's 11 gaps |
| Q98f | **Exact resume is byte-exact for identity-only feeds,** including across an erasure and, on lane D, across an excision; no "modulo erasure" relaxation applies to feed entries. A re-sent or lost-ACK command creates no new position | R41 f; TARGETS 1.1 P3 item 5, 7 item 2; Q90c; Q95h |
| Q98g | **The affected set for P3 is O-DOMAIN's** (W0 SPEC 10; Q36e; Q40b). A direct-subject affected set is DIAGNOSTIC for NS-P3-DOMAIN-AFFECTED-SET; the N01 bar "affected-subject set matches" and every consumer before EXP-DI01 are diagnostic on it | R41 g; TARGETS 1.1 P3 item 3; W0 SPEC 10 items 3 and 4 |
| Q98h | **The P3 reader load is real.** A P3 lag receipt counts only with 256 closed-loop readers per TARGETS 1.1 P1 on the lane's read composition, the consumer in its own worker or process, and the reader level taken from the run. Lag is pooled over the whole window, bursts included, and reported split steady and burst | R41 h; TARGETS 1.1 P3 bar; N01 6f67e0 label defect |
| Q98i | **Every P3 receipt so far is DIAGNOSTIC** (P2X, P2Q, SQL01 kill-50, N01, all GS receipts): none ran with 256 readers, none used the O-DOMAIN affected set, none ran through an executing gate, all predate contract 0.4.0. Their correctness findings (0 gaps, 0 order violations, 0 keyed duplicates over 100 crashes per variant) stay as design evidence | R41 i; Q90f, Q94e; R41-g, R41-h |
| Q98j (orchestrator; arm B counting as lane X waits for Sam) | **Lane X P3 arms.** Lane X reports two P3 arms: XTDB behind the broker (the candidate, arm B) and the native feed with an off-engine consumer store (arm A1). Whether arm B counts as "lane X" is Sam's call (R39 open question 2); until he rules, every lane X P3 receipt names its source-of-truth assignment | R41 j; TARGETS 4.1 item 1; Q51b; Q96c; R39 6 item 2 |
