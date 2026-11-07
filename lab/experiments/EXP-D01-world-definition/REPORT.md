# EXP-D01a W0 world definition: report (saved by the orchestrator from the agent's hand-back, 2026-11-07)

- Committed 5a12dad on `exp/D01-world-definition` (lab/world/W0/** only); not merged until V-D01 accepts. `python3 -I lab/world/W0/validate.py`
  reports OK. The author read no packages/, lab/oracles/, lab/bench/ or lab/scenarios/ and ran no engines.
- Files: SPEC.md (normative, 15 sections incl. workload coverage and self-review), schema.json, releases/R1.json, R2.json, index.json,
  cases/C01-C45, validate.py (shape only), README.md. Release hashes: R1 sha256:fc4b2c1b...cc0a2b; R2 sha256:4fe8c3fa...847f98;
  diff(R1, R2) = I9S2, DOCEXP, MINWAGE.

| Rule | Decides | Read set |
| --- | --- | --- |
| LIFE | start unknown / pre-start flag, start obligation | S.startDate |
| I9S1 | Section 1 task, due end of start day | S.startDate, S.section1AttestedAt, S.ssn |
| I9S2 | Section 2 task, due 3 business days (R2: 2); later commit wins; waive flag | S.startDate, S.decisions, D.target/verdict/author |
| EVSUB | E-Verify submission (collect SSN, SSN erased, fix SSN, submit work item) | S.startDate, S.ssn, S.everifyStatus |
| EVSTAT | per-status outcomes: tnc due after 8 business days; authorized; fnc | S.everifyStatus, S.everifyStatusAt |
| BGC | order, adjudicate, adverse action | S.bgcStatus, S.decisions, D.* |
| DOCEXP | expiry obligation or task per document (R2: ead opens 90 days early) | S.documents, d.docType/expiresOn/reverified |
| MINWAGE | pay at or above the location floor (R2 adds the local floor) | S.startDate, S.payRateCents, S.location, L.stateMinWageCents (R2 also L.localMinWageCents) |
| OT | overtime flag above 2,400 minutes | S.weeklyMinutes |
| PAYCHG | change over 500 cents needs a fresh approval | S.payRateCents, S.baselinePayRateCents, S.decisions, D.* |
| PROP | agent proposals wait for a human decision | S.decisions, D.* |

- Types under Sam's numeric rule: cents 0..2^53-1, minutes 0..10,080, ISO dates, 27-character UTC instants (microseconds) compared as
  strings; no floats. Outputs: tasks, obligations, work items, flags, trace, dependencies; work item ids are SHA-256 over canonical JSON
  (section 9).
- 45 cases (31 evaluate, 3 reconcile, 3 affected, 9 error); every rule has a positive and a negative case (validator-enforced). Preview
  versus activation at one basis: C20 equals C31 byte for byte.
- Coverage at 100k (expected values; section 12.6 requires measuring them on the generated population, failing closed): R2 changes
  61.7% of subjects' outputs (floor 20%); lowest rule firing 7.9% (MINWAGE under R1; floor 5%); evaluations with 3+ work items 2.0% / 3.0%
  (floor 1%); GS.06b affected placements about 12,105 / r for the location at rank r under s = 1.0.
- Self-review: 36 resolved implementer-divergence items (section 14), including token-level integer checks (`1650.0` is an error),
  string comparison of instants, UTC business days, decision position = greatest tx of its facts, proposals never decisions, and both
  implementations using the oracle's dense ordinal for positions (Q31c).
- A cold-read Opus review re-derived 15 cases (13 exact; C34 and C36 exposed the undefined `affected` output, now fixed) and found 9
  ambiguities, all fixed.
- Open questions: ruled as Q36.
