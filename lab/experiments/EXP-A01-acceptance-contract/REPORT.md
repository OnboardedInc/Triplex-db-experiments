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
