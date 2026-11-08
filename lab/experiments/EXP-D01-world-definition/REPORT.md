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

## W0-1.1.2 (exp/D01-w0-1.1.2 242bb40 from main 1ee8e67; only lab/world/W0/**; saved 2026-11-08 01:02Z)
- No meaning changed: C01-C87 and R1-R3 byte-identical to W0-1.1.1 (91 of 95 entries match; README, SPEC, schema.json, validate.py edited on
  purpose); the 100k fingerprint unchanged (all six values; R3 reaches 9,497 and changes 418; run with O-DOMAIN 5d1fd1a's generator path
  against the 1.1.2 releases, 102.1 s, since the author has no generator of its own). All 32 targeted mutants (19 from V-D01c table A, 13
  kernel-relevant from table B) killed by the new cases against frozen expected bytes (the run predates C136's array-index keys; M53-M55 are
  also killed elsewhere).
- Readings in SPEC (each citing Q53a or Q57): A01, A11, A13 in 4.4 opening; A02, A12 (plus unbounded publish/receive integers) in 2 and 4.4
  step 1; A03-A05 in 4.4 steps 3-4; A06 in 5.4; A07 in 9 item 7; A08 in 8.8-8.9; A09 in 8.8 step 2; A10 in 12.3; A14 in 8.7 and 9 item 2; A15 in
  8.9. Q48c's N1 is C118, N2 the 5.3 unscoped clause, N5 the measured R3 counts; 12.7 carries the final fingerprint; section 14 rows 50-65,
  section 15 items 24-27; README change list.
- Exact rules chosen beyond the reading text: every character outside U+0020-U+007E escaped (U+007F included), short escapes \b \t \n \f \r,
  lone surrogates escaped, `/` not escaped (json.dumps(ensure_ascii=True)); array-index-like payload keys sort by code point ("10" before "9").
- Cases C88-C136 (49; 136 in all): C88-C127 = P01-P40 (expected outputs byte-identical to V-D01c's; inputs differ only where it does not matter:
  P03 fact at tx 2, P04/P05 encoded from C01's canonical input); C128 A11 NaN (inputBase64); C129 5,000-digit basis.tx; C130 publish with a seq
  of 5,000 nines delivering 10^5000 exactly; C131 its receive counterpart; C132 2,000 nested arrays; C133-C134 A14 ordering of ids, subjects,
  payload keys, the guard's validTime, effects and projection; C135 A15 with A08; C136 A07 writer cases (DEL, short escapes, lone surrogate,
  1E3, 1.50, -0, a 30-digit integer, keys "9" and "10"). New forms: inputBase64 (C91, C92, C128), synthetic: true (C100-C102, C133-C136),
  expected-sha256.json (frozen canonical bytes for every case).
- validate.py: 136 cases OK (integers of any length, any depth, the A07 writer, both new forms, raw-text guards, recomputes expected-sha256.json);
  8/8 planted mutations caught. New lab/world/W0/SHA256SUMS over 145 files, sha256 951ee3d5...07fc5 (145/145 OK).
- Implementations: O-DOMAIN 5d1fd1a 136/136 (own run and frozen hashes); unfixed 276a280 fails C88-C90 and C129-C132 as expected;
  packages/w0 133/133 non-byte cases (no inputBase64 support, so C91, C92, C128 not run; its "has the 87 cases" test fails; unknown whether it
  compares frozen bytes). Evidence in /Users/sam/Claude/Projects/triplex-db-2/W0-1.1.2/.
