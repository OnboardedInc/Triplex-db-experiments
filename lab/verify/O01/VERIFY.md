# V-O01: independent verification of O-REPLAY (EXP-O01) against the G01 golden vectors

Verdict: **FIX-FIRST** (2026-11-07). Reviewed oracle commit 03d86f3 (built against contract 0.1.0-draft, base 0a6b5e1). Full
evidence on branch `verify/O01` commit 745547d (`lab/verify/O01/`: convert_and_run.py, results.json, negative_control.*,
probe_section4.*, proposed_rulings.json, cases/, runs/). This file, results.json and proposed_rulings.json are copied to main.

## What passed
1. **Independence.** Stdlib-only Python; imports no `packages/` code. Only authorized reads of implementation code: compiler.ts:1397
   and the Constraint.ts docstring. Its self-check runs O-EVT (another oracle), not product code.
2. **Exactness.** binary64 by bits, ordering by Fractions, strings by codepoint, exact sums rounded once.
3. **Tests.** 91/91 unit tests and `--self-check` pass (two review fixtures listed as missing).
4. **Comparator.** 8 planted wrong expectations in a copy of the vectors all came back DISAGREE.

## Golden vectors against the oracle
| Level | AGREE | AGREE + AMBIGUOUS | AMBIGUOUS | DISAGREE | Other |
|---|---|---|---|---|---|
| Vectors (49) | 30 | 12 | 3 | 4 | none |
| Items (341) | 301 | none | 19 | 13 | 3 AGREE-DERIVED, 5 NOT-MODELED |

In all 13 disagreements the golden vector is right and the oracle is wrong:
1. Journal assert changes (9 items: C5-08 Q4; C6-01 Q1-4, Q6-9): the oracle omits `assertionTxId`.
2. Reserved namespaces (3 items: C6-05 C4, Q2/Q3 knock-on): the oracle commits entity id `_triplex/...`; the testkit also reserves
   `:triplex/` attributes and `triplex.` entity types.
3. entityPage limit (1 item: G10-CUR-01 E3): the oracle accepts `limit: 201`; the contract allows 1..200.

Not modeled: journal facts (`:_tx/change`, `:_tx/changed-entity`), cursor errors, the raw convenience projection.

## Breaks against contract section 4 (probes)
1. Family order differs from Q14a.
2. -0.0 and +0.0 treated as two values (Q14b says one), so card-one {-0, +0} wrongly raises ConflictingValuesError and groups split.
3. `int64 < number` returns false instead of the mixed-family preflight error (Q14d).
4. Text-to-integer cast accepts '+1', '01' and '-0'.
5. `rem`, `toNumber` and `toInt64` missing.
6. Error tags and reasons do not follow section 4.7 (`type-mismatch` for `mixed-family`, `invalid-cast` for `invalid-conversion`,
   null where InvalidTripleError and WriteError are pinned).

## Fix list (dispatched as EXP-O02)
1. Conform to section 4 and Q14a-d with one unit test per table row; add Q18 decimal rules.
2. `assertionTxId` on assert changes.
3. The testkit's reserved namespaces.
4. entityPage limit 1..200, default 50, plus a cursor-error model.
5. Corrected numeric rule: a per-lane accepted integer range, with a typed rejection as the expected answer where a lane cannot hold a
   value (QLever beyond its exact range); a JSON number that is not exact binary64 is an input error, never rounded.
6. Queryable journal facts.
7. Rerun the converter, then pin hashes.

## Rulings
All 17 AMB proposals accepted as Q21 in `lab/acceptance/RULINGS.md`; AMB-04, AMB-09 and AMB-17 are provisional and flagged for Sam.
