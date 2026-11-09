# CX-VO06 round 2: O-REPLAY 0.5.0 independent review

**Verdict: FIX-FIRST.** The three round-1 implementation defects are fixed.
The pin is still blocked by five substantive legacy test-coverage gaps, under
this round's explicit requirement that untested rules block the pin. Twelve
missing names and the error-table discrepancy are bookkeeping/contract mapping
issues rather than missing semantic coverage. The full suite remains non-green.

North star: correctness floor for P1 reproducible cuts and P2 atomic, idempotent
receipts. Goals and targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`.
No performance claim. New semantics were reviewed against **R33 section 4.3**;
legacy behavior was assessed from the existing oracle rule ledger, accepted Q66/Q70
rulings and actual tests. No product core, adapter or RT01 source was read.

Builder head: `823f454a607d045616d274b4bcb978459d66fcb2`.
As requested, it was merged into `verify/O06` with local merge commit
`9272ac56` before rerunning. Baseline is exact Git commit
`4efe962e3faf79b3330973891b4533dae5f83704`. This report's commit is the
verification head. No changes to the implementation under review were authored.

## Fresh checks and disposition of the original findings

[Fresh audit](round2/evidence/audit.json),
[command receipts](round2/evidence/commands.json),
[22 probe results](round2/evidence/probes/results.json),
[raw inventory](round2/evidence/raw-inventory.json).

| Check | Fresh result |
| --- | --- |
| Original 22 authored probes | 22/22 match their original expectations; case bytes exactly match round 1 |
| Full unit suite | 398 tests; 17 named-coverage subtest failures plus one error-table failure |
| Authored fixtures | 14/14 expected outcomes, including nine failing controls |
| Selfcheck | PASS with the same two explicitly missing historical review fixtures |
| Old golden corpus, core | All 341 item identities/verdicts unchanged against a freshly executed 0.4.9 baseline |
| Old golden corpus, QLever | All 341 unchanged against a freshly executed 0.4.9 baseline |
| Updated corpus | All 331 other items unchanged on each lane; G9-CUT-02b ten AGREE items per lane |
| Golden provenance | All 522 baseline/current output documents match actual case bytes and exact runtime source hashes |
| Probe provenance | All 22 actual documents match their case bytes and exact current runtime hashes |
| Source/input stability | All pinned runtime, test, fixture, converter, historical selfcheck and corpus files unchanged across the attempt |
| Builder runner manifest | All listed SHA256SUMS entries match actual files |

The baseline oracle, golden corpus, machine contract, rulings and six selfcheck
inputs were restored directly from Git into a new evidence directory. No previous
builder output was substituted for a new oracle execution. The reused converter
is explicitly routed to each source/corpus; it runs the CLI as a subprocess.

- **Round-1 F1 closed:** raw cross-ordinal change JSON now omits the physical
  transaction's own recordedAt. Older distinct-transaction recordedAt and hydrated
  public changes remain intact.
- **Round-1 F2 closed:** committed and resolved unknown-to-committed receipts with
  receipt-only stagedAt both work; the new unit test also covers both clock-driven
  and engine-clock paths and a changed replay instant.
- **Round-1 F3 closed:** far-future finite query instants now produce typed
  E-BASIS-NOT-AVAILABLE, axis recordedAt. Actual receipt stamps remain bounded.
- The added Datomic integer-range boundary test executes successfully. This is
  oracle coverage only, not evidence of a live Datomic storage round trip.

All prior non-green golden classifications remain visible. Core: 317 AGREE,
19 AGREE-RULED, two VECTOR-BUG, three NOT-MODELED. QLever: 298 AGREE,
18 AGREE-RULED, 19 DISAGREE, one CONVERTER-ERROR, two VECTOR-BUG,
three NOT-MODELED. Regression equality does not qualify those gaps.

## How the coverage gaps were tested

A missing method name alone was not used to declare a rule untested. I read the
assertions in the relevant Erasure, ReferencePageInput, Visibility and SelfChecks
tests. For the doubtful clauses I also substituted deliberately wrong behavior
**in memory in separate Python processes**, then ran the complete existing
398-test suite for each substitution. No oracle file was edited.

[Coverage summary](round2/coverage/summary.json) records one unmodified suite run
and six diagnostic variants, with exact failure identities and zero unexpected
errors. All six variants retain exactly the same 18 baseline failures. Five
have discriminating witnesses showing incorrect behavior; those support the five
findings below. The sixth, ignoring the journal scope key, had a non-discriminating
witness and is **not** counted as a demonstrated behavioral gap in this review.
Its output is retained rather than silently replaced.

The subprocess-based malformed-page CLI tests load their original source and do
not inherit these in-memory substitutions. The tested substitutions concern the
in-process continuation/erasure tests; all those tests were included. Diagnostic
outputs are quarantined from qualification: their oracle source-hash fields name
the unchanged files, while the surrounding witness/result records identify the
in-memory variant and the coverage runner's captured source bytes.

## Each of the 18 disclosed failures

Here `T` means `lab/oracles/replay/tests/test_contract_section4.py`, `V` means
`tests/test_views.py`, and `S` means `tests/test_scale_and_selfcheck.py`, under
the same oracle directory. Names below identify real executed assertions rather
than proposed aliases.

| # | Disclosed failure | Semantic test and wrong behavior it catches, or remaining gap | Pin decision |
| --- | --- | --- | --- |
| 1 | ER-INFLIGHT-PREFIXES | `T:2121 Erasure.test_Q66a_inflight_prefixes_only` checks exact ordered alternatives for two and three erasures and a read starting after the first. Non-prefix subsets or missing prefixes change its exact expected list. | Bookkeeping only |
| 2 | ER-CURSOR-ERASURE-PREFIX | `T:2139 test_Q66b_cursor_continues_per_prefix` checks per-prefix page values, pinned position, an invariant second page, and no continuation beyond the last page. Recomputing at the latest erasure view fails. | Bookkeeping only |
| 3 | CONTRACT-Q70A | `T:2166 test_Q70a_continuation_answers_from_the_source_read` checks a plain source and an earlier continuation readStart; the erased value must not reappear and the result must stay plain. | Bookkeeping only |
| 4 | CONTRACT-Q70B | `T:2182 test_Q70b_literal_token_from_an_in_flight_read` checks literal tokens from an in-flight source, exact old/marker alternatives and disregard of the continuation's own start. | Bookkeeping only |
| 5 | CONTRACT-Q70C | `T:2209 test_Q70c_literal_token_from_a_plain_read` checks the plain-source literal-token case, requires the marker, and excludes the old value from serialized output. | Bookkeeping only |
| 6 | CONTRACT-Q70D | `T:2224 test_Q70f_ambiguous_literal_token`, especially lines 2239-2242, exercises identical-view duplicate issuers and requires continuation rather than refusal. Latest selection between identical views is observationally equivalent here; the different-page-body clause is assessed separately as Q70H. | Bookkeeping only for this clause |
| 7 | CONTRACT-Q70E | No existing assertion distinguishes issuing and nonissuing prefixes for one literal token. Returning a predicate that admits every prefix survives the entire suite. Primitive witness changes nonissuing=false to true. See F4. | **Blocks** |
| 8 | CONTRACT-Q70F | `T:2224 test_Q70f_ambiguous_literal_token` tests both issuer orders and requires typed X-NOT-MODELED for disagreeing views; equal-view controls also run. Choosing one literal issuer instead fails. | Bookkeeping only |
| 9 | CONTRACT-Q70G | `T:2244 test_Q70g_journal_pagination` checks in-flight journal after/next continuation, a nonissued after using its own view, and a plain source overriding an earlier continuation start. | Bookkeeping only |
| 10 | CONTRACT-Q70H | Duplicate-issuer tests use identical page bodies. Incorrectly treating different bodies as different views survives the suite; a different-limit/same-next witness wrongly refuses. See F5. | **Blocks** |
| 11 | CONTRACT-Q70I | Literal ambiguity is tested, journal ambiguity is not. A journal-only choice of the latest disagreeing issuer survives the suite and replaces the required ambiguity error with rows. See F6. | **Blocks** |
| 12 | CONTRACT-Q70J | `T:2266 test_Q70j_journal_read_scope` checks nondefault scope t with erasures on t and the default scope, then default-only erasure. It requires only t's prefixes. | Bookkeeping only |
| 13 | CONTRACT-Q70K | The journal scope test covers transactions, not the extension to other scope-bearing reads. Returning the default scope for those kinds survives the suite; assertions on scope t lose their required alternatives. See F7. | **Blocks** |
| 14 | CONTRACT-Q70L | `T:2286 test_Q70l_entity_journal_pages` covers positive continuation and a different snapshotPosition; it has no different-entity/scope control. Matching only snapshotPosition survives and wrongly attaches another entity's read view. See F8. | **Blocks, partially tested rule** |
| 15 | CONTRACT-Q70M | `T:2309 test_Q70m_typed_continuation_values` checks string, floating and negative after values, malformed beforePosition/snapshotPosition, and a valid integer continuation. Wrong shared numeric validation fails. | Bookkeeping only |
| 16 | CONTRACT-Q70N | `S:80 test_continuation_table_check_detects_a_missing_paged_kind`, `S:91 test_execution_detects_computed_cross_module_and_nested_plants`, and `test_unexercisable_kind_fails_closed` check actual execution, computed/cross-module/nested next keys, and inability to exercise a handler. | Bookkeeping only |
| 17 | CONTRACT-Q70O | `V:167 ReferencePageInput.test_reference_page_malformed_inputs_exit_two` checks actual CLI exit 2, no stdout and no traceback for invalid shapes/types/ranges. `V:192 test_reference_page_valid_indices_and_terminal_page` checks default/0/1 selectors and a terminal page. | Bookkeeping only |
| 18 | E-UNAVAILABLE-CUT absent from the machine contract | `V:72 Visibility.test_cut_validation` asserts the exact legacy id, ReadError tag and unavailable-cut reason for a future position. That rule is tested; this is a contract/error-table disagreement, not absent behavior coverage. Preserve it visibly for contract reconciliation. | Nonblocking under the task's coverage criterion |

Thus the missing exact-name mappings are **not uniformly bookkeeping**. The
five substantive gaps affect legacy R-ERA-6 continuation/read-view clauses
inherited from 0.4.9. No uncovered 0.5.0 rule was established by these failures:
R-CMD-3, R-RCP-7, R-JNL-5, R-RCP-9 and R-CUT-6 have the exercised positive,
negative and round-2 regression controls described above.

## Findings requiring tests before pinning

These are **test-coverage defects**, not assertions that the current implementations
of the five clauses are wrong. The actual builder implementation produces the
correct witness outputs. Each wrong diagnostic implementation still leaves the
full suite at the exact same 18 failures and zero errors. Merely adding method
aliases cannot distinguish those implementations.

### F4 — medium: Q70E's prefix issuance filter has no discriminating test

Test location: `lab/oracles/replay/tests/test_contract_section4.py:2182`.
Guard being protected: `lab/oracles/replay/run.py:662` and issuing predicate at
`:735`.

Reproduction: `round2_coverage.py` variant `Q70E-unfiltered-prefixes` retains
issuer selection but replaces its issuance predicate with always true. Existing
398 tests do not notice. A direct continuation-primitive witness has two source
answers, one issuing the literal token and one not; the second is wrongly
admitted. This witness is deliberately a primitive-level case, **not a claimed
public-query failure**: the current entity pages often issue identical tokens
across erasure prefixes, so the ordinary fixtures do not distinguish this guard.

Proposed fix: add a retained test with one issuing and one nonissuing/error/terminal
prefix and assert that only the issuing prefix is continued, for literal tokens
as well as cursorFrom where applicable. Do not alias an all-prefixes-issue test.

Evidence: [witness](round2/coverage/Q70E-unfiltered-prefixes.witness.json),
[suite result](round2/coverage/Q70E-unfiltered-prefixes.result.json).

### F5 — medium: Q70H's equal views with unequal page bodies are untested

Test location: `lab/oracles/replay/tests/test_contract_section4.py:2239`.
Implementation clause: `lab/oracles/replay/run.py:746`.

Reproduction: read transactions after=0/limit=2 and after=1/limit=1 at the same
view. Both issue next=2 but have different page bodies. Continuing after=2 must
work. A wrong issuer comparator that also compares bodies instead returns
X-NOT-MODELED. The complete existing suite has no extra failure under that
substitution; its equal-view issuers have identical bodies.

Proposed fix: add this different-limit/same-next control and require successful
continuation, paired with the existing disagreeing-view refusal controls.

Evidence: [witness](round2/coverage/Q70H-compare-page-bodies.witness.json),
[suite result](round2/coverage/Q70H-compare-page-bodies.result.json).

### F6 — medium: Q70I's ambiguous journal continuation is untested

Test location: `lab/oracles/replay/tests/test_contract_section4.py:2244`.
Implementation clause: `lab/oracles/replay/run.py:738`.

Reproduction: two transactions pages both issue next=1, one from an in-flight
read and one from a post-erasure read. Their views disagree. A new transactions
after=1 must return X-NOT-MODELED, message identifying ambiguous journal after.
A journal-only wrong branch that selects the latest issuer instead returns rows;
the literal-token ambiguity tests still pass and the suite adds no failures.

Proposed fix: add a same-journal-scope, disagreeing-view after/next refusal test
in both issuer orders, plus a separate other-scope after/next nonmatching control.
The latter was not established by my non-discriminating scope variant and must
use a fixture whose expected outputs actually differ.

Evidence: [witness](round2/coverage/Q70I-choose-ambiguous-journal.witness.json),
[suite result](round2/coverage/Q70I-choose-ambiguous-journal.result.json).

### F7 — medium: Q70K's non-journal read scopes are untested

Test location: `lab/oracles/replay/tests/test_contract_section4.py:2266`.
Implementation clause: `lab/oracles/replay/run.py:790`.

Reproduction: write and erase on scope t; issue assertions(scope=t) with readStart
before t's erasure. Correct output lists old and marked alternatives. A wrong
read_scope branch using the default scope for non-transactions scope-bearing
reads returns only the marked result. All existing 398 tests retain their exact
baseline failure set under this wrong branch.

Proposed fix: parameterize scope/readStart tests over transaction,
transactionByCommand, transactionsForEntity, journalFacts, assertions, cutCatalog
where observable, and history without a cut. Include erasure in the read scope
and an unrelated default scope; assert concrete values and alternatives for every
surface where erasure changes output.

Evidence: [witness](round2/coverage/Q70K-default-nonjournal-scope.witness.json),
[suite result](round2/coverage/Q70K-default-nonjournal-scope.result.json).

### F8 — medium: Q70L's entity/scope continuation key is only partly tested

Test location: `lab/oracles/replay/tests/test_contract_section4.py:2286`.
Implementation clause: `lab/oracles/replay/run.py:75`.

Reproduction: two entities share transactions at positions 1 and 2, then are
erased. An in-flight page for p1 issues nextBeforePosition=2. A post-erasure page
for q1 at the same snapshotPosition and beforePosition must use its own view.
A key that compares only snapshotPosition wrongly continues p1's in-flight view,
adding an old-value alternative to q1's answer. Existing positive/snapshot-change
tests do not detect removal of entity and scope from the matching key.

Proposed fix: add different-entity and different-scope noncontinuation controls
alongside the existing different-snapshot control. Check marker/old alternatives,
not just returned positions or counts.

Evidence: [witness](round2/coverage/Q70L-ignore-entity-scope-key.witness.json),
[suite result](round2/coverage/Q70L-ignore-entity-scope-key.result.json).

## PASS / verdict / receipt audit

No promotion PASS is issued. All results are offline and claim no engine slot.
Before committing, these are every authored location producing an assessment:

- `round2_run.py` routes the original probes and collects commands. It uses an
  exclusively created evidence directory; records actual start/end times, exits
  and log hashes; pins source, tests, corpus and six historical selfcheck inputs
  before execution and compares them afterward. Exit zero is recorded, not used
  alone as semantic acceptance.
- The reused `probes.py` evaluate callbacks compare actual parsed contents with
  unchanged authored expectations. New routing preserves round-1 receipts. The
  new audit also checks exact original case-byte equality and each output's case
  hash and all runtime module hashes. All 22 content predicates pass freshly.
- `round2_run.py` golden comparison/audit checks each exact (vector,item,verdict)
  triple against fresh Git-restored baseline executions, and every output's
  actual case/runtime binding. Migrated items and inherited disagreements remain
  separate. Baseline sources and raw cases/runs remain local with an inventory.
- `round2_coverage.py` stores each unmodified/mutated full unittest result and
  compares exact failure and error identities. A diagnostic process exit zero
  only means collection completed, never that its deliberately wrong rule passed
  semantics. Witnesses retain concrete before/after content. Five visibly change;
  the sixth is explicitly inconclusive and not used as a finding.
- The coverage runner pins its own script and underlying oracle/tests before
  execution and confirms no file changed. Each variant runs in a fresh subprocess
  with its explicit mutation identity; logs and result files use distinct paths.
  In-memory diagnostics are not accepted as source-only oracle qualification
  receipts. They are bound by the variant definition and script/source inventory.
- `VERIFY-round2.md` FIX-FIRST follows the current source-bound successful fix
  checks and the demonstrated limitations of existing semantic assertions. It
  does not infer that an existing implementation is wrong from a missing name.

## Execution record and limits

All heavy runs used `lab/bin/heavy.mjs` with CX-VO06 labels and more than 5 GiB
host free space. No engine slots, services or containers were used. The first
coverage-run attempt stopped on an unused helper import before executing tests;
its log is preserved as `round2/coverage-attempt1.log`. The corrected attempt
uses `coverage-attempt2.log` and fresh output paths. No failed evidence was erased.

The review tools and evidence are under `lab/verify/O06/`. The requested merge
brought the builder's files into this branch; no main-checkout files were changed,
no subagents were spawned, and nothing was pushed or merged into main.

Not done: implementing the missing semantic tests in the builder suite, resolving
the 12 other named mappings or the legacy error-table disagreement, product or
adapter inspection, live publication/deadline timing, engine route equivalence,
performance qualification, deployment or contract pin changes. The broader
inherited golden disagreements are outside this targeted review.

No spec clarification is needed to reproduce the five missing guards. The next
step is retained behavioral tests that distinguish the wrong variants, followed
by independent reruns; adding empty/name-only aliases would not satisfy the
user's pin criterion.
