# Literal fresh regression results

Target: `388209d`. Tests named GAP may deliberately assert superseded behavior; this file lists literal results only.

## delta

| # | Result | Exact test name |
| --- | --- | --- |
| 1 | PASS | control: honest fixture qualifies offline |
| 2 | PASS | F1 new route: each transitive JS import is checked, poison persists after bytes restored |
| 3 | PASS | F2 new route: loose object substitution without replace refs fails the blob OID check |
| 4 | FAIL | F2/F7 GAP: deleting the completed claimed-case input persists without refusal |
| 5 | PASS | F3 new route: a child changing the resolved node entrypoint is refused |
| 6 | PASS | F3/F10 new route: a two-link external chain and a cycle refuse safely |
| 7 | PASS | F4 new route: gate child HOME/TMPDIR cannot see preceding version probes |
| 8 | PASS | F5 new route: inFlight alternatives cannot accidentally turn object comparators green |
| 9 | PASS | F6 new route: structured cause must contain a nonempty string, not a tag-shaped number |
| 10 | PASS | F7 new route: extra content-addressed object written by the child refuses |
| 11 | PASS | F8 new route: core refuses promotion before touching even an adversarial executor |
| 12 | PASS | F9 new route: deleting the whole objects directory never throws or loses gate blocker |
| 13 | PASS | Q67g: 0.3.10 workload fields exclude slot, duet placement rejects overlap and unequal capacity |

`{"tests": 13, "suites": 0, "pass": 12, "fail": 1, "cancelled": 0, "skipped": 0, "todo": 0}`

## fallback-routes

| # | Result | Exact test name |
| --- | --- | --- |
| 1 | PASS | check 3 T1 (Q67e): a system under test inside its own process group edits the oracle copy (no escape needed); the re-hash refuses the oracle |
| 2 | PASS | check 3 T4 (Q67e): the same edit through a symlink the system under test makes in its own checkout is caught the same way |
| 3 | PASS | check 3 T2 (Q67e): a double fork stays in the build's group and is killed; a helper that starts its own session (setsid) survives |

`{"tests": 3, "suites": 0, "pass": 3, "fail": 0, "cancelled": 0, "skipped": 0, "todo": 0}`

## input-variations

| # | Result | Exact test name |
| --- | --- | --- |
| 1 | PASS | Q81a final input: rename => INPUT-TAMPERED |
| 2 | PASS | Q81a final input: truncate => INPUT-TAMPERED |
| 3 | PASS | Q81a final input: symlink-different-bytes => INPUT-TAMPERED |
| 4 | PASS | Q81a final input: rewrite-identical-length => INPUT-TAMPERED |
| 5 | PASS | Q81a final input: symlink-identical-bytes => same-byte control |
| 6 | PASS | Q81a final input: symlink-dangling => INPUT-TAMPERED |
| 7 | PASS | Q81a final input: rewrite-then-restore => same-byte control |
| 8 | PASS | Q81a final input: honest-control => same-byte control |

`{"tests": 8, "suites": 0, "pass": 8, "fail": 0, "cancelled": 0, "skipped": 0, "todo": 0}`

## prior

| # | Result | Exact test name |
| --- | --- | --- |
| 1 | FAIL | check 2 (Q67b): with the tree label fixed, the identity changes with the source runner, a dependency, a symlink's text, an external directory, the lockfile and the buildSpec; the dist does not |
| 2 | FAIL | check 2 GAP (Q67b): a file symlink to a path outside the checkout binds only its text; the target's bytes decide the answer and the identity is the same |
| 3 | FAIL | check 2 GAP (Q67b): the toolchain is the evaluator's process.version, not the node on PATH that builds and runs the system under test |
| 4 | PASS | check 2: two instances with one identity share the first instance (a candidate commit with A0's tree runs A0's cases on its own checkout) |
| 5 | PASS | check 3 T1 (Q67e): a system under test inside its own process group edits the oracle copy (no escape needed); the re-hash refuses the oracle |
| 6 | PASS | check 3 T4 (Q67e): the same edit through a symlink the system under test makes in its own checkout is caught the same way |
| 7 | PASS | check 3 T2 (Q67e): a double fork stays in the build's group and is killed; a helper that starts its own session (setsid) survives |
| 8 | FAIL | check 3 T5-blob (Q67e): substituting the O-CONTRACT runner's blob everywhere also changes A0's checkout, so the whole-checkout identity (Q67b) fails it closed |
| 9 | FAIL | check 3 T5a GAP (Q67e): an unpinned COMPILED oracle's bytes are read from the repository after the candidate's build ran; `git replace` makes the evaluator run the candidate's bytes as the oracle |
| 10 | FAIL | check 3 T5b GAP (Q67e): with a lying O-CONTRACT on the identity cases, the reference model qualifies a wrong candidate; only the lab's A0 re-run of the prerequisites catches it |
| 11 | FAIL | check 3 T5c GAP (Q67e): on a claimed obligation A0 is never re-run on (R.evaluator.incomplete-receipts, O-CONTRACT), a wrong candidate that substitutes the oracle reaches offlineVerdict QUALIFIED |
| 12 | FAIL | check 3 T8 (Q67e): `git replace` on A0's source makes the A0 rebuild differ from the registry, so it fails closed |
| 13 | FAIL | check 3 T6 GAP (Q67e): one HOME and TMPDIR serve the candidate's build, its runs, A0's build, A0's runs and every oracle run |
| 14 | FAIL | check 3 T7 GAP (Q67e): deleting an evidence object is not EVIDENCE-TAMPERED (only objects still present are re-hashed), and a read-only object needs no chmod to delete |
| 15 | FAIL | check 3 T3 GAP (Q67e): a build that rewrites the evaluator is reported in its own run, but every later run uses the rewritten evaluator, which can drop GATE-NOT-RUN |
| 16 | PASS | check 4 (Q67i): for every declared comparator, a pass pair passes and a fail pair fails, and compare (recompute) and caseResultVerdict agree |
| 17 | PASS | check 4 GAP (Q67i): an O-REPLAY answer is an object {commandOutcomes, queries, state}, so every row, page and error comparator is UNCOMPARABLE on it, even on identical bytes |
| 18 | FAIL | check 4 (CMP-ERROR cause, Codex finding 9): a missing cause fails, as the compiled 0.3.9 rule says (Q67h, pending, would make it optional); any non-null value counts as "the original cause retained" |
| 19 | PASS | check 4: on a run with no observation, compare says FAIL and caseResultVerdict UNCOMPARABLE for the same record (both never PASS) |
| 20 | PASS | check 5 (Q67j): no promotion reaches QUALIFIED through qualify (offline or plan-only, engine-source or log-source) or admit |
| 21 | FAIL | check 5 GAP (Q67j): admitCore never reads the kind it is now passed, so the reference model and run.core say QUALIFIED for a promotion; the same log-source claim labelled comparative qualifies offline |
| 22 | FAIL | check 6: qualify is DIAGNOSTIC on every early return and on every exception; only paths that reach the gate step carry GATE-NOT-RUN |
| 23 | FAIL | check 6 GAP: a system under test that makes the evidence directory unreadable makes qualifyClaim throw instead of returning a verdict |

`{"tests": 23, "suites": 0, "pass": 8, "fail": 15, "cancelled": 0, "skipped": 0, "todo": 0}`

## supplement

| # | Result | Exact test name |
| --- | --- | --- |
| 1 | PASS | STRICT input integrity: delete after the final claimed-case use must be rejected |
| 2 | PASS | STRICT input integrity: rewrite after the final claimed-case use must be rejected |
| 3 | PASS | F1 source-bound T3: a candidate edit to a transitive evaluator file is detected and blocks the next fresh process |

`{"tests": 3, "suites": 0, "pass": 3, "fail": 0, "cancelled": 0, "skipped": 0, "todo": 0}`

