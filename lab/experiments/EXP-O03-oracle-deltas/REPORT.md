# EXP-O03: O-REPLAY 0.3.0 against contract 0.3.3 (saved by the orchestrator, 2026-11-08)

- Branch `exp/O02-oracle-conformance` (main merged at 3aa2f83). F1 commit c8817badc6cc217bd9a4e9249e4ec6ed368b3971 (six 4.7 rows plus the
  AG-SUM-ONE-ENTITY and AG-INT-RESULT tests only); final commit 99d85bec2f90cacf59d8aacc93a75c2aed63418c.
- Results: unit tests 224/224 at F1, 268/268 final; --self-check PASS 61/61; V-O02's probe_delta_033.py 11 WRONG-ANSWER / 5 REFUSES / 4
  MATCH at F1, 0 / 1 / 19 final (the one refusal is erasure, allowed); patched converter core and qlever identical to EXP-O02 item by item
  (qlever's 19 DISAGREE are the Q33i lane-claim vectors; its one CONVERTER-ERROR is the converter's KeyError('MAX') on a rejected
  G1-I64-01, pre-existing); negative control 8/8.
- Implemented: Q30a/Q33a/Q34c user-JSON guard (E-INEXACT-JSON-NUMBER, detail inexact-json-number, any depth, before duplicate keys
  collapse; journal JSON exempt; number -0 journals bit-exact, paired test); Q30b (E-NEGATIVE-ZERO-INSTANT); Q22 decimal add/sub/mul/SUM
  with scale and precision tracking and the 38-digit cap (E-DECIMAL-OVERFLOW), divide and round with half-even/half-up/down, bare `/` as
  E-DECIMAL-BARE-DIVIDE, toInteger(1.50) as E-DECIMAL-FRACTION, number to decimal from the exact binary value; Q33b R-DEC-7; Q33d
  cross-family ordered comparison as E-MIXED-FAMILY (including find preflight); Q33e; Q33g/h; Q31c coordinates (lexicographic, sparse,
  `abortedPositions`, one offset with consecutive ordinals per engine transaction, coordinate cuts, a cut inside an abort gap equals the cut
  before it).
- Refused with X-NOT-MODELED: erasure ops; decimal scale changes (so E-DECIMAL-NARROWING is never produced); TDK1 key queries; round to a
  larger scale (overridden by Q43f); a -0 read cut (ruled by Q43h).
- Output changes: decimal outputs drop `storage`; new `detail` on the two wire errors; `receiptConsistency.positions` when coordinates,
  gaps or aborted positions appear; `cutCatalog.coordinate`; oracle version 0.3.0.
- Coverage tests now fail on any new row in decimalOps, decimalConversions, decimalScaleEvolution, wireRules, temporalRules,
  readShapeRules, journalRules, positionDenseCases and decimalRules without a named test.
- Decisions: ruled as Q43 (RULINGS-PENDING.md); an alignment pass to contract 0.3.5 is in progress before the independent re-check.
- Evidence: /Users/sam/Claude/Projects/triplex-db-2/EXP-O03-oracle-033-deltas/ (probe before/after, converter results, negative control,
  self-check output, hashes.99d85be.txt).

## Alignment to contract 0.3.5 (Q43), final commit 8cc2c26f6f17ed627a3ed608f1252fe0e240bb5b (O-REPLAY 0.3.1)
- E-DECIMAL-UNREPRESENTABLE removed (E-DECIMAL-FRACTION and E-DECIMAL-OVERFLOW per Q43a, with preflight on writes and execution on query
  results); AVG over decimals is E-DECIMAL-AVG; round to a larger scale is exact (precision p + (s - s_x), capped at 38); a -0 read basis is
  E-NEGATIVE-ZERO-INSTANT. New coverage tests: q33Rules (21), the position falsifier cases, CMP-CROSS-FAMILY-ORDERED, four new decimalRules
  keys, and a reverse check that fails if the oracle keeps an error id the contract dropped.
- Results: 300/300 unit tests; --self-check 61/61; probe 19 MATCH, 1 REFUSES (erasure), 0 WRONG-ANSWER; converter core and qlever identical
  item by item to EXP-O02 (qlever's 19 DISAGREE = the 10 Q33i vectors recorded as rejected on QLever); negative control 8/8.
- Evidence: hashes.8cc2c26.txt and the q43 result files in /Users/sam/Claude/Projects/triplex-db-2/EXP-O03-oracle-033-deltas/.
