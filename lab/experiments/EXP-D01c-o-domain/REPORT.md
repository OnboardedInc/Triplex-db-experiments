# EXP-D01c O-DOMAIN: report (saved by the orchestrator, 2026-11-07 23:03Z)

**Bottom line:** an independent stdlib-Python implementation of W0-1.1.1, written from SPEC.md alone, reproduced every golden case and
the whole 100k fingerprint on its first run. Commit 276a2809d5bc41c63177ce5091d48516cc4d1856 on `exp/D01c-o-domain` (only
lab/oracles/domain/**); not merged pending verification.

## Results
- 87/87 golden cases byte-identical (`python3 -I lab/oracles/domain/cli.py cases`); two corrupted copies (a C01 trace row, the C45 float
  token) fail as they should. 119/119 unit tests (`cli.py --test`): every golden case; SPEC worked examples (hashes 5.2, diffs 5.3,
  addBusinessDays 6.1, the 5.4 activation tie); the SPEC 3 table against schema.json; parser edge cases; validation orderings no golden
  case pins; SPEC 13 invariants 13.1-13.8 on every valid evaluate case; the generator at N = 1,000.
- 100k fingerprint, all six equal to the accepted values: basis.tx 4,338,757; facts 44,537,987; worlds sha256:fec1d7ce...c760; R1
  c1b2d410...1a79; R2 551bbbc4...b562; R3 a5950922...ee2f. Run through `node lab/bin/heavy.mjs --label D01c -- ... --population --rung 100k
  --fingerprint --expect`, streamed one world at a time: 99.5 s, peak 23 MiB. Receipt lab/oracles/domain/receipts/population-100k.json
  (fingerprint against accepted values, per-1,000-world block digests, sha256 of each source file run).
- Floors equal V-D01's to the last digit: R2 changes 62.293% (I9S2 46.109%, DOCEXP 22.516%, MINWAGE 9.798%); lowest-firing rule MINWAGE
  under R1 7.810%; largest location 1,100 (rank 2: 801), mean 49.54; 3+ work items 1.567% (R1), 2.459% (R2, R3); R3 reaches 9,497 subjects
  and changes 418, 0 changed without being reached; OT under R3 16.538%; bucket shares 50.098/34.894/15.008%; mean world sizes
  124.0/499.6/1,392.1 facts; hops 40.144/35.01/24.846%; 0 invalid worlds.

## CLI (for the W01 scenario runner)
`run <case.json>` (exit 0 on byte match, 1 on mismatch); `cases [<dir>]`; `--test`; `evaluate|reconcile|affected|publish|receive
[<input.json>|-]` (SPEC 4.3 keys; invalid input prints `{"error":"W0.E_..."}` and exits 0); `release-hash <file>`; `--population --rung
100k --fingerprint [--expect] [--out f]`; exit 2 = usage or environment error.

## SPEC-AMBIGUITY readings (none changed a golden case or the fingerprint; only A10 is exercised by the population; ruled Q53)
A01 (4.4.1) bytes that are not one JSON value (syntax error, not UTF-8, BOM) are W0.E_SHAPE. A02 (2) `-0` is an integer token with value
0, written `0`. A03 (4.4.3) 3.3 cardinality runs only after every fact of that world passes 3.2, so a later E_UNKNOWN beats an earlier
duplicate. A04 (4.4.3) `affected` validates world by world (3.1-3.3 per world, array order). A05 (4.4.4) activations checked after the
world, one at a time in array order; within one, E_VALUE before E_BASIS. A06 (5.4.4) a picked activation naming an unknown well-formed
hash is E_NO_RELEASE, no fall-back. A07 (9, 4.4.1) opaque publish/receive payloads: integer tokens as integers, other number tokens as
source text, other strings with json.dumps(ensure_ascii=True) escapes. A08 (8.8, 8.9) input states indexed by id (later wins); outputs
re-sorted; `pending` keeps input order and appends. A09 (8.8.2) a duplicate work-item id in one record processed in stable id order, the
second compared with the state the first set. A10 (12.3) "SSN valid" for the `evres` draw means the `valid` option only.

## Per-file sha256 at 276a280 (lab/oracles/domain/)
README.md e071fd2a...24ce; cli.py 320f3e30...349a; jsontok.py 90598762...a29a; population.py 7c33da56...7eb3d; test_domain.py
9d62740d...341c; w0.py 35737dfc...6faf; receipts/population-100k.json 75e2e206...d0ab (full hashes in the hand-back, kept in the
orchestrator transcript; V-D01c recomputes them).

## Independence
Read only the brief, SCOPE, NORTH-STAR, TARGETS, lab/world/W0, lab/verify/D01/VERIFY.md, the EXP-O02 report (CLI conventions) and
lab/bin/heavy.mjs; none of V-D01's scratch folder, packages/, lab/oracles/replay, lab/bench or lab/scenarios. Stdlib only, `python3 -I`,
no engines, no subagents.

## Fix round F1-F3 (head 5d1fd1a3a60c01e5b5fc5d210ea0b3098074e3b9 on top of 276a280; saved 2026-11-08 00:23Z)
- F1: is_date and is_instant check type and length before the cached inner check; `cli.py cases` prints `FAIL <id> ... crashed: <error>` and
  continues (tests: containers and erased markers on startDate, section1AttestedAt, everifyStatusAt, expiresOn and an SSN marker's erasedAt give
  W0.E_VALUE; a planted crash in C01 prints FAIL, C02 passes, exit 1).
- F2: `ranged_int_token_value` maps tokens over 16 digits to +-10^16 without int(), used for cents, minutes, fact tx, basis.tx, activation tx
  (5,000-digit cents and minutes, 10^16 and 2^53 give E_VALUE; 2^53-1 valid; 5,000-digit fact tx, basis.tx, activation tx give E_BASIS). Reading
  A11 (author's): SPEC sets no range on publish/receive integers, so they stay exact (`sys.set_int_max_str_digits(0)` at import); a 5,000-digit
  seq publishes seq+1 exactly.
- F3: parser and fallback canonical writer iterative (explicit stack); `canonical` falls back to the iterative writer on RecursionError
  (between 20k and 200k levels in the C encoder); v nested 600, 5,000, 100,000 deep gives E_VALUE; a duplicate key 50,000 deep E_SHAPE; a
  300,000-deep publish payload echoes byte-exact; both writer paths identical on every golden output and on non-ASCII escaping (covers N1/M54).
- Results: 87/87 cases byte-identical; 126/126 unit tests (7 new); P01-P03 pass from case files alone; 100k fingerprint unchanged (99 s, 23 MiB;
  all six values; only `seconds` and `sources` differ in the receipt; 400 block digests and every floor equal).
- sha256 at 5d1fd1a: README.md 6e1e970e...4587; cli.py fb14ef13...b6d8; jsontok.py c428c5b8...03c0; population.py 7c33da56...eb3d (unchanged);
  test_domain.py 9103d227...5f08; w0.py 841f7d9d...7f00; receipts/population-100k.json 9a48033f...7557. V-D01c delta check running.
