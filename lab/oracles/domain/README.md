# O-DOMAIN: the independent domain oracle for W0-1.1.1

O-DOMAIN is the stdlib-only Python implementation of W0's six pure operations (`lab/world/W0/SPEC.md` section 1): evaluate,
resolveRelease and reconcile, affected, publish and receive, plus the SPEC 12 sweep population and its SPEC 12.7 fingerprint. It
was written from `SPEC.md` alone (EXP-D01c). It reads no Triplex, kernel, engine or reviewer code, and it shares only the W0 rule
text and the files in `lab/world/W0/` (releases, cases, schema).

## Commands (run with `python3 -I`)

| Command | What it does |
| --- | --- |
| `cli.py run <case.json>` | runs one golden case; canonical output on stdout; exit 0 when byte-identical to `canonicalJson(expected)`, 1 otherwise |
| `cli.py cases [<dir>]` | runs every case in a directory (default `lab/world/W0/cases`) |
| `cli.py --test` | the unit tests: all 87 golden cases, SPEC examples, schema cross-check, token JSON, validation order, the SPEC 13 invariants, a small population |
| `cli.py evaluate\|reconcile\|affected\|publish\|receive [<input.json>\|-]` | one operation on an input object with the SPEC 4.3 keys; canonical output on stdout; an invalid input prints `{"error":"W0.E_..."}` and still exits 0 |
| `cli.py release-hash <release.json>` | the SPEC 5.2 content hash |
| `cli.py --population --rung 100k --fingerprint [--expect] [--out <file>]` | streams the population, prints the six-value fingerprint and the measured floors; `--expect` compares with the accepted fingerprint (exit 1 on any mismatch) |

`--world-dir <dir>` points at another W0 folder. Exit 2 means a usage or environment error (for example a release hash that does
not match `releases/index.json`).

Run the population through the lab's heavy-command gate:
`node lab/bin/heavy.mjs --label D01c -- python3 -I lab/oracles/domain/cli.py --population --rung 100k --fingerprint --expect --out lab/oracles/domain/receipts/population-100k.json`.
It takes about 2 minutes and under 30 MiB.

## Files

| File | Holds |
| --- | --- |
| `jsontok.py` | token-level JSON: number tokens kept as text, duplicate keys flagged, SPEC 9 canonical writer |
| `w0.py` | SPEC 2 to 10: types, entities, validation order, releases, the eleven rules, output assembly, reconcile, affected, publish, receive |
| `population.py` | SPEC 12.3 generator and SPEC 12.7 fingerprint, streamed one world at a time, with the measured floors |
| `test_domain.py` | the unit tests behind `--test` |
| `cli.py` | the command line |
| `receipts/population-100k.json` | the 100k run: fingerprint, comparison with the accepted values, measured floors, per-1,000-world block digests, source hashes |

## Results at W0-1.1.1

- **Golden cases:** 87 of 87 byte-identical.
- **100k fingerprint:** all six values equal the accepted ones (basis.tx 4,338,757; 44,537,987 facts; worlds `sha256:fec1d7ce...c760`;
  R1 `sha256:c1b2d410...1a79`; R2 `sha256:551bbbc4...b562`; R3 `sha256:a5950922...ee2f`).
- **Measured floors** (equal to V-D01's): R2 changes 62.293% (I9S2 46.109%, DOCEXP 22.516%, MINWAGE 9.798%); lowest firing rule
  MINWAGE under R1 at 7.810%; largest location 1,100, mean 49.54; three or more work items 1.567% (R1) and 2.459% (R2, R3); R3 reaches
  9,497 subjects and changes 418, none changed without being reached; OT under R3 fires for 16.538%.

## SPEC-AMBIGUITY items (the reading O-DOMAIN implements)

| Id | Place | Ambiguity | Reading chosen |
| --- | --- | --- | --- |
| A01 | 4.4 step 1 | Input bytes that are not one JSON value (syntax error, not UTF-8, a byte order mark) | `W0.E_SHAPE`: the input is not a JSON object with the required keys |
| A02 | 2 | `-0` matches the integer-token grammar `-?(0\|[1-9][0-9]*)` | an integer token with value 0, valid wherever 0 is, written `0` in outputs (what `JSON.parse` plus `Number.isSafeInteger` also give) |
| A03 | 4.4 step 3 | Whether a cardinality clash (3.3) can be reported before a later fact's unknown, value or basis error (3.2) | 3.3 runs only after every fact of that world passed 3.2, so a later `W0.E_UNKNOWN` wins over an earlier duplicate |
| A04 | 4.4 step 3 | `affected` with several worlds: all of 3.1 to 3.3 per world, or each check across all worlds | world by world in array order: world 1's `W0.E_CARDINALITY` wins over world 2's unknown subject |
| A05 | 4.4 step 4 | Order of activation checks | after the world (step 3); activation by activation in array order; within one, `W0.E_VALUE` (release, from) before `W0.E_BASIS` (tx) |
| A06 | 5.4 step 4 | The picked activation names a well-formed hash that is not R1, R2 or R3 while an older candidate names a known release | `W0.E_NO_RELEASE`; no fall back to the older candidate |
| A07 | 9, 4.4 step 1 | `publish` and `receive` pass opaque payloads through unchecked, but SPEC 9 defines only integer numbers and printable ASCII strings | an integer token is written as its integer; any other number token as its source text; other strings with `json.dumps(..., ensure_ascii=True)` escapes; keys sorted by code point (equal to UTF-8 byte order) |
| A08 | 8.8, 8.9 | Input states that are out of their stated order or repeat an id | indexed by id (a later entry replaces an earlier one); output arrays re-sorted (items and effects and projection by id, subjects by subject, waiting by seq); `pending` keeps its input order and appends |
| A09 | 8.8 step 2 | Two work items with one id in one record (evaluate never produces this) | processed in stable id order; the second compares with the item state the first just set |
| A10 | 12.3 | "Runtime submit result ... only when the status is absent and the SSN valid" | "valid" is the SSN option named `valid` (nine digits); dashed, erased and absent SSNs draw no `evres` |

None of these changed a golden case or the fingerprint; A10 is the only one the population exercises, and the fingerprint matches
under it.
