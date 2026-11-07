# Pinned primary-source evidence and provenance

Research date: **2026-11-01 UTC**. Exact repository: public `duckdb/duckdb`. Exact ref for every pinned row below: **d54cbbe3df17e8e5ce68312f483b4155836112aa**. The identities are Git blob SHAs returned by the read-only GitHub file API, not local-computer or binary observations.

Public web raw/blob header routes initially returned cache misses. The commit page resolved, and the read-only file API then returned the exact requested paths/ref/content and blob identities. No default branch, unpinned header, installed package, stable ABI, issue attachment or private/held project source was substituted. Upstream source was read as text only; none was installed, compiled, loaded, or copied into an adapter.

## Retrieved pinned files

| Public source | Returned blob SHA | Reviewed/useful sections |
|---|---|---|
| [duckdb_v2.h](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_v2.h) | c36fe3ac3edd536aba8e79f6d7d9a81ed834c5e4 | Version/unstable gates; common owners/views/opaque resources; function properties; table/scalar/aggregate callbacks; concrete type construction; vector/validity/arena; result ownership/cancellation; registration/error declarations. Full header retrieved; cited bounded excerpts inspected. |
| [duckdb_extension_v2.h](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_extension_v2.h) | b77dc115c1013e8f4db54f372cfd53d3148455ce | Lines1–160 read; no stabilized v2 surface, exact-version warning, mutually exclusive extension families. |
| [capi_v2_func_table.cpp](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_func_table.cpp) | 31deaee5fe0f401aa1027842ae2d004649b26147 | Bound-data copying18–48, one-thread state52–63, binding387–426, initialization447–478, output/error/cardinality581–625, builder782–837. |
| [capi_v2_func_scalar.cpp](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_func_scalar.cpp) | 5e5b1ff85f5b4ad056514f4b9313fffe034e0746 | Row-vector exec201–232; concrete-type/builder254–285. |
| [capi_v2_func_aggregate.cpp](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_func_aggregate.cpp) | d3d64d9dae6b70afb5e067bd693e9ba1de655c3e | State/update/combine/finalize/destruction205–312, mandatory callbacks/concrete return333–375. |
| [capi_v2_vector.cpp](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_vector.cpp) | 74f634bb97295a9251551c3b9fe9b86c536c64c7 | Unified views144–194; copied cell read428–441; cast-capable cell write444–459. |
| [capi_v2_value.cpp](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_value.cpp) | 1f746dc96fb39e59d9f00977707d13ae4f8d1c0e | Actual ReadAs55–83; typed payload wrappers176–278; double/string/blob constructors548–577. The helper body, not the stale strict-getter heading at197–199, supports the conversion finding. |
| [capi_v2_error.cpp](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_error.cpp) | 792d688cb9ed87a3a38f47f250bc358291e5b12e | Whole58-line file read; error setters/getters/destruction. |
| [capi_v2_internal.hpp](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/main/capi_v2/capi_v2_internal.hpp) | eedc6ce06664fdf7c17c910b65faa7d606ad1c96 | Callback context405–443, error wrapper756–837, opaque resource ownership918–976. Internal source is explanatory evidence, **not** an integration/API dependency. |
| [capi_v2_function_internal.hpp](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/main/capi_v2/capi_v2_function_internal.hpp) | 4deccc93f609ab02830caf8c61f75f1e1b4b8615 | Function bind-data distinction72–135, especially table constant arguments121–135. Explanatory evidence only. |
| [capi_v2_result.cpp](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_result.cpp) | c7b7391cc3069c12c42db88ab32bba29e66beaa8 | Retrieved and declaration/location matches viewed; no result-implementation claim relies on its uninspected body. Stream claims cite the public header instead. |

## Official background, deliberately not exact-pin API proof

The official stable-doc URLs redirected to the 2.0 documentation pages on the research date. They are version-labelled documentation, not content-addressed evidence for this commit:

- [Aggregate functions](https://duckdb.org/docs/2.0/sql/functions/aggregates#handling-null-values): NULL handling, empty-group results and distinction between ordinary DISTINCT values and full source rows.
- [UNION type](https://duckdb.org/docs/2.0/sql/data_types/union): tagged alternatives, potentially NULL active payloads, implicit casts and tag-first comparison background. Only transport-risk context; no project comparator/carrier acceptance inferred.
- [Exact commit page](https://github.com/duckdb/duckdb/commit/d54cbbe3df17e8e5ce68312f483b4155836112aa): corroborates that the requested commit resolves; API facts rely on the exact file retrievals above, not the commit title.

## Evidence classes

- **Pinned declaration:** what the public header promises at this ref.
- **Pinned source observation:** what the inspected upstream implementation text does at this ref; not an executed result.
- **Inference:** the minimal leaf-egress boundary and associated scope risks derived from those facts.
- **Unestablished:** compiled/linkable/exported runtime availability in the user's host, registration/load success, bit round-trip/alias/cleanup correctness, semantic/counter/compatibility agreement, cancellation responsiveness, spilling, and performance.

All source/text hashes in the proposal manifest identify authored research content only. No generated bindings, command packet, test input generator, execution plan, local product-source copy, or computer-environment packet is part of this evidence.
