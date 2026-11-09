# V-O04i / CX-VO04I: O-REPLAY 0.4.9 independent re-check

Verdict: **ACCEPT — safe to pin O-REPLAY 0.4.9 at f195f30 in contract 0.3.11.**

No promotion-blocking findings. V-O04h F14 and F15 are repaired under Q70n and Q70o. The review found no
behavior change outside the two authorized areas; existing converter gaps remain as listed below.

North star: correctness floor for P1 pinned reads and P3 resumable continuation; no performance claim.
Scope, goals and procedure: main-checkout `CLAUDE.md`, `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`
and `lab/PROTOCOL.md`, read on 2026-11-08. Expected behavior: Q70a–o in the main-checkout
`lab/acceptance/RULINGS-PENDING.md`; a read-only input copy is retained in the supplemental evidence.

## Revision and execution boundary

- Reviewed: **f195f30**, `exp/O04b-oracle-0.4.2`, O-REPLAY **0.4.9**; parent **3c52a1d**, O-REPLAY **0.4.8**.
- Reviewer branch: `verify/O02`, starting at **f977e36**. Implementation files in this worktree remain unchanged.
- Both revisions were freshly extracted using `git archive` into **`/private/tmp/CX-VO04I-utlp61cs/`**.
  All oracle execution used those archives, including temporary planted-kind mutations, restored after every batch.
  No oracle execution used this worktree or the author's checkout.
- [`results/provenance.json`](results/provenance.json) binds the full commits, archive hashes, selected paths,
  verifier tools, Python version and disk observation. Scratch archives and complete generated corpora are retained.
- Heavy commands used the main checkout's `lab/bin/heavy.mjs` and waited for admission. Host free space exceeded
  5 GiB before admission. No engine, container, dependency installation or network service was used.

## Q70n: continuation completeness

The ordinary self-check passes **90/90**: HAM **18**, CFG8 **20**, EVT **23**, continuation execution **29**.
Every one of the 29 registered kinds reports four successful executions. The three deliberately unsupported
order-key names execute their shared refusal handler; this is not newly modeled key support.

The prior `plant_paged_kind.py` controls were rerun against the archive, together with two new valid output shapes.
Each valid plant is registered as `fakePaged`, omitted from `CONTINUATIONS`, and independently shown to emit its
`next*` key through the public CLI. The self-check exits **1**, status **FAIL**, specifically on
`continuation-runtime:fakePaged` in every case, while the other 29 continuation rows pass.

| Plant | Actual output shape | Observed field |
| --- | --- | --- |
| P1, prior literal control | OrderedOut with a literal pair | `nextPage` |
| P2, required computed key | `field = "next" + "Page"` | `nextPage` |
| P3, required cross-module helper | views handler calls an entities helper | `nextPage` |
| P4, required nested dictionary | OrderedOut containing a dictionary | `nextPage` |
| P5, new | `pages` array → dictionary → array → OrderedOut; null-valued continuation | `nextOffset` |
| P6, new | dictionary → tuple serialized as an array → dictionary → array → computed dictionary key | `nextToken` |

All six execute **4/4** generated cases with no execution errors and fail because their observed field lacks a table
entry. Two additional controls fail conservatively: P7 raises an ordinary input error for a missing fixture, and P8
returns an unserializable set. Each records **0/4** successful exercises and four errors. These deliberately invalid
plants do not claim valid CLI output. No source-pattern recognition is needed for any control.

Evidence: [`supplement-results/plant_paged_kind.json`](supplement-results/plant_paged_kind.json),
[`supplement-results/plant-artifacts/`](supplement-results/plant-artifacts/),
[`plant_paged_kind_plus.py`](plant_paged_kind_plus.py). Initial-attempt evidence is also retained under `results/`.

## Q70o: page selector and reference shape

The requested **`"0"`, `0.0`, `-2`, `true`, and out-of-range index 4** each produce **exit 2**, no output document,
and a malformed-case diagnostic. No traceback occurs. Valid integer indices **0** and **1**, and omitted `page`
(default zero), answer successfully. The in-range terminal page retains its no-continuation input error.

Additional malformed controls include null/array/object selectors, false, a fractional selector, an actual exponent
lexeme `1e0`, a 101-digit out-of-range integer, a 5,000-digit integer, null/array/string/boolean reference shapes,
a numeric or missing query id, and an unknown query id. All have the same typed-malformation outcome.
The large digit-limit control verifies the author's explicit `ValueError` translation.

Evidence: [`supplement-results/reference-page/summary.json`](supplement-results/reference-page/summary.json),
its individual input/error files, and [`probe_reference_page_plus.py`](probe_reference_page_plus.py).

## Fresh regression gates

| Gate | Fresh outcome |
| --- | --- |
| Unit suite | **385 tests, OK** |
| `--self-check` | **90/90**, all four sections pass |
| `probe_q52` | **74 MATCH, 2 OBSERVED** |
| `probe_q52 --self-test` | **33 WRONG-ANSWER, 1 REFUSES**; every planted alternative rejected |
| `probe_q49` | **85 MATCH** |
| `probe_q49 --self-test` | **15 WRONG-ANSWER** |
| `probe_035` | **119 MATCH** |
| `probe_035 --self-test` | **13 WRONG-ANSWER** |
| `probe_delta_033` | **20 MATCH** |
| Core converter | **49 vectors**; 317 AGREE, 19 AGREE-RULED, 2 VECTOR-BUG, 3 NOT-MODELED |
| QLever converter | **49 vectors**; 298 AGREE, 18 AGREE-RULED, 19 DISAGREE, 1 CONVERTER-ERROR, 2 VECTOR-BUG, 3 NOT-MODELED |
| Each lane versus the author's 0.4.8 converter results | **0 item-verdict differences, 0 vector-verdict differences** |

The QLever disagreements/error, vector bugs and unmodeled surfaces remain existing gaps. Converter exit zero does not
turn them into passes. `probe_035` retains the prior representation-only error-table comparison for
`E-DECIMAL-OVERFLOW` (phase list versus the text "preflight or execution"); its 119 semantic probes pass.

Commands, exact exits and captured stdout/stderr: [`results/commands.json`](results/commands.json) and
[`supplement-results/commands.json`](supplement-results/commands.json). Individual probe and converter JSON files
are under `results/`. Expected malformed differential replays intentionally exit 2; those are not harness failures.

## Differential against 0.4.8

| Corpus | Cases | Identical output | Both exit 2 | Differences |
| --- | --- | --- | --- | --- |
| Previous seed 49: 500 random plus the exact prior 493 probe/control/golden inputs | 993 | 979 | 14 | **0** |
| Previous seed 4949, random only | 800 | 800 | 0 | **0** |
| Total previous-seed corpus | **1,793** | **1,779** | **14** | **0** |
| Supplemental page/reference controls | 24 | 3 | 4 | **17**, all Q70o |

The prior 493 inputs were copied without changes and bound individually in
[`results/prior-corpus.json`](results/prior-corpus.json). Full seed reports:
[`seed49`](results/differential.seed49.json), [`seed4949`](results/differential.seed4949.json).
No random or existing golden/probe answer changed. Oracle identity/source metadata and `caseSha256` are excluded;
two exit-2 refusals compare equal without requiring identical diagnostic text.

The **17 supplemental differences** are each expected Q70o repairs. Every 0.4.9 replay below exits **2**, emits no
output document, and has no traceback. All old crashes exit **1** without an output document.

| Input label | 0.4.8 behavior | Explanation of 0.4.9 change |
| --- | --- | --- |
| `array-page` | TypeError from `int(list)` | Reject selector type before indexing |
| `array-ref` | TypeError indexing a list with a string | Reject reference shape |
| `boolean-ref` | TypeError subscripting bool | Reject reference shape |
| `boolean-true` | Exit 0; coerces true to index 1 | Reject boolean selector |
| `exponent-page` | ValueError parsing raw `1e0` | Require integer JSON lexeme |
| `false-page` | Exit 0; coerces false to index 0 | Reject boolean selector |
| `float-zero` | ValueError parsing raw `0.0` | Require integer JSON lexeme |
| `fractional-page` | ValueError parsing raw `0.5` | Require integer JSON lexeme |
| `huge-index` | IndexError converting to a native index | Check index range before indexing |
| `missing-query` | KeyError for `query` | Require textual query id |
| `negative-two` | Exit 0; accepts Python negative indexing | Require nonnegative index |
| `null-page` | TypeError from `int(None)` | Reject explicit null selector |
| `object-page` | TypeError from `int(Obj)` | Reject selector type |
| `out-of-range` | IndexError for index 4 | Check source page range |
| `over-digit-limit` | ValueError converting 5,000 digits | Translate conversion limit to malformed input |
| `string-ref` | TypeError indexing a string with a string | Reject reference shape |
| `string-zero` | Exit 0; coerces text to index 0 | Reject string selector |

The three unchanged valid controls are integer 0, integer 1 and omitted page. The four both-refused controls are
terminal page, null reference, numeric query id and unknown query id. The old null-reference refusal happened
later because the ignored reference left the query without the required cut; 0.4.9 rejects the reference directly.

The generic legacy differential classifier labels 16 rows `Q66b cursor` and the 5,000-digit row `unparsed` because
its own standard `json.loads` hits Python's digit limit. Inspection of the saved raw input and both CLI errors
classifies that row as Q70o too. There are **no unexplained differences**. Each changed case, both raw outputs
when one exists, exits and stderr are retained in
[`supplement-results/differential-details/`](supplement-results/differential-details/) and its command ledger.
The supplemental summary is [`differential.reference-page.json`](supplement-results/differential.reference-page.json).

The other authorized area is the self-check itself: the same HAM/CFG8/EVT sections remain 18/20/23; continuation
checks expand from **6/6 static/runtime rows at 0.4.8** to **29/29 registered-handler execution rows at 0.4.9**,
raising the total from **67 to 90**. Both were freshly executed in the supplemental batch, and only 0.4.9 detects
all required dynamic/nested plants. Version/source identity and the corresponding documentation/test changes
are expected metadata changes, not changed query answers.

## Refusal sites

There remain exactly **four semantic X-NOT-MODELED raise sites** at f195f30, unchanged apart from shifted line numbers:

1. `entities.py:61`: conflicting decimal declarations / scale evolution, whole-case exit 2.
2. `run.py:53`: TDK1/order-key queries, whole-case exit 2.
3. `views.py:129`: journal envelope facts the oracle does not model, typed query error.
4. `run.py:679`: continuation issuers with disagreeing views, typed query error for all three paged kinds.

The decimal, key and envelope routes are exercised by `probe_035`; ambiguous entity-page, journal and entity-journal
issuers are exercised by `probe_q52`. The new page/reference checks are malformed-input validation, not additional
semantic refusal sites. Source occurrence inventory: [`results/refusal-sites.json`](results/refusal-sites.json).

## Source binding

Recomputed **29/29** archive-file SHA-256s match
`/Users/sam/Claude/Projects/triplex-db-2/EXP-O04b-oracle-0.4.2/hashes.0.4.9.txt`.
There are no missing or extra oracle paths. The source comparison was repeated after all supplemental plants were
restored: **29/29** manifest matches, **13/13** self-reported source hashes matching actual bytes. All **87 output
documents per converter lane** report version **0.4.9** and those same 13 hashes.

Evidence: [`results/hashes.f195f30.json`](results/hashes.f195f30.json),
[`supplement-results/source-final.json`](supplement-results/source-final.json), and the copied author manifest.
The archive is bound to full commit **f195f30af618d3f9b0525a864e913824a315cc8c** by its git-archive provenance.

`allSameOnVerifyO02` remains **false**, deliberately: this worktree still has the older oracle and **15** files differ
from the reviewed archive. No implementation files were merged to make that comparison appear green. The reviewed
commit/archive, author manifest and self-reported source identity agree; worktree equality is not claimed.

## Attempts, reproduction and limits

The first heavy batch acquired its slot while the verifier was adding stronger assertions and extra lexical controls.
The original tool versions were restored byte-for-byte to their saved initial provenance hashes. Enhanced versions
are retained separately as `*_plus.py`; they ran after the first batch, with new output paths and
[`supplement-results/provenance.json`](supplement-results/provenance.json). Initial outputs were not overwritten.
There was no oracle fix or source revision between attempts.

The final artifact validation distinguishes emitted JSON from the four empty P7/P8 CLI stdout captures, and preserves
large numeric lexemes while parsing the 5,000-digit input. Its first generic scan stopped at an intentionally empty
negative-control capture; [`validation-attempt1.txt`](validation-attempt1.txt) retains that harness-only failure and
[`validation.txt`](validation.txt) records the corrected completed checks. No oracle evidence was overwritten.

The committed entry points are [`rerun.py`](rerun.py) and [`supplement.py`](supplement.py). From this worktree,
check host free space before a new admission, then use:

```sh
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-VO04I-repeat -- \
  python3 -I lab/verify/O02/V-O04i/rerun.py
```

The saved runner has fixed evidence paths and is retained as the exact executed source. For another attempt, copy the
review directory and select fresh output paths first. `supplement.py` reads the first batch's archive location from its
provenance receipt. The prior corpus source paths remain in [`results/prior-corpus.json`](results/prior-corpus.json).

This is finite regression and source-binding evidence for the requested oracle pin. It does not establish exhaustive
future query-branch coverage, complete golden-scenario correctness, live engine behavior, performance, ten-goal
completion or production readiness. No main-checkout edit, implementation fix, contract pin move, merge or push was done.
