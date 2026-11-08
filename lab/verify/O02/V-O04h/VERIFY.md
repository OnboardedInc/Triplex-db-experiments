# V-O04h / CX-VO04H: O-REPLAY 0.4.8 adversarial re-check

Verdict: **FIX-FIRST**. The existing three paged kinds pass the checked continuation cases, including F11–F13.
The new Q70l self-check does not enforce its stated completeness invariant: three independently planted query kinds
emit `nextPage` through the CLI and remain outside the continuation table while the self-check reports PASS.
The `cursorFrom.page` selector also retains the coercion/crash pattern that Q70m fixed for journal continuations.

North star: correctness floor for P1 pinned reads and P3 journal continuation; no performance claim.
Goals and procedure come from the main checkout's `CLAUDE.md`, `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`
and `lab/PROTOCOL.md`, read on 2026-11-08. Expected continuation behavior comes from the main checkout's
`lab/acceptance/RULINGS-PENDING.md` Q70a–m and this review's `BRIEF.md`.

## Revision and execution boundary

- Reviewed: `exp/O04b-oracle-0.4.2`, **3c52a1d8edfc165185298bfe3341d4b5fff803e3**, O-REPLAY 0.4.8.
- Differential baseline: **91ba352**, O-REPLAY 0.4.7, as the brief requests. The paused handoff mentioned a differential
  against `acf9fce` (0.4.5); that is not adopted as evidence for the requested baseline.
- Started from WIP **e4ce781** on `verify/O02`. Its tools and results remain intact; fresh receipts live in
  [`results/cx-vo04h/`](results/cx-vo04h/).
- Both oracle trees were freshly extracted with `git archive` into **`/private/tmp/CX-VO04H-2xsggws9/`**.
  The archive inputs, full commits, SHA-256s, Python version and verifier-tool hashes are recorded in
  [`provenance.json`](results/cx-vo04h/provenance.json). Only verifier tools were overlaid. All oracle execution,
  including the source mutations for planted-kind controls, occurred inside the archive trees. Plants were restored.
- Scratch trees, archives and generated case corpora are retained. No main-checkout edits, engine activity, dependency
  installation, production pin change, implementation fix, merge or push was performed.
- Heavy work used `lab/bin/heavy.mjs`; observed host free space before admissions exceeded 5 GiB. No engine slot was used.

## Findings

### F14 — medium, promotion blocking: Q70l completeness check misses real paged outputs

**Location at 3c52a1d:** `lab/oracles/replay/selfcheck.py:351–372`, especially the literal-tuple test at **366** and the
same-module bare-name call traversal at **369**; runtime coverage is fixed to three kinds at **375–384 / 411**.

`next_fields_by_kind` recognizes only two-element AST tuples whose first element is a literal string starting `next`.
It follows bare-name calls to functions in the same module. It does not follow computed field names, calls through
another module, or dictionary keys. The runtime phase evaluates only `_paged_case()`'s three hardcoded kinds, so it
does not compensate for those omissions.

Reproduction: register `fakePaged` in `run.QUERIES`, leave it out of `CONTINUATIONS`, and implement it in scratch
`views.py` as one of the following:

```python
# P2: computed field, top-level output
field = "next" + "Page"
return V.OrderedOut([("rows", []), (field, 1)])

# P3: helper in another module
from . import entities as EN
return EN.page_out([])  # page_out returns OrderedOut([("rows", rows), ("nextPage", 1)])

# P4: nested dictionary field
return V.OrderedOut([("rows", []), ("page", {"nextPage": 1})])
```

Every fake query exits 0 and actually emits `nextPage`. For **P2, P3 and P4**, `cli.py --self-check` exits **0**, status
**PASS**, Q70l **6/6**, with no check for `fakePaged`. The literal-tuple control **P1** correctly exits **1**, status
**FAIL**, Q70l **6/7**, failing `continuation-table:fakePaged`. This violates the express Q70l requirement that a
`next*`-bearing kind cannot be left out of the table. It does not demonstrate a wrong answer in an existing table kind.

Evidence: [`plant_paged_kind.json`](results/cx-vo04h/plant_paged_kind.json), with actual CLI outputs, plus
[`plant-artifacts/`](results/cx-vo04h/plant-artifacts/) containing each input, whole expected-output document and
self-check document. Tool: [`../tools/plant_paged_kind.py`](../tools/plant_paged_kind.py).

**Proposed fix:** make continuation coverage part of query registration/output validation, with conservative failure
for undeclared or uninspectable outputs. Exercise the full registered handler set rather than a hardcoded three-kind
list, and retain computed-key, cross-module-helper and dictionary-output negative controls. Broadening the current
AST matcher by one literal shape does not establish the claimed invariant.

### F15 — medium: reference page selector still coerces malformed values and can crash

**Location at 3c52a1d:** `lab/oracles/replay/views.py:429`, reached from `run.py:650–652`'s reference-continuation route.

Q70m says `after`, `beforePosition` **and any other integer continuation parameter** must be JSON integers, with malformed
values exiting 2. The page index inside `cursorFrom` is another integer continuation selector, but it goes straight through
`int(ref.get("page", 0))` and Python list indexing rather than through the new validation.

Reproduction: assert four entities; read `entityPage` with limit 1 (four pages), then continue using
`{"cursorFrom":{"query":"a","page":VALUE}}`. The integer `0` control succeeds. The following malformed selectors do not
produce the required malformed-case exit:

| VALUE | Observed result |
| --- | --- |
| `"0"` | exit 0; coerced to page 0, continuation returns e1/e2/e3 |
| `0.0` | exit 1, no output; uncaught ValueError `invalid literal for int() with base 10: '0.0'` |
| `-2` | exit 0; negative Python index selects the penultimate page, continuation returns e3 |
| `true` | exit 0; boolean coerced to index 1, continuation returns e2/e3 |

Evidence: [`reference-page/summary.json`](results/cx-vo04h/reference-page/summary.json), the four input cases and captured
stderr/output files next to it. Tool: [`probe_reference_page.py`](probe_reference_page.py). The unchecked expression
predates 0.4.8; this is an unclosed route in the broad Q70m rule, not a newly introduced regression. Unlike `after`,
`beforePosition` and `snapshotPosition`, the ruling does not name `cursorFrom.page` explicitly; excluding it from “any
other integer continuation parameter” would need an explicit narrowing of the ruling. The observed uncaught exception
does not depend on that interpretation.

**Proposed fix:** validate the reference's page index as a nonnegative JSON integer before lookup, and translate invalid
reference shape/out-of-range selection into `OracleInputError` rather than an uncaught Python exception. Add these
malformed page selectors to independent controls and the unit suite.

## Checked continuation behavior

The WIP `probe_q52.py` converted former OBSERVED F11, F12 and F13 into expectations from Q70l/m. Its fresh run has
**76 rows: 74 MATCH, 2 OBSERVED, 0 WRONG-ANSWER**. The two observations establish shared token bytes; they are not
unscored correctness gaps. Its self-test catches **34/34** planted wrong expectations (33 WRONG-ANSWER, 1 REFUSES).

| Paged kind | Checked behavior |
| --- | --- |
| `entityPage` | `cursorFrom`, literal tokens, plain and in-flight sources, chains, issuer order, disagreeing issuers refused, identical views with different page bodies allowed |
| `transactions` | `after` continues the issuing read's prefixes, overrides the continuation's own `readStart`, matches scope, refuses disagreeing issuers |
| `transactionsForEntity` | `beforePosition` continues the same entity/scope/snapshot read; disagreeing issuers refused; another entity or `snapshotPosition` is not matched |

The F11 witness returns page 2 as `[([], tx:0 value 1), ([tx:2], tx:0 marker(200))]`, maintaining page 1's erasure
prefixes. `after` values `"1"`, `1.0`, `-1` and `true` all exit **2**, with no output document. Malformed string, float
and negative `beforePosition`, and string `snapshotPosition`, also exit 2. Q70m's `continuation_int` raises
`OracleInputError` at `views.py:285`, caught by `cli.py`; this is case malformation, not another X-NOT-MODELED site.

## Regression checks and limits

| Gate | Fresh result |
| --- | --- |
| `probe_q49` | 85/85 MATCH; 15/15 planted wrong expectations detected |
| `probe_035` | 119/119 MATCH; 13/13 planted wrong expectations detected |
| `probe_delta_033` | 20/20 MATCH |
| Unit tests | 381 tests, OK |
| Unmodified self-check | PASS, 67/67: HAM 18/18, CFG8 20/20, EVT 23/23, Q70l 6/6 |
| Core converter | 49 vectors; 317 AGREE, 19 AGREE-RULED, 2 VECTOR-BUG, 3 NOT-MODELED |
| QLever converter | 49 vectors; 298 AGREE, 18 AGREE-RULED, 19 DISAGREE, 1 CONVERTER-ERROR, 2 VECTOR-BUG, 3 NOT-MODELED |
| Converter comparison to author's `results.048.*.json` | 0 item-verdict differences and 0 vector-verdict differences on each lane |

The QLever converter disagreements/error are retained legacy outcomes, not newly passing checks. Matching the author's
counts does not establish complete golden coverage. `probe_035`'s reverse audit retains one representation-only
`E-DECIMAL-OVERFLOW` phase comparison (list versus `"preflight or execution"`); the oracle's normalized contract tests pass.

The first fresh harness attempt failed because the verifier did not create the legacy delta probe's fixed
`lab/verify/O02/results/` directory inside the archive. The failure is retained as `probe_delta_033.stderr.txt` and
exit 1 in `commands.json`. The directory was created and the same probe rerun as `probe_delta_033.retry1` (20/20).
This is a verifier harness failure, not an oracle failure. [`resume-provenance.json`](results/cx-vo04h/resume-provenance.json)
records the reason and the updated verifier tool hashes; the planted-kind helper was enhanced to save actual CLI outputs
before its fresh execution. Oracle bytes were unchanged outside the temporary, restored plants.
All saved JSON files parse. Whitespace checks pass for the authored report/tools; captured stdout retains its original
trailing spaces, which are intentionally not rewritten to satisfy a source-formatting check.

## Differential against 0.4.7

Seed **49**: **993 cases** (500 random, 493 saved probe/control/golden cases): **973 identical, 5 refused by both,
15 different**. Every difference belongs to F11–F13 or a new Q70l/m row/control. No golden or random case changed.
The comparison omits oracle identity/source metadata and `caseSha256`, and treats two exit-2 refusals as equal;
those are comparison limits, not claims that refusal messages are byte-identical.

The complete changed-case list is in [`differential.seed49.json`](results/cx-vo04h/differential.seed49.json).
Case-number prefixes below refer to the generated `probe_q52` corpus, not to a new obligation numbering scheme.

| Cases | Explanation |
| --- | --- |
| `048_transactionsForEntity_page_2...`, `025_ST_Q70l_entity_page_2_own_view` | F11 fixed: page 2 now follows page 1's in-flight prefixes instead of using its own plain view |
| `049_transactionsForEntity_beforePosition_issued_by_disagreeing_pages`, `026_ST_Q70l_disagreeing_issuers_continue_e1` | new Q70l coverage: disagreeing entity-journal issuers now give typed X-NOT-MODELED |
| `052_transactions_after_1_`, `029_ST_Q70m_string_after_answered` | F12 fixed: string `after` now malformed exit 2 rather than an independently answered page |
| `053_transactions_after_1_0` | F13 fixed: float `after` now exit 2 instead of uncaught ValueError/exit 1 |
| `054_transactions_after_1`, `055_transactions_after_true` | new Q70m rows: negative/boolean `after` now malformed rather than coerced |
| `056_transactionsForEntity_beforePosition_2_`, `057_transactionsForEntity_beforePosition_2_0`, `058_transactionsForEntity_beforePosition_2` | new Q70m rows: string/float/negative `beforePosition` now malformed; the float previously crashed |
| `059_transactionsForEntity_snapshotPosition_2_` | new Q70m row: string `snapshotPosition` now malformed instead of coerced |
| `060_cursorFrom_on_a_non_paged_kind...`, `030_ST_Q70l_non_paged_kind_continues_A` | new Q70l boundary: a nonpaged `match` no longer inherits the named entity-page read's view |

Seed **4949**: **800/800 random cases identical**, no refusals and no differences. Across both seeds: **1,793 cases**,
**1,773 identical**, **5 refused by both**, **15 explained differences**. These are deterministic finite probes, not
proof over arbitrary input streams. The additional reference-page probes were run after the saved seeded corpus was
defined; F15 is not concealed among its 15 expected changes.

## Source identity

[`hashes.3c52a1d.json`](results/cx-vo04h/hashes.3c52a1d.json) records **29/29 archive files matching the author's
`hashes.0.4.8.txt`**, with no missing or extra paths. The oracle's **13/13** self-reported source hashes match the actual
archive bytes after all plants were restored. `git archive` provenance binds those bytes to 3c52a1d.

`allSameOnVerifyO02` is deliberately **false**: this worktree still has the older oracle, with 14 files differing from
the reviewed archive. That is why no oracle execution used the worktree. This review does not merge implementation
files to make a four-way comparison appear green. Author/archive/self-report agreement is confirmed; worktree equality
is expressly not claimed.

## Reproduction entry points

The batch driver is [`rerun.py`](rerun.py). Its initial failed invocation and resumed invocation are preserved in
[`commands.json`](results/cx-vo04h/commands.json) and the two provenance receipts. The retained scratch root can be used
to reproduce the findings without checking out or editing the author branch. Use new output paths for another attempt:

```sh
node lab/bin/heavy.mjs --label CX-VO04H-plant-repeat -- \
  python3 -I lab/verify/O02/tools/plant_paged_kind.py \
  /private/tmp/CX-VO04H-2xsggws9/at3c52a1d /private/tmp/CX-VO04H-plant-repeat.json

node lab/bin/heavy.mjs --label CX-VO04H-page-repeat -- \
  python3 -I lab/verify/O02/V-O04h/probe_reference_page.py \
  /private/tmp/CX-VO04H-2xsggws9/at3c52a1d /private/tmp/CX-VO04H-page-repeat
```

Check at least 5 GiB host free space before a new admission. The saved first-failure receipts and scratch archives have
not been deleted.

## Refusal sites and remaining routes

There remain exactly **four X-NOT-MODELED raise sites** at the reviewed revision:

1. `entities.py:61`: incompatible decimal declarations / scale evolution — whole-case exit 2.
2. `run.py:53`: TDK1/order-key queries — whole-case exit 2.
3. `views.py:129`: unmodeled journal envelope facts — typed query error.
4. `run.py:677`: ambiguous continuation issuers — typed query error, parameterized for all three paged kinds.

The new integer validator is an ordinary malformed-input route, not a fifth semantic refusal site. Source inspection
finds the three existing `next*` producers in the table. `find`'s output contains pages but no external continuation
parameter/`next*` field, so it is not a fourth table entry. Scope-field kinds are the journal kinds, `assertions`,
`cutCatalog` and `history` without a cut; other reads use the cut's scope, as Q70k requires.

Routes needing explicit interpretation or further hardening:

- `cursorFrom` on a nonpaged kind now leaves that kind on its own read view. The new checked `match` row confirms this
  author choice; Q70l limits the continuation table to paged kinds, while Q70a's older wording says every `cursorFrom`.
- A `history` with a cut uses that cut's scope and ignores the top-level `scope`; Q70k expressly names only history without
  a cut. No additional continuation mechanism exists there.
- A new dynamically assembled `next*` output can evade completeness validation (F14); the table's membership alone
  does not settle that route.
- Reference page-selector typing is F15. Invalid reference shapes, out-of-range page selectors and explicit-null/negative-zero
  continuation values are additional malformation-boundary questions, not tested here; the narrow validator currently
  covers only the table's integer values and `snapshotPosition`.

## Final admission boundary

Do not pin 0.4.8 as satisfying Q70l until F14 is repaired and independently rechecked. Resolve F15's page-selector
validation under Q70m, or explicitly narrow that rule while retaining the observed crash as an open defect. This review does not qualify
performance, live engine behavior, the complete ten-goal scope, or production readiness. The reviewer changed only
verification tools, receipts and this report; the code under review remains unmodified.
