# V-D01c independent review of O-DOMAIN at exp/D01c-o-domain 276a280: FIX-FIRST (saved by the orchestrator, 2026-11-08 00:12Z)

**Verdict:** two small robustness fixes, then a delta check. The rules are right: w0.py, jsontok.py and population.py read against SPEC.md
section by section show no deviation in any rule, read set, input set, validation order, hash, diff, activation tie, business-day rule,
publish or receive step, or generator draw; nothing is fitted to a golden output. The fingerprint reproduces exactly (102.7 s, 24 MiB, 0
invalid worlds; all six values match O-DOMAIN's constants and, independently, values parsed from lab/verify/D01/VERIFY.md; 400 block
digests, floors and 5 source hashes equal the committed receipt; W0 folder 95/95 match). The code is independent (blind overlap: verbatim
3-line shingles V-D01 0 of 1,418, packages/ 0, replay/bench/decimal 0; rename-proof 5-line structure shingles 3 of 1,402 / 4 / 5 against a
renamed-copy control of 796; 17 of 190 identifiers shared with V-D01, all generic or SPEC-derived). Verifier commit
1870376de582c57b04d5a7cdc72a517cc3d20108 on verify/D01c (lab/verify/D01c/** only: hash table O-DOMAIN-276a280-SHA256SUMS, fingerprint receipt,
probes.txt, mutation-results.json, mutation-kills.json, proposed-cases/ P01-P40 with INDEX.json, tools/); 70 mutant copies and logs in
/Users/sam/Claude/Projects/triplex-db-2/V-D01c/.

## Defects
| Id | Severity | What | Where | SPEC answer | Fix |
| --- | --- | --- | --- | --- | --- |
| F1 | medium | A JSON array or object on a date or instant attribute (startDate, section1AttestedAt, everifyStatusAt, expiresOn, an SSN erased marker's erasedAt) crashes with TypeError and prints nothing (CLI exits 1, breaking its "prints {"error":...}, exit 0" contract); C64 puts the marker on a cents attribute, which is not cached | w0.py 46 and 64: lru_cache hashes the argument before the type check | W0.E_VALUE | type-check before the cached call; `cli.py cases` reports a crashing case as FAIL instead of aborting; golden P01, P02 |
| F2 | low | an integer token over 4,300 digits crashes with ValueError (the limit cannot be raised under -I) | jsontok.py 245 `int(x.text)` | W0.E_VALUE (cents) or W0.E_BASIS (tx) | treat any integer token longer than 16 digits as out of range before `int()`; validate.py has the same limit; golden P03 |
| F3 | low | a fact v nested about 500+ levels returns W0.E_SHAPE (RecursionError becomes a syntax error); JavaScript handles thousands | jsontok.py parser | W0.E_VALUE (Q57c) | iterative parser |
| N1 | note | run_case and the unit tests build expected bytes with O-DOMAIN's own writer, so a writer defect on both sides is invisible (M54 survives the cases) | cli.py 66 | n/a | compare against frozen bytes (the proposed cases do) |

## Checks
1 Rule fidelity: FINDING F1, F2; rule logic PASS. 2 Can the cases fail it: FINDING against W0 coverage (70 mutants plus control M00; control
87/87, 119/119, fingerprint equal; 26 killed by the 87 cases; 24 killed only by O-DOMAIN's unit tests or the fingerprint, 13 of them
kernel-relevant and 11 generator mutants; 20 killed by nothing, 19 real gaps and M57 equivalent; the 40 proposed cases kill all 19 gaps and
the 13 kernel-relevant test-only mutants). 3 Fingerprint: PASS. 4 Readings A01-A10: PASS with 4 real gaps (A01 BOM and invalid UTF-8, A07,
A08, A09 order of equal ids); A02-A06 and A10 decided by SPEC and matched. 5 Independence: PASS. 6 Numeric rule: FINDING F2; otherwise PASS
(no floats in W0 values; M56 and M56b caught by 7 and 16 cases; 2^53 - 1 and 2^53 pinned for cents by C27 and C39 and for positions only by
P22-P24; instants compared as strings).

## Coverage gaps the 87 cases cannot see (killed by nothing; proposed case)
M04 5.4 tie-break swapped (C61 cannot see it) P16; M06 `from == v` not a candidate P18; M07 activation at tx = basis.tx rejected P19; M09
basis.tx 0 rejected P21; M10 basis.tx 2^53 - 1 rejected P22; M10b 2^53 accepted P23; M11 within one fact tx before value P25; M16 activations
before the world P11; M18 R2 local floor overrides state P26; M23 pos(D) omits the decisions fact P27; M25 incomplete record counts as approve
P28; M26 PROP takes the earliest proposal P29; M28 `reverified: false` counts as reverified P30; M35 R3 scope needs the jurisdiction's own facts
(V-D01's N1) P31; M41 affected subjects in world order P34; M43 basis guard ignores validTime P35; M44 equal-basis record skipped P36; M45
retirement crosses subjects (every golden publish case has one subject) P37; M54 writer leaves non-ASCII unescaped P13.
Killed only by O-DOMAIN's tests or the fingerprint (do not judge the kernel): M03 P39, M05 P17, M08 P20 (no valid case has a fact at
basis.tx), M13 P08, M14 P09, M15 P10, M17 P12, M31 P32, M37 P33, M40 P40, M47 P38, M53 P06 P07, M55 P13; generator mutants M58-M73 are pinned
by the fingerprint.
Golden-set facts exposed: no valid case sits at basis.tx (all have basis.tx 10 or 20 with facts at most 9); no activation at tx = basis.tx or
from = v; every publish case has one subject and validTime 12:00; no case or population world has an incomplete record, `reverified: false`,
a local floor below the state floor, or a decisions fact later than its record; every receive case releases at most one waiting delivery.

## Readings A01-A10 (proposed golden cases)
A01 partly decided (syntax and truncation decided; BOM and invalid UTF-8 a real gap: RFC 8259 8.1 lets parsers ignore a BOM and Node's
Buffer.toString turns invalid bytes into U+FFFD): P04 (EF BB BF + C01 -> E_SHAPE), P05 (0xFF inside the SSN string -> E_SHAPE), both need an
`inputBase64` case form; the TS kernel decodes with TextDecoder('utf-8', {fatal: true, ignoreBOM: true}). A02 decided: P06, P07. A03 decided:
P08. A04 decided: P09. A05 decided: P10, P11. A06 decided: P12. A07 real gap: P13 (W0-1.1.2 must state the writer rules for non-W0 payload
values or make them E_SHAPE). A08 real gap: P14. A09 mostly decided, equal-id order a gap: P15. A10 decided, pinned by the fingerprint.
validate.py accepts 34 of 37 proposed cases (P04, P05 byte cases and P03, which crashes it, not run); it rejects P13-P15 by design (records
evaluate never produces), so W0-1.1.2 needs an exemption class for reading cases. Expected answers: P16-P19, P34, P40 identicalTo existing
cases; other oracle-derived ones accepted only after hand-checking every decisive field; error cases (including P01-P03) written from SPEC.

## sha256 of lab/oracles/domain at 276a280 (recomputed; equals EXP-D01c's report and the receipt's source hashes)
README.md e071fd2a...24ce; cli.py 320f3e30...349a; jsontok.py 90598762...a29a; population.py 7c33da56...eb3d; receipts/population-100k.json
75e2e206...09ab; test_domain.py 9d62740d...341c; w0.py 35737dfc...6faf (full table: lab/verify/D01c/O-DOMAIN-276a280-SHA256SUMS on verify/D01c).

## V-D01c delta check: O-DOMAIN at 5d1fd1a: ACCEPT, pin (saved by the orchestrator, 2026-11-08 01:35Z)
- F1-F3 fixed with no change to any valid-input answer. Seeded differential 276a280 against 5d1fd1a in separate processes, 7,127 entries
  (127 case inputs, 3,000 perturbations, 4,000 parser and writer texts): 6,833 identical; all 294 differences are inputs where 276a280
  crashed (91 F1, 167 F2, 36 huge publish/receive integers); 0 other differences, 0 new crashes. 20/20 F1-F3 probes give the SPEC answer.
- P01-P40 40/40 three ways (API with either writer's expected bytes, CLI); 87/87 golden; 126/126 unit tests. Kill matrix: 71 of 71 rows
  identical (7 mutants ported because their target text moved). Fingerprint through heavy.mjs: all six values equal V-D01's (basis.tx
  4,338,757; 44,537,987 facts; worlds fec1d7ce...c760; R1 c1b2d410...1a79; R2 551bbbc4...b562; R3 a5950922...ee2f); all 400 block digests and
  every floor equal.
- Low notes, not blocking: D1 two parser mutants survive every case (X06 accepts `[1}`; X10 misses a duplicate key after the second
  member) though the shipped parser is right on the verifier's corpus; add unit tests `[1}` -> syntax error and `{"a":1,"b":2,"a":3}` ->
  duplicate in a later O-DOMAIN version. D2 O-DOMAIN's reading id "A11" collides with W0-1.1.2's A11 (NaN, Q57a); documentation only, since
  W0-1.1.2 decides the same exact reading (A12, C130, C131) and O-DOMAIN passes those cases. D3 lifting the digit limit makes huge integers
  slow (int() roughly quadratic), not wrong.
- Evidence: verify/D01c 7f05819 (merge 0c36116 brings 5d1fd1a), lab/verify/D01c/delta-5d1fd1a/; scratch
  /Users/sam/Claude/Projects/triplex-db-2/V-D01c/delta-5d1fd1a/.
- Orchestrator cross-check against W0-1.1.2 (fedfcda): `cli.py --world-dir <W0 1.1.2> cases` gives 133/136 byte-identical; the other three
  (C91, C92, C128) use the new `inputBase64` form, which O-DOMAIN's case loader does not read; run as decoded bytes through `cli.py evaluate -`
  all three MATCH (`W0.E_SHAPE`). So O-DOMAIN 5d1fd1a passes all 136 W0-1.1.2 cases; its case loader needs `inputBase64` support before an
  evaluator runs it over the case folder (contract runner note for 0.3.10).
