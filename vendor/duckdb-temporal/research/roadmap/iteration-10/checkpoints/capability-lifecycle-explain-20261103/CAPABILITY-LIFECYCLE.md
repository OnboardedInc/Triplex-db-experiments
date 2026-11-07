# Triplex capability providers and lifecycle ownership

Research date: 2026-11-03. Repository: `bjacobso/triplex`. Exact source commit: `e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0`.

## Useful conclusions first

- Explicit `Capabilities.none` removes snapshot/emission wrappers. Omitting the option does the opposite: the default needs `SnapshotService`, `SnapshotWriter`, and `ChangeEmitter`; it does not fabricate persistence or silently discard events.
- The public builder owns composition, not connections. Supplied layers must acquire and release the resources they own. `Runtime.define` initializes the adapter, but never calls its `close()` method. A borrowed host connection must not accidentally acquire a second close owner.
- Construction proceeds through raw layer build, initialization, capability-provider build, validation, and wrapping. Invalid duplicate/dependency combinations are checked **after** providers have built; a failing construction can already have acquired resources.
- Capability-name validation is not a general dependency graph, physical-database, or resource-ownership validator. It checks required names exist and names are unique; priority controls wrapping.
- Separate failure boundaries matter: failed construction must release scoped resources; a failed/interrupted source transaction must roll back its entire atomic unit; failed snapshot projection can report `WriteError` **after** source commit.
- The supplied runtime tests are evidence of intended cases, not proof for a future adapter. They cover resource release on success, duplicate-capability failure, and initialization failure. The inspected tests do not establish interruption cleanup, borrowed-connection ownership, partial acquisition cleanup, or post-close error semantics for a DuckDB adapter.

This is source-only research. No package, model, fixture, adapter, database, or conformance suite was imported or run. No product code was changed. Published cursor/receipt/fixed-clock research remains prior work. There is no novelty claim over unpublished work, no promotion of goal 10, and no reopening of held goals or private original-owner artifacts.

## Evidence labels

- **Documented contract:** what pinned Triplex documentation explicitly promises or requires.
- **Source observation:** control flow or type/test assertion visible at the pinned commit, without execution here.
- **Inference / proposed control:** an integration consequence or future check, not an observed product defect or demonstrated runtime result.

## 1. Public composition and capability selection

**Documented contract.** The runtime subpath is the public pre-1.0 adapter-authoring surface. `Runtime.define` accepts storage and query **layers**, not bare service objects; `Layer.succeed` can wrap already-built services. It preserves acquisition errors, external requirements, initialization's `MigrationError`, and provider errors. Unexpected custom-wrapper exceptions remain defects. [Custom runtimes, lines 3–9 and 51–76](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/custom-runtimes.md#L3-L76)

**Source observation.** `RuntimeDefinition.layer` returns `Triples` plus the selected provider outputs. Its error type retains backend/provider errors and `CapabilityError`. Its requirement type removes only services the builder supplies internally (`Triples`, `TripleStoreRuntime`, and the relevant backend services). [Runtime.ts, lines 23–43](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/runtime/Runtime.ts#L23-L43)

`Capabilities.default` is exactly `of(entitySnapshots(), changeEmission())`; `none` is `of()`; `custom` returns the given wrappers and an empty output context. Ambient snapshots require both snapshot tags. An explicitly supplied snapshot layer retains its errors and external requirements. Ambient emission requires `ChangeEmitter`; an explicit emitter service removes that requirement. [Capabilities.ts, lines 11–64 and 71–99](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/runtime/Capabilities.ts#L11-L99)

The type-test source asserts that a minimal runtime still requires its host `Connection` and retains `connect-failed`, that defaults retain all three providers, and that a snapshot provider's error remains visible. These are source assertions, not compiler results obtained in this research. [runtime.types.ts, lines 30–96](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/test/runtime/runtime.types.ts#L30-L96)

**Inference.** For a future bounded subset adapter, explicit `none` is a defensible first composition choice if snapshots/emission are intentionally outside its selected contract. It is not permission to omit atomicity, temporal behavior, receipts, or query semantics while claiming complete `Triples` conformance. The documented correctness contract remains broader than wrapper selection. [Custom runtimes, lines 215–258](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/custom-runtimes.md#L215-L258)

## 2. Provider construction and validation are different stages

**Source observation.** `Runtime.layer` validates scope and finite deterministic start time before building. It then:

1. Builds `raw`, which retains the runtime and backend services internally.
2. Builds selected providers with that raw context.
3. Converts expected dependency-validation errors to typed `CapabilityError`.
4. Calls `composeStore` inside `Effect.sync`.
5. Returns provider services plus the decorated `Triples` service, not every internal raw service.

[Runtime.ts, lines 61–103](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/runtime/Runtime.ts#L61-L103)

Provider builds precede validation. `Capabilities.of` builds members sequentially and merges their service outputs into a result context. It does **not** provide the accumulated output context to the next member's build. Do not treat it as an arbitrary dependency-injection pipeline between providers. [Capabilities.ts, lines 71–89](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/runtime/Capabilities.ts#L71-L89)

`validateDependencies` checks name presence and duplicate names. Composition validates again, sorts ascending priority, then folds wrappers over the base; highest priority is outermost. It does not topologically sort `requires`, reject cycles/self-references, validate priority ranges, inspect physical database identity, or check connection ownership. For example, mutually required names satisfy the presence check. This is a limitation of that validation routine, not evidence that a current adapter fails. [StoreCapability.ts, lines 40–78 and 98–112](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/store/StoreCapability.ts#L40-L112)

**Documented contract.** Snapshot providers receive raw `Triples` and the definition's backend services. `Runtime.define` supplies `StorageAdapter`/`QueryExecutor`; `fromKv` supplies `KvBackend`. Snapshot persistence must belong to the same database. The builder does not recursively hand a snapshot provider its already-decorated store. [Custom runtimes, lines 148–155 and 195–201](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/custom-runtimes.md#L148-L201)

**Inference.** Sharing a database scope string is insufficient evidence that storage, query execution, and snapshot persistence share the correct physical database or transaction connection. Those remain adapter/composition obligations. Invalid configurations must be cleanup-safe even when validation fails after resource acquisition.

## 3. Acquisition, initialization, close, and finalizer ownership

**Documented contract.** Supplied layers use scoped acquisition. Closing the runtime scope runs their finalizers, including on initialization or provider-construction failure. The builder deliberately does not call `adapter.close()`; the layer should register release with `Effect.acquireRelease` if it owns the connection. Calling both release routes can double-close a host connection. Existing SQL adapters leave connection ownership to their SQL-client layer. [Custom runtimes, lines 193–211](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/custom-runtimes.md#L193-L211)

**Source observation.** `Runtime.define` composes `TriplesLive` with the supplied storage/query layers. `TriplesLive` resolves adapter, query executor, and runtime, then calls `adapter.initialize()` before returning a raw store; capability construction comes later in `Runtime.layer`. No builder-owned call to `close()` is present in these paths. [Runtime.ts, lines 84–125](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/runtime/Runtime.ts#L84-L125), [TriplesLive.ts, lines 136–147](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/store/TriplesLive.ts#L136-L147)

The adapter interface still includes `initialize(): Effect<void, MigrationError>` and `close(): Effect<void, unknown>`. The presence of `close` in that interface is not an automatic release hook. [StorageAdapter.ts, lines 70–74](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/storage/StorageAdapter.ts#L70-L74)

SQLite and PostgreSQL adapters consume an ambient `SqlClient`. Their `initialize` methods migrate only when `autoMigrate` is true, otherwise no-op, and both `close` methods are no-ops. This corroborates the documented owner separation. [SqliteAdapter.ts, lines 77–85 and 684–702](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sqlite/src/SqliteAdapter.ts#L684-L702), [PostgresqlAdapter.ts, lines 38–46 and 600–618](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/postgres/src/PostgresqlAdapter.ts#L600-L618)

`Runtime.fromKv` builds the supplied backend with `KvTriplesLive`; the KV contract has no adapter initialize/close hooks. Initialization/release therefore belong to the backend layer. [Runtime.ts, lines 118–125](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/runtime/Runtime.ts#L118-L125), [KvBackend.ts, lines 38–103](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/kv/KvBackend.ts#L38-L103)

**Test-source evidence.** Core runtime tests count one acquire/release after successful scope completion and another after duplicate-capability failure. A separate `Runtime.define` test returns the identical `MigrationError` and counts one release when initialization fails. The custom-wrapper test expects a defect rather than a typed failure. These tests were read, not run here. [runtime.test.ts, lines 146–269](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/test/runtime/runtime.test.ts#L146-L269)

**Integration gap.** The published DuckDB constructor/context-manager close contract is not an Effect scoped-layer contract. The [product source mapping](PRODUCT-MAP.md) identifies the constructor-owned connection, explicit/context-manager close, and possible post-close budget error. Mapping those paths into acquisition, partial-construction cleanup, borrowed ownership, and Effect interruption remains an adapter contract gap, not an observed lifecycle defect or a goal-7 runtime diagnosis. These sources do not establish exactly-once close behavior for all future interruption/race cases.

## 4. Failure and interruption obligations

**Documented contract.** `withTransaction` must atomically roll back facts, retractions, journal metadata, command claims, and commit-position allocation on typed failure, defect, **or interruption**. Concurrent writers must not see partial commits or invalidate enforced preconditions. An aborted command claimant must leave no durable receipt. Initialization is allowed to be a host-managed check/no-op rather than migration. [Custom runtimes, lines 208–230](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/custom-runtimes.md#L208-L230)

**Source observation.** `TriplesLive.transact` delegates its entire transaction effect to `adapter.withTransaction`; command claiming and commit-position allocation occur inside it. A future adapter must implement the atomicity itself rather than rely on the wrapper to undo arbitrary native calls. [TriplesLive.ts, lines 248–298](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/store/TriplesLive.ts#L248-L298)

Keep three outcomes separate:

1. **Build/initialize/provider failure:** there is no successfully constructed public runtime; acquired owned resources must be released by their scopes.
2. **Pre-commit source failure/defect/interruption:** rollback must leave no partial source unit or receipt.
3. **Post-commit wrapper failure/interruption:** source commit may already exist. It is not safe to infer rollback from failure of the decorated call. Use authoritative receipt/journal resolution and explicit projection freshness.

The third point is explicitly documented for snapshot failure, and a consequence of the visible post-commit control flow for interruption after source success. It is not an assertion that every cancellation is swallowed or that native statements are safely cancellable.

## 5. Projection and emission subtleties

**Documented/source agreement.** Entity snapshots have priority 60; emission has 50, so snapshots wrap emission, which wraps the base store. Snapshot materialization occurs after the inner write succeeds. Materialization typed errors become `WriteError` while facts remain committed. The `transact` wrapper loads the committed journal and uses its exact changes, including broad pattern retractions. [EntitySnapshotsCapability.ts, lines 75–85, 108–128, and 200–258](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/snapshots/EntitySnapshotsCapability.ts#L200-L258)

`ChangeEmission` catches causes from the emitter effect itself. An event can be emitted before snapshot materialization succeeds; it is not a freshness certificate. The callback is awaited, despite the emitter interface's fire-and-forget language. Thus best-effort error handling does not establish bounded latency or a detached/background delivery guarantee. [ChangeEmissionCapability.ts, lines 25–43](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/store/ChangeEmissionCapability.ts#L25-L43), [writeEventUtils.ts, lines 16–22 and 138–161](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/store/writeEventUtils.ts#L138-L161), [ChangeEmitter.ts, lines 41–48](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/store/ChangeEmitter.ts#L41-L48)

The catch surrounds `emitter.emit`, not all preceding work. In `transact`, a journal read occurs after inner commit and before emission, so a journal-read error is not converted to success by that emitter catch. Do not generalize “emission failures are swallowed” into “all post-commit wrapper work cannot fail.” The outer snapshot transaction wrapper performs another post-commit journal read after inner emission returns and before materialization. Its typed-error mapping does not establish blanket handling of defects or interruption, and neither read failure implies source rollback.

The Cloudflare runtime test source explicitly expects `WriteError` and a retained fact after failing snapshot materialization. Another test checks persisted snapshots across runtime rebuild and exact pattern-retraction events. These are useful patterns for later adapter-specific tests, not observed DuckDB results. [Cloudflare runtime tests, lines 64–149](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/cloudflare/test/runtime.test.ts#L64-L149)

## 6. Hand-only controls for selecting a future contract

These are authored review exercises and expected traces. They were not executed and do not authorize later tests or implementation. Use only hypothetical connections, stores, and traces; no stopped/private database files are needed.

1. **Capability boundary card.** Write two option cards: explicit `none`, and omitted capabilities. For `none`, record base `Triples` with no snapshot/emission wrappers. For omitted options, list the three required provider services and snapshot outputs. Reject any specification that silently fills missing services or treats `none` as an incomplete-transaction exemption.
2. **Single-owner ledger.** Draw `owner → connection → adapter/query/provider`. Select either runtime-owned acquisition/release or borrowed host ownership. For the borrowed case, the adapter's release must not close the host connection. For the owned case, name the one registered finalizer. Explicitly account for any existing explicit/context-manager close path and a close that completes native release before reporting an error.
3. **Construction timeline.** Hand-trace acquire → raw initialize → provider acquire → name validation → wrapping → ready. Place a failure marker at each transition, including partial native acquisition before a service exists. For each marker, identify which already-acquired owners must release and which resources never existed. No leaked or duplicate owner is an acceptable unspecified outcome.
4. **Provider context worksheet.** Mark exactly which raw services each provider can see and which requirements remain external. Verify storage/query/snapshot refer to the same selected physical database, not merely equal scope text. Include a provider B that needs provider A's output: do not assume `Capabilities.of(A, B)` supplies it automatically.
5. **Validation counterexamples.** On paper evaluate duplicate names, a missing required name, self-requirement, and a two-name cycle. Expect the first two to fail validation and the latter two to pass this presence-only routine. Separately review whether their intended ordering makes sense. Do not call passing name validation a dependency-graph or ownership proof.
6. **Rollback matrix.** Write a hypothetical atomic unit containing a command claim, position allocation, assertion, retraction, and journal metadata. Insert typed failure, defect, and interruption before commit. All five effects must be absent afterward and the connection must be reusable or explicitly discarded under the selected contract. Keep this expected trace separate from evidence that a driver actually implements it.
7. **Post-commit ambiguity trace.** Trace source commit → emission wrapper journal lookup → emit → snapshot wrapper journal lookup → snapshot materialize → response. Mark a failure/interruption after each step. Preserve the distinction between committed facts and stale/missing projection; identify receipt lookup as the resolution path. Never use a returned `WriteError` or an emitted event alone as proof of rollback or freshness.
8. **Scope-close/interruption matrix.** For owned and borrowed connections, consider normal scope exit, initialization failure, provider failure, wrapper defect, caller interruption during construction, and caller interruption during transaction/post-commit work. For every row, record finalizer owner, native work that may still be active, rollback obligation, finalizer failure behavior, and evidence still needed. Triplex's inspected tests do not close all these rows.
9. **Lifetime and claim review.** Distinguish definition creation, layer build, per-request use, scope exit, and rebuild. State whether rebuild reuses persistent storage or creates a fresh database. Keep deterministic fixture reuse and migrations separately qualified. Label any future DuckDB subset result as subset evidence; shared conformance alone does not establish ownership, crash durability, cross-process isolation, migration safety, or full capability behavior.

## 7. Contradictions, limits, and stopping point

- No direct contradiction was found between pinned lifecycle documentation and the inspected builder/adapter sources. The adapter `close` method exists but is deliberately not invoked by the builder.
- “Fire-and-forget” in emitter guidance must be read as an error-isolation policy, not as non-awaited execution; the helper awaits the callback.
- Name dependencies are presence constraints, not a DAG or execution-order solver. Scope identity is not physical isolation or authorization.
- The inspected runtime test file covers success, duplicate-capability failure, initialization failure, and custom-wrapper defect classification. It does not establish every provider-acquisition/interruption/finalizer edge case.
- All linked evidence is pinned source or test source. No tests were run, packages installed, body hashes computed, private owner artifacts read, or new adapter implementation accepted. The useful stopping point is a source-grounded candidate contract and manual control set, with runtime qualification still held for a separately authorized step.
