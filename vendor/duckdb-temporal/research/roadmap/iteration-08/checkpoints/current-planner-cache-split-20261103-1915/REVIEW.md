# Independent source review and disposition

3 November 2026. Research-only review of the proposed goal 8 cache split, with a separate exact-ref PR 18 source countercheck. No product build, import, test, compiler, database, package, snapshot or Codex action ran.

## Closed source findings

1. Complete PR 18 compile output includes syntactic route/reason. The proposed cache now keeps only SQL-producing successful artifacts, retains their route/schema compiler metadata and excludes data-dependent goal 5 proof/route outcomes and runtime admission. Non-SQL native_required output remains uncached.
2. Exact raw program and raw goal bytes are keys. Parsed/trimmed goal names alone could skip raw UTF8/length/syntax checks.
3. PR 18 output owns runtime-cut descriptors and program constant keys, not current cut values or fact rows. Input shape/data-dependent typing in goal 5 must not be attributed to PR 18's separate fixed-table template.
4. Compiler caps are fixed source constants, not nonexistent generationCaps/queryCaps fields. Input fact admission and the scalar callback's current-batch 8 MiB serialized-output accounting remain separate.
5. All-program diagnostics and syntactic route are distinct: disconnected invalid definitions reject; a disconnected recursive component returns native_required. A goal-reachable cache slice cannot replace the complete compiler artifact.
6. An unbound template depends on an expected BLOB/temporal schema profile. A bound DuckDB handle additionally needs connection/temp-relation generation and reviewed invalidation. No current cross-call bound owner is established.

The reviewer reported no remaining blocking PR 18 source finding after those corrections. The parent source analysis independently inspected PR 20's query/IR/proof/SQL/value modules; the narrower review does not claim a second full PR 20 implementation audit.

## Exact review sources

At a6f72041d2620355fd4fcd7f1c33f8deb1bb6bfa:
- planner.hpp:3–5, pure compile(program,goal) interface.
- planner.cpp:15–16 and157–162, fixed caps and raw input/goal validation.
- planner.cpp:169–193, complete validation and recursive route.
- planner.cpp:196–230, cut descriptors, owned typed constant keys, fixed schema and SQL.
- adapter.py:70–104, complete retained input validation.
- adapter.py:106–134, fresh connection/table/parameters/result/close.
- extension.cpp:11 and48–65, current-batch output accounting.

All paths are below projects/temporal-datalog/prototype/goal31-independent-20261103/. Named connector-returned Git blob IDs are in SOURCES.json.

## Honest boundary

This review closes the documented research ambiguity only. No cache implementation, runtime hit, parser bypass, randomized equivalence, memory envelope, incremental maintenance, accepted goal 8, actual-host PR 18 equivalence or production-readiness result follows. The proposed next source deliverable still needs coordination with the current 3.1 owner; it does not create a duplicate implementation lane.
