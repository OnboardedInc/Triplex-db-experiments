# Goal 5 — grouped aggregates and the actual DuckDB C API v2

Research freeze: 2026-10-31. **Source-only design analysis; all empirical results are UNRUN.**

This is an alternatives report, not a selected language/API contract, implementation, activation, or acceptance. Goals 1–4 remain dependencies; in particular, unresolved goal-3 authority and goal-4 integration/acceptance are not repaired or waived here. Original held syntax, options, stopped checkpoints, APIs, IR, counters, and protected artifacts are unchanged.

## 1. Scope and durable safety boundary

The current user direction is to move to item 5 and stop collecting or preserving details about the computer. This report records that restriction so later work does not accidentally revive that activity. Do not collect, save, transmit, or request computer-environment inventories or details. Do not treat a benchmark, reproducibility packet, admission check, or source pin as permission to do that. A real safety denial is a stopping condition, not an invitation to change routes.

Only published project source at commit `691ccf65eb0bee686c1919bfa893d1027db30162`, official DuckDB source at `d54cbbe3df17e8e5ce68312f483b4155836112aa`, public primary research, and synthetic case specifications informed this report. No local held candidate, earlier admission packet, stopped material, or computer inventory was an input. No compiler, native module, database, test, benchmark, Codex task, installation, provisioning, Git mutation, Page, or PR action was performed.

The host-project pin is DuckDB `2.0.0` at that exact DuckDB commit. This is a project source/ABI requirement, not a statement about an inspected installation.

## 2. Findings that change the design space

1. **There really is a public, unstable v2 aggregate API.** Its definitions are in `duckdb_v2.h` and its extension pointer table in `duckdb_extension_v2.h`. The old `duckdb.h` aggregate API is a different surface. The v2 extension header requires unstable opt-in, selects API family 2, and forbids mixing v1 and v2 extension headers. Do not substitute an imagined v2 wrapper or silently fall back to the v1 API. [D1, D2]
2. **Registering an aggregate UDF is not a public grouping-operator API.** DuckDB supplies grouping and state routing when an SQL query invokes that UDF. The API does not make a nested Datalog fact argument into host GROUP BY work by itself. An argument-only Datalog implementation still needs its own grouping algorithm unless a separately authorized outer SQL plan supplies the rows. [D1, D3]
3. **Buffer-managed collections and output arenas are real, but solve different ownership problems.** A collection can spool typed rows and offload them to disk. An arena backs variable-size vector values. Neither exposes a general-purpose public aggregate hash table, sort operator, custom-state relocation contract, or optimizer rewrite hook. [D1]
4. **Checked sum needs its own semantics.** The pinned built-in `SUM(BIGINT)` returns `HUGEINT`; a final cast does not emulate checked i64 prefix addition. Floating-point SUM is order-sensitive. Parallel partial sums can therefore change both results and failures unless the chosen semantics explicitly permits their combination. [D6, D7]
5. **A concrete upstream correctness risk exists.** Official issue 28132, opened 2026-10-30 and labeled reproduced when read, reports that distinct same-signature v2 aggregates can be coalesced in one SELECT, including GROUP BY. That is an upstream report, not a locally reproduced result or proof about this exact pinned build. It belongs in any future aggregate-UDF gate; do not evade it by changing the host pin or disabling optimization without approval. [D8]

## 3. Exact available aggregate surface

The following are actual public v2 names at the pin. All listed operations are behind `DUCKDB_V2_API_ALLOW_UNSTABLE`; setters/accessors generally return `DUCKDB_V2_ERROR` and use an optional owned API error-info out-slot. Callback error slots are a different, borrowed contract. [D1: aggregate module, D3]

| Phase | Available entry points and consequence |
| --- | --- |
| Build/register | `duckdb_v2_aggregate_function_create`, `..._set_name`, `..._get_signature`, `..._get_docs`, `..._set_user_data`, `..._set_property`; `duckdb_v2_connection_register_aggregate_function` or `duckdb_v2_extension_register_aggregate_function`; `..._destroy` |
| Bind | `..._set_bind_callback`; common function-bind accessors inspect argument types/constants and attach bind data; `..._bind_set_return_type` can replace an ANY placeholder with a concrete return type |
| State size | `..._set_size_callback`; `..._size_set_state_size` reports bytes for one state; user/bind-data accessors are available |
| Init | `..._set_init_callback`; `..._init_get_state_count`, `..._init_get_states`, user/bind-data accessors |
| Update | `..._set_update_callback`; `..._update_get_row_count`, `..._update_get_arg_count`, `..._update_get_arg`, `..._update_get_states`, user/bind-data accessors |
| Combine | `..._set_combine_callback`; `..._combine_get_state_count`, `..._combine_get_sources`, `..._combine_get_targets`, user/bind-data accessors |
| Finalize | `..._set_finalize_callback`; `..._finalize_get_state_count`, `..._finalize_get_states`, `..._finalize_get_result`, `..._finalize_get_result_offset`, user/bind-data accessors |
| Destroy | optional `..._set_destroy_callback`; `..._destroy_get_state_count`, `..._destroy_get_states`, user/bind-data accessors |

Here `...` abbreviates the exact prefix `duckdb_v2_aggregate_function`, not an additional API namespace. The manifest records the complete API-name list separately as a source inventory.

Important non-negotiable details:

- Size, init, update, combine, and finalize callbacks are required for registration. Bind and destroy callbacks are optional. An ANY return type requires a bind callback that resolves it. The function must be registered on the database owning its factory. The caller still destroys the builder after registration. [D1, D3]
- During update, input row `i` maps to state pointer `states[i]`. **Different rows may reference the same state.** The input row count is not a group count. A vectorized loop must preserve correctness under repeated state pointers; blindly vectorizing conflicting updates is wrong. [D1]
- Combine merges source `i` into target `i`; the source must not be modified. State arrays and argument/result handles are borrowed for the callback. Finalize writes at **offset + i**, not row i. [D1]
- Only the bind callback receives a context in this aggregate callback family. The subsequent public state callbacks have no context/factory/aggregate-arena accessor. Capturing a borrowed bind context for later execution is not a valid ownership shortcut. [D1]
- The state destructor must not fail; reported errors are ignored. Do not free host-allocated state memory. If a future state owns external resources, finalization, abort, discarded-state, and teardown lifecycles need an explicit checked ownership design and tests, not an assumption based on a toy sum. [D1, D3]
- Public properties cover stability, NULL handling, fallibility, collation, aggregate order dependence, and DISTINCT dependence. Declaring order independence or infallibility is a semantic promise, not a tuning hint. Reordering arithmetic, discarding duplicates, or suppressing errors is not licensed merely because that property exists. [D1]
- Marking a UDF order-dependent does not itself establish the project's canonical support order or an ordered partial-state merge protocol. Required combine support still needs a valid meaning under the selected sum semantics. C++ exceptions must be contained at the C callback boundary and translated to the borrowed callback error slot; a caller-owned API error handle is not interchangeable with that slot. [D1, D3, P2]

The pinned upstream test source demonstrates constant inputs, multi-chunk updates, grouped states and result offsets, ordered/window use, bind-data propagation, and argument access. Those are **test-source examples only**; none was executed here, and they are not a proof of this project's semantics, resource behavior, or the issue-28132 case. [D4]

## 4. v2 vector, arena, collection, and spilling boundaries

### Borrowed vector views

`duckdb_v2_vector_get_view` exposes data, validity, selection, and count. FLAT, CONSTANT, and DICTIONARY representations are supported; OTHER requires an explicit flatten first. Reading a dictionary can flatten its child and invalidate earlier aliases into that child. Preparing all possibly alias-mutating inputs before retaining views is therefore a correctness requirement. Selected indices also govern validity lookups. A constant argument does not mean a constant aggregate-state destination. [D1]

The published project binding already distinguishes container normalization from primitive-leaf preparation and refreshes output pointers after size-changing operations. A new aggregate path must preserve that ownership discipline; it must not alter the old callbacks as an incidental optimization. [P2]

### Output arena

`duckdb_v2_vector_get_arena` borrows an arena for string-backed vectors; `duckdb_v2_arena_allocate` returns arena-owned bytes. The arena is not independently owned and becomes invalid after relevant vector flatten/reallocation/destruction. This is useful for final copied output strings, not permission to retain transient input pointers or use the output arena as an unbounded persistent group dictionary. Requested bytes are not a physical-memory bound. [D1]

### Typed collection

Actual collection operations include create, append-state create/destroy, append, row-count, shared/worker scan-state create/destroy, scan, combine, clear, reset, and destroy. Appending copies the typed chunk. Scanning can reference collection buffers; scanned bytes last only until the next scan on that worker state or earlier state/collection destruction. `duckdb_v2_data_chunk_copy` makes a separately owned, flattened deep copy. [D1]

Collections cannot be scanned while appended to, and concurrent appends require separate collections followed by combine. Combine consumes the source and requires matching types and the same database. A public collection therefore provides a real future spooling building block, **not** an already implemented external grouped kernel. Support dedup, group routing, canonical ordering, and bounded per-partition state remain the application's responsibility. Native dictionaries, hash buckets, retained copies, sort workspace, and output arenas do not become spillable merely because some rows are in a collection. [D1]

### Custom aggregate-state spill

The pinned internal `AggregateStateSpilling::TryCreateSpillPlan` requires a state-description callback and rejects states with destructors. The v2 aggregate builder does not install the internal state-description/export hooks, and the public header exposes no corresponding v2 registration callbacks. Pointer-free row payloads differ from separately allocated state-owned data; the latter is not made transparently spillable by registering a custom UDF. This is a supported negative finding, not a proposal to link internal C++ APIs. [D3, D5]

### Optimizer and profiler

No public v2 grouped-hash/sort-operator creation or optimizer-rewrite registration API was found in the pinned public headers. Expression accessors are inspection interfaces, not a license to replace the optimizer. The separate query-metrics API is real: after a query finishes, a connection can return an owned metrics result, but profiling may be disabled and every metric/operator can be missing. Any later use should allowlist query-level evidence, not collect computer details; nothing was sampled here. [D1]

## 5. Two architectures that must not be conflated

| Alternative | What it would actually do | What it cannot claim now |
| --- | --- | --- |
| Argument-only native grouped kernel | Consume the explicitly supplied history cut, finish lower components, deduplicate the selected support relation, then group/reduce within that invocation; use v2 at the transport boundary, and possibly typed collection spooling if separately selected | Host optimizer chooses the internal Datalog grouping plan; arbitrary native containers automatically obey DuckDB spill policy; any store authority or goal-3 approval |
| SQL-owned offload outside callbacks | A future authorized outer planner presents a completed, explicitly scoped support relation to DuckDB GROUP BY/built-ins or registered aggregate UDFs, with adapters for types, duplicates, empty groups, ordering, budgets, and errors | Permission to open connections, execute SQL, inspect catalogs, or inherit a transaction/attachment inside the current callbacks; correctness from ordinary SUM or COUNT DISTINCT without adapters |

v2 should be used broadly where it supplies real benefits, but API availability is not authority. No host SQL inside native callbacks is selected or authorized. No internal-C++ dependency, host-pin change, registration, SQL surface, or execution path is selected by this report.

## 6. Semantic prerequisites for every performance alternative

### Completed lower strata only

The current published engine already has whole-program dependency metadata, predecessor-first components, completed flags, and a strictly-lower-stratum runtime check for negative consumers. Aggregation needs its own explicit dependency kind or equally unambiguous metadata. Every aggregate producer must be completed before its consumer runs; reject any cycle that contains an aggregate edge, including a cycle closed through otherwise-positive edges and an answer-unreachable cycle. Do not aggregate a changing recursive delta, publish a partial group result, or infer that monotone min/max permits recursive aggregates when this goal rejects them. This is an obligation for a later additive contract, not an edit to the present planner. [P1, P3, P4]

### Which set is aggregated?

Let the future contract specify an explicit support identity, not just a value expression. Duplicate history versions of the same visible triple, repeated derivations, distinct witness tuples sharing one numeric value, and an explicit DISTINCT-by-value operation are different phenomena. For example, two distinct supports `(g, witness_a, 7)` and `(g, witness_b, 7)` contribute twice to ordinary count/sum under a support-set interpretation, while two copies of the same support contribute once. `COUNT(DISTINCT value)` would erase the first distinction. Deduplication must happen at the defined relational identity before reduction, and its costs must be visible.

### Empty groups and domains

No supports means no ordinary GROUP BY key, but a separately seeded group domain can have keys with zero contributions. Ungrouped aggregation over an empty input is another case. The future contract must choose whether min/max/checked sum are absent, errors, or an explicit optional result on empty groups; the old typed domain must not gain an invented NULL/sentinel silently. SQL outer joins can manufacture a row, so counting the outer-join row is not a correct zero-count adapter. DuckDB's ordinary SQL aggregate empty/NULL conventions are a reference to adapt, not an automatic Datalog language choice. [D7]

### Types

Specify accepted argument tags and result tags for count, min, max, and checked sum; mixed-tag groups; comparisons/collations; boolean arithmetic; integer/f64 identity; zero representation and tied min/max values; unsupported and non-finite values. Keep group identity distinct from numeric coercion. Existing intern IDs can be compact keys while the dictionary lives, but numeric ID order is not a semantic value order and must not choose error precedence or min/max. Nothing here expands or rewrites the inherited type contract.

### Historical corrections

The published source validates every supplied row and both interval bounds before checking visibility. It uses half-open valid and transaction intervals, then inserts a set-valued visible triple. A SQL reference that filters away malformed invisible rows first can disagree on errors. Duplicate visible versions must not inflate support. At a correction transaction boundary, the closed old version and opened new version must switch according to the same cut; do not independently aggregate both versions or introduce an undocumented latest-by-entity rule. No cross-call group cache may reuse invocation-local IDs or a result from another cut. [P1]

## 7. Checked integer sum, floating point, and legal combination

These are alternatives needing an explicit future decision:

| Meaning of checked sum | Combination consequence |
| --- | --- |
| Exact mathematical total, then final range check | Exact sufficiently-wide/arbitrary-precision partial totals can be combined in any order; success/error is order-independent |
| Canonical ordered checked-i64 additions, failing on the first out-of-range prefix | Arbitrary partial i64 sums or arbitrary group traversal are not equivalent; final-range SQL SUM is insufficient |
| Canonical f64 additions | Per-group order and strict arithmetic rules matter; reassociation, a parallel tree, Kahan sum, or a superaccumulator generally defines a different result |
| Reject some domains for checked sum | May simplify a first contract, but cannot be silently chosen as an optimization or inferred from this report |

Analytical example: with `M = 2^63 - 1`, ordered inputs `[M, 1, -1]` have final mathematical total `M`, yet the second i64 prefix overflows. `[M, -1, 1]` does not. The pinned built-in `SUM(BIGINT) -> HUGEINT` followed by a BIGINT cast models final range only. [D6]

There is a conditional parallel technique for ordered **integer** prefixes: summarize an ordered block by exact `(total, min_prefix, max_prefix)`, including the empty prefix. For contiguous blocks A followed by B:

```text
total(A·B) = total(A) + total(B)
min_prefix(A·B) = min(min_prefix(A), total(A) + min_prefix(B))
max_prefix(A·B) = max(max_prefix(A), total(A) + max_prefix(B))
```

This is an analytical derivation, not a selected implementation. It detects whether any range crossing exists from a given starting accumulator. Recovering the first crossing needs ordered prefix search/descent, exact arithmetic with a proved bound, and contiguous canonical per-group blocks. It does not allow arbitrary noncontiguous hash partitions, recover type/expression error precedence by itself, or justify speculative evaluation past an exhausted budget. There is no asserted equivalent compact summary for canonical rounded f64 addition.

The published source's strict-FP premise and fresh-check boundaries remain obligations for any typed-expression path, even if checked sum eventually accepts only integers. Sampling does not establish uninterrupted compatible controls. Batching host operations can reduce boundary overhead only after a reviewed boundary contract; no sampling/control change is proposed here. [P2, P5]

## 8. Analytical grouping alternatives

Use independent quantities:

- `R`: callback rows, i.e. separate query invocations in one vectorized callback.
- `N`: supplied temporal history rows; `F`: distinct visible EDB facts.
- `J`: candidate body bindings/support candidates reached before support dedup.
- `D`: distinct admitted support tuples after the selected support identity.
- `G`: produced or explicitly seeded group keys; `V`: distinct aggregate argument values.
- `U`: dictionary values; `K`: group/support key width; `A`: aggregate expressions.
- `B_in`, `B_support`, `B_out`: logical input, support, and encoded output bytes, especially string bytes.

Neither `R`, `N`, `F`, `D`, `G`, nor `V` substitutes for the others. A join can make `J` far larger than `F`; low `V` does not imply low support cardinality. A project's logical limit does not assert any observed memory capacity.

| Alternative | Analytical work after candidate generation | Incremental ownership and important condition |
| --- | --- | --- |
| Hash support dedup + hash groups | Expected `O(J·hash_support + D·(hash_group + A))`, plus any canonical result sort | Support-set memory can be `O(D)` even though reducer states are `O(G·A)`; collisions and key bytes matter |
| Sort unique support by group/canonical support key | Comparison work `O(J log J)` plus `O(D·A)` reduction | Retains/permutates support; can fuse adjacent dedup and canonical per-group order; comparison key semantics must be explicit |
| Already ordered complete support stream | `O(J + D·A)` | Small current-group reducer state only if ordering, adjacent dedup identity, group closure, and lower-component completion are guaranteed; existing retained relations/dictionary still cost memory |
| Partitioned/preaggregated hash | Linear routing plus partial-state production and merging | Good only for legally mergeable states; partial-state count, not G alone, controls intermediates; skew can help local reduction and hurt balance |
| Shared ticketing + state arrays | Hash key-to-ticket lookup/insert plus state updates | A genuine research alternative for parallel execution, not a public v2 hash primitive or new thread permission; repeated-state contention and per-worker state memory differ |

For native keys, storing existing intern IDs can avoid repeated string copies and repeated raw-byte hashing. The dictionary must remain alive; IDs cannot escape or order semantic failures. Multiple aggregates over the same support can share group lookup and dedup, but fusion must preserve the contract's error and budget order. Early min/max exits must not hide later invalid arguments, failed expressions, or required accounting.

If deterministic checked-prefix semantics requires retaining/sorting every contribution, the nominal `O(G)` hash-state advantage no longer describes total memory. Report both that retention and the completed lower relations already owned by the invocation. Do not advertise streaming memory reduction as a whole-invocation bound.

## 9. What primary performance research supports — and what it does not

- **Boncz, Zukowski, Nes (CIDR 2005), X100:** bounded vector batches amortize interpretation while avoiding full-column intermediate materialization; batch size is a working-set tradeoff. Transferable hypothesis: obtain v2 views once per prepared batch, then use compact key/state loops. No published speedup or batch optimum is this candidate's result. [R1]
- **Leis et al. (SIGMOD 2014), morsel-driven execution, section 4.4:** small local preaggregation captures heavy hitters, then partitions are reduced after input completion. Transferable hypothesis: measure heavy hitters, distinct-group ratio, and partial-state inflation separately. The paper's parallel scheduling is not supplied by a scalar callback or authorized by this study. [R2]
- **Kuiper, Boncz, Mühleisen (ICDE 2024), sections III–V:** shared buffer management plus spillable temporary layouts avoids a separate all-or-nothing external algorithm. Transferable hypothesis: logical row spooling and pointer-safe ownership matter as much as the reducer arithmetic. This describes an engine design, not a guarantee that opaque native hash state or custom-UDF resource ownership spills. [R3]
- **Xue, Marcus (2025 preprint, version 2), sections 2–4:** purpose-built shared ticketing separates key lookup/insert from state updates; cardinality, skew, resizing, and thread-local versus shared state change the tradeoffs. Transferable hypothesis: no universal winner should be inferred from one uniform or heavy-hitter case. Its associative SUM experiments do not establish checked-prefix or strict-f64 equivalence. [R4]

The older official DuckDB hash-table article explains cached hashes, compact hash prefixes, and separate payload storage, but is historical architecture background; the pinned source and public API, not its old thresholds, determine capability. No timings, thresholds, memory settings, or computer descriptions from any paper/blog were adopted. [D9]

## 10. Additive API, IR, and logical-accounting options

No name or schema below is selected. A later review could choose a **new** query entry point and **new** owned inspect-only IR version instead of extending legacy result carriers or repurposing IR2. It should separately version the language, IR schema, SQL suffix, extension artifact, work model, and host ABI.

Potential new IR information: aggregate kind; group variables/positions; explicit support identity; contribution expression/type; empty policy; checked-sum policy/order key; aggregate dependency edges; completed-producer barrier; canonical aggregate IDs. Encode semantic choices, not allocator addresses, executable plans, or granted catalog authority. Existing IR1/IR2 bytes and the no-caller-IR-execution rule remain unchanged.

Potential new logical metrics: candidates reached; support duplicates rejected; supports admitted; group keys initialized/finalized; reducer updates; merge pairs if legal; canonical-order work; aggregate expression work; retained support/key/state/output logical bytes; peak **logically accounted** live bytes; requested arena bytes; collection rows copied/scanned. Counts must identify scope (invocation, component, rule, aggregate, or callback), and distinguish attempted from successful work.

Do not append aggregate cost to the old `work` field and silently break its reconciliation with positive, expression, and negative work. Options include a separate aggregate budget and counter, or a newly named/versioned total in the new entry point. Do not change old limits/counters to make a candidate look faster.

New admission checks should occur before the allocation/update they govern. Resource denial should return no partial answer. Error class, phase, diagnostic truncation, cleanup, and the reached accounting prefix must be specified. A bulk precharge must not move an error ahead of one the language requires earlier, while per-item charging must not permit excessive unaccounted physical work. Successful output equality alone is insufficient evidence for equivalent error/limit behavior.

## 11. Future synthetic cases and measurement axes — every case UNRUN

These are specifications, not runnable syntax, accepted tests, or authorization to execute them.

| Family | Independent dimensions / required observation |
| --- | --- |
| Vector transport | `R=0`, one invocation, repeated and distinct programs; flat/constant/dictionary/nested alias carriers; same total N split across different R; output-empty versus output-nonempty; equal bytes with short versus long strings |
| Group cardinality | Fixed D with G=1, several groups, and G=D; fixed G with increasing D; distinguish V=1 from D distinct supports sharing that value |
| Skew/order | Uniform keys; heavy-hitter fraction; Zipf-shaped keys; grouped/clustered, interleaved, reversed, and shuffled canonical supports; all-unique keys; bad estimate/resizing path without assuming a physical capacity |
| Duplicate identity | Repeated identical history row; overlapping visible versions of one triple; duplicate derivations; distinct witnesses with equal values; repeated aggregate arguments; explicit DISTINCT only if selected |
| Empty groups | No supports/no groups; ungrouped empty input; seeded keys with empty and nonempty groups; SQL outer-join adapter must distinguish a synthetic row from a contribution |
| Types and comparisons | Every accepted tag; rejected tags; mixed groups; string/collation ordering; min/max ties; integer/f64/boolean key identity; zero representations; non-finite behavior if in scope |
| Integer sum | Boundary-safe positives/negatives; immediate and late overflow; final-in-range/prefix-out-of-range; cancellation; same support under permutation; contiguous-block summary versus sequential oracle if that alternative is selected |
| Floating point | If accepted, cancellation, disparate magnitudes, tiny values, overflow/underflow, canonical-order changes, and batch/partition changes; compare exact required representation, not a tolerance borrowed from performance literature |
| Strata | Completed recursive lower producer; chained aggregates; aggregate→positive→aggregate cycle; self/mutual cycle; unreachable invalid cycle; aggregate plus negation; empty completed producer |
| Historical corrections | At each half-open boundary; before/after a correction; old and new versions; duplicate current/historical facts; malformed invisible rows; same program at different known/valid cuts without cache leakage |
| Limits/failure | Just-before/at/after every new logical limit; multiple errors with canonical precedence; no partial rows; after-failure fresh invocation; batched failure isolation; diagnostics and owned-error cleanup |
| UDF-specific regression | Two different same-signature/same-return-type aggregates together and reversed, grouped and ungrouped; compare distinct callbacks against the oracle; optional ordered inputs and parallel combine coverage; upstream issue 28132 remains an explicit gate |

A future permitted campaign should distinguish compile, input validation/visibility, lower-stratum evaluation, support dedup, grouping/reduction, encoding, and transport. Separate scalar/native-kernel cost from end-to-end query cost, and full result materialization from reduced-output experiments. Do not hide an expensive result or unreachable-but-required validation merely to match a paper's benchmark. Query-only logical metrics are sufficient to design the cases; no computer-environment packet is part of this proposal.

## 12. Oracle and SQL agreement obligations

Use an independent small, exact oracle for the chosen support-set and sum semantics, not a wrapper around the same grouping kernel. After whole-input validation and identical temporal visibility/dedup, compare canonical typed group/result sets with the SQL reference's adapted result. Historical correction inputs must be shared verbatim between the references.

For checked-i64 prefix semantics, an exact SQL window-prefix reference over an explicitly unique canonical support order could check every prefix, provided its accumulator bound is proved. It is not the same as ordinary SQL SUM plus a cast, and SQL expression/error evaluation must be staged so optimization does not redefine required error precedence. Count/min/max/empty/type/collation adapters need their own agreement cases. No SQL query was executed, generated plan accepted, or oracle agreement claimed here.

## 13. Closure and unresolved decisions

The source-supported capability map, ownership negatives, cost models, and synthetic campaign are frozen for this bounded research pass. Open decisions are language/support identity, empty results, type/overflow/order policy, new versioned API/IR/accounting, native memory strategy, and whether a future authorized SQL owner path is worth evaluating. These require an explicit selected contract and later authorized verification; they are not filled in by performance intuition.

**Current evidence:** source inspection and primary literature only. **Native build/load, syntax/link checks, unit tests, SQL agreement, performance, resource behavior, store integration, and acceptance: UNRUN / NOT ESTABLISHED.**

Source keys and precise locators are in `BIBLIOGRAPHY.md`; the actions and exclusions are in `RESEARCH-LOG.md`; the source-only artifact inventory is in `MANIFEST.json`.
