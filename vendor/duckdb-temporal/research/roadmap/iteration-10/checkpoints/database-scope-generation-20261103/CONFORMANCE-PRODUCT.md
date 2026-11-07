# Conformance and database lifecycle source review

Date: 2026-11-03. This is read-only source research. No tests, runtime, imports, compilation, model evaluation, database operations, runner inspection, or captured product artifacts were used. All test statements below describe assertions present in source, not passed tests. Goal 10 remains unaccepted.

## Summary

Triplex's public Runtime accepts a canonical environment/tenant/database/generation identity and uses it for cursors. That identity does not partition storage. The legacy SQL DatabaseManager instead uses a name-only cursor scope and recreates that same scope after clear. Its scope alone therefore provides no same-name incarnation fence. Other cursor checks can reject a replay, and returned rows depend on the temporal cut and new data. No successful stale-cursor replay or data leak was observed.

The unchanged PR 8 product source is a file-scoped independent prototype, not a Triplex adapter or demonstrated multi-tenant service.

## Shared conformance is one-store behavior

- [testkit index.ts L2865–2886](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/src/index.ts#L2865-L2886), blob `d410781a7dc61a3833991a6fc9463c7dbf9c1a77`: runtimeConformance constructs one runtime layer and runs the shared Triples suite. “Fresh isolated runtime” is a caller premise.
- Static count of the complete pinned file: 44 shared cases; zero entityPage calls. These are source counts, not execution results. The cases do not verify two-database isolation, database generations or drop/recreate lifecycle.
- The shared [query pagination case L2784–2850](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/src/index.ts#L2784-L2850), same blob, checks a one-store snapshot continuation and malformed cursor errors.

## Public identity and separate source assertions

- [DatabaseScope.ts L8–38](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/runtime/DatabaseScope.ts#L8-L38), blob `52543077e932e0fcf3d72194d5e7d73762098817`: a versioned JSON tuple encodes environment, tenant, database and nonnegative safe-integer generation. This helper neither allocates nor persists generations.
- [Runtime.ts L61–84](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/runtime/Runtime.ts#L61-L84), blob `05d0dc5103425c88534f3d32f427ffc59239a109`: validates identity and passes it to TripleStoreRuntime, independently of supplied storage/query layers.
- [runtime.test.ts L25–37](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/test/runtime/runtime.test.ts#L25-L37), blob `63dc2d2de8103be6b7fac38dd05a03db123d7bc1`: asserts stable encoding, delimiter distinction, generation-0/1 inequality and invalid-generation rejection. [L62–92](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/test/runtime/runtime.test.ts#L62-L92) asserts a query cursor fails under a different database identity. Neither is a same-name drop/recreate test.

## Legacy SQL manager lifecycle boundary

[DatabaseManagerLayer.ts](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/DatabaseManagerLayer.ts), blob `9808cf0e8a29f070e54cc5288920e79059034089`:

- [L145–163](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/DatabaseManagerLayer.ts#L145-L163) assigns literal `database:${database}`, replacing parent runtime scope and omitting environment/tenant/generation.
- [L214–240](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/DatabaseManagerLayer.ts#L214-L240) caches services by name; a cache hit does not recheck the registry.
- [L344–367](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/DatabaseManagerLayer.ts#L344-L367) closes this manager's cached scope, removes the entry, unregisters metadata, then deletes storage. Effect.catch ignores scope-close and storage-deletion error-channel failures; this does not establish suppression of defects or interruption.
- [L443–458](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/DatabaseManagerLayer.ts#L443-L458) clears by deleting and recreating the same name.

[DatabaseRegistryLayer.ts L25–74](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/DatabaseRegistryLayer.ts#L25-L74), blob `f3af3a9cf08e105e67baa5803a433c6d6f1ec67b`, has no generation field. The name-only scope is also identical for a same-named database under different manager/backend configurations. This is an identity limitation, not proof that any replay returns data.

The [CLI lifecycle test L22–87](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/cli/test/database-operations.test.ts#L22-L87), blob `8eb4b69a827de2fb5d6e6265b3aef4270c6cc4c1`, checks an empty database's metadata lifecycle. It does not create pre-clear facts/cursors or assert incarnation invalidation.

## Entity-page and query-page size are different contracts

- [EntityPage.ts L24–29, L88–148, L152–168](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/EntityPage.ts#L88-L168), blob `2dd9d9de8d425a4416b94a38e594ae6512ce1a1b`: limit defaults to 50 and accepts integers 1–200. The encoded cursor has no limit. With other checks matching, preparation accepts a new valid limit and uses the old cursor's after/basis. This is helper acceptance, not an observation of returned rows.
- That helper checks scope, entity type and an explicitly supplied temporal basis, then reuses the cursor's recordedPosition/recordedAt. It does not compare that position to the new store's current position.
- [SQL TriplesLive L533–565](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/store/TriplesLive.ts#L533-L565), blob `d6ef6b0fae64c8a5599dc0757333229766050bd8`, and [KV TriplesLive L683–719](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/layers/KvTriplesLive.ts#L683-L719), blob `d617ebf4e101e7aed3de262f3278c8d7cd699d0f`, both use it with runtime.scope and materialize entities at its prepared cut.
- The separate [KV entity-page test L278–308](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/test/kv/layers/KvTriples.test.ts#L278-L308), blob `4ab6fc4c5bc299ba45552b55e02fd730c39bbc56`, asserts exclusion of a later insertion and snapshot equality, not cross-scope or reset behavior.
- Query pages instead hash the normalized base query, including normalized page size: [Pagination.ts L126–143 and L194–274](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/Pagination.ts#L194-L274), blob `96768cf49ed11a5777e2c6c37c3e6a8e78ef6c6d`. A changed effective page size produces query_mismatch when decoding, scope and other earlier checks match. Replacing an explicit default with its identical effective value is not a changed normalized size.

## Positive backend isolation source assertions

These strengthen the source evidence but are outside runtimeConformance and were not run here.

- [FDB isolation test L385–430](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/foundationdb/test/FdbKvBackend.test.ts#L385-L430), blob `8d7c4c15f4a3d8980bd384aaab4cbdb128a5724d`: separate subspaces, same-key distinct values, cross-key absence, range isolation and A-clear/B-survives assertions. The physical prefix comes from [FdbKvBackend L497–501](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/foundationdb/src/FdbKvBackend.ts#L497-L501), blob `ab9df02bc0bbba541df37ddc6040ba3aad8c8efb`.
- [PostgreSQL tests L392–474 and L481–603](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/postgres/test/integration/postgresql.test.ts#L392-L603), blob `87deb46cac4479cf6ae8ab8074b3ff5a5231403f`: schema-bound pooled queries, database-local results/history/feeds, separate access records and cross-scope query-cursor rejection. These tests are Docker-conditioned.
- Physical PostgreSQL isolation uses deterministic digested schema names and schema-bound pools: [PostgresqlBackend.ts L45–53 and L91–103](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/postgres/src/PostgresqlBackend.ts#L45-L103), blob `f0027f893f7b6a9121179e0ae0fd73adf393dbc1`. SQLite selects a database-specific file: [SqliteBackend.ts L87–110](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sqlite/src/SqliteBackend.ts#L87-L110), blob `2657d3b46755a44f8dfbc723b4c9cddacdd8c6e5`.

## Unchanged PR 8 product mapping

Only published storage source was inspected at `0e8823973f5e1b886b7ef96e8dc5a899f467f241`:

- [store.py L142–173]([PRIVATE_REFERENCE_REMOVED]), blob `479d6a9133acddfd32a6c93a723f8c77155db4e4`: a confined canonical .duckdb path and object-local lock. Its explicit single-owner/process premise does not coordinate separate connections/processes.
- [typed_store.py L376–385 and L583–615]([PRIVATE_REFERENCE_REMOVED]), blob `100a4cbb7867f1454a304635ed6ba618d0ef04ce`: retains confinement; new files bootstrap schema 2, while v1 requires explicit migration.
- [schema.sql L4–37]([PRIVATE_REFERENCE_REMOVED]), blob `28d87765fd3f4426d503676cddea2986117e1e28`, and [schema_v2.sql L2–39]([PRIVATE_REFERENCE_REMOVED]), blob `5f8cff5ee6980e45df0e5094ac378514b750de0c`: file-local clock, commit and fact tables; no environment/tenant/database/generation registry.

File-root confinement is not tenant authorization. These files do not establish generation-aware service behavior, reset invalidation, or Triplex conformance.
