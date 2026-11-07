# EXP-F02b wire exactness fixes (make the F02 falsifier pass)

**North star:** correctness floor under Sam's numeric rule ("no silent precision loss": exact round trip, hard error never silent
conversion), which every P2 commit and every P4 pull depends on. A silent -0 or rounded double in the ledger is a wrong answer at any speed.
**Scope:** lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md section 3 (numeric row), lab/research/SAM-pasted-numbers-2026-11-07.md,
lab/acceptance/RULINGS.md Q14b, Q21 (AMB-04), Q22, Q23 and Q30a-e. Evidence: lab/experiments/EXP-F02-wire-exactness/REPORT.md and
results.json; falsifier lab/falsifiers/wire/. Inherited homebase files are for code facts only.

## Commander's intent
Every value kind round-trips exactly on every qualified path on both engines, or is rejected with a typed error before any mutation.
When this lands, `node lab/falsifiers/wire/run.mjs` reports zero silent changes on both engines, and ProjectionSpec states and enforces
the exact encodings the falsifier proved.

## Point of view
1. **Reject, do not repair.** JSON with -0, non-finite or inexact numbers is rejected at the qualified write routes (writer, bulk import,
   replay), before CanonicalJson runs (Q30a). Do not change canonical identity hashing. Instant -0 rejected (Q30b).
2. **Pin encodings, do not hope.** XTDB card-many DOUBLE and integer lists go through `ARRAY[CAST(? AS ...)]`; XTDB date and instant are
   read as text (Q30c). ProjectionSpec carries the encoding, and a projection that uses any other encoding fails its check.
3. **Fix the QLever shadow predicate at the root** (packages/qlever/src/rdf.ts:83 and its caller in native/NativeContext.ts:135): exact
   only if not -0 and the `%.13g` rendering parses back to the same bits; integers within ±2^59 (Q30d). Add the falsifier's failing values
   as unit tests.
4. **Recursive approximate-number rejection** inside List and Struct (Q30a).
5. Keep diffs small and local; comments cite the Q30 ruling and the F02 record ids each change fixes.

## Boundaries
- Worktree branch `exp/F02b-wire-exactness-fixes`. Files: packages/core/src/entity/ProjectionSpec.ts and the write-path guard nearby,
  packages/xtdb/src/codecs.ts (and the list-parameter encoding), packages/qlever/src/rdf.ts and native/NativeContext.ts, their tests.
  EXP-P2X also touches packages/xtdb (XtdbStorageAdapter.ts); stay out of that file, and rebase if needed.
- Engines: the pool is full, so use the shared dev residents (`tx2-xtdb-dev` :5470 and `tx2-qlever-dev` :7070, recreated from main's
  config at 85aba57) with scope keys and graph names unique to EXP-F02b; never down or recreate a dev resident. If a dev resident is
  unhealthy, wait and report rather than taking another agent's slot. Never ports 15442/17019; Docker only via DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock.

## Gates
1. Falsifier on both engines: zero silent changes; every remaining difference is a typed rejection.
2. `node lab/bin/gate.mjs G1 --lane xtdb` and `--lane qlever` pass (QLever may still show the EXP-002 baseline state; report it).
3. Unit tests for every Q30 rule.

## Report
Commit hash, falsifier before/after counts per engine and kind, gate receipts, anything you could not fix. The orchestrator saves it.
