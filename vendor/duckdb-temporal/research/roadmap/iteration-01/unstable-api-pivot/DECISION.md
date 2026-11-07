# Actual DuckDB C API v2: selected architecture and research gate

Updated 2026-10-30 18:08 UTC. This record supersedes the stable-C-API choice in the earlier iteration-1 specification **only where it selects an implementation ABI**. The typed value semantics and ordered acceptance requirements remain in force. No roadmap item is complete. The original owner relinquished source/PR writes at 17:32; exact baseline preservation precedes implementation.

## User decision and naming

Contributor explicitly selected broad adoption of the actual unstable DuckDB C API v2 wherever it improves performance, scalability, extensibility or the ten-item production roadmap. This supersedes the brief preference for the newer stable API. Interface instability is accepted; silent correctness regressions, unbounded resource use and unverified production claims are not.

The proposed SQL function name `td_query_v2` denotes the new tagged-value feature. It is independent of the **DuckDB C API v2** used to build its binding. The old `td_query` logical interface must remain available without changing its string grammar, input/output contract or counters. A new unstable-ABI artifact is not promised to load on an older DuckDB runtime merely because its SQL function is compatible.

There is no verified stabilization schedule. Pin the exact tested host, generated headers, footer format and relevant upstream source revision. Do not disable version checks or advertise cross-version ABI compatibility. The initial research target is DuckDB **v2.0.0**, using its generated `duckdb_v2.h` and `duckdb_extension_v2.h`, with explicit unstable-API opt-in and a genuine `C_STRUCT_UNSTABLE` footer for that host. Preserve its MIT license notice alongside vendored headers. The prior stable v1.2.0 prototype remains an unchanged control, not the newly selected architecture.

## What changes now

The completed typed-domain and dictionary studies remain useful: disjoint tags, exact int64 transport, finite binary64 normalization, injective interning, compact hot tuple IDs, fixed-point invariants, strict SQL equality and historical migration controls do not depend on the registration ABI. Their raw evidence is retained rather than rewritten.

The architecture gate was reopened for actual-v2 source research and executable isolated probes before feature implementation. Both parallel Sol 6.1 max researchers completed their exact-target studies: [semantics/lifetimes](semantics.md) and [performance/mechanisms](performance.md). Their findings are inputs to a decision, not proof that any proposed optimization is faster. When a correctness or performance obstacle arises, repeat focused primary-source research and record the resulting safe alternative.

Use v2 deliberately in these areas:

| Mechanism | Candidate leverage | Required guard/evidence |
| --- | --- | --- |
| Scalar resolve/bind/init/exec | Immutable structural rule preparation, worker-local scratch, explicit validation phases | Bind-data ownership/equality, no cached query-local interner IDs, exact diagnostics and mutable state isolation |
| Encoded vectors and nested children | Avoid gratuitous flattening/copying and decode native typed payloads | FLAT/CONSTANT/DICTIONARY selection and physical validity; explicit supported fallback for OTHER; nested list/struct lifetime tests |
| Managed collections and statement-local binding | Feed SQL planning with chunked, potentially spillable engine-managed facts or intermediate rows | Borrow/scan pin lifetime, prepared-plan lifetime, append/copy semantics, real spill observation and exact result comparison |
| Filter/projection/partition callbacks | Push selective, exactly understood table predicates and prune unused columns | Correct original-column mapping; preserve residual filters for any unsupported or ambiguous expression; measured optimizer behavior |
| Context/connection/result APIs | Explicit transactions, bounded engine stepping, cancellation hooks where actually supplied | Drain lazy results; do not mistake engine task stepping for interruption of our monolithic callback; maintain own inner-loop bounds |
| Filesystem/allocator/metrics surfaces | Measurable costs and controlled engine-managed IO/storage | Verify actual accounting coverage; engine collection spill does not bound private C++ hash maps, dictionaries or tuple buffers |

Broad v2 adoption does not imply that every relevant mechanism exists. In the inspected target, table-function optimizer callbacks are not a general Datalog logical rewrite or custom physical-operator API. Do not silently expand this work to a C++ internal-ABI extension or claim that using v2 alone provides a new planner.

## Known correctness hazards to carry into tests

- The old scalar C API flattens its input chunk before callback execution. The v2 scalar path does not provide that guarantee. A mechanical rename of the old raw row-indexed reader can silently misread constant or dictionary vectors. A conservative explicit-flatten control and a selection-aware path must return identical typed results across batching, nesting, NULLs and expressions.
- Borrowed vector data and views do not become owned merely by copying their pointers. Resizing, flattening, alias mutation, the next collection scan, or destruction can invalidate them. Refresh views after mutation and retain/copy data only through a documented lifetime.
- Callback error slots and ordinary API-call owned error objects have different ownership. Preserve project-specific diagnostic identity and validate return codes; never destroy or replace a live callback error slot. Exact documentation/source drift is being investigated by the semantics worker and must receive pinned regression coverage.
- Bind state may be shared by plan copies. Cache immutable owned syntax/typed constants, not execution-specific intern IDs, mutable fact state or snapshot-dependent answers. Verify actual plan reuse rather than assuming preparation avoids rebinding of table scans.
- Exact byte string semantics require deliberate collation handling; SQL coercions must not erase the tag distinction. Explicit casts can destroy source information before our callback, so source-language adapters must validate before preparing/casting.
- [DuckDB issue #25391](https://github.com/duckdb/duckdb/issues/25391) reports loss of strict/inclusive bound flags in C API v2 `COMPARE_BETWEEN` pushdown. It was open when checked. Until the exact pinned behavior is safely established, reject that ambiguous filter from extension pushdown and leave the DuckDB residual. Half-open valid/recorded intervals must never be approximated as inclusive ranges. The issue is source evidence and a conservative policy, not a claimed local runtime reproduction.
- A collection is spillable engine chunk storage, not automatic accounting or spill for our private recursive working set. Connection interruption and bounded engine task stepping are not evidence that a long C++ callback polls interruption.

## Measurement and release gate

Separate (1) an API-only port with the same logical algorithm from (2) encoded-vector/collection/planner changes and (3) typed-feature costs. Include build flags, host and header hashes, source hash, runtime configuration, data distributions, selected answers and rejection outcomes. Compare full preparation, list/STRUCT materialization, execution and fetch costs as well as isolated kernel measurements. Preserve negative and inconclusive results. A small ctypes smoke test is not a Datalog benchmark; unobserved spill is not a spill pass.

Require legacy logical regression checks on the new artifact and explicit expected compatibility rejection on unsupported older runtimes, typed native/browser/independent-SQL agreement, real historical migration/rollback/retry, bounded error behavior and sanitizer/lifetime coverage. Item 6 still owns complete resource accounting and cancellation acceptance; item 1 may not pretend those future requirements are already implemented. Production readiness is an evidence-based roadmap outcome, not an ABI selection.

## Ownership and durable recovery

The original owner relinquished source/PR writes at 17:32, as confirmed by the parent on resumption. The coordinator now owns serialized source preservation and the roadmap branch/PR. Three disjoint Sol 6.1 max preservation workers create content-addressed blob objects only; the coordinator alone creates the final tree/commit and performs a guarded ref update. It will verify all 218 exact manifest entries before implementation. Original candidate, frozen baseline and Site remain unchanged; later implementation uses a new isolated working copy. No feature implementation is represented as complete. Items 2–10 remain queued in the original order.

The pre-pivot contract remains preserved at `test-prep/API-v2-decisions.md`, SHA-256 `7be771e34ba0738f2e9c0a11d04e7f41c7417f9ca61ced8e03af86ac2a17ed22`. Native/storage preparation status refers to that historical specification hash. This addendum explicitly supersedes its stable-ABI paragraph; it does not retroactively change what those preparation runs tested.

The roadmap Page was updated and read back at sequence 7 for the v2 decision. Private research-reference stores the earlier research, test preparation and raw baseline evidence. At the fresh 18:03 read, main remained `c1056446` and PR #7 remained open/draft at `c24108a183a236c45eb570458a168fe1ef1cbaac`; exact final-source preservation was in progress, not yet a verified branch save. Interrupted research-tree calls never programmed a commit/ref update. An unreferenced tree is not a durable branch checkpoint.

The performance worker's direct-v2 probes verified 2,097,152 exact values through genuinely spilling managed storage, plus safe constant/copy controls. They also retained a **failed startup-only temporary-quota check**: a requested 1MB quota permitted about 10.2MB spill on the direct unattached-instance path. Reapplying the same quota to the live instance raised the expected code 3002. This narrows the observed problem and suggests an initialization gap; it is not proof of behavior in every store/extension entrypoint or a complete upstream root-cause diagnosis. Preserve the failure, verify the intended application path and do not rely on configuration getters alone as enforcement. See the performance memo and raw probe reports. No typed evaluator, migration or new-extension acceptance is inferred.

## Primary implementation references

- [Pinned generated v2 C header](https://github.com/duckdb/duckdb/blob/v2.0.0/src/include/duckdb_v2.h).
- [Pinned generated v2 extension header](https://github.com/duckdb/duckdb/blob/v2.0.0/src/include/duckdb_extension_v2.h).
- [Pinned C API v2 source](https://github.com/duckdb/duckdb/tree/v2.0.0/src/main/capi/v2) and [API specifications](https://github.com/duckdb/duckdb/tree/v2.0.0/api_spec).
- [DuckDB C API versioning policy](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/VERSIONING.md) should be checked together with the exact generated header and extension loader; source locations may evolve in later target revisions.

These links pin the selected research target, not a claim that future releases preserve the same interface.
