# DuckDB C API v2 assessment for temporal Datalog

Research date: 30 October 2026. Scope: answer Contributor's question about performance and integration gains beyond the current stable C extension API, and add an isolated section to the living roadmap (private application reference omitted). No implementation, API migration, deployment, benchmark run or roadmap reordering was performed.

## Conclusion

Keep the SQL-first hybrid direction. First compare the current stable v1.2.0 boundary with improvements available in stable v1, including the v1.5.6 stable band if dropping older-host compatibility is acceptable. Investigate v2 specifically for optimizer-time filter pushdown, richer scan scheduling/partition metadata, unified encoded-vector views, spillable column collections, or replacement scans exposing SQL subqueries/collections. There is no measured v2 speedup for this project.

The current scalar callback accepts a complete SQL-materialized list, copies strings into private native structures and emits nested lists. A header migration alone does not eliminate those costs. Typed BOOL/BIGINT/DOUBLE/STRUCT values do not require v2. Source/execution ownership remains with the existing implementation owner; item 1's typed-value research and ordered roadmap are unchanged.

## API identity and lifecycle

- DuckDB engine 2.0.0 ships both API families. Stable v1 uses duckdb.h and duckdb_extension.h. Our current binding pins C_STRUCT v1.2.0.
- Separate v2 uses duckdb_v2.h / duckdb_extension_v2.h and duckdb_v2_* symbols. Extensions cannot combine both extension headers.
- No v2 functions are stable in the inspected v2.0.0 release. The v2 extension header rejects a build without the unstable surface.
- C_STRUCT_UNSTABLE binaries are exact-host-version artifacts. Plan rebuilds, source adaptation where necessary, and a host/platform CI matrix rather than defeating loader checks.
- Stable v1.5.6 is a meaningful intermediate choice. Its generated stable vtable band includes scalar bind/init callbacks, vector reference/slicing, client-context and filesystem APIs. Using that minimum would exclude DuckDB 1.4.3.

Primary sources: [overview](https://duckdb.org/docs/2.0/clients/c/overview), [v2 extension header](https://github.com/duckdb/duckdb/blob/v2.0.0/src/include/duckdb_extension_v2.h), [v1 extension header](https://github.com/duckdb/duckdb/blob/v2.0.0/src/include/duckdb_extension.h), [versioning contract](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/VERSIONING.md), [release policy](https://duckdb.org/docs/2.0/dev/release_cycle).

## Capability evidence

### Already present in stable v1

The v1 table API already exposes table_function_supports_projection_pushdown, bind_set_cardinality, global/local initialization and init_set_max_threads. Those capabilities predate the v1.2.0 extension ABI. Table-shaped output and parallel-scan design are not v2-exclusive. The newer stable scalar lifecycle allows bound-program reuse rather than reparsing a constant program every row, with appropriate lifecycle/snapshot discipline.

The lifecycle entries for scalar_function_set_bind, scalar_function_set_init, slice_vector and vector_reference_vector mark stabilization at v1.5.6. Current stable v1 must not be equated with the project's deliberately old pin.

Sources: [table API lifecycle](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v1/table_function/table_function.yaml), [scalar lifecycle](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v1/scalar_function/scalar_function.yaml), [vector lifecycle](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v1/vector/vector.yaml).

### Genuine v2 differentiators

1. **Filter-aware scans:** table_function_set_filter_pushdown_callback receives bound predicates; expression accessors inspect them; filter_pushdown_accept transfers exact enforcement responsibility to the extension. The implementation connects this to TableFunction.pushdown_complex_filter and removes accepted predicates from DuckDB's remaining filters. This is a scoped scan hook, not unrestricted optimizer control. Pushing a final output predicate into recursive input can change reachability and needs a proof or a restricted safe case.
2. **Scan metadata:** order-preservation flags, batch claiming/partition data, progress and partitioning callbacks provide a richer source-operator contract. A truthful single-value partition report can enable partitioned aggregation. A maximum-thread hint does not make the private recursive algorithm parallel.
3. **ColumnDataCollection:** creation uses DuckDB's BufferManager. Appending copies, scans borrow buffers, and worker scan state bounds borrowed-chunk lifetime. It provides managed/offloadable intermediate relations, not persistent tables or automatic spill for private hash indexes.
4. **Encoded vector views:** flat, constant and dictionary representation plus data/validity/selection/count. Other kinds require flattening; reading a dictionary may flatten its child and invalidate prior borrowed child pointers. Stable-v1 reference APIs already avoid some copying. V2 single-cell get_value allocates owned values, so it is not the preferred hot loop.
5. **Replacement scans:** unresolved relation names can map to a table function, a column collection or one SELECT subquery. The callback must not execute queries reentrantly. A prepared statement can retain the collection borrow across executions; destroying/resetting the collection while the plan lives is unsafe.

Sources: [table contracts](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/function/table.yaml), [table implementation](https://github.com/duckdb/duckdb/blob/v2.0.0/src/main/capi/v2/capi_v2_func_table.cpp), [expression contract](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/expression/expression.yaml), [collection contract](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/data_chunk/column_data_collection.yaml), [collection implementation](https://github.com/duckdb/duckdb/blob/v2.0.0/src/main/capi/v2/capi_v2_column_data_collection.cpp), [vector contract](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/vector/vector.yaml), [replacement scan contract](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/function/replacement_scan.yaml).

### Integration ceiling and negative claims

The inspected [v2 public header](https://github.com/duckdb/duckdb/blob/v2.0.0/src/include/duckdb_v2.h) exposes no general logical-plan rewrite, custom physical operator, join-order extension or storage-engine registration API. Its table exec interface supplies output chunks, not a generic arbitrary relational input stream. General mutable-plan optimizer hooks are present in the separate [C++ OptimizerExtension interface](https://github.com/duckdb/duckdb/blob/v2.0.0/src/include/duckdb/optimizer/optimizer_extension.hpp). These observations are scoped to the v2.0.0 shipped C surface, not a prediction about later releases.

V2 has connection_interrupt, but no callback-context interruption polling function was found in that surface. Existing stable duckdb_interrupt already exists. Do not infer prompt cancellation inside a long private C++ loop, full private-allocation accounting, transaction-safe caches, a custom storage engine, or Datalog planning from a C API v2 port.

## Suggested comparison design

This is a proposed experiment, not an authorized implementation change from this research request.

1. Preserve current baseline and answer oracle.
2. Isolate stable-API changes: typed data, SQL-first filtering/joins, tabular output, and bind-time program reuse where supported.
3. Compare pinned v2 candidates using one differentiating feature at a time against that improved stable baseline, on the same DuckDB engine and kernel.
4. Charge input construction, parse/bind, copying, evaluation, output and result fetch equally. Capture peak process memory, managed memory, spill bytes, thread count and cold/warm conditions.
5. Include selective/nonselective EAV scans, large joins and deep recursion; verify NULL/type/interval semantics, recursive-filter soundness, borrowed-buffer lifetime and snapshot isolation.
6. Adopt only for a demonstrated benefit or an essential unavailable stable-v1 hook. Spilling may improve scale/survival while increasing latency.

## Delivery and verification

Inserted “DuckDB C API v2 integration tradeoffs” immediately before “Release boundary and living record” in the existing Page. Write receipt sequence 3. Readback at approximately 14:31 UTC confirmed 18 inserted blocks, exact intended section Markdown, and all 60 pre-existing block IDs/hashes unchanged. Existing roadmap order and status were preserved. Saved Markdown was verified; no rendered browser preview was inspected. Findings were shared with the roadmap coordinator.

Research used official DuckDB docs and tagged v2.0.0 generated headers, YAML specifications and implementation files. Public source downloads were inspected locally in /tmp/duckdb-v2-research. No execution benchmark, API compilation test, native ABI load test or new source build was run.

Next step: let current typed-value work proceed. Revisit these integration experiments with iteration 3 planning and iterations 5/6/8 where partitioning, resource containment and reuse become relevant.
