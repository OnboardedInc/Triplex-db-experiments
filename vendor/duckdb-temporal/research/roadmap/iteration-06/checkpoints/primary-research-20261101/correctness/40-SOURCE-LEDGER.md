# Public-primary source ledger, exact pin and limits

Read 2026-11-01 UTC for this genuinely new ITEM6 lane. **Literal public text/PDF research only; no implementation or empirical action.** Search results were used to locate primary publications; secondary blogs, forums, encyclopedias, generated summaries and search snippets were not used as technical authorities. No stopped/paused packet, tree API/listing, local installed source or machine inventory was requested.

## Exact DuckDB source identity

Selected commit: **d54cbbe3df17e8e5ce68312f483b4155836112aa** in official `duckdb/duckdb`.

[Official commit page](https://github.com/duckdb/duckdb/commit/d54cbbe3df17e8e5ce68312f483b4155836112aa) resolved at the selected immutable URL. The commit title/diff metadata are not cancellation evidence, a library version observation or a repository-tree proof. Technical findings use only the named pinned source texts below.

All pinned raw-file requests used this exact base:
`https://raw.githubusercontent.com/duckdb/duckdb/d54cbbe3df17e8e5ce68312f483b4155836112aa/`

### Successfully read, focused sections

| ID | Exact public source | Read scope and evidentiary limit |
|---|---|---|
|D1|[src/main/client_context.cpp](https://raw.githubusercontent.com/duckdb/duckdb/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/client_context.cpp)|Focused interrupt/deadline, error/invalidation, open-result, query and transaction paths: display sections 203–262, 403–418, 812–906, 1014–1061, 1092–1205. This is not a complete formal audit or implementation-level proof of all cleanup helpers.|
|D2|[src/include/duckdb/main/client_context.hpp](https://raw.githubusercontent.com/duckdb/duckdb/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/main/client_context.hpp)|Focused declarations/comments around interrupt/query/submission/result ownership and completion, sections 104–109, 140–183, 278–327. A declaration/comment is not a read implementation of every helper.|
|D3|[src/transaction/meta_transaction.cpp](https://raw.githubusercontent.com/duckdb/duckdb/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/transaction/meta_transaction.cpp)|Commit/rollback error paths and write-database restriction: sections 107–178 and 239–263. No complete attached/external-catalog atomicity claim.|
|D4|[src/execution/operator/join/physical_hash_join.cpp](https://raw.githubusercontent.com/duckdb/duckdb/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/execution/operator/join/physical_hash_join.cpp)|Focused source stages/delegation and loop: sections 2099–2114 and 2445–2580. A text search found no explicit interrupt-check name in this file; no conclusion about absence of delegated checks or all engine cancellation is drawn.|

Section numbers are retrieval display locations, not asserted source-content hashes or exact rendered GitHub line anchors. Public tools returned indexed source text; this lane did not save whole source files or compute their entire UTF8/Git-blob hashes. The immutable URL/pin and focused read scope are the asserted identities. No module loading or bytes-executed proof follows.

### Pinned reads unavailable — no retry or substitute copy

Each of the following exact relative paths was requested once at that same raw base and was unavailable through the public tool (cache miss). No compiler/source parser, installed header, tree query, alternate version, mirror or second transport was used to fill the gap:

1. `src/transaction/transaction_context.cpp`
2. `src/execution/executor.cpp`
3. `src/main/pending_query_result.cpp`
4. `src/include/duckdb/transaction/transaction_context.hpp`
5. `src/common/exception.cpp`
6. `src/main/client_context_state.cpp`
7. `src/main/CMakeLists.txt`
8. `src/execution/pipeline_executor.cpp`
9. `src/execution/operator/set/physical_recursive_cte.cpp`
10. `src/include/duckdb/main/query_result.hpp`
11. `src/main/query_result.cpp`
12. `src/main/capi/duckdb-c.cpp`
13. `src/include/duckdb/execution/operator/set/physical_recursive_cte.hpp`

**Consequences:** default transaction policy, exact C API wrapper/binding, full query-result/terminal cleanup implementation, all executor checkpoint sites and recursive-operator cancellation coverage are **not established** by this lane. Source acceptance for an implementation remains open on those points. Unavailable is not a source defect, an engine failure, proof a path is absent, or authority to probe an installed program.

## Public documentation context, explicitly not pin-specific runtime evidence

D5. [DuckDB transaction management](https://duckdb.org/docs/2.0/sql/statements/transactions): the requested current-doc page redirected to public 2.0 documentation. Read transaction visibility/abort concepts and statement descriptions. This is not a bridge from the exact source pin to an installed version/default configuration. The linked encyclopedia was not used as authority.

## Primary literature read

| ID | Publication / primary location | Focus and limit |
|---|---|---|
|L1|[Maurice Herlihy and Jeannette Wing, *Linearizability: A Correctness Condition for Concurrent Objects*, TOPLAS 12(3), 1990, author-hosted original paper](https://www.cs.cmu.edu/~wing/publications/HerlihyWing90.pdf)|Read invocation/response histories, pending operations and linearizability/serializability distinctions (§§2.1–2.2, 3.3). Not a database implementation, cancellation latency or recovery protocol proof.|
|L2|[Kyle Kingsbury and Peter Alvaro, *Elle: Inferring Isolation Anomalies from Experimental Observations*, PVLDB 14(3), 2021](https://www.vldb.org/pvldb/vol14/p268-alvaro.pdf)|Read observations/indeterminate transactions, traceability/recoverability and stated limitations (§§2–3, discussion). No Elle software, workloads, injection or checker executed; no predicate-complete or universal-health claim.|
|L3|[Manuel Rigger and Zhendong Su, *Testing Database Engines via Pivoted Query Synthesis*, OSDI 2020, USENIX paper](https://www.usenix.org/system/files/osdi20-rigger.pdf)|Read oracle concept and explicit limitations on full result/transaction/concurrency/cardinality coverage. No generator or artifact used.|
|L4|[Viktor Leis, Peter Boncz, Alfons Kemper and Thomas Neumann, *Morsel-Driven Parallelism*, SIGMOD 2014, author manuscript at CWI](https://ir.cwi.nl/pub/22547/22547B.pdf)|Read pipeline/morsel boundaries and cooperative cancellation/cleanup discussion, especially §3.2. Publication benchmarks/hardware details were not adopted as project or computer observations.|
|L5|[Anurag Chakraborty and Semih Salihoğlu, *Robust Recursive Query Parallelism in Graph Database Management Systems*, PVLDB 18(11), 2025 / arXiv:2508.19379v1](https://arxiv.org/pdf/2508.19379)|Read iterative frontier expansion and source/frontier morsel design space (§§2–3). This is the paper's model/systems, not verification of the unavailable pinned DuckDB recursive body; no performance numbers transplanted.|

[Author-repository metadata for L4](https://ir.cwi.nl/pub/22547) and [arXiv metadata for L5](https://arxiv.org/abs/2508.19379) were also read to identify the primary manuscripts. Only paraphrased focused findings and new project inferences are saved; no whole article/source copy or long quotation is reproduced.

### Additional recovery reference: metadata only / full text unavailable

[IBM's original ARIES publication record](https://research.ibm.com/publications/aries-a-transaction-recovery-method-supporting-fine-granularity-locking-and-partial-rollbacks-using-write-ahead-logging) was readable for title/authors/publication identity. The selected original-paper PDF at `https://people.eecs.berkeley.edu/~brewer/cs262/Aries2.pdf` was requested once and timed out. It was not retried through other copies. No detailed ARIES theorem/algorithm claim is relied on, and DuckDB is not claimed to implement ARIES. The full-paper gap remains unchecked.

## Activity and continuation boundary

All public sources above are new selections for this research lane, not recovery/repackaging of a denied packet. Existing project-scope limitations in the obligations document come from the coordinator/conversation's already supplied descriptions; no old test/result/backup/controller/paused source was reopened. No API source trace was executed and no executable SQL, instantiated runtime fixture, materializer, generator, benchmark, test or probe was produced.

Every import/parser/AST/reference/graph/native/compiler/controller/child/host/store/runtime/feed check is **UNRUN**. No computer-environment details, diagnostics, clocks, process/path/capacity information or installed capability were collected. Only local research/progress/manifest/hash files are written. No Git/Page/external write, deletion, Codex task or implementation permission is implied. Root must integrate independent review and the other heavy lanes before selecting implementation. Relevant unresolved binding/cancellation/recovery obligations must be resolved for whichever design is selected; this does not require every unavailable ancillary file as a new universal gate.
