# EXP-O06 — O-REPLAY 0.5.0, fix round 3

North star: correctness for P1 reproducible read views and P2 receipt/continuation
consistency. Goals/targets remain `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and
`lab/TARGETS.md`. Builder CX-O06, branch `exp/O06-oracle-record-time`, starting
head `823f454a607d045616d274b4bcb978459d66fcb2`. The commit containing this report
is the round-3 head. Builder regression evidence, not independent promotion.

Read CX-VO06's read-only VERIFY-round2.md, coverage/summary.json, and retained
coverage runner at verify/O06 `4150c11`. Specification reads remain R33 4.3 and
the authorized Q70 rows of the main-checkout RULINGS.md. No product, adapter,
packages/core or RT01 source was read. Runtime oracle semantics are unchanged.

## Mapping corrections

`tests/test_contract_section4.py:CONTRACT_TEST_MAPPINGS` now maps contract ids to
actual discovered behavioral tests; coverage validates every referenced callable.
No name-only aliases or empty tests were added. The five real gaps map to the new
`tests/test_q70_coverage.py` methods described below. The thirteen bookkeeping or
contract-mapping corrections are:

| Disclosed issue | Executed behavioral mapping |
| --- | --- |
| ER-INFLIGHT-PREFIXES | Erasure.test_Q66a_inflight_prefixes_only |
| ER-CURSOR-ERASURE-PREFIX | Erasure.test_Q66b_cursor_continues_per_prefix |
| CONTRACT-Q70A | Erasure.test_Q70a_continuation_answers_from_the_source_read |
| CONTRACT-Q70B | Erasure.test_Q70b_literal_token_from_an_in_flight_read |
| CONTRACT-Q70C | Erasure.test_Q70c_literal_token_from_a_plain_read |
| CONTRACT-Q70D | Erasure.test_Q70f_ambiguous_literal_token, identical-view controls |
| CONTRACT-Q70F | Erasure.test_Q70f_ambiguous_literal_token, disagreeing-view controls |
| CONTRACT-Q70G | Erasure.test_Q70g_journal_pagination |
| CONTRACT-Q70J | Erasure.test_Q70j_journal_read_scope |
| CONTRACT-Q70M | Erasure.test_Q70m_typed_continuation_values |
| CONTRACT-Q70N | SelfChecks: missing-kind, computed/cross-module/nested output, and unexercisable-kind tests |
| CONTRACT-Q70O | ReferencePageInput: malformed CLI selectors and valid/default/terminal selector tests |
| E-UNAVAILABLE-CUT mismatch | Visibility.test_cut_validation plus exact legacy error-table tuple mapping |

The error-table coverage test explicitly requires that the **only** oracle id
outside the machine contract be E-UNAVAILABLE-CUT, and checks its exact ReadError /
unavailable-cut / preflight tuple and the real future-position test. The
PRODUCED-subset assertion has its own subtest. This preserves the legacy behavior
while making its compatibility mapping explicit. The machine contract was not
edited: that known discrepancy remains documented, not silently normalized into
a different query error. Any additional unmapped error still fails coverage.

## Five substantive coverage gaps closed

Seven authored JSON fixture files live under `round3/fixtures/`. Expected values
are written in the test assertions, never generated from the implementation.

| Rule / new test | Distinguishing fixture and assertions |
| --- | --- |
| Q70E_only_issuing_prefixes | Primitive-level source with issuing, terminal and error prefixes. Assert exact [true,false,false] predicate results and the continued prefix set. This deliberately claims primitive coverage, not a public-page failure. |
| Q70H_equal_view_different_bodies | transactions(after=0,limit=2) and (after=1,limit=1) issue next=2 with unequal bodies at one view. Continuation must return erasure position 3, not an ambiguity refusal. |
| Q70I_journal_ambiguity_and_scope | Same-scope disagreeing journal issuers refuse with typed X-NOT-MODELED and ambiguous-journal message in both issuer orders. Separate scope control requires t's own old/marker alternatives rather than inheriting s's plain view. |
| Q70K_scope_on_every_scope_surface | transactions, transaction, transactionByCommand, transactionsForEntity, journalFacts, assertions and history-without-cut show only t's exact old/marker prefixes, with/without unrelated default-scope erasure. Default-only erasure contributes no t alternatives. cutCatalog is value-invariant, so test its exact t command/position content and the captured read-record scope. |
| Q70L_entity_and_scope_key | A different entity must keep its plain marker-only view. A different scope must keep its own in-flight old/marker view. Existing Erasure.test_Q70l_entity_journal_pages remains mapped for positive continuation and different-snapshot controls. |

`round3/reviewer/coverage.original.py` is the exact reviewer variant runner copy;
`summary.original.json` retains its original surviving-variant findings.
`round3/mutations.py` executes only that runner's definitions, applies each exact
in-memory substitution in a separate process, and runs the complete current suite.
No oracle source file is changed. All diagnostic records explicitly identify
in-memory substitutions; their unchanged runtime-file hashes are not represented
as identities for the substituted implementation.

The five demonstrated surviving variants are now caught by the corresponding new
fixture tests. The reviewer's sixth, previously non-discriminating scope variant
is also caught by the new Q70I other-scope fixture. Mutation results and raw test
logs identify each failing test; gates require nonempty expected-target failures,
zero errors, 403 executed tests and no unrelated failures (K may additionally
fail the related L own-scope control). An expected test failure
here is evidence that a deliberately wrong variant is rejected, not a suite PASS.

## Fresh gates and provenance

Preflight host free space: 16,102,764 KiB (>5 GiB). All suites, fingerprints,
variant trials and seals run through lab/bin/heavy.mjs; no engine slot is used.

The initial unit attempt (`round3/unit-attempt1.log`) exposed two errors in the
new cutCatalog assertion, which initially expected an object instead of the
actual list. That assertion was corrected before the final source-bound attempt;
the first log is retained. It was a new test error, not an oracle behavior change.

The first combined gate attempt retained green unmodified results and caught E/H,
then stopped because the Q70I wrong variant triggered a KeyError in the new test
instead of an assertion failure. Added presence assertions for expected error
and alternative fields so wrong outputs yield clean unittest failures. The failed
attempt and raw mutant log remain under evidence-attempt1; no artifact was adopted
as a final PASS.

The second combined attempt retained a green unmodified suite and caught E/H/I
and the journal-scope control. It stopped because the gate expected K-only
failures, while the wrong K scope selector correctly also fails L's own-scope
control. That related detection is now explicitly allowed, with a required K
failure and no unrelated failures. Its logs are retained. The primitive E fixture
also uses properly shaped ordered erasure-prefix identities.

Final attempt: `round3/evidence-attempt3/`:

| Gate | Result |
| --- | --- |
| Unmodified full suite | 403 tests, OK, zero failures/errors |
| Wrong variants | All six caught by intended new rule tests; zero unexpected errors |
| Original 22 review probes | 22/22 authored content expectations match |
| Existing fixture suite | 14/14 expected verdicts, including nine failing controls |
| Selfcheck | PASS, retaining its two explicitly absent historical review fixtures |
| Legacy golden, core and QLever | All 341 item identities/verdicts unchanged per lane |
| Migrated golden | All 331 other items unchanged; G9-CUT-02b 10/10 AGREE per lane |
| Golden provenance | 348 actual output documents match actual generated case bytes and all 14 runtime module hashes |
| Probe provenance | All 22 generated case byte strings equal the copied reviewer cases; actual reports bind their case/runtime hashes |
| Executable manifest | SHA256SUMS updated for oracle, tests, authored runners and the executed reviewer variant definitions |
| Whitespace | git diff --check clean |

No undisclosed or remaining unit failures. The documented legacy error id is an
explicit compatibility mapping; the two missing historical selfcheck review
fixtures and inherited golden gaps remain outside this test-coverage closure.
Core golden counts remain 317 AGREE, 19 AGREE-RULED, two VECTOR-BUG and three
NOT-MODELED. QLever remains 298 AGREE, 18 AGREE-RULED, 19 DISAGREE, one
CONVERTER-ERROR, two VECTOR-BUG and three NOT-MODELED. Regression equality does
not turn those classifications into semantic acceptance.

`commands.json` records exact subprocesses, environments, times, exits and log
hashes. `inputs.json` pins source, tests, new and old fixtures, reviewer definitions,
corpora, historical baseline expectations and six selfcheck inputs before execution;
the gate checks the bytes unchanged afterward. Baseline expectation documents are
explicitly historical 0.4.9 artifacts, hash-bound in the comparisons; this builder
round does not claim a fresh baseline execution. CX-VO06's preceding review ran
an exact Git-restored 0.4.9 baseline and found the same 341 triples.

`audit.json` contains current comparisons, caught-variant results and raw output
bindings. `finalize.py` writes `seal.json`, rechecks source/log bytes and 22 reviewer case/actual bindings,
refreshes SHA256SUMS, and binds the raw `inventory.json`. Generated golden
cases/runs remain local in the named attempt, excluded from Git; their inventory,
logs, summaries, probe outputs, and all mutation logs/results are committed.

## PASS / verdict / receipt audit (rule 9a)

All claims are offline; engine/slot binding is **not applicable**. Each place
producing an assessment is listed below. No command exit alone is semantic PASS.

| Location | Content | Freshness and exact binding |
| --- | --- | --- |
| New Q70Coverage fixture tests | Assert concrete predicates, typed errors, values, erasure alternatives, keys and read scopes against authored JSON cases | Fresh full-suite process; test/fixture bytes pinned before/after in the named attempt; command and raw log hashes retained |
| Contract coverage mappings and legacy error mapping | Require real callable targets and exact sole compatibility error/tuple; the behavioral tests execute in the same discovered suite | Registry/test/contract bytes captured and unchanged; full-suite count and zero failures checked. Mapping existence alone is not claimed as semantic proof |
| mutations.py diagnostic result rows | Record actual unittest failure/error identities and testsRun after applying the exact retained reviewer definition | Separate new process/output directory per variant; original variant source hash recorded; full variant code, wrapper and runtime/test inputs pinned; diagnostic scope explicit |
| gates.py mutation assessment | Require each wrong variant to cause intended-target failures, 403 executions, zero errors and no unrelated failures | New per-variant paths in exclusive attempt; exact commands/times and log hashes; retained reviewer source and wrapper hashes prevent treating a stale baseline failure as a kill |
| Reused oracle run.py `_record`/`_compare`, receipt consistency, evaluate_case | Derive outcomes and compare receipt/error fields, staging/stamps and identity consistency; query errors remain expected answers | Fresh captured cases; actual outputs include case hash/runtime hashes, checked by gates/seal. No caller/product freshness claim beyond this offline attempt |
| Reused fixture_runner check/main, probes.py evaluate/predicates | Compare authored observations/content, including expected negative controls; exceptions cannot satisfy positive probes | Fresh subprocesses/exclusive outputs; inputs pinned. Seal verifies exact original reviewer case bytes plus all 22 actual case/runtime bindings |
| Reused selfcheck checks/run_all | Existing HAM/CFG8/EVT/continuation checks inspect contents and conservative failures; historical missing reviews remain explicit | New log/command receipt; six source-input hashes checked against pinned bytes, plus runtime hashes and source stability |
| Reused golden converter result/vector verdicts | Compare actual oracle answers with hand-derived golden fields; preserve non-green classifications | New cases/runs per lane/corpus; all 348 case/runtime/output bindings verified, historical baseline expectations separately hash-bound |
| gates.py audit status | Require green unmodified suite, intended mutation failures, actual fixture/probe/selfcheck results and exact golden triples | Exclusive attempt creation; pre/post pinned-input equality; exact command/log receipts and output case/source checks |
| finalize.py seal status | Recheck completed attempt inputs/logs, six selfcheck source hashes and 22 original case/actual pairs; inventory bytes | Refuses existing seal, binds named audit/commands/inventory/runner manifest by hash; its own executable bytes are included in refreshed manifest |

Old round-1/round-2 gates remain historical artifacts. The original reviewer runner
is executed only for its captured substitution definitions, as explicitly bound
diagnostic code; its historical main routine is not run. The earlier seal.py copy
is retained but the final manifest closure uses finalize.py to include those
executed historical definitions.
They are not invoked to certify the current unit/mutation outcome. The reused
round-2 probes are routed to fresh output directories. All PASS labels above are
scoped builder regression checks; none is a product, engine or pin promotion.

## Limits and handoff

Independent re-review is outstanding. No product edits, live engine/adapter/native
route verification, publication/wait timing, performance qualification, deployment,
main-checkout edit, merge or push occurred. Recheck the mappings and mutation
results before pinning; retain the documented compatibility error and inherited
non-green golden results in any later acceptance decision.
