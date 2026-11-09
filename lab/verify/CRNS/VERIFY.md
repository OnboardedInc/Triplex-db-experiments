# CX-VCRNS: EXP-CRNS independent offline review

**Verdict: FIX-FIRST.** Six reproducible content-validation defects remain in the new recompute interface. The unchanged original evaluator suites and the builder suite pass, **145/145**. The final reviewer suite has **16 passing controls and six failing required-behavior regressions**. Its exit 1 is intentional evidence of the defects, not a successful qualification run.

North star: correctness of P1–P5 measurements, especially P3 ordered/resumable feed evidence. Goals and targets come from `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`; review design is R44 section 4. This is an offline review, with no engine, Docker, slot, package, dependency, contract, implementation, merge, or push change.

Reviewed branch: `exp/CRNS-recompute`, commit `2f299bfaeadc83ad644ad30e98d915e1c9dcf215`. The reviewer worktree began at that exact commit. Reviewed evaluator SHA256: `6806dcd852657e15d8b83c9138c42bc25d48afd46f3f51f884ebb04f787d9a30`.

## What the verdict means

The branch report correctly discloses that `recomputeNS` returns RECOMPUTED/REFUSED, never NS PASS, and is not wired into `admitCore`, `qualifyClaim`, or `gateNS`. I did **not** obtain an acceptance PASS from this branch. The failures below are unrefused recomputations or satisfied arithmetic bars on inadequate content; they must be corrected before these results can be used by the future acceptance evaluator. Keeping them default-off prevents an immediate admission regression; it does not make their recomputation safe to integrate.

This review does not treat the already disclosed absent OBS01 adapter, actual SQLite WAL decoder, poll-to-bracket reconstruction, OS crash witness verification, production oracle adapter, or frozen run-plan adapter as newly discovered implementation bugs. Those remain independent prerequisites. None of the findings requires changing the acceptance contract to reproduce.

## Findings

All file/line references below refer to **the reviewed commit**, not proposed fixes. The evaluator implementation was not edited. Reproduce all findings with:

```sh
node --test lab/verify/CRNS/review.test.mjs
```

Expected on the reviewed code: exit 1; 22 tests, 16 passed, six failed, none skipped/cancelled. Each failing `CX-VCRNS-Rnn` assertion expresses the behavior required after a fix. `evidence/observations.json` retains the actual complete recompute responses and the canonical fixture payload hashes for the six cases. No retained observation claims acceptance.

### R01 — HIGH: P1 accepts an empty main read stream

**Location:** `lab/bin/claim.mjs:1914`, `lab/bin/claim.mjs:1925`, `lab/bin/claim.mjs:1928`.

**Reproduction:** `CX-VCRNS-R01`. Request P1 and P3, supply the positive raw ladder and a maintenance event, and leave the main E2 `events.reads=[]`. All auxiliary ladder samples remain populated. The evaluator returns `status:"RECOMPUTED"`, no reasons, P1 `correct:0`, `goodput:0`, `evaluatedShare:1`, `latency.count:0`, and `latency.p99Ms:null`; the ladder reports `met:true`.

**Why:** the read loop has no minimum cardinality, and `null > 100` is false. Auxiliary runs do not establish correctness or latency for the missing main measured window. The main E8 additionally claims 256 completing loops while the main E2 contains zero reads; this contradiction is not checked.

**Proposed fix:** require a nonempty, window-bound E2 sample for requested P1; explicitly reject unestimable/null required quantiles. Reconcile E8 loop completion evidence with the main E2 identities, and bind the main measured run to its ladder segment instead of allowing unrelated auxiliary samples to replace it.

### R02 — HIGH: a checkpoint can advance beyond every source position

**Location:** `lab/bin/claim.mjs:1665`, `lab/bin/claim.mjs:1757`.

**Reproduction:** `CX-VCRNS-R02`. In the positive two-position fixture, change only the last committed consumer transaction's `frontierAfter` from `"2"` to `"999"`. Source prefix, deliveries, effects, affected rows, brackets, and all other data stay unchanged. Result: RECOMPUTED, no reasons, all P3 bars true, `orderViolations:0`, returned `frontier:"999"` while the source ends at position 2.

**Why:** the range checker only requires increasing frontiers and insertion positions inside those ranges. Nothing binds a checkpoint endpoint to an actually resolved source prefix. Resuming from this accepted checkpoint can skip future source positions 3–999. Range consistency inside the observed history is insufficient to prove a valid resumable checkpoint.

**Proposed fix:** pass the evaluator's source cursor/prefix mapping into the consumer validation. Require every checkpoint to name a source-resolved prefix in the correct stream/epoch and never exceed the source's observed terminal frontier. Require appropriate terminal coverage after drain. Preserve sparse/ordinal cursor semantics rather than comparing unrelated raw offsets.

### R03 — HIGH: affected-set validation discards consumer and epoch identity

**Location:** `lab/bin/claim.mjs:1667`, `lab/bin/claim.mjs:1781`, `lab/bin/claim.mjs:1788`.

**Reproduction:** `CX-VCRNS-R03` evaluates two separate mutations: (a) replace every effect/affected row's epoch with `"wrong-epoch"`, leaving the source at epoch `"0"`; (b) keep the correct epoch but assign subject `pl:a` to `consumer-a` and `pl:b` to `consumer-b`, consistently in both WAL insertions and final rows. Each independently returns RECOMPUTED. The compact observation combines both mutations and also returns RECOMPUTED with zero misses/extras and all P3 bars true.

**Why:** the code validates only that the key fields are nonempty strings, then groups final rows by position and unions subjects. No one consumer in the correct epoch has the expected set in these inputs. The schema's identity-bearing key `(consumer, epoch, position, subject)` is reduced before oracle comparison.

**Proposed fix:** bind the expected consumer identity to the evaluator's run configuration, validate row epochs against the source cursor mapping, and compare the complete expected per-consumer/per-epoch keys. Do not satisfy one consumer's affected-set obligation by pooling rows from other consumers or epochs.

### R04 — HIGH: P4 throughput counts reads outside its measurement window

**Location:** `lab/bin/claim.mjs:1916`, `lab/bin/claim.mjs:1936`, `lab/bin/claim.mjs:1949`.

**Reproduction:** `CX-VCRNS-R04`. Supply 2,200 **nonoverlapping sequential** pull-current events with the exact frozen fact/hop mix, but put their timestamps a year beyond the two-second measured window. Result: RECOMPUTED, no reasons, `pullsPerSecondPerCore:1100`, p50/p99 0.1 ms, history `met:true`. Control C16 moves the same sequential sample into the window and recomputes successfully, so this finding is independent of R05.

**Why:** main reads are checked for nonnegative duration only. Every pull in the array is divided by the unrelated main window duration. Auxiliary `nsSegment` has a send-window check, but the main P1/P4 path does not.

**Proposed fix:** validate the main read stream against the evaluator-bound measured interval and the frozen sample/censoring rule before computing latency or goodput. Explicitly account for requests spanning the end instead of silently dropping slow observations. A read from another interval cannot contribute to this window's numerator. Apply the same consistency check to P1, which shares this main read path.

### R05 — MEDIUM: one loop label is mistaken for single-client execution

**Location:** `lab/bin/claim.mjs:1937`.

**Reproduction:** `CX-VCRNS-R05`. Supply 2,200 pulls all with `loop:0`, all sent at 1,000,000,000 ns and completed at 1,001,000,000 ns, inside the measured window. Keep the exact fact/hop mix and valid history samples. Result: RECOMPUTED, no reasons, P4 p99 1 ms and 1,100 pulls/s/core, despite 2,200 simultaneous requests.

**Why:** a singleton set of loop identifiers is not evidence of a sequential single-client loop. Parallel work can satisfy the single-client latency/throughput bar under one label.

**Proposed fix:** validate request identity and per-loop interval sequencing, requiring at most one outstanding request in the P4 single-client stream. Reject duplicate requests and overlapping send/receive intervals. Keep this separate from the membership check in R04.

### R06 — MEDIUM: removing all CR events bypasses the cross-check requirement

**Location:** `lab/bin/claim.mjs:1715`, `lab/bin/claim.mjs:1805`.

**Reproduction:** `CX-VCRNS-R06`. Populate valid source and consumer CR cross-checks for both source positions, then plant an out-of-tolerance source instant: CR-INCONSISTENT is correctly returned. Replace the entire cross-check array with `[]`: RECOMPUTED, no reasons, all P3 bars true. Missing the property refuses, but an empty stream bypasses every check. The original positive fixture also uses an empty E11 stream.

**Why:** only supplied rows are checked. R44 section 4.2 requires the source/consumer CR instant for every LSN to be cross-checked; a candidate that omits its inconsistent instants must not become valid by omission.

**Proposed fix:** require exact expected position/role coverage (or an explicit evaluator-authenticated not-applicable classification); validate the role enum and duplicates. Missing CR data must remain missing evidence. Do not substitute candidate-written instants for observer brackets.

## Requested adversarial checks and controls

| Area | Fresh result |
| --- | --- |
| Reordered consumer log | Reversing WAL transaction order is refused. Reversing rows within one committed transaction, or atomically inserting positions 2 then 1 in a single frontier 0→2 transaction, remains valid by R44's externally atomic range semantics. This is not an order defect. |
| Candidate-written lag start | Adding candidate publication fields and a filtered candidate lag summary does not change the observer-derived measurements; changing authenticated payload bytes without resealing refuses. Source/consumer brackets still require the missing trusted poll/normalizer adapter; changing the trusted normalized L itself is outside this pure function's provenance guarantee. |
| Candidate-computed digest | Replacing final and WAL delivery digests consistently with another encoding's digest still produces NS-P3-GAPS-MAX. The evaluator recomputes `feed-entry/1` bytes. |
| Filtered lag quantiles | Removing a consumer bracket preserves the two-position sample, introduces infinity, and refuses with NS-P3-EVERY-POSITION-ACCOUNTED. Candidate summary/sample arrays are ignored. |
| Exact quantiles | 30,200 nearest-rank comparisons: n=1..151, every integer percentile 1..100, both distinct values and ties, integers above 2^100. No mismatch. Also infinity and empty samples. |
| Lag boundary and clock magnitude | 249 ms and 250 ms pass the arithmetic lag bar; 250.000001 ms fails. Adding 2^100 ns to every timestamp preserves the entire result exactly. |
| Reader declaration | A declared `readerCount:256` cannot replace absent E8, repeated loop 0, or disagreeing relay concurrency. All refuse. This does not independently certify the future driver's measurement provenance. |
| Missing/empty streams | Missing E1/E2/E3/E4/E5/E6/E7/E8/E9/E11 properties refuse. Empty source entries, WAL transactions, source/consumer brackets, effects, affected rows, delivery rows and E8 refuse. Empty main P1 reads and E11 are the demonstrated exceptions R01/R06. Empty lag sample gives nullable lag and TIMING-UNJUDGED; count diagnostics can remain available on refused input. |
| Other priorities | Empty P1 baseline writers cannot satisfy the ladder; empty P4 history refuses; empty P5 live reads/writers cannot satisfy traffic; missing sweep refuses. Builder P2/P4/P5 fixtures, including the 100k-subject synthetic sweep, reran in the full 145-test suite. No real 100k-subject engine sweep was performed. |
| A0 | Absolute helper records the lower A0 rung as PENDING-CONTRACT; the same rung mismatch on promotion still throws CONTROL-UNMATCHED. This is not an admitted absolute claim. |

## Existing verdicts and evidence

Fresh full-suite command (through the canonical shared heavy semaphore, after checking host free space: approximately 23 GiB):

```sh
node lab/bin/heavy.mjs --label CX-VCRNS-original -- node --test \
  lab/bin/test/claim.test.mjs lab/bin/test/claim-round2.test.mjs \
  lab/bin/test/claim-ns.test.mjs
```

Exit **0**; **145 passed, zero failed/skipped/cancelled**, test duration 176.683 seconds plus shared-queue wait. The TAP includes the original reference-model executor-call/verdict comparison, document fixtures, and independent round-2 evaluator tests. Both original suite files and `lab/acceptance/` are byte-unchanged from CRNS's parent `613ad05f`.

I also removed only the added CRNS block and the new `createHmac` import from an in-memory copy of `claim.mjs`; the remainder is byte-identical to the parent evaluator. Thus existing claim/admission code was not modified by CRNS. The supported fixture corpus retains its verdicts; this is not an assertion about every conceivable future input or environment.

Evidence index:

- `evidence/original-suites.tap`, `.exit`: complete fresh 145-test execution and terminal exit code.
- `evidence/reviewer-attempt1.tap`, `.exit`: first reviewer attempt, 11 passing controls / six failures.
- `evidence/reviewer-attempt2.tap`, `.exit`: additional quantile/empty-input controls, 15 controls / six failures.
- `evidence/reviewer-attempt3.tap`, `.exit`: final 16 controls / six failures; isolates R04 with sequential reads and checks R03 variants independently. Earlier failures remain retained.
- `evidence/observations.json`: compact actual function results for R01–R06, exact payload/head hashes and evaluator/script identities. Fresh synthetic inputs, not a historical screening receipt.
- `evidence/verification.json`: validates fresh terminal results, observed counterexamples, source identity, and unchanged existing code/tests/acceptance files.
- `evidence/review-tooling-attempt1.md`: records the metadata tool's initial ENOBUFS failure on the generated obligations blob; a bounded larger child-output buffer allowed the subsequent complete byte comparison. No evaluator/test result was adopted from that failed tool call.
- `fixture.mjs`: positive fixture copied from the reviewed builder test, with independent reviewer setups. Source verification/grade/read callbacks are evaluator-owned deterministic test stand-ins. The unchanged builder suite separately reran its actual O-DOMAIN child test.
- `review.test.mjs`, `observe.mjs`, `record-verification.mjs`: reviewer-only tools. `SHA256SUMS` covers the committed review artifacts, excluding itself.

All individual evidence files are below 1 MB and total evidence is below 5 MB. No bulky bundle, candidate store or oracle output is committed. Evidence stays inside this worktree; no durable external evidence directory is needed.

Raw failing Node TAP includes whitespace-only indentation lines in its assertion diagnostics. Those bytes are retained unchanged; whole-change `git diff --check` reports their trailing whitespace. Authored review sources and Markdown pass the scoped whitespace check. No evidence was rewritten to make that formatting check green.

## Observation-to-verdict audit (rule 9a)

1. **`review.test.mjs` assertions / TAP.** Content: actual pure-function output compared with expected refusal, exact ranks, or independent control behavior. Freshness: functions and fixtures execute in each new Node process; first failures and later expanded attempts are retained separately. Binding: imports the unchanged reviewed evaluator; fixture sealing uses evaluator-side test keys, separately computed witnessed heads, and exact synthetic attempt/source/slot/input bindings. Synthetic identities are not real engine receipts. The intentionally failing assertions prevent a green reviewer run from concealing unsafe results.
2. **`observe.mjs` `expected` / actual records.** Content: calls `recomputeNS` again on newly sealed fixtures and retains complete results, not just statuses. Freshness: new observedAt and fresh local function executions; no old result file is used as input. Binding: records exact evaluator and fixture/tool hashes, reviewed commit, payload digests, witnessed heads, and per-case attempt ids. No field is NS PASS.
3. **`record-verification.mjs` verification record.** Content: checks terminal TAP counts and named regression failures, exit files, six actual unrefused counterexamples, and exact current evaluator/original-suite/contract bytes. Freshness: checks artifact mtimes against this review run's start and recomputes hashes in this process. Binding: records current code, reviewed/base commits, all tool/evidence hashes and the source-integrity result. The record certifies these review observations only.
4. **This FIX-FIRST verdict.** Content: the six source-located reproductions above plus actual successful/failed controls and original regression results. Freshness/binding: the retained execution artifacts and their SHA256 manifest. It does not authorize an NS acceptance promotion.

## Boundaries and handoff

No implementation fix, acceptance repin, native/VM durability test, live engine run, year-one workload, 256-reader acceptance, production normalizer/oracle adapter validation, or full `pnpm check` was performed. The task requested offline review; the package code and public contracts were not changed. No existing PASS or verifier registry was edited.

**Pinned-file change inventory (rule 9b): empty.** The reviewer changes only `lab/verify/CRNS/`; the evaluator, tests under review, and every acceptance file retain their exact prior bytes. There are no old/new pinned hashes to repin for this review. The builder's already reported evaluator hash change remains its own pending contract-integration task.

Next: a separate builder fixes R01–R06 and adds evaluator regressions; rerun these reviewer assertions and all 145 existing tests on committed source. Independently review the collector/normalizer/run-plan/oracle integration before enabling any admission path. The future adapter must prove bracket provenance, reader observations, auxiliary segment binding, and retained full sample identity; this offline review cannot establish those properties. No human clarification is needed to reproduce the six findings.
