# DuckDB public bridge

This package keeps the archived DuckDB 2.0.0 C++ kernel, paired CPP lifecycle
owner and dedicated native writer addon. `makeDuckDBRuntime()` returns the
current Triplex runtime factory; applications keep Triplex schemas and the TS
SDK. The first bridge uses the shared Triplex Datalog SQL compiler over the
authoritative native assertions table. It is a bounded integration step.

The v2 public projection preserves exact signed64 integers as canonical decimal
text and typed public integer values. It preserves the public binary64 valid
time carriers separately from the native integer bounds. The original v1
projection and physical format are retained. The factory accepts raw Triplex
format5 stores and refuses native schema-owned entities or unsupported native
validity carriers until an explicit adoption/write delegation contract exists.

The initial connection serializes public transactions and re-audits C++ ownership
after each completed transaction. Neither this design nor an entry test proves
256 concurrent clients, scale acceptance or all ten goals. Revalidation cost is
a measurable hypothesis for subsequent read profiling.

`makeDuckDBRuntime({ database })` binds one file to the supplied Triplex scope.
`makeDuckDBRuntime({ databaseDirectory })` uses one scope-hashed native file per
logical database under that directory. The lazy `makeDuckDBClient(directory)`
and `makeDuckDBTemporalQueries(client, scope)` share the same C++ backend lease
while the runtime is live. Close the client explicitly. Resource settings must
match between consumers; the default is one engine thread,128MB DuckDB memory
and64MB temporary-disk allowance. These engine settings do not contain total
process memory. Every opened instance receives a unique spill directory under
the supplied `tempDirectory` (or the owned file/TMPDIR parent). Finite settings
are applied after opening the real file and paired extensions, then checked
before each public transaction. A functional retained-public-lease test verifies
native rejection at a1MiB spill cap, actual interruption and healthy reuse.

Private tarball consumers must supply `nativeArtifactsDirectory` pointing to the
qualified build directory containing `artifact.json`, the core extension/control
addon and `owner_probe/` artifacts. Manifests and exact engine/addon hashes are
verified before loading. The option defaults to this repository's existing
`vendor/duckdb-temporal/runtime/build` for workspace use. Native binaries are
not copied into package tarballs or rebuilt/downloaded implicitly. Runtime and
client consumers sharing a file must use the same artifact/resource settings.

The interval helper accepts the existing Datalog AST and a finite `from`/`to`
window. DuckDB discovers relevant endpoints and evaluates each span in one
physical read transaction at a captured commit cut. The host coalesces only
bounded final bindings. It refuses recursive/limited interval relations and
returns an error rather than partial output when row/span budgets are exceeded.
Abort/deadline signals reach the actual running native connection; transaction
rollback and ownership reconciliation drain before return. Process deadlines and
resource supervision remain the development controller's responsibility.

The default public recursive SQL uses DuckDB keyed set iteration, preserving the
existing maximum-depth semantics and exposing distinct argument-pair relations.
`recursionMode: "depth-set"` selects complete-tuple UNION for comparison;
`"legacy"` retains historical UNION ALL for bounded diagnostics. These are set
relations, not path-count/proof-lineage APIs. Same-fixture diagnostic timings do
not establish a256-client winner. See the
[measured recursion/resource problem](../../wiki/problems/duckdb-recursion.md).

Public `TemporalBasis` supports `recordedAt` and `validAt`. Exact commit positions
are used internally for stable pagination and explicitly by the interval helper's
`recordedPosition` option. A private position field passed to an ordinary entity
read is not a supported exact-cut API. Native schema adoption, general recursive
interval answers and complete native command delegation remain open.

Build with the owned bootstrap environment. The paired native core must be built
before the owner companion. The reproducible recipes currently reside in the
retained development-loop manifests; the two scripts in `experiments/` invoke
the original build programs and retain their artifact identities. The SDK entry
gate runs through a pinned CLI job and checks the current shared conformance
cases plus exact integers, fractional validity and file reopen. Source
adaptations are recorded in `SOURCE-ADAPTATION.json`; archived results are
historical only.

Run builds and tests using the mounted owned environment:

```sh
tools/bootstrap/pnpm --filter @triplex-build/triplex-sql build
tools/bootstrap/pnpm --filter @triplex-build/triplex-duckdb build
tools/bootstrap/with-env.sh node --test --test-concurrency=1 packages/duckdb/test/*.test.mjs
tools/bootstrap/with-env.sh node packages/duckdb/experiments/prepare-sdk-job.mjs duckdb-sdk-new-build
tools/bootstrap/with-env.sh node scripts/triplex-devloop.mjs enqueue --manifest .runtime/duckdb/duckdb-sdk-new-build.json
tools/bootstrap/with-env.sh node scripts/triplex-devloop.mjs execute --job duckdb-sdk-new-build --executor worker-name
```

Use a fresh job ID for new source. To prepare the interval/reopen gate instead,
pass `interval` as the final argument to `prepare-sdk-job.mjs`. The existing
native-build receipts are `duckdb-core-build-v2/0001` and
`duckdb-owner-build-v1/0001`; their manifests, artifacts and exact inputs are
retained under `.devloop/jobs`. Source-identical repetitions may use the
controller's explicit `retry --job ID --reason TEXT`; changed inputs require a
new revision and fresh captured hashes. Paired owner loading currently requires
the pinned macOS arm64 profile. Linux is a separate unqualified future profile.

Fresh SDK entry `duckdb-sdk-entry-v7/0001` passed44 shared conformance cases and
four lifecycle/carrier groups on the shared client/interval build. Fresh interval entry
`duckdb-interval-entry-v2/0001` passed overlapping fractional windows, three budget
rejection checks, an old commit cut after retraction, shared live-runtime access and full
close/reopen. `duckdb-datalog-packet-v3/0001` independently passed all71 common logical tasks
current/reopened (142 executions), including integer domains and recursion.
`duckdb-resource-entry-v3/0001` and `duckdb-recursion-focused-v2/0001` bind the
functional cap/interrupt and two recursive-arm checks. Each receipt applies to
its exact build. `public-native-consumer-v2/0001` additionally packs13 real
packages and checks installed public APIs with an explicit native artifact path;
Duck exact-int64 and fractional interval reopen pass alongside typed native
XTDB/QLever reads current/reopen. The independent SDK receipt is
`qualification/reviews/duckdb-sdk-v7-independent.json`. These are correctness
gates, not performance promotion.
