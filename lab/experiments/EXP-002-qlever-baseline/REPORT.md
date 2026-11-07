# EXP-002 QLever fresh baseline: report (saved by the orchestrator from the agent's hand-back, 2026-11-07)

**Verdict: PROGRESSED.** Merged to main as 85aba57 (branch `exp/002-qlever-baseline`).

## Gates
| Gate | Result | Receipt |
| --- | --- | --- |
| G0 | PASS 916 | G0-qlever-20261107T190644Z-50f7a4 |
| G1 | PASS 88/88 (profile f1, planner budget 1); peak 347 MiB, 255 s | G1-qlever-20261107T191405Z-e08600 |
| G2 | PASS 142/142 at planner 100 and at planner 1 (all 142 are sparql-1.1) | G2-qlever-20261107T200815Z-fdd70e, G2-qlever-20261107T200954Z-594199 |
| G4 | FAIL as expected for the baseline: 16 counterexample executions fail, 2 controls pass; main config gives identical answers | G4-qlever-20261107T201137Z-d6a89e (also 191231Z-8e250f; 191201Z-ad15e2 had a harness defect, fixed) |

## Planner comparison (G1)
| Profile / planner | Result | Class |
| --- | --- | --- |
| default / 1500 (191837Z-d56980) | OOM-killed at 2.5 GiB during planning, 0/88 | engine limit |
| default / 1 (192004Z-32a4ff) | 84/88; 2 aggregate cases get a typed "exact SUM ordering needs server key" refusal | adapter limit, not a wrong answer |
| bounded / 100 (192905Z-c17b3f) | 85/88, 3 reopen timeouts; ran on a 1.2M-triple delta with no rebuild, planning reached 54.8 s | confounded; needs a fresh rerun |

## Engine settings now on main (`qlever-start.sh`)
`-j 4 -c 512M -e 128M -s 10s`, planner budget 1, no unbounded metrics or resource logs (R8). Planner 1 is the only setting where every
profile stayed under 0.6 GiB; it makes native queries about 23% slower than budget 100. The 2.5 GiB dev cap is unchanged: real peaks
were at most 1.64 GiB.

## Counterexamples (identical in current and reopen)
1. String order: ICU order wherever the oracle expects codepoint order (`ORDER BY STR`, `>E`, `<c`, IRI order).
2. Correlated NOT EXISTS: the flat, nested and OPTIONAL+!BOUND forms return `one,two`; positive EXISTS returns empty.
3. Two R5 errors: its expected IRI order is wrong, and its N6 MINUS case is spec-correct, so it was excluded.

## Writes during reads and update latency
- 14 of 71 tasks (28 executions) write scratch graphs through `BasisRelations`, about 62 updates per G2 run; `recursion.ts` on the
  Datalog path also writes (not counted). Contract C8 ("reads never mutate") is not yet met on QLever.
- Median update latency was 7 ms on a fresh engine and grew with the delta to 494 ms, then 1.3 s, max 59 s (no concurrency measured).
