# Unbundled Core module resolution

Tags: `problem:module-resolution`, `topic:reproducibility`,
`topic:reuse-maintenance`, `backend:duckdb`, `language:TypeScript`,
`status:observed`, `mechanism:closed-parent-specifier-map`.

The isolated A package build typechecked and emitted Core then DuckDB, but its
first actual seed failed while loading Core. No database directory, DuckDB API
resolution, native addon resolution or write receipt was produced. Preserve
[seed v2/0001](../../.devloop/jobs/duckdb-owner-a-actual-v2-seed/attempts/0001/terminal.json)
and the [offline exact-fingerprint diagnosis](../../.artifacts/duckdb-owner-a-runtime-import-diagnosis-v1/diagnosis.json).
The earlier v1 source-role enqueue refusal also remains an unexecuted setup
failure; it is separate from this runtime packaging failure.

On Node24.13.0, unbundled TypeScript emission retains
[ContentId.ts:24](../../packages/core/src/content/ContentId.ts#L24)'s
`./Sha256` import. [Sha256.ts](../../packages/core/src/content/Sha256.ts) exists,
and the compiler emits `Sha256.js`, but ordinary Node ESM does not append that
extension. The repository normally uses bundling. The pinned
[Node24.13.0 ESM specification](https://nodejs.org/download/release/v24.13.0/docs/api/esm.html#mandatory-file-extensions)
requires fully specified relative imports and treats distinct URL query or
fragment identities as distinct modules.

The unchanged source hashes are `2692c6c4485f45b229393079f8844051b2b492cb4076ca054b8d3328847324ac`
for ContentId.ts and `0e0f2ba6549d2ddb89113ba0ffdbcdeb2437d8c046982b9c97ee070985f8b92a`
for Sha256.ts. The anchored
[build record](../../.devloop/jobs/duckdb-owner-a-isolated-package-build-v1/attempts/0001/artifacts/build.json)
has SHA256 `a0e0dcb6bc995595c8f069684029daf5e549fec8c625386523db411bdadf7ff7`,
build identity `4ea29c79275a463ce7a4582e650dde5ca27fd13c4c5187fb009c7aa16d7fa760`,
and terminal `f8463e2d43a93c7aa30b19086b17cc33cdb21c1b9338746fa927dbb724fdae31`.
Its emitted `dist/content/ContentId.js` and `Sha256.js` hashes are respectively
`385eb7bc429aeae3a9cb57dac209a5fe022f5e2936b4ed3baf015f26cd85e8fc`
and `45f20fa8c22ad193932796341aea6e83e87467613523c19e6217d1f1b02e161a`.
Typechecked/emitted remains the proven scope of that build; native activation
has not been established by it.

The proposed isolated adapter is a closed set of 48 parent/specifier edges from
13 emitted Core modules to already hashed `.js` members of that same tree. It
adds no general extension search, ancestor lookup, source rewrite or live
package change. Both explicit A flags must use the same map, wrapper and built
tree. The [map validator](../../.runtime/experiments/duckdb-owner-a-runtime-wrapper-v1/import-map.mjs)
checks parent/target membership, hashes and exact relative target identity; the
[bootstrap](../../.runtime/experiments/duckdb-owner-a-runtime-wrapper-v1/bootstrap.mjs)
retains the private runtime/native membership guard. Four authored offline
[refusal controls](../../.artifacts/duckdb-owner-a-runtime-import-diagnosis-v1/components.tap)
pass. [Independent source/AST/six-control review](../../qualification/reviews/duckdb-owner-a-import-map-v1-independent.json)
also confirms all 48 edges and target bytes. Before native execution the adapter
was a hypothesis pending fresh loading, seed and separate/combined gates. Those fresh
[seed](../../qualification/reviews/duckdb-owner-a-actual-v3-seed-independent.json)
and [arm](../../qualification/reviews/duckdb-owner-a-actual-v3-arms-independent.json)
reviews now clear the exercised entry path: each uses four mapped resolutions
and one private Core/Effect identity. This qualifies that small diagnostic
loading path, not all48 edges dynamically, a complete runtime/OS closure or a
general portable package build. The original failed attempt remains unchanged.

Inspiration is the exact-file allowlist in XTDB's independently reviewed
`loop-v2/select.mjs` (SHA256 `a449350596cefe5bd84449a8d3447319ae9d656e3615148007bd59c658b1f235`),
with [its scoped source review](../../qualification/reviews/xtdb-isolated-builder-v2-independent.json).
Here it is adapted to explicit internal import edges; it does not transfer an
XTDB runtime or performance result to DuckDB.

QLever's [workspace-entry placement setup failure](../../.artifacts/qlever-public-string-preparation-first-failure-v1/failure.json)
is related reproducibility evidence with a different cause: a top-level
qualification entry could not resolve the public workspace package. Its
successor uses a package-local entry with existing package links and no alias
hook. That differs from Core's extensionless imports in an already resolved,
unbundled private package.
