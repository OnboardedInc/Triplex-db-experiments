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
| exp/001-xtdb-baseline (049639d) | PASS all; task-languages.mjs cherry-picked to main | done |
| G01 golden vectors (main) | 49 vectors; AMB-01..17 ruled (RULINGS Q21) | compile Q21 into contract 0.3.2 with Codex v2 findings |
| contract 0.3.1 (main 9c01194) | Q16-Q20 compiled, validates (hash 80e60385...) | 0.3.2: Q21 + Codex plan-v2 findings |

## Running agents (10 of 10, plus Codex shell b0losx599)
| Agent | Priority | Output |
| --- | --- | --- |
| EXP-N01 north-star benchmark driver (opus, exp/N01-northstar-bench) | P1-P5 measurement (NS gate) | lab/bench/, receipts |
| EXP-W01 20 golden scenarios (opus, exp/W01-golden-scenarios) | all five under real load (GS gate) | lab/scenarios/ |
| EXP-O02 oracle conformance (opus, exp/O02-oracle-conformance) | correctness floor for GS and P2 | lab/oracles/replay |
| EXP-X02 XTQL parity (opus, exp/X02-xtql-parity) | read priorities on XTDB, floor | branch; waiting on own live-check rerun |
| EXP-002 QLever baseline (opus, exp/002-qlever-baseline) | A0 control | receipts |
| EXP-F02 wire exactness (opus) | numeric rule floor | branch |
| EXP-A01 contract 0.3.2 (opus, main, no commit) | Q21-Q28 + TARGETS v2 into the contract | lab/acceptance/ |
| R16 XTDB north-star fit (sonnet) | P1-P5 per layer | lab/research/R16-xtdb-northstar-fit.md |
| R17 QLever north-star fit (sonnet) | P1-P5 per layer | lab/research/R17-qlever-northstar-fit.md |
| R18 read-path, feed, sweep prior art (sonnet) | P1, P3, P4, P5 | lab/research/R18-*.md |
Codex plan-v2 review DONE: NOT READY, 14 findings all accepted (lab/reviews/plan-v2-review.responses.md, 675db6b). Codex round 2 on contract 0.3.2 when A01 lands it.
Next when a slot frees (PLAN 8 v2.1 order): tiny P2X/P2Q + CF01 + fault control on both sources (P2, P3); EXP-N02 A0 once N01
lands; EXP-D01 W0 kernel + O-DOMAIN; then X04/Q05 layer swaps; broad W01 and S5 last.

## Pending decisions for Sam (flagged, provisional rulings in force)
- R15 presence/deletion/cascade: Option C staged; delete = end valid time; default restrict; cascade any-parent card-one.
- Q21 AMB-09: two equal-valued assertions on one entity are one value, so a duplicated pay fact never doubles a total (SUM 10, not 20).
- Q21 AMB-17: `find` fails with ConflictingValuesError when a returned document has a conflicted attribute (a projection omitting it succeeds).
- Q21 AMB-04: a -0.0 assertion keeps bit-exact -0.0 in the journal; the numeric rule overrides C6's old byte-identity promise.
- Q24 erasure: after the erasure commit publishes, reads at every basis (even before it) show a typed ErasedValue marker, not the value.
- GS.03: a vendor's older revision arriving after a newer one is acknowledged as `superseded`, changes no current value, and is journaled.
