# Acceptance contract 0.3.11 — independent review CX-VA01-0311

**Verdict: FIX-FIRST.** Reviewed `contract/0.3.11` at `36d74348df2dd224ec15e29856a04a4e8daa4a30`, from branch `verify/A01-0311`. The requested rules are present verbatim, regeneration is identical, and the O-REPLAY pin is correct. Four defects remain: the reference comparator rejects real oracle result objects and Unicode rows, the composition schema still excludes Datomic, and Q76c's required capability-matrix record is absent. No contract or implementation under review was changed.

North star: correctness floor for P1 exact pinned answers, P3 continuation and maintained publication, and equal correctness obligations for lane D. Goals and targets come from `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`; procedure from `lab/PROTOCOL.md`.

## Findings

### F1 — P1: Q75g handles synthetic arrays, but rejects actual O-REPLAY row-result objects

Location: `lab/acceptance/build_contract.py:1629` (recursive call at 1631; array-only branches at 1643–1648).

The new replay handling passes the entire `queries[i].result` to the row comparator. O-REPLAY 0.4.9 actually returns an aggregate result as `{cut, rows}` (`lab/oracles/replay/views.py:707`), rather than a bare array. The comparator requires a list and returns false even for identical expected and observed answers. `match` returns a different object containing `raw` and `snapshot`, and has the same problem. Consequently, adding the outer replay-object handling does not make real row-result cases comparable as Q75g requires.

Reproduction: `python3 -I -B lab/verify/A01/regressions_review0311.py ReviewRegressions.test_q75g_actual_oracle_aggregate_answer`. This invokes the pinned oracle's real CLI on one integer assertion and one SUM query. The oracle exits 0, reports a total of `2`, and the canonical answer compared with itself under CMP-BAG-ROWS returns false. Input and answer: [replay-aggregate-input.json](replay-aggregate-input.json), [replay-aggregate-answer.json](replay-aggregate-answer.json). Failure: [regressions-review0311-final.txt](regressions-review0311-final.txt).

Proposed fix: define and implement the row-bearing payload projection for supported O-REPLAY result shapes, preserving cut/basis and other metadata exactly. Apply the declared comparator to the rows and to each in-flight acceptable result under that same shape contract. Add positive tests driven by the actual oracle, plus a row-reordering positive control and a changed-cut negative control. If any shape is intentionally unsupported, describe the refusal explicitly rather than claiming that all query results are handled.

### F2 — P2: recursive comparison rejects identical non-ASCII rows

Location: `lab/acceptance/build_contract.py:1620` and 1631.

The recursive serialization uses `json.dumps` with its default `ensure_ascii=True`. `_canon` at line 1611 requires the UTF-8 form produced with `ensure_ascii=False`. A canonical outer replay answer containing `[['café']]` reaches a recursive call with `[["caf\u00e9"]]`, fails the canonical-byte check, and compares unequal to itself. This is independent of F1: it fails even with the synthetic bare-array shape used by the builder's positive fixtures.

Reproduction: the three `test_q75g_unicode_*` tests in [regressions_review0311.py](regressions_review0311.py), covering direct rows, in-flight rows and nested typed string values, all fail. ASCII controls pass. The same problem affects SET, BAG and ORDERED row comparators.

Proposed fix: retain decoded values for recursive comparison, or use the same canonical UTF-8 serialization as `_canon` at every recursive boundary. Keep the three Unicode regressions.

### F3 — P2: lane D is registered, but the authoritative composition/receipt fields still exclude it

Location: `lab/acceptance/build_contract.py:2145` and 3144.

`composition.engines` still says `each assignment is XTDB or QLever`; `receiptSchema.fields.composition` still enumerates `engine: xtdb | qlever`. Both strings are emitted into the sole evaluator authority, `obligations.json`, and the first also enters the new O-CONTRACT projection. They conflict with SCOPE's lane-D treatment and with the newly registered Datomic image, A0, obligations and surface. The executable `composition_ok` does not enforce those old strings, so this is an inconsistent contract definition, not a demonstrated Datomic execution failure.

Reproduction: `test_q78_composition_schema_allows_datomic` fails on `composition.engines`; inspection also confirms the receipt field omission. See [audit.json](audit.json) for the successful 153-obligation/null-image checks, which do not cure this schema inconsistency.

Proposed fix: include Datomic in both composition definitions and regenerate the projection and other outputs, keeping the Datomic image and A0 pins null. Add a composition-schema consistency check without weakening any X/Q requirement.

### F4 — P2: Q76c is copied as a rule, but its promised capability-matrix defect record is missing

Location: `lab/acceptance/build_contract.py:1036` (matrix row 35) and 5608 (Q76c).

Q76c explicitly says the core SQL `compileRecursiveCTE` tail-constraint defect is recorded in the capability matrix. Neither generated `capabilityMatrix` nor `knownLimits` records it. Row 35 only retains KL-X4, which describes XTDB's absence of native recursive queries; it is not the core compiler's dropped-constraint defect. The matrix cells and known limits were left unchanged while the ruling was marked compiled. A literal copy in `recursionRules.Q76c` and a future named case do not supply the promised record.

Reproduction: `test_q76c_matrix_records_ignored_tail_constraint_defect` fails; inspect matrix row 35 and `knownLimits` in the generated authority or [capability-matrix.md](../../acceptance/capability-matrix.md).

Proposed fix: add a clearly scoped capability-matrix note/known-limit entry for that compiler defect, stating typed refusal when a lane cannot preserve the constraint and the condition for requiring the fix. Do not imply that current XTDB/QLever paths use this compiler, and do not turn an out-of-lane historical defect into a new universal engine failure.

## Required checks and evidence

| Check | Result | Evidence |
| --- | --- | --- |
| `python3 -I -B lab/acceptance/build_contract.py --verify` | PASS at start and end; all six outputs identical | [verify.txt](verify.txt), [verify-final.txt](verify-final.txt) |
| Source ruling text vs generated carrier | 50/50 identical rule texts; no missing rows | [audit.json](audit.json), ledger below |
| O-REPLAY 0.4.9 external hashes | 29/29 match contract, worktree and pinned-commit blobs | [audit.json](audit.json), [source hash table](hashes.0.4.9-source.txt) |
| Supplied `negtest0311.py` | PASS: 338/338 runnable mutations caught, 0 misses; 81 retired anchors excluded from passing denominator | [negtest0311.txt](negtest0311.txt) |
| Supplied `q47d_test0311.py` | PASS, including byte-identical restoration | [q47d_test0311.txt](q47d_test0311.txt) |
| Independent regressions | 35 tests: 29 pass, 6 fail, corresponding to F1–F4 | [test source](regressions_review0311.py), [final output](regressions-review0311-final.txt) |
| Lane D applicability/blocking | 153/153 carry `image-unpinned:datomic`; 0 closable | [audit.json](audit.json) |
| Existing X/Q matrix cells | All 51 rows' old cells identical | [audit.json](audit.json) |

Generated transitive contract hash: `52a5ce525172ea1a786fe3da3490d94dbff408fd81dfe929b7e239d49d7d0c0b`. Tested generator SHA-256: `512ef4c1da9e185771bcb94d6fc4680c349a52da37168048fe706a28b5a5cf7e`.

External hash-table source: `/Users/sam/Claude/Projects/triplex-db-2/EXP-O04b-oracle-0.4.2/hashes.0.4.9.txt`, SHA-256 `357d747af267eee5863033288143d5f18952e21a43d2038b68258384a3aab322`. Pin: version `0.4.9`, commit `f195f30af618d3f9b0525a864e913824a315cc8c`, verifier `V-O04i`. This review confirms the 29 file identities; it does not re-certify the oracle's full test suite or every continuation behavior.

All heavy runs used `lab/bin/heavy.mjs`; host disk free recorded in [review-start.json](review-start.json) was 29,134,094,336 bytes, above 5 GiB. Python 3.14.6; Node v22.23.2. Supplied mutation suites ran in a disposable copy, because they write pending/generated files and temporary generator mutants. The actual worktree's contract stayed untouched. [run_supplied_suites.py](run_supplied_suites.py) recreates a source-bound copy at the reviewed commit and reruns the supplied suites; invoke it through heavy.mjs. [review_audit.py](review_audit.py) regenerates the independent audit, without writing contract files.

First-attempt evidence is retained. The first disposable copy included `lab/` but omitted referenced files in `qualification/` and `packages/`; Q47d correctly detected a restoration difference from those missing hashes. That was a review-fixture error, not a contract finding. The copy was completed with the referenced files and verified byte-identical before the final suite runs. The first four own CLI tests also used an incorrect case format; that weak probe was corrected, and all four pass with the correct `triplex-db-2/o-replay-case/1` format. Initial logs are explicitly named `*-initial-*`; none count as final semantic evidence.

## Ruling-by-ruling semantic ledger

Each carrier below is a JSON path in `obligations.json`; `.<id>` means the row keyed by the first column. All 50 `rulings[]` entries also point to their corresponding carrier. [audit.json](audit.json) records the full text and equality result separately for every row. Q74a/b/g change only their basis labels from “open question” to “design item”; their rule text is unchanged.

“Equal” means the generated rule says what the source ruling says. It does not claim the separate evaluator, seeder, recursion implementation or gateway has executed that requirement. Q70 cases are additionally selected by `G10.cursor.continuation-transitions`; Q76/Q77 by `G3.recursion.read-only-frontier`; Q79 by `G10.native.read-only-and-safe-params`. Their manifests remain null rather than representing executing gates.

| Ruling | Generated carrier | Meaning / assessment |
| --- | --- | --- |
| Q70a | `continuationRules.Q70a` | Equal: source start/scope/prefixes, including no in-flight commits; never continuation readStart. |
| Q70b | `continuationRules.Q70b` | Equal: literal issued token follows source prefixes; unknown token uses own view, refined by c. |
| Q70c | `continuationRules.Q70c` | Equal: matching literal tokens from any earlier issuing read continue its view. |
| Q70d | `continuationRules.Q70d` | Equal: latest identical-view issuer in case order, with f/h refinements. |
| Q70e | `continuationRules.Q70e` | Equal: omit prefixes that did not issue the token. |
| Q70f | `continuationRules.Q70f` | Equal: disagreeing issuers refuse typed X-NOT-MODELED; dynamic refusal also retained. |
| Q70g | `continuationRules.Q70g` | Equal: journal after follows an earlier page's start/prefixes. |
| Q70h | `continuationRules.Q70h` | Equal: issuer equality uses view, not page body. |
| Q70i | `continuationRules.Q70i` | Equal: journal ambiguity refuses; matching requires same scope. |
| Q70j | `continuationRules.Q70j` | Equal: transactions uses its own read scope for in-flight erasure. |
| Q70k | `continuationRules.Q70k` | Equal: all eight named read-scope kinds included; others use cut scope. |
| Q70l | `continuationRules.Q70l` | Equal: all three paged kinds, matching keys, common continuation rule and completeness self-check. |
| Q70m | `continuationRules.Q70m` | Equal: JSON integer continuation values; malformed cases exit 2. Own CLI probes pass. |
| Q70n | `continuationRules.Q70n` | Equal: execute every registered kind; inspect nested outputs; unexercisable kinds fail conservatively. |
| Q70o | `continuationRules.Q70o` | Equal: page selector integer/in-range, malformed references become input errors. Own CLI probe passes. |
| Q74a | `seedRules.Q74a`, load-contract `seedRules` | Equal: clone only screening/development, full golden identity, fresh acceptance seed. |
| Q74b | `seedRules.Q74b`, load-contract `seedRules` | Equal: settled finish-block/zero jobs/empty live index, fresh arms settle alike, no old/new A0 mixing. |
| Q74c | `seedRules.Q74c`, load-contract `seedRules` | Equal: E1 first, PAIR-0 and both 1.10/1.15 ratios, seven predictions. |
| Q74d | `seedRules.Q74d`, load-contract `seedRules` | Equal: docker-exec readiness plus C1–C8, common warm-up. |
| Q74e | `seedRules.Q74e`, load-contract `seedRules` | Equal: fixed-trace-time finish-block in every P1 window on every arm. |
| Q74f | `seedRules.Q74f`, load-contract `seedRules` | Equal: post-copy 5 GiB floor and per-run clone removal; historical rung quantities retained as source text. |
| Q74g | `seedRules.Q74g`, load-contract `seedRules` | Equal: broker directory and engine volume from the same stopped moment. |
| Q75a | `qualificationRun.integrity.Q75a` | Equal: start-of-run git-blob checks, replacement objects off, poisoned state, in-run restore explicitly unprotected. |
| Q75b | `qualificationRun.integrity.Q75b` | Equal: all trusted bytes copied before candidate execution; tree-entry object-id check. |
| Q75c | `qualificationRun.integrity.Q75c`, `oracleRunners`, `closability` | Equal: complete runner-file hashes, including COMPILED. Missing/partial/invalid maps refuse in own probes. O-CONTRACT source + projection pinned; O-ERR stays blocked. |
| Q75d | `qualificationRun.integrity.Q75d` | Equal: resolved binary path/hash/version and pinned child PATH. |
| Q75e | `qualificationRun.integrity.Q75e` | Equal: lstat, reject escaping links, modes bound, unapplied config unbound. |
| Q75f | `qualificationRun.integrity.Q75f` | Equal: fresh HOME/TMPDIR per child. No child environment behavior certified here. |
| Q75g | `qualificationRun.integrity.Q75g`, `oracleAnswerRule`, reference function | Text equal; implementation incomplete/over-restrictive: real result objects and Unicode fail (F1/F2). State and command exactness, ASCII list reorder and prefix-identity controls pass. |
| Q75h | `qualificationRun.integrity.Q75h`, reference CMP-ERROR | Equal: cause optional, structured tag/message if present. Own positive/negative controls pass. |
| Q75i | `qualificationRun.integrity.Q75i`, `claimAdmission`, reference admission | Equal: evidence deletion/end checks/GATE-NOT-RUN and promotion diagnostic; own promotion early-refusal probe passes. Evaluator execution remains separately gated. |
| Q75j | `qualificationRun.integrity.Q75j`, `qualificationRun.unprotected` | Equal: all five limitations listed, double-fork cleanup corrected, canonical-value comparator naming and /1-only hash equality preserved. |
| Q76a | `recursionRules.Q76a` | Equal: XTDB 1M/QLever 100k typed defaults; cheaper rounds remain later P4 work. |
| Q76b | `recursionRules.Q76b` | Equal: stop creating tx_query_relations in C8 follow-up after V-C8. |
| Q76c | `recursionRules.Q76c`, selected recursion case | Text equal, compilation incomplete/weaker in matrix: promised defect record absent (F4). |
| Q76d | `recursionRules.Q76d` | Equal: general countSimplePaths WL20 supports on both original lanes. |
| Q76e | `recursionRules.Q76e` | Equal: maintained publication from P3 consumer only; direct answers until consumer exists. |
| Q76f | `recursionRules.Q76f` | Equal: exclusive XTDB G1/G2 rerun after V-X02; overloaded-dev receipts diagnostic. |
| Q77a | `recursionRules.Q77a` | Equal: exact maxRounds/maxVisited enforcement or typed rejection; maxDepth retains Datalog meaning. |
| Q77b | `recursionRules.Q77b` | Equal: iterative DAG DP/explicit cyclic stack, typed pathSteps refusal. |
| Q77c | `recursionRules.Q77c` | Equal: unknown operations count write/refuse; prepared/portal classification survives reset; Execute counted. |
| Q78a | `datomicRules.Q78a`, lane/image/A0 registry | Row equal: Pro 1.0.7745, Java17+, dev-storage stage, artifact cross-checks, no repair track. Global schema addition incomplete (F3); image remains null. |
| Q78b | `datomicRules.Q78b` | Equal: 2.75 GiB resident, only orchestrator parks, no overlapping exclusive slot. No lifecycle actions performed. |
| Q78c | `datomicRules.Q78c`, language/entrypoint rules | Equal: tagged HTTP/JSON Peer gateway and function allowlist; rejected wire alternatives retained. |
| Q78d | `datomicRules.Q78d` | Equal: per-scope database, fact entities/live bit, transaction metadata, as-of/d-with and one CAS per entity. |
| Q79a | `exactQueryRules.Q79a` | Equal: shared comment-aware tokens, quantified bare operands, preserved ALL/subqueries and public-provider tests. |
| Q79b | `exactQueryRules.Q79b` | Equal: Fail rather than Die, catchTag recovery, both XTDB languages. |
| Q79c | `exactQueryRules.Q79c` | Equal: five exact operators and downstream never DECIMAL→BIGINT; exact text or typed refusal for every compiler-using lane. |
| Q79d | `exactQueryRules.Q79d` | Equal: unset language switch keeps main behavior; changing default needs qualification/ruling. |
| Q81a | `qualificationRun.integrity.Q81a` | Equal: final present/same-byte checks on every issued case input, INPUT-TAMPERED on deletion/rewrite. Own generated-rule probe passes. |

No new rule text is missing or stronger than its source. The specific incomplete/over-restrictive implementations and schema contradictions above prevent acceptance despite text equality.

## Lane D and preservation of X/Q meaning

There are 157 distinct obligations. Datomic applies to 153; every one has `image-unpinned:datomic`, its image/imageId are null, and `A0-DATOMIC` is null. All obligations previously applying to all three X/Q surfaces now also apply to D. The only four exclusions are backend-specific:

- `G1.wire.xtdb-encodings` — XTDB wire encoding.
- `G1.wire.qlever-shadow` — QLever lexical/typed shadow protocol.
- `G7.broker.fence-and-epochs` — the QLever-specific broker fence.
- `G8.maintenance.bounded-boundaries` — QLever's maintenance-boundary implementation.

`G4.neg.correlated-not-exists-raw` also extends to D, while QLever retains RX-Q29. D has no borrowed raw exception. Language accounting includes Datalog query and pull as `datomic-datalog`; P1/P4/P5 run per surface and P2/P3 per engine. F3 prevents saying that every cross-cutting contract field is fully updated.

Compared with `fcbad6e`'s 0.3.10 authority, all 157 obligation IDs and all old-surface memberships are unchanged. Only four obligations have non-hash/status/lane field differences: three gain the named cases for the requested rulings (recursion, continuation, safe-native-query), and the raw correlated-negation title/statement expands to D without changing X/Q's expected `two` or QLever's exception. All 51 rows' X/Q matrix cells are identical. The intentional global changes are mandatory runner maps (Q75c), replay comparison (Q75g/h), and the accepted oracle-pin/refusal-scope update; the faulty Q75g implementation is explicitly reported rather than described as unchanged behavior.

## Still pending

The reviewed authority lists exactly 13 rows, with authority `none`; no row appears both pending and compiled:

| Rows | Why not compiled in 0.3.11 |
| --- | --- |
| Q51b | Existing experiment direction, expressly retained without contract effect; related P2B direction already present. |
| Q72a, Q72b, Q72c, Q72d, Q72e, Q72g | Broker follow-up outside this dispatch's requested compilation set; prior review/implementation follow-up still pending. Q72f was already compiled in 0.3.10. |
| Q73a, Q73b | W0-1.1.3 changes have not been accepted/pinned here; authority still uses W0-1.1.2. |
| Q78e | Storage-layer tenancy and final dev-storage acceptance require Sam's decisions. Do not infer approval from the per-scope database mapping. |
| Q80a, Q80b, Q80c | O-OBS follow-up not accepted/pinned here; outside this compilation set. |

The live main-checkout pending file advanced beyond the reviewed commit. The captured [source snapshot](RULINGS-PENDING-source-snapshot.md) additionally contains Q81b/c (counter/default-off fixes), Q82a–e (R27 observer trust/format requirements), and Q83a–c (R30 freeze protocol). These ten rows were not requested by this dispatch and did not exist as pending rows in the reviewed contract. They require a later authorized compilation, including reconciliation of Q83b's newer two-finish-block definition with Q74b. They do not retroactively alter 0.3.11's pinned pending-file hash. The snapshot also retains the 50 selected source rows because main had not adopted this contract branch.

## Limits and handoff

No engine/container lifecycle, package install, pnpm check, benchmark, package build, evaluator integration qualification, full O-REPLAY suite, or live Datomic qualification was performed. No code under review was fixed, no main-checkout files were edited, and nothing was merged or pushed. Only reviewer scripts, fixtures, source snapshots, logs and this report are committed under `lab/verify/A01/`.

`git diff --exit-code HEAD -- lab/acceptance lab/oracles` confirmed no changes to the reviewed contract/oracle tree. The unstaged `git diff --check` passed; after staging the new evidence it reported two trailing spaces emitted by the supplied Q47d suite, one in each retained raw transcript. Those transcripts are preserved verbatim; there are no source/report whitespace errors. The disposable copy was removed after all suite processes exited. [verification-status.json](verification-status.json) records the final denominators and [SHA256SUMS](SHA256SUMS) hashes the retained review artifacts.

Builder handoff: fix F1–F4, regenerate the contract, keep null pins and pending authority intact, rerun the supplied suites and the independent regressions, then request an independent delta review. There is no missing user decision needed to repair these four compilation/reference issues; Q78e remains a separate policy question.
