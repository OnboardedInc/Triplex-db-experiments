# CX-VO06 round 3: independent O-REPLAY 0.5.0 acceptance

**Verdict: ACCEPT — ready to pin in contract 0.4.0.**

The three original implementation defects and all five substantive coverage gaps
are closed. The unmodified full suite has **403 tests, zero failures and zero
errors**. Each previously surviving wrong variant is now rejected by its intended
behavioral test. There are no undisclosed or remaining unit-suite failures.

North star: correctness floor for P1 reproducible cuts and P2 atomic, idempotent
receipts. Goals/targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`.
No performance claim. Specification reading for the new semantics remains
**R33 section 4.3**. No product/core, adapter or RT01 source was read.

Builder head: `fed510ecf5137873d5dab1ad192f0e54f8ed0955` on
`exp/O06-oracle-record-time`. Merged as requested into `verify/O06` by local
merge `23be5488`. The verification head is the commit containing this report.
The merge changes oracle tests and their coverage mappings; runtime Python
semantics are unchanged from the already reviewed round-2 implementation.
No implementation or builder test changes were authored by the reviewer.

## Independent fresh results

[Final audit seal](round3/seal.json), [regression audit](round3/evidence/audit.json),
[command receipts](round3/evidence/commands.json),
[coverage results](round3/coverage/summary.json),
[raw artifact inventory](round3/evidence/raw-inventory.json).

| Check | Fresh result |
| --- | --- |
| Original 22 authored probes | 22/22 match expectations; exact original case bytes, actual output case hashes and all runtime source hashes verified |
| Unmodified full suite | 403 tests, OK, zero failures/errors; independently green in both normal and coverage-baseline processes |
| Five previously surviving wrong variants | All caught by the intended new Q70 tests; no unexpected errors or unrelated failures |
| Additional journal-scope wrong variant | Also caught by the new Q70I scope control |
| Existing authored fixtures | 14/14 expected verdicts, including all nine failing controls |
| Selfcheck | PASS; the same two missing historical review fixtures remain explicitly reported |
| Original golden corpus, core | All 341 item identities/verdicts unchanged against a freshly executed exact-Git 0.4.9 baseline |
| Original golden corpus, QLever | All 341 unchanged against the same exact baseline revision |
| Migrated golden corpus | All 331 other items unchanged per lane; G9-CUT-02b ten AGREE items per lane |
| Golden output binding | All 522 baseline/current output documents match their actual case bytes and exact runtime files |
| Coverage mappings | All 17 explicit mappings are nonempty and point to callable tests present in the independently discovered 403-test suite |
| Source and fixture stability | All captured oracle/test/fixture/selfcheck/converter inputs unchanged through completion of normal and mutation runs |
| Exact builder source | Every oracle/test Python file matches builder commit fed510ec; all 40 builder executable-manifest entries match |
| Wrong-variant identity | The `apply` definitions are AST-identical to the reviewer's round-2 substitutions |

The 0.4.9 baseline oracle, old corpus, machine contract, rulings and six historical
selfcheck inputs were restored directly from Git commit
`4efe962e3faf79b3330973891b4533dae5f83704` into a new evidence directory.
No historical builder output was substituted for fresh baseline execution.
The original probe predicates were reused with fresh output routing only.

All attempts used new paths. Commands carry start/end times, actual exit codes
and log hashes. The final seal rechecks source/input stability after the last
wrong-variant run, including the seven new JSON fixtures, and binds the normal
audit, mutation summary, input maps and reviewer script bytes. No engine slot is
used or claimed.

## Five semantic gaps: actual test rejection

The wrong behaviors were applied in memory in separate processes. Each process
ran the entire current 403-test suite. The unmodified baseline is green, so the
failures below cannot be attributed to the old mapping failures. Each diagnostic
has **zero errors**, must fail its intended test, and may fail no unrelated test.
K also detects the related L own-scope control, which is legitimate detection.

| Round-2 finding | New behavioral test in tests/test_q70_coverage.py | Fresh wrong-variant result |
| --- | --- | --- |
| F4 / Q70E: nonissuing prefixes admitted | `:35 test_Q70E_only_issuing_prefixes` asserts exact issuing/terminal/error predicate results [true,false,false] and only the issuing prefix | One assertion failure in Q70E |
| F5 / Q70H: different bodies wrongly treated as different views | `:47 test_Q70H_equal_view_different_bodies` verifies unequal page bodies, equal next=2, and successful continuation to erasure position 3 | One assertion failure in Q70H |
| F6 / Q70I: ambiguous journal after chooses an issuer | `:57 test_Q70I_journal_ambiguity_and_scope` requires typed X-NOT-MODELED with the journal ambiguity message in both issuer orders | One assertion failure in Q70I |
| Supplemental Q70I: journal scope ignored | Same test's separate fixture requires t's own exact old/marker alternatives instead of inheriting s's plain issuer | One assertion failure in Q70I |
| F7 / Q70K: non-journal scope-bearing reads use default scope | `:70 test_Q70K_scope_on_every_scope_surface` checks exact erasure prefixes, concrete values, unrelated-default controls and actual read-record scopes across the scope-bearing surfaces | Eight assertion failures confined to Q70K and the related Q70L control |
| F8 / Q70L: continuation key omits entity and scope | `:100 test_Q70L_entity_and_scope_key` checks different-entity plain marker-only results and a different scope's own old/marker alternatives | One assertion failure in Q70L |

Each exact failure identity and raw unittest log is retained under
`round3/coverage/`; `seal.json` records required-target and unrelated-failure
checks. These are real assertions over observed content, not empty aliases or
failures caused by KeyError/other unexpected exceptions.

Q70E remains deliberately **primitive-level coverage**: its ordered source
answers include an issuing token, a terminal page and an error. No public-page
counterexample is claimed. For the supplemental scope mutation, the old reviewer
witness remains non-discriminating; the **new builder scope fixture** supplies
the meaningful failure. Neither limitation is hidden by the result.

## Disposition of all 18 previous failures

There are no remaining failing subtests or test methods. The mappings are
explicit and independently checked against actual unittest discovery. Below,
`Erasure` is in `tests/test_contract_section4.py`, `SelfChecks` is in
`tests/test_scale_and_selfcheck.py`, `ReferencePageInput` and `Visibility` are in
`tests/test_views.py`; all paths are beneath `lab/oracles/replay/`.

| Previous failure | Current behavioral coverage / disposition |
| --- | --- |
| ER-INFLIGHT-PREFIXES | Maps to Erasure.test_Q66a_inflight_prefixes_only: exact ordered prefix alternatives for two/three erasures and a later read start |
| ER-CURSOR-ERASURE-PREFIX | Maps to Erasure.test_Q66b_cursor_continues_per_prefix: per-prefix page values, pinned cut and terminal continuation |
| CONTRACT-Q70A | Maps to Erasure.test_Q70a_continuation_answers_from_the_source_read: source view overrides continuation's own readStart |
| CONTRACT-Q70B | Maps to Erasure.test_Q70b_literal_token_from_an_in_flight_read: literal-token old/marker alternatives |
| CONTRACT-Q70C | Maps to Erasure.test_Q70c_literal_token_from_a_plain_read: plain-source marker retained and old value absent |
| CONTRACT-Q70D | Maps to Erasure.test_Q70f_ambiguous_literal_token's equal-view controls; different-body clause separately covered by new Q70H |
| CONTRACT-Q70E | New Q70Coverage test catches the previously surviving unfiltered-prefix substitution |
| CONTRACT-Q70F | Maps to Erasure.test_Q70f_ambiguous_literal_token: disagreeing literal issuers refuse in either order |
| CONTRACT-Q70G | Maps to Erasure.test_Q70g_journal_pagination: journal continuation prefixes, nonissued after and plain-source controls |
| CONTRACT-Q70H | New Q70Coverage test catches the body-comparison substitution |
| CONTRACT-Q70I | New Q70Coverage test catches both journal ambiguity and scope-key substitutions |
| CONTRACT-Q70J | Maps to Erasure.test_Q70j_journal_read_scope: only the journal's own scope contributes in-flight erasures |
| CONTRACT-Q70K | New Q70Coverage test catches the default-scope substitution across scope-bearing reads; cutCatalog is value-invariant but its exact content and captured scope are checked |
| CONTRACT-Q70L | New entity/scope controls plus existing Erasure.test_Q70l_entity_journal_pages for positive continuation and different-snapshot behavior |
| CONTRACT-Q70M | Maps to Erasure.test_Q70m_typed_continuation_values: invalid string/fraction/negative selectors and a valid integer continuation |
| CONTRACT-Q70N | Maps to three actual SelfChecks tests: missing paged kind, computed/cross-module/nested next keys, and unexercisable handler |
| CONTRACT-Q70O | Maps to both actual ReferencePageInput tests: malformed CLI shapes/types/ranges and valid/default/terminal page selectors |
| E-UNAVAILABLE-CUT error-table discrepancy | Explicit sole legacy compatibility entry, exact tuple checked; Visibility.test_cut_validation still checks concrete future-position id/tag/reason |

The compatibility entry does **not** change the machine contract or silently
rename the legacy query error. `test_contract_section4.py:240` now verifies that
the only oracle error outside the current machine table is E-UNAVAILABLE-CUT,
with exactly `(ReadError, unavailable-cut, preflight)`, and references the real
future-position behavioral test. Produced-error membership has its own subtest.
This is the disclosed contract-mapping issue already judged nonblocking in round
2; its semantics remain tested. Any additional unlisted error still fails.

The 17 named mappings likewise resolve to actual behavior already tested or the
five new tests whose rejection was independently demonstrated. There are no
remaining disclosed failures that leave the reviewed rules untested.

## Record-time obligations remain verified

The original 22 probes, existing fixture controls and full tests continue to
exercise each R33 4.3 change:

- **R-CMD-3:** omitted validFrom follows stagedAt when the decision instant differs.
- **R-RCP-7:** declared clock matches stagedAt; a clock-driven lane must match the
  reference decision stamp. Increasing but wrong reference stamps fail.
- **R-RCP-9:** distinct decisions in one millisecond get distinct ordered stamps;
  ties/decreases fail; interior ordinals share their stamp; resolved lost-ACK and
  replay observations preserve the original instant.
- **R-JNL-5:** journals are valid from stagedAt; raw own-instant omission works
  across physical ordinals; older distinct instants and hydrated changes remain.
- **R-CUT-6:** published cuts answer; above-watermark/pending-publication cuts
  refuse, even with an earlier explicit position. Far-future finite cuts give the
  typed recordedAt refusal. No live waiting-duration claim is made.
- **R-JNL-6:** :_tx/instant remains X-NOT-MODELED as the oracle specification says.

G9-CUT-02b still distinguishes record cuts 500 and 500.001 despite equal staging
clocks, with correct raw-lifetime and as-of retirement metadata. All ten golden
items agree on both oracle lanes. Round-1 F1-F3 and round-2 F4-F8 are closed.
No new blocking finding was established.

## PASS / verdict / receipt audit

Every authored assessment location is listed here before committing. All scope
claims are offline; engine, container and engine-slot binding are **not applicable**.

| Location | Content check | Freshness and exact binding |
| --- | --- | --- |
| round3_run.py subprocess collection | Records actual exits and logs; no exit code alone is treated as semantic acceptance | New exclusive evidence directory, exact commands/environments/start/end times, log hashes; source/fixture inputs captured before and checked after |
| Reused probes.py evaluate/predicates through round3 routing | Actual parsed assertions, journal payloads, typed errors and expected receipt FAIL controls match unchanged authored expectations | Original case bytes compared exactly; all 22 fresh outputs bind actual case SHA and current runtime SHA; old evidence is preserved |
| round3_run.py golden audit | Every legacy (vector,item,verdict) triple compared against fresh exact-Git baseline; migrated items assessed separately | All 522 output documents checked against actual case bytes and exact baseline/current runtime files; pre/post corpus and converter pins |
| round3_coverage.py result/summary | Records complete unittest failure/error identities and before/after diagnostic witnesses | Fresh separate process and output paths for each named substitution, captured reviewer source and test bytes, file stability check; explicit in-memory diagnostic scope |
| round3_seal.py checks/status | Requires green 403-test baseline, all six intended mutation rejections with zero errors and no unrelated failures, actual discovered mapping targets, exact legacy compatibility tuple, all original probes and legacy comparisons | Rechecks command/log hashes and all source/fixture pins after the final mutation run; AST-checks exact round-2 substitutions; verifies files against builder Git head and all 40 manifest entries |
| round3_seal.py artifact binding | Binds the completed normal audit, coverage summary, input maps and reviewer scripts by their actual SHA-256 bytes | Refuses an existing seal; consumes only this attempt's named paths; records source head, builder head and completion time |
| VERIFY-round3.md ACCEPT | Follows the actual successful semantic controls and clean unmodified suite, including rejection of the formerly surviving wrong implementations | Bound to the reviewed builder head, local merge and committed new reports/evidence; does not qualify product, engine, deployment or performance |

Reused builder fixture and selfcheck verdicts are backed by concrete comparisons:
the fresh fixture JSON has all 14 verdicts equal to their authored wanted values,
including nine negative controls; the selfcheck's actual status is PASS and its
missing historical review files remain explicitly listed. Both checks also run
inside the green full suite. The final seal's PASS is limited to this independent
offline oracle-pin review.

## Retained limits and handoff

Acceptance here is for the **O-REPLAY 0.5.0 pin**, not broad semantic acceptance
of every golden surface. Inherited counts remain core 317 AGREE, 19 AGREE-RULED,
two VECTOR-BUG, three NOT-MODELED; QLever 298 AGREE, 18 AGREE-RULED,
19 DISAGREE, one CONVERTER-ERROR, two VECTOR-BUG, three NOT-MODELED.
The two historical selfcheck review fixtures are still absent. These are explicit
unchanged gaps rather than remaining unit-suite failures.

All new tools/results are under `lab/verify/O06/`. Complete reconstructed baseline
sources and golden cases/runs remain locally in the new evidence tree, excluded
from Git with an inventory; summaries, receipts, probe case/output pairs and
mutation logs/results are committed. All heavy runs used `lab/bin/heavy.mjs`
with CX-VO06 labels and host free disk above 5 GiB. No engine grant was needed.

Not done: actual contract pin edit, product/core/adapter inspection, live engine
or native-route execution, publication/deadline timing, performance qualification,
package publication, deployment, main-checkout changes, merge into main or push.
No subagents were spawned. No review changes to the builder implementation were
needed. No open questions block the pin; the orchestrator can carry the accepted
source hashes and disclosed compatibility/history limits into contract 0.4.0.
