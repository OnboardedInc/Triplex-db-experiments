# EXP-A01 report: acceptance contract

Saved by the orchestrator from the agent's hand-back (the agent's harness refused its own REPORT.md write).

Result class: PROGRESSED (contract drafted as 0.1.0-draft, not frozen). Date 2026-11-07. No engine started, no source or
test modified.

## What landed (lab/acceptance/)
- ACCEPTANCE.md: done formula, language counting rules, machine schema, oracles (with the O-REPLAY spec in 4.2), mutation
  controls, receipt validity rules V1-V16, closure rules, status algorithm, 18 loophole bans (B1-B18), carry-forward rule,
  change control, case-set specs, all 88 obligations, counts.
- obligations.json: 88 obligations, format `triplex-db-2/acceptance-obligations/1`, each with `definitionSha256`.
- load-contract.json: v0 (open-loop arrival, 15-class query mix, writer mix and floor, overload policy, 9 zero-tolerance
  invariants, CALIBRATE thresholds with hard floors and ceilings, levels 256/512/1024 plus recovery, calibration C1-C9).
- capability-matrix.md: 45 operator-by-type rows by surface and engine/language; 27 known-limit entries with evidence.
- build_contract.py: single source of truth; `python3 -I lab/acceptance/build_contract.py` validates and regenerates.

## Counts
88 distinct obligations, all applying to all three lanes (xtdb-xtql, xtdb-sql, qlever-sparql); 19 engine-scoped, 69 per lane.
3 policy-pending (G9 presence, deletion, cascade); 10 derived (inferred from a source, listed in ACCEPTANCE).
Only 6 can close with oracles that exist today: G1.found.unchanged44, PKT.full142, G2.strings.codepoint-supported,
G2.strings.codepoint-raw, R.raw.guide-only-authoring, S.packet.coresident.

## New oracles needed
O-REPLAY (independent Python event replay; 33 case sets depend on it), O-SHAPE (negation/aggregate edge answers), O-ERR (typed
errors per negative case), O-OBS (engine-side observation protocol), O-SPEC (type witnesses vs packed declarations).

## Facts later experiments need
- Writer floor in the inherited rate16 contract is 0.2 commands/s in aggregate; "6/6 writers" meant 6 commands.
- Unchanged44 is mostly Datalog-shaped and engine-scoped; it cannot stand in for native obligations.
- QLever has no conformance driver in this checkout; G1.found.unchanged44 needs a homebase-independent runner for QLever.
- xtdb-xtql needs 60 new XTQL packet recipes (57 SQL-only + 3 hybrid) before PKT.full142 can close.
- Receipts need: contractVersion, obligation ids with definitionSha256, runKind, mutation id and patch hash for mutation runs,
  per-case languages[], source tree hash including uncommitted files (ACCEPTANCE section 3).

## Open questions
Q1 to Q12 were answered by the orchestrator in lab/acceptance/RULINGS.md.

## Contract 0.3.8 (branch contract/0.3.8 f159abd, merged into main 445bc45; saved 2026-11-08 00:01Z)
- 156 obligations (new G9.erasure.residual-shapes, G7.broker.promotion-hardening, G7.position.bound-after-publication); per lane 153/153/154,
  engine-scope 50; thresholds 50, mutants 44; counterexamples 48/17. O-REPLAY pin scope 123 uses / 117 may close / 6 blocked (scale evolution:
  G1.types.decimal, G1.types.storage-widening-safe, G7.migration.schema-evolution, G7.migration.valid-writes-never-rejected; Q52 shapes:
  G9.erasure.residual-shapes; both: R.repo.mutation-controls). Newly closable: the 11 erasure obligations, G9.erasure.commit-semantics,
  G9.erasure.query-semantics, G1.decimal.channel-routing. Pending at generation: Q51b, Q57a-e.
- Hashes: transitive 4ee29f9b...6c53; obligations.json 86c26c4a...c718; ACCEPTANCE.md 1122c7f8...03d7; load-contract.json 85b25137...c4a2c7;
  budgets.json 2ec648fd...2a52; capability-matrix.md 2450d5dd...5f72; build_contract.py 4e4f64cd...9a83; RULINGS.md 081399e6...2769;
  RULINGS-PENDING.md 7aa835dd...ab24 (at generation).
- Regressions 189/189 runnable caught (118 carried from tests-through-037.json, 71 new; 44 old entries no longer match, mostly admission
  code Q55a replaced); 8 first-run misses fixed (7 fixtures with a second unrelated defect, 1 check crashing on a missing field); "Q38b
  booleans" retired for a v2. Q47d probe (q47d_test038.py) PASS. Scripts in lab/experiments/EXP-A01-acceptance-contract/regressions/.
- Changelog: (1) O-REPLAY 0.4.1 BUILT-ACCEPTED at a9c1327 with hashes.a9c1327.json as an input, excludes empty, refusals q52-shapes (6 named
  CS-ERASURE cases + DR-JSON-CONVERT-ROUNDING at 7 sites), tdk1-keys (run.py:53), envelope-facts (views.py:129, unreached), scale-evolution
  (entities.py:61), nextPin 0.4.2. (2) Q55a QUALIFICATION_RUN 8 steps (qualification_run, resolve_cases, rewritten admit_claim; A0_REGISTRY
  binarySha256 must be reproduced; evidence_ok removed; VERIFIER_REGISTRY V-O03 8f631ab superseded, V-O04c fa6c236, V-D01-W0-1.1.1 bee0b25;
  oracle pins, the W0 pin and each claimed obligation need registry entries; fixtures CX-R7-INVENTED-EVIDENCE, CX-R7-SELECTION-OVERREACH,
  CX-R7-RELABELLED-CONTROL rejected). (3) Q55b COMMIT_OUTCOMES per variant, QT4s-SOURCE-PUBLISHED and QT4r-REPLICA-APPLIED, composition_ok
  requires the source variant and, for a log source, implementationSha256, fsyncMode, fullFsync, device; fault points
  C2-SOURCE-PUBLISHED-REPLICA-BEHIND, C2-CRASH-AFTER-SOURCE-PUBLISHED. (4) Q55c provisional per-surface guarantees (E-BASIS-NOT-AVAILABLE,
  E-REPLICA-UNAVAILABLE; 7 CS-COMPOSITION cases; NS-P2-RYOW-PER-SURFACE). (5) Q55d NS-P3-EVERY-POSITION-ACCOUNTED; Q55e fingerprintOwnership.
  (6) Q52/Q56 erasure (inFlight per commit; queriesResidual, commandShape, selectors, presence, syntheticData). (7) Q50c-e
  G7.broker.promotion-hardening, GATE-BROKER-HARDENING, storagePerCommit, runQueue. (8) Q51a hotSubjects (NS-P2-HOT-SUBJECT-QUEUE), Q51c
  POSITION binding, 100k rung deferred to EXP-J01, SIGKILL fault points, E-DUAL-COMMIT-PATH. (9) Q53 readings, Q54 checks. (10) Q50 (Q50b
  superseded), Q51 without Q51b, Q52-Q56 moved into RULINGS.md.
- Questions ruled Q59 (placement until 0.4.2; ER-INFLIGHT-READ narrowed; own brief file per verification; registry entry per claimed
  obligation; pin each answer-producing oracle later; pin case manifests through contract bumps).

## Contract 0.3.9 (branch contract/0.3.9 c71bd12 + merge 2d36c89; merged into main 6f17e2b; saved 2026-11-08 00:22Z)
- 157 obligations (new G7.composition.overlay-rules); per lane 154/154/155, engine-scope 50; thresholds 50, mutants 44; counterexamples 53/17;
  O-REPLAY pin scope 124 / 118 / 6. Pending at generation: Q51b, Q57a-e, Q63a-d. Hashes: transitive edc0effa...0a62; obligations.json
  9266a224...3b29; ACCEPTANCE.md b0cfdc60...0f21; load-contract.json 460dc9d5...2eed; budgets.json ff507af6...6dbe; capability-matrix.md
  a18d2a59...3830; build_contract.py 8457cfa8...8884; RULINGS.md bc55fe69...4bdb.
- Regressions 242/242 runnable caught (183 carried from tests-through-038.json, 59 new; 51 retired); 4 first-run misses fixed (a check crashing on
  the renamed hardening gate, NS_MODES compared with itself, an unpinned-oracle fixture using a TO-BUILD oracle, an anchor matching rulings
  text); Q47d probe PASS. Merge conflict with main's Q63 rows resolved by rebuilding the pending file; exposed that a pending sub-id (Q58a) of a
  compiled base is not flagged (Q64f).
- Changelog: (1) Q61 field names for EXP-E01: `oracleRunners` (O-REPLAY argv `python3 -I lab/oracles/replay/cli.py {case}`), `oracleAnswerRule`
  (exit 2 or X-NOT-MODELED = refusal, other nonzero = oracle error, never PASS; stdout one canonical JSON; answer members commandOutcomes, state,
  queries; inputs carry no expectations), `caseManifest` triplex-db-2/case-manifest/1 (id, tags, input path, contentSha256, comparator; optional
  oracle, faultPoint), `buildSpec` triplex-db-2/build-spec/1 (null, fails closed), `imagePins` (generation fails if slots.json disagrees),
  build-manifest/2 (inputs, buildSpecSha256), case-result/2 (mode, rep, comparator, inputSha256), fault-witness/1, `workloadIdentity.appliesTo`
  CR-NS and CR-GS, `qualificationRun.contractSource` main, `a0Registry.entryShape.measuredBy` a VERIFIER_REGISTRY entry of kind a0, load-contract
  `writerTrace.generator.frozen` (null), reference-model case_entry_ok and fault_witness_ok. (2) Q60 PAIR-0 provisional: `measurementProtocol`,
  NS modes [single-execution, paired-rounds], CR-NS only from paired rounds in GREEN windows, RECEIPT_SCHEMA slotRegime and rounds, A0_REGISTRY
  measurement, paired_ok, counterexamples CX-PAIR0-SINGLE-RUN, -UNJUDGED-WINDOW, -REGIME-MISMATCH, -COMMITTED-ONLY, CX-A0-SINGLE-RUN. (3) Q58a native
  tokens provisional (facade, after/at, E-BASIS-NOT-AVAILABLE {required, observed, replica}, E-BASIS-NOT-RECONSTRUCTIBLE, session high-water mark,
  {basis: {low, high}, route}, nativeDeadlineMs 2000, 7 NATIVE_TOKEN_CASES). (4) Q58b-e: experimentDirections; hardening cases BR-SQLITE-DURABILITY-
  PRAGMAS, BR-CRC-CHAIN-MID-WAL, BR-COMMITTED-AT, BR-EPOCH-ROW, BR-MARKER-CHECKPOINT-CROSSCHECK, BR-RECENT-ROWS-PERSISTED, BR-LOG-CRYPTO-SHRED (rotation
  and flock cases removed); COMPOSITION.overlay; ERASURE.logErasure; recent_rows in PROTECTED_COPY_INVENTORY; ER-LOG-CRYPTO-SHRED. (5) Q62: 6
  P2Q_READ_CASES, fault point C2-TWO-BROKERS-ONE-PROCESS, GATE-BROKER-HARDENING needs only Q62a for default-off merge, storagePerCommit 653.
  (6) Q59: unpinned-oracle claims DIAGNOSTIC; COMPILED oracles count as pinned; briefRule.
- Questions ruled Q64a-f.
