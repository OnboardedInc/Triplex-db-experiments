# EXP-O02 report: O-REPLAY 0.2.0 conforms to contract 0.3.1 section 4 and rulings Q1 to Q21 (saved by the orchestrator, 2026-11-07)

- Commit 03519ae5208790f669b5011b22af8a5658dab83c on `exp/O02-oracle-conformance` (fed1c15 plus a merge of `exp/O01-replay-oracle`); only
  `lab/oracles/replay/**` changed (20 files). Not merged: awaiting independent verification (V-O02).
- Gates: 216/216 unit tests (`python3 -I lab/oracles/replay/cli.py --test`; one named test per section 4 row, coverage tests read
  obligations.json; one test per Q21 ruling); `--self-check` passes (O-HAM 18/18, O-CFG8 20/20, O-EVT 23/23); converter rerun with a
  patched copy: DISAGREE 0 on all 49 vectors, all 19 AMBIGUOUS items match their Q21 reading; negative control 8/8 caught with both the
  original and patched converter; all 23 V-O01 section 4 probes return the contract's answer.

| Run | Vectors (49) | Items (341) |
| --- | --- | --- |
| Before: oracle 0.1, original converter | 30 AGREE, 12 AGREE+AMB, 3 AMB, 4 DISAGREE | 301 AGREE, 19 AMB, 13 DISAGREE, 3 AGREE-DERIVED, 5 NOT-MODELED |
| After: oracle 0.2.0, original converter | 24 AGREE, 7 AGREE+AMB, 3 AMB, 13 DISAGREE, 2 AGREE+NOT-MODELED | 292 AGREE, 19 AMB, 17 DISAGREE, 5 CONVERTER-ERROR, 3 AGREE-DERIVED, 5 NOT-MODELED |
| After: oracle 0.2.0, patched converter (core lane) | 46 AGREE, 2 AGREE+NOT-MODELED, 1 AGREE+VECTOR-BUG | 317 AGREE, 19 AGREE-RULED, 0 DISAGREE, 2 VECTOR-BUG, 3 NOT-MODELED |

- The original converter's 17 DISAGREE and 5 CONVERTER-ERROR items all trace to oracle output changes that section 4.7 or a Q21 ruling
  required (4.7 ids with `_tag` and `reason`; AMB-02 field names; AMB-17 makes `find` return documents, so `count` needs its own query
  kind). The patch (`patch_converter.py`, patches P1 to P9) adapts those points only; it also reads journal facts through `match`, drives
  the G10 cursor errors through the new cursor model and checks AMBIGUOUS items against their rulings.
- Still NOT-MODELED: C5-03 Q10 (raw convenience projection), C6-05 cmd:C2 (retracting `:_tx/instant`), C6-05 Q1 (count of every journal
  fact of one transaction).
- Vector bugs (contract wins): G10-CUR-01 E1/E2 reasons `basis_mismatch` and `query_mismatch` are not 4.7 E-CURSOR reasons (oracle:
  `other-query`); G1-I64-01 and Q8F-02 list qlever-sparql but write integers beyond ±2^59 and expect a commit; G1-I64-02 `min-exact`
  (-2^63) expects a commit on every lane; G5-SUM-01, 02, 04, 05, 06, 08 and 11 (case 2) name no lane and their fixtures write beyond
  ±2^59 (found by an `O02_LANE=qlever` run).
- New RULING-NEEDED items: see RULINGS Q33.
- Independence: stdlib-only, no packages/ code read or imported. Evidence outside the repo:
  `/Users/sam/Claude/Projects/triplex-db-2/EXP-O02-oracle-conformance/converter-rerun/` (patch_converter.py, the patched converter,
  results.before/after-unpatched/patched.core/patched.qlever.json, negative_control.json).
- File hashes at 03519ae: in the agent's hand-back (pinned by the contract only after V-O02 accepts).
