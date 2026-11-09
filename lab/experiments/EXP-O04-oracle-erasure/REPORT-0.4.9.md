# O-REPLAY 0.4.9 — CX-OREPLAY-049

North star: correctness floor for P1 pinned reads and P3 continuation; no performance work.
Scope and priorities: main-checkout `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`;
procedure: `CLAUDE.md` and `lab/PROTOCOL.md`. This round implements only pending rulings
Q70n and Q70o, addressing V-O04h F14/F15. Read the review and tools at `verify/O02`
commit `f977e36`; implementation starts from `3c52a1d` on `exp/O04b-oracle-0.4.2`.

## Changes

- Replace the source-pattern completeness scan with execution of every registered
  `run.QUERIES` handler against four generated cases: empty/populated state crossed
  with page sizes 1/2. Each gets a fresh replay and lexeme-preserving JSON input.
  Serialize the actual output, then recursively inspect top-level objects, pages,
  lists and nested dictionaries for every `next*` key. Fields must equal the kind's
  declared issued field, or be empty for an undeclared kind. All four executions
  must succeed; unexpected input errors, exceptions and unserializable outputs fail
  conservatively. Table entries without registered handlers also fail.
- The three existing order-key kinds execute their registered refusal handler.
  Only that exact handler's intentional `OracleInputError` is inspected as a refusal
  output; arbitrary input errors cannot pass as exercised queries. They remain
  unsupported surfaces, not newly modeled key outputs.
- Keep the literal-output plant and add computed-key, cross-module-helper and
  nested-dictionary negative controls. Each executes four times, emits `nextPage`,
  and must fail completeness. A missing-fixture handler must also fail.
- Validate `cursorFrom` before issuer lookup: it must be an object naming a textual
  query id. Its optional page defaults to zero only when omitted, uses the existing
  nonnegative JSON-integer validator, and is range-checked before indexing.
  Explicit null, strings, floats, booleans, oversized integers, negative/out-of-range indices and invalid
  reference shapes produce `OracleInputError` / CLI exit 2 without traceback/output.
  An in-range terminal page still has no continuation, retaining the existing error.
- Bump runtime identity, RULES.md and SCHEMA.md to 0.4.9 and document Q70n/o.

## Gates and evidence

Fresh final-source results (all commands exited 0):

| Gate | Result | Evidence under results.049/ |
| --- | --- | --- |
| Unit suite, including the planted outputs and malformed-reference CLI controls | 385 tests, OK | `unit-final.log` |
| Self-check | PASS 90/90: HAM 18, CFG8 20, EVT 23, continuation execution 29 | `selfcheck.json` |
| Core converter | 49 vectors; 317 AGREE, 19 AGREE-RULED, 2 VECTOR-BUG, 3 NOT-MODELED | `core-final/results.json` |
| QLever converter | 49 vectors; 298 AGREE, 18 AGREE-RULED, 19 DISAGREE, 1 CONVERTER-ERROR, 2 VECTOR-BUG, 3 NOT-MODELED | `qlever-final/results.json` |
| Converter comparison with results.048 on each lane | 341/341 item verdicts unchanged, zero vector-verdict differences | `core-final-comparison.json`, `qlever-final-comparison.json` |
| Source binding | Manifest 29/29; self-check 13/13; 87 converter output documents per lane each match all 13 reported source files | `source-provenance.json`, manifest, raw runs |
| Whitespace | `git diff --check` clean | builder command |

`gate-receipts.json` records the exact commands, labels and exits. All original
attempts remain: the first unit run passed 385 tests and both first converter runs
completed with the same totals. Review then identified Python's integer-digit-limit
exception on a 5,000-digit page selector; the guard now translates it to input error,
and that CLI control is included in the final unit run. Both converters were rerun
into fresh `*-final/` directories after that change. No prior evidence was overwritten.
The QLever disagreements/error and other legacy gaps remain; converter exit zero is
not a claim that these outcomes passed.

Evidence directory:
`/Users/sam/Claude/Projects/triplex-db-2/EXP-O04b-oracle-0.4.2/results.049/`.
Full 29-file SHA-256 manifest:
`/Users/sam/Claude/Projects/triplex-db-2/EXP-O04b-oracle-0.4.2/hashes.0.4.9.txt`.

All heavy commands use main-checkout `lab/bin/heavy.mjs`; host free space before
submission was 34,784,788 KiB (>5 GiB). Main-checkout sources are read-only.
Converter source is retained as `converter.original.py`, with its original hash in
`converter-provenance.json`. `converter-driver.py` changes only ROOT/GOLD/OUT routing
and selects the lane through the converter's existing O02_LANE interface. Golden
files are read from the main checkout; all oracle execution uses this worktree.

## Limits and handoff

These are builder regression results, not independent promotion verification.
A separate reviewer must check this revision. Generated cases provide finite
execution coverage, not exhaustive coverage of every possible future query branch;
new input requirements fail conservatively until fixtures are supplied. No engine
activity, performance testing, production pin move, dependency installation,
main-checkout edit, merge or push was performed.
