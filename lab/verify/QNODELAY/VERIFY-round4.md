# QNODELAY round 4: FIX-FIRST

Reviewer: CX-VQNODELAY. Candidate: `4e235a1d2b7ec5e1360144cab05357a79ee127ad`. Integrated into **verify/QNODELAY only**, merge `fcbece734e5fe6ddf513da264f9f57663daa2713`. Review date: 2026-11-09 UTC. No candidate fixes, main merge or push.

**Verdict: FIX-FIRST.** Moving validation to readers addresses the round-3 writer-spelling problem, and the 42 supplied tests pass. However, a retained-event report bypasses the parser, timing payload validation is absent at a demonstrated reader, and mode validation does not prevent aggregation of mixed-mode runs. **Keep keep-alive as the default.** Offline replay confirms the historical 0/240 per-request stall count; it does not establish representative P1/P4 performance or justify changing the default.

Scope and priorities: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; procedure: `lab/PROTOCOL.md`. This round was entirely offline. No engine requests, Docker operations, sockets, load trials or contract changes were made.

## R4-F1 — Medium: retained-event percentile reader bypasses validation

Locations: `qualification/reviews/load-observations-independent.mjs:20`, `:41`–`:44`; inventory boundary `lab/receipts/readers.mjs:50`–`:62`.

The report reads `manifest.evidence.events` as NDJSON, then computes `finishedMs - startedMs` and p50/p95/p99 directly. It never imports or invokes the shared parser. Although its historical reviewer label says `duckdb-independent-verifier`, its input code does not restrict `manifest.queryPath` to DuckDB or exclude QLever. It accepts a manifest naming `qlever-native`. The inventory scans lab/packages and exactly one external file, `qualification/devloop/compare.mjs`; this report is absent. Thus the current 22-reader audit passes while this consumption boundary remains uncovered.

Reproduction: `round4/reader-unit.mjs` executes the complete actual report body, replacing only imports, `import.meta.dirname`, and controller/filesystem dependencies with explicit synthetic fixtures. All original fixture-pin, returned-byte, independent recipe/oracle and timestamp assertions execute. With a QLever manifest and a modeless 10 ms read, it emits p50/p95/p99 = 10 ms. With a 10 ms keep-alive read plus a 2 ms per-request read, it emits one distribution (p50 = 2, p99 = 10) and no mode attribution. See `reader-unit-result.json` and `reader-unit.log`.

This is a source-level reader unit, **not a real verified attempt**: the mocked controller returns the literal `SYNTHETIC-FIXTURE-NOT-VERIFIED`, retained in the output. No real qualification receipt or controller state was created.

Proposed fix: validate each exact consumed QLever event before aggregation and record/enforce its run mode. Include this external entry point in the inventory, or explicitly constrain it to supported non-QLever inputs with a tested refusal for QLever. Review external receipt/report entry points beyond the present singleton exception.

## R4-F2 — Medium: labeled malformed timing payloads reach a real summary

Locations: `lab/receipts/parse.ts:42`–`:70`; `lab/experiments/EXP-QG1-qlever-generations/summary-cell.mjs:8`–`:9`, `:27`, `:33`–`:42`; downstream calculations at `lab/experiments/EXP-QG1-qlever-generations/summarize.mjs:26`–`:35`, `:65`.

The shared parser checks mode metadata only. Once a valid mode is present, it accepts seconds-valued records, numeric strings, nonnumeric strings, missing timing fields, arbitrary extra fields, and unknown writer/format identities. It returns these as `Record<string, any> & LatencyReceipt`. The builder explicitly documents this narrower metadata contract, but the requested typed timing refusals are consequently not implemented.

This is observable beyond the parser: the actual `summarizeGridCell` accepts a cold sample with `ms: "not-a-duration"` and an unregistered P4 writer whose p50/p99 are strings. It emits `queries.base.coldMs: "not-a-duration"` and `p4Summary: {p50: "0.001", p99: "0.002"}`. The downstream report performs arithmetic and a screening ratio on these fields without a numeric/unit schema. Mode validation alone therefore does not stop malformed or differently scaled inputs from entering summary calculations.

Reproduction: `round4/review.mjs`, case `actual-QG1-reader-string-timings`; exact returned object in `round4/result.json`. The input fixture and observed output are retained. This is a diagnostic summary path, not a newly demonstrated production performance PASS.

Proposed fix: add reader-specific discriminated payload schemas before timing use: recognized receipt version/source, explicit units, required finite nonnegative numeric fields, and a declared policy for extensions. A generic metadata parser can remain useful, but its callers must actually validate the payloads they consume. Extra fields alone need not corrupt a report; their acceptance, unknown-writer acceptance and unit handling should be explicit rather than presented as typed refusal.

## R4-F3 — Medium: a valid enum on each event does not bind a run's mode

Locations: `lab/receipts/parse.ts:50`–`:69`, `:85`–`:90`; `qualification/devloop/compare.mjs:83`–`:108`, `:114`–`:126`.

`parseLatencyReceipts` accepts a keep-alive/per-request array; recursive validation likewise accepts conflicting valid nested modes. It rejects missing/invalid labels but enforces no homogeneous run or expected-mode policy. The declared load reader parses each QLever event, then pools its latency into the same task-class population regardless of its mode. Its returned run summary and `compatibility()` identity omit the observed mode. Source inspection therefore shows that the new parser call does not prevent mixed-mode aggregation or preserve that distinction for later comparisons.

Reproduction: `review.mjs` cases `mixed-array` and `nested-mixed-modes` return successfully. The omitted report's complete-body unit also demonstrates mixed-mode pooling (R4-F1). The declared `loadRun` aggregation finding is source inspection; this round did not manufacture a byte-verified controller attempt to execute it end to end.

Proposed fix: bind the run to its recorded/configured transport mode, require all contributing events to match, and carry the mode into aggregate receipts and comparison policy. Intentional ABBA diagnostics may contain both modes when explicitly separated into populations, as in the offline replay below. Do not silently merge them into one run distribution. A transport-mode experiment can explicitly declare mode as its varied treatment.

## Checks and refusal matrix

The exact candidate source was copied from Git into a new durable scratch directory; 936 source/config preimages were rehashed unchanged after execution. Existing installed dependencies were referenced by a symlink; none were installed or copied. The supplied reader suite ran in that candidate-only copy so these reviewer additions did not invalidate its source ledger.

- **42/42 parser/reader tests passed**, observed exit zero. Its fresh audit reports 914 inventoried sources, 22 declared readers and 917 input hashes.
- Receipt TypeScript/declaration check passed, observed exit zero.
- Runtime checks: absent selection resolves to `keep-alive`; environment opt-in selects `per-request`; explicit keep-alive overrides that environment; an invalid `no-delay` option throws `TypeError`. The actual supported opt-in name is `per-request`.
- Git inspection confirms `QleverClient.ts` and the lockfile are unchanged since the round-2 transport revision. Source lines 14–19 preserve the default; line 107 creates a per-request Agent only for the opt-in mode. No transport longevity or response matrix was rerun in this offline round.

Every row below uses the actual shared parser with QLever context. A JSON text representation of a valid object is supported and correctly accepted; “string timing” means a string-valued timing field.

| Input | Observed result |
| --- | --- |
| Missing own mode | `TypeError` |
| Invalid mode `no-delay` | `TypeError` |
| Unknown lane with null mode | `TypeError` |
| Invalid nested mode | `TypeError` |
| Array containing a modeless element | `TypeError` |
| Valid mode plus `seconds: 0.042` | Accepted unchanged |
| `ms: "42"` or `ms: "not-a-duration"` | Accepted unchanged |
| Missing timing payload | Accepted |
| Arbitrary extra field | Accepted |
| Unknown writer and `unregistered/v999` format | Accepted |
| Nested modeless QLever record | Accepted under labeled envelope |
| Conflicting valid nested modes | Accepted |
| Array mixing keep-alive and per-request | Accepted |

The parser's documented envelope inheritance explains the nested-modeless case. It is not evidence that an independently produced nested receipt was separately mode-bound. The accepted cases are recorded observations, not a blanket claim that every additive payload field is erroneous.

## Historical offline stall replay

Input: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QNODELAY/round2/live1/result.json`, SHA256 `0f0394502270a9cd05fa5bf39b2e53c0d3be13dff387156234f2c640f7c115de`.

All 520 labeled samples passed through `parseLatencyReceipts`. Excluding 40 warmups leaves 240 observations per mode. Measured decoded binding bytes were independently checked against each attempt/round/size/index nonce and expected payload, then rehashed against their recorded binding digest. Populations were explicitly separated by their recorded mode. Stall threshold is **>= 35 ms**; quantiles use nearest rank, `ceil(n*p)-1`, over sorted millisecond values.

| Recorded mode | Measured requests | Stalls | p50 ms | p99 ms |
| --- | ---: | ---: | ---: | ---: |
| keep-alive | 240 | 120 | 13.671625 | 49.357584 |
| per-request | 240 | **0** | 4.347375 | 7.760791 |

The original round-1 `attempt4/result.json` (SHA256 `b850a42dd32638e797a30954c8ff2cc4f7141fee00b38fd16e7b7bf6e25a136b`) is refused because its samples lack the newer `qleverConnectionMode` field. It was not relabeled from environment or historical inference. The table is the separately recorded round-2 reproduction, not a rebranding of the original 59.06-to-7.87 ms p99 claim. These are historical diagnostic observations under Q91a, not new engine timings or a source-current performance qualification.

## Evidence, source search and limits

Committed tools/results: `lab/verify/QNODELAY/round4/`; see `EVIDENCE.md`, `SHA256SUMS` and `PREIMAGE-SHA256SUMS`. Durable candidate preimages and the fresh reader audit: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VQNODELAY/round4/`. The bulky source directory stays out of Git.

Raw TAP stdout is retained unchanged at that durable root with a committed index/digest: two original test names contain trailing spaces, which the initial staged whitespace check flagged. Moving those exact raw bytes out of the patch preserves the evidence; no test output was normalized.

Search used data paths/fields including `events.ndjson`, receipt-directory reads, `summary.json`, `*.request.json`, `coldMs`, `p99Ms` and percentile calculations across lab/packages/qualification; retained matches are in `data-search.txt`. Semantic-only comparators, memory-only traffic code and live engine protocol readers were not counted as QLever latency receipt readers merely for mentioning JSON or timing. This review found a concrete bypass; it does not certify exhaustive arbitrary-language dataflow.

The initial suite/replay ran through `heavy.mjs`, label `CX-VQNODELAY-R4-review`, while disk admission was available. A later queued bulk source/evidence audit, label `CX-VQNODELAY-R4-extra`, exited **1 at its disk preflight** once free space dropped below 5 GiB. `extra.log` and its unexecuted-after-preflight tool are retained; no `extra-result.json` was produced. Its full 2,782-file builder-evidence checksum traversal was **not performed**. The separate two-fixture reader unit took approximately 2 ms and involved no benchmark, engine, bulk fingerprint or long suite. No heavy work was restarted below the threshold. Lightweight Git/JSON pin-metadata inspections are recorded separately in `metadata-audit.json` and `pin-audit-result.json`. The latter checks path-keyed hash dictionaries too; its first helper iteration encountered a list-valued source field and failed, and its source/log remain as `pin-audit-attempt1.py`/`pin-audit.log`. The corrected helper completed with exit zero (`pin-audit2.log`).

No full root check, legacy harness execution, new engine probe, socket/FD leak check, response/abort matrix or representative P1/P4 comparison was performed this round. Prior transport evidence remains historical. The default should not flip on this offline review.

## Pins and PASS / verdict / receipt audit

`lab/acceptance/` is unchanged. Matching the candidate's changed paths against tracked acceptance JSON pin objects and path-keyed SHA256 dictionaries found **no newly changed pinned path**; the builder's `changed-pins.json` is also empty. A text reference scan of all 43 tracked acceptance files found only `package.json` mentions among the changed paths, with no corresponding fixed hash. Therefore there is no new old/new pin pair to list for this round. The previously reported round-2 native-entry discrepancy is not repaired or re-pinned here. Reviewer additions modify no existing pinned source.

Every observation-to-result boundary in this review was checked as follows:

1. **`review.mjs` supplied-suite and declaration exit assertions:** actual child stdout/stderr/status are retained from this invocation. Content expectations are the executed 42 tests and type fixtures, not an inferred global PASS. Fresh scratch creation uses exclusive writes. Git candidate identity, 936 copied preimage hashes, the suite's 917-input audit and end-of-run rehash bind the run to the reviewed source/configuration. No engine slot or engine correctness is claimed.
2. **`review.mjs` parser/default observations:** `record()` retains actual returned objects or exception names/messages rather than emitting a semantic PASS. Fresh invocation timestamps/UUID and runner SHA bind the observations. Exact mutation values and actual parser/summary/client source are retained. Defaults were checked without sending requests. Payload validity was not inferred from enum validity.
3. **`review.mjs` historical stall assertions:** exact historical input-file digests, recorded modes, explicit warmup exclusion, expected nonce/payload bytes, binding-digest checks and fixed quantile/stall formulas support the reported counts. Recalculation is fresh; the measurements and historical source/slot attribution are not. No historical receipt was silently upgraded or relabeled.
4. **`reader-unit.mjs` output assertions:** the actual complete report body executes all its original byte/oracle assertions on this invocation's fixtures. Input paths/bytes, expected rows and output metrics are retained. Reader source is hashed before/after; runner digest and times bind the unit. Controller/filesystem functions are explicitly mocked, and the synthetic terminal marker is asserted, preventing this unit from being presented as a real verified attempt.
5. **`metadata-audit.json`, `pin-audit.py` and manifests:** current Git diffs, all 43 tracked acceptance-file references, and JSON object/dictionary pin metadata support the limited unchanged-contract/no-new-pin statements. The corrected helper creates its output exclusively from those current inputs; its initial failure remains retained. Manifest hashes attest bytes only. Durable preimage manifest entries come from the source bytes already checked before/after the successful suite; the extra bulk audit's failure is not converted to a PASS.
6. **This verdict:** findings reference the retained observed outputs and exact source locations. ACCEPT/default-flip/production qualification are withheld. Missing complete coverage, the unrun bulk audit and all engine-backed checks are explicitly excluded.
