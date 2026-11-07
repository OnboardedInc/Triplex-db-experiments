# Exact-pin source bibliography

Source-only reference list for the public-v2 boundary-cost report. Accessed 2026-10-31. Pinned repository: duckdb/duckdb; ref d54cbbe3df17e8e5ce68312f483b4155836112aa.

## Authoritative public-v2 contracts

- [Vector API specification](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/vector/vector.yaml): layouts, selection, view alias mutation, sizing, mutable data/masks, arena and child lifetimes.
- [Scalar API specification](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/function/scalar.yaml): callback batch cardinality and borrowed argument/result vectors.
- [Arena API specification](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/arena/arena.yaml): byte allocation and ownership.
- [Error API specification](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/error/error.yaml): borrowed text, copying setters, destruction.
- [Generated public header](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_v2.h): exact carrier layout/12-byte inline cutoff; supplementary to module contracts.

## Exact implementation sources

- [capi_v2_vector.cpp](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_vector.cpp)
- [capi_v2_func_scalar.cpp](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_func_scalar.cpp)
- [capi_v2_arena.cpp](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_arena.cpp)
- [capi_v2_error.cpp](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_error.cpp)
- [capi_v2_internal.hpp, error-handler implementation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/main/capi_v2/capi_v2_internal.hpp)
- [Vector reserve/flatten](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/common/types/vector.cpp)
- [VectorBuffer reserve geometry](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/common/types/vector_buffer.cpp)
- [Standard/flat buffer reserve and materialization](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/common/vector/flat_vector.cpp)
- [STRUCT reserve/size/flatten/child access](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/common/vector/struct_vector.cpp)
- [LIST flatten/child access](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/common/vector/list_vector.cpp)
- [Constant-vector count-aware zero selection](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/common/vector/constant_vector.cpp)
- [Flat-vector size delegation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/common/vector/flat_vector.hpp)
- [Constant zero-selection singleton](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/common/vector/constant_vector.hpp)
- [StringHeap ownership](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/common/types/string_heap.hpp)
- [Arena allocator cursor](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/storage/arena_allocator.hpp)
- [Arena block growth](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/storage/arena_allocator.cpp)
- [Scalar constant/dictionary execution eligibility](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/execution/expression_executor/execute_function.cpp)

## Official documentation and original papers

- [DuckDB 2.0 C API overview](https://duckdb.org/docs/2.0/clients/c/overview): v2 instability and separate extension header.
- [DuckDB 2.0 execution format](https://duckdb.org/docs/2.0/internals/vector): vectorization/compression context; not a nested-count bound.
- Boncz, Zukowski, Nes. [MonetDB/X100: Hyper-Pipelining Query Execution](https://ir.cwi.nl/pub/16497/16497B.pdf). CIDR 2005. Motivation for vector-sized execution versus full materialization; no candidate timing evidence.
- Raasveldt, Mühleisen. [Data Management for Data Science: Towards Embedded Analytics](https://duckdb.org/pdf/CIDR2020-raasveldt-muehleisen-duckdb.pdf). CIDR 2020. Bulk transfer motivation; no candidate timing evidence.
- Kersten et al. [Everything You Always Wanted to Know About Compiled and Vectorized Queries But Were Afraid to Ask](https://www.vldb.org/pvldb/vol11/p2209-kersten.pdf). PVLDB 11(13), 2018; DOI 10.14778/3275366.3275370. Matched implementation methodology; no candidate timing evidence.

## Local published source evidence

Local source root: temporal-roadmap-item04-20261031/candidate-001/engine/. Read only the following published files:

- src/temporal_datalog.cpp — binding call graph and formulas.
- src/temporal_float.hpp — compatible-controls sampling semantics.
- src/temporal_value_domain.hpp — interning, validation and ownership.
- src/temporal_typed_core.hpp — owned Value and result interfaces.
- ITERATION-04.md — published transport contract and successful guard model.

Exact source hashes and public returned source-blob identities are in the companion source manifest. No empirical result is asserted.

