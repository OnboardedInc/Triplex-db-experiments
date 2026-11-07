# Triplex database scope and lifecycle source review

Pinned revision: `bjacobso/triplex@e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0`.

The public Runtime binds cursors to a canonical, host-controlled database identity. It does not allocate generations or select physical storage. The legacy SQL DatabaseManager uses a database-name scope and does not advance it on same-name clear or recreation. These are different entry points, not a universal scope-validation failure.

## Public canonical identity and host responsibility

`DatabaseScope.make({ env, tenant, database, generation })` requires nonblank strings and a nonnegative safe-integer generation. It serializes all four identity fields in a versioned JSON tuple. Values are not trimmed. `DatabaseScope.test(name)` uses test/test/name/0, so repeated names repeat identities. Validation parses the tuple, checks its shape and types, and requires exact canonical reconstruction.

- [DatabaseScope.ts lines 8–39](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/runtime/DatabaseScope.ts#L8-L39)
- [DatabaseScope.ts lines 41–61](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/runtime/DatabaseScope.ts#L41-L61)
- Blob: `52543077e932e0fcf3d72194d5e7d73762098817`.

`Runtime.define({ name, storage, queries })` and `Runtime.fromKv({ name, backend })` return definitions with `.layer({ scope, deterministic?, capabilities? })`. The builder validates the required scope, then installs that exact scope in both standard and deterministic branches. Storage comes from the separately supplied layers. There is no database create/delete or generation allocator here.

- [Runtime.ts lines 18–43](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/runtime/Runtime.ts#L18-L43)
- [Runtime.ts lines 61–125](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/runtime/Runtime.ts#L61-L125)
- Blob: `05d0dc5103425c88534f3d32f427ffc59239a109`.

The documented contract makes the host responsible for authorizing the caller, selecting the physical database, never reusing an identity for a different database, and advancing generation on replacement. Scope binds cursors; it does not create a tenant partition or authorize access.

- [Custom runtimes lines 99–112](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/custom-runtimes.md#L99-L112)
- Blob: `df7813e8fbf95d6f595c2aaee8af95318b2de0b1`.

## Legacy SQL manager identity

The declared DatabaseManager offers create, update, delete, deleteAll, list, get, getTriples, getSnapshotService, and clear. Database metadata contains name, description, createdAt, and optional tripleCount/sizeBytes, with no generation.

- [DatabaseManager.ts lines 17–68](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/store/DatabaseManager.ts#L17-L68)
- Blob: `a10c8d4d566e55de254a5e218ef3b389af594b7b`.

The actual SQL manager directly provides TriplesLive with `TripleStoreRuntime.scope = database:${database}`. It does not invoke public Runtime validation. Its legacy string scope is therefore not an invalid public Runtime call. Database name alone supplies this cursor namespace.

- [DatabaseManagerLayer.ts lines 145–174](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/DatabaseManagerLayer.ts#L145-L174)
- Blob: `9808cf0e8a29f070e54cc5288920e79059034089`.

Source implication: a same-name clear/recreate retains this namespace, so that reset alone provides no generation-based cursor rejection. Other cursor/query/basis checks can still reject an old cursor. This is not evidence of successful stale replay or a data leak.

## Registry and access effects

The registry separates metadata/access management from physical storage. Register, unregister, and clear do not create or delete fact storage. It exposes explicit access grants and fail-closed hasAccess checks.

- [DatabaseRegistry.ts lines 36–118](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/store/DatabaseRegistry.ts#L36-L118)
- Blob: `08339bf3c6cd2b17cf3687dcbe534c5af1213b65`.

The SQL registry stores name/description/created_at and separate access entries, not generation. Access references database name with ON DELETE CASCADE; SQLite foreign keys are explicitly enabled. Unregister deletes the database row. Registry clear explicitly deletes both access and metadata.

- [DatabaseRegistryLayer.ts lines 25–74](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/DatabaseRegistryLayer.ts#L25-L74)
- [DatabaseRegistryLayer.ts lines 101–115](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/DatabaseRegistryLayer.ts#L101-L115)
- [DatabaseRegistryLayer.ts lines 171–187](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/DatabaseRegistryLayer.ts#L171-L187)
- [DatabaseRegistryLayer.ts lines 234–246](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/DatabaseRegistryLayer.ts#L234-L246)
- Blob: `f3af3a9cf08e105e67baa5803a433c6d6f1ec67b`.

In the ordinary sequential clear branch, the manager reads the description, deletes/unregisters, then creates the same name and description. It does not restore access grants. The branch catches DatabaseNotFound and DatabaseAlreadyExists, so the sequential ACL-reset conclusion should not be generalized to every concurrent path returning success.

- [DatabaseManagerLayer.ts lines 443–459](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/DatabaseManagerLayer.ts#L443-L459)
- Blob: `9808cf0e8a29f070e54cc5288920e79059034089`.

## Lifecycle sequencing and release caveats

The SQL manager implements these sequences without a visible transaction covering metadata, cache, and physical storage:

- Create validates the DatabaseId, registers metadata, builds/initializes services, then caches them. No compensating unregister is shown if service construction fails after registration.
- Delete checks metadata, attempts cached scope closure, removes cache, unregisters, and attempts physical deletion. The close and deletion calls use Effect.catch to ignore errors. This does not establish handling of defects or interruption, and successful completion is not proof physical storage was removed.
- DeleteAll explicitly closes cached scopes, clears registry, then invokes backend-wide deletion with errors mapped to InternalError.

[Create lines 303–321](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/DatabaseManagerLayer.ts#L303-L321), [delete and deleteAll lines 344–380](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/DatabaseManagerLayer.ts#L344-L380). Blob: `9808cf0e8a29f070e54cc5288920e79059034089`.

Cached services are keyed by database name. A cache hit returns before registry.get; getTriples returns the service itself. These branches do not supply per-call authorization, generation checks, or lifecycle fences. Idle cleanup closes cached scopes, while the explicit manager finalizer only interrupts the cleanup fiber and does not call closeAllConnections. Retained-handle behavior and ownership therefore need separate verification.

[Cache lines 214–243](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/DatabaseManagerLayer.ts#L214-L243), [idle cleanup lines 117–138](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/DatabaseManagerLayer.ts#L117-L138), [getTriples lines 424–430](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/DatabaseManagerLayer.ts#L424-L430), [finalizer lines 461–468](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/DatabaseManagerLayer.ts#L461-L468). Blob: `9808cf0e8a29f070e54cc5288920e79059034089`.

StorageAdapter declares initialize and close, but database selection belongs to the supplied adapter. Public Runtime release is layer-owned; the builder does not call adapter.close. Resource finalizers must be registered by the owning layer.

[StorageAdapter.ts lines 18–74](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/storage/StorageAdapter.ts#L18-L74), blob `fe0a39f867cae25171c067907333eb68757f5f55`; [runtime lifecycle documentation lines 193–211](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/custom-runtimes.md#L193-L211), blob `df7813e8fbf95d6f595c2aaee8af95318b2de0b1`.

## Physical isolation and a qualified host contrast

SQLite maps DatabaseId to a separate file under dataDir; PostgreSQL maps it to a deterministic digest-suffixed schema and binds every pool connection through startup search_path options. These mechanisms are separate from cursor scope.

- [SqliteBackend.ts lines 37–40 and 87–110](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sqlite/src/SqliteBackend.ts#L37-L110), blob `2657d3b46755a44f8dfbc723b4c9cddacdd8c6e5`.
- [PostgresqlBackend.ts lines 45–103](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/postgres/src/PostgresqlBackend.ts#L45-L103), blob `f0027f893f7b6a9121179e0ae0fd73adf393dbc1`.

The separate host InstanceIdentity uses an opaque string generation, unlike core DatabaseScope's numeric generation. Its complete canonical identity determines provider keys. The Cloudflare reference host accepts generation during provision and prevents identity rebinding; fence/retire drain and dispose runtime. These are stronger example-host behaviors, not universal DatabaseManager guarantees or proof physical data is erased.

- [Host Identity.ts lines 4–48](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/host/src/Identity.ts#L4-L48), blob `877160f68ed35f516ab48e7f4c473e639950c087`.
- [Reference worker lines 178–190](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/examples/tenant-host-cloudflare/src/worker.ts#L178-L190), [lines 452–503](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/examples/tenant-host-cloudflare/src/worker.ts#L452-L503), [lines 518–549](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/examples/tenant-host-cloudflare/src/worker.ts#L518-L549), blob `3bc99033cecc09aa34a430865b00d1cad31ae9da`.

## Evidence limit

The source tests declare identity/generation inequality, cross-database cursor rejection, and cleanup assertions. They were read, not run. The cursor test changes database identity; it does not execute clear/delete/recreate. No stale replay, leak, resource leak, crash durability, or concurrent lifecycle result was established by this review.

[Runtime tests lines 25–92](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/test/runtime/runtime.test.ts#L25-L92), [lines 173–269](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/test/runtime/runtime.test.ts#L173-L269). Blob: `63dc2d2de8103be6b7fac38dd05a03db123d7bc1`.

