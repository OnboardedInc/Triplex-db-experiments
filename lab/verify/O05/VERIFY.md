# V-O05: O-OBS (lab/acceptance/oracle/observe.py) review

## CX-VO05 (Codex reviewer at high) on exp/O05-observation-oracle 6852fc1: FIX-FIRST (saved by the orchestrator, 2026-11-08 21:40Z)
Evidence: verify/O05 74d1152 (lab/verify/O05/VERIFY.md and evidence/final/summary.json there). 177 independent cases exposed 23 acceptance
discrepancies; 19/19 additional mutants detected. Do not pin this revision.
- F1 (blocking): an invented log that carries its own hashes earns PASS on every protocol; the oracle has no evaluator-owned case or
  run context and no independently retained collector objects to check against.
- F2: the evidence selects which named threshold applies, or whether a cap applies; thresholds must be bound by obligation, case and
  witness kind from trusted acceptance context.
- F3: a fault witness can consist only of the transition label it is meant to prove; transition-specific witness schemas with readback
  validation are needed.
- F4: work ratios are binary64, so an above-threshold measurement can round down to the boundary; compare integer ratios exactly.
- F5: the wait bound is checked against an unverified duration label instead of source-bound start and end events.
Ruled Q80; F1-F3 and F5 depend on the trusted collector and case-binding format R27 is designing, so round 2 starts after R27.
