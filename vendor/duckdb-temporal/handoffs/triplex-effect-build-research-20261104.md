# Triplex, Effect and exact-source build research

Consolidated 4 November 2026 for the Mac handoff from two official-source research reports prepared earlier that day. This is project-contract/build research, not a record of an installation, typecheck, import, test or conformance run. It does not copy computer observations from those reports.

The later [PR22 source head]([PRIVATE_REFERENCE_REMOVED]) adds source-only Effect/QueryExecutor work. The actual final host primitive runtime evidence remains at a397e020; this research does not expand it.

## Exact revisions and what must be built

- Triplex: `bjacobso/triplex@e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0`. [Custom-runtime contract](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/custom-runtimes.md), [workspace/catalog](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/pnpm-workspace.yaml), [lockfile](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/pnpm-lock.yaml).
- Effect: published `effect@4.0.3`; official tag source resolves to `967a7dc5963a23d3705259d60ccac1ce9f060a3b`. [Release](https://github.com/Effect-TS/effect/releases/tag/effect%404.0.3).
- ulidx: `2.4.1`; official annotated v2.4.1 tag points to commit `bb685bac8d062bc168d231e97ebffff0dc389963`. [Manifest](https://github.com/perry-mitchell/ulidx/blob/bb685bac8d062bc168d231e97ebffff0dc389963/package.json).
- Triplex manifests declare core/testkit0.2.0, Node>=22 and pnpm10.11.0. The matching npm version number does not establish source equality with the pinned commit. The npm page's README was stale in the inspected source context.
- The pinned core has102 TypeScript source files; testkit has one. No tracked core/testkit dist outputs were present in the pinned tree. Their public JS/types exports resolve to dist. Source retrieval alone therefore does not produce usable package exports.
- Inspected GitHub core0.2.0, testkit0.2.0 and Effect4.0.3 releases had no attached binary assets. Release metadata target_commitish main is not npm-build provenance.

Use exact Triplex source, rather than substituting unproven npm0.2.0 equivalence. Prefer its official build recipe when matching its build process matters. Build core before testkit; verify exported JS/declarations from a fresh external consumer.

## Build closure: official and alternate emitter

[Core manifest](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/package.json), [testkit manifest](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/package.json), [base config](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/tsconfig.base.json), [Node config](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/tsconfig.node.json), [core config](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/tsconfig.json), [testkit config](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/tsconfig.json).

Minimal runtime package closure established from the pinned manifests/lock snapshots:
1. Exact-source core and testkit outputs, linked under their proper public package names.
2. One shared Effect4.0.3 runtime peer, not private duplicate Effect copies.
3. ulidx2.4.1 and its runtime dependency layerr3.0.0.

A possible alternate stock-tsc JS/declaration closure additionally needs TypeScript6.0.2, @types/node25.9.1 and undici-types7.24.6. This is six external packages in total: effect, ulidx, layerr, typescript, @types/node and undici-types. Test runners and adapter-specific dependencies are separate. A minimized staging project needs a deliberate manifest/lock/workspace-link design; blindly copying catalog/workspace manifests outside the workspace does not resolve their dependencies.

The checked-in Triplex configs use ESNext target/module, bundler resolution, declaration/maps, source maps, isolatedModules and noEmitOnError; core/testkit use src→dist includes with .js relative imports. Consequently a core-then-testkit `tsc -p` build is technically plausible, but **unexecuted and unvalidated**, an alternate emitter rather than official or byte-identical output.

Official package scripts use tsdown. [Core tsdown](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/tsdown.config.ts), [testkit tsdown](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/tsdown.config.ts) build all src entries ESM/esnext, unbundled, with declaration/JS maps. Their pinned tsdown0.21.7 closure is materially larger than tsc, including rolldown native or supported WASM bindings and DTS-plugin dependencies. The lockfile is the authority; a copied tsdown executable is not sufficient. [Turbo ordering](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/turbo.json) builds dependencies first, and [package checks](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/scripts/check-packages.mjs) verify public exports, package contents and a shared Effect peer.

Building Effect from source is a different closure: its source exports TS, while publishConfig rewrites to dist; official source build uses its own compiler/Babel/lockfile assumptions. Linking unbuilt source is not the published runtime. Do not turn source-build notes into an alternate acquisition channel around a blocked artifact.

ulidx's pinned Rollup config uses JSON import assertions, which native Node>=22 removed. Its unchanged source-build loader therefore needs compatibility verification; published-package acquisition and a separately authorized source-build adaptation are different choices. This is an unexecuted compatibility finding, not a request to change runtimes.

## Public runtime composition

[Runtime exports](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/runtime/index.ts), [Runtime.define](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/runtime/Runtime.ts), [DatabaseScope](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/runtime/DatabaseScope.ts).

- Import public runtime contracts from @triplex-build/triplex/runtime.
- Runtime.define accepts **StorageAdapter and QueryExecutor layers**, not bare services.
- Options require a validated DatabaseScope, constructed by make({env,tenant,database,generation}) or test(name); a plain string is invalid. Generation is a nonnegative safe integer.
- Explicit Capabilities.none selects base storage. Omitting capabilities invokes defaults requiring SnapshotService, SnapshotWriter and ChangeEmitter.
- Runtime.define invokes adapter.initialize but does not invoke adapter.close. Layer finalizers own connection release.

## StorageAdapter transaction and ownership contract

[Exact StorageAdapter source](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/storage/StorageAdapter.ts).

The base service requires withTransaction; commit-position allocation/current cut; dependencyState; claimCommand; insert/batchInsert/retract; getById/getByEntity/getByEntities; query/history; initialize/close.

withTransaction is generic in success/error but has no environment parameter. Its input effect must already have no remaining service requirements. Granular claim/allocation/write/journal calls must share one actual physical transaction. The earlier command helper that internally owns claim/allocation/completion is not automatically this contract, and Promise-to-Effect wrapping does not supply it.

SqlStorageAdapter additionally exposes rawQuery. It is not required by the base public Runtime storage contract.

The first conformance case creates360 assertBatch inputs, exceeding the earlier64-operation finite host-command profile. The later public primitive batch backend's4096-row support addresses a primitive capacity, but does not establish all accumulated conformance fixture limits or the public Effect transaction contract.

## QueryExecutor and optional shared-SQL strategy

[Exact QueryExecutor](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/storage/QueryExecutor.ts) requires execute, executePage, explain and explainPage with typed ReadError/DatalogQueryError behavior and declared debug/basis/cursor parameters. Results at this boundary are scalar binding contexts, not tagged TripleValue carrier objects.

[Shared SQL exports](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/index.ts) expose makeSqlQueryExecutor and makeSqlQueryExecutorLayer. Their [SqlStatementRunner](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/SqlQueryExecutor.ts) needs only run(sql,params) returning an Effect of row objects, not a full SqlClient. This is a potential compiler/decoder reuse option.

However, the pinned [SqlDialect type](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/dialects/types.ts) closes its name to sqlite/postgresql/mysql, and its expected storage mapping differs from the selected host facts schema. A named DuckDB dialect requires an explicit source/type change plus semantic compatibility testing. Casting it or calling it Postgres does not establish correctness. Direct public QueryExecutor implementation is a separate legitimate design path.

The SQL package adds core plus a shared Effect peer, not a mandatory database driver or separate @effect/sql. Its public root exports additional SQL layers, so verify the whole package if building it.

## Effect4.0.3 lifecycle and finalizer traps

[Layer source](https://github.com/Effect-TS/effect/blob/967a7dc5963a23d3705259d60ccac1ce9f060a3b/packages/effect/src/Layer.ts), [Context.Service](https://github.com/Effect-TS/effect/blob/967a7dc5963a23d3705259d60ccac1ce9f060a3b/packages/effect/src/Context.ts), [Effect.acquireRelease](https://github.com/Effect-TS/effect/blob/967a7dc5963a23d3705259d60ccac1ce9f060a3b/packages/effect/src/Effect.ts).

- Layer.succeed(tag, service) supplies an existing service. Layer.effect(tag, acquisition) supports scope-aware acquisition; there is no Layer.scoped export in the inspected4.0.3 source.
- Layer.build requires Scope. Triplex service tags follow Context.Service<Self,Shape>()("Tag").
- acquireRelease finalizers must return an Effect with no typed failure. StorageAdapter.close returns Effect<void,unknown>, so a raw close callback does not satisfy that finalizer contract without an explicit error-to-defect/handling policy. Do not silently swallow cleanup failures.
- Preserve original-fiber transaction context, interruption masking/restoration and actual terminal ACKs. A syntactic TypeScript strip/parse is not a semantic typecheck or proof the Effect API is correctly used.

## runtimeConformance: exact shape and test boundaries

[Standalone testkit helper and suite](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/src/index.ts), [conformance scope](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/custom-runtimes.md#L249-L259).

Import runtimeConformance from @triplex-build/triplex-testkit and supply a RuntimeDefinition, not a layer. There is no Runtime.conformance method. The helper builds runtime.layer(options), provides it to makeTriplesConformanceSuite, writes fixtures and does not provision/clear storage.

**All44 cases run with Capabilities.none as well.** None removes optional providers, not conformance cases. The unmodified helper has no subset selector; individually running exported triplesConformanceCases must be reported as subset evidence.

Use a fresh database. Two cases depend on real time advancing across Effect.sleep(2), so a fixed deterministic startTime must not be applied blindly. Passing44 cases does not establish exhaustive adapter-method coverage, production crash durability, process isolation, migration safety, ownership or complete snapshot/emission behavior.

Case-topic inventory from the exact pinned suite:
1. Due-work ranges, numeric aliases, visibility/order/limits.
2. Bounded default reads and complete snapshot cursors.
3. Historical cursor recorded-time/commit-snapshot intersection.
4. Recursive-relation pagination and optional total counts.
5. Assert/get/match.
6. Distinct identities for duplicate same-value batch facts.
7. Asserted facts in Datalog.
8. Scalar types without text guessing.
9. Flattened scalar deduplication before grouping/pagination.
10. Constant projection scalar identity.
11. Pattern-constant flattened scalar filters.
12. Value joins across scalar families.
13. Numeric equality as numbers.
14. String identity bindings.
15. Numeric-only ordered predicates.
16. Explicit typed-ref reverse lookup.
17. Variables bound from refs in value position.
18. Multi-hop ref joins.
19. Recursive transitive closure.
20. Repeated-variable rule unification.
21. Aggregate grouping/filtering/order.
22. Typed HAVING equality.
23. Duplicate/empty/distinct aggregate behavior.
24. Clause-order-independent bindings.
25. Invalid/unbound queries as backend-neutral typed errors.
26. Wrapped filters and SQL-null semantics.
27. Mixed-scalar ordering/pagination.
28. Untyped string versus typed-ref matching.
29. Transaction provenance datoms.
30. Atomic conditional transactions/journal.
31. Indexed complete snapshot-stable entity transaction history.
32. Valid-time graph-constraint post-state rejection.
33. Attribute-scoped dependencies and temporal scheduling.
34. Indexed materialization dependency freshness.
35. Cross-backend graph-constraint agreement.
36. Atomic queryable consumer checkpoints.
37. entityType-aware retractByPattern.
38. Reserved-namespace write rejection.
39. Ordinary writes cannot retract transaction journals.
40. Shared bitemporal basis for direct/Datalog reads.
41. Historical corrections preserve previously recorded state.
42. Associated/missing/temporal batched entity reads.
43. Retraction coherence across write/Datalog paths.
44. Deterministic snapshot-stable paged cursors.

Additional [runtime composition tests](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/test/runtime/runtime.test.ts) separately cover complete scope identity, deterministic IDs/clock, cross-scope cursor rejection, emission clock/duplicate capabilities, wrapper defects and cleanup on success/capability failure/initialization failure. [Runtime type tests](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/test/runtime/runtime.types.ts) preserve service requirements and error/capability types. These are outside the44-case helper and remain necessary where applicable.

## Integrity and access limits

The Triplex lockfile records package SRI values for Effect4.0.3, ulidx2.4.1 and layerr3.0.0. Those pin intended resolution; acquired bytes still require verification. Do not infer fetched package authenticity from a version string.

Earlier metadata/version-page reads failed through their selected reader. Later official npm metadata DNS EAI_AGAIN and a separate supported command's executor-prestart failure are recorded by the current goal10 owner. No successful tarball acquisition/install, semantic typecheck, Effect import or conformance execution is established by those failures.

Resolve the original supported acquisition/access boundary; do not use a mirror, CDN, source build, unrelated cache, alternate environment or transfer route to obtain a blocked artifact. The local task must establish its own authorized supported dependencies, not import a cloud environment or reinterpret these notes as a denial bypass.

## Integrated next checkpoint

Produce exact-source core/testkit exports with one shared Effect peer; semantically typecheck the current adapter; execute actual StorageAdapter transaction/lifecycle and QueryExecutor behavior against DuckDB; then run all44 unmodified cases and the additional type/lifecycle/backend tests with an explicit capability matrix. Preserve partial failures and state the exact tested source/runtime. Current successful primitive differential evidence remains a prerequisite, not public adapter acceptance.
