# Orchestrator state (read this first after any context compaction)

Updated: 2026-11-07 ~20:50Z, generation 2 running (scope v2).

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
| exp/O01-replay-oracle (03d86f3) | V-O01 FIX-FIRST (verify/O01 745547d; lab/verify/O01/VERIFY.md) | EXP-O02 fixes it; then re-verify -> ACCEPT -> merge |
| exp/002-qlever-baseline | MERGED 85aba57 (G0/G1/G2 PASS, G4 FAIL as expected) | QLever dev resident recreated from main config (holder EXP-000) |
| exp/F02-wire-exactness | MERGED 7247c82 (lab only; partly falsified) | fixes in EXP-F02b |
| exp/001-xtdb-baseline (049639d) | PASS all; task-languages.mjs cherry-picked to main | done |
| G01 golden vectors (main) | 49 vectors; AMB-01..17 ruled (RULINGS Q21) | compile Q21 into contract 0.3.2 with Codex v2 findings |
| contract 0.3.2 (main 01fb285) | Q21-Q28 + TARGETS v2 compiled; 136 obligations, 42 thresholds; Q29 recorded, not yet compiled | compile Q29 with Codex round-2 findings (0.3.3) |

## Running agents (10 of 10, plus Codex shell b0losx599)
| Agent | Priority | Output |
| --- | --- | --- |
| EXP-N01 north-star benchmark driver (opus, exp/N01-northstar-bench) | P1-P5 measurement (NS gate) | lab/bench/, receipts |
| EXP-W01 20 golden scenarios (opus, exp/W01-golden-scenarios) | all five under real load (GS gate) | lab/scenarios/ |
| EXP-O02 oracle conformance (opus, exp/O02-oracle-conformance) | correctness floor for GS and P2 | lab/oracles/replay |
| EXP-X02 XTQL parity (opus, exp/X02-xtql-parity) | read priorities on XTDB, floor | branch; waiting on own live-check rerun |
| EXP-F02b wire exactness fixes (opus, exp/F02b-wire-exactness-fixes, dev residents) | numeric rule floor | branch |
| R19 XTDB read nodes, commit floor, tenancy (sonnet xhigh) | P1, P2, tenant isolation | lab/research/R19-*.md |
| EXP-A01 contract 0.3.3 (opus, main, no commit) | Q29 + Q31 into the contract | lab/acceptance/ |
| R17 QLever north-star fit (sonnet) | P1-P5 per layer | lab/research/R17-qlever-northstar-fit.md |
| EXP-P2X XTDB per-subject commit + feed (opus, exp/P2X-xtdb-commit-feed, slot s1) | P2, P3 | branch, receipts |
| EXP-D01a W0 world-definition spec (opus, exp/D01-world-definition) | P5, P3 deps, GS domain expectations | lab/world/W0 |
Codex plan-v2 review DONE: NOT READY, 14 findings all accepted (lab/reviews/plan-v2-review.responses.md, 675db6b). Codex round 2 DONE: 7 closed, 7 partial, 6 new, NOT READY; all accepted as Q31a-k (743cb1f). A01 compiling 0.3.3; Codex round 3 after it.
Research queue: R20 order-preserving decimal encodings (Sonnet xhigh) when a slot frees.
Next when a slot frees (PLAN 8 v2.1 order): tiny P2X/P2Q + CF01 + fault control on both sources (P2, P3); EXP-N02 A0 once N01
lands; EXP-D01 W0 kernel + O-DOMAIN; then X04/Q05 layer swaps; broad W01 and S5 last.

## Pending decisions for Sam (flagged, provisional rulings in force)
- R15 presence/deletion/cascade: Option C staged; delete = end valid time; default restrict; cascade any-parent card-one.
- Q21 AMB-09: two equal-valued assertions on one entity are one value, so a duplicated pay fact never doubles a total (SUM 10, not 20).
- Q21 AMB-17: `find` fails with ConflictingValuesError when a returned document has a conflicted attribute (a projection omitting it succeeds).
- Q21 AMB-04: a -0.0 assertion keeps bit-exact -0.0 in the journal; the numeric rule overrides C6's old byte-identity promise.
- Q24 erasure: after the erasure commit publishes, reads at every basis (even before it) show a typed ErasedValue marker, not the value.
- R18: Datomic-style `noHistory` for high-churn attributes? Default kept: history for everything (audit is a must-have).
- GS.03: a vendor's older revision arriving after a newer one is acknowledged as `superseded`, changes no current value, and is journaled.
