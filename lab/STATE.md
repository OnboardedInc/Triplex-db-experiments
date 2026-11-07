# Orchestrator state (read this first after any context compaction)

Updated: 2026-11-07, generation 2 starting (scope v2).

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
| exp/R01-entity-core | verifier FIX-FIRST (F1-F8, lab/experiments/EXP-R01-entity-core/VERIFY.md) | author fixes F1-F8 (F1/F2 under the corrected numeric rule), re-verify, merge |
| exp/O01-replay-oracle (03d86f3) | built, self-checks pass | independent review + cross-check vs G01 golden vectors -> ACCEPTED |
| exp/001-xtdb-baseline (049639d) | PASS all; task-languages.mjs | cherry-pick task-languages.mjs to main |
| G01 golden vectors (main, committed draft) | 49 vectors, 17 AMB | rule on AMB-01..17 during oracle cross-check |

## Running agents (9 of 10)
| Agent | Priority | Output |
| --- | --- | --- |
| EXP-N01 north-star benchmark driver (opus, exp/N01-northstar-bench) | P1-P5 measurement (NS gate) | lab/bench/, receipts |
| EXP-W01 20 golden scenarios (opus, exp/W01-golden-scenarios) | all five under real load (GS gate) | lab/scenarios/ |
| EXP-A01 contract 0.3.0 retarget (opus, main, no commit) | contract for P1-P5, GS, numeric rule | lab/acceptance/ |
| EXP-R01 fixes F1-F8 (opus, exp/R01-entity-core) | correctness floor, ORM | branch |
| V-O01 oracle acceptance + G01 cross-check (opus, verify/O01) | correctness floor | final message |
| EXP-X02 XTQL parity (opus, exp/X02-xtql-parity) | read priorities on XTDB, floor | branch |
| EXP-002 QLever baseline (opus, exp/002-qlever-baseline) | A0 control | receipts |
| R16 XTDB north-star fit (sonnet) | P1-P5 per layer | lab/research/R16-xtdb-northstar-fit.md |
| R17 QLever north-star fit (sonnet) | P1-P5 per layer | lab/research/R17-qlever-northstar-fit.md |
Next when a slot frees: Codex review of PLAN v2 + TARGETS + contract 0.3.0.

## Pending decisions for Sam (flagged, provisional rulings in force)
- R15 presence/deletion/cascade: Option C staged; delete = end valid time; default restrict; cascade any-parent card-one.
