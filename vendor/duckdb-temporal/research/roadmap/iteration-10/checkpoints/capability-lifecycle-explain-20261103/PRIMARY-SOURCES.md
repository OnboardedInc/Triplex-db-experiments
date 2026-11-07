# Triplex source provenance

## Capability and lifecycle evidence

Triplex entries below were returned by GitHub reads at repository ref `e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0`. The final product-review subsection uses its separately named published repository/ref. Identifiers are GitHub-returned Git blob IDs, not body hashes calculated by this research. Source bodies were inspected as text only. Line numbers are 1-based and were assigned by splitting the fetched UTF-8 text on newlines, or supplied directly as line bounds to GitHub's text fetch. The recursive Triplex tree response reported `truncated: false`.

Base source URL: `https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/`.

## Principal evidence

- `docs/custom-runtimes.md`: blob `df7813e8fbf95d6f595c2aaee8af95318b2de0b1`. Public surface/errors 3–76; defaults/provider context 114–171; lifecycle 193–211; correctness and conformance limits 213–258. [Pinned source](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/custom-runtimes.md)
- `packages/core/src/runtime/Runtime.ts`: blob `05d0dc5103425c88534f3d32f427ffc59239a109`. Layer type contracts 23–43; validation/build/provider/wrap order 61–103; define/fromKv composition 108–125. [Pinned source](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/runtime/Runtime.ts)
- `packages/core/src/runtime/Capabilities.ts`: blob `abf4fcf9949d12078cbed2b9526988583f533ce2`. CapabilitySet 11–17; snapshots 19–47; emission 49–64; sequential combination/default/none/custom 71–99. [Pinned source](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/runtime/Capabilities.ts)
- `packages/core/src/store/StoreCapability.ts`: blob `aa432e4de2fc4524458e2e238bb59bff5854ef14`. Interface 40–45; presence/duplicate validation 55–78; priority composition 98–112. [Pinned source](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/store/StoreCapability.ts)
- `packages/core/src/storage/StorageAdapter.ts`: blob `fe0a39f867cae25171c067907333eb68757f5f55`. Atomicity/position/claim surface 18–38; initialize/close 70–74; SQL-only refinement 77–88. [Pinned source](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/storage/StorageAdapter.ts)
- `packages/core/src/store/TriplesLive.ts`: blob `d6ef6b0fae64c8a5599dc0757333229766050bd8`. Dependency resolution/initialize 136–147; source transaction, command claim and position 248–298. [Pinned source](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/store/TriplesLive.ts)
- `packages/core/test/runtime/runtime.test.ts`: blob `63dc2d2de8103be6b7fac38dd05a03db123d7bc1`. Duplicate capability failure 94–144; custom-wrapper defect 146–169; resource release 171–211; initialization failure 213–269. Test source only, not executed. [Pinned source](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/test/runtime/runtime.test.ts)
- `packages/core/test/runtime/runtime.types.ts`: blob `39a25d286167cc9cb6303bf8e769e6d1be047139`. Backend errors/requirements 30–52; defaults 54–64; provider errors/requirements 66–96. Type-test source only, not compiled here. [Pinned source](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/test/runtime/runtime.types.ts)

## Capability side effects and examples

- `packages/core/src/snapshots/EntitySnapshotsCapability.ts`: blob `3c5691daab4883e2bd435814f4bac58a1210934c`. Post-commit error mapping 75–85; priority/post-write materialization 108–143; committed-journal changes 200–258. [Pinned source](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/snapshots/EntitySnapshotsCapability.ts)
- `packages/core/src/store/ChangeEmissionCapability.ts`: blob `091c31910cb9fb42bab63bc541ceb1e1fd48f461`. Priority 50 and emitter catchCause 25–43. [Pinned source](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/store/ChangeEmissionCapability.ts)
- `packages/core/src/store/writeEventUtils.ts`: blob `7ad0b346952c710ee99b12a8555019b15af9bcf1`. Awaited callback 16–22; post-transact journal read/event 138–161. [Pinned source](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/store/writeEventUtils.ts)
- `packages/core/src/store/ChangeEmitter.ts`: blob `37f5a311199b7ae40dc9d5ff49d27561d97b1a9c`. Fire-and-forget guidance 41–48; explicit no-op service/layer 59–70. [Pinned source](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/store/ChangeEmitter.ts)
- `packages/cloudflare/test/runtime.test.ts`: blob `6187485d35543964720b820a609da763e0a425e8`. Persistent snapshots/pattern retractions 64–115; post-commit projection failure 117–149. Test source only, not executed. [Pinned source](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/cloudflare/test/runtime.test.ts)

## Connection ownership cross-checks

- `packages/sqlite/src/SqliteAdapter.ts`: blob `2997363e1afbae7fae7505dba522907592a3881e`. Ambient client 77–85; migration/no-op initialize and no-op close 684–702. [Pinned source](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sqlite/src/SqliteAdapter.ts)
- `packages/postgres/src/PostgresqlAdapter.ts`: blob `eb533cb30c6143fedb0a371bb844c4f7ef325826`. Ambient client 38–46; migration/no-op initialize and no-op close 600–618. [Pinned source](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/postgres/src/PostgresqlAdapter.ts)
- `packages/postgres/src/PgTriples.ts`: blob `b6f6a546371fd5ffde7b07ce641fb09479255421`. Fresh pool lifetime warning 9–10; host client composition 41–54, 72–91. [Pinned source](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/postgres/src/PgTriples.ts)
- `packages/core/src/kv/kv/KvBackend.ts`: blob `0be83d7e9106a16c9cb8c6150b8bd56e71839986`. Service 38–103; transaction contract 55–61; no initialize/close hook. [Pinned source](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/kv/KvBackend.ts)
- `packages/core/src/kv/layers/KvTriplesLive.ts`: blob `d617ebf4e101e7aed3de262f3278c8d7cd699d0f`. KV layer requirements 936–948. [Pinned source](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/layers/KvTriplesLive.ts)

## Additional inspected supporting sources

- `packages/core/src/runtime/index.ts`: blob `0d9764e162ab0db7f28a14dfeaa43fff895f3802`: public exports 1–47.
- `packages/core/src/storage/QueryExecutor.ts`: blob `8c1d3e3b9cf9cc8c14586e0fc48780075086157f`: execute/page/explain surface 113–168.
- `packages/core/src/store/RuntimeServices.ts`: blob `23d0c7e76baf446c796c8c8677d9741313d2b55f`: supporting runtime context; fixed-clock research is prior work rather than the focus here.
- `packages/sql/src/StorageBackend.ts`: blob `14fa44c793001f391a9ef83cf8e05989ecd986d7`: legacy SQL backend service context; not treated as the public Runtime.define ownership contract.
- `packages/sqlite/src/SqliteLayer.ts`: blob `f7881cbaeef54a58b50b9249436690721a81cc5c`: client-layer construction/configuration and migrated/unmigrated distinction.
- `packages/sqlite/src/SqliteBackend.ts`: blob `2657d3b46755a44f8dfbc723b4c9cddacdd8c6e5`: legacy backend implementation context only; no filesystem actions were performed.
- `packages/postgres/src/PostgresqlBackend.ts`: blob `f0027f893f7b6a9121179e0ae0fd73adf393dbc1`: pool/schema composition context only; no database or external-state actions were performed.

## Published product evidence

All product entries use repository Contributor/research-reference at ref 0e8823973f5e1b886b7ef96e8dc5a899f467f241. Paths are under projects/temporal-datalog/prototype/native-cloud-v06/native_negagg_persisted06_integration001/source/storage/. These are connector-returned Git blob IDs, not hashes computed from fetched public source bodies.

- typed_store.py: 100a4cbb7867f1454a304635ed6ba618d0ef04ce. Constructor/lifecycle 592–652, query 654–719, transaction 721–774.
- store.py: 479d6a9133acddfd32a6c93a723f8c77155db4e4. Query/commit types 70–111 and close/context manager 352–364.
- planner_v1.py: 4bfaa1c6cc8c7829acfb37750aa2376951c3e8ed. PlanExplanation 38–60, plan selection 599–652, read/explain control 698–758.
- schema_v2.sql: 5f8cff5ee6980e45df0e5094ac378514b750de0c. Bounded schema context only; no database state was read.
