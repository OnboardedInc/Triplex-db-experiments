# QNODELAY round 5: ACCEPT

Reviewer: CX-VQNODELAY. Candidate: `9b1a9a59ad223fd0fb3e8ff0de4d0d15fed4dafc`. Integrated into **verify/QNODELAY only**, merge `49a701188c1be4ed31a49677c1bd8b4a2d1c1591`. Review date: 2026-11-09 UTC.

**Verdict: ACCEPT for the three scoped round-4 fixes.** R4-F1, R4-F2 and R4-F3 are closed by the actual offline reproductions below. No new high-severity finding was identified. **Keep-alive stays the default.** Per R43, the next step is default-off integration through a contract, owned by the orchestrator/contract builder; this reviewer did not merge into main, edit the contract or push. This is not an engine-backed PASS or a default-change recommendation.

North star: P1/P4 measurement integrity and the transport correctness floor. Goals/targets come from `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; procedure from `lab/PROTOCOL.md`. Review scope was limited to the three R4 findings and the requested enforcement/default/replay checks. No candidate code was fixed by this reviewer.

## R4-F1 closed — the omitted reader now validates actual input paths

Locations: `qualification/reviews/load-observations-independent.mjs:22`–`:23`; `lab/receipts/parse.ts:117`–`:145`; `lab/receipts/readers.mjs:50`–`:51`.

The QLever branch now gets the complete event population from `readLatencyRun(eventFile, ...)` before calculating anything. Its output retains the observed mode and the digest returned for the bytes actually read. The guard now includes all qualification source files, covering the previously omitted entry point instead of a singleton external exception.

I reran the entire actual independent-report body with the R4 fixture/oracle assertions, real temporary event paths and explicitly mocked controller/IO dependencies. The literal legacy R4 modeless record is refused with `VERSION`; an otherwise valid current-version modeless record is refused with `MODE`; the mixed-mode population is refused with `MIXED_MODE`. None produces a report. Homogeneous inputs for **both** modes preserve the known 10 ms p99, correct recorded mode and exact input digest. The output's terminal marker is asserted to be `SYNTHETIC-FIXTURE-NOT-VERIFIED`. This is a consumer unit, not a fabricated real controller attempt.

## R4-F2 closed — the demonstrated malformed QG1 timings cannot reach summaries

Locations: `lab/receipts/parse.ts:147`–`:214`; `lab/experiments/EXP-QG1-qlever-generations/summary-cell.mjs:8`–`:10`; `summarize.mjs:14`–`:17` in the same directory.

Both the actual cell helper and the full summarizer subprocess were exercised. The literal old R4 payload is refused for its missing receipt version; importantly, versioned counterparts with the same malformed timings are also refused, so a metadata refusal is not being mistaken for a numeric-schema test.

| Current-version mutation | Cell helper refusal | Full summarizer |
| --- | --- | --- |
| Cold `ms: "not-a-duration"` or `"7"` | `TIMING` | Nonzero; no output file |
| Missing or negative cold `ms` | `TIMING` | Nonzero; no output file |
| Cold sample declares seconds | `WRITER` (sample schema mismatch) | Nonzero; no output file |
| P4 p99 is string `"0.002"` | `TIMING` | Nonzero; no output file |
| Unregistered P4 writer | `WRITER` | Nonzero; no output file |
| Modeless or conflicting cold sample | `MIXED_MODE` | Nonzero; no output file |
| P4 mode differs from cell | `MIXED_MODE` | Nonzero; no output file |

Positive helper and full-summary controls pass in both modes and preserve cold = 7 ms, warm = 5 ms and P4 p99 = 10 ms. Additional direct reader controls refuse seconds, numeric/nonnumeric strings, missing timing, unknown writer/format and missing mode with typed `LatencyRefusal` objects. `unwrap()` throws the same refusal object. Opaque extra fields remain allowed under the builder's explicit extension policy; they do not become checked timing observations. The supplied tests also check non-finite numeric input and required/branded TypeScript fields.

## R4-F3 closed — run populations and comparison identity retain one mode

Locations: `lab/receipts/parse.ts:321`–`:350`, `:373`–`:383`; `qualification/devloop/compare.mjs:74`–`:87`, `:118`–`:130`.

An ordinary mixed keep-alive/per-request file returns typed `MIXED_MODE`; an expected-parent-mode mismatch does too. With the explicit `variedTreatment: "connection-mode"` option, the same file returns separate homogeneous populations, each retaining the actual source digest. There is no pooled `records` or `timings` property. Supplied type tests also reject treating dynamically selected treatment output as an ordinary run.

I executed the actual `loadRun` function body with real temporary event paths and explicit controller/oracle mocks. Modeless and mixed inputs are refused before aggregation. Both homogeneous modes preserve p99 = 10 ms, their mode, and the exact event-file digest. The actual compatibility function produces different identities for keep-alive and per-request runs. The source also explicitly refuses multiple QLever modes in ordinary calibration/comparison. The load unit's controller terminal digest is `SYNTHETIC-FIXTURE-NOT-VERIFIED`; its mocked oracle is not query-correctness evidence.

## Enforcement and execution evidence

The unmodified candidate's **54/54 parser/reader tests and receipt TypeScript/declaration checks passed** in a fresh candidate-only source copy. The fresh audit binds **1,015 sources, 24 declared readers and 1,018 input hashes**. In total, 1,037 source/config preimages were retained and checked against Git/candidate bytes; the suite/audit inputs and candidate preimages were rechecked unchanged before adopting the results. Dependencies were referenced by a symlink to the existing installation; none were installed or copied.

I planted an executable direct read in the scratch candidate at `qualification/reviews/qa-planted-direct.mjs`: aliased `readFileSync`, `JSON.parse`, and a `p99Ms` access on `qualification/evidence/qlever/receipt.json`. The **actual guard test fails**, exit 1, naming its unreviewed input boundary. A second control supplies a hash-matching but deliberately incorrect `non-reader` classification: the real audit still refuses it with `QLever receipt path/JSON-key reader requires readLatencyRun`. The planted source is retained separately and was removed from the candidate copy afterward. The guard remains a source-review/import/call/hash check, not a proof of arbitrary program dataflow.

Execution labels: `CX-VQNODELAY-R5-review` and `CX-VQNODELAY-R5-resume`, both through `heavy.mjs`, with >5 GiB available. The first runner passed the suite, declaration and consumer assertions, then failed in an additional reviewer inline probe because of an unescaped newline. `review-attempt1.mjs`, its failure log and all attempt-1 output remain. Only the reviewer helper was corrected. The resumed collector exited zero, reran the affected consumer/guard observations and revalidated the original suite's exact source hashes; it **did not relabel or rerun that already-passing suite as a new attempt**. All **2,093 builder round-5 manifest entries** were independently verified against retained bytes during the successful resumed run.

## Default and historical replay

Runtime checks confirm absent selection = `keep-alive`, environment opt-in = `per-request`, and explicit keep-alive overrides that environment. Client construction sent no requests. Git confirms the client transport and lockfile are unchanged from R4. The default remains off for per-request connections.

The unchanged round-2 input `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QNODELAY/round2/live1/result.json` has SHA256 `0f0394502270a9cd05fa5bf39b2e53c0d3be13dff387156234f2c640f7c115de`. Fresh arithmetic replay excludes 40 warmups, checks finite millisecond values, independently checks every measured nonce/payload binding and its digest, then separates the recorded modes. Stall threshold is >=35 ms; quantiles use nearest rank, `ceil(n*p)-1`.

| Historical recorded mode | Requests | Stalls | p50 ms | p99 ms |
| --- | ---: | ---: | ---: | ---: |
| keep-alive | 240 | **120** | 13.671625 | 49.357584 |
| per-request | 240 | **0** | 4.347375 | 7.760791 |

**Compatibility boundary:** the new reader explicitly refuses this original legacy file with `VERSION`. The replay above is independently bound arithmetic over unchanged historical bytes, not a claim that the new reader accepts an old envelope. No version/writer/units metadata was fabricated and no historical file was migrated. The counts still reproduce; the measurements remain historical diagnostics under Q91a, not source-current engine performance or evidence for flipping the default.

## Notes for later, outside the blocking scope

**N5-1 — low, fail-closed QG1 aggregate compatibility.** `lab/experiments/EXP-QG1-qlever-generations/summarize.mjs:74` writes its final diagnostic aggregate through `qleverLatencyReceipt` without a registered writer identity. Passing the actual successful positive-control output back to `readLatencyRun` returns `WRITER`; `round5/notes-result.json` binds that file and refusal. Register and label this output before making it a downstream machine input. This does not reopen the scoped malformed-input finding: those malformed inputs are refused before output, and this note is a fail-closed producer compatibility issue.

The reader ledger also requires review/hash refresh when integrating additional source files, including these reviewer tools. The suite was deliberately run on exact candidate source rather than inventing new builder classifications for reviewer files. Contract integration should account for the resulting source set. No universal reader-completeness claim or broad new review wave is made here.

## Pins, evidence and PASS audit

`lab/acceptance/` is unchanged. The candidate's changed paths have no intersections with object-based or path-keyed SHA256 pins; the text scan of all 43 tracked acceptance files found no references to those changed paths. `round5/pin-audit-result.json` and the builder's empty changed-pins record agree. No newly changed pinned path exists, so there is no new old/new SHA256 pair to list. The previously reported round-2 native-entry discrepancy remains for the contract builder; it was not repaired here.

Committed evidence: `lab/verify/QNODELAY/round5/EVIDENCE.md`, `SHA256SUMS`, `DURABLE-SHA256SUMS`, tools and compact observations. Durable source/fixtures/raw logs: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VQNODELAY/round5/`. Bulky source and raw attempt directories remain outside Git.

Observation-to-result boundaries:

1. **`review-attempt1.mjs` suite/declaration assertions and resumed `review.mjs` adoption:** actual child output and exit assertions support the narrow test result. Attempt-1 source preimages and fresh audit hashes are checked again against the exact candidate before reuse. The first runner's later failure remains; no claim of a successful whole first command is made. The resumed command has its own UUID/times, explicit reason and source digest. Neither claims an engine slot or semantic engine PASS.
2. **`review.mjs` reader/QG1 controls:** exact created bytes, typed refusal codes, thrown-object identity, known numeric positives, child exit status and output-file absence/presence are checked. Exclusive fixture/log creation and retained paths/hashes bind each fresh invocation to its input; candidate source is unchanged. Successful enum/schema checks do not certify actual transport honesty or query semantics.
3. **Independent report/load units:** original report assertions execute with real input paths; expected outputs, digests and modes are asserted. The report's recipe/oracle fixture checks remain. Controller and load-oracle mocks are explicit and synthetic marker checks prevent adoption as verified-attempt evidence. Actual source bodies and fixtures bind these fresh units, not a real slot.
4. **Guard mutation controls:** the actual fresh test/audit must name the exact planted source and expected refusal; its bytes are retained and its removal is verified by the final candidate-byte checks. The deliberately incorrect inventory exists only in the unit's memory. No contract or reviewed ledger was edited to obtain a PASS.
5. **Default and replay controls:** source/current factory results bind defaults; no connection is opened. Fixed historical input digest, expected nonce/payload bytes, sample binding hashes, finite-value checks and explicit populations/formulas bind arithmetic. Only recomputation is fresh; historic source/slot attribution is not upgraded, and legacy parser refusal is retained.
6. **`notes.mjs`, `pin-audit.py`, evidence sealing and this verdict:** the note checks the exact fresh positive-output path/digest and actual `WRITER` refusal. Pin inspection binds the explicit Git candidate delta and current tracked contract metadata. Manifests attest retained bytes only. ACCEPT is limited to the three fixes supported above; no new high-severity finding, engine qualification, default flip or main merge is inferred.

Not performed: new engine queries, benchmarks, socket/FD longevity, response/abort matrix, full root/package checks, representative P1/P4 runs or contract construction. Those remain outside this offline round. The remaining integration action is the **default-off merge through a contract**, not more work on the critical path to the first PASS.
