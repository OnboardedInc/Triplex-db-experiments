# Paused state — 2026-11-06

## Final action

Development, native experiments and benchmarks were stopped for handoff. Owned XTDB, QLever and regression PostgreSQL services were stopped with their data retained on the source machine. No project data was deleted. No new native gate was launched after the pause request. Only copying, public downloads, sanitization, static export-tool checks, integrity verification, compression and adversarial review continued.

## Current implementations

Both new backend packages are private and begin from `Capabilities.none`. Triplex remains the schema/type and application foundation. Triplex Datalog is translated to XTDB 2.2 SQL or QLever 0.6 SPARQL. Queries read a fixed basis; rule declarations define validated relations; assertions, retractions, batches and commands mutate through Triplex APIs. Query evaluation never implicitly commits application facts.

Shared work includes immutable assertion identity, duplicate-addressable assertions, transaction-local overlays, position/claim/receipt contracts, tagged lossless exact integers and explicit valid/recorded/source time coordinates. These features have differing levels of evidence. The plan is the contract, not proof of implementation completeness.

The last source checkpoints before later uncommitted work were shared core `5d45119`, exact-integer union validation `9382694`, and backend checkpoint `ac1078f`. No Git history or local author/branch metadata is bundled. The exported working tree, including later edits, is the starting artifact.

## Most recent evidence and open failures

| Item | Paused result / meaning |
| --- | --- |
| Whole workspace check | PASS: 719 core tests, 8 HTTP integer-codec tests, 12 strict-comparator tests; 28 package test tasks, 30 typecheck tasks, docs snippets and documentation build. See `triplex-backends/qualification/evidence/workspace-check-final-v2.log`. |
| PostgreSQL regression | 20 PASS on the retained shared-core checkpoint. This does not qualify XTDB or QLever. |
| XTDB runtime44 | Retained PASS in `qualification/evidence/xtdb/suite-2026-11-06T15-30-06-453Z-4117112d-receipt.json`; predates the union fix and later edits. |
| XTDB workload142 | Retained 142/142 PASS in `qualification/evidence/xtdb/workloads-2026-11-06T15-34-12-560Z-d6f37cb7-receipt.json`; also predates the union fix. No fresh final-build XTDB run. |
| Latest QLever runtime44 | FAIL in `qualification/evidence/qlever/suite-2026-11-06T16-14-19-211Z-92a571ac-receipt.json`, stable validation error rather than OOM. Internal recursion projects duplicate `?node` for an equality self-rule; core rejects duplicate projected variables. Fix is not implemented. |
| Latest QLever workload142 | Fresh compact-v3 run not executed. Older run: 70 PASS, 43 FAIL, 29 unexecuted following an earlier OOM. No complete paired passing comparison. |
| New paired-controller memory option | `--adapter-memory-bytes` and the named 1GiB-per-controller profile were saved/formatted after the latest QLever44 failure. Untested and unqualified. |
| HTTP exact integer round trip | Pure codec tests passed. New public native round-trip experiment exists and typechecks; native end-to-end execution was not performed. |
| Package consumer validation | Earlier 12-tarball consumer check passed before latest HTTP/QLever changes. Final repeat was not run after pause. |
| QLever read recovery | compact-v3 recovered 45 synthetic facts with typed/history/receipt checks. This fixture refers to omitted mutable retained state; the fresh bootstrap alone cannot reproduce it. |
| Managed writer | 30 offline/model checks. Native failure packet prepared, NOT EXECUTED. No native write-fault qualification. |

### QLever failure and resource interpretation

The self-rule failure is near `packages/qlever/src/recursion.ts`: the round currently constructs `find: [first, end]` even when those variables coincide. A candidate fix needs unique projection plus native aliasing into two output channels while preserving body equality. It requires focused and unchanged public-suite checks; no fix was applied for packaging.

Old 4GiB-container / 2G-native / 16-thread read trials OOMed three times. compact-v3 is a **new** profile: 4 CPUs, 4GiB container, 512M native query budget, 4 threads, 64M cache, 32M cache-entry limit, planner limit100. In separate2CPU/2GiB candidate nodes, bounded MASK projection passed seven correctness cases; DISTINCT also passed. Those candidate checks are not full compact-v3 qualification. MASK was selected for bounded one-row metadata, not a demonstrated performance win. Default 30-second deadline and width32 remain provisional.

QLever's native integer/float representation has precision limits (60-bit integer and 49-bit floating payload); lexical codecs preserve the declared Triplex value contract. Arbitrary float SUM/arithmetic remains unsupported. Single-MODIFY atomicity concerns come from source inspection, labeled `SOURCE_AUDIT_INFERENCE`, not an executed single-MODIFY counterexample. An earlier multi-operation partial commit is a narrower empirical observation. The pinned source audit identifies mutation, publication and snapshot-write paths without an observed rollback or explicit fsync guarantee. Do not convert either fact into a stronger native atomicity/durability claim.

## Scale, comparison and goal ledger

No full ten-goal implementation or final-scale acceptance exists. Ten million retained facts is distinct from ten million entities; the representative final entity profile requires roughly100 million active facts before history. Existing large synthetic DuckDB fixtures largely cover about39,000 main entities. They do not satisfy the requested distinct-entity scale.

XTDB has a bounded100,000 distinct domain-fact subject sparse checkpoint, with configured-entity/presence overhead separately unresolved. Larger XTDB admission is capacity-model blocked under the local envelope, not proof of physical impossibility. QLever capacity is not calibrated. No million/ten-million distinct-entity paired gate or fair P99 population is qualified. P99 requires at least10,000 observations per population and three independent runs; 1/4/16 readers, concurrent ingestion, cold/warm, startup/load/restart and full lifecycle costs remain required.

The current comparison contains **only public Triplex-on-XTDB and public Triplex-on-QLever**. Independent event replay is the oracle; tuned native SQL/SPARQL probes are controls. Strict comparison tests bind exact report bytes, run identity, independent expected keys and shared public build/harness identity. Earlier receipts missing the newer result-artifact field cannot pass the new strict reader merely because older cases passed.

The earlier DuckDB branch reports 435 integration checks at its historical integration checkpoint, including44 Triplex cases. Its ledger reports goals2/4/5 closed and seven open. It retains unresolved128MB/64MB spill revalidation OOM, roughly41.7–42.1% no-policy write regression, temporal reference/deletion semantics, derived publication/resource accounting and final entity-scale gaps. These are historical reported results, not runs performed for this export.

## Resume priority

1. Verify the sanitized bundle, create a work copy, choose local capacity and a named resource profile; preserve historical failures.
2. Make original-Git-origin verification assumptions explicitly portable without manufacturing an old protected-source PASS. Hash new inputs and record that the sanitized archive is the source baseline.
3. Fix and test the QLever self-rule; test the new controller memory option and native HTTP integer round trip.
4. Rebuild once, then run fresh44 and142 gates for both backends on that same build with independent expected answers. Restore new receipt/source-proof compatibility before fair comparison.
5. Resolve native write atomicity/outcome, competing writers, cancellation, restart and failure injection. Then continue all ten goals and the scale ladder using two or three competing bottleneck experiments and exclusive fair performance trials.
6. Qualify all platform/resource changes. Source inspection, model checks and conformance subsets cannot close full-system gates.
