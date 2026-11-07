# EXP-F03 falsifier: the five historical retirement-metadata failures, reproduced on our engines

**North star:** correctness floor for P1 (exact past-basis reads, explain and audit) and goal 9.
**Scope:** goals and targets come only from lab/SCOPE.md, lab/NORTH-STAR.md and lab/TARGETS.md; inherited homebase files are for code facts only.

## Commander's intent
Turn the inherited "47/52 pass, five NEW historical retirement-metadata checks fail" (configured-entity tiny-v4
fixture, see lab/research/R6-xtdb-gap-analysis.md section 3) into fresh, reproducible counterexamples on our own
XTDB and QLever through public APIs, with a root cause. Goal 9 (bitemporal history, presence, corrections, deletion)
cannot close while these exist, and the projection and repository must not inherit the same leak.

## Point of view
- The ordinary raw assertion-lifetime contract and the newer as-of snapshot-assertion target are distinct contracts
  (handoff README). Do not "fix" one by redefining the other. Identify which contract each failing check asserts.
- Expected answers come from an independent derivation of the fixture's event stream (write a tiny independent
  checker in Python or plain JS that imports no Triplex code), not from KV output.

## Deliverables
Reproduction scripts and receipts for each of the five checks on both engines (and on KV for comparison), a root
cause per check with file:line, and two or three fix hypotheses ranked by cost. Branch `exp/F03-retirement-metadata`;
shared `dev` slots with unique scopes. No adapter behavior change in this experiment.
