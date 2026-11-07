# Sources, provenance and source-availability limits

**Frozen research date:** 2026-11-01 UTC. Exact pin: `d54cbbe3df17e8e5ce68312f483b4155836112aa`. Public repository: `duckdb/duckdb`. API metadata declares `v2.0.0`, unstable.

## Acquisition and identity

The 41 connector records below are read-only public source acquisitions at the exact immutable requested ref, not installed source or machine observations. Each complete target and raw tool response was saved to its named JSON file before checking outcome fields. There are **38 successful records and 3 known NOT_FOUND records**. Successful component indexes are immediate, targeted filename-resolution reads, not recursive repository scans. `SOURCE-REGISTRY.json` is the final machine-readable counterpart; `SOURCE-REGISTRY-WIP.json` is a preserved earlier 28-record checkpoint, not the final registry.

The transport was the authorized public GitHub `fetch_file` connector for files, and public `contents` GET for immediate component indexes. Returned Git blob SHA identifiers are the connector's source identity at the exact requested ref. No local Git, generated header, installed version, running engine, compiler, query, private paused tree API, or independently recomputed Git object was used. SHA256SUMS hashes the local project packet bytes; those hashes are not a compiler/runtime verification or durable external backup claim.

The final report distinguishes (a) exact-pin YAML contract, (b) exact-pin implementation, (c) unpinned official release documentation, (d) a primary execution-model paper, and (e) explicit design/theory inferences. It does not promote PR history or generic documentation into pin facts.

## Exact connector records

| Key | Exact public target | Outcome/type | Returned Git blob SHA | Saved response |
|---|---|---|---|---|
| `connection` | `api_spec/v2/connection/connection.yaml` | pinned source file | 5ab2cd992e8124a6a8ff5e36b95052db08780420 | `PUBLIC-CONNECTION-RESPONSE.json` |
| `context` | `api_spec/v2/context/context.yaml` | known NOT_FOUND response | — | `PUBLIC-CONTEXT-RESPONSE.json` |
| `query-result` | `api_spec/v2/query_result/query_result.yaml` | pinned source file | 8801cf9a78eb83b3b9db34f7ba9eee76faf9510d | `PUBLIC-QUERY-RESULT-RESPONSE.json` |
| `error-info` | `api_spec/v2/error_info/error_info.yaml` | known NOT_FOUND response | — | `PUBLIC-ERROR-INFO-RESPONSE.json` |
| `module-index` | `https://api.github.com/repos/duckdb/duckdb/contents/api_spec/v2?ref=d54cbbe3df17e8e5ce68312f483b4155836112aa` | immediate public component index | — | `PUBLIC-MODULE-INDEX-RESPONSE.json` |
| `factory` | `api_spec/v2/factory/factory.yaml` | pinned source file | 3686912b59e422d177380b1f07e5c05100de377c | `PUBLIC-FACTORY-RESPONSE.json` |
| `function-index` | `https://api.github.com/repos/duckdb/duckdb/contents/api_spec/v2/function?ref=d54cbbe3df17e8e5ce68312f483b4155836112aa` | immediate public component index | — | `PUBLIC-FUNCTION-INDEX-RESPONSE.json` |
| `error` | `api_spec/v2/error/error.yaml` | pinned source file | e49ac132d7d26a164a4d2bb8a6a5d424495faa4e | `PUBLIC-ERROR-RESPONSE.json` |
| `common` | `api_spec/v2/common/common.yaml` | pinned source file | f883f81361154d6591904e451211df204d2dc3b1 | `PUBLIC-COMMON-RESPONSE.json` |
| `metadata` | `api_spec/v2/metadata.yaml` | pinned source file | 9f8d1c502bab156ea72c5244588356db345826f1 | `PUBLIC-METADATA-RESPONSE.json` |
| `function` | `api_spec/v2/function/function.yaml` | pinned source file | 73573106ab163549ecf6e5086f3c50207a616997 | `PUBLIC-FUNCTION-RESPONSE.json` |
| `capi-index` | `https://api.github.com/repos/duckdb/duckdb/contents/src/main/capi?ref=d54cbbe3df17e8e5ce68312f483b4155836112aa` | immediate public component index | — | `PUBLIC-CAPI-INDEX-RESPONSE.json` |
| `v2-index` | `https://api.github.com/repos/duckdb/duckdb/contents/src/main/capi/v2?ref=d54cbbe3df17e8e5ce68312f483b4155836112aa` | immediate public component index | — | `PUBLIC-V2-CAPI-INDEX-RESPONSE.json` |
| `scalar` | `api_spec/v2/function/scalar.yaml` | pinned source file | 04d631bd98ae99322500f25ce237dc8daf94abfa | `PUBLIC-SCALAR-RESPONSE.json` |
| `table` | `api_spec/v2/function/table.yaml` | pinned source file | bd76b85b986bb041c19724ca932a621e58be7725 | `PUBLIC-TABLE-RESPONSE.json` |
| `connection-impl` | `src/main/capi/v2/capi_v2_connection.cpp` | pinned source file | 2d88d63cb1e78022ce4f73f8cfcf7697c6002b94 | `PUBLIC-CONNECTION-IMPL-RESPONSE.json` |
| `result-impl` | `src/main/capi/v2/capi_v2_result.cpp` | pinned source file | c7b7391cc3069c12c42db88ab32bba29e66beaa8 | `PUBLIC-RESULT-IMPL-RESPONSE.json` |
| `scalar-impl` | `src/main/capi/v2/capi_v2_func_scalar.cpp` | pinned source file | 5e5b1ff85f5b4ad056514f4b9313fffe034e0746 | `PUBLIC-SCALAR-IMPL-RESPONSE.json` |
| `table-impl` | `src/main/capi/v2/capi_v2_func_table.cpp` | pinned source file | 31deaee5fe0f401aa1027842ae2d004649b26147 | `PUBLIC-TABLE-IMPL-RESPONSE.json` |
| `error-index` | `https://api.github.com/repos/duckdb/duckdb/contents/api_spec/v2/error?ref=d54cbbe3df17e8e5ce68312f483b4155836112aa` | immediate public component index | — | `PUBLIC-ERROR-INDEX-RESPONSE.json` |
| `internal` | `src/include/duckdb/main/capi_v2/capi_v2_internal.hpp` | pinned source file | eedc6ce06664fdf7c17c910b65faa7d606ad1c96 | `PUBLIC-INTERNAL-RESPONSE.json` |
| `core-impl` | `src/main/capi/v2/capi_v2.cpp` | pinned source file | eeee4e7f439fece673f7dd54e756d4cd56e86a76 | `PUBLIC-CORE-IMPL-RESPONSE.json` |
| `error-impl` | `src/main/capi/v2/capi_v2_error.cpp` | pinned source file | 792d688cb9ed87a3a38f47f250bc358291e5b12e | `PUBLIC-ERROR-IMPL-RESPONSE.json` |
| `client-context-impl` | `src/main/client_context.cpp` | pinned source file | 1631051fd816da2badc69b1f7a6028607c56d4c3 | `PUBLIC-CLIENT-CONTEXT-IMPL-RESPONSE.json` |
| `exception-impl` | `src/common/exception.cpp` | pinned source file | 3ca99bdfbdc8b14a8ab3c2cf0b6b349ddca9d785 | `PUBLIC-EXCEPTION-IMPL-RESPONSE.json` |
| `pipeline-impl` | `src/execution/pipeline_executor.cpp` | known NOT_FOUND response | — | `PUBLIC-PIPELINE-IMPL-RESPONSE.json` |
| `table-scan-impl` | `src/execution/operator/scan/physical_table_scan.cpp` | pinned source file | 083e947e42ce1c990f502e9601aa7598a246c6cd | `PUBLIC-TABLE-SCAN-IMPL-RESPONSE.json` |
| `result-internal` | `src/include/duckdb/main/capi_v2/capi_v2_result_internal.hpp` | pinned source file | 031190fa61f0bd193041af2a3b506a6aff45c063 | `PUBLIC-RESULT-INTERNAL-RESPONSE.json` |
| `parallel-index` | `https://api.github.com/repos/duckdb/duckdb/contents/src/parallel?ref=d54cbbe3df17e8e5ce68312f483b4155836112aa` | immediate public component index | — | `PUBLIC-PARALLEL-INDEX-RESPONSE.json` |
| `main-index` | `https://api.github.com/repos/duckdb/duckdb/contents/src/main?ref=d54cbbe3df17e8e5ce68312f483b4155836112aa` | immediate public component index | — | `PUBLIC-MAIN-INDEX-RESPONSE.json` |
| `chunk-index` | `https://api.github.com/repos/duckdb/duckdb/contents/api_spec/v2/data_chunk?ref=d54cbbe3df17e8e5ce68312f483b4155836112aa` | immediate public component index | — | `PUBLIC-CHUNK-INDEX-RESPONSE.json` |
| `pipeline-actual` | `src/parallel/pipeline_executor.cpp` | pinned source file | e6157482372996af5cf540503580023c1eb39c0a | `PUBLIC-PIPELINE-ACTUAL-RESPONSE.json` |
| `client-execution-impl` | `src/main/client_context_execution.cpp` | pinned source file | 2b204776ea6c99502adfa9c26737e993db7cccc7 | `PUBLIC-CLIENT-EXECUTION-IMPL-RESPONSE.json` |
| `chunk-spec` | `api_spec/v2/data_chunk/data_chunk.yaml` | pinned source file | 0307daff3484743f48aefbe27b3cc7f91f21a51f | `PUBLIC-CHUNK-SPEC-RESPONSE.json` |
| `collection-spec` | `api_spec/v2/data_chunk/column_data_collection.yaml` | pinned source file | 5e5424b15392bcf41681a38fde12525655de2c1a | `PUBLIC-COLLECTION-SPEC-RESPONSE.json` |
| `vector-spec` | `api_spec/v2/vector/vector.yaml` | pinned source file | 3d9fc5c4d1b1335798fd9a53463f89e80e237e70 | `PUBLIC-VECTOR-SPEC-RESPONSE.json` |
| `collection-impl` | `src/main/capi/v2/capi_v2_column_data_collection.cpp` | pinned source file | c4c520b3f7a17d573f9b44257a207d1e6caaea84 | `PUBLIC-COLLECTION-IMPL-RESPONSE.json` |
| `chunk-impl` | `src/main/capi/v2/capi_v2_data_chunk.cpp` | pinned source file | b4da83873b482bf9b151ed710050825e662929ca | `PUBLIC-CHUNK-IMPL-RESPONSE.json` |
| `vector-impl` | `src/main/capi/v2/capi_v2_vector.cpp` | pinned source file | 74f634bb97295a9251551c3b9fe9b86c536c64c7 | `PUBLIC-VECTOR-IMPL-RESPONSE.json` |
| `properties-spec` | `api_spec/v2/function/properties.yaml` | pinned source file | 429a3ff529a5837b74014b9aa257151a66e69312 | `PUBLIC-PROPERTIES-SPEC-RESPONSE.json` |
| `query-core` | `src/main/query_result.cpp` | pinned source file | e98b39e9ace5d8a1a5116e4e4498cda0691e47c7 | `PUBLIC-QUERY-CORE-RESPONSE.json` |

## Web source attempts and bounded availability record

These attempts are recorded as source availability, never as runtime evidence or a safety/capability result:

- Two initial raw exact-pin header payloads, `src/include/duckdb.h` and `src/include/duckdb_extension.h`, returned Internal Error/Cache miss. They remain stopped; no alternate transport was used for them. They do not establish the v2 callback interface.
- Exact raw opens for `api_spec/v2/connection/connection.yaml`, `context/context.yaml`, `query_result/query_result.yaml`, and `error_info/error_info.yaml` returned Cache miss. An explicitly permitted ordinary GitHub blob-page attempt for each also returned Cache miss. No failed request was repeated.
- The parent then explicitly authorized direct public connector reads for those distinct YAML topics. Connection and result succeeded; the two guessed context/error-info module paths returned known NOT_FOUND. Immediate v2 indexes resolved the actual common/context and error/error definitions. The wrong paths were not repeated; a missing guessed module is not absence of the type/capability.
- The named `src/execution/pipeline_executor.cpp` returned known NOT_FOUND. An immediate public `src/parallel` index identified the actual `src/parallel/pipeline_executor.cpp`, which succeeded. This is source-path resolution, not an alternate execution route or a retried policy denial.
- No genuine policy denial or uncertain mutation occurred in this research lane. The separately paused private source8/tree reads and stopped compiler/graph actions were not accessed, retried, or used.
- The final optional open of the generic 2.0 pragmas documentation had its combined tool output truncated before text was available for this consolidation. No new claim relies on that read and it was not repeated. The deadline claims in REPORT are grounded in exact-pin implementation instead.

The 41 JSON records cover the public GitHub connector phase. Earlier web cache-miss outcomes are described here from the tool outcomes; a separate raw web-response file is **not** claimed to exist for every earlier attempt.

## Supplementary primary/public references actually used

1. **DuckDB official 2.0 C overview** — [overview](https://duckdb.org/docs/2.0/clients/c/overview). Read as release documentation on 2026-11-01. Warns that v2 is unstable, names the v2 headers, distinguishes extension API choices. It is not immutable-pin source evidence.
2. **DuckDB 2.0 announcement, 2026-10-21** — [announcement](https://duckdb.org/2026/10/21/announcing-duckdb-200). Release context and v2 warning only; no assertion that release/LTS status stabilizes v2.
3. **DuckDB official complete legacy C API page** — [API](https://duckdb.org/docs/2.0/clients/c/api). Its unprefixed legacy functions are not substituted for APIv2 evidence.
4. **DuckDB vector-format documentation** — [vector](https://duckdb.org/docs/2.0/internals/vector). Architectural context only; the report's vector alias/flatten/lifetime claims come from exact-pin YAML/source.
5. **Kersten, Leis, Kemper, Neumann, Pavlo and Boncz (2018)**, *Everything You Always Wanted to Know About Compiled and Vectorized Queries But Were Afraid to Ask*, PVLDB 11(13), 2209–2222, DOI 10.14778/3275366.3275370 — [publisher PDF](https://www.vldb.org/pvldb/vol11/p2209-kersten.pdf). Used only for execution-model/dispatch/batching context, not hardware details, numerical results or a performance forecast.
6. **Public APIv2 PR #24702** — [PR](https://github.com/duckdb/duckdb/pull/24702). Read for file/topic discovery and history; not used to prove that a proposed/history behavior is present at the selected pin.

## What remains unverified

Generated public v2 headers and every possible module/planner/cleanup route are not exhaustively verified. The callback-local polling conclusion is restricted to the complete named spec texts and callback context definition actually read. No machine-specific cancellation latency, memory consumption, storage health, API behavior, installed compatibility or future stability has been measured. All empirical stages are UNRUN. No execution plan, host route, private ABI escape, callback implementation or repair is authorized.

