# Goal-3 benchmark protocol: evidence-QA addendum

2026-10-31 UTC. **Proposal only; UNRUN.** Read with the frozen original `benchmark-protocol.md`; the original remains unchanged. These are narrow accounting/interpretation clarifications, not authority to execute benchmarks or change admission contracts.

## A. Name the exact timed ownership boundary

Keep the original E0/E0j/E1/E2/E3 ledger, but distinguish the following rather than silently calling them all “end-to-end”:

- **E0-method/E0j-method:** a specifically instrumented public method entry to its complete owned return, with the original transaction/conversion/envelope obligations. If a benchmark uses Python statements around the call rather than entry/return instrumentation, label it statement-level instead.
- **E0-statement/E0j-statement:** monotonic timer start through the public-call assignment and timer stop. Rebinding a variable can dispose the previous owned result inside that interval. Record the prior-result lifetime/disposal policy identically in N/S/SF/H. This is a legitimate repeated public-call measurement, but it is not method-only, native-only, or fresh-process timing.
- **External normalization/oracle checking:** identify any `_normalize`/canonicalization performed **after** timer stop as excluded from that endpoint. Do not confuse it with the public codec's required internal normalization, which remains inside the call. An endpoint intended to include external canonicalization or serialization must put it inside the interval for every arm and receive a separate label.
- **E2 fresh-process:** includes launch through terminal child, complete serialized output transfer, teardown/cleanup, and any explicitly claimed clone/open/load/setup work. Report its components and independent process/block identity separately from repeated in-process samples. A fresh process does not establish cold OS caches.

The accepted prior work already documents the statement/rebinding and after-stop normalization caveat (`engine/ITERATION-02.md:83–92` in the immutable export). Do not relabel earlier samples when introducing a new endpoint.

Record, for each arm and endpoint, whether request creation, program/IR/SQL generation, parse/bind, snapshot acquisition, transaction setup/commit, extension load, validation, fixture clone/reset, staged IDB transfer, final boxing/sort/dedup, encoding/serialization, prior-result disposal and cleanup are included, excluded or amortized. Newly necessary SQL/helper/hybrid setup cannot be moved to “fixture preparation” for one arm only.

## B. Keep capacity, measured input, and output scale separate

The current public cap is 512 **retained history rows**, not 512 simultaneously visible facts or 512 final answers. Existing 320-input-fact/10-commit public observations cover that realized fixture, not the unmeasured 512 boundary or larger data. Retractions retain history. Store-byte/commit/input/derived/output/work/round guards are different dimensions.

Future large native/raw-SQL experiments can be scientifically useful only in a separately approved/labeled capacity-design stratum; they do not certify the current capped public store. Do not bypass caps to satisfy the matrix. Mark impossible or guard-exceeded cells explicitly. Realize selectivity/depth/fanout as exact integer fixture counts and report the achieved quantities; do not fabricate exact percentages from tiny fixtures. Treat wide output as output width and transitive/Cartesian blowup as output/intermediate cardinality, not large-input evidence.

## C. Record conditions for recursive reuse and v2 benefits

The exact pinned recursive source exposes executor reuse through `EnableCachingOperatorsSetting`; source presence is not evidence of reuse in a project plan. Capture relevant settings plus actual matched plans and static-side work. Compare 2.0 with 2.0. Do not attribute changes across host versions, enabled settings, altered semantics or changed endpoints to the SQL planner/native extension alone.

For any additional v2 facility, name the cost it intends to remove and charge its replacement costs: callback/setup, bind/rebind, chunk append copies, collection lifetime/staging, borrowed-view protection, final conversion and complete output. Measure direct parameterized SQL as the ordinary relational baseline. An API's availability is not a performance result.

## D. Retain the strict acceptance/evidence gate

1. Freeze a supported typed-program subset and routing/contract decision first. Legacy global fact/error/round/work behavior and native metrics are either preserved through fallback or explicitly versioned with approval; never silently weakened.
2. Compare **full canonical typed outputs**, failures/atomicity and required metadata, not just counts or hashes. Preserve complete bounded oracle outputs or reproducible fixtures with exact comparisons. Ensure false-then-error, duplicate-head error, irrelevant-global-budget and unsupported-SCC cases are represented.
3. Predeclare strata, practical regression margin, process-level paired analysis, precision and stopping rule. Keep all raw trials, including slower, failed, timeout/cancellation, unavailable, and guard-exceeded outcomes. Profile separate matched runs, not timed samples.
4. Capture real outer **and** child terminal statuses, signals/timeouts, command/fixture/source/runtime hashes, and bounded output/log hashes. Strict propagation must be tested; a “success” marker or outer exit 0 cannot stand in for child success. Distinguish no process created, unknown outcome, running and passed.
5. Freeze evidence only after all related calls/sessions are terminal. Accept only the bounded claim actually supported by every required semantic gate and the selected per-stratum measurements. Favor explained route policies or explicit limitations over averaged-away regressions.
