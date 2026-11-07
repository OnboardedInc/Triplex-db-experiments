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
| exp/O02-oracle-conformance (03519ae) | V-O02 FIX-FIRST (answers correct; F1 test fix; 11 wrong answers on 0.3.3 rules) | EXP-O03 on same branch; then re-verify (resume V-O02 verifier) -> ACCEPT -> merge, pin |
| exp/002-qlever-baseline | MERGED 85aba57 (G0/G1/G2 PASS, G4 FAIL as expected) | QLever dev resident recreated from main config (holder EXP-000) |
| exp/F02-wire-exactness | MERGED 7247c82 (lab only; partly falsified) | fixes in EXP-F02b |
| exp/X02-xtql-parity (bf1ad4d) | PROGRESSED: G0/G1 PASS, G2 SQL 142/142, XTQL diagnostic 142/142, XTQL candidate timeouts under load | V-X02, then promote; EXP-C8 builds on it |
| exp/001-xtdb-baseline (049639d) | PASS all; task-languages.mjs cherry-picked to main | done |
| G01 golden vectors (main) | 49 vectors; AMB-01..17 ruled (RULINGS Q21) | compile Q21 into contract 0.3.2 with Codex v2 findings |
| contract 0.3.3 (main 89376e1) | Q29-Q32 compiled; 142 obligations, 50 thresholds; W0 pin null until V-D01 | Codex round 3 |

## Running agents (10 of 10, plus Codex shell b0losx599)
| Agent | Priority | Output |
| --- | --- | --- |
| EXP-N01 north-star benchmark driver (opus, exp/N01-northstar-bench) | P1-P5 measurement (NS gate) | lab/bench/, receipts |
| EXP-W01 20 golden scenarios (opus, exp/W01-golden-scenarios) | all five under real load (GS gate) | lab/scenarios/ |
| V-O03 re-verification of O-REPLAY 0.3.1 at 8cc2c26 (opus, V-O02 verifier, verify/O02) | correctness floor | ACCEPT -> merge oracle, pin hashes in contract 0.3.6 |
| EXP-E01 claim evaluator (opus, exp/E01-claim-evaluator) | floor for every claim | lab/bin/claim.mjs |
| EXP-F02b QLever falsifier + G1 qlever rerun (opus, exp/F02b-wire-exactness-fixes 08368fa) | numeric rule floor | XTDB proven; G1 xtdb rerun owed in a quiet window |
| EXP-X05 XTDB read-only follower (opus, exp/X05-xtdb-read-follower; waits for pool) | P1 | harness follower support, receipts |
| EXP-P2Q QLever log of record + broker (opus, exp/P2Q-qlever-log-broker) | P2, P3 | packages/qlever/src/broker |
| EXP-C8 reads never write (opus, exp/C8-read-only-frontier) | P1, C8 floor | both lanes |
| EXP-P2X XTDB per-subject commit + feed (opus, exp/P2X-xtdb-commit-feed, slot s1) | P2, P3 | branch, receipts |
| V-D01 re-review of W0-1.1.0 at 50d92ef (opus, verify/D01) | P5, P3 deps, GS domain expectations | ACCEPT -> merge W0, pin, then two independent implementers (TS kernel, O-DOMAIN) |
Codex plan-v2 review DONE: NOT READY, 14 findings all accepted (lab/reviews/plan-v2-review.responses.md, 675db6b). Codex round 2 DONE: 7 closed, 7 partial, 6 new, NOT READY; all accepted as Q31a-k (743cb1f). Contract 0.3.3 committed 89376e1 (142 obligations). Codex round 3 DONE: 11 closed, 2 partial, 5 new, NOT READY; accepted as Q34a-e (9a4fbb4). Contract 0.3.4 committed 60e4c57 (147 obligations, byte-identical regeneration). Codex round 4 DONE: NOT READY; accepted as Q38a-f (baeb9fd). Contract 0.3.5 committed 15a07b6 (149 obligations; 124 fail closed on null oracle pins; Q40 recorded-not-compiled; Q41 in RULINGS-PENDING.md). Codex round 5 DONE: 6 closed, 2 partial, 3 new; Q42a-c pending (59047ac). Contract 0.3.6 compiles Q40-Q42 once W0-1.1.0 lands; then Codex round 6. NEXT FREE SLOTS, in order: (1) V-X02 (verify exp/X02-xtql-parity bf1ad4d; XTQL candidate rerun on an exclusive slot); (2) EXP-Q07 QLever version side-by-side (R21 E1) when an exclusive QLever slot frees; (3) XTDB 2.2.1 re-qualification when tagged.
Next when a slot frees (PLAN 8 v2.1 order): tiny P2X/P2Q + CF01 + fault control on both sources (P2, P3); EXP-N02 A0 once N01
lands; EXP-D01 W0 kernel + O-DOMAIN; then X04/Q05 layer swaps; broad W01 and S5 last.

## Infrastructure policy (2026-11-08 22:10Z)
Host saturated (36 GiB, about 14 GiB compressed, load 12-13 on 12 cores; Sam's default colima VM shares it), so the triplex2 VM cannot
grow. QLever dev resident raised to 3.5 GiB and recreated fresh after three OOM kills (pool now 10.0 of 11 GiB). Until pressure drops: no new
engine-heavy dispatches; heavy commands via lab/bin/heavy.mjs; gate reruns one at a time; latency judged only relatively. Check both dev
residents at every check-in; recreate qlever-dev fresh when its delta grows.

## Pending decisions for Sam (flagged, provisional rulings in force)
- R15 presence/deletion/cascade: Option C staged; delete = end valid time; default restrict; cascade any-parent card-one.
- Q21 AMB-09: two equal-valued assertions on one entity are one value, so a duplicated pay fact never doubles a total (SUM 10, not 20).
- Q21 AMB-17: `find` fails with ConflictingValuesError when a returned document has a conflicted attribute (a projection omitting it succeeds).
- Q21 AMB-04: a -0.0 assertion keeps bit-exact -0.0 in the journal; the numeric rule overrides C6's old byte-identity promise.
- Q24 erasure: after the erasure commit publishes, reads at every basis (even before it) show a typed ErasedValue marker, not the value.
- R19 tenancy: do pooled cell databases with per-tenant envelope encryption count as storage-layer isolation for the 1,000 small tenants
  (provisional yes; large tenants siloed)? And how many small tenants are active in 15 minutes (provisional 10%)?
- R21: file the XTDB DECIMAL-to-BIGINT-through-double and `= ANY` precedence findings upstream? (publishes lab findings; not done)
- R18: Datomic-style `noHistory` for high-churn attributes? Default kept: history for everything (audit is a must-have).
- GS.03: a vendor's older revision arriving after a newer one is acknowledged as `superseded`, changes no current value, and is journaled.
