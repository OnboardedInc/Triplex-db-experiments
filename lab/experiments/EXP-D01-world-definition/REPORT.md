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

## W0-1.1.0 (commit 50d92ef, 2026-11-08), after V-D01 and rulings Q40, Q42b, Q42c
- 82 cases validate (`python3 -I lab/world/W0/validate.py`); no evaluator in the repo. Releases: R1 sha256:fd57551a...b031, R2
  sha256:7d2f4008...07a9, R3 sha256:de954f77...971f (diff(R2, R3) = OT). R1/R2 hashes changed because MINWAGE now reads `floorSources`
  (two-hop floor via jurisdiction).
- Ballast answer chains (3, 4 or 6 hops) size each world from P4's buckets: expected 124 / 499.5 / 1,399.5 facts per bucket, 446.8 overall
  (W0 facts about 17); a 100k sweep reads about 44.7M facts (1.6M before).
- Outbox: (id, seq) delivery key, version as content identity only, `publish` (SPEC 8.8) and `receive` (SPEC 8.9) as pure operations,
  basis-ordered publication, one atomic per-subject state, retirement and republication.
- Expected coverage: R2 changes 62.3%; lowest rule firing 7.9%; 3+ work items 1.65% (R1) / 2.52% (R2), thinner than 1.0.0 because an
  accepted E-Verify submission now yields no work item; R3 changes 4.3% of subjects (all through OT); GS.06b jurisdiction write affects
  1,953 placements for the largest jurisdiction, mean 990.
- The 37 new cases C46-C82 are not yet independently re-derived; V-D01 re-review in progress.

## W0-1.1.1 (commit ada2e90), after the re-review and Q44
- 87 cases validate; the validator's new rules (raw-token assertion, delivery id and version recomputation) caught all five planted
  defects in a scratch copy. R1 and R2 unchanged; R3 sha256:f345d9fe...312e is scoped (OT threshold 2,700 only for jur:j010, j020, ...,
  j100; the scope is inside the rule entry and in the content hash; diff(R2, R3) = OT).
- Cases changed: C54/C55 (in scope), C68 (raw `1.65e3`), C76 (real id). Added: C83 (receive 1,1,3,3,2), C84/C85 (publish and receive shape
  errors), C86 (out-of-scope placement keeps the 2,400 threshold), C87 (affected through the reverse two-hop index).
- Scoped R3 at 100k (argument values): affected 9,556 (9.56%), changed 406 (0.41%; unscoped R3 changed 4,291), not reached about 90,444,
  which a sweep may skip under SPEC 5.3's new rule.
- Author decisions for the delta check: the scope test adds S.location and L.jurisdiction to OT's reads (R3 output digest changes);
  jurisdiction ids padded to at least 3 digits; the SPEC 5.3 sweep skip rule.
