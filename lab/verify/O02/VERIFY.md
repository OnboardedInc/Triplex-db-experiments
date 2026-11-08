# V-O02: independent verification of O-REPLAY 0.2.0 (EXP-O02 at 03519ae) against contract 0.3.3 (saved by the orchestrator, 2026-11-08)

**Verdict: FIX-FIRST, one blocking item (F1).** The oracle's answers on all 49 golden vectors are correct and the converter patch hides
no disagreement; the blocker is that, merged with main, the oracle's own tests read obligations.json 0.3.3 and fail 8 of 222.
Branch `verify/O02` commit e468fe9 (merge of exp/O02 into main b006b81); evidence in that branch's `lab/verify/O02/` (tools/, results/).

## Evidence
| Check | Verifier | Author | Same |
| --- | --- | --- | --- |
| Patched converter = patch_converter.py applied to V-O01's original | byte-identical (sha 4aca5183...) | same | yes |
| Unit tests at 03519ae (contract 0.3.1) | 216/216 | 216/216 | yes |
| Unit tests on verify/O02 (contract 0.3.3) | 222 run: 2 failures, 6 errors | not run | no (F1) |
| --self-check | O-HAM 18/18, O-CFG8 20/20, O-EVT 23/23 | same | yes |
| Converter reruns (unpatched, patched core, patched qlever) | identical item by item | same files | yes |
| 47 items whose verdict the patch changed, re-judged without the converter | 47/47 | none | yes |
| 22 new planted errors in the patched areas | 22/22 DISAGREE (original converter: 9/22) | none | yes |
| V-O01's 8 mutants; 23 section 4 probes | 8/8; 23/23 | same | yes |
| Independence | stdlib only; reads only the case file, its own sources (to hash them) and qualification fixtures; no packages/; no subprocess | same | yes |
| Golden files vs goldenFilesPinned | 9/9 | none | yes |
| 0.3.3 rules probed (20 probes) | 11 wrong answers, 5 refusals, 4 match; no golden vector uses any of them | none | none |

## Patch review
P1 (error tags), P3 (count kind), P4 (timeline kind, AMB-02 names) and P9 (lane plumbing) are pure maps. P5 and P7 are stricter. P2 (any of
id/_tag/reason), P6 (cursor reasons, VECTOR-BUG verdict) and P8 (raw contract only, per AMB-01 A) change judgment without hiding any
disagreement; their residual gaps (reason and phase not compared in P1/P2; oracle reason unchecked under VECTOR-BUG; P7 hard-codes ruled
answers) are closed for every current item by `judge_changed.py`.

## Fix list
- **F1 (blocking, oracle, two files):** add six section 4.7 rows to `errors.ERROR_TABLE` (E-INEXACT-JSON-NUMBER, E-NEGATIVE-ZERO-INSTANT,
  E-DECIMAL-OVERFLOW, E-DECIMAL-BARE-DIVIDE, E-DECIMAL-FRACTION, E-DECIMAL-NARROWING) without adding them to PRODUCED; add named tests
  AG-SUM-ONE-ENTITY (its 3 contract examples) and AG-INT-RESULT. Proven on a scratch copy: 224/224, 0 converter verdict changes; only
  errors.py and tests/test_contract_section4.py hashes change.
- **C1 (contract):** obligations.json lists O-REPLAY as TO-BUILD at lab/acceptance/oracle/replay.py with `oracleFilesPinned.O-REPLAY = []`;
  point it at lab/oracles/replay/** and pin the post-fix hashes.
- **C2 (contract):** LEGACY_LANE_OUTCOMES and legacyScan miss G1-I64-02 `min-exact` (the scan does not read commandTemplate/contrastCase).
- **C3 (contract):** Q33 not compiled (in progress as 0.3.4).
- **EXP-O03 (not blocking; no golden vector depends on them):** 11 confident wrong answers on 0.3.3 rules: Q30a -0 in JSON (x2), Q30b
  instant -0, Q22 add/mul/sum beyond 38 digits (x3), DC-D2I error name, Q33d cross-family ordered comparison (x2), Q31c non-dense receipt
  positions, Q24/Q31f erasure command; plus 5 refusals (inexact JSON number, decimal `/` `divide` `round`, rem over binary64, transactions
  limit 0, negative basis). Until fixed, the pin's scope is golden vectors plus section 4 through 0.3.1 and Q21; each unfixed rule should
  refuse with X-NOT-MODELED so G1.wire.write-guards, G1.types.decimal, G2.expr.cross-family-comparison, G7.position.coordinates
  (non-dense) and G9.erasure.* fail closed. Minor: R-VAL-7 should use Q33a's shortest-rendering test; coverage tests should watch
  decimalOps, decimalConversions, wireRules and the temporal, readShape and journal tables.

## Vector bugs
All four confirmed: G10-CUR-01 E1/E2 (`other-query`); G1-I64-01 and Q8F-02 on QLever (in 0.3.3 legacy outcomes); G1-I64-02 `min-exact` on
QLever only (new: missing from legacy outcomes, C2); G5-SUM-01, 02, 04, 05, 06, 08, 11 case 2 (in legacy outcomes).

## Side flag
EXP-W01's golden scenarios were generated with O-REPLAY 0.1 (`lab/scenarios/lib/oracle.mjs` runs the oracle from exp/O01); regenerate after
the oracle is pinned.

The verified 29-file hash table at 03519ae is in the verifier's hand-back and on branch verify/O02 (`tools/hash_table.py`).

# V-O03: re-check of O-REPLAY 0.3.1 (8cc2c26) against contract 0.3.5 + Q43 (2026-11-08): ACCEPT with a scoped pin
Branch verify/O02 commit 8f631ab; evidence in that branch's lab/verify/O02/v-o03/results/ (pin_scope.json and hashes.8cc2c26.json copied
here). Merged to main as 4591715.

| Check | Verifier | Author | Same |
| --- | --- | --- | --- |
| Unit tests | 300/300 | 300/300 | yes |
| --self-check | 61/61 | 61/61 | yes |
| Patched converter core / qlever | identical to EXP-O02 item by item | identical | yes |
| Raw answers 0.2.0 vs 0.3.1 | 0 differences in all 87 golden runs per lane | none | none |
| judge_changed / planted / mutants | 47/47; 22/22; 8/8 | 8/8 | yes |
| probe_delta_033 | 19 MATCH, 1 REFUSES (erasure), 0 WRONG | same | yes |
| New 0.3.5 probe (119 probes from the contract; checker self-test 11/11) | 116 MATCH, 3 WRONG (all DR-JSON-CONVERT), 0 unexpected refusals | not run | no |
| Refusals | 8/8 exit 2 with X-NOT-MODELED and no output | none | yes |
| Reverse check | no dropped id survives; table equals the contract's | none | yes |
| Independence and hashes | stdlib, no subprocess, no packages/; 29/29 hashes match four ways | none | yes |

## Pin scope
- Pin `lab/oracles/replay/**` at 8cc2c26 (29 files, hashes.8cc2c26.json) against contract 0.3.5 + Q43.
- May close: 106 of the 119 obligations that use O-REPLAY (their other gates still apply: position, W0, O-TDK1, composition identity).
- Blocked, 13: the 11 erasure-dependent obligations (G9.erasure.*, REQ.pii-erasure, GS.16, G7.journal.logical-contract,
  G10.cursor.stable, NS.SEC.retro-and-audit, R.repo.mutation-controls, G8.composition.watermark-routing) fail closed through the oracle's
  erasure refusal; G1.types.decimal (refused scale-evolution cases; key-byte cases need O-TDK1); G1.decimal.channel-routing (wrong answer
  F2) must be excluded explicitly in the pin, because pins are per oracle.
- Findings: F2 DR-JSON-CONVERT wrong (E-INVALID-CONVERSION where the contract says 1.5 / E-DECIMAL-FRACTION / E-INVALID-VALUE; the drift
  guard missed it because `decimalRouting` is absent from RULES.md's table list and Coverage.TABLES). N1 Q43 not yet compiled (DO-ROUND
  precision). N2 refusals refuse the whole case (exit 2); only `erase`/`erasure` refuse, other unknown ops are E-INVALID-VALUE, so outbox
  steps must never be O-REPLAY ops. N3 G1.types.decimal lists only O-REPLAY and O-ERR but selects three key-byte cases that need O-TDK1.
  N4 resuming at an abort gap maps the gap coordinate to its ordinal through a coordinate cut.

## V-O04b: O-REPLAY 0.4.1 at a9c1327 (saved by the orchestrator, 2026-11-07 23:26Z)
- Verdict FIX-FIRST, narrow: every Q49a-e answer passes (probe_q49 81 probes: 74 MATCH, 0 WRONG-ANSWER, 7 DERIVED-NOTE; self-test 7/7);
  the residual refusals are exactly the nine Q52 shapes (9/9 X-NOT-MODELED; the only other X-NOT-MODELED sites are 0.3.1's
  entities.py:61, run.py:53, views.py:129; the blanket refusal at replay.py:384 is gone); no answer changed outside erasure and
  JSON-to-decimal (differential 0.3.1 at 8cc2c26 against 0.4.1 over 1,443 cases: seed 49 643 cases, 632 identical, 6 refused by both, 5
  expected differences; seed 4949 800/800 identical; raw golden answers 0.2.0 against 0.4.1 0 differences over 87 runs per lane).
- Failed clause: on six undecided erasure shapes the oracle answers instead of refusing (F4) and an unknown erase target or id is rejected
  where Q49b's text says commit (F3). Ruled Q56a-g as the oracle answers; Q56h (N1: in-flight outputs hold old values; synthetic data only).
- Counts: unit 342/342; self-check 61/61; converter core 317/19/2/3 and qlever 298/18/19/1/2/3, 0 item differences from EXP-O02;
  unpatched converter identical; judge_changed 47/47; planted errors 22/22; V-O01 mutants 8/8; probe_delta_033 20/20; section-4 23/23;
  probe_035 119/119 MATCH (stale probe replaced; self-test 13/13 non-MATCH).
- 29 files of lab/oracles/replay at a9c1327 match four ways (git archive, working tree, the oracle's sourceSha256 13/13, the author's
  hashes.q49.txt); table in lab/verify/O02/v-o04b/results/hashes.a9c1327.json on verify/O02 (bfc129a). Independence holds (stdlib only, no
  subprocess, socket or urllib; no new packages/ references).
- Next: V-O04c converts the seven DERIVED-NOTE rows to checked rows under Q56 and returns the final pin verdict.

## V-O04c: ACCEPT for pinning O-REPLAY 0.4.1 at a9c1327 unchanged (saved by the orchestrator, 2026-11-07 23:31Z)
- verify/O02 fa6c236 (probe_q49.py and its two result files only); oracle tree byte-identical to a9c1327, so the V-O04b hash table holds.
- probe_q49: 85 probes, 85 MATCH, 0 WRONG-ANSWER, 0 DERIVED-NOTE (74 already checked, 7 converted under Q56a-g, 4 new controls: Q56c without
  the erase reads "SAME" with supports [e1, e2]; Q56e an entity with no ssn is rejected E-CONSTRAINT required and shows missingRequired
  [ssn]; Q56f an erase by a known id commits and names x1 only). Self-test 15/15 planted wrong expectations caught (each Q56 plant is the
  obvious alternative ruling).
- Q56e row rebuilt: the oracle ignores violations that predate the enforced command, so the enforced command now brings p1 under the
  constraint. Q56d: one marker group per attribute means "by assertion id" has nothing to order; supports list in insertion order;
  different erasure instants refuse (Q52c). Q56h holds: all probe values synthetic.
- Merge note: merging the oracle alone breaks `--verify` (Q45a pinned O-REPLAY files differ from the tree: RULES.md, SCHEMA.md,
  constraints.py), so the merge and the pin move land together in contract 0.3.8 on branch contract/0.3.8.

## V-O04d: O-REPLAY 0.4.2 at 3e38a61: FIX-FIRST on the in-flight answer set (saved by the orchestrator, 2026-11-08 01:11Z)
- F5: with two or more erasure commits in flight 0.4.2 lists every subset (2^n), not the n + 1 prefixes in position order (Q66a). Case p1 = 1,
  p2 = 2, p3 = 4 erased one per commit (tx:1, tx:2, tx:3): one commit PASS ([] 7, [tx:1] 6); two commits list 4 alternatives including [tx:2] 5;
  three commits list 8 including [tx:2] 5, [tx:3] 3, [tx:1, tx:3] 2, [tx:2, tx:3] 1; a read started after tx:1 lists [tx:3] 2. Cause: run.py
  run_queries loops `for mask in range(1 << len(pending))`; RULES.md R-ERA-6 says every combination is listed. Fix: iterate `seen =
  pending[:k]` for k = 0..n (in_flight_erasures already returns publication order) and update R-ERA-6.
- F6: `cursorFrom` on an in-flight entry exits 2 ("malformed case: cursorFrom names unknown or failed query"); 0.4.1 answered the same case. Q66b
  requires per-prefix answers; at minimum a typed X-NOT-MODELED refusal. Same code path as F5.
- Passes: Q52a (COUNT distinct with two erased = 3; assertion count 5; valueSupports marker group count 2); Q52b (asc [p3, p2, p6, p1, p4, p5, p7],
  desc [p2, p3, p6, p1, p4, p5, p7]); Q52c (marker(200) for 200 and 300; card-many [pub, marker(500)]); Q52d (erased dangling reference skipped;
  readable control rejected E-CONSTRAINT); Q52e single commit ([([], 7), ([tx:1], 4)]); Q66c own scope only; Q52f 11/11 (2.675 half-up 2.68; 2.665
  half-even 2.66; 0.15 half-even 0.2; 9.995 half-up E-DECIMAL-OVERFLOW; no mode E-DECIMAL-FRACTION; string E-INVALID-VALUE); Q52g (`erasure`,
  mixed, preconditions each E-INVALID-VALUE, nothing applied). Only three X-NOT-MODELED raise sites (entities.py:61, run.py:53, views.py:129).
- Counts: probe_q52 35 probes, 31 MATCH, 3 WRONG-ANSWER (Q66a), 1 OBSERVED (Q66b), self-test 10/10; probe_q49 85/85 (15/15); probe_035 119/119
  (13/13); probe_delta_033 20/20; unit 370/370; self-check 61/61; converters 0 item differences from V-O04b. Differential 0.4.1 against 0.4.2:
  seed 49 767 cases (722 identical, 5 refused by both, 40 different), probe_q52 35 (3, 0, 32), seed 4949 800/800 identical; all 72 differences on
  Q52 shapes (13 Q52a-d, 12 Q52e including the F6 cursor case, 8 Q52f, 7 Q52g in seed 49), none from Q56f.
- Hash table of 29 files at 3e38a61 matches the author's (12 changed against 0.4.1, equal to git diff --stat). Verifier commit 403afe1 on
  verify/O02; tools lab/verify/O02/tools/probe_q52.py (new), probe_q49.py, probe_035.py, differential.py; results lab/verify/O02/V-O04d/results/.

## V-O04e: O-REPLAY 0.4.3 at 45bfa59: FIX-FIRST, narrow, two cursor-continuation holes (saved by the orchestrator, 2026-11-08 01:33Z)
- F5 and F6 fixed: in-flight reads list exactly the n + 1 prefixes in position order; `cursorFrom` on an in-flight read is answered per
  prefix (two-page, three-page and chained continuations keep one prefix across pages). Refusal sites unchanged (entities.py:61, run.py:53,
  views.py:129). probe_q52 45 probes: 41 MATCH, 2 WRONG (F7, F8), 2 OBSERVED, self-test 16/16; probe_q49 85/85; probe_035 119/119;
  probe_delta_033 20/20; unit 372/372; self-check 61/61; converter 0 differences on both lanes. Differential against 3e38a61: seed 49, 780
  cases, 22 different (12 rule label only, 3 Q66a prefix rows, 7 Q66b cursor rows); seed 4949, 800/800 identical; 0 golden or random
  differences. 29 file hashes match the author's hashes.45bfa59.txt; 13/13 match the oracle's sourceSha256.
- F7: `run.py` `continued_read` returns the source read only when `len(source["answers"]) > 1`, so a continuation of a read with nothing
  in flight falls back to its own read view and readStart; a page 2 with an earlier readStart reopens the erased value's old plaintext after
  page 1 showed the marker. Fix: every `cursorFrom` continuation uses the source read's start, scope and prefixes (drop the `> 1`).
- F8: a literal cursor token encodes position, valid time, entity type, scope and the `after` id but no prefix, so it is byte-identical in
  every alternative; with no readStart the continuation is answered after every erasure, and a lane that keeps page 1's all-old prefix is
  judged wrong. Recommended fix (b): a literal token equal to a `nextCursor` issued earlier in the same case by a read with commits in
  flight continues that read per prefix (token bytes and cursor vectors unchanged). Both holes existed in 0.4.2.
- Evidence: verify/O02 4eec2ba; tools probe_q52.py, differential.py, diff_modulo_rule.py (new); results lab/verify/O02/V-O04e/results/.
- Process note: the orchestrator's scratchpad cleanup removed the 3e38a61 scratch tree after both differential runs had finished; the
  verifier re-extracted it from git for one re-check. Scratch archives under review stay until their verifier reports.
